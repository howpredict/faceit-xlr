'use strict';
// Reads FACEIT's own public CSS files for the custom-color feature.
// The page already downloaded these files; cross-origin rules are simply not
// readable from a content script. Only FACEIT hosts, only text/css, no cookies.
const ALLOWED = /^https:\/\/([a-z0-9-]+\.)*(faceit\.com|faceit-cdn\.net)\//i;
const cache = new Map();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'nuage-css' || typeof message.url !== 'string' || !ALLOWED.test(message.url)) return false;
  if (!sender.tab || !/^https:\/\/(www\.)?faceit\.com\//.test(sender.url || '')) return false;
  const url = message.url;
  if (!cache.has(url)) {
    cache.set(url, fetch(url, { credentials: 'omit', cache: 'force-cache' }).then(async r => {
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/css|text\/plain/.test(type)) throw new Error('not css');
      const text = await r.text();
      if (text.length > 8e6) throw new Error('too large');
      return { ok: true, text };
    }).catch(() => { cache.delete(url); return { ok: false }; }));
    if (cache.size > 60) cache.delete(cache.keys().next().value);
  }
  cache.get(url).then(respond);
  return true;
});
