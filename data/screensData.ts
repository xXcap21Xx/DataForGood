import type {
  Campaign,
  Contribution,
  ReviewerCandidate,
  User,
} from "@/types";

export const currentUser: User = {
  id: "u-carlos",
  alias: "Carlos P.",
  email: "carlos@correo.com",
  state: "Nayarit",
  city: "Tepic",
  specialty: "Ingeniería de software",
  xpTotal: 1840,
  level: 7,
  streakDays: 12,
};

export const campaigns: Campaign[] = [
  {
    id: "censo-arboles",
    creatorId: "u-carlos",
    creatorName: "Carlos P.",
    name: "Censo de árboles urbanos",
    description:
      "Registra los árboles de tu colonia para mapear la cobertura verde de la ciudad.",
    tag: "Medio ambiente",
    status: "activa",
    dataTypes: ["foto", "texto"],
    goalContributions: 500,
    quotaPerUser: 10,
    currentContributions: 310,
    approvedContributions: 310,
    pendingContributions: 18,
    rejectedContributions: 31,
    participants: 86,
    startDate: "2026-08-01",
    endDate: "2026-09-12",
    locationCity: "Tepic",
    locationState: "Nayarit",
    organizer: "Ayuntamiento de Tepic",
    xpPerContribution: 50,
    daysRemaining: 29,
    hasReviewerAssigned: false,
    shareToken: "a7f2k9",
    shareTokenExpiresAt: "2026-08-16T09:00:00",
  },
  {
    id: "mapa-bancas",
    creatorId: "u-carlos",
    creatorName: "Carlos P.",
    name: "Mapa de bancas públicas",
    description: "Ubica bancas y mobiliario urbano en parques y camellones de la ciudad.",
    tag: "Infraestructura",
    status: "finalizada",
    dataTypes: ["foto"],
    goalContributions: 420,
    quotaPerUser: 15,
    currentContributions: 420,
    approvedContributions: 420,
    pendingContributions: 0,
    rejectedContributions: 0,
    participants: 112,
    startDate: "2026-06-01",
    endDate: "2026-08-30",
    locationCity: "Tepic",
    locationState: "Nayarit",
    xpPerContribution: 40,
    daysRemaining: null,
    hasReviewerAssigned: true,
  },
  {
    id: "huertos-comunitarios",
    creatorId: "u-ana",
    creatorName: "Ana Ruiz",
    name: "Huertos comunitarios",
    description:
      "Documenta los huertos vecinales y las especies que se cultivan en ellos.",
    tag: "Medio ambiente",
    status: "activa",
    dataTypes: ["foto", "texto"],
    goalContributions: 250,
    quotaPerUser: 8,
    currentContributions: 61,
    approvedContributions: 61,
    pendingContributions: 4,
    rejectedContributions: 3,
    participants: 22,
    startDate: "2026-07-10",
    endDate: "2026-10-03",
    locationCity: "Tepic",
    locationState: "Nayarit",
    xpPerContribution: 40,
    daysRemaining: 50,
    hasReviewerAssigned: false,
  },
  {
    id: "reporte-baches",
    creatorId: "u-mara",
    creatorName: "Mara Ortiz",
    name: "Reporte de baches",
    description:
      "Mapea el estado del pavimento en tu ruta diaria para priorizar reparaciones.",
    tag: "Infraestructura",
    status: "en_revision",
    dataTypes: ["foto", "texto"],
    goalContributions: 400,
    quotaPerUser: 12,
    currentContributions: 0,
    approvedContributions: 0,
    pendingContributions: 0,
    rejectedContributions: 0,
    participants: 0,
    startDate: "2026-08-20",
    endDate: "2026-11-30",
    locationCity: "Tepic",
    locationState: "Nayarit",
    xpPerContribution: 30,
    daysRemaining: null,
    hasReviewerAssigned: false,
  },
  {
    id: "bibliotecas-barrio",
    creatorId: "u-ana-r",
    creatorName: "Ana R.",
    name: "Bibliotecas de barrio",
    description:
      "Ubica y describe los espacios de lectura comunitarios de tu zona.",
    tag: "Educación",
    status: "activa",
    dataTypes: ["foto", "texto"],
    goalContributions: 200,
    quotaPerUser: 6,
    currentContributions: 90,
    approvedContributions: 90,
    pendingContributions: 5,
    rejectedContributions: 2,
    participants: 51,
    startDate: "2026-08-01",
    endDate: "2026-09-28",
    locationCity: "Tepic",
    locationState: "Nayarit",
    xpPerContribution: 35,
    daysRemaining: 44,
    hasReviewerAssigned: false,
  },
];

