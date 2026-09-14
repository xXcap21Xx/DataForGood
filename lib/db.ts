import { Pool, QueryResultRow } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/dataforgood";

export const pool = new Pool({
  connectionString,
  // Si Postgres no responde (apagado, host equivocado), falla en segundos
  // en vez de colgar la petición hasta que el sistema operativo agote su
  // propio timeout de conexión TCP.
  connectionTimeoutMillis: 5000,
});

// Sin este listener, un error en un cliente inactivo del pool (p. ej. la
// conexión con Postgres se cae) se propaga como excepción no capturada y
// tumba el proceso, en vez de solo rechazar la siguiente query.
pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres:", err);
});

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: Array<string | number | null | undefined> = []
) {
  return pool.query<T>(text, params);
}
