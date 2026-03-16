// ── ANGEBOTE ──────────────────────────────────────────────────────────────
// Angebote = Angebote/Kostenvoranschläge (§14a UStG)

let editAngId = null;
let angPage = 1;
let angTabFilter = 'alle'; // текущая вкладка
const ANG_PER_PAGE = 10;

function setAngTab(tab) {
  angTabFilter = tab;
  angPage = 1;
  // Обновляем активную вкладку
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('ang-tab-' + tab);
  if (btn) btn.classList.add('active');
  renderAngebote();
}

const ANG_STATUS = {
  offen:      { label:'Offen',       icon:'fas fa-clock',        color:'var(--yellow)', bg:'rgba(251,191,36,.12)',  border:'rgba(251,191,36,.3)'  },
  angenommen: { label:'Angenommen',  icon:'fas fa-check-circle', color:'var(--green)',  bg:'rgba(34,197,94,.12)',   border:'rgba(34,197,94,.3)'   },
  abgelehnt:  { label:'Abgelehnt',   icon:'fas fa-times-circle', color:'var(--red)',    bg:'rgba(239,68,68,.12)',   border:'rgba(239,68,68,.3)'   },
  abgelaufen: { label:'Abgelaufen',  icon:'fas fa-hourglass-end',color:'var(--sub)',    bg:'rgba(148,163,184,.12)', border:'rgba(148,163,184,.3)' },
};


// ── INLINE FORM (вместо модального окна) ────────────────────
function openAngForm(id) {
  const listView = document.getElementById('ang-view-list');
  const formView = document.getElementById('ang-view-form');
  const title    = document.getElementById('ang-form-title');
  if (!formView) { openAngebotModal(); return; } // fallback

  if (id) {
    // Редактирование существующего
    editAngFill(id);
    if (title) title.textContent = 'Angebot bearbeiten';
  } else {
    // Новое
    editAngId = null;
    wiedTyp = 'Ausgabe';
    document.getElementById('ang-nr').value = autoAngNr();
    document.getElementById('ang-dat').value = new Date().toISOString().split('T')[0];
    document.getElementById('ang-gueltig').value = '';
    document.getElementById('ang-status').value = 'offen';
    document.getElementById('ang-kunde').value = '';
    document.getElementById('ang-adresse').value = '';
    document.getElementById('ang-notiz').value = '';
    const bEl = document.getElementById('ang-betreff');  if(bEl) bEl.value = 'Angebot ' + autoAngNr();
    const rEl = document.getElementById('ang-referenz'); if(rEl) rEl.value = '';
    const kEl = document.getElementById('ang-kopftext'); if(kEl) kEl.value = 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen das gewünschte freibleibende Angebot:';
    const fEl = document.getElementById('ang-fusstext'); if(fEl) fEl.value = 'Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\nMit freundlichen Grüßen';
    angPreisMode = 'brutto'; setAngPreisMode('brutto');
    initAngPositionen();
    if (title) title.textContent = 'Neues Angebot';
  }
  updateAngBanner();
  if (listView) listView.style.display = 'none';
  if (formView) formView.style.display = 'flex';
  // Скролл наверх
  const pi = document.querySelector('#p-angebote .page-inner');
  if (pi) pi.scrollTop = 0;
}

function closeAngForm() {
  const listView = document.getElementById('ang-view-list');
  const formView = document.getElementById('ang-view-form');
  if (listView) listView.style.display = 'block';
  if (formView) formView.style.display = 'none';
  editAngId = null;
  renderAngebote();
}

// Заполняем форму данными существующего Angebot
function editAngFill(id) {
  const a = (data.angebote||[]).find(x=>x.id===id);
  if (!a) return;
  editAngId = id;
  document.getElementById('ang-nr').value = a.nr || '';
  document.getElementById('ang-dat').value = a.datum || '';
  document.getElementById('ang-gueltig').value = a.gueltig || '';
  document.getElementById('ang-status').value = a.status || 'offen';
  document.getElementById('ang-kunde').value = a.kunde || '';
  document.getElementById('ang-adresse').value = a.adresse || '';
  document.getElementById('ang-notiz').value = a.notiz || '';
  const bEl = document.getElementById('ang-betreff');  if(bEl) bEl.value = a.betreff||'';
  const rEl = document.getElementById('ang-referenz'); if(rEl) rEl.value = a.referenz||'';
  const kEl = document.getElementById('ang-kopftext'); if(kEl) kEl.value = a.kopftext||'';
  const fEl = document.getElementById('ang-fusstext'); if(fEl) fEl.value = a.fusstext||'';
  angPreisMode = a.preisMode||'brutto'; setAngPreisMode(angPreisMode);
  loadAngPositionen(a.positionen||[]);
}

