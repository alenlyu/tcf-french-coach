import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { scoreSkills, scoreVocabulary } from '../learning/priorityEngine'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function Home() {
  const { profile, vocabulary, mistakes, skillProgress } = useApp()
  const navigate = useNavigate()

  const dueCount = useMemo(() => scoreVocabulary(vocabulary).length, [vocabulary])
  const skillOrder = useMemo(() => profile ? scoreSkills(profile, skillProgress) : [], [profile, skillProgress])
  const topSkill = skillOrder[0]

  const examCountdown = useMemo(() => {
    if (!profile?.examDate) return null
    const days = Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / 86400000)
    return days
  }, [profile?.examDate])

  if (!profile) return null

  return (
    <div className="app-content">
      <h1>{greeting()}, {profile.name}.</h1>
      <p>Your {profile.dailyGoalMinutes}-minute French session is ready.</p>

      {examCountdown !== null && (
        <div className="chip" style={{ marginBottom: 12 }}>
          🎯 {profile.targetTcfOverall} goal · {examCountdown > 0 ? `${examCountdown} days until your exam` : 'Exam date has passed — update it in Settings'}
        </div>
      )}

      <div className="card" style={{ background: 'var(--beige)' }}>
        <h3>Today's session</h3>
        <p>
          {dueCount > 0 ? `${dueCount} word${dueCount === 1 ? '' : 's'} due for review, ` : 'No words due right now, '}
          {topSkill ? `and ${topSkill.skill} needs the most attention (${topSkill.reason}).` : ''}
        </p>
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/session?minutes=${profile.dailyGoalMinutes}`)}>
          Start {profile.dailyGoalMinutes}-minute session
        </button>
      </div>

      <div className="card">
        <h3>Short on time?</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/session?minutes=5')}>5 min</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/session?minutes=30')}>30 min</button>
        </div>
      </div>

      <div className="card">
        <h3>Skills</h3>
        {(['listening', 'reading', 'speaking', 'writing'] as const).map((skill) => {
          const sp = skillProgress.find((s) => s.skill === skill)
          const pct = Math.round((sp?.accuracyRolling ?? 0.5) * 100)
          return (
            <div className="skill-row" key={skill}>
              <span className="label">{skill[0].toUpperCase() + skill.slice(1)}</span>
              <div className="progress-track" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--brown-soft)', width: 36, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3>Quick actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/vocabulary')}>Review Words</button>
          <button className="btn btn-outline" onClick={() => navigate('/speaking')}>Practice Speaking</button>
          <button className="btn btn-outline" onClick={() => navigate('/mistakes')}>My Mistakes ({mistakes.filter(m => !m.resolved).length})</button>
          <button className="btn btn-outline" onClick={() => navigate('/conversation')}>AI Conversation</button>
        </div>
      </div>
    </div>
  )
}
