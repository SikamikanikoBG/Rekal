import { MeetingNotes, SentimentData, KeyQuote, FollowUp } from '../../../shared/types';

/**
 * Parses an LLM response into structured MeetingNotes.
 * Handles both JSON and markdown-formatted responses.
 * Shared across all summarization providers.
 */
export function parseMeetingNotes(response: string): MeetingNotes {
  // Try JSON first
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary || parsed.actionItems || parsed.action_items) {
        return {
          summary: parsed.summary || '',
          actionItems: (parsed.actionItems || parsed.action_items || []).map(
            (item: string | { text: string }, i: number) => ({
              id: `ai-${i}`,
              text: typeof item === 'string' ? item : item.text,
              done: false,
            })
          ),
          keyDecisions: parsed.keyDecisions || parsed.key_decisions || [],
          topics: parsed.topics || [],
          sentiment: parseSentiment(parsed.sentiment),
          keyQuotes: parseKeyQuotes(parsed.keyQuotes || parsed.key_quotes),
          followUps: parseFollowUps(parsed.followUps || parsed.follow_ups),
        };
      }
    }
  } catch {
    // Fall through to markdown parsing
  }

  // Parse markdown-style response
  const sections = response.split(/^#+\s+/m);
  let summary = '';
  let actionItems: string[] = [];
  let keyDecisions: string[] = [];
  let topics: string[] = [];

  for (const section of sections) {
    const lower = section.toLowerCase();
    const lines = section
      .split('\n')
      .slice(1)
      .map((l) => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);

    if (lower.startsWith('summary')) summary = lines.join(' ');
    else if (lower.startsWith('action')) actionItems = lines;
    else if (lower.startsWith('decision') || lower.startsWith('key decision')) keyDecisions = lines;
    else if (lower.startsWith('topic') || lower.startsWith('key topic')) topics = lines;
  }

  if (!summary && !actionItems.length) summary = response.trim();

  return {
    summary,
    actionItems: actionItems.map((text, i) => ({ id: `ai-${i}`, text, done: false })),
    keyDecisions,
    topics,
  };
}

function parseSentiment(raw: unknown): SentimentData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const overall = obj.overall;
  if (overall !== 'positive' && overall !== 'neutral' && overall !== 'negative') return undefined;
  const score = typeof obj.score === 'number' ? Math.max(-1, Math.min(1, obj.score)) : 0;
  const highlights = Array.isArray(obj.highlights)
    ? obj.highlights.map((h: Record<string, unknown>) => ({
        timestamp: String(h.timestamp || '00:00'),
        text: String(h.text || ''),
        sentiment: h.sentiment === 'negative' ? 'negative' as const : 'positive' as const,
        intensity: typeof h.intensity === 'number' ? Math.max(0, Math.min(1, h.intensity)) : 0.5,
      }))
    : [];
  const topEmotions = Array.isArray(obj.topEmotions)
    ? obj.topEmotions.map(String)
    : Array.isArray((obj as Record<string, unknown>).top_emotions)
      ? ((obj as Record<string, unknown>).top_emotions as unknown[]).map(String)
      : [];
  return { overall, score, highlights, topEmotions };
}

function parseKeyQuotes(raw: unknown): KeyQuote[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((q: Record<string, unknown>) => ({
    text: String(q.text || ''),
    timestamp: String(q.timestamp || '00:00'),
    context: String(q.context || ''),
    speaker: q.speaker ? String(q.speaker) : undefined,
  }));
}

function parseFollowUps(raw: unknown): FollowUp[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((f: Record<string, unknown>, i: number) => {
    const priority = f.priority;
    const validPriority = (priority === 'high' || priority === 'medium' || priority === 'low')
      ? priority
      : 'medium' as const;
    return {
      id: `fu-${i}`,
      task: String(f.task || ''),
      assignee: f.assignee ? String(f.assignee) : undefined,
      deadline: f.deadline ? String(f.deadline) : undefined,
      priority: validPriority,
      done: false,
    };
  });
}
