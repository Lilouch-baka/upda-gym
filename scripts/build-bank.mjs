// Builds the private question pack (upda-bank.json) from the authoring files in private/bank-src/.
// Run with: npm run bank
// Writes upda-bank.json (the file to import on a phone) and src/data/bank.json (the bank built into
// the public app). The authoring folder private/bank-src stays git-ignored.
//
// Authoring format (one file per topic): { topic, code, label, questions: [ ... ] } where each question is
//   src   "15/89"       question numbers in the paper ("/" = the same question recalled more than once)
//   p     1             page in the paper
//   y     true          stem highlighted in yellow in the paper (treated as high priority)
//   sub, d              subtopic, difficulty (easy | medium | hard)
//   q, o               prompt and options
//   k     2 | null      the paper's key (1-based), null if the paper has none
//   a     2             my independently worked answer (1-based) – this is what the app grades against
//   s, w               solution steps; why each option is wrong (null for the correct one)
//   ref, tip           reference (or "General engineering principle") and exam tip
//   check              optional JS formula whose value must match the correct option
//   status, note       optional override (verified | disputed | unverified) and reviewer note
// Questions from a later paper (see README, "Adding a new past paper"):
//   paper, year        source paper name and year; default: the first ARCH UPDA recall collection
//   id                 explicit id, required for a new paper's questions (e.g. "ARCH-STR-P2-014")
//   also               the same question seen in other papers: [{ "paper": "…", "q": "12", "year": 2025 }]
//                      each entry adds one to "seen in N papers"
//   generated          true for extra practice questions not taken from a paper (off by default in the app)
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'private', 'bank-src');
const outFile = join(root, 'upda-bank.json');
const appFile = join(root, 'src', 'data', 'bank.json');

const PAPER = 'ARCH UPDA (recall collection)';

if (!existsSync(srcDir)) {
  console.error(`No ${srcDir} – nothing to build. The bank sources are private and live only on your PC.`);
  process.exit(1);
}

const topics = [];
const questions = [];

for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(join(srcDir, file), 'utf8'));
  topics.push({ id: data.topic, label: data.label });
  for (const r of data.questions) {
    const numbers = String(r.src).split('/').map((s) => s.trim()).filter(Boolean);
    const answer = r.a - 1;
    const paperKey = r.k == null ? null : r.k - 1;
    const status = r.status || (paperKey === null ? 'unverified' : paperKey === answer ? 'verified' : 'disputed');
    const isTF = r.o.length === 2 && r.o.every((o) => /^(true|false)$/i.test(o));
    const also = Array.isArray(r.also) ? r.also : [];
    questions.push({
      id: r.id || `ARCH-${data.code}-${numbers[0].padStart(3, '0')}`,
      discipline: 'architecture',
      topic: data.topic,
      subtopic: r.sub,
      difficulty: r.d,
      type: isTF ? 'truefalse' : 'mcq',
      prompt: r.q,
      options: r.o,
      answer: { index: answer },
      ...(r.check ? { check: r.check } : {}),
      explanation: { steps: r.s, why_wrong: r.w, reference: r.ref, tip: r.tip },
      source: { paper: r.generated ? 'generated' : r.paper || PAPER, numbers, page: r.p ?? null, year: r.year ?? null, ...(also.length ? { also } : {}) },
      seen: numbers.length + also.length,
      priority: !!r.y,
      status,
      paper_key: paperKey,
      ...(r.note ? { note: r.note } : {}),
      generated: !!r.generated,
    });
  }
}

const pack = {
  format: 'upda-gym-pack',
  version: 1,
  name: 'UPDA Architecture – past papers',
  created: new Date().toISOString(),
  discipline: 'architecture',
  topics,
  questions,
};
writeFileSync(outFile, JSON.stringify(pack, null, 1));
writeFileSync(appFile, JSON.stringify(pack));

const by = (k) => questions.reduce((m, q) => ((m[q[k]] = (m[q[k]] || 0) + 1), m), {});
console.log(`Wrote ${outFile} and ${appFile}: ${questions.length} questions`);
console.log('By status:', by('status'));
console.log('By topic: ', by('topic'));
