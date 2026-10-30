import { useEffect, useMemo, useState } from 'react';
import * as db from '../storage/db.js';
import { useApp, currentStreak, daysUntil } from '../state.jsx';
import { navigate } from '../router.js';
import { dailyQueue, estimateMinutes, mistakeQueue } from '../engine/sessionBuilder.js';
import { pct, readiness, topicStats } from '../engine/stats.js';
import { ProgressBar } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function Home() {
  const { questions, topics, reviews, meta, settings } = useApp();
  const [unfinished, setUnfinished] = useState(null);
  const [unfinishedExam, setUnfinishedExam] = useState(null);

  useEffect(() => {
    db.get('drafts', db.SESSION_DRAFT).then((d) => {
      // Offer to resume for a week; older half-sessions are just dropped from Home.
      if (d && d.idx < d.ids.length && Date.now() - d.savedAt < 7 * 86400000) setUnfinished(d);
    });
    db.get('drafts', db.EXAM_DRAFT).then((d) => d && !d.finished && setUnfinishedExam(d));
  }, []);

  const daily = useMemo(() => dailyQueue(questions, reviews), [questions, reviews]);
  const mistakes = useMemo(() => mistakeQueue(questions, reviews), [questions, reviews]);
  const ready = useMemo(() => readiness(questions, reviews), [questions, reviews]);
  const stats = useMemo(() => topicStats(questions, topics, reviews), [questions, topics, reviews]);

  const streak = currentStreak(meta);
  const days = daysUntil(settings.examDate);
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  const examDateLabel = settings.examDate
    ? new Date(settings.examDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'not set';

  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <div className="eyebrow">
            {dateLabel}
            {meta.studyDays ? ` · Day ${meta.studyDays}` : ''}
          </div>
          <h1 className="title">UPDA Gym</h1>
        </div>
        <div className="pill" aria-label={`${streak} day streak`}>
          <Icon name="flame" size={14} stroke={2} />
          {streak} {streak === 1 ? 'day' : 'days'}
        </div>
      </div>

      <div className="card countdown">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 2 }}>
            <div className="mono big-num">{days === null ? '–' : Math.max(0, days)}</div>
            <div className="caption">{days === null ? 'Set your exam date in Settings' : days < 0 ? 'Exam date has passed' : `${days === 1 ? 'day' : 'days'} to the exam · ${examDateLabel}`}</div>
          </div>
          <div className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
            <div className="mono big-num" style={{ color: ready.accuracy === null ? 'var(--muted)' : ready.accuracy >= settings.exam.passMark / 100 ? 'var(--correct)' : 'var(--wrong)' }}>
              {pct(ready.accuracy)}
            </div>
            <div className="caption">readiness</div>
          </div>
        </div>
        <ProgressBar value={ready.coverage} label="Verified questions practised in the last 30 days" />
        <div className="caption" style={{ fontSize: 12 }}>
          Readiness = rolling accuracy on verified questions (last 30 days). {pct(ready.coverage)} of them practised. Pass mark {settings.exam.passMark}%.
        </div>
      </div>

      {unfinishedExam && (
        <button className="resume-card" onClick={() => navigate('/exam', { resume: '1' })}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <Icon name="clock" size={20} stroke={2} />
          </span>
          <span className="stack" style={{ flex: 1, gap: 2, textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Resume exam simulation</span>
            <span className="caption">
              {Object.values(unfinishedExam.answers || {}).filter((a) => a !== null && a !== '').length} of {unfinishedExam.ids.length} answered · timer kept running
            </span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {unfinished && (
        <button className="resume-card" onClick={() => navigate('/session', { ...unfinished.params, resume: '1' })}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <Icon name="play" size={20} stroke={2} />
          </span>
          <span className="stack" style={{ flex: 1, gap: 2, textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Resume {unfinished.title}</span>
            <span className="caption">
              {unfinished.idx} of {unfinished.ids.length} done · {plural(unfinished.ids.length - unfinished.idx, 'question', 'questions')} left
            </span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <button className="mix-btn" disabled={!daily.length} onClick={() => navigate('/session', { mode: 'daily' })}>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Today’s review{daily.length ? ` · ${estimateMinutes(daily)} min` : ''}</div>
          <div style={{ fontSize: 13 }}>{daily.length ? `${plural(daily.length, 'question', 'questions')}: due + new, frequent first` : 'All caught up for today'}</div>
        </div>
        <Icon name="send" size={22} stroke={2.2} />
      </button>

      <div className="grid-2">
        <button className="tile" onClick={() => navigate('/session', { mode: 'practice' })}>
          <Icon name="target" size={20} stroke={2} />
          <span className="tile-title">Practice</span>
          <span className="caption">All topics, instant feedback</span>
        </button>
        <button className="tile" onClick={() => navigate('/exam')}>
          <Icon name="clock" size={20} stroke={2} />
          <span className="tile-title">Exam simulation</span>
          <span className="caption">
            {settings.exam.questions} Q · {settings.exam.minutes} min
          </span>
        </button>
        <button className="tile" disabled={!mistakes.length} onClick={() => navigate('/session', { mode: 'mistakes' })}>
          <Icon name="refresh" size={20} stroke={2} />
          <span className="tile-title">Mistakes</span>
          <span className="caption">{mistakes.length ? plural(mistakes.length, 'question', 'questions') : 'None right now'}</span>
        </button>
        <button className="tile" onClick={() => navigate('/session', { mode: 'quick' })}>
          <Icon name="bolt" size={20} stroke={2} />
          <span className="tile-title">Quick 10</span>
          <span className="caption">10 random questions</span>
        </button>
      </div>

      <div className="eyebrow">Readiness by topic</div>
      <div className="card pad-sm" style={{ gap: 4 }}>
        {stats.map((t) => (
          <button key={t.id} className="topic-row" onClick={() => navigate('/session', { mode: 'practice', topic: t.id })}>
            <div className="row-between" style={{ width: '100%' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {pct(t.readiness)}
              </span>
            </div>
            <ProgressBar
              value={t.readiness ?? 0}
              color={t.readiness === null ? undefined : t.readiness >= settings.exam.passMark / 100 ? 'var(--correct)' : 'var(--wrong-strong)'}
              label={`${t.label} readiness`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
