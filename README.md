# organizze-mcp

MCP server for the [Organizze](https://www.organizze.com.br/) personal finance API — bank accounts, credit cards, invoices, transactions, transfers, categories, and budgets.

> ⚠️ **DISCLAIMER:** This is an unofficial integration. Use at your own risk.

## Requirements

- Node.js ≥ 22 (LTS recommended)
- An Organizze account with an API token

## Setup

### 1. Get your API token

Go to [Organizze API settings](https://app.organizze.com.br/configuracoes/api-keys) and generate a token.

### 2. Clone and install

```bash
git clone https://github.com/rafaels-dev/organizze-mcp
cd organizze-mcp
npm install
```

### 3. Configure credentials

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```dotenv
ORGANIZZE_EMAIL=seu_email@exemplo.com
ORGANIZZE_API_TOKEN=seu_token_aqui
ORGANIZZE_USER_AGENT=Seu Nome (seu_email@exemplo.com)
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

To use a specific version instead of `latest`, replace the tag, e.g. `rafaelsdev90/organizze-mcp-unofficial:0.0.1`.

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

## Running the server (local)

```bash
node src/index.js
# organizze-mcp listening on http://127.0.0.1:3000/mcp
```

You can override the port and host via environment variables:

```bash
PORT=8080 HOST=0.0.0.0 node src/index.js
```

## Configure in Claude Code

First start the server, then register it using the CLI or by editing the settings file manually.

### Via CLI

```bash
claude mcp add --transport http organizze http://127.0.0.1:3000/mcp
```

To add it to a specific scope:

```bash
# Project-level (saves to .claude/settings.json)
claude mcp add --transport http --scope project organizze http://127.0.0.1:3000/mcp

# User-level (saves to ~/.claude/settings.json)
claude mcp add --transport http --scope user organizze http://127.0.0.1:3000/mcp
```

### Via settings.json

Add to `~/.claude/settings.json` (user-level) or `.claude/settings.json` (project-level):

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

The server reads credentials from the `.env` file (or environment variables) at startup, so there's no need to pass them in the Claude Code config.

## Available tools

| Tool | Description |
|---|---|
| `get_user` | Get user details |
| `list_accounts` | List bank accounts |
| `get_account` | Get a bank account |
| `create_account` | Create a bank account |
| `update_account` | Update a bank account |
| `delete_account` | Delete a bank account |
| `list_categories` | List categories |
| `get_category` | Get a category |
| `create_category` | Create a category |
| `update_category` | Update a category |
| `delete_category` | Delete a category |
| `list_credit_cards` | List credit cards |
| `get_credit_card` | Get a credit card |
| `create_credit_card` | Create a credit card |
| `update_credit_card` | Update a credit card |
| `delete_credit_card` | Delete a credit card |
| `list_invoices` | List credit card invoices |
| `get_invoice` | Get invoice details (with transactions and payments) |
| `get_invoice_payments` | Get payments for an invoice |
| `list_budgets` | List budgets (current month, by year, or by month) |
| `list_transactions` | List transactions with optional date/account filters |
| `get_transaction` | Get a transaction |
| `create_transaction` | Create a transaction (simple, recurring, or installment) |
| `update_transaction` | Update a transaction |
| `delete_transaction` | Delete a transaction |
| `list_transfers` | List transfers |
| `get_transfer` | Get a transfer |
| `create_transfer` | Create a transfer between bank accounts |
| `update_transfer` | Update a transfer |
| `delete_transfer` | Delete a transfer |

## Important notes

- **Monetary values** are always in cents (`amount_cents`). Example: R$ 150,00 = `15000`.
- **Dates** use the format `YYYY-MM-DD`.
- **Credit card transactions:** always use `credit_card_id` (not `account_id`) to post to a credit card. Using `account_id` for a credit card account redirects to the default bank account.
- **Negative amounts** = expenses/debits; **positive amounts** = income/credits.
- **Recurring transactions:** use `recurrence_attributes` with a `periodicity` value.
- **Installment transactions:** use `installments_attributes` with `periodicity` and `total`.
- **Periodicity values:** `monthly`, `yearly`, `weekly`, `biweekly`, `bimonthly`, `trimonthly`.
