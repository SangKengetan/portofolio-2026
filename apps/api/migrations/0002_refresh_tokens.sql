-- 0002_refresh_tokens — refresh-token rotation with reuse detection.
-- Only a SHA-256 hash of each token is stored. Tokens that descend from one login share a family_id,
-- so replaying an already-rotated token can revoke the whole family.

CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  family_id    UUID NOT NULL,
  token_hash   CHAR(64) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  replaced_by  UUID,
  user_agent   VARCHAR(255),
  ip_hash      VARCHAR(64),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_user_active ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);
