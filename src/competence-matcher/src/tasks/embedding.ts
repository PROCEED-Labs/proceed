import {
  PipelineType,
  FeatureExtractionPipeline,
  FeatureExtractionPipelineOptions,
} from '@huggingface/transformers';
import { config } from '../config';
import { TransformerPipeline } from '../utils/model';
import { TransformerPipelineOptions } from '../utils/types';

export default class Embedding extends TransformerPipeline<FeatureExtractionPipeline> {
  protected static override getPipelineOptions(): TransformerPipelineOptions {
    return {
      task: 'feature-extraction' as PipelineType,
      model: config.embeddingModel,
      options: {
        // progress_callback: (progress) => {
        //   logger.debug("system", `Embedding progress: ${progress}`);
        // },
      },
    };
  }

  /**
   * Turn text (or array of text) into one or more vectors.
   * @param texts string or array
   * @param opts override default mean-pooling/normalize
   */
  public static async embed(
    texts: string | string[],
    opts: FeatureExtractionPipelineOptions = { pooling: 'mean', normalize: true },
  ): Promise<number[][]> {
    // Pipeline is loaded & cached by TransformerPipeline
    const pipe = await this.getInstance<FeatureExtractionPipeline>();
    const input = Array.isArray(texts) ? texts : [texts];
    // call the pipeline
    const raw = await pipe(input, opts);
    const arrs = (Array.isArray(raw) ? raw : [raw]).map((tensor) => {
      // each tensor.data is a Float32Array
      const data = (tensor as any).data as Float32Array;
      const vec = Array.from(data);
      if (vec.length !== config.embeddingDim) {
        throw new Error(`Expected embeddingDim=${config.embeddingDim}, got ${vec.length}`);
      }

      // This prevents memory leaks and handle exhaustion that cause crashes on subsequent jobs
      if (tensor && typeof (tensor as any).dispose === 'function') {
        try {
          (tensor as any).dispose();
        } catch (err) {
          // Log but don't fail if disposal fails
          console.warn('Failed to dispose tensor:', err);
        }
      }

      return vec;
    }) as number[][];
    return arrs;
  }
}
