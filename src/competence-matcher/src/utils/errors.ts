/**
 * Custom error classes for the competence matcher service
 * These provide descriptive error messages with context
 */

export class CompetenceMatcherError extends Error {
  public readonly context: string;
  public readonly statusCode: number;
  public readonly requestId?: string;
  public readonly details?: any;

  constructor(
    message: string,
    context: string,
    statusCode: number = 500,
    requestId?: string,
    details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      statusCode: this.statusCode,
      requestId: this.requestId,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class ValidationError extends CompetenceMatcherError {
  constructor(message: string, field: string, value: any, requestId?: string) {
    super(
      `Validation failed for field '${field}': ${message}`,
      'input_validation',
      400,
      requestId,
      { field, value },
    );
  }
}

export class DatabaseError extends CompetenceMatcherError {
  constructor(operation: string, error: Error, requestId?: string) {
    super(
      `Database operation '${operation}' failed: ${error.message}`,
      'database_operation',
      500,
      requestId,
      { operation, originalError: error.message },
    );
  }
}

export class ModelError extends CompetenceMatcherError {
  constructor(modelName: string, operation: string, error: Error, requestId?: string) {
    super(
      `Model '${modelName}' operation '${operation}' failed: ${error.message}`,
      'model_operation',
      500,
      requestId,
      { modelName, operation, originalError: error.message },
    );
  }
}

export class ResourceNotFoundError extends CompetenceMatcherError {
  constructor(resourceType: string, resourceId: string, requestId?: string) {
    super(
      `${resourceType} with ID '${resourceId}' was not found`,
      'resource_not_found',
      404,
      requestId,
      { resourceType, resourceId },
    );
  }
}

export class WorkerError extends CompetenceMatcherError {
  constructor(workerType: string, jobId: string, error: Error, requestId?: string) {
    super(
      `Worker '${workerType}' failed for job '${jobId}': ${error.message}`,
      'worker_execution',
      500,
      requestId,
      { workerType, jobId, originalError: error.message },
    );
  }
}

export class SemanticSplittingError extends CompetenceMatcherError {
  constructor(textLength: number, error: Error, requestId?: string) {
    super(
      `Semantic splitting failed for text of length ${textLength}: ${error.message}`,
      'semantic_splitting',
      500,
      requestId,
      { textLength, originalError: error.message },
    );
  }
}

export class ReasoningError extends CompetenceMatcherError {
  constructor(matchCount: number, error: Error, requestId?: string) {
    super(
      `Reasoning process failed for ${matchCount} matches: ${error.message}`,
      'reasoning',
      500,
      requestId,
      { matchCount, originalError: error.message },
    );
  }
}

export class EmbeddingError extends CompetenceMatcherError {
  constructor(modelName: string, taskCount: number, error: Error, requestId?: string) {
    super(
      `Embedding generation with model '${modelName}' failed for ${taskCount} tasks: ${error.message}`,
      'embedding_generation',
      500,
      requestId,
      { modelName, taskCount, originalError: error.message },
    );
  }
}

export class OllamaConnectionError extends CompetenceMatcherError {
  constructor(host: string, operation: string, error: Error, requestId?: string) {
    super(
      `Failed to connect to Ollama at '${host}' for operation '${operation}': ${error.message}`,
      'ollama_connection',
      503,
      requestId,
      { host, operation, originalError: error.message },
    );
  }
}

export class HuggingFaceModelError extends CompetenceMatcherError {
  constructor(modelName: string, operation: string, error: Error, requestId?: string) {
    super(
      `HuggingFace model '${modelName}' operation '${operation}' failed: ${error.message}`,
      'huggingface_model',
      500,
      requestId,
      { modelName, operation, originalError: error.message },
    );
  }
}
