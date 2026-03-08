// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';

const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let saveTimer = null;

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
  location.reload();
}

// ── LOAD ALL DATA ──────────────────────────────────────────────────────────
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

  // Конвертируем из БД формата в формат приложения
  const eintraege = (ein.data || []).map(dbToEintrag);
  const kunden = (kun.data || []).map(dbToKunde);
  const rechnungen = (rech.data || []).map(r => dbToRechnung(r, rechPos.data || []));
  const wiederkehrend = (wied.data || []).map(dbToWied);
  const ustModeByYear = {};
  (ustM.data || []).forEach(r => { ustModeByYear[r.jahr] = r.mode; });

  return { eintraege, kunden, rechnungen, wiederkehrend, ustModeByYear, ustEintraege: [] };
}

// ── CONVERTERS: DB → App ───────────────────────────────────────────────────
function dbToEintrag(r) {
  return {
    id: r.id,
    datum: r.datum,
    typ: r.typ,
    kategorie: r.kategorie || '',
    beschreibung: r.beschreibung || '',
    betrag: parseFloat(r.betrag) || 0,
    zahlungsart: r.zahlungsart || 'Sonstiges',
    notiz: r.notiz || '',
    mwstRate: parseFloat(r.mwst_rate) || 0,
    mwstBetrag: parseFloat(r.mwst_betrag) || 0,
    nettoBetrag: parseFloat(r.netto_betrag) || 0,
    vorsteuerRate: parseFloat(r.vorsteuer_rate) || 0,
    vorsteuerBet: parseFloat(r.vorsteuer_bet) || 0,
    mwstMode: r.mwst_mode || '§19',
  };
}
function dbToKunde(r) {
  return {
    id: r.id,
    name: r.name || '',
    ansprechpartner: r.ansprechpartner || '',
    email: r.email || '',
    tel: r.tel || '',
    strasse: r.strasse || '',
    plz: r.plz || '',
    ort: r.ort || '',
    iban: r.iban || '',
    ustid: r.ustid || '',
    notiz: r.notiz || '',
  };
}
function dbToRechnung(r, allPos) {
  const pos = allPos.filter(p => p.rechnung_id === r.id).map(p => ({
    id: p.id,
    beschreibung: p.beschreibung || '',
    menge: parseFloat(p.menge) || 1,
    einheit: p.einheit || 'Stk.',
    einzelpreis: parseFloat(p.einzelpreis) || 0,
    mwstRate: parseFloat(p.mwst_rate) || 0,
  }));
  return {
    id: r.id,
    nr: r.nr || '',
    datum: r.datum || '',
    faellig: r.faellig || '',
    kunde: r.kunde || '',
    kundeId: r.kunde_id || '',
    adresse: r.adresse || '',
    email: r.email || '',
    betrag: parseFloat(r.betrag) || 0,
    status: r.status || 'offen',
    mwstMode: r.mwst_mode || '§19',
    notiz: r.notiz || '',
    wa: r.wa || '',
    positionen: pos,
  };
}
function dbToWied(r) {
  return {
    id: r.id,
    typ: r.typ || 'Ausgabe',
    kategorie: r.kategorie || '',
    beschreibung: r.beschreibung || '',
    betrag: parseFloat(r.betrag) || 0,
    zahlungsart: r.zahlungsart || 'Sonstiges',
    intervall: r.intervall || 'monatlich',
    naechste: r.naechste || '',
  };
}

// ── CONVERTERS: App → DB ───────────────────────────────────────────────────
function eintragToDb(e) {
  return {
    id: e.id,
    user_id: currentUser.id,
    datum: e.datum,
    typ: e.typ,
    kategorie: e.kategorie || null,
    beschreibung: e.beschreibung || null,
    betrag: e.betrag || 0,
    zahlungsart: e.zahlungsart || null,
    notiz: e.notiz || null,
    mwst_rate: e.mwstRate || 0,
    mwst_betrag: e.mwstBetrag || 0,
    netto_betrag: e.nettoBetrag || 0,
    vorsteuer_rate: e.vorsteuerRate || 0,
    vorsteuer_bet: e.vorsteuerBet || 0,
    mwst_mode: e.mwstMode || '§19',
  };
}
function kundeToDb(k) {
  return {
    id: k.id,
    user_id: currentUser.id,
    name: k.name || '',
    ansprechpartner: k.ansprechpartner || null,
    email: k.email || null,
    tel: k.tel || null,
    strasse: k.strasse || null,
    plz: k.plz || null,
    ort: k.ort || null,
    iban: k.iban || null,
    ustid: k.ustid || null,
    notiz: k.notiz || null,
  };
}
function rechnungToDb(r) {
  return {
    id: r.id,
    user_id: currentUser.id,
    nr: r.nr || null,
    datum: r.datum || null,
    faellig: r.faellig || null,
    kunde: r.kunde || null,
    kunde_id: r.kundeId || null,
    adresse: r.adresse || null,
    email: r.email || null,
    betrag: r.betrag || 0,
    status: r.status || 'offen',
    mwst_mode: r.mwstMode || '§19',
    notiz: r.notiz || null,
    wa: r.wa || null,
  };
}
function posToDb(pos, rechnungId) {
  return {
    id: pos.id,
    user_id: currentUser.id,
    rechnung_id: rechnungId,
    beschreibung: pos.beschreibung || null,
    menge: pos.menge || 1,
    einheit: pos.einheit || 'Stk.',
    einzelpreis: pos.einzelpreis || 0,
    mwst_rate: pos.mwstRate || 0,
  };
}
function wiedToDb(w) {
  return {
    id: w.id,
    user_id: currentUser.id,
    typ: w.typ || 'Ausgabe',
    kategorie: w.kategorie || null,
    beschreibung: w.beschreibung || null,
    betrag: w.betrag || 0,
    zahlungsart: w.zahlungsart || null,
    intervall: w.intervall || 'monatlich',
    naechste: w.naechste || null,
  };
}

