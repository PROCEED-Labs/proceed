import Embedding from '../tasks/embedding';
import ZeroShotSemanticOpposites from '../tasks/semantic-zeroshot';
import { HuggingFaceModelError } from './errors';
import { config } from '../config';

const { verbose } = config;

export async function ensureAllHuggingfaceModelsAreAvailable() {
  if (verbose) {
    console.log('[HuggingFace] Checking availability of required models...');
  }

  try {
    if (verbose) {
      console.log('[HuggingFace] Initialising embedding model...');
    }
    await Embedding.getInstance();

    if (verbose) {
      console.log('[HuggingFace] Initialising zero-shot semantic opposites model...');
    }
    await ZeroShotSemanticOpposites.getInstance();

    if (verbose) {
      console.log('[HuggingFace] All models initialised successfully');
    }
  } catch (error) {
    throw new HuggingFaceModelError(
      'unknown', // We don't know which specific model failed - will maybe add later
      'initialisation',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
  if (verbose) {
    console.log('[HuggingFace] All required HuggingFace-Models are available');
  }
}
