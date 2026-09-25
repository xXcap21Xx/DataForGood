import { Pool, QueryResultRow } from "pg";

// Sin valor por defecto a propósito: si falta la variable, la app debe
// fallar con un error claro en vez de conectarse con credenciales de
// ejemplo. El pool se crea en el primer uso (no al importar) porque
// `next build` importa estos módulos sin variables de entorno.
function createPool(): Pool {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL (o POSTGRES_URL) en el entorno.");
  }

  const nuevo = new Pool({
    connectionString,
    // Si Postgres no responde (apagado, host equivocado), falla en segundos
    // en vez de colgar la petición hasta que el sistema operativo agote su
    // propio timeout de conexión TCP.
    connectionTimeoutMillis: 5000,
  });

  // Sin este listener, un error en un cliente inactivo del pool (p. ej. la
  // conexión con Postgres se cae) se propaga como excepción no capturada y
  // tumba el proceso, en vez de solo rechazar la siguiente query.
  nuevo.on("error", (err) => {
    console.error("Error inesperado en el pool de Postgres:", err);
  });

  return nuevo;
}

let realPool: Pool | null = null;

function getPool(): Pool {
  realPool ??= createPool();
  return realPool;
}

// Mismo objeto para todo el proyecto (`pool.query`, `pool.connect`), pero
// crea el Pool real hasta que se usa.
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const target = getPool();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: Array<string | number | null | undefined> = []
) {
  return pool.query<T>(text, params);
}
