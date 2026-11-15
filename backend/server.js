import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import our modular routes
import documentsRouter from './routes/documents.js';
import queryRouter from './routes/query.js';
import healthRouter from './routes/health.js';
import { getEmbeddingPipeline } from './services/embedder.js';

// Load environment variables from .env file
dotenv.config();

// Determine __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/halden_rag';

// Enable CORS so the React dev server on port 3000 can talk to Express on port 5000
app.use(cors());

// Middleware to parse incoming JSON payloads in request bodies
app.use(express.json());

// Mount API routes
app.use('/api/documents', documentsRouter); // Document uploads, listing, and deletion
app.use('/api/query', queryRouter);         // Semantic vector search & RAG answering
app.use('/api/health', healthRouter);       // Health check endpoint

// Serve static frontend assets created by Vite build (used inside production container)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// For any non-API route, send index.html so React router can handle client-side routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Halden Logistics RAG Assistant API is running.');
    }
  });
});

// Connect to MongoDB with retry logic so the container gracefully waits for database readiness
async function connectWithRetry() {
  const maxRetries = 10;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      console.log(`Connecting to MongoDB at ${MONGODB_URI} (attempt ${attempts + 1}/${maxRetries})...`);
      await mongoose.connect(MONGODB_URI);
      console.log('MongoDB connection established successfully.');
      return;
    } catch (err) {
      attempts++;
      console.error(`MongoDB connection failed: ${err.message}. Retrying in 3 seconds...`);
      // Wait 3 seconds before next connection attempt
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  console.error('Could not connect to MongoDB after multiple attempts.');
  process.exit(1);
}

// Start backend server
async function startServer() {
  // Ensure database is connected first
  await connectWithRetry();

  // Pre-load local embedding model into memory on startup so the first user query is instant
  console.log('Pre-loading local embedding model (Xenova/all-MiniLM-L6-v2)...');
  getEmbeddingPipeline()
    .then(() => console.log('Local embedding model is ready.'))
    .catch(err => console.warn('Model pre-load notice:', err.message));

  // Listen on the configured port
  app.listen(PORT, () => {
    console.log(`Halden RAG Assistant running at http://localhost:${PORT}`);
  });
}

// Execute server startup
startServer();
