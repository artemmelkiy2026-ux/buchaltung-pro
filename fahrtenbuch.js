// ══════════════════════════════════════════════════════════════════════════
// FAHRTENBUCH — Geschäftliche/Private Fahrten gemäß §6 EStG
// ══════════════════════════════════════════════════════════════════════════

let fbPage = 1, fbSort = 'datum', fbSortAsc = false, fbEditId = null;
const FB_PER = 10;
const FB_TYPEN = ['Geschäftlich', 'Privat', 'Arbeitsweg'];

function renderFahrtenbuch() {
  const fahrten = data.fahrtenbuch || [];
  const yrSel = document.getElementById('fb-yr');
  const yr = yrSel ? yrSel.value : 'Alle';

  // Year filter
  const filtered = yr === 'Alle' ? [...fahrten] : fahrten.filter(f => f.datum && f.datum.startsWith(yr));

  // Stats
  const allKm = filtered.reduce((s, f) => s + (f.km || 0), 0);
  const bizKm = filtered.filter(f => f.typ === 'Geschäftlich').reduce((s, f) => s + (f.km || 0), 0);
  const privKm = filtered.filter(f => f.typ === 'Privat').reduce((s, f) => s + (f.km || 0), 0);
  const wegKm = filtered.filter(f => f.typ === 'Arbeitsweg').reduce((s, f) => s + (f.km || 0), 0);
  const bizPct = allKm ? Math.round(bizKm / allKm * 100) : 0;
  const privPct = allKm ? Math.round(privKm / allKm * 100) : 0;
  const wegPct = allKm ? Math.round(wegKm / allKm * 100) : 0;

  // Pendlerpauschale: 0,30€/km (erste 20km einfach), 0,38€/km (ab 21km)
  // Geschäftlich: 0,30€/km
  const bizPauschale = bizKm * 0.30;
  // Arbeitsweg: Entfernungspauschale (einfache Strecke! hier vereinfacht: halbe km)
  const wegEinfach = wegKm / 2;
  const wegPauschale = Math.min(wegEinfach, 20 * filtered.filter(f => f.typ === 'Arbeitsweg').length) * 0.30
    + Math.max(0, wegEinfach - 20 * filtered.filter(f => f.typ === 'Arbeitsweg').length) * 0.38;

  const statsEl = document.getElementById('fb-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="sc b"><div class="sc-lbl">Gesamt</div><div class="sc-val">${fmtKm(allKm)}</div><div class="sc-sub">${filtered.length} Fahrten</div></div>
    <div class="sc g"><div class="sc-lbl">Geschäftlich</div><div class="sc-val">${fmtKm(bizKm)}</div><div class="sc-sub">${bizPct}% · Pauschale ${fmt(bizPauschale)}</div></div>
    <div class="sc r"><div class="sc-lbl">Privat</div><div class="sc-val">${fmtKm(privKm)}</div><div class="sc-sub">${privPct}%</div></div>
    <div class="sc y"><div class="sc-lbl">Arbeitsweg</div><div class="sc-val">${fmtKm(wegKm)}</div><div class="sc-sub">${wegPct}% · Pendlerp. ${fmt(wegPauschale)}</div></div>
  `;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av = fbSort === 'km' ? (a.km || 0) : (a[fbSort] || '');
    let bv = fbSort === 'km' ? (b.km || 0) : (b[fbSort] || '');
    const dir = fbSortAsc ? 1 : -1;
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / FB_PER));
  if (fbPage > totalPages) fbPage = totalPages;
  const pageItems = sorted.slice((fbPage - 1) * FB_PER, fbPage * FB_PER);

  const list = document.getElementById('fb-list');
  const empty = document.getElementById('fb-empty');
  if (!pageItems.length) {
    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    window._fbPagerCb = function(p) { fbPage = p; renderFahrtenbuch(); };
    renderPager('fb-pagination', 1, 1, 0, '_fbPagerCb');
    _updateFbSortBtns();
    return;
  }
  if (empty) empty.style.display = 'none';

  const typColor = { 'Geschäftlich': 'var(--blue)', 'Privat': 'var(--sub)', 'Arbeitsweg': 'var(--yellow)' };
  const typIcon = { 'Geschäftlich': 'fa-briefcase', 'Privat': 'fa-user', 'Arbeitsweg': 'fa-road' };
  const typBg = { 'Geschäftlich': 'var(--bdim)', 'Privat': 'var(--s2)', 'Arbeitsweg': 'var(--ydim)' };

  if (list) list.innerHTML = pageItems.map(f => {
    const km = f.km || 0;
    const col = typColor[f.typ] || 'var(--sub)';
    const icon = typIcon[f.typ] || 'fa-car';
    const bg = typBg[f.typ] || 'var(--s2)';
    return `<div class="fb-row" onclick="editFahrt('${f.id}')" style="cursor:pointer">
      <div class="fb-row-left">
        <div class="fb-row-icon" style="background:${bg};color:${col}"><i class="fas ${icon}"></i></div>
        <div class="fb-row-name">
          ${f.abfahrt || '?'} → ${f.ziel || '?'}
          <span class="fb-row-typ" style="color:${col}">${f.typ}</span>
        </div>
        <div class="fb-row-meta">
          <span><i class="fas fa-calendar" style="font-size:10px;opacity:.5"></i> ${fd(f.datum)}</span>
          ${f.zweck ? `<span><i class="fas fa-tag" style="font-size:10px;opacity:.5"></i> ${f.zweck}</span>` : ''}
          ${f.kennzeichen ? `<span><i class="fas fa-car" style="font-size:10px;opacity:.5"></i> ${f.kennzeichen}</span>` : ''}
          <span style="font-size:10px;color:var(--sub)">Stand: ${fmtKm(f.km_start||0)} → ${fmtKm(f.km_end||0)}</span>
        </div>
      </div>
      <div class="fb-row-right">
        <div class="fb-row-km" style="color:${col}">${fmtKm(km)}</div>
        <div class="fb-row-actions" onclick="event.stopPropagation()">
          ${isMob() ? _moreBtn([
            {icon:'fa-edit', label:'Bearbeiten', action:function(){editFahrt('${f.id}')}},
            {icon:'fa-trash', label:'Löschen', danger:true, action:function(){delFahrt('${f.id}')}}
          ]) : '<button class="rca-btn rca-red" onclick="event.stopPropagation();delFahrt(\''+f.id+'\')" title="Löschen"><i class="fas fa-trash"></i></button>'}
        </div>
      </div>
    </div>`;
  }).join('');

  // Summary
  const pageKm = pageItems.reduce((s, f) => s + (f.km || 0), 0);
  if (list) list.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px 18px;font-size:12px;color:var(--sub);border-top:1px solid var(--border)">
    <span>${sorted.length} Fahrten</span>
    <span style="font-family:var(--mono);font-weight:600">${fmtKm(allKm)} gesamt</span>
  </div>`;

  window._fbPagerCb = function(p) { fbPage = p; renderFahrtenbuch(); };
  renderPager('fb-pagination', fbPage, totalPages, sorted.length, '_fbPagerCb');
  _updateFbSortBtns();
  _buildFbYearFilter();
}

function fmtKm(v) { return (v || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km'; }

function _updateFbSortBtns() {
  [['datum', 'Datum'], ['km', 'Kilometer'], ['typ', 'Typ'], ['ziel', 'Ziel']].forEach(function(pair) {
    var col = pair[0], lbl = pair[1];
    document.querySelectorAll('#p-fahrtenbuch button[onclick*="sortFb(\'' + col + '\')"]').forEach(function(btn) {
      var active = fbSort === col;
      btn.classList.toggle('active', active);
      btn.innerHTML = lbl + '<span class="sort-arrow">' + (active ? (fbSortAsc ? ' ↑' : ' ↓') : '&nbsp;') + '</span>';
    });
  });
}

function sortFb(col) {
  if (fbSort === col) fbSortAsc = !fbSortAsc;
  else { fbSort = col; fbSortAsc = false; }
  fbPage = 1;
  renderFahrtenbuch();
}

function _buildFbYearFilter() {
  var sel = document.getElementById('fb-yr');
  if (!sel) return;
  var fahrten = data.fahrtenbuch || [];
  var years = [...new Set(fahrten.filter(function(f) { return f.datum; }).map(function(f) { return f.datum.substring(0, 4); }))].sort().reverse();
  var cur = new Date().getFullYear() + '';
  if (!years.length) years = [cur];
  var prev = sel.value;
  sel.innerHTML = '<option value="Alle">Alle Jahre</option>' + years.map(function(y) { return '<option' + (y === prev ? ' selected' : '') + '>' + y + '</option>'; }).join('');
}

// ── FORM ──────────────────────────────────────────────────────────────────

function openFahrtForm() {
  fbEditId = null;
  document.getElementById('fb-form-title').textContent = 'Neue Fahrt';
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('fb-datum').value = today;
  document.getElementById('fb-abfahrt').value = '';
  document.getElementById('fb-ziel').value = '';
  document.getElementById('fb-zweck').value = '';
  document.getElementById('fb-typ').value = 'Geschäftlich';
  document.getElementById('fb-kennzeichen').value = localStorage.getItem('fb_kennzeichen') || '';

  // Auto km_start from last trip
  var fahrten = data.fahrtenbuch || [];
  var lastKm = fahrten.length ? Math.max.apply(null, fahrten.map(function(f) { return f.km_end || 0; })) : 0;
  document.getElementById('fb-km-start').value = lastKm || '';
  document.getElementById('fb-km-end').value = '';
  document.getElementById('fb-km').textContent = '0,0 km';

  nav('fahrtenbuch-form', null);
}

function editFahrt(id) {
  var f = (data.fahrtenbuch || []).find(function(x) { return x.id === id; });
  if (!f) return;
  fbEditId = id;
  document.getElementById('fb-form-title').textContent = 'Fahrt bearbeiten';
  document.getElementById('fb-datum').value = f.datum || '';
  document.getElementById('fb-abfahrt').value = f.abfahrt || '';
  document.getElementById('fb-ziel').value = f.ziel || '';
  document.getElementById('fb-zweck').value = f.zweck || '';
  document.getElementById('fb-typ').value = f.typ || 'Geschäftlich';
  document.getElementById('fb-kennzeichen').value = f.kennzeichen || '';
  document.getElementById('fb-km-start').value = f.km_start || '';
  document.getElementById('fb-km-end').value = f.km_end || '';
  _calcFbKm();
  nav('fahrtenbuch-form', null);
}

function closeFahrtForm() {
  fbEditId = null;
  nav('fahrtenbuch', document.querySelector('.nav-item[onclick*="fahrtenbuch"]:not([onclick*="form"])') || null);
}

function saveFahrt() {
  var datum = document.getElementById('fb-datum').value;
  var abfahrt = document.getElementById('fb-abfahrt').value.trim();
  var ziel = document.getElementById('fb-ziel').value.trim();
  var zweck = document.getElementById('fb-zweck').value.trim();
  var typ = document.getElementById('fb-typ').value;
  var kennzeichen = document.getElementById('fb-kennzeichen').value.trim();
  var kmStart = parseFloat(document.getElementById('fb-km-start').value) || 0;
  var kmEnd = parseFloat(document.getElementById('fb-km-end').value) || 0;

  if (!datum) return toast('Datum ist Pflichtfeld!', 'err');
  if (!abfahrt || !ziel) return toast('Abfahrts- und Zielort eingeben!', 'err');
  if (kmEnd <= kmStart) return toast('km-Stand Ende muss größer als Start sein!', 'err');

  var km = Math.round((kmEnd - kmStart) * 10) / 10;
  localStorage.setItem('fb_kennzeichen', kennzeichen);

  if (!data.fahrtenbuch) data.fahrtenbuch = [];

  if (fbEditId) {
    var f = data.fahrtenbuch.find(function(x) { return x.id === fbEditId; });
    if (f) {
      Object.assign(f, { datum: datum, abfahrt: abfahrt, ziel: ziel, zweck: zweck, typ: typ, kennzeichen: kennzeichen, km_start: kmStart, km_end: kmEnd, km: km });
      if (typeof sbSaveFahrt === 'function') sbSaveFahrt(f);
    }
    fbEditId = null;
  } else {
    var newF = {
      id: 'fb-' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      datum: datum, abfahrt: abfahrt, ziel: ziel, zweck: zweck, typ: typ,
      kennzeichen: kennzeichen, km_start: kmStart, km_end: kmEnd, km: km
    };
    data.fahrtenbuch.push(newF);
    if (typeof sbSaveFahrt === 'function') sbSaveFahrt(newF);
  }
  closeFahrtForm();
  renderFahrtenbuch();
  toast('✓ Fahrt gespeichert!', 'ok');
}

async function delFahrt(id) {
  var ok = await appConfirm('Fahrt wirklich löschen?', { title: 'Fahrt löschen', icon: '🗑️', okLabel: 'Löschen', danger: true });
  if (!ok) return;
  data.fahrtenbuch = (data.fahrtenbuch || []).filter(function(f) { return f.id !== id; });
  if (typeof sbDeleteFahrt === 'function') sbDeleteFahrt(id);
  renderFahrtenbuch();
  toast('Fahrt gelöscht', 'err');
}

function _calcFbKm() {
  var s = parseFloat(document.getElementById('fb-km-start').value) || 0;
  var e = parseFloat(document.getElementById('fb-km-end').value) || 0;
  var km = Math.max(0, e - s);
  document.getElementById('fb-km').textContent = fmtKm(Math.round(km * 10) / 10);
}
