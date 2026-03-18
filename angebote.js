// ── ANGEBOTE ─────────────────────────────────────────────────────────────────
// Новый раздел — структура полностью на основе Rechnungen

let angPage = 1;
let angFilter = 'alle';
let angSort = 'datum';
let editAngId = null;
let angPreisMode = 'brutto';
const ANG_PER = 10;

const ANG_ST = {
  offen:      { label:'Offen',      icon:'fas fa-clock',         color:'var(--yellow)', cls:'ang-badge-offen',      pill:'ang-badge-offen-pill'      },
  angenommen: { label:'Angenommen', icon:'fas fa-check-circle',  color:'var(--green)',  cls:'ang-badge-angenommen', pill:'ang-badge-angenommen-pill' },
  abgelehnt:  { label:'Abgelehnt',  icon:'fas fa-times-circle',  color:'var(--red)',    cls:'ang-badge-abgelehnt',  pill:'ang-badge-abgelehnt-pill'  },
  abgelaufen: { label:'Abgelaufen', icon:'fas fa-hourglass-end', color:'var(--sub)',    cls:'ang-badge-abgelaufen', pill:'ang-badge-abgelaufen-pill' },
};

// ── STATUS DROPDOWN ──────────────────────────────────────────────────────────
function setAngStatus(val) {
  const cfg  = ANG_ST[val] || ANG_ST.offen;
  const inp  = document.getElementById('ang-status');
  const icon = document.getElementById('ang-status-icon');
  const txt  = document.getElementById('ang-status-text');
  if (inp)  inp.value = val;
  if (icon) { icon.className = cfg.icon; icon.style.color = cfg.color; }
  if (txt)  txt.textContent = cfg.label;
  const panel = document.getElementById('ang-status-panel');
  if (panel) panel.style.display = 'none';
}

