function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  BOOKSTACK_URL: requireEnv('BOOKSTACK_URL').replace(/\/$/, ''),
  BOOKSTACK_TOKEN_ID: requireEnv('BOOKSTACK_TOKEN_ID'),
  BOOKSTACK_TOKEN_SECRET: requireEnv('BOOKSTACK_TOKEN_SECRET'),
  MCP_AUTH_PASSWORD: requireEnv('MCP_AUTH_PASSWORD'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  BASE_URL: requireEnv('BASE_URL').replace(/\/$/, ''),
  PORT: parseInt(process.env.PORT || '3000', 10),
  AUTH_DB_PATH: process.env.AUTH_DB_PATH || './data/auth.db',
};
