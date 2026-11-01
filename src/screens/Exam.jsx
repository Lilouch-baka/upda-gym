import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { examPaper } from '../engine/sessionBuilder.js';
import { isCorrect } from '../engine/answerCheck.js';
import { BackButton, ProgressBar, SectionLabel, Spinner } from '../components/ui.jsx';
import Explanation, { LETTERS, StatusTag, Verdict } from '../components/Explanation.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import Icon from '../components/Icon.jsx';
import * as db from '../storage/db.js';
import { EXAM_DRAFT } from '../storage/db.js';

const answeredValue = (a) => a !== null && a !== undefined && a !== '';

function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// Exam simulation: same number of questions and time limit as the real exam (Settings → Exam).
// No feedback until the end; then score vs pass mark, and a review of every question.
export default function Exam({ params }) {
  const { ready, exams } = useApp();
  if (!ready) {
    return (
      <div className="screen tight">
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (params.review) {
    const exam = exams.find((e) => String(e.id) === params.review);
    return exam ? (
      <ExamResult exam={exam} />
    ) : (
      <div className="screen tight">
        <div className="empty">Exam not found.</div>
      </div>
    );
  }
  return <ExamRunner />;
}

function ExamRunner() {
  const { questions, questionById, settings, recordAnswer, addExam } = useApp();
  const [draft, setDraft] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showMap, setShowMap] = useState(false);
  const [done, setDone] = useState(null);
  const submitting = useRef(false);

  useEffect(() => {
    db.get('drafts', EXAM_DRAFT).then((d) => {
      if (d && !d.finished) setDraft(d);
      setLoaded(true);
    });
  }, []);

  // Persist every change; the timer keeps running even if the app is closed.
  useEffect(() => {
    if (draft && !submitting.current) db.putKey('drafts', EXAM_DRAFT, draft);
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [draft]);

  const paper = useMemo(() => (draft ? draft.ids.map((id) => questionById[id]).filter(Boolean) : []), [draft, questionById]);
  const remaining = draft ? draft.endsAt - now : 0;

  useEffect(() => {
    if (draft && remaining <= 0) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0, draft]);

  if (done) return <ExamResult exam={done} fresh />;
  if (!loaded) {
    return (
      <div className="screen tight">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (!draft) {
    const n = Math.min(settings.exam.questions, questions.length);
    return (
      <div className="screen tight">
        <div className="row">
          <BackButton to="/" icon="close" label="Close" />
          <div className="eyebrow">Exam simulation</div>
        </div>
        <h1 className="title">Ready?</h1>
        <div className="card">
          <div className="kv">
            <span className="caption">Questions</span>
            <span className="mono">{n}</span>
            <span className="caption">Time limit</span>
            <span className="mono">{settings.exam.minutes} min</span>
            <span className="caption">Pass mark</span>
            <span className="mono">{settings.exam.passMark}%</span>
          </div>
          <p className="caption" style={{ lineHeight: 1.5 }}>
            No feedback until you submit. You can move between questions, change answers and flag questions to come back to. The timer keeps running if you leave
            the app; when it ends, the exam is submitted automatically.
          </p>
          {n < settings.exam.questions && <div className="notice">Only {n} questions are available, so this paper is shorter than the real exam.</div>}
        </div>
        <div className="action-bar">
          <button
            className="btn xl primary block"
            disabled={!n}
            onClick={() => {
              const ids = examPaper(questions, n).map((q) => q.id);
              const startedAt = Date.now();
              setDraft({
                ids,
                answers: {},
                flagged: [],
                idx: 0,
                startedAt,
                endsAt: startedAt + settings.exam.minutes * 60000,
                minutes: settings.exam.minutes,
                passMark: settings.exam.passMark,
              });
            }}
          >
            Start exam
          </button>
        </div>
      </div>
    );
  }

  const q = paper[draft.idx];
  const answeredCount = paper.filter((p) => answeredValue(draft.answers[p.id])).length;
  const flagged = new Set(draft.flagged);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const go = (i) => {
    set({ idx: Math.max(0, Math.min(paper.length - 1, i)) });
    setShowMap(false);
    window.scrollTo(0, 0);
  };

  async function submit(auto) {
    if (submitting.current) return;
    if (!auto) {
      const left = paper.length - answeredCount;
      if (!window.confirm(left ? `${left} question${left > 1 ? 's are' : ' is'} unanswered. Submit anyway?` : 'Submit the exam?')) return;
    }
    submitting.current = true;
    const finishedAt = Math.min(Date.now(), draft.endsAt);
    const results = paper.map((p) => ({ qid: p.id, given: draft.answers[p.id] ?? null, correct: isCorrect(p, draft.answers[p.id]) }));
    const correct = results.filter((r) => r.correct).length;
    const byTopic = {};
    for (const p of paper) {
      const t = (byTopic[p.topic] ||= { total: 0, correct: 0 });
      t.total += 1;
      if (results.find((r) => r.qid === p.id).correct) t.correct += 1;
    }
    const exam = {
      ts: finishedAt,
      startedAt: draft.startedAt,
      usedMs: finishedAt - draft.startedAt,
      minutes: draft.minutes,
      passMark: draft.passMark,
      total: paper.length,
      correct,
      scorePct: Math.round((correct / paper.length) * 100),
      passed: (correct / paper.length) * 100 >= draft.passMark,
      timedOut: !!auto,
      results,
      flagged: draft.flagged,
      byTopic,
    };
    // Exam answers feed the history; wrong ones are scheduled for review (rated Again).
    for (const r of results) recordAnswer(r.qid, { correct: r.correct, rating: r.correct ? null : 0, given: r.given, mode: 'exam' });
    const id = await addExam(exam);
    await db.del('drafts', EXAM_DRAFT);
    setDone({ ...exam, id });
  }

  return (
    <div className="screen tight session">
      <div className="row">
        <BackButton to="/" icon="close" label="Leave exam (the timer keeps running; resume from Home)" />
        <div className={`pill mono ${remaining < 5 * 60000 ? 'warn' : ''}`} role="timer" aria-label="Time left">
          <Icon name="clock" size={14} stroke={2} /> {clock(remaining)}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} aria-label="Show all questions">
          {draft.idx + 1}/{paper.length}
        </button>
      </div>
      <ProgressBar value={answeredCount / paper.length} height={6} label={`${answeredCount} of ${paper.length} answered`} />

      {showMap && (
        <div className="card pad-sm">
          <SectionLabel>
            {answeredCount} answered · {flagged.size} flagged
          </SectionLabel>
          <div className="qmap">
            {paper.map((p, i) => (
              <button
                key={p.id}
                className={`qcell ${answeredValue(draft.answers[p.id]) ? 'done' : ''} ${flagged.has(p.id) ? 'flag' : ''} ${i === draft.idx ? 'cur' : ''}`}
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${answeredValue(draft.answers[p.id]) ? ', answered' : ''}${flagged.has(p.id) ? ', flagged' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => submit(false)}>
            Submit exam
          </button>
        </div>
      )}

      <QuestionCard key={q.id} q={q} given={draft.answers[q.id] ?? null} revealed={false} live onAnswer={(a) => set({ answers: { ...draft.answers, [q.id]: a } })} />

      <div className="action-bar stack" style={{ gap: 10 }}>
        <button
          className={`btn sm ${flagged.has(q.id) ? 'outline-accent' : ''}`}
          style={{ alignSelf: 'center' }}
          aria-pressed={flagged.has(q.id)}
          onClick={() => set({ flagged: flagged.has(q.id) ? draft.flagged.filter((x) => x !== q.id) : [...draft.flagged, q.id] })}
        >
          <Icon name="flag" size={16} /> {flagged.has(q.id) ? 'Flagged' : 'Flag for review'}
        </button>
        <div className="grid-action">
          <button className="btn lg" disabled={draft.idx === 0} onClick={() => go(draft.idx - 1)}>
            Back
          </button>
          {draft.idx < paper.length - 1 ? (
            <button className="btn lg primary" onClick={() => go(draft.idx + 1)}>
              Next
            </button>
          ) : (
            <button className="btn lg primary" onClick={() => submit(false)}>
              Submit exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Result and review ----------
function ExamResult({ exam, fresh }) {
  const { questionById, topicLabel } = useApp();
  const [filter, setFilter] = useState('wrong');
  const [open, setOpen] = useState(null); // index into exam.results
  const results = exam.results.filter((r) => questionById[r.qid]);
  const shown = results.map((r, i) => ({ ...r, i })).filter((r) => filter === 'all' || (filter === 'wrong' ? !r.correct : exam.flagged?.includes(r.qid)));

  if (open !== null) {
    const r = results[open];
    const q = questionById[r.qid];
    return (
      <div className="screen tight session">
        <div className="row">
          <BackButton label="Back to results" onClick={() => setOpen(null)} />
          <div className="eyebrow" style={{ flex: 1 }}>
            Review · question {open + 1} of {results.length}
          </div>
        </div>
        <div className="chips">
          <div className="tag">{topicLabel(q.topic)}</div>
          {q.seen > 1 && <div className="tag freq">seen {q.seen} times</div>}
          <StatusTag q={q} />
        </div>
        <QuestionCard q={q} given={r.given} revealed />
        <Verdict correct={r.correct} label={answeredValue(r.given) ? undefined : 'Not answered'} />
        {answeredValue(r.given) && q.type !== 'numeric' && !r.correct && (
          <div className="caption">
            You chose {LETTERS[r.given]}; the answer is {LETTERS[q.answer.index]}.
          </div>
        )}
        <Explanation q={q} given={r.given} />
        <div className="action-bar grid-2">
          <button className="btn lg" disabled={open === 0} onClick={() => setOpen(open - 1)}>
            Previous
          </button>
          <button className="btn lg primary" disabled={open === results.length - 1} onClick={() => setOpen(open + 1)}>
            Next
          </button>
        </div>
      </div>
    );
  }

  const topics = Object.entries(exam.byTopic || {}).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  const mins = Math.round(exam.usedMs / 60000);

  return (
    <div className="screen" style={{ gap: 18 }}>
      <div className="row">
        <BackButton to={fresh ? '/' : '/progress'} icon={fresh ? 'close' : 'back'} label="Close" />
        <div className="eyebrow">
          Exam simulation · {new Date(exam.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {exam.timedOut ? ' · time ran out' : ''}
        </div>
      </div>

      <div className={`card score-card ${exam.passed ? 'pass' : 'fail'}`}>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 2 }}>
            <div className="mono big-num">{exam.scorePct}%</div>
            <div className="caption">
              {exam.correct} of {exam.total} correct
            </div>
          </div>
          <div className={`verdict ${exam.passed ? 'correct' : 'wrong'}`} style={{ fontSize: 20 }}>
            <Icon name={exam.passed ? 'check' : 'x'} size={22} stroke={2.4} /> {exam.passed ? 'Pass' : 'Below pass mark'}
          </div>
        </div>
        <div className="pass-track" aria-hidden="true">
          <div className="fill" style={{ width: `${exam.scorePct}%` }} />
          <div className="mark" style={{ left: `${exam.passMark}%` }} />
        </div>
        <div className="caption">
          Pass mark {exam.passMark}% · {mins} of {exam.minutes} min used
        </div>
      </div>

      <section className="card pad-sm">
        <SectionLabel>By topic (weakest first)</SectionLabel>
        {topics.map(([t, v]) => (
          <div key={t} className="row-between" style={{ fontSize: 14 }}>
            <span>{topicLabel(t)}</span>
            <span className="mono" style={{ color: v.correct / v.total >= exam.passMark / 100 ? 'var(--correct)' : 'var(--wrong)' }}>
              {v.correct}/{v.total}
            </span>
          </div>
        ))}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <div className="segmented" role="group" aria-label="Show">
          <button aria-pressed={filter === 'wrong'} onClick={() => setFilter('wrong')}>
            Wrong ({results.filter((r) => !r.correct).length})
          </button>
          <button aria-pressed={filter === 'flagged'} onClick={() => setFilter('flagged')}>
            Flagged ({exam.flagged?.length || 0})
          </button>
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All ({results.length})
          </button>
        </div>
        {shown.length === 0 && <div className="empty">Nothing here.</div>}
        {shown.map((r) => {
          const q = questionById[r.qid];
          return (
            <button key={r.qid} className="review-row" onClick={() => setOpen(r.i)}>
              <span className={`dot ${r.correct ? 'ok' : 'bad'}`} aria-label={r.correct ? 'correct' : 'wrong'}>
                <Icon name={r.correct ? 'check' : 'x'} size={14} stroke={2.6} />
              </span>
              <span className="stack" style={{ gap: 2, flex: 1, textAlign: 'left' }}>
                <span style={{ fontSize: 14, lineHeight: 1.4 }}>
                  {r.i + 1}. {q.prompt.length > 110 ? q.prompt.slice(0, 110) + '…' : q.prompt}
                </span>
                <span className="caption" style={{ fontSize: 12 }}>
                  {topicLabel(q.topic)}
                  {q.status !== 'verified' ? ' · check this' : ''}
                </span>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          );
        })}
      </section>

      {results.some((r) => !r.correct) && (
        <button className="btn lg outline-accent" onClick={() => navigate('/session', { mode: 'review', ids: results.filter((r) => !r.correct).map((r) => r.qid).join(',') })}>
          Practise the {results.filter((r) => !r.correct).length} I got wrong
        </button>
      )}
    </div>
  );
}
