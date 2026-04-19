import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';

function parseResult(result) {
  return JSON.parse(result.content[0].text);
}

function textResult(result) {
  return result.content[0].text;
}

async function buildClient(requestFn) {
  const server = createServer(requestFn);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('Users', () => {
  it('get_user calls /users/:id', async () => {
    const req = vi.fn().mockResolvedValue({ id: 3, name: 'Esdras' });
    const client = await buildClient(req);

    const result = await client.callTool({ name: 'get_user', arguments: { user_id: 3 } });

    expect(req).toHaveBeenCalledWith('/users/3');
    expect(parseResult(result)).toEqual({ id: 3, name: 'Esdras' });
  });
});

describe('Bank Accounts', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_accounts calls GET /accounts', async () => {
    req.mockResolvedValue([{ id: 1 }]);
    const result = await client.callTool({ name: 'list_accounts', arguments: {} });
    expect(req).toHaveBeenCalledWith('/accounts');
    expect(parseResult(result)).toEqual([{ id: 1 }]);
  });

  it('get_account calls GET /accounts/:id', async () => {
    req.mockResolvedValue({ id: 5 });
    await client.callTool({ name: 'get_account', arguments: { account_id: 5 } });
    expect(req).toHaveBeenCalledWith('/accounts/5');
  });

  it('create_account calls POST /accounts with body', async () => {
    req.mockResolvedValue({ id: 10 });
    await client.callTool({
      name: 'create_account',
      arguments: { name: 'Itaú', type: 'checking' },
    });
    expect(req).toHaveBeenCalledWith('/accounts', {
      method: 'POST',
      body: { name: 'Itaú', type: 'checking' },
    });
  });

  it('update_account calls PUT /accounts/:id', async () => {
    req.mockResolvedValue({ id: 5, name: 'Updated' });
    await client.callTool({
      name: 'update_account',
      arguments: { account_id: 5, name: 'Updated' },
    });
    expect(req).toHaveBeenCalledWith('/accounts/5', {
      method: 'PUT',
      body: { name: 'Updated' },
    });
  });

  it('delete_account calls DELETE /accounts/:id and returns success text', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({ name: 'delete_account', arguments: { account_id: 5 } });
    expect(req).toHaveBeenCalledWith('/accounts/5', { method: 'DELETE' });
    expect(textResult(result)).toBe('Account deleted successfully.');
  });
});

describe('Categories', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_categories calls GET /categories', async () => {
    req.mockResolvedValue([{ id: 1, name: 'Lazer' }]);
    await client.callTool({ name: 'list_categories', arguments: {} });
    expect(req).toHaveBeenCalledWith('/categories');
  });

  it('get_category calls GET /categories/:id', async () => {
    req.mockResolvedValue({ id: 1 });
    await client.callTool({ name: 'get_category', arguments: { category_id: 1 } });
    expect(req).toHaveBeenCalledWith('/categories/1');
  });

  it('create_category calls POST /categories', async () => {
    req.mockResolvedValue({ id: 99 });
    await client.callTool({ name: 'create_category', arguments: { name: 'SEO' } });
    expect(req).toHaveBeenCalledWith('/categories', { method: 'POST', body: { name: 'SEO' } });
  });

  it('update_category calls PUT /categories/:id', async () => {
    req.mockResolvedValue({ id: 1 });
    await client.callTool({
      name: 'update_category',
      arguments: { category_id: 1, name: 'Marketing' },
    });
    expect(req).toHaveBeenCalledWith('/categories/1', {
      method: 'PUT',
      body: { name: 'Marketing' },
    });
  });

  it('delete_category calls DELETE /categories/:id', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_category',
      arguments: { category_id: 1, replacement_id: 2 },
    });
    expect(req).toHaveBeenCalledWith('/categories/1', {
      method: 'DELETE',
      body: { replacement_id: 2 },
    });
    expect(textResult(result)).toBe('Category deleted successfully.');
  });
});

