'use strict';
/*
  TRANSFER APP - programu ya kubadilishana vituo vya kazi (Tanzania)
  Inaendeshwa na Node.js tu, bila kusakinisha vifurushi vyovyote.
  Endesha:  node transfer-app.js
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(__dirname, 'transfer-data.json');
const FEES = { register: 1000, unlock: 1000 };   // TZS: usajili, na kufungua mawasiliano ya kila mtu
const PAGE_SIZE = 6;

const NETWORKS = {
  airtel:  { id: 'airtel',  name: 'Airtel Money',       number: '0689675751' },
  vodacom: { id: 'vodacom', name: 'M-Pesa (Vodacom)',   number: '0754887237' },
  halotel: { id: 'halotel', name: 'HaloPesa (Halotel)', number: '0616937237' }
};
const SUPPORT = { email: 'mofayatheone@gmail.com', whatsapp: '255754887237' };

const DISTRICTS = {
  'Arusha': ['Arusha Jiji', 'Arusha DC', 'Meru', 'Monduli', 'Karatu', 'Longido', 'Ngorongoro'],
  'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
  'Dodoma': ['Dodoma Jiji', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
  'Geita': ['Geita', 'Bukombe', 'Chato', 'Mbogwe', "Nyang'hwale"],
  'Iringa': ['Iringa MC', 'Iringa DC', 'Kilolo', 'Mafinga', 'Mufindi'],
  'Kagera': ['Bukoba MC', 'Bukoba DC', 'Biharamulo', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
  'Katavi': ['Mpanda', 'Mlele', 'Mpimbwe', 'Nsimbo', 'Tanganyika'],
  'Kigoma': ['Kigoma Ujiji', 'Kigoma DC', 'Buhigwe', 'Kakonko', 'Kasulu TC', 'Kasulu DC', 'Kibondo', 'Uvinza'],
  'Kilimanjaro': ['Moshi MC', 'Moshi DC', 'Hai', 'Mwanga', 'Rombo', 'Same', 'Siha'],
  'Lindi': ['Lindi MC', 'Lindi DC', 'Kilwa', 'Liwale', 'Nachingwea', 'Ruangwa'],
  'Manyara': ['Babati TC', 'Babati DC', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro'],
  'Mara': ['Musoma MC', 'Musoma DC', 'Bunda', 'Butiama', 'Rorya', 'Serengeti', 'Tarime'],
  'Mbeya': ['Mbeya CC', 'Mbeya DC', 'Chunya', 'Kyela', 'Mbarali', 'Rungwe'],
  'Morogoro': ['Morogoro MC', 'Morogoro DC', 'Gairo', 'Kilombero', 'Kilosa', 'Malinyi', 'Mvomero', 'Ulanga'],
  'Mtwara': ['Mtwara MC', 'Mtwara DC', 'Masasi', 'Nanyumbu', 'Newala', 'Tandahimba'],
  'Mwanza': ['Nyamagana', 'Ilemela', 'Kwimba', 'Magu', 'Misungwi', 'Sengerema', 'Ukerewe'],
  'Njombe': ['Njombe TC', 'Njombe DC', 'Ludewa', 'Makambako', 'Makete', "Wanging'ombe"],
  'Pemba Kaskazini': ['Micheweni', 'Wete'],
  'Pemba Kusini': ['Chake Chake', 'Mkoani'],
  'Pwani': ['Kibaha', 'Bagamoyo', 'Chalinze', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji', 'Kibiti'],
  'Rukwa': ['Sumbawanga MC', 'Sumbawanga DC', 'Kalambo', 'Nkasi'],
  'Ruvuma': ['Songea MC', 'Songea DC', 'Mbinga', 'Namtumbo', 'Nyasa', 'Tunduru'],
  'Shinyanga': ['Shinyanga MC', 'Shinyanga DC', 'Kahama', 'Kishapu', 'Msalala', 'Ushetu'],
  'Simiyu': ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
  'Singida': ['Singida MC', 'Singida DC', 'Ikungi', 'Iramba', 'Manyoni', 'Mkalama'],
  'Songwe': ['Mbozi', 'Ileje', 'Momba', 'Songwe', 'Tunduma'],
  'Tabora': ['Tabora MC', 'Igunga', 'Kaliua', 'Nzega', 'Sikonge', 'Urambo', 'Uyui'],
  'Tanga': ['Tanga CC', 'Handeni', 'Kilindi', 'Korogwe', 'Lushoto', 'Mkinga', 'Muheza', 'Pangani', 'Bumbuli'],
  'Unguja Kaskazini': ['Kaskazini A', 'Kaskazini B'],
  'Unguja Kusini': ['Kati', 'Kusini'],
  'Unguja Mjini Magharibi': ['Magharibi A', 'Magharibi B', 'Mjini']
};
const REGIONS = Object.keys(DISTRICTS);
const GENDERS = ['Mwanamke', 'Mwanaume'];

const SUBJ_PRIMARY = ['Masomo yote (Darasa la I-VII)', 'Kiswahili', 'English', 'Hisabati', 'Sayansi na Teknolojia',
  'Maarifa ya Jamii', 'Uraia na Maadili', 'Haiba na Michezo', 'Stadi za Kazi', 'TEHAMA', 'Elimu ya Awali'];
const SUBJ_SEC = ['Hisabati', 'Fizikia', 'Kemia', 'Baiolojia', 'English', 'Kiswahili', 'Historia', 'Jiografia',
  'Uraia (Civics)', 'Commerce', 'Book-keeping', 'Accounts', 'Economics', 'Kilimo', 'Computer Science / TEHAMA',
  'Kifaransa', 'Kiarabu', 'Divinity (Bible Knowledge)', 'Islamic Knowledge', 'Fine Art', 'Muziki',
  'Elimu ya Viungo (Physical Education)', 'Lishe na Mapishi', 'Useremala / Ufundi', 'Masomo mengine'];

const CADRES = [
  { id: 'afya', name: 'Afya', subs: ['Assistant Nursing Officer (ANO)', 'Nursing Officer (NO)', 'Enrolled Nurse (EN)',
      'Nurse Midwife (NM)', 'Medical Doctor (MD)', 'Assistant Medical Officer (AMO)', 'Clinical Officer (CO)',
      'Medical Attendant (MA)', 'Lab Technologist (LT)', 'Lab Assistant', 'Pharmacist', 'Pharmaceutical Technician',
      'Radiographer', 'Physiotherapist', 'Dental Therapist', 'Nutritionist', 'Environmental Health Officer',
      'Community Health Worker', 'Nyingine'] },
  { id: 'msingi', name: 'Ualimu - Shule ya Msingi', subs: ['Mwalimu wa Msingi', 'Mwalimu wa Elimu ya Awali'],
      subjects: SUBJ_PRIMARY },
  { id: 'sekondari', name: 'Ualimu - Sekondari', subs: ['Stashahada (Diploma)', 'Shahada (Degree)'],
      subjects: SUBJ_SEC },
  { id: 'elimu-nyingine', name: 'Elimu - Vyuo na Utawala', subs: ['Mkufunzi wa Chuo', 'Elimu Maalum',
      'Mthibiti Ubora wa Shule', 'Mwalimu Mkuu / Makamu', 'Nyingine'] },
  { id: 'uhandisi', name: 'Uhandisi', subs: ['Electrical (Umeme)', 'Civil (Ujenzi)', 'Mechanical (Mitambo)',
      'Maji', 'Mawasiliano (Telecom)', 'Fundi Sanifu', 'Nyingine'] },
  { id: 'tehama', name: 'TEHAMA', subs: ['Afisa TEHAMA', 'Programmer / Developer', 'Network / Mifumo', 'Nyingine'] },
  { id: 'kilimo', name: 'Kilimo, Mifugo na Uvuvi', subs: ['Afisa Kilimo', 'Afisa Mifugo', 'Afisa Uvuvi',
      'Afisa Misitu / Nyuki', 'Nyingine'] },
  { id: 'sheria', name: 'Sheria na Mahakama', subs: ['Hakimu', 'Mwanasheria', 'Karani wa Mahakama', 'Nyingine'] },
  { id: 'fedha', name: 'Fedha na Utawala', subs: ['Mhasibu', 'Mkaguzi', 'Afisa Utumishi', 'Afisa Ugavi',
      'Katibu Mahsusi', 'Mweka Hazina', 'Afisa Mipango', 'Nyingine'] },
  { id: 'usalama', name: 'Polisi na Usalama', subs: ['Polisi', 'Magereza', 'Zimamoto na Uokoaji', 'Uhamiaji',
      'Wanyamapori', 'Nyingine'] },
  { id: 'ardhi', name: 'Ardhi na Ujenzi', subs: ['Mpima Ardhi', 'Afisa Ardhi', 'Mipangomiji', 'Mthamini',
      'Msanifu Majengo', 'Nyingine'] },
  { id: 'jamii', name: 'Maendeleo ya Jamii', subs: ['Afisa Maendeleo ya Jamii', 'Afisa Ustawi wa Jamii',
      'Mtendaji wa Kata / Kijiji', 'Nyingine'] },
  { id: 'benki', name: 'Benki, Bima na Mapato', subs: ['Benki', 'Bima', 'TRA / Mapato', 'NSSF / Mifuko', 'Nyingine'] },
  { id: 'ufundi', name: 'Madereva na Mafundi', subs: ['Dereva', 'Fundi Magari', 'Fundi Umeme', 'Mhudumu wa Ofisi',
      'Nyingine'] },
  { id: 'nyingine', name: 'Kada Nyingine', subs: [] }
];

/* ---------- Hifadhi ya taarifa (faili la JSON) ---------- */
let db = { listings: [], payments: [], feedback: [], adminPassword: null };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* mara ya kwanza */ }
db.listings = db.listings || [];
db.payments = db.payments || [];
db.feedback = db.feedback || [];
if (!db.adminPassword) db.adminPassword = crypto.randomBytes(5).toString('hex');
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}
save();
function adminPassword() { return process.env.ADMIN_PASSWORD || db.adminPassword; }

