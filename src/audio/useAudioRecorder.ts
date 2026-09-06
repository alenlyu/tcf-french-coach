import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'stopped' | 'unsupported' | 'permission_denied' | 'error'

export interface UseAudioRecorderResult {
  state: RecorderState
  seconds: number
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  reset: () => void
}

// Wraps MediaRecorder with explicit, human-readable error states for every
// failure mode called out in the spec: no MediaRecorder support, denied mic
// permission, or a runtime recording error. Never throws uncaught.
export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const start = useCallback(async () => {
    setError(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      setError('Audio recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        clearTimer()
        stopResolveRef.current?.(blob)
        stopResolveRef.current = null
      }
      recorder.onerror = (e) => {
        setState('error')
        setError('An error occurred while recording. Please try again.')
        console.error('MediaRecorder error', e)
      }

      recorder.start()
      setState('recording')
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (err) {
      const domErr = err as DOMException
      if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
        setState('permission_denied')
        setError('Microphone access was denied. Enable it in your browser settings to record speaking answers.')
      } else {
        setState('error')
        setError(`Could not access the microphone: ${domErr.message || domErr.name}`)
      }
    }
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      stopResolveRef.current = resolve
      setState('stopped')
      recorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setState('idle')
    setSeconds(0)
    setError(null)
    chunksRef.current = []
  }, [])

  return { state, seconds, error, start, stop, reset }
}
