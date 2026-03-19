import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { OAuthServerProvider, OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthTokens,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { config } from '../config.js';
import * as store from './store.js';

export function renderLoginForm(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  error?: string;
}): string {
  const { clientId, redirectUri, codeChallenge, codeChallengeMethod, state, error } = params;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BookStack MCP \u2013 Connect</title>
  <style>
    body { background: #1a1a2e; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
    .card { background: #16213e; border-radius: 12px; padding: 40px; width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    h1 { color: #e2e8f0; font-size: 1.5rem; margin: 0 0 8px; }
    p { color: #94a3b8; font-size: 0.875rem; margin: 0 0 28px; }
    input[type=password] { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #2d3748; background: #0f3460; color: #e2e8f0; font-size: 1rem; box-sizing: border-box; margin-bottom: 16px; outline: none; }
    button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #e74c3c; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .error { color: #fc8181; font-size: 0.875rem; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>\uD83D\uDCDA BookStack MCP</h1>
    <p>Enter your password to connect Claude.ai to your BookStack instance.</p>
    ${error ? `<div class="error">\u26A0 ${error}</div>` : ''}
    <form method="POST" action="/authorize">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="code_challenge" value="${codeChallenge}">
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
      <input type="hidden" name="state" value="${state}">
      <input type="password" name="password" placeholder="Password" autofocus>
      <button type="submit">Connect</button>
    </form>
  </div>
</body>
</html>`;
}

function issueAccessToken(clientId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: clientId, iat: now, exp: now + 86400 }, config.JWT_SECRET);
}

export function createOAuthProvider(): OAuthServerProvider {
  const clientsStore: OAuthRegisteredClientsStore = {
    getClient: async (clientId: string) => {
      return store.getClient(clientId);
    },
    registerClient: async (client: OAuthClientInformationFull) => {
      store.saveClient(client);
      return client;
    },
  };

  const provider: OAuthServerProvider = {
    clientsStore,

    authorize: async (
      client: OAuthClientInformation,
      params: AuthorizationParams,
      res: Response,
    ): Promise<void> => {
      const html = renderLoginForm({
        clientId: client.client_id,
        redirectUri: String(params.redirectUri ?? ''),
        codeChallenge: params.codeChallenge ?? '',
        codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
        state: params.state ?? '',
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    },

    challengeForAuthorizationCode: async (
      _client: OAuthClientInformation,
      code: string,
    ): Promise<string> => {
      const authCode = store.getAuthCode(code);
      if (!authCode) throw new Error('Invalid or expired authorization code');
      return authCode.code_challenge;
    },

    exchangeAuthorizationCode: async (
      client: OAuthClientInformation,
      code: string,
    ): Promise<OAuthTokens> => {
      const authCode = store.getAuthCode(code);
      if (!authCode) throw new Error('Invalid or expired authorization code');
      if (authCode.client_id !== client.client_id) throw new Error('Client mismatch');
      store.deleteAuthCode(code);

      const accessToken = issueAccessToken(client.client_id);
      const refreshToken = uuidv4();
      store.saveRefreshToken(refreshToken, client.client_id);

      return {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 86400,
        refresh_token: refreshToken,
      };
    },

    exchangeRefreshToken: async (
      client: OAuthClientInformation,
      refreshToken: string,
      _scopes?: string[],
    ): Promise<OAuthTokens> => {
      const stored = store.getRefreshToken(refreshToken);
      if (!stored) throw new Error('Invalid refresh token');
      if (stored.client_id !== client.client_id) throw new Error('Client mismatch');
      const now = Math.floor(Date.now() / 1000);
      if (stored.expires_at < now) throw new Error('Refresh token expired');

      const newRefreshToken = uuidv4();
      store.rotateRefreshToken(refreshToken, newRefreshToken, client.client_id);
      const accessToken = issueAccessToken(client.client_id);

      return {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 86400,
        refresh_token: newRefreshToken,
      };
    },

    verifyAccessToken: async (token: string): Promise<AuthInfo> => {
      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
      } catch {
        throw new Error('Invalid access token');
      }
      if (store.isAccessTokenRevoked(token)) throw new Error('Access token has been revoked');
      return {
        token,
        clientId: payload.sub as string,
        scopes: [],
        expiresAt: payload.exp,
      };
    },
  };

  return provider;
}
