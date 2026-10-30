import { useState } from 'react';
import Icon from './Icon.jsx';
import Glossed from './Glossed.jsx';
import { ErrorNote, SectionLabel, Spinner, Tip } from './ui.jsx';
import { formatMs, formatNumber } from '../engine/answerCheck.js';
import { useApp } from '../state.jsx';
import { askClaude } from '../ai/client.js';
import { EXPLAIN_SYSTEM, RECHECK_SCHEMA, RECHECK_SYSTEM, explainContent, recheckContent } from '../ai/prompts.js';

export const LETTERS = 'ABCDEF';

export function Verdict({ correct, ms, label }) {
  return (
    <div className={`verdict ${correct ? 'correct' : 'wrong'}`} role="status">
      <Icon name={correct ? 'check' : 'x'} size={18} stroke={2.4} />
      {label || (correct ? 'Correct' : 'Wrong')}
      {ms ? ` · ${formatMs(ms)}` : ''}
    </div>
  );
}

export function Steps({ steps }) {
  if (!steps || !steps.length) return null;
  if (steps.length === 1) return <p className="body"><Glossed text={steps[0]} /></p>;
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>
          <Glossed text={s} />
        </li>
      ))}
    </ol>
  );
}

export function StatusTag({ q }) {
  if (q.status === 'verified') return null;
  return <div className="tag review">{q.status === 'disputed' ? 'Check this · disputed' : 'Check this · unverified'}</div>;
}

export function sourceLabel(q) {
  if (q.generated) return q.source?.paper === 'generated' ? 'Sample / generated question' : 'Generated question';
  const s = q.source || {};
  const nums = (s.numbers || []).map((n) => `Q${n}`).join(', ');
  const also = (s.also || []).map((a) => [a.paper, a.q ? `Q${a.q}` : null, a.year].filter(Boolean).join(' '));
  return [[s.paper, nums, s.page ? `p.${s.page}` : null, s.year].filter(Boolean).join(' · '), ...also].join('; also ');
}

// Everything shown right under the answer: why it's right, why the others are wrong,
// the reference, the exam tip, and the optional AI follow-ups.
export default function Explanation({ q, given, showAi = true }) {
  const ex = q.explanation || {};
  const isNumeric = q.type === 'numeric';
  const answerText = isNumeric ? formatNumber(q.answer.value, q.answer.unit) : `${LETTERS[q.answer.index]}. ${q.options[q.answer.index]}`;
  const wrong = isNumeric ? [] : (ex.why_wrong || []).map((w, i) => ({ i, w })).filter((x) => x.i !== q.answer.index && x.w);

  return (
    <div className="card explanation">
      <div className="stack" style={{ gap: 6 }}>
        <SectionLabel tone="correct">Correct answer</SectionLabel>
        <p className="body" style={{ color: 'var(--text)', fontWeight: 600 }}>
          {answerText}
        </p>
      </div>

      {q.status !== 'verified' && (
        <div className="check-note" role="note">
          <div className="row" style={{ gap: 8 }}>
            <Icon name="alert" size={16} stroke={2} />
            <b>{q.status === 'disputed' ? 'Disputed answer' : 'Unverified answer'}</b>
          </div>
          {q.paper_key !== null && q.paper_key !== undefined && q.paper_key !== q.answer.index && q.options && (
            <div>
              Paper key: {LETTERS[q.paper_key]}. {q.options[q.paper_key]}
            </div>
          )}
          {q.note && <div>{q.note}</div>}
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <SectionLabel>Why it’s right</SectionLabel>
        <Steps steps={ex.steps} />
      </div>

      {wrong.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Why the others are wrong</SectionLabel>
          <ul className="why-wrong">
            {wrong.map(({ i, w }) => (
              <li key={i} className={i === given ? 'chosen' : ''}>
                <span className="mono letter-sm">{LETTERS[i]}</span>
                <span>
                  {i === given && <b>Your answer: </b>}
                  {w}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row caption ref-line">
        <span style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon name="book" size={16} stroke={2} />
        </span>
        <span>{ex.reference || 'General engineering principle'}</span>
      </div>

      <Tip>{ex.tip}</Tip>

      <div className="caption" style={{ fontSize: 12 }}>
        {sourceLabel(q)}
        {q.seen > 1 ? ` · seen in ${q.seen} papers` : ''}
      </div>

      {showAi && <AiFollowUps q={q} given={given} />}
    </div>
  );
}

// Optional: needs a key and a connection. Each call sends ONLY this one question.
function AiFollowUps({ q, given }) {
  const { apiKey, settings, recordUsage, aiNotes, saveAiNote } = useApp();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [more, setMore] = useState('');
  const [comment, setComment] = useState('');
  const [askRecheck, setAskRecheck] = useState(false);
  const note = aiNotes[q.id];

  async function run(kind) {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'explain') {
        const { result, usage } = await askClaude({ apiKey, workspaceId: settings.workspaceId, system: EXPLAIN_SYSTEM, content: explainContent(q, given), maxTokens: 400 });
        recordUsage(usage);
        setMore(result);
      } else {
        const { result, usage } = await askClaude({
          apiKey,
          workspaceId: settings.workspaceId,
          system: RECHECK_SYSTEM,
          content: recheckContent(q, comment.trim()),
          schema: RECHECK_SCHEMA,
          maxTokens: 600,
        });
        recordUsage(usage);
        saveAiNote(q.id, result);
        setAskRecheck(false);
      }
    } catch (e) {
      if (e.usage) recordUsage(e.usage);
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack ai-box" style={{ gap: 10 }}>
      <div className="grid-2">
        <button className="btn" disabled={!!busy} onClick={() => run('explain')}>
          <Icon name="sparkle" size={18} /> Explain more
        </button>
        <button className="btn" disabled={!!busy} onClick={() => setAskRecheck((v) => !v)} aria-expanded={askRecheck}>
          <Icon name="flag" size={18} /> Answer wrong?
        </button>
      </div>
      {!apiKey && <div className="caption" style={{ fontSize: 12 }}>Optional: needs a Claude API key in Settings.</div>}
      {askRecheck && (
        <div className="stack" style={{ gap: 8 }}>
          <label className="caption" htmlFor={`rc-${q.id}`}>
            Why do you think the answer is wrong? (optional)
          </label>
          <textarea id={`rc-${q.id}`} className="textarea" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn primary" disabled={!!busy} onClick={() => run('recheck')}>
            Re-check this question
          </button>
        </div>
      )}
      {busy && <Spinner label={busy === 'explain' ? 'Explaining…' : 'Re-checking…'} />}
      <ErrorNote error={error} />
      {more && (
        <div className="inner stack" style={{ gap: 6 }}>
          <SectionLabel>Explain more</SectionLabel>
          <p className="body" style={{ margin: 0 }}>
            {more}
          </p>
        </div>
      )}
      {note && (
        <div className={`inner stack recheck ${note.verdict}`} style={{ gap: 6 }}>
          <SectionLabel>
            Re-check · {note.verdict === 'agree' ? 'agrees with the app' : note.verdict === 'disagree' ? `suggests ${note.best_option}` : 'ambiguous question'} · {note.confidence} confidence
          </SectionLabel>
          <p className="body" style={{ margin: 0 }}>
            {note.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
