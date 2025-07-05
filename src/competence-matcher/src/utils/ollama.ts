import { Ollama } from 'ollama';
import { config } from '../config';

const { ollamaPath, ollamaSplittingModel, ollamaReasonModel } = config;

export const ollama = new Ollama({
  host: ollamaPath,
  headers: {
    'User-Agent': 'PROCEED Competence Matcher',
  },
});

/**
 * Ensures that all required models are available by checking their existence
 * in the Ollama server. If a model is not available, it will be downloaded.
 * If the model cannot be downloaded or is not available, an error will be thrown.
 * (Ensures all needed models are actually available)
 */
export const ensureAllModelsAreAvailable = async () => {
  const models = [ollamaSplittingModel, ollamaReasonModel];

  const availableModels = (await ollama.list()).models.map((model) => model.model);

  for (const model of models) {
    if (!availableModels.includes(model)) {
      const modelpull = await ollama.pull({
        model,
        insecure: false,
        stream: false,
      });

      // Check if the model was successfully pulled
      if (!modelpull || modelpull.status !== 'success') {
        throw new Error(
          `Model ${model} could not be pulled: ${modelpull?.status || 'Unknown error'}`,
        );
      }
    }
  }

  console.log('All required models are available in ollama.');
};
