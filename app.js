'use strict';
/*
 * Scuola di Ballo — web app offline (iPhone e Android).
 * Stesse funzioni dell'app Android: allievi, sedi, corsi, iscrizioni, presenze,
 * pagamenti mensili Pagato/Non pagato, certificati medici, impostazioni, backup.
 * I dati restano solo sul dispositivo (IndexedDB). Nessun invio a server esterni.
 */

/* ========================= Utilità ========================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const isoDow = (iso) => { const g = parseISO(iso).getDay(); return g === 0 ? 7 : g; };
const dayAndDate = (iso) => `${DAYS[isoDow(iso) - 1]} ${fmtDate(iso)}`;
const relDay = (iso) => (iso === todayISO() ? 'Oggi' : iso === addDays(todayISO(), 1) ? 'Domani' : dayAndDate(iso));
const curYM = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 }; };
const ymLabel = ({ y, m }) => `${MONTHS[m - 1]} ${y}`;
const ymAdd = ({ y, m }, n) => { const t = y * 12 + (m - 1) + n; return { y: Math.floor(t / 12), m: (t % 12) + 1 }; };
const ymCmp = (a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m);
const ymEq = (a, b) => a.y === b.y && a.m === b.m;
const ymEnd = ({ y, m }) => isoOf(new Date(y, m, 0));
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const initials = (s) => ((s.firstName || '').slice(0, 1) + (s.lastName || '').slice(0, 1)).toUpperCase();

const LEVELS = { PRINCIPIANTI: 'Principianti', INTERMEDIO: 'Intermedio', AVANZATO: 'Avanzato', PERSONALIZZATO: 'Personalizzato' };
const ST = { ATTIVO: ['Attivo', 'Attivi', 'pos'], SOSPESO: ['Sospeso', 'Sospesi', 'warn'], ARCHIVIATO: ['Archiviato', 'Archiviati', 'neu'] };
const ATT = {
  PRESENTE: ['Presente', 'Presente', 'pos'],
  ASSENTE: ['Assente', 'Assente', 'neg'],
  GIUSTIFICATO: ['Assenza giustificata', 'Giustif.', 'warn'],
  PROVA: ['Lezione di prova', 'Prova', 'inf'],
};
const CERT = {
  NON_CONSEGNATO: ['Non consegnato', 'neu'],
  VALIDO: ['Valido', 'pos'],
  IN_SCADENZA: ['In scadenza', 'warn'],
  SCADUTO: ['Scaduto', 'neg'],
};
const DEFAULT_DISCIPLINES = ['Salsa cubana', 'Bachata', 'Son cubano', 'Rumba', 'Folklore afro-cubano'];

const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.6"/><path d="M2 20c0-3.9 3.1-6 7-6s7 2.1 7 6zM16.6 14c3 0 5.4 1.7 5.4 5v1h-4.4c0-2.4-.8-4.5-2.5-5.9z"/></svg>',
  place: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  card: '<svg viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v2h16V7zm0 5v5h16v-5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
  med: '<svg viewBox="0 0 24 24"><path d="M10 3h4v2h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5zm1 7v3H8v2h3v3h2v-3h3v-2h-3v-3z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M3 5h18v2H3zm4 6h10v2H7zm3 6h4v2h-4z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
};

/* ========================= Database (IndexedDB) ========================= */
const STORES = ['students', 'locations', 'courses', 'enrollments', 'lessons', 'attendance', 'payments', 'certificates', 'settings'];
const KEY = {
  students: (o) => o.id,
  locations: (o) => o.id,
  courses: (o) => o.id,
  lessons: (o) => o.id,
  enrollments: (o) => o.studentId + '|' + o.courseId, // un'iscrizione per allievo e corso
  attendance: (o) => o.lessonId + '|' + o.studentId, // una presenza per allievo e lezione
  payments: (o) => o.studentId + '|' + o.y + '|' + o.m, // un pagamento per allievo e mese
  certificates: (o) => o.studentId,
  settings: (o) => o.k,
};
const S = {};
STORES.forEach((s) => (S[s] = new Map()));
let db = null;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('scuola-ballo', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      STORES.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: '_k' }); });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function loadAll() {
  return Promise.all(STORES.map((s) => new Promise((res, rej) => {
    const q = db.transaction(s).objectStore(s).getAll();
    q.onsuccess = () => { S[s].clear(); q.result.forEach((o) => S[s].set(o._k, o)); res(); };
    q.onerror = () => rej(q.error);
  })));
}
function write(store, fn) {
  try {
    const tx = db.transaction(store, 'readwrite');
    fn(tx.objectStore(store));
    tx.onerror = () => toast('Errore di salvataggio: ' + (tx.error && tx.error.message));
  } catch (e) {
    toast('Errore di salvataggio: ' + e.message);
  }
}
function put(store, obj) {
  const o = { ...obj };
  o._k = KEY[store](o);
  S[store].set(o._k, o);
  write(store, (os) => os.put(o));
  return o;
}

/* ========================= Regole di dominio ========================= */
const all = (s) => [...S[s].values()];
const sortName = (s) => `${s.lastName} ${s.firstName}`;
const fullName = (s) => `${s.firstName} ${s.lastName}`;
const byName = (a, b) => sortName(a).localeCompare(sortName(b), 'it', { sensitivity: 'base' });
const getSetting = (k, d) => { const o = S.settings.get(k); return o ? o.v : d; };
const setSetting = (k, v) => put('settings', { k, v });
const warnings = () => { const p = +getSetting('warnPrimary', 30), u = +getSetting('warnUrgent', 7); return { p: Math.max(p, u), u: Math.min(p, u) }; };

const isPaid = (sid, ym) => S.payments.get(`${sid}|${ym.y}|${ym.m}`)?.paid === true;
const setPaid = (sid, ym, paid) => put('payments', { studentId: sid, y: ym.y, m: ym.m, paid, updatedAt: Date.now() });

const activeEnr = () => all('enrollments').filter((e) => e.active);
const coursesOfStudent = (sid) => activeEnr().filter((e) => e.studentId === sid).map((e) => S.courses.get(e.courseId)).filter(Boolean)
  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start));
const studentsOfCourse = (cid) => activeEnr().filter((e) => e.courseId === cid).map((e) => S.students.get(e.studentId)).filter(Boolean).sort(byName);
const inCourse = (sid, cid) => !!S.enrollments.get(sid + '|' + cid)?.active;
const inLocation = (sid, lid) => activeEnr().some((e) => e.studentId === sid && S.courses.get(e.courseId)?.locationId === lid);
const studentsOfLocation = (lid) => all('students').filter((s) => s.status !== 'ARCHIVIATO' && inLocation(s.id, lid)).sort(byName);
const locName = (id) => S.locations.get(id)?.name ?? '—';
const courseActive = (c) => !c.archived && !S.locations.get(c.locationId)?.archived;
const levelLabel = (c) => (c.level === 'PERSONALIZZATO' && c.customLevel ? c.customLevel : LEVELS[c.level] || '');
const timeRange = (c) => `${c.start}–${c.end}`;
const courseWhen = (c) => `${DAYS[c.dayOfWeek - 1]} ${timeRange(c)}`;
const activeStudents = () => all('students').filter((s) => s.status === 'ATTIVO');
const sortedCourses = () => all('courses').sort((a, b) =>
  locName(a.locationId).localeCompare(locName(b.locationId), 'it') || a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start));
const sortedLocations = () => all('locations').sort((a, b) => (a.archived - b.archived) || a.name.localeCompare(b.name, 'it'));

/** Stato del certificato, calcolato solo da consegna e scadenza. */
function certInfo(sid, today = todayISO()) {
  const c = S.certificates.get(sid);
  const w = warnings();
  let status;
  if (!c || !c.delivered) status = 'NON_CONSEGNATO';
  else if (!c.expiry) status = 'VALIDO';
  else if (c.expiry < today) status = 'SCADUTO';
  else if (c.expiry <= addDays(today, w.p)) status = 'IN_SCADENZA';
  else status = 'VALIDO';
  const days = c && c.delivered && c.expiry ? daysBetween(today, c.expiry) : null;
  return { cert: c, status, days, urgent: status === 'IN_SCADENZA' && days !== null && days <= w.u };
}
function certDetail(ci) {
  const d = ci.days;
  switch (ci.status) {
    case 'NON_CONSEGNATO': return 'Certificato non consegnato';
    case 'SCADUTO': return `Scaduto il ${fmtDate(ci.cert.expiry)}`;
    case 'IN_SCADENZA': return d === 0 ? 'Scade oggi' : `Scade il ${fmtDate(ci.cert.expiry)} (tra ${d} giorni)`;
    default: return ci.cert && ci.cert.expiry ? `Valido fino al ${fmtDate(ci.cert.expiry)}` : 'Valido · scadenza non indicata';
  }
}

function enroll(sid, cid) {
  const e = S.enrollments.get(sid + '|' + cid);
  if (!e) put('enrollments', { studentId: sid, courseId: cid, enrolledOn: todayISO(), active: true, removedOn: null });
  else if (!e.active) put('enrollments', { ...e, active: true, removedOn: null, enrolledOn: todayISO() });
}
/** Rimuove dal corso senza cancellare l'iscrizione storica né le presenze. */
function unenroll(sid, cid) {
  const e = S.enrollments.get(sid + '|' + cid);
  if (e) put('enrollments', { ...e, active: false, removedOn: todayISO() });
}

