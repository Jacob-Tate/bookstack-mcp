import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerSystemTools(server: McpServer): void {
  server.tool(
    'get-system-info',
    'Get BookStack system information including version, app name, and base URL.',
    {},
    async () => {
      try {
        const result = await bookstack.get('system');
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
