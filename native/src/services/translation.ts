// ...new file...
import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_URLS = [
  'https://libretranslate.com/translate',
  'https://translate.argosopentech.com/translate',
  'https://libretranslate.de/translate',
  // keep google public endpoint as a last-resort (may be rate-limited)
  'https://translate.googleapis.com/translate_a/single?client=gtx'
];

const memoryCache = new Map<string, string>();

async function callLibre(url: string, text: string, target: string, source = 'auto') {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source,
      target,
      format: 'text'
    })
  });
  return resp.json();
}

async function callGoogle(url: string, text: string, target: string, source = 'auto') {
  const resp = await fetch(`${url}&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`);
  return resp.json();
}

export async function translateText(text: string, targetLang: string, sourceLang = 'auto') {
  if (!text || targetLang === 'en') return text;

  const cacheKey = `${sourceLang}-${targetLang}-${text}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey)!;

  // Try AsyncStorage cache
  try {
    const stored = await AsyncStorage.getItem(`translation:${cacheKey}`);
    if (stored) {
      memoryCache.set(cacheKey, stored);
      return stored;
    }
  } catch (e) {
    // ignore storage errors
  }

  for (const apiUrl of FALLBACK_URLS) {
    try {
      let translated: string | null = null;
      if (apiUrl.includes('googleapis')) {
        const data = await callGoogle(apiUrl, text, targetLang, sourceLang);
        // google response format: [[[ "translated", ... ]], ...]
        if (Array.isArray(data)) {
          translated = (data[0] || []).map((item: any) => item[0]).join('');
        }
      } else {
        const data = await callLibre(apiUrl, text, targetLang, sourceLang);
        if (data?.translatedText) translated = data.translatedText;
      }

      if (translated) {
        memoryCache.set(cacheKey, translated);
        try {
          await AsyncStorage.setItem(`translation:${cacheKey}`, translated);
        } catch (e) {
          // ignore
        }
        return translated;
      }
    } catch (err) {
      console.warn(`Translation provider failed: ${apiUrl}`, err);
      continue;
    }
  }

  // fallback to original text
  return text;
}

// Bulk translate helper: preserves keys
export async function translateStrings(keysToTranslate: Record<string, string>, targetLang: string) {
  const result: Record<string, string> = {};
  const entries = Object.entries(keysToTranslate);
  await Promise.all(entries.map(async ([k, v]) => {
    try {
      result[k] = await translateText(v, targetLang, 'auto');
    } catch (e) {
      result[k] = v;
    }
  }));
  return result;
}

export default {
  translateText,
  translateStrings
};
// ...end file...