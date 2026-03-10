// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let saveTimer = null;

// ── PIN / INACTIVITY ───────────────────────────────────────────────────────
const PIN_TIMEOUT = 1 * 60 * 1000; // 1 минута для теста
let inactivityTimer = null;
let pinValue = '';
let pinFirstValue = ''; // для подтверждения при setup
let pinMode = 'unlock'; // 'unlock' | 'setup'
let pinSetupStep = 1; // 1 = первый ввод, 2 = подтверждение
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
async function sbSignOut() {
  await sb.auth.signOut();
  currentUser = null;
  // PIN не удаляем — он привязан к аккаунту
  // Сбрасываем disclaimer — при следующем входе покажется снова
  localStorage.removeItem('buch_disclaimer_v2');
  location.href = 'login.html';
}
async function authGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.href }
  });
  if (error) {
    document.getElementById('auth-error').textContent = '❌ Google Login fehlgeschlagen.';
  }
}

// ── DATA ───────────────────────────────────────────────────────────────────
async function sbLoadAll() {
  if (!currentUser) return null;
  const uid = currentUser.id;
  const [ein, kun, rech, rechPos, wied, ustM] = await Promise.all([
    sb.from('eintraege').select('*').eq('user_id', uid).order('datum', { ascending: false }),
    sb.from('kunden').select('*').eq('user_id', uid).order('name'),
    sb.from('rechnungen').select('*').eq('user_id', uid).order('datum', { ascending: false }),
    sb.from('rechnungen_pos').select('*').eq('user_id', uid),
    sb.from('wiederkehrend').select('*').eq('user_id', uid),
    sb.from('ust_mode').select('*').eq('user_id', uid),
  ]);
  const eintraege = (ein.data || []).map(dbToEintrag);
  const kunden = (kun.data || []).map(dbToKunde);
  const rechnungen = (rech.data || []).map(r => dbToRechnung(r, rechPos.data || []));
  const wiederkehrend = (wied.data || []).map(dbToWied);
  const ustModeByYear = {};
  (ustM.data || []).forEach(r => { ustModeByYear[r.jahr] = r.mode; });
  return { eintraege, kunden, rechnungen, wiederkehrend, ustModeByYear, ustEintraege: [] };
}

