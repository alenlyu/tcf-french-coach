import React, { useState } from 'react'
import SpeakingRecorder from '../components/SpeakingRecorder'
import { getSpeakingFeedback } from '../services/aiService'
import { useApp } from '../store/AppContext'
import type { CEFRLevel, SpeakingPrompt } from '../types'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

export default function Speaking() {
  const { profile, speakingPrompts, upsertSpeakingPrompt, removeSpeakingPrompt } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const selected = speakingPrompts.find((p) => p.id === selectedId)
  const editing = speakingPrompts.find((p) => p.id === editingId)

  async function requestFeedback() {
    if (!selected) return
    setLoadingFeedback(true)
    setFeedback(null)
    const res = await getSpeakingFeedback(selected.prompt, transcript, profile?.targetLevels.speaking ?? 'B1')
    setFeedback(res.ok ? res.text ?? null : res.error ?? 'Could not get feedback.')
    setLoadingFeedback(false)
  }

  if (selected) {
    return (
      <div className="app-content">
        <button className="btn btn-outline" onClick={() => { setSelectedId(null); setFeedback(null); setTranscript('') }}>← Назад</button>
        <div className="card" style={{ marginTop: 12 }}>
          <span className="chip">Задание {selected.taskNumber} · {selected.level}</span>
          <h2>{selected.prompt}</h2>
          <p style={{ color: 'var(--brown-soft)' }}>Подготовка: {selected.prepSeconds}с · Ответ: {selected.responseSeconds}с</p>
        </div>

        <SpeakingRecorder promptId={selected.id} prepSeconds={selected.prepSeconds} />

        <div className="card" style={{ marginTop: 14 }}>
          <h3>Оценка от ИИ (необязательно)</h3>
          <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>
            Впишите примерно то, что вы сказали, чтобы получить пробную оценку. Это не официальная оценка TCF.
          </p>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Что вы сказали, по-французски..." />
          <button className="btn btn-secondary btn-block" onClick={requestFeedback} disabled={!transcript.trim() || loadingFeedback}>
            {loadingFeedback ? 'Получаю ответ…' : 'Получить оценку от ИИ'}
          </button>
          {feedback && <div className="card card-beige" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{feedback}</div>}
        </div>
      </div>
    )
  }

  if (showAdd || editing) {
    return (
      <PromptForm
        initial={editing ?? null}
        onCancel={() => { setShowAdd(false); setEditingId(null) }}
        onSave={(p) => { upsertSpeakingPrompt(p); setShowAdd(false); setEditingId(null) }}
      />
    )
  }

  return (
    <div className="app-content">
      <h1>Практика говорения</h1>
      <p>Экзамен TCF Canada: 3 задания за 12 минут. Ниже — ваши вопросы. Можно добавлять свои, менять и удалять.</p>

      <button className="btn btn-primary btn-block" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>
        + Добавить вопрос
      </button>

      {speakingPrompts.length === 0 && (
        <p style={{ color: 'var(--brown-soft)' }}>Вопросов пока нет. Нажмите «+ Добавить вопрос» выше.</p>
      )}

      {[...speakingPrompts].sort((a, b) => a.taskNumber - b.taskNumber).map((p) => (
        <div className="card" key={p.id}>
          <span className="chip">Задание {p.taskNumber} · {p.level}</span>
          <h3 style={{ cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>{p.prompt}</h3>
          <p style={{ color: 'var(--brown-soft)' }}>Подготовка {p.prepSeconds}с · Ответ {p.responseSeconds}с</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSelectedId(p.id)}>Практиковать</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingId(p.id)}>Изменить</button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => { if (confirm('Удалить этот вопрос?')) removeSpeakingPrompt(p.id) }}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PromptForm({
  initial, onSave, onCancel,
}: {
  initial: SpeakingPrompt | null
  onSave: (p: SpeakingPrompt) => void
  onCancel: () => void
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [taskNumber, setTaskNumber] = useState<1 | 2 | 3>(initial?.taskNumber ?? 1)
  const [level, setLevel] = useState<CEFRLevel>(initial?.level ?? 'B1')
  const [prepSeconds, setPrepSeconds] = useState(initial?.prepSeconds ?? 30)
  const [responseSeconds, setResponseSeconds] = useState(initial?.responseSeconds ?? 60)
  const [topic, setTopic] = useState(initial?.topic ?? 'daily life')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    const item: SpeakingPrompt = {
      id: initial?.id ?? uid(),
      skill: 'speaking',
      level,
      tcfRelevance: true,
      topic: topic.trim() || 'general',
      difficulty: initial?.difficulty ?? 2,
      tags: initial?.tags ?? [],
      taskNumber,
      prompt: prompt.trim(),
      prepSeconds,
      responseSeconds,
    }
    onSave(item)
  }

  return (
    <div className="app-content">
      <button className="btn btn-outline" onClick={onCancel}>← Отмена</button>
      <form className="card" style={{ marginTop: 12 }} onSubmit={submit}>
        <h2>{initial ? 'Изменить вопрос' : 'Новый вопрос'}</h2>

        <label>Текст вопроса (по-французски)</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Например: Décrivez votre ville natale." />

        <label>Номер задания</label>
        <select value={taskNumber} onChange={(e) => setTaskNumber(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={1}>Задание 1</option>
          <option value={2}>Задание 2</option>
          <option value={3}>Задание 3</option>
        </select>

        <label>Уровень</label>
        <select value={level} onChange={(e) => setLevel(e.target.value as CEFRLevel)}>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <label>Тема</label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="jobs, daily life, opinion..." />

        <label>Время на подготовку (секунд)</label>
        <input type="number" min={0} value={prepSeconds} onChange={(e) => setPrepSeconds(Number(e.target.value))} />

        <label>Время на ответ (секунд)</label>
        <input type="number" min={10} value={responseSeconds} onChange={(e) => setResponseSeconds(Number(e.target.value))} />

        <button type="submit" className="btn btn-primary btn-block">Сохранить</button>
      </form>
    </div>
  )
}
