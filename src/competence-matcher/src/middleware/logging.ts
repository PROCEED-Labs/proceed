import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const { method, query, body, headers, params } = req;
  const logData = {
    time: new Date().toISOString(),
    method,
    path: req.path,
    query: JSON.stringify(query, null, 2),
    body,
    headers: JSON.stringify(headers, null, 2),
    params: JSON.stringify(params, null, 2),
    ip: req.ip,
  };
  console.table([logData]);
  next();
}
