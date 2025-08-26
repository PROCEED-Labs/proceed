import Embedding from '../tasks/embedding';
import ZeroShotSemanticOpposites from '../tasks/semantic-zeroshot';
import { HuggingFaceModelError } from './errors';
import { getLogger } from './logger';

const logger = getLogger();

export async function ensureAllHuggingfaceModelsAreAvailable() {
  logger.debug('model', 'Checking availability of required models...');

  try {
    logger.debug('model', 'Initialising embedding model...');
    await Embedding.getInstance();

    logger.debug('model', 'Initialising zero-shot semantic opposites model...');
    await ZeroShotSemanticOpposites.getInstance();

    logger.modelInfo('All HuggingFace models initialised successfully');
  } catch (error) {
    throw new HuggingFaceModelError(
      'unknown', // We don't know which specific model failed - will maybe add later
      'initialisation',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
  logger.modelInfo('All required HuggingFace models are available');
}
