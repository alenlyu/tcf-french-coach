import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { buildSession, type BuiltActivity } from '../learning/sessionBuilder'
import { listeningBank, readingBank, writingBank } from '../data/seedExercises'
import { applyReview, type RecallGrade } from '../learning/spacedRepetition'
import SpeakingRecorder from '../components/SpeakingRecorder'

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function Session() {
  const { profile, vocabulary, mistakes, skillProgress, speakingPrompts, setSkillProgress, upsertVocabularyItem, setMistakes, addMistake } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const minutes = Number(params.get('minutes') ?? profile?.dailyGoalMinutes ?? 15)

  const activities = useMemo<BuiltActivity[]>(() => {
    if (!profile) return []
    return buildSession({
      profile, vocabulary, mistakes, skillProgress,
      listeningBank, readingBank, speakingBank: speakingPrompts, writingBank, minutes,
    })
  }, []) // build once per session mount, intentionally not re-running mid-session

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answerIndex, setAnswerIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [start] = useState(Date.now())

  if (!profile) return null

  if (activities.length === 0) {
    return (
      <div className="app-content center-col">
        <h2>All caught up!</h2>
        <p>Nothing is due right now. Add words or come back later.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back home</button>
      </div>
    )
  }

  if (index >= activities.length) {
    const elapsedMin = Math.round((Date.now() - start) / 60000)
    return (
      <div className="app-content center-col">
        <h1>Session complete 🎉</h1>
        <p>You finished {activities.length} activities in about {elapsedMin || 1} minute(s).</p>
        <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>Back home</button>
      </div>
    )
  }

  const activity = activities[index]
  const progressPct = Math.round((index / activities.length) * 100)

  function next() {
    setRevealed(false)
    setAnswerIndex(null)
    setDraft('')
    setIndex((i) => i + 1)
  }

  function bumpSkillAccuracy(skill: 'listening' | 'reading' | 'speaking' | 'writing', correct: boolean) {
    const updated = skillProgress.map((sp) => {
      if (sp.skill !== skill) return sp
      const accuracyRolling = sp.accuracyRolling * 0.85 + (correct ? 1 : 0) * 0.15
      return { ...sp, accuracyRolling, lastUpdated: new Date().toISOString() }
    })
    setSkillProgress(updated)
  }

  function renderActivity() {
    switch (activity.type) {
      case 'vocab_recall': {
        const item = vocabulary.find((v) => v.id === activity.refId)
        if (!item) return null
        function grade(g: RecallGrade) {
          upsertVocabularyItem(applyReview(item!, g, Date.now() - start))
          next()
        }
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Vocabulary recall</p>
            <h2>What does this mean?</h2>
            <h1 style={{ fontSize: 32 }}>{item.word}</h1>
            <button className="btn btn-outline" onClick={() => speak(item.exampleSentence)}>🔊 Hear it</button>
            {!revealed ? (
              <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => setRevealed(true)}>Reveal answer</button>
            ) : (
              <>
                <div className="card card-beige" style={{ textAlign: 'left', marginTop: 14 }}>
                  <p><strong>{item.translation}</strong></p>
                  <p><em>{item.exampleSentence}</em></p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => grade('again')}>Again</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => grade('good')}>Good</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => grade('easy')}>Easy</button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'listening': {
        const ex = listeningBank.find((e) => e.id === activity.refId)
        if (!ex) return null
        function choose(i: number) {
          setAnswerIndex(i)
          const correct = i === ex!.correctOptionIndex
          bumpSkillAccuracy('listening', correct)
          if (!correct) {
            addMistake({
              category: 'listening', originalAnswer: ex!.options[i], correctAnswer: ex!.options[ex!.correctOptionIndex],
              explanation: ex!.explanation, sourceActivity: 'listening', nextReviewDate: new Date().toISOString(),
            })
          }
        }
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Listening · {ex.level}</p>
            <button className="btn btn-secondary btn-block" onClick={() => speak(ex.spokenText)}>🔊 Play audio</button>
            <h3 style={{ marginTop: 14 }}>{ex.question}</h3>
            {ex.options.map((opt, i) => (
              <button
                key={i}
                className="btn btn-block"
                style={{
                  marginBottom: 8, textAlign: 'left', justifyContent: 'flex-start',
                  background: answerIndex === null ? 'var(--beige)' : i === ex.correctOptionIndex ? 'var(--success)' : i === answerIndex ? 'var(--danger)' : 'var(--beige)',
                  color: answerIndex !== null && (i === ex.correctOptionIndex || i === answerIndex) ? 'white' : 'var(--brown-deep)',
                }}
                disabled={answerIndex !== null}
                onClick={() => choose(i)}
              >
                {opt}
              </button>
            ))}
            {answerIndex !== null && (
              <>
                <p style={{ marginTop: 8 }}>{ex.explanation}</p>
                <p style={{ fontStyle: 'italic', color: 'var(--brown-soft)' }}>Transcript: {ex.spokenText}</p>
                <button className="btn btn-primary btn-block" onClick={next}>Continue</button>
              </>
            )}
          </div>
        )
      }

      case 'reading': {
        const ex = readingBank.find((e) => e.id === activity.refId)
        if (!ex) return null
        function choose(i: number) {
          setAnswerIndex(i)
          const correct = i === ex!.correctOptionIndex
          bumpSkillAccuracy('reading', correct)
          if (!correct) {
            addMistake({
              category: 'reading', originalAnswer: ex!.options[i], correctAnswer: ex!.options[ex!.correctOptionIndex],
              explanation: ex!.explanation, sourceActivity: 'reading', nextReviewDate: new Date().toISOString(),
            })
          }
        }
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Reading · {ex.level}</p>
            <p>{ex.passage}</p>
            <h3>{ex.question}</h3>
            {ex.options.map((opt, i) => (
              <button
                key={i}
                className="btn btn-block"
                style={{
                  marginBottom: 8, textAlign: 'left', justifyContent: 'flex-start',
                  background: answerIndex === null ? 'var(--beige)' : i === ex.correctOptionIndex ? 'var(--success)' : i === answerIndex ? 'var(--danger)' : 'var(--beige)',
                  color: answerIndex !== null && (i === ex.correctOptionIndex || i === answerIndex) ? 'white' : 'var(--brown-deep)',
                }}
                disabled={answerIndex !== null}
                onClick={() => choose(i)}
              >
                {opt}
              </button>
            ))}
            {answerIndex !== null && (
              <>
                <p style={{ marginTop: 8 }}>{ex.explanation}</p>
                <button className="btn btn-primary btn-block" onClick={next}>Continue</button>
              </>
            )}
          </div>
        )
      }

      case 'speaking': {
        const ex = speakingPrompts.find((e) => e.id === activity.refId)
        if (!ex) return null
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Speaking · Task {ex.taskNumber}</p>
            <h3>{ex.prompt}</h3>
            <SpeakingRecorder promptId={ex.id} prepSeconds={ex.prepSeconds} />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 12 }}
              onClick={() => { bumpSkillAccuracy('speaking', true); next() }}
            >
              Done, continue
            </button>
          </div>
        )
      }

      case 'writing': {
        const ex = writingBank.find((e) => e.id === activity.refId)
        if (!ex) return null
        const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Writing · Task {ex.taskNumber} · min {ex.minWords} words</p>
            <h3>{ex.prompt}</h3>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrivez votre réponse ici..." />
            <p style={{ color: wordCount >= ex.minWords ? 'var(--success)' : 'var(--brown-soft)' }}>{wordCount} / {ex.minWords} words</p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => { bumpSkillAccuracy('writing', wordCount >= ex.minWords); next() }}
            >
              Submit & continue
            </button>
          </div>
        )
      }

      case 'mistake_review': {
        const m = mistakes.find((mm) => mm.id === activity.refId)
        if (!m) { next(); return null }
        function resolve() {
          setMistakes(mistakes.map((mm) => (mm.id === m!.id ? { ...mm, resolved: true } : mm)))
          next()
        }
        function again() {
          const nextDate = new Date()
          nextDate.setDate(nextDate.getDate() + 3)
          setMistakes(mistakes.map((mm) => (mm.id === m!.id ? { ...mm, reviewCount: mm.reviewCount + 1, nextReviewDate: nextDate.toISOString() } : mm)))
          next()
        }
        return (
          <div className="card">
            <p style={{ color: 'var(--brown-soft)' }}>Mistake review · {m.category}</p>
            <p><s style={{ color: 'var(--danger)' }}>{m.originalAnswer}</s></p>
            <p><strong style={{ color: 'var(--success)' }}>{m.correctAnswer}</strong></p>
            <p>{m.explanation}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={again}>Still tricky</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={resolve}>Got it now</button>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="app-content">
      <div className="progress-track" style={{ marginBottom: 16 }}>
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>{index + 1} / {activities.length} · {activity.label}</p>
      {renderActivity()}
    </div>
  )
}
