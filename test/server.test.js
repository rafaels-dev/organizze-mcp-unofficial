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

describe('Tool surface', () => {
  it('only exposes tools that complement the official Organizze MCP', async () => {
    const client = await buildClient(vi.fn());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'archive_account',
        'archive_credit_card',
        'delete_transaction_advanced',
        'delete_transfer',
        'find_credit_card_invoice',
        'get_credit_card_invoice_raw',
        'get_entity',
        'get_user',
        'list_category_colors',
        'list_entities',
        'list_transaction_occurrences',
        'list_transactions_raw',
        'list_users',
        'move_transactions',
        'unarchive_account',
        'unarchive_credit_card',
        'update_transaction_advanced',
        'update_transfer',
      ].sort()
    );
  });
});

describe('Transactions', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('update_transaction_advanced calls PUT /transactions/:id with credit_card_invoice_id', async () => {
    req.mockResolvedValue({ id: 3229120849, credit_card_invoice_id: 320 });
    const result = await client.callTool({
      name: 'update_transaction_advanced',
      arguments: { transaction_id: 3229120849, credit_card_invoice_id: 320, date: '2026-08-11' },
    });
    expect(req).toHaveBeenCalledWith('/transactions/3229120849', {
      method: 'PUT',
      body: { credit_card_invoice_id: 320, date: '2026-08-11' },
    });
    expect(parseResult(result)).toEqual({ id: 3229120849, credit_card_invoice_id: 320 });
  });

  it('update_transaction_advanced forwards update_future for installment series', async () => {
    req.mockResolvedValue({ id: 10 });
    await client.callTool({
      name: 'update_transaction_advanced',
      arguments: { transaction_id: 10, credit_card_id: 4, update_future: true },
    });
    expect(req).toHaveBeenCalledWith('/transactions/10', {
      method: 'PUT',
      body: { credit_card_id: 4, update_future: true },
    });
  });

  it('delete_transaction_advanced calls DELETE /transactions/:id without body by default', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_transaction_advanced',
      arguments: { transaction_id: 10 },
    });
    expect(req).toHaveBeenCalledWith('/transactions/10', { method: 'DELETE' });
    expect(textResult(result)).toBe('Transaction deleted successfully.');
  });

  it('delete_transaction_advanced forwards update_future to delete a whole series tail', async () => {
    req.mockResolvedValue(null);
    await client.callTool({
      name: 'delete_transaction_advanced',
      arguments: { transaction_id: 10, update_future: true },
    });
    expect(req).toHaveBeenCalledWith('/transactions/10', {
      method: 'DELETE',
      body: { update_future: true },
    });
  });

  it('move_transactions PUTs each transaction and reports per-id results', async () => {
    req
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('Organizze API error 404: not found'))
      .mockResolvedValueOnce({ id: 3 });
    const result = await client.callTool({
      name: 'move_transactions',
      arguments: { transaction_ids: [1, 2, 3], credit_card_invoice_id: 320 },
    });
    expect(req).toHaveBeenCalledTimes(3);
    expect(req).toHaveBeenNthCalledWith(2, '/transactions/2', {
      method: 'PUT',
      body: { credit_card_invoice_id: 320 },
    });
    const summary = parseResult(result);
    expect(summary.moved).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.results[1]).toEqual({
      id: 2,
      ok: false,
      error: 'Organizze API error 404: not found',
    });
  });

  it('move_transactions refuses a call with no target field', async () => {
    const result = await client.callTool({
      name: 'move_transactions',
      arguments: { transaction_ids: [1] },
    });
    expect(req).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
  });

  it('list_transactions_raw forwards dates and account filter as query string', async () => {
    req.mockResolvedValue([{ id: 1 }]);
    await client.callTool({
      name: 'list_transactions_raw',
      arguments: { start_date: '2026-07-12', end_date: '2026-08-31', account_id: 5 },
    });
    expect(req).toHaveBeenCalledWith(
      '/transactions?start_date=2026-07-12&end_date=2026-08-31&account_id=5'
    );
  });

  it('list_transactions_raw with no params calls the bare endpoint', async () => {
    req.mockResolvedValue([]);
    await client.callTool({ name: 'list_transactions_raw', arguments: {} });
    expect(req).toHaveBeenCalledWith('/transactions');
  });
});

describe('Invoices', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('find_credit_card_invoice filters the invoice list by month', async () => {
    req.mockResolvedValue([
      { id: 318, date: '2026-07-16' },
      { id: 319, date: '2026-08-16' },
      { id: 320, date: '2026-09-16' },
    ]);
    const result = await client.callTool({
      name: 'find_credit_card_invoice',
      arguments: { credit_card_id: 9, month: '2026-08' },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/9/invoices');
    expect(parseResult(result)).toEqual([{ id: 319, date: '2026-08-16' }]);
  });

  it('find_credit_card_invoice lists available invoices when the month has none', async () => {
    req.mockResolvedValue([{ id: 318, date: '2026-07-16' }]);
    const result = await client.callTool({
      name: 'find_credit_card_invoice',
      arguments: { credit_card_id: 9, month: '2026-01' },
    });
    expect(textResult(result)).toContain('No invoice found for 2026-01');
    expect(textResult(result)).toContain('2026-07-16');
  });

  it('get_credit_card_invoice_raw calls GET /credit_cards/:id/invoices/:invoice_id', async () => {
    req.mockResolvedValue({ id: 319, paid: true, transactions: [{ id: 1 }] });
    const result = await client.callTool({
      name: 'get_credit_card_invoice_raw',
      arguments: { credit_card_id: 9, invoice_id: 319 },
    });
    expect(req).toHaveBeenCalledWith('/credit_cards/9/invoices/319');
    expect(parseResult(result)).toEqual({ id: 319, paid: true, transactions: [{ id: 1 }] });
  });
});

describe('Transfers', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('update_transfer calls PUT /transfers/:id with body', async () => {
    req.mockResolvedValue({ id: 7, amount_cents: 5000 });
    const result = await client.callTool({
      name: 'update_transfer',
      arguments: { transfer_id: 7, amount_cents: 5000, paid: true },
    });
    expect(req).toHaveBeenCalledWith('/transfers/7', {
      method: 'PUT',
      body: { amount_cents: 5000, paid: true },
    });
    expect(parseResult(result)).toEqual({ id: 7, amount_cents: 5000 });
  });

  it('delete_transfer calls DELETE /transfers/:id and returns success text', async () => {
    req.mockResolvedValue(null);
    const result = await client.callTool({
      name: 'delete_transfer',
      arguments: { transfer_id: 7 },
    });
    expect(req).toHaveBeenCalledWith('/transfers/7', { method: 'DELETE' });
    expect(textResult(result)).toBe('Transfer deleted successfully.');
  });
});

