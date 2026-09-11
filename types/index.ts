// Tipos centrales del proyecto. Reflejan el mismo modelo de datos
// que dataforgood_schema.sql (a implementar más adelante) — por ahora
// se usan sobre datos mock en src/data/screensData.ts.

export type CampaignStatus =
  | "borrador"
  | "en_revision"
  | "activa"
  | "pausada"
  | "finalizada"
  | "rechazada";

export type DataType = "texto" | "foto" | "video" | "audio" | "documento";

export type ContributionStatus =
  | "pendiente"
  | "espera_final"
  | "aceptado"
  | "rechazado";

export type UserRole = "usuario" | "supervisor" | "revisor" | "admin";

export interface User {
  id: string;
  nombre?: string;
  apellidos?: string;
  alias?: string;
  email: string;
  avatarUrl?: string;
  state?: string;
  city?: string;
  specialty?: string;
  intereses?: string[];
  role?: UserRole;
  xpTotal: number;
  level: number;
  streakDays: number;
}

export interface Campaign {
  id: string;
  creatorId: string;
  creatorName: string;
  name: string;
  description: string;
  tag: string;
  status: CampaignStatus;
  dataTypes: DataType[];
  goalContributions: number;
  quotaPerUser: number;
  currentContributions: number;
  approvedContributions: number;
  pendingContributions: number;
  rejectedContributions: number;
  participants: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  locationCity: string;
  locationState: string;
  organizer?: string;
  xpPerContribution: number;
  isSpecial?: boolean;
  daysRemaining: number | null;
  hasReviewerAssigned: boolean;
  shareToken?: string;
  shareTokenExpiresAt?: string; // ISO datetime
}

export interface Contribution {
  id: string;
  campaignId: string;
  campaignName: string;
  userId: string | null; // null = aporte anónimo
  participantName: string; // "Anónimo" cuando userId es null
  participantEmail?: string;
  description: string;
  fileType: DataType;
  fileSizeBytes?: number;
  status: ContributionStatus;
  submittedAt: string; // ISO datetime
  rejectionReason?: string;
  firstPassBy?: string; // nombre del revisor que dio la primera instancia
}

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string;
  currentRole: "Usuario común" | "Supervisor" | "Revisor de aportes";
  inviteStatus?: "pendiente";
}
