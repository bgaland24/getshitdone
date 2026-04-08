-- Schéma de base de données GetShitDone
-- SQLite — toutes les dates sont stockées en ISO 8601 (TEXT)

-- ---------------------------------------------------------------------------
-- Utilisateurs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                              INTEGER PRIMARY KEY AUTOINCREMENT,
    email                           TEXT    UNIQUE NOT NULL,
    password_hash                   TEXT    NOT NULL,
    is_verified                     INTEGER NOT NULL DEFAULT 0,
    verification_code               TEXT,
    verification_code_expires_at    TEXT,
    claude_api_key                  TEXT,
    created_at                      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at                      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Sessions d'authentification (cookie de session)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    token       TEXT    UNIQUE NOT NULL,
    expires_at  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Codes de connexion magique (login sans mot de passe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    code        TEXT    NOT NULL,
    expires_at  TEXT    NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Sujets (regroupements de tâches)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT,
    priority    INTEGER NOT NULL DEFAULT 0, -- 0=aucune 1=faible 2=moyenne 3=haute
    status      TEXT    NOT NULL DEFAULT 'active', -- active | archived
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tâches / Actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    subject_id    INTEGER,                  -- nullable : tâche sans sujet
    title         TEXT    NOT NULL,
    description   TEXT,
    priority      INTEGER NOT NULL DEFAULT 0, -- 0=aucune 1=faible 2=moyenne 3=haute
    urgency_level INTEGER NOT NULL DEFAULT 0, -- 0=aucune 1=faible 2=moyenne 3=urgente 4=critique
    deadline      TEXT,                     -- date ISO YYYY-MM-DD, nullable
    status        TEXT    NOT NULL DEFAULT 'active', -- active | completed | archived
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    archived_at   TEXT,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Suivi du temps (V2) — table créée dès maintenant, vide
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_tracking_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    subject_id       INTEGER NOT NULL,
    started_at       TEXT    NOT NULL,
    ended_at         TEXT,
    duration_seconds INTEGER,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Configuration applicative (V2 — panel super admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_config (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT UNIQUE NOT NULL,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Valeurs initiales de configuration
INSERT OR IGNORE INTO app_config (key, value, description) VALUES
    ('claude_model',      'claude-haiku-4-5-20251001', 'Modèle Claude utilisé pour l''extraction'),
    ('claude_max_tokens', '2048',                      'Nombre maximum de tokens par appel Claude'),
    ('app_version',       '1.0.0',                     'Version de l''application');
