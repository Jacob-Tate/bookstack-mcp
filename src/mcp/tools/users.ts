import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerUserTools(server: McpServer): void {
  server.tool(
    'list-users',
    'List users in the system. Requires admin permissions.',
    {
      count: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ count, offset }) => {
      try {
        const result = await bookstack.get('users', { count, offset });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'create-user',
    'Create a new user. Requires admin permissions.',
    {
      name: z.string().min(1).max(255),
      email: z.string().email(),
      password: z.string().optional(),
      roles: z.array(z.number().int()).optional().describe('Array of role IDs to assign'),
      send_invite: z.boolean().optional().describe('Send an invite email to the new user'),
      language: z.string().optional().describe('Language code e.g. "en"'),
      external_auth_id: z.string().optional(),
    },
    async (body) => {
      try {
        const result = await bookstack.post('users', body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get-user',
    'Get a single user by ID.',
    { id: z.number().int() },
    async ({ id }) => {
      try {
        const result = await bookstack.get(`users/${id}`);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update-user',
    'Update a user. Requires admin permissions.',
    {
      id: z.number().int(),
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
      password: z.string().optional(),
      roles: z.array(z.number().int()).optional().describe('Array of role IDs to assign'),
      language: z.string().optional(),
      external_auth_id: z.string().optional(),
    },
    async ({ id, ...body }) => {
      try {
        const result = await bookstack.put(`users/${id}`, body);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'delete-user',
    'Delete a user. Requires admin permissions.',
    {
      id: z.number().int(),
      migrate_ownership_id: z
        .number()
        .int()
        .optional()
        .describe('User ID to transfer owned content to before deletion'),
    },
    async ({ id, migrate_ownership_id }) => {
      try {
        const path = migrate_ownership_id
          ? `users/${id}?migrate_ownership_id=${migrate_ownership_id}`
          : `users/${id}`;
        await bookstack.delete(path);
        return ok({ success: true, message: `User ${id} deleted` });
      } catch (e) {
        return err(e);
      }
    },
  );
}
