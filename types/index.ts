// Tipos centrales del proyecto. Reflejan el modelo de datos del backend
// y se usan para consumir la API real de campañas y usuarios.

export type CampaignStatus =
  | "borrador"
  | "en_revision"
  | "activa"
  | "pausada"
  | "finalizada"
  | "rechazada";

export type DataType = "texto" | "foto" | "video" | "audio" | "documento";

export type CollectionMode = "checklist" | "texto_libre";

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
  tematica?: string;
  status: CampaignStatus;
  dataTypes: DataType[];
  collectionMode?: CollectionMode;
  checklistOpciones?: string[];
  goalContributions: number;
  quotaPerUser: number;
  currentContributions: number;
  approvedContributions: number;
  pendingContributions: number;
  rejectedContributions: number;
  participants: number;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
  locationCity: string;
  locationState: string;
  organizer?: string;
  xpPerContribution: number;
  isSpecial?: boolean;
  daysRemaining: number | null;
  hasReviewerAssigned: boolean;
  shareToken?: string;
  shareTokenExpiresAt?: string; // ISO datetime
  contributions?: Contribution[];
  /** Si el usuario en sesión la guardó. Ausente cuando no hay sesión. */
  isSaved?: boolean;
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
  caracteristicas?: string[];
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
