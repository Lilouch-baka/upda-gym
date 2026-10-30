import { openDB } from 'idb';

// Everything lives on the device in IndexedDB.
// Stores:
//   questions   the imported question pack (one record per question). Empty until you import
//               upda-bank.json; the app then falls back to the 5 public sample questions.
//   reviews     one record per question: spaced-repetition state + answer history
//   exams       one record per finished exam simulation (score, answers, timing)
//   kv          settings, meta (streak, last export), pack info, token usage, weekly diagnosis,
//               and the encrypted API key (see secrets.js)
//   drafts      unfinished sessions and exams, keyed by a string
//
// Upgrades only ever ADD stores. Existing data is never cleared.
const dbPromise = openDB('upda-gym', 1, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('questions', { keyPath: 'id' });
      db.createObjectStore('reviews', { keyPath: 'qid' });
      db.createObjectStore('exams', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('kv');
      db.createObjectStore('drafts');
    }
  },
});

// drafts keys of the unfinished practice session and exam, so Home can offer Resume.
export const SESSION_DRAFT = 'session:current';
export const EXAM_DRAFT = 'exam:current';

export async function get(store, key) {
  return (await dbPromise).get(store, key);
}

export async function putKey(store, key, value) {
  return (await dbPromise).put(store, value, key);
}

export async function getAll(store) {
  return (await dbPromise).getAll(store);
}

export async function put(store, value) {
  return (await dbPromise).put(store, value);
}

export async function del(store, key) {
  return (await dbPromise).delete(store, key);
}

export async function kvGet(key) {
  return (await dbPromise).get('kv', key);
}

export async function kvSet(key, value) {
  return (await dbPromise).put('kv', value, key);
}

export async function kvDel(key) {
  return (await dbPromise).delete('kv', key);
}

// Replace the question pack. Progress (reviews) is kept: ids are stable across pack versions.
export async function replaceQuestions(questions, info) {
  const db = await dbPromise;
  const tx = db.transaction(['questions', 'kv'], 'readwrite');
  await tx.objectStore('questions').clear();
  for (const q of questions) tx.objectStore('questions').put(q);
  tx.objectStore('kv').put(info, 'pack_info');
  await tx.done;
}

// Used only by an explicit progress import that the user confirmed. Never touches the questions.
export async function replaceProgress({ reviews = [], exams = [], kv = {} }) {
  const db = await dbPromise;
  const tx = db.transaction(['reviews', 'exams', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('reviews').clear(), tx.objectStore('exams').clear()]);
  for (const r of reviews) tx.objectStore('reviews').put(r);
  for (const e of exams) tx.objectStore('exams').put(e);
  for (const [k, v] of Object.entries(kv)) tx.objectStore('kv').put(v, k);
  await tx.done;
}

// Ask the browser not to evict our storage (helps on iOS).
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // not supported
  }
  return false;
}
