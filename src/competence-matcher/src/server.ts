import express from 'express';

import ResourceRouter from './routes/resource';
import MatchRouter from './routes/match';
import { config } from './config';
import { dbHeader } from './middleware/db-locator';
import { requestLogger } from './middleware/logging';
import { errorHandler } from './middleware/error-handler';
import Embedding from './tasks/embedding';
import { ensureAllOllamaModelsAreAvailable } from './utils/ollama';
import { splitSemantically } from './tasks/semantic-split';
import { createWorker } from './utils/worker';
import { ensureAllHuggingfaceModelsAreAvailable } from './utils/huggingface';
import { EmbeddingTask } from './utils/types';
import { CompetenceMatcherError } from './utils/errors';
import { logError } from './middleware/logging';

const { port: PORT, verbose } = config;

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
    if (verbose) {
      console.log('[Server] Initialising competence matcher service...');
    }

    // Ensure all required models are available
    // Hugging Face models
    if (verbose) {
      console.log('[Server] Checking HuggingFace models availability...');
    }
    await ensureAllHuggingfaceModelsAreAvailable();

    // Ollama models
    if (verbose) {
      console.log('[Server] Checking Ollama models availability...');
    }
    await ensureAllOllamaModelsAreAvailable();

    if (verbose) {
      console.log('[Server] All required models are available');
    }
  } catch (error) {
    const initError = new CompetenceMatcherError(
      `Failed to initialise required models: ${error instanceof Error ? error.message : String(error)}`,
      'server_initialisation',
      503,
      undefined,
      {
        stage: 'model_initialisation',
        originalError: error instanceof Error ? error.message : String(error),
      },
    );

    logError(initError, 'server_startup_failure');
    console.error('[Server] Failed to start due to model initialisation error');
    process.exit(1);
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
    if (verbose) {
      console.log(`[Server] Matching-Server is running on http://localhost:${PORT}`);
    }
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

  logError(startupError, 'server_startup_failure');
  console.error('[Server] Server shutdown due to startup error:', error);
  process.exit(1);
});
