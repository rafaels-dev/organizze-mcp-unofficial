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
        'delete_transfer',
        'get_entity',
        'get_user',
        'list_category_colors',
        'list_entities',
        'list_transaction_occurrences',
        'list_users',
        'unarchive_account',
        'unarchive_credit_card',
        'update_transfer',
      ].sort()
    );
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
