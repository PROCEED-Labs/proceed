import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export const config = {
  dbPath: process.env.DB_PATH || 'src/db/dbs/',
  embeddingModel: process.env.EMBEDDING_MODEL || 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || '1024', 10),
  nliModel: process.env.NLI_MODEL || 'Maxi-Lein/roberta-large-mnli-onnx',
  crossEncoderModel: process.env.CROSS_ENCODER_MODEL || 'local/ms-marco-MiniLM-L6-v2-onnx',
  // crossEncoderModel: process.env.CROSS_ENCODER_MODEL || 'cross-encoder/ms-marco-MiniLM-L6-v2',
  modelCache: process.env.MODEL_CACHE || 'src/models/',
  useGPU: process.env.USE_GPU === 'true' || false,
  port: parseInt(process.env.PORT || '8501', 10),
  multipleDBs: process.env.MULTIPLE_DBS === 'true' || false,
  ollamaPath: process.env.OLLAMA_PATH || 'http://localhost:11434',
  ollamaBearerToken: process.env.OLLAMA_BEARER_TOKEN || '',
  ollamaBatchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '20', 10),
  splittingModel: process.env.SPLITTING_MODEL || 'llama3.2',
  splittingLength: parseInt(process.env.SPLITTING_LENGTH || '1000', 10), // Set this to 0 to disable splitting
  reasonModel: process.env.REASON_MODEL || 'llama3.2',
  splittingSymbol: process.env.SPLITTING_SYMBOL || '<SPLITTING_SYMBOL>',
  embeddingWorkers: parseInt(process.env.EMBEDDING_WORKERS || '1', 10), // Number of embedding workers to keep alive
  matchingWorkers: parseInt(process.env.MATCHING_WORKERS || '1', 10), // Number of matching workers to keep alive
  workerHeartbeatInterval: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL || '30', 10) * 1_000, // Worker heartbeat interval in seconds (converted to ms) - how often workers send heartbeats
  workerDeathTimeout: parseInt(process.env.WORKER_DEATH_TIMEOUT || '120', 10) * 1_000, // Worker death timeout in seconds (converted to ms) - how long to wait before considering worker dead (increased from 45s to 120s to accommodate model loading and job execution)
  maxJobTime: parseInt(process.env.MAX_JOB_TIME || '600', 10) * 1_000, // converted from seconds to milliseconds
  logLevel: process.env.LOG_LEVEL || 'INFO', // Levels: 'DEBUG', 'INFO', 'WARN', 'ERROR'
  logTypes: process.env.LOG_TYPES || 'server,request,worker,database,model,system',
  logToConsole: process.env.LOG_CONSOLE !== 'false', // Default to true unless explicitly set to false
  logToFile: process.env.LOG_FILE === 'true' || false, // Default to false unless explicitly set to true
  logPath: process.env.LOG_PATH || 'logs/',
  workerHealthCheckTimeout:
    parseInt(
      process.env.WORKER_HEALTH_CHECK_TIMEOUT || process.env.MODEL_LOADING_TIMEOUT || '20',
      10,
    ) * 1_000, // Maximum time to wait for individual worker health check response (seconds to ms)
  systemStartupTimeout:
    parseInt(process.env.SYSTEM_STARTUP_TIMEOUT || process.env.MODEL_LOADING_TIME || '300', 10) *
    1_000, // Maximum time to wait for all worker pools to become ready at startup (seconds to ms)
  maxWorkerRetries: parseInt(process.env.MAX_WORKER_RETRIES || '3', 10), // Maximum worker restart attempts before escalating to ERROR
  workerRetryWindow: parseInt(process.env.WORKER_RETRY_WINDOW || '300', 10) * 1_000, // Time window in seconds to reset retry count (converted to ms)
  maxOllamaRetries: parseInt(process.env.MAX_OLLAMA_RETRIES || '5', 10), // Maximum model pull retry attempts
  ollamaRetryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '30', 10) * 1_000, // Base delay between retries in seconds (converted to ms)
  ollamaRetryBackoff: parseFloat(process.env.OLLAMA_RETRY_BACKOFF || '1.5'), // Exponential backoff multiplier
  // Matching algorithm scaling parameters
  matchDistanceOffset: parseFloat(process.env.MATCH_DISTANCE_OFFSET || '0.45'), // Offset subtracted from match distance before scaling
  matchDistanceMultiplier: parseFloat(process.env.MATCH_DISTANCE_MULTIPLIER || '2'), // Multiplier for distance after offset
  contradictionThreshold: parseFloat(process.env.CONTRADICTION_THRESHOLD || '0.3'), // Threshold for contradiction detection
  entailmentThreshold: parseFloat(process.env.ENTAILMENT_THRESHOLD || '0.55'), // Threshold for entailment detection
  alignmentDistanceThreshold: parseFloat(process.env.ALIGNMENT_DISTANCE_THRESHOLD || '0.65'), // Minimum distance required for alignment boost
  alignmentBoostMultiplier: parseFloat(process.env.ALIGNMENT_BOOST_MULTIPLIER || '1.2'), // Multiplier to boost distance for aligning matches
  neutralReductionMultiplier: parseFloat(process.env.NEUTRAL_REDUCTION_MULTIPLIER || '0.65'), // Multiplier to reduce distance for neutral matches
};
