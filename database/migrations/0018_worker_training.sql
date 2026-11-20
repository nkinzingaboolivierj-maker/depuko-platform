-- Worker learning catalog and per-user progress tracking.
BEGIN;
CREATE TABLE training_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  summary TEXT NOT NULL DEFAULT '',
  content_url TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 100000),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_courses_active ON training_courses(active, created_at DESC);

CREATE TABLE worker_training_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','in_progress','completed')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id,user_id),
  CHECK ((status='completed' AND progress_percent=100 AND completed_at IS NOT NULL) OR
         (status<>'completed' AND progress_percent<100 AND completed_at IS NULL))
);
CREATE INDEX idx_worker_training_user ON worker_training_enrollments(user_id, enrolled_at DESC);
COMMIT;