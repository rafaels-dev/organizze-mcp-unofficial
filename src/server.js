import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import pkg from '../package.json' with { type: 'json' };
const { version } = pkg;

// This server intentionally does NOT cover the CRUD surface (accounts,
// categories, credit cards, transactions, budgets, reports…) — the official
// Organizze MCP (https://mcp.organizze.com.br/mcp) already provides it.
// Only endpoints and fields of the REST API v2 that the official MCP does not
// expose live here, so both servers can be connected side by side without
// overlap. The *_advanced transaction tools exist because the official
// update/delete hide fields the REST API supports (invoice reallocation,
// card/account moves, series-wide updates).

export function createServer(requestFn) {
  const server = new McpServer({
    name: 'organizze-mcp-unofficial',
    version
  });

  // ─── Transactions (escape hatch for gaps in the official update/delete) ─────
  // The official MCP has update_transaction/delete_transaction, but they cannot
  // reallocate a card purchase to another invoice (no credit_card_invoice_id),
  // cannot move a transaction between cards/accounts, and their
  // update_recurrence/delete_recurrence 'this_and_future' has no effect on
  // installment series. These tools hit PUT/DELETE /transactions/:id directly
  // with the full REST field set.

  server.tool(
    'update_transaction_advanced',
    'Update a transaction via the raw REST API. Use the official update_transaction for ordinary edits; use this one for what it cannot do: move a card purchase to another invoice (credit_card_invoice_id), move a transaction to another card or account (credit_card_id / account_id), or apply a change to future occurrences of an installment series (update_future). Get IDs from the official list/get tools or from list_transaction_occurrences. Note: the REST docs mark description, date and amount_cents as required on PUT — if a partial update fails or blanks fields, fetch the transaction first and resend its current values along with the change.',
    {
      transaction_id: z.number().int().describe('Transaction ID'),
      description: z.string().optional().describe('Transaction description'),
      date: z.string().optional().describe('Date (YYYY-MM-DD)'),
      amount_cents: z.number().int().optional().describe('Amount in cents'),
      account_id: z.number().int().optional().describe('Move to this bank account ID'),
      credit_card_id: z.number().int().optional().describe('Move to this credit card ID'),
      credit_card_invoice_id: z
        .number()
        .int()
        .optional()
        .describe('Reallocate to this invoice ID (from get_credit_card_invoices)'),
      category_id: z.number().int().optional().describe('Category ID'),
      paid: z.boolean().optional().describe('Whether the transaction is paid'),
      notes: z.string().optional().describe('Notes / observations'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
      update_future: z
        .boolean()
        .optional()
        .describe('Also update all future occurrences of a recurring/installment series'),
      update_all: z
        .boolean()
        .optional()
        .describe('Update every occurrence of the series — may affect past balances'),
    },
    async ({ transaction_id, ...body }) => {
      const data = await requestFn(`/transactions/${transaction_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_transaction_advanced',
    'Delete a transaction via the raw REST API, optionally including future or all occurrences of a recurring/installment series — the official delete_transaction with delete_recurrence "this_and_future" does not remove future installments.',
    {
      transaction_id: z.number().int().describe('Transaction ID'),
      update_future: z
        .boolean()
        .optional()
        .describe('Also delete all future occurrences of a recurring/installment series'),
      update_all: z
        .boolean()
        .optional()
        .describe('Delete every occurrence of the series — may affect past balances'),
    },
    async ({ transaction_id, ...body }) => {
      const opts = { method: 'DELETE' };
      if (Object.keys(body).length > 0) opts.body = body;
      await requestFn(`/transactions/${transaction_id}`, opts);
      return { content: [{ type: 'text', text: 'Transaction deleted successfully.' }] };
    }
  );

  server.tool(
    'move_transactions',
    'Move a batch of transactions to another credit card, credit card invoice, or bank account in one call — one PUT per transaction against the raw REST API. The official mass_update_transactions cannot change account/card/invoice. Returns a per-transaction result; failures do not stop the batch.',
    {
      transaction_ids: z
        .array(z.number().int())
        .min(1)
        .max(200)
        .describe('Transaction IDs to move (max 200 per call)'),
      account_id: z.number().int().optional().describe('Move to this bank account ID'),
      credit_card_id: z.number().int().optional().describe('Move to this credit card ID'),
      credit_card_invoice_id: z
        .number()
        .int()
        .optional()
        .describe('Reallocate to this invoice ID (from find_credit_card_invoice)'),
    },
    async ({ transaction_ids, ...body }) => {
      if (Object.keys(body).length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Nothing to do: pass at least one of account_id, credit_card_id, credit_card_invoice_id.',
            },
          ],
          isError: true,
        };
      }
      const results = [];
      for (const id of transaction_ids) {
        try {
          await requestFn(`/transactions/${id}`, { method: 'PUT', body });
          results.push({ id, ok: true });
        } catch (error) {
          results.push({ id, ok: false, error: error.message });
        }
      }
      const moved = results.filter((r) => r.ok).length;
      const summary = { moved, failed: results.length - moved, results };
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }
  );

  // ─── Raw listings and invoice lookups ────────────────────────────────────────
  // The official list_transactions omits CreditCardBillsPayment entries (invoice
  // payments) in all_transactions mode, its get_credit_card_invoice ignores the
  // date parameter, and invoice aggregate totals can be stale. These tools go
  // straight to the REST API so reconciliations see the ground truth.

  server.tool(
    'list_transactions_raw',
    'List transactions straight from the REST API (GET /transactions), unfiltered — includes invoice-payment entries (CreditCardBillsPayment) that the official list_transactions omits in all_transactions mode. Defaults to the current month when no dates are given.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      account_id: z.number().int().optional().describe('Filter by bank account ID'),
      page: z.number().int().min(1).optional().describe('Page number'),
    },
    async (params) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      const data = await requestFn(`/transactions${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'find_credit_card_invoice',
    'Find a credit card invoice by month ("YYYY-MM") and return the full invoice object(s), including the numeric invoice ID needed by update_transaction_advanced / move_transactions. Works around the official get_credit_card_invoice, which ignores its date parameter and only returns the current invoice.',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .describe('Invoice month (YYYY-MM)'),
    },
    async ({ credit_card_id, month }) => {
      const invoices = await requestFn(`/credit_cards/${credit_card_id}/invoices`);
      const all = Array.isArray(invoices) ? invoices : [];
      const matches = all.filter((inv) => typeof inv?.date === 'string' && inv.date.startsWith(month));
      if (matches.length === 0) {
        const available = all.map((inv) => ({ id: inv?.id, date: inv?.date }));
        return {
          content: [
            {
              type: 'text',
              text: `No invoice found for ${month} on credit card ${credit_card_id}. Available invoices: ${JSON.stringify(available)}`,
            },
          ],
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
    }
  );

  server.tool(
    'get_credit_card_invoice_raw',
    'Get one credit card invoice straight from the REST API (GET /credit_cards/:id/invoices/:invoice_id), including its embedded transactions — the ground truth when the official invoice totals look stale or inconsistent with listings. Also use it to check whether an invoice is already paid BEFORE registering a payment (registering a payment on a paid invoice silently creates a reversal).',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      invoice_id: z.number().int().describe('Invoice ID (from find_credit_card_invoice)'),
    },
    async ({ credit_card_id, invoice_id }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}/invoices/${invoice_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Transfers (official MCP can only create and list) ──────────────────────

  server.tool(
    'update_transfer',
    'Update an existing transfer between bank accounts. The official Organizze MCP cannot edit transfers — get the transfer ID from its list_transferences tool (or from the API).',
    {
      transfer_id: z.number().int().describe('Transfer ID'),
      description: z.string().optional().describe('Transfer description'),
      date: z.string().optional().describe('Date (YYYY-MM-DD)'),
      amount_cents: z.number().int().positive().optional().describe('Amount in cents'),
      credit_account_id: z
        .number()
        .int()
        .optional()
        .describe('SOURCE account ID — the account the money leaves (REST v2 naming)'),
      debit_account_id: z
        .number()
        .int()
        .optional()
        .describe('DESTINATION account ID — the account the money enters (REST v2 naming)'),
      paid: z.boolean().optional().describe('Whether the transfer is settled'),
      notes: z.string().optional().describe('Notes'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
    },
    async ({ transfer_id, ...body }) => {
      const data = await requestFn(`/transfers/${transfer_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_transfer',
    'Delete a transfer between bank accounts. The official Organizze MCP cannot delete transfers.',
    { transfer_id: z.number().int().describe('Transfer ID') },
    async ({ transfer_id }) => {
      await requestFn(`/transfers/${transfer_id}`, { method: 'DELETE' });
      return { content: [{ type: 'text', text: 'Transfer deleted successfully.' }] };
    }
  );

  // ─── Archiving (not exposed by the official MCP) ────────────────────────────

  server.tool(
    'archive_account',
    'Archive a bank account. Archived accounts are hidden from day-to-day views but keep their history.',
    { account_id: z.number().int().describe('Account ID') },
    async ({ account_id }) => {
      const data = await requestFn(`/accounts/${account_id}/archive`, { method: 'PUT' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'unarchive_account',
    'Unarchive (restore) a previously archived bank account.',
    { account_id: z.number().int().describe('Account ID') },
    async ({ account_id }) => {
      const data = await requestFn(`/accounts/${account_id}/unarchive`, { method: 'PUT' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'archive_credit_card',
    'Archive a credit card. Archived cards are hidden from day-to-day views but keep their history.',
    { credit_card_id: z.number().int().describe('Credit card ID') },
    async ({ credit_card_id }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}/archive`, { method: 'PUT' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'unarchive_credit_card',
    'Unarchive (restore) a previously archived credit card.',
    { credit_card_id: z.number().int().describe('Credit card ID') },
    async ({ credit_card_id }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}/unarchive`, { method: 'PUT' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Entities (the official MCP is locked to a single entity) ───────────────

  server.tool(
    'list_entities',
    'List all financial entities (spaces) the account has access to. The official Organizze MCP operates on a single fixed entity; use this to see the others.',
    {},
    async () => {
      const data = await requestFn('/entities');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_entity',
    'Get details for a specific financial entity (space): name, plan, license status, owner.',
    { entity_id: z.number().int().describe('Entity ID') },
    async ({ entity_id }) => {
      const data = await requestFn(`/entities/${entity_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Users ──────────────────────────────────────────────────────────────────

  server.tool(
    'list_users',
    'List the users of the current entity (id, name, email).',
    {},
    async () => {
      const data = await requestFn('/users');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_user',
    'Get details for a specific Organizze user.',
    { user_id: z.number().int().describe('User ID') },
    async ({ user_id }) => {
      const data = await requestFn(`/users/${user_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Recurrences ────────────────────────────────────────────────────────────

  server.tool(
    'list_transaction_occurrences',
    'List every occurrence of a recurring or installment transaction. Paginated; pass page to fetch beyond the first page.',
    {
      transaction_id: z.number().int().describe('Transaction ID of any occurrence in the series'),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
    },
    async ({ transaction_id, page }) => {
      const qs = page ? `?page=${page}` : '';
      const data = await requestFn(`/transactions/${transaction_id}/occurrences${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Categories ─────────────────────────────────────────────────────────────

  server.tool(
    'list_category_colors',
    'List the hex colors (without #) accepted when creating or updating categories.',
    {},
    async () => {
      const data = await requestFn('/categories/colors');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  return server;
}
