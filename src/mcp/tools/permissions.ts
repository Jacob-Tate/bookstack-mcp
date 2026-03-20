import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

const contentTypeSchema = z.enum(['page', 'book', 'chapter', 'bookshelf']);

export function registerPermissionTools(server: McpServer): void {
  server.tool(
    'get-content-permissions',
    'Get the permission overrides for a specific content item.',
    {
      content_type: contentTypeSchema,
      content_id: z.coerce.number().int(),
    },
    async ({ content_type, content_id }) => {
      try {
        const result = await bookstack.get(`content-permissions/${content_type}/${content_id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-content-permissions',
    'Update the permission overrides for a specific content item.',
    {
      content_type: contentTypeSchema,
      content_id: z.coerce.number().int(),
      owner_id: z.coerce.number().int().optional().describe('User ID of the new owner'),
      role_permissions: z
        .array(
          z.object({
            role_id: z.coerce.number().int(),
            view: z.boolean(),
            create: z.boolean(),
            update: z.boolean(),
            delete: z.boolean(),
          }),
        )
        .optional(),
      fallback_permissions: z
        .object({
          inheriting: z.boolean(),
          view: z.boolean().optional(),
          create: z.boolean().optional(),
          update: z.boolean().optional(),
          delete: z.boolean().optional(),
        })
        .optional(),
    },
    async ({ content_type, content_id, ...body }) => {
      try {
        const result = await bookstack.put(`content-permissions/${content_type}/${content_id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
