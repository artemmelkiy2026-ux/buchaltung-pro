// ═══════════════════════════════════════════════════════════════════
// SELECT MODE — Auswählen / Bulk-Delete für alle Sektionen
// ═══════════════════════════════════════════════════════════════════

// State pro Sektion
window._selectMode = {}; // { eintraege: false, wiederkehrend: false, ... }
window._selected   = {}; // { eintraege: Set(), ... }

const SELECT_SECTIONS = ['eintraege','wiederkehrend','angebote','rechnungen','kunden','produkte'];

SELECT_SECTIONS.forEach(s => {
  window._selectMode[s] = false;
  window._selected[s]   = new Set();
});

// ── Auswählen ein/aus ──────────────────────────────────────────────
function toggleSelectMode(section) {
  const active = !window._selectMode[section];
  window._selectMode[section] = active;
  window._selected[section] = new Set();
  _refreshSelectUI(section);
  // re-render so checkboxes appear/disappear
  _rerender(section);
}

// ── Checkbox toggle ────────────────────────────────────────────────
function toggleSelectItem(section, id, cb) {
  const s = window._selected[section];
  if (cb.checked) s.add(id);
  else            s.delete(id);
  _refreshSelectUI(section);
}

// ── Select All toggle ──────────────────────────────────────────────
function toggleSelectAll(section, cb) {
  const s = window._selected[section];
  const boxes = document.querySelectorAll(`.sel-cb[data-section="${section}"]`);
  if (cb.checked) { boxes.forEach(b => { b.checked = true; s.add(b.dataset.id); }); }
  else            { boxes.forEach(b => { b.checked = false; }); s.clear(); }
  _refreshSelectUI(section);
}

// ── Refresh button bar ─────────────────────────────────────────────
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

// ── Bulk Delete ────────────────────────────────────────────────────
async function bulkDelete(section) {
  const ids = [...window._selected[section]];
  if (!ids.length) return;

  const ok = await appConfirm(
    `${ids.length} Einträge wirklich löschen?`,
    { title: 'Mehrere löschen', icon: '🗑️', okLabel: 'Löschen', danger: true }
  );
  if (!ok) return;

  if (section === 'eintraege') {
    // GoBD: Storno for each
    let done = 0;
    for (const id of ids) {
      const storno = await sbStornoEintrag(id);
      if (storno) { data.eintraege.push(storno); done++; }
    }
    toast(`${done} Einträge storniert`, 'ok');

  } else if (section === 'wiederkehrend') {
    ids.forEach(id => {
      data.wiederkehrend = (data.wiederkehrend||[]).filter(w => w.id !== id);
      sbDeleteWied(id);
    });
    toast(`${ids.length} Vorlagen gelöscht`, 'err');
    renderWied();

  } else if (section === 'angebote') {
    ids.forEach(id => {
      data.angebote = (data.angebote||[]).filter(a => a.id !== id);
      if (typeof sbDeleteAngebot === 'function') sbDeleteAngebot(id);
    });
    toast(`${ids.length} Angebote gelöscht`, 'err');
    renderAngebote();

  } else if (section === 'rechnungen') {
    ids.forEach(id => {
      data.rechnungen = (data.rechnungen||[]).filter(r => r.id !== id);
      sbDeleteRechnung(id);
    });
    toast(`${ids.length} Rechnungen gelöscht`, 'err');
    renderRech();

  } else if (section === 'kunden') {
    ids.forEach(id => {
      data.kunden = (data.kunden||[]).filter(k => k.id !== id);
      sbDeleteKunde(id);
    });
    toast(`${ids.length} Kunden gelöscht`, 'err');
    renderKunden();

  } else if (section === 'produkte') {
    ids.forEach(id => {
      data.produkte = (data.produkte||[]).filter(p => p.id !== id);
      sbDeleteProdukt(id);
    });
    toast(`${ids.length} Produkte gelöscht`, 'err');
    renderProdukte();
  }

  if (section === 'eintraege') { renderAll(); }

  window._selected[section].clear();
  window._selectMode[section] = false;
  _refreshSelectUI(section);
  if (section === 'eintraege') _rerender(section);
}

// ── Re-render dispatcher ───────────────────────────────────────────
function _rerender(section) {
  switch(section) {
    case 'eintraege':    renderEin(); break;
    case 'wiederkehrend': renderWied(); break;
    case 'angebote':     renderAngebote(); break;
    case 'rechnungen':   renderRech(); break;
    case 'kunden':       renderKunden(); break;
    case 'produkte':     renderProdukte(); break;
  }
}

// ── Helper: render checkbox for a row ─────────────────────────────
function _selCb(section, id) {
  if (!window._selectMode[section]) return '';
  const checked = window._selected[section].has(id) ? 'checked' : '';
  return `<input type="checkbox" class="sel-cb sel-cb-row" data-section="${section}" data-id="${id}"
    ${checked} onclick="event.stopPropagation();toggleSelectItem('${section}','${id}',this)"
    style="width:17px;height:17px;flex-shrink:0;accent-color:var(--blue);cursor:pointer;margin-right:4px">`;
}

// ── Mobile ⋮ context menu ──────────────────────────────────────────
function showCtxMenu(e, items) {
  e.stopPropagation();
  // Remove existing
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.cssText = `
    position:fixed;background:var(--s1);border:1px solid var(--border2);
    border-radius:10px;padding:6px 0;z-index:9999;min-width:160px;
    box-shadow:0 8px 32px rgba(0,0,0,.18);
  `;
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'ctx-menu-item';
    el.style.cssText = `padding:11px 18px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:10px;color:${item.danger?'var(--red)':'var(--text)'}`;
    el.innerHTML = `<i class="fas ${item.icon}" style="width:16px"></i>${item.label}`;
    el.onmouseenter = () => el.style.background = 'var(--s2)';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = (ev) => { ev.stopPropagation(); menu.remove(); item.action(); };
    menu.appendChild(el);
  });

  // Position near the button
  const rect = e.currentTarget ? e.currentTarget.getBoundingClientRect() : { right: e.clientX, bottom: e.clientY };
  const menuW = 180, menuH = items.length * 44 + 12;
  let left = (rect.right || e.clientX) - menuW;
  let top  = (rect.bottom || e.clientY) + 4;
  if (left < 8) left = 8;
  if (top + menuH > window.innerHeight - 8) top = (rect.top || e.clientY) - menuH - 4;
  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// ── Helper: build ⋮ button for mobile rows ─────────────────────────
function _moreBtn(items) {
  const id = 'mb_' + Math.random().toString(36).slice(2,7);
  // Store items globally by id
  window._ctxItems = window._ctxItems || {};
  window._ctxItems[id] = items;
  return `<button class="mob-more-btn" onclick="event.stopPropagation();showCtxMenu(event,window._ctxItems['${id}'])" title="Mehr">
    <i class="fas fa-ellipsis-v"></i>
  </button>`;
}
