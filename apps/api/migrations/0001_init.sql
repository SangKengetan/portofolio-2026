-- 0001_init — schema from rancangan-portfolio.md §9, plus the columns the frontend needs
-- (site_profile.handle / available_for_work), soft delete and DB-level constraints.

-- ===== ENUM =====
CREATE TYPE project_category   AS ENUM ('web', 'uiux', 'data');
CREATE TYPE publish_status     AS ENUM ('draft', 'published', 'archived');
CREATE TYPE block_type         AS ENUM ('rich_text', 'image', 'gallery', 'before_after',
                                        'metrics', 'quote', 'embed', 'code', 'list');
CREATE TYPE tech_group         AS ENUM ('web', 'uiux', 'data', 'tools');
CREATE TYPE employment_type    AS ENUM ('full_time', 'part_time', 'internship',
                                        'freelance', 'contract', 'organization');
CREATE TYPE achievement_level  AS ENUM ('international', 'national', 'regional',
                                        'university', 'other');

-- Keeps updated_at honest even for writes that bypass the API.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== ADMIN =====
CREATE TABLE admin_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL,
  password_hash  TEXT NOT NULL,                -- argon2id
  name           VARCHAR(120) NOT NULL,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_admin_users_email ON admin_users (lower(email));
CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== MEDIA =====
CREATE TABLE media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path    TEXT NOT NULL,                  -- e.g. /uploads/2026/10/<uuid>.webp
  mime_type    VARCHAR(100) NOT NULL,
  size_bytes   INTEGER NOT NULL CHECK (size_bytes >= 0),
  width        INTEGER,
  height       INTEGER,
  alt_text     VARCHAR(255),
  variants     JSONB NOT NULL DEFAULT '{}',    -- {"sm": "...", "md": "...", "lg": "..."}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_created ON media (created_at DESC);