const findLesson = (cid, date) => all('lessons').find((l) => l.courseId === cid && l.date === date);
function openLesson(cid, date) {
  const l = findLesson(cid, date) || put('lessons', { id: uid(), courseId: cid, date, cancelled: false });
  go('#/lesson/' + l.id);
}
const attOf = (lid, sid) => S.attendance.get(lid + '|' + sid)?.status ?? null;
function lessonRows(lesson) {
  const ids = new Set(studentsOfCourse(lesson.courseId).filter((s) => s.status !== 'ARCHIVIATO').map((s) => s.id));
  all('attendance').forEach((a) => { if (a.lessonId === lesson.id) ids.add(a.studentId); });
  return [...ids].map((id) => S.students.get(id)).filter(Boolean).sort(byName);
}
function lessonCounts(lesson) {
  const recs = all('attendance').filter((a) => a.lessonId === lesson.id);
  return {
    present: recs.filter((a) => a.status === 'PRESENTE' || a.status === 'PROVA').length,
    absent: recs.filter((a) => a.status === 'ASSENTE' || a.status === 'GIUSTIFICATO').length,
  };
}
function studentHistory(sid) {
  return all('attendance').filter((a) => a.studentId === sid).map((a) => {
    const l = S.lessons.get(a.lessonId);
    const c = l && S.courses.get(l.courseId);
    return l && c ? { status: a.status, date: l.date, cancelled: l.cancelled, course: c.name, loc: locName(c.locationId) } : null;
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
}
const attendedCount = (sid, from, to) => studentHistory(sid)
  .filter((h) => !h.cancelled && (h.status === 'PRESENTE' || h.status === 'PROVA') && h.date >= from && h.date <= to).length;

/** Prossima data del corso: se è oggi ma già terminato, la settimana successiva. */
function nextOccurrence(c) {
  const t = todayISO();
  let diff = (((c.dayOfWeek - isoDow(t)) % 7) + 7) % 7;
  if (diff === 0 && nowHM() >= c.end) diff = 7;
  return addDays(t, diff);
}

/** Allievi del mese per i pagamenti: attivi iscritti entro fine mese + chi ha già una registrazione. */
function paymentRows(ym, locId, courseId) {
  const end = ymEnd(ym);
  return all('students').filter((s) => {
    const hasRec = S.payments.has(`${s.id}|${ym.y}|${ym.m}`);
    if (!hasRec && !(s.status === 'ATTIVO' && s.enrollmentDate <= end)) return false;
    if (courseId && !inCourse(s.id, courseId)) return false;
    if (locId && !inLocation(s.id, locId)) return false;
    return true;
  }).sort(byName);
}

/* ========================= Interfaccia: infrastruttura ========================= */
const UI = {
  stu: { q: '', status: 'ATTIVO', loc: '', course: '', pay: 'TUTTI', filters: false },
  cl: { tab: 'corsi', archived: false },
  att: { loc: '', course: '', date: todayISO() },
  pay: { month: null, status: 'TUTTI', loc: '', course: '' },
  cert: { status: '', loc: '', course: '' },
  period: {},
  forms: {},
};

function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, qs] = h.split('?');
  const [name, id] = path.split('/');
  return { name, id: id ? decodeURIComponent(id) : null, q: new URLSearchParams(qs || '') };
}
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
const back = () => { if (history.length > 1) history.back(); else go('#/home'); };

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

let modalActions = {};
function modal(title, body, buttons) {
  modalActions = {};
  const box = $('#modal .box');
  const btns = buttons.map((b, i) => {
    modalActions['m' + i] = b.fn;
    return `<button class="btn ${b.cls || 'text'}" data-act="modalBtn" data-i="m${i}">${esc(b.label)}</button>`;
  }).join('');
  box.innerHTML = `<div class="mh">${esc(title)}</div><div class="mb">${body}</div><div class="mf">${btns}</div>`;
  $('#modal').classList.add('open');
}
const closeModal = () => { $('#modal').classList.remove('open'); $('#modal .box').innerHTML = ''; modalActions = {}; };
function confirmBox(title, text, label, fn) {
  modal(title, `<p>${esc(text)}</p>`, [{ label: 'Annulla', fn: closeModal }, { label, cls: '', fn: () => { closeModal(); fn(); } }]);
}

const pill = (text, cls, attrs = '') => (attrs ? `<button class="pill ${cls}" ${attrs}>${esc(text)}</button>` : `<span class="pill ${cls}">${esc(text)}</span>`);
const payPill = (sid, paid, extra = '') => pill(paid ? '✓ Pagato' : '✕ Non pagato', paid ? 'pos' : 'neg', `data-act="togglePaid" data-id="${esc(sid)}" ${extra}`);
const certPill = (st) => pill(CERT[st][0], CERT[st][1]);
const stPill = (st) => pill(ST[st][0], ST[st][2]);
const avatar = (s) => `<div class="avatar">${esc(initials(s))}</div>`;
const empty = (title, msg, extra = '') => `<div class="empty"><h3>${esc(title)}</h3><div>${esc(msg)}</div>${extra}</div>`;
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(label)}</option>`;
const field = (label, input, err) => `<label class="f"><span>${esc(label)}</span>${input}${err ? `<div class="err">${esc(err)}</div>` : ''}</label>`;
const locOptions = (sel, none = 'Tutte', onlyActive = false) =>
  (none !== null ? opt('', none, sel) : '') + sortedLocations().filter((l) => !onlyActive || !l.archived || l.id === sel).map((l) => opt(l.id, l.name, sel)).join('');
const courseOptions = (sel, locId, none = 'Tutti') =>
  (none !== null ? opt('', none, sel) : '') + sortedCourses().filter((c) => !locId || c.locationId === locId).map((c) => opt(c.id, `${c.name} · ${locName(c.locationId)}`, sel)).join('');

const TABS = [
  ['home', 'Home', ICON.home],
  ['students', 'Allievi', ICON.people],
  ['courses', 'Corsi/Sedi', ICON.place],
  ['attendance', 'Presenze', ICON.check],
  ['payments', 'Pagamenti', ICON.card],
];

function render() {
  const r = route();
  const screen = (SCREENS[r.name] || SCREENS.home)(r);
  const isTop = TABS.some((t) => t[0] === r.name) || !SCREENS[r.name];
  const header = `<header class="top">
    ${screen.back !== false && !isTop ? `<button class="icon-btn" data-act="back" aria-label="Indietro">${ICON.back}</button>` : ''}
    <h1>${screen.title}</h1>${screen.actions || ''}</header>`;
  const tabs = isTop ? `<nav class="tabs">${TABS.map(([k, l, ic]) =>
    `<button class="tab ${k === r.name || (k === 'home' && !SCREENS[r.name]) ? 'on' : ''}" data-act="tab" data-to="${k}"><span class="ic">${ic}</span><span class="lb">${l}</span></button>`).join('')}</nav>` : '';
  $('#app').innerHTML = header + `<main class="${isTop ? '' : 'no-tabs'}">${screen.body}</main>` + (screen.fab || '') + tabs;
  if (screen.after) screen.after();
}
window.addEventListener('scroll', () => { const t = $('.top'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

/* ========================= Schermate ========================= */
const SCREENS = {};

/* ---------- Home ---------- */
SCREENS.home = () => {
  const act = activeStudents();
  const ym = curYM();
  const paid = act.filter((s) => isPaid(s.id, ym)).length;
  const unpaid = act.length - paid;
  const pct = act.length ? Math.round((paid / act.length) * 100) : 0;
  const cc = { NON_CONSEGNATO: 0, SCADUTO: 0, IN_SCADENZA: 0, VALIDO: 0 };
  act.forEach((s) => cc[certInfo(s.id).status]++);
  const courses = all('courses').filter(courseActive);
  const upcoming = courses.map((c) => ({ c, d: nextOccurrence(c) }))
    .sort((a, b) => a.d.localeCompare(b.d) || a.c.start.localeCompare(b.c.start)).slice(0, 5);
  return {
    title: 'Scuola di Ballo',
    actions: `<button class="icon-btn" data-act="nav" data-to="#/certificates" aria-label="Certificati medici">${ICON.med}</button>
              <button class="icon-btn" data-act="nav" data-to="#/settings" aria-label="Impostazioni">${ICON.gear}</button>`,
    body: `
      <div class="grid3">
        <button class="stat" data-act="tab" data-to="students"><div class="v">${act.length}</div><div class="l">Allievi attivi</div></button>
        <button class="stat" data-act="clTab" data-tab="sedi"><div class="v">${all('locations').filter((l) => !l.archived).length}</div><div class="l">Sedi</div></button>
        <button class="stat" data-act="clTab" data-tab="corsi"><div class="v">${courses.length}</div><div class="l">Corsi attivi</div></button>
      </div>
      <div class="card" data-act="tab" data-to="payments" style="cursor:pointer">
        <div class="card-h"><h2>Pagamenti · ${ymLabel(ym)}</h2></div>
        <div class="grid3">
          <div class="big pos"><div class="v">${paid}</div><div class="l">Pagato</div></div>
          <div class="big neg"><div class="v">${unpaid}</div><div class="l">Non pagato</div></div>
          <div class="big neu"><div class="v">${pct}%</div><div class="l">Pagato %</div></div>
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
      </div>
      <div class="card" data-act="nav" data-to="#/certificates" style="cursor:pointer">
        <div class="card-h"><h2>Certificati medici</h2></div>
        <div class="grid3">
          <div class="big neu"><div class="v">${cc.NON_CONSEGNATO}</div><div class="l">Mancanti</div></div>
          <div class="big neg"><div class="v">${cc.SCADUTO}</div><div class="l">Scaduti</div></div>
          <div class="big warn"><div class="v">${cc.IN_SCADENZA}</div><div class="l">In scadenza</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Azioni rapide</h2></div>
        <div class="grid2">
          <button class="btn tonal" data-act="nav" data-to="#/student-edit/new">Nuovo allievo</button>
          <button class="btn tonal" data-act="tab" data-to="attendance">Presenze</button>
          <button class="btn tonal" data-act="unpaid">Non pagati</button>
          <button class="btn tonal" data-act="nav" data-to="#/certificates">Certificati</button>
        </div>
        <button class="btn tonal block" style="margin-top:8px" data-act="tab" data-to="courses">Corsi e sedi</button>
      </div>
      <div class="card">
        <div class="card-h"><h2>Prossime lezioni</h2></div>
        ${upcoming.length ? `<div>${upcoming.map(({ c, d }) => `
          <div class="item" style="padding:10px 0" data-act="nav" data-to="#/course/${esc(c.id)}">
            <div class="t"><div class="small muted">${esc(relDay(d))} · ${esc(timeRange(c))}</div>
            <div class="n"><b>${esc(c.name)}</b></div>
            <div class="s">${esc(c.discipline)} · ${esc(levelLabel(c))} · ${esc(locName(c.locationId))}</div></div>
          </div>`).join('')}</div>`
        : '<div class="muted">Nessun corso attivo. Crea una sede e un corso da "Corsi/Sedi".</div>'}
      </div>`,
  };
};

/* ---------- Allievi: elenco ---------- */
function studentListHtml() {
  const f = UI.stu;
  const ym = curYM();
  const q = f.q.trim().toLowerCase();
  let list = all('students').filter((s) => {
    if (f.status && s.status !== f.status) return false;
    if (q) {
      const hay = `${s.firstName} ${s.lastName} ${s.lastName} ${s.firstName} ${s.phone}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.course && !inCourse(s.id, f.course)) return false;
    if (f.loc && !inLocation(s.id, f.loc)) return false;
    if (f.pay === 'SI' && !isPaid(s.id, ym)) return false;
    if (f.pay === 'NO' && isPaid(s.id, ym)) return false;
    return true;
  }).sort(byName);
  if (!list.length) {
    return q ? empty('Nessun risultato', `Nessun allievo corrisponde a "${f.q}" con i filtri attuali.`)
      : empty('Nessun allievo', 'Aggiungi il primo allievo con "Nuovo allievo" oppure modifica i filtri.');
  }
  return `<div class="muted small" style="margin:4px">${list.length} allievi · pagamenti di ${ymLabel(ym)}</div>
    <div class="list">${list.map((s) => `
      <div class="item" data-act="nav" data-to="#/student/${esc(s.id)}">
        ${avatar(s)}
        <div class="t"><div class="n">${esc(sortName(s))}</div>
        <div class="s">${esc(s.phone)}${s.status !== 'ATTIVO' ? ' · ' + ST[s.status][0].toLowerCase() : ''}</div></div>
        ${payPill(s.id, isPaid(s.id, ym))}
      </div>`).join('')}</div>`;
}
SCREENS.students = () => {
  const f = UI.stu;
  const nFilters = [f.status !== 'ATTIVO', !!f.loc, !!f.course].filter(Boolean).length;
  return {
    title: 'Allievi',
    actions: `<button class="icon-btn" data-act="toggleStuFilters" aria-label="Filtri">${ICON.filter}</button>${nFilters ? `<span class="pill neg" style="padding:2px 8px">${nFilters}</span>` : ''}`,
    body: `
      <div class="search">${ICON.search}<input class="in" id="stuQ" type="search" placeholder="Cerca per nome, cognome o telefono" value="${esc(f.q)}" autocomplete="off"></div>
      ${f.filters ? `
        ${field('Stato iscrizione', `<select class="in" data-change="stuStatus">${opt('', 'Tutti', f.status)}${Object.keys(ST).map((k) => opt(k, ST[k][1], f.status)).join('')}</select>`)}
        <div class="grid2">
          ${field('Sede', `<select class="in" data-change="stuLoc">${locOptions(f.loc)}</select>`)}
          ${field('Corso', `<select class="in" data-change="stuCourse">${courseOptions(f.course, f.loc)}</select>`)}
        </div>` : ''}
      <div class="seg">${[['TUTTI', 'Tutti'], ['NO', 'Non pagati'], ['SI', 'Pagati']].map(([k, l]) =>
        `<button class="${f.pay === k ? 'on' : ''}" data-act="stuPay" data-v="${k}">${l}</button>`).join('')}</div>
      <div id="list">${studentListHtml()}</div>`,
    fab: `<button class="fab" data-act="nav" data-to="#/student-edit/new">${ICON.plus}Nuovo allievo</button>`,
  };
};

