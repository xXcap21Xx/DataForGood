import { hasRootSession } from "@/lib/rootSession";

// La documentación describe toda la API, así que en producción solo la ve
// el SuperUsuario. En `next dev` queda abierta para trabajar con ella.
export async function puedeVerDocs(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  return hasRootSession();
}
