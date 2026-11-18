-- 0007_projects.sql - project services + dependency edges (S27)
BEGIN;
CREATE TABLE project_services (
    project_id   TEXT NOT NULL,
    service_id   TEXT NOT NULL,
    order_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (order_status IN ('pending','in_progress','completed','cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, service_id)
);
CREATE INDEX idx_project_services_project ON project_services (project_id);
CREATE TABLE project_service_edges (
    project_id  TEXT NOT NULL,
    service_id  TEXT NOT NULL,
    depends_on  TEXT NOT NULL,
    PRIMARY KEY (project_id, service_id, depends_on),
    FOREIGN KEY (project_id, service_id)
        REFERENCES project_services (project_id, service_id) ON DELETE CASCADE
);
CREATE INDEX idx_project_service_edges_dep ON project_service_edges (project_id, depends_on);
COMMIT;