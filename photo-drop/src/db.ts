import Database from "better-sqlite3";
import { config } from "./config";

export interface User {
  id: number;
  google_sub: string;
  email: string;
  refresh_token_enc: string | null;
  paid: number;
  stripe_session_id: string | null;
  folder_id: string | null;
  folder_name: string | null;
  upload_token: string;
  created_at: string;
}

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  refresh_token_enc TEXT,
  paid INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  folder_id TEXT,
  folder_name TEXT,
  upload_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

export const getUserById = (id: number) =>
  db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
export const getUserByToken = (t: string) =>
  db.prepare("SELECT * FROM users WHERE upload_token = ?").get(t) as User | undefined;
export const getUserBySub = (s: string) =>
  db.prepare("SELECT * FROM users WHERE google_sub = ?").get(s) as User | undefined;