function autoAngNr() {
  const angs = data.angebote || [];
  let maxN = 0;
  angs.forEach(a => {
    const raw = (a.nr || '').replace(/[^0-9]/g, '');
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > maxN) maxN = n;
  });
  return 'A-' + String(maxN + 1).padStart(3, '0');
}

function openAngebotModal() {
  openAngForm(null);
  return;
}
function _openAngebotModalOld() {
  editAngId = null;
  document.getElementById('ang-nr').value = autoAngNr();
  document.getElementById('ang-dat').value = new Date().toISOString().split('T')[0];
  document.getElementById('ang-gueltig').value = '';
  document.getElementById('ang-status').value = 'offen';
  document.getElementById('ang-kunde').value = '';
  document.getElementById('ang-adresse').value = '';
  document.getElementById('ang-notiz').value = '';
  const bEl = document.getElementById('ang-betreff'); if(bEl) bEl.value = 'Angebot ' + autoAngNr();
  const rEl = document.getElementById('ang-referenz'); if(rEl) rEl.value = '';
  const kEl = document.getElementById('ang-kopftext'); if(kEl) kEl.value = 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen das gewünschte freibleibende Angebot:';
  const fEl = document.getElementById('ang-fusstext'); if(fEl) fEl.value = 'Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\nMit freundlichen Grüßen';
  angPreisMode = 'brutto'; setAngPreisMode('brutto');
  initAngPositionen();
  updateAngBanner();
  openModal('ang-modal');
}

function editAng(id) {
  openAngForm(id);
}
function editAngOld(id) {
  const a = (data.angebote || []).find(x => x.id === id);
  if (!a) return;
  editAngId = id;
  document.getElementById('ang-nr').value = a.nr || '';
  document.getElementById('ang-dat').value = a.datum || '';
  document.getElementById('ang-gueltig').value = a.gueltig || '';
  document.getElementById('ang-status').value = a.status || 'offen';
  document.getElementById('ang-kunde').value = a.kunde || '';
  document.getElementById('ang-adresse').value = a.adresse || '';
  document.getElementById('ang-notiz').value = a.notiz || '';
  const bEl2 = document.getElementById('ang-betreff');  if(bEl2) bEl2.value = a.betreff||'';
  const rEl2 = document.getElementById('ang-referenz'); if(rEl2) rEl2.value = a.referenz||'';
  const kEl2 = document.getElementById('ang-kopftext'); if(kEl2) kEl2.value = a.kopftext||'';
  const fEl2 = document.getElementById('ang-fusstext'); if(fEl2) fEl2.value = a.fusstext||'';
  angPreisMode = a.preisMode||'brutto'; setAngPreisMode(angPreisMode);
  loadAngPositionen(a.positionen || []);
  updateAngBanner();
  openModal('ang-modal');
}

function updateAngBanner() {
  const el = document.getElementById('ang-ust-banner');
  if (!el) return;
  const yr = document.getElementById('ang-dat')?.value?.substring(0, 4) || new Date().getFullYear() + '';
  const isKlein = isKleinunternehmer(yr);
  el.style.display = 'block';
  el.style.background = isKlein ? 'rgba(251,191,36,.1)' : 'rgba(26,69,120,.08)';
  el.style.color = isKlein ? 'var(--yellow)' : 'var(--blue)';
  el.innerHTML = isKlein
    ? '<i class="fas fa-info-circle"></i> §19 UStG — Kleinunternehmer: keine MwSt.'
    : '<i class="fas fa-info-circle"></i> Regelbesteuerung — MwSt. wird ausgewiesen';
}

// ── POSITIONEN ────────────────────────────────────────────────
function initAngPositionen() {
  const list = document.getElementById('ang-pos-list');
  if (!list) return;
  list.innerHTML = '';
  addAngPosition();
}

function loadAngPositionen(positionen) {
  const list = document.getElementById('ang-pos-list');
  if (!list) return;
  list.innerHTML = '';
  if (!positionen.length) { addAngPosition(); return; }
  positionen.forEach(p => addAngPosition(p));
  recalcAngSumme();
}

