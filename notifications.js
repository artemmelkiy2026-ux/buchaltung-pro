// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM — MelaLogic
// Состояние синхронизируется через Supabase (notif_state), не localStorage
// ══════════════════════════════════════════════════════════════════════════════

let _notifData   = [];
let _notifUnread = 0;
let _notifFilter  = 'all'; // 'all' | 'danger' | 'warning' | 'admin' | 'archive'
let _notifPage    = 1;
const NOTIF_PER_PAGE = 10;

// ── Локальный кеш состояния (для мгновенного отклика UI) ──────────────────
let _notifState = {
  read_ids:  [],   // прочитанные ID
  archived:  [],   // архив [{...notif, archived_at}]
  dismissed: {},   // системные скрытые {id: timestamp_до}
};
let _notifStateDirty = false; // есть несохранённые изменения

// ══════════════════════════════════════════════════════════════════════════════
// Supabase — загрузка и сохранение состояния
// ══════════════════════════════════════════════════════════════════════════════

async function _loadNotifState() {
  if (!currentUser) return;
  try {
    const { data, error } = await sb
      .from('notif_state')
      .select('read_ids, archived, dismissed')
      .eq('user_id', currentUser.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = row not found
    if (data) {
      _notifState.read_ids  = Array.isArray(data.read_ids)  ? data.read_ids  : [];
      _notifState.archived  = Array.isArray(data.archived)  ? data.archived  : [];
      _notifState.dismissed = (data.dismissed && typeof data.dismissed === 'object') ? data.dismissed : {};
    }
  } catch(e) {
    console.warn('[notif_state] load error:', e);
    // Fallback: пробуем localStorage для плавного перехода
    try {
      const r = localStorage.getItem('ml_notif_read');
      const a = localStorage.getItem('ml_notif_archive');
      const d = localStorage.getItem('ml_sys_dismissed');
      if (r) _notifState.read_ids  = JSON.parse(r);
      if (a) _notifState.archived  = JSON.parse(a);
      if (d) _notifState.dismissed = JSON.parse(d);
    } catch(_) {}
  }
}

async function _saveNotifState() {
  if (!currentUser || !_notifStateDirty) return;
  _notifStateDirty = false;
  // Ограничиваем архив 100 записями
  if (_notifState.archived.length > 100) {
    _notifState.archived = _notifState.archived.slice(0, 100);
  }
  try {
    await sb.from('notif_state').upsert({
      user_id:    currentUser.id,
      read_ids:   _notifState.read_ids,
      archived:   _notifState.archived,
      dismissed:  _notifState.dismissed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch(e) {
    console.warn('[notif_state] save error:', e);
    _notifStateDirty = true; // попробуем позже
  }
}

// Дебаунс сохранения — не дёргаем Supabase на каждый клик
let _saveTimer = null;
function _scheduleSave() {
  _notifStateDirty = true;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveNotifState, 1500);
}

// ══════════════════════════════════════════════════════════════════════════════
// Архив
// ══════════════════════════════════════════════════════════════════════════════

function _getArchive() { return _notifState.archived; }

function _archiveNotif(n) {
  if (_notifState.archived.some(a => a.id === n.id)) return;
  _notifState.archived.unshift({ ...n, archived_at: new Date().toISOString() });
  _scheduleSave();
}

function _removeFromArchive(id) {
  _notifState.archived = _notifState.archived.filter(a => a.id !== id);
  _scheduleSave();
}

function _clearArchive() {
  _notifState.archived = [];
  _scheduleSave();
}

// ══════════════════════════════════════════════════════════════════════════════
// Dismissed (системные — скрыть на 24ч)
// ══════════════════════════════════════════════════════════════════════════════

function _getDismissed()    { return _notifState.dismissed; }

function _dismissSystem(id) {
  _notifState.dismissed[id] = Date.now() + 24*60*60*1000;
  _scheduleSave();
}

function _isSystemDismissed(id) {
  const d = _notifState.dismissed;
  return d[id] && d[id] > Date.now();
}

// ══════════════════════════════════════════════════════════════════════════════
// Прочитанные
// ══════════════════════════════════════════════════════════════════════════════

function _getReadIds() { return _notifState.read_ids; }

function _markRead(id) {
  if (!_notifState.read_ids.includes(id)) {
    _notifState.read_ids.push(id);
    _scheduleSave();
  }
}

function _markAllRead() {
  const ids = _notifData.map(n => n.id || String(n.created_at));
  let changed = false;
  ids.forEach(id => {
    if (!_notifState.read_ids.includes(id)) {
      _notifState.read_ids.push(id);
      changed = true;
    }
  });
  if (changed) _scheduleSave();
}

// ══════════════════════════════════════════════════════════════════════════════
// Загрузка уведомлений из Supabase (от администратора)
// ══════════════════════════════════════════════════════════════════════════════

async function loadNotifications() {
  if (!currentUser) return [];
  try {
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .or(`target_user_id.is.null,target_user_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.error('[Notifications] load error:', e);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Системные уведомления (генерируются из данных программы)
// ══════════════════════════════════════════════════════════════════════════════

function getSystemNotifications() {
  const notifs = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1. Просроченные счета
  const overdue = (data.rechnungen || []).filter(r => {
    if (r.status === 'bezahlt' || r.status === 'storniert') return false;
    return r.faellig && r.faellig < todayStr;
  });
  if (overdue.length > 0) {
    const total = overdue.reduce((s, r) => s + (r.betrag || 0), 0);
    notifs.push({
      id: 'sys-overdue', type: 'warning', icon: 'fa-file-invoice-dollar',
      title: `${overdue.length} überfällige Rechnung${overdue.length > 1 ? 'en' : ''}`,
      body: `Offene Forderungen: ${fmt(total)} — Mahnungen empfohlen`,
      created_at: todayStr,
      action: () => {
        const el = document.querySelector('.nav-item[onclick*="rechnungen"]');
        if (el) nav('rechnungen', el);
        overdue.forEach(r => { if (typeof highlightRechnung === 'function') highlightRechnung(r.id); });
      }
    });
    overdue.slice(0, 3).forEach(r => {
      const daysDue = Math.floor((new Date() - new Date(r.faellig)) / 86400000);
      notifs.push({
        id: `sys-overdue-${r.id}`, type: 'danger', icon: 'fa-exclamation-circle',
        title: `Rechnung ${r.nr} — ${daysDue} Tage überfällig`,
        body: `${r.kunde || r.beschreibung || '—'} · ${fmt(r.betrag)}`,
        created_at: todayStr,
        action: () => {
          const el = document.querySelector('.nav-item[onclick*="rechnungen"]');
          if (el) nav('rechnungen', el);
          setTimeout(() => { if (typeof highlightRechnung === 'function') highlightRechnung(r.id); }, 500);
        }
      });
    });
  }

  // 2. Angebote bald ablaufend
  const in3days = new Date(today); in3days.setDate(in3days.getDate() + 3);
  const in3Str  = in3days.toISOString().split('T')[0];
  const expiring = (data.angebote || []).filter(a =>
    a.status === 'offen' && a.gueltig && a.gueltig >= todayStr && a.gueltig <= in3Str
  );
  if (expiring.length > 0) {
    notifs.push({
      id: 'sys-expiring', type: 'warning', icon: 'fa-hourglass-half',
      title: `${expiring.length} Angebot${expiring.length > 1 ? 'e laufen' : ' läuft'} bald ab`,
      body: expiring.map(a => `${a.nr}: bis ${fd(a.gueltig)}`).join(' · '),
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="angebote"]'); if(el) nav('angebote', el); }
    });
  }

  // 3. USt-VA Deadline
  const mo = today.getMonth(), yr = today.getFullYear();
  const frist = new Date(yr, mo + 1, 10);
  const diffDays = Math.ceil((frist - today) / 86400000);
  if (!isKleinunternehmer(yr + '') && diffDays <= 3 && diffDays >= 0) {
    const mon = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    notifs.push({
      id: 'sys-ust-va', type: 'danger', icon: 'fa-landmark',
      title: `USt-Voranmeldung fällig in ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`,
      body: `${mon[mo+1 > 11 ? 0 : mo+1]}-Meldung bis 10.${String(mo+2>12?1:mo+2).padStart(2,'0')}.${mo+2>12?yr+1:yr}`,
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="ust"]'); if(el) nav('ust', el); }
    });
  }

  // 4. KU-Limit > 80%
  const curYrStr = today.getFullYear() + '';
  if (isKleinunternehmer(curYrStr)) {
    const ye  = activeEintraegeMitRech(curYrStr);
    const ein = sum(ye, 'Einnahme');
    const pct = Math.round(ein / 25000 * 100);
    if (pct >= 80) {
      notifs.push({
        id: 'sys-ku-limit', type: pct >= 95 ? 'danger' : 'warning', icon: 'fa-tachometer-alt',
        title: `KU-Limit: ${pct}% erreicht`,
        body: `${fmt(ein)} von 25.000 € — ${fmt(Math.max(0, 25000 - ein))} verbleibend`,
        created_at: todayStr, action: null
      });
    }
  }

  // 5. Offene Rechnungen > 30 Tage
  const longOpen = (data.rechnungen || []).filter(r => {
    if (r.status !== 'offen') return false;
    return Math.floor((today - new Date(r.datum)) / 86400000) > 30;
  });
  if (longOpen.length > 0) {
    notifs.push({
      id: 'sys-long-open', type: 'info', icon: 'fa-clock',
      title: `${longOpen.length} Rechnung${longOpen.length > 1 ? 'en' : ''} seit 30+ Tagen offen`,
      body: longOpen.slice(0, 3).map(r => `${r.nr}: ${fmt(r.betrag)}`).join(' · '),
      created_at: todayStr,
      action: () => {
        const el = document.querySelector('.nav-item[onclick*="rechnungen"]');
        if (el) nav('rechnungen', el);
        longOpen.forEach(r => { if (typeof highlightRechnung === 'function') highlightRechnung(r.id); });
      }
    });
  }

  return notifs.filter(n => !_isSystemDismissed(n.id));
}

// ══════════════════════════════════════════════════════════════════════════════
// Главная функция — собрать все уведомления и обновить счётчик
// ══════════════════════════════════════════════════════════════════════════════

async function refreshNotifications() {
  // Загружаем состояние из Supabase (синхронизация между устройствами)
  await _loadNotifState();

  const sysNotifs = getSystemNotifications();
  const dbNotifs  = await loadNotifications();

  const allNotifs = [
    ...sysNotifs,
    ...dbNotifs.map(n => ({
      id:         n.id,
      type:       n.type || 'info',
      icon:       n.type === 'warning' ? 'fa-exclamation-triangle'
                : n.type === 'danger'  ? 'fa-fire'
                : n.type === 'success' ? 'fa-check-circle'
                : 'fa-bell',
      title:      n.title,
      body:       n.body || '',
      created_at: n.created_at,
      from_admin: true,
      action:     null
    }))
  ];

  _notifData = allNotifs.sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  );

  _notifUnread = _notifData.filter(n => !_getReadIds().includes(n.id)).length;

  _updateBell();
  if (document.getElementById('p-notifications')?.classList.contains('active')) {
    renderNotificationsPage();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Колокольчик
// ══════════════════════════════════════════════════════════════════════════════

function _updateBell() {
  const val = _notifUnread > 9 ? '9+' : String(_notifUnread);
  ['notif-badge','notif-badge-mob'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_notifUnread > 0) { el.textContent = val; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Страница уведомлений
// ══════════════════════════════════════════════════════════════════════════════

function renderNotificationsPage() {
  const container = document.getElementById('notif-list');
  if (!container) return;

  _markAllRead();
  _notifUnread = 0;
  _updateBell();
  _updateStatusPanel();
  _updateFilterButtons();

  const colors = {
    danger:  { bg:'#fef2f2', border:'#fecaca', icon:'#dc2626' },
    warning: { bg:'#fffbeb', border:'#fde68a', icon:'#d97706' },
    success: { bg:'#f0fdf4', border:'#bbf7d0', icon:'#16a34a' },
    info:    { bg:'var(--s2)', border:'var(--border)', icon:'var(--blue)' },
  };

  // ── Архив ─────────────────────────────────────────────────────────────
  if (_notifFilter === 'archive') {
    const arch = _getArchive();
    if (arch.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--sub)">
          <i class="fas fa-archive" style="font-size:48px;opacity:.2;margin-bottom:16px;display:block"></i>
          <div style="font-size:15px;font-weight:600;color:var(--text)">Archiv ist leer</div>
          <div style="font-size:13px;margin-top:6px">Geschlossene Benachrichtigungen erscheinen hier</div>
        </div>`;
      if(typeof renderPager==='function') renderPager('notif-pagination',1,1,0,'_notifArchPagerCb');
      return;
    }
    // Пагинация архива
    const archTotal = arch.length;
    const archTotalPages = Math.max(1, Math.ceil(archTotal / NOTIF_PER_PAGE));
    if (_notifPage > archTotalPages) _notifPage = archTotalPages;
    const archStart = (_notifPage - 1) * NOTIF_PER_PAGE;
    const archPage  = arch.slice(archStart, archStart + NOTIF_PER_PAGE);
    window._notifArchPagerCb = function(p){ _notifPage=p; renderNotificationsPage(); };

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:var(--sub)">${arch.length} archivierte Meldung${arch.length!==1?'en':''}</span>
        <button onclick="_clearArchive();renderNotificationsPage()"
                style="font-size:11px;color:var(--red);background:none;border:none;cursor:pointer;padding:2px 6px">
          <i class="fas fa-trash"></i> Alle löschen
        </button>
      </div>
      ${archPage.map(n => {
        const cl = colors[n.type] || colors.info;
        const date = n.archived_at ? fd(n.archived_at.split('T')[0]) : '';
        return `<div data-arch-id="${n.id}"
          style="background:${cl.bg};border:1px solid ${cl.border};border-radius:12px;padding:14px;
                 display:flex;gap:12px;align-items:flex-start;opacity:.7">
          <div style="width:34px;height:34px;border-radius:8px;background:${cl.icon};
                      display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${n.icon}" style="color:#fff;font-size:13px"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${n.title}</div>
            ${n.body ? `<div style="font-size:11px;color:var(--sub);margin-top:3px">${n.body}</div>` : ''}
            ${date ? `<div style="font-size:10px;color:var(--sub);margin-top:5px;opacity:.6">Archiviert: ${date}</div>` : ''}
          </div>
          <button data-arch-del="${n.id}"
                  style="background:none;border:none;color:var(--sub);cursor:pointer;opacity:.5;padding:0;font-size:12px"
                  title="Aus Archiv löschen">✕</button>
        </div>`;
      }).join('')}`;

    container.onclick = (e) => {
      const delBtn = e.target.closest('[data-arch-del]');
      if (delBtn) { _removeFromArchive(delBtn.dataset.archDel); renderNotificationsPage(); }
    };
    // Пагинация архива
    if(typeof renderPager==='function')
      renderPager('notif-pagination', _notifPage, archTotalPages, archTotal, '_notifArchPagerCb');
    return;
  }

  // ── Активные уведомления с фильтром ──────────────────────────────────
  let visible = _notifData;
  if (_notifFilter === 'danger')  visible = _notifData.filter(n => n.type === 'danger');
  if (_notifFilter === 'warning') visible = _notifData.filter(n => n.type === 'warning');
  if (_notifFilter === 'admin')   visible = _notifData.filter(n => n.from_admin);

  if (visible.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--sub)">
        <i class="fas fa-bell-slash" style="font-size:48px;opacity:.2;margin-bottom:16px;display:block"></i>
        <div style="font-size:15px;font-weight:600;color:var(--text)">
          ${_notifFilter === 'all' ? 'Keine Benachrichtigungen' : 'Keine Meldungen in dieser Kategorie'}
        </div>
        <div style="font-size:13px;margin-top:6px">
          ${_notifFilter === 'all' ? 'Alles in Ordnung!' : 'Filter wechseln oder alle anzeigen'}
        </div>
      </div>`;
    if(typeof renderPager==='function') renderPager('notif-pagination',1,1,0,'_notifPagerCb');
    return;
  }

  // Пагинация активных
  const notifTotal      = visible.length;
  const notifTotalPages = Math.max(1, Math.ceil(notifTotal / NOTIF_PER_PAGE));
  if (_notifPage > notifTotalPages) _notifPage = notifTotalPages;
  const notifStart  = (_notifPage - 1) * NOTIF_PER_PAGE;
  const visiblePage = visible.slice(notifStart, notifStart + NOTIF_PER_PAGE);
  window._notifPagerCb = function(p){ _notifPage=p; renderNotificationsPage(); };

  window._notifActions = visiblePage.map(n => n.action || null);

  container.innerHTML = visiblePage.map((n, idx) => {
    const cl   = colors[n.type] || colors.info;
    const isSys = n.id && n.id.startsWith('sys-');
    const date  = n.created_at
      ? (n.created_at.length > 10 ? fd(n.created_at.split('T')[0]) : fd(n.created_at))
      : '';
    return `
      <div data-notif-idx="${idx}"
           style="background:${cl.bg};border:1px solid ${cl.border};border-radius:12px;padding:16px;
                  display:flex;gap:14px;align-items:flex-start;${n.action?'cursor:pointer':''}">
        <div style="width:38px;height:38px;border-radius:10px;background:${cl.icon};
                    display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${n.icon}" style="color:#fff;font-size:15px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${n.title}</div>
            ${n.from_admin ? '<span style="font-size:10px;background:var(--blue);color:#fff;padding:2px 7px;border-radius:20px;font-weight:600;flex-shrink:0">MelaLogic</span>' : ''}
          </div>
          ${n.body ? `<div style="font-size:12px;color:var(--sub);line-height:1.5">${n.body}</div>` : ''}
          ${date ? `<div style="font-size:11px;color:var(--sub);margin-top:6px;opacity:.7">${date}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          ${n.action ? '<i class="fas fa-chevron-right" style="color:var(--sub);opacity:.4;margin-top:2px"></i>' : ''}
          <button data-dismiss="${n.id}"
                  style="background:none;border:none;color:var(--sub);font-size:13px;cursor:pointer;
                         opacity:.45;padding:2px 4px;line-height:1"
                  title="In Archiv verschieben">✕</button>
        </div>
      </div>`;
  }).join('');

  container.onclick = (e) => {
    const dismissBtn = e.target.closest('[data-dismiss]');
    if (dismissBtn) {
      e.stopPropagation();
      const id = dismissBtn.dataset.dismiss;
      const n  = visible.find(x => x.id === id);
      if (n) _archiveNotif(n);
      if (id.startsWith('sys-')) _dismissSystem(id);
      _notifData = _notifData.filter(x => x.id !== id);
      _notifUnread = Math.max(0, _notifUnread - 1);
      _updateBell();
      _updateStatusPanel();
      renderNotificationsPage();
      return;
    }
    const card = e.target.closest('[data-notif-idx]');
    if (!card) return;
    const action = window._notifActions?.[+card.dataset.notifIdx];
    if (typeof action === 'function') action();
  };

  // Пагинация активных уведомлений
  if(typeof renderPager==='function')
    renderPager('notif-pagination', _notifPage, notifTotalPages, notifTotal, '_notifPagerCb');
}

// ══════════════════════════════════════════════════════════════════════════════
// Фильтр-кнопки
// ══════════════════════════════════════════════════════════════════════════════

function setNotifFilter(f) {
  _notifFilter = f;
  _notifPage   = 1;
  renderNotificationsPage();
}

function _updateFilterButtons() {
  ['all','danger','warning','admin','archive'].forEach(f => {
    const btn = document.getElementById(`notif-filter-${f}`);
    if (!btn) return;
    const isActive = _notifFilter === f;
    btn.style.background  = isActive ? 'var(--blue)' : 'var(--s2)';
    btn.style.color       = isActive ? '#fff' : 'var(--sub)';
    btn.style.borderColor = isActive ? 'var(--blue)' : 'var(--border)';
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Кнопка обновления
// ══════════════════════════════════════════════════════════════════════════════

async function notifRefresh() {
  const btn  = document.getElementById('notif-refresh-btn');
  const icon = document.getElementById('notif-refresh-icon');
  if (btn)  btn.disabled = true;
  if (icon) icon.style.animation = 'spin 0.6s linear infinite';
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
  await refreshNotifications();
  if (icon) icon.style.animation = '';
  if (btn)  btn.disabled = false;
}

// ══════════════════════════════════════════════════════════════════════════════
// Правая панель — статус и счётчики
// ══════════════════════════════════════════════════════════════════════════════

function _updateStatusPanel() {
  const total  = _notifData.length;
  const urgent = _notifData.filter(n => n.type === 'danger').length;
  const warn   = _notifData.filter(n => n.type === 'warning').length;
  const admin  = _notifData.filter(n => n.from_admin).length;
  const arch   = _getArchive().length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('notif-count-total',   total);
  set('notif-count-urgent',  urgent);
  set('notif-count-warn',    warn);
  set('notif-count-admin',   admin);
  set('notif-count-archive', arch);
  set('notif-last-update',   new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}));

  const rows = document.getElementById('notif-status-rows');
  if (!rows) return;
  const checks = [
    { label: 'Rechnungen', ok: _notifData.filter(n=>n.id==='sys-overdue').length===0 },
    { label: 'KU-Limit',   ok: _notifData.filter(n=>n.id==='sys-ku-limit').length===0 },
    { label: 'USt-VA',     ok: _notifData.filter(n=>n.id==='sys-ust-va').length===0 },
    { label: 'Angebote',   ok: _notifData.filter(n=>n.id==='sys-expiring').length===0 },
  ];
  rows.innerHTML = checks.map(ch => `
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
      <span style="color:var(--sub)">${ch.label}</span>
      <span style="display:flex;align-items:center;gap:4px;font-weight:600;color:${ch.ok?'var(--green)':'var(--red)'}">
        <i class="fas ${ch.ok?'fa-check-circle':'fa-times-circle'}" style="font-size:11px"></i>
        ${ch.ok ? 'OK' : 'Prüfen'}
      </span>
    </div>`).join('');
}
