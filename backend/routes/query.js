import express from 'express';
import Chunk from '../models/Chunk.js';
import { generateEmbedding, cosineSimilarity } from '../services/embedder.js';
import { askGroqWithContext } from '../services/groqService.js';

const router = express.Router();

// POST /api/query - Main RAG search and answer endpoint
router.post('/', async (req, res) => {
  try {
    const { question, topic, documentId } = req.body;

    // Validate that user entered a non-empty question
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please provide a question.' });
    }

    // Build query filter based on optional user selections
    const filter = {};
    // If user filtered by a specific topic (e.g. 'Warehouse Safety')
    if (topic && topic !== 'All') {
      filter.topic = topic;
    }
    // If user filtered by a specific document
    if (documentId && documentId !== 'All') {
      filter.documentId = documentId;
    }

    // Retrieve candidate chunks from MongoDB matching filter criteria
    const candidateChunks = await Chunk.find(filter).lean();

    // If no chunks match the filter, inform user immediately
    if (candidateChunks.length === 0) {
      return res.json({
        answer: 'I cannot find any relevant documents to answer this question. Please upload relevant files or adjust your search filter.',
        sources: []
      });
    }

    // Generate local 384-dimensional vector embedding for the user's question
    const queryVector = await generateEmbedding(question);

    // Compute cosine similarity between question vector and each chunk vector
    const scoredChunks = candidateChunks.map(chunk => {
      const similarity = cosineSimilarity(queryVector, chunk.embedding);
      return {
        ...chunk,
        similarity
      };
    });

    // Sort chunks from highest similarity score to lowest
    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    // Pick the top 3 most relevant passages
    const topChunks = scoredChunks.slice(0, 3);

    // Send question and top retrieved passages to Groq LLM for synthesis
    const answer = await askGroqWithContext(question, topChunks);

    // Format citations to send back to frontend
    const sources = topChunks.map(c => ({
      documentName: c.documentName,
      topic: c.topic,
      passage: c.text,
      similarity: Number(c.similarity.toFixed(3)) // Round score to 3 decimals
    }));

    // Return the grounded answer and source citations
    return res.json({
      answer,
      sources
    });
  } catch (error) {
    console.error('Query error:', error);
    return res.status(500).json({ error: 'An error occurred while answering your question.' });
  }
});

export default router;
