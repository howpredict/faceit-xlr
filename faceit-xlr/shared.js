'use strict';
if (!globalThis.chrome?.storage?.local) {
  const _listeners = [];
  globalThis.chrome = globalThis.chrome || {};
  globalThis.chrome.runtime = globalThis.chrome.runtime || {
    id: 'xlr-preview',
    getURL: path => path,
    onMessage: { addListener: () => {} }
  };
  globalThis.chrome.tabs = globalThis.chrome.tabs || {
    query: async () => [],
    sendMessage: async () => ({ ok: false }),
    update: async () => {}
  };
  globalThis.chrome.storage = {
    local: {
      get: async (keys) => {
        const out = {};
        const list = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
        for (const k of list) {
          try {
            const raw = localStorage.getItem('xlr_st_' + k);
            if (raw !== null) out[k] = JSON.parse(raw);
          } catch {}
        }
        return out;
      },
      set: async (items) => {
        const changes = {};
        for (const [k, v] of Object.entries(items)) {
          const oldRaw = localStorage.getItem('xlr_st_' + k);
          const oldVal = oldRaw ? JSON.parse(oldRaw) : undefined;
          localStorage.setItem('xlr_st_' + k, JSON.stringify(v));
          changes[k] = { oldValue: oldVal, newValue: v };
        }
        _listeners.forEach(fn => { try { fn(changes, 'local'); } catch {} });
      }
    },
    onChanged: {
      addListener: (fn) => _listeners.push(fn)
    }
  };
}
globalThis.Nuage = Object.freeze({
  // Keep the previous storage keys for in-place updates from Canvas / Nuage 2–3.1.
  key: 'faceitCanvasSettingsV1', imageKey: 'faceitCanvasImageV1',
  galleryKey: 'faceitNuageGalleryV3', mediaKey: 'faceitNuageMediaV2', langKey: 'faceitNuageLanguageV2',
  fontKey: 'faceitNuageFontV1', hiddenKey: 'faceitNuageHiddenV1', seedKey: 'faceitNuageSeedV1',
  // Elements hidden out of the box. The stable part of the class name is used,
  // so the rule survives FACEIT redeploys (the -sc-… hash changes).
  defaultHidden: [
    { sel: '[class*="PartyControlContainer"]', mode: 'hide', label: 'div.styles__PartyControlContainer-sc-c9a9cc81-2 1448×44', builtin: 'party-control' }
  ],
  // Adds the built-in items once; a user who restores one keeps it restored.
  withDefaults(list, seeded) {
    const out = Array.isArray(list) ? list.slice() : [];
    if (seeded) return out;
    for (const item of this.defaultHidden) if (!out.some(x => x.builtin === item.builtin || x.sel === item.sel)) out.unshift({ ...item, added: Date.now() });
    return out;
  },
  defaults: {
    enabled: true, dim: 45, blur: 0, focus: 68, x: 65, y: 50, fit: 'cover',
    accentColor: '#ff5500', colorEnabled: false, clearTop: true, focusEnabled: true,
    videoPaused: false, pauseHidden: true,
    // 3.2 — panel style and interface
    style: 'glass', glassBlur: 14, radius: 0,
    modeGlow: true, ctaGlow: false, glowPulse: true, glowColor: 'white',
    hideEsea: false, hideMissions: false, hideQueue: false, hideBadges: false, thinScroll: false,
    // 3.3
    hideElo: false, clearMatchPanel: false, hidePartyText: true, ctaText: '',
    // 3.4
    hideLadders: false, hideInviteSlots: false, minimalAvatar: true, hideDividers: true, hideScrollbars: true,
    // 3.7
    fontFamily: '', textColorEnabled: false, textColor: '#ffffff'
  },
  // Fonts shipped with Windows / macOS; «custom» = a font file uploaded in the popup.
  fonts: ['Segoe UI', 'Bahnschrift', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Calibri', 'Cambria', 'Candara', 'Corbel', 'Consolas', 'Franklin Gothic Medium', 'Impact', 'Comic Sans MS', 'Segoe Print', 'Lucida Console', 'Palatino Linotype', 'Helvetica Neue', 'Avenir Next', 'Menlo'],
  ranges: { dim: [0, 100], focus: [0, 100], x: [0, 100], y: [0, 100], blur: [0, 20], glassBlur: [0, 40], radius: [0, 28] },
  booleans: ['enabled', 'clearTop', 'focusEnabled', 'videoPaused', 'pauseHidden', 'colorEnabled',
    'modeGlow', 'ctaGlow', 'glowPulse', 'hideEsea', 'hideMissions', 'hideQueue', 'hideBadges', 'thinScroll',
    'hideElo', 'clearMatchPanel', 'hidePartyText', 'hideLadders', 'hideInviteSlots', 'minimalAvatar', 'hideDividers', 'hideScrollbars', 'textColorEnabled'],
  normalize(input) {
    const v = input && typeof input === 'object' ? input : {};
    const out = { ...this.defaults };
    for (const [k, [min, max]] of Object.entries(this.ranges)) if (Number.isFinite(v[k])) out[k] = Math.max(min, Math.min(max, v[k]));
    for (const k of this.booleans) if (typeof v[k] === 'boolean') out[k] = v[k];
    if (['cover', 'contain'].includes(v.fit)) out.fit = v.fit;
    if (['classic', 'glass', 'water'].includes(v.style)) out.style = v.style;
    if (['white', 'accent'].includes(v.glowColor)) out.glowColor = v.glowColor;
    out.clearTop = true;
    out.hidePartyText = true;
    out.minimalAvatar = true;
    out.hideDividers = true;
    out.hideScrollbars = true;
    if (typeof v.ctaText === 'string') out.ctaText = v.ctaText.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
    if (typeof v.fontFamily === 'string' && (v.fontFamily === 'custom' || this.fonts.includes(v.fontFamily))) out.fontFamily = v.fontFamily;
    if (typeof v.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.textColor)) out.textColor = v.textColor.toLowerCase();
    if (typeof v.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.accentColor)) out.accentColor = v.accentColor.toLowerCase();
    return out;
  },
  validImage(v) { return typeof v === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 7000000; },
  validMedia(v) { return !!v && ['image', 'video'].includes(v.kind) && typeof v.id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(v.id); }
});
