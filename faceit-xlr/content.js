(() => {
'use strict';
// FACEIT Nuage — content script.
// • Surfaces: FACEIT panels become transparent / glass / water over the wallpaper.
// • Occlusion: page content under a transparent overlay (match room, profile,
//   drawers) is hidden, so the lobby never shows through the room.
// • Decorations: glow for the selected match type and «Найти матч», hiding of
//   ESEA / missions / queue counter / «new» badges.
// Every attribute we toggle is held without transitions (NuageHold), so
// nothing we do can animate, blink or loop.

const C = Nuage;
const Hold = NuageHold;
const MARK = 'data-nuage-surface';
const ACTIVE = 'data-nuage-active';
const WALLPAPER = 'data-nuage-wallpaper';
const COVERED = 'data-nuage-covered';
const MODE = 'data-nuage-mode';
const CTA = 'data-nuage-cta';
const HIDE = 'data-nuage-hide';
const FILLED = 'data-nuage-filled';   // button filled with the custom color
const LABEL = 'data-nuage-cta-label'; // text element of «Найти матч»
const GROUP = 'data-nuage-group';     // glass container that only holds other blocks
const CLEAR = 'data-nuage-clear';     // match-type panel without its backplate
const AVATAR = 'data-nuage-avatar';   // round player picture
const AVFRAME = 'data-nuage-avframe'; // square frame around it
const TEXTLESS = 'data-nuage-textless'; // «Поиск группы»: keep the icon, drop the words
const DIVIDER = 'data-nuage-divider'; // one-sided grey border used as a separator
// :is(#…, [attr]) borrows an id's weight so these rules beat the glass tiles.
const STRONG = attr => `:is(#nuage-strong-weight,[${attr}])`;
const OWNED = '[data-nuage-owned]';

// ---------- owned nodes ----------
const style = document.createElement('style');
style.id = 'nuage-styles-v3';
style.setAttribute('data-nuage-owned', '');

const coverStyle = document.createElement('style');
coverStyle.id = 'nuage-covers-v3';
coverStyle.setAttribute('data-nuage-owned', '');

const extraStyle = document.createElement('style'); // per-element sizes (icon-only party slot)
extraStyle.id = 'nuage-extra-v3';
extraStyle.setAttribute('data-nuage-owned', '');
let extraDirty = false;
function updateExtraCSS() {
  extraDirty = false;
  const rules = [];
  for (const { w, h, id } of iconSizes.values()) {
    if (w && h) rules.push(`html[${ACTIVE}] [${TEXTLESS}="${id}"] :is(svg,img,i){width:${w}px!important;height:${h}px!important;min-width:${w}px!important}`);
  }
  extraStyle.textContent = rules.join('\n');
}

const host = document.createElement('div');
host.id = 'nuage-background-v2';
host.setAttribute('aria-hidden', 'true');
host.setAttribute('data-nuage-owned', '');
host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:-1!important;pointer-events:none!important;overflow:hidden!important;display:block!important;';
const shadow = host.attachShadow({ mode: 'closed' });
const frame = document.createElement('iframe');
frame.title = 'Nuage background';
frame.tabIndex = -1;
frame.setAttribute('aria-hidden', 'true');
frame.allow = 'autoplay';
frame.style.cssText = 'display:block;border:0;width:100%;height:100%;pointer-events:none;';
shadow.append(frame);

const colors = new NuageColors();

// ---------- state ----------
let settings = C.normalize();
let metadata = null;
let legacy = '';
let running = false;
let hasWallpaper = false;
let scanTimer = 0;
let coverTimer = 0;
let resizeTimer = 0;
let routeTimer = 0;
let lastURL = location.href;

const marked = new Set();          // elements carrying MARK
const origin = new WeakMap();      // element -> {alpha, gradient} before we changed it
const pending = new Set();         // roots waiting for a scan
const recheck = new Set();         // elements whose own styles changed
const decorated = new Map();       // element -> [attribute, value] for MODE / CTA / HIDE
const Writes = NuageWrites;
const filled = new Set();
const groups = new Set();
const dividers = new Set();
const iconSizes = new Map(); // TEXTLESS element -> {w,h,id} of its icon
let textlessCounter = 0;
let covered = new Map();           // element -> cover id ('' = hidden, 'cN' = clipped)
let layers = [];                   // transparent elements that occlude page content
let coverCounter = 0;

const CLASSIFY = 'div,main,section,aside,nav,header,article,dialog,button,a,[role="button"],li,form,footer,hr';
const SCAN = CLASSIFY + ',span,b,strong,p,img,picture,canvas,svg,i,ul,ol,h1,h2,h3,h4,h5,h6,table,tr,td,th,label,small,em';
const STRICT = 'input,select,textarea,[role="menu"],[role="listbox"],[role="option"],[role="tooltip"],[role="alertdialog"],[data-nuage-preserve],[data-fcanvas-preserve]';
const INTERACTIVE = 'button,a,[role="button"],[role="tab"]';
const OVERLAYS = 'dialog,[role="dialog"],[aria-modal="true"]';

// ---------- helpers ----------
function rgbaParts(color) {
  const n = String(color).match(/[\d.]+/g)?.map(Number);
  return n && n.length >= 3 ? [n[0], n[1], n[2], n[3] ?? 1] : null;
}
function neutral(color) {
  const n = rgbaParts(color);
  if (!n) return false;
  const max = Math.max(n[0], n[1], n[2]), min = Math.min(n[0], n[1], n[2]);
  return max <= 105 && max - min <= 24;
}
function alphaOf(color) {
  const n = rgbaParts(color);
  return n ? n[3] : 0;
}
function luminance(color) {
  const n = rgbaParts(color);
  return n ? (n[0] * .2126 + n[1] * .7152 + n[2] * .0722) / 255 * n[3] : 0;
}
function hexRGB(hex) { return hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16)).join(','); }
function darkGradient(css) {
  if (css === 'none' || /url\(/i.test(css) || !/gradient\(/i.test(css)) return false;
  const stops = css.match(/rgba?\([^)]+\)/g) || [];
  return stops.length > 0 && stops.every(neutral);
}
function largeOverlay(el, r = el.getBoundingClientRect()) {
  return r.height >= innerHeight * .52 && (
    r.width >= innerWidth * .48 ||
    r.width >= 230 && r.width <= innerWidth * .48 && (r.right > innerWidth * .70 || r.left < innerWidth * .22)
  );
}
function protectedDialog(el) {
  const dialog = el.closest(OVERLAYS);
  return !!dialog && !largeOverlay(dialog);
}
function outOfFlow(css) {
  return css.position === 'fixed' || css.position === 'absolute';
}
function textOf(el, limit = 600) {
  return (el.textContent || '').slice(0, limit).replace(/\s+/g, ' ').trim().toLowerCase();
}
const TILES = new Set(['focus', 'panel', 'card']);
const surfaceType = new WeakMap();
function mark(el, type, css) {
  origin.set(el, { alpha: alphaOf(css.backgroundColor), gradient: darkGradient(css.backgroundImage || 'none') });
  surfaceType.set(el, type);
  marked.add(el);
  Writes.push(() => { if (marked.has(el) && surfaceType.get(el) === type) { Hold.add(el); el.setAttribute(MARK, type); } });
}
function unmark(el) {
  if (!marked.has(el)) return;
  Hold.add(el);
  el.removeAttribute(MARK);
  marked.delete(el);
  surfaceType.delete(el);
}
function tileAncestor(el) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (marked.has(p) && TILES.has(surfaceType.get(p))) return true;
  return false;
}
function decoratedAncestor(el, attr) {
  for (let p = el; p && p !== document.body; p = p.parentElement) if (decorated.get(p)?.[0] === attr) return true;
  return false;
}

function pageOffsetTop(el, r) {
  let y = r.top + scrollY;
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) if (p.scrollTop) y += p.scrollTop;
  return y;
}
function borderedBox(css) {
  const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(side => parseFloat(css[`border${side}Width`]) > 0 && alphaOf(css[`border${side}Color`]) > .05);
  return sides.length === 4 && sides.every(side => lowSat(css[`border${side}Color`]));
}
function lowSat(color) {
  const c = rgbaParts(color);
  return !!c && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 40;
}

// ---------- classification ----------
function classify(el) {
  if (!hasWallpaper || !(el instanceof HTMLElement) || marked.has(el) || !el.matches(CLASSIFY)) return;
  if (el.closest(OWNED) || el.closest(STRICT) || protectedDialog(el)) return;
  const r = el.getBoundingClientRect();

  if ((r.height > 0 && r.height <= 2 && r.width >= 120) || (r.width > 0 && r.width <= 2 && r.height >= 60)) {
    const css = getComputedStyle(el);
    if (neutral(css.backgroundColor) && alphaOf(css.backgroundColor) > .3 || darkGradient(css.backgroundImage)) mark(el, 'line', css);
    return;
  }
  const inTile = tileAncestor(el);
  if (r.width < (inTile ? 80 : 100) || r.height < (inTile ? 22 : 32)) return;
  const css = getComputedStyle(el);
  if (css.display === 'none' || css.visibility === 'hidden') return;

  const image = css.backgroundImage || 'none';
  const gradient = darkGradient(image);
  if (image !== 'none' && !gradient) return;

  const alpha = alphaOf(css.backgroundColor);
  const solid = neutral(css.backgroundColor) && alpha >= .05;

  if (r.width <= 220 && r.height <= 220) {
    const media = el.querySelector('img,svg,canvas,video,picture');
    if (media) {
      const m = media.getBoundingClientRect();
      if (m.width * m.height >= r.width * r.height * .5) {
        if (solid || gradient || css.borderTopWidth !== '0px') mark(el, 'bare', css);
        return;
      }
    }
  }
  if (el.closest(INTERACTIVE)) {
    if (r.width >= 120 && r.height >= 90 && (solid || gradient)) mark(el, 'card', css);
    return;
  }

  const wide = r.width >= Math.max(470, innerWidth * .48);
  const highLayer = ['fixed', 'absolute', 'sticky'].includes(css.position) && Number(css.zIndex) >= 100;
  const large = largeOverlay(el, r);
  const overlay = el.matches(OVERLAYS) && large;

  const fullScreen = r.width >= innerWidth * .9 && r.height >= innerHeight * .9;
  if (outOfFlow(css) && fullScreen && solid && alpha < .85 && !gradient) return;

  if ((overlay || large && highLayer) && (solid || gradient)) {
    mark(el, wide ? 'shell' : 'focus', css);
    return;
  }
  if (highLayer && !large) return;

  const text = wide && r.height < 450 ? textOf(el, 2500) : '';
  const focus = wide && r.height >= 40 && r.height < 450 &&
    /найти матч|find match|тип матча|match type|к подбору игроков|go to matchmaking|connect to server|подключиться к серверу/.test(text);
  const pageTop = pageOffsetTop(el, r);
  const top = wide && pageTop < innerHeight * .34 && r.height <= Math.min(350, innerHeight * .43) && !focus;
  const topSemantic = wide && r.height <= 140 && (el.matches('nav,header,[role="tablist"]') || /матчмейкинг|matchmaking/.test(text));
  if (settings.clearTop && (top || topSemantic)) {
    if (neutral(css.backgroundColor) || gradient || css.backdropFilter && css.backdropFilter !== 'none') mark(el, 'top', css);
    return;
  }
  if (!solid && !gradient) {
    if (settings.style !== 'classic' && borderedBox(css) && r.width >= 120 && r.width <= 1400 && r.height >= 50 && r.height <= 700) mark(el, 'panel', css);
    return;
  }

  const shell = el.id === '__next' || el.id === 'root' || r.width >= innerWidth * .48 && r.height >= innerHeight * .52;
  if (shell) { mark(el, 'shell', css); return; }
  if (focus && settings.focusEnabled) { mark(el, 'focus', css); return; }
  if (large && !wide || settings.focusEnabled && r.width >= 220 && r.height >= 110) { mark(el, 'focus', css); return; }
  mark(el, 'panel', css);
}

// ---------- decorations: glow and hidden widgets ----------
const MODE_TITLES = /стандартный матч|standard match|суперматч|super ?match|premium[ -]?match|премиум[ -]?матч/gi;
const CTA_TEXT = /^(найти матч|find match|принять|accept|к подбору игроков|go to matchmaking)$/i;
const BADGE_TEXT = /^(новая карта|новинка|новое|new map|new|beta|бета)$/i;
function paintsItself(el) {
  const css = getComputedStyle(el);
  return alphaOf(css.backgroundColor) > .05 || css.backgroundImage !== 'none' ||
    css.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(css[`border${side}Width`]) > 0 && alphaOf(css[`border${side}Color`]) > .05);
}
function decorateAs(el, attr, value = '') {
  decorated.set(el, [attr, value]);
  Writes.push(() => { if (decorated.has(el)) { Hold.add(el); el.setAttribute(attr, value); } });
}
let accentRGB = [255, 85, 0];
let panelCandidates = [];
function checkFilled(el, r) {
  if (!colors.accentOn || filled.has(el) || !el.matches(INTERACTIVE) || r.width < 40 || r.height < 18) return;
  const bg = rgbaParts(getComputedStyle(el).backgroundColor);
  if (!bg || bg[3] < .8 || bg.slice(0, 3).some((v, i) => Math.abs(v - accentRGB[i]) > 6)) return;
  filled.add(el);
  Writes.push(() => { if (filled.has(el)) { Hold.add(el, true); el.setAttribute(FILLED, ''); } });
}
function ctaLabel(button) {
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (CTA_TEXT.test(node.nodeValue.replace(/\s+/g, ' ').trim())) return node.parentElement;
  }
  return null;
}
function decorate(el) {
  if (el instanceof SVGSVGElement && !el.closest(OWNED)) { const r = el.getBoundingClientRect(); if (r.width || r.height) checkHairline(el, r); return; }
  if (!(el instanceof HTMLElement) || el.closest(OWNED)) return;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  checkFilled(el, r);
  if (el.matches(CLASSIFY)) checkDivider(el, r);
  checkHairline(el, r);
  if (decorated.has(el)) return;
  if (checkAvatar(el, r)) return;
  if ((r.width <= 16 && r.height >= 60 || r.height <= 16 && r.width >= 60) && /scroll/i.test(el.getAttribute('class') || '')) {
    decorateAs(el, HIDE, 'scrollbar');
    return;
  }

  if (el.matches(INTERACTIVE) && r.width >= 90 && r.height >= 28 && r.height <= 90 && CTA_TEXT.test(textOf(el, 60))) {
    decorateAs(el, CTA);
    const label = ctaLabel(el);
    if (label && !decorated.has(label)) decorateAs(label, LABEL);
    return;
  }
  if (r.height <= 26 && r.width <= 150) {
    if (el.children.length <= 1 && BADGE_TEXT.test(textOf(el, 40)) && !decoratedAncestor(el, HIDE)) decorateAs(el, HIDE, 'badge');
    return;
  }
  if (r.height <= 70 && r.width >= 120 && !decoratedAncestor(el, HIDE)) {
    const text = textOf(el, 200);
    if (text.length < 140 && /текущие матчи|current matches|игроки в очереди|players in queue/.test(text)) { decorateAs(el, HIDE, 'queue'); return; }
  }
  if (r.width < 160 || r.height < 30) return;

  if (r.width >= innerWidth * .4 && r.height >= 150 && r.height <= 1000) {
    const text = textOf(el, 3000);
    if (/тип матча|match type/.test(text) && /найти матч|find match/.test(text)) panelCandidates.push(el);
  }
  if (r.width >= 220 && r.width <= 640 && r.height >= 100 && r.height <= 380 && !decoratedAncestor(el, MODE)) {
    const text = textOf(el, 500);
    const titles = text.match(MODE_TITLES);
    if (titles && new Set(titles.map(t => t.replace(/[ -]/g, ''))).size === 1 && text.search(MODE_TITLES) < 40 && paintsItself(el)) {
      decorateAs(el, MODE, 'off');
      return;
    }
  }
  if (r.width <= 860 && r.height <= 280 && !decoratedAncestor(el, HIDE)) {
    const text = textOf(el, 600);
    if (text.length < 260 && paintsItself(el)) {
      const esea = /esea|зарегистрируйтесь сейчас|register now|регистрация закрывается|registration closes/.test(text) ||
        !!el.querySelector('a[href*="esea" i],img[alt*="esea" i],img[src*="esea" i]');
      const mission = /mission|миссия|миссии|задани/.test(text) && /\d+\s*\/\s*\d+|выиграй|сыграй|убей|win |play |kill/.test(text);
      if (esea !== mission) { decorateAs(el, HIDE, esea ? 'esea' : 'missions'); return; }
    }
  }
}
const SEASON = /^(сезон|season)\s*\d+/i;
const ELO_NUMBER = /\d{1,2}[\s\u00a0\u202f,.]?\d{3}(?!\d)/;
function eloFromText(node, value) {
  if (!SEASON.test(value)) return;
  let block = null;
  for (let p = node.parentElement, i = 0; p && p !== document.body && i < 8; p = p.parentElement, i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 260 || r.width > 1100) break;
    if (ELO_NUMBER.test(textOf(p, 300).replace(SEASON, ''))) { block = p; break; }
  }
  if (!block || decorated.has(block) || decoratedAncestor(block, HIDE)) return;
  const own = textOf(block, 400);
  for (let p = block.parentElement; p && p !== document.body; p = p.parentElement) {
    const r = p.getBoundingClientRect();
    if (r.height > 260 || textOf(p, 400) !== own) break;
    block = p;
  }
  if (!decorated.has(block)) decorateAs(block, HIDE, 'elo');
}
function resolvePanels() {
  const list = panelCandidates.filter(el => el.isConnected);
  panelCandidates = [];
  for (const el of list) {
    if (list.some(other => other !== el && el.contains(other))) continue;
    if ([...decorated].some(([other, [attr]]) => attr === CLEAR && other !== el && el.contains(other))) continue;
    for (const [other, [attr]] of decorated) {
      if (attr === CLEAR && other.contains(el) && other !== el) { Hold.add(other); other.removeAttribute(CLEAR); decorated.delete(other); }
    }
    if (!decorated.has(el)) decorateAs(el, CLEAR);
  }
}
function updateGroups() {
  const next = new Set();
  for (const el of marked) {
    if (!el.isConnected || !TILES.has(surfaceType.get(el))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 150 || r.height < 80) continue;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (marked.has(p) && TILES.has(surfaceType.get(p))) next.add(p);
    }
  }
  for (const el of groups) if (!next.has(el)) { Hold.add(el); el.removeAttribute(GROUP); }
  for (const el of next) if (!groups.has(el)) { Hold.add(el); el.setAttribute(GROUP, ''); }
  groups.clear();
  for (const el of next) groups.add(el);
}
function isPicture(el, css, r) {
  if (el instanceof HTMLImageElement || el instanceof HTMLCanvasElement) return true;
  if (/url\(/i.test(css.backgroundImage)) return true;
  const img = el.querySelector('img,picture,canvas');
  if (!img) return false;
  const m = img.getBoundingClientRect();
  return m.width * m.height >= r.width * r.height * .6;
}
function roundness(css, r) {
  const v = css.borderTopLeftRadius;
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / r.width;
}
const avatars = new Set();
function roundShape(el, css, r) {
  if (roundness(css, r) >= .4 || /circle|ellipse/.test(css.clipPath)) return true;
  for (let p = el.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) {
    const pr = p.getBoundingClientRect();
    if (pr.width > r.width * 1.15 || pr.height > r.height * 1.15) break;
    const pc = getComputedStyle(p);
    if ((roundness(pc, pr) >= .4 && pc.overflow !== 'visible') || /circle|ellipse/.test(pc.clipPath)) return true;
  }
  return false;
}
function checkAvatar(el, r) {
  if (Math.abs(r.width - r.height) > Math.max(4, r.width * .12) || r.width < 64 || r.width > 220 || el.closest(`[${AVATAR}]`)) return false;
  const css = getComputedStyle(el);
  if (!isPicture(el, css, r) || !roundShape(el, css, r)) return false;
  decorateAs(el, AVATAR);
  avatars.add(el);
  const frames = [];
  for (let p = el.parentElement, i = 0; p && p !== document.body && i < 6; p = p.parentElement, i++) {
    const pr = p.getBoundingClientRect();
    if (pr.width > r.width * 1.9 || pr.height > r.height * 1.9 || textOf(p, 20).length > 3) break;
    frames.push(p);
    if (marked.has(p) && surfaceType.get(p) !== 'bare') { surfaceType.set(p, 'bare'); Writes.push(() => { Hold.add(p); p.setAttribute(MARK, 'bare'); }); }
  }
  const box = frames.at(-1) || el.parentElement;
  for (const p of frames) if (!decorated.has(p)) decorateAs(p, AVFRAME);
  if (box) {
    for (const k of box.querySelectorAll('*')) {
      if (k === el || el.contains(k) || k.contains(el) || decorated.has(k) || decoratedAncestor(k, HIDE)) continue;
      const kr = k.getBoundingClientRect();
      if (kr.width >= r.width * .8 && kr.height >= r.height * .8 && !textOf(k, 5)) { decorateAs(k, AVFRAME); continue; }
      if (kr.width < 6 || kr.width > 40 || kr.height > 40) continue;
      const cx = kr.left + kr.width / 2, cy = kr.top + kr.height / 2;
      if (cx > r.left + r.width * .6 && cy < r.top + r.height * .4) decorateAs(k, HIDE, 'avbadge');
    }
  }
  return true;
}
const SLOT = 'data-nuage-slot';
const hiddenSlots = new Set();
function hasPlayer(k) {
  for (const node of k.querySelectorAll(`[${AVATAR}],img,picture,canvas`)) {
    const r = node.getBoundingClientRect();
    if (r.width >= 32 && r.height >= 32) return true;
  }
  return false;
}
function partyRow(avatar) {
  let unit = null;
  for (let p = avatar.parentElement, i = 0; p && i < 8; p = p.parentElement, i++) {
    const pr = p.getBoundingClientRect();
    if (pr.width >= 110 && pr.width <= 360 && pr.height >= 150 && pr.height <= 460) { unit = p; break; }
  }
  for (let i = 0; unit && unit.parentElement && unit.parentElement !== document.body && i < 8; unit = unit.parentElement, i++) {
    const ur = unit.getBoundingClientRect();
    if (ur.width > 420) return null;
    const similar = [...unit.parentElement.children].filter(k => {
      const kr = k.getBoundingClientRect();
      return kr.width >= ur.width * .6 && kr.width <= ur.width * 1.6 && kr.height >= ur.height * .6 && kr.height <= ur.height * 1.6;
    });
    if (similar.length >= 3 && similar.includes(unit)) return similar;
  }
  return null;
}
function updateInviteSlots() {
  for (const k of hiddenSlots) { Hold.add(k); k.removeAttribute(SLOT); }
  const next = new Set();
  for (const avatar of avatars) {
    if (!avatar.isConnected) { avatars.delete(avatar); continue; }
    const row = partyRow(avatar);
    if (!row) continue;
    for (const k of row) {
      if (!hasPlayer(k) && textOf(k, 80).length <= 60) next.add(k);
    }
  }
  for (const k of next) { Hold.add(k); k.setAttribute(SLOT, ''); }
  hiddenSlots.clear();
  for (const k of next) hiddenSlots.add(k);
}
const PARTY_CAPTION = /^(поиск группы|найти группу|find party|party finder|find a party|search party)$/i;
const LADDERS = /^(ладдеры|ladders)(\s*\(?\d+\)?)?$/i;
const ladderHeadings = new Set();
function resolveLadders() {
  for (const heading of ladderHeadings) {
    if (!heading.isConnected) { ladderHeadings.delete(heading); continue; }
    const hr = heading.getBoundingClientRect();
    if (!hr.width) continue;
    let done = false;
    for (let cur = heading, i = 0; cur && cur !== document.body && i < 8 && !done; cur = cur.parentElement, i++) {
      const r = cur.getBoundingClientRect();
      if (r.height > 700) break;
      if (r.height >= hr.height + 90 && r.width >= 400) {
        if (!decorated.has(cur)) decorateAs(cur, HIDE, 'ladders');
        done = true;
        break;
      }
      const next = cur.nextElementSibling;
      const nr = next?.getBoundingClientRect();
      if (next && nr.height >= 90 && nr.height <= 700 && nr.width >= 400) {
        if (!decorated.has(cur)) decorateAs(cur, HIDE, 'ladders');
        if (!decorated.has(next)) decorateAs(next, HIDE, 'ladders');
        done = true;
      }
    }
    if (done) ladderHeadings.delete(heading);
  }
}
function textPasses(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (!value || value.length > 30) continue;
    eloFromText(node, value);
    const parent = node.parentElement;
    if (!parent || parent.closest(OWNED)) continue;
    if (PARTY_CAPTION.test(value)) {
      if (iconSizes.has(parent) || decorated.get(parent)?.[1] === 'partytext') continue;
      let slot = null;
      for (let p = parent, i = 0; p && i < 6; p = p.parentElement, i++) {
        const r = p.getBoundingClientRect();
        if (r.width >= 110 && r.width <= 340 && r.height >= 140 && r.height <= 440) { slot = p; break; }
      }
      if (!slot || textOf(slot, 80).length > 40) continue;
      const icon = parent.querySelector('svg,img,i');
      if (!icon) { if (!decorated.has(parent)) decorateAs(parent, HIDE, 'partytext'); }
      else {
        const ir = icon.getBoundingClientRect();
        const id = String(++textlessCounter);
        iconSizes.set(parent, { w: Math.round(ir.width), h: Math.round(ir.height), id });
        Writes.push(() => { if (iconSizes.has(parent)) { Hold.add(parent); parent.setAttribute(TEXTLESS, id); } });
        extraDirty = true;
      }
    } else if (decorated.has(parent)) {
      continue;
    } else if (LADDERS.test(value)) {
      ladderHeadings.add(parent);
    }
  }
}
const PLINE = 'data-nuage-pline';
const HLINE = 'data-nuage-hline';
const hairlines = new Map();
function lowSaturation(color) {
  const c = rgbaParts(color);
  return !!c && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 40;
}
function lineShadow(value) {
  if (!value || value === 'none') return false;
  return value.split(/,(?![^(]*\))/).every(part => {
    const color = part.match(/rgba?\([^)]+\)/)?.[0] || '';
    const n = part.replace(color, '').match(/-?[\d.]+px/g)?.map(parseFloat) || [];
    const [x = 0, y = 0, blur = 0, spread = 0] = n;
    return blur === 0 && spread <= 0 && (x === 0 && Math.abs(y) > 0 && Math.abs(y) <= 2 || y === 0 && Math.abs(x) > 0 && Math.abs(x) <= 2) && (!color || lowSaturation(color));
  });
}
function checkHairline(el, r) {
  if (hairlines.has(el)) return;
  let kind = '';
  const thin = (r.height <= 3 && r.width >= 120) || (r.width <= 3 && r.height >= 60);
  if (thin) {
    if (el instanceof SVGElement) kind = 'line';
    else {
      const css = getComputedStyle(el);
      const bg = alphaOf(css.backgroundColor) > .01 && lowSaturation(css.backgroundColor);
      const grad = /gradient\(/.test(css.backgroundImage) && (css.backgroundImage.match(/rgba?\([^)]+\)/g) || []).every(lowSaturation);
      const border = ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(css[`border${side}Width`]) > 0 && lowSaturation(css[`border${side}Color`]));
      if (bg || grad || border || lineShadow(css.boxShadow)) kind = 'bg';
    }
  } else if (r.width >= 300 && !(el instanceof SVGElement)) {
    const css = getComputedStyle(el);
    if (lineShadow(css.boxShadow)) kind = 'shadow';
    else if (/gradient\(/.test(css.backgroundImage) && /(^|\s)[0-3]px/.test(css.backgroundSize) && (css.backgroundImage.match(/rgba?\([^)]+\)/g) || []).every(lowSaturation)) kind = 'grad';
  }
  hairlines.set(el, kind);
  if (kind) Writes.push(() => { Hold.add(el); el.setAttribute(HLINE, kind); });
}
const pseudoLines = new Map();
function pseudoLine(el, which) {
  const c = getComputedStyle(el, which);
  if (c.content === 'none' || c.content === 'normal' || c.display === 'none') return false;
  const w = parseFloat(c.width), h = parseFloat(c.height);
  const thin = (h > 0 && h <= 3 && (w >= 120 || c.left !== 'auto' && c.right !== 'auto')) || (w > 0 && w <= 3 && h >= 60);
  if (!thin) return false;
  const bg = c.backgroundColor;
  return neutral(bg) && alphaOf(bg) > .05 || darkGradient(c.backgroundImage) ||
    ['Top', 'Bottom'].some(side => parseFloat(c[`border${side}Width`]) > 0 && neutral(c[`border${side}Color`]));
}
function checkDivider(el, r) {
  if (r.width >= 300 && !pseudoLines.has(el)) {
    const which = [pseudoLine(el, '::before') && 'before', pseudoLine(el, '::after') && 'after'].filter(Boolean).join(' ');
    pseudoLines.set(el, which);
    if (which) Writes.push(() => { Hold.add(el); el.setAttribute(PLINE, which); });
  }
  if (dividers.has(el) || r.width < 60 && r.height < 60) return;
  const css = getComputedStyle(el);
  const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(side => parseFloat(css[`border${side}Width`]) > 0 && alphaOf(css[`border${side}Color`]) > .05);
  if (!sides.length || el.hasAttribute(MODE) || decorated.get(el)?.[0] === MODE) return;
  if (!sides.every(side => neutral(css[`border${side}Color`]) || luminance(css[`border${side}Color`]) < .45 && (c => Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) <= 30)(rgbaParts(css[`border${side}Color`])))) return;
  dividers.add(el);
  Writes.push(() => { if (dividers.has(el)) { Hold.add(el); el.setAttribute(DIVIDER, ''); } });
}
function modeScore(el) {
  if (el.matches('[aria-selected="true"],[aria-checked="true"],[aria-pressed="true"],[data-state="checked"],[data-state="active"],[data-selected="true"]') ||
      el.querySelector('[aria-checked="true"][role="radio"],input[type="radio"]:checked')) return 100;
  let score = /(^|[\s_-])(selected|active|checked|isSelected)([\s_-]|$)/i.test(el.className) ? 50 : 0;
  const css = getComputedStyle(el);
  let opacity = parseFloat(css.opacity);
  for (let p = el.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) opacity *= parseFloat(getComputedStyle(p).opacity);
  score += opacity * 10;
  score += Math.max(luminance(css.borderTopColor) * (parseFloat(css.borderTopWidth) > 0 ? 1 : 0), 0) * 20;
  return score;
}
function updateModes() {
  const cards = [...decorated].filter(([el, [attr]]) => el.isConnected && attr === MODE).map(([el]) => el);
  const rows = [];
  for (const el of cards) {
    const top = el.getBoundingClientRect().top;
    let row = rows.find(r => Math.abs(r.top - top) < 24);
    if (!row) rows.push(row = { top, cards: [] });
    row.cards.push(el);
  }
  for (const row of rows) {
    const scored = row.cards.map(el => [el, modeScore(el)]).sort((a, b) => b[1] - a[1]);
    const best = scored.length === 1 || scored[0][1] - scored[1][1] > 1.5 ? scored[0][0] : null;
    for (const [el] of scored) {
      const value = el === best ? 'on' : 'off';
      decorated.set(el, [MODE, value]);
      if (el.getAttribute(MODE) !== value) el.setAttribute(MODE, value);
    }
  }
}
function clearDecorations() {
  for (const el of decorated.keys()) { Hold.add(el); for (const attr of [MODE, CTA, HIDE, LABEL, CLEAR, AVATAR, AVFRAME, TEXTLESS]) el.removeAttribute(attr); }
  for (const el of dividers) { Hold.add(el); el.removeAttribute(DIVIDER); }
  for (const el of pseudoLines.keys()) el.removeAttribute(PLINE);
  pseudoLines.clear();
  for (const el of hairlines.keys()) el.removeAttribute(HLINE);
  hairlines.clear();
  for (const el of hiddenSlots) { Hold.add(el); el.removeAttribute(SLOT); }
  hiddenSlots.clear();
  avatars.clear();
  ladderHeadings.clear();
  dividers.clear();
  for (const el of iconSizes.keys()) { Hold.add(el); el.removeAttribute(TEXTLESS); }
  iconSizes.clear();
  extraDirty = true;
  decorated.clear();
  for (const el of filled) { Hold.add(el, true); el.removeAttribute(FILLED); }
  filled.clear();
  for (const el of groups) { Hold.add(el); el.removeAttribute(GROUP); }
  groups.clear();
  panelCandidates = [];
}

// ---------- occlusion ----------
let layerCache = new Map();
function layerRoot(el) {
  const path = [];
  let found = null;
  for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    if (layerCache.has(node)) { found = layerCache.get(node); break; }
    path.push(node);
    if (outOfFlow(getComputedStyle(node)) || node.matches('dialog[open]')) { found = node; break; }
  }
  for (const node of path) layerCache.set(node, found && (found === node || found.contains(node)) ? found : null);
  return found;
}
function intersect(a, b) {
  const left = Math.max(a.left, b.left), top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right), bottom = Math.min(a.bottom, b.bottom);
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}
function contains(outer, inner, tolerance = 2) {
  return inner.left >= outer.left - tolerance && inner.top >= outer.top - tolerance &&
    inner.right <= outer.right + tolerance && inner.bottom <= outer.bottom + tolerance;
}
function paintedBelow(el, layer, x, y) {
  const stack = document.elementsFromPoint(x, y);
  const layerIndex = stack.findIndex(node => layer.contains(node));
  if (layerIndex === -1) return false;
  const elIndex = stack.findIndex(node => el.contains(node));
  return elIndex === -1 || layerIndex < elIndex;
}
function findLayers() {
  const found = [];
  for (const el of marked) {
    if (!el.isConnected) continue;
    const info = origin.get(el);
    if (!info || info.alpha < .5 && !info.gradient) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 150) continue;
    if (!layerRoot(el)) continue;
    found.push(el);
  }
  return found.filter(el => !found.some(other => other !== el && other.contains(el) && contains(other.getBoundingClientRect(), el.getBoundingClientRect())));
}
function collectCovers(layer, result) {
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const area = intersect(layer.getBoundingClientRect(), viewport);
  if (!area) return;
  const consider = (node, depth) => {
    if (!(node instanceof HTMLElement) || result.has(node)) return;
    if (node.matches('script,style,link,meta,template,noscript') || node.closest(OWNED) || node.id === 'nuage-background-v2') return;
    if (layers.includes(node)) return;
    if (layers.some(other => node.contains(other))) {
      if (depth < 12) for (const child of node.children) consider(child, depth + 1);
      return;
    }
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) {
      if (depth < 12) for (const child of node.children) consider(child, depth + 1);
      return;
    }
    const visible = intersect(r, viewport);
    const overlap = visible && intersect(visible, area);
    if (!overlap) return;
    const x = (overlap.left + overlap.right) / 2, y = (overlap.top + overlap.bottom) / 2;
    if (contains(area, visible)) {
      if (paintedBelow(node, layer, x, y)) result.set(node, { layer, clip: null });
      return;
    }
    if (node.children.length && depth < 12) {
      const paints = paintsItself(node);
      if (!paints || node.getElementsByTagName('*').length > 150) {
        if (paints && paintedBelow(node, layer, x, y)) result.set(node, { layer, clip: null, backplate: true });
        for (const child of node.children) consider(child, depth + 1);
        return;
      }
    }
    if (paintedBelow(node, layer, x, y)) {
      result.set(node, { layer, clip: { left: area.left - r.left, top: area.top - r.top, right: area.right - r.left, bottom: area.bottom - r.top } });
    }
  };
  for (let node = layer; node && node !== document.documentElement; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) if (sibling !== node) consider(sibling, 0);
    if (parent === document.body) break;
  }
}
let layerSignature = '';
function signatureOf(list) {
  return list.map(el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); }).join(';');
}
function updateCovers(roots = null) {
  clearTimeout(coverTimer);
  coverTimer = 0;
  if (!running || !hasWallpaper) { clearCovers(); return; }
  layerCache = new Map();
  const nextLayers = findLayers();
  const signature = signatureOf(nextLayers);
  if (roots && signature === layerSignature && nextLayers.length === layers.length && nextLayers.every((el, i) => el === layers[i]) &&
      roots.every(root => nextLayers.some(layer => layer.contains(root)) || [...covered.keys()].some(el => el.contains(root)))) return;
  layers = nextLayers;
  layerSignature = signature;
  const next = new Map();
  if (layers.length) {
    for (const el of covered.keys()) el.removeAttribute(COVERED);
    for (const layer of layers) collectCovers(layer, next);
  }
  const rules = [];
  for (const el of covered.keys()) if (!next.has(el)) el.removeAttribute(COVERED);
  const result = new Map();
  for (const [el, { clip, backplate }] of next) {
    let id = backplate ? 'b' : '';
    if (clip) {
      id = 'c' + (++coverCounter);
      const hole = `${clip.left}px ${clip.top}px, ${clip.right}px ${clip.top}px, ${clip.right}px ${clip.bottom}px, ${clip.left}px ${clip.bottom}px, ${clip.left}px ${clip.top}px`;
      rules.push(`html[${WALLPAPER}] [${COVERED}="${id}"]{clip-path:polygon(evenodd,-400px -400px,calc(100% + 400px) -400px,calc(100% + 400px) calc(100% + 400px),-400px calc(100% + 400px),-400px -400px,${hole})!important}`);
    }
    el.setAttribute(COVERED, id);
    result.set(el, id);
  }
  covered = result;
  coverStyle.textContent = rules.join('\n');
}
function clearCovers() {
  for (const el of covered.keys()) el.removeAttribute(COVERED);
  covered = new Map();
  layers = [];
  layerSignature = '';
  coverStyle.textContent = '';
}
function scheduleCovers(delay = 120) {
  if (running && hasWallpaper && !coverTimer) coverTimer = setTimeout(updateCovers, delay);
}

