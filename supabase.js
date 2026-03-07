// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';

const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let saveTimer = null;

// ── AUTH HELPERS ───────────────────────────────────────────────────────────
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

// ── DATA HELPERS ───────────────────────────────────────────────────────────
async function sbLoadData() {
  if (!currentUser) return null;
  const { data: row, error } = await sb
    .from('user_data')
    .select('data')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) { console.error('Load error:', error); return null; }
  return row ? row.data : null;
}

async function sbSaveData(appData) {
  if (!currentUser) return;
  const { error } = await sb
    .from('user_data')
    .upsert({ user_id: currentUser.id, data: appData }, { onConflict: 'user_id' });
  if (error) console.error('Save error:', error);
}

function sbPersist(appData) {
  clearTimeout(saveTimer);
  const ind = document.getElementById('save-indicator');
  if (ind) { ind.textContent = '💾 Speichern...'; ind.style.opacity = '1'; }
  saveTimer = setTimeout(async () => {
    await sbSaveData(appData);
    if (ind) {
      ind.textContent = '✅ Gespeichert';
      setTimeout(() => { ind.style.opacity = '0'; }, 2000);
    }
  }, 1500);
}

// ── AUTH SCREEN ────────────────────────────────────────────────────────────
function showAuthScreen() {
  const a = document.getElementById('auth-screen');
  const w = document.getElementById('app-wrapper');
  if (a) a.style.display = 'flex';
  if (w) w.style.display = 'none';
}

function hideAuthScreen() {
  const a = document.getElementById('auth-screen');
  const w = document.getElementById('app-wrapper');
  if (a) a.style.display = 'none';
  if (w) w.style.display = 'block';
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
      await sbSignIn(email, password);
    } else {
      await sbSignUp(email, password);
      // Показываем сообщение — пусть сам нажмёт Anmelden
      err.style.color = 'var(--green)';
      err.textContent = '✅ Registriert! Bitte jetzt anmelden.';
      btn.textContent = 'Registrieren';
      btn.disabled = false;
      // Переключаем на форму входа
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
  if (msg.includes('Network') || msg.includes('fetch')) return '❌ Keine Internetverbindung.';
  return '❌ ' + msg;
}

// ── INIT nach DOM-Load ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });
  document.getElementById('auth-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });

  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, session?.user?.email);

    if (session && session.user) {
      currentUser = session.user;

      const uel = document.getElementById('user-email-display');
      if (uel) uel.textContent = currentUser.email;

      const remoteData = await sbLoadData();

      if (remoteData) {
        window._loadedRemoteData = remoteData;
      } else {
        const local = localStorage.getItem('buch_pro_v1');
        if (local) {
          try {
            window._loadedRemoteData = JSON.parse(local);
            await sbSaveData(window._loadedRemoteData);
            localStorage.removeItem('buch_pro_v1');
          } catch(e) { window._loadedRemoteData = null; }
        }
      }

      hideAuthScreen();
      window.dispatchEvent(new Event('supabase-ready'));

    } else {
      currentUser = null;
      showAuthScreen();
    }
  });
});
