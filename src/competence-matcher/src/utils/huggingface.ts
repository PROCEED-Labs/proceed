import CrossEncoder from '../tasks/cross-encode';
import Embedding from '../tasks/embedding';
import ZeroShotSemanticOpposites from '../tasks/semantic-zeroshot';
import { HuggingFaceModelError } from './errors';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Ensures that all required Hugging Face models are available by attempting to load them.
 * If any model fails to load, an error is thrown.
 *
 * As this is meant to be used in the main thread, it will trigger the download and caching of models if not already present.
 * Since the models inference, however, is meant to be run in worker threads, the model are loaded into ram in the main thread redundantly.
 * To mitigate this, the model instances are deleted after the check, so they can be reloaded in the worker threads when needed.
 */
export async function ensureAllHuggingfaceModelsAreAvailable() {
  logger.debug('model', 'Checking availability of required models...');

  try {
    logger.debug('model', 'Initialising embedding model...');
    await Embedding.getInstance();

    logger.debug('model', 'Initialising zero-shot semantic opposites model...');
    await ZeroShotSemanticOpposites.getInstance();

    logger.debug('model', 'Initialising cross-encoder model...');
    await CrossEncoder.getInstance();

    logger.modelInfo('All HuggingFace models initialised successfully');

    // Delete instances to free up memory as they will be reloaded in worker threads
    Embedding.deleteInstance();
    ZeroShotSemanticOpposites.deleteInstance();
    CrossEncoder.deleteInstance();
  } catch (error) {
    throw new HuggingFaceModelError(
      'unknown', // We don't know which specific model failed - will maybe add later
      'initialisation',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
  logger.modelInfo('All required HuggingFace models are available');
}
