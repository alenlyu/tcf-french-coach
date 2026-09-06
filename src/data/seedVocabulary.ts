import type { VocabularyItem } from '../types'
import { newVocabularyState } from '../learning/spacedRepetition'

// A realistic starter set of TCF-relevant vocabulary across common topics
// (work/immigration, daily life, opinion connectors). Real deployments
// should let users import larger lists (see Settings > Import) or grow
// this organically as words are added from lessons/conversations.
interface SeedWord {
  word: string; translation: string; partOfSpeech: string; gender?: 'm' | 'f' | 'm/f' | null
  ipa?: string; exampleSentence: string; exampleTranslation?: string; tags: string[]
  topic: string; difficulty: VocabularyItem['difficulty']; tcfRelevance: boolean
}

const SEED: SeedWord[] = [
  { word: 'pourtant', translation: 'however / yet', partOfSpeech: 'adverb', ipa: '/puʁ.tɑ̃/', exampleSentence: "Il pleut, pourtant je vais sortir.", exampleTranslation: "It's raining, yet I'm going out.", tags: ['connector', 'opinion'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'embaucher', translation: 'to hire', partOfSpeech: 'verb', ipa: '/ɑ̃.boʃe/', exampleSentence: "L'entreprise va embaucher dix personnes.", tags: ['work'], topic: 'jobs', difficulty: 'B1', tcfRelevance: true },
  { word: 'un entretien', translation: 'an interview', partOfSpeech: 'noun', gender: 'm', exampleSentence: "J'ai un entretien d'embauche demain.", tags: ['work'], topic: 'jobs', difficulty: 'A2', tcfRelevance: true },
  { word: 'un poste', translation: 'a position/job', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Ce poste m'intéresse beaucoup.", tags: ['work'], topic: 'jobs', difficulty: 'A2', tcfRelevance: true },
  { word: 'une candidature', translation: 'an application', partOfSpeech: 'noun', gender: 'f', exampleSentence: "J'ai envoyé ma candidature hier.", tags: ['work'], topic: 'jobs', difficulty: 'B1', tcfRelevance: true },
  { word: 'postuler', translation: 'to apply (for a job)', partOfSpeech: 'verb', exampleSentence: "Je vais postuler à ce poste.", tags: ['work'], topic: 'jobs', difficulty: 'B1', tcfRelevance: true },
  { word: 'néanmoins', translation: 'nevertheless', partOfSpeech: 'adverb', exampleSentence: "Le projet est risqué ; néanmoins, je le soutiens.", tags: ['connector', 'opinion', 'formal'], topic: 'daily life', difficulty: 'B2', tcfRelevance: true },
  { word: 'un aménagement', translation: 'an arrangement / adjustment', partOfSpeech: 'noun', gender: 'm', exampleSentence: "L'entreprise propose un aménagement du temps de travail.", tags: ['work'], topic: 'jobs', difficulty: 'B2', tcfRelevance: true },
  { word: 'se débrouiller', translation: 'to manage / get by', partOfSpeech: 'verb', exampleSentence: "Ne t'inquiète pas, je vais me débrouiller.", tags: ['idiom'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un déménagement', translation: 'a move (of home)', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Le déménagement est prévu pour le mois prochain.", tags: ['housing'], topic: 'Canadian life', difficulty: 'A2', tcfRelevance: true },
  { word: 'un bail', translation: 'a lease', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Nous avons signé le bail hier.", tags: ['housing'], topic: 'Canadian life', difficulty: 'B1', tcfRelevance: true },
  { word: 'la citoyenneté', translation: 'citizenship', partOfSpeech: 'noun', gender: 'f', exampleSentence: "Elle a obtenu la citoyenneté canadienne.", tags: ['immigration'], topic: 'immigration', difficulty: 'B1', tcfRelevance: true },
  { word: 'un permis de travail', translation: 'a work permit', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Il faut renouveler mon permis de travail.", tags: ['immigration'], topic: 'immigration', difficulty: 'B1', tcfRelevance: true },
  { word: 'au fur et à mesure', translation: 'gradually / as one goes', partOfSpeech: 'phrase', exampleSentence: "Je comprends mieux au fur et à mesure que j'apprends.", tags: ['idiom', 'advanced'], topic: 'daily life', difficulty: 'C1', tcfRelevance: true },
  { word: 'un contretemps', translation: 'a setback / hitch', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Un contretemps a retardé la réunion.", tags: ['formal'], topic: 'work', difficulty: 'C1', tcfRelevance: true },
  { word: 'convivial(e)', translation: 'friendly / welcoming', partOfSpeech: 'adjective', exampleSentence: "L'ambiance ici est très conviviale.", tags: ['adjective'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un aléa', translation: 'a hazard / unforeseen event', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Il faut prévoir les aléas du quotidien.", tags: ['formal', 'advanced'], topic: 'daily life', difficulty: 'C1', tcfRelevance: true },
  { word: 'à mon avis', translation: 'in my opinion', partOfSpeech: 'phrase', exampleSentence: "À mon avis, cette solution est la meilleure.", tags: ['opinion', 'connector'], topic: 'daily life', difficulty: 'A2', tcfRelevance: true },
  { word: 'en revanche', translation: 'on the other hand', partOfSpeech: 'phrase', exampleSentence: "Le loyer est élevé ; en revanche, l'appartement est spacieux.", tags: ['connector', 'opinion'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un préavis', translation: 'a notice (period)', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Le préavis de départ est d'un mois.", tags: ['housing', 'work'], topic: 'Canadian life', difficulty: 'B2', tcfRelevance: true },
  { word: 'une ordonnance', translation: 'a prescription', partOfSpeech: 'noun', gender: 'f', exampleSentence: "Le médecin m'a donné une ordonnance.", tags: ['health'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un rendez-vous', translation: 'an appointment', partOfSpeech: 'noun', gender: 'm', exampleSentence: "J'ai un rendez-vous chez le dentiste.", tags: ['health'], topic: 'daily life', difficulty: 'A1', tcfRelevance: true },
  { word: 'un remboursement', translation: 'a reimbursement/refund', partOfSpeech: 'noun', gender: 'm', exampleSentence: "J'attends le remboursement de mes frais médicaux.", tags: ['health', 'money'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un imprévu', translation: 'an unexpected event', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Un imprévu m'a empêché de venir.", tags: ['formal'], topic: 'daily life', difficulty: 'B2', tcfRelevance: true },
  { word: 'se soucier de', translation: 'to worry about / care about', partOfSpeech: 'verb', exampleSentence: "Il se soucie beaucoup de son avenir.", tags: ['idiom'], topic: 'daily life', difficulty: 'B2', tcfRelevance: true },
  { word: 'un atout', translation: 'an asset / advantage', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Parler deux langues est un atout sur le marché du travail.", tags: ['work'], topic: 'jobs', difficulty: 'B2', tcfRelevance: true },
  { word: 'faire face à', translation: 'to cope with / face', partOfSpeech: 'phrase', exampleSentence: "Il faut faire face à cette situation.", tags: ['idiom'], topic: 'daily life', difficulty: 'B1', tcfRelevance: true },
  { word: 'un aperçu', translation: 'an overview / glimpse', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Cet article donne un bon aperçu du sujet.", tags: ['formal'], topic: 'university', difficulty: 'B2', tcfRelevance: true },
  { word: 'un cursus', translation: 'a course of study / curriculum', partOfSpeech: 'noun', gender: 'm', exampleSentence: "Mon cursus universitaire dure trois ans.", tags: ['education'], topic: 'university', difficulty: 'B1', tcfRelevance: true },
  { word: 'une bourse', translation: 'a scholarship / grant', partOfSpeech: 'noun', gender: 'f', exampleSentence: "Elle a obtenu une bourse d'études.", tags: ['education', 'money'], topic: 'university', difficulty: 'B1', tcfRelevance: true },
]

export function buildSeedVocabulary(): VocabularyItem[] {
  const now = new Date().toISOString()
  return SEED.map((s, i) => ({
    id: `seed-vocab-${i}`,
    word: s.word,
    translation: s.translation,
    partOfSpeech: s.partOfSpeech,
    gender: s.gender ?? null,
    ipa: s.ipa,
    exampleSentence: s.exampleSentence,
    exampleTranslation: s.exampleTranslation,
    tags: s.tags,
    topic: s.topic,
    difficulty: s.difficulty,
    tcfRelevance: s.tcfRelevance,
    createdAt: now,
    ...newVocabularyState(),
  }))
}