// ---------- scanning ----------
function queue(node) {
  if (node instanceof Element && !node.closest(OWNED)) pending.add(node);
  if (running && !scanTimer) scanTimer = setTimeout(scan, 120);
}
function scan() {
  clearTimeout(scanTimer);
  scanTimer = 0;
  if (!running) return;
  for (const el of recheck) { unmark(el); colors.invalidate(el); }
  recheck.clear();
  const nodes = [...pending];
  pending.clear();
  const roots = nodes.filter(n => n.isConnected && !nodes.some(p => p !== n && p.isConnected && p.contains(n)));
  colors.syncSheets();
  const selector = colors.accentOn ? '*' : SCAN;
  const visit = el => { classify(el); decorate(el); colors.inspect(el); };
  for (const root of roots) {
    visit(root);
    root.querySelectorAll(selector).forEach(visit);
    textPasses(root);
  }
  resolvePanels();
  resolveLadders();
  Writes.run();
  if (settings.hideInviteSlots) updateInviteSlots();
  else if (hiddenSlots.size) { for (const k of hiddenSlots) { Hold.add(k); k.removeAttribute(SLOT); } hiddenSlots.clear(); }
  if (hasWallpaper && settings.style !== 'classic') updateGroups();
  for (const el of marked) if (!el.isConnected) marked.delete(el);
  for (const el of decorated.keys()) if (!el.isConnected) decorated.delete(el);
  for (const el of filled) if (!el.isConnected) filled.delete(el);
  for (const el of dividers) if (!el.isConnected) dividers.delete(el);
  for (const el of pseudoLines.keys()) if (!el.isConnected) pseudoLines.delete(el);
  for (const el of hairlines.keys()) if (!el.isConnected) hairlines.delete(el);
  for (const el of iconSizes.keys()) if (!el.isConnected) iconSizes.delete(el);
  if (extraDirty) updateExtraCSS();
  colors.flush();
  if (settings.modeGlow) updateModes();
  updateCovers(roots);
  Hold.release();
}
function invalidate(el) {
  recheck.add(el);
}
function clearMarks() {
  for (const el of marked) { Hold.add(el); el.removeAttribute(MARK); surfaceType.delete(el); }
  marked.clear();
}
function rescan() {
  if (!running) return;
  clearMarks();
  clearDecorations();
  recheck.clear();
  pending.clear();
  pending.add(document.body);
  scan();
}

const observer = new MutationObserver(records => {
  let changed = false;
  for (const rec of records) {
    if (rec.target instanceof Element && rec.target.closest(OWNED)) continue;
    if (rec.type === 'childList') {
      rec.addedNodes.forEach(n => { if (n instanceof Element && !n.closest(OWNED)) { pending.add(n); changed = true; } });
      if (rec.removedNodes.length) changed = true;
      if (rec.target instanceof HTMLElement && rec.target !== document.body && rec.addedNodes.length) pending.add(rec.target);
    } else {
      const el = rec.target;
      if (el === document.documentElement) continue;
      invalidate(el);
      pending.add(el);
      changed = true;
    }
  }
  if (changed) scan();
});

function stop() {
  running = false;
  observer.disconnect();
  clearTimeout(scanTimer);
  clearTimeout(coverTimer);
  clearInterval(routeTimer);
  scanTimer = coverTimer = routeTimer = 0;
  pending.clear();
  recheck.clear();
  Hold.all();
  clearCovers();
  clearMarks();
  clearDecorations();
  colors.clear();
  document.documentElement.removeAttribute(ACTIVE);
  document.documentElement.removeAttribute(WALLPAPER);
  document.documentElement.removeAttribute('data-nuage-style');
  Hold.release();
  style.remove();
  coverStyle.remove();
  extraStyle.remove();
  userStyle.remove();
  host.remove();
  frame.removeAttribute('src');
}

