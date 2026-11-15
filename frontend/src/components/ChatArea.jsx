import React, { useState, useRef, useEffect } from 'react';

// Main interactive Q&A assistant chat area
export default function ChatArea({ documents }) {
  // Array of conversation messages (both user questions and assistant answers)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your Halden Logistics assistant. I answer questions strictly based on internal procedures, runbooks, and policies. What can I help you find today?',
      sources: []
    }
  ]);
  
  // State for current typed text in input box
  const [inputQuery, setInputQuery] = useState('');
  // Filter state for restricting search to a specific topic
  const [selectedTopic, setSelectedTopic] = useState('All');
  // Filter state for restricting search to a specific document
  const [selectedDocId, setSelectedDocId] = useState('All');
  // Loading state while waiting for search & Groq response
  const [loading, setLoading] = useState(false);
  // DOM reference to keep chat scrolled down to the latest message
  const messagesEndRef = useRef(null);

  // Smooth scroll helper to keep newest message visible
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Re-scroll whenever messages change or loading begins
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Extract list of unique topics from all currently uploaded documents
  const availableTopics = Array.from(new Set(documents.map((d) => d.topic))).filter(Boolean);

  // Preset suggested questions for staff to click for quick testing
  const sampleQuestions = [
    { label: 'Forklift speed limit', q: 'What is the maximum speed limit for forklifts inside the warehouse?' },
    { label: 'Absence notification', q: 'How should staff report an absence before their shift starts?' },
    { label: 'Shift handover rules', q: 'What mandatory information must supervisors exchange during shift handover?' },
    { label: 'Cafeteria WiFi (Out of Scope)', q: 'What is the guest Wi-Fi password for the Halden staff cafeteria?' }
  ];

  // Send question to backend API and handle response
  const handleSend = async (questionToSend) => {
    // Use clicked suggestion or typed input text
    const query = questionToSend || inputQuery;
    if (!query.trim() || loading) return;

    // Immediately append user message to chat UI
    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery(''); // Clear text input box
    setLoading(true);  // Show loading indicator

    try {
      // Call backend RAG search endpoint
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          topic: selectedTopic,
          documentId: selectedDocId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      // Append assistant answer and its cited sources to the conversation
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      // Display friendly error if network or server fails
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to get answer: ${err.message}`,
          sources: []
        }
      ]);
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
      {/* Top Filter Bar: allows limiting search to specific topics or documents */}
      <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
          <span>Search Scope:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Topic filter dropdown */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="text-xs border border-slate-200 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Topics</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>
                Topic: {t}
              </option>
            ))}
          </select>

          {/* Document filter dropdown */}
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="text-xs border border-slate-200 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] truncate"
          >
            <option value="All">All Documents</option>
            {documents.map((d) => (
              <option key={d._id} value={d._id}>
                {d.originalName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
              }`}
            >
              {/* Message text */}
              <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

              {/* Source Citations & Passage Excerpts */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700 flex items-center space-x-1 mb-2">
                    {/* Document citation icon */}
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Source Citations:</span>
                  </div>

                  {/* Render each source passage in an expandable accordion */}
                  <div className="space-y-2">
                    {msg.sources.map((src, sIdx) => (
                      <details
                        key={sIdx}
                        className="bg-white rounded-md border border-slate-200 p-2 text-[11px] group"
                      >
                        <summary className="cursor-pointer font-medium text-blue-700 hover:text-blue-800 flex items-center justify-between">
                          <span>
                            {src.documentName}{' '}
                            <span className="text-slate-400 font-normal">
                              ({src.topic})
                            </span>
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            Match: {(src.similarity * 100).toFixed(0)}%
                          </span>
                        </summary>
                        {/* The exact passage from the internal document */}
                        <p className="mt-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap leading-normal font-mono text-[10px]">
                          "{src.passage}"
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner Bubble */}
        {loading && (
          <div className="flex items-start">
            <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center space-x-2 border border-slate-200">
              <svg className="animate-spin h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Searching local vector store & generating answer via Groq...</span>
            </div>
          </div>
        )}

        {/* Invisible anchor element to scroll to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* Clickable Quick Questions */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400 font-medium mr-1">Quick asks:</span>
        {sampleQuestions.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq.q)}
            disabled={loading}
            className="text-[11px] bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-2 py-1 rounded transition"
          >
            {sq.label}
          </button>
        ))}
      </div>

      {/* Input Form at Bottom */}
      <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          {/* Text input */}
          <input
            type="text"
            placeholder="Ask a question about warehouse safety, forklift runbooks, shift handover, or HR..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className="flex-1 text-xs sm:text-sm border border-slate-200 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
          />
          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium px-4 py-2.5 rounded-lg text-xs transition flex items-center space-x-1"
          >
            <span>Ask</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
