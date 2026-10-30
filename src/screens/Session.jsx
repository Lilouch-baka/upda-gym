import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { buildSession, MODES } from '../engine/sessionBuilder.js';
import { ratingCap } from '../engine/srs.js';
import { isCorrect } from '../engine/answerCheck.js';
import { BackButton, ProgressBar, RatingBar, RingTimer, Spinner } from '../components/ui.jsx';
import Explanation, { StatusTag, Verdict } from '../components/Explanation.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import { haptic } from '../components/haptics.js';
import * as db from '../storage/db.js';
import { SESSION_DRAFT } from '../storage/db.js';

// Practice, Quick 10, Mistakes, Daily review and Review: one question per screen, answer first,
// then the full explanation right under your answer, then rate it.
export default function Session({ params }) {
  const { ready, questions, questionById, reviews, recordAnswer, topicLabel } = useApp();
  const mode = MODES[params.mode] ? params.mode : 'practice';

  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const requeued = useRef(new Set());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!ready || queue) return;
    if (params.resume) {
      db.get('drafts', SESSION_DRAFT).then((d) => {
        const saved = d ? d.ids.map((id) => questionById[id]).filter(Boolean) : [];
        const ok = d && d.idx < saved.length;
        if (ok) {
          setIdx(d.idx);
          setResults(d.results || []);
          requeued.current = new Set(d.requeued || []);
          startedAt.current = d.startedAt || Date.now();
        }
        setQueue(ok ? saved : []);
      });
      return;
    }
    setQueue(buildSession(mode, { questions, reviews, topic: params.topic, ids: params.ids ? params.ids.split(',') : null }));
    // Build once per session; later review updates must not reshuffle the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Save progress after every answer; clear it once the session is finished.
  useEffect(() => {
    if (!queue || !queue.length) return;
    if (idx >= queue.length) {
      db.del('drafts', SESSION_DRAFT);
      return;
    }
    // eslint-disable-next-line no-unused-vars
    const { resume: _r, ...rest } = params;
    db.putKey('drafts', SESSION_DRAFT, {
      params: { ...rest, mode },
      title: sessionTitle(mode, params, topicLabel),
      ids: queue.map((x) => x.id),
      idx,
      results,
      requeued: [...requeued.current],
      startedAt: startedAt.current,
      savedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, idx]);

  if (!queue) {
    return (
      <div className="screen tight">
        <Spinner label="Building your session…" />
      </div>
    );
  }

  const title = sessionTitle(mode, params, topicLabel);

  if (queue.length === 0) {
    return (
      <div className="screen tight">
        <div className="row">
          <BackButton to="/" icon="close" label="Close session" />
          <div className="eyebrow">{title}</div>
        </div>
        <div className="empty">
          {mode === 'daily'
            ? 'Nothing is due right now. Practise a topic or take a Quick 10.'
            : mode === 'mistakes'
              ? 'No mistakes to review: every question you got wrong has since been answered correctly.'
              : 'No questions match this session yet.'}
        </div>
        <button className="btn lg primary" onClick={() => navigate('/library')}>
          Browse topics
        </button>
      </div>
    );
  }

  if (idx >= queue.length) {
    return <Summary title={title} results={results} startedAt={startedAt.current} questionById={questionById} />;
  }

  const q = queue[idx];

  function finish(result) {
    recordAnswer(q.id, { ...result, mode });
    setResults((r) => [...r, { qid: q.id, correct: result.correct, ms: result.ms }]);
    // A question you got wrong comes back once at the end of the session.
    if (result.rating === 0 && !requeued.current.has(q.id)) {
      requeued.current.add(q.id);
      setQueue((qs) => [...qs, q]);
    }
    setIdx((i) => i + 1);
    window.scrollTo(0, 0);
  }

  return (
    <div className="screen tight session">
      <div className="row">
        <BackButton to="/" icon="close" label="Close session (progress is saved)" />
        <div style={{ flex: 1 }}>
          <ProgressBar value={idx / queue.length} height={6} label="Session progress" />
        </div>
        <div className="mono caption">
          {idx + 1}/{queue.length}
        </div>
      </div>

      <div className="chips">
        <div className="tag">{topicLabel(q.topic)}</div>
        <div className="tag">{q.difficulty}</div>
        {q.seen > 1 && <div className="tag freq">seen in {q.seen} papers</div>}
        <StatusTag q={q} />
      </div>

      <QuestionStep key={`${q.id}-${idx}`} q={q} onDone={finish} />
    </div>
  );
}

function sessionTitle(mode, params, topicLabel) {
  if (mode === 'practice' && params.topic) return `Practice · ${topicLabel(params.topic)}`;
  if (mode === 'practice') return 'Practice · all topics';
  return MODES[mode]?.title || 'Session';
}

function QuestionStep({ q, onDone }) {
  const { settings } = useApp();
  const [given, setGiven] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [ms, setMs] = useState(0);
  const start = useRef(Date.now());
  const total = settings.practiceTimer || 0;
  const [remaining, setRemaining] = useState(total);
  const revealed = given !== null || timedOut;
  const correct = !timedOut && isCorrect(q, given);
  const resultRef = useRef(null);

  function commit(answer) {
    if (revealed) return;
    const ok = isCorrect(q, answer);
    setMs(Date.now() - start.current);
    setGiven(answer);
    haptic(ok ? 'light' : 'error');
  }

  // Optional practice countdown (Settings → Timers). Time up = wrong.
  useEffect(() => {
    if (!total || revealed) return;
    const t = setInterval(() => {
      const left = total - (Date.now() - start.current) / 1000;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        setMs(total * 1000);
        setTimedOut(true);
        haptic('error');
      }
    }, 250);
    return () => clearInterval(t);
  }, [total, revealed]);

  // Bring the verdict into view right under the answer.
  useEffect(() => {
    if (revealed) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [revealed]);

  const cap = revealed ? ratingCap({ correct, ms }) : 3;
  const formId = `num-form-${q.id}`;

  return (
    <>
      {total > 0 && !revealed && (
        <div className="row-between">
          <span className="caption">Time limit</span>
          <RingTimer total={total} remaining={remaining} small />
        </div>
      )}
      <QuestionCard q={q} given={given} revealed={revealed} onAnswer={revealed ? undefined : commit} numberFormId={formId} />

      {revealed && (
        <div ref={resultRef} className="stack" style={{ gap: 14 }}>
          <Verdict correct={correct} ms={ms} label={timedOut ? 'Time is up' : undefined} />
          <Explanation q={q} given={given} />
        </div>
      )}

      <div className="action-bar">
        {revealed ? (
          <RatingBar
            cap={cap}
            note={correct ? 'How well did you know it?' : 'Wrong answers come back soon: rated Again.'}
            onRate={(rating) => onDone({ correct, rating, ms, given })}
          />
        ) : q.type === 'numeric' ? (
          <button className="btn xl primary block" type="submit" form={formId}>
            Check answer
          </button>
        ) : (
          <div className="caption" style={{ textAlign: 'center' }}>
            Tap an option to answer
          </div>
        )}
      </div>
    </>
  );
}

// ---------- End of session ----------
function Summary({ title, results, startedAt, questionById }) {
  const unique = useMemo(() => {
    const seen = new Map();
    for (const r of results) if (!seen.has(r.qid)) seen.set(r.qid, r); // first attempt counts
    return [...seen.values()];
  }, [results]);
  const correct = unique.filter((r) => r.correct).length;
  const wrongIds = unique.filter((r) => !r.correct).map((r) => r.qid);
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  return (
    <div className="screen">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">{title} · done</div>
        <h1 className="title">Session complete</h1>
      </div>
      <div className="grid-3">
        <div className="stat">
          <div className="value">{unique.length}</div>
          <div className="caption" style={{ fontSize: 12 }}>
            questions
          </div>
        </div>
        <div className="stat">
          <div className="value">{unique.length ? Math.round((correct / unique.length) * 100) : 0}%</div>
          <div className="caption" style={{ fontSize: 12 }}>
            first-try accuracy
          </div>
        </div>
        <div className="stat">
          <div className="value">{minutes}m</div>
          <div className="caption" style={{ fontSize: 12 }}>
            time
          </div>
        </div>
      </div>
      {wrongIds.length > 0 && (
        <div className="card pad-sm">
          <div className="section-label wrong">Missed</div>
          {wrongIds.map((id) => (
            <div key={id} className="caption" style={{ lineHeight: 1.4 }}>
              {questionById[id]?.prompt.slice(0, 90)}
              {questionById[id]?.prompt.length > 90 ? '…' : ''}
            </div>
          ))}
        </div>
      )}
      <div className="action-bar stack">
        {wrongIds.length > 0 && (
          <button className="btn lg outline-accent" onClick={() => navigate('/session', { mode: 'review', ids: wrongIds.join(',') })}>
            Drill my {wrongIds.length} mistake{wrongIds.length > 1 ? 's' : ''} again
          </button>
        )}
        <button className="btn xl primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
