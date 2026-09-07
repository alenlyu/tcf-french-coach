import type { VocabularyItem } from '../types'

// SM-2 derived spaced-repetition scheduler.
//
// quality: 0-5 self-graded recall quality, but we accept a simpler 3-point
// UI grade ("Again" / "Good" / "Easy") and map it to an SM-2 quality score,
// because forcing users to pick 1-5 during a quick recall breaks flow.
export type RecallGrade = 'again' | 'good' | 'easy'

const GRADE_TO_QUALITY: Record<RecallGrade, number> = {
  again: 1,
  good: 4,
  easy: 5,
}

export function applyReview(item: VocabularyItem, grade: RecallGrade, responseTimeMs: number): VocabularyItem {
  const q = GRADE_TO_QUALITY[grade]
  const now = new Date()

  let { easeFactor, intervalDays, repetitions, successCount, failureCount } = item

  if (q < 3) {
    // Failure: reset repetitions, review again soon, but don't punish ease too harshly.
    repetitions = 0
    intervalDays = 1
    failureCount += 1
  } else {
    repetitions += 1
    successCount += 1
    if (repetitions === 1) intervalDays = 1
    else if (repetitions === 2) intervalDays = 3
    else intervalDays = Math.round(intervalDays * easeFactor)
  }

  // Standard SM-2 ease update, clamped so items never become impossibly sticky or loose.
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(1.3, Math.min(2.8, easeFactor))

  // Slow responses on an otherwise-correct answer suggest shaky confidence;
  // nudge the interval down slightly rather than treating it as a full pass.
  if (q >= 3 && responseTimeMs > 12000) {
    intervalDays = Math.max(1, Math.round(intervalDays * 0.75))
  }

  const nextReviewDate = new Date(now)
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

  const confidence = Math.max(0, Math.min(1, item.confidence * 0.6 + (q >= 3 ? 1 : 0) * 0.4))

  let status: VocabularyItem['status'] = item.status
  if (failureCount >= 2 && successCount < failureCount) status = 'difficult'
  else if (repetitions >= 4 && confidence > 0.75) status = 'known'
  else if (repetitions > 0) status = 'learning'

  return {
    ...item,
    easeFactor,
    intervalDays,
    repetitions,
    successCount,
    failureCount,
    confidence,
    status,
    lastReviewedAt: now.toISOString(),
    nextReviewDate: nextReviewDate.toISOString(),
  }
}

export function isDue(item: VocabularyItem, asOf: Date = new Date()): boolean {
  return new Date(item.nextReviewDate).getTime() <= asOf.getTime()
}

export function daysOverdue(item: VocabularyItem, asOf: Date = new Date()): number {
  const diffMs = asOf.getTime() - new Date(item.nextReviewDate).getTime()
  return diffMs / (1000 * 60 * 60 * 24)
}

export function newVocabularyState(): Pick<
  VocabularyItem,
  'easeFactor' | 'intervalDays' | 'repetitions' | 'nextReviewDate' | 'successCount' | 'failureCount' | 'confidence' | 'status'
> {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(), // due immediately
    successCount: 0,
    failureCount: 0,
    confidence: 0,
    status: 'new',
  }
}
