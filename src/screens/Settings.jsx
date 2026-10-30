import { useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { ErrorNote, ScreenHeader, SectionLabel, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { MODEL, PRICE, askClaude, costUsd } from '../ai/client.js';
import { exportPack, exportProgress, readJsonFile } from '../storage/backup.js';

export default function Settings() {
  const { settings, updateSettings } = useApp();
  return (
    <div className="screen with-tabs">
      <ScreenHeader eyebrow="Pack, exam, data and API" title="Settings" />

      <PackSection />
      <ExamSection />

      <section className="card" aria-labelledby="timer-h">
        <SectionLabel>
          <span id="timer-h">Practice timer</span>
        </SectionLabel>
        <div className="field">
          <label htmlFor="pt">Seconds per question in practice (0 = off)</label>
          <input
            id="pt"
            className="input mono"
            inputMode="numeric"
            value={settings.practiceTimer}
            onChange={(e) => updateSettings({ practiceTimer: Math.min(600, Number(e.target.value.replace(/\D/g, '')) || 0) })}
          />
          <div className="caption" style={{ fontSize: 12 }}>
            The exam simulation uses its own overall time limit (above). Running out of time in practice counts as a wrong answer.
          </div>
        </div>
      </section>

      <ProgressDataSection />
      <ApiKeySection />
      <UsageSection />

      <section className="card" aria-labelledby="look-h">
        <SectionLabel>
          <span id="look-h">Appearance</span>
        </SectionLabel>
        <div className="segmented" role="group" aria-label="Theme">
          <button aria-pressed={settings.theme !== 'dark'} onClick={() => updateSettings({ theme: 'light' })}>
            Light
          </button>
          <button aria-pressed={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })}>
            Dark
          </button>
        </div>
        <label className="toggle" style={{ fontSize: 15 }}>
          <span>
            Reduce motion <span className="caption">· also follows your iPhone setting</span>
          </span>
          <input type="checkbox" switch="" checked={!!settings.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.checked })} />
        </label>
        <div className="caption" style={{ fontSize: 12 }}>
          Long-press an underlined term in a question or explanation for its definition and French term.
        </div>
      </section>

      <div className="caption" style={{ textAlign: 'center', fontSize: 12 }}>
        UPDA Gym · works fully offline; the API is optional
      </div>
    </div>
  );
}

function PackSection() {
  const app = useApp();
  const { packInfo, usingSample, allQuestions, settings, updateSettings } = app;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const generated = allQuestions.filter((q) => q.generated).length;
  const byStatus = allQuestions.reduce((m, q) => ((m[q.status] = (m[q.status] || 0) + 1), m), {});

  async function onImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    try {
      const data = await readJsonFile(file);
      if (!usingSample && !window.confirm(`Replace the current pack (${packInfo.count} questions) with this file? Your progress is kept.`)) return;
      const info = await app.importPack(data);
      setMsg(`Imported ${info.count} questions from “${info.name}”. Your progress is kept.`);
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    try {
      const how = await exportPack(app);
      setMsg(how === 'shared' ? 'Question pack shared.' : 'Question pack downloaded.');
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg(`Export failed: ${err.message}`);
    }
  }

  return (
    <section className="card" aria-labelledby="pack-h">
      <SectionLabel>
        <span id="pack-h">Question pack</span>
      </SectionLabel>
      <div className="kv">
        <span className="caption">Loaded</span>
        <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{usingSample ? '5 sample questions' : `${packInfo.name} · ${packInfo.count}`}</span>
        {!usingSample && (
          <>
            <span className="caption">Answers</span>
            <span className="mono" style={{ fontSize: 13, textAlign: 'right' }}>
              {byStatus.verified || 0} verified · {byStatus.disputed || 0} disputed · {byStatus.unverified || 0} unverified
            </span>
          </>
        )}
        {packInfo?.importedAt && (
          <>
            <span className="caption">Imported</span>
            <span className="mono" style={{ fontSize: 13 }}>
              {new Date(packInfo.importedAt).toLocaleDateString('en-GB')}
            </span>
          </>
        )}
      </div>
      <div className="grid-2">
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} /> Import pack
        </button>
        <button className="btn" disabled={usingSample} onClick={onExport}>
          <Icon name="download" size={18} /> Export pack
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import question pack file" onChange={onImport} />
      {busy && <Spinner label="Importing…" />}
      {msg && (
        <div className="caption" role="status">
          {msg}
        </div>
      )}
      {generated > 0 && (
        <label className="toggle" style={{ fontSize: 15 }}>
          <span>
            Include generated practice questions <span className="caption">· {generated}, not from past papers</span>
          </span>
          <input type="checkbox" switch="" checked={!!settings.includeGenerated} onChange={(e) => updateSettings({ includeGenerated: e.target.checked })} />
        </label>
      )}
      <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Send upda-bank.json to your iPhone (AirDrop, or save it to iCloud Drive), then tap Import pack and pick it in Files. The questions are stored on this
        phone only; they are not part of the public app.
      </div>
    </section>
  );
}

