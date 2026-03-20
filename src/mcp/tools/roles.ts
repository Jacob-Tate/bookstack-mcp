import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerRoleTools(server: McpServer): void {
  server.tool(
    'list-roles',
    'List roles in the system. Requires admin permissions.',
    {
      count: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ count, offset }) => {
      try {
        const result = await bookstack.get('roles', { count, offset });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-role',
    'Create a new role. Requires admin permissions.',
    {
      display_name: z.string().min(1).max(180),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional().describe('Array of permission names to grant'),
      mfa_enforced: z.boolean().optional(),
      external_auth_id: z.string().optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('roles', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-role',
    'Get a single role by ID.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`roles/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-role',
    'Update a role. Requires admin permissions.',
    {
      id: z.number().int(),
      display_name: z.string().min(1).max(180).optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional().describe('Array of permission names to grant'),
      mfa_enforced: z.boolean().optional(),
      external_auth_id: z.string().optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`roles/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-role',
    'Delete a role. Requires admin permissions.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        await bookstack.delete(`roles/${id}`);
        return ok({ success: true, message: `Role ${id} deleted` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
