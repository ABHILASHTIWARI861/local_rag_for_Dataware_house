import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { parseFileContent } from '../services/fileParser.js';
import { splitTextIntoChunks } from '../services/chunker.js';
import { generateEmbedding } from '../services/embedder.js';

const router = express.Router();

// Store uploaded files temporarily in RAM buffer for fast local processing
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/upload - Upload, deduplicate, chunk, embed, and store in MongoDB
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Validate that a file was sent in the request
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const { originalname, buffer } = req.file;
    const topic = req.body.topic?.trim() || 'General';

    // Compute SHA-256 hash of the uploaded file bytes to detect exact duplicates
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check if the exact same file content was already uploaded previously
    const existingDocWithHash = await Document.findOne({ fileHash });
    if (existingDocWithHash) {
      // Return 200 with notice - prevents duplicate embeddings and duplicate results
      return res.status(200).json({
        message: 'This document has already been indexed. Duplicate skipped.',
        document: existingDocWithHash,
        isDuplicate: true
      });
    }

    // Check if a document with the same filename exists (e.g. an updated version)
    const existingDocWithName = await Document.findOne({ originalName: originalname });
    if (existingDocWithName) {
      // Delete old chunks so the assistant does not keep answering with obsolete data
      await Chunk.deleteMany({ documentId: existingDocWithName._id });
      await Document.deleteOne({ _id: existingDocWithName._id });
    }

    // Extract text from the file (supports PDF, Markdown, and TXT)
    const textContent = await parseFileContent(buffer, originalname);
    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ error: 'File is empty or contains no readable text.' });
    }

    // Split raw text into small overlapping chunks
    const textChunks = splitTextIntoChunks(textContent);
    if (textChunks.length === 0) {
      return res.status(400).json({ error: 'Could not extract chunks from document.' });
    }

    // Save document metadata in MongoDB
    const newDoc = await Document.create({
      originalName: originalname,
      topic: topic,
      fileHash: fileHash,
      chunkCount: textChunks.length
    });

    // Generate local 384-dimensional vector embeddings for each chunk
    const chunkPromises = textChunks.map(async (chunkText, index) => {
      const embedding = await generateEmbedding(chunkText);
      return {
        documentId: newDoc._id,
        documentName: originalname,
        topic: topic,
        text: chunkText,
        embedding: embedding,
        chunkIndex: index
      };
    });

    // Wait for all embeddings to finish generating locally
    const chunkObjects = await Promise.all(chunkPromises);
    // Batch insert all chunks into MongoDB
    await Chunk.insertMany(chunkObjects);

    // Return success response to the frontend
    return res.status(201).json({
      message: 'Document successfully processed and indexed.',
      document: newDoc,
      chunkCount: textChunks.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload document.' });
  }
});

// GET /api/documents - Retrieve list of all indexed documents
router.get('/', async (req, res) => {
  try {
    // Return all documents sorted newest first
    const docs = await Document.find().sort({ createdAt: -1 });
    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

// DELETE /api/documents/:id - Delete a document and all of its associated chunks
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Remove all text chunks belonging to this document
    await Chunk.deleteMany({ documentId: id });
    // Remove the document record
    await Document.findByIdAndDelete(id);
    return res.json({ message: 'Document and its chunks deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
});

export default router;