-- ===== PROFILE (single row) =====
CREATE TABLE site_profile (
  id                  SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name           VARCHAR(120) NOT NULL,
  short_name          VARCHAR(60)  NOT NULL,         -- used in "Hi, I'm ___."
  roles               TEXT[] NOT NULL DEFAULT '{}',  -- typing effect in the hero
  headline            VARCHAR(255),
  statement           TEXT,                          -- dark statement section (**bold** markers)
  bio                 TEXT,
  location            VARCHAR(120),
  timezone            VARCHAR(60) NOT NULL DEFAULT 'Asia/Makassar',
  email               VARCHAR(255),
  phone               VARCHAR(40),
  handle              VARCHAR(60),                   -- "@username"
  available_for_work  BOOLEAN NOT NULL DEFAULT true,
  socials             JSONB NOT NULL DEFAULT '{}',   -- {"github": "...", "linkedin": "..."}
  photo_media_id      UUID REFERENCES media(id) ON DELETE SET NULL,
  cv_media_id         UUID REFERENCES media(id) ON DELETE SET NULL,
  seo_title           VARCHAR(70),
  seo_description     VARCHAR(160),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_site_profile_updated BEFORE UPDATE ON site_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== TECHNOLOGIES / TOOLS =====
CREATE TABLE technologies (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80) NOT NULL UNIQUE,
  slug          VARCHAR(80) NOT NULL UNIQUE,
  grp           tech_group NOT NULL,
  icon_key      VARCHAR(80),
  show_on_home  BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_technologies_group ON technologies (grp, sort_order);

-- ===== PROJECTS =====
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              VARCHAR(140) NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             VARCHAR(160) NOT NULL,
  category          project_category NOT NULL,
  summary           VARCHAR(300) NOT NULL,
  impact_line       VARCHAR(200),
  impact_statement  TEXT,
  role              VARCHAR(160),
  team              VARCHAR(160),
  client            VARCHAR(160),
  year              SMALLINT CHECK (year BETWEEN 1990 AND 2100),
  started_at        DATE,
  ended_at          DATE,
  contributions     TEXT[] NOT NULL DEFAULT '{}',
  cover_media_id    UUID REFERENCES media(id) ON DELETE SET NULL,
  demo_url          TEXT,
  repo_url          TEXT,
  figma_url         TEXT,
  dashboard_url     TEXT,
  notebook_url      TEXT,
  meta              JSONB NOT NULL DEFAULT '{}',
  status            publish_status NOT NULL DEFAULT 'draft',
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  seo_description   VARCHAR(160),
  published_at      TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,                 -- soft delete
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_projects_dates CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
-- A soft-deleted project must not block re-using its slug.
CREATE UNIQUE INDEX uq_projects_slug ON projects (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_public ON projects (status, category, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_featured ON projects (is_featured) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_projects_cover ON projects (cover_media_id);
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_metrics (
  id          SERIAL PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  value       VARCHAR(20) NOT NULL,
  label       VARCHAR(80) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_metrics_project ON project_metrics (project_id, sort_order);

CREATE TABLE project_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        block_type NOT NULL,
  heading     VARCHAR(160),
  data        JSONB NOT NULL DEFAULT '{}',       -- shape per type, see src/modules/projects/blocks.ts
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_blocks_project ON project_blocks (project_id, sort_order);

CREATE TABLE project_technologies (
  project_id     UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technology_id  INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,        -- display order inside this project
  PRIMARY KEY (project_id, technology_id)
);
CREATE INDEX idx_project_tech_tech ON project_technologies (technology_id);

-- ===== EXPERIENCE =====
CREATE TABLE experiences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role             VARCHAR(160) NOT NULL,
  company          VARCHAR(160) NOT NULL,
  company_url      TEXT,
  location         VARCHAR(120),
  employment_type  employment_type NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE,                          -- NULL = present
  description      TEXT,
  highlights       TEXT[] NOT NULL DEFAULT '{}',
  image_media_id   UUID REFERENCES media(id) ON DELETE SET NULL,
  status           publish_status NOT NULL DEFAULT 'published',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_experiences_dates CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_experiences_public ON experiences (status, sort_order, start_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_experiences_image ON experiences (image_media_id);
CREATE TRIGGER trg_experiences_updated BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE experience_technologies (
  experience_id  UUID    NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  technology_id  INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,        -- display order inside this experience
  PRIMARY KEY (experience_id, technology_id)
);
CREATE INDEX idx_experience_tech_tech ON experience_technologies (technology_id);

-- ===== CERTIFICATES =====
CREATE TABLE certificates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 VARCHAR(200) NOT NULL,
  issuer                VARCHAR(160) NOT NULL,
  category              VARCHAR(20) NOT NULL DEFAULT 'other'
                        CHECK (category IN ('web', 'uiux', 'data', 'other')),
  issued_at             DATE NOT NULL,
  expires_at            DATE,
  credential_id         VARCHAR(160),
  credential_url        TEXT,                     -- present → "Verified" badge
  image_media_id        UUID REFERENCES media(id) ON DELETE SET NULL,
  issuer_logo_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  status                publish_status NOT NULL DEFAULT 'published',
  sort_order            INTEGER NOT NULL DEFAULT 0,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certificates_public ON certificates (status, category, sort_order, issued_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_certificates_image ON certificates (image_media_id);
CREATE INDEX idx_certificates_logo ON certificates (issuer_logo_media_id);
CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== ACHIEVEMENTS =====
CREATE TABLE achievements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(200) NOT NULL,
  organizer           VARCHAR(160),
  level               achievement_level NOT NULL DEFAULT 'other',
  rank_label          VARCHAR(60),
  achieved_at         DATE NOT NULL,
  description         TEXT,
  link_url            TEXT,
  image_media_id      UUID REFERENCES media(id) ON DELETE SET NULL,
  related_project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  status              publish_status NOT NULL DEFAULT 'published',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_achievements_public ON achievements (status, sort_order, achieved_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_achievements_image ON achievements (image_media_id);
CREATE INDEX idx_achievements_project ON achievements (related_project_id);
CREATE TRIGGER trg_achievements_updated BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== CONTACT MESSAGES =====
CREATE TABLE contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  ip_hash     VARCHAR(64),                        -- HMAC of the IP, never the raw address
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_unread ON contact_messages (is_read, created_at DESC);
