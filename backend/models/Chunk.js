import mongoose from 'mongoose';

// Schema for individual searchable text chunks and their local vector embeddings
const ChunkSchema = new mongoose.Schema({
  // Reference link back to the parent Document
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true 
  },
  
  // Name of the document this chunk came from (used for citations)
  documentName: { 
    type: String, 
    required: true 
  },
  
  // Topic category of the parent document (used for filtering)
  topic: { 
    type: String, 
    default: 'General' 
  },
  
  // The actual text passage from the document
  text: { 
    type: String, 
    required: true 
  },
  
  // 384-dimensional vector embedding generated locally by all-MiniLM-L6-v2
  embedding: { 
    type: [Number], 
    required: true 
  },
  
  // The chunk order position within the original document (0, 1, 2...)
  chunkIndex: { 
    type: Number, 
    required: true 
  }
});

// Database index on topic for faster filtered searches
ChunkSchema.index({ topic: 1 });

// Database index on documentId for fast deletion when replacing/updating a document
ChunkSchema.index({ documentId: 1 });

// Export Chunk model to use in routes
export default mongoose.model('Chunk', ChunkSchema);
