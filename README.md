# BookStack MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives Claude.ai direct access to your [BookStack](https://www.bookstackapp.com) knowledge base.

## Features

- **58 tools** covering pages, chapters, books, shelves, search, attachments, comments, permissions, recycle bin, roles, users, system info, and audit log
- **OAuth 2.0** authentication compatible with Claude.ai's MCP integration
- **Single-user** design — your BookStack API token is configured via environment variables, never stored in MCP tokens
- **Stateless HTTP** transport with `StreamableHTTPServerTransport`

## Tools Available

| Group | Tools |
|-------|-------|
| Pages | `list-pages`, `create-page`, `get-page`, `update-page`, `delete-page`, `export-page-markdown`, `export-page-plaintext` |
| Chapters | `list-chapters`, `create-chapter`, `get-chapter`, `update-chapter`, `delete-chapter`, `export-chapter-markdown`, `export-chapter-plaintext` |
| Books | `list-books`, `create-book`, `get-book`, `update-book`, `delete-book`, `export-book-markdown`, `export-book-plaintext` |
| Shelves | `list-shelves`, `create-shelf`, `get-shelf`, `update-shelf`, `delete-shelf` |
| Search | `search` |
| Attachments | `list-attachments`, `create-attachment-link`, `get-attachment`, `update-attachment`, `delete-attachment` |
| Comments | `list-comments`, `create-comment`, `get-comment`, `update-comment`, `delete-comment` |
| Permissions | `get-content-permissions`, `update-content-permissions` |
| Recycle Bin | `list-recycle-bin`, `restore-from-recycle-bin`, `permanently-delete` |
| Roles | `list-roles`, `create-role`, `get-role`, `update-role`, `delete-role` |
| Users | `list-users`, `create-user`, `get-user`, `update-user`, `delete-user` |
| System | `get-system-info` |
| Audit Log | `list-audit-log` |

## Example Prompts

Once connected, you can ask Claude things like:

**Reading & Searching**
- "Find all pages tagged with 'API' in the Developer Guide book"
- "Search for anything about authentication across all books"
- "Show me the contents of the 'Onboarding' book"
- "Export the 'Architecture Overview' page as markdown"

**Writing & Editing**
- "Create a new page in the Infrastructure book called 'Redis Setup' with setup instructions"
- "Update the 'API Reference' page to add a new endpoint section"
- "Move the 'Legacy Auth' page into the 'Archived' chapter"

**Organisation**
- "What books are on the 'Engineering' shelf?"
- "Create a new chapter called 'Deployment' in the DevOps book"
- "Show me everything that's in the recycle bin"
- "Restore the page I accidentally deleted"

**Admin**
- "List all users and their roles"
- "Show me recent audit log entries for page deletions"
- "What permissions does the Editor role have?"

---

## Quick Start with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -v bookstack-mcp-data:/app/data \
  -e BOOKSTACK_URL=https://your-bookstack.example.com \
  -e BOOKSTACK_TOKEN_ID=your-token-id \
  -e BOOKSTACK_TOKEN_SECRET=your-token-secret \
  -e MCP_AUTH_PASSWORD=choose-a-strong-password \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e BASE_URL=https://your-mcp-domain.com \
  ghcr.io/jacob-tate/bookstack-mcp:latest
```

Or with Docker Compose — see [docker-compose.yml](docker-compose.yml).

## Connecting to Claude.ai

1. In Claude.ai, go to **Settings → Integrations → Add MCP Server**
2. Enter your server URL: `https://your-mcp-domain.com/mcp`
3. A browser popup will open — enter your `MCP_AUTH_PASSWORD`
4. Done — Claude can now access your BookStack instance

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOOKSTACK_URL` | ✅ | URL of your BookStack instance |
| `BOOKSTACK_TOKEN_ID` | ✅ | API token ID |
| `BOOKSTACK_TOKEN_SECRET` | ✅ | API token secret |
| `MCP_AUTH_PASSWORD` | ✅ | Password shown in the OAuth browser popup |
| `JWT_SECRET` | ✅ | Random string ≥ 32 chars for signing tokens |
| `BASE_URL` | ✅ | Public HTTPS URL of this MCP server |
| `PORT` | — | HTTP port (default: `3000`) |
| `AUTH_DB_PATH` | — | SQLite DB for OAuth tokens (default: `./data/auth.db`) |

### Generating a BookStack API Token

In BookStack: **Profile → API Tokens → Create Token**

Give it a descriptive name (e.g. "Claude MCP"). The token ID and secret are shown once on creation — save both.

## Running Without Docker

Requires **Node.js 24** (uses the built-in `node:sqlite` — no native compilation needed).

```bash
npm install
cp .env.example .env
# edit .env with your values
npm run build
npm start
```

**Development (hot reload):**
```bash
npm run dev
```

> **Note**: Do not run `npm run typecheck` — the MCP SDK's type definitions exceed Node's heap limit.
> Use `npm run build` (esbuild, ~1s) to verify the code compiles.

## Token Revocation

To invalidate a token immediately (e.g. suspected leak):

```bash
# Revoke an access token (JWT)
curl -X POST https://your-mcp-domain.com/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<access_token>"

# Revoke a refresh token (UUID)
curl -X POST https://your-mcp-domain.com/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<refresh_token>"
```

Always returns `200 OK` per [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009).

> **To invalidate all tokens at once:** rotate `JWT_SECRET` in `.env` and restart. All issued JWTs immediately fail signature verification.

## Deployment Notes

- Expose port 3000 behind a reverse proxy (nginx, Caddy) with HTTPS
- `BASE_URL` must be the public HTTPS URL — Claude.ai requires HTTPS for OAuth
- OAuth tokens are persisted in SQLite (`./data/auth.db`) — survive restarts
- Access tokens expire after 24 hours; refresh tokens last 90 days and rotate silently

## Project Structure

```
src/
├── config.ts              # Env var validation
├── index.ts               # Express app + startup
├── auth/
│   ├── db.ts              # node:sqlite singleton + schema init
│   ├── store.ts           # SQLite-backed OAuth state (tokens, clients)
│   ├── oauth.ts           # OAuthServerProvider + login form
│   └── middleware.ts      # Bearer token validation
├── bookstack/
│   └── client.ts          # BookStack API client (fetch-based)
└── mcp/
    ├── server.ts
    └── tools/
        ├── pages.ts
        ├── chapters.ts
        ├── books.ts
        ├── shelves.ts
        ├── search.ts
        ├── attachments.ts
        ├── comments.ts
        ├── permissions.ts
        ├── recycle-bin.ts
        ├── roles.ts
        ├── users.ts
        ├── system.ts
        └── audit-log.ts
```
