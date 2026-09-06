import type { Mistake, Skill, SkillProgress, UserProfile, VocabularyItem } from '../types'
import { daysOverdue, isDue } from './spacedRepetition'

// The Adaptive Learning Engine.
//
// Rather than a fixed lesson order, every candidate activity (a vocabulary
// review, a mistake to revisit, or a skill practice slot) is scored, and the
// highest-scoring items are queued first. This directly implements the
// product's "what should I practice right now" model instead of "what
// lesson comes next".
//
// priority = examRelevance x weakness x forgettingRisk x targetGap x recencyPenalty

const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 }

export function levelGap(current: string, target: string): number {
  return Math.max(0, LEVEL_ORDER[target] - LEVEL_ORDER[current])
}

export interface ScoredVocab {
  item: VocabularyItem
  score: number
  reason: string
}

export function scoreVocabulary(items: VocabularyItem[], asOf: Date = new Date()): ScoredVocab[] {
  return items
    .map((item) => {
      const due = isDue(item, asOf)
      if (!due) return { item, score: 0, reason: 'not due' }

      const overdue = Math.max(0, daysOverdue(item, asOf))
      const forgettingRisk = 1 + Math.min(3, overdue / 3) // grows with how overdue it is, capped
      const weakness = item.status === 'difficult' ? 1.6 : item.status === 'new' ? 1.3 : 1.0
      const examRelevance = item.tcfRelevance ? 1.3 : 1.0
      const confidencePenalty = 1 + (1 - item.confidence) * 0.5

      const score = forgettingRisk * weakness * examRelevance * confidencePenalty
      const reason = item.status === 'difficult'
        ? 'previously difficult, due for review'
        : item.status === 'new'
        ? 'new word, first review'
        : overdue > 1
        ? `overdue by ${Math.round(overdue)} day(s)`
        : 'due today'

      return { item, score, reason }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
}

export interface ScoredMistake {
  mistake: Mistake
  score: number
}

export function scoreMistakes(mistakes: Mistake[], asOf: Date = new Date()): ScoredMistake[] {
  return mistakes
    .filter((m) => !m.resolved && new Date(m.nextReviewDate).getTime() <= asOf.getTime())
    .map((m) => {
      const overdue = Math.max(0, (asOf.getTime() - new Date(m.nextReviewDate).getTime()) / 86400000)
      const score = (1 + Math.min(2, overdue / 5)) * (1 + m.reviewCount * 0.1)
      return { mistake: m, score }
    })
    .sort((a, b) => b.score - a.score)
}

export interface SkillPriority {
  skill: Skill
  score: number
  reason: string
}

// Ranks the four TCF skills (excluding raw vocabulary, handled separately)
// by how urgently the learner should practice them today.
export function scoreSkills(profile: UserProfile, progress: SkillProgress[]): SkillPriority[] {
  const skills: Skill[] = ['listening', 'reading', 'writing', 'speaking']

  const daysUntilExam = profile.examDate
    ? Math.max(1, Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / 86400000))
    : 180
  const urgencyMultiplier = daysUntilExam < 14 ? 1.5 : daysUntilExam < 45 ? 1.2 : 1.0

  return skills
    .map((skill) => {
      const target = profile.targetLevels[skill as keyof typeof profile.targetLevels]
      const current = profile.currentLevels[skill as keyof typeof profile.currentLevels]
      const gap = levelGap(current, target)
      const p = progress.find((sp) => sp.skill === skill)
      const accuracy = p?.accuracyRolling ?? 0.5
      const weakness = 1 - accuracy // lower accuracy => higher priority
      const score = (1 + gap * 0.5) * (1 + weakness) * urgencyMultiplier
      const reason = gap > 0 && accuracy < 0.6
        ? 'below target level and low recent accuracy'
        : gap > 0
        ? 'below target level'
        : accuracy < 0.6
        ? 'recent accuracy is low'
        : 'on track'
      return { skill, score, reason }
    })
    .sort((a, b) => b.score - a.score)
}
