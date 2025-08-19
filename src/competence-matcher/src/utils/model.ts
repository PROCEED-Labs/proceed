import { config } from '../config';

import {
  pipeline,
  env as huggingfaceEnv,
  PipelineType,
  PretrainedModelOptions,
} from '@huggingface/transformers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TransformerPipelineOptions } from './types';

import { isMainThread } from 'node:worker_threads';

/**
 * Base class that handles:
 *  - singleton pipeline instance
 *  - model cache dir
 *  - on‑demand loading with optional progressCallback
 */
export abstract class TransformerPipeline<PI> {
  protected static instance: any = null;
  protected static loaded = false;

  protected static getPipelineOptions(): TransformerPipelineOptions {
    throw new Error('getPipelineOptions must be implemented in subclasses');
  }

  private static async initEnv(cacheDir?: string) {
    if (cacheDir) {
      const abs = path.resolve(cacheDir);
      if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
      huggingfaceEnv.cacheDir = abs;
    }
    huggingfaceEnv.allowLocalModels = true;
  }

  public static async getInstance<PI>(): Promise<PI> {
    if (this.instance === null) {
      const { task, model, options } = this.getPipelineOptions();
      await this.initEnv(options?.cache_dir || config.modelCache);

      const opts: PretrainedModelOptions = {
        cache_dir: options?.cache_dir || config.modelCache,
        use_external_data_format: options?.use_external_data_format ?? true,
        device: options?.device || (config.useGPU ? 'cuda' : 'cpu'),
        dtype: options?.dtype || 'fp32',
        progress_callback: options?.progress_callback,
      };

      // actually load the pipeline
      this.instance = await pipeline(task as PipelineType, model, opts);

      // mark it as loaded and log on first load
      if (!this.loaded && isMainThread) {
        if (config.verbose) {
          console.log(`[Model-Pipeline] ${model} (${task}) is ready`);
        }
        this.loaded = true;
      }
    }

    return this.instance;
  }
}
