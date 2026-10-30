import { shuffle } from './answerCheck.js';

export const NEW_PER_DAY = 15;
export const DAILY_CAP = 30;
export const PRACTICE_SIZE = 15;

// Rough seconds per question, used for time estimates.
export const SECONDS_PER_QUESTION = 45;

export const MODES = {
  practice: { title: 'Practice' },
  quick: { title: 'Quick 10' },
  mistakes: { title: 'Mistakes' },
  daily: { title: 'Daily review' },
  review: { title: 'Review' },
  exam: { title: 'Exam simulation' },
};

function seen(r) {
  return !!(r && r.history && r.history.length);
}

// How strongly a question should be favoured: recalled in several papers and yellow-marked
// questions come up more.
export function frequencyWeight(q) {
  return 1 + 0.5 * Math.max(0, (q.seen || 1) - 1) + (q.priority ? 0.5 : 0);
}

// Weighted random order (Efraimidis–Spirakis): heavier questions tend to come first.
export function weightedOrder(list, weight = frequencyWeight) {
  return list
    .map((q) => ({ q, k: Math.pow(Math.random(), 1 / weight(q)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.q);
}

// Due first (oldest first), then never seen (frequent first), then the rest (weakest first).
function practiceOrder(pool, reviews, now) {
  const due = [];
  const fresh = [];
  const rest = [];
  for (const q of pool) {
    const r = reviews[q.id];
    if (!seen(r)) fresh.push(q);
    else if (r.reps + r.lapses > 0 && r.due <= now) due.push(q);
    else rest.push(q);
  }
  due.sort((a, b) => reviews[a.id].due - reviews[b.id].due);
  const lastWrong = (q) => (reviews[q.id].history.slice(-1)[0]?.correct ? 1 : 0);
  rest.sort((a, b) => lastWrong(a) - lastWrong(b) || reviews[a.id].due - reviews[b.id].due);
  return [...due, ...weightedOrder(fresh), ...rest];
}

export function dailyQueue(questions, reviews, now = Date.now()) {
  const due = [];
  const fresh = [];
  for (const q of questions) {
    const r = reviews[q.id];
    if (!r || r.reps + r.lapses === 0) {
      if (!seen(r)) fresh.push(q);
    } else if (r.due <= now) due.push(q);
  }
  due.sort((a, b) => reviews[a.id].due - reviews[b.id].due);
  const newOnes = weightedOrder(fresh).slice(0, Math.max(0, Math.min(NEW_PER_DAY, DAILY_CAP - due.length)));
  return shuffle([...due.slice(0, DAILY_CAP), ...newOnes]).slice(0, DAILY_CAP);
}

// Questions whose most recent answer was wrong, most recent mistake first.
export function mistakeQueue(questions, reviews) {
  return questions
    .filter((q) => {
      const h = reviews[q.id]?.history;
      return h && h.length && !h[h.length - 1].correct;
    })
    .sort((a, b) => reviews[b.id].history.slice(-1)[0].ts - reviews[a.id].history.slice(-1)[0].ts);
}

// Exam paper: n questions spread across topics in proportion to the bank, frequent ones favoured.
export function examPaper(questions, n) {
  const byTopic = {};
  for (const q of questions) (byTopic[q.topic] ||= []).push(q);
  const total = questions.length;
  const picked = [];
  const leftovers = [];
  for (const list of Object.values(byTopic)) {
    const ordered = weightedOrder(list);
    const share = Math.floor((list.length / total) * n);
    picked.push(...ordered.slice(0, share));
    leftovers.push(...ordered.slice(share));
  }
  picked.push(...weightedOrder(leftovers).slice(0, Math.max(0, n - picked.length)));
  return shuffle(picked.slice(0, n));
}

export function buildSession(mode, { questions, reviews, topic, ids, examSize, now = Date.now() }) {
  switch (mode) {
    case 'practice': {
      const pool = topic ? questions.filter((q) => q.topic === topic) : questions;
      return practiceOrder(pool, reviews, now).slice(0, topic ? 20 : PRACTICE_SIZE);
    }
    case 'quick':
      return weightedOrder(questions).slice(0, 10);
    case 'mistakes':
      return mistakeQueue(questions, reviews).slice(0, 25);
    case 'daily':
      return dailyQueue(questions, reviews, now);
    case 'exam':
      return examPaper(questions, examSize || 50);
    case 'review':
      return (ids || []).map((id) => questions.find((q) => q.id === id)).filter(Boolean);
    default:
      return [];
  }
}

export function estimateMinutes(queue) {
  return Math.max(1, Math.round((queue.length * SECONDS_PER_QUESTION) / 60));
}