let angPreisMode = 'brutto'; // 'brutto' | 'netto'

function setAngPreisMode(mode) {
  angPreisMode = mode;
  const lbl = document.getElementById('ang-preis-lbl');
  if(lbl) lbl.textContent = mode === 'brutto' ? 'Preis (brutto)' : 'Preis (netto)';
  const btnB = document.getElementById('ang-brutto-btn');
  const btnN = document.getElementById('ang-netto-btn');
  if(btnB){ btnB.style.background = mode==='brutto'?'var(--blue)':''; btnB.style.color = mode==='brutto'?'#fff':''; btnB.style.borderColor = mode==='brutto'?'var(--blue)':''; }
  if(btnN){ btnN.style.background = mode==='netto'?'var(--blue)':'';  btnN.style.color = mode==='netto'?'#fff':'';  btnN.style.borderColor = mode==='netto'?'var(--blue)':'';  }
  recalcAngSumme();
}

function addAngPosition(p = {}) {
  const list = document.getElementById('ang-pos-list');
  if (!list) return;
  const yr = document.getElementById('ang-dat')?.value?.substring(0, 4) || new Date().getFullYear() + '';
  const isKlein = isKleinunternehmer(yr);
  const rate = p.rate ?? p.mwstRate ?? (isKlein ? 0 : 19);
  const preis = p.brutto ?? p.netto ?? '';
  const div = document.createElement('div');
  div.className = 'ang-pos-row';
  const rabatt = p.rabatt||0;
  div.innerHTML = `
    <input type="text"   placeholder="Produkt oder Service" value="${p.bez||p.beschreibung||''}" oninput="recalcAngSumme()">
    <input type="number" placeholder="1,00" value="${p.menge||1}"    min="0.01" step="0.01"  oninput="recalcAngSumme()">
    <input type="text"   placeholder="Stk." value="${p.einheit||'Stk.'}"                                               >
    <input type="number" placeholder="0,00" value="${preis}"         min="0"    step="0.01"  oninput="recalcAngSumme()">
    <select onchange="recalcAngSumme()">
      <option value="19" ${rate==19?'selected':''}>19%</option>
      <option value="7"  ${rate==7?'selected':''}>7%</option>
      <option value="0"  ${rate==0?'selected':''}>0%</option>
    </select>
    <div style="display:flex;align-items:center;gap:2px">
      <input type="number" placeholder="0" value="${rabatt}" min="0" max="100" step="0.1" oninput="recalcAngSumme()" style="width:45px;padding:6px 4px;text-align:center">
      <span style="font-size:11px;color:var(--sub)">%</span>
    </div>
    <div class="ang-betrag">0,00 €</div>
    <button class="del-btn" onclick="this.closest('.ang-pos-row').remove();recalcAngSumme()" title="Entfernen" style="font-size:13px;width:22px;height:22px;padding:0;border-radius:4px">✕</button>
  `;
  list.appendChild(div);
  recalcAngSumme();
}

function recalcAngSumme() {
  const rows = document.querySelectorAll('#ang-pos-list .ang-pos-row');
  let totalNetto = 0, totalMwst = 0;
  rows.forEach(row => {
    const inputs  = row.querySelectorAll('input[type=number]');
    const menge   = parseFloat(inputs[0]?.value) || 1;
    const preis   = parseFloat(inputs[1]?.value) || 0;
    const rabatt  = parseFloat(inputs[2]?.value) || 0;
    const sel     = row.querySelector('select');
    const rate    = sel ? parseFloat(sel.value) : 0;
    const factor  = 1 - rabatt/100;
    let netto, brutto;
    if (angPreisMode === 'brutto') {
      brutto = r2(menge * preis * factor);
      netto  = rate > 0 ? r2(brutto / (1 + rate/100)) : brutto;
    } else {
      netto  = r2(menge * preis * factor);
      brutto = r2(netto * (1 + rate/100));
    }
    const mwst = r2(brutto - netto);
    totalNetto += netto;
    totalMwst  += mwst;
    // Обновляем Betrag в строке
    const betragEl = row.querySelector('.ang-betrag');
    if(betragEl) betragEl.textContent = brutto.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  });
  const totalBrutto = r2(totalNetto + totalMwst);
  const f = v => v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const ne = document.getElementById('ang-sum-netto');    if(ne) ne.textContent = f(totalNetto);
  const mw = document.getElementById('ang-sum-mwst');     if(mw) mw.textContent = f(totalMwst);
  const br = document.getElementById('ang-sum-brutto');   if(br) br.textContent = f(totalBrutto);
}

