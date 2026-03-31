import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tokens } from '../styles/tokens';
import { ChatMessage } from '../../shared/types';
import { Markdown } from '../components/Markdown';

const SUGGESTED_QUESTIONS = [
  'What were my most discussed topics this month?',
  'Show all open action items across meetings',
  'What decisions have we made recently?',
  'Compare my last two meetings',
  'What patterns do you see in my meetings?',
];

export function GlobalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Listen for global streaming tokens
  useEffect(() => {
    const cleanup = window.api.chat.onGlobalToken((data: { token: string; done: boolean; error?: string }) => {
      if (data.error) {
        setError(data.error);
        setStreaming(false);
        setStreamingText('');
        return;
      }
      if (data.done) {
        setStreaming(false);
        setStreamingText('');
        loadHistory();
      } else {
        setStreamingText((prev) => prev + data.token);
      }
    });
    return cleanup;
  }, []);

  async function loadHistory() {
    try {
      const history = await window.api.chat.globalHistory();
      setMessages(history);
    } catch (e) {
      console.error('Failed to load global chat history:', e);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMessage = text.trim();
    setInput('');
    setError(null);
    setStreaming(true);
    setStreamingText('');

    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      meetingId: 'global',
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await window.api.chat.sendGlobal(userMessage);
      if (!result.success && result.error) {
        setError(result.error);
        setStreaming(false);
        setStreamingText('');
      }
    } catch (e) {
      setError((e as Error).message);
      setStreaming(false);
      setStreamingText('');
    }
  }

  async function handleClear() {
    try {
      await window.api.chat.clearGlobal();
      setMessages([]);
      setStreamingText('');
      setError(null);
    } catch (e) {
      console.error('Failed to clear global chat:', e);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="screen" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>AI Chat</h2>
          <p style={styles.subtitle}>Ask questions across all your meeting data</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} style={styles.clearBtn} title="Clear chat history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={styles.messagesArea}>
        {isEmpty && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.textTertiary} strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p style={styles.emptyTitle}>Ask anything about your meetings</p>
            <p style={styles.emptySubtitle}>
              The AI has access to all your meeting notes, summaries, and action items
            </p>
            <div style={styles.suggestions}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} style={styles.suggestionBtn} onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEmpty && (
          <div style={styles.messagesList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <Markdown content={msg.content} />
                  ) : (
                    <p style={styles.messageText}>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streaming && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                  {streamingText ? (
                    <Markdown content={streamingText} />
                  ) : (
                    <div style={styles.typingIndicator}>
                      <span style={{ ...styles.typingDot, animationDelay: '0ms' }} />
                      <span style={{ ...styles.typingDot, animationDelay: '150ms' }} />
                      <span style={{ ...styles.typingDot, animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={styles.errorBubble}>
                  <p style={styles.errorText}>Error: {error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? 'Waiting for response...' : 'Ask about your meetings...'}
          disabled={streaming}
          style={styles.input}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            ...styles.sendBtn,
            opacity: !input.trim() || streaming ? 0.4 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 2-7 20-4-9-9-4z" />
            <path d="m22 2-11 11" />
          </svg>
        </button>
      </div>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes chatTypingPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: tokens.spacing.xl,
    gap: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
    flexShrink: 0,
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textTertiary,
    marginTop: 2,
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textTertiary,
    background: 'none',
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: `all ${tokens.transition.fast}`,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: tokens.spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textTertiary,
    marginBottom: tokens.spacing.xl,
    maxWidth: 400,
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    maxWidth: 440,
  },
  suggestionBtn: {
    padding: '12px 16px',
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radius.lg,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    textAlign: 'left',
    transition: `all ${tokens.transition.fast}`,
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 8,
  },
  messageRow: {
    display: 'flex',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: 16,
    wordBreak: 'break-word',
  },
  userBubble: {
    background: tokens.colors.accent,
    color: 'white',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    color: tokens.colors.text,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: tokens.fontSize.md,
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  typingIndicator: {
    display: 'flex',
    gap: 4,
    padding: '4px 0',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: tokens.colors.textTertiary,
    animation: 'chatTypingPulse 1s ease-in-out infinite',
  },
  errorBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    background: tokens.colors.dangerSubtle,
    border: `1px solid ${tokens.colors.danger}`,
  },
  errorText: {
    fontSize: tokens.fontSize.sm,
    lineHeight: 1.5,
    margin: 0,
    color: tokens.colors.danger,
  },
  inputBar: {
    display: 'flex',
    gap: 8,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.borderSubtle}`,
    marginTop: tokens.spacing.sm,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: tokens.fontSize.md,
    fontFamily: 'var(--font)',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    background: tokens.colors.bgSurface,
    color: tokens.colors.text,
    outline: 'none',
    transition: `border-color ${tokens.transition.fast}`,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: tokens.radius.lg,
    background: tokens.colors.accent,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: `opacity ${tokens.transition.fast}`,
  },
};
