import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerAttachmentTools(server: McpServer): void {
  server.tool(
    'list-attachments',
    'List attachments visible to the user.',
    {
      count: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ count, offset }) => {
      try {
        const result = await bookstack.get('attachments', { count, offset });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-attachment-link',
    'Create an attachment as an external link attached to a page.',
    {
      name: z.string().min(1).max(255),
      uploaded_to: z.number().int().describe('Page ID to attach to'),
      link: z.string().url().describe('External URL for the attachment'),
    },
    async (body) => {
      try {
        const result = await bookstack.post('attachments', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-attachment',
    'Get a single attachment by ID.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`attachments/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-attachment',
    'Update an attachment.',
    {
      id: z.number().int(),
      name: z.string().min(1).max(255).optional(),
      uploaded_to: z.number().int().optional().describe('Page ID to move attachment to'),
      link: z.string().optional().describe('New external URL (for link-type attachments)'),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`attachments/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-attachment',
    'Delete an attachment permanently.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`attachments/${id}`);
        return ok({ success: true, message: `Attachment ${id} deleted` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