/* ---------- Allievi: inserimento / modifica ---------- */
SCREENS['student-edit'] = (r) => {
  const isNew = r.id === 'new';
  const s = isNew ? null : S.students.get(r.id);
  if (!isNew && !s) return { title: 'Allievo', body: empty('Allievo non trovato', 'La scheda richiesta non esiste.') };
  const key = 'stu-' + r.id;
  const f = UI.forms[key] || (UI.forms[key] = {
    firstName: s?.firstName || '', lastName: s?.lastName || '', phone: s?.phone || '', email: s?.email || '',
    birthDate: s?.birthDate || '', enrollmentDate: s?.enrollmentDate || todayISO(), status: s?.status || 'ATTIVO', notes: s?.notes || '', errors: {},
  });
  const e = f.errors;
  const tf = (name, label, type = 'text', extra = '') =>
    field(label, `<input class="in ${e[name] ? 'bad' : ''}" data-form="${key}" name="${name}" type="${type}" value="${esc(f[name])}" ${extra}>`, e[name]);
  return {
    title: isNew ? 'Nuovo allievo' : 'Modifica allievo',
    actions: `<button class="btn text" data-act="saveStudent" data-id="${esc(r.id)}">Salva</button>`,
    body: `
      ${tf('firstName', 'Nome *', 'text', 'autocapitalize="words" autocomplete="off"')}
      ${tf('lastName', 'Cognome *', 'text', 'autocapitalize="words" autocomplete="off"')}
      ${tf('phone', 'Telefono *', 'tel', 'inputmode="tel" autocomplete="off"')}
      ${tf('email', 'Email (facoltativa)', 'email', 'autocomplete="off"')}
      ${tf('birthDate', 'Data di nascita (facoltativa)', 'date', `max="${todayISO()}"`)}
      ${tf('enrollmentDate', 'Data di iscrizione', 'date')}
      ${isNew ? '' : field("Stato dell'iscrizione", `<select class="in" data-form="${key}" name="status">${Object.keys(ST).map((k) => opt(k, ST[k][0], f.status)).join('')}</select>`)}
      ${field('Note organizzative (facoltative)', `<textarea class="in" data-form="${key}" name="notes">${esc(f.notes)}</textarea><div class="muted small" style="margin:4px">Solo informazioni organizzative: non inserire dati sanitari.</div>`)}
      <button class="btn block" data-act="saveStudent" data-id="${esc(r.id)}">${isNew ? 'Crea allievo' : 'Salva modifiche'}</button>`,
  };
};

