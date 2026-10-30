const DAY = 24 * 60 * 60 * 1000;
// Rolling window for readiness: the last attempts of each question within this many days.
const READINESS_DAYS = 30;
const LAST_PER_QUESTION = 3;

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// Mastery of one question, 0..1. Long intervals + recent accuracy = mastered.
export function questionMastery(review) {
  if (!review || !review.history || review.history.length === 0) return 0;
  const recent = review.history.slice(-5);
  const acc = recent.filter((h) => h.correct).length / recent.length;
  const spacing = Math.min(1, (review.interval || 0) / 21);
  return spacing * 0.6 + acc * 0.4;
}

// Recent attempts of one question (last few, inside the rolling window).
function recentAttempts(review, since) {
  if (!review?.history) return [];
  return review.history.filter((h) => h.ts >= since).slice(-LAST_PER_QUESTION);
}

// Readiness = rolling accuracy on VERIFIED questions only (disputed or unverified keys don't count).
export function readiness(questions, reviews, now = Date.now()) {
  const since = now - READINESS_DAYS * DAY;
  const verified = questions.filter((q) => q.status === 'verified');
  const all = verified.flatMap((q) => recentAttempts(reviews[q.id], since));
  const byTopic = {};
  for (const q of verified) {
    const t = (byTopic[q.topic] ||= { attempts: 0, correct: 0, questions: 0, tried: 0 });
    const a = recentAttempts(reviews[q.id], since);
    t.questions += 1;
    if (a.length) t.tried += 1;
    t.attempts += a.length;
    t.correct += a.filter((h) => h.correct).length;
  }
  for (const t of Object.values(byTopic)) t.accuracy = t.attempts ? t.correct / t.attempts : null;
  return {
    accuracy: all.length ? all.filter((h) => h.correct).length / all.length : null,
    attempts: all.length,
    coverage: verified.length ? verified.filter((q) => recentAttempts(reviews[q.id], since).length).length / verified.length : 0,
    byTopic,
  };
}

export function topicStats(questions, topics, reviews, now = Date.now()) {
  const ready = readiness(questions, reviews, now);
  return topics.map((t) => {
    const qs = questions.filter((q) => q.topic === t.id);
    const tried = qs.filter((q) => reviews[q.id]?.history?.length);
    const hist = tried.flatMap((q) => reviews[q.id].history);
    return {
      ...t,
      count: qs.length,
      frequent: qs.filter((q) => (q.seen || 1) > 1).length,
      tried: tried.length,
      mastery: qs.length ? mean(qs.map((q) => questionMastery(reviews[q.id]))) : 0,
      accuracy: hist.length ? hist.filter((h) => h.correct).length / hist.length : null,
      readiness: ready.byTopic[t.id]?.accuracy ?? null,
    };
  });
}

// Weakest topics: lowest accuracy among practised topics (at least 3 answers), then untouched ones.
export function weakestTopics(stats, n = 5) {
  const practised = stats.filter((t) => t.accuracy !== null && t.tried >= 1).sort((a, b) => a.accuracy - b.accuracy || a.mastery - b.mastery);
  const untouched = stats.filter((t) => t.accuracy === null).sort((a, b) => b.count - a.count);
  return [...practised, ...untouched].slice(0, n);
}

// Weekly error report: last 7 days, wrong answers grouped by topic, with the questions behind them.
export function weeklyReport(questions, topics, reviews, now = Date.now()) {
  const since = now - 7 * DAY;
  const qById = Object.fromEntries(questions.map((q) => [q.id, q]));
  let attempts = 0;
  let correct = 0;
  const wrongByTopic = {};
  for (const r of Object.values(reviews)) {
    const q = qById[r.qid];
    if (!q) continue;
    for (const h of r.history || []) {
      if (h.ts < since) continue;
      attempts += 1;
      if (h.correct) correct += 1;
      else (wrongByTopic[q.topic] ||= new Set()).add(q.id);
    }
  }
  const label = Object.fromEntries(topics.map((t) => [t.id, t.label]));
  const rows = Object.entries(wrongByTopic)
    .map(([topic, ids]) => ({ topic, label: label[topic] || topic, ids: [...ids] }))
    .sort((a, b) => b.ids.length - a.ids.length);
  return { attempts, correct, accuracy: attempts ? correct / attempts : null, rows };
}

// Counts only: what the weekly AI diagnosis is allowed to see (never question text).
export function diagnosisSummary(stats, report, exams) {
  return {
    week: { answered: report.attempts, accuracy: report.accuracy === null ? null : Math.round(report.accuracy * 100) },
    topics: stats.map((t) => ({
      topic: t.label,
      questions: t.count,
      practised: t.tried,
      accuracy_pct: t.accuracy === null ? null : Math.round(t.accuracy * 100),
      mastery_pct: Math.round(t.mastery * 100),
      wrong_this_week: report.rows.find((r) => r.topic === t.id)?.ids.length || 0,
    })),
    exam_scores_pct: exams.slice(-5).map((e) => e.scorePct),
  };
}

export function pct(x) {
  if (x === null || x === undefined) return '–';
  return `${Math.round(x * 100)}%`;
}
