import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPageTools } from './tools/pages.js';
import { registerChapterTools } from './tools/chapters.js';
import { registerBookTools } from './tools/books.js';
import { registerShelfTools } from './tools/shelves.js';
import { registerSearchTools } from './tools/search.js';
import { registerAttachmentTools } from './tools/attachments.js';
import { registerCommentTools } from './tools/comments.js';
import { registerPermissionTools } from './tools/permissions.js';
import { registerRecycleBinTools } from './tools/recycle-bin.js';
import { registerRoleTools } from './tools/roles.js';
import { registerUserTools } from './tools/users.js';
import { registerSystemTools } from './tools/system.js';
import { registerAuditLogTools } from './tools/audit-log.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'bookstack-mcp', version: '1.0.0' });

  registerPageTools(server);
  registerChapterTools(server);
  registerBookTools(server);
  registerShelfTools(server);
  registerSearchTools(server);
  registerAttachmentTools(server);
  registerCommentTools(server);
  registerPermissionTools(server);
  registerRecycleBinTools(server);
  registerRoleTools(server);
  registerUserTools(server);
  registerSystemTools(server);
  registerAuditLogTools(server);

  return server;
}