/* ---------- Allievi: scheda ---------- */
SCREENS.student = (r) => {
  const s = S.students.get(r.id);
  if (!s) return { title: 'Allievo', body: empty('Allievo non trovato', 'La scheda richiesta non esiste.') };
  const ym = curYM();
  const ci = certInfo(s.id);
  const courses = coursesOfStudent(s.id);
  const per = UI.period[s.id] || (UI.period[s.id] = { from: todayISO().slice(0, 8) + '01', to: todayISO() });
  const hist = studentHistory(s.id);
  // Mesi: dall'iscrizione (max 12) + mesi con una registrazione
  const months = new Map();
  const startYM = (() => { const [y, m] = s.enrollmentDate.split('-').map(Number); const a = { y, m }; const b = ymAdd(ym, -11); return ymCmp(a, b) > 0 ? a : b; })();
  for (let m = ym; ymCmp(m, startYM) >= 0; m = ymAdd(m, -1)) months.set(`${m.y}-${m.m}`, m);
  months.set(`${ym.y}-${ym.m}`, ym);
  all('payments').filter((p) => p.studentId === s.id).forEach((p) => { if (ymCmp(p, ym) <= 0) months.set(`${p.y}-${p.m}`, { y: p.y, m: p.m }); });
  const monthList = [...months.values()].sort((a, b) => ymCmp(b, a)).slice(0, 24);
  const paidNow = isPaid(s.id, ym);
  const statusBtns = [
    s.status !== 'ATTIVO' ? `<button class="btn outline" data-act="setStatus" data-id="${esc(s.id)}" data-v="ATTIVO">Riattiva</button>` : '',
    s.status !== 'SOSPESO' ? `<button class="btn outline" data-act="setStatus" data-id="${esc(s.id)}" data-v="SOSPESO">Sospendi</button>` : '',
    s.status !== 'ARCHIVIATO' ? `<button class="btn danger" data-act="archiveStudent" data-id="${esc(s.id)}">Archivia</button>` : '',
  ].join('');
  return {
    title: esc(fullName(s)),
    actions: `<button class="icon-btn" data-act="nav" data-to="#/student-edit/${esc(s.id)}" aria-label="Modifica">${ICON.edit}</button>`,
    body: `
      <div class="card">
        <div class="card-h"><h2>Anagrafica</h2>${stPill(s.status)}</div>
        <div class="row"><div class="info grow"><b>Telefono</b><span>${esc(s.phone)}</span></div>
          <a class="icon-btn" href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}" aria-label="Chiama">${ICON.phone}</a></div>
        ${s.email ? `<div class="info"><b>Email</b><span>${esc(s.email)}</span></div>` : ''}
        ${s.birthDate ? `<div class="info"><b>Data di nascita</b><span>${fmtDate(s.birthDate)}</span></div>` : ''}
        <div class="info"><b>Iscritto dal</b><span>${fmtDate(s.enrollmentDate)}</span></div>
        ${s.notes ? `<div class="info"><b>Note</b><span>${esc(s.notes)}</span></div>` : ''}
      </div>
      <div class="card">
        <div class="card-h"><h2>Quota di ${ymLabel(ym)}</h2></div>
        <div class="row"><div class="grow muted small">Tocca per cambiare lo stato</div>${payPill(s.id, paidNow)}</div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Certificato medico</h2><button class="btn text" data-act="certDialog" data-id="${esc(s.id)}">Aggiorna</button></div>
        <div class="row">${certPill(ci.status)}<span class="${ci.urgent ? 'err' : 'muted'}" style="${ci.urgent ? 'font-weight:700' : ''}">${esc(certDetail(ci))}</span></div>
        ${ci.cert && ci.cert.delivered ? `<div class="info" style="margin-top:8px"><b>Consegnato il</b><span>${fmtDate(ci.cert.deliveryDate)}</span></div>
          <div class="info"><b>Scadenza</b><span>${fmtDate(ci.cert.expiry)}</span></div>` : ''}
        ${ci.cert && ci.cert.notes ? `<div class="info"><b>Note</b><span>${esc(ci.cert.notes)}</span></div>` : ''}
      </div>
      <div class="card">
        <div class="card-h"><h2>Corsi frequentati (${courses.length})</h2><button class="btn text" data-act="enrollCoursesDialog" data-id="${esc(s.id)}">+ Iscrivi</button></div>
        ${courses.length ? `<div class="muted small">Sedi: ${esc([...new Set(courses.map((c) => locName(c.locationId)))].join(', '))}</div>
          ${courses.map((c) => `<div class="item" style="padding:10px 0" data-act="nav" data-to="#/course/${esc(c.id)}">
            <div class="t"><div class="n">${esc(c.name)}</div><div class="s">${esc(locName(c.locationId))} · ${esc(courseWhen(c))}</div></div>
            <button class="btn text" data-act="unenroll" data-sid="${esc(s.id)}" data-cid="${esc(c.id)}">Rimuovi</button></div>`).join('')}`
        : '<div class="muted">Non è iscritto a nessun corso.</div>'}
      </div>
      <div class="card">
        <div class="card-h"><h2>Presenze</h2></div>
        <div class="grid2">
          ${field('Dal', `<input class="in" type="date" data-change="perFrom" data-id="${esc(s.id)}" value="${per.from}">`)}
          ${field('Al', `<input class="in" type="date" data-change="perTo" data-id="${esc(s.id)}" value="${per.to}">`)}
        </div>
        <div style="font-weight:600;margin:4px 0 8px">Lezioni frequentate nel periodo: ${attendedCount(s.id, per.from <= per.to ? per.from : per.to, per.from <= per.to ? per.to : per.from)}</div>
        ${hist.length ? `<div class="small" style="font-weight:600">Ultime registrazioni</div>
          ${hist.slice(0, 20).map((h) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--surface-3)">
            <div class="grow"><div>${fmtDate(h.date)}</div><div class="muted small">${esc(h.course)} · ${esc(h.loc)}${h.cancelled ? ' · annullata' : ''}</div></div>
            ${pill(ATT[h.status][0], ATT[h.status][2])}</div>`).join('')}`
        : '<div class="muted">Nessuna presenza registrata.</div>'}
      </div>
      <div class="card">
        <div class="card-h"><h2>Storico pagamenti</h2></div>
        <div class="muted small">Tocca un mese per correggerne lo stato.</div>
        ${monthList.map((m) => `<div class="row" style="padding:6px 0">
          <div class="grow">${ymLabel(m)}</div>${pill(isPaid(s.id, m) ? '✓ Pagato' : '✕ Non pagato', isPaid(s.id, m) ? 'pos' : 'neg', `data-act="toggleMonthPaid" data-id="${esc(s.id)}" data-y="${m.y}" data-m="${m.m}"`)}</div>`).join('')}
      </div>
      <div class="menu-row">${statusBtns}</div>`,
  };
};

/* ---------- Corsi e sedi ---------- */
SCREENS.courses = () => {
  const t = UI.cl;
  const hasLoc = all('locations').some((l) => !l.archived);
  let body = `<div class="seg">
      <button class="${t.tab === 'corsi' ? 'on' : ''}" data-act="clTabSwitch" data-tab="corsi">Corsi</button>
      <button class="${t.tab === 'sedi' ? 'on' : ''}" data-act="clTabSwitch" data-tab="sedi">Sedi</button></div>
    <div class="chips"><button class="chip ${t.archived ? 'on' : ''}" data-act="clArchived">Mostra archiviati</button></div>`;
  if (t.tab === 'corsi') {
    const list = sortedCourses().filter((c) => t.archived || courseActive(c));
    if (!list.length) {
      body += empty('Nessun corso', hasLoc ? 'Crea il primo corso con "Nuovo corso".' : 'Per iniziare crea una sede nella scheda "Sedi", poi aggiungi i corsi.');
    } else {
      const groups = {};
      list.forEach((c) => (groups[c.locationId] = groups[c.locationId] || []).push(c));
      body += Object.entries(groups).map(([lid, cs]) => `<div class="group-h">${esc(locName(lid))}</div>
        <div class="list">${cs.map((c) => courseItem(c)).join('')}</div>`).join('');
    }
  } else {
    const list = sortedLocations().filter((l) => t.archived || !l.archived);
    body += list.length ? `<div class="list">${list.map((l) => {
      const n = all('courses').filter((c) => c.locationId === l.id && !c.archived).length;
      return `<div class="item" data-act="nav" data-to="#/location/${esc(l.id)}">
        <div class="avatar">${ICON.place.replace('<svg', '<svg style="width:22px;height:22px;fill:currentColor"')}</div>
        <div class="t"><div class="n">${esc(l.name)}</div><div class="s">${esc([l.address, `${n} corsi attivi`, l.archived ? 'archiviata' : ''].filter(Boolean).join(' · '))}</div></div></div>`;
    }).join('')}</div>`
      : empty('Nessuna sede', 'Aggiungi la prima sede con "Nuova sede". Puoi crearne quante vuoi.');
  }
  return {
    title: 'Corsi e sedi',
    body,
    fab: t.tab === 'corsi'
      ? `<button class="fab" data-act="newCourse">${ICON.plus}Nuovo corso</button>`
      : `<button class="fab" data-act="locationDialog">${ICON.plus}Nuova sede</button>`,
  };
};
function courseItem(c) {
  return `<div class="item" data-act="nav" data-to="#/course/${esc(c.id)}">
    <div class="t"><div class="n">${esc(c.name)}</div>
    <div class="s">${esc(courseWhen(c))}\n${esc(c.discipline)} · ${esc(levelLabel(c))}${c.teacher ? '\nInsegnante: ' + esc(c.teacher) : ''}</div></div>
    ${c.archived ? '<span class="pill neu">Archiviato</span>' : ''}</div>`;
}

/* ---------- Corso: modifica ---------- */
SCREENS['course-edit'] = (r) => {
  const isNew = r.id === 'new';
  const c = isNew ? null : S.courses.get(r.id);
  if (!isNew && !c) return { title: 'Corso', body: empty('Corso non trovato', 'Il corso richiesto non esiste.') };
  const key = 'course-' + r.id;
  const f = UI.forms[key] || (UI.forms[key] = {
    name: c?.name || '', discipline: c?.discipline || '', locationId: c?.locationId || r.q.get('loc') || '',
    teacher: c?.teacher || '', dayOfWeek: String(c?.dayOfWeek || isoDow(todayISO())), start: c?.start || '20:00', end: c?.end || '21:00',
    level: c?.level || 'PRINCIPIANTI', customLevel: c?.customLevel || '', notes: c?.notes || '', errors: {},
  });
  const e = f.errors;
  const disciplines = [...DEFAULT_DISCIPLINES, ...all('courses').map((x) => x.discipline)]
    .filter((v, i, a) => v && a.findIndex((w) => w.toLowerCase() === v.toLowerCase()) === i);
  const locs = sortedLocations().filter((l) => !l.archived || l.id === f.locationId);
  const inp = (name, type = 'text', extra = '') => `<input class="in ${e[name] ? 'bad' : ''}" data-form="${key}" name="${name}" type="${type}" value="${esc(f[name])}" ${extra}>`;
  return {
    title: isNew ? 'Nuovo corso' : 'Modifica corso',
    actions: `<button class="btn text" data-act="saveCourse" data-id="${esc(r.id)}">Salva</button>`,
    body: `
      ${field('Nome del corso *', inp('name', 'text', 'autocomplete="off"'), e.name)}
      ${field('Disciplina * (scegli o scrivine una nuova)', inp('discipline', 'text', 'list="disciplines" autocomplete="off"') +
        `<datalist id="disciplines">${disciplines.map((d) => `<option value="${esc(d)}">`).join('')}</datalist>`, e.discipline)}
      ${locs.length ? '' : '<div class="err">Nessuna sede attiva: crea prima una sede dalla sezione Corsi/Sedi.</div>'}
      ${field('Sede *', `<select class="in ${e.locationId ? 'bad' : ''}" data-form="${key}" name="locationId">${opt('', 'Scegli la sede', f.locationId)}${locs.map((l) => opt(l.id, l.name, f.locationId)).join('')}</select>`, e.locationId)}
      ${field('Insegnante', inp('teacher', 'text', 'autocomplete="off"'))}
      ${field('Giorno della settimana', `<select class="in" data-form="${key}" name="dayOfWeek">${DAYS.map((d, i) => opt(i + 1, d, f.dayOfWeek)).join('')}</select>`)}
      <div class="grid2">${field('Inizio', inp('start', 'time', 'step="300"'))}${field('Fine', inp('end', 'time', 'step="300"'))}</div>
      ${e.time ? `<div class="err">${esc(e.time)}</div>` : ''}
      ${field('Livello', `<select class="in" data-form="${key}" name="level" data-rerender="1">${Object.keys(LEVELS).map((k) => opt(k, LEVELS[k], f.level)).join('')}</select>`)}
      ${f.level === 'PERSONALIZZATO' ? field('Livello personalizzato *', inp('customLevel', 'text', 'autocomplete="off"'), e.customLevel) : ''}
      ${field('Note', `<textarea class="in" data-form="${key}" name="notes">${esc(f.notes)}</textarea>`)}
      <button class="btn block" data-act="saveCourse" data-id="${esc(r.id)}">${isNew ? 'Crea corso' : 'Salva modifiche'}</button>`,
  };
};

/* ---------- Corso: scheda ---------- */
SCREENS.course = (r) => {
  const c = S.courses.get(r.id);
  if (!c) return { title: 'Corso', body: empty('Corso non trovato', 'Il corso richiesto non esiste.') };
  const students = studentsOfCourse(c.id);
  const lessons = all('lessons').filter((l) => l.courseId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  return {
    title: esc(c.name),
    actions: `<button class="icon-btn" data-act="nav" data-to="#/course-edit/${esc(c.id)}" aria-label="Modifica corso">${ICON.edit}</button>`,
    body: `
      <div class="card">
        <div class="card-h"><h2>Dettagli</h2>${c.archived ? '<span class="pill neu">Archiviato</span>' : ''}</div>
        <div class="info"><b>Sede</b><span>${esc(locName(c.locationId))}</span></div>
        <div class="info"><b>Disciplina</b><span>${esc(c.discipline)}</span></div>
        <div class="info"><b>Livello</b><span>${esc(levelLabel(c))}</span></div>
        <div class="info"><b>Quando</b><span>${esc(courseWhen(c))}</span></div>
        ${c.teacher ? `<div class="info"><b>Insegnante</b><span>${esc(c.teacher)}</span></div>` : ''}
        ${c.notes ? `<div class="info"><b>Note</b><span>${esc(c.notes)}</span></div>` : ''}
      </div>
      ${c.archived ? '' : `<div class="grid2">
        <button class="btn" data-act="lessonToday" data-id="${esc(c.id)}">Presenze di oggi</button>
        <button class="btn outline" data-act="lessonOtherDate" data-id="${esc(c.id)}">Altra data</button></div>`}
      <div class="sec-title"><span>Iscritti (${students.length})</span><button class="btn text" data-act="enrollStudentsDialog" data-id="${esc(c.id)}">+ Iscrivi allievi</button></div>
      ${students.length ? `<div class="list">${students.map((s) => `
        <div class="item" data-act="nav" data-to="#/student/${esc(s.id)}">${avatar(s)}
          <div class="t"><div class="n">${esc(sortName(s))}</div><div class="s">${esc(s.phone)}</div></div>
          <button class="btn text" data-act="unenroll" data-sid="${esc(s.id)}" data-cid="${esc(c.id)}">Rimuovi</button></div>`).join('')}</div>`
      : '<div class="muted">Nessun allievo iscritto.</div>'}
      <div class="sec-title"><span>Registro lezioni (${lessons.length})</span></div>
      ${lessons.length ? `<div class="list">${lessons.map((l) => {
        const n = lessonCounts(l);
        return `<div class="item" data-act="nav" data-to="#/lesson/${esc(l.id)}"><div class="t">
          <div class="n">${esc(dayAndDate(l.date))}</div>
          <div class="s">${l.cancelled ? 'Lezione annullata' : `Presenti ${n.present} · Assenti ${n.absent}`}</div></div></div>`;
      }).join('')}</div>` : '<div class="muted">Nessuna lezione registrata.</div>'}
      <div class="menu-row" style="margin-top:20px">
        ${c.archived ? `<button class="btn outline" data-act="courseArchive" data-id="${esc(c.id)}" data-v="0">Ripristina corso</button>`
        : `<button class="btn danger" data-act="courseArchive" data-id="${esc(c.id)}" data-v="1">Archivia corso</button>`}
      </div>`,
  };
};

/* ---------- Sede: scheda ---------- */
SCREENS.location = (r) => {
  const l = S.locations.get(r.id);
  if (!l) return { title: 'Sede', body: empty('Sede non trovata', 'La sede richiesta non esiste.') };
  const courses = sortedCourses().filter((c) => c.locationId === l.id);
  const students = studentsOfLocation(l.id);
  return {
    title: esc(l.name),
    actions: `<button class="icon-btn" data-act="locationDialog" data-id="${esc(l.id)}" aria-label="Modifica sede">${ICON.edit}</button>`,
    body: `
      <div class="card">
        <div class="card-h"><h2>Informazioni</h2></div>
        <div class="info"><b>Indirizzo</b><span>${esc(l.address || '—')}</span></div>
        ${l.notes ? `<div class="info"><b>Note</b><span>${esc(l.notes)}</span></div>` : ''}
        <div class="info"><b>Stato</b><span>${l.archived ? 'Archiviata' : 'Attiva'}</span></div>
        <div class="info"><b>Allievi iscritti</b><span>${students.length}</span></div>
      </div>
      <div class="grid2">
        <button class="btn tonal" data-act="nav" data-to="#/payments?loc=${esc(l.id)}">Pagamenti</button>
        <button class="btn tonal" data-act="nav" data-to="#/certificates?loc=${esc(l.id)}">Certificati</button>
      </div>
      <div class="sec-title"><span>Corsi (${courses.length})</span>${l.archived ? '' : `<button class="btn text" data-act="nav" data-to="#/course-edit/new?loc=${esc(l.id)}">+ Nuovo corso</button>`}</div>
      <div class="muted small" style="margin-bottom:6px">Apri un corso per registrare le presenze o consultarne il registro.</div>
      ${courses.length ? `<div class="list">${courses.map(courseItem).join('')}</div>` : '<div class="muted">Nessun corso in questa sede.</div>'}
      <div class="sec-title"><span>Allievi della sede (${students.length})</span></div>
      ${students.length ? `<div class="list">${students.map((s) => `<div class="item" data-act="nav" data-to="#/student/${esc(s.id)}">${avatar(s)}
        <div class="t"><div class="n">${esc(sortName(s))}</div><div class="s">${esc(s.phone)}</div></div></div>`).join('')}</div>`
      : '<div class="muted">Nessun allievo iscritto ai corsi di questa sede.</div>'}
      <div class="menu-row" style="margin-top:20px">
        ${l.archived ? `<button class="btn outline" data-act="locArchive" data-id="${esc(l.id)}" data-v="0">Ripristina sede</button>`
        : `<button class="btn danger" data-act="locArchive" data-id="${esc(l.id)}" data-v="1">Archivia sede</button>`}
      </div>`,
  };
};

/* ---------- Presenze: scelta della lezione ---------- */
SCREENS.attendance = () => {
  const a = UI.att;
  const locs = sortedLocations().filter((l) => !l.archived);
  const courses = all('courses').filter((c) => courseActive(c) && c.locationId === a.loc)
    .sort((x, y) => x.dayOfWeek - y.dayOfWeek || x.start.localeCompare(y.start));
  const t = todayISO();
  const today = all('courses').filter((c) => courseActive(c) && c.dayOfWeek === isoDow(t)).sort((x, y) => x.start.localeCompare(y.start));
  const sel = S.courses.get(a.course);
  return {
    title: 'Registro presenze',
    body: `
      ${today.length ? `<div class="card"><div class="card-h"><h2>Lezioni di oggi</h2></div>
        ${today.map((c) => `<button class="btn block" style="margin:6px 0;justify-content:space-between;text-align:left;min-height:58px" data-act="lessonToday" data-id="${esc(c.id)}">
          <span><b>${esc(c.name)}</b><br><span style="font-weight:400;font-size:13px">${esc(timeRange(c))} · ${esc(locName(c.locationId))}</span></span>${ICON.check}</button>`).join('')}</div>` : ''}
      <div class="card">
        <div class="card-h"><h2>Apri un registro</h2></div>
        ${field('1 · Sede', `<select class="in" data-change="attLoc">${opt('', 'Scegli la sede', a.loc)}${locs.map((l) => opt(l.id, l.name, a.loc)).join('')}</select>`)}
        ${field('2 · Corso', `<select class="in" data-change="attCourse" ${a.loc ? '' : 'disabled'}>${opt('', a.loc ? 'Scegli il corso' : 'Prima scegli la sede', a.course)}${courses.map((c) =>
          opt(c.id, `${c.name} · ${DAYS[c.dayOfWeek - 1]} ${c.start}`, a.course)).join('')}</select>`)}
        ${field('3 · Data della lezione', `<input class="in" type="date" data-change="attDate" value="${a.date}">`)}
        ${sel && sel.dayOfWeek !== isoDow(a.date) ? `<div class="muted small">Nota: il corso si svolge di ${DAYS[sel.dayOfWeek - 1].toLowerCase()}, ma hai scelto ${DAYS[isoDow(a.date) - 1].toLowerCase()} (es. recupero).</div>` : ''}
        <button class="btn block" style="margin-top:12px" data-act="openSelectedLesson" ${a.course ? '' : 'disabled'}>Apri registro</button>
      </div>
      ${locs.length ? '' : empty('Nessuna sede', 'Per registrare le presenze crea prima una sede e un corso nella sezione Corsi/Sedi.')}`,
  };
};

/* ---------- Presenze: registro della lezione ---------- */
SCREENS.lesson = (r) => {
  const l = S.lessons.get(r.id);
  const c = l && S.courses.get(l.courseId);
  if (!l || !c) return { title: 'Registro', body: empty('Lezione non trovata', 'La lezione richiesta non esiste.') };
  const rows = lessonRows(l);
  const cnt = { PRESENTE: 0, ASSENTE: 0, GIUSTIFICATO: 0, PROVA: 0, none: 0 };
  rows.forEach((s) => { cnt[attOf(l.id, s.id) || 'none']++; });
  return {
    title: `${esc(c.name)}<small>${esc(dayAndDate(l.date))} · ${esc(locName(c.locationId))}</small>`,
    actions: `<button class="icon-btn" data-act="lessonMenu" data-id="${esc(l.id)}" aria-label="Altre azioni">${ICON.dots}</button>`,
    body: `
      ${l.cancelled ? '<div class="banner">Lezione annullata: le presenze non sono modificabili. Ripristinala dal menu ⋮ se necessario.</div>' : ''}
      <div class="chips">
        ${pill('Presenti ' + cnt.PRESENTE, 'pos')}${pill('Assenti ' + cnt.ASSENTE, 'neg')}${pill('Giustificati ' + cnt.GIUSTIFICATO, 'warn')}
        ${pill('Prova ' + cnt.PROVA, 'inf')}${pill('Da segnare ' + cnt.none, 'neu')}
      </div>
      ${!l.cancelled && cnt.none ? `<button class="btn tonal block" data-act="markAllPresent" data-id="${esc(l.id)}">Segna presenti tutti i non segnati</button>` : ''}
      ${rows.length ? rows.map((s) => {
        const cur = attOf(l.id, s.id);
        return `<div class="att"><div class="nm" data-act="nav" data-to="#/student/${esc(s.id)}">${esc(sortName(s))}</div>
          <div class="ch">${Object.keys(ATT).map((k) => `<button class="${cur === k ? 'on ' + ATT[k][2] : ''}" data-act="att" data-lid="${esc(l.id)}" data-sid="${esc(s.id)}" data-v="${k}" ${l.cancelled ? 'disabled' : ''} aria-pressed="${cur === k}">${ATT[k][1]}</button>`).join('')}</div></div>`;
      }).join('') : empty('Nessun iscritto', 'Iscrivi gli allievi al corso dalla scheda del corso, poi torna qui.')}`,
  };
};

/* ---------- Pagamenti ---------- */
SCREENS.payments = (r) => {
  const p = UI.pay;
  if (r.q.has('loc')) { p.loc = r.q.get('loc'); p.course = ''; history.replaceState(null, '', '#/payments'); }
  if (r.q.has('f')) { p.status = r.q.get('f'); history.replaceState(null, '', '#/payments'); }
  const cur = curYM();
  const ym = p.month && ymCmp(p.month, cur) < 0 ? p.month : cur;
  const rows = paymentRows(ym, p.loc, p.course);
  const active = rows.filter((s) => s.status === 'ATTIVO');
  const paid = active.filter((s) => isPaid(s.id, ym)).length;
  const unpaid = active.length - paid;
  const pct = active.length ? Math.round((paid / active.length) * 100) : 0;
  const shown = rows.filter((s) => p.status === 'TUTTI' || (p.status === 'SI') === isPaid(s.id, ym));
  return {
    title: 'Pagamenti mensili',
    actions: ymEq(ym, cur) ? '' : '<button class="btn text" data-act="payMonth" data-d="now">Mese corrente</button>',
    body: `
      <div class="month">
        <button class="icon-btn" data-act="payMonth" data-d="-1" aria-label="Mese precedente">${ICON.left}</button>
        <b>${ymLabel(ym)}</b>
        <button class="icon-btn" data-act="payMonth" data-d="1" aria-label="Mese successivo" ${ymEq(ym, cur) ? 'disabled style="opacity:.3"' : ''}>${ICON.right}</button>
      </div>
      <div class="grid2">
        ${field('Sede', `<select class="in" data-change="payLoc">${locOptions(p.loc)}</select>`)}
        ${field('Corso', `<select class="in" data-change="payCourse">${courseOptions(p.course, p.loc)}</select>`)}
      </div>
      <div class="seg">${[['TUTTI', 'Tutti'], ['NO', 'Non pagati'], ['SI', 'Pagati']].map(([k, l]) =>
        `<button class="${p.status === k ? 'on' : ''}" data-act="payStatus" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="card" style="background:var(--surface-2)">
        <div class="row">${pill('Pagato ' + paid, 'pos')}${pill('Non pagato ' + unpaid, 'neg')}<div class="grow"></div><b style="font-size:22px">${pct}%</b></div>
        <div class="progress"><div style="width:${pct}%"></div></div>
      </div>
      ${shown.length ? `<div class="muted small" style="margin:4px">Tocca l'indicatore per cambiare lo stato</div>
        <div class="list">${shown.map((s) => `<div class="item" data-act="nav" data-to="#/student/${esc(s.id)}">${avatar(s)}
          <div class="t"><div class="n">${esc(sortName(s))}</div><div class="s">${esc(s.phone)}${s.status !== 'ATTIVO' ? ' · ' + ST[s.status][0].toLowerCase() : ''}</div></div>
          ${pill(isPaid(s.id, ym) ? '✓ Pagato' : '✕ Non pagato', isPaid(s.id, ym) ? 'pos' : 'neg', `data-act="toggleMonthPaid" data-id="${esc(s.id)}" data-y="${ym.y}" data-m="${ym.m}"`)}</div>`).join('')}</div>`
      : empty('Nessun allievo', p.status === 'NO' ? 'Tutti gli allievi selezionati risultano in regola per questo mese.'
        : p.status === 'SI' ? 'Nessun pagamento registrato per questo mese con i filtri attuali.' : 'Non ci sono allievi attivi per i filtri selezionati.')}`,
  };
};

/* ---------- Certificati ---------- */
SCREENS.certificates = (r) => {
  const f = UI.cert;
  if (r.q.has('loc')) { f.loc = r.q.get('loc'); f.course = ''; history.replaceState(null, '', '#/certificates'); }
  const base = activeStudents().filter((s) => (!f.course || inCourse(s.id, f.course)) && (!f.loc || inLocation(s.id, f.loc)));
  const rows = base.map((s) => ({ s, ci: certInfo(s.id) }));
  const counts = {};
  rows.forEach((x) => (counts[x.ci.status] = (counts[x.ci.status] || 0) + 1));
  const order = ['SCADUTO', 'IN_SCADENZA', 'NON_CONSEGNATO', 'VALIDO'];
  const shown = rows.filter((x) => !f.status || x.ci.status === f.status)
    .sort((a, b) => order.indexOf(a.ci.status) - order.indexOf(b.ci.status) || (a.ci.cert?.expiry || '9999').localeCompare(b.ci.cert?.expiry || '9999') || byName(a.s, b.s));
  return {
    title: 'Certificati medici',
    body: `
      <div class="grid2">
        ${field('Sede', `<select class="in" data-change="certLoc">${locOptions(f.loc)}</select>`)}
        ${field('Corso', `<select class="in" data-change="certCourse">${courseOptions(f.course, f.loc)}</select>`)}
      </div>
      <div class="chips">
        <button class="chip ${!f.status ? 'on' : ''}" data-act="certStatus" data-v="">Tutti (${rows.length})</button>
        ${['NON_CONSEGNATO', 'SCADUTO', 'IN_SCADENZA', 'VALIDO'].map((k) =>
          `<button class="chip ${f.status === k ? 'on' : ''}" data-act="certStatus" data-v="${k}">${CERT[k][0]} (${counts[k] || 0})</button>`).join('')}
      </div>
      ${shown.length ? `<div class="list">${shown.map(({ s, ci }) => `<div class="item" data-act="nav" data-to="#/student/${esc(s.id)}">${avatar(s)}
        <div class="t"><div class="n">${esc(sortName(s))}</div><div class="s ${ci.urgent ? 'err' : ''}" style="${ci.urgent ? 'font-weight:700' : ''}">${esc(certDetail(ci))}</div></div>
        ${certPill(ci.status)}</div>`).join('')}</div>`
      : empty('Nessun allievo', 'Nessun allievo attivo corrisponde ai filtri selezionati.')}`,
  };
};

/* ---------- Impostazioni ---------- */
SCREENS.settings = () => {
  const w = warnings();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return {
    title: 'Impostazioni',
    body: `
      <div class="card">
        <div class="card-h"><h2>Scadenza certificati medici</h2></div>
        <div class="muted small">Un certificato risulta "In scadenza" quando mancano meno giorni del primo preavviso; sotto il secondo preavviso viene evidenziato come urgente.</div>
        <div class="grid2">
          ${field('Primo preavviso (giorni)', `<input class="in" id="wP" type="number" inputmode="numeric" min="1" max="365" value="${w.p}">`)}
          ${field('Urgente (giorni)', `<input class="in" id="wU" type="number" inputmode="numeric" min="1" max="365" value="${w.u}">`)}
        </div>
        <button class="btn" data-act="saveWarnings">Salva</button>
      </div>
      <div class="card">
        <div class="card-h"><h2>Backup dei dati</h2></div>
        <div class="muted small">I dati sono salvati solo su questo telefono. Fai un backup ogni tanto e conservalo in un posto sicuro (ad esempio "File" o il tuo cloud): contiene dati personali degli allievi.</div>
        <div class="grid2" style="margin-top:12px">
          <button class="btn tonal" data-act="exportBackup">Crea backup</button>
          <button class="btn outline" data-act="importBackup">Ripristina</button>
        </div>
        <input type="file" id="importFile" accept="application/json,.json" style="display:none">
        <div class="muted small" style="margin-top:8px">Ultimo backup: ${getSetting('lastBackup', null) ? fmtDate(getSetting('lastBackup')) : 'mai'}</div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Installazione</h2></div>
        ${standalone ? '<div>✓ App installata sulla schermata Home.</div>'
        : `<div class="small">Su <b>iPhone</b>: apri questa pagina con <b>Safari</b>, tocca il pulsante <b>Condividi</b> (il quadrato con la freccia) e scegli <b>Aggiungi alla schermata Home</b>.<br><br>
           Su <b>Android</b>: menu ⋮ di Chrome → <b>Aggiungi a schermata Home</b> / <b>Installa app</b>.</div>`}
        <div class="muted small" style="margin-top:8px" id="persistInfo"></div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Privacy e dati</h2></div>
        <div class="small">• Tutti i dati restano solo su questo dispositivo, nella memoria dell'app.<br>
        • L'app non invia dati a nessun server, non ha pubblicità né tracciamento.<br>
        • Per i certificati medici si registrano solo consegna e scadenza, mai diagnosi o patologie.<br>
        • Gli allievi archiviati non vengono cancellati: lo storico resta consultabile.</div>
        <div class="err" style="margin-top:8px">Importante: se elimini l'app dalla Home o cancelli i dati del browser per questo sito, i dati vengono persi. Usa il backup.</div>
      </div>
      <div class="card"><div class="info"><b>Applicazione</b><span>Scuola di Ballo · web app</span></div><div class="info"><b>Versione</b><span>1.0.0</span></div></div>`,
    after: async () => {
      const el = $('#persistInfo');
      if (el && navigator.storage && navigator.storage.persisted) {
        const p = await navigator.storage.persisted();
        el.textContent = p ? 'Memoria protetta: il sistema non cancellerà i dati automaticamente.' : 'Memoria standard (il sistema può liberarla in caso di spazio esaurito): fai backup regolari.';
      }
    },
  };
};

/* ========================= Azioni ========================= */
const A = {};
A.back = () => back();
A.nav = (d) => go(d.to);
A.tab = (d) => go('#/' + d.to);
A.clTab = (d) => { UI.cl.tab = d.tab; go('#/courses'); };
A.clTabSwitch = (d) => { UI.cl.tab = d.tab; render(); };
A.clArchived = () => { UI.cl.archived = !UI.cl.archived; render(); };
A.unpaid = () => { UI.pay.status = 'NO'; UI.pay.month = null; UI.pay.loc = ''; UI.pay.course = ''; go('#/payments'); };
A.modalBtn = (d) => { const fn = modalActions[d.i]; if (fn) fn(); };

A.togglePaid = (d) => { const ym = curYM(); setPaid(d.id, ym, !isPaid(d.id, ym)); render(); };
A.toggleMonthPaid = (d) => { const ym = { y: +d.y, m: +d.m }; setPaid(d.id, ym, !isPaid(d.id, ym)); render(); };

A.toggleStuFilters = () => { UI.stu.filters = !UI.stu.filters; render(); };
A.stuPay = (d) => { UI.stu.pay = d.v; render(); };

A.saveStudent = (d) => {
  const key = 'stu-' + d.id;
  const f = UI.forms[key];
  if (!f) return;
  const v = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: f.phone.trim(), email: f.email.trim() };
  const e = {};
  if (!v.firstName) e.firstName = 'Inserisci il nome';
  if (!v.lastName) e.lastName = 'Inserisci il cognome';
  if (!v.phone) e.phone = 'Inserisci il numero di telefono';
  else if (!/^\+?[0-9][0-9 ./-]{4,}$/.test(v.phone)) e.phone = 'Numero non valido (solo cifre, spazi e +)';
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Indirizzo email non valido';
  if (f.birthDate && f.birthDate > todayISO()) e.birthDate = 'La data di nascita non può essere futura';
  if (!f.enrollmentDate) e.enrollmentDate = 'Indica la data di iscrizione';
  f.errors = e;
  if (Object.keys(e).length) { render(); toast('Controlla i campi evidenziati'); return; }
  const isNew = d.id === 'new';
  const orig = isNew ? null : S.students.get(d.id);
  const doSave = () => {
    const s = put('students', {
      ...(orig || { id: uid(), createdAt: Date.now() }),
      firstName: v.firstName, lastName: v.lastName, phone: v.phone, email: v.email || null,
      birthDate: f.birthDate || null, enrollmentDate: f.enrollmentDate, status: isNew ? 'ATTIVO' : f.status,
      notes: f.notes.trim() || null, updatedAt: Date.now(),
    });
    delete UI.forms[key];
    toast(isNew ? 'Allievo creato' : 'Modifiche salvate');
    if (isNew) location.replace('#/student/' + s.id); else back();
  };
  const norm = (p) => p.replace(/[^\d+]/g, '');
  const changed = !orig || orig.firstName.toLowerCase() !== v.firstName.toLowerCase() || orig.lastName.toLowerCase() !== v.lastName.toLowerCase() || norm(orig.phone) !== norm(v.phone);
  const dups = changed ? all('students').filter((s) => s.id !== orig?.id &&
    ((s.firstName.trim().toLowerCase() === v.firstName.toLowerCase() && s.lastName.trim().toLowerCase() === v.lastName.toLowerCase()) || norm(s.phone) === norm(v.phone))) : [];
  if (dups.length) {
    modal('Possibile duplicato', `<p>Esistono già allievi con lo stesso nome o lo stesso telefono:</p>
      <ul>${dups.slice(0, 5).map((s) => `<li>${esc(fullName(s))} · ${esc(s.phone)} (${ST[s.status][0]})</li>`).join('')}</ul>
      <p class="muted small">Se è la stessa persona, aprila dall'elenco e iscrivila agli altri corsi invece di creare una nuova scheda.</p>`,
    [{ label: 'Rivedi', fn: closeModal }, { label: 'Salva comunque', cls: '', fn: () => { closeModal(); doSave(); } }]);
  } else doSave();
};

A.setStatus = (d) => { const s = S.students.get(d.id); put('students', { ...s, status: d.v, updatedAt: Date.now() }); toast('Stato aggiornato: ' + ST[d.v][0]); render(); };
A.archiveStudent = (d) => confirmBox("Archiviare l'allievo?", 'Non sarà più conteggiato tra gli attivi. Storico di presenze e pagamenti resta consultabile e potrai riattivarlo in qualsiasi momento.', 'Archivia',
  () => { const s = S.students.get(d.id); put('students', { ...s, status: 'ARCHIVIATO', updatedAt: Date.now() }); render(); });

A.certDialog = (d) => {
  const c = S.certificates.get(d.id);
  const delivered = c ? c.delivered : true;
  modal('Certificato medico', `
    <label class="switch"><span>Certificato consegnato</span><input type="checkbox" id="cD" ${delivered ? 'checked' : ''}></label>
    <div id="cDates">
      ${field('Data di consegna', `<input class="in" type="date" id="cDel" value="${c?.deliveryDate || todayISO()}">`)}
      ${field('Data di scadenza', `<input class="in" type="date" id="cExp" value="${c?.expiry || ''}">`)}
    </div>
    ${field('Note amministrative', `<textarea class="in" id="cNotes">${esc(c?.notes || '')}</textarea>`)}
    <div class="muted small">Non inserire diagnosi, patologie o altri dati sanitari: servono solo consegna e scadenza.</div>
    <div class="err" id="cErr"></div>`,
  [{ label: 'Annulla', fn: closeModal }, {
    label: 'Salva', cls: '', fn: () => {
      const del = $('#cD').checked, dd = $('#cDel').value, ex = $('#cExp').value;
      if (del && dd && ex && ex < dd) { $('#cErr').textContent = 'La scadenza precede la consegna'; return; }
      put('certificates', { studentId: d.id, delivered: del, deliveryDate: del ? dd || null : null, expiry: del ? ex || null : null, notes: $('#cNotes').value.trim() || null });
      closeModal(); toast('Certificato aggiornato'); render();
    },
  }]);
  const sync = () => { $('#cDates').style.display = $('#cD').checked ? '' : 'none'; };
  $('#cD').addEventListener('change', sync); sync();
};

function checkList(items, renderItem) {
  return `<div id="ckList">${items.map((x) => `<label class="check" data-name="${esc(x.search)}"><input type="checkbox" value="${esc(x.id)}">${renderItem(x)}</label>`).join('')}</div>`;
}
A.enrollCoursesDialog = (d) => {
  const avail = sortedCourses().filter((c) => courseActive(c) && !inCourse(d.id, c.id));
  if (!avail.length) { modal('Iscrivi ai corsi', '<p>Non ci sono altri corsi attivi disponibili. Crea un corso dalla sezione Corsi/Sedi.</p>', [{ label: 'Chiudi', fn: closeModal }]); return; }
  modal('Iscrivi ai corsi', checkList(avail.map((c) => ({ ...c, search: c.name })), (c) =>
    `<div><div>${esc(c.name)}</div><div class="muted small">${esc(locName(c.locationId))} · ${esc(courseWhen(c))}</div></div>`),
  [{ label: 'Annulla', fn: closeModal }, {
    label: 'Iscrivi', cls: '', fn: () => {
      const ids = [...document.querySelectorAll('#ckList input:checked')].map((i) => i.value);
      if (!ids.length) { toast('Seleziona almeno un corso'); return; }
      ids.forEach((cid) => enroll(d.id, cid)); closeModal(); toast('Iscrizione salvata'); render();
    },
  }]);
};
A.enrollStudentsDialog = (d) => {
  const cand = activeStudents().filter((s) => !inCourse(s.id, d.id)).sort(byName);
  if (!cand.length) { modal('Iscrivi allievi', '<p>Tutti gli allievi attivi sono già iscritti, oppure non ne hai ancora inseriti.</p>', [{ label: 'Chiudi', fn: closeModal }]); return; }
  modal('Iscrivi allievi', `<div class="search">${ICON.search}<input class="in" id="ckQ" type="search" placeholder="Cerca" autocomplete="off"></div>` +
    checkList(cand.map((s) => ({ ...s, search: `${s.firstName} ${s.lastName} ${s.lastName} ${s.firstName} ${s.phone}`.toLowerCase() })), (s) =>
      `<div><div>${esc(sortName(s))}</div><div class="muted small">${esc(s.phone)}</div></div>`),
  [{ label: 'Annulla', fn: closeModal }, {
    label: 'Iscrivi', cls: '', fn: () => {
      const ids = [...document.querySelectorAll('#ckList input:checked')].map((i) => i.value);
      if (!ids.length) { toast('Seleziona almeno un allievo'); return; }
      ids.forEach((sid) => enroll(sid, d.id)); closeModal(); toast(`${ids.length} allievi iscritti`); render();
    },
  }]);
  $('#ckQ').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#ckList .check').forEach((el) => { el.style.display = !q || el.dataset.name.includes(q) ? '' : 'none'; });
  });
};
A.unenroll = (d) => {
  const s = S.students.get(d.sid), c = S.courses.get(d.cid);
  confirmBox('Rimuovere dal corso?', `${fullName(s)} verrà tolto da "${c.name}". Le presenze già registrate restano nello storico.`, 'Rimuovi',
    () => { unenroll(d.sid, d.cid); render(); });
};

