import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';

import { DB_SCHEMA } from './schema.ts'
import { seedDatabase } from './seed.ts'

export class SqliteDatabase {
  private dbPath: string;
  private dbDir: string;
  private db!: Database.Database;

  constructor() {
    this.dbDir = path.join(os.homedir(), '.paum-system');
    this.dbPath = path.join(this.dbDir, 'database.sqlite')
  }

  getRawConnection(): Database.Database {
    return this.db;
  }

  getDBDir(): string {
    return this.dbDir
  }

  async init() {
    try {
      this.db = new Database(this.dbPath);
    } catch (error) {
      console.error('[Base de datos] No se pudo abrir el archivo SQLite: ', error);
      this.db = new Database(':memory:');
    }
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(
      DB_SCHEMA
    );

    // Siembra de datos iniciales
    seedDatabase(this.db);

    console.log(`[Base de Datos] SQLite Lista en: ${this.dbPath}`);
  }

}