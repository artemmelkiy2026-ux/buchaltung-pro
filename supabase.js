// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;

// ── PIN / INACTIVITY ───────────────────────────────────────────────────────
const PIN_TIMEOUT = 1 * 60 * 1000;
let inactivityTimer = null;
let pinValue = '';
let pinFirstValue = '';
let pinMode = 'unlock';
let pinSetupStep = 1;
let isAppUnlocked = false;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (!isAppUnlocked) return;
    const storedPin = localStorage.getItem('bp_pin');
    if (storedPin) {
      isAppUnlocked = false;
      sessionStorage.removeItem('pin_unlocked');
      sessionStorage.setItem('pin_return', 'index.html');
      location.replace('pin.html');
    }
  }, PIN_TIMEOUT);
}

function startInactivityWatch() {
  ['mousemove','keydown','touchstart','click'].forEach(ev =>
    document.addEventListener(ev, resetInactivityTimer)
  );
  resetInactivityTimer();
}

// ── AUTH ───────────────────────────────────────────────────────────────────
async function sbSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
async function sbSignUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
window.sbSignOut = async function() {
  try { await sb.auth.signOut(); } catch(e) { console.error('SignOut error:', e); }
  currentUser = null;
  location.href = 'login.html';
};

// ── PIN HASH SHA-256 (ФИХ: заменили btoa) ─────────────────────────────────
async function pinToHash(pin) {
  const data = new TextEncoder().encode(pin + '_bp_salt_2026');
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── DATA ───────────────────────────────────────────────────────────────────
async function sbLoadAll() {
  if (!currentUser) return null;
  const uid = currentUser.id;
  const [ein, kun, rech, rechPos, wied, ustM, ustE] = await Promise.all([
    sb.from('eintraege').select('*').eq('user_id', uid).order('datum', { ascending: false }),
    sb.from('kunden').select('*').eq('user_id', uid).order('name'),
    sb.from('rechnungen').select('*').eq('user_id', uid).order('datum', { ascending: false }),
    sb.from('rechnungen_pos').select('*').eq('user_id', uid),
    sb.from('wiederkehrend').select('*').eq('user_id', uid),
    sb.from('ust_mode').select('*').eq('user_id', uid),
    sb.from('ust_eintraege').select('*').eq('user_id', uid).order('datum', { ascending: false }),
  ]);
  const eintraege     = (ein.data  || []).map(dbToEintrag);
  // GoBD: восстанавливаем _storniert для оригиналов после перезагрузки
  const stornoOfIds = new Set(eintraege.filter(e => e.is_storno && e.storno_of).map(e => e.storno_of));
  eintraege.forEach(e => { if (stornoOfIds.has(e.id)) e._storniert = true; });
  const kunden        = (kun.data  || []).map(dbToKunde);
  const rechnungen    = (rech.data || []).map(r => dbToRechnung(r, rechPos.data || []));
  const wiederkehrend = (wied.data || []).map(dbToWied);
  const ustEintraege  = (ustE.data || []).map(dbToUstEintrag);
  const ustModeByYear = {};
  (ustM.data || []).forEach(r => { ustModeByYear[r.jahr] = r.mode; });
  return { eintraege, kunden, rechnungen, wiederkehrend, ustModeByYear, ustEintraege };
}

// ФИХ: один запрос вместо двух (sbLoadPin + отдельный user_data)
async function sbLoadUserData() {
  if (!currentUser) return { pin_hash: null, deleted_at: null, disclaimer_accepted: false };
  const { data } = await sb.from('user_data')
    .select('pin_hash, deleted_at, disclaimer_accepted, client_id, logo, firma_name, firma_strasse, firma_plz, firma_ort, firma_tel, firma_email, firma_iban, firma_bic, firma_steuernr, firma_ustid, firma_footer')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  return data || { pin_hash: null, deleted_at: null, disclaimer_accepted: false };
}

// Оставляем для совместимости с profile.html и pin.html
async function sbLoadPin() {
  const d = await sbLoadUserData();
  return d.pin_hash || null;
}

// ── CONVERTERS ─────────────────────────────────────────────────────────────
function dbToEintrag(r) {
  return { id:r.id, datum:r.datum, typ:r.typ, kategorie:r.kategorie||'', beschreibung:r.beschreibung||'', betrag:parseFloat(r.betrag)||0, zahlungsart:r.zahlungsart||'Sonstiges', notiz:r.notiz||'', mwstRate:parseFloat(r.mwst_rate)||0, mwstBetrag:parseFloat(r.mwst_betrag)||0, nettoBetrag:parseFloat(r.netto_betrag)||0, vorsteuerRate:parseFloat(r.vorsteuer_rate)||0, vorsteuerBet:parseFloat(r.vorsteuer_bet)||0, mwstMode:r.mwst_mode||'§19', is_storno:r.is_storno||false, storno_of:r.storno_of||null, korrektur_von:r.korrektur_von||null };
}
function dbToKunde(r) {
  return { id:r.id, name:r.name||'', ansprechpartner:r.ansprechpartner||'', email:r.email||'', tel:r.tel||'', strasse:r.strasse||'', plz:r.plz||'', ort:r.ort||'', iban:r.iban||'', ustid:r.ustid||'', notiz:r.notiz||'' };
}
function dbToRechnung(r, allPos) {
  const pos = allPos.filter(p => p.rechnung_id === r.id).map(p => {
    const netto = parseFloat(p.einzelpreis) || 0;
    const rate  = parseFloat(p.mwst_rate)  || 0;
    return { id:p.id, beschreibung:p.beschreibung||'', bez:p.beschreibung||'', menge:parseFloat(p.menge)||1, einheit:p.einheit||'Stk.', einzelpreis:netto, netto, preis:netto, mwstRate:rate, rate, brutto:netto*(1+rate/100) };
  });
  return { id:r.id, nr:r.nr||'', datum:r.datum||'', faellig:r.faellig||'', kunde:r.kunde||'', kundeId:r.kunde_id||'', adresse:r.adresse||'', email:r.email||'', tel:r.tel||'', betrag:parseFloat(r.betrag)||0, status:r.status||'offen', mwstMode:r.mwst_mode||'§19', notiz:r.notiz||'', wa:r.wa||'', positionen:pos };
}
function dbToWied(r) {
  return { id:r.id, typ:r.typ||'Ausgabe', kategorie:r.kategorie||'', bezeichnung:r.bezeichnung||r.beschreibung||'', beschreibung:r.beschreibung||r.bezeichnung||'', betrag:parseFloat(r.betrag)||0, zahlungsart:r.zahlungsart||'Sonstiges', intervall:r.intervall||'monatlich', naechste:r.naechste||'' };
}
function dbToUstEintrag(r) {
  const m = { 'Ausgang':'ust', 'Vorsteuer':'vorsteuer', 'ust':'ust', 'vorsteuer':'vorsteuer' };
  return { id:r.id, datum:r.datum, typ:m[r.typ]||r.typ, betrag:parseFloat(r.betrag)||0, rate:parseFloat(r.rate)||0, beschreibung:r.beschreibung||'', quelle:'Manual' };
}
function eintragToDb(e) {
  return { id:e.id, user_id:currentUser.id, datum:e.datum, typ:e.typ, kategorie:e.kategorie||null, beschreibung:e.beschreibung||null, betrag:e.betrag||0, zahlungsart:e.zahlungsart||null, notiz:e.notiz||null, mwst_rate:e.mwstRate||0, mwst_betrag:e.mwstBetrag||0, netto_betrag:e.nettoBetrag||0, vorsteuer_rate:e.vorsteuerRate||0, vorsteuer_bet:e.vorsteuerBet||0, mwst_mode:e.mwstMode||'§19', is_storno:e.is_storno||false, storno_of:e.storno_of||null, korrektur_von:e.korrektur_von||null };
}
function kundeToDb(k) {
  return { id:k.id, user_id:currentUser.id, name:k.name||'', ansprechpartner:k.ansprechpartner||null, email:k.email||null, tel:k.tel||null, strasse:k.strasse||null, plz:k.plz||null, ort:k.ort||null, iban:k.iban||null, ustid:k.ustid||null, notiz:k.notiz||null };
}
function rechnungToDb(r) {
  return { id:r.id, user_id:currentUser.id, nr:r.nr||null, datum:r.datum||null, faellig:r.faellig||null, kunde:r.kunde||null, kunde_id:r.kundeId||null, adresse:r.adresse||null, email:r.email||null, tel:r.tel||null, betrag:r.betrag||0, status:r.status||'offen', mwst_mode:r.mwstMode||'§19', notiz:r.notiz||null, wa:r.wa||null };
}
function posToDb(pos, rechnungId) {
  const beschreibung = pos.beschreibung || pos.bez || null;
  const einzelpreis  = pos.einzelpreis !== undefined ? pos.einzelpreis : pos.netto !== undefined ? pos.netto : 0;
  const mwst_rate    = pos.mwstRate !== undefined ? pos.mwstRate : pos.rate !== undefined ? pos.rate : 0;
  const id = pos.id || (Date.now() + '_' + Math.random().toString(36).slice(2,7));
  return { id, user_id:currentUser.id, rechnung_id:rechnungId, beschreibung, menge:pos.menge||1, einheit:pos.einheit||'Stk.', einzelpreis, mwst_rate };
}
function wiedToDb(w) {
  return { id:w.id, user_id:currentUser.id, typ:w.typ||'Ausgabe', kategorie:w.kategorie||null, bezeichnung:w.bezeichnung||w.beschreibung||null, beschreibung:w.bezeichnung||w.beschreibung||null, betrag:w.betrag||0, zahlungsart:w.zahlungsart||null, intervall:w.intervall||'monatlich', naechste:w.naechste||null };
}
function ustEintragToDb(e) {
  const m = { 'ust':'Ausgang', 'vorsteuer':'Vorsteuer', 'Ausgang':'Ausgang', 'Vorsteuer':'Vorsteuer' };
  return { id:e.id, user_id:currentUser.id, datum:e.datum, typ:m[e.typ]||e.typ, betrag:e.betrag, rate:e.rate||0, beschreibung:e.beschreibung||'' };
}

// ── SAVE / DELETE ──────────────────────────────────────────────────────────
async function sbSaveEintrag(e) {
  if (!currentUser) { console.warn('sbSaveEintrag: no user'); return; }
  const {error} = await sb.from('eintraege').upsert(eintragToDb(e), {onConflict:'id'});
  if (error) console.error('Save eintrag:', error);
}
async function sbStornoEintrag(id) {
  if (!currentUser) return;
  // GoBD: физическое удаление запрещено — создаём сторно-запись
  const orig = data.eintraege.find(x => x.id === id);
  if (!orig) return;
  const stornoId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const storno = {
    id: stornoId,
    user_id: currentUser.id,
    datum: new Date().toISOString().split('T')[0],
    typ: orig.typ === 'Einnahme' ? 'Ausgabe' : 'Einnahme',
    kategorie: orig.kategorie,
    beschreibung: 'STORNO: ' + (orig.beschreibung || orig.kategorie),
    betrag: orig.betrag,
    zahlungsart: orig.zahlungsart || 'Überweisung',
    notiz: 'Storno von Eintrag ' + id,
    mwstRate: orig.mwstRate || 0,
    mwstBetrag: orig.mwstBetrag || 0,
    nettoBetrag: orig.nettoBetrag || orig.betrag,
    mwstMode: orig.mwstMode || '§19',
    storno_of: id,
    is_storno: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Помечаем оригинал как сторнированный (скрывается из расчётов)
  // Оригинал помечаем через notiz — is_storno остаётся false (is_storno=true только у Gegenbuchung)
  // Для Journal достаточно что сторно-запись ссылается на оригинал через storno_of
  await sb.from('eintraege').update({ is_storno: false }).eq('id', id).eq('user_id', currentUser.id);
  // Помечаем локально
  const origLocal = data.eintraege.find(x => x.id === id);
  if (origLocal) { origLocal._storniert = true; } // is_storno остаётся false — только Gegenbuchung имеет is_storno=true
  // Сохраняем сторно-запись
  const { error } = await sb.from('eintraege').insert(eintragToDb(storno));
  if (error) { console.error('Storno error:', error); return null; }
  return storno;
}
async function sbSaveKunde(k) {
  if (!currentUser) { console.warn('sbSaveKunde: no user'); return; }
  const {error} = await sb.from('kunden').upsert(kundeToDb(k), {onConflict:'id'});
  if (error) console.error('Save kunde:', error);
}
async function sbDeleteKunde(id) {
  if (!currentUser) return;
  await sb.from('kunden').delete().eq('id',id).eq('user_id',currentUser.id);
}
async function sbSaveRechnung(r) {
  if (!currentUser) { console.warn('sbSaveRechnung: no user'); return; }
  const { error: rErr } = await sb.from('rechnungen').upsert(rechnungToDb(r), {onConflict:'id'});
  if (rErr) { console.error('Save rechnung:', rErr); return; }
  if (r.positionen && r.positionen.length) {
    await sb.from('rechnungen_pos').delete().eq('rechnung_id',r.id).eq('user_id',currentUser.id);
    const { error: pErr } = await sb.from('rechnungen_pos').insert(r.positionen.map(p => posToDb(p, r.id)));
    if (pErr) console.error('Save pos:', pErr);
  }
}
async function sbDeleteRechnung(id) {
  if (!currentUser) return;
  await sb.from('rechnungen_pos').delete().eq('rechnung_id',id).eq('user_id',currentUser.id);
  await sb.from('rechnungen').delete().eq('id',id).eq('user_id',currentUser.id);
}
async function sbSaveWied(w)       { await sb.from('wiederkehrend').upsert(wiedToDb(w), {onConflict:'id'}); }
async function sbDeleteWied(id)    { await sb.from('wiederkehrend').delete().eq('id',id).eq('user_id',currentUser.id); }
async function sbSaveUstMode(j,m)  { await sb.from('ust_mode').upsert({user_id:currentUser.id,jahr:j,mode:m},{onConflict:'user_id,jahr'}); }
async function sbSaveUstEintrag(e) {
  if (!currentUser) return;
  const {error} = await sb.from('ust_eintraege').upsert(ustEintragToDb(e), {onConflict:'id'});
  if (error) console.error('Save ust_eintrag:', error);
}
async function sbDeleteUstEintrag(id) {
  if (!currentUser) return;
  await sb.from('ust_eintraege').delete().eq('id',id).eq('user_id',currentUser.id);
}

// ── PIN в Supabase ─────────────────────────────────────────────────────────
async function sbSavePin(hash) {
  if (!currentUser) return;
  await sb.from('user_data').upsert({ user_id:currentUser.id, pin_hash:hash }, { onConflict:'user_id' });
}
async function sbDeletePin() {
  if (!currentUser) return;
  await sb.from('user_data').upsert({ user_id:currentUser.id, pin_hash:null }, { onConflict:'user_id' });
}

// ── Баннер удаления аккаунта ───────────────────────────────────────────────
function showDeletionBanner(daysLeft) {
  if (document.getElementById('deletion-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'deletion-banner';
  banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#e08c1a;color:#fff;border-radius:16px;padding:14px 20px;display:flex;align-items:center;gap:14px;z-index:9998;box-shadow:0 8px 32px rgba(224,140,26,.4);font-family:inherit;max-width:380px;width:calc(100% - 32px)';
  banner.innerHTML = `
    <i class="fa-solid fa-triangle-exclamation" style="font-size:22px;flex-shrink:0"></i>
    <div style="flex:1;font-size:13px">
      <div style="font-weight:600;margin-bottom:2px">Konto wird gelöscht</div>
      <div style="opacity:.9;font-size:12px">Noch ${daysLeft} Tage bis zur Löschung</div>
    </div>
    <button onclick="cancelDeletionFromApp()" style="background:#fff;border:none;border-radius:8px;color:#e08c1a;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Widerrufen</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 10000);
}
async function cancelDeletionFromApp() {
  if (!currentUser) return;
  await sb.from('user_data').upsert({ user_id:currentUser.id, deleted_at:null }, { onConflict:'user_id' });
  document.getElementById('deletion-banner')?.remove();
  if (typeof toast === 'function') toast('✓ Kontolöschung widerrufen');
}

// ── SCREENS ────────────────────────────────────────────────────────────────
function showAuthScreen() { location.href = 'login.html'; }

function hideAuthScreen() {
  const ls = document.getElementById('loading-screen');
  const aw = document.getElementById('app-wrapper');
  if (ls) { ls.style.display='none'; ls.style.pointerEvents='none'; ls.style.visibility='hidden'; }
  if (aw) aw.style.display = 'block';
  isAppUnlocked = true;
  startInactivityWatch();
}

function showPinScreen(mode) {
  if (mode === 'unlock') {
    sessionStorage.removeItem('pin_unlocked');
    sessionStorage.setItem('pin_return', 'index.html');
    location.replace('pin.html');
    return;
  }
  pinMode = mode; pinValue = '';
  if (typeof updatePinDots === 'function') updatePinDots();
  const errEl = document.getElementById('pin-error');
  if (errEl) errEl.textContent = '';
  pinSetupStep = 1; pinFirstValue = '';
  const sub = document.getElementById('pin-subtitle');
  if (sub) sub.textContent = 'PIN festlegen (1/2)';
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
  const aw = document.getElementById('app-wrapper');
  if (aw) aw.style.display = 'none';
}

// ── PIN BANNERS ────────────────────────────────────────────────────────────
function offerPinSetup() {
  if (document.getElementById('pin-offer-banner')) return;
  const b = document.createElement('div');
  b.id = 'pin-offer-banner';
  b.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a4578;color:#fff;border-radius:16px;padding:18px 24px;display:flex;align-items:center;gap:16px;z-index:99999;font-family:sans-serif;max-width:400px;width:calc(100% - 48px);flex-direction:column';
  b.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;width:100%">
      <span style="font-size:28px"><i class="fa-solid fa-lock"></i></span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">PIN-Code einrichten?</div>
        <div style="font-size:12px;opacity:.8">Schneller Zugang mit 4-stelligem PIN</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="document.getElementById('pin-offer-banner').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;padding:8px 12px;font-size:12px;cursor:pointer">Nein</button>
        <button onclick="document.getElementById('pin-offer-banner').remove();location.href='profile.html'" style="background:#fff;border:none;border-radius:8px;color:#1a4578;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer">Ja ✓</button>
      </div>
    </div>
    <button onclick="document.getElementById('pin-offer-banner').remove();localStorage.setItem('bp_pin_skipped','1')" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:rgba(255,255,255,.6);padding:6px 14px;font-size:11px;cursor:pointer;width:100%">Nicht mehr vorschlagen</button>
  `;
  document.body.appendChild(b);
  setTimeout(() => { if (b.parentNode) b.remove(); }, 15000);
}

function offerPinRestore() {
  if (document.getElementById('pin-offer-banner')) return;
  if (localStorage.getItem('bp_pin_removed_skipped') === '1') return;
  const b = document.createElement('div');
  b.id = 'pin-offer-banner';
  b.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgb(40 40 40);color:#fff;border-radius:16px;padding:18px 24px;display:flex;align-items:center;gap:16px;z-index:99999;font-family:sans-serif;max-width:400px;width:calc(100% - 48px);flex-direction:column';
  b.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;width:100%">
      <span style="font-size:28px">⚠</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">Sicherheit gefährdet!</div>
        <div style="font-size:12px;opacity:.85">PIN-Schutz ist deaktiviert. Jetzt einrichten?</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="document.getElementById('pin-offer-banner').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;padding:8px 12px;font-size:12px;cursor:pointer">Nein</button>
        <button onclick="document.getElementById('pin-offer-banner').remove();location.href='profile.html'" style="background:#fff;border:none;border-radius:8px;color:#000000;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer">Ja ✓</button>
      </div>
    </div>
    <button onclick="document.getElementById('pin-offer-banner').remove();localStorage.setItem('bp_pin_removed_skipped','1')" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:rgba(255,255,255,.6);padding:6px 14px;font-size:11px;cursor:pointer;width:100%">Nicht mehr vorschlagen</button>
  `;
  document.body.appendChild(b);
  setTimeout(() => { if (b.parentNode) b.remove(); }, 15000);
}

// ── PIN LOGIC ──────────────────────────────────────────────────────────────
function pinPress(digit) {
  if (pinValue.length >= 4) return;
  pinValue += digit;
  updatePinDots();
  if (navigator.vibrate) navigator.vibrate(30);
  if (pinValue.length === 4) setTimeout(pinConfirm, 150);
}
function pinBackspace() { pinValue = pinValue.slice(0,-1); updatePinDots(); }

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pin-dot-' + i);
    if (!dot) continue;
    dot.classList.toggle('filled', i < pinValue.length);
    dot.classList.remove('error');
  }
}

function pinUnlockSuccess() {
  pinValue = '';
  isAppUnlocked = true;
  resetInactivityTimer();
  if (typeof window._unlockApp === 'function') window._unlockApp();
}

// ФИХ: async, использует SHA-256 pinToHash
async function pinConfirm() {
  if (pinMode === 'setup') {
    if (pinSetupStep === 1) {
      pinFirstValue = pinValue; pinValue = ''; updatePinDots();
      pinSetupStep = 2;
      const sub = document.getElementById('pin-subtitle');
      if (sub) sub.textContent = 'PIN wiederholen (2/2)';
      return;
    }
    if (pinValue !== pinFirstValue) {
      pinValue = ''; pinFirstValue = ''; pinSetupStep = 1;
      const err = document.getElementById('pin-error');
      if (err) err.textContent = '✗ PINs stimmen nicht überein';
      if (navigator.vibrate) navigator.vibrate([100,50,100]);
      for (let i=0;i<4;i++) { const d=document.getElementById('pin-dot-'+i); if(d) d.classList.add('error'); }
      setTimeout(() => {
        updatePinDots();
        const e2=document.getElementById('pin-error'); if(e2) e2.textContent='';
        const s2=document.getElementById('pin-subtitle'); if(s2) s2.textContent='PIN festlegen (1/2)';
      }, 1000);
      return;
    }
    const hash = await pinToHash(pinValue);
    localStorage.setItem('bp_pin', hash);
    sbSavePin(hash).then(() => { if (typeof toast==='function') toast('✓ PIN gesetzt!','ok'); });
    pinValue=''; pinFirstValue=''; pinSetupStep=1; updatePinDots();
    const aw = document.getElementById('app-wrapper'); if(aw) aw.style.display='block';
    isAppUnlocked = true;
  } else {
    const stored = localStorage.getItem('bp_pin');
    const hash   = await pinToHash(pinValue);
    if (hash === stored) {
      pinUnlockSuccess();
    } else {
      pinValue = '';
      const err = document.getElementById('pin-error'); if(err) err.textContent='✗ Falscher PIN';
      if (navigator.vibrate) navigator.vibrate([100,50,100]);
      for (let i=0;i<4;i++) { const d=document.getElementById('pin-dot-'+i); if(d) d.classList.add('error'); }
      setTimeout(() => { updatePinDots(); const e2=document.getElementById('pin-error'); if(e2) e2.textContent=''; }, 900);
    }
  }
}

function pinLogout() { sbSignOut(); }

// ── BIOMETRIC ──────────────────────────────────────────────────────────────
async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch { return false; }
}
async function registerBiometric() {
  if (!await isBiometricAvailable()) return false;
  try {
    const userId = currentUser?.id || 'local';
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId.substring(0,64));
    const credential = await navigator.credentials.create({ publicKey: {
      challenge, rp:{name:'MelaLogic',id:location.hostname},
      user:{id:userIdBytes,name:currentUser?.email||'user',displayName:'MelaLogic User'},
      pubKeyCredParams:[{alg:-7,type:'public-key'},{alg:-257,type:'public-key'}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},
      timeout:60000,
    }});
    if (credential) {
      localStorage.setItem('bp_bio_id', btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
      return true;
    }
  } catch(e) { console.log('Biometric register:', e.message); }
  return false;
}
async function pinBiometric() {
  if (!await isBiometricAvailable()) return;
  const credIdBase64 = localStorage.getItem('bp_bio_id'); if (!credIdBase64) return;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credIdBytes = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
    await navigator.credentials.get({ publicKey: {
      challenge, timeout:60000, rpId:location.hostname, userVerification:'required',
      allowCredentials:[{type:'public-key',id:credIdBytes,transports:['internal']}],
    }});
    pinUnlockSuccess();
    if (typeof toast==='function') toast('✓ Entsperrt','ok');
  } catch(e) { console.log('Biometric verify:', e.message); }
}
async function offerBiometricSetup() {
  if (!await isBiometricAvailable()) return;
  if (document.getElementById('bio-offer-banner')) return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const icon = isIOS ? '👤' : '👆';
  const label = isIOS ? 'Face ID einrichten?' : 'Fingerabdruck einrichten?';
  const b = document.createElement('div');
  b.id = 'bio-offer-banner';
  b.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#5d9d69;color:#fff;border-radius:16px;padding:18px 24px;display:flex;align-items:center;gap:16px;z-index:99999;box-shadow:0 8px 32px rgba(93,157,105,.35);font-family:sans-serif;max-width:380px;width:calc(100% - 48px)';
  b.innerHTML = `
    <span style="font-size:28px">${icon}</span>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px">${label}</div>
      <div style="font-size:12px;opacity:.8">Noch schneller entsperren</div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button onclick="document.getElementById('bio-offer-banner').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;padding:8px 12px;font-size:12px;cursor:pointer">Nein</button>
      <button id="bio-setup-btn" style="background:#fff;border:none;border-radius:8px;color:#5d9d69;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer">Ja ✓</button>
    </div>
  `;
  document.body.appendChild(b);
  document.getElementById('bio-setup-btn').addEventListener('click', async () => {
    b.remove();
    const ok = await registerBiometric();
    if (typeof toast==='function') toast(ok ? '✓ Biometrie aktiviert!' : '✗ Nicht verfügbar', ok ? 'ok' : 'err');
  });
  setTimeout(() => { if (b.parentNode) b.remove(); }, 15000);
}

// ── LOCK APP (вызывается из логотипа в шапке) ──────────────────────────────
function lockApp() {
  const pin = localStorage.getItem('bp_pin');
  if (!pin) return;
  isAppUnlocked = false;
  sessionStorage.removeItem('pin_unlocked');
  sessionStorage.setItem('pin_return', 'index.html');
  location.replace('pin.html');
}

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  let appStarted    = false;
  let appDispatched = false;

  window.launchApp = async function launchApp() {
    hideAuthScreen();
    if (!appDispatched) {
      appDispatched = true;
      window.dispatchEvent(new Event('supabase-ready'));
    }
  };

  window.startApp = async function startApp(user) {
    if (appStarted) return;
    appStarted = true;
    currentUser = user;

    const uel = document.getElementById('user-email-display');
    if (uel) uel.textContent = currentUser.email;

    // Если PIN не установлен — сессия считается разблокированной сразу
    // Если PIN установлен — pin_unlocked был поставлен pin.html при входе
    if (!localStorage.getItem('bp_pin')) {
      sessionStorage.setItem('pin_unlocked', '1');
    }

    try {
      // ФИХ: параллельная загрузка данных + один запрос user_data
      const [remoteData, userData] = await Promise.all([
        sbLoadAll(),
        sbLoadUserData(),
      ]);

      window._loadedRemoteData = remoteData || null;
      window._dataReady = true;

      const remotePin = userData.pin_hash || null;
      // Синхронизируем данные фирмы из Supabase в localStorage (master = Supabase)
      if (userData) {
        try {
          const bp = JSON.parse(localStorage.getItem('bp_firma') || '{}');
          const firmaFields = ['firma_name','firma_strasse','firma_plz','firma_ort',
                               'firma_tel','firma_email','firma_iban','firma_bic',
                               'firma_steuernr','firma_ustid','firma_footer','logo'];
          const localKeys   = ['name','strasse','plz','ort',
                               'tel','email','iban','bic',
                               'steuernr','ustid','rechnung_footer','logo'];
          let changed = false;
          firmaFields.forEach((dbKey, i) => {
            if (userData[dbKey] != null) {
              bp[localKeys[i]] = userData[dbKey];
              changed = true;
            }
          });
          if (changed) localStorage.setItem('bp_firma', JSON.stringify(bp));
        } catch(e) { console.warn('[firma sync]', e); }
      }

      if (remotePin) {
        localStorage.setItem('bp_pin', remotePin);
      } else {
        localStorage.removeItem('bp_pin');
      }

      // Синхронизация disclaimer двусторонняя
      if (userData.disclaimer_accepted) {
        localStorage.setItem('buch_disclaimer_v2', '1');
      } else if (localStorage.getItem('buch_disclaimer_v2') === '1') {
        (async () => { try { await sb.from('user_data').upsert(
          { user_id: currentUser.id, disclaimer_accepted: true },
          { onConflict: 'user_id' }
        ); } catch(e) {} })();
      }

      // Баннер удаления
      if (userData.deleted_at) {
        const del = new Date(new Date(userData.deleted_at).getTime() + 30*24*60*60*1000);
        const days = Math.ceil((del - new Date()) / (1000*60*60*24));
        setTimeout(() => showDeletionBanner(days), 1500);
      }

      // ФИХ: PIN баннеры — взаимоисключающие (если был PIN — только restore, иначе setup)
      if (!remotePin) {
        if (localStorage.getItem('bp_pin_was_set') === '1') {
          setTimeout(offerPinRestore, 3500);
        } else if (!localStorage.getItem('bp_pin_skipped')) {
          setTimeout(offerPinSetup, 3500);
        }
      } else {
        localStorage.setItem('bp_pin_was_set', '1');
        localStorage.removeItem('bp_pin_removed_skipped');
      }

      await launchApp();

    } catch(e) {
      console.error('[loadData error]:', e);
      // ФИХ: при ошибке сети всё равно показываем приложение (с пустыми данными)
      await launchApp();
    }
  };

  // ФИХ: после разблокировки PIN сбрасываем appDispatched
  // чтобы supabase-ready отправился и модули перерисовались
  window._unlockApp = async function() {
    if (!currentUser) return;
    appDispatched = false;
    await launchApp();
  };

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      appStarted = false; appDispatched = false;
      isAppUnlocked = false; window._dataReady = false;
      location.href = 'login.html';
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      currentUser = session.user;
    }
  });

  // Запуск через getSession — всегда после загрузки всех скриптов
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      // ── PIN GUARD ──────────────────────────────────────────────────────
      // Если PIN установлен и сессия не разблокирована (например после таймаута
      // или перезагрузки страницы) — отправляем на pin.html ДО загрузки данных
      const storedPin = localStorage.getItem('bp_pin');
      const pinUnlocked = sessionStorage.getItem('pin_unlocked');
      if (storedPin && !pinUnlocked) {
        sessionStorage.setItem('pin_return', 'index.html');
        location.replace('pin.html');
        return;
      }
      // ──────────────────────────────────────────────────────────────────
      await window.startApp(session.user);
    } else {
      const ls = document.getElementById('loading-screen');
      if (ls) ls.style.display = 'none';
      showAuthScreen();
    }
  } catch(e) {
    console.error('[getSession error]:', e);
    const ls = document.getElementById('loading-screen');
    if (ls) ls.style.display = 'none';
    showAuthScreen();
  }
});
