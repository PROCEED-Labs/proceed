import {
  PipelineType,
  TextClassificationPipeline,
  ZeroShotClassificationPipeline,
} from '@huggingface/transformers';
import { config } from '../config';
import { TransformerPipeline } from '../utils/model';
import { TransformerPipelineOptions } from '../utils/types';

export const labels = ['entailment', 'neutral statement', 'contradiction or not related'];

export default class ZeroShot extends TransformerPipeline<ZeroShotClassificationPipeline> {
  protected static override getPipelineOptions(): TransformerPipelineOptions {
    return {
      task: 'zero-shot-classification' as PipelineType,
      model: config.nliModel,
      options: {
        model_file_name: 'model.onnx',
        use_external_data_format: true,
        local_files_only: true,
      },
    };
  }

  /**
   * Run zero-shot classification using explicit hypotheses.
   * We keep the existing generic classify() but add a helper to compute entail/neutral/contradict
   * probabilities given a premise and a hypothesis (text pair).
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

  /**
   * Run MNLI-style check in one direction: premise -> hypothesis sentence string.
   * Returns object { entail, neutral, contradict } with values in [0,1].
   */
  private static async nliDirection(premise: string, hypothesis: string) {
    const pipe = await this.getInstance<ZeroShotClassificationPipeline>();
    // Reuse zero-shot pipeline: pass premise as text and labels that (when inserted into template)
    // produce a hypothesis that matches desired explicit hypothesis.
    // Instead, easier: pass candidate_labels matching MNLI classes and set hypothesis_template to "{}"
    const hypothesis_template = `${hypothesis}`; // pipeline will insert label into template; we want explicit hypothesis
    // Some transformer-js wrappers may require candidate_labels to be "labels", and will return { labels: [...], scores: [...] }
    const out = await pipe(premise, labels, { hypothesis_template });
    // out may be e.g. { labels: ['entailment','neutral','contradiction'], scores: [0.7,0.2,0.1] }
    const mapping: Record<string, number> = {};
    if (
      out &&
      typeof out === 'object' &&
      !Array.isArray(out) &&
      'labels' in out &&
      'scores' in out &&
      Array.isArray((out as any).labels) &&
      Array.isArray((out as any).scores)
    ) {
      (out as any).labels.forEach(
        (lbl: string, i: number) => (mapping[lbl] = (out as any).scores[i]),
      );
    } else if (Array.isArray(out) && out.length) {
      // Some versions return array of {label, score} objects
      out.forEach((item: any) => {
        if (item.label && typeof item.score === 'number') mapping[item.label] = item.score;
      });
    } else {
      // fallback: return zeros
      return { entail: 0, neutral: 0, contradict: 0 };
    }

    return {
      entail: mapping[labels[0]] ?? 0,
      neutral: mapping[labels[1]] ?? 0,
      contradict: mapping[labels[2]] ?? 0,
    };
  }

  /**
   * Run NLI both directions (premise=capability -> hypothesis: task,
   * and premise=task -> hypothesis: capability). Returns aggregated features.
   */
  public static async nliBiDirectional(task: string, capability: string) {
    // Build explicit hypothesis sentences
    const h1 = `This is a/an {} to the task: ${task}.`; // capability as premise -> can they perform the task?
    const h2 = `The described task is a/an {} to the capability: ${capability}.`; // task as premise -> does it require the capability?

    const h3 = `The task and capability are a/an {}.`; // symmetric
    const mix = `Task: ${task}\nCapability: ${capability}`;

    const [dir1, dir2, dir3] = await Promise.all([
      this.nliDirection(capability, h1),
      this.nliDirection(task, h2),
      this.nliDirection(mix, h3),
    ]);

    const result = {
      entail: (dir1.entail + dir2.entail + dir3.entail) / 3,
      neutral: (dir1.neutral + dir2.neutral + dir3.neutral) / 3,
      contradict: Math.max(dir1.contradict, dir2.contradict, dir3.contradict), // max contradict
      details: { 'competence on task': dir1, 'task on competence': dir2, combined: dir3 },
    };

    // Order the labels by their score in descending order
    const ranking = ['entail', 'neutral', 'contradict'].sort(
      // @ts-ignore
      (a, b) => result[b] - result[a],
    );

    return {
      ...result,
      ranking,
    };
  }

  public static async contradictionCheck(task: string, capability: string) {
    const labels = ['contradicting', 'not contradicting'];
    const pipe = await this.getInstance<ZeroShotClassificationPipeline>();

    const h1 = `The capability is {} to the task: ${task}.`; // capability as premise -> can they perform the task?
    const h2 = `The task is {} to the capability: ${capability}.`; // task as premise -> does it require the capability?

    const h3 = `The task and capability are {}.`; // symmetric
    const mix = `Task: ${task}\nCapability: ${capability}`;

    const [out1, out2, out3] = await Promise.all([
      pipe(capability, labels, { hypothesis_template: h1 }),
      pipe(task, labels, { hypothesis_template: h2 }),
      pipe(mix, labels, { hypothesis_template: h3 }),
    ]);

    // console.log('________________________________________');
    // console.log('contradiction check results:');
    // console.log('task', task);
    // console.log('capability', capability);
    // console.log(out1, out2, out3);
    // console.log('________________________________________');

    const sortedOut = labels.reduce(
      (acc: Record<string, number[]>, label: string) => {
        if (acc[label] === undefined) acc[label] = [];
        [out1, out2, out3].forEach((out) => {
          // Find index of label in out
          const idx = ((out as any).labels as string[]).indexOf(label);
          // Add corresponding score
          if (idx >= 0) acc[label].push((out as any).scores[idx]);
        });

        return acc;
      },
      {} as Record<string, number[]>,
    );

    const result = {
      max: Math.max(...(sortedOut[labels[0]] || [0])),
      avg:
        (sortedOut[labels[0]] || [0]).reduce((sum, val) => sum + val, 0) /
        (sortedOut[labels[0]] || [0]).length,
      details: { 'competence on task': out1, 'task on competence': out2, combined: out3 },
    };

    return {
      ...result,
      contradicting: result.max > 0.5 || result.avg > 0.45,
    };
  }

  public static async alignmentCheck(task: string, capability: string) {
    const labels = ['somewhat sufficently', 'only partially', 'not at all'];
    const pipe = await this.getInstance<ZeroShotClassificationPipeline>();

    const h1 = `The capability is meeting the requirements of the task "${task}" {}.`;
    const h2 = `The tasks requirements are met {} by the capability: "${capability}".`;

    const h3 = `The task and capability are {} matching.`; // symmetric
    const mix = `Task: "${task}"\nCapability: "${capability}"`;

    const [out1, out2, out3] = await Promise.all([
      pipe(capability, labels, { hypothesis_template: h1 }),
      pipe(task, labels, { hypothesis_template: h2 }),
      pipe(mix, labels, { hypothesis_template: h3 }),
    ]);

    // console.log('________________________________________');
    // console.log('alignment check results:');
    // console.log('task: ', task);
    // console.log('capability: ', capability);
    // console.log(out1, out2, out3);
    // console.log('________________________________________');

    const sortedOut = labels.reduce(
      (acc: Record<string, number[]>, label: string) => {
        if (acc[label] === undefined) acc[label] = [];
        [out1, out2, out3].forEach((out) => {
          // Find index of label in out
          const idx = ((out as any).labels as string[]).indexOf(label);
          // Add corresponding score
          if (idx >= 0) acc[label].push((out as any).scores[idx]);
        });

        return acc;
      },
      {} as Record<string, number[]>,
    );

    // console.log('________________________________________');
    // console.log('sortedOut: ', sortedOut);
    // console.log('________________________________________');

    const result = {
      max: Math.max(...(sortedOut[labels[0]] || [0])),
      avg:
        (sortedOut[labels[0]] || [0]).reduce((sum, val) => sum + val, 0) /
        (sortedOut[labels[0]] || [0]).length,
      details: { 'competence on task': out1, 'task on competence': out2, combined: out3 },
    };

    return {
      ...result,
      aligning: result.max > 0.65 && result.avg > 0.5,
    };
  }
}
