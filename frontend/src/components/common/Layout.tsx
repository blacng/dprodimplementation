import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatPanel from '../chat/ChatPanel';

export default function Layout() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">
              DPROD Data Product Catalog
            </h1>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isChatOpen
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <MessageSquare size={20} />
              <span className="hidden sm:inline">Chat Assistant</span>
            </button>
          </div>
        </header>

        {/* Page content with optional chat panel */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>

          {/* Chat panel */}
          {isChatOpen && (
            <div className="w-96 border-l border-slate-800 bg-slate-900">
              <ChatPanel onClose={() => setIsChatOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
