CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TYPE publication_status AS ENUM ('published','rejected_auto','hidden','hidden_auto','deleted');
CREATE TABLE IF NOT EXISTS "user" (
 id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
 "emailVerified" boolean NOT NULL DEFAULT false, image text, role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','disabled')),
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS session (
 id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text UNIQUE NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
 scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("providerId","accountId")
);
CREATE TABLE IF NOT EXISTS verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
 "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON session("userId");
CREATE INDEX ON account("userId");
CREATE INDEX ON verification(identifier);
CREATE TABLE paranormal_locations (
 id uuid PRIMARY KEY, slug text UNIQUE NOT NULL,
 province text NOT NULL DEFAULT '', district text NOT NULL DEFAULT '',
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 sensitive boolean NOT NULL DEFAULT false,
 geom geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX locations_geom_gist ON paranormal_locations USING gist(geom);
CREATE TABLE paranormal_reports (
 id uuid PRIMARY KEY, location_id uuid NOT NULL REFERENCES paranormal_locations(id),
 user_id text REFERENCES "user"(id) ON DELETE SET NULL, guest_nickname varchar(30),
 guest_reference text NOT NULL, title varchar(140) NOT NULL, description text NOT NULL,
 category text NOT NULL, status publication_status NOT NULL DEFAULT 'published',
 occurred_at date, incident_time time, witnesses integer CHECK (witnesses BETWEEN 1 AND 10000),
 observations text NOT NULL DEFAULT '', fictional boolean NOT NULL DEFAULT false,
 fingerprint text NOT NULL, spam_score integer NOT NULL DEFAULT 0, spam_flags jsonb NOT NULL DEFAULT '[]',
 published_at timestamptz NOT NULL DEFAULT now(), hidden_at timestamptz, deleted_at timestamptz,
 deleted_by text REFERENCES "user"(id) ON DELETE SET NULL, deletion_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_publication ON paranormal_reports(status,published_at DESC);
CREATE INDEX reports_location ON paranormal_reports(location_id,status);
CREATE INDEX reports_fingerprint ON paranormal_reports(fingerprint,created_at);
CREATE INDEX reports_search ON paranormal_reports USING gin ((title || ' ' || description || ' ' || coalesce(guest_nickname,'')) gin_trgm_ops);
CREATE TABLE submission_keys (
 guest_reference text NOT NULL, key uuid NOT NULL, body_hash text NOT NULL,
 report_id uuid NOT NULL REFERENCES paranormal_reports(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(guest_reference,key)
);
CREATE TABLE report_media (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES paranormal_reports(id) ON DELETE CASCADE,
 storage_key text NOT NULL, media_type text NOT NULL, scan_status text NOT NULL DEFAULT 'queued' CHECK (scan_status IN ('queued','processing','ready','rejected')),
 sha256 text NOT NULL, size_bytes integer NOT NULL, failure_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, UNIQUE(report_id,sha256)
);
CREATE INDEX media_queue ON report_media(scan_status,created_at);
CREATE TABLE abuse_reports (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES paranormal_reports(id) ON DELETE CASCADE,
 guest_reference text NOT NULL, reason text NOT NULL, details text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(report_id,guest_reference)
);
CREATE TABLE spam_events (
 id uuid PRIMARY KEY, request_reference text NOT NULL, event_type text NOT NULL,
 risk_score integer NOT NULL, signals jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_audit_logs (
 id uuid PRIMARY KEY, administrator_id text REFERENCES "user"(id) ON DELETE SET NULL,
 report_id uuid, action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_report ON admin_audit_logs(report_id,created_at DESC);
CREATE TABLE app_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
