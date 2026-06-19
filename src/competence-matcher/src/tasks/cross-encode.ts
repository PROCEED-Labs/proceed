import { TransformerPipeline } from '../utils/model';
import { TransformerPipelineOptions } from '../utils/types';
import { PipelineType, TextClassificationPipeline } from '@huggingface/transformers';
import { config } from '../config';

export default class CrossEncoder extends TransformerPipeline<TextClassificationPipeline> {
  protected static override getPipelineOptions(): TransformerPipelineOptions {
    return {
      task: 'text-classification' as PipelineType,
      model: config.crossEncoderModel,
      options: {
        model_file_name: 'model.onnx',
        use_external_data_format: true,
        local_files_only: true,
      },
    };
  }

  /**
   * Score an array of (task, candidateText) pairs.
   * Returns an array of { index, raw, score } where `score` is normalised to [0,1].
   */
  public static async scorePairs(pairs: Array<{ task: string; comptence: string }>) {
    if (!pairs.length) return [];

    const pipe = await this.getInstance<TextClassificationPipeline>();

    // Convert objects to arrays-of-pairs
    const inputs = pairs.map((p) => [p.task, p.comptence]); // -> string[][]

    // call the pipeline in a batch
    // @ts-ignore
    const out = await pipe(inputs);

    // out format varies by model/pipeline: often each item is { label, score } or {score}
    // We'll defensively normalise results to [0,1].
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    console.log('CrossEncoder input:', inputs);
    console.log('CrossEncoder output:', out);

    //     return out.map((item: any, i: number) => {
    //       // Try common shapes:
    //       // - item = { label: 'LABEL_0', score: 0.72 }  -> take score
    //       // - item = { scores: [..], labels: [..] } or a logits array -> handle below
    //       let raw: number;

    //       if (typeof item === 'object' && 'score' in item && typeof item.score === 'number') {
    //         raw = item.score;
    //       } else if (Array.isArray(item) && item.length === 1 && typeof item[0].score === 'number') {
    //         raw = item[0].score;
    //       } else if (typeof item === 'object' && 'logits' in item) {
    //         // If logits are returned (raw model outputs), use sigmoid on the first logit
    //         const logits = item.logits;
    //         if (Array.isArray(logits)) {
    //           raw = sigmoid(logits[0]);
    //         } else {
    //           raw = 0;
    //         }
    //       } else if (typeof item === 'number') {
    //         // sometimes minimal wrappers return a numeric score
    //         raw = item;
    //       } else {
    //         // fallback: try to find a numeric value in the object
    //         const val = Object.values(item).find((v) => typeof v === 'number');
    //         raw = typeof val === 'number' ? val : 0;
    //       }

    //       // if raw is outside 0..1, apply sigmoid as fallback (common if raw is logit)
    //       let score = raw;
    //       if (score < 0 || score > 1) score = sigmoid(raw);

    //       return { index: pairs[i].index, raw, score };
    //     });
  }
}
