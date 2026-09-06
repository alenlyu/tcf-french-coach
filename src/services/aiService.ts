// AI abstraction layer.
//
// SECURITY: this file never contains an API key. It calls a proxy endpoint
// you deploy yourself (Cloudflare Worker / Vercel Function / Netlify
// Function — see README "Secure AI proxy deployment"), which holds the
// real provider key server-side and forwards requests to an
// OpenAI-compatible or Anthropic-compatible chat completion endpoint.
//
// The proxy URL is read from an environment variable at build time
// (VITE_AI_PROXY_URL). If it is unset, or the request fails, every
// function here degrades gracefully: it returns a clearly-labeled
// "AI unavailable" result rather than throwing, so the rest of the app
// (vocabulary, spaced repetition, recording, etc.) keeps working with zero
// network dependency, per the offline-first requirement.

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiResult {
  ok: boolean
  text?: string
  error?: string
}

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined

export function isAiConfigured(): boolean {
  return Boolean(PROXY_URL)
}

async function callProxy(messages: AiChatMessage[]): Promise<AiResult> {
  if (!PROXY_URL) {
    return { ok: false, error: 'AI conversation requires a configured proxy endpoint (VITE_AI_PROXY_URL). See README.' }
  }
  if (!navigator.onLine) {
    return { ok: false, error: 'AI conversation requires an internet connection.' }
  }
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) {
      return { ok: false, error: `AI proxy returned an error (status ${res.status}).` }
    }
    const data = await res.json()
    const text = data?.text ?? data?.content?.[0]?.text
    if (typeof text !== 'string') {
      return { ok: false, error: 'AI proxy returned an unexpected response shape.' }
    }
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: `Could not reach the AI proxy: ${(err as Error).message}` }
  }
}

function tutorSystemPrompt(level: string, mode: string, knownWeaknesses: string[]): string {
  return [
    'You are an experienced, encouraging French teacher and TCF Canada coach.',
    `The learner's current level is approximately ${level}.`,
    `Conversation mode: ${mode}.`,
    'Adapt vocabulary and sentence complexity to that level. Prioritize communication over',
    'perfect grammar; correct meaningful mistakes without constantly interrupting.',
    'When you correct something, explain briefly why, then let the conversation continue naturally.',
    'Encourage retrieval: ask a question back rather than only lecturing.',
    knownWeaknesses.length
      ? `The learner has recently struggled with: ${knownWeaknesses.join(', ')}. Look for natural opportunities to practice these.`
      : '',
    'Respond in French unless the learner is A1 and clearly needs a short English clarification.',
  ].filter(Boolean).join(' ')
}

export async function sendConversationMessage(
  history: AiChatMessage[],
  userMessage: string,
  level: string,
  mode: string,
  knownWeaknesses: string[] = []
): Promise<AiResult> {
  const messages: AiChatMessage[] = [
    { role: 'system', content: tutorSystemPrompt(level, mode, knownWeaknesses) },
    ...history,
    { role: 'user', content: userMessage },
  ]
  return callProxy(messages)
}

export async function getWritingFeedback(prompt: string, draft: string, level: string): Promise<AiResult> {
  const messages: AiChatMessage[] = [
    {
      role: 'system',
      content: `You are a TCF Canada writing examiner giving practice feedback (clearly not an official score) for a ${level}-level learner. ` +
        'Identify grammar mistakes, suggest stronger vocabulary, comment on structure, and give an estimated CEFR level. Be specific and concise.',
    },
    { role: 'user', content: `Prompt: ${prompt}\n\nLearner's text:\n${draft}` },
  ]
  return callProxy(messages)
}

export async function getSpeakingFeedback(promptText: string, transcript: string, level: string): Promise<AiResult> {
  const messages: AiChatMessage[] = [
    {
      role: 'system',
      content: `You are a TCF Canada speaking examiner giving an "estimated practice assessment" (never an official score) for a ${level}-level learner. ` +
        'Evaluate grammatical accuracy, vocabulary range, fluency markers, coherence, and task completion based on the transcript. Give strengths, weaknesses, and one focused next step.',
    },
    { role: 'user', content: `Prompt: ${promptText}\n\nTranscript of the learner's spoken response:\n${transcript}` },
  ]
  return callProxy(messages)
}