// ── CONVERTERS ─────────────────────────────────────────────────────────────
function dbToEintrag(r) {
  return { id:r.id, datum:r.datum, typ:r.typ, kategorie:r.kategorie||'', beschreibung:r.beschreibung||'', betrag:parseFloat(r.betrag)||0, zahlungsart:r.zahlungsart||'Sonstiges', notiz:r.notiz||'', mwstRate:parseFloat(r.mwst_rate)||0, mwstBetrag:parseFloat(r.mwst_betrag)||0, nettoBetrag:parseFloat(r.netto_betrag)||0, vorsteuerRate:parseFloat(r.vorsteuer_rate)||0, vorsteuerBet:parseFloat(r.vorsteuer_bet)||0, mwstMode:r.mwst_mode||'§19' };
}
function dbToKunde(r) {
  return { id:r.id, name:r.name||'', ansprechpartner:r.ansprechpartner||'', email:r.email||'', tel:r.tel||'', strasse:r.strasse||'', plz:r.plz||'', ort:r.ort||'', iban:r.iban||'', ustid:r.ustid||'', notiz:r.notiz||'' };
}
function dbToRechnung(r, allPos) {
  const pos = allPos.filter(p => p.rechnung_id === r.id).map(p => ({ id:p.id, beschreibung:p.beschreibung||'', menge:parseFloat(p.menge)||1, einheit:p.einheit||'Stk.', einzelpreis:parseFloat(p.einzelpreis)||0, mwstRate:parseFloat(p.mwst_rate)||0 }));
  return { id:r.id, nr:r.nr||'', datum:r.datum||'', faellig:r.faellig||'', kunde:r.kunde||'', kundeId:r.kunde_id||'', adresse:r.adresse||'', email:r.email||'', betrag:parseFloat(r.betrag)||0, status:r.status||'offen', mwstMode:r.mwst_mode||'§19', notiz:r.notiz||'', wa:r.wa||'', positionen:pos };
}
function dbToWied(r) {
  return { id:r.id, typ:r.typ||'Ausgabe', kategorie:r.kategorie||'', beschreibung:r.beschreibung||'', betrag:parseFloat(r.betrag)||0, zahlungsart:r.zahlungsart||'Sonstiges', intervall:r.intervall||'monatlich', naechste:r.naechste||'' };
}
function eintragToDb(e) {
  return { id:e.id, user_id:currentUser.id, datum:e.datum, typ:e.typ, kategorie:e.kategorie||null, beschreibung:e.beschreibung||null, betrag:e.betrag||0, zahlungsart:e.zahlungsart||null, notiz:e.notiz||null, mwst_rate:e.mwstRate||0, mwst_betrag:e.mwstBetrag||0, netto_betrag:e.nettoBetrag||0, vorsteuer_rate:e.vorsteuerRate||0, vorsteuer_bet:e.vorsteuerBet||0, mwst_mode:e.mwstMode||'§19' };
}
function kundeToDb(k) {
  return { id:k.id, user_id:currentUser.id, name:k.name||'', ansprechpartner:k.ansprechpartner||null, email:k.email||null, tel:k.tel||null, strasse:k.strasse||null, plz:k.plz||null, ort:k.ort||null, iban:k.iban||null, ustid:k.ustid||null, notiz:k.notiz||null };
}
function rechnungToDb(r) {
  return { id:r.id, user_id:currentUser.id, nr:r.nr||null, datum:r.datum||null, faellig:r.faellig||null, kunde:r.kunde||null, kunde_id:r.kundeId||null, adresse:r.adresse||null, email:r.email||null, betrag:r.betrag||0, status:r.status||'offen', mwst_mode:r.mwstMode||'§19', notiz:r.notiz||null, wa:r.wa||null };
}
function posToDb(pos, rechnungId) {
  return { id:pos.id, user_id:currentUser.id, rechnung_id:rechnungId, beschreibung:pos.beschreibung||null, menge:pos.menge||1, einheit:pos.einheit||'Stk.', einzelpreis:pos.einzelpreis||0, mwst_rate:pos.mwstRate||0 };
}
function wiedToDb(w) {
  return { id:w.id, user_id:currentUser.id, typ:w.typ||'Ausgabe', kategorie:w.kategorie||null, beschreibung:w.beschreibung||null, betrag:w.betrag||0, zahlungsart:w.zahlungsart||null, intervall:w.intervall||'monatlich', naechste:w.naechste||null };
}

// ── SAVE / DELETE ──────────────────────────────────────────────────────────
async function sbSaveEintrag(e) { const {error}=await sb.from('eintraege').upsert(eintragToDb(e),{onConflict:'id'}); if(error) console.error('Save eintrag:',error); }
async function sbDeleteEintrag(id) { await sb.from('eintraege').delete().eq('id',id).eq('user_id',currentUser.id); }
async function sbSaveKunde(k) { const {error}=await sb.from('kunden').upsert(kundeToDb(k),{onConflict:'id'}); if(error) console.error('Save kunde:',error); }
async function sbDeleteKunde(id) { await sb.from('kunden').delete().eq('id',id).eq('user_id',currentUser.id); }
async function sbSaveRechnung(r) {
  await sb.from('rechnungen').upsert(rechnungToDb(r),{onConflict:'id'});
  if(r.positionen&&r.positionen.length) {
    await sb.from('rechnungen_pos').delete().eq('rechnung_id',r.id).eq('user_id',currentUser.id);
    await sb.from('rechnungen_pos').insert(r.positionen.map(p=>posToDb(p,r.id)));
  }
}
async function sbDeleteRechnung(id) {
  await sb.from('rechnungen_pos').delete().eq('rechnung_id',id).eq('user_id',currentUser.id);
  await sb.from('rechnungen').delete().eq('id',id).eq('user_id',currentUser.id);
}
async function sbSaveWied(w) { await sb.from('wiederkehrend').upsert(wiedToDb(w),{onConflict:'id'}); }
async function sbDeleteWied(id) { await sb.from('wiederkehrend').delete().eq('id',id).eq('user_id',currentUser.id); }
async function sbSaveUstMode(jahr, mode) { await sb.from('ust_mode').upsert({user_id:currentUser.id,jahr,mode},{onConflict:'user_id,jahr'}); }
// ── PIN в Supabase ────────────────────────────────────────────────────────
async function sbSavePin(hash) {
  if (!currentUser) return;
  await sb.from('user_data').upsert(
    { user_id: currentUser.id, pin_hash: hash },
    { onConflict: 'user_id' }
  );
}

