// ═══════════════════════════════════════════════════════════════════
// SELECT MODE — Auswählen / Bulk-Delete + Context Menu
// ═══════════════════════════════════════════════════════════════════

window._selectMode = window._selectMode || {};
window._selected   = window._selected   || {};

const SELECT_SECTIONS = ['kunden','produkte'];
SELECT_SECTIONS.forEach(s => {
  if (!(s in window._selectMode)) window._selectMode[s] = false;
  if (!(s in window._selected))   window._selected[s]   = new Set();
});

function toggleSelectMode(section) {
  window._selectMode[section] = !window._selectMode[section];
  window._selected[section] = new Set();
  _refreshSelectUI(section);
  _rerender(section);
}

function toggleSelectItem(section, id, cb) {
  if (cb.checked) window._selected[section].add(id);
  else            window._selected[section].delete(id);
  _refreshSelectUI(section);
}

function _refreshSelectUI(section) {
  const active = window._selectMode[section];
  const count  = window._selected[section].size;
  const btnSel = document.getElementById(`btn-select-${section}`);
  const btnDel = document.getElementById(`btn-bulk-del-${section}`);
  if (btnSel) {
    btnSel.classList.toggle('active', active);
    btnSel.innerHTML = active
      ? '<i class="fas fa-times"></i><span class="ang-btn-txt"> Abbrechen</span>'
      : '<i class="fas fa-check-square"></i><span class="ang-btn-txt"> Auswählen</span>';
  }
  if (btnDel) {
    btnDel.style.display = (active && count > 0) ? '' : 'none';
    btnDel.innerHTML = `<i class="fas fa-trash"></i><span class="ang-btn-txt"> ${count} löschen</span>`;
  }
}

async function bulkDelete(section) {
  const ids = [...window._selected[section]];
  if (!ids.length) return;
  const ok = await appConfirm(`${ids.length} Einträge wirklich löschen?`,
    { title: 'Mehrere löschen', icon: '🗑️', okLabel: 'Löschen', danger: true });
  if (!ok) return;

  if (section === 'kunden') {
    ids.forEach(id => { data.kunden = (data.kunden||[]).filter(k=>k.id!==id); sbDeleteKunde(id); });
    toast(`${ids.length} Kunden gelöscht`, 'err'); renderKunden();
  } else if (section === 'produkte') {
    ids.forEach(id => { data.produkte = (data.produkte||[]).filter(p=>p.id!==id); sbDeleteProdukt(id); });
    toast(`${ids.length} Produkte gelöscht`, 'err'); renderProdukte();
  }

  window._selected[section].clear();
  window._selectMode[section] = false;
  _refreshSelectUI(section);
}

function _rerender(section) {
  const map = { eintraege:'renderEin', wiederkehrend:'renderWied', angebote:'renderAngebote',
                rechnungen:'renderRech', kunden:'renderKunden', produkte:'renderProdukte' };
  if (typeof window[map[section]] === 'function') window[map[section]]();
}

// ── Checkbox HTML ──────────────────────────────────────────────────
function _selCb(section, id) {
  const active = window._selectMode && window._selectMode[section];
  const checked = active && window._selected[section].has(id) ? 'checked' : '';
  return `<input type="checkbox" class="sel-cb${active?' sel-cb-on':''}" data-section="${section}" data-id="${id}"
    ${checked} onclick="event.stopPropagation();toggleSelectItem('${section}','${id}',this)"
    style="width:15px;height:15px;flex-shrink:0;accent-color:var(--blue);cursor:pointer;${active?'':'opacity:0;pointer-events:none'}">`;
}

// ── Context menu ───────────────────────────────────────────────────
// items: [{icon, label, action, danger?}]
// Call as: showCtxMenu(event, [{...}])
function showCtxMenu(e, items) {
  if (e) { e.stopPropagation && e.stopPropagation(); e.preventDefault && e.preventDefault(); }

  // Закрыть все открытые меню
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  if (!items || !items.length) return;

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  // Сохраняем items в data-атрибуте через индекс
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'ctx-menu-item';
    el.dataset.i = i;
    // pointer-events:none на дочерних — ev.target всегда будет el
    el.innerHTML = `<i class="fas ${item.icon}" style="width:18px;font-size:13px;pointer-events:none"></i>`
      + `<span style="pointer-events:none">${item.label}</span>`;
    if (item.danger) el.style.color = 'var(--red)';
    menu.appendChild(el);
  });

  // Один обработчик на menu через делегирование
  function onAction(ev) {
    const el = ev.target.closest('[data-i]');
    if (!el || !menu.contains(el)) return;
    ev.stopPropagation();
    ev.preventDefault();
    const item = items[+el.dataset.i];
    cleanup();
    if (item && typeof item.action === 'function') {
      // requestAnimationFrame гарантирует что меню закрыто до вызова action
      requestAnimationFrame(() => {
        try { item.action(); } catch(err) { console.error('ctx action:', err); }
      });
    }
  }

  function cleanup() {
    menu.remove();
    document.removeEventListener('mousedown', onAction, true);
    document.removeEventListener('touchstart', onAction, true);
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('touchstart', onOutside, true);
  }

  function onOutside(ev) {
    if (!menu.contains(ev.target)) cleanup();
  }

  // capture:true — срабатывает раньше любых других обработчиков
  menu.addEventListener('mousedown', onAction);
  menu.addEventListener('touchstart', onAction, { passive: false });

  document.body.appendChild(menu);

  // Позиционирование
  const trigger = e && (e.currentTarget || e.target);
  const vw = window.innerWidth, vh = window.innerHeight;
  const mW = 200, mH = items.length * 50 + 12;
  let top = 0, left = 0;
  if (trigger) {
    const r = trigger.getBoundingClientRect();
    left = Math.min(Math.max(8, r.right - mW), vw - mW - 8);
    top  = r.bottom + 6;
    if (top + mH > vh - 8) top = Math.max(8, r.top - mH - 6);
  }
  menu.style.cssText = `position:fixed;left:${left}px;top:${top}px;min-width:${mW}px;z-index:99999`;

  // Закрытие по тапу вне меню — небольшая задержка чтобы не сработало сразу
  setTimeout(() => {
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('touchstart', onOutside, true);
  }, 80);
}

function _moreBtn(items) {
  _moreBtn._n = (_moreBtn._n || 0) + 1;
  const id = '_ctx_' + _moreBtn._n;
  window._ctxReg = window._ctxReg || {};
  window._ctxReg[id] = items;
  return `<button class="mob-more-btn" title="Mehr"
    onclick="event.stopPropagation();showCtxMenu(event,window._ctxReg['${id}'])">
    <i class="fas fa-ellipsis-v"></i></button>`;
}
