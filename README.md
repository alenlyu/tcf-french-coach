# TCF French Coach

A personal, mobile-first French training app built around TCF Canada prep — designed to replace the "open phone, scroll social media" reflex with a short, adaptive French session.

Open the app → see today's activity → start learning in seconds. No menu-browsing required.

## What's actually implemented (and what isn't)

This is a real, working app, not a mockup — every button below does what it says. It covers the highest-leverage core of the original spec. It is **not** a claim of 100% feature parity with every one of the 56 requested sections (full mock exams, AI-scored pronunciation, a large seeded question bank, native app-store PWA icons beyond the placeholders here). Those are called out as roadmap items so you're not surprised later.

**Working end-to-end:**
- Local, namespaced user profile (per-skill current/target CEFR levels, exam date, daily goal, interests)
- Personal vocabulary bank with full metadata (IPA, gender, example sentence, tags, TCF relevance)
- Real spaced repetition (SM-2 derived — see `src/learning/spacedRepetition.ts`) with retrieval-practice-first review
- Mistake bank: mistakes are logged automatically from wrong answers during a session, and can be added manually; they resurface for review and can be resolved
- Adaptive session builder ("Adaptive Learning Engine", `src/learning/priorityEngine.ts` + `sessionBuilder.ts`) that scores vocabulary, mistakes, and the four TCF skills by exam relevance, forgetting risk, and current weakness, then interleaves them into a session sized to your chosen minutes (5 / 15 / 30 / custom)
- Real audio recording for speaking practice: record, stop, play, delete, re-record, **multiple attempts kept side by side** (`src/components/SpeakingRecorder.tsx`, `src/audio/`)
- Listening exercises using the browser's speech synthesis (Web Speech API) instead of pre-recorded audio files — this keeps the app static-hosting-friendly with zero audio asset pipeline
- Reading, writing (with word count and submit), and speaking practice modules with seed TCF-style content
- AI conversation UI (7 modes: casual, TCF simulation, debate, job interview, daily life, storytelling, opinion) with speech-to-text input (Web Speech API) and text-to-speech playback of responses, wired to a **pluggable, key-free AI proxy** — see below
- AI writing/speaking feedback requests, clearly labeled "estimated practice assessment," never as an official TCF score
- Progress dashboard, streak-free but visible skill progress bars, export/import of all local data as JSON, and a full reset option
- Offline-first for everything except AI conversation/feedback: the PWA shell, vocabulary, mistakes, sessions, and recordings all work with no network
- Installable PWA (manifest + service worker via `vite-plugin-pwa`)

**Scaffolded but intentionally thin (extend before relying on it for real exam prep):**
- Exercise banks (`src/data/seedExercises.ts`) contain a handful of realistic items per skill to prove the pipeline, not the ~39-question TCF section sizes. Add more, or generate them with the AI service.
- No dedicated full "Mock Exam" timer/report screen yet — the session player and per-skill practice pages cover the same underlying mechanics (timed writing, timed speaking with prep/response windows, listening/reading with instant feedback) but aren't assembled into one continuous 4-section exam simulation.
- Speaking/writing AI scoring returns a single free-text assessment from the model, not a structured multi-dimension rubric (fluency/coherence/vocabulary range as separate numeric scores).

## Architecture

```
src/
  types/          Shared TypeScript data model (UserProfile, VocabularyItem, Mistake,
                   exercises, sessions, skill progress, conversations, etc.)
  data/            localStorage namespace layer + seed vocabulary/exercises
  learning/        Spaced repetition (SM-2), priority scoring, adaptive session builder
  services/        AI abstraction layer (calls your proxy, never holds a key)
  audio/           MediaRecorder hook + IndexedDB blob store for recordings
  store/           React context wrapping all persistence (per-profile data isolation)
  components/      Shared UI (bottom nav, speaking recorder)
  pages/           Onboarding, Home, Vocabulary, Mistakes, Speaking, Session, Progress,
                   Settings, Conversation
  styles/          Design tokens (warm/calm palette) and layout CSS
proxy-examples/
  cloudflare-worker.js   Reference secure AI proxy (see "AI configuration" below)
```