/* ---------- Zana ndogo ---------- */
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newId = () => crypto.randomBytes(6).toString('hex');
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max); }
function normPhone(p) {
  let d = String(p || '').replace(/[^\d]/g, '');
  if (d.startsWith('255') && d.length === 12) d = '0' + d.slice(3);
  return /^0[67]\d{8}$/.test(d) ? d : null;
}
function hashPin(pin, salt) { return crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const cadreById = (id) => CADRES.find((c) => c.id === id);
const mkey = (l) => [l.cadre, norm(l.specialty), norm(l.subject || '')].join('|');
const isActive = (l) => l.active !== false;   // maombi ya zamani (bila alama) yanahesabiwa kuwa yamelipiwa

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 20000) { reject(new Error('Ujumbe ni mkubwa sana')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('Data si sahihi')); } });
    req.on('error', reject);
  });
}
function authListing(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const h = sha(m[1]);
  return db.listings.find((l) => (l.tokens || []).includes(h)) || null;
}
function isAdmin(req) {
  const p = req.headers['x-admin-password'];
  return !!p && safeEq(p, adminPassword());
}
function issueToken(l) {
  const t = crypto.randomBytes(24).toString('hex');
  l.tokens = (l.tokens || []).concat(sha(t)).slice(-5);
  return t;
}
function selfView(l) {
  return { id: l.id, fullName: l.fullName, cadre: l.cadre, cadreName: cadreById(l.cadre).name,
    specialty: l.specialty, subject: l.subject, fromRegion: l.fromRegion, fromDistrict: l.fromDistrict || '',
    toRegion: l.toRegion, toDistrict: l.toDistrict || '', years: l.years == null ? null : l.years,
    gender: l.gender, phone: l.phone, active: isActive(l), createdAt: l.createdAt };
}

/* ---------- Kupunguza majaribio mengi ---------- */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600000)) hits.delete(k); }, 600000).unref();

/* ---------- Malipo na kulinganisha ---------- */
function unlockedFor(me, targetId) {
  return db.payments.some((p) => p.kind === 'unlock' && p.listingId === me.id && p.targetId === targetId && p.status === 'approved');
}
function pendingFor(me, targetId) {
  return db.payments.some((p) => p.kind === 'unlock' && p.listingId === me.id && p.targetId === targetId && p.status === 'pending');
}
function regPayment(me, status) {
  return db.payments.some((p) => p.kind === 'register' && p.listingId === me.id && p.status === status);
}
function approvePayment(p, by) {
  p.status = 'approved'; p.approvedAt = new Date().toISOString(); p.approvedBy = by;
  if (p.kind === 'register') {
    const l = db.listings.find((x) => x.id === p.listingId);
    if (l) l.active = true;
  }
  save();
}
function accessOf(me) {
  if (isActive(me)) return 'active';
  return regPayment(me, 'pending') ? 'pending' : 'unpaid';
}
function sameKind(me, o) { return o.id !== me.id && mkey(o) === mkey(me); }
function cardView(me, o) {
  const mine = !!me && me.id === o.id;
  const kin = !!me && sameKind(me, o);
  const open = !!me && (mine || unlockedFor(me, o.id));
  const v = { id: o.id, name: o.fullName, cadre: o.cadre, cadreName: cadreById(o.cadre).name, specialty: o.specialty,
    subject: o.subject || '', fromRegion: o.fromRegion, fromDistrict: o.fromDistrict || '', toRegion: o.toRegion,
    toDistrict: o.toDistrict || '', gender: o.gender, years: o.years == null ? null : o.years, createdAt: o.createdAt,
    mine, unlocked: open, pending: !!me && !open && pendingFor(me, o.id), canUnlock: kin, match: '' };
  if (kin) {
    if (o.fromRegion === me.toRegion && o.toRegion === me.fromRegion) v.match = 'exact';
    else if (o.fromRegion === me.toRegion) v.match = 'partial';
  }
  if (open) v.phone = o.phone;
  return v;
}
function findMatches(me) {
  const same = db.listings.filter((o) => isActive(o) && sameKind(me, o));
  const exact = same.filter((o) => o.fromRegion === me.toRegion && o.toRegion === me.fromRegion);
  const exactIds = new Set(exact.map((o) => o.id));
  const partial = same.filter((o) => o.fromRegion === me.toRegion && !exactIds.has(o.id));
  return { exact: exact.map((o) => cardView(me, o)), partial: partial.map((o) => cardView(me, o)) };
}
function needActive(req, res) {
  const me = authListing(req);
  if (!me) { send(res, 401, { error: 'Ingia tena' }); return null; }
  if (!isActive(me)) { send(res, 403, { error: 'Lipia usajili kwanza (TZS ' + FEES.register + ')', code: 'inactive' }); return null; }
  return me;
}

