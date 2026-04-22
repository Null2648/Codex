const DEFAULT_SETTINGS = {
  enabled: true,
  sourceLang: 'ja',
  targetLang: 'ko',
  provider: 'google_free',
  cacheEnabled: true,
  cacheMaxEntries: 5000,
  providers: {
    google_free: {},
    google_cloud: { apiKey: '' },
    deepl: { apiKey: '', freeApi: true },
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    libre: { endpoint: 'https://libretranslate.de/translate', apiKey: '' }
  }
};

function mergeSettings(raw) {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...(raw?.providers || {}),
      google_cloud: {
        ...DEFAULT_SETTINGS.providers.google_cloud,
        ...(raw?.providers?.google_cloud || {})
      },
      deepl: {
        ...DEFAULT_SETTINGS.providers.deepl,
        ...(raw?.providers?.deepl || {})
      },
      openai: {
        ...DEFAULT_SETTINGS.providers.openai,
        ...(raw?.providers?.openai || {})
      },
      libre: {
        ...DEFAULT_SETTINGS.providers.libre,
        ...(raw?.providers?.libre || {})
      }
    }
  };
}

async function loadSettings() {
  const { translatorSettings } = await chrome.storage.sync.get('translatorSettings');
  const settings = mergeSettings(translatorSettings || {});

  document.getElementById('enabled').checked = settings.enabled;
  document.getElementById('provider').value = settings.provider;
  document.getElementById('sourceLang').value = settings.sourceLang;
  document.getElementById('targetLang').value = settings.targetLang;
  document.getElementById('cacheEnabled').checked = settings.cacheEnabled;
  document.getElementById('cacheMaxEntries').value = settings.cacheMaxEntries;

  document.getElementById('googleApiKey').value = settings.providers.google_cloud.apiKey || '';
  document.getElementById('deeplApiKey').value = settings.providers.deepl.apiKey || '';
  document.getElementById('deeplFreeApi').checked = Boolean(settings.providers.deepl.freeApi);
  document.getElementById('openaiApiKey').value = settings.providers.openai.apiKey || '';
  document.getElementById('openaiModel').value = settings.providers.openai.model || 'gpt-4o-mini';
  document.getElementById('libreEndpoint').value = settings.providers.libre.endpoint || DEFAULT_SETTINGS.providers.libre.endpoint;
  document.getElementById('libreApiKey').value = settings.providers.libre.apiKey || '';
}

async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    provider: document.getElementById('provider').value,
    sourceLang: document.getElementById('sourceLang').value.trim() || 'auto',
    targetLang: document.getElementById('targetLang').value.trim() || 'ko',
    cacheEnabled: document.getElementById('cacheEnabled').checked,
    cacheMaxEntries: Number(document.getElementById('cacheMaxEntries').value) || 5000,
    providers: {
      google_free: {},
      google_cloud: {
        apiKey: document.getElementById('googleApiKey').value.trim()
      },
      deepl: {
        apiKey: document.getElementById('deeplApiKey').value.trim(),
        freeApi: document.getElementById('deeplFreeApi').checked
      },
      openai: {
        apiKey: document.getElementById('openaiApiKey').value.trim(),
        model: document.getElementById('openaiModel').value.trim() || 'gpt-4o-mini'
      },
      libre: {
        endpoint: document.getElementById('libreEndpoint').value.trim(),
        apiKey: document.getElementById('libreApiKey').value.trim()
      }
    }
  };

  await chrome.storage.sync.set({ translatorSettings: settings });
  setStatus('Saved! Reload Mahjong Soul tab for full effect.');
}

function setStatus(text) {
  const el = document.getElementById('status');
  el.textContent = text;
  setTimeout(() => {
    el.textContent = '';
  }, 3000);
}

async function clearCache() {
  await chrome.storage.local.set({ translationCache: {} });
  setStatus('Cache cleared.');
}

document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('clearCache').addEventListener('click', clearCache);

loadSettings();
