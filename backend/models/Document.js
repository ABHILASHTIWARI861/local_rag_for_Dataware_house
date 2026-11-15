import mongoose from 'mongoose';

// Schema for tracking uploaded document metadata and preventing duplicates
const DocumentSchema = new mongoose.Schema({
  // Original file name (e.g., 'warehouse_safety.md')
  originalName: { 
    type: String, 
    required: true 
  },
  
  // Topic category selected by staff (e.g., 'Warehouse Safety', 'HR Policies')
  topic: { 
    type: String, 
    default: 'General' 
  },
  
  // SHA-256 hash of file content - prevents uploading the exact same document twice
  fileHash: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Total number of chunks this document was split into
  chunkCount: { 
    type: Number, 
    default: 0 
  },
  
  // Timestamp when the file was uploaded
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Export Document model to use in routes
export default mongoose.model('Document', DocumentSchema);