describe('Credit Cards', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_credit_cards calls GET /credit_cards', async () => {
    req.mockResolvedValue([{ id: 3 }]);
    await client.callTool({ name: 'list_credit_cards', arguments: {} });
    expect(req).toHaveBeenCalledWith('/credit_cards');
  });

  it('get_credit_card calls GET /credit_cards/:id', async () => {
    req.mockResolvedValue({ id: 3 });
    await client.callTool({ name: 'get_credit_card', arguments: { credit_card_id: 3 } });
    expect(req).toHaveBeenCalledWith('/credit_cards/3');
  });

  it('create_credit_card calls POST /credit_cards', async () => {
    req.mockResolvedValue({ id: 7 });
    await client.callTool({
      name: 'create_credit_card',
      arguments: { name: 'Visa', card_network: 'visa', due_day: 15, closing_day: 8 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards', {
      method: 'POST',
      body: { name: 'Visa', card_network: 'visa', due_day: 15, closing_day: 8 },
    });
  });

  it('update_credit_card calls PUT /credit_cards/:id', async () => {
    req.mockResolvedValue({ id: 3 });
    await client.callTool({
      name: 'update_credit_card',
      arguments: { credit_card_id: 3, due_day: 20 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/3', {
      method: 'PUT',
      body: { due_day: 20 },
    });
  });

  it('delete_credit_card calls DELETE /credit_cards/:id', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_credit_card',
      arguments: { credit_card_id: 3 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/3', { method: 'DELETE' });
    expect(textResult(result)).toBe('Credit card deleted successfully.');
  });
});

describe('Credit Card Invoices', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_invoices calls GET /credit_cards/:id/invoices without filters', async () => {
    req.mockResolvedValue([]);
    await client.callTool({ name: 'list_invoices', arguments: { credit_card_id: 3 } });
    expect(req).toHaveBeenCalledWith('/credit_cards/3/invoices');
  });

  it('list_invoices appends date query params', async () => {
    req.mockResolvedValue([]);
    await client.callTool({
      name: 'list_invoices',
      arguments: { credit_card_id: 3, start_date: '2024-01-01', end_date: '2024-12-31' },
    });
    expect(req).toHaveBeenCalledWith(
      '/credit_cards/3/invoices?start_date=2024-01-01&end_date=2024-12-31'
    );
  });

  it('get_invoice calls GET /credit_cards/:id/invoices/:invoice_id', async () => {
    req.mockResolvedValue({ id: 186 });
    await client.callTool({
      name: 'get_invoice',
      arguments: { credit_card_id: 3, invoice_id: 186 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/3/invoices/186');
  });

  it('get_invoice_payments calls GET .../payments', async () => {
    req.mockResolvedValue({ id: 1033 });
    await client.callTool({
      name: 'get_invoice_payments',
      arguments: { credit_card_id: 3, invoice_id: 186 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/3/invoices/186/payments');
  });
});

describe('Budgets', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn().mockResolvedValue([]);
    client = await buildClient(req);
  });

  it('list_budgets without filters calls GET /budgets', async () => {
    await client.callTool({ name: 'list_budgets', arguments: {} });
    expect(req).toHaveBeenCalledWith('/budgets');
  });

  it('list_budgets with year calls GET /budgets/:year', async () => {
    await client.callTool({ name: 'list_budgets', arguments: { year: 2024 } });
    expect(req).toHaveBeenCalledWith('/budgets/2024');
  });

  it('list_budgets with year and month calls GET /budgets/:year/:month', async () => {
    await client.callTool({ name: 'list_budgets', arguments: { year: 2024, month: 3 } });
    expect(req).toHaveBeenCalledWith('/budgets/2024/3');
  });
});

describe('Transactions', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_transactions without filters calls GET /transactions', async () => {
    req.mockResolvedValue([]);
    await client.callTool({ name: 'list_transactions', arguments: {} });
    expect(req).toHaveBeenCalledWith('/transactions');
  });

  it('list_transactions with date and account filters appends query params', async () => {
    req.mockResolvedValue([]);
    await client.callTool({
      name: 'list_transactions',
      arguments: { start_date: '2024-01-01', end_date: '2024-01-31', account_id: 3 },
    });
    expect(req).toHaveBeenCalledWith(
      '/transactions?start_date=2024-01-01&end_date=2024-01-31&account_id=3'
    );
  });

  it('get_transaction calls GET /transactions/:id', async () => {
    req.mockResolvedValue({ id: 15 });
    await client.callTool({ name: 'get_transaction', arguments: { transaction_id: 15 } });
    expect(req).toHaveBeenCalledWith('/transactions/15');
  });

  it('create_transaction with account_id calls POST /transactions', async () => {
    req.mockResolvedValue({ id: 20 });
    await client.callTool({
      name: 'create_transaction',
      arguments: {
        description: 'Mercado',
        date: '2024-01-10',
        amount_cents: -5000,
        account_id: 3,
      },
    });
    expect(req).toHaveBeenCalledWith('/transactions', {
      method: 'POST',
      body: { description: 'Mercado', date: '2024-01-10', amount_cents: -5000, account_id: 3 },
    });
  });

  it('create_transaction with credit_card_id uses credit_card_id in body', async () => {
    req.mockResolvedValue({ id: 21 });
    await client.callTool({
      name: 'create_transaction',
      arguments: {
        description: 'Compra',
        date: '2024-01-10',
        amount_cents: -1000,
        credit_card_id: 868925,
      },
    });
    const [, options] = req.mock.calls[0];
    expect(options.body).toMatchObject({ credit_card_id: 868925 });
    expect(options.body).not.toHaveProperty('account_id');
  });

  it('create_transaction with installments sends installments_attributes', async () => {
    req.mockResolvedValue({ id: 22 });
    await client.callTool({
      name: 'create_transaction',
      arguments: {
        description: 'Parcelado',
        date: '2024-01-10',
        amount_cents: -120000,
        account_id: 3,
        installments_attributes: { periodicity: 'monthly', total: 12 },
      },
    });
    const [, options] = req.mock.calls[0];
    expect(options.body.installments_attributes).toEqual({ periodicity: 'monthly', total: 12 });
  });

  it('update_transaction calls PUT /transactions/:id', async () => {
    req.mockResolvedValue({ id: 15 });
    await client.callTool({
      name: 'update_transaction',
      arguments: { transaction_id: 15, description: 'Updated', update_future: true },
    });
    expect(req).toHaveBeenCalledWith('/transactions/15', {
      method: 'PUT',
      body: { description: 'Updated', update_future: true },
    });
  });

  it('delete_transaction calls DELETE /transactions/:id', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_transaction',
      arguments: { transaction_id: 15, update_all: true },
    });
    expect(req).toHaveBeenCalledWith('/transactions/15', {
      method: 'DELETE',
      body: { update_all: true },
    });
    expect(textResult(result)).toBe('Transaction deleted successfully.');
  });
});

