import { Ollama } from 'ollama';
import { config } from '../config';
import { OllamaConnectionError } from './errors';

const { ollamaPath, splittingModel, reasonModel, ollamaBearerToken, verbose } = config;

export const ollama = new Ollama({
  host: ollamaPath,
  headers: {
    Authorization: `Bearer ${ollamaBearerToken}`, // https://github.com/ollama/ollama-js?tab=readme-ov-file#user-content-custom-headers
    'User-Agent': 'PROCEED Competence Matcher',
  },
});

/**
 * Ensures that all required models are available by checking their existence
 * in the Ollama server. If a model is not available, it will be downloaded.
 * If the model cannot be downloaded or is not available, an error will be thrown.
 * (Ensures all needed models are actually available)
 */
export async function ensureAllOllamaModelsAreAvailable() {
  const models = [splittingModel, reasonModel];

  if (verbose) {
    console.log(`[Ollama] Checking availability of models: ${models.join(', ')}`);
  }

  let availableModels: string[];
  try {
    const modelList = await ollama.list();
    availableModels = modelList.models.map((model) => model.model);

    if (verbose) {
      console.log(`[Ollama] Available models: ${availableModels.join(', ')}`);
    }
  } catch (error) {
    throw new OllamaConnectionError(
      ollamaPath,
      'list_models',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  for (const model of models) {
    if (!availableModels.includes(model)) {
      if (verbose) {
        console.log(`[Ollama] Model '${model}' not found, attempting to pull...`);
      }

      try {
        const modelpull = await ollama.pull({
          model,
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

        if (verbose) {
          console.log(`[Ollama] Successfully pulled model '${model}'`);
        }
      } catch (error) {
        // If the pull takes too long and the ollama is behind a proxy, it can timeout (504 as response code)
        // In this case, we just recheck the model availability
        // TODO:
        if (error instanceof OllamaConnectionError) {
          throw error;
        }
        throw new OllamaConnectionError(
          ollamaPath,
          'pull_model',
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    } else {
      if (verbose) {
        console.log(`[Ollama] Model '${model}' is available (already downloaded)`);
      }
    }
  }

  if (verbose) {
    console.log('[Ollama] All required Ollama-Models models are available');
  }
}
