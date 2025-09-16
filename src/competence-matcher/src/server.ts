import express from 'express';

import { config } from './config';
import { Logger, createLoggerConfig } from './utils/logger';

// Initilise logger first, before any other imports that might use it
const loggerConfig = createLoggerConfig();
const logger = Logger.getInstance(loggerConfig);

import ResourceRouter from './routes/resource';
import MatchRouter from './routes/match';
import { dbHeader } from './middleware/db-locator';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { ensureAllOllamaModelsAreAvailable } from './utils/ollama';
import { ensureAllHuggingfaceModelsAreAvailable } from './utils/huggingface';
import { CompetenceMatcherError } from './utils/errors';
import workerManager from './worker/worker-manager';

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

  try {
    logger.info('server', 'Initialising competence matcher service...');

    // Ensure all required models are available

    // Hugging Face models
    logger.info('server', 'Checking HuggingFace models availability...');
    await ensureAllHuggingfaceModelsAreAvailable();

    // Ollama models
    logger.info('server', 'Checking Ollama models availability...');
    await ensureAllOllamaModelsAreAvailable();

    logger.info('server', 'All required models are available');

    // Wait for worker pools to be ready
    logger.info('server', 'Waiting for worker pools to be ready...');
    await workerManager.ready();
    logger.info('server', 'All worker pools are ready');
  } catch (error) {
    const initError = new CompetenceMatcherError(
      `Failed to initialise service: ${error instanceof Error ? error.message : String(error)}`,
      'server_initialisation',
      503,
      undefined,
      {
        stage:
          error instanceof Error && error.message.includes('worker')
            ? 'worker_initialisation'
            : 'model_initialisation',
        originalError: error instanceof Error ? error.message : String(error),
      },
    );

    logger.error('server', 'Failed to start due to initialisation error', initError);
    throw initError; // Rethrow to be caught by outer catch
  }

  // Parse JSON
  app.use(express.json());
  // Parse URL-encoded data
  app.use(express.urlencoded({ extended: true }));
  // Middleware to handle database header
  app.use(dbHeader);
  // Logging middleware
  app.use(requestLogger);

  // Hello World
  app.get('/', (req, res, next) => {
    res.status(200).send('Welcome to the Matching Server');
  });

  // Routes
  app.use(PATHS.resource, ResourceRouter);
  app.use(PATHS.match, MatchRouter);

  // Error handler middleware (must be last, only invoked if error occurs)
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info('server', `Matching-Server is running on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  const startupError = new CompetenceMatcherError(
    `Server startup failed: ${error instanceof Error ? error.message : String(error)}`,
    'server_startup',
    500,
    undefined,
    { originalError: error instanceof Error ? error.message : String(error) },
  );

  logger.error('server', 'Server startup failed', startupError);
  logger.error('system', '[Server] Server shutdown due to startup error:', error);
  process.exit(1);
});
