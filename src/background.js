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

chrome.runtime.onInstalled.addListener(async () => {
  const { translatorSettings } = await chrome.storage.sync.get('translatorSettings');
  if (!translatorSettings) {
    await chrome.storage.sync.set({ translatorSettings: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRANSLATE_TEXT') {
    translateText(message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'GET_SETTINGS') {
    getSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  return false;
});

async function getSettings() {
  const { translatorSettings } = await chrome.storage.sync.get('translatorSettings');
  return { ...DEFAULT_SETTINGS, ...(translatorSettings || {}) };
}

async function translateText(payload) {
  const settings = await getSettings();

  if (!settings.enabled) {
    return { translatedText: payload.text };
  }

  const provider = settings.provider;
  const sourceLang = payload.sourceLang || settings.sourceLang;
  const targetLang = payload.targetLang || settings.targetLang;
  const translatedText = await callProvider(provider, sourceLang, targetLang, payload.text, settings.providers);

  return { translatedText };
}

async function callProvider(provider, sourceLang, targetLang, text, providers) {
  switch (provider) {
    case 'deepl':
      return callDeepL(sourceLang, targetLang, text, providers.deepl);
    case 'google_cloud':
      return callGoogleCloud(sourceLang, targetLang, text, providers.google_cloud);
    case 'openai':
      return callOpenAI(sourceLang, targetLang, text, providers.openai);
    case 'libre':
      return callLibre(sourceLang, targetLang, text, providers.libre);
    case 'google_free':
    default:
      return callGoogleFree(sourceLang, targetLang, text);
  }
}

async function callGoogleFree(sourceLang, targetLang, text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sourceLang || 'auto');
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google free translate failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data?.[0]) ? data[0].map((row) => row[0]).join('') : text;
}

async function callDeepL(sourceLang, targetLang, text, cfg) {
  if (!cfg?.apiKey) {
    throw new Error('DeepL API key is missing');
  }

  const endpoint = cfg.freeApi ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  const body = new URLSearchParams();
  body.set('text', text);
  body.set('target_lang', targetLang.toUpperCase());
  if (sourceLang && sourceLang !== 'auto') {
    body.set('source_lang', sourceLang.toUpperCase());
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${cfg.apiKey}` },
    body
  });

  if (!res.ok) {
    throw new Error(`DeepL failed (${res.status})`);
  }

  const data = await res.json();
  return data?.translations?.[0]?.text || text;
}

async function callGoogleCloud(sourceLang, targetLang, text, cfg) {
  if (!cfg?.apiKey) {
    throw new Error('Google Cloud API key is missing');
  }

  const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang === 'auto' ? undefined : sourceLang,
      target: targetLang,
      format: 'text'
    })
  });

  if (!res.ok) {
    throw new Error(`Google Cloud failed (${res.status})`);
  }

  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}

async function callOpenAI(sourceLang, targetLang, text, cfg) {
  if (!cfg?.apiKey) {
    throw new Error('OpenAI API key is missing');
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: 'You are a translation engine. Return only translated text without explanations.'
        },
        {
          role: 'user',
          content: `Translate from ${sourceLang} to ${targetLang}:\n${text}`
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI translation failed (${res.status})`);
  }

  const data = await res.json();
  return data?.output_text?.trim() || text;
}

async function callLibre(sourceLang, targetLang, text, cfg) {
  if (!cfg?.endpoint) {
    throw new Error('LibreTranslate endpoint is missing');
  }

  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang || 'auto',
      target: targetLang,
      api_key: cfg.apiKey || undefined,
      format: 'text'
    })
  });

  if (!res.ok) {
    throw new Error(`LibreTranslate failed (${res.status})`);
  }

  const data = await res.json();
  return data?.translatedText || text;
}
