import { Transcript } from '../../shared/types';

/**
 * Builds the prompt for meeting notes generation.
 * Designed to work well with 7B-class models — clear structure, explicit format.
 * Language-aware: responds in the same language as the transcript.
 */
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
  "topics": ["Topic 1", "Topic 2"]
}

Rules:
- Summary: what was discussed, what was decided, in 2-4 sentences
- Action items: specific tasks mentioned, include who if stated
- Key decisions: concrete decisions or agreements made
- Topics: main subjects discussed
- If a section has no items, use an empty array []
- Respond ONLY with JSON, nothing else${langInstruction}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
