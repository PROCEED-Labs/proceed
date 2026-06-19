import * as path from 'node:path';
import * as fs from 'node:fs';
import VectorDataBase from './db';
import { config } from '../config';

const { dbPath: rawDbPath, embeddingDim } = config;

/**
 * DBManager: Singleton that manages multiple VectorDataBase instances keyed by name.
 *
 */
class DBManager {
  private static managerInstance: DBManager;
  private dbInstances = new Map<string, VectorDataBase>();
  private static activeDB: VectorDataBase | null = null;
  private dbPath: string;
  private embeddingDim: number;

  private constructor() {
    this.embeddingDim = embeddingDim;

    // Resolve absolute path for storage directory
    this.dbPath = path.resolve(rawDbPath);
    // Ensure directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    // Load existing databases
    this.loadSavedDBs();
  }

  /**
   * Retrieve the singleton DBManager instance, initialising if necessary.
   * @returns DBManager singleton
   */
  public static getInstance(): DBManager {
    if (!DBManager.managerInstance) {
      DBManager.managerInstance = new DBManager();
    }
    return DBManager.managerInstance;
  }

  /**
   * Initialise the DBManager and load any existing databases.
   */
  private loadSavedDBs(): void {
    // Load existing databases from the storage directory
    const files = fs.readdirSync(this.dbPath);
    files.forEach((file) => {
      if (file.endsWith('.db')) {
        const dbName = path.basename(file, '.db');
        this.addDBInstance(dbName);
      }
    });
  }

  /**
   * Normalise a database name by stripping any extension and enforcing `.db`.
   * @param dbName Name provided; may include extension.
   * @returns Normalised filename ending with `.db`.
   */
  private normaliseDBName(dbName: string): string {
    const base = path.basename(dbName, path.extname(dbName));
    return `${base}.db`;
  }

  /**
   * Resolve full absolute path to the DB file under storage directory.
   * @param dbName Name provided by user; normalised to `.db` and joined with storage dir.
   * @returns Absolute file path for the database.
   */
  private resolveDbPath(dbName: string): string {
    const normalisedDBName = this.normaliseDBName(dbName);
    return path.join(this.dbPath, normalisedDBName);
  }

  /**
   * Internal: create and cache a new VectorDataBase instance for the given name.
   * Uses resolveDbPath to obtain the absolute file path.
   * @param dbName Name provided by user; normalised internally.
   * @returns Newly created VectorDataBase instance.
   */
  private addDBInstance(dbName: string): VectorDataBase {
    const normalisedDBName = this.normaliseDBName(dbName);
    const filePath = this.resolveDbPath(normalisedDBName);
    const db = new VectorDataBase({ filePath, embeddingDim: this.embeddingDim });
    this.dbInstances.set(normalisedDBName, db);
    return db;
  }

  /**
   * Get the currently active VectorDataBase instance, if set via setActiveDB.
   * @returns Active VectorDataBase or null if none is set.
   */
  public static getActiveDB(): VectorDataBase | null {
    return DBManager.activeDB;
  }

  /**
   * Set the active database by name. Creates the instance if it does not exist.
   * @param dbName Name of the database (without extension or with any extension).
   */
  public static setActiveDB(dbName: string): void {
    const manager = DBManager.getInstance();
    const normalisedDBName = manager.normaliseDBName(dbName);
    if (!manager.dbInstances.has(normalisedDBName)) {
      manager.addDBInstance(normalisedDBName);
    }
    DBManager.activeDB = manager.dbInstances.get(normalisedDBName)!;
  }

  /**
   * Retrieve (or create) the VectorDataBase instance for given name.
   * @param dbName Name of the database (without extension or with any extension).
   * @returns VectorDataBase instance corresponding to the name.
   */
  public getDB(dbName: string): VectorDataBase {
    const normalisedDBName = this.normaliseDBName(dbName);
    if (this.dbInstances.has(normalisedDBName)) {
      return this.dbInstances.get(normalisedDBName)!;
    }
    return this.addDBInstance(normalisedDBName);
  }

  /**
   * Close and remove the VectorDataBase instance for given name.
   * @param dbName Name of the database to close.
   * @returns True if instance existed and was closed; false otherwise.
   */
  public closeDB(dbName: string): boolean {
    const normalisedDBName = this.normaliseDBName(dbName);
    const db = this.dbInstances.get(normalisedDBName);
    if (db) {
      db.close();
      this.dbInstances.delete(normalisedDBName);
      if (DBManager.activeDB === db) {
        DBManager.activeDB = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Close and remove all managed VectorDataBase instances.
   */
  public closeAllDBs(): void {
    this.dbInstances.forEach((db) => db.close());
    this.dbInstances.clear();
    DBManager.activeDB = null;
  }

  /**
   * List the names (normalised) of all managed databases.
   * @returns Array of database filenames (e.g. ['tenant1.db', 'other.db']).
   */
  public listDBs(): string[] {
    return Array.from(this.dbInstances.keys());
  }
}

export default DBManager;