async function sbLoadPin() {
  if (!currentUser) return null;
  const { data } = await sb.from('user_data')
    .select('pin_hash')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  return data?.pin_hash || null;
}

async function sbDeletePin() {
  if (!currentUser) return;
  await sb.from('user_data').upsert(
    { user_id: currentUser.id, pin_hash: null },
    { onConflict: 'user_id' }
  );
}

function sbPersist() {}
function persist() {}

// ── Баннер удаления аккаунта ──────────────────────────────────────────────
function showDeletionBanner(daysLeft) {
  if (document.getElementById('deletion-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'deletion-banner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#e08c1a;color:#fff;border-radius:16px;padding:14px 20px;
    display:flex;align-items:center;gap:14px;z-index:9998;
    box-shadow:0 8px 32px rgba(224,140,26,.4);font-family:inherit;
    max-width:380px;width:calc(100% - 32px);
  `;
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
  await sb.from('user_data').upsert({ user_id: currentUser.id, deleted_at: null }, { onConflict: 'user_id' });
  document.getElementById('deletion-banner')?.remove();
  if (typeof toast === 'function') toast('✅ Kontolöschung widerrufen');
}

// ── SCREENS ────────────────────────────────────────────────────────────────
function showAuthScreen() {
  location.href = 'login.html';
}

function hideAuthScreen() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
  isAppUnlocked = true;
  startInactivityWatch();
}

function showPinScreen(mode) {
  // PIN экран теперь на pin.html — эта функция только для setup внутри приложения
  if (mode === 'unlock') {
    sessionStorage.removeItem('pin_unlocked');
    sessionStorage.setItem('pin_return', 'index.html');
    location.replace('pin.html');
    return;
  }
  pinMode = mode;
  pinValue = '';
  if (typeof updatePinDots === 'function') updatePinDots();
  const errEl = document.getElementById('pin-error');
  if (errEl) errEl.textContent = '';
  pinSetupStep = 1;
  pinFirstValue = '';
  const subEl = document.getElementById('pin-subtitle');
  if (subEl) subEl.textContent = 'PIN festlegen (1/2)';
  const loadEl = document.getElementById('loading-screen');
  if (loadEl) loadEl.style.display = 'none';
  const wrapEl = document.getElementById('app-wrapper');
  if (wrapEl) wrapEl.style.display = 'none';
}

// ── AUTH FORM (legacy — used only in index.html if auth-screen exists) ─────
function authSetTab(tab) {
  const isLogin = tab === 'login';
  const tl = document.getElementById('tab-login');
  const tr = document.getElementById('tab-register');
  if (!tl || !tr) return;
  tl.style.background = isLogin ? 'var(--blue)' : 'transparent';
  tl.style.color = isLogin ? '#fff' : 'var(--sub)';
  tr.style.background = isLogin ? 'transparent' : 'var(--blue)';
  tr.style.color = isLogin ? 'var(--sub)' : '#fff';
  const cw = document.getElementById('auth-confirm-wrap');
  const cap = document.getElementById('auth-captcha-wrap');
  const rem = document.getElementById('auth-remember-wrap');
  const btn = document.getElementById('auth-btn');
  if (cw) cw.style.display = isLogin ? 'none' : 'block';
  if (cap) cap.style.display = isLogin ? 'none' : 'block';
  if (rem) rem.style.display = isLogin ? 'flex' : 'none';
  if (btn) btn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
  const err = document.getElementById('auth-error');
  if (err) err.textContent = '';
}
function authTogglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}
function authToggleMode() {}

async function authSubmit() {
  const emailEl = document.getElementById('auth-email');
  const passEl  = document.getElementById('auth-password');
  const btnEl   = document.getElementById('auth-btn');
  const errEl   = document.getElementById('auth-error');
  if (!emailEl || !passEl) return;
  const email    = emailEl.value.trim();
  const password = passEl.value;
  const tl       = document.getElementById('tab-login');
  const isLogin  = !tl || tl.style.background.includes('var(--blue)') || tl.classList.contains('active');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = '❌ Bitte Email und Passwort eingeben.'; return; }
  if (password.length < 6) { errEl.textContent = '❌ Passwort mindestens 6 Zeichen.'; return; }
  if (!isLogin) {
    const pw2 = document.getElementById('auth-password2')?.value;
    if (password !== pw2) { errEl.textContent = '❌ Passwörter stimmen nicht überein.'; return; }
  }
  btnEl.textContent = '...';
  btnEl.disabled = true;
  try {
    if (isLogin) {
      const result = await sbSignIn(email, password);
      if (result && result.user) {
        currentUser = result.user;
        window._loadedRemoteData = await sbLoadAll();
        window._dataReady = true;
        hideAuthScreen();
        window.dispatchEvent(new Event('supabase-ready'));
        if (!localStorage.getItem('bp_pin') && !localStorage.getItem('bp_pin_skipped')) {
          setTimeout(offerPinSetup, 1500);
        }
      }
    } else {
      await sbSignUp(email, password);
      errEl.style.color = 'var(--green)';
      errEl.textContent = '✅ Registriert! Bitte jetzt anmelden.';
      btnEl.disabled = false;
      setTimeout(() => {
        errEl.style.color = '';
        errEl.textContent = '';
        authSetTab('login');
        emailEl.value = email;
        passEl.value = '';
        btnEl.textContent = 'Anmelden';
      }, 1800);
    }
  } catch(e) {
    console.error('Auth error:', e);
    errEl.textContent = translateAuthError(e.message);
    btnEl.textContent = isLogin ? 'Anmelden' : 'Registrieren';
    btnEl.disabled = false;
  }
}

function translateAuthError(msg) {
  if (!msg) return '❌ Unbekannter Fehler.';
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) return '❌ Falsche Email oder Passwort.';
  if (msg.includes('already registered')) return '❌ Diese Email ist bereits registriert.';
  if (msg.includes('valid email')) return '❌ Bitte gültige Email eingeben.';
  if (msg.includes('disabled')) return '❌ Registrierung deaktiviert.';
  return '❌ ' + msg;
}

// ── PIN LOGIC ──────────────────────────────────────────────────────────────
function offerPinSetup() {
  // Не показывать если уже есть баннер
  if (document.getElementById('pin-offer-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pin-offer-banner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#1a4578;color:#fff;border-radius:16px;padding:18px 24px;
    display:flex;align-items:center;gap:16px;z-index:99999;
    box-shadow:0 8px 32px rgba(26,69,120,.35);font-family:sans-serif;
    max-width:380px;width:calc(100% - 48px);
  `;
  banner.innerHTML = `
    <span style="font-size:28px">🔒</span>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px">PIN-Code einrichten?</div>
      <div style="font-size:12px;opacity:.8">Schneller Zugang mit 4-stelligem PIN</div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button onclick="document.getElementById('pin-offer-banner').remove();localStorage.setItem('bp_pin_skipped','1')"
        style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;padding:8px 12px;font-size:12px;cursor:pointer;font-family:sans-serif">Nein</button>
      <button onclick="document.getElementById('pin-offer-banner').remove();location.href='profile.html'"
        style="background:#fff;border:none;border-radius:8px;color:#1a4578;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:sans-serif">Ja ✓</button>
    </div>
  `;
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 15000);
}

function pinPress(digit) {
  if (pinValue.length >= 4) return;
  pinValue += digit;
  updatePinDots();
  if (navigator.vibrate) navigator.vibrate(30);
  if (pinValue.length === 4) setTimeout(pinConfirm, 150);
}

function pinBackspace() {
  pinValue = pinValue.slice(0, -1);
  updatePinDots();
}

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

function pinConfirm() {
  if (pinMode === 'setup') {
    if (pinSetupStep === 1) {
      // Первый ввод — запоминаем и просим повторить
      pinFirstValue = pinValue;
      pinValue = '';
      updatePinDots();
      pinSetupStep = 2;
      document.getElementById('pin-subtitle').textContent = 'PIN wiederholen (2/2)';
      return;
    }
    // Второй ввод — проверяем совпадение
    if (pinValue !== pinFirstValue) {
      pinValue = '';
      pinFirstValue = '';
      pinSetupStep = 1;
      document.getElementById('pin-error').textContent = '❌ PINs stimmen nicht überein';
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('pin-dot-' + i);
        if (dot) dot.classList.add('error');
      }
      setTimeout(() => {
        updatePinDots();
        document.getElementById('pin-error').textContent = '';
        document.getElementById('pin-subtitle').textContent = 'PIN festlegen (1/2)';
      }, 1000);
      return;
    }
    // PINы совпали — сохраняем
    const hash = btoa(pinValue + '_bp_salt_2026');
    localStorage.setItem('bp_pin', hash);
    sbSavePin(hash).then(() => {
      if (typeof toast === 'function') toast('✅ PIN gesetzt!', 'ok');
    });
    pinValue = '';
    pinFirstValue = '';
    pinSetupStep = 1;
    updatePinDots();
    document.getElementById('app-wrapper').style.display = 'block';
    isAppUnlocked = true;
  } else {
    const stored = localStorage.getItem('bp_pin');
    const hash = btoa(pinValue + '_bp_salt_2026');
    if (hash === stored) {
      pinUnlockSuccess();
    } else {
      pinValue = '';
      document.getElementById('pin-error').textContent = '❌ Falscher PIN';
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('pin-dot-' + i);
        if (dot) dot.classList.add('error');
      }
      setTimeout(() => {
        updatePinDots();
        document.getElementById('pin-error').textContent = '';
      }, 900);
    }
  }
}

