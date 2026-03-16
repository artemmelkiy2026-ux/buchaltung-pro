// ── ANGEBOTE ──────────────────────────────────────────────────────────────
// Angebote = Angebote/Kostenvoranschläge (§14a UStG)

let editAngId = null;
let angPage = 1;
const ANG_PER_PAGE = 10;

const ANG_STATUS = {
  offen:      { label:'Offen',       cls:'ang-offen',      icon:'fas fa-clock' },
  angenommen: { label:'Angenommen',  cls:'ang-angenommen', icon:'fas fa-check-circle' },
  abgelehnt:  { label:'Abgelehnt',   cls:'ang-abgelehnt',  icon:'fas fa-times-circle' },
  abgelaufen: { label:'Abgelaufen',  cls:'ang-abgelaufen', icon:'fas fa-hourglass-end' },
};

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
    const inputs = row.querySelectorAll('input[type=number]');
    const menge  = parseFloat(inputs[0]?.value) || 1;
    const preis  = parseFloat(inputs[1]?.value) || 0;
    const sel    = row.querySelector('select');
    const rate   = sel ? parseFloat(sel.value) : 0;
    let netto, brutto;
    if (angPreisMode === 'brutto') {
      brutto = r2(menge * preis);
      netto  = rate > 0 ? r2(brutto / (1 + rate/100)) : brutto;
    } else {
      netto  = r2(menge * preis);
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
    const rate    = sel ? parseFloat(sel.value) : 0;
    let netto, brutto;
    if (angPreisMode === 'brutto') {
      brutto = r2(menge * preis);
      netto  = rate > 0 ? r2(brutto / (1 + rate/100)) : brutto;
    } else {
      netto  = r2(menge * preis);
      brutto = r2(netto * (1 + rate/100));
    }
    return { bez, menge, einheit, netto: r2(netto/menge), brutto: r2(brutto/menge), rate };
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
  closeModal('ang-modal');
  renderAngebote();
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
  const cards = document.getElementById('ang-cards');
  if (!lst) return;

  const today = new Date().toISOString().split('T')[0];
  const angs  = data.angebote || [];

  // Обновляем статус abgelaufen автоматически
  angs.forEach(a => {
    if (a.status === 'offen' && a.gueltig && a.gueltig < today) a.status = 'abgelaufen';
  });

  const q = (document.getElementById('ang-search') || { value: '' }).value.toLowerCase();
  let filtered = q
    ? angs.filter(a => (a.nr || '').toLowerCase().includes(q) || (a.kunde || '').toLowerCase().includes(q))
    : [...angs];
  filtered.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  // Statistik-Karten
  const offen      = angs.filter(a => a.status === 'offen');
  const angenommen = angs.filter(a => a.status === 'angenommen');
  const abgelehnt  = angs.filter(a => a.status === 'abgelehnt' || a.status === 'abgelaufen');
  if (cards) cards.innerHTML = `
    <div class="sc y" style="cursor:default">
      <div class="sc-lbl">Offen</div>
      <div class="sc-val">${fmt(offen.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${offen.length} Angebot${offen.length!==1?'e':''}</div>
    </div>
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Angenommen</div>
      <div class="sc-val">${fmt(angenommen.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${angenommen.length} Angebot${angenommen.length!==1?'e':''}</div>
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">Abgelehnt / Abgelaufen</div>
      <div class="sc-val">${fmt(abgelehnt.reduce((s,a)=>s+a.betrag,0))}</div>
      <div class="sc-sub">${abgelehnt.length} Angebot${abgelehnt.length!==1?'e':''}</div>
    </div>`;

  if (!filtered.length) {
    lst.innerHTML = '';
    if (em) em.style.display = 'block';
    document.getElementById('ang-pagination').innerHTML = '';
    return;
  }
  if (em) em.style.display = 'none';

  const totalPages = Math.max(1, Math.ceil(filtered.length / ANG_PER_PAGE));
  if (angPage > totalPages) angPage = totalPages;
  const items = filtered.slice((angPage - 1) * ANG_PER_PAGE, angPage * ANG_PER_PAGE);

  const STATUS_COLORS = {
    offen:      { bg:'rgba(251,191,36,.12)',  c:'var(--yellow)', border:'rgba(251,191,36,.3)'  },
    angenommen: { bg:'rgba(34,197,94,.12)',   c:'var(--green)',  border:'rgba(34,197,94,.3)'   },
    abgelehnt:  { bg:'rgba(239,68,68,.12)',   c:'var(--red)',    border:'rgba(239,68,68,.3)'   },
    abgelaufen: { bg:'rgba(148,163,184,.12)', c:'var(--sub)',    border:'rgba(148,163,184,.3)' },
  };

  lst.innerHTML = items.map(a => {
    const st = ANG_STATUS[a.status] || ANG_STATUS.offen;
    const sc = STATUS_COLORS[a.status] || STATUS_COLORS.offen;
    const isExpiring = a.gueltig && a.gueltig > today && a.status === 'offen' &&
      (new Date(a.gueltig) - new Date()) < 7 * 24 * 60 * 60 * 1000;

    return `<div class="rech-card" onclick="editAng('${a.id}')">
      <div class="rech-card-left">
        <div class="rech-card-avatar" style="background:${sc.bg};color:${sc.c}">
          <i class="${st.icon}"></i>
        </div>
        <div class="rech-card-info">
          <div class="rech-card-nr">A-Nr. ${a.nr}</div>
          <div class="rech-card-kunde">${a.kunde || '—'}</div>
          <div class="rech-card-meta">
            <span>${fd(a.datum)}</span>
            ${a.gueltig ? `<span style="color:var(--sub)">·</span><span style="${isExpiring?'color:var(--yellow)':''}">Gültig bis ${fd(a.gueltig)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="rech-card-right">
        <div class="rech-card-betrag">${fmt(a.betrag)}</div>
        <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${sc.bg};color:${sc.c};border:1px solid ${sc.border}">
          <i class="${st.icon}" style="font-size:9px"></i> ${st.label}
        </div>
        <div class="rech-card-actions" onclick="event.stopPropagation()">
          ${a.status==='offen'||a.status==='abgelaufen' ? `<button class="rca-btn rca-green" onclick="angZuRechnung('${a.id}')" title="In Rechnung umwandeln"><i class="fas fa-file-invoice"></i></button>` : ''}
          <button class="rca-btn" onclick="delAngebot('${a.id}')" title="Löschen"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');

  window._angPagerCb = function(p) { angPage = p; renderAngebote(); };
  renderPager('ang-pagination', angPage, totalPages, filtered.length, '_angPagerCb');
}

function angZuRechnungFromModal() {
  // Сначала сохраняем текущее состояние, потом конвертируем
  const nr = document.getElementById('ang-nr')?.value.trim();
  const a = (data.angebote||[]).find(x=>x.nr===nr);
  closeModal('ang-modal');
  if(a) angZuRechnung(a.id);
}