A.newCourse = () => {
  if (!all('locations').some((l) => !l.archived)) { UI.cl.tab = 'sedi'; render(); toast('Crea prima almeno una sede'); return; }
  go('#/course-edit/new');
};
A.saveCourse = (d) => {
  const key = 'course-' + d.id;
  const f = UI.forms[key];
  if (!f) return;
  const e = {};
  if (!f.name.trim()) e.name = 'Inserisci il nome del corso';
  if (!f.discipline.trim()) e.discipline = 'Indica la disciplina';
  if (!f.locationId || !S.locations.get(f.locationId)) e.locationId = 'Scegli la sede';
  if (!f.start || !f.end || f.end <= f.start) e.time = "L'orario di fine deve essere successivo all'inizio";
  if (f.level === 'PERSONALIZZATO' && !f.customLevel.trim()) e.customLevel = 'Descrivi il livello';
  f.errors = e;
  if (Object.keys(e).length) { render(); toast('Controlla i campi evidenziati'); return; }
  const isNew = d.id === 'new';
  const orig = isNew ? { id: uid(), archived: false } : S.courses.get(d.id);
  const c = put('courses', {
    ...orig, name: f.name.trim(), discipline: f.discipline.trim(), locationId: f.locationId, teacher: f.teacher.trim() || null,
    dayOfWeek: +f.dayOfWeek, start: f.start, end: f.end, level: f.level,
    customLevel: f.level === 'PERSONALIZZATO' ? f.customLevel.trim() : null, notes: f.notes.trim() || null,
  });
  delete UI.forms[key];
  toast(isNew ? 'Corso creato' : 'Modifiche salvate');
  if (isNew) location.replace('#/course/' + c.id); else back();
};
A.courseArchive = (d) => {
  const c = S.courses.get(d.id);
  if (d.v === '1') {
    confirmBox('Archiviare il corso?', 'Il corso non comparirà tra quelli attivi. Iscrizioni, lezioni e presenze restano consultabili e potrai ripristinarlo.', 'Archivia',
      () => { put('courses', { ...c, archived: true }); render(); });
  } else { put('courses', { ...c, archived: false }); render(); }
};

