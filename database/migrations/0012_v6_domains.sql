-- 0012_v6_domains.sql - persistence for the V6 domains. Additive only.
BEGIN;

CREATE TABLE logistics_trips (
    id               TEXT PRIMARY KEY,
    organization_id  TEXT NOT NULL REFERENCES organizations (id),
    vehicle_asset_id TEXT NOT NULL REFERENCES assets (id),
    driver_user_id   TEXT NOT NULL REFERENCES users (id),
    status           TEXT NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned','dispatched','in_transit','completed','failed','cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logistics_trips_org ON logistics_trips (organization_id);

CREATE TABLE logistics_stops (
    id                TEXT PRIMARY KEY,
    trip_id           TEXT NOT NULL REFERENCES logistics_trips (id) ON DELETE CASCADE,
    order_ref         TEXT NOT NULL,
    address           TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','arrived','loaded','delivered','confirmed','failed')),
    proof_of_delivery TEXT,
    fail_reason       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logistics_stops_trip ON logistics_stops (trip_id);

CREATE TABLE payroll_runs (
    id               TEXT PRIMARY KEY,
    organization_id  TEXT NOT NULL REFERENCES organizations (id),
    period_start     DATE NOT NULL,
    period_end       DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','calculated','approved','paid')),
    gross_cents      BIGINT,
    net_cents        BIGINT,
    exceptions       TEXT[] NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end > period_start)
);

CREATE TABLE file_objects (
    id           TEXT PRIMARY KEY,
    owner_id     TEXT NOT NULL REFERENCES users (id),
    mime_type    TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL CHECK (size_bytes > 0),
    status       TEXT NOT NULL DEFAULT 'upload_intent'
                 CHECK (status IN ('upload_intent','quarantine','scan_clean','scan_infected','rejected')),
    document_of  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_file_objects_owner ON file_objects (owner_id);

CREATE TABLE support_tickets (
    id           TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users (id),
    category     TEXT NOT NULL,
    priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','in_progress','escalated','resolved','closed','reopened')),
    escalated    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_ticket_messages (
    id                    TEXT PRIMARY KEY,
    ticket_id             TEXT NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
    author_id             TEXT NOT NULL REFERENCES users (id),
    body                  TEXT NOT NULL,
    visible_to_customer   BOOLEAN NOT NULL DEFAULT TRUE,
    internal              BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages (ticket_id);

CREATE TABLE trust_cases (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN ('identity','business','worker_credential','fraud','safety_incident','report')),
    subject_id TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','under_investigation','escalated','resolved_restriction','resolved_dismissed','appealed','dismissed')),
    decided_by TEXT,
    rationale  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trust_cases_status ON trust_cases (status);

CREATE TABLE trust_case_evidence (
    id          TEXT PRIMARY KEY,
    case_id     TEXT NOT NULL REFERENCES trust_cases (id) ON DELETE CASCADE,
    submitted_by TEXT NOT NULL REFERENCES users (id),
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
    id          TEXT PRIMARY KEY,
    order_ref   TEXT NOT NULL REFERENCES orders (id),
    raised_by   TEXT NOT NULL REFERENCES users (id),
    against     TEXT NOT NULL REFERENCES users (id),
    category    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','under_investigation','mediation','resolved','appealed')),
    payout_held BOOLEAN NOT NULL DEFAULT FALSE,
    resolution  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (raised_by <> against)
);
CREATE INDEX idx_disputes_order ON disputes (order_ref);

CREATE TABLE reviews (
    id          TEXT PRIMARY KEY,
    work_ref    TEXT NOT NULL REFERENCES orders (id),
    author_id   TEXT NOT NULL REFERENCES users (id),
    subject_id  TEXT NOT NULL REFERENCES users (id),
    quality     INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 5),
    punctuality INTEGER NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
    communication INTEGER NOT NULL CHECK (communication BETWEEN 1 AND 5),
    comment     TEXT,
    moderation  TEXT NOT NULL DEFAULT 'published' CHECK (moderation IN ('published','hidden','removed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_ref, author_id, subject_id),
    CHECK (author_id <> subject_id)
);
CREATE INDEX idx_reviews_subject ON reviews (subject_id);

CREATE TABLE integration_configs (
    kind                 TEXT NOT NULL CHECK (kind IN ('payment','payout','ai','email','sms','push','object_storage','maps','identity_verification','video_voice','file_scanning','monitoring')),
    provider             TEXT NOT NULL,
    environment          TEXT NOT NULL CHECK (environment IN ('local','staging','production')),
    credential_configured BOOLEAN NOT NULL DEFAULT FALSE,
    enabled              BOOLEAN NOT NULL DEFAULT FALSE,
    failure_behavior     TEXT NOT NULL DEFAULT 'fail_closed' CHECK (failure_behavior IN ('fail_closed','degrade_gracefully')),
    last_success_check   TIMESTAMPTZ,
    last_failure         TEXT,
    PRIMARY KEY (kind, provider)
);

CREATE TABLE skill_definitions (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    occupation TEXT NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE worker_skill_claims (
    id                TEXT PRIMARY KEY,
    worker_id         TEXT NOT NULL REFERENCES users (id),
    skill_id          TEXT NOT NULL REFERENCES skill_definitions (id),
    verification      TEXT NOT NULL DEFAULT 'self_declared'
                      CHECK (verification IN ('self_declared','under_assessment','verified','rejected')),
    evidence_refs     TEXT[] NOT NULL DEFAULT '{}',
    assessment_score  INTEGER CHECK (assessment_score BETWEEN 0 AND 100),
    UNIQUE (worker_id, skill_id)
);

CREATE TABLE opportunities (
    id                 TEXT PRIMARY KEY,
    organization_id    TEXT NOT NULL REFERENCES organizations (id),
    role               TEXT NOT NULL,
    required_skills    TEXT[] NOT NULL CHECK (array_length(required_skills, 1) > 0),
    region             TEXT NOT NULL,
    mode               TEXT NOT NULL CHECK (mode IN ('onsite','remote','hybrid')),
    compensation_cents BIGINT NOT NULL CHECK (compensation_cents > 0),
    duration_days      INTEGER NOT NULL CHECK (duration_days > 0),
    status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed','cancelled')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opportunity_applications (
    id             TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
    applicant_id   TEXT NOT NULL REFERENCES users (id),
    snapshot       JSONB NOT NULL,
    stage          TEXT NOT NULL DEFAULT 'submitted'
                   CHECK (stage IN ('submitted','screening','shortlisted','interviewing','assessment','selected','rejected','withdrawn')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (opportunity_id, applicant_id)
);

COMMIT;