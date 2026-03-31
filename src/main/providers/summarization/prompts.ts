import { Transcript } from '../../../shared/types';

export function buildMeetingNotesPrompt(transcript: Transcript, forcedLanguage?: string): string {
  const transcriptText = transcript.segments
    .map((s) => {
      const time = formatTime(s.start);
      const speaker = s.speaker ? `[${s.speaker}]` : '';
      return `[${time}] ${speaker} ${s.text}`;
    })
    .join('\n');

  const lang = forcedLanguage && forcedLanguage !== 'auto' ? forcedLanguage : (transcript.language || 'en');
  const langInstruction = lang !== 'en'
    ? `\n- IMPORTANT: The transcript is in "${lang}". Write ALL output (summary, action items, decisions, topics) in the SAME language as the transcript. Do NOT translate to English.`
    : '';

  return `You are a meeting notes assistant. Analyze this meeting transcript and produce structured notes.

TRANSCRIPT:
${transcriptText}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "summary": "2-4 sentence summary of the meeting",
  "actionItems": ["Action item 1", "Action item 2"],
  "keyDecisions": ["Decision 1", "Decision 2"],
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": -1 to 1,
    "highlights": [{"timestamp": "MM:SS", "text": "exact quote showing sentiment", "sentiment": "positive|negative", "intensity": 0.0 to 1.0}],
    "topEmotions": ["emotion1", "emotion2", "emotion3"]
  },
  "keyQuotes": [{"text": "exact quote", "timestamp": "MM:SS", "context": "why this quote is important", "speaker": "name if known"}],
  "followUps": [{"task": "task description", "assignee": "person or null", "deadline": "YYYY-MM-DD or null", "priority": "high|medium|low"}]
}

Rules:
- Summary: what was discussed, what was decided, in 2-4 sentences
- Action items: specific tasks mentioned, include who if stated
- Key decisions: concrete decisions or agreements made
- Topics: main subjects discussed
- Sentiment: analyze the overall tone; score from -1 (very negative) to 1 (very positive); highlight 3-5 moments with strong sentiment; list top 3 emotions detected
- Key quotes: extract 3-5 notable or impactful quotes from the meeting
- Follow-ups: extract tasks with deadlines and priorities; assign high priority to urgent items, medium to standard, low to nice-to-have
- If a section has no items, use an empty array []
- For score, use a number (e.g. 0.6), not a string
- Respond ONLY with JSON, nothing else${langInstruction}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
