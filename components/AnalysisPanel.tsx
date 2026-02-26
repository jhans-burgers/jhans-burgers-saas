import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Code2 } from 'lucide-react';
import { chatWithContext } from '../services/gemini';
import { ChatMessage, FileNode } from '../types';

interface AnalysisPanelProps {
  currentFile?: FileNode;
  contextFiles: FileNode[]; // Files marked for context (currently just selected file, but extendable)
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ currentFile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your Gemini Code Architect. Select a file to discuss it, or ask me anything about your project structure.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context: currently selected file content
      const contextFiles = currentFile ? [{ name: currentFile.name, content: currentFile.content || '' }] : [];
      
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await chatWithContext(history, userMsg.text, contextFiles);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an error connecting to the AI service. Please try again.",
        isError: true,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-[#161b22] flex items-center gap-2 shadow-sm">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="font-bold text-slate-200">AI Architect</h2>
        {currentFile && (
            <span className="ml-auto text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] truncate">
                <Code2 size={12}/> {currentFile.name}
            </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0f172a]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}
            `}>
                {msg.role === 'user' ? <User size={14} className="text-white"/> : <Bot size={16} className="text-white"/>}
            </div>
            
            <div className={`
                max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-md
                ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : msg.isError 
                        ? 'bg-red-900/50 border border-red-500/50 text-red-200 rounded-tl-none' 
                        : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'}
            `}>
                <div className="markdown-body whitespace-pre-wrap font-sans">
                    {msg.text}
                </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-white"/>
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 border border-slate-700 flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 size={14} className="animate-spin"/> Thinking...
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#161b22] border-t border-slate-800">
        <form onSubmit={handleSend} className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentFile ? `Ask about ${currentFile.name}...` : "Ask about your project..."}
            className="w-full bg-[#0d1117] border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-sm"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnalysisPanel;