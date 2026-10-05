'use strict';
// FACEIT Nuage — custom FACEIT color.
//
// 1. Stylesheet level (main path). FACEIT's own CSS rules that paint orange
//    are mirrored into our stylesheet with the chosen color and !important.
//    Hover/active/focus states come for free, new elements are colored before
//    their first paint, and nothing is toggled on elements → no blinking.
//    Cross-origin CSS files are read through the extension's service worker.
// 2. Element level (fallback) for inline styles and SVG fill/stroke
//    attributes. Reads happen with transitions held, so nothing animates.
//
// Every orange becomes exactly the chosen color (only transparency is kept).

// Transition guard: elements we touch get transition:none until the browser
// has computed the final style, so our changes never animate or loop.
globalThis.NuageHold = (() => {
  const attr = 'data-nuage-hold';
  const held = new Set();
  return Object.freeze({
    attr,
    add(el, deep = false) {
      if (!(el instanceof Element)) return;
      if (deep) el.setAttribute(attr, 'deep');
      else if (!el.hasAttribute(attr)) el.setAttribute(attr, '');
      held.add(el);
    },
    all() { document.documentElement.setAttribute(attr + '-all', ''); held.add(document.documentElement); },
    release() {
      if (!held.size) return;
      void document.documentElement.offsetWidth; // compute final styles while held
      for (const el of held) { el.removeAttribute(attr); el.removeAttribute(attr + '-all'); }
      held.clear();
    },
    css: `[${attr}],[${attr}]::before,[${attr}]::after,[${attr}="deep"] *,[${attr}="deep"] *::before,[${attr}="deep"] *::after,html[${attr}-all] *,html[${attr}-all] *::before,html[${attr}-all] *::after{transition:none!important}`
  });
})();

// Deferred DOM writes: a scan first reads every element, then writes once.
// Interleaving reads and writes would force a layout per element.
globalThis.NuageWrites = (() => {
  const queue = [];
  return Object.freeze({ push(fn) { queue.push(fn); }, run() { for (let i = 0; i < queue.length; i++) queue[i](); queue.length = 0; } });
})();

