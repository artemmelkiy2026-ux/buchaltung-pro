// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM — MelaLogic
// ══════════════════════════════════════════════════════════════════════════════

let _notifData = [];      // все уведомления (системные + из БД)
let _notifUnread = 0;

// ── Загрузка из Supabase ───────────────────────────────────────────────────
async function loadNotifications() {
  if (!currentUser) return;
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

// ── Системные уведомления (считаются из данных программы) ─────────────────
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
      id: 'sys-overdue',
      type: 'warning',
      icon: 'fa-file-invoice-dollar',
      title: `${overdue.length} überfällige Rechnung${overdue.length > 1 ? 'en' : ''}`,
      body: `Offene Forderungen: ${fmt(total)} — Mahnungen empfohlen`,
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="rechnungen"]'); if(el) nav('rechnungen', el); }
    });
  }

  // 2. Angebote die bald ablaufen (in 3 Tagen)
  const in3days = new Date(today); in3days.setDate(in3days.getDate() + 3);
  const in3Str = in3days.toISOString().split('T')[0];
  const expiring = (data.angebote || []).filter(a =>
    a.status === 'offen' && a.gueltig && a.gueltig >= todayStr && a.gueltig <= in3Str
  );
  if (expiring.length > 0) {
    notifs.push({
      id: 'sys-expiring',
      type: 'warning',
      icon: 'fa-hourglass-half',
      title: `${expiring.length} Angebot${expiring.length > 1 ? 'e laufen' : ' läuft'} bald ab`,
      body: expiring.map(a => `${a.nr}: bis ${fd(a.gueltig)}`).join(' · '),
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="angebote"]'); if(el) nav('angebote', el); }
    });
  }

  // 3. USt-VA Deadline (3 Tage vorher)
  const mo = today.getMonth(), yr = today.getFullYear();
  const frist = new Date(yr, mo + 1, 10);
  const diffDays = Math.ceil((frist - today) / 86400000);
  const isRegel = !isKleinunternehmer(yr + '');
  if (isRegel && diffDays <= 3 && diffDays >= 0) {
    const mon = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    notifs.push({
      id: 'sys-ust-va',
      type: 'danger',
      icon: 'fa-landmark',
      title: `USt-Voranmeldung fällig in ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`,
      body: `${mon[mo+1 > 11 ? 0 : mo+1]}-Meldung bis 10.${String(mo+2 > 12 ? 1 : mo+2).padStart(2,'0')}.${mo+2 > 12 ? yr+1 : yr}`,
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="ust"]'); if(el) nav('ust', el); }
    });
  }

  // 4. KU-Limit > 80%
  const curYrStr = today.getFullYear() + '';
  if (isKleinunternehmer(curYrStr)) {
    const ye = activeEintraegeMitRech(curYrStr);
    const ein = sum(ye, 'Einnahme');
    const pct = Math.round(ein / 25000 * 100);
    if (pct >= 80) {
      notifs.push({
        id: 'sys-ku-limit',
        type: pct >= 95 ? 'danger' : 'warning',
        icon: 'fa-tachometer-alt',
        title: `KU-Limit: ${pct}% erreicht`,
        body: `${fmt(ein)} von 25.000 € — ${fmt(Math.max(0, 25000 - ein))} verbleibend`,
        created_at: todayStr,
        action: null
      });
    }
  }

  // 5. Offene Rechnungen > 30 Tage
  const longOpen = (data.rechnungen || []).filter(r => {
    if (r.status !== 'offen') return false;
    const d = new Date(r.datum);
    return Math.floor((today - d) / 86400000) > 30;
  });
  if (longOpen.length > 0) {
    notifs.push({
      id: 'sys-long-open',
      type: 'info',
      icon: 'fa-clock',
      title: `${longOpen.length} Rechnung${longOpen.length > 1 ? 'en' : ''} seit 30+ Tagen offen`,
      body: longOpen.slice(0, 3).map(r => `${r.nr}: ${fmt(r.betrag)}`).join(' · '),
      created_at: todayStr,
      action: () => { const el = document.querySelector('.nav-item[onclick*="rechnungen"]'); if(el) nav('rechnungen', el); }
    });
  }

  return notifs;
}

