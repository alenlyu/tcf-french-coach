import React from 'react'
import { useApp } from '../store/AppContext'

export default function Progress() {
  const { profile, vocabulary, mistakes, skillProgress } = useApp()
  if (!profile) return null

  const known = vocabulary.filter((v) => v.status === 'known').length
  const difficult = vocabulary.filter((v) => v.status === 'difficult').length
  const resolvedMistakes = mistakes.filter((m) => m.resolved).length

  return (
    <div className="app-content">
      <h1>Progress</h1>

      <div className="card">
        <h3>Skill breakdown</h3>
        <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>Estimated from your recent practice accuracy, not an official TCF score.</p>
        {(['listening', 'reading', 'speaking', 'writing'] as const).map((skill) => {
          const sp = skillProgress.find((s) => s.skill === skill)
          const current = profile.currentLevels[skill]
          const target = profile.targetLevels[skill]
          return (
            <div key={skill} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{skill[0].toUpperCase() + skill.slice(1)}</strong>
                <span>{current} → {target}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.round((sp?.accuracyRolling ?? 0.5) * 100)}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3>Vocabulary</h3>
        <p>{vocabulary.length} total words · {known} known · {difficult} marked difficult</p>
      </div>

      <div className="card">
        <h3>Mistakes</h3>
        <p>{resolvedMistakes} resolved · {mistakes.length - resolvedMistakes} still active</p>
      </div>

      <div className="card">
        <h3>Goal</h3>
        <p>{profile.dailyGoalMinutes} minutes/day target</p>
        {profile.examDate && <p>Exam date: {new Date(profile.examDate).toLocaleDateString()}</p>}
      </div>
    </div>
  )
}
