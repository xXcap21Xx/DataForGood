import { OAuth2Client } from "google-auth-library";

function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI no están configuradas");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(state: string) {
  const client = getClient();
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    // Sin `prompt`: Google solo pide elegir cuenta y conceder acceso la
    // primera vez. Con sesión de Google activa y consentimiento ya dado,
    // el resto de los inicios de sesión pasan directo sin mostrar nada de
    // eso. Con `prompt: "select_account"` (como estaba antes) se forzaba
    // ese paso en cada inicio de sesión, no solo en el primero.
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
}

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const client = getClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google no devolvió un id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.sub) {
    throw new Error("No se pudo obtener el perfil de Google");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    givenName: payload.given_name || "Usuario",
    familyName: payload.family_name || "Google",
  };
}
