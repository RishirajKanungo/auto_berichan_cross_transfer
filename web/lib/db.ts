// Per-user team storage in serverless Postgres (Neon / Vercel Postgres).
// Server-only. If no connection string is configured, dbConfigured is false and
// the API routes report that cloud storage is unavailable (client uses local).

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const dbConfigured = !!url;

const sql = url ? neon(url) : null;
let schemaReady = false;

async function ensureSchema() {
  if (!sql || schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      user_id    text NOT NULL,
      name       text NOT NULL,
      showdown   text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, name)
    )
  `;
  schemaReady = true;
}

export async function listUserTeams(userId: string): Promise<string[]> {
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`SELECT name FROM teams WHERE user_id = ${userId} ORDER BY name`;
  return rows.map((r) => r.name as string);
}

export async function getUserTeam(userId: string, name: string): Promise<string | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = await sql`SELECT showdown FROM teams WHERE user_id = ${userId} AND name = ${name}`;
  return (rows[0]?.showdown as string) ?? null;
}

export async function saveUserTeam(userId: string, name: string, showdown: string): Promise<void> {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO teams (user_id, name, showdown, updated_at)
    VALUES (${userId}, ${name}, ${showdown}, now())
    ON CONFLICT (user_id, name) DO UPDATE SET showdown = ${showdown}, updated_at = now()
  `;
}

export async function deleteUserTeam(userId: string, name: string): Promise<void> {
  if (!sql) return;
  await ensureSchema();
  await sql`DELETE FROM teams WHERE user_id = ${userId} AND name = ${name}`;
}
