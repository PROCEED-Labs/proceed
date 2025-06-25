import express from 'express';

import ResourceRouter from './routes/resource';
import MatchRouter from './routes/match';
import { config } from './config';
import { dbHeader } from './middleware/db-locator';
import { requestLogger } from './middleware/logging';
import Embedding from './tasks/embedding';

const { port: PORT } = config;
export const PATHS = {
  resource: '/resource-competence-list',
  match: '/matching-task-to-resource',
};

const app = express();

// Ensure embedding model is loaded
Embedding.getInstance();

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    dbName?: string;
  }
}

// Parse JSON
app.use(express.json());
// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));
// Middleware to handle database header
app.use(dbHeader);
// Logging middleware
// app.use(requestLogger);

// Hello World
app.get('/', (req, res, next) => {
  console.log('Received a GET request on /');
  res.status(200).send('Welcome to the Matching Server');
});

// Routes
app.use(PATHS.resource, ResourceRouter);
// app.use('/match', MatchRouter);

app.listen(PORT, () => {
  console.log(`Matching-Server is running on http://localhost:${PORT}`);
});