// ── SAVE FUNCTIONS ─────────────────────────────────────────────────────────
async function sbSaveEintrag(e) {
  const { error } = await sb.from('eintraege').upsert(eintragToDb(e), { onConflict: 'id' });
  if (error) console.error('Save eintrag error:', error);
}
async function sbDeleteEintrag(id) {
  const { error } = await sb.from('eintraege').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('Delete eintrag error:', error);
}
async function sbSaveKunde(k) {
  const { error } = await sb.from('kunden').upsert(kundeToDb(k), { onConflict: 'id' });
  if (error) console.error('Save kunde error:', error);
}
async function sbDeleteKunde(id) {
  const { error } = await sb.from('kunden').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('Delete kunde error:', error);
}
async function sbSaveRechnung(r) {
  const { error } = await sb.from('rechnungen').upsert(rechnungToDb(r), { onConflict: 'id' });
  if (error) { console.error('Save rechnung error:', error); return; }
  // Сохраняем позиции
  if (r.positionen && r.positionen.length) {
    await sb.from('rechnungen_pos').delete().eq('rechnung_id', r.id).eq('user_id', currentUser.id);
    const pos = r.positionen.map(p => posToDb(p, r.id));
    await sb.from('rechnungen_pos').insert(pos);
  }
}
async function sbDeleteRechnung(id) {
  await sb.from('rechnungen_pos').delete().eq('rechnung_id', id).eq('user_id', currentUser.id);
  const { error } = await sb.from('rechnungen').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('Delete rechnung error:', error);
}
async function sbSaveWied(w) {
  const { error } = await sb.from('wiederkehrend').upsert(wiedToDb(w), { onConflict: 'id' });
  if (error) console.error('Save wied error:', error);
}
async function sbDeleteWied(id) {
  const { error } = await sb.from('wiederkehrend').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('Delete wied error:', error);
}
async function sbSaveUstMode(jahr, mode) {
  const { error } = await sb.from('ust_mode').upsert(
    { user_id: currentUser.id, jahr, mode }, { onConflict: 'user_id,jahr' }
  );
  if (error) console.error('Save ustMode error:', error);
}

// Старый persist — теперь не нужен но оставим для совместимости
function sbPersist() {}
function persist() {}

// ── UI ─────────────────────────────────────────────────────────────────────
function showAuthScreen() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
}
function hideAuthScreen() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
}
function authToggleMode() {
  const title = document.getElementById('auth-title');
  const btn = document.getElementById('auth-btn');
  const toggle = document.getElementById('auth-toggle-text');
  const isLogin = title.textContent.includes('Anmelden');
  title.textContent = isLogin ? '📝 Registrieren' : '🔐 Anmelden';
  btn.textContent = isLogin ? 'Registrieren' : 'Anmelden';
  toggle.innerHTML = isLogin
    ? 'Bereits registriert? <a href="#" onclick="authToggleMode()" style="color:var(--blue)">Anmelden</a>'
    : 'Noch kein Konto? <a href="#" onclick="authToggleMode()" style="color:var(--blue)">Registrieren</a>';
  document.getElementById('auth-error').textContent = '';
}
async function authSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const isLogin  = document.getElementById('auth-title').textContent.includes('Anmelden');
  const btn      = document.getElementById('auth-btn');
  const err      = document.getElementById('auth-error');
  err.textContent = '';
  if (!email || !password) { err.textContent = 'Bitte Email und Passwort eingeben.'; return; }
  if (password.length < 6) { err.textContent = 'Passwort mindestens 6 Zeichen.'; return; }
  btn.textContent = '...';
  btn.disabled = true;
  try {
    if (isLogin) {
      const result = await sbSignIn(email, password);
      if (result && result.user) {
        currentUser = result.user;
        const uel = document.getElementById('user-email-display');
        if (uel) uel.textContent = currentUser.email;
        const remoteData = await sbLoadAll();
        window._loadedRemoteData = remoteData;
        hideAuthScreen();
        window.dispatchEvent(new Event('supabase-ready'));
      }
    } else {
      await sbSignUp(email, password);
      err.style.color = 'var(--green)';
      err.textContent = '✅ Registriert! Bitte jetzt anmelden.';
      btn.textContent = 'Registrieren';
      btn.disabled = false;
      setTimeout(() => {
        err.style.color = 'var(--red)';
        err.textContent = '';
        authToggleMode();
        document.getElementById('auth-email').value = email;
        document.getElementById('auth-password').value = '';
      }, 1500);
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

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
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
    const remoteData = await sbLoadAll();
    window._loadedRemoteData = remoteData || null;
    hideAuthScreen();
    window.dispatchEvent(new Event('supabase-ready'));
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    await startApp(session.user);
  } else {
    showAuthScreen();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && session.user) {
      await startApp(session.user);
    } else if (event === 'SIGNED_OUT') {
      appStarted = false;
      showAuthScreen();
    }
  });
});
