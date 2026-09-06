import React, { useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CEFRLevel } from '../types'
import { COLLECTIONS, clearActiveUser, exportUserData, importUserData } from '../data/localStore'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const ALL_COLLECTIONS = Object.values(COLLECTIONS)

export default function Settings() {
  const { profile, updateProfile, userId, resetAllData } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!profile || !userId) return null
  const p = profile
  const uid = userId

  function setSkillTarget(skill: keyof typeof p.targetLevels, level: CEFRLevel) {
    updateProfile({ targetLevels: { ...p.targetLevels, [skill]: level } })
  }

  function handleExport() {
    const json = exportUserData(uid, ALL_COLLECTIONS)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tcf-french-coach-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileRef.current?.click()
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importUserData(uid, String(reader.result), ALL_COLLECTIONS)
      setMessage(result.ok ? 'Import successful. Reload the app to see your restored data.' : `Import failed: ${result.error}`)
    }
    reader.readAsText(file)
  }

  function handleSignOut() {
    clearActiveUser()
    window.location.reload()
  }

  return (
    <div className="app-content">
      <h1>Settings</h1>

      <div className="card">
        <label>Name</label>
        <input value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />

        <label>Daily study goal</label>
        <select value={profile.dailyGoalMinutes} onChange={(e) => updateProfile({ dailyGoalMinutes: Number(e.target.value) })}>
          {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>

        <label>Exam date</label>
        <input type="date" value={profile.examDate ?? ''} onChange={(e) => updateProfile({ examDate: e.target.value || undefined })} />
      </div>

      <div className="card">
        <h3>Target level per skill</h3>
        <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>TCF Canada levels are independent per skill — set each one honestly.</p>
        {(['listening', 'reading', 'writing', 'speaking'] as const).map((skill) => (
          <div key={skill} style={{ marginBottom: 10 }}>
            <label>{skill[0].toUpperCase() + skill.slice(1)}</label>
            <select value={profile.targetLevels[skill]} onChange={(e) => setSkillTarget(skill, e.target.value as CEFRLevel)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>
          Your learning data is stored only in this browser (localStorage + IndexedDB for recordings). Nothing is sent anywhere unless you use AI Conversation, which sends only the text of that conversation to your configured AI proxy.
        </p>
        <button className="btn btn-secondary btn-block" onClick={handleExport}>Export my data (JSON)</button>
        <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={handleImportClick}>Import data</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </div>

      <div className="card">
        <h3>Reset</h3>
        <button
          className="btn btn-danger btn-block"
          onClick={() => { if (confirm('Reset vocabulary, mistakes, and progress back to defaults? Your profile stays.')) resetAllData() }}
        >
          Reset learning progress
        </button>
        <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={handleSignOut}>
          Switch profile / sign out
        </button>
      </div>
    </div>
  )
}