globalThis.NuageColors = class {
  constructor() {
    this.attr = 'data-nuage-color';
    this.scopeAttr = 'data-nuage-hover';
    this.counter = 0;
    this.scopeCounter = 0;
    this.entries = new Map();       // el -> {id, normal, hover, scope, logo}
    this.checked = new WeakMap();   // el -> {normal:true, hover:true} for elements without orange
    this.scopes = new Set();
    this.sheetRules = new Map();    // CSSRule -> override text ('' when nothing to override)
    this.remote = new Map();        // href -> CSSStyleSheet | 'pending' | 'failed'
    this.sheetText = '';
    this.lengths = new WeakMap();   // sheet -> rule count already processed
    this.rules = document.createElement('style');
    this.rules.id = 'nuage-colors-v3';
    this.rules.setAttribute('data-nuage-owned', '');
    this.sheet = document.createElement('style');
    this.sheet.id = 'nuage-colors-sheets-v3';
    this.sheet.setAttribute('data-nuage-owned', '');
    this.enabled = false;
    this.hex = '#ff5500';
    this.dirty = false;
    this.sheetsDirty = false;
    this.filterHost = null;
    this.matrix = null;
    this.onRemote = null;
  }
  static PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke', 'stop-color'];
  static COMPLEX = ['background-image', 'box-shadow', 'text-shadow'];
  static INTERACTIVE = 'a,button,[role="button"],[role="tab"],[role="menuitem"],[role="option"],label';
  static COLOR_PROP = /color$|^fill$|^stroke$|^background-image$|^box-shadow$|^text-shadow$|^border-image-source$|^-webkit-text-(fill|stroke)-color$|^mask-image$/;
  static TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:orange|darkorange|orangered)\b/gi;

  // ---------- color math ----------
  static rgb(value) {
    const m = String(value).match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const a = m[1].match(/[\d.]+%?/g);
    if (!a || a.length < 3) return null;
    const alpha = a[3] === undefined ? 1 : a[3].endsWith('%') ? parseFloat(a[3]) / 100 : parseFloat(a[3]);
    return [parseFloat(a[0]), parseFloat(a[1]), parseFloat(a[2]), alpha];
  }
  static hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  // Any CSS color token -> [r,g,b,a] or null.
  static parse(token) {
    const t = token.trim().toLowerCase();
    if (t === 'orange') return [255, 165, 0, 1];
    if (t === 'darkorange') return [255, 140, 0, 1];
    if (t === 'orangered') return [255, 69, 0, 1];
    if (t[0] === '#') {
      let h = t.slice(1);
      if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      const n = h.match(/../g).map(x => parseInt(x, 16));
      return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3] / 255];
    }
    if (t.startsWith('rgb')) return this.rgb(t.replace(/\s*\/\s*/, ',').replace(/\s+/g, ','));
    if (t.startsWith('hsl')) {
      const n = t.match(/[\d.]+%?/g);
      if (!n || n.length < 3) return null;
      const alpha = n[3] === undefined ? 1 : n[3].endsWith('%') ? parseFloat(n[3]) / 100 : parseFloat(n[3]);
      return [...this.hslToRgb(parseFloat(n[0]), parseFloat(n[1]), parseFloat(n[2])), alpha];
    }
    return null;
  }
  static isOrangeRGB(c) {
    if (!c || c[3] === 0) return false;
    const [r, g, b] = c, max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    if (max < 28 || !delta || delta / max < .58) return false;
    let hue = max === r ? 60 * ((g - b) / delta % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
    return hue >= 12 && hue <= 39;
  }
  static orange(value) { return this.isOrangeRGB(this.parse(String(value))); }
  static hasOrange(value) {
    return !/url\(/i.test(value) && (String(value).match(this.TOKEN) || []).some(v => this.orange(v));
  }
  static foreground(hex) {
    const rgb = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#111827' : '#ffffff';
  }
  target() { return this.hex.match(/[0-9a-f]{2}/gi).map(n => parseInt(n, 16)); }
  // One solid color everywhere: keep only the source transparency.
  mapped(source) {
    const c = NuageColors.parse(source);
    if (!c) return source;
    const [r, g, b] = this.target();
    return c[3] >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${+c[3].toFixed(3)})`;
  }
  replaceTokens(value) {
    if (!this.accentOn) return value;
    return value.replace(NuageColors.TOKEN, token => NuageColors.orange(token) ? this.mapped(token) : token);
  }
  // White/grey text → the chosen text color; dimmer greys stay dimmer.
  static lightNeutral(c) {
    if (!c || c[3] === 0) return false;
    const max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
    return max - min <= 30 && (c[0] * .2126 + c[1] * .7152 + c[2] * .0722) / 255 >= .42;
  }
  replaceText(value) {
    if (!this.textHex) return value;
    const [r, g, b] = this.textHex.match(/[0-9a-f]{2}/gi).map(n => parseInt(n, 16));
    return value.replace(NuageColors.TOKEN, token => {
      const c = NuageColors.parse(token);
      if (!NuageColors.lightNeutral(c)) return token;
      const lum = (c[0] * .2126 + c[1] * .7152 + c[2] * .0722) / 255;
      const alpha = +(c[3] * Math.min(1, Math.max(.45, lum))).toFixed(3);
      return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
    });
  }
  // Custom properties can hold a color or bare channels ("255 85 0", "20 100% 50%").
  replaceVar(value) {
    if (!this.accentOn) return value;
    const v = value.trim();
    if (!v || /url\(|var\(/i.test(v)) return value;
    const triplet = v.match(/^(\d{1,3}(?:\.\d+)?)(\s*,\s*|\s+)(\d{1,3}(?:\.\d+)?)\2(\d{1,3}(?:\.\d+)?)$/);
    if (triplet) {
      const c = [+triplet[1], +triplet[3], +triplet[4], 1];
      if (c.every((n, i) => i === 3 || n <= 255) && NuageColors.isOrangeRGB(c)) return this.target().join(triplet[2]);
      return value;
    }
    const hsl = v.match(/^(\d+(?:\.\d+)?)(?:deg)?(\s*,\s*|\s+)(\d+(?:\.\d+)?)%\2(\d+(?:\.\d+)?)%$/);
    if (hsl) {
      if (!NuageColors.isOrangeRGB([...NuageColors.hslToRgb(+hsl[1], +hsl[3], +hsl[4]), 1])) return value;
      const [r, g, b] = this.target().map(n => n / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
      let h = !d ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
      const sep = hsl[2];
      return `${Math.round(h)}${sep}${Math.round(s * 100)}%${sep}${Math.round(l * 100)}%`;
    }
    return this.replaceTokens(value);
  }

  // ---------- lifecycle ----------
  ensureLogoFilter() {
    if (this.filterHost) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'), defs = document.createElementNS(ns, 'defs');
    const filter = document.createElementNS(ns, 'filter'), matrix = document.createElementNS(ns, 'feColorMatrix');
    svg.setAttribute('data-nuage-owned', '');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;overflow:hidden';
    filter.id = 'nuage-logo-filter-v3';
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    matrix.setAttribute('type', 'matrix');
    filter.append(matrix);
    defs.append(filter);
    svg.append(defs);
    document.documentElement.append(svg);
    this.filterHost = svg;
    this.matrix = matrix;
  }
  configure(settings) {
    this.accentOn = settings.enabled && settings.colorEnabled;
    const text = settings.enabled && settings.textColorEnabled ? settings.textColor : null;
    const enable = this.accentOn || !!text;
    const changed = this.hex !== settings.accentColor || this.textHex !== text || this.lastAccentOn !== this.accentOn;
    this.hex = settings.accentColor;
    this.textHex = text;
    this.lastAccentOn = this.accentOn;
    if (!enable) { this.clear(); return; }
    const first = !this.enabled;
    this.enabled = true;
    if (!this.sheet.isConnected) document.documentElement.append(this.sheet);
    if (!this.rules.isConnected) document.documentElement.append(this.rules);
    if (changed || first) {
      for (const rule of this.sheetRules.keys()) this.sheetRules.set(rule, null);
      this.lengths = new WeakMap();
      this.sheetsDirty = true;
      this.dirty = true;
    }
    this.syncSheets();
  }

  // ---------- stylesheet level ----------
  declarations(style) {
    const out = [];
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      const value = style.getPropertyValue(prop);
      if (!value) continue;
      let next = value;
      if (prop.startsWith('--')) {
        next = this.replaceVar(value);
        if (next === value && /text|font|foreground|fg|content|typography/i.test(prop)) next = this.replaceText(value);
      } else if (NuageColors.COLOR_PROP.test(prop) && !/url\(/i.test(value)) {
        next = this.replaceTokens(value);
        if (prop === 'color' || prop === '-webkit-text-fill-color') next = this.replaceText(next);
      }
      if (next !== value) out.push(`${prop}:${next}!important`);
    }
    const bg = NuageColors.parse(style.getPropertyValue('background-color') || '');
    if (this.accentOn && bg && bg[3] >= .8 && NuageColors.isOrangeRGB(bg) && !style.getPropertyValue('color').includes('var(')) out.push(`color:${NuageColors.foreground(this.hex)}!important`);
    return out.join(';');
  }
  ruleText(rule, depth = 0) {
    if (depth > 12) return '';
    if (rule instanceof CSSStyleRule) {
      const own = this.declarations(rule.style);
      const nested = rule.cssRules ? [...rule.cssRules].map(r => this.ruleText(r, depth + 1)).join('') : '';
      return own || nested ? `${rule.selectorText}{${own}${own && nested ? ';' : ''}${nested}}` : '';
    }
    if (rule instanceof CSSImportRule) {
      try { return rule.styleSheet ? [...rule.styleSheet.cssRules].map(r => this.ruleText(r, depth + 1)).join('') : ''; } catch { return ''; }
    }
    if (typeof CSSKeyframesRule !== 'undefined' && rule instanceof CSSKeyframesRule) return '';
    if (rule.cssRules) {
      const inner = [...rule.cssRules].map(r => this.ruleText(r, depth + 1)).join('');
      if (!inner) return '';
      const header = rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();
      return header ? `${header}{${inner}}` : inner;
    }
    return '';
  }
  collectSheet(sheet) {
    let list;
    try { list = sheet.cssRules; } catch { return false; }
    if (this.lengths.get(sheet) === list.length) return false;
    this.lengths.set(sheet, list.length);
    let found = false;
    for (const rule of list) {
      if (this.sheetRules.has(rule) && this.sheetRules.get(rule) !== null) continue;
      const text = this.ruleText(rule);
      this.sheetRules.set(rule, text);
      if (text) found = true;
    }
    return found;
  }
  sheetsComplete() {
    for (const state of this.remote.values()) if (!(state instanceof CSSStyleSheet)) return false;
    return true;
  }
  requestRemote(href) {
    if (this.remote.has(href) || !/^https:\/\//.test(href)) return;
    this.remote.set(href, 'pending');
    try {
      chrome.runtime.sendMessage({ type: 'nuage-css', url: href }).then(response => {
        if (!response?.ok) { this.remote.set(href, 'failed'); return; }
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(response.text);
        this.remote.set(href, sheet);
        this.sheetsDirty = true;
        this.onRemote?.();
      }).catch(() => this.remote.set(href, 'failed'));
    } catch { this.remote.set(href, 'failed'); }
  }
  syncSheets() {
    if (!this.enabled) return false;
    const sheets = [...document.styleSheets, ...(document.adoptedStyleSheets || [])];
    for (const sheet of sheets) {
      const owner = sheet.ownerNode;
      if (owner instanceof Element && owner.hasAttribute('data-nuage-owned')) continue;
      if (this.collectSheet(sheet)) this.sheetsDirty = true;
      else if (sheet.href) {
        let accessible = true;
        try { void sheet.cssRules; } catch { accessible = false; }
        if (!accessible) {
          const remote = this.remote.get(sheet.href);
          if (remote instanceof CSSStyleSheet) { if (this.collectSheet(remote)) this.sheetsDirty = true; }
          else this.requestRemote(sheet.href);
        }
      }
    }
    if (!this.sheetsDirty) return false;
    this.sheetsDirty = false;
    const text = [...this.sheetRules.values()].filter(Boolean).join('\n');
    if (text === this.sheetText) return false;
    this.sheetText = text;
    NuageHold.all();
    this.sheet.textContent = text;
    return true;
  }

  // ---------- element level ----------
  read(computed, pseudo) {
    if (pseudo && ['none', 'normal'].includes(computed.content)) return null;
    const values = {};
    for (const prop of NuageColors.PROPS) values[prop] = computed.getPropertyValue(prop);
    for (const prop of NuageColors.COMPLEX) values[prop] = computed.getPropertyValue(prop);
    return values;
  }
  isOrangeProp(prop, value) {
    return NuageColors.COMPLEX.includes(prop) ? NuageColors.hasOrange(value) : NuageColors.orange(value);
  }
  inspect(el) {
    if (!this.enabled || !this.accentOn || !(el instanceof Element)) return;
    if (el.closest('[data-nuage-owned],[data-nuage-preserve]') || el.matches('script,style,link,iframe,canvas,video,html,body,img:not([src*=".svg" i])')) return;
    if (el instanceof HTMLImageElement) { this.inspectLogo(el); return; }
    if (this.sheetsComplete() && !this.entries.has(el) && !el.hasAttribute('style') && !(el instanceof SVGElement) && !el.hasAttribute('color')) return;

    const scope = el.closest(NuageColors.INTERACTIVE) || el;
    const state = scope.matches(':hover') ? 'hover' : 'normal';
    const entry = this.entries.get(el);
    if (entry ? entry[state] !== undefined : this.checked.get(el)?.[state]) return;

    const id = el.getAttribute(this.attr);
    if (id) { NuageHold.add(el, true); el.removeAttribute(this.attr); }
    const css = getComputedStyle(el);
    let snapshot = null;
    if (css.display !== 'none' && css.visibility !== 'hidden') {
      snapshot = { '': this.read(css, '') };
      if (el.matches(NuageColors.INTERACTIVE + ',[aria-selected="true"]')) {
        for (const pseudo of ['::before', '::after']) {
          const values = this.read(getComputedStyle(el, pseudo), pseudo);
          if (values) snapshot[pseudo] = values;
        }
      }
      snapshot.strong = el.matches('button,[role="button"],a') && NuageColors.orange(css.backgroundColor) && (NuageColors.rgb(css.backgroundColor)?.[3] ?? 0) > .8;
    }
    if (id) el.setAttribute(this.attr, id);
    if (!snapshot) return;

    const hasOrange = Object.entries(snapshot).some(([pseudo, values]) => pseudo !== 'strong' && Object.entries(values).some(([p, v]) => this.isOrangeProp(p, v)));
    if (!entry && !hasOrange) {
      const checked = this.checked.get(el) || {};
      checked[state] = true;
      this.checked.set(el, checked);
      return;
    }
    const target = entry || { id: String(++this.counter), normal: undefined, hover: undefined, scope: null };
    target[state] = snapshot;
    if (state === 'hover' && !target.scope) target.scope = scope;
    if (!entry) {
      this.entries.set(el, target);
      NuageWrites.push(() => { NuageHold.add(el, true); el.setAttribute(this.attr, target.id); });
    }
    this.dirty = true;
  }
  inspectLogo(el) {
    if (this.entries.has(el)) return;
    const identity = [el.getAttribute('src'), el.getAttribute('alt'), el.getAttribute('title')].join(' ');
    const r = el.getBoundingClientRect();
    if (/logo.*faceit|faceit.*logo/i.test(identity) && /\.svg(?:[?#]|$)/i.test(el.getAttribute('src') || '') && r.width <= 180 && r.height <= 180) {
      this.ensureLogoFilter();
      const id = String(++this.counter);
      NuageHold.add(el);
      el.setAttribute(this.attr, id);
      this.entries.set(el, { id, logo: true });
      this.dirty = true;
    }
  }
  invalidate(el) {
    this.checked.delete(el);
    const entry = this.entries.get(el);
    if (entry && !entry.logo) { entry.normal = undefined; entry.hover = undefined; }
  }
  scopeId(scope) {
    let id = scope.getAttribute(this.scopeAttr);
    if (!id) {
      id = String(++this.scopeCounter);
      scope.setAttribute(this.scopeAttr, id);
      this.scopes.add(scope);
    }
    return id;
  }
  elementDeclarations(values, base) {
    const out = [];
    for (const [prop, value] of Object.entries(values)) {
      if (this.isOrangeProp(prop, value)) {
        out.push(`${prop}:${NuageColors.COMPLEX.includes(prop) ? this.replaceTokens(value) : this.mapped(value)}!important`);
      } else if (base && base[prop] !== undefined && this.isOrangeProp(prop, base[prop]) && value !== base[prop]) {
        out.push(`${prop}:${value}!important`);
      }
    }
    return out;
  }
  flush() {
    if (!this.enabled) return;
    for (const [el, entry] of this.entries) {
      if (!el.isConnected) { this.entries.delete(el); this.dirty = true; }
      else if (!entry.logo && entry.normal === undefined && entry.hover === undefined) {
        el.removeAttribute(this.attr); this.entries.delete(el); this.dirty = true;
      }
    }
    for (const scope of this.scopes) if (!scope.isConnected) this.scopes.delete(scope);
    if (!this.dirty) return;
    const rules = [];
    const fg = NuageColors.foreground(this.hex);
    if (this.matrix) {
      const [r, g, b] = this.target().map(v => v / 255);
      this.matrix.setAttribute('values', `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`);
    }
    const groups = new Map();
    const body = (selector, entry, el) => {
      const out = [];
      const states = [['normal', selector]];
      if (entry.hover) {
        const hoverSelector = entry.scope && entry.scope !== el
          ? `html[data-nuage-active] [${this.scopeAttr}="${this.scopeId(entry.scope)}"]:hover [${this.attr}="${entry.id}"]`
          : `${selector}:hover`;
        states.push(['hover', hoverSelector]);
      }
      for (const [state, sel] of states) {
        const snapshot = entry[state];
        if (!snapshot) continue;
        for (const [pseudo, values] of Object.entries(snapshot)) {
          if (pseudo === 'strong') continue;
          const decl = this.elementDeclarations(values, state === 'hover' ? entry.normal?.[pseudo] : null);
          if (decl.length) out.push(`${sel}${pseudo}{${decl.join(';')}}`);
        }
        if (snapshot.strong) out.push(`${sel},${sel} :where(span,strong,b,em,svg){color:${fg}!important}`);
      }
      return out;
    };
    for (const [el, entry] of this.entries) {
      let value;
      if (entry.logo) value = 'logo';
      else if (entry.hover) {
        value = entry.id;
        rules.push(...body(`html[data-nuage-active] [${this.attr}="${value}"]`, entry, el));
      } else {
        const key = body('&', entry, el).join('');
        if (!groups.has(key)) {
          const id = 'g' + groups.size;
          groups.set(key, id);
          rules.push(...body(`html[data-nuage-active] [${this.attr}="${id}"]`, entry, el));
        }
        value = groups.get(key);
      }
      if (el.getAttribute(this.attr) !== value) { NuageHold.add(el, true); el.setAttribute(this.attr, value); }
    }
    if (this.entries.size && [...this.entries.values()].some(e => e.logo)) rules.push(`html[data-nuage-active] [${this.attr}="logo"]{filter:url("#nuage-logo-filter-v3")!important}`);
    this.rules.textContent = rules.join('\n');
    this.dirty = false;
  }
  clear() {
    for (const el of this.entries.keys()) el.removeAttribute(this.attr);
    for (const scope of this.scopes) scope.removeAttribute(this.scopeAttr);
    this.entries.clear();
    this.scopes.clear();
    this.checked = new WeakMap();
    this.sheetRules.clear();
    this.lengths = new WeakMap();
    this.sheetText = '';
    this.rules.remove();
    this.rules.textContent = '';
    this.sheet.remove();
    this.sheet.textContent = '';
    if (this.filterHost) this.filterHost.remove();
    this.filterHost = this.matrix = null;
    this.enabled = false;
    this.dirty = false;
  }
};
