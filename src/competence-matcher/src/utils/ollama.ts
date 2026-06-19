import { Ollama } from 'ollama';
import { config } from '../config';
import { OllamaConnectionError } from './errors';
import { getLogger } from './logger';

const {
  ollamaPath,
  splittingModel,
  reasonModel,
  ollamaBearerToken,
  maxOllamaRetries,
  ollamaRetryDelay,
  ollamaRetryBackoff,
} = config;

// Lazy logger initialization to avoid module loading order issues
let logger: ReturnType<typeof getLogger> | null = null;
const getLoggerInstance = () => {
  if (!logger) {
    logger = getLogger();
  }
  return logger;
};

export const ollama = new Ollama({
  host: ollamaPath,
  headers: {
    Authorization: `Bearer ${ollamaBearerToken}`, // https://github.com/ollama/ollama-js?tab=readme-ov-file#user-content-custom-headers
    'User-Agent': 'PROCEED Competence Matcher',
  },
});

/**
 * Utility function to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is likely a timeout error from nginx proxy
 */
function isTimeoutError(error: any): boolean {
  if (error instanceof OllamaConnectionError) {
    const originalError = error.cause;
    // Check for common timeout/proxy error indicators
    if (originalError && typeof originalError === 'object') {
      const errorString = String(originalError).toLowerCase();
      const errorMessage = (originalError as any).message?.toLowerCase() || '';

      return (
        errorString.includes('504') || // Gateway timeout
        errorString.includes('timeout') || // General timeout
        errorString.includes('etimedout') || // Node.js timeout
        errorString.includes('econnreset') || // Connection reset
        errorMessage.includes('504') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('gateway timeout')
      );
    }
  }
  return false;
}

/**
 * Get error message safely from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Attempt to pull a model with retry logic for handling proxy timeouts
 */
async function pullModelWithRetry(modelName: string): Promise<boolean> {
  for (let attempt = 1; attempt <= maxOllamaRetries; attempt++) {
    try {
      getLoggerInstance().debug(
        'model',
        `Attempting to pull Ollama model '${modelName}' (attempt ${attempt}/${maxOllamaRetries})`,
      );

      const modelpull = await ollama.pull({
        model: modelName,
        insecure: false,
        stream: false,
      });

      // Check if the model was successfully pulled
      if (!modelpull || modelpull.status !== 'success') {
        throw new OllamaConnectionError(
          ollamaPath,
          'pull_model',
          new Error(`Model pull failed: ${modelpull?.status || 'Unknown error'}`),
        );
      }

      getLoggerInstance().info('model', `Successfully pulled Ollama model '${modelName}'`);
      return true;
    } catch (error) {
      const isTimeout = isTimeoutError(error);
      const isLastAttempt = attempt === maxOllamaRetries;

      if (isTimeout && !isLastAttempt) {
        // Log as warning for timeout errors that we'll retry
        const delay = ollamaRetryDelay * Math.pow(ollamaRetryBackoff, attempt - 1);
        getLoggerInstance().warn(
          'model',
          `Ollama model pull timeout for '${modelName}' (attempt ${attempt}/${maxOllamaRetries}), retrying in ${Math.round(delay / 1000)}s...`,
          {
            modelName,
            attempt,
            maxRetries: maxOllamaRetries,
            retryDelay: delay,
            error: getErrorMessage(error),
          },
        );

        // Wait before retrying with exponential backoff
        await sleep(delay);
        continue;
      } else if (isLastAttempt) {
        // Final attempt failed - escalate to error
        getLoggerInstance().error(
          'model',
          `Failed to pull Ollama model '${modelName}' after ${maxOllamaRetries} attempts`,
          error instanceof Error ? error : new Error(String(error)),
          {
            modelName,
            totalAttempts: maxOllamaRetries,
            finalError: getErrorMessage(error),
          },
        );
        throw error;
      } else {
        // Non-timeout error on non-final attempt
        getLoggerInstance().warn(
          'model',
          `Ollama model pull error for '${modelName}' (attempt ${attempt}/${maxOllamaRetries}): ${getErrorMessage(error)}`,
          {
            modelName,
            attempt,
            maxRetries: maxOllamaRetries,
            error: getErrorMessage(error),
          },
        );

        // Wait before retrying (shorter delay for non-timeout errors)
        await sleep(Math.min(ollamaRetryDelay, 5000));
        continue;
      }
    }
  }

  return false; // Should never reach here due to throw in loop
}

/**
 * Ensures that all required models are available by checking their existence
 * in the Ollama server. If a model is not available, it will be downloaded.
 * If the model cannot be downloaded or is not available, an error will be thrown.
 * (Ensures all needed models are actually available)
 */
export async function ensureAllOllamaModelsAreAvailable() {
  const models = [splittingModel, reasonModel];

  getLoggerInstance().debug(
    'model',
    `Checking availability of Ollama models: ${models.join(', ')}`,
  );

  let availableModels: string[];
  try {
    const modelList = await ollama.list();
    availableModels = modelList.models.map((model) => model.model);

    getLoggerInstance().debug('model', `Available Ollama models: ${availableModels.join(', ')}`);
  } catch (error) {
    throw new OllamaConnectionError(
      ollamaPath,
      'list_models',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  for (const model of models) {
    if (!availableModels.includes(model)) {
      getLoggerInstance().info('model', `Ollama model '${model}' not found, attempting to pull...`);

      try {
        await pullModelWithRetry(model);

        // After successful pull, re-check model availability to ensure it's actually there
        getLoggerInstance().debug('model', `Re-checking availability of '${model}' after pull...`);

        try {
          const updatedModelList = await ollama.list();
          const updatedAvailableModels = updatedModelList.models.map((m) => m.model);

          if (!updatedAvailableModels.includes(model)) {
            throw new OllamaConnectionError(
              ollamaPath,
              'verify_model',
              new Error(
                `Model '${model}' was reportedly pulled successfully but is not available in model list`,
              ),
            );
          }

          getLoggerInstance().debug('model', `Confirmed '${model}' is now available after pull`);
        } catch (verifyError) {
          getLoggerInstance().warn(
            'model',
            `Failed to verify model '${model}' availability after pull: ${getErrorMessage(verifyError)}`,
            { model, verifyError: getErrorMessage(verifyError) },
          );

          // If verification fails, we still consider the pull successful if it didn't throw
          // This handles cases where the model is actually available but listing fails
        }
      } catch (error) {
        // Re-check one more time in case the model was actually pulled despite the error
        getLoggerInstance().debug(
          'model',
          `Pull failed for '${model}', performing final availability check...`,
        );

        try {
          const finalModelList = await ollama.list();
          const finalAvailableModels = finalModelList.models.map((m) => m.model);

          if (finalAvailableModels.includes(model)) {
            getLoggerInstance().info(
              'model',
              `Model '${model}' is now available despite pull error - continuing`,
            );
            continue; // Model is actually available, continue to next model
          }
        } catch (listError) {
          getLoggerInstance().debug(
            'model',
            `Final model list check failed: ${getErrorMessage(listError)}`,
          );
        }

        // Model is definitely not available, propagate the original error
        throw error;
      }
    } else {
      getLoggerInstance().debug(
        'model',
        `Ollama model '${model}' is available (already downloaded)`,
      );
    }
  }

  getLoggerInstance().modelInfo('All required Ollama models are available');
}
