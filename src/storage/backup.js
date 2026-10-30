// Export / import of progress and of the question pack, each as its own JSON file.
// "Export progress" never contains questions; "Export question pack" never contains progress.

// On iPhone the share sheet is the most reliable way to save to Files / iCloud Drive / AirDrop.
async function saveJson(data, name, title) {
  const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return 'shared';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

const today = () => new Date().toISOString().slice(0, 10);

export async function exportProgress(app) {
  const how = await saveJson(await app.exportProgressData(), `upda-gym-progress-${today()}.json`, 'UPDA Gym progress');
  app.markExported();
  return how;
}

export async function exportPack(app) {
  return saveJson(await app.exportPackData(), `upda-bank-${today()}.json`, 'UPDA Gym question pack');
}

export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
