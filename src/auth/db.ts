import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

const dir = path.dirname(config.AUTH_DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(config.AUTH_DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    state TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS revoked_tokens (
    token TEXT PRIMARY KEY,
    revoked_at INTEGER NOT NULL
  );
`);
