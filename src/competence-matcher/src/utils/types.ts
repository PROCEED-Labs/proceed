type Competence = {
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

type CompetenceInput = {
  competenceId?: string;
  name?: string;
  description?: string;
  externalQualificationNeeded?: boolean;
  renewTime?: number;
  proficiencyLevel?: string;
  qualificationDates?: string[];
  lastUsages?: string[];
};

type CompetenceEmbedding = {
  competenceId: string; // UUIDString
  embedding: number[]; // array of numbers representing the embedding
};

type Resource = {
  listId: string; // UUIDString
  resourceId: string; // UUIDString
  competencies: Competence[]; // array of competencies
};

type ResourceInput = {
  resourceId?: string;
  competencies: CompetenceInput[];
};

type ResourceList = {
  listId: string; // UUIDString
  resources: {
    resourceId: string; // UUIDString
    competencies: Competence[]; // array of competencies
  }[];
};

type ResourceListInput = ResourceInput[];

type MatchingTask = {
  taskId: string; // UUIDString
  name?: string; // optional
  description?: string; // optional but recommended to have content
  executionInstructions?: string; // optional, e.g. HTML
  requiredCompetencies?: string[] | CompetenceInput[]; // either array of competenceIds or array of CompetenceInput
};

type MatchingTaskInput =
  | {
      competenceListId: string; // UUIDString
      tasks: MatchingTask[]; // array of tasks to match
    }
  | {
      competenceList: ResourceListInput; // array of resources with competencies
      tasks: MatchingTask[]; // array of tasks to match
    };

type Match = {
  [resourceId: string]: {
    matchingConfidence: number; // 0-1
    reason: string;
  };
};

interface VectorDBOptions {
  filePath?: string; // If undefined or ":memory:", use in-memory; else path to file - Note: memory will not work with workers!!
  embeddingDim: number;
}

type CompetenceDBOutput = {
  competence_id: string;
  competence_name: string | null;
  competence_description: string | null;
  external_qualification_needed: number; // 0 or 1
  renew_time: number | null;
  proficiency_level: string | null;
  qualification_dates: string | null; // JSON string
  last_usages: string | null; // JSON string
};

type EmbeddingTask = {
  listId: string; // UUIDString
  resourceId: string; // UUIDString
  competenceId: string; // UUIDString
  text: string; // Text to embed
  type: 'name' | 'description' | 'proficiencyLevel'; // Type of text
};

interface EmbeddingJob {
  jobId: string;
  dbName: string;
  tasks: EmbeddingTask[];
}

interface MatchingJob {
  jobId: string;
  dbName: string;
  listId?: string; // Which List to match against
  resourceId?: string; // Optional: If matching against a single resource
  tasks: MatchingTask[]; // Tasks to match
}
