import Embedding from '../tasks/embedding';
import ZeroShotSemanticOpposites from '../tasks/semantic-opposites';

export async function ensureAllHuggingfaceModelsAreAvailable() {
  try {
    Embedding.getInstance();
    ZeroShotSemanticOpposites.getInstance();
  } catch (error) {
    throw error;
  }

  console.log('All required Hugging Face models are available.');
}
