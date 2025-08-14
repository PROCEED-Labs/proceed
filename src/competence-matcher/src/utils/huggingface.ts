import Embedding from '../tasks/embedding';
import ZeroShotSemanticOpposites from '../tasks/semantic-zeroshot';

export async function ensureAllHuggingfaceModelsAreAvailable() {
  try {
    await Embedding.getInstance();
    await ZeroShotSemanticOpposites.getInstance();
  } catch (error) {
    throw error;
  }

  console.log('All required Hugging Face models are available.');
}