/* ---------- Njia za API ---------- */
async function api(req, res, url) {
  const method = req.method;
  const ip = req.socket.remoteAddress || 'x';
  if (method === 'POST' && limited('post:' + ip, 60, 60000)) return send(res, 429, { error: 'Majaribio mengi sana. Subiri dakika moja.' });
  if (method === 'GET' && limited('get:' + ip, 240, 60000)) return send(res, 429, { error: 'Majaribio mengi sana. Subiri dakika moja.' });

  if (method === 'GET' && url === '/api/config') {
    return send(res, 200, { fees: FEES, networks: Object.values(NETWORKS), support: SUPPORT, regions: REGIONS,
      districts: DISTRICTS, genders: GENDERS, cadres: CADRES, members: db.listings.filter(isActive).length });
  }

  if (method === 'POST' && url === '/api/register') {
    const b = await readBody(req);
    const cad = cadreById(b.cadre);
    if (!cad) return send(res, 400, { error: 'Chagua kada yako' });
    const fullName = clean(b.fullName, 80);
    if (fullName.split(' ').filter(Boolean).length < 2) return send(res, 400, { error: 'Andika majina yako kamili (angalau mawili)' });
    let specialty = clean(b.specialty, 60);
    if (cad.id === 'nyingine' || specialty === 'Nyingine') {
      specialty = clean(b.other, 60);
      if (specialty.length < 2) return send(res, 400, { error: 'Andika taaluma yako' });
    } else if (!cad.subs.includes(specialty)) return send(res, 400, { error: 'Chagua kipengele cha kada yako' });
    let subject = '';
    if (cad.subjects) {
      subject = clean(b.subject, 60);
      if (!cad.subjects.includes(subject)) return send(res, 400, { error: 'Chagua somo unalofundisha' });
    }
    if (!REGIONS.includes(b.fromRegion)) return send(res, 400, { error: 'Chagua mkoa unaotoka / unaofanyia kazi' });
    if (!REGIONS.includes(b.toRegion)) return send(res, 400, { error: 'Chagua mkoa unaotaka kwenda' });
    if (b.fromRegion === b.toRegion) return send(res, 400, { error: 'Mkoa unaotoka na unaotaka kwenda haviwezi kuwa sawa' });
    const fromDistrict = clean(b.fromDistrict, 60);
    if (fromDistrict.length < 2) return send(res, 400, { error: 'Andika wilaya / halmashauri unayofanyia kazi' });
    const toDistrict = clean(b.toDistrict, 60);
    const years = Number(b.years);
    if (!Number.isInteger(years) || years < 0 || years > 45) return send(res, 400, { error: 'Miaka ya kazi iwe namba kati ya 0 na 45' });
    if (!GENDERS.includes(b.gender)) return send(res, 400, { error: 'Chagua jinsia' });
    const phone = normPhone(b.phone);
    if (!phone) return send(res, 400, { error: 'Namba ya simu si sahihi (mfano 0712345678)' });
    if (!/^\d{4,6}$/.test(String(b.pin || ''))) return send(res, 400, { error: 'PIN iwe namba 4 hadi 6' });
    if (db.listings.some((l) => l.phone === phone)) return send(res, 409, { error: 'Namba hii tayari imesajiliwa. Tumia "Ingia tena".' });
    const salt = crypto.randomBytes(8).toString('hex');
    const l = { id: newId(), fullName, cadre: cad.id, specialty, subject, fromRegion: b.fromRegion, fromDistrict,
      toRegion: b.toRegion, toDistrict, years, gender: b.gender, phone, salt, pinHash: hashPin(b.pin, salt), tokens: [],
      active: false, createdAt: new Date().toISOString() };
    const token = issueToken(l);
    db.listings.push(l); save();
    return send(res, 200, { token, listing: selfView(l), access: accessOf(l) });
  }

  if (method === 'POST' && url === '/api/login') {
    const b = await readBody(req);
    const phone = normPhone(b.phone);
    if (limited('login:' + (phone || ip), 5, 600000)) return send(res, 429, { error: 'Umejaribu mara nyingi. Subiri dakika 10.' });
    const l = phone && db.listings.find((x) => x.phone === phone);
    if (!l || !safeEq(hashPin(String(b.pin || ''), l.salt), l.pinHash)) return send(res, 401, { error: 'Namba au PIN si sahihi' });
    const token = issueToken(l); save();
    return send(res, 200, { token, listing: selfView(l), access: accessOf(l) });
  }

  if (method === 'GET' && url === '/api/me') {
    const me = authListing(req);
    if (!me) return send(res, 401, { error: 'Ingia tena' });
    const payments = db.payments.filter((p) => p.listingId === me.id).map((p) => ({ id: p.id, kind: p.kind,
      targetId: p.targetId || null, network: p.network, reference: p.reference, amount: p.amount, status: p.status,
      createdAt: p.createdAt }));
    return send(res, 200, { listing: selfView(me), access: accessOf(me), payments });
  }

  if (method === 'POST' && url === '/api/me/delete') {
    const me = authListing(req);
    if (!me) return send(res, 401, { error: 'Ingia tena' });
    db.listings = db.listings.filter((l) => l.id !== me.id); save();
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && url === '/api/listings') {
    const me = needActive(req, res); if (!me) return;
    const q = new URL(req.url, 'http://localhost').searchParams;
    const cadre = q.get('cadre'), sub = norm(q.get('sub')), from = q.get('from'), to = q.get('to'), s = norm(q.get('q'));
    let arr = db.listings.filter((o) => isActive(o));
    if (cadre) arr = arr.filter((o) => o.cadre === cadre);
    if (sub) arr = arr.filter((o) => norm(o.specialty) === sub);
    if (from) arr = arr.filter((o) => o.fromRegion === from);
    if (to) arr = arr.filter((o) => o.toRegion === to);
    if (s) arr = arr.filter((o) => norm([o.fullName, o.fromDistrict, o.toDistrict, o.specialty, o.subject].join(' ')).includes(s));
    arr.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const total = arr.length, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(pages, Math.max(1, parseInt(q.get('page'), 10) || 1));
    return send(res, 200, { items: arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => cardView(me, o)), page, pages, total });
  }

  if (method === 'GET' && url === '/api/matches') {
    const me = needActive(req, res); if (!me) return;
    return send(res, 200, findMatches(me));
  }

  if (method === 'POST' && url === '/api/pay') {
    const me = authListing(req);
    if (!me) return send(res, 401, { error: 'Ingia tena' });
    const b = await readBody(req);
    const net = NETWORKS[b.network];
    if (!net) return send(res, 400, { error: 'Chagua mtandao wa kulipia' });
    const kind = b.kind === 'register' ? 'register' : 'unlock';
    let targetId = null;
    if (kind === 'register') {
      if (isActive(me)) return send(res, 409, { error: 'Usajili wako tayari umelipiwa' });
      if (regPayment(me, 'pending')) return send(res, 409, { error: 'Una malipo ya usajili yanayosubiri uthibitisho' });
    } else {
      if (!isActive(me)) return send(res, 403, { error: 'Lipia usajili kwanza (TZS ' + FEES.register + ')' });
      const target = db.listings.find((l) => l.id === b.targetId);
      if (!target || !isActive(target) || !sameKind(me, target)) return send(res, 400, { error: 'Mtu huyu hapatikani' });
      if (unlockedFor(me, target.id)) return send(res, 409, { error: 'Taarifa hii tayari imefunguliwa' });
      if (pendingFor(me, target.id)) return send(res, 409, { error: 'Una malipo yanayosubiri uthibitisho kwa mtu huyu' });
      targetId = target.id;
    }
    const reference = clean(b.reference, 30).toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{6,30}$/.test(reference)) return send(res, 400, { error: 'Weka namba ya muamala (transaction ID) kutoka kwenye ujumbe wa malipo' });
    if (db.payments.some((p) => p.reference === reference && p.status !== 'rejected')) return send(res, 409, { error: 'Namba hii ya muamala imeshatumika' });
    const p = { id: newId(), kind, listingId: me.id, targetId, network: net.id, reference, amount: FEES[kind],
      status: 'pending', createdAt: new Date().toISOString() };
    db.payments.push(p); save();
    return send(res, 200, { ok: true, payment: { id: p.id, status: p.status } });
  }

  if (method === 'POST' && url === '/api/feedback') {
    const b = await readBody(req);
    const message = clean(b.message, 500);
    if (message.length < 3) return send(res, 400, { error: 'Andika maoni yako' });
    if (limited('fb:' + ip, 5, 3600000)) return send(res, 429, { error: 'Umetuma maoni mengi. Jaribu baadaye.' });
    const me = authListing(req);
    db.feedback.push({ id: newId(), name: clean(b.name, 60) || (me ? me.fullName : ''), phone: me ? me.phone : '',
      message, createdAt: new Date().toISOString() });
    db.feedback = db.feedback.slice(-500); save();
    return send(res, 200, { ok: true });
  }

  /* Hiari: mfumo wa malipo (aggregator) ukitumwa ujumbe wa uthibitisho */
  if (method === 'POST' && url === '/api/webhook/payment') {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret || !safeEq(req.headers['x-webhook-secret'] || '', secret)) return send(res, 403, { error: 'Hairuhusiwi' });
    const b = await readBody(req);
    const ref = clean(b.reference, 30).toUpperCase().replace(/\s+/g, '');
    const p = db.payments.find((x) => x.reference === ref && x.status === 'pending');
    if (!p) return send(res, 404, { error: 'Malipo hayajapatikana' });
    if (b.status === 'success' && Number(b.amount) >= FEES[p.kind]) approvePayment(p, 'webhook');
    return send(res, 200, { ok: true, status: p.status });
  }

  /* ---------- Admin ---------- */
  if (url.startsWith('/api/admin/')) {
    if (limited('admin:' + ip, 60, 600000)) return send(res, 429, { error: 'Majaribio mengi sana' });
    if (!isAdmin(req)) return send(res, 401, { error: 'Nenosiri si sahihi' });
    if (method === 'GET' && url === '/api/admin/overview') {
      const byId = new Map(db.listings.map((l) => [l.id, l]));
      const pay = db.payments.slice().reverse().map((p) => {
        const a = byId.get(p.listingId), t = byId.get(p.targetId);
        return { id: p.id, kind: p.kind, status: p.status, network: p.network, reference: p.reference, amount: p.amount,
          createdAt: p.createdAt, payer: a ? a.fullName + ' (' + a.phone + ')' : '(amefutwa)',
          target: p.kind === 'register' ? '-' : (t ? t.fullName + ' (' + t.phone + ')' : '(amefutwa)') };
      });
      const listings = db.listings.map((l) => selfView(l));
      const revenue = db.payments.filter((p) => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
      return send(res, 200, { listings, payments: pay, revenue, networks: NETWORKS, feedback: db.feedback.slice().reverse() });
    }
    if (method === 'POST' && url === '/api/admin/payment') {
      const b = await readBody(req);
      const p = db.payments.find((x) => x.id === b.id);
      if (!p) return send(res, 404, { error: 'Malipo hayajapatikana' });
      if (b.action === 'approve') approvePayment(p, 'admin');
      else if (b.action === 'reject') { p.status = 'rejected'; save(); }
      else return send(res, 400, { error: 'Hatua si sahihi' });
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && url === '/api/admin/delete-listing') {
      const b = await readBody(req);
      db.listings = db.listings.filter((l) => l.id !== b.id); save();
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'Haipatikani' });
}

/* ---------- Kiolesura (HTML) ---------- */
const STYLE = String.raw`
:root{--bg:#f2f6f3;--surface:#ffffff;--ink:#11201a;--muted:#55665d;--line:#d6e0d9;--accent:#0b7a4b;--accent-ink:#ffffff;
--sun:#f2b705;--blue:#1e8fd5;--danger:#b3261e;--ok:#0b7a4b;--wait:#9a6700;--chip:#e6efe9;--panel:#eaf3fb;--wa:#1fb855}
@media (prefers-color-scheme:dark){:root{--bg:#0d1511;--surface:#152019;--ink:#e7f0ea;--muted:#96aa9f;--line:#27382f;
--accent:#3fd08f;--accent-ink:#04210f;--sun:#f5c518;--blue:#4fb2f0;--danger:#ff8a80;--ok:#3fd08f;--wait:#f0c14b;--chip:#1d2b23;
--panel:#16283a;--wa:#25c562;color-scheme:dark}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
padding-left:max(14px,env(safe-area-inset-left,0px));padding-right:max(14px,env(safe-area-inset-right,0px));padding-bottom:104px}
.wrap{max-width:760px;margin:0 auto}
header{padding:18px 0 4px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px}
h1{margin:0;font-size:clamp(26px,8vw,42px);font-weight:900;letter-spacing:.06em;line-height:1.05}
.lang{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;flex:0 0 auto}
.lang button{border:0;background:var(--surface);color:var(--ink);font:inherit;font-weight:800;font-size:13px;padding:7px 13px;cursor:pointer}
.lang button.on{background:var(--accent);color:var(--accent-ink)}
.flag{display:flex;height:6px;margin:10px 0 6px;border-radius:3px;overflow:hidden}
.flag i{flex:1}.flag i:nth-child(1){background:#1eb53a}.flag i:nth-child(2){background:var(--sun)}
.flag i:nth-child(3){background:#000;flex:.5}.flag i:nth-child(4){background:var(--blue)}
.tag{color:var(--muted);margin:0 0 6px;font-size:14px}
h2{font-size:18px;margin:0 0 12px}
h3{font-size:15px;margin:16px 0 4px}
section.box{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px;margin:12px 0}
.scroll{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.chip{flex:0 0 auto;border:1px solid var(--line);background:var(--chip);color:var(--ink);border-radius:999px;padding:9px 15px;
font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}
.chip.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}
.path{font-size:13px;color:var(--muted);margin:2px 0 8px}
label{display:block;font-size:13px;font-weight:700;margin:12px 0 5px}
input,select,textarea{width:100%;font:inherit;padding:11px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);min-width:0}
textarea{min-height:110px;resize:vertical}
input:focus,select:focus,textarea:focus,button:focus-visible,a:focus-visible{outline:3px solid var(--blue);outline-offset:1px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
@media (max-width:520px){.grid{grid-template-columns:1fr}}
.btn{display:inline-block;width:100%;margin-top:16px;padding:13px;border:0;border-radius:10px;background:var(--accent);
color:var(--accent-ink);font:inherit;font-weight:800;cursor:pointer;text-align:center;text-decoration:none}
.btn.sec{background:var(--surface);color:var(--ink);border:1px solid var(--line);font-weight:600;width:auto;padding:9px 14px;margin-top:0}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.note{font-size:13px;color:var(--muted);margin:8px 0 0}
.link{background:none;border:0;color:var(--accent);font:inherit;text-decoration:underline;cursor:pointer;padding:0}
.filters{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:2px 0 10px}
.filters .full{grid-column:1/-1}
.filters select,.filters input{padding:10px 11px}
.filters label{margin:0 0 4px;font-size:12px}
@media (max-width:330px){.filters{grid-template-columns:1fr}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;margin:14px 0}
.card.me{border-color:var(--blue)}
.head{display:flex;gap:12px;align-items:center}
.av{flex:0 0 48px;height:48px;border-radius:50%;background:var(--panel);color:var(--blue);font-weight:800;font-size:20px;display:grid;place-items:center}
.who{min-width:0}
.nm{font-size:18px;font-weight:800;overflow-wrap:anywhere;line-height:1.25}
.role{font-size:14px;overflow-wrap:anywhere}
.role b{color:var(--blue)}
.pill{display:inline-block;background:var(--ok);color:#fff;font-size:12px;font-weight:800;padding:2px 10px;border-radius:999px;margin-left:4px;vertical-align:middle}
.pill.m{background:var(--blue)}.pill.p{background:var(--wait)}
.route{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:12px 0 10px}
.route div{padding:4px 0;overflow-wrap:anywhere}
.route .sep{border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
.route .k{color:var(--blue);font-weight:700}
.route small{color:var(--muted);font-size:inherit}
.meta{font-size:14px;color:var(--muted);margin:4px 0}
.ago{font-weight:600;margin-top:10px}
.date{font-size:13px;margin:2px 0 12px}
.phone{font-size:20px;font-weight:900;letter-spacing:.03em;margin:4px 0 8px;word-break:break-all}
.acts{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;margin-top:8px}
.acts a,.acts button{padding:12px 6px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);
font:inherit;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}
.acts .wa{background:var(--wa);border-color:var(--wa);color:#fff}
.badge{display:inline-block;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;border:1px solid currentColor}
.ok{color:var(--ok)}.wait{color:var(--wait)}.bad{color:var(--danger)}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.fee{font-size:30px;font-weight:900}
.pager{display:flex;align-items:center;justify-content:center;gap:12px;margin:18px 0 6px;flex-wrap:wrap}
.pager button{padding:11px 16px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:700;cursor:pointer}
.pager button[disabled]{opacity:.4;cursor:not-allowed}
.gate{text-align:center;padding:22px 16px}
.gate p{margin:6px 0}
.net{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0;cursor:pointer;font-weight:400;font-size:16px}
.net input{width:auto;margin-top:5px}
.net.on{border-color:var(--accent);background:var(--chip)}
.nav{position:fixed;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr);
padding:6px max(6px,env(safe-area-inset-left,0px)) calc(6px + env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-right,0px));z-index:20}
.nav button{background:none;border:0;color:var(--muted);font:inherit;font-size:12px;font-weight:700;padding:6px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.nav svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.nav button.on{color:var(--blue)}
.nav button.on::after{content:"";width:22px;height:3px;border-radius:2px;background:var(--blue);margin-top:1px}
.fab{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(86px + env(safe-area-inset-bottom,0px));width:56px;height:56px;border-radius:50%;
background:var(--wa);display:grid;place-items:center;z-index:19;box-shadow:0 3px 10px rgba(0,0,0,.3)}
.fab svg{width:30px;height:30px;fill:#fff}
.sheet{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:30;display:flex;align-items:flex-end;justify-content:center}
.sheetbox{background:var(--surface);width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;
padding:18px max(16px,env(safe-area-inset-left,0px)) calc(20px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-right,0px))}
#toast{position:fixed;left:50%;transform:translateX(-50%);top:max(14px,env(safe-area-inset-top,0px));background:var(--ink);color:var(--bg);
padding:11px 16px;border-radius:8px;font-size:14px;max-width:92vw;opacity:0;pointer-events:none;transition:opacity .2s;z-index:50}
#toast.show{opacity:1}#toast.err{background:var(--danger);color:#fff}
footer{font-size:14px;color:var(--muted);padding:6px 0 0}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;white-space:nowrap}
.act{display:flex;gap:6px}.act button{padding:5px 10px;border-radius:6px;border:1px solid var(--line);background:var(--chip);color:var(--ink);cursor:pointer;font:inherit;font-size:12px}
[hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){#toast{transition:none}}
`;

