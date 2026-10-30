# UPDA Gym

An offline iPhone study app for the Qatar UPDA engineer qualification exam (Architecture). The questions come from your own past exam papers and live **only on your phone**: this public repository contains the app and 5 sample questions, never the exam questions.

**Live app:** <https://lilouch-baka.github.io/upda-gym/>

- **Live Q&A:** one question per screen. You answer first (tap an option or type a number); the result appears right under your answer: right or wrong, the correct option highlighted, the step-by-step reasoning (full working with units for calculations), one line on why each wrong option is wrong, the reference, and an exam tip. Then rate it Again / Hard / Good / Easy.
- **Modes:** Practice (one topic or all), Exam simulation (timed, no feedback until the end, then score vs pass mark and a full review), Mistakes, Daily review (spaced repetition), Quick 10.
- **Home:** today's review, days to the exam, and readiness = rolling accuracy on *verified* questions, by topic.
- **Library:** topics with question count, mastery % and a "frequent" badge; one tap to review every "Check this" question.
- **Progress:** accuracy by topic, the 5 weakest topics with a Drill button, a chart of exam-simulation scores, and a weekly error report.
- **Built for one thumb:** main buttons at the bottom, long-press an underlined term for its definition and French term, resume unfinished sessions and exams, haptics, Reduce Motion (follows your iPhone setting).
- **Claude (optional):** “Explain more”, “Answer wrong?” (re-checks that one question) and a weekly weak-topic diagnosis built from topic counts only. Every answer is graded on the phone; the app works fully offline without a key.

---

## 1. Install on your iPhone

1. Open **<https://lilouch-baka.github.io/upda-gym/>** in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open it once from the Home Screen while online. After that it works offline (in flight mode too).

## 2. Load your question pack

Your questions are in `upda-bank.json` on your PC (`C:\Users\belam\upda-gym\upda-bank.json`). It is git-ignored, so it is never uploaded to GitHub.

**With iCloud Drive (simplest from Windows):**

1. On the PC, open <https://www.icloud.com/iclouddrive> (or iCloud for Windows) and upload `upda-bank.json` into iCloud Drive.
2. On the iPhone, open **UPDA Gym → Settings → Import pack**.
3. The Files picker opens: choose **Browse → iCloud Drive → upda-bank.json**.
4. You should see “Imported 193 questions…”. Home now shows your topics and the countdown.

**With AirDrop (from a Mac):** AirDrop the file to the iPhone; it lands in **Files → Downloads**. Then **Settings → Import pack** and pick it there.

Importing a new version of the pack later **keeps your progress**: question ids stay the same.

Settings also has **Export pack** (saves the question pack back to Files) and, separately, **Export progress** / **Import progress** (your answers, spaced-repetition state, exam scores and settings: no questions, no API key). Export progress regularly to iCloud Drive; it is how you move to a new phone.

## 3. Set your exam

**Settings → Exam:** exam date, number of questions, time limit and pass mark. Your papers don't state the format, so the defaults (50 questions, 90 minutes, 60%) are placeholders: set the real values.

**Settings → Practice timer:** optional seconds per question in practice (0 = off).

## 4. Claude API key (optional)

1. Create a key at <https://console.anthropic.com> → **API keys**. Set a monthly **spend limit** on its workspace.
2. **Settings → Claude API → API key**, paste it, **Save key**, then **Test connection**.

- Model: `claude-sonnet-5-5`. Cost is shown per session in Settings ($2 per million input tokens, $10 per million output tokens). A typical “Explain more” costs well under one cent.
- The key is encrypted on the phone with a device key that cannot be exported. It is sent only to `api.anthropic.com`, never logged and never included in any export.
- What is sent: “Explain more” and “Answer wrong?” send only the question on screen; the weekly diagnosis sends only counts and percentages by topic.

---

## The question bank (on your PC)

| Path | What | In Git? |
|---|---|---|
| `private/bank-src/*.json` | The questions, one file per topic, in the authoring format | No (git-ignored) |
| `upda-bank.json` | The built pack you send to the phone | No (git-ignored) |
| `private/DISPUTED.md` | Disputed and unverified questions with reasoning | No (git-ignored) |
| `papers/` | Put source papers here (PDF, photos, Word) | No (git-ignored) |
| `src/data/sample-pack.json` | 5 original sample questions for the public site | Yes |

Every question has: discipline, topic, subtopic, difficulty, type (mcq, numeric or true/false), source (paper and question numbers, page, year), how many papers it appeared in (`seen`), the paper's key, the answer the app grades against, and a status:

- **verified**: my independent answer agrees with the paper's key.
- **disputed**: I disagree with the key, or the key is flawed. The app shows **Check this** with the paper's key and my reasoning.
- **unverified**: no key, or the question is incomplete or ambiguous. Also shown as **Check this**.

Only verified questions count towards readiness. Extra practice questions you write yourself must be tagged `"generated": true`; they are off by default (Settings → Question pack).

### Commands

```bash
npm install
```

```bash
npm run bank
```

builds `upda-bank.json` from `private/bank-src/` and validates it.

```bash
npm run check
```

validates the sample pack and `upda-bank.json`: unique ids, exactly one correct answer per question, numeric answers recomputed from their `check` formula, and an explanation (steps, why each wrong option is wrong, reference, tip) and a source on every question.

```bash
npm run dev
```

runs the app locally at <http://localhost:5174>.

## Adding a new past paper later

1. Put the paper in `C:\Users\belam\upda-gym\papers\` (git-ignored).
2. Open Claude Code in `C:\Users\belam\upda-gym` and ask:

   > Read the new paper in papers/. Show me an inventory first (questions, topics, unreadable pages, missing keys, duplicates with the existing bank) and wait for my OK. Then add its questions to private/bank-src following the format described in scripts/build-bank.mjs: solve each one independently and compare with the key, give new questions an explicit `id` with a paper suffix, add an `also` entry to questions already in the bank instead of duplicating them, and tag every question with `paper` and `year`. Run `npm run bank` and show me the disputed list.

   Or by hand, in the right `private/bank-src/NN-topic.json`:
   - **A question already in the bank:** don't copy it. Add `"also": [{ "paper": "UPDA 2025 Arch", "q": "17", "year": 2025 }]` to the existing entry. Its “seen in N papers” goes up, so it is prioritised.
   - **A new question:** add an entry with `"paper"`, `"year"`, `"src"` (its number in that paper), `"p"` (page), and an explicit `"id"` such as `"ARCH-STR-P2-017"` so it can't clash with the first paper's numbers. Fill `k` (the paper's key), `a` (your worked answer), `s`, `w`, `ref`, `tip`; add `"check"` for a calculation.
3. Run `npm run bank`. Fix anything the validator reports.
4. Send the new `upda-bank.json` to the iPhone and **Settings → Import pack**. Progress is kept.

## Deploying

Every push to `main` builds and publishes the app with GitHub Actions (`.github/workflows/deploy.yml`) to GitHub Pages. The build runs `npm run check` first. On GitHub only the sample pack exists, so only it is validated there.

## Privacy

- The exam questions never go to GitHub: `upda-bank.json`, `private/` and `papers/` are git-ignored, and the public build contains only the 5 sample questions.
- Progress lives in IndexedDB on your phone; the app asks iOS to keep it (persistent storage), but export it regularly.
- No analytics, no server. The only network calls are the optional ones to `api.anthropic.com`.