// ── Читанные уведомления (хранятся в localStorage) ────────────────────────
function _getReadIds() {
  try { return JSON.parse(localStorage.getItem('ml_notif_read') || '[]'); } catch { return []; }
}
function _markRead(id) {
  const ids = _getReadIds();
  if (!ids.includes(id)) { ids.push(id); localStorage.setItem('ml_notif_read', JSON.stringify(ids)); }
}
function _markAllRead() {
  const ids = _notifData.map(n => n.id || n.sys_id || String(n.created_at));
  localStorage.setItem('ml_notif_read', JSON.stringify(ids));
}

// ── Главная функция — собрать все уведомления и обновить счётчик ───────────
async function refreshNotifications() {
  const sysNotifs  = getSystemNotifications();
  const dbNotifs   = await loadNotifications();

  // Объединяем: сначала системные, потом из БД
  _notifData = [
    ...sysNotifs,
    ...dbNotifs.map(n => ({
      id: n.id,
      type: n.type || 'info',
      icon: n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'danger' ? 'fa-fire' : n.type === 'success' ? 'fa-check-circle' : 'fa-bell',
      title: n.title,
      body: n.body || '',
      created_at: n.created_at,
      from_admin: true,
      action: null
    }))
  ];

  const readIds = _getReadIds();
  _notifUnread = _notifData.filter(n => !readIds.includes(n.id)).length;

  _updateBell();
  if (document.getElementById('p-notifications')?.classList.contains('active')) {
    renderNotificationsPage();
  }
}

// ── Колокольчик ────────────────────────────────────────────────────────────
function _updateBell() {
  const val = _notifUnread > 9 ? '9+' : String(_notifUnread);
  ['notif-badge','notif-badge-mob'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_notifUnread > 0) { el.textContent = val; el.style.display = 'flex'; }
    else { el.style.display = 'none'; }
  });
}

// ── Страница уведомлений ──────────────────────────────────────────────────
function renderNotificationsPage() {
  const container = document.getElementById('notif-list');
  if (!container) return;

  _markAllRead();
  _notifUnread = 0;
  _updateBell();

  if (_notifData.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--sub)">
        <i class="fas fa-bell-slash" style="font-size:48px;opacity:.2;margin-bottom:16px;display:block"></i>
        <div style="font-size:15px;font-weight:600">Keine Benachrichtigungen</div>
        <div style="font-size:13px;margin-top:6px">Alles ist in Ordnung!</div>
      </div>`;
    return;
  }

  const colors = {
    danger:  { bg:'#fef2f2', border:'#fecaca', icon:'#dc2626', badge:'#dc2626' },
    warning: { bg:'#fffbeb', border:'#fde68a', icon:'#d97706', badge:'#d97706' },
    success: { bg:'#f0fdf4', border:'#bbf7d0', icon:'#16a34a', badge:'#16a34a' },
    info:    { bg:'var(--s2)', border:'var(--border)', icon:'var(--blue)', badge:'var(--blue)' },
  };

  container.innerHTML = _notifData.map(n => {
    const c = colors[n.type] || colors.info;
    const date = n.created_at ? (n.created_at.length > 10 ? fd(n.created_at.split('T')[0]) : fd(n.created_at)) : '';
    return `
      <div onclick="${n.action ? '('+n.action.toString()+')()' : ''}" 
           style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:16px;display:flex;gap:14px;align-items:flex-start;${n.action ? 'cursor:pointer' : ''}">
        <div style="width:38px;height:38px;border-radius:10px;background:${c.badge};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${n.icon}" style="color:#fff;font-size:15px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${n.title}</div>
            ${n.from_admin ? '<span style="font-size:10px;background:var(--blue);color:#fff;padding:2px 7px;border-radius:20px;font-weight:600;flex-shrink:0">MelaLogic</span>' : ''}
          </div>
          ${n.body ? `<div style="font-size:12px;color:var(--sub);line-height:1.5">${n.body}</div>` : ''}
          ${date ? `<div style="font-size:11px;color:var(--sub);margin-top:6px;opacity:.7">${date}</div>` : ''}
        </div>
        ${n.action ? '<i class="fas fa-chevron-right" style="color:var(--sub);opacity:.4;flex-shrink:0;margin-top:2px"></i>' : ''}
      </div>`;
  }).join('');
}
