// User persistence layer.
//
// If DATABASE_URL is set (e.g. a Neon / Render / Supabase Postgres), accounts are
// stored in Postgres so they survive restarts and redeploys. Otherwise they fall
// back to a local JSON file for offline development.
//
// The auth module keeps an in-memory cache of users for fast (synchronous) reads;
// this module is only touched on writes and at startup.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let mode = 'file';
let pool = null;

const rowToUser = (r) => ({
  id: r.id, name: r.name, email: r.email, mocId: r.moc_id,
  role: r.role, status: r.status, passHash: r.pass_hash,
  createdAt: Number(r.created_at),
});

export function dbMode() { return mode; }

export async function initUserDb() {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // hosted Postgres (Neon/Render/Supabase)
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        moc_id TEXT,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        pass_hash TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);
    mode = 'pg';
  } else {
    mode = 'file';
  }
  return mode;
}

export async function loadUsers() {
  if (mode === 'pg') {
    const r = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
    return r.rows.map(rowToUser);
  }
  try {
    if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to load users file:', e.message);
  }
  return [];
}

// Persist one user. `all` is the full in-memory list, used for file mode.
export async function upsertUser(u, all) {
  if (mode === 'pg') {
    await pool.query(
      `INSERT INTO users (id, name, email, moc_id, role, status, pass_hash, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         name=$2, email=$3, moc_id=$4, role=$5, status=$6, pass_hash=$7`,
      [u.id, u.name, u.email, u.mocId, u.role, u.status, u.passHash, u.createdAt]
    );
    return;
  }
  writeFile(all);
}

export async function removeUser(id, all) {
  if (mode === 'pg') {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    return;
  }
  writeFile(all);
}

function writeFile(all) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(all, null, 2));
  } catch (e) {
    console.error('Failed to save users file:', e.message);
  }
}
