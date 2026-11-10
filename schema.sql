-- Production schema for connected Gmail accounts (SQLite-compatible).
-- refresh_token stores the AES-256-GCM encrypted payload (not plaintext).

CREATE TABLE IF NOT EXISTS connected_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, provider_email)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON connected_accounts (status);
