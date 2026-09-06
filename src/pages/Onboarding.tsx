import React, { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CEFRLevel, UserProfile } from '../types'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const INTEREST_OPTIONS = [
  'technology', 'business', 'university', 'travel', 'sports', 'movies', 'music',
  'gaming', 'science', 'daily life', 'Canadian life', 'jobs', 'immigration', 'food', 'news',
]

export default function Onboarding() {
  const { createProfile } = useApp()
  const [name, setName] = useState('')
  const [current, setCurrent] = useState<CEFRLevel>('A2')
  const [target, setTarget] = useState<CEFRLevel>('B2')
  const [examDate, setExamDate] = useState('')
  const [dailyGoal, setDailyGoal] = useState(15)
  const [interests, setInterests] = useState<string[]>(['Canadian life', 'jobs'])

  function toggleInterest(topic: string) {
    setInterests((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const targets = { listening: target, reading: target, writing: target, speaking: target }
    const currents = { listening: current, reading: current, writing: current, speaking: current }
    const profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim() || 'there',
      nativeLanguage: 'English',
      currentLevels: currents,
      targetLevels: targets,
      targetTcfOverall: target,
      examDate: examDate || undefined,
      dailyGoalMinutes: dailyGoal,
      interests,
      difficultTopics: [],
    }
    createProfile(profile)
  }

  return (
    <div className="app-content">
      <div className="center-col" style={{ marginBottom: 18 }}>
        <h1>Bonjour !</h1>
        <p>Let's set up your personal TCF Canada coach. This takes under a minute — you can refine skill-by-skill targets later in Settings.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <label htmlFor="name">Your name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aizen" />

          <label htmlFor="current">Current overall French level</label>
          <select id="current" value={current} onChange={(e) => setCurrent(e.target.value as CEFRLevel)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <label htmlFor="target">Target TCF Canada level</label>
          <select id="target" value={target} onChange={(e) => setTarget(e.target.value as CEFRLevel)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <label htmlFor="exam">Exam date (optional)</label>
          <input id="exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />

          <label htmlFor="goal">Daily study goal</label>
          <select id="goal" value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>

        <div className="card">
          <label>Interests (personalizes your examples and topics)</label>
          <div>
            {INTEREST_OPTIONS.map((topic) => (
              <button
                type="button"
                key={topic}
                onClick={() => toggleInterest(topic)}
                className="chip"
                style={{
                  border: 'none',
                  background: interests.includes(topic) ? 'var(--terracotta-light)' : 'var(--beige)',
                  color: interests.includes(topic) ? 'white' : 'var(--brown-soft)',
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block">Start training</button>
      </form>
    </div>
  )
}
