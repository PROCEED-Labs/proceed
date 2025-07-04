export const config = {
  dbPath: process.env.DB_PATH || 'src/db/dbs/',
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || '1024', 10),
  model: process.env.MODEL || 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
  modelCache: process.env.MODEL_CACHE || 'src/models/',
  port: parseInt(process.env.PORT || '8501', 10),
  multipleDBs: process.env.MULTIPLE_DBS === 'true' || false,
  ollamaPath: process.env.OLLAMA_PATH || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  splittingSymbol: process.env.SPLITTING_SYMBOL || '__________',
};