function cssString(text) {
  return '"' + String(text).replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ') + '"';
}
function surfaceCSS(w) {
  const M = s => `[${MARK}="${s}"]`;
  const tiles = `:is(${M('focus')},${M('panel')},${M('card')})`;
  const blur = settings.glassBlur;
  const common = `${w} ${M('shell')}{background-color:transparent!important;background-image:none!important;backdrop-filter:none!important}
${w} ${M('top')}{background-color:transparent!important;background-image:none!important;backdrop-filter:none!important;box-shadow:none!important}
${w} ${M('top')}::before,${w} ${M('top')}::after{background-color:transparent!important;background-image:none!important;backdrop-filter:none!important}
${w} ${M('bare')}{background:transparent!important;box-shadow:none!important;border-color:transparent!important;backdrop-filter:none!important}
${w} [${COVERED}=""],${w} [${COVERED}=""] *{visibility:hidden!important;pointer-events:none!important}
${w} [${COVERED}="b"]{background:transparent!important;box-shadow:none!important;border-color:transparent!important;backdrop-filter:none!important}`;

  if (settings.style === 'classic') {
    return `${common}
${settings.radius ? `${w} ${tiles}{border-radius:${settings.radius}px!important}` : ''}
${w} ${M('panel')},${w} ${M('card')}{background-color:rgba(15,18,25,.24)!important;background-image:none!important}
${w} ${M('focus')}{background-color:rgba(12,16,24,var(--nu-tint))!important;background-image:none!important}`;
  }
  const glass = settings.style === 'glass';
  const outerRadius = settings.radius || 18;
  const innerRadius = settings.radius ? Math.max(4, Math.round(settings.radius * .55)) : 10;
  const filter = blur ? (glass ? `blur(${blur}px) saturate(160%)` : `blur(${Math.round(blur * .55)}px) saturate(185%) brightness(1.06)`) : (glass ? 'none' : 'saturate(170%) brightness(1.05)');
  const outer = glass
    ? `background-color:rgba(16,19,27,calc(var(--nu-tint) * .62))!important;background-image:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.015) 60%)!important;--nu-shadow:inset 0 0 0 1px rgba(255,255,255,.10),inset 0 1px 0 rgba(255,255,255,.16),0 12px 32px -10px rgba(0,0,0,.4)`
    : `background-color:rgba(12,16,26,calc(var(--nu-tint) * .36))!important;background-image:radial-gradient(140% 90% at 0% 0%,rgba(255,255,255,.18),rgba(255,255,255,0) 50%),linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.02) 45%,rgba(255,255,255,.06))!important;--nu-shadow:inset 0 1px 1.5px rgba(255,255,255,.55),inset 0 -1px 1px rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.18),inset 0 0 30px rgba(255,255,255,.08),0 14px 34px -12px rgba(0,0,0,.45)`;
  const inner = glass
    ? `background-color:rgba(255,255,255,.04)!important;background-image:none!important;--nu-shadow:inset 0 0 0 1px rgba(255,255,255,.07)`
    : `background-color:rgba(255,255,255,.06)!important;background-image:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.01))!important;--nu-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.10)`;
  const block = `${tiles}:not([${GROUP}])`;
  return `${common}
${w} ${tiles}{${outer};box-shadow:var(--nu-shadow)!important;backdrop-filter:${filter}!important;border-radius:${outerRadius}px!important}
${w} ${tiles}:not([${MODE}]){border-color:rgba(255,255,255,${glass ? .10 : .16})!important}
${w} ${M('panel')}{background-color:rgba(16,19,27,calc(var(--nu-tint) * ${glass ? .4 : .24}))!important}
${w} ${block} ${tiles}:not([${GROUP}]){${inner};backdrop-filter:none!important;border-radius:${innerRadius}px!important;border-color:rgba(255,255,255,.06)!important}
${w} ${M('card')}:hover{background-color:rgba(255,255,255,${glass ? .075 : .1})!important}
${w} :is(${M('shell')},${M('top')}){border-color:transparent!important}
${w} ${M('line')}{background-color:rgba(255,255,255,${glass ? .06 : .1})!important}
${w} ${tiles}[${GROUP}][${GROUP}]{background:transparent!important;backdrop-filter:none!important;--nu-shadow:0 0 #0000;box-shadow:none!important;border-color:transparent!important}`;
}
function updateCSS() {
  const a = `html[${ACTIVE}]`;
  const w = `html[${WALLPAPER}]`;
  const accent = settings.colorEnabled ? settings.accentColor : '#ff5500';
  const textCol = settings.textColorEnabled && settings.textColor ? settings.textColor : null;
  const glow = textCol ? hexRGB(textCol) : (settings.glowColor === 'accent' ? hexRGB(accent) : '255,255,255');
  const lum = (c => (c[0] * .2126 + c[1] * .7152 + c[2] * .0722) / 255)(accent.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16)));
  const ctaK = lum > .75 ? .32 : lum > .55 ? .55 : 1;
  const glowLum = textCol ? ((c => (c[0] * .2126 + c[1] * .7152 + c[2] * .0722) / 255)(textCol.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16)))) : (settings.glowColor === 'accent' ? lum : 1);
  const modeK = glowLum > .75 ? .75 : 1;
  const fg = NuageColors.foreground(accent);
  const tint = settings.focusEnabled ? settings.focus / 100 : .24;
  const shadow = 'var(--nu-shadow,0 0 #0000)';
  const hides = { esea: settings.hideEsea, missions: settings.hideMissions, queue: settings.hideQueue, badge: settings.hideBadges, elo: settings.hideElo,
    partytext: true, ladders: settings.hideLadders, avbadge: true, scrollbar: true };
  const hidden = Object.entries(hides).filter(([, on]) => on).map(([k]) => `${a} [${HIDE}="${k}"]`);
  const pulse = settings.glowPulse;
  const g = (alpha) => textCol ? `rgba(${hexRGB(textCol)},${+alpha.toFixed(3)})` : `rgba(var(--nu-glow),${+(alpha * modeK).toFixed(3)})`;
  const c = (alpha) => `rgba(var(--nu-cta),${+(alpha * ctaK).toFixed(3)})`;
  const clearPanel = `${a} [${CLEAR}][${CLEAR}]`;
  style.textContent = `${Hold.css}
${a}{--nu-tint:${tint};--nu-glow:${glow};--nu-cta:${hexRGB(accent)}}
${w}{background:#0d111b!important;isolation:isolate!important}
${w} body{background-color:transparent!important}
${hasWallpaper ? surfaceCSS(w) : ''}
${hidden.length ? `${hidden.join(',')}{display:none!important}` : ''}
${settings.hideInviteSlots ? `${a} ${STRONG(SLOT)},${a} ${STRONG(SLOT)} *{visibility:hidden!important;pointer-events:none!important}` : ''}
${settings.clearMatchPanel ? `${clearPanel},${clearPanel}::before,${clearPanel}::after{background:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important;backdrop-filter:none!important}` : ''}
${settings.colorEnabled ? `${a} ${STRONG(FILLED)},${a} ${STRONG(FILLED)} :not(svg *){color:${fg}!important;-webkit-text-fill-color:${fg}!important}` : ''}
${fontCSS(a)}
${settings.ctaText ? `${a} ${STRONG(LABEL)}{position:relative!important;white-space:nowrap!important}
${a} ${STRONG(LABEL)}${STRONG(LABEL)},${a} ${STRONG(LABEL)}${STRONG(LABEL)} *{-webkit-text-fill-color:transparent!important;text-shadow:none!important}
${a} ${STRONG(LABEL)}${STRONG(LABEL)}::after{content:${cssString(settings.ctaText)}!important;position:absolute!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;-webkit-text-fill-color:currentColor!important;color:inherit;pointer-events:none!important;background:none!important}` : ''}
${settings.modeGlow ? `${a} [${MODE}]{transition:box-shadow .5s ease,opacity .3s ease,background-color .3s ease,border-color .3s ease!important}
${a} [${MODE}="on"]{box-shadow:${shadow},0 0 0 1px ${g(.6)},0 0 18px 1px ${g(.3)},0 0 48px 6px ${g(.13)}!important;border-color:${g(.75)}!important;${pulse ? 'animation:nuage-breathe 3.8s ease-in-out infinite!important' : ''}}
${a} [${MODE}="off"]:hover{box-shadow:${shadow},0 0 0 1px ${g(.3)},0 0 22px ${g(.15)}!important}
@keyframes nuage-breathe{0%,100%{box-shadow:${shadow},0 0 0 1px ${g(.5)},0 0 14px 0 ${g(.22)},0 0 38px 4px ${g(.08)}}50%{box-shadow:${shadow},0 0 0 1px ${g(.78)},0 0 26px 2px ${g(.38)},0 0 64px 10px ${g(.17)}}}` : ''}
${textCol ? `${a} ::selection, ${w} ::selection, ::selection{background:${textCol}!important;color:#0b0e14!important}
${a} [${MODE}="on"], ${a} [aria-selected="true"], ${a} [data-selected="true"], ${a} [aria-checked="true"], ${a} [data-state="active"], ${a} [data-state="on"], ${a} [data-active="true"]{border-color:${textCol}!important;box-shadow:0 0 14px ${textCol}55!important}
${a} [aria-selected="true"]::after, ${a} [data-selected="true"]::after, ${a} [data-state="active"]::after, ${a} [data-active="true"]::after{background-color:${textCol}!important}` : ''}
${settings.ctaGlow ? `${a} [${CTA}]{box-shadow:0 0 0 1px ${c(.35)},0 0 20px ${c(.42)},0 0 46px ${c(.18)}!important;${pulse ? 'animation:nuage-cta 3s ease-in-out infinite!important' : ''}}
@keyframes nuage-cta{0%,100%{box-shadow:0 0 0 1px ${c(.3)},0 0 14px ${c(.3)},0 0 34px ${c(.12)}}50%{box-shadow:0 0 0 1px ${c(.5)},0 0 26px ${c(.55)},0 0 60px ${c(.24)}}}` : ''}
${true ? `${a},${a} *{scrollbar-width:none!important}
${a} ::-webkit-scrollbar,${a}::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;background:transparent!important}
${a} :is([data-radix-scroll-area-scrollbar],.simplebar-track,.os-scrollbar,.ps__rail-x,.ps__rail-y,[role="scrollbar"]){display:none!important}` : ''}
${a} ${STRONG(TEXTLESS)}{font-size:0!important;line-height:0!important;gap:0!important;letter-spacing:0!important}
${true ? `${a} ${STRONG(AVFRAME)},${a} ${STRONG(AVFRAME)}::before,${a} ${STRONG(AVFRAME)}::after{background:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline:none!important;backdrop-filter:none!important}` : ''}
${true ? `${a} ${STRONG(DIVIDER)}:not([${MODE}]){border-color:transparent!important}
${a} :is(#nuage-strong-weight,[${MARK}="line"]),${a} hr{background:transparent!important;border-color:transparent!important;box-shadow:none!important}
${a} ${STRONG(HLINE)}[${HLINE}="line"]{visibility:hidden!important}
${a} ${STRONG(HLINE)}[${HLINE}="bg"]{background-color:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline:none!important}
${a} ${STRONG(HLINE)}[${HLINE}="shadow"]{box-shadow:none!important}
${a} ${STRONG(HLINE)}[${HLINE}="grad"]{background-image:none!important}
${a} :is(#nuage-strong-weight,[${PLINE}~="before"])::before,${a} :is(#nuage-strong-weight,[${PLINE}~="after"])::after{background:transparent!important;border-color:transparent!important;box-shadow:none!important}` : ''}
@media (prefers-reduced-motion:reduce){${a} [${MODE}],${a} [${CTA}]{animation:none!important}}`;
}

// ---------- font ----------
const CUSTOM_FONT = 'NuageCustomFont';
let fontFace = null;
let fontData = null;
function fontStack() {
  if (!settings.fontFamily) return '';
  if (settings.fontFamily === 'custom') return fontFace ? `"${CUSTOM_FONT}"` : '';
  return `"${settings.fontFamily.replace(/["\\]/g, '')}"`;
}
function fontCSS(a) {
  const stack = fontStack();
  return stack ? `${a} body,${a} body :not(svg,svg *,i,code,pre,kbd,samp,[class*="icon" i],[class*="Icon"]){font-family:${stack},system-ui,sans-serif!important}` : '';
}
async function loadFont(data) {
  if (fontFace) { document.fonts.delete(fontFace); fontFace = null; }
  fontData = data;
  if (!data || typeof data.data !== 'string') return;
  try {
    const bytes = Uint8Array.from(atob(data.data), ch => ch.charCodeAt(0));
    const face = new FontFace(CUSTOM_FONT, bytes.buffer);
    await face.load();
    if (fontData !== data) return;
    document.fonts.add(face);
    fontFace = face;
  } catch { fontFace = null; }
  if (running) { updateCSS(); }
}

