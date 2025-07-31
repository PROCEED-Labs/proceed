import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import * as os from 'node:os';

export const config = {
  dbPath: process.env.DB_PATH || 'src/db/dbs/',
  embeddingModel: process.env.EMBEDDING_MODEL || 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || '1024', 10),
  nliModel: process.env.NLI_MODEL || 'Maxi-Lein/roberta-large-mnli-onnx',
  modelCache: process.env.MODEL_CACHE || 'src/models/',
  useGPU: process.env.USE_GPU === 'true' || false,
  port: parseInt(process.env.PORT || '8501', 10),
  multipleDBs: process.env.MULTIPLE_DBS === 'true' || false,
  ollamaPath: process.env.OLLAMA_PATH || 'http://localhost:11434',
  ollamaBearerToken: process.env.OLLAMA_BEARER_TOKEN || '',
  ollamaBatchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '5', 10),
  splittingModel: process.env.SPLITTING_MODEL || 'llama3.2',
  reasonModel: process.env.REASON_MODEL || 'llama3.2',
  splittingSymbol: process.env.SPLITTING_SYMBOL || 'SPLITTING_SYMBOL',
  maxWorkerThreads: parseInt(process.env.NUMBER_OF_THREADS || String(os.cpus().length - 1), 10), // -1 for main thread
  maxJobTime: parseInt(process.env.MAX_JOB_TIME || '600', 10) * 1_000, // converted from seconds to milliseconds
};