A.locationDialog = (d) => {
  const l = d.id ? S.locations.get(d.id) : null;
  modal(l ? 'Modifica sede' : 'Nuova sede', `
    ${field('Nome della sede *', `<input class="in" id="lN" value="${esc(l?.name || '')}" autocomplete="off">`)}<div class="err" id="lErr"></div>
    ${field('Indirizzo (facoltativo)', `<input class="in" id="lA" value="${esc(l?.address || '')}" autocomplete="off">`)}
    ${field('Note (facoltative)', `<textarea class="in" id="lNo">${esc(l?.notes || '')}</textarea>`)}`,
  [{ label: 'Annulla', fn: closeModal }, {
    label: 'Salva', cls: '', fn: () => {
      const name = $('#lN').value.trim();
      if (!name) { $('#lErr').textContent = 'Il nome è obbligatorio'; return; }
      put('locations', { ...(l || { id: uid(), archived: false }), name, address: $('#lA').value.trim() || null, notes: $('#lNo').value.trim() || null });
      closeModal(); toast(l ? 'Sede aggiornata' : 'Sede creata'); render();
    },
  }]);
};
A.locArchive = (d) => {
  const l = S.locations.get(d.id);
  if (d.v === '1') {
    confirmBox('Archiviare la sede?', 'La sede non comparirà più tra quelle attive. Corsi, presenze e storico restano consultabili e potrai ripristinarla.', 'Archivia',
      () => { put('locations', { ...l, archived: true }); render(); });
  } else { put('locations', { ...l, archived: false }); render(); }
};