function toggleAngStatusDropdown() {
  const panel = document.getElementById('ang-status-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('[id$="-panel"]').forEach(p => { if (p !== panel) p.style.display = 'none'; });
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    const close = (e) => {
      if (!panel.contains(e.target) && e.target.id !== 'ang-status-btn') {
        panel.style.display = 'none';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

// ── AUTOMATISCHE NR ──────────────────────────────────────────────────────────
function autoAngNr() {
  const angs = data.angebote || [];
  let max = 0;
  angs.forEach(a => {
    const n = parseInt((a.nr||'').replace(/[^0-9]/g,''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'A-' + String(max + 1).padStart(3, '0');
}

// ── FILTER / SORT ────────────────────────────────────────────────────────────
function setAngFilter(filter, el) {
  angFilter = filter;
  angPage = 1;
  document.querySelectorAll('#p-angebote .ftab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAngebote();
}

function sortAng(col) {
  angSort = col;
  renderAngebote();
}

// ── RENDER LISTE ─────────────────────────────────────────────────────────────
function renderAngebote() {
  const list  = document.getElementById('ang-list');
  const empty = document.getElementById('ang-empty');
  const cards = document.getElementById('ang-cards');
  if (!list) return;

  const today = new Date().toISOString().split('T')[0];
  const angs  = data.angebote || [];

  // Автообновление статуса
  angs.forEach(a => {
    if (a.status === 'offen' && a.gueltig && a.gueltig < today) a.status = 'abgelaufen';
  });

  // Stat-Karten
  const totals = {
    offen:      angs.filter(a => a.status === 'offen'),
    angenommen: angs.filter(a => a.status === 'angenommen'),
    abgelehnt:  angs.filter(a => a.status === 'abgelehnt' || a.status === 'abgelaufen'),
  };
  if (cards) cards.innerHTML = `
    <div class="sc y" style="cursor:default">
      <div class="sc-lbl">Offen</div>
      <div class="sc-val">${fmt(totals.offen.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${totals.offen.length} Angebot${totals.offen.length!==1?'e':''}</div>
    </div>
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Angenommen</div>
      <div class="sc-val">${fmt(totals.angenommen.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${totals.angenommen.length} Angebot${totals.angenommen.length!==1?'e':''}</div>
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">Abgelehnt / Abgelaufen</div>
      <div class="sc-val">${fmt(totals.abgelehnt.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${totals.abgelehnt.length} Angebot${totals.abgelehnt.length!==1?'e':''}</div>
    </div>`;

  // Фильтр
  const q = (document.getElementById('ang-search')||{value:''}).value.toLowerCase();
  let filtered = angFilter === 'alle' ? [...angs]
    : angs.filter(a => a.status === angFilter);
  if (q) filtered = filtered.filter(a =>
    (a.nr||'').toLowerCase().includes(q) ||
    (a.kunde||'').toLowerCase().includes(q)
  );

  // Сортировка
  filtered.sort((a, b) => {
    const av = a[angSort]||'', bv = b[angSort]||'';
    return av < bv ? 1 : av > bv ? -1 : 0;
  });

  if (!filtered.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    renderPager('ang-pagination', 1, 1, 0, '_angPageCb');
    return;
  }
  if (empty) empty.style.display = 'none';

  const total = Math.max(1, Math.ceil(filtered.length / ANG_PER));
  if (angPage > total) angPage = total;
  const items = filtered.slice((angPage-1)*ANG_PER, angPage*ANG_PER);

  list.innerHTML = items.map(a => {
    const st = ANG_ST[a.status] || ANG_ST.offen;
    const isExp = a.gueltig && a.gueltig > today && a.status === 'offen' &&
      (new Date(a.gueltig) - new Date()) < 7*24*60*60*1000;
    // Positionen count
    const posCount = (a.positionen||[]).length;
    // Days since creation
    const ageMs = new Date() - new Date(a.datum);
    const ageDays = Math.floor(ageMs / (24*60*60*1000));
    const ageLabel = ageDays === 0 ? 'Heute' : ageDays === 1 ? 'Gestern' : `vor ${ageDays} Tagen`;
    // Expiry progress for offen
    let expiryHtml = '';
    if(a.status === 'offen' && a.gueltig && a.datum) {
      const totalMs = new Date(a.gueltig) - new Date(a.datum);
      const elapsedMs = new Date() - new Date(a.datum);
      const pct = totalMs > 0 ? Math.min(100, Math.round(elapsedMs / totalMs * 100)) : 0;
      const daysLeft = Math.max(0, Math.ceil((new Date(a.gueltig) - new Date()) / (24*60*60*1000)));
      const barColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--yellow)' : 'var(--blue)';
      expiryHtml = `<div style="margin-top:6px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--sub);margin-bottom:3px">
          <span>${daysLeft} ${daysLeft===1?'Tag':'Tage'} verbleibend</span>
          <span>${pct}%</span>
        </div>
        <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px"></div>
        </div>
      </div>`;
    }
    // Netto info if USt
    const hasUst = (a.positionen||[]).some(p => p.mwst > 0);
    const nettoLabel = hasUst ? `<span style="font-size:10px;color:var(--sub);font-family:var(--mono)">brutto</span>` : '';
    const _aSelMode = window._selectMode && window._selectMode['angebote'];
    const _aClick = _aSelMode ? '' : `onclick="openAngForm('${a.id}')"`;
    return `<div class="rech-card" ${_aClick} style="flex-direction:row;align-items:center;gap:0;cursor:${_aSelMode?'default':'pointer'}">
      ${_aSelMode ? `<div style="padding:0 10px 0 14px;display:flex;align-items:center;flex-shrink:0">${_selCb('angebote', a.id)}</div>` : ''}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding:14px 14px 14px ${_aSelMode?'0':'14px'}">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="rech-card-avatar ${st.cls}" style="width:38px;height:38px;border-radius:var(--r);font-size:16px">
          <i class="${st.icon}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--sub)">${a.nr||'—'}</span>
            <span class="rech-card-status ${st.pill}" style="font-size:10px;padding:2px 6px">
              ${st.label}
            </span>
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis">${a.kunde||'Kein Kunde'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--text)">${fmt(a.betrag)}</div>
          ${nettoLabel}
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--sub);padding-top:8px;border-top:1px solid var(--border)">
        <span><i class="fas fa-calendar" style="width:12px;opacity:.5"></i> ${fd(a.datum)}</span>
        <span><i class="fas fa-clock" style="width:12px;opacity:.5"></i> ${ageLabel}</span>
        ${posCount ? `<span><i class="fas fa-list" style="width:12px;opacity:.5"></i> ${posCount} Position${posCount!==1?'en':''}</span>` : ''}
        ${a.gueltig ? `<span style="${isExp?'color:var(--yellow);font-weight:600':''}"><i class="fas fa-hourglass-half" style="width:12px;opacity:.5"></i> bis ${fd(a.gueltig)}</span>` : ''}
        <span style="margin-left:auto;display:flex;gap:3px" onclick="event.stopPropagation()">
          ${isMob() ? _moreBtn([
            {icon:'fa-print',       label:'Drucken',      action:()=>angDruck('${a.id}')},
            {icon:'fa-file-invoice',label:'→ Rechnung',   action:()=>angZuRechnung('${a.id}')},
            {icon:'fa-edit',        label:'Bearbeiten',   action:()=>openAngForm('${a.id}')},
            {icon:'fa-trash',       label:'Löschen',      danger:true, action:()=>delAng('${a.id}')}
          ]) : `
            <button class="rca-btn" onclick="event.stopPropagation();angDruck('${a.id}')" title="Drucken" style="width:26px;height:26px"><i class="fas fa-print" style="font-size:11px"></i></button>
            <button class="rca-btn rca-green" onclick="event.stopPropagation();angZuRechnung('${a.id}')" title="→ Rechnung" style="width:26px;height:26px"><i class="fas fa-file-invoice" style="font-size:11px"></i></button>
            <button class="rca-btn rca-red" onclick="event.stopPropagation();delAng('${a.id}')" title="Löschen" style="width:26px;height:26px"><i class="fas fa-trash" style="font-size:11px"></i></button>
          `}
        </span>
      </div>
      ${expiryHtml}
      </div>
    </div>`;
  }).join('');

  window._angPageCb = p => { angPage = p; renderAngebote(); };
  renderPager('ang-pagination', angPage, total, filtered.length, '_angPageCb');
}

// ── FORM ÖFFNEN/SCHLIESSEN ───────────────────────────────────────────────────
function openAngForm(id) {
  // Переходим на страницу формы
  const navEl = document.querySelector('.nav-item.active');
  nav('angebote-form', navEl);

  if (id) {
    const a = (data.angebote||[]).find(x => x.id === id);
    if (!a) return;
    editAngId = id;
    _angFillForm(a);
    const t = document.getElementById('ang-form-title');
    if (t) t.textContent = 'Angebot bearbeiten';
  } else {
    editAngId = null;
    _angClearForm();
    const t = document.getElementById('ang-form-title');
    if (t) t.textContent = 'Neues Angebot';
  }
  updateAngBanner();
}

function closeAngForm() {
  editAngId = null;
  const navEl = document.querySelector('.nav-item[onclick*="angebote"]:not([onclick*="form"])');
  nav('angebote', navEl || document.querySelector('.nav-item'));
}

function _angClearForm() {
  const nr = autoAngNr();
  document.getElementById('ang-nr').value      = nr;
  document.getElementById('ang-dat').value     = new Date().toISOString().split('T')[0];
  document.getElementById('ang-gueltig').value = '';
  document.getElementById('ang-status').value  = 'offen';
  setAngStatus('offen');
  document.getElementById('ang-kunde').value   = '';
  document.getElementById('ang-adresse').value = '';
  document.getElementById('ang-betreff').value = 'Angebot ' + nr;
  document.getElementById('ang-referenz').value= '';
  document.getElementById('ang-kopftext').value= 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen das gewünschte freibleibende Angebot:';
  document.getElementById('ang-fusstext').value= 'Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\nMit freundlichen Grüßen';
  document.getElementById('ang-notiz').value   = '';
  angPreisMode = 'brutto';
  setAngPreisMode('brutto');
  _angInitPos([]);
}

function _angFillForm(a) {
  document.getElementById('ang-nr').value      = a.nr||'';
  document.getElementById('ang-dat').value     = a.datum||'';
  document.getElementById('ang-gueltig').value = a.gueltig||'';
  document.getElementById('ang-status').value  = a.status||'offen';
  setAngStatus(a.status||'offen');
  document.getElementById('ang-kunde').value   = a.kunde||'';
  document.getElementById('ang-adresse').value = a.adresse||'';
  document.getElementById('ang-betreff').value = a.betreff||'';
  document.getElementById('ang-referenz').value= a.referenz||'';
  document.getElementById('ang-kopftext').value= a.kopftext||'';
  document.getElementById('ang-fusstext').value= a.fusstext||'';
  document.getElementById('ang-notiz').value   = a.notiz||'';
  angPreisMode = a.preisMode||'brutto';
  setAngPreisMode(angPreisMode);
  _angInitPos(a.positionen||[]);
}

// ── POSITIONEN ───────────────────────────────────────────────────────────────
function _angInitPos(positionen) {
  const list = document.getElementById('ang-pos-list');
  if (!list) return;
  list.innerHTML = '';
  if (positionen.length) positionen.forEach(p => _angAddPos(p));
  else _angAddPos();
}

function _angAddPos(p={}) {
  const list = document.getElementById('ang-pos-list');
  if (!list) return;
  const yr = document.getElementById('ang-dat')?.value?.substring(0,4) || new Date().getFullYear()+'';
  const isKlein = isKleinunternehmer(yr);
  const rate = p.rate ?? (isKlein ? 0 : 19);
  const preis = p.brutto ?? p.netto ?? '';
  const rabattTyp = p.rabattTyp || '%';
  const row = document.createElement('div');
  row.className = 'ang-pos-row';
  row.innerHTML = `
    <input type="text" class="ang-f-bez" placeholder="Beschreibung" value="${p.bez||''}" oninput="recalcAngSumme();angBezSearch(this)" onfocus="angBezSearch(this)">
    <input type="number" placeholder="1" value="${p.menge||1}" min="0.01" step="0.01" oninput="recalcAngSumme()">
    <input type="text" placeholder="Stk." value="${p.einheit||'Stk.'}">
    <input type="number" placeholder="0,00" value="${preis}" min="0" step="0.01" oninput="recalcAngSumme()">
    ${isKlein ? '<div></div>' : `<div class="ust-flag-wrap" style="position:relative">
      <button type="button" class="ust-flag-btn" onclick="toggleAngUstDropdown(this)"
        style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;padding:7px 10px;border-radius:var(--r);border:1px solid var(--border);background:var(--s2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;height:100%;box-sizing:border-box">
        <span style="display:flex;align-items:center;gap:5px">
          <span class="flag-circle" style="width:1.3em;height:1.3em"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>
          <span class="ust-flag-label">${rate}%</span>
        </span>
        <i class="fas fa-chevron-down" style="font-size:9px;color:var(--sub)"></i>
      </button>
      <input type="hidden" class="ust-flag-val" value="${rate}" onchange="recalcAngSumme()">
      <div class="ust-flag-panel" style="display:none;position:absolute;left:0;top:calc(100% + 4px);background:var(--s1);border:1px solid var(--border);border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.06);z-index:300;padding:4px;min-width:120px">
        <div onclick="setAngUstRate(this,19)" style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:var(--r);cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>19%</div>
        <div onclick="setAngUstRate(this,7)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:var(--r);cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>7%</div>
        <div onclick="setAngUstRate(this,0)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:var(--r);cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>0%</div>
      </div>
    </div>`}
    <div class="ang-rabatt-group">
      <input type="number" placeholder="0" value="${p.rabatt||0}" min="0" step="0.01" oninput="recalcAngSumme()" class="ang-rabatt-val">
      <button type="button" class="ang-rabatt-suffix" onclick="_angToggleRabatt(this)">${rabattTyp}</button>
    </div>
    <div class="ang-pos-betrag">0,00 €</div>
    <button class="del-btn" onclick="this.closest('.ang-pos-row').remove();recalcAngSumme()" style="padding:4px 8px"><i class="fas fa-trash"></i></button>`;
  list.appendChild(row);
  recalcAngSumme();
}

function _angToggleRabatt(btn) {
  btn.textContent = btn.textContent.trim() === '%' ? '€' : '%';
  recalcAngSumme();
}

function setAngPreisMode(mode) {
  angPreisMode = mode;
  const lbl = document.getElementById('ang-preis-lbl');
  if (lbl) lbl.textContent = mode === 'brutto' ? 'Preis (brutto)' : 'Preis (netto)';
  ['brutto','netto'].forEach(m => {
    const btn = document.getElementById('ang-'+m+'-btn');
    if (!btn) return;
    btn.style.background     = m === mode ? 'var(--blue)' : '';
    btn.style.color          = m === mode ? '#fff' : '';
    btn.style.borderColor    = m === mode ? 'var(--blue)' : '';
  });
  recalcAngSumme();
}

function recalcAngSumme() {
  let netto = 0, mwst = 0;
  document.querySelectorAll('#ang-pos-list .ang-pos-row').forEach(row => {
    const inputs   = row.querySelectorAll('input[type=number]');
    const menge    = parseFloat(inputs[0]?.value)||1;
    const preis    = parseFloat(inputs[1]?.value)||0;
    const rabatt   = parseFloat(inputs[2]?.value)||0;
    const sel      = row.querySelector('select') || row.querySelector('.ust-flag-val');
    const rate     = sel ? parseFloat(sel.value) : 0;
    const rabattTyp = row.querySelector('.ang-rabatt-suffix')?.textContent?.trim() || '%';
    let factor;
    if (rabattTyp === '%') {
      factor = 1 - rabatt / 100;
    } else {
      // € — вычитаем фиксированную сумму из общей стоимости
      factor = preis > 0 ? Math.max(0, (menge * preis - rabatt)) / (menge * preis) : 1;
    }
    let n, b;
    if (angPreisMode === 'brutto') {
      b = r2(menge * preis * factor);
      n = rate > 0 ? r2(b / (1 + rate/100)) : b;
    } else {
      n = r2(menge * preis * factor);
      b = r2(n * (1 + rate/100));
    }
    netto += n; mwst += r2(b - n);
    const bEl = row.querySelector('.ang-pos-betrag');
    if (bEl) bEl.textContent = b.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  });
  const brutto = r2(netto + mwst);
  const f = v => v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  ['ang-sum-netto','ang-sum-mwst','ang-sum-brutto'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = f([netto,mwst,brutto][i]);
  });
}

function _angGetPos() {
  return [...document.querySelectorAll('#ang-pos-list .ang-pos-row')].map(row => {
    const numInputs = row.querySelectorAll('input[type=number]');
    const sel       = row.querySelector('select') || row.querySelector('.ust-flag-val');
    const menge     = parseFloat(numInputs[0]?.value)||1;
    const preis     = parseFloat(numInputs[1]?.value)||0;
    const rabatt    = parseFloat(numInputs[2]?.value)||0;
    const rate      = sel ? parseFloat(sel.value) : 0;
    const rabattTyp = row.querySelector('.ang-rabatt-suffix')?.textContent?.trim() || '%';
    const bez       = row.querySelector('.ang-f-bez')?.value?.trim() || '';
    const einheit   = row.querySelectorAll('input[type=text]')[1]?.value?.trim() || 'Stk.';
    let factor;
    if (rabattTyp === '%') {
      factor = 1 - rabatt / 100;
    } else {
      factor = preis > 0 ? Math.max(0, (menge * preis - rabatt)) / (menge * preis) : 1;
    }
    let netto, brutto;
    if (angPreisMode === 'brutto') {
      brutto = r2(menge * preis * factor);
      netto  = rate > 0 ? r2(brutto/(1+rate/100)) : brutto;
    } else {
      netto  = r2(menge * preis * factor);
      brutto = r2(netto * (1 + rate/100));
    }
    return { bez, menge, einheit, netto: r2(netto/menge), brutto: r2(brutto/menge), rate, rabatt, rabattTyp };
  }).filter(p => p.bez || p.netto);
}

// ── KUNDE AUTOCOMPLETE ───────────────────────────────────────────────────────
function angKundeSearch(q) {
  const sug = document.getElementById('ang-kunde-suggest');
  if (!sug) return;
  if (!q || q.length < 2) { sug.style.display='none'; return; }
  const matches = (data.kunden||[]).filter(k=>(k.name||'').toLowerCase().includes(q.toLowerCase())).slice(0,6);
  if (!matches.length) { sug.style.display='none'; return; }
  sug.style.display = 'block';
  sug.innerHTML = matches.map(k=>`
    <div onclick="angSelectKunde('${k.id}')"
      style="padding:8px 12px;cursor:pointer;font-size:13px"
      onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600">${k.name}</div>
      ${k.strasse?`<div style="font-size:11px;color:var(--sub)">${k.strasse}, ${k.plz||''} ${k.ort||''}</div>`:''}
    </div>`).join('');
}

function angSelectKunde(id) {
  const k = (data.kunden||[]).find(x=>x.id===id);
  if (!k) return;
  document.getElementById('ang-kunde').value = k.name;
  const adr = [k.strasse, k.plz&&k.ort?k.plz+' '+k.ort:''].filter(Boolean).join('\n');
  document.getElementById('ang-adresse').value = adr;
  document.getElementById('ang-kunde-suggest').style.display = 'none';
}

// ── BANNER ───────────────────────────────────────────────────────────────────
function updateAngBanner() {
  const el = document.getElementById('ang-ust-banner');
  if (!el) return;
  const yr = document.getElementById('ang-dat')?.value?.substring(0,4) || new Date().getFullYear()+'';
  const isKlein = isKleinunternehmer(yr);
  el.style.display = 'block';
  el.style.background = isKlein ? 'rgba(251,191,36,.1)' : 'rgba(26,69,120,.08)';
  el.style.color = isKlein ? 'var(--yellow)' : 'var(--blue)';
  el.innerHTML = isKlein
    ? '<i class="fas fa-info-circle"></i> §19 UStG — Kleinunternehmer: keine MwSt.'
    : '<i class="fas fa-info-circle"></i> Regelbesteuerung — MwSt. wird ausgewiesen';
}

// ── SPEICHERN ────────────────────────────────────────────────────────────────
function saveAng() {
  const nr    = document.getElementById('ang-nr').value.trim();
  const datum = document.getElementById('ang-dat').value;
  if (!nr || !datum) return toast('Nr. und Datum sind Pflichtfelder!', 'err');

  const positionen = _angGetPos();
  const brutto = r2(positionen.reduce((s,p)=>s+(p.menge||1)*p.brutto, 0));
  if (!data.angebote) data.angebote = [];

  const obj = {
    nr, datum,
    gueltig:   document.getElementById('ang-gueltig').value,
    status:    document.getElementById('ang-status').value,
    kunde:     document.getElementById('ang-kunde').value.trim(),
    adresse:   document.getElementById('ang-adresse').value.trim(),
    betreff:   document.getElementById('ang-betreff').value.trim(),
    referenz:  document.getElementById('ang-referenz').value.trim(),
    kopftext:  document.getElementById('ang-kopftext').value.trim(),
    fusstext:  document.getElementById('ang-fusstext').value.trim(),
    notiz:     document.getElementById('ang-notiz').value.trim(),
    preisMode: angPreisMode,
    betrag:    brutto,
    positionen,
  };

  if (editAngId) {
    const a = data.angebote.find(x=>x.id===editAngId);
    if (a) { Object.assign(a, obj); sbSaveAngebot(a); }
    editAngId = null;
  } else {
    if (data.angebote.find(a=>a.nr===nr)) return toast(`Nr. ${nr} bereits vergeben!`, 'err');
    const newA = { id: Date.now()+'_'+Math.random().toString(36).slice(2,6), ...obj };
    data.angebote.push(newA);
    sbSaveAngebot(newA);
  }
  closeAngForm();
  toast('✓ Angebot gespeichert!', 'ok');
}

// ── LÖSCHEN ──────────────────────────────────────────────────────────────────
async function delAng(id) {
  const a = (data.angebote||[]).find(x=>x.id===id);
  if (!a) return;
  const ok = await appConfirm(`Angebot ${a.nr} löschen?`, {title:'Löschen',icon:'🗑️',okLabel:'Löschen',danger:true});
  if (!ok) return;
  data.angebote = data.angebote.filter(x=>x.id!==id);
  sbDeleteAngebot(id);
  renderAngebote();
  toast('Angebot gelöscht','err');
}

// ── STATUS ÄNDERN ────────────────────────────────────────────────────────────
function angSetStatus(id, status) {
  const a = (data.angebote||[]).find(x=>x.id===id);
  if (!a) return;
  a.status = status;
  sbSaveAngebot(a);
  renderAngebote();
  toast(`Status: ${ANG_ST[status]?.label||status}`, 'ok');
}

// ── IN RECHNUNG UMWANDELN ────────────────────────────────────────────────────
async function angZuRechnung(id) {
  const a = (data.angebote||[]).find(x=>x.id===id);
  if (!a) return;
  const ok = await appConfirm(`Angebot ${a.nr} in Rechnung umwandeln?`,
    {title:'Als Rechnung',icon:'📄',okLabel:'Umwandeln'});
  if (!ok) return;
  a.status = 'angenommen';
  sbSaveAngebot(a);
  if (!data.rechnungen) data.rechnungen = [];
  const newR = {
    id: Date.now()+'_'+Math.random().toString(36).slice(2,6),
    nr: autoRechNr(new Date().getFullYear()), datum: new Date().toISOString().split('T')[0],
    faellig:'', status:'offen', kunde:a.kunde||'', adresse:a.adresse||'',
    email:'', tel:'', betrag:a.betrag, positionen:a.positionen||[],
    notiz:`Aus Angebot ${a.nr}`, beschreibung:a.positionen?.map(p=>p.bez).join(', ')||'',
  };
  data.rechnungen.push(newR);
  sbSaveRechnung(newR);
  renderAngebote();
  const navR = document.querySelector('.nav-item[onclick*="rechnungen"]');
  nav('rechnungen', navR || document.querySelector('.nav-item'));
  toast(`✓ Rechnung ${newR.nr} erstellt`, 'ok');
}

// ── DRUCK / VORSCHAU ─────────────────────────────────────────────────────────
function angDruck(id) {
  let a;
  if (id) {
    a = (data.angebote||[]).find(x=>x.id===id);
    if (!a) return;
  } else {
    // Из открытой формы
    const positionen = _angGetPos();
    a = {
      nr:       document.getElementById('ang-nr')?.value||'',
      datum:    document.getElementById('ang-dat')?.value||'',
      gueltig:  document.getElementById('ang-gueltig')?.value||'',
      kunde:    document.getElementById('ang-kunde')?.value||'',
      adresse:  document.getElementById('ang-adresse')?.value||'',
      betreff:  document.getElementById('ang-betreff')?.value||'',
      kopftext: document.getElementById('ang-kopftext')?.value||'',
      fusstext: document.getElementById('ang-fusstext')?.value||'',
      betrag:   parseFloat(document.getElementById('ang-sum-brutto')?.textContent)||0,
      positionen,
    };
  }
  let firma = {};
  try { firma = JSON.parse(localStorage.getItem('bp_firma')||'{}'); } catch(e){}
  const rows = (a.positionen||[]).map(p=>`<tr>
    <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">${p.bez||''}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.menge||1}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(p.netto)} €</td>
    <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.rate||0}%</td>
    <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${fmt((p.menge||1)*p.brutto)}</td>
  </tr>`).join('');
  const netto  = r2((a.positionen||[]).reduce((s,p)=>s+(p.menge||1)*p.netto,0));
  const brutto = a.betrag||0;
  const mwst   = r2(brutto-netto);
  const w = window.open('','_blank','width=860,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
  <title>Angebot ${a.nr}</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:32px;max-width:800px;margin:0 auto}
  table{width:100%;border-collapse:collapse}th{padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#555;border-bottom:2px solid #e5e7eb;background:#f5f7fa}
  .total{font-size:15px;font-weight:800;border-top:2px solid #222}</style></head><body>
  <div style="display:flex;justify-content:space-between;margin-bottom:24px">
    <div><div style="font-size:20px;font-weight:800;color:#1a4578">${firma.name||'Unternehmen'}</div>
    <div style="color:#666">${firma.strasse||''} ${firma.plz||''} ${firma.ort||''}</div></div>
    <div style="text-align:right"><h1 style="margin:0">Angebot</h1>
    <div style="color:#666">Nr. <b>${a.nr}</b> · ${fd(a.datum)}${a.gueltig?' · Gültig bis '+fd(a.gueltig):''}</div></div>
  </div>
  <div style="margin-bottom:20px"><b>${a.kunde||''}</b><br><span style="white-space:pre-line;color:#555">${a.adresse||''}</span></div>
  ${a.betreff?`<div style="margin-bottom:16px"><b>Betreff:</b> ${a.betreff}</div>`:''}
  ${a.kopftext?`<div style="margin-bottom:20px;line-height:1.6">${(a.kopftext).replace(/\n/g,'<br>')}</div>`:''}
  <table><thead><tr><th>Leistung</th><th style="text-align:center">Menge</th><th style="text-align:right">Preis</th><th style="text-align:center">USt.</th><th style="text-align:right">Betrag</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <table style="width:260px;margin-left:auto;margin-top:8px">
    <tr><td style="padding:5px 10px;color:#666">Netto</td><td style="padding:5px 10px;text-align:right">${fmt(netto)} €</td></tr>
    <tr><td style="padding:5px 10px;color:#666">MwSt.</td><td style="padding:5px 10px;text-align:right">${fmt(mwst)} €</td></tr>
    <tr class="total"><td style="padding:8px 10px">Gesamt</td><td style="padding:8px 10px;text-align:right;color:#1a4578">${fmt(brutto)} €</td></tr>
  </table>
  ${a.fusstext?`<div style="margin-top:24px;color:#555;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px">${(a.fusstext).replace(/\n/g,'<br>')}</div>`:''}
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
}

// ── PRODUKT AUTOCOMPLETE в строке позиции ────────────────────────────────────
let _angCurBezInput = null;

function angBezSearch(input) {
  _angCurBezInput = input;
  const q = input.value.trim().toLowerCase();
  let sug = input._sug;
  if (!sug) {
    sug = document.createElement('div');
    sug.className = 'ang-bez-suggest';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(sug);
    input._sug = sug;
    document.addEventListener('click', e => {
      if (!sug.contains(e.target) && e.target !== input) sug.style.display = 'none';
    });
  }
  const produkte = data.produkte || [];
  const matches = q.length < 1 ? produkte.slice(0,8)
    : produkte.filter(p => (p.name||'').toLowerCase().includes(q)).slice(0,8);

  sug.innerHTML = matches.map((p, i) => `
    <div class="ang-bez-suggest-item" data-idx="${i}">
      <div style="font-weight:600">${p.name}</div>
      ${p.artnr ? `<div style="font-size:11px;color:var(--sub)">Art.-Nr. ${p.artnr}</div>` : ''}
    </div>`).join('') +
    `<div class="ang-bez-suggest-new" id="ang-bez-new-btn">
      <i class="fas fa-plus-circle"></i> Neues Produkt erstellen
    </div>`;

  // Вешаем клики через JS — без проблем с кавычками
  sug.querySelectorAll('.ang-bez-suggest-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const row = input.closest('.ang-pos-row');
      angBezSelect(row, matches[i]);
    });
  });
  const newBtn = sug.querySelector('#ang-bez-new-btn');
  if (newBtn) newBtn.addEventListener('click', () => openAngProduktModal());

  sug.style.display = matches.length || true ? 'block' : 'none';
}

function angBezSelect(row, p) {
  if (!row) return;
  const inputs = row.querySelectorAll('input');
  // bez
  inputs[0].value = p.name || '';
  // menge stays
  // einheit
  const einInput = row.querySelectorAll('input[type=text]')[1];
  if (einInput) einInput.value = p.einheit || 'Stk.';
  // preis
  const numInputs = row.querySelectorAll('input[type=number]');
  if (numInputs[1]) numInputs[1].value = p.vkNetto || p.vkBrutto || '';
  // ust
  const sel = row.querySelector('.ust-flag-val');
  if (sel && p.ust != null) {
    sel.value = p.ust;
    const btn = row.querySelector('.ust-flag-btn .ust-flag-label');
    if (btn) btn.textContent = p.ust + '%';
  }
  // hide suggest
  if (inputs[0]._sug) inputs[0]._sug.style.display = 'none';
  recalcAngSumme();
}

// ── MODAL: NEUES PRODUKT — функции перенесены в produkte.js ─────────────────
// openProduktModal, saveAngProdukt, apCalcBrutto, apCalcEkBrutto,
// apAddEinheit, apSetTab, delProdukt — все в produkte.js

function openAngProduktModal() {
  if (typeof openProduktModal === 'function') openProduktModal();
}

// ── USt Flag Dropdown (Angebot positions) ─────────────────────────────────

function setAngUstRate(el, rate) {
  const wrap = el.closest('.ust-flag-wrap');
  wrap.querySelector('.ust-flag-val').value = rate;
  wrap.querySelector('.ust-flag-label').textContent = rate + '%';
  wrap.querySelector('.ust-flag-panel').style.display = 'none';
  recalcAngSumme();
}


// ── STATUS DROPDOWN ──────────────────────────────────────────────────────────
function setAngStatus(val) {
  const cfg  = ANG_ST[val] || ANG_ST.offen;
  const inp  = document.getElementById('ang-status');
  const icon = document.getElementById('ang-status-icon');
  const txt  = document.getElementById('ang-status-text');
  if (inp)  inp.value = val;
  if (icon) { icon.className = cfg.icon; icon.style.color = cfg.color; }
  if (txt)  txt.textContent = cfg.label;
  const panel = document.getElementById('ang-status-panel');
  if (panel) panel.style.display = 'none';
}

function toggleAngStatusDropdown() {
  const panel = document.getElementById('ang-status-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('[id$="-panel"]').forEach(p => { if (p !== panel) p.style.display = 'none'; });
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    const close = (e) => {
      if (!panel.contains(e.target) && e.target.id !== 'ang-status-btn') {
        panel.style.display = 'none';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

// ── AUTOMATISCHE NR ──────────────────────────────────────────────────────────
function autoAngNr() {
  const angs = data.angebote || [];
  let max = 0;
  angs.forEach(a => {
    const n = parseInt((a.nr||'').replace(/[^0-9]/g,''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'A-' + String(max + 1).padStart(3, '0');
}

// ── FILTER / SORT ────────────────────────────────────────────────────────────
function setAngFilter(filter, el) {
  angFilter = filter;
  angPage = 1;
  document.querySelectorAll('#p-angebote .ftab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAngebote();
}

function sortAng(col) {
  angSort = col;
  renderAngebote();
}

