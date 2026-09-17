import { pool } from "@/lib/db";

/**
 * Único lugar donde se define el DDL de cada tabla. Antes estaba duplicado
 * (y ya divergido) en cada ruta/módulo que la usaba — p. ej. `usuarios` tenía
 * cuatro copias distintas del CREATE TABLE, una de ellas sin `email_verificado`
 * ni `locked_until`. Cualquier módulo que consulte una tabla debe llamar a su
 * `ensureXTable()` antes de la query: son idempotentes (`IF NOT EXISTS`), así
 * que no importa si ya se llamó en la misma petición.
 */

export async function ensureUsuariosTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      apellidos VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      state VARCHAR(100),
      city VARCHAR(100),
      specialty VARCHAR(150),
      intereses JSONB NOT NULL DEFAULT '[]'::jsonb,
      role JSONB NOT NULL DEFAULT '["usuario"]'::jsonb,
      xp_total INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak_days INTEGER NOT NULL DEFAULT 0,
      email_verificado BOOLEAN NOT NULL DEFAULT false,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      google_id VARCHAR(255) UNIQUE,
      verification_code_hash VARCHAR(64),
      verification_code_expires_at TIMESTAMPTZ,
      verification_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Parches para tablas creadas antes de que existiera alguna de estas
  // columnas: IF NOT EXISTS hace que repetirlos sea inofensivo.
  await pool.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(120);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellidos VARCHAR(120);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS state VARCHAR(100);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS specialty VARCHAR(150);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intereses JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verification_code_hash VARCHAR(64);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verification_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
  `);
}

export async function ensureSessionsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
}

export async function ensureRootSessionsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS root_sessions (
      id SERIAL PRIMARY KEY,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
}

export async function ensureCampanasTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campanas (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      creator_name VARCHAR(120) NOT NULL,
      supervisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      tematica VARCHAR(120) NOT NULL,
      tag VARCHAR(120) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'borrador',
      data_types JSONB NOT NULL DEFAULT '[]'::jsonb,
      collection_mode VARCHAR(20) NOT NULL DEFAULT 'checklist',
      checklist_opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
      goal_contributions INTEGER NOT NULL DEFAULT 0,
      quota_per_user INTEGER NOT NULL DEFAULT 1,
      current_contributions INTEGER NOT NULL DEFAULT 0,
      approved_contributions INTEGER NOT NULL DEFAULT 0,
      pending_contributions INTEGER NOT NULL DEFAULT 0,
      rejected_contributions INTEGER NOT NULL DEFAULT 0,
      participants INTEGER NOT NULL DEFAULT 0,
      start_date DATE,
      end_date DATE,
      location_city VARCHAR(120),
      location_state VARCHAR(120),
      organizer VARCHAR(160),
      xp_per_contribution INTEGER NOT NULL DEFAULT 0,
      is_special BOOLEAN NOT NULL DEFAULT false,
      days_remaining INTEGER,
      has_reviewer_assigned BOOLEAN NOT NULL DEFAULT false,
      share_token VARCHAR(80),
      share_token_expires_at TIMESTAMP,
      aportes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS creator_id INTEGER;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS creator_name VARCHAR(120);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS name VARCHAR(200);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS tematica VARCHAR(120);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS tag VARCHAR(120);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'borrador';
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS data_types JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS collection_mode VARCHAR(20) NOT NULL DEFAULT 'checklist';
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS checklist_opciones JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS goal_contributions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS quota_per_user INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS current_contributions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS approved_contributions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS pending_contributions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS rejected_contributions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS participants INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS location_city VARCHAR(120);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS location_state VARCHAR(120);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS organizer VARCHAR(160);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS xp_per_contribution INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS days_remaining INTEGER;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS has_reviewer_assigned BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS share_token VARCHAR(80);
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMP;
    ALTER TABLE campanas ADD COLUMN IF NOT EXISTS aportes JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);
}

export async function ensureCampanaSupervisoresTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campana_supervisores (
      id SERIAL PRIMARY KEY,
      campana_id INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
      supervisor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      accion VARCHAR(30) NOT NULL CHECK (accion IN ('aceptada', 'rechazada', 'reportada', 'reasignada')),
      motivo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureCampanasGuardadasTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campanas_guardadas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      campana_id INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (usuario_id, campana_id)
    );
  `);
}

export async function ensureAportesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aportes (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      participant_name VARCHAR(160) NOT NULL,
      participant_email VARCHAR(200),
      description TEXT NOT NULL,
      file_type VARCHAR(20) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_original_name VARCHAR(255),
      file_mime_type VARCHAR(100),
      file_size_bytes INTEGER,
      caracteristicas JSONB NOT NULL DEFAULT '[]'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      rejection_reason TEXT,
      first_pass_by VARCHAR(160),
      submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE aportes ADD COLUMN IF NOT EXISTS caracteristicas JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE aportes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE aportes ADD COLUMN IF NOT EXISTS first_pass_by VARCHAR(160);
    ALTER TABLE aportes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
  `);
}

export async function ensureSancionesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sanciones (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo VARCHAR(30) NOT NULL,
      detalle TEXT NOT NULL,
      dias INTEGER,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      aplicada_por VARCHAR(120) NOT NULL DEFAULT 'SuperUsuario',
      activa BOOLEAN NOT NULL DEFAULT true,
      restaurada_en TIMESTAMPTZ
    );
  `);
}

/** Crea (si falta) todo lo que las pantallas de /usuarios y /sistema necesitan leer. */
export async function ensureCoreSchema(): Promise<void> {
  await ensureUsuariosTable();
  await ensureSessionsTable();
  await ensureRootSessionsTable();
  await ensureCampanasTable();
  await ensureCampanaSupervisoresTable();
  await ensureCampanasGuardadasTable();
  await ensureAportesTable();
  await ensureSancionesTable();
}
