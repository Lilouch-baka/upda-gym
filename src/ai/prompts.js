// The API is used for exactly three things, all optional:
//  a) "Explain more": a follow-up explanation of the CURRENT question (≤ 150 words)
//  b) "I think this answer is wrong": re-check that ONE question and give a verdict
//  c) a weekly weak-topic diagnosis from a SUMMARY only (counts by topic), never the bank itself
// Every answer is graded on the phone; the app works fully offline without a key.

const LETTERS = 'ABCDEF';

function questionBlock(q, given) {
  const lines = [`Question: ${q.prompt}`];
  if (q.options) {
    lines.push('Options:');
    q.options.forEach((o, i) => lines.push(`${LETTERS[i]}. ${o}`));
    lines.push(`Answer used by the app: ${LETTERS[q.answer.index]}. ${q.options[q.answer.index]}`);
    if (q.paper_key !== null && q.paper_key !== undefined && q.paper_key !== q.answer.index) {
      lines.push(`The past paper's key says: ${LETTERS[q.paper_key]}. ${q.options[q.paper_key]}`);
    }
    if (given !== null && given !== undefined && q.options[given] !== undefined) lines.push(`The student chose: ${LETTERS[given]}. ${q.options[given]}`);
  } else if (q.answer?.value !== undefined) {
    lines.push(`Answer used by the app: ${q.answer.value} ${q.answer.unit || ''}`.trim());
    if (given !== null && given !== undefined) lines.push(`The student answered: ${given}`);
  }
  const ex = q.explanation || {};
  if (ex.steps?.length) lines.push(`Current explanation: ${ex.steps.join(' ')}`);
  if (ex.reference) lines.push(`Reference given: ${ex.reference}`);
  return lines.join('\n');
}

// ---------- a) explain more ----------
export const EXPLAIN_SYSTEM = `You tutor an architect preparing for the Qatar UPDA engineer qualification exam (multiple choice).
Explain the question below more deeply than the existing explanation: the underlying principle, how to recognise this type of question, and how to rule out the distractors.
If the student chose a wrong option, address that misconception directly.
Plain text, at most 150 words, no headings, no preamble. Cite a code or standard only if you are certain of it.`;

export function explainContent(q, given) {
  return questionBlock(q, given);
}

// ---------- b) re-check one question ----------
export const RECHECK_SYSTEM = `You independently re-check one exam question for an architect preparing for the Qatar UPDA exam.
Solve it yourself first, then compare with the answer the app uses.
verdict: "agree" if the app's answer is correct, "disagree" if another option is clearly better, "ambiguous" if the question is flawed or more than one option is defensible.
best_option: the letter of the option you think is best.
confidence: low, medium or high.
reasoning: at most 120 words, specific, no preamble. Cite a code, standard or clause only if you are certain it is correct.`;

export const RECHECK_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['agree', 'disagree', 'ambiguous'] },
    best_option: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'n/a'] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    reasoning: { type: 'string' },
  },
  required: ['verdict', 'best_option', 'confidence', 'reasoning'],
  additionalProperties: false,
};

export function recheckContent(q, comment) {
  return questionBlock(q, null) + (comment ? `\nThe student's comment: ${comment.slice(0, 500)}` : '');
}

// ---------- c) weekly diagnosis (summary only) ----------
export const DIAGNOSIS_SYSTEM = `You coach an architect preparing for the Qatar UPDA engineer qualification exam.
You receive ONLY summary statistics by topic (no questions). Identify the weakest topics and give a concrete plan for the coming week.
summary: 2 sentences on the overall picture.
focus: up to 3 topics, each with why (one sentence, citing the numbers) and action (one concrete study action).
plan: one sentence on how to split study time this week.`;

export const DIAGNOSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    focus: {
      type: 'array',
      items: {
        type: 'object',
        properties: { topic: { type: 'string' }, why: { type: 'string' }, action: { type: 'string' } },
        required: ['topic', 'why', 'action'],
        additionalProperties: false,
      },
    },
    plan: { type: 'string' },
  },
  required: ['summary', 'focus', 'plan'],
  additionalProperties: false,
};

export function diagnosisContent(summary, daysLeft) {
  return `Days until the exam: ${daysLeft ?? 'unknown'}\nStatistics (JSON):\n${JSON.stringify(summary)}`;
}