const CLIENT_JS = String.raw`
(function () {
  var I = {
    sw: {
      tag: 'Badilishana kituo cha kazi na mtumishi mwenzako wa kada yako, mkoa kwa mkoa.',
      nav_dash: 'Dashibodi', nav_reg: 'Sajili', nav_fb: 'Maoni', nav_me: 'Wasifu',
      all: 'Zote', search: 'Tafuta jina au wilaya', f_from: 'Anatoka mkoa', f_to: 'Anataka mkoa', any_region: 'Mikoa yote',
      results: 'Matokeo: {n}', none: 'Hakuna matokeo. Jaribu kubadilisha vichujio.', prev: 'Iliyopita', next: 'Inayofuata',
      from: 'Kutoka', wants: 'Anataka', coming: 'Anakuja', district: 'wilaya',
      years: 'Miaka ya kazi: {n} {u}', yr1: 'mwaka', yrN: 'miaka',
      ago_min: 'dakika {n} zilizopita', ago_hr: 'saa {n} zilizopita', ago_day: 'siku {n} zilizopita', ago_wk: 'wiki {n} zilizopita', ago_mo: 'miezi {n} iliyopita',
      call: 'Piga', sms: 'SMS', wa: 'WhatsApp', unlock: 'Fungua mawasiliano - {fee}',
      other_cadre: 'Mawasiliano yanafunguka kwa wa kada na kipengele chako tu.',
      pending: 'Malipo yanasubiri uthibitisho wa admin', locked: 'Namba ya simu imefichwa hadi ulipie.',
      m_exact: 'Anakufaa', m_part: 'Anaweza kufaa', you: 'Wewe', copy: 'Nakili namba', copied: 'Namba imenakiliwa',
      gate_out_t: 'Jisajili kuona watumishi', gate_out_x: 'Jaza ombi lako la kuhama na ulipie usajili {fee}. Kisha utaona orodha ya watumishi wa kada yako wanaotaka kubadilishana.',
      members: 'Watumishi {n} wamesajiliwa', gate_unpaid_t: 'Kamilisha usajili', gate_unpaid_x: 'Ombi lako limehifadhiwa. Lipia usajili {fee} ili uone orodha ya watumishi.',
      gate_pend_t: 'Malipo yanasubiri uthibitisho', gate_pend_x: 'Tunakagua malipo yako ya usajili. Orodha itafunguka ukishathibitishwa.',
      pay_reg: 'Lipia usajili - {fee}', go_reg: 'Jaza ombi la kuhama', go_login: 'Ingia tena',
      reg_t: 'Kada na kipengele', scroll_hint: 'Telezesha kulia kuona kada na vipengele vyote.', chosen: 'Umechagua: ', pick_cadre: 'Chagua kada yako juu', pick_sub: '(chagua kipengele)',
      your_info: 'Taarifa zako', subject: 'Somo unalofundisha', choose_subject: 'Chagua somo', other_prof: 'Taaluma yako', choose: 'Chagua',
      fullname: 'Full name', from_region: 'Unapotokea / unapofanyia kazi (mkoa)', from_district: 'Wilaya / halmashauri unayofanyia kazi',
      to_region: 'Unapotaka kwenda (mkoa)', to_district: 'Wilaya unayopendelea (si lazima)', gender: 'Jinsia', years_lbl: 'Miaka ya kazi',
      phone: 'Mawasiliano (namba ya simu)', pin: 'PIN ya kuingia tena (namba 4 hadi 6)',
      priv: 'Namba yako ya simu haionekani kwa wengine. Inaonekana tu kwa mtu aliyelipia kuifungua. Usajili unalipiwa {fee}.',
      reg_btn: 'Sajili ombi la kuhama', have: 'Umeshasajiliwa?', login_btn: 'Ingia', phone_s: 'Namba ya simu',
      already_reg: 'Tayari umesajiliwa. Tazama ombi lako kwenye Wasifu.',
      my_req: 'Ombi langu', logout: 'Toka', del: 'Futa ombi', del_ok: 'Bonyeza tena kuthibitisha kufuta', deleted: 'Ombi lako limefutwa',
      my_matches: 'Wanaolingana nawe', exact_t: 'Wanaolingana kabisa ({n})', exact_x: 'Wako {to} na wanataka kuhamia {from}, kada na kipengele kinafanana.',
      no_exact: 'Bado hakuna. Utaonekana kwao pia mtu atakaposajili; angalia tena baadaye.',
      part_t: 'Wanaofanya kazi {to} ({n})', part_x: 'Wanataka kwenda mkoa mwingine, lakini wanaweza kukubali mpango wa mzunguko.',
      my_pays: 'Malipo yangu', st_ok: 'Imethibitishwa', st_wait: 'Inasubiri', st_bad: 'Imekataliwa', k_reg: 'Usajili', k_unl: 'Kufungua',
      need_login: 'Ingia au sajili ombi lako ili kuona wasifu.',
      fb_t: 'Maoni na msaada', fb_name: 'Jina (si lazima)', fb_msg: 'Maoni yako', fb_send: 'Tuma maoni', fb_thanks: 'Asante kwa maoni yako', support: 'Msaada',
      pay_t_reg: 'Lipia usajili', pay_t_unl: 'Fungua mawasiliano', fee_lbl: 'Ada', pay_note: 'Chagua mtandao. Pesa inaingia moja kwa moja kwenye namba ya mtandao uliouchagua.',
      send_to: 'Tuma {fee} kwenda namba hii:', pick_net: 'Chagua mtandao huu', ref_lbl: 'Namba ya muamala (transaction ID)',
      ref_note: 'Ukishalipa, andika namba ya muamala iliyo kwenye ujumbe wa malipo. Utafunguliwa baada ya malipo kuthibitishwa.',
      pay_btn: 'Thibitisha malipo', unlocking: 'Unafungua: {x}', paid: 'Malipo yamepokelewa. Yanasubiri uthibitisho.', close: 'Funga',
      active_now: 'Malipo yamethibitishwa. Karibu!', registered: 'Ombi limehifadhiwa. Lipia usajili ili uendelee.',
      load_fail: 'Imeshindwa kupakia. Hakikisha seva inaendesha.'
    },
    en: {
      tag: 'Swap your work station with a colleague in your own cadre, region to region.',
      nav_dash: 'Dashboard', nav_reg: 'Register', nav_fb: 'Feedback', nav_me: 'Profile',
      all: 'All', search: 'Search name or district', f_from: 'From region', f_to: 'Wants region', any_region: 'All regions',
      results: 'Results: {n}', none: 'No results. Try changing the filters.', prev: 'Previous', next: 'Next',
      from: 'From', wants: 'Wants', coming: 'Coming to', district: 'district',
      years: 'Years of service: {n} {u}', yr1: 'year', yrN: 'years',
      ago_min: '{n} min ago', ago_hr: '{n} h ago', ago_day: '{n} d ago', ago_wk: '{n} wk ago', ago_mo: '{n} mo ago',
      call: 'Call', sms: 'SMS', wa: 'WhatsApp', unlock: 'Unlock contact - {fee}',
      other_cadre: 'Contacts unlock only for your own cadre and specialty.',
      pending: 'Payment awaiting admin approval', locked: 'Phone number is hidden until you pay.',
      m_exact: 'Perfect match', m_part: 'Possible match', you: 'You', copy: 'Copy number', copied: 'Number copied',
      gate_out_t: 'Register to see colleagues', gate_out_x: 'Fill in your transfer request and pay the {fee} registration fee. Then you can browse colleagues in your cadre who want to swap.',
      members: '{n} staff registered', gate_unpaid_t: 'Complete registration', gate_unpaid_x: 'Your request is saved. Pay the {fee} registration fee to see the list.',
      gate_pend_t: 'Payment awaiting approval', gate_pend_x: 'We are checking your registration payment. The list opens once it is approved.',
      pay_reg: 'Pay registration - {fee}', go_reg: 'Fill in transfer request', go_login: 'Log in',
      reg_t: 'Cadre and specialty', scroll_hint: 'Swipe right to see all cadres and specialties.', chosen: 'Selected: ', pick_cadre: 'Choose your cadre above', pick_sub: '(choose a specialty)',
      your_info: 'Your details', subject: 'Subject you teach', choose_subject: 'Choose subject', other_prof: 'Your profession', choose: 'Choose',
      fullname: 'Full name', from_region: 'Where you work now (region)', from_district: 'District / council you work in',
      to_region: 'Region you want to move to', to_district: 'Preferred district (optional)', gender: 'Gender', years_lbl: 'Years of service',
      phone: 'Contact (phone number)', pin: 'PIN to log in again (4 to 6 digits)',
      priv: 'Your phone number is hidden from others. Only people who pay to unlock it can see it. Registration costs {fee}.',
      reg_btn: 'Register transfer request', have: 'Already registered?', login_btn: 'Log in', phone_s: 'Phone number',
      already_reg: 'You are already registered. See your request under Profile.',
      my_req: 'My request', logout: 'Log out', del: 'Delete request', del_ok: 'Tap again to confirm delete', deleted: 'Your request was deleted',
      my_matches: 'Your matches', exact_t: 'Exact matches ({n})', exact_x: 'They work in {to} and want to move to {from}, with the same cadre and specialty.',
      no_exact: 'None yet. You will also show up for them when someone registers; check again later.',
      part_t: 'Working in {to} ({n})', part_x: 'They want a different region, but may accept a circular swap.',
      my_pays: 'My payments', st_ok: 'Approved', st_wait: 'Pending', st_bad: 'Rejected', k_reg: 'Registration', k_unl: 'Unlock',
      need_login: 'Log in or register your request to see your profile.',
      fb_t: 'Feedback and support', fb_name: 'Name (optional)', fb_msg: 'Your feedback', fb_send: 'Send feedback', fb_thanks: 'Thank you for your feedback', support: 'Support',
      pay_t_reg: 'Pay registration', pay_t_unl: 'Unlock contact', fee_lbl: 'Fee', pay_note: 'Choose a network. The money goes straight to the number of the network you pick.',
      send_to: 'Send {fee} to this number:', pick_net: 'Choose this network', ref_lbl: 'Transaction ID',
      ref_note: 'After paying, enter the transaction ID from the payment message. It opens once the payment is approved.',
      pay_btn: 'Confirm payment', unlocking: 'Unlocking: {x}', paid: 'Payment received. Awaiting approval.', close: 'Close',
      active_now: 'Payment approved. Welcome!', registered: 'Request saved. Pay the registration fee to continue.',
      load_fail: 'Could not load. Make sure the server is running.'
    }
  };
  var lang = 'sw';
  try { lang = localStorage.getItem('ta_lang') || 'sw'; } catch (e) {}
  if (lang !== 'sw' && lang !== 'en') lang = 'sw';
  function t(k, a) {
    var s = (I[lang] && I[lang][k]) || I.sw[k] || k;
    if (a) for (var x in a) s = s.split('{' + x + '}').join(a[x]);
    return s;
  }
  var cfg = null;
  var S = { token: null, me: null, access: '', payments: [], matches: null, view: 'dash', pay: null, network: null, list: null, seq: 0, confirmDel: false };
  var F = { cadre: null, sub: '', from: '', to: '', q: '', page: 1 };
  var R = { cadre: null, sub: '' };
  try { S.token = localStorage.getItem('ta_token'); } catch (e) {}
  function $(id) { return document.getElementById(id); }
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function tz(n) { return 'TZS ' + Number(n).toLocaleString('en-US'); }
  var tt;
  function toast(msg, bad) {
    var el = $('toast'); el.textContent = msg; el.className = 'show' + (bad ? ' err' : '');
    clearTimeout(tt); tt = setTimeout(function () { el.className = ''; }, 3800);
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    return fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; e.code = d.code; throw e; } return d; }); });
  }
  function setToken(v) { S.token = v; try { if (v) localStorage.setItem('ta_token', v); else localStorage.removeItem('ta_token'); } catch (e) {} }

  /* ---------- Kada na vipengele (zinasogea kulia) ---------- */
  function chip(label, on, fn) { return h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: fn }, [label]); }
  function renderPicker(st, rowId, subId, withAll, onChange) {
    var row = $(rowId), srow = $(subId); clear(row); clear(srow);
    if (withAll) row.appendChild(chip(t('all'), !st.cadre, function () { st.cadre = null; st.sub = ''; onChange(); }));
    cfg.cadres.forEach(function (c) {
      row.appendChild(chip(c.name, st.cadre && st.cadre.id === c.id, function () { st.cadre = c; st.sub = ''; onChange(); }));
    });
    var subs = st.cadre ? st.cadre.subs : [];
    srow.hidden = !subs.length;
    subs.forEach(function (s) { srow.appendChild(chip(s, st.sub === s, function () { st.sub = (st.sub === s && withAll) ? '' : s; onChange(); })); });
  }
  function fillRegions(sel, label, keep) {
    var cur = keep ? sel.value : '';
    clear(sel); sel.appendChild(h('option', { value: '', text: label }));
    cfg.regions.forEach(function (r) { sel.appendChild(h('option', { value: r, text: r })); });
    sel.value = cur;
  }
  function fillDistricts(listId, region) {
    var dl = $(listId); clear(dl);
    (cfg.districts[region] || []).forEach(function (d) { dl.appendChild(h('option', { value: d })); });
  }

  /* ---------- Dashibodi ---------- */
  function months() { return lang === 'sw' ? ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; }
  function fmtDate(iso) { var d = new Date(iso); return d.getDate() + ' ' + months()[d.getMonth()] + ' ' + d.getFullYear(); }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000), n, k;
    if (s < 3600) { n = Math.max(1, Math.floor(s / 60)); k = 'min'; }
    else if (s < 86400) { n = Math.floor(s / 3600); k = 'hr'; }
    else if (s < 604800) { n = Math.floor(s / 86400); k = 'day'; }
    else if (s < 2592000) { n = Math.floor(s / 604800); k = 'wk'; }
    else { n = Math.floor(s / 2592000); k = 'mo'; }
    return t('ago_' + k, { n: n });
  }
  function badgeOf(spec) { var m = /\(([A-Z]{2,5})\)\s*$/.exec(spec); return m ? m[1] : ''; }
  function place(region, district) { return h('span', null, [h('b', { text: region }), district ? h('small', { text: ', ' + district }) : null]); }
  function card(o) {
    var code = badgeOf(o.specialty);
    var role = [h('b', { text: o.cadreName }), ' ', o.specialty + (o.subject ? ' - ' + o.subject : '')];
    var head = h('div', { class: 'head' }, [h('div', { class: 'av', text: (o.name || '?').charAt(0).toUpperCase() }),
      h('div', { class: 'who' }, [h('div', { class: 'nm', text: o.name }),
        h('div', { class: 'role' }, role.concat([code ? h('span', { class: 'pill', text: code }) : null,
          o.match === 'exact' ? h('span', { class: 'pill m', text: t('m_exact') }) : (o.match === 'partial' ? h('span', { class: 'pill p', text: t('m_part') }) : null),
          o.mine ? h('span', { class: 'pill m', text: t('you') }) : null]))])]);
    var route = h('div', { class: 'route' }, [
      h('div', null, [h('span', { class: 'k', text: t('from') + ': ' }), place(o.fromRegion, o.fromDistrict)]),
      h('div', null, [h('span', { class: 'k', text: t('wants') + ': ' }), place(o.toRegion, o.toDistrict)]),
      h('div', { class: 'sep' }, [h('span', { class: 'k', text: t('coming') + ': ' }), h('b', { text: o.toRegion })])]);
    var kids = [head, route];
    if (o.years != null) kids.push(h('div', { class: 'meta', text: t('years', { n: o.years, u: o.years === 1 ? t('yr1') : t('yrN') }) }));
    kids.push(h('div', { class: 'ago', text: ago(o.createdAt) }));
    kids.push(h('div', { class: 'date', text: fmtDate(o.createdAt) }));
    if (o.unlocked && o.phone) {
      var intl = '255' + o.phone.slice(1);
      kids.push(h('div', { class: 'phone', text: o.phone }));
      kids.push(h('div', { class: 'acts' }, [
        h('a', { href: 'tel:' + o.phone, text: t('call') }),
        h('a', { href: 'sms:' + o.phone, text: t('sms') }),
        h('a', { class: 'wa', href: 'https://wa.me/' + intl, target: '_blank', rel: 'noopener', text: t('wa') })]));
      kids.push(h('button', { type: 'button', class: 'btn sec', style: 'margin-top:8px', text: t('copy'), onclick: function () {
        try { navigator.clipboard.writeText(o.phone).then(function () { toast(t('copied')); }, function () { toast(o.phone); }); } catch (e) { toast(o.phone); }
      } }));
    } else if (o.mine) {
      kids.push(h('div', { class: 'meta', text: o.fullPhone || '' }));
    } else if (o.pending) {
      kids.push(h('div', { class: 'wait', text: t('pending') }));
    } else if (o.canUnlock) {
      kids.push(h('div', { class: 'meta', text: t('locked') }));
      kids.push(h('button', { type: 'button', class: 'btn', style: 'margin-top:8px', text: t('unlock', { fee: tz(cfg.fees.unlock) }), onclick: function () { openPay('unlock', o); } }));
    } else {
      kids.push(h('div', { class: 'meta', text: t('other_cadre') }));
    }
    return h('div', { class: 'card' + (o.mine ? ' me' : '') }, kids);
  }
  function gateBox(title, text, btns) {
    return h('section', { class: 'box gate' }, [h('h2', { text: title }), h('p', { text: text }), h('p', { class: 'note', text: t('members', { n: cfg.members }) })].concat(btns));
  }
  function renderDash() {
    var gate = $('gate'), body = $('dashBody'); clear(gate);
    var open = S.me && S.me.active;
    body.hidden = !open; gate.hidden = !!open;
    if (open) { renderPicker(F, 'dCadre', 'dSub', true, onFilter); loadList(); return; }
    if (!S.me) {
      gate.appendChild(gateBox(t('gate_out_t'), t('gate_out_x', { fee: tz(cfg.fees.register) }), [
        h('button', { type: 'button', class: 'btn', text: t('go_reg'), onclick: function () { show('reg'); } }),
        h('p', { class: 'note' }, [h('button', { type: 'button', class: 'link', text: t('go_login'), onclick: function () { show('me'); } })])]));
    } else if (S.access === 'pending') {
      gate.appendChild(gateBox(t('gate_pend_t'), t('gate_pend_x'), []));
    } else {
      gate.appendChild(gateBox(t('gate_unpaid_t'), t('gate_unpaid_x', { fee: tz(cfg.fees.register) }), [
        h('button', { type: 'button', class: 'btn', text: t('pay_reg', { fee: tz(cfg.fees.register) }), onclick: function () { openPay('register'); } })]));
    }
  }
  function onFilter() { F.page = 1; renderPicker(F, 'dCadre', 'dSub', true, onFilter); loadList(); }
  function loadList() {
    var p = [];
    if (F.cadre) p.push('cadre=' + encodeURIComponent(F.cadre.id));
    if (F.sub) p.push('sub=' + encodeURIComponent(F.sub));
    if (F.from) p.push('from=' + encodeURIComponent(F.from));
    if (F.to) p.push('to=' + encodeURIComponent(F.to));
    if (F.q) p.push('q=' + encodeURIComponent(F.q));
    p.push('page=' + F.page);
    var my = ++S.seq;
    api('/api/listings?' + p.join('&')).then(function (d) {
      if (my !== S.seq) return;
      S.list = d; F.page = d.page; renderList();
    }).catch(function (err) {
      if (err.status === 401) { setToken(null); S.me = null; renderAll(); }
      else if (err.code === 'inactive') { loadMe().then(renderAll); }
      else toast(err.message, true);
    });
  }
  function renderList() {
    var d = S.list, box = $('dList'); clear(box);
    if (!d) return;
    $('dCount').textContent = t('results', { n: d.total });
    if (!d.items.length) box.appendChild(h('p', { class: 'meta', text: t('none') }));
    d.items.forEach(function (o) { box.appendChild(card(o)); });
    $('pgLabel').textContent = d.page + ' / ' + d.pages;
    $('pgPrev').disabled = d.page <= 1; $('pgNext').disabled = d.page >= d.pages;
    $('pgPrev').textContent = '< ' + t('prev'); $('pgNext').textContent = t('next') + ' >';
    $('pager').hidden = d.pages <= 1;
  }

  /* ---------- Sajili ---------- */
  function renderRegFields() {
    var c = R.cadre;
    $('rPath').textContent = c ? t('chosen') + c.name + (R.sub ? '  >  ' + R.sub : (c.subs.length ? '  >  ' + t('pick_sub') : '')) : t('pick_cadre');
    var sw = $('subjectWrap'), subj = $('subject');
    sw.hidden = !(c && c.subjects);
    if (c && c.subjects) {
      var cur = subj.getAttribute('data-for') === c.id + lang ? subj.value : '';
      clear(subj); subj.setAttribute('data-for', c.id + lang);
      subj.appendChild(h('option', { value: '', text: t('choose_subject') }));
      c.subjects.forEach(function (s) { subj.appendChild(h('option', { value: s, text: s })); });
      subj.value = cur;
    }
    $('otherWrap').hidden = !(c && (c.id === 'nyingine' || R.sub === 'Nyingine'));
  }
  function onReg() { renderPicker(R, 'rCadre', 'rSub', false, onReg); renderRegFields(); }
  function renderReg() {
    var done = !!S.me;
    $('regDone').hidden = !done; $('regForm').hidden = done; $('regPick').hidden = done;
    if (!done) { onReg(); fillRegions($('fromRegion'), t('choose'), true); fillRegions($('toRegion'), t('choose'), true); }
    var g = $('gender'), cur = g.value; clear(g); g.appendChild(h('option', { value: '', text: t('choose') }));
    cfg.genders.forEach(function (x) { g.appendChild(h('option', { value: x, text: x })); }); g.value = cur;
  }
  function onRegister(e) {
    e.preventDefault();
    if (!R.cadre) return toast(t('pick_cadre'), true);
    var body = { fullName: $('fullName').value, cadre: R.cadre.id, specialty: R.sub, other: $('other').value, subject: $('subject').value,
      fromRegion: $('fromRegion').value, fromDistrict: $('fromDistrict').value, toRegion: $('toRegion').value, toDistrict: $('toDistrict').value,
      years: $('years').value, gender: $('gender').value, phone: $('phone').value, pin: $('pin').value };
    api('/api/register', { method: 'POST', body: body }).then(function (d) {
      setToken(d.token); toast(t('registered')); return loadMe().then(function () { show('dash'); openPay('register'); });
    }).catch(function (err) { toast(err.message, true); });
  }
  function onLogin(e) {
    e.preventDefault();
    api('/api/login', { method: 'POST', body: { phone: $('lphone').value, pin: $('lpin').value } }).then(function (d) {
      setToken(d.token); return loadMe().then(function () { show('dash'); });
    }).catch(function (err) { toast(err.message, true); });
  }

  /* ---------- Wasifu ---------- */
  function loadMe() {
    if (!S.token) { S.me = null; S.access = ''; S.payments = []; return Promise.resolve(); }
    return api('/api/me').then(function (d) { S.me = d.listing; S.access = d.access; S.payments = d.payments; }).catch(function (err) {
      if (err.status === 401) { setToken(null); S.me = null; S.access = ''; } else toast(err.message, true);
    });
  }
  function renderMe() {
    var out = !S.me;
    $('meOut').hidden = !out; $('meIn').hidden = out;
    if (out) return;
    var m = S.me, box = $('meBody'); clear(box);
    var o = Object.assign({}, m, { name: m.fullName, mine: true, fullPhone: m.phone + '  (' + (lang === 'sw' ? 'inaonekana kwako tu' : 'visible only to you') + ')', unlocked: false, createdAt: m.createdAt });
    box.appendChild(card(o));
    if (S.access !== 'active') {
      box.appendChild(S.access === 'pending' ? h('p', { class: 'wait', text: t('gate_pend_x') })
        : h('button', { type: 'button', class: 'btn', text: t('pay_reg', { fee: tz(cfg.fees.register) }), onclick: function () { openPay('register'); } }));
    }
    var mb = $('matchBox'); clear(mb);
    if (S.matches && S.access === 'active') {
      var ex = S.matches.exact, pa = S.matches.partial;
      mb.appendChild(h('h3', { text: t('exact_t', { n: ex.length }) }));
      mb.appendChild(h('p', { class: 'note', text: t('exact_x', { to: m.toRegion, from: m.fromRegion }) }));
      if (!ex.length) mb.appendChild(h('p', { class: 'meta', text: t('no_exact') }));
      ex.forEach(function (x) { mb.appendChild(card(x)); });
      if (pa.length) {
        mb.appendChild(h('h3', { text: t('part_t', { to: m.toRegion, n: pa.length }) }));
        mb.appendChild(h('p', { class: 'note', text: t('part_x') }));
        pa.forEach(function (x) { mb.appendChild(card(x)); });
      }
    }
    var mp = $('myPays'); clear(mp);
    if (S.payments.length) {
      mp.appendChild(h('h3', { text: t('my_pays') }));
      S.payments.slice().reverse().forEach(function (p) {
        var cls = p.status === 'approved' ? 'ok' : (p.status === 'pending' ? 'wait' : 'bad');
        var txt = p.status === 'approved' ? t('st_ok') : (p.status === 'pending' ? t('st_wait') : t('st_bad'));
        mp.appendChild(h('div', { class: 'row meta' }, [h('span', { text: (p.kind === 'register' ? t('k_reg') : t('k_unl')) + '  |  ' + p.reference + '  |  ' + tz(p.amount) }),
          h('span', { class: 'badge ' + cls, text: txt })]));
      });
    }
    $('delete').textContent = S.confirmDel ? t('del_ok') : t('del');
  }
  function loadMatches() {
    if (!S.me || S.access !== 'active') { S.matches = null; return Promise.resolve(); }
    return api('/api/matches').then(function (d) { S.matches = d; }).catch(function () { S.matches = null; });
  }

  /* ---------- Malipo (sheet) ---------- */
  function openPay(kind, target) {
    if (!S.me) { show('reg'); return; }
    S.pay = { kind: kind, target: target || null }; S.network = null; renderSheet(); $('sheet').hidden = false;
  }
  function closePay() { $('sheet').hidden = true; S.pay = null; }
  function renderSheet() {
    if (!S.pay) return;
    var reg = S.pay.kind === 'register', fee = reg ? cfg.fees.register : cfg.fees.unlock;
    $('payTitle').textContent = reg ? t('pay_t_reg') : t('pay_t_unl');
    $('fee').textContent = tz(fee);
    $('payTarget').textContent = reg ? '' : t('unlocking', { x: S.pay.target.name + ' (' + S.pay.target.fromRegion + ' > ' + S.pay.target.toRegion + ')' });
    var box = $('netBox'); clear(box);
    cfg.networks.forEach(function (n) {
      var on = S.network === n.id;
      var r = h('input', { type: 'radio', name: 'net', value: n.id });
      if (on) r.checked = true;
      r.addEventListener('change', function () { S.network = n.id; renderSheet(); });
      box.appendChild(h('label', { class: 'net' + (on ? ' on' : '') }, [r, h('span', null, [h('b', { text: n.name }), h('br'),
        h('span', { class: 'meta', text: on ? t('send_to', { fee: tz(fee) }) : t('pick_net') }),
        on ? h('div', { class: 'phone', text: n.number }) : null])]));
    });
    $('payBtn').disabled = !S.network;
  }
  function onPay(e) {
    e.preventDefault();
    var body = { kind: S.pay.kind, network: S.network, reference: $('ref').value };
    if (S.pay.target) body.targetId = S.pay.target.id;
    api('/api/pay', { method: 'POST', body: body }).then(function () {
      toast(t('paid')); $('ref').value = ''; closePay(); refresh();
    }).catch(function (err) { toast(err.message, true); });
  }

  /* ---------- Maoni ---------- */
  function onFeedback(e) {
    e.preventDefault();
    api('/api/feedback', { method: 'POST', body: { name: $('fbName').value, message: $('fbMsg').value } }).then(function () {
      $('fbMsg').value = ''; toast(t('fb_thanks'));
    }).catch(function (err) { toast(err.message, true); });
  }

  /* ---------- Muundo wa jumla ---------- */
  function show(v) {
    S.view = v;
    ['dash', 'reg', 'fb', 'me'].forEach(function (x) { $('v-' + x).hidden = x !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('.nav button'), function (b) { b.className = b.getAttribute('data-v') === v ? 'on' : ''; });
    if (v === 'me') loadMatches().then(renderMe);
    renderAll(); window.scrollTo(0, 0);
  }
  function applyText() {
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i]'), function (el) {
      el.textContent = t(el.getAttribute('data-i'), { fee: tz(cfg.fees.register) });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ip]'), function (el) { el.placeholder = t(el.getAttribute('data-ip')); });
    $('lsw').className = lang === 'sw' ? 'on' : ''; $('len').className = lang === 'en' ? 'on' : '';
    fillRegions($('fFrom'), t('any_region'), true); fillRegions($('fTo'), t('any_region'), true);
    $('fFrom').value = F.from; $('fTo').value = F.to;
  }
  function renderAll() {
    applyText(); renderDash(); renderReg(); renderRegFields();
    if (S.view === 'me') renderMe();
    if (!$('sheet').hidden) renderSheet();
  }
  function refresh() { return loadMe().then(function () { renderAll(); if (S.view === 'me') return loadMatches().then(renderMe); }); }
  function setLang(l) { lang = l; try { localStorage.setItem('ta_lang', l); } catch (e) {} renderAll(); }

  function init() {
    $('fFrom').addEventListener('change', function () { F.from = this.value; F.page = 1; loadList(); });
    $('fTo').addEventListener('change', function () { F.to = this.value; F.page = 1; loadList(); });
    var qt; $('fQ').addEventListener('input', function () { var v = this.value; clearTimeout(qt); qt = setTimeout(function () { F.q = v; F.page = 1; loadList(); }, 300); });
    $('pgPrev').addEventListener('click', function () { F.page = Math.max(1, F.page - 1); loadList(); window.scrollTo(0, 0); });
    $('pgNext').addEventListener('click', function () { F.page += 1; loadList(); window.scrollTo(0, 0); });
    $('fromRegion').addEventListener('change', function () { fillDistricts('fromList', this.value); });
    $('toRegion').addEventListener('change', function () { fillDistricts('toList', this.value); });
    $('regForm').addEventListener('submit', onRegister);
    $('loginForm').addEventListener('submit', onLogin);
    $('payForm').addEventListener('submit', onPay);
    $('fbForm').addEventListener('submit', onFeedback);
    $('payClose').addEventListener('click', closePay);
    $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) closePay(); });
    $('lsw').addEventListener('click', function () { setLang('sw'); });
    $('len').addEventListener('click', function () { setLang('en'); });
    $('showLogin').addEventListener('click', function () { show('me'); });
    $('goProfile').addEventListener('click', function () { show('me'); });
    Array.prototype.forEach.call(document.querySelectorAll('.nav button'), function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-v')); }); });
    $('logout').addEventListener('click', function () { setToken(null); S.me = null; S.access = ''; S.matches = null; closePay(); show('dash'); });
    $('delete').addEventListener('click', function () {
      if (!S.confirmDel) { S.confirmDel = true; renderMe(); return; }
      api('/api/me/delete', { method: 'POST' }).then(function () { S.confirmDel = false; setToken(null); S.me = null; S.access = ''; show('dash'); toast(t('deleted')); })
        .catch(function (err) { toast(err.message, true); });
    });
    $('fab').href = 'https://wa.me/' + cfg.support.whatsapp;
    $('wa').href = 'https://wa.me/' + cfg.support.whatsapp; $('wa').textContent = '+' + cfg.support.whatsapp;
    $('mail').textContent = cfg.support.email; $('mail').href = 'mailto:' + cfg.support.email;
    $('wa2').href = 'https://wa.me/' + cfg.support.whatsapp; $('wa2').textContent = '+' + cfg.support.whatsapp;
    $('mail2').textContent = cfg.support.email; $('mail2').href = 'mailto:' + cfg.support.email;
    renderAll();
    loadMe().then(function () { renderAll(); });
    setInterval(function () {
      if (S.token && S.me && !S.me.active && S.access === 'pending') {
        loadMe().then(function () { if (S.me && S.me.active) { toast(t('active_now')); renderAll(); } });
      } else if (S.token && S.payments.some(function (p) { return p.status === 'pending'; })) {
        loadMe().then(function () { if (S.view === 'dash') loadList(); else renderAll(); });
      }
    }, 20000);
  }
  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) { cfg = c; init(); })
    .catch(function () { document.body.insertBefore(h('p', { text: t('load_fail') }), document.body.firstChild); });
})();
`;