function getAngPositionen() {
  const rows = document.querySelectorAll('#ang-pos-list .ang-pos-row');
  return [...rows].map(row => {
    const inputs  = row.querySelectorAll('input');
    const sel     = row.querySelector('select');
    const bez     = inputs[0]?.value?.trim() || '';
    const menge   = parseFloat(inputs[1]?.value) || 1;
    const einheit = inputs[2]?.value?.trim() || 'Stk.';
    const preis   = parseFloat(inputs[3]?.value) || 0;
    const rabatt  = parseFloat(inputs[4]?.value) || 0;
    const rate    = sel ? parseFloat(sel.value) : 0;
    let netto, brutto;
    if (angPreisMode === 'brutto') {
      brutto = r2(menge * preis);
      netto  = rate > 0 ? r2(brutto / (1 + rate/100)) : brutto;
    } else {
      netto  = r2(menge * preis);
      brutto = r2(netto * (1 + rate/100));
    }
    return { bez, menge, einheit, netto: r2(netto/menge), brutto: r2(brutto/menge), rate, rabatt };
  }).filter(p => p.bez || p.netto);
}

// ── KUNDE AUTOCOMPLETE ────────────────────────────────────────
function angKundeSearch(q) {
  const sug = document.getElementById('ang-kunde-suggest');
  if (!q || q.length < 2) { sug.style.display = 'none'; return; }
  const matches = (data.kunden || []).filter(k =>
    (k.name || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);
  if (!matches.length) { sug.style.display = 'none'; return; }
  sug.style.display = 'block';
  sug.innerHTML = matches.map(k => `
    <div onclick="selectAngKunde('${k.id}')"
      style="padding:8px 12px;cursor:pointer;font-size:13px"
      onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600">${k.name}</div>
      ${k.strasse ? `<div style="font-size:11px;color:var(--sub)">${k.strasse}, ${k.plz} ${k.ort}</div>` : ''}
    </div>`).join('');
}

function selectAngKunde(id) {
  const k = (data.kunden || []).find(x => x.id === id);
  if (!k) return;
  document.getElementById('ang-kunde').value = k.name;
  const adr = [k.strasse, k.plz && k.ort ? k.plz + ' ' + k.ort : k.ort].filter(Boolean).join('\n');
  document.getElementById('ang-adresse').value = adr;
  document.getElementById('ang-kunde-suggest').style.display = 'none';
}

// ── SAVE ──────────────────────────────────────────────────────
function saveAngebot() {
  const nr = document.getElementById('ang-nr').value.trim();
  const datum = document.getElementById('ang-dat').value;
  const positionen = getAngPositionen();
  const brutto = r2(positionen.reduce((s, p) => s + p.menge * p.brutto, 0));
  if (!nr || !datum) return toast('Nr. und Datum sind Pflichtfelder!', 'err');
  if (!data.angebote) data.angebote = [];

  const obj = {
    nr,
    datum,
    gueltig:    document.getElementById('ang-gueltig').value,
    status:     document.getElementById('ang-status').value,
    kunde:      document.getElementById('ang-kunde').value.trim(),
    adresse:    document.getElementById('ang-adresse').value.trim(),
    notiz:      document.getElementById('ang-notiz').value.trim(),
    betreff:    document.getElementById('ang-betreff')?.value.trim()||'',
    referenz:   document.getElementById('ang-referenz')?.value.trim()||'',
    kopftext:   document.getElementById('ang-kopftext')?.value.trim()||'',
    fusstext:   document.getElementById('ang-fusstext')?.value.trim()||'',
    preisMode:  angPreisMode,
    betrag:     brutto,
    positionen,
  };

  if (editAngId) {
    const a = data.angebote.find(x => x.id === editAngId);
    if (a) { Object.assign(a, obj); sbSaveAngebot(a); }
    editAngId = null;
  } else {
    const dup = data.angebote.find(a => a.nr === nr);
    if (dup) return toast(`Angebots-Nr. ${nr} bereits vergeben!`, 'err');
    const newA = { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...obj };
    data.angebote.push(newA);
    sbSaveAngebot(newA);
  }
  closeAngForm();
  toast('✓ Angebot gespeichert!', 'ok');
}

async function delAngebot(id) {
  const ok = await appConfirm('Angebot wirklich löschen?', { title:'Angebot löschen', icon:'🗑️', okLabel:'Löschen', danger:true });
  if (!ok) return;
  data.angebote = (data.angebote || []).filter(a => a.id !== id);
  sbDeleteAngebot(id);
  renderAngebote();
  toast('Angebot gelöscht', 'err');
}

async function angZuRechnung(id) {
  const a = (data.angebote || []).find(x => x.id === id);
  if (!a) return;
  const ok = await appConfirm(
    `Angebot ${a.nr} in Rechnung umwandeln?`,
    { title:'In Rechnung umwandeln', icon:'📄', okLabel:'Umwandeln', cancelLabel:'Abbrechen' }
  );
  if (!ok) return;
  // Angebot → angenommen
  a.status = 'angenommen';
  sbSaveAngebot(a);
  // Neue Rechnung vorausfüllen
  if (!data.rechnungen) data.rechnungen = [];
  const newR = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    nr: autoRechNr(),
    datum: new Date().toISOString().split('T')[0],
    faellig: '',
    status: 'offen',
    kunde: a.kunde || '',
    adresse: a.adresse || '',
    email: '',
    tel: '',
    betrag: a.betrag,
    positionen: a.positionen || [],
    notiz: `Aus Angebot ${a.nr}`,
    beschreibung: a.positionen?.map(p => p.bez).join(', ') || '',
    mwstMode: isKleinunternehmer(new Date().getFullYear() + '') ? '§19' : 'regel',
  };
  data.rechnungen.push(newR);
  sbSaveRechnung(newR);
  renderAngebote();
  nav('rechnungen', document.querySelector('.nav-item[onclick*=rechnungen]'));
  toast(`✓ Rechnung ${newR.nr} aus Angebot ${a.nr} erstellt`, 'ok');
}

