import { initDb } from "../db";

export function getToday(): string {
  const db = initDb();
  const row = db.query("SELECT value FROM system_config WHERE key = 'current_date'").get() as { value: string } | null;
  return row?.value ?? "2026-05-13";
}

export function getNow(): string {
  return `${getToday()}T12:00:00.000Z`;
}
