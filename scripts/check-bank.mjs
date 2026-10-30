// Validates question packs. Run with: npm run check
// Always checks the public sample pack (src/data/sample-pack.json); also checks the private
// upda-bank.json when it exists on this machine, or any pack paths passed as arguments.
// Rules:
// - every id is unique
// - every question has exactly one correct answer (answer.index points at one option, and
//   why_wrong is null for that option only)
// - numeric answers are recomputed from their "check" formula and must match the correct option
// - every question has an explanation (steps + why each wrong option is wrong + reference + tip) and a source
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const files = args.length
  ? args
  : [join(root, 'src', 'data', 'sample-pack.json'), join(root, 'upda-bank.json')].filter((f) => existsSync(f));

const TYPES = ['mcq', 'numeric', 'truefalse'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const STATUSES = ['verified', 'disputed', 'unverified'];
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
// First number in an option such as "1,565,681 QR" or "40,000 m²" or "7.15".
const optionNumber = (s) => {
  const m = String(s).replace(/(\d),(?=\d{3})/g, '$1').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

let failed = false;

for (const file of files) {
  const errors = [];
  let pack;
  try {
    pack = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`x ${file}: ${e.message}`);
    failed = true;
    continue;
  }
  if (pack.format !== 'upda-gym-pack') errors.push('pack.format must be "upda-gym-pack"');
  if (!Array.isArray(pack.questions)) errors.push('pack.questions must be an array');
  const topicIds = new Set((pack.topics || []).map((t) => t.id));
  const seen = new Set();

  for (const q of pack.questions || []) {
    const err = (m) => errors.push(`${q.id || '(no id)'}: ${m}`);
    if (!nonEmpty(q.id)) err('missing id');
    else if (seen.has(q.id)) err('duplicate id');
    seen.add(q.id);
    if (!topicIds.has(q.topic)) err(`unknown topic "${q.topic}"`);
    if (!nonEmpty(q.discipline)) err('missing discipline');
    if (!nonEmpty(q.subtopic)) err('missing subtopic');
    if (!DIFFICULTIES.includes(q.difficulty)) err(`difficulty "${q.difficulty}"`);
    if (!TYPES.includes(q.type)) err(`type "${q.type}"`);
    if (!STATUSES.includes(q.status)) err(`status "${q.status}"`);
    if (!nonEmpty(q.prompt)) err('missing prompt');

    // Exactly one correct answer
    if (q.type === 'numeric') {
      if (typeof q.answer?.value !== 'number') err('numeric needs answer.value');
      if (!nonEmpty(q.check)) err('numeric needs a check formula');
    } else {
      const n = Array.isArray(q.options) ? q.options.length : 0;
      if (n < 2) err('needs at least 2 options');
      if (new Set(q.options).size !== n) err('options must be distinct');
      if (!Number.isInteger(q.answer?.index) || q.answer.index < 0 || q.answer.index >= n) err('answer.index out of range');
      const ww = q.explanation?.why_wrong;
      if (!Array.isArray(ww) || ww.length !== n) err('why_wrong must have one entry per option');
      else
        ww.forEach((w, i) => {
          if (i === q.answer?.index && w !== null) err(`why_wrong[${i}] must be null (it is the correct option)`);
          if (i !== q.answer?.index && !nonEmpty(w)) err(`why_wrong[${i}] is empty`);
        });
      if (q.status === 'verified' && q.paper_key !== q.answer?.index) err('verified but the paper key differs');
      if (q.status === 'disputed' && !nonEmpty(q.note)) err('disputed needs a note explaining why');
    }

    // Recompute numeric answers
    if (nonEmpty(q.check)) {
      let v;
      try {
        v = Function('Math', `"use strict"; return (${q.check});`)(Math);
      } catch (e) {
        err(`check formula failed: ${e.message}`);
      }
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (q.type === 'numeric') {
          const tol = Math.max(q.answer.tolerance || 0, Math.abs(q.answer.value) * 0.005);
          if (Math.abs(v - q.answer.value) > tol) err(`check gives ${v} but answer.value is ${q.answer.value}`);
        } else {
          const nums = q.options.map(optionNumber);
          let best = -1;
          nums.forEach((x, i) => {
            if (!Number.isNaN(x) && (best < 0 || Math.abs(x - v) < Math.abs(nums[best] - v))) best = i;
          });
          if (best !== q.answer.index) err(`check gives ${v.toFixed(4)}, nearest option is #${best + 1}, not the answer`);
        }
      } else if (v !== undefined) err('check formula did not return a number');
    }

    // Explanation and source
    const ex = q.explanation || {};
    if (!Array.isArray(ex.steps) || !ex.steps.length || !ex.steps.every(nonEmpty)) err('explanation.steps is empty');
    if (!nonEmpty(ex.reference)) err('missing explanation.reference');
    if (!nonEmpty(ex.tip)) err('missing explanation.tip');
    if (!q.generated) {
      if (!nonEmpty(q.source?.paper) || !Array.isArray(q.source?.numbers) || !q.source.numbers.length)
        err('missing source (paper and question number)');
    } else if (!nonEmpty(q.source?.paper)) err('generated questions still need source.paper ("generated")');
  }

  const count = (k) => (pack.questions || []).reduce((m, q) => ((m[q[k]] = (m[q[k]] || 0) + 1), m), {});
  console.log(`\n${file}\n  ${pack.questions?.length || 0} questions`, count('status'));
  if (errors.length) {
    failed = true;
    console.error(`  ${errors.length} error(s):`);
    for (const e of errors) console.error('  x ' + e);
  } else console.log('  valid');
}

if (!files.length) console.log('No packs found.');
process.exit(failed ? 1 : 0);
