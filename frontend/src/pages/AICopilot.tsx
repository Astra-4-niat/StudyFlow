import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'Plan my week',
  'What should I study today?',
  'Explain this topic',
  'Break down my project',
  'Help me prepare for my exam',
];

const AICopilot: React.FC = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/api/ai/copilot', { message: text.trim(), history });
      const responseContent = res.data?.response;
      if (!responseContent || typeof responseContent !== 'string') {
        throw new Error('Received an invalid response from AI. Please try again.');
      }
      const aiMsg: ChatMessage = { role: 'model', content: responseContent, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI service temporarily unavailable. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <div className="fade-up" style={{ height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-5)' }}>
        <div>
          <h1 className="page-title">AI Copilot</h1>
          <p className="page-subtitle">Your academic assistant.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearChat}>
            <RefreshCw size={14} /> Clear Chat
          </button>
        )}
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 'var(--space-6)', padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'var(--accent-light)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={32} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>StudyFlow AI Copilot</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400 }}>
                  Ask me anything about your studies. I have access to your tasks and can provide personalized academic guidance.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center', maxWidth: 500 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{ padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 120ms ease' }}
                    onMouseOver={e => { (e.target as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.target as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseOut={e => { (e.target as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.target as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-message--${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className={`message-avatar message-avatar--${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role === 'user' ? initials : <Sparkles size={16} />}
              </div>
              <div className={`message-bubble message-bubble--${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role === 'model' ? <MarkdownRenderer content={msg.content} /> : msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="chat-message">
              <div className="message-avatar message-avatar--ai"><Sparkles size={16} /></div>
              <div className="message-bubble message-bubble--ai">
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 150, 300].map(delay => (
                    <div key={delay} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1s ${delay}ms ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Ask anything about your studies... (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export { AICopilot };
