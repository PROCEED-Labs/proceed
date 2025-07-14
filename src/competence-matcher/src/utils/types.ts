import { PretrainedModelOptions } from '@huggingface/transformers';

export type Competence = {
  listId: string; // UUIDString
  resourceId: string; // UUIDString
  competenceId: string; // UUIDString
  name?: string; // optional
  description?: string; // optional but recommended to have content
  externalQualificationNeeded?: boolean; // optional
  renewTime?: number; // DaysAsInteger, optional
  proficiencyLevel?: string; // optional
  qualificationDates?: string[]; // ISO date strings, optional
  lastUsages?: string[]; // ISO date strings, optional
};

export type CompetenceInput = {
  competenceId?: string;
  name?: string;
  description?: string;
  externalQualificationNeeded?: boolean;
  renewTime?: number;
  proficiencyLevel?: string;
  qualificationDates?: string[];
  lastUsages?: string[];
};

export type ResourceInput = {
  resourceId?: string;
  competencies: CompetenceInput[];
};

export type ResourceListInput = ResourceInput[];

export type MatchingTask = {
  taskId: string; // UUIDString
  name?: string; // optional
  description?: string; // optional but recommended to have content
  executionInstructions?: string; // optional, e.g. HTML
  requiredCompetencies?: string[] | CompetenceInput[]; // either array of competenceIds or array of CompetenceInput
};

export type Match = {
  competenceId: string;
  text: string;
  type: string;
  distance: number;
  reason?: string;
};

export interface VectorDBOptions {
  filePath?: string; // If undefined or ":memory:", use in-memory; else path to file - Note: memory will not work with workers!!
  embeddingDim: number;
}

export type CompetenceDBOutput = {
  competence_id: string;
  competence_name: string | null;
  competence_description: string | null;
  external_qualification_needed: number; // 0 or 1
  renew_time: number | null;
  proficiency_level: string | null;
  qualification_dates: string | null; // JSON string
  last_usages: string | null; // JSON string
};

export type EmbeddingTask = {
  listId: string; // UUIDString
  resourceId: string; // UUIDString
  competenceId: string; // UUIDString
  text: string; // Text to embed
  type: 'name' | 'description' | 'proficiencyLevel'; // Type of text
};

export interface Job {
  jobId: string;
  dbName: string;
}

export interface EmbeddingJob extends Job {
  tasks: EmbeddingTask[];
}

export interface MatchingJob extends Job {
  listId?: string; // Which List to match against
  resourceId?: string; // Optional: If matching against a single resource
  tasks: MatchingTask[]; // Tasks to match
}

export type GroupedMatchResults = {
  taskId: string;
  competences: {
    competenceId: string;
    matchings: {
      text: string;
      type: 'name' | 'description' | 'proficiencyLevel';
      matchProbability: number;
      reason?: string;
    }[];
    avgMatchProbability: number;
  }[];
}[];

export type workerTypes = 'embedder' | 'matcher';

export interface WorkerQueue {
  job: any;
  workerScript: workerTypes;
}

export interface TransformerPipelineOptions {
  task: string;
  model: string;
  options?: PretrainedModelOptions;
}
