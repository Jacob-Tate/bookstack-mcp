import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerPageTools(server: McpServer): void {
  server.tool(
    'list-pages',
    'List pages visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
      sort: z.string().optional(),
      filter: z.string().optional().describe('Filter key=value e.g. "name:eq=My Page"'),
    },
    async ({ count, offset, sort, filter }) => {
      try {
        const params: Record<string, string | number | undefined> = { count, offset };
        if (sort) params['sort'] = sort;
        if (filter) params['filter'] = filter;
        const result = await bookstack.get('pages', params);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-page',
    'Create a new page. A parent book_id or chapter_id is required.',
    {
      book_id: z.number().int().optional(),
      chapter_id: z.number().int().optional(),
      name: z.string().min(1).max(255),
      html: z.string().optional(),
      markdown: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      priority: z.number().int().optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('pages', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-page',
    'Get a single page by ID — returns metadata, tags, and parent info. Content fields (html, markdown) are stripped by default to save tokens; use export-page-markdown or export-page-plaintext to read content.',
    {
      id: z.number().int(),
      include_content: z.boolean().optional().default(false).describe('Set true to include html and markdown fields'),
    },
    async ({ id, include_content }) => {
      try {
        const result = await bookstack.get<Record<string, unknown>>(`pages/${id}`);
        if (!include_content) {
          const { html: _h, raw_html: _r, markdown: _m, ...meta } = result;
          return ok(meta);
        }
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-page',
    'Update a page. Providing book_id or chapter_id moves the page.',
    {
      id: z.number().int(),
      book_id: z.number().int().optional(),
      chapter_id: z.number().int().optional(),
      name: z.string().min(1).max(255).optional(),
      html: z.string().optional(),
      markdown: z.string().optional(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      priority: z.number().int().optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`pages/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-page',
    'Delete a page (sends to recycle bin).',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`pages/${id}`);
        return ok({ success: true, message: `Page ${id} deleted (moved to recycle bin)` });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-page-markdown',
    'Export a page as markdown text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`pages/${id}/export/markdown`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'export-page-plaintext',
    'Export a page as plain text.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const text = await bookstack.getText(`pages/${id}/export/plaintext`);
        return { content: [{ type: 'text' as const, text }] };
      } catch (e) {
        return err(e);
      }
    },
  );
}
