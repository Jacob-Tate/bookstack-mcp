import './config.js'; // validate env vars at startup
import fs from 'fs';
import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { createOAuthProvider } from './auth/oauth.js';
import { bearerAuth } from './auth/middleware.js';
import * as store from './auth/store.js';
import { createMcpServer } from './mcp/server.js';

// Ensure data directory exists
fs.mkdirSync('data', { recursive: true });

const provider = createOAuthProvider();
const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount OAuth router (handles /.well-known/oauth-authorization-server, /register, /token, /authorize GET)
app.use(
  mcpAuthRouter({
    provider,
    issuerUrl: new URL(config.BASE_URL),
  }),
);

// MCP endpoint — POST (stateless requests)
app.post('/mcp', bearerAuth, async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// MCP endpoint — GET (SSE)
app.get('/mcp', bearerAuth, async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// MCP endpoint — DELETE (session termination)
app.delete('/mcp', bearerAuth, async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Token revocation endpoint (RFC 7009)
app.post('/revoke', (req, res) => {
  const { token } = req.body as { token?: string };
  if (token) {
    if (token.includes('.')) {
      // Looks like a JWT
      store.revokeAccessToken(token);
    } else {
      // UUID refresh token
      store.revokeRefreshToken(token);
    }
  }
  res.status(200).json({ revoked: true });
});

app.listen(config.PORT, () => {
  console.log(`BookStack MCP server listening on port ${config.PORT}`);
  console.log(`Base URL: ${config.BASE_URL}`);
  console.log(`MCP endpoint: ${config.BASE_URL}/mcp`);
});