function ExamSection() {
  const { settings, updateSettings } = useApp();
  const exam = settings.exam;
  const setExam = (patch) => updateSettings({ exam: { ...exam, ...patch } });
  const num = (v, min, max) => Math.max(min, Math.min(max, Number(String(v).replace(/\D/g, '')) || min));
  return (
    <section className="card" aria-labelledby="exam-h">
      <SectionLabel>
        <span id="exam-h">Exam</span>
      </SectionLabel>
      <div className="field">
        <label htmlFor="exam-date">Exam date</label>
        <input id="exam-date" className="input" type="date" value={settings.examDate || ''} onChange={(e) => updateSettings({ examDate: e.target.value })} />
      </div>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="ex-q">Questions</label>
          <input id="ex-q" className="input mono" inputMode="numeric" value={exam.questions} onChange={(e) => setExam({ questions: num(e.target.value, 1, 300) })} />
        </div>
        <div className="field">
          <label htmlFor="ex-m">Minutes</label>
          <input id="ex-m" className="input mono" inputMode="numeric" value={exam.minutes} onChange={(e) => setExam({ minutes: num(e.target.value, 1, 600) })} />
        </div>
        <div className="field">
          <label htmlFor="ex-p">Pass mark %</label>
          <input id="ex-p" className="input mono" inputMode="numeric" value={exam.passMark} onChange={(e) => setExam({ passMark: num(e.target.value, 1, 100) })} />
        </div>
      </div>
      <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Your past papers don’t state the format, so these are placeholders. Set them to the real UPDA exam values.
      </div>
    </section>
  );
}

function ProgressDataSection() {
  const app = useApp();
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  async function onImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      if (!window.confirm('Replace all progress on this device with the contents of this file? The question pack is not affected.')) return;
      await app.importProgressData(data);
      setMsg('Progress imported.');
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
  }

  async function onExport() {
    try {
      const how = await exportProgress(app);
      setMsg(how === 'shared' ? 'Progress shared.' : 'Progress downloaded.');
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg(`Export failed: ${err.message}`);
    }
  }

  return (
    <section className="card" aria-labelledby="data-h">
      <SectionLabel>
        <span id="data-h">Your progress</span>
      </SectionLabel>
      <p className="caption" style={{ lineHeight: 1.5 }}>
        Progress (answers, spaced repetition, exam scores, settings) is stored on this device only. Export it regularly to iCloud Drive. It contains no questions and
        no API key.
      </p>
      <div className="grid-2">
        <button className="btn" onClick={onExport}>
          <Icon name="download" size={18} /> Export progress
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} /> Import progress
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import progress file" onChange={onImport} />
      {app.meta.lastExport && <div className="caption">Last export: {new Date(app.meta.lastExport).toLocaleDateString('en-GB')}</div>}
      {msg && (
        <div className="caption" role="status">
          {msg}
        </div>
      )}
    </section>
  );
}

