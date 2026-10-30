import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './storage/db.js';
import samplePack from './data/sample-pack.json';
import { newReview, schedule } from './engine/srs.js';
import { clearApiKey, loadApiKey, saveApiKey } from './storage/secrets.js';

// The API key is NOT a setting: it lives encrypted in storage/secrets.js and only in memory here.
export const DEFAULT_SETTINGS = {
  workspaceId: '',
  theme: 'light',
  reduceMotion: false,
  hintsSeen: {},
  examDate: '2026-11-15',
  // Exam simulation format, as reported by a prep site for the Architecture exam (25 or 27 MCQs,
  // 60 minutes, 13/25 to pass). Not confirmed by the Ministry: change it in Settings if it differs.
  exam: { questions: 25, minutes: 60, passMark: 52 },
  // Optional per-question countdown in practice (0 = off).
  practiceTimer: 0,
  includeGenerated: false,
};

const DEFAULT_META = { streak: 0, lastStudyDay: null, studyDays: 0, lastExport: null };

const AppContext = createContext(null);

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey() {
  return dayKey(Date.now() - 24 * 60 * 60 * 1000);
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0A1426' : '#FFFFFF');
}

// Reduce Motion: follows the iPhone setting automatically (CSS media query); this forces it on.
export function applyMotion(reduce) {
  if (reduce) document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
}

