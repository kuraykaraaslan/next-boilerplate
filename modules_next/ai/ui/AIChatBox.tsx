'use client';
// Adapted from next_components: modules/domains/common/chat/ChatBox.tsx
// Wired to /system/api/ai/stream SSE endpoint
import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots, faTimes, faPaperPlane, faUser, faRobot, faMinus,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/libs/utils/cn';

export type ChatMessage = { id: string; role: 'user' | 'agent'; text: string; timestamp?: string };

type Props = {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  model?: string;
  systemPrompt?: string;
  className?: string;
};

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AIChatBox({
  title = 'AI Assistant',
  subtitle = 'Powered by the configured AI provider',
  placeholder = 'Type a message…',
  model,
  systemPrompt,
  className,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [minimised, setMin]     = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const listRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 120); }
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text, timestamp: formatTime(new Date()) };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const res = await fetch('/system/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: history, model, systemPrompt }),
      });

      const agentId = `a-${Date.now()}`;
      setMessages((p) => [...p, { id: agentId, role: 'agent', text: '', timestamp: formatTime(new Date()) }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunk = decoder.decode(value);
            setMessages((p) => p.map((m) => m.id === agentId ? { ...m, text: m.text + chunk } : m));
          }
        }
      }
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, role: 'agent', text: 'Error — please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className={cn('fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3', className)}>
      {open && (
        <div className={cn(
          'w-80 sm:w-96 rounded-2xl shadow-2xl border border-border overflow-hidden bg-surface-base flex flex-col',
          minimised ? 'h-14' : 'h-[480px]',
        )}>
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-fg flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
              <FontAwesomeIcon icon={faRobot} className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{title}</p>
              {!minimised && <p className="text-xs text-primary-fg/70 truncate">{subtitle}</p>}
            </div>
            <button onClick={() => setMin((v) => !v)} aria-label={minimised ? 'Expand' : 'Minimise'}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <FontAwesomeIcon icon={faMinus} className="w-3 h-3" />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
            </button>
          </div>

          {!minimised && (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-text-secondary">
                    <FontAwesomeIcon icon={faCommentDots} className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Ask me anything</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={cn('flex gap-2 items-end', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn('flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs',
                      msg.role === 'user' ? 'bg-primary text-primary-fg' : 'bg-surface-overlay text-text-secondary')}>
                      <FontAwesomeIcon icon={msg.role === 'user' ? faUser : faRobot} className="w-3 h-3" />
                    </div>
                    <div className={cn('max-w-[75%] flex flex-col gap-0.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                      <div className={cn('px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-fg rounded-br-sm'
                          : 'bg-surface-raised border border-border text-text-primary rounded-bl-sm')}>
                        {msg.text || <span className="opacity-50">…</span>}
                      </div>
                      {msg.timestamp && <span className="text-[10px] text-text-disabled px-1">{msg.timestamp}</span>}
                    </div>
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role !== 'agent' && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-surface-overlay text-text-secondary">
                      <FontAwesomeIcon icon={faRobot} className="w-3 h-3" />
                    </div>
                    <div className="bg-surface-raised border border-border rounded-2xl rounded-bl-sm px-3 py-2">
                      <span className="flex gap-1 items-center">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full bg-text-disabled animate-bounce"
                            style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-border bg-surface-base px-3 py-2 flex gap-2 items-end">
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey} placeholder={placeholder} rows={1} disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50 max-h-28 overflow-y-auto leading-snug"
                  style={{ height: 38 }}
                  onInput={(e) => { const el = e.currentTarget; el.style.height = '38px'; el.style.height = `${Math.min(el.scrollHeight, 112)}px`; }}
                />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-fg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50">
                  <FontAwesomeIcon icon={faPaperPlane} className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button onClick={() => { setOpen((v) => !v); if (minimised) setMin(false); }}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'} aria-expanded={open}
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-primary text-primary-fg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2">
        <FontAwesomeIcon icon={open ? faTimes : faCommentDots} className="w-6 h-6" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-error text-white text-[10px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
