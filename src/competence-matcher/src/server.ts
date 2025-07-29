import express from 'express';

import ResourceRouter from './routes/resource';
import MatchRouter from './routes/match';
import { config } from './config';
import { dbHeader } from './middleware/db-locator';
import { requestLogger } from './middleware/logging';
import Embedding from './tasks/embedding';
import { ensureAllOllamaModelsAreAvailable } from './utils/ollama';
import { splitSemantically } from './tasks/semantic-split';
import { createWorker } from './utils/worker';
import { ensureAllHuggingfaceModelsAreAvailable } from './utils/huggingface';
import { EmbeddingTask } from './utils/types';

const { port: PORT } = config;

export const PATHS = {
  resource: '/resource-competence-list',
  match: '/matching-task-to-resource',
};

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    dbName?: string;
  }
}

async function main() {
  const app = express();

  // Ensure all required models are available
  // Hugging Face models
  await ensureAllHuggingfaceModelsAreAvailable();
  // Ollama models
  await ensureAllOllamaModelsAreAvailable();

  // const tasks = [
  //   {
  //     listId: 'test-list',
  //     resourceId: 'test-resource',
  //     competenceId: 'test-competence',
  //     text: 'This competence covers the principles and best practices of designing scalable software systems. It includes high-level architecture, component interaction, and trade-off analysis. Practitioners will need to balance performance, reliability, and maintainability when making design decisions.',
  //     type: 'description',
  //   },
  //   {
  //     listId: 'test-list',
  //     resourceId: 'test-resource',
  //     competenceId: 'test-competence',
  //     text: 'This competence focuses on building and maintaining RESTful and GraphQL APIs. It covers endpoint design, versioning strategies, and error handling. Learners will gain hands-on experience with request validation, authentication, and performance tuning.',
  //     type: 'description',
  //   },
  //   {
  //     listId: 'test-list',
  //     resourceId: 'test-resource',
  //     competenceId: 'test-competence',
  //     text: 'This competence entails designing effective database schemas to represent business domains. It involves normalization, denormalization, and indexing strategies for optimal query performance. Real-world scenarios will illustrate when to choose relational versus NoSQL approaches.',
  //     type: 'description',
  //   },
  //   {
  //     listId: 'test-list',
  //     resourceId: 'test-resource',
  //     competenceId: 'test-competence',
  //     text: 'This competence covers fundamental security principles for web applications. Topics include authentication, authorization, encryption, and secure configuration management. Practical exercises demonstrate common vulnerabilities and how to mitigate them effectively.',
  //     type: 'description',
  //   },
  //   {
  //     listId: 'test-list',
  //     resourceId: 'test-resource',
  //     competenceId: 'test-competence',
  //     text: "This person can not swim at all. Please don't let them close water at all.",
  //     type: 'description',
  //   },
  // ] as EmbeddingTask[];

  // const testworker = createWorker('test');
  // testworker.on('message', (message) => {
  //   console.log(message);
  // });
  // testworker.postMessage(tasks);

  // const result = await splitSemantically(tasks);
  // console.log(result);

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
  app.use(PATHS.match, MatchRouter);

  app.listen(PORT, () => {
    console.log(`Matching-Server is running on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Server shutdown due to error:', error);
  process.exit(1);
});
