const DEFAULT_SETTINGS = {
  enabled: true
};

async function load() {
  const { translatorSettings } = await chrome.storage.sync.get('translatorSettings');
  const settings = { ...DEFAULT_SETTINGS, ...(translatorSettings || {}) };
  document.getElementById('enabled').checked = settings.enabled;
}

async function save() {
  const { translatorSettings } = await chrome.storage.sync.get('translatorSettings');
  const next = { ...(translatorSettings || {}), enabled: document.getElementById('enabled').checked };
  await chrome.storage.sync.set({ translatorSettings: next });
  window.close();
}

document.getElementById('save').addEventListener('click', save);
load();
