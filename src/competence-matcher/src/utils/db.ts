import DBManager from '../db/db-manager';

export function getDB(name: string) {
  const dbManager = DBManager.getInstance();
  DBManager.setActiveDB(name);
  return dbManager.getDB(name);
}
