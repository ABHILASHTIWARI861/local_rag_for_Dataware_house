import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/health - Returns system connectivity status for UI indicator and Docker
router.get('/', (req, res) => {
  // readyState === 1 means MongoDB is actively connected
  const isMongoReady = mongoose.connection.readyState === 1;
  // Verify GROQ_API_KEY environment variable is present and not blank
  const isGroqConfigured = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());

  // System is considered healthy if database is connected and Groq key is set
  const isHealthy = isMongoReady && isGroqConfigured;

  // Return HTTP 200 if healthy, or 503 if degraded
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    mongo: {
      connected: isMongoReady,
      status: isMongoReady ? 'connected' : 'disconnected'
    },
    groq: {
      configured: isGroqConfigured,
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
    },
    localEmbedder: {
      model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
      status: 'ready'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
