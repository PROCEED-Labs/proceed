import { PretrainedModelOptions } from '@huggingface/transformers';

// ===== LOGGING TYPES =====

// Logger levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Logger types for different components
export type LogType = 'server' | 'request' | 'worker' | 'database' | 'model' | 'system';

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  type: LogType;
  message: string;
  context?: string;
  requestId?: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enabledTypes: LogType[];
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  colorize: boolean;
}

// ===== COMPETENCE MATCHING TYPES =====

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
  resourceId: string;
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

export interface ResourceEmbeddingJob extends Job {
  mode?: 'resource';
  tasks: EmbeddingTask[];
}

export interface TaskEmbeddingJob extends Job {
  mode: 'task';
  tasks: MatchingTask[];
}

export type EmbeddingJob = ResourceEmbeddingJob | TaskEmbeddingJob;

export interface MatchingJob extends Job {
  listId?: string; // Which List to match against
  resourceId?: string; // Optional: If matching against a single resource
  tasks: MatchingTask[]; // Tasks to match
  taskEmbeddings?: Record<string, number[]>; // Optional precomputed task embeddings keyed by taskId
}

export type ResourceRanking = {
  resourceId: string;
  taskMatchings: {
    taskId: string; // Which of the tasks this matching is referring to
    competenceMatchings: {
      competenceId: string;
      matchings: {
        text: string;
        type: 'name' | 'description' | 'proficiencyLevel';
        // Sorted DESC by
        matchProbability: number; // Normalised inverted distance (, where distance refers to the cosine similarity)
        alignment: 'contradicting' | 'neutral' | 'aligning'; // Semantic opposite classification
        reason?: string; // Reason for the match
      }[]; // Array: Competence-Parts matched to task
      // Sorted DESC by either:
      avgMatchProbability: number; // Average matchProbability of all parts of this competence
      avgBestFitMatchProbability: number; // Average of the parts that align well with the task, 0 means there is none
    }[]; // Array: Competences matched to task
    // Sorted DESC by either:
    maxMatchProbability: number; // Best avgMatchingProbability of all competences for this task
    maxBestFitMatchProbability: number; // Best avgBestFitMatchProbability of all competences for this task, 0 means there is none
  }[]; // Array: Matching of the resource to each task, respectively
  // Sorted DESC first by [not contradicting , contradicting] then by either:
  avgTaskMatchProbability: number; // Average maxMatchProbability of all tasks for this resource
  avgBestFitTaskMatchProbability: number; // Average maxBestFitMatchProbability of all tasks for this resource, 0 means there is none

  contradicting: boolean; // Whether there is a part in a competence of this resource that contradicts the task
}[];

export type TaskOverview = {
  taskId: string; // UUIDString
  taskText: string; // Text of the task
}[];

export type GroupedMatchResults = {
  tasks: TaskOverview;
  resourceRanking: ResourceRanking;
};

export type workerTypes = 'embedder' | 'matcher' | 'inference';

export interface WorkerQueue {
  job: any;
  workerScript: workerTypes;
  options?: {
    onOnline?: (job: any) => void;
    onExit?: (job: any, code: number) => void;
    onError?: (job: any, error: Error) => void;
    onMessage?: (job: any, message: any) => void;
  };
}

export interface TransformerPipelineOptions {
  task: string;
  model: string;
  options?: PretrainedModelOptions;
}

export interface JobQueueItem {
  job: EmbeddingJob | MatchingJob;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  retryCount: number;
}