A.lessonToday = (d) => openLesson(d.id, todayISO());
A.lessonOtherDate = (d) => {
  modal('Data della lezione', field('Data', `<input class="in" type="date" id="lDate" value="${todayISO()}">`),
    [{ label: 'Annulla', fn: closeModal }, { label: 'Apri registro', cls: '', fn: () => { const v = $('#lDate').value; if (!v) return; closeModal(); openLesson(d.id, v); } }]);
};
A.openSelectedLesson = () => { if (UI.att.course && UI.att.date) openLesson(UI.att.course, UI.att.date); };
A.att = (d) => {
  const k = d.lid + '|' + d.sid;
  const cur = S.attendance.get(k)?.status;
  if (cur === d.v) { S.attendance.delete(k); write('attendance', (os) => os.delete(k)); } // secondo tocco: annulla
  else put('attendance', { lessonId: d.lid, studentId: d.sid, status: d.v, updatedAt: Date.now() });
  render();
};
A.markAllPresent = (d) => {
  const l = S.lessons.get(d.id);
  lessonRows(l).filter((s) => !attOf(l.id, s.id)).forEach((s) => put('attendance', { lessonId: l.id, studentId: s.id, status: 'PRESENTE', updatedAt: Date.now() }));
  render();
};
A.lessonMenu = (d) => {
  const l = S.lessons.get(d.id);
  modal('Lezione', `<div class="muted">${esc(dayAndDate(l.date))}</div>`, [
    { label: 'Chiudi', fn: closeModal },
    { label: 'Modifica data', cls: 'outline', fn: () => {
      modal('Modifica data', field('Nuova data', `<input class="in" type="date" id="nDate" value="${l.date}">`) + '<div class="err" id="nErr"></div>', [
        { label: 'Annulla', fn: closeModal },
        { label: 'Salva', cls: '', fn: () => {
          const v = $('#nDate').value;
          if (!v) return;
          const clash = findLesson(l.courseId, v);
          if (clash && clash.id !== l.id) { $('#nErr').textContent = 'Esiste già una lezione di questo corso in quella data'; return; }
          put('lessons', { ...l, date: v }); closeModal(); toast('Data della lezione aggiornata'); render();
        } }]);
    } },
    l.cancelled
      ? { label: 'Ripristina lezione', cls: '', fn: () => { put('lessons', { ...l, cancelled: false }); closeModal(); render(); } }
      : { label: 'Annulla lezione', cls: 'danger', fn: () => {
        confirmBox('Annullare la lezione?', 'La lezione resterà nel registro come annullata e non verrà conteggiata tra quelle frequentate.', 'Annulla lezione',
          () => { put('lessons', { ...l, cancelled: true }); render(); });
      } },
  ]);
};

