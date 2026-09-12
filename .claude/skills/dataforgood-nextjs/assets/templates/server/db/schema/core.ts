// Tablas de cuentas y seguridad. Refleja `User` de types/index.ts (alias, estado, ciudad,
// especialidad, XP, nivel y racha). Los campos derivados se calculan en los services.
import { pgTable, pgEnum, uuid, text, timestamp, jsonb, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Roles globales. Toda cuenta es "Usuario común" de forma implícita. El Revisor de aportes NO está
// aquí: en la rama es un rol por campaña (tabla campaign_reviewers).
export const globalRoleEnum = pgEnum('global_role', ['administrador_campana', 'supervisor', 'superusuario']);

// La cuenta queda inactiva hasta verificar el correo con el código de 6 dígitos (/verificar).
export const userStatusEnum = pgEnum('user_status', ['pendiente_verificacion', 'activo', 'suspendido', 'baneado']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'), // null si la cuenta entra solo con Google
  alias: text('alias').notNull(),
  avatarUrl: text('avatar_url'),
  state: text('state'),
  city: text('city'),
  specialty: text('specialty'), // se usa para repartir campañas a supervisores de esa área
  interests: jsonb('interests').$type<string[]>().notNull().default([]),
  status: userStatusEnum('status').notNull().default('pendiente_verificacion'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  xpTotal: integer('xp_total').notNull().default(0),
  level: integer('level').notNull().default(1),
  streakDays: integer('streak_days').notNull().default(0),
  ...timestamps,
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: globalRoleEnum('role').notNull(),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.role] })]);

// Código de verificación: se guarda el hash, vence (~15 min) y admite 3 intentos.
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  attemptsLeft: integer('attempts_left').notNull().default(3),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('email_verifications_user_idx').on(t.userId)]);

// Se guarda el HASH del token de sesión, nunca el token.
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

// Bitácora de acciones sensibles: asignar roles, banear, dictaminar campañas, rechazar aportes.
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_log_target_idx').on(t.targetType, t.targetId)]);
