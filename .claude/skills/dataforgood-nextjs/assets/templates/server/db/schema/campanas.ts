// Campañas, aportes y archivos. Refleja Campaign / Contribution de types/index.ts.
// Los contadores del tipo (currentContributions, pendingContributions, participants, daysRemaining,
// hasReviewerAssigned...) NO son columnas: se calculan con consultas en el service.
import {
  pgTable, pgEnum, uuid, text, timestamp, date, jsonb, integer, bigint, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './core';

export const campaignStatusEnum = pgEnum('campaign_status', ['borrador', 'en_revision', 'activa', 'pausada', 'finalizada', 'rechazada']);
export const dataTypeEnum = pgEnum('data_type', ['texto', 'foto', 'video', 'audio', 'documento']);
export const collectionModeEnum = pgEnum('collection_mode', ['checklist', 'texto_libre']);
export const contributionStatusEnum = pgEnum('contribution_status', ['pendiente', 'espera_final', 'aceptado', 'rechazado']);
export const reviewerStatusEnum = pgEnum('reviewer_status', ['invitado', 'aceptado']);
export const mediaKindEnum = pgEnum('media_kind', ['foto', 'video', 'audio', 'documento']); // 'texto' no genera archivo
export const mediaStatusEnum = pgEnum('media_status', ['pendiente', 'lista', 'rechazada']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  name: text('name').notNull(), // máx. 80 (validar con Zod)
  description: text('description').notNull(), // máx. 500
  tag: text('tag').notNull(), // temática: Medio ambiente, Educación...
  status: campaignStatusEnum('status').notNull().default('borrador'),
  dataTypes: dataTypeEnum('data_types').array().notNull(),
  collectionMode: collectionModeEnum('collection_mode').notNull().default('checklist'),
  checklistOptions: jsonb('checklist_options').$type<string[]>().notNull().default([]),
  goalContributions: integer('goal_contributions').notNull(),
  quotaPerUser: integer('quota_per_user').notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  locationCity: text('location_city').notNull(),
  locationState: text('location_state').notNull(),
  organizer: text('organizer'),
  xpPerContribution: integer('xp_per_contribution').notNull().default(0),
  // Campaña especial: periodo con multiplicador de XP (tope del sistema ×3)
  specialStartDate: date('special_start_date', { mode: 'string' }),
  specialEndDate: date('special_end_date', { mode: 'string' }),
  xpMultiplier: integer('xp_multiplier').notNull().default(1),
  reviewedBy: uuid('reviewed_by').references(() => users.id), // supervisor que dictaminó
  reviewNotes: text('review_notes'),
  ...timestamps,
}, (t) => [index('campaigns_status_idx').on(t.status), index('campaigns_creator_idx').on(t.creatorId)]);

// Enlace público con token vigente: permite aportar sin registro (aportes anónimos).
// Regenerar crea un enlace nuevo y revoca el anterior de forma permanente.
export const campaignShareLinks = pgTable('campaign_share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  visits: integer('visits').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('campaign_share_links_token_uq').on(t.token)]);

// El Revisor de aportes es un rol POR CAMPAÑA: invitación que la persona acepta.
export const campaignReviewers = pgTable('campaign_reviewers', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: reviewerStatusEnum('status').notNull().default('invitado'),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.campaignId, t.userId] })]);

export const campaignBans = pgTable('campaign_bans', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  bannedBy: uuid('banned_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.campaignId, t.userId] })]);

export const savedCampaigns = pgTable('saved_campaigns', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.campaignId] })]);

export const mediaObjects = pgTable('media_objects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id), // null = subida anónima por enlace público
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  kind: mediaKindEnum('kind').notNull(),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  status: mediaStatusEnum('status').notNull().default('pendiente'),
  ...timestamps,
}, (t) => [uniqueIndex('media_objects_key_uq').on(t.objectKey), index('media_objects_owner_idx').on(t.ownerId)]);

export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  userId: uuid('user_id').references(() => users.id), // null = aporte anónimo
  shareLinkId: uuid('share_link_id').references(() => campaignShareLinks.id),
  description: text('description').notNull(), // máx. 1000
  mediaId: uuid('media_id').references(() => mediaObjects.id), // null si el aporte es solo texto
  checklistAnswers: jsonb('checklist_answers').$type<string[]>().notNull().default([]),
  status: contributionStatusEnum('status').notNull().default('pendiente'),
  // Primera instancia (Revisor de aportes) → espera_final; decisión final (creador) → aceptado/rechazado
  firstPassBy: uuid('first_pass_by').references(() => users.id),
  firstPassAt: timestamp('first_pass_at', { withTimezone: true }),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'), // obligatorio al rechazar
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('contributions_campaign_status_idx').on(t.campaignId, t.status),
  index('contributions_user_campaign_idx').on(t.userId, t.campaignId),
]);