function pinLogout() {
  if (confirm('Abmelden?')) sbSignOut();
}

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
    const userIdBytes = new TextEncoder().encode(userId.substring(0, 64));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'MelaLogic', id: location.hostname },
        user: { id: userIdBytes, name: currentUser?.email || 'user', displayName: 'MelaLogic User' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
      }
    });
    if (credential) {
      const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem('bp_bio_id', credIdBase64);
      return true;
    }
  } catch(e) { console.log('Biometric register:', e.message); }
  return false;
}

async function pinBiometric() {
  if (!await isBiometricAvailable()) return;
  const credIdBase64 = localStorage.getItem('bp_bio_id');
  if (!credIdBase64) return;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credIdBytes = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
    await navigator.credentials.get({
      publicKey: {
        challenge, timeout: 60000, rpId: location.hostname,
        userVerification: 'required',
        allowCredentials: [{ type: 'public-key', id: credIdBytes, transports: ['internal'] }],
      }
    });
    pinUnlockSuccess();
    if (typeof toast === 'function') toast('✅ Entsperrt', 'ok');
  } catch(e) { console.log('Biometric verify:', e.message); }
}

async function offerBiometricSetup() {
  if (!await isBiometricAvailable()) return;
  if (document.getElementById('bio-offer-banner')) return;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const bioIcon = isIOS ? '👤' : '👆';
  const bioLabel = isIOS ? 'Face ID einrichten?' : 'Fingerabdruck einrichten?';
  const banner = document.createElement('div');
  banner.id = 'bio-offer-banner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#5d9d69;color:#fff;border-radius:16px;padding:18px 24px;
    display:flex;align-items:center;gap:16px;z-index:99999;
    box-shadow:0 8px 32px rgba(93,157,105,.35);font-family:sans-serif;
    max-width:380px;width:calc(100% - 48px);
  `;
  banner.innerHTML = `
    <span style="font-size:28px">${bioIcon}</span>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px">${bioLabel}</div>
      <div style="font-size:12px;opacity:.8">Noch schneller entsperren</div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button onclick="document.getElementById('bio-offer-banner').remove()"
        style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;padding:8px 12px;font-size:12px;cursor:pointer;font-family:sans-serif">Nein</button>
      <button id="bio-setup-btn"
        style="background:#fff;border:none;border-radius:8px;color:#5d9d69;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:sans-serif">Ja ✓</button>
    </div>
  `;
  document.body.appendChild(banner);
  document.getElementById('bio-setup-btn').addEventListener('click', async () => {
    banner.remove();
    const ok = await registerBiometric();
    if (typeof toast === 'function') toast(ok ? '✅ Biometrie aktiviert!' : '❌ Nicht verfügbar', ok ? 'ok' : 'err');
  });
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 15000);
}

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  let appStarted = false;
  let appDispatched = false;

  async function launchApp() {
    // Показываем приложение и запускаем его
    hideAuthScreen();
    if (!appDispatched) {
      appDispatched = true;
      window.dispatchEvent(new Event('supabase-ready'));
    }
  }

  async function startApp(user) {
    if (appStarted) return;
    appStarted = true;
    currentUser = user;
    console.log('[startApp] user:', user.email);

    // Показываем email в шапке
    const uel = document.getElementById('user-email-display');
    if (uel) uel.textContent = currentUser.email;

    // Загружаем данные и PIN из Supabase
    const [remoteData, remotePin] = await Promise.all([
      sbLoadAll(),
      sbLoadPin(),
    ]);
    window._loadedRemoteData = remoteData || null;
    window._dataReady = true;

    if (remotePin) {
      localStorage.setItem('bp_pin', remotePin);
    } else {
      localStorage.removeItem('bp_pin');
    }

    // При входе считаем что сессия разблокирована
    sessionStorage.setItem('pin_unlocked', '1');

    await launchApp();

    // Проверяем не помечен ли аккаунт на удаление
    const { data: userData } = await sb.from('user_data')
      .select('deleted_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (userData?.deleted_at) {
      const deleteDate = new Date(new Date(userData.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24));
      setTimeout(() => showDeletionBanner(daysLeft), 1500);
    }

    // Предлагаем настроить PIN если ещё не создан
    if (!remotePin && !localStorage.getItem('bp_pin_skipped')) {
      setTimeout(offerPinSetup, 2000);
    }
  }

  // Вызывается из pinUnlockSuccess после успешного ввода PIN / биометрии
  window._unlockApp = async function() {
    if (!currentUser) return;
    await launchApp();
  };

  // Ждём пока Supabase восстановит сессию через onAuthStateChange (INITIAL_SESSION)
  let authResolved = false;

  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth event]:', event, session?.user?.email);

    if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !authResolved) {
      authResolved = true;
      if (session && session.user) {
        try {
          await startApp(session.user);
        } catch(e) {
          console.error('[startApp error]:', e);
          document.getElementById('loading-screen').style.display = 'none';
          showAuthScreen();
        }
      } else {
        document.getElementById('loading-screen').style.display = 'none';
        showAuthScreen();
      }
      return;
    }

    if (event === 'SIGNED_IN' && session && session.user && !appStarted) {
      await startApp(session.user);
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      currentUser = session.user;
    } else if (event === 'SIGNED_OUT') {
      appStarted = false;
      appDispatched = false;
      isAppUnlocked = false;
      window._dataReady = false;
      location.href = 'login.html';
    }
  });

  // Страховка: если onAuthStateChange не выстрелил за 3 сек — редиректим на логин
  setTimeout(() => {
    if (!authResolved) {
      authResolved = true;
      document.getElementById('loading-screen').style.display = 'none';
      showAuthScreen();
    }
  }, 3000);
});
