'use strict';
/* Mi Marca · Sirley Zambrano Real Estate
   Aplica el Manual de Marca 2026 a fotos, posts y videos, todo dentro del teléfono.
   Si cambia el teléfono, el correo o las redes, sólo hay que cambiar BRAND. */

const BRAND = {
  name: 'SIRLEY ZAMBRANO',
  role: 'Agente inmobiliaria',
  phone: '099 967 5768',
  email: 'sjzm.36@hotmail.com',
  instagram: '@realestate.sirleyz',
  place: 'MANTA  ·  MANABÍ  ·  ECUADOR',
  hashtags: '#MantaEcuador #BienesRaícesManta #Manabí',
};

const TEAL = '#09585F', DEEP = '#063F45', MINT = '#CADFD8', SUB = '#e3f0ec';
// geometría de los PNG oficiales: logo 1762×663, isotipo 414 de ancho, nombre desde x 465, descriptor bajo y 480
const LOGO_W = 1762, LOGO_H = 663, MARK_W = 414, WORD_X = 465, WORD_W = 1297, SPLIT_Y = 480;
const FORMATS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };
const MAX_PHOTO = 2560;

const ICON = {
  wa: [new Path2D('M4 20l1.3-4A8.5 8.5 0 1 1 8.4 19z'), new Path2D('M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.7-2.7l.9-1-1-2z')],
  mail: [new Path2D('M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'), new Path2D('M3.5 6.5 12 13l8.5-6.5')],
};

const $ = s => document.querySelector(s);
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => 1 - Math.pow(1 - clamp(v), 3);
const prog = (t, start, dur) => ease((t - start) / dur);

// ---------- carga de logos y fuentes ----------
const IMG = {};
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
const ready = Promise.all([
  loadImg('img/logo-white.png').then(i => IMG.logo = i),
  loadImg('img/logo-teal.png').then(i => IMG.logoTeal = i),
  loadImg('img/mark-white.png').then(i => IMG.mark = i),
  loadImg('img/wordmark-white.png').then(i => IMG.word = i),
  document.fonts.load('700 40px Poppins'),
  document.fonts.load('500 30px Montserrat'),
  document.fonts.load('600 30px Montserrat'),
  document.fonts.load('700 30px Montserrat'),
]);

// ---------- utilidades ----------
let toastTimer = 0;
function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, ms);
}

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function toBlob(canvas, q = 0.92) {
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
}

// Abre el menú de compartir de iOS (Guardar imágenes / WhatsApp / Instagram). Debe llamarse desde un toque.
async function shareFiles(files) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  return true;
}

function segmented(el, onChange) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onChange(b.dataset.v);
  });
  return () => el.querySelector('.on').dataset.v;
}

// Dibuja una imagen o video llenando el área (recorta lo que sobra). pan va de -1 a 1 en cada eje.
function cover(ctx, src, sw, sh, W, H, pan = { x: 0, y: 0 }) {
  const k = Math.max(W / sw, H / sh), dw = sw * k, dh = sh * k;
  ctx.drawImage(src, (W - dw) / 2 * (1 - pan.x), (H - dh) / 2 * (1 - pan.y), dw, dh);
}

// Degradado de marca: #063F45 al 97% → #09585F al 82% → transparente
function fade(ctx, W, y0, y1, a0 = 0.97, a1 = 0.82) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(6,63,69,${a0})`);
  g.addColorStop(0.45, `rgba(9,88,95,${a1})`);
  g.addColorStop(1, 'rgba(9,88,95,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
}

function setFont(ctx, weight, size, family, spacing = 0) {
  ctx.font = `${weight} ${Math.round(size)}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing ? `${(size * spacing).toFixed(1)}px` : '0px';
}

// Reduce la letra hasta que el texto quepa en maxW.
function fit(ctx, text, weight, size, family, maxW, min, spacing = 0) {
  let s = size;
  for (;;) {
    setFont(ctx, weight, s, family, spacing);
    if (ctx.measureText(text).width <= maxW || s <= min) return s;
    s -= 1;
  }
}

function wrap(ctx, text, maxW) {
  const lines = []; let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + ' ' + w : w;
    if (!cur || ctx.measureText(t).width <= maxW) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function icon(ctx, paths, x, y, size, color = '#fff') {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 1.8; ctx.stroke(paths[0]);
  ctx.lineWidth = 1.3; ctx.stroke(paths[1]);
  ctx.restore();
}

function logoAt(ctx, x, y, w, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(IMG.logo, x, y, w, w * LOGO_H / LOGO_W);
  ctx.restore();
}

// Marca de agua grande y tenue en el centro: identifica la foto aunque recorten la esquina.
// Se mide el brillo detrás: sobre fondo oscuro va en blanco; sobre fondo claro (paredes blancas,
// cielo) va en teal con "multiply". Sin sombras ni contornos, que el manual prohíbe.
const CENTER_MARK = { width: 0.6, maxHeight: 0.3, white: 0.18, teal: 0.18, bright: 140 };
const sampler = document.createElement('canvas'); sampler.width = 24; sampler.height = 9;
const samplerCtx = sampler.getContext('2d', { willReadFrequently: true });

function isBright(ctx, x, y, w, h) {
  try {
    samplerCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, 24, 9);
    const d = samplerCtx.getImageData(0, 0, 24, 9).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4) >= CENTER_MARK.bright;
  } catch (e) { return false; }
}

// memo: en video se mide una vez por segundo en vez de en cada cuadro
function centerMark(ctx, W, H, cy = H / 2, memo = null) {
  const lw = Math.min(W * CENTER_MARK.width, H * CENTER_MARK.maxHeight * LOGO_W / LOGO_H), lh = lw * LOGO_H / LOGO_W;
  const x = (W - lw) / 2, y = cy - lh / 2;
  let bright;
  if (memo && performance.now() - memo.at < 1000) bright = memo.bright;
  else {
    bright = isBright(ctx, x, y, lw, lh);
    if (memo) { memo.at = performance.now(); memo.bright = bright; }
  }
  if (bright) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = CENTER_MARK.teal;
    ctx.drawImage(IMG.logoTeal, x, y, lw, lh);
    ctx.restore();
  } else {
    logoAt(ctx, x, y, lw, CENTER_MARK.white);
  }
}

