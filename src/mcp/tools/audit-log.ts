import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bookstack } from '../../bookstack/client.js';

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const err = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true as const,
});

export function registerAuditLogTools(server: McpServer): void {
  server.tool(
    'list-audit-log',
    'List audit log entries. Requires admin permissions.',
    {
      count: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
      filter: z.string().optional().describe('Filter key=value e.g. "type:eq=page_create"'),
    },
    async ({ count, offset, filter }) => {
      try {
        const params: Record<string, string | number | undefined> = { count, offset };
        if (filter) params['filter'] = filter;
        const result = await bookstack.get('audit-log', params);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
