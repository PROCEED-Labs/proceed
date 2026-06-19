import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const { multipleDBs } = config;

export function dbHeader(req: Request, res: Response, next: NextFunction): void {
  // This middleware allows for the use f multiple databases instead of a single one.
  // 'x-proceed-db-id' is a custom header that should be included in the request, which specifies the database name to use.
  if (multipleDBs) {
    const dbName = req.header('x-proceed-db-id');
    if (!dbName || typeof dbName !== 'string' || dbName.trim() === '') {
      res.status(400).json({ error: 'Missing x-proceed-db-id header' });
      return;
    }
    req.dbName = dbName;
  } else {
    // For now, we use a single database, so we can just set a default name.
    req.dbName = 'PROCEED-Matching.db';
  }

  next();
}
