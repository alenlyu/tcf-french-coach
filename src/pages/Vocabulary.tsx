import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CEFRLevel, VocabularyItem } from '../types'
import { newVocabularyState, applyReview, isDue, type RecallGrade } from '../learning/spacedRepetition'

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function Vocabulary() {
  const { vocabulary, upsertVocabularyItem, removeVocabularyItem } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'due' | 'known' | 'difficult'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [drillItem, setDrillItem] = useState<VocabularyItem | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [drillStart, setDrillStart] = useState(0)

  const filtered = useMemo(() => {
    let list = vocabulary
    if (filter === 'due') list = list.filter((v) => isDue(v))
    else if (filter === 'known') list = list.filter((v) => v.status === 'known')
    else if (filter === 'difficult') list = list.filter((v) => v.status === 'difficult')
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((v) => v.word.toLowerCase().includes(q) || v.translation.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => a.word.localeCompare(b.word))
  }, [vocabulary, filter, query])

  const dueList = useMemo(() => vocabulary.filter((v) => isDue(v)), [vocabulary])

  function startDrill() {
    if (dueList.length === 0) return
    setDrillItem(dueList[0])
    setRevealed(false)
    setDrillStart(Date.now())
  }

  function grade(g: RecallGrade) {
    if (!drillItem) return
    const responseTime = Date.now() - drillStart
    const updated = applyReview(drillItem, g, responseTime)
    upsertVocabularyItem(updated)
    const remaining = dueList.filter((v) => v.id !== drillItem.id)
    if (remaining.length > 0) {
      setDrillItem(remaining[0])
      setRevealed(false)
      setDrillStart(Date.now())
    } else {
      setDrillItem(null)
    }
  }

  if (drillItem) {
    return (
      <div className="app-content center-col">
        <div className="card" style={{ width: '100%' }}>
          <p style={{ color: 'var(--brown-soft)' }}>Retrieval practice · {dueList.length} due</p>
          <h2>What does this mean?</h2>
          <h1 style={{ fontSize: 32 }}>{drillItem.word}</h1>
          <button className="btn btn-outline" onClick={() => speak(drillItem.exampleSentence)}>🔊 Hear it in context</button>

          {!revealed ? (
            <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => setRevealed(true)}>
              Reveal answer
            </button>
          ) : (
            <>
              <div className="card card-beige" style={{ marginTop: 16, textAlign: 'left' }}>
                <p><strong>{drillItem.translation}</strong> ({drillItem.partOfSpeech}{drillItem.gender ? `, ${drillItem.gender}` : ''})</p>
                <p><em>{drillItem.exampleSentence}</em></p>
                {drillItem.exampleTranslation && <p style={{ color: 'var(--brown-soft)' }}>{drillItem.exampleTranslation}</p>}
              </div>
              <p style={{ marginTop: 12 }}>How well did you recall it?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => grade('again')}>Again</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => grade('good')}>Good</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => grade('easy')}>Easy</button>
              </div>
            </>
          )}
          <button className="btn btn-outline btn-block" style={{ marginTop: 16 }} onClick={() => setDrillItem(null)}>Stop practicing</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-content">
      <h1>Vocabulary</h1>
      <p>{vocabulary.length} words in your personal bank · {dueList.length} due for review</p>

      <button className="btn btn-primary btn-block" disabled={dueList.length === 0} onClick={startDrill} style={{ marginBottom: 14 }}>
        {dueList.length > 0 ? `Practice ${dueList.length} due word${dueList.length === 1 ? '' : 's'}` : 'Nothing due right now'}
      </button>

      <input type="text" placeholder="Search words..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['all', 'due', 'known', 'difficult'] as const).map((f) => (
          <button
            key={f}
            className="chip"
            style={{ border: 'none', background: filter === f ? 'var(--terracotta-light)' : 'var(--beige)', color: filter === f ? 'white' : 'var(--brown-soft)' }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <button className="btn btn-outline btn-block" style={{ marginBottom: 14 }} onClick={() => setShowAdd((s) => !s)}>
        {showAdd ? 'Cancel' : '+ Add a word'}
      </button>

      {showAdd && <AddWordForm onAdd={(item) => { upsertVocabularyItem(item); setShowAdd(false) }} />}

      {filtered.map((item) => (
        <div className="card" key={item.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ marginBottom: 2 }}>{item.word} {item.gender ? <span style={{ color: 'var(--brown-soft)', fontSize: 14 }}>({item.gender})</span> : null}</h3>
              <p style={{ color: 'var(--brown-soft)' }}>{item.translation}</p>
            </div>
            <button className="btn btn-outline" style={{ minHeight: 40, padding: '6px 10px' }} onClick={() => speak(item.word)}>🔊</button>
          </div>
          <p style={{ fontStyle: 'italic' }}>{item.exampleSentence}</p>
          <div>
            <span className="chip">{item.difficulty}</span>
            <span className="chip">{item.status}</span>
            {item.topic && <span className="chip">{item.topic}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => upsertVocabularyItem({ ...item, status: item.status === 'difficult' ? 'learning' : 'difficult' })}
            >
              {item.status === 'difficult' ? 'Unmark difficult' : 'Mark difficult'}
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => removeVocabularyItem(item.id)}>Delete</button>
          </div>
        </div>
      ))}

      {filtered.length === 0 && <p style={{ color: 'var(--brown-soft)' }}>No words match this filter.</p>}
    </div>
  )
}

function AddWordForm({ onAdd }: { onAdd: (item: VocabularyItem) => void }) {
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [example, setExample] = useState('')
  const [difficulty, setDifficulty] = useState<CEFRLevel>('B1')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim() || !translation.trim()) return
    const item: VocabularyItem = {
      id: uid(),
      word: word.trim(),
      translation: translation.trim(),
      partOfSpeech: '—',
      exampleSentence: example.trim() || word.trim(),
      tags: [],
      difficulty,
      tcfRelevance: true,
      createdAt: new Date().toISOString(),
      ...newVocabularyState(),
    }
    onAdd(item)
  }

  return (
    <form className="card" onSubmit={submit}>
      <label>French word</label>
      <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. néanmoins" />
      <label>Translation</label>
      <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="e.g. nevertheless" />
      <label>Example sentence (optional)</label>
      <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Use it in a sentence" />
      <label>Difficulty</label>
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as CEFRLevel)}>
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <button type="submit" className="btn btn-primary btn-block">Add word</button>
    </form>
  )
}
