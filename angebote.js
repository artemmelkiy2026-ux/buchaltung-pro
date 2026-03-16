// ── ANGEBOTE ─────────────────────────────────────────────────────────────────
// Новый раздел — структура полностью на основе Rechnungen

let angPage = 1;
let angFilter = 'alle';
let angSort = 'datum';
let editAngId = null;
let angPreisMode = 'brutto';
const ANG_PER = 10;

const ANG_ST = {
  offen:      { label:'Offen',      icon:'fas fa-clock',         cls:'ang-badge-offen',      pill:'ang-badge-offen-pill'      },
  angenommen: { label:'Angenommen', icon:'fas fa-check-circle',  cls:'ang-badge-angenommen', pill:'ang-badge-angenommen-pill' },
  abgelehnt:  { label:'Abgelehnt',  icon:'fas fa-times-circle',  cls:'ang-badge-abgelehnt',  pill:'ang-badge-abgelehnt-pill'  },
  abgelaufen: { label:'Abgelaufen', icon:'fas fa-hourglass-end', cls:'ang-badge-abgelaufen', pill:'ang-badge-abgelaufen-pill' },
};

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
    return `<div class="rech-card" onclick="openAngForm('${a.id}')">
      <div class="rech-card-left">
        <div class="rech-card-avatar ${st.cls}">
          <i class="${st.icon}"></i>
        </div>
        <div class="rech-card-info">
          <div class="rech-card-nr">${a.nr||'—'}</div>
          <div class="rech-card-kunde">${a.kunde||'—'}</div>
          <div class="rech-card-meta">
            <span>${fd(a.datum)}</span>
            ${a.gueltig ? `<span>·</span><span style="${isExp?'color:var(--yellow);font-weight:700':''}">Gültig bis ${fd(a.gueltig)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="rech-card-right">
        <div class="rech-card-betrag">${fmt(a.betrag)}</div>
        <div class="rech-card-status ${st.pill}">
          <i class="${st.icon}" style="font-size:9px"></i> ${st.label}
        </div>
        <div class="rech-card-actions" onclick="event.stopPropagation()">
          <button class="rca-btn" onclick="openAngForm('${a.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
          <button class="rca-btn" onclick="angDruck('${a.id}')" title="Drucken"><i class="fas fa-print"></i></button>
          <button class="rca-btn rca-green" onclick="angZuRechnung('${a.id}')" title="Als Rechnung"><i class="fas fa-file-invoice"></i></button>
          <button class="rca-btn" onclick="delAng('${a.id}')" title="Löschen"><i class="fas fa-trash"></i></button>
        </div>
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
    <input type="text" class="ang-f-bez" placeholder="Beschreibung" value="${p.bez||''}" oninput="recalcAngSumme()">
    <div class="ang-f-wrap"><span class="ang-f-lbl">Menge</span><input type="number" placeholder="1" value="${p.menge||1}" min="0.01" step="0.01" oninput="recalcAngSumme()"></div>
    <div class="ang-f-wrap"><span class="ang-f-lbl">Einheit</span><input type="text" placeholder="Stk." value="${p.einheit||'Stk.'}"></div>
    <div class="ang-f-wrap"><span class="ang-f-lbl">Preis</span><input type="number" placeholder="0,00" value="${preis}" min="0" step="0.01" oninput="recalcAngSumme()"></div>
    ${isKlein ? '<div></div>' : `<div class="ang-f-wrap"><span class="ang-f-lbl">USt.</span><select onchange="recalcAngSumme()">
      <option value="19" ${rate==19?'selected':''}>19%</option>
      <option value="7"  ${rate==7?'selected':''}>7%</option>
      <option value="0"  ${rate==0?'selected':''}>0%</option>
    </select></div>`}
    <div class="ang-f-wrap"><span class="ang-f-lbl">Rabatt</span><input type="number" placeholder="0" value="${p.rabatt||0}" min="0" step="0.01" oninput="recalcAngSumme()" class="ang-rabatt-val"></div>
    <div class="ang-f-wrap ang-f-wrap-toggle"><span class="ang-f-lbl">Typ</span><div class="ang-rabatt-toggle">
      <button type="button" class="${rabattTyp==='%'?'active':''}" onclick="_angToggleRabatt(this,'%')">%</button>
      <button type="button" class="${rabattTyp==='€'?'active':''}" onclick="_angToggleRabatt(this,'€')">€</button>
    </div></div>
    <div class="ang-pos-betrag">0,00 €</div>
    <button class="del-btn" onclick="this.closest('.ang-pos-row').remove();recalcAngSumme()" style="padding:4px 8px">✕</button>`;
  list.appendChild(row);
  recalcAngSumme();
}
  list.appendChild(row);
  recalcAngSumme();
}

function _angToggleRabatt(btn, typ) {
  const toggle = btn.closest('.ang-rabatt-toggle');
  toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
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
    const sel      = row.querySelector('select');
    const rate     = sel ? parseFloat(sel.value) : 0;
    const rabattTyp = row.querySelector('.ang-rabatt-toggle .active')?.textContent?.trim() || '%';
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
    const sel       = row.querySelector('select');
    const menge     = parseFloat(numInputs[0]?.value)||1;
    const preis     = parseFloat(numInputs[1]?.value)||0;
    const rabatt    = parseFloat(numInputs[2]?.value)||0;
    const rate      = sel ? parseFloat(sel.value) : 0;
    const rabattTyp = row.querySelector('.ang-rabatt-toggle .active')?.textContent?.trim() || '%';
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
    nr: autoRechNr(), datum: new Date().toISOString().split('T')[0],
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
