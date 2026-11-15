import { pipeline } from '@xenova/transformers';

// Variable to store the loaded transformer model in memory (so we only load it once)
let extractor = null;

// Initialize the local embedding model (runs 100% locally on CPU, no GPU or cloud required)
export async function getEmbeddingPipeline() {
  if (!extractor) {
    // Read model name from environment or fallback to standard all-MiniLM-L6-v2
    const modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    // 'feature-extraction' pipeline converts words into high-dimensional vector arrays
    extractor = await pipeline('feature-extraction', modelName);
  }
  return extractor;
}

// Generate a 384-dimensional vector embedding for any given piece of text
export async function generateEmbedding(text) {
 
  const pipe = await getEmbeddingPipeline();
  
  // pooling: 'mean' averages token embeddings to represent the whole sentence
  // normalize: true scales the vector length to 1.0 for easier similarity matching
  const output = await pipe(text.trim(), { pooling: 'mean', normalize: true });
  
  // Convert tensor data into a standard JavaScript array of numbers
  return Array.from(output.data);
}

// Calculate cosine similarity between two vector arrays (values range from 0.0 to 1.0)
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0; // Sum of (A[i] * B[i])
  let normA = 0;      // Sum of (A[i] * A[i]) to find vector A magnitude
  let normB = 0;      // Sum of (B[i] * B[i]) to find vector B magnitude

  // Loop through all 384 numbers in each vector
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // Prevent divide-by-zero errors if a vector is empty
  if (normA === 0 || normB === 0) return 0;

  // Cosine formula: dot product / (length of A * length of B)
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
