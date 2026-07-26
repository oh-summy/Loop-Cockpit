// apps/host/src/db/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

/** Expand a leading `~` or `~/` to the user's home directory. */
function expandHome(p: string): string {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function getDataDir(): string {
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir) {
    return expandHome(envDataDir);
  }
  const home = os.homedir();
  if (!home) throw new Error('Cannot resolve HOME directory');
  return path.join(home, '.loop-cockpit');
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _rawDb: Database.Database | null = null;

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db) return _db;

  const dataDir = getDataDir();
  ensureDir(dataDir);

  const dbPath = path.join(dataDir, 'data.db');
  _rawDb = new Database(dbPath);

  _rawDb.pragma('journal_mode = WAL');
  _rawDb.pragma('synchronous = NORMAL');
  _rawDb.pragma('foreign_keys = ON');
  _rawDb.pragma('busy_timeout = 5000');

  _db = drizzle(_rawDb, { schema });
  return _db;
}

function getRawDb(): Database.Database {
  if (!_rawDb) getDb();
  // _rawDb is set by getDb() above.
  return _rawDb as Database.Database;
}

function closeDb() {
  if (_rawDb) {
    _rawDb.close();
    _rawDb = null;
    _db = null;
  }
}

export { getDb, getRawDb, closeDb, getDataDir };
