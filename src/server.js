import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import pkg from '../package.json' with { type: 'json' };
const { version } = pkg;

// This server intentionally does NOT cover the CRUD surface (accounts,
// categories, credit cards, transactions, budgets, reports…) — the official
// Organizze MCP (https://mcp.organizze.com.br/mcp) already provides it.
// Only endpoints of the REST API v2 that the official MCP does not expose
// live here, so both servers can be connected side by side without overlap.

export function createServer(requestFn) {
  const server = new McpServer({
    name: 'organizze-mcp-unofficial',
    version
  });

  // ─── Transfers (official MCP can only create and list) ──────────────────────

  server.tool(
    'update_transfer',
    'Update an existing transfer between bank accounts. The official Organizze MCP cannot edit transfers — get the transfer ID from its list_transferences tool (or from the API).',
    {
      transfer_id: z.number().int().describe('Transfer ID'),
      description: z.string().optional().describe('Transfer description'),
      date: z.string().optional().describe('Date (YYYY-MM-DD)'),
      amount_cents: z.number().int().positive().optional().describe('Amount in cents'),
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