function ApiKeySection() {
  const { apiKey, setApiKey, removeApiKey, recordUsage, settings, updateSettings } = useApp();
  const [draft, setDraft] = useState('');
  const [wsDraft, setWsDraft] = useState(settings.workspaceId || '');
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    const k = draft.trim();
    if (!k) return;
    try {
      await setApiKey(k);
      setDraft('');
      setError(null);
      setStatus(
        k.startsWith('sk-ant-admin')
          ? 'Key saved. Note: it looks like an Admin key, which usually cannot call Claude. Tap Test connection to check.'
          : 'Key saved, encrypted on this device. Tap Test connection to check it.',
      );
    } catch {
      setStatus('Could not save the key securely on this browser.');
    }
  }

  async function test() {
    setTesting(true);
    setError(null);
    setStatus('');
    try {
      const { usage } = await askClaude({ apiKey, workspaceId: wsDraft.trim(), content: 'Reply with the single word OK.', maxTokens: 10 });
      recordUsage(usage);
      setStatus(`Connected to ${MODEL}.`);
    } catch (e) {
      if (e.usage) recordUsage(e.usage);
      setError(e);
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card" aria-labelledby="ai-h">
      <SectionLabel>
        <span id="ai-h">Claude API (optional)</span>
      </SectionLabel>
      <div className="kv">
        <span className="caption">Model</span>
        <span className="mono" style={{ fontSize: 13 }}>
          {MODEL}
        </span>
        <span className="caption">Key</span>
        <span className="mono" style={{ fontSize: 13, color: apiKey ? 'var(--correct)' : 'var(--muted)' }}>
          {apiKey ? `saved (…${apiKey.slice(-4)})` : 'not set'}
        </span>
      </div>
      <form className="field" onSubmit={save}>
        <label htmlFor="api-key">{apiKey ? 'Replace API key' : 'API key'}</label>
        <input
          id="api-key"
          className="input mono"
          style={{ fontSize: 14 }}
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={draft}
          placeholder="sk-ant-…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!draft.trim()}>
          Save key
        </button>
      </form>
      <div className="field">
        <label htmlFor="ws-id">Workspace ID (only if Anthropic asks for it)</label>
        <input
          id="ws-id"
          className="input mono"
          style={{ fontSize: 14 }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={wsDraft}
          placeholder="wrkspc_…"
          onChange={(e) => setWsDraft(e.target.value)}
          onBlur={() => updateSettings({ workspaceId: wsDraft.trim() })}
        />
      </div>
      <div className="grid-2">
        <button className="btn" onClick={test} disabled={!apiKey || testing}>
          Test connection
        </button>
        <button
          className="btn danger"
          disabled={!apiKey}
          onClick={async () => {
            await removeApiKey();
            setStatus('Key removed from this device.');
          }}
        >
          <Icon name="trash" size={18} /> Remove key
        </button>
      </div>
      {testing && <Spinner label="Testing…" />}
      {status && (
        <div className="caption" role="status">
          {status}
        </div>
      )}
      <ErrorNote error={error} />
      <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Used only for “Explain more”, “Answer wrong?” (re-checks that one question) and the weekly diagnosis (topic counts only, never the questions). Every answer
        is graded on the phone. The key is encrypted with a device key that cannot be exported, sent only to api.anthropic.com, never logged and never included in
        exports. Set a monthly spend limit on it in the Anthropic console.
      </div>
    </section>
  );
}

function UsageSection() {
  const { usage } = useApp();
  const row = (label, u) => (
    <div key={label} className="stack" style={{ gap: 4 }}>
      <div className="row-between">
        <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ fontSize: 14 }}>
          ${costUsd(u.input, u.output).toFixed(4)}
        </span>
      </div>
      <div className="caption mono" style={{ fontSize: 12 }}>
        {u.calls} calls · {u.input.toLocaleString()} in · {u.output.toLocaleString()} out tokens
      </div>
    </div>
  );
  return (
    <section className="card" aria-labelledby="usage-h">
      <SectionLabel>
        <span id="usage-h">API usage and cost</span>
      </SectionLabel>
      {row('This session', usage.session)}
      <div className="divider" />
      {row('All time on this device', usage.total)}
      <div className="caption" style={{ fontSize: 12 }}>
        Estimate at ${PRICE.input}/M input and ${PRICE.output}/M output tokens. A session starts when you open the app.
      </div>
    </section>
  );
}
