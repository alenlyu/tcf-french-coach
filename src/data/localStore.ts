// Lightweight localStorage-backed persistence, namespaced per user profile.
//
// Why localStorage (not IndexedDB) for these collections: they are small
// JSON collections (profile, vocab list, mistakes, sessions, progress) that
// are read/written as a whole on every mutation. IndexedDB is reserved for
// large binary data (audio recordings) in audio/recordingStore.ts.
//
// Everything is keyed under `tcf:<userId>:<collection>` so multiple local
// learner profiles never see each other's data. This mirrors the eventual
// backend shape (one row per user per collection) so swapping localStorage
// for real API calls later only touches this file.

const ACTIVE_USER_KEY = 'tcf:activeUserId'

export function getActiveUserId(): string | null {
  return localStorage.getItem(ACTIVE_USER_KEY)
}

export function setActiveUserId(id: string) {
  localStorage.setItem(ACTIVE_USER_KEY, id)
}

export function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY)
}

function nsKey(userId: string, collection: string): string {
  return `tcf:${userId}:${collection}`
}

export function loadCollection<T>(userId: string, collection: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(nsKey(userId, collection))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`Failed to load ${collection} for ${userId}:`, err)
    return fallback
  }
}

export function saveCollection<T>(userId: string, collection: string, data: T): boolean {
  try {
    localStorage.setItem(nsKey(userId, collection), JSON.stringify(data))
    return true
  } catch (err) {
    // Likely a quota error. Surface it; do not silently drop user data.
    console.error(`Failed to save ${collection} for ${userId}:`, err)
    return false
  }
}

export function deleteUserData(userId: string, collections: string[]) {
  for (const c of collections) {
    localStorage.removeItem(nsKey(userId, c))
  }
}

export function exportUserData(userId: string, collections: string[]): string {
  const dump: Record<string, unknown> = { exportedAt: new Date().toISOString(), userId }
  for (const c of collections) {
    dump[c] = loadCollection(userId, c, null)
  }
  return JSON.stringify(dump, null, 2)
}

export function importUserData(userId: string, json: string, collections: string[]): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json)
    for (const c of collections) {
      if (c in parsed) {
        saveCollection(userId, c, parsed[c])
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export const COLLECTIONS = {
  PROFILE: 'profile',
  VOCABULARY: 'vocabulary',
  MISTAKES: 'mistakes',
  SESSIONS: 'sessions',
  SKILL_PROGRESS: 'skillProgress',
  WRITING_SUBMISSIONS: 'writingSubmissions',
  EXERCISE_ATTEMPTS: 'exerciseAttempts',
  RECORDINGS_META: 'recordingsMeta',
  CONVERSATIONS: 'conversations',
  SPEAKING_PROMPTS: 'speakingPrompts',
} as const
