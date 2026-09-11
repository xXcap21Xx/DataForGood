import { Pool, QueryResultRow } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/dataforgood";

export const pool = new Pool({
  connectionString,
});

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: Array<string | number | null | undefined> = []
) {
  return pool.query<T>(text, params);
}
