import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Mistake, SkillProgress, SpeakingPrompt, UserProfile, VocabularyItem } from '../types'
import {
  COLLECTIONS, getActiveUserId, loadCollection, saveCollection, setActiveUserId,
} from '../data/localStore'
import { buildSeedVocabulary } from '../data/seedVocabulary'
import { speakingBank as seedSpeakingBank } from '../data/seedExercises'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_SKILL_PROGRESS: SkillProgress[] = (['listening', 'reading', 'writing', 'speaking'] as const).map((skill) => ({
  skill, estimatedLevel: 'A2', accuracyRolling: 0.5, lastUpdated: new Date().toISOString(), history: [],
}))

interface AppState {
  userId: string | null
  profile: UserProfile | null
  vocabulary: VocabularyItem[]
  mistakes: Mistake[]
  skillProgress: SkillProgress[]
  speakingPrompts: SpeakingPrompt[]
  loading: boolean
}

interface AppApi extends AppState {
  createProfile: (input: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  setVocabulary: (items: VocabularyItem[]) => void
  upsertVocabularyItem: (item: VocabularyItem) => void
  removeVocabularyItem: (id: string) => void
  setMistakes: (items: Mistake[]) => void
  addMistake: (m: Omit<Mistake, 'id' | 'createdAt' | 'reviewCount' | 'resolved'>) => void
  setSkillProgress: (sp: SkillProgress[]) => void
  setSpeakingPrompts: (items: SpeakingPrompt[]) => void
  upsertSpeakingPrompt: (item: SpeakingPrompt) => void
  removeSpeakingPrompt: (id: string) => void
  resetAllData: () => void
}

const AppContext = createContext<AppApi | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    userId: null, profile: null, vocabulary: [], mistakes: [], skillProgress: [], speakingPrompts: [], loading: true,
  })

  useEffect(() => {
    const existing = getActiveUserId()
    if (!existing) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    const profile = loadCollection<UserProfile | null>(existing, COLLECTIONS.PROFILE, null)
    const vocabulary = loadCollection<VocabularyItem[]>(existing, COLLECTIONS.VOCABULARY, [])
    const mistakes = loadCollection<Mistake[]>(existing, COLLECTIONS.MISTAKES, [])
    const skillProgress = loadCollection<SkillProgress[]>(existing, COLLECTIONS.SKILL_PROGRESS, DEFAULT_SKILL_PROGRESS)
    const speakingPrompts = loadCollection<SpeakingPrompt[]>(existing, COLLECTIONS.SPEAKING_PROMPTS, seedSpeakingBank)
    setState({ userId: existing, profile, vocabulary, mistakes, skillProgress, speakingPrompts, loading: false })
  }, [])

  const persist = useCallback(<T,>(userId: string, collection: string, data: T) => {
    saveCollection(userId, collection, data)
  }, [])

  const createProfile = useCallback((input: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const userId = uid()
    const profile: UserProfile = { ...input, id: userId, createdAt: now, updatedAt: now }
    const vocabulary = buildSeedVocabulary()
    setActiveUserId(userId)
    persist(userId, COLLECTIONS.PROFILE, profile)
    persist(userId, COLLECTIONS.VOCABULARY, vocabulary)
    persist(userId, COLLECTIONS.SKILL_PROGRESS, DEFAULT_SKILL_PROGRESS)
    persist(userId, COLLECTIONS.SPEAKING_PROMPTS, seedSpeakingBank)
    setState({ userId, profile, vocabulary, mistakes: [], skillProgress: DEFAULT_SKILL_PROGRESS, speakingPrompts: seedSpeakingBank, loading: false })
  }, [persist])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setState((s) => {
      if (!s.userId || !s.profile) return s
      const updated = { ...s.profile, ...patch, updatedAt: new Date().toISOString() }
      persist(s.userId, COLLECTIONS.PROFILE, updated)
      return { ...s, profile: updated }
    })
  }, [persist])

  const setVocabulary = useCallback((items: VocabularyItem[]) => {
    setState((s) => {
      if (!s.userId) return s
      persist(s.userId, COLLECTIONS.VOCABULARY, items)
      return { ...s, vocabulary: items }
    })
  }, [persist])

  const upsertVocabularyItem = useCallback((item: VocabularyItem) => {
    setState((s) => {
      if (!s.userId) return s
      const exists = s.vocabulary.some((v) => v.id === item.id)
      const next = exists ? s.vocabulary.map((v) => (v.id === item.id ? item : v)) : [...s.vocabulary, item]
      persist(s.userId, COLLECTIONS.VOCABULARY, next)
      return { ...s, vocabulary: next }
    })
  }, [persist])

  const removeVocabularyItem = useCallback((id: string) => {
    setState((s) => {
      if (!s.userId) return s
      const next = s.vocabulary.filter((v) => v.id !== id)
      persist(s.userId, COLLECTIONS.VOCABULARY, next)
      return { ...s, vocabulary: next }
    })
  }, [persist])

  const setMistakes = useCallback((items: Mistake[]) => {
    setState((s) => {
      if (!s.userId) return s
      persist(s.userId, COLLECTIONS.MISTAKES, items)
      return { ...s, mistakes: items }
    })
  }, [persist])

  const addMistake = useCallback((m: Omit<Mistake, 'id' | 'createdAt' | 'reviewCount' | 'resolved'>) => {
    setState((s) => {
      if (!s.userId) return s
      const newMistake: Mistake = { ...m, id: uid(), createdAt: new Date().toISOString(), reviewCount: 0, resolved: false }
      const next = [...s.mistakes, newMistake]
      persist(s.userId, COLLECTIONS.MISTAKES, next)
      return { ...s, mistakes: next }
    })
  }, [persist])

  const setSkillProgress = useCallback((sp: SkillProgress[]) => {
    setState((s) => {
      if (!s.userId) return s
      persist(s.userId, COLLECTIONS.SKILL_PROGRESS, sp)
      return { ...s, skillProgress: sp }
    })
  }, [persist])

  const setSpeakingPrompts = useCallback((items: SpeakingPrompt[]) => {
    setState((s) => {
      if (!s.userId) return s
      persist(s.userId, COLLECTIONS.SPEAKING_PROMPTS, items)
      return { ...s, speakingPrompts: items }
    })
  }, [persist])

  const upsertSpeakingPrompt = useCallback((item: SpeakingPrompt) => {
    setState((s) => {
      if (!s.userId) return s
      const exists = s.speakingPrompts.some((p) => p.id === item.id)
      const next = exists ? s.speakingPrompts.map((p) => (p.id === item.id ? item : p)) : [...s.speakingPrompts, item]
      persist(s.userId, COLLECTIONS.SPEAKING_PROMPTS, next)
      return { ...s, speakingPrompts: next }
    })
  }, [persist])

  const removeSpeakingPrompt = useCallback((id: string) => {
    setState((s) => {
      if (!s.userId) return s
      const next = s.speakingPrompts.filter((p) => p.id !== id)
      persist(s.userId, COLLECTIONS.SPEAKING_PROMPTS, next)
      return { ...s, speakingPrompts: next }
    })
  }, [persist])

  const resetAllData = useCallback(() => {
    setState((s) => {
      if (!s.userId) return s
      persist(s.userId, COLLECTIONS.VOCABULARY, buildSeedVocabulary())
      persist(s.userId, COLLECTIONS.MISTAKES, [])
      persist(s.userId, COLLECTIONS.SKILL_PROGRESS, DEFAULT_SKILL_PROGRESS)
      return { ...s, vocabulary: buildSeedVocabulary(), mistakes: [], skillProgress: DEFAULT_SKILL_PROGRESS }
    })
  }, [persist])

  const value = useMemo<AppApi>(() => ({
    ...state, createProfile, updateProfile, setVocabulary, upsertVocabularyItem,
    removeVocabularyItem, setMistakes, addMistake, setSkillProgress,
    setSpeakingPrompts, upsertSpeakingPrompt, removeSpeakingPrompt, resetAllData,
  }), [state, createProfile, updateProfile, setVocabulary, upsertVocabularyItem, removeVocabularyItem, setMistakes, addMistake, setSkillProgress, setSpeakingPrompts, upsertSpeakingPrompt, removeSpeakingPrompt, resetAllData])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
