const TEXT_MIN_LENGTH = 2;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
let settings = null;

main().catch((err) => console.error('[MajsoulTranslator] init failed', err));

async function main() {
  const result = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  settings = result?.settings;

  if (!settings?.enabled) {
    return;
  }

  injectPageHook();
  setupPageBridge();

  await translateExistingText();
  observeMutations();
}

function injectPageHook() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/page-hook.js');
  script.dataset.source = 'majsoul-translator';
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

function setupPageBridge() {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== 'majsoul-translator-page' || data.type !== 'TRANSLATE_REQUEST') {
      return;
    }

    const text = normalizeText(data.text || '');
    let translatedText = text;

    if (looksTranslatable(text)) {
      translatedText = await translateWithCache(text);
    }

    window.postMessage(
      {
        source: 'majsoul-translator-content',
        type: 'TRANSLATE_RESPONSE',
        requestId: data.requestId,
        translatedText,
        originalText: text
      },
      '*'
    );
  });
}

function observeMutations() {
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          await translateNode(node);
        }
      } else if (mutation.type === 'characterData') {
        await translateTextNode(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function translateExistingText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const jobs = [];

  while (walker.nextNode()) {
    jobs.push(translateTextNode(walker.currentNode));
  }

  await Promise.allSettled(jobs);
}

async function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    await translateTextNode(node);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (SKIP_TAGS.has(node.tagName)) {
    return;
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const jobs = [];
  while (walker.nextNode()) {
    jobs.push(translateTextNode(walker.currentNode));
  }

  await Promise.allSettled(jobs);
}

function normalizeText(input) {
  return String(input).replace(/\s+/g, ' ').trim();
}

function looksTranslatable(text) {
  if (!text || text.length < TEXT_MIN_LENGTH) {
    return false;
  }

  if (/^[\d\s\W_]+$/u.test(text)) {
    return false;
  }

  if (/[가-힣]/.test(text) && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) {
    return false;
  }

  return true;
}

function cacheKey(text) {
  return [settings.provider, settings.sourceLang, settings.targetLang, text].join('::');
}

async function getLocalCache() {
  const { translationCache = {} } = await chrome.storage.local.get('translationCache');
  return translationCache;
}

async function setLocalCache(cache) {
  await chrome.storage.local.set({ translationCache: cache });
}

async function getCachedTranslation(key) {
  const cache = await getLocalCache();
  return cache[key]?.translatedText;
}

async function saveCachedTranslation(key, translatedText) {
  if (!settings.cacheEnabled) {
    return;
  }

  const cache = await getLocalCache();
  cache[key] = {
    translatedText,
    ts: Date.now()
  };

  const entries = Object.entries(cache);
  if (entries.length > settings.cacheMaxEntries) {
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const pruned = Object.fromEntries(entries.slice(entries.length - settings.cacheMaxEntries));
    await setLocalCache(pruned);
    return;
  }

  await setLocalCache(cache);
}

async function translateWithCache(normalized) {
  const key = cacheKey(normalized);
  const cached = await getCachedTranslation(key);
  if (cached) {
    return cached;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      payload: {
        text: normalized,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang
      }
    });

    if (!response?.ok || !response.translatedText) {
      return normalized;
    }

    await saveCachedTranslation(key, response.translatedText);
    return response.translatedText;
  } catch (error) {
    console.warn('[MajsoulTranslator] translation failed', error);
    return normalized;
  }
}

async function translateTextNode(textNode) {
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const parent = textNode.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-majsoul-translated="1"]')) {
    return;
  }

  const original = textNode.nodeValue || '';
  const normalized = normalizeText(original);

  if (!looksTranslatable(normalized)) {
    return;
  }

  const translated = await translateWithCache(normalized);
  textNode.nodeValue = original.replace(normalized, translated);
  parent.dataset.majsoulTranslated = '1';
}
