import {
  pipeline,
  env as huggingfaceEnv,
  PipelineType,
  ProgressCallback,
  FeatureExtractionPipeline,
  FeatureExtractionPipelineOptions,
  PretrainedModelOptions,
} from '@huggingface/transformers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from '../config';

const { model, modelCache, embeddingDim } = config;

class Embedding {
  private static task: PipelineType = 'feature-extraction';
  private static model = model;
  private static instance: FeatureExtractionPipeline | null = null;

  /**
   * Return the singleton pipeline instance, loading if needed.
   * @param progressCallback Optional progress callback for model loading.
   */
  public static async getInstance(
    progressCallback: ProgressCallback | null = (progressInfo) => {
      console.log(progressInfo);
    },
  ) {
    if (Embedding.instance === null) {
      Embedding.configureEnv();

      const opts: PretrainedModelOptions = {
        use_external_data_format: true,
      };
      //   { progress_callback, config, cache_dir, local_files_only, revision, device, dtype, subfolder, use_external_data_format, model_file_name, session_options, }
      if (progressCallback) opts.progress_callback = progressCallback;
      if (progressCallback) {
        opts.progress_callback = progressCallback;
      }

      const pipelineResult: any = await pipeline(Embedding.task, Embedding.model, opts);
      Embedding.instance = pipelineResult as FeatureExtractionPipeline;
    }
    return Embedding.instance;
  }

  private static configureEnv() {
    if (modelCache) {
      const absCache = path.resolve(modelCache);
      if (!fs.existsSync(absCache)) {
        fs.mkdirSync(absCache, { recursive: true });
      }
      huggingfaceEnv.cacheDir = absCache;
    }
    huggingfaceEnv.allowLocalModels = true;
  }

  /**
   * Compute embeddings (mean-pooled, normalised by default) for one or more texts.
   * @param texts Single string or array of strings to embed.
   * @param options Pipeline options, e.g. { pooling: 'mean', normalize: true }.
   * @returns 2D array [numText][embeddingDim]
   */
  public static async embed(
    texts: string | string[],
    options: FeatureExtractionPipelineOptions = { pooling: 'mean', normalize: true },
  ): Promise<number[][]> {
    const pipe = await Embedding.getInstance();
    const inputs = Array.isArray(texts) ? texts : [texts];
    const output = await pipe(inputs, options);

    // The pipeline returns a Tensor or array of Tensors (depending on input)
    const raw = Array.isArray(output) ? output : [output];

    const embeddings = raw.map((tensor) => {
      const data = (tensor as any).data as Float32Array;
      const arr = Array.from(data);
      if (arr.length !== embeddingDim) {
        throw new Error(
          `Embedding dimension mismatch: expected ${embeddingDim}, got ${arr.length}`,
        );
      }
      return arr;
    }) as number[][];

    return embeddings;
  }
}

export default Embedding;
