# BookStack MCP Server

MCP server exposing the BookStack API to Claude.ai via OAuth 2.0.

## Tech Stack

- **Runtime**: Node.js 24 (CommonJS)
- **Language**: TypeScript strict mode
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **BookStack API**: native `fetch` (REST HTTP client)
- **HTTP**: Express 4
- **Auth**: JWT via `jsonwebtoken`, OAuth 2.0 via MCP SDK's `mcpAuthRouter`
- **Token store**: `node:sqlite` built-in (no native compilation — works on Node 24)

## Project Structure

```
src/
├── config.ts           # Env var validation (fail-fast on startup)
├── index.ts            # Express app + startup/shutdown lifecycle
├── auth/
│   ├── db.ts           # node:sqlite singleton + schema init
│   ├── store.ts        # SQLite-backed OAuth state (codes, tokens, clients)
│   ├── oauth.ts        # OAuthServerProvider + HTML login form
│   └── middleware.ts   # Bearer JWT validation middleware
├── bookstack/
│   └── client.ts       # BookStack API client — all API calls go here
└── mcp/
    ├── server.ts       # McpServer factory + tool registration
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

## Development

```bash
cp .env.example .env    # fill in your values
npm install
npm run dev             # tsx with hot reload
npm run build           # compile to dist/ via esbuild (~1s)
npm start               # run compiled output
```

> **IMPORTANT**: NEVER run `npm run typecheck` — the MCP SDK's type definitions exceed Node's heap limit and will OOM.
> Use `npm run build` (esbuild) to verify the code compiles.

## BookStack API Conventions

- Base URL: `${BOOKSTACK_URL}/api/`
- Auth header: `Authorization: Token <token_id>:<token_secret>`
- List endpoints support `count`, `offset`, `sort`, and `filter` query params
- DELETE endpoints return 204 No Content on success
- Export endpoints (`/export/markdown`, `/export/plaintext`) return raw text, not JSON

The `bookstack` singleton in `src/bookstack/client.ts` abstracts all of this. Tool code never calls `fetch` directly.

## Adding a New Tool

1. Add the method to `BookStackClient` in `src/bookstack/client.ts` if needed
2. Register the tool in the appropriate file under `src/mcp/tools/`
3. Import and call the registration function in `createMcpServer()` in `src/mcp/server.ts` if it's a new file
4. Update the Tools table in `README.md`
5. Run `npm run build` to verify

Tool registration pattern:

```typescript
server.tool(
  'tool-name',
  'What this tool does.',
  {
    id: z.number().int().describe('Resource ID'),
    name: z.string().optional().describe('Optional name'),
  },
  async ({ id, name }) => {
    try {
      return ok(await bookstack.get(`resource/${id}`));
    } catch (e) { return err(e); }
  },
);
```

The `ok` and `err` helpers are defined at the top of each tool file:

```typescript
const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const err = (e: unknown) => ({ content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true as const });
```

## Coding Rules

- No file > 300 lines
- No function > 50 lines
- TypeScript strict mode — no `any` without comment justification
- All tool handlers must have a try/catch returning `err(e)` on error
- All BookStack API calls go through `bookstack` — no direct `fetch` usage in tool files

## Auth Flow (for reference)

1. Claude.ai discovers OAuth metadata at `/.well-known/oauth-authorization-server`
2. Redirects user to `/authorize` — our HTML form asks for `MCP_AUTH_PASSWORD`
3. On correct password, we issue an auth code and redirect back to Claude.ai
4. Claude.ai exchanges the code at `/token` for a JWT access token (24hr) + refresh token (90d)
5. All `/mcp` requests include `Authorization: Bearer <jwt>` — validated by `bearerAuth` middleware

## README Maintenance

**Keep README.md in sync when making changes:**

- Adding a tool → update the correct row in the Tools table
- Adding a new tool file → add a new row to the table and update the Project Structure tree
- Adding/removing env vars → update the Environment Variables table
- The feature count in the Features section ("58 tools") must match the actual count