describe('Archiving', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('archive_account calls PUT /accounts/:id/archive', async () => {
    req.mockResolvedValue({ id: 5, archived: true });
    const result = await client.callTool({
      name: 'archive_account',
      arguments: { account_id: 5 },
    });
    expect(req).toHaveBeenCalledWith('/accounts/5/archive', { method: 'PUT' });
    expect(parseResult(result)).toEqual({ id: 5, archived: true });
  });

  it('unarchive_account calls PUT /accounts/:id/unarchive', async () => {
    req.mockResolvedValue({ id: 5, archived: false });
    await client.callTool({ name: 'unarchive_account', arguments: { account_id: 5 } });
    expect(req).toHaveBeenCalledWith('/accounts/5/unarchive', { method: 'PUT' });
  });

  it('archive_credit_card calls PUT /credit_cards/:id/archive', async () => {
    req.mockResolvedValue({ id: 9, archived: true });
    await client.callTool({ name: 'archive_credit_card', arguments: { credit_card_id: 9 } });
    expect(req).toHaveBeenCalledWith('/credit_cards/9/archive', { method: 'PUT' });
  });

  it('unarchive_credit_card calls PUT /credit_cards/:id/unarchive', async () => {
    req.mockResolvedValue({ id: 9, archived: false });
    await client.callTool({ name: 'unarchive_credit_card', arguments: { credit_card_id: 9 } });
    expect(req).toHaveBeenCalledWith('/credit_cards/9/unarchive', { method: 'PUT' });
  });
});

describe('Entities', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_entities calls GET /entities', async () => {
    req.mockResolvedValue([{ id: 1, name: 'Pessoal' }]);
    const result = await client.callTool({ name: 'list_entities', arguments: {} });
    expect(req).toHaveBeenCalledWith('/entities');
    expect(parseResult(result)).toEqual([{ id: 1, name: 'Pessoal' }]);
  });

  it('get_entity calls GET /entities/:id', async () => {
    req.mockResolvedValue({ id: 2, name: 'Empresa' });
    await client.callTool({ name: 'get_entity', arguments: { entity_id: 2 } });
    expect(req).toHaveBeenCalledWith('/entities/2');
  });
});

describe('Users', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_users calls GET /users', async () => {
    req.mockResolvedValue([{ id: 3, name: 'Esdras' }]);
    const result = await client.callTool({ name: 'list_users', arguments: {} });
    expect(req).toHaveBeenCalledWith('/users');
    expect(parseResult(result)).toEqual([{ id: 3, name: 'Esdras' }]);
  });

  it('get_user calls GET /users/:id', async () => {
    req.mockResolvedValue({ id: 3, name: 'Esdras' });
    const result = await client.callTool({ name: 'get_user', arguments: { user_id: 3 } });
    expect(req).toHaveBeenCalledWith('/users/3');
    expect(parseResult(result)).toEqual({ id: 3, name: 'Esdras' });
  });
});

describe('Recurrences', () => {
  let req, client;

  beforeEach(async () => {
    req = vi.fn();
    client = await buildClient(req);
  });

  it('list_transaction_occurrences calls GET /transactions/:id/occurrences', async () => {
    req.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    const result = await client.callTool({
      name: 'list_transaction_occurrences',
      arguments: { transaction_id: 11 },
    });
    expect(req).toHaveBeenCalledWith('/transactions/11/occurrences');
    expect(parseResult(result)).toEqual([{ id: 11 }, { id: 12 }]);
  });

  it('list_transaction_occurrences forwards the page parameter', async () => {
    req.mockResolvedValue([{ id: 13 }]);
    await client.callTool({
      name: 'list_transaction_occurrences',
      arguments: { transaction_id: 11, page: 2 },
    });
    expect(req).toHaveBeenCalledWith('/transactions/11/occurrences?page=2');
  });
});

describe('Categories', () => {
  it('list_category_colors calls GET /categories/colors', async () => {
    const req = vi.fn().mockResolvedValue([['f0f0f0'], ['438b83']]);
    const client = await buildClient(req);
    const result = await client.callTool({ name: 'list_category_colors', arguments: {} });
    expect(req).toHaveBeenCalledWith('/categories/colors');
    expect(parseResult(result)).toEqual([['f0f0f0'], ['438b83']]);
  });
});
