import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { isAiConfigured, sendConversationMessage, type AiChatMessage } from '../services/aiService'

const MODES: { id: string; label: string }[] = [
  { id: 'casual', label: 'Casual chat' },
  { id: 'tcf_simulation', label: 'TCF simulation' },
  { id: 'debate', label: 'Debate' },
  { id: 'job_interview', label: 'Job interview' },
  { id: 'daily_life', label: 'Daily life' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'opinion', label: 'Opinion training' },
]

interface DisplayMessage { role: 'user' | 'assistant'; text: string }

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function Conversation() {
  const { profile, mistakes } = useApp()
  const [mode, setMode] = useState('casual')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const speechRecognitionAvailable = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${text}` : text))
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const next = [...messages, { role: 'user' as const, text }]
    setMessages(next)
    setSending(true)
    const history: AiChatMessage[] = next.slice(0, -1).map((m) => ({ role: m.role, content: m.text }))
    const weaknesses = mistakes.filter((m) => !m.resolved).slice(0, 5).map((m) => m.category)
    const res = await sendConversationMessage(history, text, profile?.currentLevels.speaking ?? 'B1', mode, weaknesses)
    if (res.ok && res.text) {
      setMessages((prev) => [...prev, { role: 'assistant', text: res.text! }])
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${res.error}` }])
    }
    setSending(false)
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)' }}>
      <h1>AI Conversation</h1>

      {!isAiConfigured() && (
        <div className="card card-beige">
          <p><strong>AI conversation isn't configured yet.</strong> Deploy the secure proxy described in the README and set <code>VITE_AI_PROXY_URL</code> to enable this feature. Everything else in the app works without it.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            className="chip"
            style={{ border: 'none', whiteSpace: 'nowrap', background: mode === m.id ? 'var(--terracotta-light)' : 'var(--beige)', color: mode === m.id ? 'white' : 'var(--brown-soft)' }}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', margin: '10px 0' }}>
        {messages.length === 0 && <p style={{ color: 'var(--brown-soft)' }}>Say bonjour to start practicing in "{MODES.find(m => m.id === mode)?.label}" mode.</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            className="card"
            style={{
              maxWidth: '85%',
              marginLeft: m.role === 'user' ? 'auto' : 0,
              background: m.role === 'user' ? 'var(--terracotta-light)' : 'var(--off-white)',
              color: m.role === 'user' ? 'white' : 'var(--brown-deep)',
            }}
          >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.text}</p>
            {m.role === 'assistant' && (
              <button className="btn btn-outline" style={{ marginTop: 6, minHeight: 32, padding: '4px 10px' }} onClick={() => speak(m.text)}>🔊</button>
            )}
          </div>
        ))}
        {sending && <p style={{ color: 'var(--brown-soft)' }}>Thinking…</p>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Écrivez ou parlez en français..."
          style={{ marginBottom: 0, flex: 1 }}
        />
        {speechRecognitionAvailable && (
          <button className="btn btn-outline" onClick={toggleMic} style={{ minWidth: 48 }}>{listening ? '⏹' : '🎤'}</button>
        )}
        <button className="btn btn-primary" onClick={send} disabled={sending || !input.trim()}>Send</button>
      </div>
    </div>
  )
}