// Aportes que Carlos (usuario actual) ha enviado como participante.
// Usado en /mis-aportes y /mis-aportes/[campanaId].
export const contributions: Contribution[] = [
  {
    id: "ap-4821",
    campaignId: "censo-arboles",
    campaignName: "Censo de árboles urbanos",
    userId: "u-carlos",
    participantName: "Carlos P.",
    description:
      "Árbol de laurel de la India en la banqueta de av. Insurgentes, aparentemente sano, con alcorque descubierto.",
    fileType: "foto",
    fileSizeBytes: 3_200_000,
    status: "aceptado",
    submittedAt: "2026-08-14T10:32:00",
  },
  {
    id: "ap-4903",
    campaignId: "censo-arboles",
    campaignName: "Censo de árboles urbanos",
    userId: "u-carlos",
    participantName: "Carlos P.",
    description: "Palma seca frente a la escuela primaria de la colonia Centro.",
    fileType: "foto",
    fileSizeBytes: 2_700_000,
    status: "pendiente",
    submittedAt: "2026-08-15T08:12:00",
  },
];

// Bandeja de moderación: TODOS los aportes recibidos por una campaña que
// Carlos administra (no solo los suyos). Usado en /mis-campanas/[id]/aportes.
export const campaignInbox: Contribution[] = [
  {
    id: "ap-5102",
    campaignId: "censo-arboles",
    campaignName: "Censo de árboles urbanos",
    userId: "u-sofia",
    participantName: "Sofía Herrera",
    participantEmail: "sofia@correo.com",
    description: "Árbol de laurel en av. Insurgentes",
    fileType: "foto",
    fileSizeBytes: 3_100_000,
    status: "espera_final",
    submittedAt: "2026-08-14T10:32:00",
    firstPassBy: "Diego Salas",
  },
  {
    id: "ap-5098",
    campaignId: "censo-arboles",
    campaignName: "Censo de árboles urbanos",
    userId: null,
    participantName: "Anónimo",
    description: "Vía enlace público, sin registro",
    fileType: "foto",
    fileSizeBytes: 2_400_000,
    status: "pendiente",
    submittedAt: "2026-08-14T09:47:00",
  },
  {
    id: "ap-5071",
    campaignId: "censo-arboles",
    campaignName: "Censo de árboles urbanos",
    userId: "u-diego",
    participantName: "Diego Salas",
    participantEmail: "diego@correo.com",
    description: "Palma seca frente a la escuela primaria",
    fileType: "foto",
    fileSizeBytes: 2_900_000,
    status: "espera_final",
    submittedAt: "2026-08-13T18:04:00",
    firstPassBy: "Diego Salas",
  },
];

export const reviewerCandidates: ReviewerCandidate[] = [
  { id: "u-diego", name: "Diego Salas", email: "diego@correo.com", currentRole: "Usuario común" },
  { id: "u-mara", name: "Mara Ortiz", email: "mara@correo.com", currentRole: "Usuario común" },
  { id: "u-ana", name: "Ana Ruiz", email: "ana@correo.com", currentRole: "Supervisor" },
  { id: "u-sofia", name: "Sofía Herrera", email: "sofia@correo.com", currentRole: "Usuario común" },
];

export function getCampaignById(id: string): Campaign | undefined {
  return campaigns.find((c) => c.id === id);
}

export function getContributionsByCampaign(campaignId: string): Contribution[] {
  return contributions.filter((c) => c.campaignId === campaignId);
}

export function getMyCampaigns(): Campaign[] {
  return campaigns.filter((c) => c.creatorId === currentUser.id);
}

export function getCampaignInbox(campaignId: string): Contribution[] {
  return campaignInbox.filter((c) => c.campaignId === campaignId);
}

export function getInboxItemById(
  campaignId: string,
  contributionId: string
): Contribution | undefined {
  return campaignInbox.find(
    (c) => c.campaignId === campaignId && c.id === contributionId
  );
}
