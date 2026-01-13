import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { createChatConnection } from '../../api/client';
import type { ChatMessage } from '../../api/types';

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<ReturnType<typeof createChatConnection> | null>(
    null
  );

  useEffect(() => {
    // Connect to WebSocket
    connectionRef.current = createChatConnection(
      (message) => {
        if (message.type === 'done') {
          setIsLoading(false);
        } else if (message.type === 'thinking') {
          setIsLoading(true);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: message.type as ChatMessage['type'],
              content: message.content,
              timestamp: new Date(),
            },
          ]);
          if (message.type === 'response' || message.type === 'error') {
            setIsLoading(false);
          }
        }
      },
      () => {
        setIsConnected(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'error',
            content: 'Connection error. Please try again.',
            timestamp: new Date(),
          },
        ]);
      },
      () => {
        setIsConnected(false);
      },
      () => {
        // onOpen callback - connection established
        setIsConnected(true);
        // Clear any previous connection error messages
        setMessages((prev) => prev.filter((m) => m.content !== 'Connection error. Please try again.'));
      }
    );

    return () => {
      connectionRef.current?.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !isConnected || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    connectionRef.current?.send(input);
    setInput('');
    setIsLoading(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-white">Chat Assistant</h3>
          <p className="text-xs text-slate-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p className="mb-2">Ask me anything about the data catalog!</p>
            <p className="text-sm">
              Try: "List all products" or "Check quality issues"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-cyan-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : message.type === 'system'
                  ? 'bg-slate-800 text-slate-400 text-sm'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-lg px-4 py-2">
              <Loader2 className="animate-spin text-slate-400" size={20} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={!isConnected || isLoading}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-slate-900"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected || isLoading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
