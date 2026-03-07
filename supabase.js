// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPA_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWhzdHl0b29ucGFjeHdkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTY2NzQsImV4cCI6MjA4ODQ5MjY3NH0.oZQD0Dp6mB0pF7hwAQdvQ7_OJe__cBq-MFtAEdB7K84';

const { createClient } = supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let saveTimer = null;

// ── AUTH HELPERS ───────────────────────────────────────────────────────────
async function sbSignUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function sbSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function sbSignOut() {
  await sb.auth.signOut();
  currentUser = null;
  showAuthScreen();
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

// Audit Trail — логируем каждое изменение
async function sbAudit(action, tableName, recordId, oldData, newData) {
  if (!currentUser) return;
  await sb.from('audit_log').insert({
    user_id: currentUser.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData || null,
    new_data: newData || null
  });
}

// Debounced save — сохраняем через 1.5 сек после последнего изменения
function sbPersist(appData) {
  clearTimeout(saveTimer);
  // Показываем индикатор сохранения
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
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
}

function authToggleMode() {
  const isLogin = document.getElementById('auth-title').textContent.includes('Anmelden');
  document.getElementById('auth-title').textContent = isLogin ? '📝 Registrieren' : '🔐 Anmelden';
  document.getElementById('auth-btn').textContent = isLogin ? 'Registrieren' : 'Anmelden';
  document.getElementById('auth-toggle-text').innerHTML = isLogin
    ? 'Bereits registriert? <a href="#" onclick="authToggleMode()">Anmelden</a>'
    : 'Noch kein Konto? <a href="#" onclick="authToggleMode()">Registrieren</a>';
  document.getElementById('auth-error').textContent = '';
}

async function authSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const isLogin = document.getElementById('auth-title').textContent.includes('Anmelden');
  const btn = document.getElementById('auth-btn');
  const err = document.getElementById('auth-error');

  if (!email || !password) { err.textContent = 'Bitte Email und Passwort eingeben.'; return; }
  if (password.length < 6) { err.textContent = 'Passwort mindestens 6 Zeichen.'; return; }

  btn.textContent = '...';
  btn.disabled = true;
  err.textContent = '';

  try {
    if (isLogin) {
      await sbSignIn(email, password);
    } else {
      await sbSignUp(email, password);
    }
  } catch(e) {
    err.textContent = translateAuthError(e.message);
    btn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
    btn.disabled = false;
  }
}

function translateAuthError(msg) {
  if (msg.includes('Invalid login')) return '❌ Falsche Email oder Passwort.';
  if (msg.includes('already registered')) return '❌ Diese Email ist bereits registriert.';
  if (msg.includes('valid email')) return '❌ Bitte gültige Email eingeben.';
  if (msg.includes('Network')) return '❌ Keine Internetverbindung.';
  return '❌ ' + msg;
}

// Enter key on password field
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });
  document.getElementById('auth-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') authSubmit();
  });
});

// ── AUTH STATE LISTENER ────────────────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;

    // Показываем email пользователя
    const uel = document.getElementById('user-email-display');
    if (uel) uel.textContent = currentUser.email;

    // Загружаем данные из Supabase
    const remoteData = await sbLoadData();

    if (remoteData) {
      // Есть данные в облаке — используем их
      window._loadedRemoteData = remoteData;
    } else {
      // Новый пользователь — проверяем localStorage (миграция)
      const local = localStorage.getItem('buch_pro_v1');
      if (local) {
        try {
          window._loadedRemoteData = JSON.parse(local);
          // Сохраняем в облако сразу
          await sbSaveData(window._loadedRemoteData);
          localStorage.removeItem('buch_pro_v1');
          console.log('✅ Migrated from localStorage to Supabase');
        } catch(e) { window._loadedRemoteData = null; }
      }
    }

    hideAuthScreen();
    // Сигнализируем app.js что данные готовы
    window.dispatchEvent(new Event('supabase-ready'));

  } else {
    currentUser = null;
    showAuthScreen();
  }
});
