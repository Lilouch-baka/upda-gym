import { useMemo, useState } from 'react';
import { useApp, daysUntil } from '../state.jsx';
import { navigate } from '../router.js';
import { diagnosisSummary, pct, topicStats, weakestTopics, weeklyReport } from '../engine/stats.js';
import { ErrorNote, ProgressBar, ScreenHeader, SectionLabel, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { askClaude, costUsd } from '../ai/client.js';
import { DIAGNOSIS_SCHEMA, DIAGNOSIS_SYSTEM, diagnosisContent } from '../ai/prompts.js';

export default function Progress() {
  const { questions, topics, reviews, exams, settings, questionById } = useApp();
  const stats = useMemo(() => topicStats(questions, topics, reviews), [questions, topics, reviews]);
  const weakest = useMemo(() => weakestTopics(stats), [stats]);
  const report = useMemo(() => weeklyReport(questions, topics, reviews), [questions, topics, reviews]);
  const pass = settings.exam.passMark / 100;

  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <ScreenHeader eyebrow="Accuracy, weak spots and exam scores" title="Progress" />

      <section className="card pad-sm" aria-labelledby="weak-h">
        <SectionLabel>
          <span id="weak-h">5 weakest topics</span>
        </SectionLabel>
        {weakest.map((t) => (
          <div key={t.id} className="report-row">
            <div className="stack" style={{ flex: 1, gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{t.label}</span>
              <span className="caption" style={{ fontSize: 12 }}>
                {t.accuracy === null ? 'not practised yet' : `${pct(t.accuracy)} accuracy · ${t.tried} of ${t.count} tried`}
              </span>
            </div>
            <button className="btn sm primary" onClick={() => navigate('/session', { mode: 'practice', topic: t.id })}>
              Drill
            </button>
          </div>
        ))}
      </section>

      <section className="card pad-sm" aria-labelledby="exam-h">
        <SectionLabel>
          <span id="exam-h">Exam simulations</span>
        </SectionLabel>
        {exams.length === 0 ? (
          <div className="caption">No exam simulations yet. Take one from Home: your scores will be charted here against the pass mark.</div>
        ) : (
          <>
            <ScoreChart exams={exams} passMark={settings.exam.passMark} />
            <div className="stack" style={{ gap: 0 }}>
              {[...exams].reverse().map((e) => (
                <button key={e.id} className="review-row" onClick={() => navigate('/exam', { review: String(e.id) })}>
                  <span className={`dot ${e.passed ? 'ok' : 'bad'}`} aria-label={e.passed ? 'passed' : 'below pass mark'}>
                    <Icon name={e.passed ? 'check' : 'x'} size={14} stroke={2.6} />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14 }}>
                    {new Date(e.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {e.correct}/{e.total}
                  </span>
                  <span className="mono" style={{ fontSize: 14 }}>
                    {e.scorePct}%
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card pad-sm" aria-labelledby="week-h">
        <SectionLabel>
          <span id="week-h">This week’s error report</span>
        </SectionLabel>
        {report.attempts === 0 ? (
          <div className="caption">No answers in the last 7 days.</div>
        ) : (
          <>
            <div className="caption">
              {report.attempts} answers · {pct(report.accuracy)} correct · {report.rows.reduce((n, r) => n + r.ids.length, 0)} different questions missed
            </div>
            {report.rows.map((r) => (
              <div key={r.topic} className="report-row">
                <div className="stack" style={{ flex: 1, gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{r.label}</span>
                  <span className="caption" style={{ fontSize: 12 }}>
                    {r.ids.length} missed: {r.ids.slice(0, 2).map((id) => questionById[id]?.prompt.slice(0, 40) + '…').join(' · ')}
                  </span>
                </div>
                <button className="btn sm" onClick={() => navigate('/session', { mode: 'review', ids: r.ids.join(',') })}>
                  Redo
                </button>
              </div>
            ))}
          </>
        )}
        <Diagnosis stats={stats} report={report} exams={exams} />
      </section>

      <section className="card pad-sm" aria-labelledby="acc-h">
        <SectionLabel>
          <span id="acc-h">Accuracy by topic</span>
        </SectionLabel>
        {stats.map((t) => (
          <div key={t.id} className="stack" style={{ gap: 6 }}>
            <div className="row-between">
              <span style={{ fontSize: 14 }}>{t.label}</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {pct(t.accuracy)} <span className="caption">· mastery {pct(t.mastery)}</span>
              </span>
            </div>
            <ProgressBar
              value={t.accuracy ?? 0}
              color={t.accuracy === null ? undefined : t.accuracy >= pass ? 'var(--correct)' : 'var(--wrong-strong)'}
              label={`${t.label} accuracy`}
            />
          </div>
        ))}
      </section>
    </div>
  );
}

// Exam scores over time: one series (navy), a dashed pass-mark reference, tap a point for details.
function ScoreChart({ exams, passMark }) {
  const [hover, setHover] = useState(null);
  const W = 340;
  const H = 170;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const pts = exams.slice(-12);
  const x = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v) => pad.t + ih - (v / 100) * ih;
  const line = pts.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e.scorePct).toFixed(1)}`).join(' ');
  const h = hover !== null ? pts[hover] : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Exam scores: ${pts.map((e) => e.scorePct + '%').join(', ')}; pass mark ${passMark}%`}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)">
              {v}%
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(passMark)} y2={y(passMark)} stroke="var(--text-2)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - pad.r} y={y(passMark) - 5} textAnchor="end" fontSize="11" fill="var(--text-2)">
          pass {passMark}%
        </text>
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((e, i) => (
          <g key={e.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x(i)} cy={y(e.scorePct)} r="16" fill="transparent" />
            <circle cx={x(i)} cy={y(e.scorePct)} r={hover === i ? 6 : 4.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
          </g>
        ))}
        {pts.length > 1 && (
          <>
            <text x={x(0)} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="start">
              {new Date(pts[0].ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </text>
            <text x={x(pts.length - 1)} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">
              {new Date(pts[pts.length - 1].ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </text>
          </>
        )}
      </svg>
      <div className="caption chart-tip" aria-live="polite">
        {h
          ? `${new Date(h.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${h.scorePct}% (${h.correct}/${h.total}) · ${h.passed ? 'pass' : 'below pass mark'}`
          : `Latest ${pts[pts.length - 1].scorePct}% · tap a point for details`}
      </div>
    </div>
  );
}

// Optional weekly diagnosis: sends ONLY topic counts and percentages, never questions.
function Diagnosis({ stats, report, exams }) {
  const { apiKey, settings, recordUsage, diagnosis, saveDiagnosis } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const summary = diagnosisSummary(stats, report, exams);
      const { result, usage } = await askClaude({
        apiKey,
        workspaceId: settings.workspaceId,
        system: DIAGNOSIS_SYSTEM,
        content: diagnosisContent(summary, daysUntil(settings.examDate)),
        schema: DIAGNOSIS_SCHEMA,
        maxTokens: 700,
      });
      recordUsage(usage);
      await saveDiagnosis({ ...result, ts: Date.now(), cost: costUsd(usage.input, usage.output) });
    } catch (e) {
      if (e.usage) recordUsage(e.usage);
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const stale = !diagnosis || Date.now() - diagnosis.ts > 6 * 86400000;
  return (
    <div className="stack ai-box" style={{ gap: 10 }}>
      {diagnosis && (
        <div className="inner stack" style={{ gap: 8 }}>
          <SectionLabel>Weekly diagnosis · {new Date(diagnosis.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</SectionLabel>
          <p className="body" style={{ margin: 0 }}>
            {diagnosis.summary}
          </p>
          {diagnosis.focus.map((f) => (
            <div key={f.topic} className="stack" style={{ gap: 2 }}>
              <b style={{ fontSize: 14 }}>{f.topic}</b>
              <span className="caption">{f.why}</span>
              <span style={{ fontSize: 14 }}>→ {f.action}</span>
            </div>
          ))}
          <p className="caption" style={{ margin: 0 }}>
            {diagnosis.plan}
          </p>
        </div>
      )}
      <button className={`btn ${stale ? 'primary' : ''}`} disabled={busy} onClick={run}>
        <Icon name="sparkle" size={18} /> {diagnosis ? 'Refresh weak-topic diagnosis' : 'Weekly weak-topic diagnosis'}
      </button>
      {busy && <Spinner label="Diagnosing…" />}
      <ErrorNote error={error} />
      <div className="caption" style={{ fontSize: 12 }}>
        Optional, needs an API key. Sends only counts and percentages by topic, never your questions.
      </div>
    </div>
  );
}
