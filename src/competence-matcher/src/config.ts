export const config = {
  dbPath: process.env.DB_PATH || 'src/db/dbs/',
  embeddingModel: process.env.EMBEDDING_MODEL || 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || '1024', 10),
  embeddingModelCache: process.env.MODEL_CACHE || 'src/models/',
  useGPU: process.env.USE_GPU === 'true' || false,
  port: parseInt(process.env.PORT || '8501', 10),
  multipleDBs: process.env.MULTIPLE_DBS === 'true' || false,
  ollamaPath: process.env.OLLAMA_PATH || 'http://localhost:11434',
  ollamaSplittingModel: process.env.OLLAMA_SPLITTING_MODEL || 'llama3.2',
  ollamaReasonModel: process.env.OLLAMA_REASON_MODEL || 'llama3.2',
  splittingSymbol: process.env.SPLITTING_SYMBOL || '<SPLIT>',
  numberOfThreads: parseInt(process.env.NUMBER_OF_THREADS || '10', 10),
};
