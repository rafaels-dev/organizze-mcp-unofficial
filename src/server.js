import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { version } from '../package.json';

export function createServer(requestFn) {
  const server = new McpServer({
    name: 'organizze-mcp-unofficial',
    version
  });

  // ─── Users ──────────────────────────────────────────────────────────────────

  server.tool(
    'get_user',
    'Get details for a specific Organizze user.',
    { user_id: z.number().int().describe('User ID') },
    async ({ user_id }) => {
      const data = await requestFn(`/users/${user_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Bank Accounts ──────────────────────────────────────────────────────────

  server.tool(
    'list_accounts',
    'List all bank accounts.',
    {},
    async () => {
      const data = await requestFn('/accounts');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_account',
    'Get details for a specific bank account.',
    { account_id: z.number().int().describe('Account ID') },
    async ({ account_id }) => {
      const data = await requestFn(`/accounts/${account_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_account',
    'Create a new bank account. Type must be one of: checking, savings, other.',
    {
      name: z.string().describe('Account name'),
      type: z.enum(['checking', 'savings', 'other']).describe('Account type'),
      description: z.string().optional().describe('Account description'),
      default: z.boolean().optional().describe('Set as default account'),
    },
    async (body) => {
      const data = await requestFn('/accounts', { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_account',
    'Update an existing bank account.',
    {
      account_id: z.number().int().describe('Account ID'),
      name: z.string().optional().describe('Account name'),
      type: z.enum(['checking', 'savings', 'other']).optional().describe('Account type'),
      description: z.string().optional().describe('Account description'),
      default: z.boolean().optional().describe('Set as default account'),
    },
    async ({ account_id, ...body }) => {
      const data = await requestFn(`/accounts/${account_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_account',
    'Delete a bank account.',
    { account_id: z.number().int().describe('Account ID') },
    async ({ account_id }) => {
      await requestFn(`/accounts/${account_id}`, { method: 'DELETE' });
      return { content: [{ type: 'text', text: 'Account deleted successfully.' }] };
    }
  );

  // ─── Categories ─────────────────────────────────────────────────────────────

  server.tool(
    'list_categories',
    'List all categories.',
    {},
    async () => {
      const data = await requestFn('/categories');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_category',
    'Get details for a specific category.',
    { category_id: z.number().int().describe('Category ID') },
    async ({ category_id }) => {
      const data = await requestFn(`/categories/${category_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_category',
    'Create a new category.',
    {
      name: z.string().describe('Category name'),
      color: z.string().optional().describe('Hex color (without #), e.g. "438b83"'),
      parent_id: z.number().int().optional().describe('Parent category ID for subcategories'),
    },
    async (body) => {
      const data = await requestFn('/categories', { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_category',
    'Update an existing category.',
    {
      category_id: z.number().int().describe('Category ID'),
      name: z.string().optional().describe('Category name'),
      color: z.string().optional().describe('Hex color (without #)'),
      parent_id: z.number().int().optional().describe('Parent category ID'),
    },
    async ({ category_id, ...body }) => {
      const data = await requestFn(`/categories/${category_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_category',
    'Delete a category. Optionally provide replacement_id to reassign its transactions.',
    {
      category_id: z.number().int().describe('Category ID'),
      replacement_id: z
        .number()
        .int()
        .optional()
        .describe('ID of the category to receive the deleted category transactions'),
    },
    async ({ category_id, ...body }) => {
      await requestFn(`/categories/${category_id}`, { method: 'DELETE', body });
      return { content: [{ type: 'text', text: 'Category deleted successfully.' }] };
    }
  );

  // ─── Credit Cards ────────────────────────────────────────────────────────────

  server.tool(
    'list_credit_cards',
    'List all credit cards.',
    {},
    async () => {
      const data = await requestFn('/credit_cards');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_credit_card',
    'Get details for a specific credit card.',
    { credit_card_id: z.number().int().describe('Credit card ID') },
    async ({ credit_card_id }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_credit_card',
    'Create a new credit card.',
    {
      name: z.string().describe('Credit card name'),
      card_network: z
        .string()
        .describe('Card network, e.g. visa, mastercard, hipercard, amex, elo'),
      due_day: z.number().int().min(1).max(31).describe('Invoice due day'),
      closing_day: z.number().int().min(1).max(31).describe('Invoice closing day'),
      limit_cents: z.number().int().optional().describe('Credit limit in cents'),
      description: z.string().optional().describe('Card description'),
    },
    async (body) => {
      const data = await requestFn('/credit_cards', { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_credit_card',
    'Update an existing credit card. Use update_invoices_since (YYYY-MM-DD) to recalculate invoices from a given date.',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      name: z.string().optional().describe('Credit card name'),
      card_network: z.string().optional().describe('Card network'),
      due_day: z.number().int().min(1).max(31).optional().describe('Invoice due day'),
      closing_day: z.number().int().min(1).max(31).optional().describe('Invoice closing day'),
      limit_cents: z.number().int().optional().describe('Credit limit in cents'),
      description: z.string().optional().describe('Card description'),
      update_invoices_since: z
        .string()
        .optional()
        .describe('Recalculate invoices from this date (YYYY-MM-DD)'),
    },
    async ({ credit_card_id, ...body }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_credit_card',
    'Delete a credit card.',
    { credit_card_id: z.number().int().describe('Credit card ID') },
    async ({ credit_card_id }) => {
      await requestFn(`/credit_cards/${credit_card_id}`, { method: 'DELETE' });
      return { content: [{ type: 'text', text: 'Credit card deleted successfully.' }] };
    }
  );

  // ─── Credit Card Invoices ────────────────────────────────────────────────────

  server.tool(
    'list_invoices',
    'List invoices for a credit card. Optionally filter by start_date and end_date (YYYY-MM-DD). Defaults to current year.',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
    },
    async ({ credit_card_id, start_date, end_date }) => {
      const params = new URLSearchParams();
      if (start_date) params.set('start_date', start_date);
      if (end_date) params.set('end_date', end_date);
      const qs = params.toString() ? `?${params}` : '';
      const data = await requestFn(`/credit_cards/${credit_card_id}/invoices${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_invoice',
    'Get details of a credit card invoice, including transactions and payments.',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      invoice_id: z.number().int().describe('Invoice ID'),
    },
    async ({ credit_card_id, invoice_id }) => {
      const data = await requestFn(`/credit_cards/${credit_card_id}/invoices/${invoice_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_invoice_payments',
    'Get payments for a specific credit card invoice.',
    {
      credit_card_id: z.number().int().describe('Credit card ID'),
      invoice_id: z.number().int().describe('Invoice ID'),
    },
    async ({ credit_card_id, invoice_id }) => {
      const data = await requestFn(
        `/credit_cards/${credit_card_id}/invoices/${invoice_id}/payments`
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Budgets ─────────────────────────────────────────────────────────────────

  server.tool(
    'list_budgets',
    'List budgets (metas). Optionally filter by year and month.',
    {
      year: z.number().int().optional().describe('Year, e.g. 2024'),
      month: z.number().int().min(1).max(12).optional().describe('Month (1–12), requires year'),
    },
    async ({ year, month }) => {
      let path = '/budgets';
      if (year && month) path += `/${year}/${month}`;
      else if (year) path += `/${year}`;
      const data = await requestFn(path);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── Transactions ────────────────────────────────────────────────────────────

  server.tool(
    'list_transactions',
    'List transactions. Defaults to current month. Periods are processed as full months.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      account_id: z.number().int().optional().describe('Filter by account ID'),
    },
    async ({ start_date, end_date, account_id }) => {
      const params = new URLSearchParams();
      if (start_date) params.set('start_date', start_date);
      if (end_date) params.set('end_date', end_date);
      if (account_id) params.set('account_id', String(account_id));
      const qs = params.toString() ? `?${params}` : '';
      const data = await requestFn(`/transactions${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_transaction',
    'Get details for a specific transaction.',
    { transaction_id: z.number().int().describe('Transaction ID') },
    async ({ transaction_id }) => {
      const data = await requestFn(`/transactions/${transaction_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_transaction',
    `Create a transaction. Use amount_cents in cents (negative = expense, positive = income).

  IMPORTANT — Credit card transactions:
  - Use credit_card_id (NOT account_id) to post to a credit card.
  - Optionally include credit_card_invoice_id to target a specific invoice.
  - Using account_id for a CreditCard account will redirect to the default bank account.

  Recurring transactions: provide recurrence_attributes with periodicity.
  Installment transactions: provide installments_attributes with periodicity and total.
  Periodicity values: monthly, yearly, weekly, biweekly, bimonthly, trimonthly.`,
    {
      description: z.string().describe('Transaction description'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      amount_cents: z
        .number()
        .int()
        .describe('Amount in cents. Negative = expense, positive = income.'),
      account_id: z
        .number()
        .int()
        .optional()
        .describe('Bank account ID. Do NOT use for credit card transactions.'),
      credit_card_id: z
        .number()
        .int()
        .optional()
        .describe(
          'Credit card ID. Use this (instead of account_id) for credit card transactions.'
        ),
      credit_card_invoice_id: z
        .number()
        .int()
        .optional()
        .describe('Target a specific invoice ID within the credit card.'),
      category_id: z.number().int().optional().describe('Category ID'),
      paid: z.boolean().optional().describe('Whether the transaction is already paid'),
      notes: z.string().optional().describe('Notes / observations'),
      tags: z
        .array(z.object({ name: z.string() }))
        .optional()
        .describe('Tags, e.g. [{"name":"homeoffice"}]'),
      recurrence_attributes: z
        .object({
          periodicity: z.enum([
            'monthly',
            'yearly',
            'weekly',
            'biweekly',
            'bimonthly',
            'trimonthly',
          ]),
        })
        .optional()
        .describe('Make this a recurring (fixed) transaction.'),
      installments_attributes: z
        .object({
          periodicity: z.enum([
            'monthly',
            'yearly',
            'weekly',
            'biweekly',
            'bimonthly',
            'trimonthly',
          ]),
          total: z.number().int().min(2).describe('Number of installments'),
        })
        .optional()
        .describe('Make this an installment transaction.'),
    },
    async (body) => {
      const data = await requestFn('/transactions', { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_transaction',
    'Update a transaction. For recurring/installment transactions use update_future or update_all.',
    {
      transaction_id: z.number().int().describe('Transaction ID'),
      description: z.string().optional().describe('Transaction description'),
      date: z.string().optional().describe('Date (YYYY-MM-DD)'),
      amount_cents: z.number().int().optional().describe('Amount in cents'),
      account_id: z.number().int().optional().describe('Bank account ID'),
      credit_card_id: z.number().int().optional().describe('Credit card ID'),
      credit_card_invoice_id: z.number().int().optional().describe('Invoice ID'),
      category_id: z.number().int().optional().describe('Category ID'),
      paid: z.boolean().optional().describe('Whether the transaction is paid'),
      notes: z.string().optional().describe('Notes'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
      update_future: z
        .boolean()
        .optional()
        .describe('Update this and all future occurrences (recurring/installment)'),
      update_all: z
        .boolean()
        .optional()
        .describe('Update all occurrences — may affect balance (recurring/installment)'),
    },
    async ({ transaction_id, ...body }) => {
      const data = await requestFn(`/transactions/${transaction_id}`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_transaction',
    'Delete a transaction. For recurring/installment use update_future or update_all.',
    {
      transaction_id: z.number().int().describe('Transaction ID'),
      update_future: z
        .boolean()
        .optional()
        .describe('Delete this and all future occurrences (recurring/installment)'),
      update_all: z
        .boolean()
        .optional()
        .describe('Delete all occurrences — may affect balance (recurring/installment)'),
    },
    async ({ transaction_id, ...body }) => {
      await requestFn(`/transactions/${transaction_id}`, { method: 'DELETE', body });
      return { content: [{ type: 'text', text: 'Transaction deleted successfully.' }] };
    }
  );

  // ─── Transfers ───────────────────────────────────────────────────────────────

  server.tool(
    'list_transfers',
    'List all transfers between bank accounts.',
    {},
    async () => {
      const data = await requestFn('/transfers');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_transfer',
    'Get details for a specific transfer.',
    { transfer_id: z.number().int().describe('Transfer ID') },
    async ({ transfer_id }) => {
      const data = await requestFn(`/transfers/${transfer_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_transfer',
    'Create a transfer between two bank accounts. Credit cards cannot be used as source or destination.',
    {
      credit_account_id: z
        .number()
        .int()
        .describe('Destination bank account ID (receives credit)'),
      debit_account_id: z.number().int().describe('Source bank account ID (is debited)'),
      amount_cents: z.number().int().positive().describe('Amount in cents (must be positive)'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      description: z.string().optional().describe('Transfer description'),
      paid: z.boolean().optional().describe('Whether the transfer is already settled'),
      notes: z.string().optional().describe('Notes'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
    },
    async (body) => {
      const data = await requestFn('/transfers', { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_transfer',
    'Update an existing transfer.',
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
    'Delete a transfer.',
    { transfer_id: z.number().int().describe('Transfer ID') },
    async ({ transfer_id }) => {
      await requestFn(`/transfers/${transfer_id}`, { method: 'DELETE' });
      return { content: [{ type: 'text', text: 'Transfer deleted successfully.' }] };
    }
  );

  return server;
}
