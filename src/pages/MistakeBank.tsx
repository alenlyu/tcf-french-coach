import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Mistake, MistakeCategory } from '../types'

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

const CATEGORIES: MistakeCategory[] = [
  'vocabulary', 'grammar', 'pronunciation', 'spelling', 'word_order', 'listening', 'reading', 'speaking', 'writing',
]

export default function MistakeBank() {
  const { mistakes, setMistakes, addMistake } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const unresolved = useMemo(() => mistakes.filter((m) => !m.resolved), [mistakes])
  const resolved = useMemo(() => mistakes.filter((m) => m.resolved), [mistakes])

  function resolve(id: string) {
    setMistakes(mistakes.map((m) => (m.id === id ? { ...m, resolved: true } : m)))
  }
  function bringBackLater(id: string, days: number) {
    setMistakes(mistakes.map((m) => {
      if (m.id !== id) return m
      const next = new Date()
      next.setDate(next.getDate() + days)
      return { ...m, reviewCount: m.reviewCount + 1, nextReviewDate: next.toISOString() }
    }))
  }
  function remove(id: string) {
    setMistakes(mistakes.filter((m) => m.id !== id))
  }

  return (
    <div className="app-content">
      <h1>My Mistakes</h1>
      <p>{unresolved.length} active · {resolved.length} resolved</p>

      <button className="btn btn-outline btn-block" style={{ marginBottom: 14 }} onClick={() => setShowAdd((s) => !s)}>
        {showAdd ? 'Cancel' : '+ Log a mistake manually'}
      </button>
      {showAdd && (
        <AddMistakeForm
          onAdd={(m) => { addMistake(m); setShowAdd(false) }}
        />
      )}

      {unresolved.length === 0 && <p style={{ color: 'var(--brown-soft)' }}>No active mistakes — nice work. New ones are logged automatically as you practice.</p>}

      {unresolved.map((m) => (
        <div className="card" key={m.id}>
          <span className="chip">{m.category}</span>
          <p style={{ marginTop: 8 }}><s style={{ color: 'var(--danger)' }}>{m.originalAnswer}</s></p>
          <p><strong style={{ color: 'var(--success)' }}>{m.correctAnswer}</strong></p>
          <p style={{ color: 'var(--brown-soft)' }}>{m.explanation}</p>
          {m.example && <p style={{ fontStyle: 'italic' }}>{m.example}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => bringBackLater(m.id, 3)}>Review again in 3 days</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => resolve(m.id)}>Mark resolved</button>
          </div>
          <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => remove(m.id)}>Delete</button>
        </div>
      ))}

      {resolved.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Resolved</h3>
          {resolved.map((m) => (
            <div className="card" key={m.id} style={{ opacity: 0.7 }}>
              <span className="chip">{m.category}</span>
              <p><strong>{m.correctAnswer}</strong></p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function AddMistakeForm({ onAdd }: { onAdd: (m: Omit<Mistake, 'id' | 'createdAt' | 'reviewCount' | 'resolved'>) => void }) {
  const [category, setCategory] = useState<MistakeCategory>('grammar')
  const [original, setOriginal] = useState('')
  const [correct, setCorrect] = useState('')
  const [explanation, setExplanation] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!original.trim() || !correct.trim()) return
    onAdd({
      category, originalAnswer: original.trim(), correctAnswer: correct.trim(),
      explanation: explanation.trim() || 'Logged manually.', sourceActivity: 'mistake_review',
      nextReviewDate: new Date().toISOString(),
    })
  }

  return (
    <form className="card" onSubmit={submit}>
      <label>Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value as MistakeCategory)}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label>What you wrote</label>
      <input value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Je suis intéressé à ce poste." />
      <label>Correct version</label>
      <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="Je suis intéressé par ce poste." />
      <label>Why (optional)</label>
      <input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="intéressé takes 'par', not 'à'" />
      <button type="submit" className="btn btn-primary btn-block">Save mistake</button>
    </form>
  )
}
