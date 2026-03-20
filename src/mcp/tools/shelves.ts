import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerShelfTools(server: McpServer): void {
  server.tool(
    'list-shelves',
    'List bookshelves visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
      sort: z.string().optional(),
      filter: z.string().optional().describe('Filter key=value e.g. "name:eq=My Shelf"'),
    },
    async ({ count, offset, sort, filter }) => {
      try {
        const params: Record<string, string | number | undefined> = { count, offset };
        if (sort) params['sort'] = sort;
        if (filter) params['filter'] = filter;
        const result = await bookstack.get('shelves', params);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-shelf',
    'Create a new bookshelf.',
    {
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      description_html: z.string().optional(),
      books: z.array(z.number().int()).optional().describe('Array of book IDs to include in this shelf'),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('shelves', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-shelf',
    'Get a single bookshelf by ID, including its books list.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`shelves/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-shelf',
    'Update a bookshelf.',
    {
      id: z.number().int(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      description_html: z.string().optional(),
      books: z.array(z.number().int()).optional().describe('Array of book IDs to include in this shelf'),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`shelves/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-shelf',
    'Delete a bookshelf (sends to recycle bin).',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`shelves/${id}`);
        return ok({ success: true, message: `Shelf ${id} deleted (moved to recycle bin)` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
