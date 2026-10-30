import { useMemo } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { pct, topicStats } from '../engine/stats.js';
import { ProgressBar, ScreenHeader, SectionLabel } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

export default function Library() {
  const { questions, topics, reviews, packInfo } = useApp();
  const stats = useMemo(() => topicStats(questions, topics, reviews), [questions, topics, reviews]);
  const toCheck = useMemo(() => questions.filter((q) => q.status !== 'verified'), [questions]);
  const frequent = useMemo(() => questions.filter((q) => (q.seen || 1) > 1), [questions]);

  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <ScreenHeader eyebrow={`${packInfo?.name || 'Question pack'} · ${questions.length} questions`} title="Library" />

      <div className="grid-2">
        <button className="btn lg primary" onClick={() => navigate('/session', { mode: 'practice' })}>
          Practise all
        </button>
        <button className="btn lg" disabled={!frequent.length} onClick={() => navigate('/session', { mode: 'review', ids: frequent.map((q) => q.id).join(',') })}>
          Frequent only ({frequent.length})
        </button>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {stats.map((t) => (
          <button key={t.id} className="track-card" onClick={() => navigate('/session', { mode: 'practice', topic: t.id })}>
            <div className="row-between" style={{ width: '100%' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{t.label}</div>
              <div className="mono" style={{ fontSize: 14 }}>
                {pct(t.mastery)}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="caption">
                {t.count} question{t.count === 1 ? '' : 's'} · {t.tried} tried
              </span>
              {t.frequent > 0 && <span className="tag freq">frequent · {t.frequent}</span>}
            </div>
            <div style={{ width: '100%' }}>
              <ProgressBar value={t.mastery} label={`${t.label} mastery`} />
            </div>
          </button>
        ))}
      </div>

      {toCheck.length > 0 && (
        <section className="card pad-sm" aria-labelledby="check-h">
          <SectionLabel>
            <span id="check-h">Check this · {toCheck.length} questions</span>
          </SectionLabel>
          <p className="caption" style={{ lineHeight: 1.5 }}>
            Disputed or unverified answers: the paper’s key is missing, unclear, or I disagree with it. Each one shows the reasoning. They don’t count towards
            readiness.
          </p>
          <button className="btn" onClick={() => navigate('/session', { mode: 'review', ids: toCheck.map((q) => q.id).join(',') })}>
            <Icon name="flag" size={18} /> Review them
          </button>
        </section>
      )}
    </div>
  );
}