describe('Transfers', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_transfers calls GET /transfers', async () => {
    req.mockResolvedValue([]);
    await client.callTool({ name: 'list_transfers', arguments: {} });
    expect(req).toHaveBeenCalledWith('/transfers');
  });

  it('get_transfer calls GET /transfers/:id', async () => {
    req.mockResolvedValue({ id: 10 });
    await client.callTool({ name: 'get_transfer', arguments: { transfer_id: 10 } });
    expect(req).toHaveBeenCalledWith('/transfers/10');
  });

  it('create_transfer calls POST /transfers with debit/credit accounts', async () => {
    req.mockResolvedValue({ id: 11 });
    await client.callTool({
      name: 'create_transfer',
      arguments: {
        credit_account_id: 3,
        debit_account_id: 4,
        amount_cents: 10000,
        date: '2024-01-01',
      },
    });
    expect(req).toHaveBeenCalledWith('/transfers', {
      method: 'POST',
      body: { credit_account_id: 3, debit_account_id: 4, amount_cents: 10000, date: '2024-01-01' },
    });
  });

  it('update_transfer calls PUT /transfers/:id', async () => {
    req.mockResolvedValue({ id: 10 });
    await client.callTool({
      name: 'update_transfer',
      arguments: { transfer_id: 10, description: 'Ajuste' },
    });
    expect(req).toHaveBeenCalledWith('/transfers/10', {
      method: 'PUT',
      body: { description: 'Ajuste' },
    });
  });

  it('delete_transfer calls DELETE /transfers/:id', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_transfer',
      arguments: { transfer_id: 10 },
    });
    expect(req).toHaveBeenCalledWith('/transfers/10', { method: 'DELETE' });
    expect(textResult(result)).toBe('Transfer deleted successfully.');
  });
});
