// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let saveTimer = null;

// ── PIN / INACTIVITY ───────────────────────────────────────────────────────
const PIN_TIMEOUT = 10 * 60 * 1000; // 10 минут
let inactivityTimer = null;
let pinValue = '';
let pinMode = 'unlock'; // 'unlock' | 'setup'
let isAppUnlocked = false;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    const storedPin = localStorage.getItem('bp_pin');
    if (storedPin && isAppUnlocked) {
      showPinScreen('unlock');
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
  localStorage.removeItem('bp_pin');
  location.reload();
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
function sbPersist() {}
function persist() {}

// ── SCREENS ────────────────────────────────────────────────────────────────
function showAuthScreen() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('pin-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'none';
}
function hideAuthScreen() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('pin-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
  isAppUnlocked = true;
  startInactivityWatch();
}
function showPinScreen(mode) {
  pinMode = mode;
  pinValue = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-subtitle').textContent = mode === 'setup'
    ? 'Neuen PIN festlegen' : 'PIN eingeben';
  document.getElementById('pin-screen').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
  // Биометрия
  const bioBtn = document.getElementById('pin-bio-btn');
  if (mode === 'unlock' && window.PublicKeyCredential) {
    bioBtn.style.display = '';
    // Авто-запуск биометрии
    setTimeout(pinBiometric, 500);
  } else {
    bioBtn.style.display = 'none';
  }
}

// ── AUTH FORM ──────────────────────────────────────────────────────────────
function authSetTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').style.background = isLogin ? 'var(--blue)' : 'transparent';
  document.getElementById('tab-login').style.color = isLogin ? '#fff' : 'var(--sub)';
  document.getElementById('tab-register').style.background = isLogin ? 'transparent' : 'var(--blue)';
  document.getElementById('tab-register').style.color = isLogin ? 'var(--sub)' : '#fff';
  document.getElementById('auth-confirm-wrap').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-captcha-wrap').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-remember-wrap').style.display = isLogin ? 'flex' : 'none';
  document.getElementById('auth-btn').textContent = isLogin ? 'Anmelden' : 'Registrieren';
  document.getElementById('auth-error').textContent = '';
}
function authTogglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}
function authToggleMode() { /* legacy */ }

async function authSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const isLogin  = document.getElementById('tab-login').style.background.includes('var(--blue)') ||
                   document.getElementById('tab-login').style.background === 'var(--blue)';
  const btn      = document.getElementById('auth-btn');
  const err      = document.getElementById('auth-error');
  err.textContent = '';
  if (!email || !password) { err.textContent = '❌ Bitte Email und Passwort eingeben.'; return; }
  if (password.length < 6) { err.textContent = '❌ Passwort mindestens 6 Zeichen.'; return; }
  if (!isLogin) {
    const pw2 = document.getElementById('auth-password2').value;
    if (password !== pw2) { err.textContent = '❌ Passwörter stimmen nicht überein.'; return; }
  }
  btn.textContent = '...';
  btn.disabled = true;
  try {
    if (isLogin) {
      const result = await sbSignIn(email, password);
      if (result && result.user) {
        currentUser = result.user;
        document.getElementById('user-email-display').textContent = currentUser.email;
        window._loadedRemoteData = await sbLoadAll();
        // PIN setup prompt если ещё нет
        hideAuthScreen();
        window.dispatchEvent(new Event('supabase-ready'));
        if (!localStorage.getItem('bp_pin') && !localStorage.getItem('bp_pin_skipped')) {
          setTimeout(offerPinSetup, 1500);
        }
      }
    } else {
      await sbSignUp(email, password);
      err.style.color = 'var(--green)';
      err.textContent = '✅ Registriert! Bitte jetzt anmelden.';
      btn.disabled = false;
      setTimeout(() => {
        err.style.color = '';
        err.textContent = '';
        authSetTab('login');
        document.getElementById('auth-email').value = email;
        document.getElementById('auth-password').value = '';
        btn.textContent = 'Anmelden';
      }, 1800);
    }
  } catch(e) {
    console.error('Auth error:', e);
    err.textContent = translateAuthError(e.message);
    btn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
    btn.disabled = false;
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
  if (confirm('🔒 PIN-Code für schnellen Zugang einrichten?')) {
    showPinScreen('setup');
  } else {
    localStorage.setItem('bp_pin_skipped', '1');
  }
}

function pinPress(digit) {
  if (pinValue.length >= 4) return;
  pinValue += digit;
  updatePinDots();
  if (pinValue.length === 4) {
    setTimeout(pinConfirm, 150);
  }
}

function pinBackspace() {
  pinValue = pinValue.slice(0, -1);
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pin-dot-' + i);
    dot.classList.toggle('filled', i < pinValue.length);
    dot.classList.remove('error');
  }
}

function pinConfirm() {
  if (pinMode === 'setup') {
    // Хэшируем PIN простым способом
    const hash = btoa(pinValue + '_bp_salt_2026');
    localStorage.setItem('bp_pin', hash);
    pinValue = '';
    updatePinDots();
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'block';
    if (typeof toast === 'function') toast('✅ PIN gesetzt!', 'ok');
  } else {
    // Проверяем
    const stored = localStorage.getItem('bp_pin');
    const hash = btoa(pinValue + '_bp_salt_2026');
    if (hash === stored) {
      pinValue = '';
      document.getElementById('pin-screen').style.display = 'none';
      document.getElementById('app-wrapper').style.display = 'block';
      isAppUnlocked = true;
      resetInactivityTimer();
    } else {
      pinValue = '';
      document.getElementById('pin-error').textContent = '❌ Falscher PIN';
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('pin-dot-' + i);
        dot.classList.add('error');
      }
      setTimeout(() => {
        updatePinDots();
        document.getElementById('pin-error').textContent = '';
      }, 800);
    }
  }
}

function pinLogout() {
  if (confirm('Abmelden?')) sbSignOut();
}

async function pinBiometric() {
  if (!window.PublicKeyCredential) return;
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return;
    // Используем simple credential get для биометрии
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 30000,
        userVerification: 'required',
        rpId: location.hostname,
      }
    });
    // Если дошли сюда — биометрия прошла
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'block';
    isAppUnlocked = true;
    resetInactivityTimer();
  } catch(e) {
    // Биометрия не прошла или не настроена — ничего не делаем
    console.log('Biometric:', e.message);
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });
  document.getElementById('auth-password2')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });
  document.getElementById('auth-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });

  let appStarted = false;
  async function startApp(user) {
    if (appStarted) return;
    appStarted = true;
    currentUser = user;
    const uel = document.getElementById('user-email-display');
    if (uel) uel.textContent = currentUser.email;
    window._loadedRemoteData = await sbLoadAll() || null;
    hideAuthScreen();
    window.dispatchEvent(new Event('supabase-ready'));
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    await startApp(session.user);
  } else {
    showAuthScreen();
    authSetTab('login');
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    if (event === 'SIGNED_IN' && session && session.user) {
      await startApp(session.user);
    } else if (event === 'SIGNED_OUT') {
      appStarted = false;
      isAppUnlocked = false;
      showAuthScreen();
    }
  });
});