A.payMonth = (d) => {
  const cur = curYM();
  const base = UI.pay.month || cur;
  if (d.d === 'now') UI.pay.month = null;
  else { const n = ymAdd(base, +d.d); UI.pay.month = ymCmp(n, cur) >= 0 ? null : n; }
  render();
};
A.payStatus = (d) => { UI.pay.status = d.v; render(); };
A.certStatus = (d) => { UI.cert.status = d.v; render(); };

A.saveWarnings = () => {
  const p = parseInt($('#wP').value, 10), u = parseInt($('#wU').value, 10);
  if (!(p >= 1 && p <= 365 && u >= 1 && u <= 365 && u <= p)) { toast('Valori tra 1 e 365; il preavviso urgente non può superare il primo'); return; }
  setSetting('warnPrimary', p); setSetting('warnUrgent', u); toast('Impostazioni salvate'); render();
};

A.exportBackup = async () => {
  const data = {};
  STORES.forEach((s) => (data[s] = all(s).map(({ _k, ...rest }) => rest)));
  const json = JSON.stringify({ app: 'scuola-ballo', version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
  const name = `scuola-ballo-backup-${todayISO()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  setSetting('lastBackup', todayISO());
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Scuola di Ballo' });
      toast('Backup creato'); render(); return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup scaricato: ' + name); render();
};
A.importBackup = () => {
  const input = $('#importFile');
  input.value = '';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    let parsed;
    try { parsed = JSON.parse(await f.text()); } catch { toast('File non valido'); return; }
    if (!parsed || parsed.app !== 'scuola-ballo' || !parsed.data) { toast('Questo file non è un backup di Scuola di Ballo'); return; }
    const n = (parsed.data.students || []).length;
    confirmBox('Ripristinare il backup?', `Il backup del ${fmtDate((parsed.exportedAt || '').slice(0, 10))} contiene ${n} allievi. Tutti i dati attuali su questo telefono verranno SOSTITUITI.`, 'Ripristina', async () => {
      await new Promise((res, rej) => {
        const tx = db.transaction(STORES, 'readwrite');
        STORES.forEach((s) => {
          const os = tx.objectStore(s);
          os.clear();
          (parsed.data[s] || []).forEach((o) => { const r = { ...o }; r._k = KEY[s](r); os.put(r); });
        });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      }).then(async () => { await loadAll(); toast('Backup ripristinato'); go('#/home'); })
        .catch((e) => toast('Ripristino non riuscito: ' + (e && e.message)));
    });
  };
  input.click();
};

/* ========================= Eventi ========================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.tagName === 'A') return;
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

// Campi dei moduli: aggiornano lo stato senza ridisegnare (il cursore resta dove è)
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'stuQ') { UI.stu.q = t.value; const l = $('#list'); if (l) l.innerHTML = studentListHtml(); return; }
  if (t.dataset.form) {
    const f = UI.forms[t.dataset.form];
    if (f) { f[t.name] = t.value; if (f.errors[t.name]) { delete f.errors[t.name]; t.classList.remove('bad'); } }
  }
});
const CHANGE = {
  stuStatus: (v) => { UI.stu.status = v; },
  stuLoc: (v) => { UI.stu.loc = v; UI.stu.course = ''; },
  stuCourse: (v) => { UI.stu.course = v; },
  attLoc: (v) => { UI.att.loc = v; UI.att.course = ''; },
  attCourse: (v) => { UI.att.course = v; },
  attDate: (v) => { if (v) UI.att.date = v; },
  payLoc: (v) => { UI.pay.loc = v; UI.pay.course = ''; },
  payCourse: (v) => { UI.pay.course = v; },
  certLoc: (v) => { UI.cert.loc = v; UI.cert.course = ''; },
  certCourse: (v) => { UI.cert.course = v; },
  perFrom: (v, d) => { if (v) UI.period[d.id].from = v; },
  perTo: (v, d) => { if (v) UI.period[d.id].to = v; },
};
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.change && CHANGE[t.dataset.change]) { CHANGE[t.dataset.change](t.value, t.dataset); render(); return; }
  if (t.dataset.form) {
    const f = UI.forms[t.dataset.form];
    if (f) { f[t.name] = t.value; if (t.dataset.rerender) render(); }
  }
});
window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });

// Cambio giorno/mese mentre l'app è aperta: le schermate si aggiornano da sole
let lastDay = todayISO();
function checkDayChange() { if (todayISO() !== lastDay) { lastDay = todayISO(); UI.att.date = lastDay; render(); } }
setInterval(checkDayChange, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayChange(); });

/* ========================= Avvio ========================= */
(async function start() {
  try {
    db = await openDB();
    await loadAll();
  } catch (e) {
    $('#app').innerHTML = empty('Impossibile aprire i dati', "Il browser non permette di salvare dati (es. navigazione privata). Apri l'app normalmente da Safari o Chrome.");
    return;
  }
  if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch { /* facoltativo */ } }
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
