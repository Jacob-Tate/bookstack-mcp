import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerBookTools(server: McpServer): void {
  server.tool(
    'list-books',
    'List books visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
      sort: z.string().optional(),
      filter: z.string().optional().describe('Filter key=value e.g. "name:eq=My Book"'),
    },
    async ({ count, offset, sort, filter }) => {
      try {
        const params: Record<string, string | number | undefined> = { count, offset };
        if (sort) params['sort'] = sort;
        if (filter) params['filter'] = filter;
        const result = await bookstack.get('books', params);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-book',
    'Create a new book.',
    {
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      description_html: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      default_template_id: z.number().int().optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('books', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-book',
    'Get a single book by ID, including the content tree with chapters and pages.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`books/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-book',
    'Update a book.',
    {
      id: z.number().int(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      description_html: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      default_template_id: z.number().int().optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`books/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-book',
    'Delete a book (sends to recycle bin).',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`books/${id}`);
        return ok({ success: true, message: `Book ${id} deleted (moved to recycle bin)` });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-book-markdown',
    'Export a book as markdown text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`books/${id}/export/markdown`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-book-plaintext',
    'Export a book as plain text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`books/${id}/export/plaintext`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );
}
