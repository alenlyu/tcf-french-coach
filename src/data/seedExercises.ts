import type { ListeningExercise, ReadingExercise, SpeakingPrompt, WritingPrompt } from '../types'

// Seed content demonstrating the exercise data model end to end.
// This is intentionally a small, realistic bank per skill — enough to
// exercise the adaptive session builder and UI — NOT a claim of complete
// TCF question coverage. Extend these arrays (or wire in AI generation
// via services/aiService.ts) to grow the bank.

export const listeningBank: ListeningExercise[] = [
  {
    id: 'lst-1', skill: 'listening', level: 'B1', tcfRelevance: true, topic: 'jobs', difficulty: 2, tags: ['work'],
    spokenText: "Bonjour, je vous appelle au sujet de votre candidature pour le poste de comptable. Seriez-vous disponible pour un entretien jeudi matin ?",
    question: "Pourquoi la personne appelle-t-elle ?",
    options: ["Pour proposer un entretien", "Pour annuler un rendez-vous", "Pour demander un remboursement", "Pour vendre un produit"],
    correctOptionIndex: 0,
    explanation: "La personne propose explicitement un entretien pour jeudi matin.",
  },
  {
    id: 'lst-2', skill: 'listening', level: 'A2', tcfRelevance: true, topic: 'daily life', difficulty: 1, tags: ['transport'],
    spokenText: "Attention, le train à destination de Montréal partira du quai 4 au lieu du quai 2, en raison de travaux.",
    question: "Qu'est-ce qui a changé ?",
    options: ["L'heure de départ", "Le quai de départ", "La destination du train", "Le prix du billet"],
    correctOptionIndex: 1,
    explanation: "Le quai a changé, passant du quai 2 au quai 4.",
  },
  {
    id: 'lst-3', skill: 'listening', level: 'B2', tcfRelevance: true, topic: 'Canadian life', difficulty: 3, tags: ['housing'],
    spokenText: "Le propriétaire nous informe qu'il ne renouvellera pas le bail, et qu'un préavis de deux mois s'applique à partir d'aujourd'hui.",
    question: "Quelle est la conséquence pour les locataires ?",
    options: ["Ils doivent partir dans deux mois", "Le loyer va augmenter", "Ils doivent signer un nouveau bail", "Le propriétaire vend l'appartement"],
    correctOptionIndex: 0,
    explanation: "Un préavis de deux mois signifie qu'ils devront quitter le logement dans ce délai.",
  },
]

export const readingBank: ReadingExercise[] = [
  {
    id: 'rd-1', skill: 'reading', level: 'B1', tcfRelevance: true, topic: 'jobs', difficulty: 2, tags: ['work'],
    passage: "De plus en plus d'entreprises proposent désormais le télétravail à leurs employés. Si cette pratique offre plus de flexibilité, elle exige aussi une grande discipline personnelle pour rester productif.",
    question: "Selon le texte, le télétravail exige surtout :",
    options: ["Un grand bureau", "Une discipline personnelle", "Un salaire plus élevé", "Un diplôme spécifique"],
    correctOptionIndex: 1,
    explanation: "Le texte indique que le télétravail 'exige aussi une grande discipline personnelle'.",
  },
  {
    id: 'rd-2', skill: 'reading', level: 'B2', tcfRelevance: true, topic: 'Canadian life', difficulty: 3, tags: ['immigration'],
    passage: "Pour obtenir la résidence permanente au Canada, plusieurs voies existent, dont le système Entrée express, qui classe les candidats selon un ensemble de critères comme l'âge, la formation et l'expérience professionnelle.",
    question: "Le système Entrée express classe les candidats en fonction :",
    options: ["Uniquement de leur âge", "D'un tirage au sort", "D'un ensemble de critères", "De leur nationalité"],
    correctOptionIndex: 2,
    explanation: "Le texte précise que le classement se fait 'selon un ensemble de critères' (âge, formation, expérience).",
  },
]

export const speakingBank: SpeakingPrompt[] = [
  {
    id: 'spk-1', skill: 'speaking', level: 'A2', tcfRelevance: true, topic: 'daily life', difficulty: 1, tags: [],
    taskNumber: 1, prompt: "Présentez-vous : votre nom, votre travail ou vos études, et vos loisirs.",
    prepSeconds: 30, responseSeconds: 60,
  },
  {
    id: 'spk-2', skill: 'speaking', level: 'B1', tcfRelevance: true, topic: 'jobs', difficulty: 2, tags: ['work'],
    taskNumber: 2, prompt: "Vous cherchez un logement près de votre travail. Posez des questions à un agent immobilier.",
    prepSeconds: 30, responseSeconds: 120,
  },
  {
    id: 'spk-3', skill: 'speaking', level: 'B2', tcfRelevance: true, topic: 'opinion', difficulty: 3, tags: ['debate'],
    taskNumber: 3, prompt: "Êtes-vous d'accord avec l'idée que le télétravail devrait devenir la norme ? Justifiez votre opinion avec des arguments.",
    prepSeconds: 60, responseSeconds: 180,
  },
]

export const writingBank: WritingPrompt[] = [
  {
    id: 'wr-1', skill: 'writing', level: 'A2', tcfRelevance: true, topic: 'daily life', difficulty: 1, tags: [],
    taskNumber: 1, prompt: "Écrivez un message à un ami pour l'inviter à votre nouvel appartement.",
    minWords: 60, suggestedMinutes: 10,
  },
  {
    id: 'wr-2', skill: 'writing', level: 'B1', tcfRelevance: true, topic: 'jobs', difficulty: 2, tags: ['work'],
    taskNumber: 2, prompt: "Racontez une expérience professionnelle marquante et expliquez ce qu'elle vous a appris.",
    minWords: 120, suggestedMinutes: 20,
  },
  {
    id: 'wr-3', skill: 'writing', level: 'B2', tcfRelevance: true, topic: 'opinion', difficulty: 3, tags: ['debate'],
    taskNumber: 3, prompt: "Certains pensent que l'intelligence artificielle menace l'emploi. Discutez de cette affirmation en présentant des arguments pour et contre.",
    minWords: 180, suggestedMinutes: 30,
  },
]
