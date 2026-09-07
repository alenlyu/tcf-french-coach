import React, { useEffect, useRef, useState } from 'react'
import { useAudioRecorder } from '../audio/useAudioRecorder'
import { deleteBlob, getBlob, saveBlob } from '../audio/recordingStore'
import { COLLECTIONS, loadCollection, saveCollection } from '../data/localStore'
import type { SpeakingRecordingMeta } from '../types'
import { useApp } from '../store/AppContext'

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

interface Props {
  promptId: string
  prepSeconds?: number
}

// A full record / stop / delete / re-record / play / replay UI for one
// speaking prompt. Multiple attempts are kept side by side (never silently
// overwritten) per the spec's recording requirements, and metadata persists
// in localStorage while the actual audio blob lives in IndexedDB.
export default function SpeakingRecorder({ promptId, prepSeconds = 0 }: Props) {
  const { userId } = useApp()
  const { state, seconds, error, start, stop, reset } = useAudioRecorder()
  const [attempts, setAttempts] = useState<SpeakingRecordingMeta[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [prep, setPrep] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) return
    const all = loadCollection<SpeakingRecordingMeta[]>(userId, COLLECTIONS.RECORDINGS_META, [])
    setAttempts(all.filter((a) => a.promptId === promptId))
  }, [userId, promptId])

  function persistAttempts(next: SpeakingRecordingMeta[]) {
    if (!userId) return
    const all = loadCollection<SpeakingRecordingMeta[]>(userId, COLLECTIONS.RECORDINGS_META, [])
    const others = all.filter((a) => a.promptId !== promptId)
    saveCollection(userId, COLLECTIONS.RECORDINGS_META, [...others, ...next])
    setAttempts(next)
  }

  function beginPrep() {
    if (prepSeconds <= 0) {
      start()
      return
    }
    setPrep(prepSeconds)
    const interval = window.setInterval(() => {
      setPrep((p) => {
        if (p === null) return null
        if (p <= 1) {
          window.clearInterval(interval)
          start()
          return null
        }
        return p - 1
      })
    }, 1000)
  }

  async function handleStop() {
    const blob = await stop()
    reset()
    if (!blob || blob.size === 0) return
    const attemptNumber = attempts.length + 1
    const blobKey = `${promptId}:${uid()}`
    await saveBlob(blobKey, blob)
    const meta: SpeakingRecordingMeta = {
      id: uid(), promptId, attemptNumber, durationSeconds: seconds, createdAt: new Date().toISOString(), blobKey,
    }
    persistAttempts([...attempts, meta])
  }

  async function play(meta: SpeakingRecordingMeta) {
    const blob = await getBlob(meta.blobKey)
    if (!blob) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = url
    audioRef.current.onended = () => setPlayingId(null)
    setPlayingId(meta.id)
    audioRef.current.play()
  }

  function pause() {
    audioRef.current?.pause()
    setPlayingId(null)
  }

  async function remove(meta: SpeakingRecordingMeta) {
    await deleteBlob(meta.blobKey)
    persistAttempts(attempts.filter((a) => a.id !== meta.id))
  }

  return (
    <div>
      {prep !== null && (
        <div className="card card-beige center-col">
          <p>Preparation</p>
          <h1>{prep}s</h1>
        </div>
      )}

      {state === 'unsupported' && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {state === 'permission_denied' && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {state === 'error' && error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {state !== 'recording' && prep === null && (
        <button className="btn btn-primary btn-block" onClick={beginPrep}>
          {attempts.length > 0 ? '🎙️ Record again' : '🎙️ Start recording'}
        </button>
      )}

      {state === 'recording' && (
        <div className="card center-col" style={{ background: 'var(--pink-dusty)' }}>
          <p style={{ color: 'white', fontWeight: 700 }}>● Recording… {seconds}s</p>
          <button className="btn" style={{ background: 'white', color: 'var(--danger)' }} onClick={handleStop}>Stop</button>
        </div>
      )}

      {attempts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {attempts.map((a) => (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
              <span>Attempt {a.attemptNumber} — {a.durationSeconds}s</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {playingId === a.id ? (
                  <button className="btn btn-outline" onClick={pause}>⏸</button>
                ) : (
                  <button className="btn btn-outline" onClick={() => play(a)}>▶️</button>
                )}
                <button className="btn btn-outline" onClick={() => remove(a)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
