import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerRecycleBinTools(server: McpServer): void {
  server.tool(
    'list-recycle-bin',
    'List items in the recycle bin. Requires admin permissions.',
    {
      count: z.coerce.number().int().min(1).max(500).optional().default(20),
      offset: z.coerce.number().int().min(0).optional().default(0),
    },
    async ({ count, offset }) => {
      try {
        const result = await bookstack.get('recycle-bin', { count, offset });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'restore-from-recycle-bin',
    'Restore a deleted item from the recycle bin.',
    {
      deletion_id: z.coerce.number().int().describe('ID of the deletion record to restore'),
    },
    async ({ deletion_id }) => {
      try {
        const result = await bookstack.put(`recycle-bin/${deletion_id}`, {});
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'permanently-delete',
    'PERMANENTLY delete an item from the recycle bin. WARNING: This action is irreversible and the data cannot be recovered.',
    {
      deletion_id: z.coerce.number().int().describe('ID of the deletion record to permanently delete'),
    },
    async ({ deletion_id }) => {
      try {
        await bookstack.delete(`recycle-bin/${deletion_id}`);
        return ok({ success: true, message: `Deletion record ${deletion_id} permanently removed` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
