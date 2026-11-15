import React, { useState } from 'react';

// Left sidebar component for uploading and managing documents
export default function DocumentManager({ documents, onUploadSuccess, onDeleteDocument }) {
  // Local state for the selected file
  const [file, setFile] = useState(null);
  // Local state for the selected topic
  const [topic, setTopic] = useState('Warehouse Safety');
  // Local state for custom topic input if 'Other' is chosen
  const [customTopic, setCustomTopic] = useState('');
  // Loading state while file is uploading and embedding
  const [uploading, setUploading] = useState(false);
  // Status message for feedback banner (success, duplicate, error)
  const [statusMessage, setStatusMessage] = useState(null);

  // Common warehouse topic options
  const predefinedTopics = [
    'Warehouse Safety',
    'Equipment Runbooks',
    'Shift Handover',
    'HR Policies',
    'Other'
  ];

  // Upload file to the Express backend
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatusMessage({ type: 'error', text: 'Please pick a file first.' });
      return;
    }

    setUploading(true);
    setStatusMessage(null);

    // Prepare multipart form data for file upload
    const formData = new FormData();
    formData.append('file', file);
    // Use custom topic text if 'Other' was selected
    const finalTopic = topic === 'Other' && customTopic ? customTopic : topic;
    formData.append('topic', finalTopic);

    try {
      // Send file to backend upload endpoint
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Check if backend detected this file was already indexed
      if (data.isDuplicate) {
        setStatusMessage({
          type: 'info',
          text: `"${file.name}" was already indexed. No duplicate added.`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `"${file.name}" indexed successfully (${data.chunkCount} chunks).`
        });
      }

      // Reset file input after successful upload
      setFile(null);
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';

      // Trigger document list refresh in parent App
      onUploadSuccess();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
      {/* Upload Form Section */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Add Knowledge Document
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Upload PDF, Markdown, or text files. Embeddings are created locally on your machine.
        </p>

        <form onSubmit={handleUpload} className="space-y-3">
          {/* File Picker Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Document (.pdf, .md, .txt)
            </label>
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.md,.txt"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
            />
          </div>

          {/* Topic Dropdown and Custom Input */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Topic / Category
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {predefinedTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Show extra input field if user selected 'Other' */}
            {topic === 'Other' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Custom Topic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Forklift Maintenance"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Submit / Upload Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                {/* Spinning loader while embedding */}
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing & Embedding Locally...</span>
              </>
            ) : (
              <span>Add to Local Knowledge Base</span>
            )}
          </button>
        </form>

        {/* Feedback Alert Banner */}
        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-md text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* List of Active Indexed Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Indexed Documents ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
            No documents uploaded yet. Add procedures or runbooks above.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {documents.map((doc) => (
              <li
                key={doc._id}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 flex items-center justify-between text-xs transition"
              >
                <div className="truncate mr-2">
                  <div className="font-medium text-slate-800 truncate" title={doc.originalName}>
                    {doc.originalName}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      {doc.topic}
                    </span>
                    <span>• {doc.chunkCount} chunks</span>
                  </div>
                </div>

                {/* Delete button to remove document */}
                <button
                  onClick={() => onDeleteDocument(doc._id)}
                  title="Remove document and chunks"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