const ICON = {
  dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  reg: '<svg viewBox="0 0 24 24"><path d="M4 12h13M13 6l6 6-6 6"/><path d="M4 5v14"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.200zm4.5-6.1c-.2-.1-1.500-.7-1.700-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.200-.3.200-.5.100a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.200-.4.600-1.200.1-.2 0-.3 0-.5l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.300 3 3 0 0 0-.9 2.200c0 1.300.9 2.500 1 2.700.1.200 1.800 2.800 4.400 3.900 1.600.7 2.200.7 3 .6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.1-.3-.2-.5-.3z"/></svg>'
};

const INDEX_HTML = '<!doctype html><html lang="sw"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="color-scheme" content="light dark"><title>TRANSFER APP</title><style>' + STYLE + '</style></head><body>' +
  '<div class="wrap">' +
  '<header><div class="top"><h1>TRANSFER APP</h1><div class="lang"><button id="lsw" type="button">SW</button><button id="len" type="button">EN</button></div></div>' +
  '<div class="flag"><i></i><i></i><i></i><i></i></div><p class="tag" data-i="tag"></p></header>' +

  /* Dashibodi */
  '<main id="v-dash"><div id="gate"></div><div id="dashBody" hidden>' +
  '<div class="scroll" id="dCadre"></div><div class="scroll" id="dSub"></div>' +
  '<div class="filters"><div><label for="fFrom" data-i="f_from"></label><select id="fFrom"></select></div>' +
  '<div><label for="fTo" data-i="f_to"></label><select id="fTo"></select></div>' +
  '<div class="full"><input id="fQ" type="search" data-ip="search" autocomplete="off" aria-label="Search"></div></div>' +
  '<p class="meta" id="dCount"></p><div id="dList"></div>' +
  '<div class="pager" id="pager" hidden><button id="pgPrev" type="button"></button><span id="pgLabel"></span><button id="pgNext" type="button"></button></div>' +
  '</div></main>' +

  /* Sajili */
  '<main id="v-reg" hidden><section class="box" id="regDone" hidden><p data-i="already_reg"></p><button class="btn" id="goProfile" type="button" data-i="nav_me"></button></section>' +
  '<section class="box" id="regPick"><h2 data-i="reg_t"></h2><div class="scroll" id="rCadre"></div><div class="scroll" id="rSub"></div>' +
  '<p class="path" id="rPath"></p><p class="note" data-i="scroll_hint"></p></section>' +
  '<section class="box"><form id="regForm" autocomplete="off"><h2 data-i="your_info"></h2>' +
  '<div id="subjectWrap" hidden><label for="subject" data-i="subject"></label><select id="subject"></select></div>' +
  '<div id="otherWrap" hidden><label for="other" data-i="other_prof"></label><input id="other" maxlength="60"></div>' +
  '<label for="fullName" data-i="fullname"></label><input id="fullName" maxlength="80" required>' +
  '<div class="grid"><div><label for="fromRegion" data-i="from_region"></label><select id="fromRegion" required></select></div>' +
  '<div><label for="fromDistrict" data-i="from_district"></label><input id="fromDistrict" list="fromList" maxlength="60" required><datalist id="fromList"></datalist></div></div>' +
  '<div class="grid"><div><label for="toRegion" data-i="to_region"></label><select id="toRegion" required></select></div>' +
  '<div><label for="toDistrict" data-i="to_district"></label><input id="toDistrict" list="toList" maxlength="60"><datalist id="toList"></datalist></div></div>' +
  '<div class="grid"><div><label for="gender" data-i="gender"></label><select id="gender" required></select></div>' +
  '<div><label for="years" data-i="years_lbl"></label><input id="years" type="number" inputmode="numeric" min="0" max="45" required></div></div>' +
  '<label for="phone" data-i="phone"></label><input id="phone" type="tel" inputmode="tel" placeholder="0712345678" required>' +
  '<label for="pin" data-i="pin"></label><input id="pin" type="password" inputmode="numeric" maxlength="6" required>' +
  '<p class="note" data-i="priv"></p><button class="btn" type="submit" data-i="reg_btn"></button>' +
  '<p class="note"><span data-i="have"></span> <button class="link" id="showLogin" type="button" data-i="login_btn"></button></p></form></section></main>' +

  /* Maoni */
  '<main id="v-fb" hidden><section class="box"><h2 data-i="fb_t"></h2><form id="fbForm"><label for="fbName" data-i="fb_name"></label><input id="fbName" maxlength="60">' +
  '<label for="fbMsg" data-i="fb_msg"></label><textarea id="fbMsg" maxlength="500" required></textarea><button class="btn" type="submit" data-i="fb_send"></button></form></section>' +
  '<section class="box"><h2 data-i="support"></h2><p><a id="mail2" href="#"></a></p><p><a id="wa2" href="#" target="_blank" rel="noopener"></a></p></section></main>' +

  /* Wasifu */
  '<main id="v-me" hidden><section class="box" id="meOut"><h2 data-i="login_btn"></h2><p class="note" data-i="need_login"></p>' +
  '<form id="loginForm"><label for="lphone" data-i="phone_s"></label><input id="lphone" type="tel" inputmode="tel" required>' +
  '<label for="lpin">PIN</label><input id="lpin" type="password" inputmode="numeric" maxlength="6" required>' +
  '<button class="btn" type="submit" data-i="login_btn"></button></form></section>' +
  '<div id="meIn" hidden><section class="box"><div class="row"><h2 data-i="my_req"></h2><div class="row"><button class="btn sec" id="logout" type="button" data-i="logout"></button>' +
  '<button class="btn sec" id="delete" type="button"></button></div></div><div id="meBody"></div><div id="myPays"></div></section>' +
  '<section class="box"><h2 data-i="my_matches"></h2><div id="matchBox"></div></section></div></main>' +

  '<footer><p><a id="mail" href="#"></a> | <a id="wa" href="#" target="_blank" rel="noopener"></a></p></footer></div>' +

  '<a class="fab" id="fab" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '</a>' +
  '<nav class="nav"><button type="button" data-v="dash" class="on">' + ICON.dash + '<span data-i="nav_dash"></span></button>' +
  '<button type="button" data-v="reg">' + ICON.reg + '<span data-i="nav_reg"></span></button>' +
  '<button type="button" data-v="fb">' + ICON.fb + '<span data-i="nav_fb"></span></button>' +
  '<button type="button" data-v="me">' + ICON.me + '<span data-i="nav_me"></span></button></nav>' +

  '<div class="sheet" id="sheet" hidden><div class="sheetbox" role="dialog" aria-modal="true" aria-labelledby="payTitle">' +
  '<div class="row"><h2 id="payTitle"></h2><button class="btn sec" id="payClose" type="button" data-i="close"></button></div>' +
  '<div class="meta" data-i="fee_lbl"></div><div class="fee" id="fee"></div><p class="note" id="payTarget"></p>' +
  '<p class="note" data-i="pay_note"></p><div id="netBox"></div>' +
  '<form id="payForm"><label for="ref" data-i="ref_lbl"></label><input id="ref" maxlength="30" placeholder="8K2LQ9XT4A" autocomplete="off" required>' +
  '<p class="note" data-i="ref_note"></p><button class="btn" id="payBtn" type="submit" data-i="pay_btn" disabled></button></form></div></div>' +
  '<div id="toast" role="status" aria-live="polite"></div><script>' + CLIENT_JS + '</script></body></html>';

