import type {
  ActivityType, ListeningExercise, Mistake, ReadingExercise, Skill, SkillProgress,
  SpeakingPrompt, StudySessionActivity, UserProfile, VocabularyItem, WritingPrompt,
} from '../types'
import { scoreMistakes, scoreSkills, scoreVocabulary } from './priorityEngine'

// Approximate seconds a well-designed instance of each activity takes.
// These are used to fit a session inside the user's chosen time budget,
// not to enforce a hard timer on the activity itself.
const ACTIVITY_DURATION: Record<ActivityType, number> = {
  vocab_recall: 25,
  listening: 70,
  reading: 90,
  speaking: 150,
  writing: 240,
  mistake_review: 35,
  ai_conversation: 180,
}

export interface SessionBuildInputs {
  profile: UserProfile
  vocabulary: VocabularyItem[]
  mistakes: Mistake[]
  skillProgress: SkillProgress[]
  listeningBank: ListeningExercise[]
  readingBank: ReadingExercise[]
  speakingBank: SpeakingPrompt[]
  writingBank: WritingPrompt[]
  minutes: number
}

export interface BuiltActivity extends StudySessionActivity {
  label: string
}

// Builds an interleaved queue of activities that fits within `minutes`,
// prioritizing overdue vocabulary, unresolved mistakes, and the weakest
// skill(s) per the priority engine — this is what section 9/23 call the
// "feed" and the "adaptive learning engine".
export function buildSession(inputs: SessionBuildInputs): BuiltActivity[] {
  const budgetSeconds = Math.max(60, inputs.minutes * 60)
  const activities: BuiltActivity[] = []
  let used = 0

  const skillOrder = scoreSkills(inputs.profile, inputs.skillProgress)
  const dueVocab = scoreVocabulary(inputs.vocabulary)
  const dueMistakes = scoreMistakes(inputs.mistakes)

  // Always open with retrieval practice on the most at-risk word, if any is due —
  // this is the "word of the morning" moment.
  let vocabIdx = 0
  let mistakeIdx = 0
  const skillBanks: Record<string, any[]> = {
    listening: [...inputs.listeningBank],
    reading: [...inputs.readingBank],
    speaking: [...inputs.speakingBank],
    writing: [...inputs.writingBank],
  }
  const skillBankIdx: Record<string, number> = { listening: 0, reading: 0, speaking: 0, writing: 0 }

  function pushVocab(): boolean {
    if (vocabIdx >= dueVocab.length) return false
    const v = dueVocab[vocabIdx++]
    activities.push({
      type: 'vocab_recall', refId: v.item.id, estimatedSeconds: ACTIVITY_DURATION.vocab_recall,
      completed: false, label: `Recall: ${v.item.word}`,
    })
    return true
  }
  function pushMistake(): boolean {
    if (mistakeIdx >= dueMistakes.length) return false
    const m = dueMistakes[mistakeIdx++]
    activities.push({
      type: 'mistake_review', refId: m.mistake.id, estimatedSeconds: ACTIVITY_DURATION.mistake_review,
      completed: false, label: `Fix: ${m.mistake.category}`,
    })
    return true
  }
  function pushSkill(skill: Skill): boolean {
    const bank = skillBanks[skill]
    if (!bank || skillBankIdx[skill] >= bank.length) return false
    const ex = bank[skillBankIdx[skill]++]
    const type: ActivityType = skill as ActivityType
    activities.push({
      type, refId: ex.id, estimatedSeconds: ACTIVITY_DURATION[type], completed: false,
      label: `${skill[0].toUpperCase()}${skill.slice(1)}: ${ex.topic}`,
    })
    return true
  }

  // Very short sessions (<=7 min): a tight, high-value burst per section 43.
  if (inputs.minutes <= 7) {
    const plan: Array<() => boolean> = [pushVocab, () => pushSkill('listening'), () => pushSkill('speaking'), pushMistake]
    for (const step of plan) {
      const before = activities.length
      step()
      if (activities.length > before) used += activities[activities.length - 1].estimatedSeconds
      if (used >= budgetSeconds) break
    }
    return activities
  }

  // Otherwise, interleave: 1 vocab, then rotate through weakest skills first,
  // sprinkling in mistake review, until the time budget is spent.
  let cycle = 0
  while (used < budgetSeconds) {
    const before = activities.length

    if (cycle % 3 === 0) {
      pushVocab()
    } else if (cycle % 5 === 4 && dueMistakes.length > 0) {
      pushMistake()
    } else {
      const skill = skillOrder[cycle % skillOrder.length]?.skill
      if (skill) pushSkill(skill)
    }

    if (activities.length === before) {
      // Nothing left to add on this branch; try any remaining source so we
      // don't infinite-loop when one bank is exhausted.
      const any = pushVocab() || pushMistake() ||
        pushSkill('listening') || pushSkill('reading') || pushSkill('speaking') || pushSkill('writing')
      if (!any) break // truly nothing left to schedule
    }

    used = activities.reduce((sum, a) => sum + a.estimatedSeconds, 0)
    cycle++
    if (activities.length > 200) break // safety valve
  }

  // Trim any overshoot from the last added item if we blew well past budget.
  while (activities.length > 1 && activities.reduce((s, a) => s + a.estimatedSeconds, 0) > budgetSeconds * 1.25) {
    activities.pop()
  }

  return activities
}
