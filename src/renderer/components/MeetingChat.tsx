import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../../shared/types';

interface Props {
  meetingId: string;
  provider: string;
  model: string;
}

const SUGGESTED_QUESTIONS = [
  'What were the main topics discussed?',
  'List all action items with assignees',
  'What decisions were made?',
  'Summarize this meeting in 3 bullet points',
  'What follow-ups are needed?',
];

export function MeetingChat({ meetingId, provider, model }: Props) {
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

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, [meetingId]);

  // Auto-scroll on new messages or streaming text
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Listen for streaming tokens
  useEffect(() => {
    const cleanup = window.api.chat.onToken((data: { token: string; done: boolean; error?: string }) => {
      if (data.error) {
        setError(data.error);
        setStreaming(false);
        setStreamingText('');
        return;
      }
      if (data.done) {
        setStreaming(false);
        setStreamingText('');
        // Reload history to get the saved assistant message
        loadHistory();
      } else {
        setStreamingText((prev) => prev + data.token);
      }
    });
    return cleanup;
  }, [meetingId]);

  async function loadHistory() {
    try {
      const history = await window.api.chat.history(meetingId);
      setMessages(history);
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMessage = text.trim();
    setInput('');
    setError(null);
    setStreaming(true);
    setStreamingText('');

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      meetingId,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await window.api.chat.send(meetingId, userMessage, provider, model);
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
      await window.api.chat.clear(meetingId);
      setMessages([]);
      setStreamingText('');
      setError(null);
    } catch (e) {
      console.error('Failed to clear chat:', e);
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
    <div style={styles.container}>
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div style={styles.chatHeader}>
          <button
            onClick={handleClear}
            style={styles.clearBtn}
            title="Clear chat history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div style={styles.messagesArea}>
        {isEmpty && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p style={styles.emptyTitle}>Ask anything about this meeting</p>
            <p style={styles.emptySubtitle}>
              The AI has access to the full transcript and meeting notes
            </p>
            <div style={styles.suggestions}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  style={styles.suggestionBtn}
                  onClick={() => sendMessage(q)}
                >
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
                  <p style={styles.messageText}>{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streaming && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                  {streamingText ? (
                    <p style={styles.messageText}>{streamingText}</p>
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

            {/* Error message */}
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
          placeholder={streaming ? 'Waiting for response...' : 'Ask about this meeting...'}
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
    maxWidth: 720,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 0 8px 0',
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'none',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 150ms',
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
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    marginBottom: 24,
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    maxWidth: 400,
  },
  suggestionBtn: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    textAlign: 'left',
    transition: 'all 150ms',
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
    background: 'var(--accent)',
    color: 'white',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
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
    background: 'var(--text-tertiary)',
    animation: 'chatTypingPulse 1s ease-in-out infinite',
  },
  errorBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    background: 'var(--red, #fee)',
    border: '1px solid var(--red-border, #fcc)',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--red-text, #c00)',
  },
  inputBar: {
    display: 'flex',
    gap: 8,
    paddingTop: 12,
    borderTop: '1px solid var(--border-light)',
    marginTop: 8,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: 'var(--font)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 150ms',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'opacity 150ms',
  },
};
