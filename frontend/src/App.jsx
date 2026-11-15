import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DocumentManager from './components/DocumentManager';
import ChatArea from './components/ChatArea';

export default function App() {
  // State to hold the list of uploaded documents fetched from MongoDB
  const [documents, setDocuments] = useState([]);
  // State to store system connectivity status (MongoDB and Groq)
  const [health, setHealth] = useState(null);

  // Fetch all indexed documents from backend
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  // Check health endpoint to update status indicator
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      // If server is unreachable, mark status as degraded
      setHealth({ status: 'degraded' });
    }
  };

  // Run on initial component mount
  useEffect(() => {
    fetchDocuments(); // Load documents on initial page load
    fetchHealth();    // Check health on page load

    // Poll health endpoint every 30 seconds to keep indicator fresh
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval); // Clean up interval when component unmounts
  }, []);

  // Handle removing a document and its chunks from the database
  const handleDeleteDocument = async (id) => {
    // Confirm action before deleting
    if (!window.confirm('Are you sure you want to remove this document from the search store?')) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Refresh document list after deletion
        fetchDocuments();
      }
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Navigation bar with system health pill */}
      <Navbar health={health} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Document Uploader & Active Document List */}
          <div className="lg:col-span-4 space-y-4">
            <DocumentManager
              documents={documents}
              onUploadSuccess={fetchDocuments}
              onDeleteDocument={handleDeleteDocument}
            />
          </div>

          {/* Right Column (8 cols): RAG Q&A Assistant Chat with Citations */}
          <div className="lg:col-span-8">
            <ChatArea documents={documents} />
          </div>
        </div>
      </main>
    </div>
  );
}