// ── RENDER ────────────────────────────────────────────────────
function renderAngebote() {
  const em  = document.getElementById('ang-empty');
  const lst = document.getElementById('ang-list');
  if (!lst) return;

  const today = new Date().toISOString().split('T')[0];
  const angs  = data.angebote || [];

  // Автообновление статуса
  angs.forEach(a => {
    if (a.status === 'offen' && a.gueltig && a.gueltig < today) a.status = 'abgelaufen';
  });

  // Фильтр по вкладке + поиск
  const q = (document.getElementById('ang-search')||{value:''}).value.toLowerCase();
  let filtered = angTabFilter === 'alle' ? [...angs] : angs.filter(a => a.status === angTabFilter);
  if (q) filtered = filtered.filter(a =>
    (a.nr||'').toLowerCase().includes(q) ||
    (a.kunde||'').toLowerCase().includes(q) ||
    (a.betreff||'').toLowerCase().includes(q)
  );
  filtered.sort((a,b) => (b.datum||'').localeCompare(a.datum||''));

  // Счётчики на вкладках
  const counts = { alle: angs.length };
  ['offen','angenommen','abgelehnt','abgelaufen'].forEach(s => {
    counts[s] = angs.filter(a => a.status === s).length;
  });
  [{id:'alle',lbl:'Alle'},{id:'offen',lbl:'Offen'},{id:'angenommen',lbl:'Angenommen'},
   {id:'abgelehnt',lbl:'Abgelehnt'},{id:'abgelaufen',lbl:'Abgelaufen'}].forEach(({id,lbl}) => {
    const btn = document.getElementById('ang-tab-' + id);
    if (!btn) return;
    const icon = btn.querySelector('i');
    const iconHtml = icon ? icon.outerHTML + ' ' : '';
    btn.innerHTML = iconHtml + lbl + (counts[id] ? ` (${counts[id]})` : '');
  });

  if (!filtered.length) {
    lst.innerHTML = '';
    if (em) em.style.display = 'block';
    document.getElementById('ang-pagination').innerHTML = '';
    return;
  }
  if (em) em.style.display = 'none';

  const totalPages = Math.max(1, Math.ceil(filtered.length / ANG_PER_PAGE));
  if (angPage > totalPages) angPage = totalPages;
  const items = filtered.slice((angPage-1)*ANG_PER_PAGE, angPage*ANG_PER_PAGE);

  // Рендерим как rech-card карточки
  lst.innerHTML = items.map(a => {
    const st = ANG_STATUS[a.status] || ANG_STATUS.offen;
    const isExpiring = a.gueltig && a.gueltig > today && a.status === 'offen' &&
      (new Date(a.gueltig) - new Date()) < 7*24*60*60*1000;

    return `<div class="rech-card" onclick="openAngForm('${a.id}')">
      <div class="rech-card-left">
        <div class="rech-card-avatar" style="background:${st.bg};color:${st.color}">
          <i class="${st.icon}"></i>
        </div>
        <div class="rech-card-info">
          <div class="rech-card-nr" style="display:flex;align-items:center;gap:8px">
            <span>${a.nr || '—'}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${st.bg};color:${st.color};border:1px solid ${st.border}">
              <i class="${st.icon}" style="font-size:9px"></i> ${st.label}
            </span>
          </div>
          <div class="rech-card-kunde">${a.kunde || '—'}</div>
          <div class="rech-card-meta">
            <span>${fd(a.datum)}</span>
            ${a.gueltig ? `<span>·</span><span style="${isExpiring?'color:var(--yellow)':''}">Gültig bis ${fd(a.gueltig)}</span>` : ''}
            ${a.betreff ? `<span>·</span><span style="color:var(--sub)">${a.betreff}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="rech-card-right">
        <div class="rech-card-betrag">${fmt(a.betrag)}</div>
        <div class="rech-card-actions" onclick="event.stopPropagation()">
          <button class="rca-btn" onclick="toggleAngMenu('${a.id}',this)" title="Aktionen">⋯</button>
          <div id="ang-menu-${a.id}" style="display:none;position:fixed;background:var(--s1);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:500;min-width:200px;padding:4px">
            <div class="ang-menu-item" onclick="openAngForm('${a.id}')"><i class="fas fa-edit"></i> Bearbeiten</div>
            <div class="ang-menu-item" onclick="printAngebot('${a.id}')"><i class="fas fa-eye"></i> Vorschau</div>
            <div style="height:1px;background:var(--border);margin:4px 0"></div>
            <div class="ang-menu-item" onclick="angSetStatus('${a.id}','angenommen')"><i class="fas fa-check-circle" style="color:var(--green)"></i> Auftrag erhalten</div>
            <div class="ang-menu-item" onclick="angSetStatus('${a.id}','abgelehnt')"><i class="fas fa-times-circle" style="color:var(--red)"></i> Auftrag abgelehnt</div>
            <div style="height:1px;background:var(--border);margin:4px 0"></div>
            <div class="ang-menu-item" onclick="angZuRechnung('${a.id}')"><i class="fas fa-file-invoice" style="color:var(--blue)"></i> Rechnung erzeugen</div>
            <div style="height:1px;background:var(--border);margin:4px 0"></div>
            <div class="ang-menu-item" style="color:var(--red)" onclick="delAngebot('${a.id}')"><i class="fas fa-trash"></i> Löschen</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  window._angPagerCb = function(p) { angPage = p; renderAngebote(); };
  renderPager('ang-pagination', angPage, totalPages, filtered.length, '_angPagerCb');
}


function angSetStatus(id, status) {
  const a = (data.angebote||[]).find(x=>x.id===id);
  if(!a) return;
  a.status = status;
  sbSaveAngebot(a);
  closeAllAngMenus();
  renderAngebote();
  const st = ANG_STATUS[status]||ANG_STATUS.offen;
  toast(`Angebot ${a.nr}: ${st.label}`, 'ok');
}

// Открываем/закрываем контекстное меню
function toggleAngMenu(id, btn) {
  closeAllAngMenus();
  const menu = document.getElementById('ang-menu-' + id);
  if (!menu) return;
  menu.style.display = 'block';
  // Позиционируем
  const rect = btn.getBoundingClientRect();
  menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.position = 'fixed';
  setTimeout(() => document.addEventListener('click', closeAllAngMenus, {once:true}), 10);
}
function closeAllAngMenus() {
  document.querySelectorAll('[id^="ang-menu-"]').forEach(m => m.style.display = 'none');
}

function angZuRechnungFromModal() {
  // Сначала сохраняем текущее состояние, потом конвертируем
  const nr = document.getElementById('ang-nr')?.value.trim();
  const a = (data.angebote||[]).find(x=>x.nr===nr);
  closeAngForm();
  if(a) angZuRechnung(a.id);
}

// ── VORSCHAU / DRUCK ──────────────────────────────────────────
function printAngebot(id) {
  // Если вызван из списка по id — открываем форму и печатаем
  if (id) {
    const a = (data.angebote||[]).find(x=>x.id===id);
    if (!a) return;
    // Печатаем напрямую из объекта
    _printAngebotFromData(a);
    return;
  }
  // Иначе читаем из открытой формы
  _printAngebotFromForm();
}
function _printAngebotFromForm() {
  const nr      = document.getElementById('ang-nr')?.value || '—';
  const datum   = document.getElementById('ang-dat')?.value || '';
  const gueltig = document.getElementById('ang-gueltig')?.value || '';
  const kunde   = document.getElementById('ang-kunde')?.value || '';
  const adresse = (document.getElementById('ang-adresse')?.value || '').replace(/\n/g,'<br>');
  const betreff = document.getElementById('ang-betreff')?.value || '';
  const referenz= document.getElementById('ang-referenz')?.value || '';
  const kopf    = (document.getElementById('ang-kopftext')?.value || '').replace(/\n/g,'<br>');
  const fuss    = (document.getElementById('ang-fusstext')?.value || '').replace(/\n/g,'<br>');
  const nettoEl = document.getElementById('ang-sum-netto')?.textContent || '0,00 €';
  const mwstEl  = document.getElementById('ang-sum-mwst')?.textContent  || '0,00 €';
  const brutto  = document.getElementById('ang-sum-brutto')?.textContent|| '0,00 €';

  // Firma aus localStorage
  let firma = {};
  try { firma = JSON.parse(localStorage.getItem('bp_firma')||'{}'); } catch(e){}
  const firmaName = firma.name || 'Mein Unternehmen';
  const firmaAdr  = [firma.strasse, firma.plz&&firma.ort?firma.plz+' '+firma.ort:''].filter(Boolean).join(', ');

  // Positionen
  const rows = [...document.querySelectorAll('#ang-pos-list .ang-pos-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    const sel    = row.querySelector('select');
    const bez    = inputs[0]?.value || '';
    const menge  = inputs[1]?.value || '1';
    const einh   = inputs[2]?.value || 'Stk.';
    const preis  = inputs[3]?.value || '0';
    const ust    = sel?.value || '0';
    const betrag = row.querySelector('.ang-betrag')?.textContent || '0,00 €';
    return `<tr>
      <td style="padding:8px 10px">${bez}</td>
      <td style="padding:8px 10px;text-align:center">${menge}</td>
      <td style="padding:8px 10px;text-align:center">${einh}</td>
      <td style="padding:8px 10px;text-align:right">${preis} €</td>
      <td style="padding:8px 10px;text-align:center">${ust}%</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600">${betrag}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
  <title>Angebot ${nr}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:0;padding:32px;max-width:800px;margin:0 auto}
    h1{font-size:22px;font-weight:700;margin:0 0 4px}
    .meta{color:#666;font-size:12px;margin-bottom:24px}
    .two-col{display:flex;gap:40px;margin-bottom:24px}
    .two-col>div{flex:1}
    .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    thead tr{background:#f5f7fa}
    th{padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:2px solid #e5e7eb}
    td{border-bottom:1px solid #f0f0f0}
    .totals{margin-left:auto;width:260px;margin-top:8px}
    .totals tr td{padding:5px 10px;border:none}
    .totals .total-row{font-size:15px;font-weight:800;border-top:2px solid #222}
    .kopf{margin-bottom:20px;line-height:1.6}
    .fuss{margin-top:24px;color:#555;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px}
    @media print{body{padding:16px}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <div style="font-size:20px;font-weight:800;color:#1a4578">${firmaName}</div>
      <div style="color:#666;font-size:12px">${firmaAdr}</div>
    </div>
    <div style="text-align:right">
      <h1>Angebot</h1>
      <div class="meta">
        Nr. <strong>${nr}</strong> · ${fd(datum)}
        ${gueltig ? ' · Gültig bis '+fd(gueltig) : ''}
        ${referenz ? '<br>Ref: '+referenz : ''}
      </div>
    </div>
  </div>
  <div class="two-col">
    <div>
      <div class="label">An</div>
      <div style="font-weight:600">${kunde}</div>
      <div style="color:#555">${adresse}</div>
    </div>
    ${betreff ? `<div><div class="label">Betreff</div><div style="font-weight:600">${betreff}</div></div>` : ''}
  </div>
  ${kopf ? `<div class="kopf">${kopf}</div>` : ''}
  <table>
    <thead><tr>
      <th>Produkt / Leistung</th>
      <th style="text-align:center">Menge</th>
      <th style="text-align:center">Einh.</th>
      <th style="text-align:right">Preis</th>
      <th style="text-align:center">USt.</th>
      <th style="text-align:right">Betrag</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td style="color:#666">Gesamtsumme Netto</td><td style="text-align:right">${nettoEl}</td></tr>
    <tr><td style="color:#666">Umsatzsteuer</td><td style="text-align:right">${mwstEl}</td></tr>
    <tr class="total-row"><td>Gesamt</td><td style="text-align:right;color:#1a4578">${brutto}</td></tr>
  </table>
  ${fuss ? `<div class="fuss">${fuss}</div>` : ''}
  </body></html>`;

  const w = window.open('','_blank','width=860,height=700');
  if(w){ w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400); }
}

function _printAngebotFromData(a) {
  let firma = {};
  try { firma = JSON.parse(localStorage.getItem('bp_firma')||'{}'); } catch(e){}
  const firmaName = firma.name || 'Mein Unternehmen';
  const firmaAdr  = [firma.strasse, firma.plz&&firma.ort?firma.plz+' '+firma.ort:''].filter(Boolean).join(', ');

  const rows = (a.positionen||[]).map(p => `<tr>
    <td style="padding:8px 10px">${p.bez||''}</td>
    <td style="padding:8px 10px;text-align:center">${p.menge||1}</td>
    <td style="padding:8px 10px;text-align:center">${p.einheit||'Stk.'}</td>
    <td style="padding:8px 10px;text-align:right">${fmt(p.netto)} €</td>
    <td style="padding:8px 10px;text-align:center">${p.rate||0}%</td>
    <td style="padding:8px 10px;text-align:right;font-weight:600">${fmt(p.brutto * (p.menge||1))}</td>
  </tr>`).join('');

  const netto  = r2((a.positionen||[]).reduce((s,p)=>s+(p.menge||1)*p.netto,0));
  const brutto = a.betrag;
  const mwst   = r2(brutto - netto);

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
  <title>Angebot ${a.nr}</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:22px;font-weight:700;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:16px 0}
  thead tr{background:#f5f7fa}th{padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#555;border-bottom:2px solid #e5e7eb}
  td{border-bottom:1px solid #f0f0f0}.totals{margin-left:auto;width:260px}.totals td{padding:5px 10px;border:none}
  .total-row{font-size:15px;font-weight:800;border-top:2px solid #222}</style></head><body>
  <div style="display:flex;justify-content:space-between;margin-bottom:24px">
    <div><div style="font-size:20px;font-weight:800;color:#1a4578">${firmaName}</div><div style="color:#666;font-size:12px">${firmaAdr}</div></div>
    <div style="text-align:right"><h1>Angebot</h1><div style="color:#666;font-size:12px">Nr. <strong>${a.nr||'—'}</strong> · ${fd(a.datum)}</div></div>
  </div>
  <div style="margin-bottom:20px"><div style="font-weight:600">${a.kunde||'—'}</div><div style="color:#555;white-space:pre-line">${a.adresse||''}</div></div>
  ${a.betreff ? `<div style="margin-bottom:16px"><strong>Betreff:</strong> ${a.betreff}</div>` : ''}
  ${a.kopftext ? `<div style="margin-bottom:20px;line-height:1.6">${(a.kopftext||'').replace(/\n/g,'<br>')}</div>` : ''}
  <table><thead><tr><th>Leistung</th><th style="text-align:center">Menge</th><th style="text-align:center">Einh.</th><th style="text-align:right">Preis</th><th style="text-align:center">USt.</th><th style="text-align:right">Betrag</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <table class="totals"><tr><td style="color:#666">Netto</td><td style="text-align:right">${fmt(netto)}</td></tr>
  <tr><td style="color:#666">MwSt.</td><td style="text-align:right">${fmt(mwst)}</td></tr>
  <tr class="total-row"><td>Gesamt</td><td style="text-align:right;color:#1a4578">${fmt(brutto)}</td></tr></table>
  ${a.fusstext ? `<div style="margin-top:24px;color:#555;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px">${(a.fusstext||'').replace(/\n/g,'<br>')}</div>` : ''}
  </body></html>`;

  const w = window.open('','_blank','width=860,height=700');
  if(w){ w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400); }
}