**Data isolation:** every collection is stored under `tcf:<userId>:<collection>` in `localStorage`, and audio blobs are keyed the same way in IndexedDB. Switching profiles (Settings → "Switch profile") never leaks one learner's words/mistakes/recordings into another's. Swapping this for a real backend later means replacing `src/data/localStore.ts`'s load/save functions with API calls — nothing else in the app needs to change, because every page goes through `useApp()` in `src/store/AppContext.tsx`.

**Why localStorage + IndexedDB, not just IndexedDB:** the structured collections (profile, vocab list, mistakes, sessions, skill progress) are read and written as whole small JSON blobs, which is simpler and fast enough via localStorage. Only the binary audio recordings use IndexedDB, since localStorage can't efficiently hold Blobs.

## Local development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks with tsc, then builds to dist/
npm run preview   # serve the production build locally
```

This project has been installed and built successfully with Node/npm during development (Vite 5, React 18, TypeScript 5).

## Deploying to GitHub Pages

1. Push this project to a GitHub repository.
2. In `vite.config.ts`, confirm `base: '/your-repo-name/'` matches your repository name (already set to `/tcf-french-coach/` — change it if you rename the repo).
3. Add a GitHub Actions workflow (or use the `gh-pages` npm package) to build and publish `dist/`. Minimal example workflow (`.github/workflows/deploy.yml`):

   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20 }
         - run: npm install
         - run: npm run build
           env:
             VITE_AI_PROXY_URL: ${{ vars.VITE_AI_PROXY_URL }}
         - uses: actions/upload-pages-artifact@v3
           with: { path: dist }
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
4. Enable GitHub Pages in the repo settings, source: "GitHub Actions."
5. The app uses `HashRouter`, so it works correctly on GitHub Pages without any server-side rewrite rules.

## AI configuration (secure proxy — no keys in the frontend)

The frontend **never** contains an API key. `src/services/aiService.ts` reads `VITE_AI_PROXY_URL` from the build environment and POSTs `{ messages: [...] }` to it. If that variable is unset, or the proxy is unreachable, AI Conversation and AI feedback clearly report "AI conversation requires an internet connection" / "not configured" — every other feature keeps working.

To enable AI features:

1. Deploy `proxy-examples/cloudflare-worker.js` (or adapt it for Vercel/Netlify Functions) to a serverless platform.
2. Store your real Anthropic (or OpenAI-compatible) API key as a **secret** on that platform — e.g. `wrangler secret put ANTHROPIC_API_KEY` — never in this repo, never in a `.env` that gets committed.
3. Set `VITE_AI_PROXY_URL` to your deployed proxy's URL, either in a local `.env` file (already gitignored) for `npm run dev`, or as a repository variable consumed by your GitHub Actions build step (see the workflow above).

## PWA installation

After deploying (or running `npm run build && npm run preview`), open the site on a phone and use "Add to Home Screen" (iOS Safari) or the install prompt (Android Chrome). The app shell, vocabulary, mistakes, sessions, and recordings all continue working offline; only AI Conversation and AI feedback require connectivity.

## Data storage & privacy

Your learning data is stored only in your browser: `localStorage` for profile/vocabulary/mistakes/sessions/progress, and `IndexedDB` for speaking recordings. Nothing is uploaded anywhere unless you use AI Conversation or request AI feedback, in which case only the text of that specific request is sent to your configured proxy — never your full vocabulary bank, mistake history, or recordings. Use Settings → Export to back up your data as JSON, or Import to restore it. Settings → Reset clears vocabulary/mistakes/progress (keeping your profile); "Switch profile" starts a fresh, isolated learner namespace.

## Extending the project

- **Grow the exercise banks:** add more entries to `src/data/seedExercises.ts`, or build an AI-generation flow using `src/services/aiService.ts` as a starting point — the data model (`ExerciseBase` and its variants in `src/types/index.ts`) is already generic enough to hold AI-authored content.
- **Add a full Mock Exam mode:** compose the existing per-skill practice screens (`Speaking.tsx`, and the `listening`/`reading`/`writing` cases in `Session.tsx`) into one continuous timed flow with a final report screen; the skill-progress and mistake-tracking plumbing they call is already exam-ready.
- **Move to a real backend:** replace the functions in `src/data/localStore.ts` with authenticated API calls; `src/store/AppContext.tsx` is the only other file that touches persistence, so the rest of the app is unaffected.
