import { OAuthClientInformation } from '@modelcontextprotocol/sdk/shared/auth.js';
import { db } from './db.js';

// ── Clients ──────────────────────────────────────────────────────────────────

export function getClient(clientId: string): OAuthClientInformation | undefined {
  const row = db.prepare('SELECT client_data FROM oauth_clients WHERE client_id = ?').get(clientId) as
    | { client_data: string }
    | undefined;
  if (!row) return undefined;
  return JSON.parse(row.client_data) as OAuthClientInformation;
}

export function saveClient(client: OAuthClientInformation): void {
  db.prepare('INSERT OR REPLACE INTO oauth_clients (client_id, client_data) VALUES (?, ?)').run(
    client.client_id,
    JSON.stringify(client),
  );
}

// ── Auth Codes ────────────────────────────────────────────────────────────────

interface AuthCodeData {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
}

interface AuthCodeRow {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string | null;
  created_at: number;
}

export function saveAuthCode(code: string, data: AuthCodeData): void {
  db.prepare(
    'INSERT INTO auth_codes (code, client_id, redirect_uri, code_challenge, state, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(code, data.client_id, data.redirect_uri, data.code_challenge, data.state ?? null, Math.floor(Date.now() / 1000));
}

export function getAuthCode(code: string): (AuthCodeData & { created_at: number }) | undefined {
  const row = db.prepare('SELECT * FROM auth_codes WHERE code = ?').get(code) as AuthCodeRow | undefined;
  if (!row) return undefined;
  const now = Math.floor(Date.now() / 1000);
  if (now - row.created_at > 600) {
    db.prepare('DELETE FROM auth_codes WHERE code = ?').run(code);
    return undefined;
  }
  return {
    client_id: row.client_id,
    redirect_uri: row.redirect_uri,
    code_challenge: row.code_challenge,
    state: row.state ?? undefined,
    created_at: row.created_at,
  };
}

export function deleteAuthCode(code: string): void {
  db.prepare('DELETE FROM auth_codes WHERE code = ?').run(code);
}

// ── Refresh Tokens ────────────────────────────────────────────────────────────

export function saveRefreshToken(token: string, clientId: string): void {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90; // 90 days
  db.prepare('INSERT OR REPLACE INTO refresh_tokens (token, client_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    clientId,
    expiresAt,
  );
}

export function getRefreshToken(token: string): { client_id: string; expires_at: number } | undefined {
  return db.prepare('SELECT client_id, expires_at FROM refresh_tokens WHERE token = ?').get(token) as
    | { client_id: string; expires_at: number }
    | undefined;
}

export function rotateRefreshToken(oldToken: string, newToken: string, clientId: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(oldToken);
  saveRefreshToken(newToken, clientId);
}

export function revokeRefreshToken(token: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}

// ── Access Token Revocation ───────────────────────────────────────────────────

export function revokeAccessToken(token: string): void {
  db.prepare('INSERT OR IGNORE INTO revoked_tokens (token, revoked_at) VALUES (?, ?)').run(
    token,
    Math.floor(Date.now() / 1000),
  );
}

export function isAccessTokenRevoked(token: string): boolean {
  const row = db.prepare('SELECT 1 FROM revoked_tokens WHERE token = ?').get(token);
  return row !== undefined;
}
