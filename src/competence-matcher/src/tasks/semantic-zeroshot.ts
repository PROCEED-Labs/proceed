import {
  PipelineType,
  TextClassificationPipeline,
  ZeroShotClassificationPipeline,
} from '@huggingface/transformers';
import { config } from '../config';
import { TransformerPipeline } from '../utils/model';
import { TransformerPipelineOptions } from '../utils/types';
import { getLogger } from '../utils/logger';

function getLoggerInstance() {
  return getLogger();
}

export default class ZeroShot extends TransformerPipeline<ZeroShotClassificationPipeline> {
  protected static override getPipelineOptions(): TransformerPipelineOptions {
    return {
      task: 'zero-shot-classification' as PipelineType,
      model: config.nliModel,
      options: {
        // progress_callback: (progress) => {
        //   logger.debug("system", `Embedding progress: ${progress}`);
        // },
        model_file_name: 'model.onnx',
        use_external_data_format: true,
        local_files_only: true,
      },
    };
  }

  /**
   * Classify text against a set of labels using zero-shot classification.
   * @param text The text to classify.
   * @param labels The labels to classify against.
   * @param hypothesisTemplate Optional hypothesis template for classification - should include '{}' as placeholder for label.
   */
  public static async classify(text: string, labels?: string[], hypothesisTemplate?: string) {
    const _labels = labels || [
      'contradicting',
      'aligning, thus a good match',
      'neither aligning nor contradicting',
    ];
    const hypothesis_template =
      hypothesisTemplate || 'Task description and Skill/Capability descriptions are {}.';
    const pipe = await this.getInstance<ZeroShotClassificationPipeline>();
    return pipe(text, _labels, { hypothesis_template });
  }
}
