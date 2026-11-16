# organizze-mcp

Companion MCP server for the [Organizze](https://www.organizze.com.br/) personal finance REST API.

Organizze now ships an [official MCP server](https://developers.organizze.com.br/) (`https://mcp.organizze.com.br/mcp`, OAuth) with a comprehensive tool set — use that for day-to-day finance work. This project deliberately does **not** duplicate it: it only exposes the REST API v2 endpoints and fields the official MCP does not cover (raw transaction updates/deletes that can reallocate invoices and edit installment series, batch moves between cards/invoices/accounts, raw transaction and invoice lookups, editing/deleting transfers, archiving accounts and cards, entities, users, recurrence occurrences, category colors). Connect both side by side, or use this one standalone where an API-key/self-hosted server fits better than OAuth.

> ⚠️ **DISCLAIMER:** This is an unofficial integration. Use at your own risk.

## Requirements

- Node.js ≥ 22 (LTS recommended)
- An Organizze account with an API token

## Get your API token

Go to [Organizze API settings](https://app.organizze.com.br/configuracoes/api-keys) and generate a token. You'll need three values:

| Variable | Description |
|---|---|
| `ORGANIZZE_EMAIL` | The e-mail of your Organizze account |
| `ORGANIZZE_API_TOKEN` | The token generated above |
| `ORGANIZZE_USER_AGENT` | Identification required by the API, e.g. `Your Name (you@example.com)` |

## How it runs

The server runs as a long-running **Streamable HTTP** endpoint on `/mcp` — the same model as the published Docker image. There is no stdio mode and no npm package to install: run it with Docker (recommended) or straight from a clone, then point your MCP client at the URL.

> Note: the old `organizze-mcp-unofficial` npm package (stdio) is no longer published or maintained. Existing installs keep working with the old tool set, but new versions ship via Docker/HTTP only.

## CLI options

```
--host <host>          Host to bind (default: 127.0.0.1)
-p, --port <port>      Port to bind (default: 3000)
-h, --help             Show help
-v, --version          Show the version
```

Environment equivalents: `HOST` and `PORT`. Command line flags take precedence.

Credentials come from environment variables, or from a `.env` file in the current working directory.

## Running from a clone

```bash
git clone https://github.com/rafaels-dev/organizze-mcp-unofficial
cd organizze-mcp-unofficial
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```dotenv
ORGANIZZE_EMAIL=seu_email@exemplo.com
ORGANIZZE_API_TOKEN=seu_token_aqui
ORGANIZZE_USER_AGENT=Seu Nome (seu_email@exemplo.com)
```

Then start the server:

```bash
node src/index.js
# organizze-mcp listening on http://127.0.0.1:3000/mcp
```

```bash
node src/index.js --host 0.0.0.0 --port 8080
```

## Running with Docker

The image is published on Docker Hub as [`rafaelsdev90/organizze-mcp-unofficial`](https://hub.docker.com/r/rafaelsdev90/organizze-mcp-unofficial).

### docker run

```bash
docker run -d \
  --name organizze-mcp \
  --restart unless-stopped \
  -p 3000:3000 \
  -e ORGANIZZE_EMAIL=seu_email@exemplo.com \
  -e ORGANIZZE_API_TOKEN=seu_token_aqui \
  -e ORGANIZZE_USER_AGENT="Seu Nome (seu_email@exemplo.com)" \
  rafaelsdev90/organizze-mcp-unofficial:latest
```

Or using a `.env` file:

```bash
docker run -d \
  --name organizze-mcp \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  rafaelsdev90/organizze-mcp-unofficial:latest
```

To use a specific version instead of `latest`, replace the tag, e.g. `rafaelsdev90/organizze-mcp-unofficial:0.2.0`.

### docker-compose / Portainer

Create a `docker-compose.yml` file:

```yaml
services:
  organizze-mcp:
    image: rafaelsdev90/organizze-mcp-unofficial:latest
    container_name: organizze-mcp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      ORGANIZZE_EMAIL: seu_email@exemplo.com
      ORGANIZZE_API_TOKEN: seu_token_aqui
      ORGANIZZE_USER_AGENT: "Seu Nome (seu_email@exemplo.com)"
```

Then start it:

```bash
docker compose up -d
```

**Portainer:** paste the `docker-compose.yml` content into a new Stack (`Stacks → Add stack → Web editor`), fill in your credentials, and click *Deploy the stack*.

The server will be available at `http://<server-ip>:3000/mcp`.

### Connecting a client to the HTTP server

```bash
claude mcp add --transport http organizze http://127.0.0.1:3000/mcp
```

Or in `settings.json`:

```json
{
  "mcpServers": {
    "organizze": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

The server reads credentials from its own environment (or `.env`) at startup, so there's no need to pass them in the client config.

## Available tools

Every tool here covers a gap in the official Organizze MCP — nothing overlaps with it.

| Tool | Description | Gap it fills |
|---|---|---|
| `update_transaction_advanced` | Update a transaction via the raw REST API (all fields) | Official `update_transaction` has no `credit_card_invoice_id` (can't move a purchase to another invoice), can't move between cards/accounts, and its `update_recurrence: this_and_future` is a no-op on installment series |
| `delete_transaction_advanced` | Delete a transaction, optionally with future/all occurrences | Official `delete_recurrence: this_and_future` does not remove future installments |
| `move_transactions` | Move a batch of transactions to another card/invoice/account | Official `mass_update_transactions` cannot change account, card, or invoice |
| `list_transactions_raw` | List transactions straight from the REST API | Official `list_transactions` (all_transactions mode) omits invoice-payment entries |
| `find_credit_card_invoice` | Resolve a "YYYY-MM" month to the full invoice object(s) | Official `get_credit_card_invoice` ignores its date parameter; `invoice_date_or_id` "YYYY-MM" mis-parses |
| `get_credit_card_invoice_raw` | Get one invoice with embedded transactions from the REST API | Ground truth when official invoice aggregates are stale; check `paid` before registering a payment |
| `update_transfer` | Update a transfer between bank accounts | Official MCP can only create/list transfers |
| `delete_transfer` | Delete a transfer | Official MCP can only create/list transfers |
| `archive_account` | Archive a bank account | Archiving is not exposed officially |
| `unarchive_account` | Restore an archived bank account | Archiving is not exposed officially |
| `archive_credit_card` | Archive a credit card | Archiving is not exposed officially |
| `unarchive_credit_card` | Restore an archived credit card | Archiving is not exposed officially |
| `list_entities` | List financial entities (spaces) | Official MCP is locked to a single entity |
| `get_entity` | Get an entity (plan, license, owner) | Official MCP is locked to a single entity |
| `list_users` | List users of the current entity | No user tools officially |
| `get_user` | Get user details | No user tools officially |
| `list_transaction_occurrences` | List all occurrences of a recurring/installment series | Not exposed officially |
| `list_category_colors` | List valid hex colors for categories | Not exposed officially |

## Important notes

- **Monetary values** are in cents (`amount_cents`). Example: R$ 150,00 = `15000`. The official MCP takes `amount` in reais (e.g. `150.00`) — don't mix the two.
- **Dates** use the format `YYYY-MM-DD`.
- **IDs** come from the Organizze API. When using this server alongside the official MCP, get transfer/account/card IDs from its list tools (e.g. `list_transferences`, `list_accounts`, `list_transactions`). Invoice IDs for `update_transaction_advanced` / `move_transactions` come from `find_credit_card_invoice`.
