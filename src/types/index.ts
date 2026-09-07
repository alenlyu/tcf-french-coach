// ---- Shared enums ----
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Skill = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary'
export type ActivityType =
  | 'vocab_recall'
  | 'listening'
  | 'reading'
  | 'speaking'
  | 'writing'
  | 'mistake_review'
  | 'ai_conversation'

// ---- User profile ----
export interface SkillTargets {
  listening: CEFRLevel
  reading: CEFRLevel
  writing: CEFRLevel
  speaking: CEFRLevel
}

export interface UserProfile {
  id: string
  name: string
  nativeLanguage: string
  currentLevels: SkillTargets
  targetLevels: SkillTargets
  targetTcfOverall?: CEFRLevel
  examDate?: string // ISO date
  dailyGoalMinutes: number
  interests: string[]
  difficultTopics: string[]
  createdAt: string
  updatedAt: string
}

// ---- Vocabulary ----
export interface VocabularyItem {
  id: string
  word: string
  translation: string
  partOfSpeech: string
  gender?: 'm' | 'f' | 'm/f' | null
  ipa?: string
  exampleSentence: string
  exampleTranslation?: string
  tags: string[]
  topic?: string
  difficulty: CEFRLevel
  tcfRelevance: boolean
  personalNotes?: string
  createdAt: string

  // spaced repetition state (SM-2 derived)
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewDate: string
  lastReviewedAt?: string
  successCount: number
  failureCount: number
  confidence: number
  status: 'new' | 'learning' | 'known' | 'difficult'
}

// ---- Mistakes ----
export type MistakeCategory =
  | 'vocabulary' | 'grammar' | 'pronunciation' | 'spelling'
  | 'word_order' | 'listening' | 'reading' | 'speaking' | 'writing'

export interface Mistake {
  id: string
  category: MistakeCategory
  originalAnswer: string
  correctAnswer: string
  explanation: string
  example?: string
  sourceActivity: ActivityType
  createdAt: string
  nextReviewDate: string
  reviewCount: number
  resolved: boolean
}

// ---- Exercises ----
export interface ExerciseBase {
  id: string
  skill: Skill
  level: CEFRLevel
  tcfRelevance: boolean
  topic: string
  difficulty: number
  tags: string[]
}

export interface ListeningExercise extends ExerciseBase {
  skill: 'listening'
  spokenText: string
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export interface ReadingExercise extends ExerciseBase {
  skill: 'reading'
  passage: string
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export interface WritingPrompt extends ExerciseBase {
  skill: 'writing'
  prompt: string
  minWords: number
  suggestedMinutes: number
  taskNumber: 1 | 2 | 3
}

export interface SpeakingPrompt extends ExerciseBase {
  skill: 'speaking'
  prompt: string
  prepSeconds: number
  responseSeconds: number
  taskNumber: 1 | 2 | 3
}

// ---- Attempts / sessions ----
export interface ExerciseAttempt {
  id: string
  exerciseId: string
  skill: Skill
  correct?: boolean
  responseTimeMs?: number
  createdAt: string
  notes?: string
}

export interface SpeakingRecordingMeta {
  id: string
  promptId: string
  attemptNumber: number
  durationSeconds: number
  createdAt: string
  blobKey: string
}

export interface WritingSubmission {
  id: string
  promptId: string
  draft: string
  wordCount: number
  submittedAt?: string
  createdAt: string
  aiFeedback?: string
}

export interface StudySessionActivity {
  type: ActivityType
  refId: string
  estimatedSeconds: number
  completed: boolean
}

export interface StudySession {
  id: string
  date: string
  goalMinutes: number
  activities: StudySessionActivity[]
  startedAt?: string
  completedAt?: string
  actualSeconds: number
}

export interface SkillProgress {
  skill: Skill
  estimatedLevel: CEFRLevel
  accuracyRolling: number
  lastUpdated: string
  history: { date: string; accuracy: number }[]
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  correction?: string
}

export interface Conversation {
  id: string
  mode: 'casual' | 'tcf_simulation' | 'debate' | 'job_interview' | 'daily_life' | 'storytelling' | 'opinion'
  messages: ConversationMessage[]
  createdAt: string
  updatedAt: string
}
