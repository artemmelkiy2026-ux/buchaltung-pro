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
  if (e && e.stopPropagation) e.stopPropagation();
  if (e && e.preventDefault)  e.preventDefault();

  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  if (!items || !items.length) return;

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'ctx-menu-item';
    el.dataset.idx = idx;
    el.innerHTML = `<i class="fas ${item.icon}" style="width:18px;font-size:13px;pointer-events:none"></i><span style="pointer-events:none">${item.label}</span>`;
    if (item.danger) el.style.color = 'var(--red)';
    menu.appendChild(el);
  });

  // Делегирование на menu — один обработчик для всех пунктов
  const handleAction = (ev) => {
    alert('handleAction fired! type=' + ev.type + ' target=' + ev.target.className);
    const el = ev.target.closest('.ctx-menu-item');
    if (!el) { alert('no ctx-menu-item found'); return; }
    ev.stopPropagation();
    ev.preventDefault();
    const idx = parseInt(el.dataset.idx);
    const item = items[idx];
    alert('item=' + (item ? item.label : 'undefined') + ' action=' + typeof item?.action);
    menu.remove();
    document.removeEventListener('mousedown', outsideClose, true);
    document.removeEventListener('touchstart', outsideClose, true);
    if (item && typeof item.action === 'function') {
      setTimeout(() => { try { item.action(); } catch(err) { alert('action error: ' + err.message); } }, 0);
    }
  };

  menu.addEventListener('mousedown', handleAction);
  menu.addEventListener('touchstart', handleAction, { passive: false });

  document.body.appendChild(menu);

  // Позиционирование
  const trigger = e && (e.currentTarget || e.target);
  const vw = window.innerWidth, vh = window.innerHeight;
  const mW = 200;
  let top, left;
  if (trigger) {
    const r = trigger.getBoundingClientRect();
    left = Math.max(8, r.right - mW);
    top  = r.bottom + 6;
    const mH = items.length * 50 + 12;
    if (top + mH > vh - 8) top = Math.max(8, r.top - mH - 6);
  } else {
    left = Math.max(8, (e ? e.clientX : vw/2) - mW/2);
    top  = e ? e.clientY + 6 : vh/2;
  }
  left = Math.min(left, vw - mW - 8);
  top  = Math.max(8, top);
  menu.style.cssText = `position:fixed;left:${left}px;top:${top}px;min-width:${mW}px;z-index:99999`;

  // Закрытие по тапу вне меню
  const outsideClose = (ev) => {
    if (menu.contains(ev.target)) return;
    menu.remove();
    document.removeEventListener('mousedown', outsideClose, true);
    document.removeEventListener('touchstart', outsideClose, true);
  };
  setTimeout(() => {
    document.addEventListener('mousedown', outsideClose, true);
    document.addEventListener('touchstart', outsideClose, true);
  }, 50);
}



// ── ⋮ button helper ────────────────────────────────────────────────
// Usage: _moreBtn('sectionId', itemsArrayAsJSONSafeString)
// Because this runs inside template literals, we pass items via a global registry keyed by unique id
function _moreBtn(items) {
  _moreBtn._n = (_moreBtn._n || 0) + 1;
  const id = '_ctx_' + _moreBtn._n;
  window._ctxReg = window._ctxReg || {};
  window._ctxReg[id] = items;
  return `<button class="mob-more-btn" title="Mehr"
    onclick="event.stopPropagation();showCtxMenu(event,window._ctxReg['${id}'])">
    <i class="fas fa-ellipsis-v"></i></button>`;
}