const ADMIN_JS = String.raw`
(function () {
  var pw = '';
  try { pw = sessionStorage.getItem('ta_admin') || ''; } catch (e) {}
  function $(id) { return document.getElementById(id); }
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) for (var k in props) { if (k === 'text') e.textContent = props[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]); else e.setAttribute(k, props[k]); }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function tz(n) { return 'TZS ' + Number(n).toLocaleString('en-US'); }
  function call(path, body) {
    return fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Hitilafu'); return d; }); });
  }
  function load() {
    call('/api/admin/overview').then(function (d) {
      $('login').hidden = true; $('panel').hidden = false; $('err').textContent = '';
      var pend = d.payments.filter(function (p) { return p.status === 'pending'; });
      $('stats').textContent = 'Maombi: ' + d.listings.length + '  |  Malipo yanayosubiri: ' + pend.length + '  |  Mapato yaliyothibitishwa: ' + tz(d.revenue);
      var pb = $('payBody'); clear(pb);
      d.payments.forEach(function (p) {
        var act = h('td');
        if (p.status === 'pending') {
          act.appendChild(h('div', { class: 'act' }, [
            h('button', { text: 'Thibitisha', onclick: function () { decide(p.id, 'approve'); } }),
            h('button', { text: 'Kataa', onclick: function () { decide(p.id, 'reject'); } })]));
        } else act.textContent = p.status === 'approved' ? 'Imethibitishwa' : 'Imekataliwa';
        pb.appendChild(h('tr', null, [h('td', { text: new Date(p.createdAt).toLocaleString() }), h('td', { text: p.kind === 'register' ? 'Usajili' : 'Kufungua' }),
          h('td', { text: p.payer }), h('td', { text: p.target }), h('td', { text: (d.networks[p.network] || {}).name || p.network }),
          h('td', { text: p.reference }), h('td', { text: tz(p.amount) }), act]));
      });
      var lb = $('listBody'); clear(lb);
      d.listings.forEach(function (l) {
        lb.appendChild(h('tr', null, [h('td', { text: l.fullName }), h('td', { text: l.phone }),
          h('td', { text: l.cadreName + ' > ' + l.specialty + (l.subject ? ' > ' + l.subject : '') }),
          h('td', { text: l.fromRegion + (l.fromDistrict ? ' (' + l.fromDistrict + ')' : '') + ' -> ' + l.toRegion + (l.toDistrict ? ' (' + l.toDistrict + ')' : '') }),
          h('td', { text: l.years == null ? '' : String(l.years) }), h('td', { text: l.gender }), h('td', { text: l.active ? 'Amelipa' : 'Hajalipa' }),
          h('td', null, [h('div', { class: 'act' }, [h('button', { text: 'Futa', onclick: function () { if (this.getAttribute('data-c')) { call('/api/admin/delete-listing', { id: l.id }).then(load); } else { this.setAttribute('data-c', '1'); this.textContent = 'Hakika?'; } } })])])]));
      });
      var fb = $('fbBody'); clear(fb);
      d.feedback.forEach(function (f) {
        fb.appendChild(h('tr', null, [h('td', { text: new Date(f.createdAt).toLocaleString() }), h('td', { text: (f.name || '') + (f.phone ? ' (' + f.phone + ')' : '') }),
          h('td', { text: f.message, style: 'white-space:normal;min-width:220px' })]));
      });
    }).catch(function (e) { $('login').hidden = false; $('panel').hidden = true; $('err').textContent = pw ? e.message : ''; });
  }
  function decide(id, action) { call('/api/admin/payment', { id: id, action: action }).then(load).catch(function (e) { $('err').textContent = e.message; }); }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); pw = $('pw').value; try { sessionStorage.setItem('ta_admin', pw); } catch (x) {} load();
  });
  $('refresh').addEventListener('click', load);
  if (pw) load();
})();
`;

