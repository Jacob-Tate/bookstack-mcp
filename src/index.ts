import './config.js'; // validate env vars at startup
import fs from 'fs';
import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { createOAuthProvider, renderLoginForm } from './auth/oauth.js';
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

// POST /authorize — handle login form submission
app.post('/authorize', (req, res) => {
  const { password, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.body as {
    password: string;
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    state: string;
  };

  if (password !== config.MCP_AUTH_PASSWORD) {
    // Re-render login form with error message
    const html = renderLoginForm({
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      state,
      error: 'Incorrect password. Please try again.',
    });
    res.setHeader('Content-Type', 'text/html');
    res.status(401).send(html);
    return;
  }

  // Password correct — issue auth code and redirect
  const code = uuidv4();
  store.saveAuthCode(code, {
    client_id,
    redirect_uri,
    code_challenge,
    state,
  });

  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set('code', code);
  if (state) callbackUrl.searchParams.set('state', state);
  res.redirect(callbackUrl.toString());
});

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
