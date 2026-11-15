import React from 'react';

// Top navigation bar showing company branding and live service status
export default function Navbar({ health }) {
  // Check if backend reports overall healthy status
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Company Logo & Subtitle */}
        <div className="flex items-center space-x-3">
          {/* Halden Logistics square icon badge */}
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            HL
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-lg leading-tight">
              Halden Logistics
            </h1>
            <p className="text-xs text-slate-500">Internal Operations Assistant</p>
          </div>
        </div>

        {/* Real-time System Health Indicator */}
        <div className="flex items-center space-x-2">
          {/* Pulse green dot if healthy, yellow if connecting/degraded */}
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-xs font-medium text-slate-600">
            {isHealthy
              ? 'Local Vector Search & Groq: Ready'
              : 'Connecting to Services...'}
          </span>
        </div>
      </div>
    </header>
  );
}
