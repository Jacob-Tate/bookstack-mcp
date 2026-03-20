import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerCommentTools(server: McpServer): void {
  server.tool(
    'list-comments',
    'List comments visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ count, offset }) => {
      try {
        const result = await bookstack.get('comments', { count, offset });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-comment',
    'Create a new comment on a page.',
    {
      page_id: z.number().int().describe('ID of the page to comment on'),
      html: z.string().describe('HTML content of the comment'),
      reply_to: z.number().int().optional().describe('local_id of the parent comment to reply to'),
      content_ref: z.string().optional().describe('Optional reference to page content'),
    },
    async (body) => {
      try {
        const result = await bookstack.post('comments', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-comment',
    'Get a single comment by ID.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`comments/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-comment',
    'Update a comment.',
    {
      id: z.number().int(),
      html: z.string().optional().describe('New HTML content'),
      archived: z.boolean().optional().describe('Archive or unarchive the comment'),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`comments/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-comment',
    'Delete a comment permanently.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`comments/${id}`);
        return ok({ success: true, message: `Comment ${id} deleted` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
