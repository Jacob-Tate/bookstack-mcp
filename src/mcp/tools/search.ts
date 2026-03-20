import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerSearchTools(server: McpServer): void {
  server.tool(
    'search',
    'Search all content (pages, chapters, books, shelves). Supports BookStack search syntax.',
    {
      query: z
        .string()
        .describe('Search query. Supports BookStack search syntax e.g. "cats {type:page} {tag:Animal=Cat}"'),
      page: z.coerce.number().int().min(1).optional().default(1),
      count: z.coerce.number().int().min(1).max(100).optional().default(20),
    },
    async ({ query, page, count }) => {
      try {
        const result = await bookstack.get('search', { query, page, count });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