// ---------- elements hidden by the user (picker) ----------
const userStyle = document.createElement('style');
userStyle.id = 'nuage-user-hidden-v3';
userStyle.setAttribute('data-nuage-owned', '');
let userHidden = [];
function updateUserCSS() {
  const a = `html[${ACTIVE}]`;
  const rules = [];
  for (const item of userHidden) {
    if (!item || typeof item.sel !== 'string' || item.sel.length > 1500) continue;
    const sel = `:is(${item.sel})`;
    if (item.mode === 'lines') {
      rules.push(`${a} ${sel},${a} ${sel}::before,${a} ${sel}::after{border-color:transparent!important;box-shadow:none!important;outline:none!important}`);
      rules.push(`${a} ${sel}::before,${a} ${sel}::after{background:transparent!important}`);
    } else rules.push(`${a} ${sel}{display:none!important}`);
  }
  userStyle.textContent = rules.join('\n');
}
function selectorFor(el) {
  const parts = [];
  for (let node = el, depth = 0; node && node !== document.body && node !== document.documentElement && depth < 8; node = node.parentElement, depth++) {
    if (node.id && !/\d{3,}|:/.test(node.id)) { parts.unshift('#' + CSS.escape(node.id)); break; }
    let part = node.localName;
    const classes = [...node.classList].filter(c => c.length < 60 && !/^nuage/i.test(c)).slice(0, 4);
    part += classes.map(c => '.' + CSS.escape(c)).join('');
    const same = node.parentElement ? [...node.parentElement.children].filter(k => k.localName === node.localName) : [];
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    parts.unshift(part);
    const sel = parts.join(' > ');
    try { if (depth >= 1 && document.querySelectorAll(sel).length === 1) break; } catch { break; }
  }
  return (parts[0]?.startsWith('#') ? '' : 'body ') + parts.join(' > ');
}
let picker = null;
function startPicker(lang, overrideColor) {
  if (picker) return;
  const ru = lang !== 'en';
  const pickColor = overrideColor || (settings.textColorEnabled && settings.textColor ? settings.textColor : (settings.colorEnabled ? settings.accentColor : '#ffffff'));
  const rgb = hexRGB(pickColor);
  const box = document.createElement('div');
  box.setAttribute('data-nuage-owned', '');
  box.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important';
  const root = box.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
  .hl{position:fixed;border:2px solid ${pickColor};background:rgba(${rgb},.18);border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 16px rgba(${rgb},.4);transition:all .06s;pointer-events:none;min-width:4px;min-height:4px}
  .tip{position:fixed;left:50%;top:14px;transform:translateX(-50%);background:rgba(12,15,22,.95);color:#ffffff;font:12px/1.4 system-ui,sans-serif;padding:8px 14px;border-radius:10px;border:1px solid rgba(${rgb},.5);box-shadow:0 6px 24px rgba(0,0,0,.7);max-width:80vw;text-align:center;pointer-events:none}
  .tip b{color:${pickColor};font-weight:700}.tip small{display:block;color:#9aa3b5;margin-top:3px}</style>
  <div class="hl"></div><div class="tip"></div>`;
  const hl = root.querySelector('.hl'), tip = root.querySelector('.tip');
  document.documentElement.append(box);
  let target = null, mode = 'hide', level = 0, lastX = 0, lastY = 0;
  const base = (x, y) => {
    let best = null, bestScore = Infinity;
    for (let dx = -6; dx <= 6; dx += 3) for (let dy = -6; dy <= 6; dy += 3) {
      for (const node of document.elementsFromPoint(x + dx, y + dy)) {
        if (node === box || node.closest(OWNED) || node === document.body || node === document.documentElement) continue;
        const r = node.getBoundingClientRect();
        const thin = Math.min(r.width, r.height) <= 4;
        const score = (thin ? 0 : 1000) + Math.abs(dx) + Math.abs(dy);
        if (score < bestScore) { best = node; bestScore = score; }
        break;
      }
    }
    return best;
  };
  const describe = () => {
    if (!target) {
      tip.innerHTML = ru
        ? '<b>Наведи на элемент FACEIT</b><small>Зажми <b>Ctrl</b> для удаления нескольких элементов подряд · Esc — готово</small>'
        : '<b>Point at a FACEIT element</b><small>Hold <b>Ctrl</b> to remove multiple elements in a row · Esc — done</small>';
      hl.style.display = 'none';
      return;
    }
    const r = target.getBoundingClientRect();
    Object.assign(hl.style, { display: 'block', left: r.left - 2 + 'px', top: r.top - 2 + 'px', width: r.width + 'px', height: r.height + 'px' });
    const name = target.localName + (target.classList[0] ? '.' + target.classList[0] : '');
    const action = mode === 'lines' ? (ru ? 'Убрать линии блока' : 'Remove the block lines') : (ru ? 'Скрыть элемент' : 'Hide element');
    tip.innerHTML = `<b>${action}</b> · ${name.replace(/[<>&]/g, '')} ${Math.round(r.width)}×${Math.round(r.height)}<small>${ru ? 'Клик — скрыть · <b>Зажми Ctrl</b> — удалить несколько элементов подряд · Esc — готово' : 'Click — hide · <b>Hold Ctrl</b> — remove multiple objects · Esc — done'}</small>`;
  };
  const update = () => {
    let el = base(lastX, lastY);
    for (let i = 0; el && i < level && el.parentElement && el.parentElement !== document.body; i++) el = el.parentElement;
    target = el;
    mode = 'hide';
    if (target) {
      const r = target.getBoundingClientRect();
      const nearEdge = Math.min(Math.abs(lastY - r.top), Math.abs(lastY - r.bottom), Math.abs(lastX - r.left), Math.abs(lastX - r.right)) <= 5;
      if (Math.min(r.width, r.height) > 4 && nearEdge) mode = 'lines';
    }
    describe();
  };
  const block = e => { e.preventDefault(); e.stopImmediatePropagation(); };
  const onMove = e => { lastX = e.clientX; lastY = e.clientY; update(); };
  const onWheel = e => { block(e); level = Math.max(0, level + (e.deltaY < 0 ? 1 : -1)); update(); };
  const onKey = e => { if (e.key === 'Escape') { block(e); stop(); } };
  const onClick = e => {
    block(e);
    const multi = e.ctrlKey || e.metaKey;
    if (!target) {
      if (!multi) stop();
      return;
    }
    const clickedTarget = target;
    const clickedMode = mode;
    const item = { sel: selectorFor(clickedTarget), mode: clickedMode, label: `${clickedTarget.localName}${clickedTarget.classList[0] ? '.' + clickedTarget.classList[0] : ''} ${Math.round(clickedTarget.getBoundingClientRect().width)}×${Math.round(clickedTarget.getBoundingClientRect().height)}`.slice(0, 80), added: Date.now() };
    if (!multi) {
      stop();
    }
    chrome.storage.local.get(C.hiddenKey).then(data => {
      const list = Array.isArray(data[C.hiddenKey]) ? data[C.hiddenKey] : [];
      if (!list.some(x => x.sel === item.sel && x.mode === item.mode)) list.push(item);
      return chrome.storage.local.set({ [C.hiddenKey]: list.slice(-200) });
    }).catch(() => {});
    if (multi) {
      if (clickedMode === 'lines') {
        clickedTarget.style.setProperty('border', 'none', 'important');
        clickedTarget.style.setProperty('outline', 'none', 'important');
        clickedTarget.style.setProperty('box-shadow', 'none', 'important');
      } else {
        clickedTarget.style.setProperty('display', 'none', 'important');
      }
      target = null;
      level = 0;
      update();
    }
  };
  const events = [['mousemove', onMove], ['wheel', onWheel], ['keydown', onKey], ['click', onClick], ['mousedown', block], ['mouseup', block], ['pointerdown', block], ['pointerup', block], ['contextmenu', e => { block(e); stop(); }]];
  const stop = () => { for (const [type, fn] of events) window.removeEventListener(type, fn, { capture: true }); box.remove(); picker = null; };
  for (const [type, fn] of events) window.addEventListener(type, fn, { capture: true, passive: false });
  picker = { stop };
  describe();
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'nuage-pick' || sender.id !== chrome.runtime.id) return;
  startPicker(message.lang, message.textColor);
  respond({ ok: true });
});

function wanted() {
  return settings.enabled;
}
function apply(reclassify = false) {
  const hadWallpaper = hasWallpaper;
  hasWallpaper = settings.enabled && (C.validMedia(metadata) || C.validImage(legacy));
  if (!wanted()) { stop(); return; }
  const hadColors = colors.enabled;
  const hadAccent = accentRGB.join(',');
  accentRGB = settings.accentColor.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16));
  const root = document.documentElement;
  Hold.all();
  colors.configure(settings);
  updateCSS();
  colors.flush();
  root.setAttribute(ACTIVE, 'true');
  root.setAttribute('data-nuage-style', settings.style);
  if (hasWallpaper) {
    root.setAttribute(WALLPAPER, 'true');
    if (!host.isConnected) {
      frame.src = chrome.runtime.getURL('wallpaper.html');
      root.append(host);
    }
  } else {
    root.removeAttribute(WALLPAPER);
    host.remove();
    frame.removeAttribute('src');
    clearCovers();
    clearMarks();
  }
  if (!style.isConnected) root.append(style);
  if (!coverStyle.isConnected) root.append(coverStyle);
  if (!extraStyle.isConnected) root.append(extraStyle);
  if (!userStyle.isConnected) root.append(userStyle);
  if (!running) {
    running = true;
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'style', 'fill', 'stroke', 'aria-selected', 'aria-checked', 'aria-pressed', 'data-state', 'role', 'aria-modal', 'open', 'hidden']
    });
    lastURL = location.href;
    routeTimer = setInterval(() => {
      if (location.href !== lastURL) { lastURL = location.href; queue(document.body); }
    }, 700);
    pending.add(document.body);
    scan();
  } else if (reclassify || hadWallpaper !== hasWallpaper || hadColors !== colors.enabled || colors.accentOn && hadAccent !== accentRGB.join(',')) {
    rescan();
  }
  Hold.release();
}

// ---------- settings ----------
let booted = false;
const early = [];
function change(changes) {
  const previous = settings;
  if (changes[C.key]) settings = C.normalize(changes[C.key].newValue);
  if (changes[C.mediaKey]) metadata = changes[C.mediaKey].newValue;
  if (changes[C.imageKey]) legacy = changes[C.imageKey].newValue || '';
  if (changes[C.fontKey]) loadFont(changes[C.fontKey].newValue);
  if (changes[C.hiddenKey]) { userHidden = Array.isArray(changes[C.hiddenKey].newValue) ? changes[C.hiddenKey].newValue : []; updateUserCSS(); }
  if (changes[C.key] || changes[C.mediaKey] || changes[C.imageKey]) {
    apply(['clearTop', 'focusEnabled', 'style', 'hideInviteSlots'].some(k => settings[k] !== previous[k]));
  }
}
function contextAlive() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!booted) early.push(changes); else change(changes);
});
chrome.storage.local.get([C.key, C.mediaKey, C.imageKey, C.fontKey, C.hiddenKey, C.seedKey]).then(data => {
  if (data[C.fontKey]) loadFont(data[C.fontKey]);
  userHidden = C.withDefaults(data[C.hiddenKey], data[C.seedKey]);
  if (!data[C.seedKey]) chrome.storage.local.set({ [C.hiddenKey]: userHidden, [C.seedKey]: true }).catch(() => {});
  updateUserCSS();
  settings = C.normalize(data[C.key]);
  metadata = data[C.mediaKey];
  legacy = data[C.imageKey] || '';
  booted = true;
  apply();
  early.forEach(change);
}).catch(stop);

// ---------- page events ----------
colors.onRemote = () => { if (running && colors.syncSheets()) Hold.release(); };
document.addEventListener('load', e => {
  if (!running) return;
  if (e.target instanceof HTMLLinkElement) { colors.syncSheets(); Hold.release(); return; }
  if (e.target instanceof HTMLImageElement && !e.target.closest(OWNED)) {
    for (let p = e.target, i = 0; p && p !== document.body && i < 5; p = p.parentElement, i++) { invalidate(p); pending.add(p); }
    scan();
  }
}, true);
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (running) rescan(); }, 200);
}, { passive: true });
window.addEventListener('popstate', () => {
  setTimeout(() => { if (running && location.href !== lastURL) { lastURL = location.href; queue(document.body); } }, 60);
});
document.addEventListener('scroll', () => scheduleCovers(150), { passive: true, capture: true });
for (const event of ['transitionend', 'animationend']) {
  document.addEventListener(event, e => {
    if (!running || !(e.target instanceof HTMLElement) || e.target.closest(OWNED)) return;
    if (e.animationName?.startsWith?.('nuage-') || e.target.hasAttribute(MODE) || e.target.hasAttribute(CTA)) return;
    invalidate(e.target);
    queue(e.target);
  }, true);
}
function hoverTarget(e) {
  if (!colors.accentOn || !(e.target instanceof Element)) return;
  const el = e.target.closest('button,a,[role="button"],[role="tab"],[role="menuitem"]');
  if (el) queue(el);
}
document.addEventListener('pointerover', hoverTarget, { passive: true });
document.addEventListener('pointerout', hoverTarget, { passive: true });
setInterval(() => { if (!contextAlive()) stop(); }, 5000);
})();