// Light check of an imported pack: enough to refuse the wrong file, not a full validation
// (npm run check does that on the PC before the file is sent to the phone).
export function checkPack(data) {
  if (!data || data.format !== 'upda-gym-pack' || !Array.isArray(data.questions)) {
    throw new Error('This file is not a UPDA Gym question pack (upda-bank.json).');
  }
  const bad = data.questions.filter((q) => !q.id || !q.prompt || !q.answer || !q.topic);
  if (bad.length) throw new Error(`${bad.length} question(s) in this pack are incomplete.`);
  if (new Set(data.questions.map((q) => q.id)).size !== data.questions.length) throw new Error('This pack has duplicate question ids.');
  return data;
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [reviews, setReviews] = useState({});
  const [exams, setExams] = useState([]);
  const [packQuestions, setPackQuestions] = useState([]);
  const [packInfo, setPackInfo] = useState(null);
  const [aiNotes, setAiNotes] = useState({});
  const [apiKey, setApiKeyState] = useState('');
  const [usage, setUsage] = useState({ session: { input: 0, output: 0, calls: 0 }, total: { input: 0, output: 0, calls: 0 } });
  const [diagnosis, setDiagnosis] = useState(null);

  const load = useCallback(async () => {
    const [s, m, rs, ex, qs, pi, notes, u, dg] = await Promise.all([
      db.kvGet('settings'),
      db.kvGet('meta'),
      db.getAll('reviews'),
      db.getAll('exams'),
      db.getAll('questions'),
      db.kvGet('pack_info'),
      db.kvGet('ai_notes'),
      db.kvGet('usage_total'),
      db.kvGet('diagnosis'),
    ]);
    setApiKeyState(await loadApiKey());
    if (u) setUsage((prev) => ({ ...prev, total: u }));
    setDiagnosis(dg || null);
    const merged = { ...DEFAULT_SETTINGS, ...(s || {}) };
    merged.exam = { ...DEFAULT_SETTINGS.exam, ...(s?.exam || {}) };
    // The first version's untouched placeholder (50 Q / 90 min / 60%) moves to the reported format.
    const e = merged.exam;
    if (e.questions === 50 && e.minutes === 90 && e.passMark === 60) merged.exam = { ...DEFAULT_SETTINGS.exam };
    setSettings(merged);
    applyTheme(merged.theme);
    applyMotion(merged.reduceMotion);
    setMeta({ ...DEFAULT_META, ...(m || {}) });
    setReviews(Object.fromEntries(rs.map((r) => [r.qid, r])));
    setExams(ex.sort((a, b) => a.ts - b.ts));
    setPackQuestions(qs);
    setPackInfo(qs.length ? pi || { name: 'Question pack', count: qs.length } : null);
    setAiNotes(notes || {});
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    db.requestPersistence();
  }, [load]);

  // Without an imported pack, the app runs on the 5 public sample questions.
  const usingSample = packQuestions.length === 0;
  const allQuestions = usingSample ? samplePack.questions : packQuestions;
  const topics = useMemo(() => {
    const declared = usingSample ? samplePack.topics : packInfo?.topics || [];
    const used = [...new Set(allQuestions.map((q) => q.topic))];
    const label = Object.fromEntries(declared.map((t) => [t.id, t.label]));
    const order = declared.map((t) => t.id).filter((id) => used.includes(id));
    return [...order, ...used.filter((id) => !order.includes(id))].map((id) => ({ id, label: label[id] || id }));
  }, [usingSample, packInfo, allQuestions]);

  // "Generated" practice questions stay off unless switched on in Settings. Samples always show.
  const questions = useMemo(
    () => (usingSample || settings.includeGenerated ? allQuestions : allQuestions.filter((q) => !q.generated)),
    [usingSample, allQuestions, settings.includeGenerated],
  );
  const questionById = useMemo(() => Object.fromEntries(allQuestions.map((q) => [q.id, q])), [allQuestions]);
  const topicLabel = useCallback((id) => topics.find((t) => t.id === id)?.label || id, [topics]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      db.kvSet('settings', next);
      if (patch.theme) applyTheme(next.theme);
      if ('reduceMotion' in patch) applyMotion(next.reduceMotion);
      return next;
    });
  }, []);

  const touchStreak = useCallback(() => {
    setMeta((prev) => {
      const today = dayKey();
      if (prev.lastStudyDay === today) return prev;
      const streak = prev.lastStudyDay === yesterdayKey() ? prev.streak + 1 : 1;
      const next = { ...prev, streak, lastStudyDay: today, studyDays: (prev.studyDays || 0) + 1 };
      db.kvSet('meta', next);
      return next;
    });
  }, []);

  // Record one answered question: update spaced repetition and history.
  const recordAnswer = useCallback(
    (qid, { correct, rating, ms, given, mode }) => {
      const now = Date.now();
      setReviews((prev) => {
        const base = prev[qid] || newReview(qid);
        const next = rating === null || rating === undefined ? { ...base } : schedule(base, rating, now);
        next.history = [...(base.history || []), { ts: now, correct: !!correct, rating: rating ?? null, ms: ms || null, given: given ?? null, mode: mode || null }].slice(-30);
        db.put('reviews', next);
        return { ...prev, [qid]: next };
      });
      touchStreak();
    },
    [touchStreak],
  );

  const addExam = useCallback(async (exam) => {
    const id = await db.put('exams', exam);
    setExams((prev) => [...prev, { ...exam, id }]);
    return id;
  }, []);

  const saveAiNote = useCallback((qid, note) => {
    setAiNotes((prev) => {
      const next = { ...prev, [qid]: { ...note, ts: Date.now() } };
      db.kvSet('ai_notes', next);
      return next;
    });
  }, []);

  const markExported = useCallback(() => {
    setMeta((prev) => {
      const next = { ...prev, lastExport: Date.now() };
      db.kvSet('meta', next);
      return next;
    });
  }, []);

  // ---------- question pack ----------
  const importPack = useCallback(
    async (data) => {
      const pack = checkPack(data);
      const info = {
        name: pack.name || 'Question pack',
        count: pack.questions.length,
        topics: pack.topics || [],
        discipline: pack.discipline || null,
        created: pack.created || null,
        importedAt: Date.now(),
      };
      await db.replaceQuestions(pack.questions, info);
      await load();
      return info;
    },
    [load],
  );

  const exportPackData = useCallback(async () => {
    const qs = await db.getAll('questions');
    if (!qs.length) throw new Error('No question pack is loaded on this device.');
    const info = (await db.kvGet('pack_info')) || {};
    return { format: 'upda-gym-pack', version: 1, name: info.name, created: info.created, discipline: info.discipline, topics: info.topics || [], questions: qs };
  }, []);

  // ---------- progress (never contains questions or the API key) ----------
  const exportProgressData = useCallback(async () => {
    const [rs, ex] = await Promise.all([db.getAll('reviews'), db.getAll('exams')]);
    return { app: 'upda-gym', version: 1, exportedAt: new Date().toISOString(), settings, meta, reviews: rs, exams: ex };
  }, [settings, meta]);

  const importProgressData = useCallback(
    async (data) => {
      if (!data || data.app !== 'upda-gym') {
        if (data?.format === 'upda-gym-pack') throw new Error('This is a question pack: use "Import question pack" instead.');
        throw new Error('This file is not a UPDA Gym progress export.');
      }
      await db.replaceProgress({
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        exams: Array.isArray(data.exams) ? data.exams : [],
        kv: { settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }, meta: { ...DEFAULT_META, ...(data.meta || {}) } },
      });
      await load();
    },
    [load],
  );

  // ---------- API key (encrypted at rest, only in memory here) ----------
  const setApiKey = useCallback(async (plain) => {
    await saveApiKey(plain);
    setApiKeyState(plain);
  }, []);

  const removeApiKey = useCallback(async () => {
    await clearApiKey();
    setApiKeyState('');
  }, []);

  // ---------- token usage ----------
  const recordUsage = useCallback((u) => {
    if (!u) return;
    setUsage((prev) => {
      const add = (x) => ({ input: x.input + u.input, output: x.output + u.output, calls: x.calls + 1 });
      const next = { session: add(prev.session), total: add(prev.total) };
      db.kvSet('usage_total', next.total);
      return next;
    });
  }, []);

  const saveDiagnosis = useCallback(async (d) => {
    await db.kvSet('diagnosis', d);
    setDiagnosis(d);
  }, []);

  const value = {
    ready,
    settings,
    updateSettings,
    meta,
    reviews,
    exams,
    addExam,
    questions,
    allQuestions,
    questionById,
    topics,
    topicLabel,
    usingSample,
    packInfo,
    importPack,
    exportPackData,
    exportProgressData,
    importProgressData,
    markExported,
    recordAnswer,
    aiNotes,
    saveAiNote,
    apiKey,
    setApiKey,
    removeApiKey,
    usage,
    recordUsage,
    diagnosis,
    saveDiagnosis,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

export function currentStreak(meta) {
  if (!meta.lastStudyDay) return 0;
  if (meta.lastStudyDay === dayKey() || meta.lastStudyDay === yesterdayKey()) return meta.streak;
  return 0;
}

export function daysUntil(dateStr, now = Date.now()) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}
