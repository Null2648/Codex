(() => {
  const pending = new Map();
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

  function shouldTranslate(text) {
    if (typeof text !== 'string') {
      return false;
    }

    const normalized = text.trim();
    if (normalized.length < 2) {
      return false;
    }

    if (/^[\d\s\W_]+$/u.test(normalized)) {
      return false;
    }

    if (/[가-힣]/.test(normalized) && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(normalized)) {
      return false;
    }

    return true;
  }

  function requestTranslate(text) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve) => {
      pending.set(requestId, resolve);
      window.postMessage(
        {
          source: 'majsoul-translator-page',
          type: 'TRANSLATE_REQUEST',
          requestId,
          text
        },
        '*'
      );

      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          resolve(text);
        }
      }, 1200);
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== 'majsoul-translator-content' || data.type !== 'TRANSLATE_RESPONSE') {
      return;
    }

    const resolver = pending.get(data.requestId);
    if (!resolver) {
      return;
    }

    pending.delete(data.requestId);
    resolver(data.translatedText || data.originalText || '');
  });

  CanvasRenderingContext2D.prototype.fillText = function patchedFillText(text, x, y, maxWidth) {
    if (!shouldTranslate(text)) {
      return originalFillText.call(this, text, x, y, maxWidth);
    }

    const original = String(text);
    requestTranslate(original)
      .then((translated) => {
        originalFillText.call(this, translated, x, y, maxWidth);
      })
      .catch(() => {
        originalFillText.call(this, original, x, y, maxWidth);
      });

    return undefined;
  };

  CanvasRenderingContext2D.prototype.strokeText = function patchedStrokeText(text, x, y, maxWidth) {
    if (!shouldTranslate(text)) {
      return originalStrokeText.call(this, text, x, y, maxWidth);
    }

    const original = String(text);
    requestTranslate(original)
      .then((translated) => {
        originalStrokeText.call(this, translated, x, y, maxWidth);
      })
      .catch(() => {
        originalStrokeText.call(this, original, x, y, maxWidth);
      });

    return undefined;
  };
})();
