import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useChat } from './useChat';

const SUGGESTIONS = [
  'What causes ECONNREFUSED?',
  'How do I reduce false downtime alerts?',
  'Explain HTTP 502 vs 503',
];

const ChatWidget = () => {
  const isAuthenticated = useSelector(
    (state) => state.authSlicer.isAuthenticated
  );
  // Only mount the panel (and its socket connection) when authenticated.
  if (!isAuthenticated) return null;
  return <ChatPanel />;
};

const ChatPanel = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, typing, connected, send } = useChat();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40 transition-transform hover:scale-105"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8M8 14h5m-9 6l3.5-2.5A9 9 0 1121 12a8.96 8.96 0 01-1 4" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm text-black">
                ▲
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-white">AI assistant</p>
                <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                  />
                  {connected ? 'Connected' : 'Connecting…'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-panel-2 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="pt-4">
                <p className="text-sm text-zinc-400">
                  Ask me anything about uptime, incidents, or debugging your
                  services.
                </p>
                <div className="mt-4 space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border border-edge bg-surface px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white text-black'
                      : m.error
                        ? 'border border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border border-edge bg-surface text-zinc-200'
                  }`}
                >
                  {m.content || '…'}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-edge bg-surface px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={submit} className="border-t border-edge p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the assistant…"
                className="flex-1 rounded-lg border border-edge bg-surface px-3 py-2 text-[13px] text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
                aria-label="Send"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