// =====================================================================
// 1 · FOTOS CON LOGO
//   B · abajo a la derecha, logo al 20% en blanco al 80%, a 4% del borde (galería, WhatsApp)
//   A · arriba al centro, logo al 28% sobre degradado, a 5.5% del borde (posts y anuncios)
// =====================================================================
function brandPhoto(img, zone) {
  const k = Math.min(1, MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  centerMark(ctx, W, H);
  if (zone === 'A') {
    fade(ctx, W, 0, H * 0.28, 0.95, 0.55);
    const lw = Math.min(W * 0.28, H * 0.13 * LOGO_W / LOGO_H);
    logoAt(ctx, (W - lw) / 2, H * 0.055, lw);
  } else {
    const lw = Math.min(W * 0.20, H * 0.10 * LOGO_W / LOGO_H), lh = lw * LOGO_H / LOGO_W;
    const m = Math.min(W, H) * 0.04;
    // velo teal suave en la esquina: el manual no permite el logo sobre zonas con detalle sin degradado
    const r = lw * 1.35, cx = W - m - lw / 2, cy = H - m - lh / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(6,63,69,.55)'); g.addColorStop(0.55, 'rgba(9,88,95,.28)'); g.addColorStop(1, 'rgba(9,88,95,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    logoAt(ctx, W - m - lw, H - m - lh, lw, 0.8);
  }
  return c;
}

{
  let files = [], outputs = [];
  const grid = $('#f-grid'), msg = $('#f-msg');
  const zone = segmented($('#f-zone'), () => files.length && run());

  $('#f-input').addEventListener('change', e => {
    files = [...e.target.files]; e.target.value = '';
    if (files.length) run();
  });

  async function run() {
    await ready;
    const z = zone(), shareBtn = $('#f-share');
    outputs.forEach(o => URL.revokeObjectURL(o.url)); outputs = [];
    grid.innerHTML = ''; shareBtn.hidden = true; $('#f-help').hidden = true; $('#f-opts').hidden = false;
    for (let i = 0; i < files.length; i++) {
      msg.textContent = `Poniendo tu logo… ${i + 1} de ${files.length}`;
      const src = URL.createObjectURL(files[i]);
      try {
        const canvas = brandPhoto(await loadImg(src), z);
        const blob = await toBlob(canvas);
        canvas.width = canvas.height = 0;
        const file = new File([blob], `sirley-foto-${stamp()}-${i + 1}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        outputs.push({ file, url });
        const im = new Image(); im.src = url; grid.appendChild(im);
      } catch (err) {
        console.error(err);
      } finally {
        URL.revokeObjectURL(src);
      }
      if (z !== zone()) return;
    }
    const n = outputs.length, skipped = files.length - n;
    msg.textContent = (n === 1 ? '¡Lista! 1 foto con tu logo.' : `¡Listas! ${n} fotos con tu logo.`) +
      (skipped ? ` (${skipped} no se pudieron abrir)` : '');
    shareBtn.hidden = !n; $('#f-help').hidden = !n;
  }

  $('#f-share').addEventListener('click', () => shareFiles(outputs.map(o => o.file)));
}

// =====================================================================
// 2 · POST DE PROPIEDAD  (1080×1350 post · 1080×1920 historia)
// =====================================================================
// Intensidad de los degradados teal del post y la historia: [opacidad en el borde, opacidad a mitad del degradado].
// Más bajo = se ve más la foto. Valores originales del manual: arriba [0.95, 0.55] y abajo [0.97, 0.82].
const POST_FADE = { top: [0.6, 0.3], bottom: [0.72, 0.5] };

const POST = {
  post:  { fmt: '4:5',  logoW: 312, logoY: 74,  topFade: 0.30, botFade: 0.47, base: 0,   badge: [430, 340], textBottom: 225 },
  // historias: arriba el logo empieza bajo la barra de progreso y el nombre (~170 px); abajo ~220 px libres para la barra de respuesta
  story: { fmt: '9:16', logoW: 340, logoY: 170, topFade: 0.22, botFade: 0.44, base: 170, badge: [470, 500], textBottom: 260 },
};

function formatPrice(raw) {
  const s = raw.trim(); if (!s) return '';
  if (/^\$?\s*[\d.,\s]+$/.test(s)) {
    const [int, dec] = s.replace(/[$\s]/g, '').split(/,(?=\d{1,2}$)/);
    const digits = int.replace(/\D/g, '');
    if (digits) return '$' + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
  }
  return s;
}

function drawPost(ctx, kind, photo, d, pan) {
  const L = POST[kind], [W, H] = FORMATS[L.fmt], B = H - L.base;
  ctx.clearRect(0, 0, W, H);
  if (photo) {
    cover(ctx, photo, photo.naturalWidth, photo.naturalHeight, W, H, pan);
    // entre el logo de arriba y el título de abajo
    centerMark(ctx, W, H, H * (L.topFade + (1 - L.botFade)) / 2);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.75);
    g.addColorStop(0, TEAL); g.addColorStop(1, DEEP);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  fade(ctx, W, 0, H * L.topFade, ...POST_FADE.top);
  fade(ctx, W, H, H * (1 - L.botFade), ...POST_FADE.bottom);
  logoAt(ctx, (W - L.logoW) / 2, L.logoY, L.logoW);

  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // título · referencia · ubicación, de abajo hacia arriba
  let y = B - L.textBottom;
  if (d.loc) {
    fit(ctx, d.loc, 500, 32, 'Montserrat', W - 160, 22);
    ctx.fillStyle = SUB; ctx.fillText(d.loc, W / 2, y); y -= 48;
  }
  if (d.ref) {
    const ref = d.ref.toUpperCase();
    fit(ctx, ref, 600, 35, 'Montserrat', W - 160, 22, 0.06);
    ctx.fillStyle = SUB; ctx.fillText(ref, W / 2, y); y -= 60;
  }
  if (d.title) {
    const title = d.title.toUpperCase();
    let size = 58, lines;
    for (;;) {
      setFont(ctx, 700, size, 'Poppins');
      lines = wrap(ctx, title, W - 140);
      if ((lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= W - 140)) || size <= 36) break;
      size -= 2;
    }
    lines = lines.slice(0, 2);
    ctx.fillStyle = '#fff';
    for (let i = lines.length - 1; i >= 0; i--) { ctx.fillText(lines[i], W / 2, y); y -= size * 1.12; }
  }

  // contactos abajo a la izquierda, WhatsApp primero
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  const cx = 54, line = 47;
  let cy = B - 56;
  setFont(ctx, 600, 30, 'Montserrat');
  ctx.fillText(BRAND.email, cx + 44, cy); icon(ctx, ICON.mail, cx, cy - 28, 32);
  cy -= line;
  ctx.fillText(BRAND.phone, cx + 44, cy); icon(ctx, ICON.wa, cx, cy - 28, 32);
  cy -= line;
  setFont(ctx, 700, 26, 'Montserrat', 0.08);
  ctx.fillText('CONTACTOS:', cx, cy);

  // cuarto de círculo con el precio, abajo a la derecha
  if (d.price) {
    const [bw, bh] = L.badge, top = H - bh, rx = W - 44;
    ctx.fillStyle = TEAL;
    ctx.beginPath(); ctx.moveTo(W, H);
    ctx.ellipse(W, H, bw, bh, 0, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    setFont(ctx, 500, 29, 'Montserrat');
    ctx.fillText(d.op === 'alquiler' ? 'Precio de alquiler:' : 'Precio de venta:', rx, top + 122);
    fit(ctx, d.price, 700, 76, 'Poppins', bw * 0.72, 40);
    ctx.fillText(d.price, rx, top + 204);
    if (d.note) {
      fit(ctx, d.note, 500, 26, 'Montserrat', bw * 0.62, 18);
      ctx.fillText(d.note, rx, top + 246);
    }
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function caption(d) {
  const title = (d.title || 'Propiedad').toUpperCase();
  const lines = [`🏡 ${title}${d.ref ? ' | ' + d.ref : ''}`];
  if (d.loc) lines.push(`📍 ${d.loc}`);
  d.feat.forEach(f => lines.push(`✔️ ${f}`));
  if (d.price) {
    const price = d.op === 'alquiler' ? `Alquiler: ${d.price}/mes` : `Venta: ${d.price}`;
    lines.push(`💲 ${price}${d.note ? ` (${d.note.charAt(0).toLowerCase() + d.note.slice(1)})` : ''}`);
  }
  lines.push(`📲 Escríbeme por WhatsApp: ${BRAND.phone}`);
  lines.push(BRAND.hashtags);
  return lines.join('\n');
}

{
  const canvas = $('#p-canvas'), ctx = canvas.getContext('2d');
  let photo = null, pan = { x: 0, y: 0 }, op = 'venta', kind = 'post';
  const val = id => $(id).value.trim();
  const data = () => ({
    op, title: val('#p-title'), ref: val('#p-ref'), loc: val('#p-loc'),
    price: formatPrice($('#p-price').value), note: val('#p-note'),
    feat: $('#p-feat').value.split('\n').map(s => s.trim()).filter(Boolean),
  });

  let queued = false;
  function render() {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const [W, H] = FORMATS[POST[kind].fmt];
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      drawPost(ctx, kind, photo, data(), pan);
    });
  }

  segmented($('#p-op'), v => { op = v; render(); });
  segmented($('#p-fmt'), v => { kind = v; render(); });
  document.querySelectorAll('#post input:not([type=file]), #post textarea').forEach(i => i.addEventListener('input', render));

  // guarda lo escrito por si iOS recarga la página al volver de la galería
  const FIELDS = ['#p-title', '#p-ref', '#p-loc', '#p-price', '#p-note', '#p-feat'];
  try {
    const saved = JSON.parse(localStorage.getItem('post') || '{}');
    FIELDS.forEach(id => { if (saved[id]) $(id).value = saved[id]; });
  } catch (e) { /* sin datos guardados */ }
  document.querySelector('#post').addEventListener('input', () => {
    try { localStorage.setItem('post', JSON.stringify(Object.fromEntries(FIELDS.map(id => [id, $(id).value])))); } catch (e) { /* modo privado */ }
  });

  $('#p-input').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImg(url);
      const k = Math.min(1, MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      photo = await loadImg(c.toDataURL('image/jpeg', 0.95));
      pan = { x: 0, y: 0 }; $('#p-drag').hidden = false; render();
    } catch (err) {
      toast('No pude abrir esa foto. Prueba con otra.');
    } finally { URL.revokeObjectURL(url); }
  });

  // arrastrar para acomodar la foto
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (photo) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect(), sc = canvas.width / r.width;
    const [W, H] = [canvas.width, canvas.height];
    const k = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
    const ox = (photo.naturalWidth * k - W) / 2, oy = (photo.naturalHeight * k - H) / 2;
    if (ox > 1) pan.x = Math.max(-1, Math.min(1, pan.x + (e.clientX - drag.x) * sc / ox));
    if (oy > 1) pan.y = Math.max(-1, Math.min(1, pan.y + (e.clientY - drag.y) * sc / oy));
    drag = { x: e.clientX, y: e.clientY }; render();
  });
  const endDrag = () => drag = null;
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  $('#p-share').addEventListener('click', async () => {
    const d = data();
    if (!photo) { toast('Primero elige una foto.'); return; }
    if (!d.title) { toast('Escribe qué es la propiedad.'); $('#p-title').focus(); return; }
    // se dibuja de nuevo para que el archivo tenga lo último escrito
    drawPost(ctx, kind, photo, d, pan);
    const blob = await toBlob(canvas, 0.93);
    shareFiles([new File([blob], `sirley-${kind}-${stamp()}.jpg`, { type: 'image/jpeg' })]);
  });

  $('#p-copy').addEventListener('click', async () => {
    const text = caption(data());
    try { await navigator.clipboard.writeText(text); toast('Texto copiado. Ahora pégalo en tu publicación.'); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); t.remove(); toast('Texto copiado.');
    }
  });

  ready.then(render);
}

// =====================================================================
// 3 · VIDEO: intro 3 s → video con marca de agua y cintillo → cierre 5 s
// =====================================================================
const DUR = { intro: 3.0, outro: 5.0 };

// --- intro y cierre animados (mismo dibujo que el manual) ---
function motionBackground(ctx, W, H, t, dur) {
  const r = Math.max(W, H) * 0.75, g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, r);
  g.addColorStop(0, TEAL); g.addColorStop(1, DEEP);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const mh = Math.max(W, H) * 0.95, mw = mh * MARK_W / LOGO_H;
  ctx.save(); ctx.globalAlpha = 0.07;
  ctx.drawImage(IMG.mark, W * 0.62 - mw / 2 - 30 * (t / dur) * (W / 1080), H * 0.5 - mh / 2, mw, mh);
  ctx.restore();
}

function motionLogo(ctx, cx, cy, lw, t, t0, dur) {
  const push = 0.97 + 0.03 * clamp((t - t0) / (dur - t0));
  const k = lw * push / LOGO_W, x = cx - LOGO_W * k / 2, y = cy - LOGO_H * k / 2;
  const m = prog(t, t0, 0.9);
  if (m > 0) {
    ctx.save(); ctx.globalAlpha = clamp(m * 1.6);
    ctx.beginPath(); ctx.rect(x - 5, y - 5, MARK_W * k + 10, (LOGO_H * k + 10) * m); ctx.clip();
    ctx.drawImage(IMG.mark, x, y + (1 - m) * 24 * k, MARK_W * k, LOGO_H * k);
    ctx.restore();
  }
  const n = prog(t, t0 + 0.45, 0.7);
  if (n > 0) {
    ctx.save(); ctx.globalAlpha = n;
    ctx.beginPath(); ctx.rect(x + (MARK_W + 30) * k, y, (LOGO_W - MARK_W) * k, LOGO_H * k); ctx.clip();
    ctx.drawImage(IMG.word, 0, 0, WORD_W, SPLIT_Y, x + WORD_X * k - (1 - n) * 340 * k, y, WORD_W * k, SPLIT_Y * k);
    ctx.restore();
  }
  const dd = prog(t, t0 + 1.0, 0.6);
  if (dd > 0) {
    ctx.save(); ctx.globalAlpha = dd;
    ctx.drawImage(IMG.word, 0, SPLIT_Y, WORD_W, LOGO_H - SPLIT_Y, x + WORD_X * k + (1 - dd) * 90 * k, y + SPLIT_Y * k, WORD_W * k, (LOGO_H - SPLIT_Y) * k);
    ctx.restore();
  }
  return { bottom: y + LOGO_H * k };
}

function motionText(ctx, str, font, color, x, y, t, start) {
  const p = prog(t, start, 0.6); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = color; ctx.font = font; ctx.textAlign = 'center';
  ctx.fillText(str, x, y + (1 - p) * 30); ctx.restore();
}

function drawMotion(ctx, kind, fmt, t) {
  const [W, H] = FORMATS[fmt], s = Math.min(W, H) / 1080, land = W > H, dur = DUR[kind];
  motionBackground(ctx, W, H, t, dur);
  if (kind === 'intro') {
    motionLogo(ctx, W / 2, H / 2, land ? W * 0.42 : (fmt === '9:16' ? W * 0.72 : W * 0.64), t, 0.05, dur);
    return;
  }
  const lw = land ? W * 0.30 : (fmt === '9:16' ? W * 0.62 : W * 0.50);
  const cy = land ? H * 0.34 : (fmt === '9:16' ? H * 0.36 : H * 0.30);
  const { bottom } = motionLogo(ctx, W / 2, cy, lw, t, 0.05, dur);
  let y = bottom + (land ? 110 : 150) * s;
  motionText(ctx, 'ESCRÍBEME POR WHATSAPP', '600 ' + Math.round(34 * s) + 'px Montserrat', MINT, W / 2, y, t, 1.6);
  y += 118 * s;
  const p = prog(t, 1.8, 0.6);
  if (p > 0) {
    ctx.save(); ctx.globalAlpha = p;
    ctx.font = '700 ' + Math.round(96 * s) + 'px Poppins'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    const tw = ctx.measureText(BRAND.phone).width, ic = 78 * s, gap = 24 * s;
    const x0 = W / 2 - (ic + gap + tw) / 2, yy = y + (1 - p) * 30;
    icon(ctx, ICON.wa, x0, yy - ic * 0.85, ic);
    ctx.fillText(BRAND.phone, x0 + ic + gap, yy);
    ctx.restore();
  }
  y += 84 * s;
  motionText(ctx, BRAND.instagram, '500 ' + Math.round(40 * s) + 'px Montserrat', 'rgba(255,255,255,.88)', W / 2, y, t, 2.0);
  motionText(ctx, BRAND.place, '600 ' + Math.round(26 * s) + 'px Montserrat', MINT, W / 2, H - (land ? 90 : (fmt === '9:16' ? 260 : 110)) * s, t, 2.2);
}

// --- marca de agua y cintillo sobre el video ---
function drawWatermark(ctx, fmt) {
  const [W, H] = FORMATS[fmt];
  ctx.save();
  if (fmt === '16:9') {                 // logo blanco de 220 px, al 80%, arriba a la derecha
    ctx.globalAlpha = 0.8;
    ctx.drawImage(IMG.logo, W - W * 0.05 - 220, H * 0.05, 220, 220 * LOGO_H / LOGO_W);
  } else {                              // isotipo blanco de 96 px, al 75%, arriba a la izquierda (x 60 / y 270)
    const mh = fmt === '9:16' ? 96 : 90, x = fmt === '9:16' ? 60 : 54, y = fmt === '9:16' ? 270 : 54;
    ctx.globalAlpha = 0.75;
    ctx.drawImage(IMG.mark, x, y, mh * MARK_W / LOGO_H, mh);
  }
  ctx.restore();
}

const LT = { start: 0.8, hold: 4.2, slide: 0.4 };
function drawLowerThird(ctx, fmt, detail, t) {
  cintillo(ctx, fmt, BRAND.name, detail, t, LT.start, LT.hold);
}

// Recuadro teal que entra desde la izquierda: título en Poppins y, si hay, una línea de detalle debajo.
function cintillo(ctx, fmt, title, detail, t, start, hold) {
  if (t < start || t > start + hold + LT.slide) return;
  const [W, H] = FORMATS[fmt], vert = fmt === '9:16';
  const padX = 36, padY = 26, gap = 14;
  const x0 = vert ? 60 : Math.round(W * 0.05);
  const maxText = (vert ? W - 120 - x0 : W * 0.6) - padX * 2;
  const nameSize = fit(ctx, title, 700, 44, 'Poppins', maxText, 30);
  const nameW = ctx.measureText(title).width;
  const detSize = detail ? fit(ctx, detail, 500, 30, 'Montserrat', maxText, 20) : 0;
  const detW = detail ? ctx.measureText(detail).width : 0;
  const bw = Math.max(nameW, detW) + padX * 2, bh = padY * 2 + nameSize + (detail ? gap + detSize : 0);
  const bottom = vert ? H - 380 : H - Math.round(H * 0.05) - 20;   // 9:16: fuera de los 340 px de botones
  const y0 = bottom - bh;
  const p = ease((t - start) / LT.slide), q = ease((t - start - hold) / LT.slide);
  const dx = -(1 - p) * (bw + x0) - q * (bw + x0);

  ctx.save();
  ctx.globalAlpha = Math.min(p, 1 - q);
  ctx.fillStyle = 'rgba(9,88,95,.92)';
  ctx.fillRect(x0 + dx, y0, bw, bh);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; setFont(ctx, 700, nameSize, 'Poppins');
  ctx.fillText(title, x0 + dx + padX, y0 + padY + nameSize * 0.82);
  if (detail) {
    ctx.fillStyle = SUB; setFont(ctx, 500, detSize, 'Montserrat');
    ctx.fillText(detail, x0 + dx + padX, y0 + padY + nameSize + gap + detSize * 0.78);
  }
  ctx.restore();
}

const videoMark = { at: -1e9, bright: false };
function drawVideoFrame(ctx, vid, fmt, detail) {
  const [W, H] = FORMATS[fmt];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (vid.videoWidth) cover(ctx, vid, vid.videoWidth, vid.videoHeight, W, H);
  centerMark(ctx, W, H, H / 2, videoMark);
  drawWatermark(ctx, fmt);
  drawLowerThird(ctx, fmt, detail, vid.currentTime);
}

function videoFormat(w, h) {
  const r = w / h;
  return r < 0.8 ? '9:16' : r > 1.25 ? '16:9' : '1:1';
}

function pickMime() {
  const types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

function once(el, ev, ms = 8000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('timeout ' + ev)), ms);
    el.addEventListener(ev, () => { clearTimeout(timer); res(); }, { once: true });
    el.addEventListener('error', () => { clearTimeout(timer); rej(new Error('error ' + ev)); }, { once: true });
  });
}

{
  const canvas = $('#v-canvas'), ctx = canvas.getContext('2d');
  const V = { url: null, fmt: '9:16', dur: 0, result: null, busy: false };
  const detail = () => $('#v-name').value.trim() || `${BRAND.role} · ${BRAND.phone}`;
  const show = (id, on) => $(id).hidden = !on;
  let previewVid = null;

  function sizeCanvas() {
    const [W, H] = FORMATS[V.fmt];
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }

  function preview() {
    if (!previewVid || V.busy) return;
    sizeCanvas();
    const [W, H] = FORMATS[V.fmt];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    cover(ctx, previewVid, previewVid.videoWidth, previewVid.videoHeight, W, H);
    centerMark(ctx, W, H);
    drawWatermark(ctx, V.fmt);
    drawLowerThird(ctx, V.fmt, detail(), LT.start + 1.5);
  }
  $('#v-name').addEventListener('input', preview);

  $('#v-input').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || V.busy) return;
    // iOS sólo decodifica pocos videos a la vez: se suelta el anterior
    if (previewVid) { previewVid.removeAttribute('src'); previewVid.load(); previewVid = null; }
    const res = $('#v-result'); if (res.getAttribute('src')) { res.removeAttribute('src'); res.load(); }
    if (V.url) URL.revokeObjectURL(V.url);
    V.url = URL.createObjectURL(f);
    show('#v-done', false); show('#v-opts', false); show('#v-prev', false);
    $('#v-msg').textContent = 'Abriendo el video…';
    await ready;
    try {
      const vid = document.createElement('video');
      vid.muted = true; vid.playsInline = true; vid.preload = 'auto'; vid.src = V.url;
      await once(vid, 'loadedmetadata', 15000);
      V.dur = vid.duration; V.fmt = videoFormat(vid.videoWidth, vid.videoHeight);
      try { await Promise.race([vid.play(), new Promise((_, rej) => setTimeout(rej, 2500))]); } catch (err) { /* sin autoplay: el seek igual da un cuadro */ }
      vid.pause();
      vid.currentTime = Math.min(1, V.dur / 2);
      await once(vid, 'seeked', 8000).catch(() => {});
      previewVid = vid;
      // en Reels de menos de 15 s el manual pide empezar con la mejor toma, sin intro
      $('#v-intro').checked = V.dur >= 15;
      show('#v-opts', true); show('#v-prev', true);
      const mins = Math.floor(V.dur / 60), secs = Math.round(V.dur % 60);
      $('#v-msg').textContent = `Video de ${mins ? mins + ' min ' : ''}${secs} s. ` +
        (V.fmt === '9:16' ? 'Formato vertical (Reels, TikTok, estados).' : V.fmt === '16:9' ? 'Formato horizontal (YouTube, Facebook).' : 'Formato cuadrado.');
      preview();
    } catch (err) {
      console.error(err);
      $('#v-msg').textContent = 'No pude abrir ese video. Prueba con otro.';
    }
  });

  $('#v-go').addEventListener('click', () => {
    if (!V.url || V.busy) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      toast('Este teléfono no puede crear videos aquí. Actualiza iOS e inténtalo de nuevo.', 5000);
      return;
    }
    // Todo lo que necesita un toque (audio y reproducción) se arranca aquí mismo.
    let vid = document.createElement('video');
    vid.playsInline = true; vid.preload = 'auto'; vid.src = V.url;
    let ac = null, dest = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC();
      dest = ac.__dest = ac.createMediaStreamDestination();
      ac.createMediaElementSource(vid).connect(dest);
      ac.resume();
    } catch (err) {
      console.warn('sin audio', err); ac = null; dest = null; vid.muted = true;
    }
    const unlock = vid.play();
    V.busy = true;
    show('#v-opts', false); show('#v-done', false); show('#v-progress', true);
    $('#v-pick').hidden = true; $('#v-msg').textContent = '';
    let silent = false;
    Promise.resolve(unlock)
      .then(async () => {
        vid.pause();
        // Si iOS no deja arrancar el audio, el video conectado a él se congela: se usa una copia sin sonido.
        if (ac) {
          const t = performance.now();
          while (ac.state !== 'running' && performance.now() - t < 1500) { ac.resume().catch(() => {}); await new Promise(r => setTimeout(r, 100)); }
          if (ac.state !== 'running') {
            ac.close().catch(() => {}); ac = null; dest = null; silent = true;
            vid.removeAttribute('src'); vid.load();
            vid = document.createElement('video');
            vid.muted = true; vid.playsInline = true; vid.preload = 'auto'; vid.src = V.url;
            await once(vid, 'loadeddata', 8000);
          }
        }
        vid.currentTime = 0;
        await once(vid, 'seeked', 5000).catch(() => {});
      })
      .then(() => render(vid, ac))
      .then(({ blob, poster, total }) => {
        if (V.result) URL.revokeObjectURL(V.result.url);
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        V.result = { file: new File([blob], `sirley-video-${stamp()}.${ext}`, { type: blob.type.split(';')[0] }), url: URL.createObjectURL(blob) };
        const res = $('#v-result');
        res.poster = poster || ''; res.src = V.result.url;
        show('#v-prev', false); show('#v-done', true);
        $('#v-msg').textContent = silent ? 'Listo, pero el video salió sin sonido. Si lo necesitas con sonido, créalo otra vez.' : '¡Listo! Revisa tu video.';
        once(res, 'loadedmetadata').then(() => {
          if (isFinite(res.duration) && res.duration < total - 1)
            $('#v-msg').textContent = 'El video salió más corto de lo normal. Revísalo y, si le falta algo, toca «Elegir video» y créalo otra vez.';
        }).catch(() => {});
      })
      .catch(err => {
        console.error(err);
        $('#v-msg').textContent = err && err.message === 'hidden'
          ? 'Se detuvo porque saliste de la app. Toca «Crear video» otra vez y deja la pantalla encendida.'
          : 'Algo falló al crear el video. Toca «Crear video» otra vez.';
        show('#v-opts', true);
      })
      .finally(() => {
        V.busy = false; show('#v-progress', false); $('#v-pick').hidden = false;
        vid.pause(); vid.removeAttribute('src'); vid.load();
        if (ac) ac.close();
        preview();
      });
  });

  async function render(vid, ac) {
    const dest = ac && ac.__dest;
    sizeCanvas();
    const fmt = V.fmt, [W, H] = FORMATS[fmt], text = detail();
    const intro = $('#v-intro').checked, outro = $('#v-outro').checked;
    const total = (intro ? DUR.intro : 0) + vid.duration + (outro ? DUR.outro : 0);
    const bar = $('#v-bar');

    const stream = canvas.captureStream(30);
    if (dest) dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const mimeType = pickMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => rec.onstop = res);
    let recStarted = 0;
    rec.onstart = () => recStarted = performance.now();

    // fundido de 0.2 s entre partes: se guarda el último cuadro y se desvanece encima
    const snap = document.createElement('canvas'); snap.width = W; snap.height = H;
    const snapCtx = snap.getContext('2d');
    let fadeFrom = -1;
    const takeSnap = now => { snapCtx.drawImage(canvas, 0, 0); fadeFrom = now; };
    const drawFade = now => {
      if (fadeFrom < 0) return;
      const a = 1 - (now - fadeFrom) / 200;
      if (a <= 0) { fadeFrom = -1; return; }
      ctx.save(); ctx.globalAlpha = a; ctx.drawImage(snap, 0, 0); ctx.restore();
    };

    let wake = null;
    try { wake = await navigator.wakeLock.request('screen'); } catch (e) { /* no disponible */ }

    let failed = null;
    const onHide = () => { if (document.hidden) failed = new Error('hidden'); };
    document.addEventListener('visibilitychange', onHide);
    vid.addEventListener('error', () => failed = new Error('video'));

    // Calentamiento: se repite el primer cuadro hasta que el grabador arranca de verdad (+0.3 s).
    // Si el codificador tarda en iniciar, sólo se pierde ese cuadro quieto y no un pedazo de la intro.
    const warm0 = performance.now();
    let phase = 'warm', t0 = 0, stuckSince = 0, poster = '', lastT = -1, lastMove = 0;
    const first = () => intro ? drawMotion(ctx, 'intro', fmt, 0) : drawVideoFrame(ctx, vid, fmt, text);
    first();
    rec.start(1000);

    try {
      await new Promise((resolve, reject) => {
        const step = now => {
          if (failed) return reject(failed);
          if (phase === 'warm') {
            first();
            if ((recStarted && now - recStarted > 300) || now - warm0 > 2500) {
              t0 = now; phase = intro ? 'intro' : 'video';
              if (!intro) vid.play().catch(err => failed = err);
            }
          } else if (phase === 'intro') {
            const t = (now - t0) / 1000;
            drawMotion(ctx, 'intro', fmt, Math.min(t, DUR.intro));
            bar.style.width = (100 * t / total) + '%';
            if (t >= DUR.intro) {
              takeSnap(now); phase = 'video';
              vid.play().catch(err => failed = err);
            }
          } else if (phase === 'video') {
            drawVideoFrame(ctx, vid, fmt, text);
            drawFade(now);
            // portada del resultado: un cuadro del video con el cintillo
            if (!poster && vid.currentTime > Math.min(2, vid.duration / 2)) poster = canvas.toDataURL('image/jpeg', 0.7);
            bar.style.width = (100 * ((intro ? DUR.intro : 0) + vid.currentTime) / total) + '%';
            if (vid.ended || (vid.duration - vid.currentTime < 0.05 && vid.paused)) {
              if (!outro) return resolve();
              takeSnap(now); phase = 'outro'; t0 = now;
            } else {
              // iOS puede pausar o congelar el video (llamada, audio): se reanuda, y si no avanza en 8 s se aborta
              if (vid.currentTime !== lastT) { lastT = vid.currentTime; lastMove = now; }
              if (!lastMove) lastMove = now;
              if (now - lastMove > 8000) return reject(new Error('stall'));
              if (vid.paused || now - lastMove > 1500) {
                if (!stuckSince) stuckSince = now;
                else if (now - stuckSince > 800) {
                  if (ac && ac.state !== 'running') ac.resume().catch(() => {});
                  vid.play().catch(() => {}); stuckSince = now;
                }
              } else stuckSince = 0;
            }
          } else {
            const t = (now - t0) / 1000;
            drawMotion(ctx, 'outro', fmt, Math.min(t, DUR.outro));
            drawFade(now);
            bar.style.width = Math.min(100, 100 * ((intro ? DUR.intro : 0) + vid.duration + t) / total) + '%';
            if (t >= DUR.outro + 0.2) return resolve();
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    } finally {
      document.removeEventListener('visibilitychange', onHide);
      if (rec.state !== 'inactive') rec.stop();
      await stopped;
      stream.getTracks().forEach(t => t.stop());
      if (wake) wake.release().catch(() => {});
    }
    return { blob: new Blob(chunks, { type: rec.mimeType || mimeType || 'video/mp4' }), poster, total };
  }

  $('#v-share').addEventListener('click', () => V.result && shareFiles([V.result.file]));
}

// =====================================================================
// 4 · MÚSICA DE FONDO: tres canciones de dominio público (CC0), en music/ (ver music/CREDITOS.md).
//   Sin atribución y sin pagar derechos. Cada archivo dura 2 min; si el video es más largo, se repite.
// =====================================================================
const SONGS = {
  tranquila: 'music/pond.mp3',            // Rafael Krux · Pond
  alegre:    'music/advertime.mp3',       // Rafael Krux · Advertime
  elegante:  'music/3-am-west-end.mp3',   // statusq · 3 am West End
};

// Sólo se guarda decodificada la última canción usada (cada una ocupa ~40 MB de memoria).
const musicCache = {};
function musicBuffer(name) {
  if (!musicCache[name]) Object.keys(musicCache).forEach(k => delete musicCache[k]);
  if (!musicCache[name]) musicCache[name] = (async () => {
    const r = await fetch(SONGS[name]);
    if (!r.ok) throw new Error('música ' + r.status);
    const data = await r.arrayBuffer();
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(2, 1, 44100);
    const buf = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
    return { buf, loop: buf.duration };
  })().catch(err => { delete musicCache[name]; throw err; });
  return musicCache[name];
}

// Muestra de 8 s al tocar un estilo. Suena aunque el iPhone esté en silencio.
let sample = null;
function stopSample() {
  if (sample) { sample.close().catch(() => {}); sample = null; }
}
function playSample(name) {
  stopSample();
  if (!SONGS[name]) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    ac.resume(); sample = ac;
    musicBuffer(name).then(({ buf, loop }) => {
      if (sample !== ac) return;
      const s = ac.createBufferSource(), g = ac.createGain(), t = ac.currentTime;
      s.buffer = buf; s.loop = true; s.loopEnd = loop;
      g.gain.setValueAtTime(1, t + 6.5); g.gain.linearRampToValueAtTime(0, t + 8);
      s.connect(g); g.connect(ac.destination);
      s.start(t); s.stop(t + 8.1);
      s.onended = () => { if (sample === ac) stopSample(); };
    }).catch(() => toast('No pude cargar la música. Revisa tu internet y toca el estilo otra vez.'));
  } catch (err) { console.warn(err); }
}
addEventListener('hashchange', stopSample);

// =====================================================================
// 5 · VIDEO PROMOCIONAL: varias fotos y videos en el orden que ella elija, con música.
//   intro (si dura 15 s o más) → cada foto o video con su nombre en el cintillo → cierre con el WhatsApp
//   Siempre vertical 9:16 (Reels, TikTok, estados). Los videos van sin su sonido original.
// =====================================================================
// photo: segundos por foto · clipMax: segundos máximos de cada video · fade: fundido entre partes (ms)
const PROMO = { fmt: '9:16', photo: 3.5, clipMax: 8, fade: 400, maxItems: 20 };

// Movimiento lento: las fotos anchas se recorren de lado a lado y además se acercan un poco.
// zoom 0 en videos (sólo se recorren de lado si son horizontales).
function kenBurns(ctx, src, sw, sh, W, H, p, dir, zoom, amp) {
  const k = Math.max(W / sw, H / sh) * (1 + zoom * (0.02 + 0.08 * p)), dw = sw * k, dh = sh * k;
  const pan = dw - W > W * 0.2 ? dir * amp * (1 - 2 * p) : 0;
  ctx.drawImage(src, (W - dw) / 2 * (1 - pan), (H - dh) / 2, dw, dh);
}

// La foto se decodifica antes de que le toque, ya reducida al tamaño del video (cabe el acercamiento).
async function loadPhoto(url, W, H) {
  const img = await loadImg(url);
  if (img.decode) await img.decode().catch(() => {});
  const k = Math.min(1, Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.12);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function loadClip(v, url) {
  await v.unlock;
  if (v.getAttribute('src') !== url) v.src = url;
  if (v.readyState < 2) {
    // si iOS no carga el video quieto, se le da play un instante
    await once(v, 'loadeddata', 6000).catch(async err => {
      if (v.error) throw err;
      await v.play(); v.pause();
    });
  }
  if (v.currentTime > 0) { v.currentTime = 0; await once(v, 'seeked', 5000).catch(() => {}); }
  return v;
}

{
  const canvas = $('#pr-canvas'), ctx = canvas.getContext('2d');
  const list = $('#pr-list'), msg = $('#pr-msg');
  const P = { items: [], seq: 0, busy: false, adding: false, result: null };
  const show = (id, on) => $(id).hidden = !on;
  const isVideo = f => /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name);
  const segLen = it => it.kind === 'photo' ? PROMO.photo : Math.min(it.dur, PROMO.clipMax);
  const plan = () => {
    const media = P.items.reduce((s, it) => s + segLen(it), 0), intro = media >= 15;
    return { media, intro, total: (intro ? DUR.intro : 0) + media + DUR.outro };
  };
  const secs = s => { const m = Math.floor(s / 60), r = Math.round(s % 60); return m ? `${m} min ${r} s` : `${r} s`; };

  // nombre de la propiedad y música elegida: se guardan por si iOS recarga la página
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('promo') || '{}'); } catch (e) { /* sin datos guardados */ }
  if (saved.name) $('#pr-name').value = saved.name;
  if (saved.music) $('#pr-music').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === saved.music));
  const music = segmented($('#pr-music'), v => { saveOpts(); invalidate(); playSample(v); });
  function saveOpts() {
    try { localStorage.setItem('promo', JSON.stringify({ name: $('#pr-name').value, music: music() })); } catch (e) { /* modo privado */ }
  }
  $('#pr-name').addEventListener('input', () => { saveOpts(); invalidate(); });

  // el video ya hecho deja de valer si cambia algo
  function invalidate() {
    if ($('#pr-done').hidden) return;
    show('#pr-done', false);
    const res = $('#pr-result'); res.removeAttribute('src'); res.load();
    status();
  }

  function status(extra = '') {
    const n = P.items.length;
    msg.textContent = !n ? 'Tócalas en el orden en que quieres que salgan. Después puedes cambiar el orden con las flechas.'
      : `${n === 1 ? '1 foto o video' : `${n} fotos y videos`}. Tu video va a durar unos ${secs(plan().total)}.` + extra;
  }

  function renderList() {
    list.innerHTML = '';
    P.items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'item'; li.dataset.id = it.id;
      li.innerHTML = `<div class="thumb"><img alt=""><span class="num">${i + 1}</span>` +
        (it.kind === 'video' ? `<span class="tag">▶ ${Math.round(segLen(it))} s</span>` : '') + `</div>
        <div class="mid"><input placeholder="¿Qué se ve? Ej: Cocina" list="pr-labels" autocomplete="off" maxlength="40">
          <button class="del">Quitar</button></div>
        <div class="moves"><button class="up" aria-label="Subir">▲</button><button class="down" aria-label="Bajar">▼</button></div>`;
      li.querySelector('img').src = it.thumb;
      li.querySelector('input').value = it.label;
      li.querySelector('.up').disabled = i === 0;
      li.querySelector('.down').disabled = i === P.items.length - 1;
      list.appendChild(li);
    });
    const has = P.items.length > 0;
    show('#pr-opts', has);
    $('#pr-pick').classList.toggle('primary', !has);
    $('#pr-pick-txt').textContent = has ? 'Agregar más fotos o videos' : 'Elegir fotos y videos';
  }

  // Miniatura y duración; el archivo grande se abre recién al crear el video.
  async function openItem(file) {
    const url = URL.createObjectURL(file);
    const it = { id: ++P.seq, url, kind: isVideo(file) ? 'video' : 'photo', label: '', dur: 0, thumb: '' };
    const t = document.createElement('canvas'), tctx = t.getContext('2d');
    const thumb = (src, w, h) => { t.width = t.height = 200; cover(tctx, src, w, h, 200, 200); };
    try {
      if (it.kind === 'photo') {
        const img = await loadImg(url);
        thumb(img, img.naturalWidth, img.naturalHeight);
      } else {
        const vid = document.createElement('video');
        vid.muted = true; vid.playsInline = true; vid.preload = 'auto'; vid.src = url;
        try {
          await once(vid, 'loadedmetadata', 15000);
          it.dur = vid.duration;
          if (!isFinite(it.dur) || it.dur < 0.5) throw new Error('duración');
          try { await Promise.race([vid.play(), new Promise((_, rej) => setTimeout(rej, 2500))]); } catch (err) { /* sin autoplay: el seek igual da un cuadro */ }
          vid.pause();
          vid.currentTime = Math.min(1, it.dur / 2);
          await once(vid, 'seeked', 8000).catch(() => {});
          thumb(vid, vid.videoWidth, vid.videoHeight);
        } finally { vid.removeAttribute('src'); vid.load(); }
      }
      it.thumb = t.toDataURL('image/jpeg', 0.75);
      return it;
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }

  $('#pr-input').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length || P.busy || P.adding) return;
    P.adding = true; invalidate();
    await ready;
    let skipped = 0, over = 0;
    for (let i = 0; i < files.length; i++) {
      if (P.items.length >= PROMO.maxItems) { over = files.length - i; break; }
      msg.textContent = `Abriendo… ${i + 1} de ${files.length}`;
      try { P.items.push(await openItem(files[i])); renderList(); }
      catch (err) { console.error(err); skipped++; }
    }
    P.adding = false;
    renderList();
    status((skipped ? ` (${skipped === 1 ? '1 no se pudo abrir' : `${skipped} no se pudieron abrir`})` : '') +
      (over ? ` Puedes poner hasta ${PROMO.maxItems}; ${over === 1 ? 'una quedó fuera' : `${over} quedaron fuera`}.` : ''));
    // la música se prepara mientras ella escribe los nombres
    if (SONGS[music()]) musicBuffer(music()).catch(() => {});
  });

  list.addEventListener('input', e => {
    const it = P.items.find(x => x.id == e.target.closest('.item').dataset.id);
    if (it) { it.label = e.target.value; invalidate(); }
  });

  list.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || P.busy) return;
    const li = b.closest('.item'), i = P.items.findIndex(x => x.id == li.dataset.id);
    if (i < 0) return;
    if (b.classList.contains('del')) {
      URL.revokeObjectURL(P.items.splice(i, 1)[0].url);
      renderList(); invalidate(); status();
      return;
    }
    const j = b.classList.contains('up') ? i - 1 : i + 1;
    if (j < 0 || j >= P.items.length) return;
    [P.items[i], P.items[j]] = [P.items[j], P.items[i]];
    // la tarjeta movida se queda bajo el dedo (si la página puede desplazarse) y se ilumina
    const before = li.getBoundingClientRect().top;
    renderList(); invalidate();
    const moved = list.children[j];
    window.scrollBy(0, moved.getBoundingClientRect().top - before);
    moved.classList.add('flash');
  });

  $('#pr-clear').addEventListener('click', () => {
    if (P.busy || !confirm('¿Quitar todas las fotos y videos para empezar otro video?')) return;
    P.items.forEach(it => URL.revokeObjectURL(it.url));
    P.items = []; $('#pr-name').value = ''; saveOpts();
    invalidate(); renderList(); status();
    window.scrollTo(0, 0);
  });

  $('#pr-go').addEventListener('click', () => {
    if (P.busy || P.adding || !P.items.length) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      toast('Este teléfono no puede crear videos aquí. Actualiza iOS e inténtalo de nuevo.', 5000);
      return;
    }
    stopSample();
    // Todo lo que necesita un toque se arranca aquí mismo: el audio y los dos reproductores de video.
    const style = music(), items = P.items.map(it => ({ ...it }));
    const clips = items.filter(it => it.kind === 'video');
    const pool = [0, 1].map(k => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      if (clips[k]) { v.src = clips[k].url; v.unlock = v.play().then(() => v.pause(), () => {}); }
      return v;
    });
    let ac = null, dest = null;
    if (SONGS[style]) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        dest = ac.createMediaStreamDestination();
        ac.resume();
      } catch (err) { console.warn('sin audio', err); ac = null; }
    }
    invalidate();
    P.busy = true;
    show('#pr-opts', false); list.hidden = true; $('#pr-pick').hidden = true;
    show('#pr-prev', true); show('#pr-progress', true); $('#pr-bar').style.width = '0';
    msg.textContent = '';
    window.scrollTo(0, 0);
    let silent = false;
    (async () => {
      let song = null;
      if (ac) {
        song = await musicBuffer(style).catch(() => null);
        const t = performance.now();
        while (ac.state !== 'running' && performance.now() - t < 1500) { ac.resume().catch(() => {}); await new Promise(r => setTimeout(r, 100)); }
        if (!song || ac.state !== 'running') { ac.close().catch(() => {}); ac = null; dest = null; silent = true; }
      }
      return render(items, pool, ac, dest, song);
    })()
      .then(({ blob, poster, expected, skipped }) => {
        if (P.result) URL.revokeObjectURL(P.result.url);
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        P.result = { file: new File([blob], `sirley-promo-${stamp()}.${ext}`, { type: blob.type.split(';')[0] }), url: URL.createObjectURL(blob) };
        const res = $('#pr-result');
        res.poster = poster || ''; res.src = P.result.url;
        show('#pr-done', true);
        msg.textContent = '¡Listo! Revisa tu video.' +
          (silent ? ' Salió sin música; si la quieres, revisa tu internet y toca «Crear video» otra vez.' : '') +
          (skipped ? ` ${skipped === 1 ? '1 foto o video no se pudo usar y lo salté' : `${skipped} fotos o videos no se pudieron usar y los salté`}.` : '');
        once(res, 'loadedmetadata').then(() => {
          if (isFinite(res.duration) && res.duration < expected - 1)
            msg.textContent = 'El video salió más corto de lo normal. Revísalo y, si le falta algo, toca «Crear video» otra vez.';
        }).catch(() => {});
      })
      .catch(err => {
        console.error(err);
        msg.textContent = err && err.message === 'hidden'
          ? 'Se detuvo porque saliste de la app. Toca «Crear video» otra vez y deja la pantalla encendida.'
          : 'Algo falló al crear el video. Toca «Crear video» otra vez.';
      })
      .finally(() => {
        P.busy = false;
        show('#pr-progress', false); show('#pr-prev', false); show('#pr-opts', true);
        list.hidden = false; $('#pr-pick').hidden = false;
        pool.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
        if (ac) ac.close().catch(() => {});
      });
  });

  async function render(items, pool, ac, dest, song) {
    const fmt = PROMO.fmt, [W, H] = FORMATS[fmt];
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const name = $('#pr-name').value.trim();
    // cintillo: el nombre de lo que se ve; la primera parte lleva además el nombre de la propiedad
    const segs = items.map((it, i) => {
      const label = it.label.trim();
      return { it, len: segLen(it), dir: i % 2 ? -1 : 1, title: (label || (i ? '' : name)).toUpperCase(), sub: label && !i ? name : '' };
    });
    const media = segs.reduce((s, x) => s + x.len, 0), intro = media >= 15;
    const total = (intro ? DUR.intro : 0) + media + DUR.outro;
    const bar = $('#pr-bar'), mark = { at: -1e9, bright: false };

    const stream = canvas.captureStream(30);
    if (dest) dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const mimeType = pickMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => rec.onstop = res);
    let recStarted = 0;
    rec.onstart = () => recStarted = performance.now();

    // fundido entre partes: se guarda el último cuadro y se desvanece encima de la parte nueva
    const snap = document.createElement('canvas'); snap.width = W; snap.height = H;
    const snapCtx = snap.getContext('2d');
    let fadeFrom = -1;
    const takeSnap = now => { snapCtx.drawImage(canvas, 0, 0); fadeFrom = now; };
    const drawFade = now => {
      if (fadeFrom < 0) return;
      const a = 1 - (now - fadeFrom) / PROMO.fade;
      if (a <= 0) { fadeFrom = -1; return; }
      ctx.save(); ctx.globalAlpha = a; ctx.drawImage(snap, 0, 0); ctx.restore();
    };

    // cada parte se prepara mientras se graba la anterior; los videos se turnan entre los dos reproductores
    let nextPlayer = 0;
    const prep = i => {
      const s = segs[i]; if (!s || s.job) return;
      s.job = s.it.kind === 'photo' ? loadPhoto(s.it.url, W, H) : loadClip(pool[nextPlayer++ % 2], s.it.url);
      s.job.then(src => s.src = src, err => { console.warn('no se pudo usar', err); s.bad = true; });
    };
    const drawSeg = (s, t) => {
      const p = clamp(t / s.len), src = s.src;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (s.it.kind === 'photo') kenBurns(ctx, src, src.width, src.height, W, H, p, s.dir, 1, 0.6);
      else if (src.videoWidth) kenBurns(ctx, src, src.videoWidth, src.videoHeight, W, H, p, s.dir, 0, 0.4);
      centerMark(ctx, W, H, H / 2, mark);
      drawWatermark(ctx, fmt);
      if (s.title) cintillo(ctx, fmt, s.title, s.sub, t, 0.3, Math.max(0.8, s.len - 1.2));
    };

    // La música ya corre en silencio antes de grabar: con la pista de audio muda el grabador tarda en arrancar.
    let mus = null;
    if (song) {
      const s = ac.createBufferSource();
      mus = ac.createGain(); mus.gain.value = 0;
      s.buffer = song.buf; s.loop = true; s.loopEnd = song.loop;
      s.connect(mus); mus.connect(dest); s.start();
    }
    const startMusic = () => {
      if (!mus) return;
      const t = ac.currentTime;
      mus.gain.setValueAtTime(0, t); mus.gain.linearRampToValueAtTime(0.9, t + 0.5);
    };
    // la música baja junto con el cierre
    const endMusic = () => {
      if (!mus) return;
      const t = ac.currentTime;
      mus.gain.setValueAtTime(0.9, t + DUR.outro - 2.5); mus.gain.linearRampToValueAtTime(0, t + DUR.outro);
    };

    prep(0);
    if (!intro) await segs[0].job.catch(() => {});

    let wake = null;
    try { wake = await navigator.wakeLock.request('screen'); } catch (e) { /* no disponible */ }

    let failed = null;
    const onHide = () => { if (document.hidden) failed = new Error('hidden'); };
    document.addEventListener('visibilitychange', onHide);

    // Calentamiento como en el video con logo: se repite el primer cuadro hasta que el grabador arranca.
    const first = () => {
      if (intro) drawMotion(ctx, 'intro', fmt, 0);
      else if (segs[0].src) drawSeg(segs[0], 0);
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    };
    const warm0 = performance.now();
    let phase = 'warm', i = -1, cur = null, start = 0, t0 = 0, done = 0, waitSince = 0;
    let poster = '', skipped = 0, lastT = -1, lastMove = 0, stuckSince = 0;
    first();
    rec.start(1000);

    try {
      await new Promise((resolve, reject) => {
        // pasa a la siguiente parte (o al cierre si ya no quedan)
        const next = now => {
          if (cur && cur.src) {
            if (cur.it.kind === 'video') cur.src.pause();
            else cur.src.width = cur.src.height = 0;
          }
          i++;
          if (i >= segs.length) { takeSnap(now); phase = 'outro'; start = now; endMusic(); return; }
          cur = segs[i]; prep(i + 1); phase = 'wait'; waitSince = now;
        };
        const step = now => {
          if (failed) return reject(failed);
          if (phase === 'warm') {
            first();
            if ((recStarted && now - recStarted > 300) || now - warm0 > 2500) {
              t0 = start = now; startMusic();
              if (intro) phase = 'intro'; else next(now);
            }
          } else if (phase === 'intro') {
            const t = (now - start) / 1000;
            drawMotion(ctx, 'intro', fmt, Math.min(t, DUR.intro));
            bar.style.width = (100 * t / total) + '%';
            if (t >= DUR.intro) { done = DUR.intro; next(now); }
          }
          if (phase === 'wait') {
            // el cuadro anterior se queda quieto hasta que la parte nueva esté lista
            if (cur.bad) { skipped++; next(now); }
            else if (cur.src) {
              takeSnap(now); phase = 'seg'; start = now; lastT = -1; lastMove = now; stuckSince = 0;
              if (cur.it.kind === 'video') cur.src.play().catch(() => {});
            } else if (now - waitSince > 15000) return reject(new Error('stall'));
          }
          if (phase === 'seg') {
            const v = cur.it.kind === 'video' ? cur.src : null;
            const t = v ? v.currentTime : (now - start) / 1000;
            drawSeg(cur, t); drawFade(now);
            if (!poster && t > Math.min(1.5, cur.len / 2)) poster = canvas.toDataURL('image/jpeg', 0.7);
            bar.style.width = Math.min(100, 100 * (done + t) / total) + '%';
            if (t >= cur.len || (v && (v.ended || (v.duration - v.currentTime < 0.05 && v.paused)))) {
              done += cur.len; next(now);
            } else if (v) {
              // iOS puede pausar o congelar el video (llamada, audio): se reanuda, y si no avanza en 8 s se aborta
              if (v.currentTime !== lastT) { lastT = v.currentTime; lastMove = now; }
              if (now - lastMove > 8000) return reject(new Error('stall'));
              if (v.paused || now - lastMove > 1500) {
                if (!stuckSince) stuckSince = now;
                else if (now - stuckSince > 800) { v.play().catch(() => {}); stuckSince = now; }
              } else stuckSince = 0;
            }
          } else if (phase === 'outro') {
            const t = (now - start) / 1000;
            drawMotion(ctx, 'outro', fmt, Math.min(t, DUR.outro));
            drawFade(now);
            bar.style.width = Math.min(100, 100 * (done + t) / total) + '%';
            if (t >= DUR.outro + 0.2) return resolve();
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    } finally {
      document.removeEventListener('visibilitychange', onHide);
      if (rec.state !== 'inactive') rec.stop();
      await stopped;
      stream.getTracks().forEach(t => t.stop());
      if (wake) wake.release().catch(() => {});
      segs.forEach(s => { if (s.src && s.it.kind === 'photo') s.src.width = s.src.height = 0; });
    }
    if (skipped === segs.length) throw new Error('nada');
    const expected = (performance.now() - t0) / 1000;
    return { blob: new Blob(chunks, { type: rec.mimeType || mimeType || 'video/mp4' }), poster, expected, skipped };
  }

  $('#pr-share').addEventListener('click', () => P.result && shareFiles([P.result.file]));
  status();
}

// ---------- navegación ----------
function route() {
  const id = location.hash.slice(1) || 'home';
  const target = document.getElementById(id) && document.getElementById(id).classList.contains('screen') ? id : 'home';
  document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== target);
  $('#back').hidden = target === 'home';
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