const ADMIN_HTML = '<!doctype html><html lang="sw"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="color-scheme" content="light dark"><title>TRANSFER APP Admin</title><style>' + STYLE + '</style></head><body style="padding-bottom:30px"><div class="wrap">' +
  '<header><h1>ADMIN</h1><div class="flag"><i></i><i></i><i></i><i></i></div></header>' +
  '<section class="box" id="login"><h2>Ingia kama admin</h2><form id="loginForm"><label for="pw">Nenosiri</label><input id="pw" type="password" required>' +
  '<button class="btn" type="submit">Ingia</button></form></section><p class="bad" id="err"></p>' +
  '<div id="panel" hidden><section class="box"><div class="row"><h2>Muhtasari</h2><button class="btn sec" id="refresh" type="button">Onyesha upya</button></div><p id="stats"></p></section>' +
  '<section class="box"><h2>Malipo</h2><div class="tbl"><table><thead><tr><th>Muda</th><th>Aina</th><th>Mlipaji</th><th>Anayefunguliwa</th><th>Mtandao</th><th>Muamala</th><th>Kiasi</th><th>Hatua</th></tr></thead><tbody id="payBody"></tbody></table></div>' +
  '<p class="note">Linganisha namba ya muamala na ujumbe wa pesa uliopokea kwenye simu yako kabla ya kuthibitisha. Usajili ukithibitishwa, mtu huyo anaanza kuona orodha.</p></section>' +
  '<section class="box"><h2>Maombi yote (namba kamili)</h2><div class="tbl"><table><thead><tr><th>Jina</th><th>Simu</th><th>Kada</th><th>Mkoa</th><th>Miaka</th><th>Jinsia</th><th>Usajili</th><th></th></tr></thead><tbody id="listBody"></tbody></table></div></section>' +
  '<section class="box"><h2>Maoni</h2><div class="tbl"><table><thead><tr><th>Muda</th><th>Mtumaji</th><th>Maoni</th></tr></thead><tbody id="fbBody"></tbody></table></div></section></div></div>' +
  '<script>' + ADMIN_JS + '</script></body></html>';

/* ---------- Seva ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) return await api(req, res, url);
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      return res.end(INDEX_HTML);
    }
    if (req.method === 'GET' && url === '/admin') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      return res.end(ADMIN_HTML);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Haipatikani');
  } catch (e) {
    if (!res.headersSent) send(res, 400, { error: e.message || 'Hitilafu' }); else res.end();
  }
});
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  TRANSFER APP inaendesha');
  console.log('  Ukurasa wa watumiaji : http://localhost:' + PORT + '/');
  console.log('  Ukurasa wa admin     : http://localhost:' + PORT + '/admin');
  console.log('  Nenosiri la admin    : ' + adminPassword() + (process.env.ADMIN_PASSWORD ? '  (kutoka ADMIN_PASSWORD)' : '  (limehifadhiwa kwenye transfer-data.json)'));
  console.log('  Ada: usajili TZS ' + FEES.register + ', kufungua mawasiliano TZS ' + FEES.unlock);
  console.log('  Simamisha kwa Ctrl+C\n');
});
