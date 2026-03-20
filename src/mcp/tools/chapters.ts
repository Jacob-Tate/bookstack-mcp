import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerChapterTools(server: McpServer): void {
  server.tool(
    'list-chapters',
    'List chapters visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
      sort: z.string().optional(),
      filter: z.string().optional().describe('Filter key=value e.g. "name:eq=My Chapter"'),
    },
    async ({ count, offset, sort, filter }) => {
      try {
        const params: Record<string, string | number | undefined> = { count, offset };
        if (sort) params['sort'] = sort;
        if (filter) params['filter'] = filter;
        const result = await bookstack.get('chapters', params);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-chapter',
    'Create a new chapter. book_id and name are required.',
    {
      book_id: z.number().int(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      description_html: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      priority: z.number().int().optional(),
      default_template_id: z.number().int().optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('chapters', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-chapter',
    'Get a single chapter by ID, including its pages list.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`chapters/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-chapter',
    'Update a chapter.',
    {
      id: z.number().int(),
      book_id: z.number().int().optional(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      description_html: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      priority: z.number().int().optional(),
      default_template_id: z.number().int().optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`chapters/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-chapter',
    'Delete a chapter (sends to recycle bin).',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`chapters/${id}`);
        return ok({ success: true, message: `Chapter ${id} deleted (moved to recycle bin)` });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-chapter-markdown',
    'Export a chapter as markdown text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`chapters/${id}/export/markdown`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-chapter-plaintext',
    'Export a chapter as plain text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`chapters/${id}/export/plaintext`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );
}
