# UPDA Gym

An offline iPhone study app for the Qatar UPDA engineer qualification exam (Architecture). All 193 questions from your past papers (with answers and explanations) are **built into the app**: open it and start. This repository and the website are public, so anyone with the link can see the questions.

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

## 2. Questions and backups

All past-paper questions are built in; there is nothing to import. Updating the questions (for example after adding a paper) only needs a push to GitHub: the app picks up the new version the next time it opens online.

**Settings → Import pack** is optional: it loads a different `upda-bank.json` on one device without publishing it (iCloud Drive or AirDrop → Files → pick the file). **Use built-in questions** switches back. Your progress is kept either way, because question ids stay the same.

**Export progress / Import progress** saves your answers, spaced-repetition state, exam scores and settings (no questions, no API key). Export it regularly to iCloud Drive; it is how you move to a new phone.

## 3. Set your exam

**Settings → Exam:** exam date, number of questions, time limit and pass mark. The defaults follow the format reported for the Architecture exam by [OpenExamPrep](https://open-exam-prep.com/practice/qa-upda-architecture): **25 multiple-choice questions in 60 minutes, 13 correct to pass (52%)**; some sittings have 27 questions (14 to pass: set 27 questions and 51%). This is not confirmed by the Ministry of Municipality, so check it when you register and adjust it if needed.

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
| `private/bank-src/*.json` | The questions, one file per topic, in the authoring format (edit these) | No (git-ignored) |
| `src/data/bank.json` | The built bank, shipped inside the public app | **Yes (public)** |
| `upda-bank.json` | The same bank as a file you can import on one device | No (git-ignored) |
| `private/DISPUTED.md` | Disputed and unverified questions with reasoning | No (git-ignored) |
| `papers/` | Put source papers here (PDF, photos, Word) | No (git-ignored) |
| `src/data/sample-pack.json` | 5 original sample questions (tagged generated, off by default) | Yes |

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

builds `src/data/bank.json` (in the app) and `upda-bank.json` from `private/bank-src/`, then validates them.

```bash
npm run check
```

validates the sample pack, the built-in bank and `upda-bank.json`: unique ids, exactly one correct answer per question, numeric answers recomputed from their `check` formula, and an explanation (steps, why each wrong option is wrong, reference, tip) and a source on every question.

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
4. Commit and push (`git add -A`, `git commit`, `git push`). GitHub rebuilds the site, and the app updates the next time it opens online. Progress is kept.

## Deploying

Every push to `main` builds and publishes the app with GitHub Actions (`.github/workflows/deploy.yml`) to GitHub Pages. The build runs `npm run check` first, which validates the built-in bank and the sample pack.

## Privacy

- **The question bank is public**: it is in `src/data/bank.json` on GitHub and inside the website. Your source papers (`papers/`) and the authoring files (`private/`) stay git-ignored.
- Progress lives in IndexedDB on your phone; the app asks iOS to keep it (persistent storage), but export it regularly.
- No analytics, no server. The only network calls are the optional ones to `api.anthropic.com`.
