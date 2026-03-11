// ── HELPERS ───────────────────────────────────────────────────────────────
function fmt(n){return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function fd(d){if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}.${m}.${y}`}
// Мобильная дата: DD.MM.YY (год 2 цифры)
function fdm(d){if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}.${m}.${y.slice(2)}`}
function isMob(){return window.innerWidth<=768}
function sum(arr,t){return arr.filter(e=>e.typ===t).reduce((s,e)=>s+e.betrag,0)}

// ── USt-Modus (нужен dashboard.js и другим модулям) ──────────────────────
function getUstModeForYear(yr){
  if(!yr) yr = new Date().getFullYear()+'';
  return (typeof data !== 'undefined' && data.ustModeByYear ? data.ustModeByYear[yr] : null) || '§19';
}
function isKleinunternehmer(yr){ return getUstModeForYear(yr)==='§19'; }

function g(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function dl(csv,name){const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type} show`;setTimeout(()=>t.classList.remove('show'),3200)}

// ── МОБИЛЬНЫЙ DETAIL POPUP ─────────────────────────────────────────────────
function showMobDetail(entry){
  const modal=document.getElementById('mob-detail-modal');
  if(!modal)return;
  const isEin=entry.typ==='Einnahme';
  document.getElementById('mdm-title').innerHTML=`<span class="badge ${isEin?'b-ein':'b-aus'}">${isEin?'<i class="fas fa-arrow-up" style="color:var(--green)"></i> '+t('Einnahme'):'<i class="fas fa-arrow-down" style="color:var(--red)"></i> '+t('Ausgabe')}</span>`;
  // Добавляем крестик в кнопку
  modal.querySelector('.mdm-close-btn').innerHTML='✕';
  document.getElementById('mdm-body').innerHTML=`
    <div class="mdm-row">
      <span class="mdm-key">Betrag</span>
      <span class="mdm-val mdm-amt" style="color:${isEin?'var(--green)':'var(--red)'}">${isEin?'+':'−'}${fmt(entry.betrag)}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Datum</span>
      <span class="mdm-val">${fd(entry.datum)}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Kategorie</span>
      <span class="mdm-val">${entry.kategorie||'—'}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Beschreibung</span>
      <span class="mdm-val">${entry.beschreibung||'—'}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Zahlungsart</span>
      <span class="mdm-val"><span class="badge ${ZBADGE[entry.zahlungsart]||''}">${entry.zahlungsart||'—'}</span></span>
    </div>
    ${entry.notiz?`<div class="mdm-row"><span class="mdm-key">Notiz</span><span class="mdm-val">${entry.notiz}</span></div>`:''}
  `;
  document.getElementById('mdm-btns').innerHTML=`
    <button class="btn primary" style="flex:1" onclick="closeMobDetail();editE(event,'${entry.id}')"><i class="fas fa-edit"></i> Bearbeiten</button>
    <button class="btn" style="color:var(--red);border-color:var(--red)" onclick="closeMobDetail();delE(event,'${entry.id}')"><i class="fas fa-trash"></i> Löschen</button>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeMobDetail(){
  const modal=document.getElementById('mob-detail-modal');
  if(modal)modal.classList.add('hidden');
  document.body.style.overflow='';
}
// Закрытие по клику на overlay
document.addEventListener('click',function(e){
  const modal=document.getElementById('mob-detail-modal');
  if(modal&&!modal.classList.contains('hidden')&&e.target===modal){closeMobDetail();}
});

// ── MOBILE BOTTOM NAV ─────────────────────────────────────────
// Таббары которые соответствуют разделам
const MOB_TAB_MAP = {
  dashboard: 'mobt-dashboard',
  eintraege: 'mobt-eintraege',
  neu:       'mobt-neu',
  bericht:   'mobt-bericht',
};

function mobNav(page, tabEl) {
  // Используем общую nav() функцию
  const sidebarEl = document.querySelector('.nav-item[onclick*="' + page + '"]');
  if (sidebarEl) nav(page, sidebarEl);
  else { // если нет — просто переключаем страницу напрямую
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pg=document.getElementById('p-'+page);
    if(pg) pg.classList.add('active');
  }
  // Обновляем активный таб
  document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
  if(tabEl) tabEl.classList.add('active');
}

function mobNavDrawer(page) {
  closeMobDrawer();
  const sidebarEl = document.querySelector('.nav-item[onclick*="' + page + '"]');
  if (sidebarEl) nav(page, sidebarEl);
  // Снимаем активность с табов (раздел не в нижней панели)
  document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
}

function openMobDrawer() {
  document.getElementById('mob-drawer').classList.add('open');
  document.getElementById('mob-drawer-overlay').classList.add('open');
}
function closeMobDrawer() {
  document.getElementById('mob-drawer').classList.remove('open');
  document.getElementById('mob-drawer-overlay').classList.remove('open');
}

// Синхронизируем мобильные табы с desktop nav()
// Патчим оригинальную функцию nav после её загрузки
(function syncMobTabs(){
  const origNav = window.nav;
  window.nav = function(page, el) {
    if(origNav) origNav(page, el);
    // Синхронизируем мобильные табы
    const tabId = MOB_TAB_MAP[page];
    if(tabId) {
      document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
      const t=document.getElementById(tabId);
      if(t) t.classList.add('active');
    }
  };
})();

// ═══════════════════════════════════════════════════════════════
// CRM — KUNDENVERWALTUNG
// ═══════════════════════════════════════════════════════════════
let editKundeId = null;

function renderKunden(){
  const kunden = data.kunden||[];
  const q = (document.getElementById('kunden-search')||{value:''}).value.toLowerCase();
  const filtered = q ? kunden.filter(k=>(k.name||'').toLowerCase().includes(q)||(k.email||'').toLowerCase().includes(q)) : kunden;

  // Cards

  document.getElementById('kunden-cards').innerHTML=`
    <div class="sc b" style="cursor:default"><div class="sc-lbl">Kunden gesamt</div><div class="sc-val">${kunden.length}</div><div class="sc-sub">in der Datenbank</div></div>
`;

  const tb = document.getElementById('kunden-tbody');
  const em = document.getElementById('kunden-empty');
  if(!filtered.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const mob = isMob();
  tb.innerHTML = filtered.map(k=>{
    return `<tr>
      <td>
        <div style="font-weight:600;font-size:13px">${k.name||'—'}</div>
        ${k.ansprechpartner?`<div style="font-size:11px;color:var(--sub)">${k.ansprechpartner}</div>`:''}
      </td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.email||'—'}</td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.tel||'—'}</td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.plz?k.plz+' ':''} ${k.ort||''}</td>
      <td style="white-space:nowrap">
        <button class="del-btn edit-btn" style="opacity:1" onclick="editKunde('${k.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
        <button class="del-btn edit-btn" style="opacity:1;color:var(--blue)" onclick="neueRechnungFuerKunde('${k.id}')" title="Rechnungen anzeigen"><i class="fas fa-file-invoice"></i></button>
        <button class="del-btn" style="opacity:1" onclick="delKunde('${k.id}')" title="Löschen">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function getKundeUmsatz(id){
  return (data.rechnungen||[]).filter(r=>r.kundeId===id).reduce((s,r)=>s+r.betrag,0);
}

function openKundeModal(){
  editKundeId=null;
  ['km-name','km-ansprechpartner','km-email','km-tel','km-strasse','km-plz','km-ort','km-iban','km-ustid','km-notiz'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  openModal('kunde-modal');
}

function editKunde(id){
  const k=(data.kunden||[]).find(x=>x.id===id);
  if(!k)return;
  editKundeId=id;
  document.getElementById('km-name').value=k.name||'';
  document.getElementById('km-ansprechpartner').value=k.ansprechpartner||'';
  document.getElementById('km-email').value=k.email||'';
  document.getElementById('km-tel').value=k.tel||'';
  document.getElementById('km-strasse').value=k.strasse||'';
  document.getElementById('km-plz').value=k.plz||'';
  document.getElementById('km-ort').value=k.ort||'';
  document.getElementById('km-iban').value=k.iban||'';
  document.getElementById('km-ustid').value=k.ustid||'';
  document.getElementById('km-notiz').value=k.notiz||'';
  openModal('kunde-modal');
}

function saveKunde(){
  const name=document.getElementById('km-name').value.trim();
  if(!name)return toast('Name / Firma ist Pflichtfeld!','err');
  if(!data.kunden)data.kunden=[];
  const obj={
    name,
    ansprechpartner:document.getElementById('km-ansprechpartner').value.trim(),
    email:document.getElementById('km-email').value.trim(),
    tel:document.getElementById('km-tel').value.trim(),
    strasse:document.getElementById('km-strasse').value.trim(),
    plz:document.getElementById('km-plz').value.trim(),
    ort:document.getElementById('km-ort').value.trim(),
    iban:document.getElementById('km-iban').value.trim(),
    ustid:document.getElementById('km-ustid').value.trim(),
    notiz:document.getElementById('km-notiz').value.trim(),
  };
  if(editKundeId){
    const k=data.kunden.find(x=>x.id===editKundeId);
    if(k){ Object.assign(k,obj); sbSaveKunde(k); }
    editKundeId=null;
  } else {
    const newK={id:Date.now()+'', ...obj};
    data.kunden.push(newK);
    sbSaveKunde(newK);
  }
  renderKunden(); closeModal('kunde-modal');
  toast('✅ Kunde gespeichert!','ok');
}

function delKunde(id){
  if(!confirm('Kunde löschen?'))return;
  data.kunden=(data.kunden||[]).filter(k=>k.id!==id);
  sbDeleteKunde(id); renderKunden(); toast('Gelöscht','err');
}

// Выбор клиента в модале счёта
function openKundePick(){
  document.getElementById('kpick-search').value='';
  renderKundePick();
  openModal('kunde-pick-modal');
}
function renderKundePick(){
  const q=(document.getElementById('kpick-search').value||'').toLowerCase();
  const kunden=(data.kunden||[]).filter(k=>!q||k.name.toLowerCase().includes(q)||(k.email||'').toLowerCase().includes(q));
  const el=document.getElementById('kpick-list');
  if(!kunden.length){el.innerHTML='<p style="text-align:center;padding:20px;color:var(--sub)">Keine Kunden gefunden</p>';return;}
  el.innerHTML=kunden.map(k=>`
    <div onclick="selectKunde('${k.id}')" style="padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;border-radius:var(--r)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600;font-size:13px">${k.name}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:2px">${[k.email,k.tel,k.plz&&k.ort?k.plz+' '+k.ort:''].filter(Boolean).join(' · ')}</div>
    </div>`).join('');
}
function selectKunde(id){
  const k=(data.kunden||[]).find(x=>x.id===id);
  if(!k)return;
  document.getElementById('rn-kunde').value=k.name;
  document.getElementById('rn-adresse').value=[k.strasse,k.plz&&k.ort?k.plz+' '+k.ort:''].filter(Boolean).join(', ');
  document.getElementById('rn-email').value=k.email||'';
  // Сохраняем ссылку на клиента
  document.getElementById('rn-nr').dataset.kundeId=k.id;
  closeModal('kunde-pick-modal');
  toast('✅ Kunde übernommen','ok');
}
// Текущий kundeId для модала "Счета клиента"
let _kundeRechId = null;

function neueRechnungFuerKunde(id){
  // Показываем список счетов клиента
  showKundeRechnungen(id);
}

function showKundeRechnungen(id) {
  _kundeRechId = id;
  const k = (data.kunden||[]).find(x=>x.id===id);
  if (!k) return;

  // Заголовок
  document.getElementById('kunde-rech-name').textContent = k.name + (k.email ? ' · ' + k.email : '');

  // Фильтруем счета по kundeId ИЛИ по имени клиента (для старых данных)
  const rechs = (data.rechnungen||[]).filter(r =>
    r.kundeId === id || r.kunde === k.name
  ).sort((a,b) => b.datum.localeCompare(a.datum));

  const tbody = document.getElementById('kunde-rech-tbody');
  const empty = document.getElementById('kunde-rech-empty');
  const wrap  = document.getElementById('kunde-rech-wrap');
  const total = document.getElementById('kunde-rech-total');

  if (!rechs.length) {
    empty.style.display = 'block';
    wrap.style.display  = 'none';
    total.textContent   = '';
  } else {
    empty.style.display = 'none';
    wrap.style.display  = '';
    const smap = {
      offen:        '<span class="rech-status rs-offen">🟡 Offen</span>',
      ueberfaellig: '<span class="rech-status rs-ueberfaellig">🔴 Überfällig</span>',
      bezahlt:      '<span class="rech-status rs-bezahlt">🟢 Bezahlt</span>',
    };
    tbody.innerHTML = rechs.map(r => `
      <tr style="cursor:pointer" onclick="openRechFromKunde('${r.id}')">
        <td style="font-family:var(--mono);font-size:11px;font-weight:600">${r.nr}</td>
        <td style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.beschreibung||'—'}</td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--sub)">${fd(r.datum)}</td>
        <td style="text-align:right;font-family:var(--mono);font-weight:600;font-size:12px">${fmt(r.betrag)}</td>
        <td style="text-align:center">${smap[r.status]||r.status}</td>
      </tr>`).join('');
    const gesamt = rechs.reduce((s,r)=>s+r.betrag,0);
    const bezahlt = rechs.filter(r=>r.status==='bezahlt').reduce((s,r)=>s+r.betrag,0);
    total.innerHTML = `${rechs.length} Rechnung${rechs.length!==1?'en':''} · Gesamt: <strong>${fmt(gesamt)}</strong> · Bezahlt: <strong style="color:var(--green)">${fmt(bezahlt)}</strong>`;
  }

  openModal('kunde-rech-modal');
}

function openRechFromKunde(id) {
  closeModal('kunde-rech-modal');
  // Переходим в раздел счетов и открываем счёт на редактирование
  const navEl = document.querySelector('.nav-item[onclick*="rechnungen"]');
  if (navEl) nav('rechnungen', navEl);
  setTimeout(() => editRech(id), 80);
}

function neueRechnungFuerKundeNow() {
  const id = _kundeRechId;
  closeModal('kunde-rech-modal');
  const navEl = document.querySelector('.nav-item[onclick*="rechnungen"]');
  if (navEl) nav('rechnungen', navEl);
  // Открываем пустой модал счёта и заполняем данные клиента
  setTimeout(() => {
    openRechModal();
    setTimeout(() => {
      const k = (data.kunden||[]).find(x=>x.id===id);
      if (!k) return;
      document.getElementById('rn-kunde').value  = k.name;
      document.getElementById('rn-adresse').value = [k.strasse, k.plz&&k.ort ? k.plz+' '+k.ort : ''].filter(Boolean).join(', ');
      document.getElementById('rn-email').value   = k.email||'';
      document.getElementById('rn-nr').dataset.kundeId = k.id;
    }, 60);
  }, 100);
}

// IBAN Validierung
function validateIBAN(input){
  const v=input.value.replace(/\s/g,'').toUpperCase();
  const ok=/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(v);
  input.style.borderColor=v.length>4?(ok?'var(--green)':'var(--red)'):'';
}
// PLZ Validierung
function validatePLZ(input){
  const ok=/^[0-9]{5}$/.test(input.value);
  input.style.borderColor=input.value.length>0?(ok?'var(--green)':'var(--red)'):'';
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION — jsPDF
// ═══════════════════════════════════════════════════════════════
async function generateRechnungPDF(r){
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const W=210, M=15;
  let y=0;

  // ── Цвета ──────────────────────────────────────────────────────
  const BLUE    = [0, 82, 204];
  const BLUEDARK= [0, 60, 160];
  const WHITE   = [255,255,255];
  const BLACK   = [28, 28, 30];
  const GRAY    = [99, 99, 102];
  const LGRAY   = [242,242,247];
  const BORDER  = [229,229,234];
  const BGMETA  = [250,250,250];

  // ── Данные фирмы ────────────────────────────────────────────────
  const f = typeof getFirmaData==='function' ? getFirmaData() : {};
  const firmaName   = f.name     || 'Meine Firma';
  const firmaStr    = f.strasse  || '';
  const firmaPlzOrt = [f.plz, f.ort].filter(Boolean).join(' ');
  const firmaTel    = f.tel      || '';
  const firmaEmail  = f.email    || '';
  const firmaIban   = f.iban     || '';
  const firmaBic    = f.bic      || '';
  const firmaStNr   = f.steuernummer || '';
  const firmaUstId  = f.ust_id   || '';
  const isKlein     = !r.mwstMode || r.mwstMode === '§19';

  // ── Хелперы ─────────────────────────────────────────────────────
  function txt(t, x, yy, opts={}){ doc.text(String(t||''), x, yy, opts); }
  function ln(x1,yy,x2,col=BORDER,lw=0.3){
    doc.setDrawColor(...col); doc.setLineWidth(lw); doc.line(x1,yy,x2,yy);
  }
  function rnd(x,yy,w,h,col,fill='F'){
    doc.setFillColor(...col); doc.roundedRect(x,yy,w,h,2,2,fill);
  }
  function rect(x,yy,w,h,col,fill='F'){
    doc.setFillColor(...col); doc.rect(x,yy,w,h,fill);
  }

  // ════════════════════════════════════════════════════════════════
  // HEADER — логотип слева, адрес справа
  // ════════════════════════════════════════════════════════════════
  y = 15;

  // Аватар (квадрат с закруглением)
  const initials = firmaName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  rnd(M, y-5, 16, 16, BLUE);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7);
  txt(initials, M+8, y+4.5, {align:'center'});

  // Название фирмы
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  txt(firmaName, M+20, y+3);

  // Подзаголовок фирмы
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  txt(firmaEmail || firmaStr, M+20, y+9);

  // Адрес справа
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const addrRight = [firmaStr, firmaPlzOrt, firmaTel ? 'Tel: '+firmaTel : '', firmaEmail].filter(Boolean);
  addrRight.forEach((l,i) => txt(l, W-M, y-2+i*5, {align:'right'}));

  y += 22;
  ln(M, y, W-M, BORDER, 0.4);
  y += 10;

  // ════════════════════════════════════════════════════════════════
  // АДРЕС СЕКЦИЯ — получатель слева, мета справа
  // ════════════════════════════════════════════════════════════════

  // Абсендер-строка
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const absLines = [firmaName, firmaStr, firmaPlzOrt].filter(Boolean).join(' · ');
  txt(absLines, M, y);
  ln(M, y+2, M+80, [200,200,200], 0.3);
  y += 8;

  // Получатель
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  txt(r.kunde||'—', M, y);
  y += 6;

  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  const addrLines = (r.adresse||'').split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  addrLines.forEach(l => { txt(l, M, y); y += 5; });

  // Мета-блок справа (карточка)
  const metaX = W - M - 60;
  const metaY = y - 6 - addrLines.length*5 - 6;
  rnd(metaX, metaY-2, 62, 36, BGMETA, 'F');
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(metaX, metaY-2, 62, 36, 2, 2, 'S');

  const metaRows = [
    ['Rechnungs-Nr.', r.nr||'—'],
    ['Datum',         fd(r.datum)],
    ['Kunden-Nr.',    r.kundeId ? 'KD-'+String(r.kundeId).slice(-5) : '—'],
    ['Fällig bis',    r.faellig ? fd(r.faellig) : '—'],
  ];
  metaRows.forEach(([lbl,val],i) => {
    const ry = metaY + 5 + i*7.5;
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    txt(lbl, metaX+3, ry);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    txt(val, metaX+61, ry, {align:'right'});
  });

  y = Math.max(y, metaY + 40);
  y += 8;

  // ════════════════════════════════════════════════════════════════
  // TITEL
  // ════════════════════════════════════════════════════════════════
  doc.setFont('helvetica','bold');
  doc.setFontSize(26);
  doc.setTextColor(...BLUE);
  txt('Rechnung', M, y);
  y += 8;

  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  txt('Sehr geehrte Damen und Herren, für unsere erbrachten Leistungen erlauben wir uns folgende Rechnung zu stellen:', M, y);
  y += 10;

  // ════════════════════════════════════════════════════════════════
  // POSITIONS-TABELLE
  // ════════════════════════════════════════════════════════════════
  const COL = {
    pos:    M,
    bez:    M+10,
    menge:  W-M-55,
    einzel: W-M-28,
    gesamt: W-M
  };
  const ROW_H = 9;

  // Шапка таблицы
  rect(M, y, W-2*M, ROW_H, BLUE);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica','bold');
  doc.setFontSize(8.5);
  txt('Pos.',         COL.pos+1,   y+6);
  txt('Leistung / Beschreibung', COL.bez, y+6);
  txt('Menge',        COL.menge,   y+6, {align:'right'});
  txt('Einzelpreis',  COL.einzel,  y+6, {align:'right'});
  txt('Gesamt',       COL.gesamt,  y+6, {align:'right'});
  y += ROW_H;

  // Строки позиций
  const pos = r.positionen && r.positionen.length
    ? r.positionen
    : [{bez: r.beschreibung||'Leistung', menge:1, einheit:'Stk.', preis: r.betrag, netto: r.betrag, mwstRate:0}];

  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  let totNetto = 0, totMwst = 0;

  pos.forEach((p, i) => {
    if(y > 230){ doc.addPage(); y = 20; }

    const netto   = p.netto !== undefined ? p.netto : (p.preis||0);
    const rate    = isKlein ? 0 : (p.mwstRate || p.rate || 0);
    const lineN   = r2((p.menge||1) * netto);
    const lineM   = r2(lineN * rate / 100);
    totNetto += lineN;
    totMwst  += lineM;

    const rowH2 = ROW_H;
    if(i%2===0){ rect(M, y, W-2*M, rowH2, LGRAY); }
    else { rect(M, y, W-2*M, rowH2, WHITE); }

    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    txt(String(i+1)+'.', COL.pos+1, y+6);

    doc.setTextColor(...BLACK);
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    const bezStr = doc.splitTextToSize(p.bez||p.beschreibung||'', 75)[0];
    txt(bezStr, COL.bez, y+6);

    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    txt(String(p.menge||1)+' '+(p.einheit||'Stk.'), COL.menge, y+6, {align:'right'});

    doc.setTextColor(...BLACK);
    txt(fmt(netto),  COL.einzel, y+6, {align:'right'});
    doc.setFont('helvetica','bold');
    txt(fmt(lineN),  COL.gesamt, y+6, {align:'right'});
    doc.setFont('helvetica','normal');

    ln(M, y+rowH2, W-M, BORDER, 0.2);
    y += rowH2;
  });

  y += 6;

  // ════════════════════════════════════════════════════════════════
  // НИЖНЯЯ СЕКЦИЯ: QR + ИТОГИ
  // ════════════════════════════════════════════════════════════════
  const totBrutto = r2(totNetto + totMwst);

  // QR-блок (слева) + итоги (справа) — как в шаблоне
  const qrSectionY = y;
  const qrW = 90, qrH = 32;

  // QR фон
  rnd(M, qrSectionY, qrW, qrH, LGRAY);

  // GiroCode QR
  const qrSize = 22;
  rnd(M+3, qrSectionY+5, qrSize, qrSize, WHITE);
  doc.setTextColor(...GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica','bold');
  txt('GiroCode', M+3+qrSize/2, qrSectionY+qrH-2, {align:'center'});

  // Текст по центру
  doc.setFont('helvetica','bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  txt('Schnell bezahlen', M+qrW/2, qrSectionY+10, {align:'center'});
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const qrText = doc.splitTextToSize('Scannen Sie den GiroCode mit Ihrer Banking-App. Alle Daten werden automatisch übernommen.', 42);
  qrText.forEach((l,i) => txt(l, M+qrW/2, qrSectionY+16+i*4, {align:'center'}));

  // PayPal QR справа в блоке
  rnd(M+qrW-qrSize-3, qrSectionY+5, qrSize, qrSize, WHITE);
  txt('PayPal', M+qrW-3-qrSize/2, qrSectionY+qrH-2, {align:'center'});

  // ── ИТОГИ справа ──
  const sumX = W - M - 68;
  const sumW = 68;

  // Zwischensumme
  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY);
  txt('Netto-Gesamt', sumX, qrSectionY+8);
  doc.setTextColor(...BLACK);
  txt(fmt(totNetto), W-M, qrSectionY+8, {align:'right'});

  if(!isKlein && totMwst > 0){
    doc.setTextColor(...GRAY);
    txt('MwSt 19%', sumX, qrSectionY+16);
    doc.setTextColor(...BLACK);
    txt(fmt(totMwst), W-M, qrSectionY+16, {align:'right'});
  }

  // Линия перед итогом
  ln(sumX, qrSectionY+20, W-M, BLACK, 0.5);

  // Gesamtbetrag — синяя плашка
  rnd(sumX-2, qrSectionY+22, sumW+2, 12, BLUE);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  txt('Gesamtbetrag', sumX+2, qrSectionY+30);
  doc.setFontSize(12);
  txt(fmt(totBrutto), W-M, qrSectionY+30, {align:'right'});

  y = qrSectionY + qrH + 10;

  // ════════════════════════════════════════════════════════════════
  // ABSCHLUSSTEXT
  // ════════════════════════════════════════════════════════════════
  doc.setFont('helvetica','bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  txt('Vielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit!', M, y);
  y += 6;

  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const zahlText = r.faellig
    ? `Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen (bis zum ${fd(r.faellig)}) ohne Abzug auf unser unten genanntes Konto.`
    : 'Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen ohne Abzug auf unser unten genanntes Konto.';
  const zahlLines = doc.splitTextToSize(zahlText, W-2*M);
  zahlLines.forEach(l => { txt(l, M, y); y += 5; });
  y += 4;

  // Notiz
  if(r.notiz){
    rnd(M, y, W-2*M, 2, LGRAY); // placeholder высота пересчитается
    doc.setFillColor(...LGRAY);
    const nLines = doc.splitTextToSize(r.notiz, W-2*M-10);
    doc.roundedRect(M, y, W-2*M, nLines.length*5+8, 2, 2, 'F');
    doc.setDrawColor(...[0,82,204]); doc.setLineWidth(0.8);
    doc.line(M, y, M, y + nLines.length*5+8);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...[0,60,160]);
    nLines.forEach((l,i) => txt(l, M+5, y+5+i*5));
    y += nLines.length*5+12;
  }

  // §19 Hinweis
  if(isKlein){
    doc.setFont('helvetica','italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    txt('Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmer).', M, y);
    y += 6;
  }

  // Steuer-Info
  if(firmaStNr || firmaUstId){
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const stLine = [firmaStNr?'Steuernummer: '+firmaStNr:'', firmaUstId?'USt-IdNr.: '+firmaUstId:''].filter(Boolean).join('  ·  ');
    txt(stLine, M, y);
    y += 6;
  }

  // ════════════════════════════════════════════════════════════════
  // FOOTER — 4 колонки
  // ════════════════════════════════════════════════════════════════
  const FY = 272;
  rect(0, FY, W, 25, LGRAY);
  ln(0, FY, W, BORDER, 0.4);

  const cols4 = [M, W*0.28, W*0.52, W*0.76];
  const labels4 = ['Absender','Bankverbindung','Kontakt','Steuerdaten'];
  const data4 = [
    [firmaName, firmaStr, firmaPlzOrt, 'Deutschland'].filter(Boolean),
    [firmaIban ? 'IBAN: '+firmaIban : '', firmaBic ? 'BIC: '+firmaBic : ''].filter(Boolean),
    [firmaTel ? 'Tel: '+firmaTel : '', firmaEmail].filter(Boolean),
    [firmaStNr ? 'StNr: '+firmaStNr : '', firmaUstId ? 'USt-ID: '+firmaUstId : ''].filter(Boolean),
  ];

  cols4.forEach((cx, ci) => {
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    txt(labels4[ci].toUpperCase(), cx, FY+6);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    data4[ci].forEach((l,li) => txt(l, cx, FY+11+li*4.5));
  });

  return doc;
}


// Скачать PDF
async function downloadRechnungPDF(r){
  toast('📄 PDF wird erstellt...','ok');
  try{
    const doc=await generateRechnungPDF(r);
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    toast('✅ PDF gespeichert!','ok');
  }catch(e){console.error(e);toast('Fehler beim PDF-Erstellen','err');}
}

// Email mit PDF
async function emailMitPDF(r){
  if(!r.email){toast('Keine E-Mail-Adresse vorhanden','err');return;}
  toast('📄 PDF wird erstellt...','ok');
  try{
    const doc=await generateRechnungPDF(r);
    // Скачиваем PDF
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    // Открываем почтовый клиент
    const subject=encodeURIComponent(`Rechnung Nr. ${r.nr} — Autowäsche Berg`);
    const body=encodeURIComponent(
`Sehr geehrte Damen und Herren,${r.kunde?'\n\nSehr geehrte/r '+r.kunde+',':''}

anbei erhalten Sie unsere Rechnung Nr. ${r.nr} über ${fmt(r.betrag)}.
${r.faellig?'\nZahlungsziel: '+fd(r.faellig):''}

Bitte hängen Sie die soeben heruntergeladene PDF-Datei an diese E-Mail an.

Mit freundlichen Grüßen
Autowäsche Berg
Tel: +49 (0) 6241 000000
info@autowaesche-berg.de`);
    setTimeout(()=>window.open(`mailto:${r.email}?subject=${subject}&body=${body}`),500);
    toast('✅ PDF gespeichert · E-Mail wird geöffnet','ok');
  }catch(e){console.error(e);toast('Fehler: '+e.message,'err');}
}


// ═══════════════════════════════════════════════════════════════
// UMSATZSTEUER — НДС УЧЁТ
// ═══════════════════════════════════════════════════════════════

let _ustSaving = false;
function saveUstMode(){
  if(_ustSaving) return;
  const sel = document.querySelector('input[name="ust-mode"]:checked');
  if(!sel) return;
  const yr = document.getElementById('ust-yr')?.value || new Date().getFullYear()+'';
  if(!data.ustModeByYear) data.ustModeByYear={};
  data.ustModeByYear[yr] = sel.value;
  sbSaveUstMode(yr, sel.value);
  _ustSaving = true;
  updateMwstFormVisibility();
  renderUst();
  _ustSaving = false;
  toast(sel.value==='§19'
    ? `✅ ${yr}: §19 Kleinunternehmer gesetzt`
    : `📊 ${yr}: MwSt gesetzt`, 'ok');
}




function getUstMode(yr){
  if(!yr){ const el=document.getElementById('ust-yr'); yr=el?el.value:new Date().getFullYear()+''; }
  return getUstModeForYear(yr);
}

function renderUst(){
  if(!data.ustEintraege) data.ustEintraege = [];

  // ── Список лет ────────────────────────────────────────────────────────────
  const years = [...new Set([
    ...data.eintraege.map(e=>e.datum.substring(0,4)),
    ...data.ustEintraege.map(e=>e.datum.substring(0,4)),
    new Date().getFullYear()+''
  ])].sort().reverse();

  const yrSel = document.getElementById('ust-yr');
  if(yrSel){
    const cur = yrSel.value || years[0];
    yrSel.innerHTML = years.map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
  }
  const yr = yrSel ? yrSel.value : years[0];

  // ── Обзор всех лет — строка бейджей ──────────────────────────────────────
  const overviewEl = document.getElementById('ust-years-overview');
  if(overviewEl){
    overviewEl.innerHTML = years.map(y=>{
      const m = getUstModeForYear(y);
      const isK = m==='§19';
      const active = y===yr;
      const einY = activeEintraege().filter(e=>e.datum.startsWith(y)&&e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
      return `<div onclick="document.getElementById('ust-yr').value='${y}';renderUst()"
        style="cursor:pointer;padding:12px 18px;border-radius:var(--r);border:2px solid ${active?(isK?'var(--green)':'var(--blue)'):'var(--border)'};
        background:${active?(isK?'rgba(34,197,94,.08)':'rgba(59,130,246,.08)'):'var(--s2)'};
        min-width:130px;transition:all .15s">
        <div style="font-size:18px;font-weight:800;color:var(--text)">${y}</div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;
            background:${isK?'rgba(34,197,94,.15)':'rgba(59,130,246,.15)'};
            color:${isK?'var(--green)':'var(--blue)'}">
            ${isK?'§19':'MwSt'}
          </span>
        </div>
        <div style="font-size:12px;color:var(--sub);margin-top:4px;font-family:var(--mono)">${fmt(einY)}</div>
      </div>`;
    }).join('');
  }

  // ── Режим для выбранного года ─────────────────────────────────────────────
  const mode = getUstModeForYear(yr);
  const isRegel = mode !== '§19';

  // Set radio without triggering onclick (use _ustSaving guard)
  _ustSaving = true;
  const modeEl = document.querySelector('input[name="ust-mode"][value="'+mode+'"]');
  if(modeEl) modeEl.checked = true;
  _ustSaving = false;

  const yrLabel = document.getElementById('ust-mode-yr-label');
  if(yrLabel) yrLabel.textContent = yr;

  const lblK = document.getElementById('ust-lbl-klein');
  const lblR = document.getElementById('ust-lbl-regel');
  if(lblK && lblR){
    if(isRegel){
      lblR.style.borderColor='var(--blue)'; lblR.style.background='rgba(59,130,246,.07)';
      lblK.style.borderColor='transparent'; lblK.style.background='transparent';
    } else {
      lblK.style.borderColor='var(--green)'; lblK.style.background='rgba(34,197,94,.07)';
      lblR.style.borderColor='transparent'; lblR.style.background='transparent';
    }
  }

  const hint = document.getElementById('ust-mode-hint');
  if(hint) hint.innerHTML = isRegel
    ? '<span style="color:var(--blue);font-size:12px">📊 USt 19%/7% wird auf Einnahmen erhoben. Vorsteuer aus Ausgaben wird gegengerechnet. Monatliche oder quartalsweise Voranmeldung beim Finanzamt erforderlich.</span>'
    : '<span style="color:var(--green);font-size:12px">✅ Keine Umsatzsteuer auf Rechnungen. Keine Voranmeldung nötig. Hinweis auf §19 UStG in jede Rechnung aufnehmen.</span>';

  // ── Показываем нужный контент ─────────────────────────────────────────────
  const kleinInfo  = document.getElementById('ust-klein-info');
  const regelCards = document.getElementById('ust-cards');
  const quartalSec = document.getElementById('ust-quartal-section');
  const buchSec    = document.getElementById('ust-buchungen-section');

  if(kleinInfo) kleinInfo.style.display = isRegel ? 'none' : '';
  if(regelCards) regelCards.style.display = isRegel ? 'grid' : 'none';
  if(quartalSec) quartalSec.style.display = isRegel ? (isMob()?'none':'') : 'none';
  if(buchSec)    buchSec.style.display    = isRegel ? '' : 'none';
  const addSec = document.getElementById('ust-add-section');
  if(addSec) addSec.style.display = isRegel ? '' : 'none';

  // ── §19 — показываем статистику Einnahmen ─────────────────────────────────
  if(!isRegel){
    const kleinStats = document.getElementById('ust-klein-stats');
    if(kleinStats){
      const einY  = activeEintraege().filter(e=>e.datum.startsWith(yr)&&e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
      const ausY  = activeEintraege().filter(e=>e.datum.startsWith(yr)&&e.typ==='Ausgabe').reduce((s,e)=>s+e.betrag,0);
      const limit = 22000;
      const pct   = Math.min(100, Math.round(einY/limit*100));
      const over  = einY > limit;
      kleinStats.innerHTML = `
        <div>
          <div style="font-size:11px;color:var(--sub)">Einnahmen ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--mono)">${fmt(einY)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--sub)">Ausgaben ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--mono)">${fmt(ausY)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--sub)">Gewinn ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--green);font-family:var(--mono)">${fmt(einY-ausY)}</div>
        </div>
        <div style="flex:1;min-width:160px">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px">KU-Grenze (22.000 €)</div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:8px;border-radius:4px;width:${pct}%;background:${over?'var(--red)':'var(--green)'};transition:width .4s"></div>
          </div>
          <div style="font-size:11px;margin-top:4px;color:${over?'var(--red)':'var(--sub)'}">
            ${pct}% genutzt ${over?'⚠️ Grenze überschritten!':''}
          </div>
        </div>`;
    }
    return;
  }



  // ── Regelbesteuerung: собираем все операции ───────────────────────────────
  const rechMwst = (data.rechnungen||[])
    .filter(r => r.datum && r.datum.startsWith(yr) && r.mwstMode==='regel' && r.mwstBetrag > 0)
    .map(r => ({
      id:'r_'+r.id, datum:r.datum,
      beschreibung:'Rechnung '+r.nr+(r.kunde?' — '+r.kunde:''),
      typ:'ust',
      netto: r2(r.netto || (r.betrag-(r.mwstBetrag||0))),
      rate: r.mwstRate||19, mwstBetrag:r.mwstBetrag,
      brutto:r.betrag, quelle:'Rechnung'
    }));

  // Все записи года — если MwSt не сохранён явно, считаем из betrag по 19%
  const eintrMwst = activeEintraege()
    .filter(e => e.datum.startsWith(yr))
    .map(e => {
      const isEin = e.typ==='Einnahme';
      // Если поля MwSt уже есть — берём их, иначе считаем из betrag
      const rate    = e.mwstRate || e.vorsteuerRate || 19;
      const hasSaved = isEin ? (e.mwstBetrag > 0) : (e.vorsteuerBet > 0);
      let mwstBetrag, netto;
      if(hasSaved){
        mwstBetrag = isEin ? e.mwstBetrag : e.vorsteuerBet;
        netto      = r2(e.nettoBetrag || (e.betrag - mwstBetrag));
      } else {
        // betrag = Brutto → считаем MwSt обратным методом
        mwstBetrag = r2(e.betrag * rate / (100 + rate));
        netto      = r2(e.betrag - mwstBetrag);
      }
      return {
        id:'e_'+e.id, datum:e.datum,
        beschreibung: e.beschreibung||e.kategorie,
        typ: isEin ? 'ust' : 'vorsteuer',
        netto, rate, mwstBetrag,
        brutto: e.betrag, quelle:'Eintrag'
      };
    });

  // устаревшие ручные записи — только те которых нет в eintrMwst
  const eintrIds = new Set(eintrMwst.map(x=>x.id));
  const manualMwst = (data.ustEintraege||[])
    .filter(e => e.datum && e.datum.startsWith(yr))
    .filter(e => {
      const derivedId = 'e_'+(e.id||'').replace(/_ust$|_vs$/,'');
      return !eintrIds.has(derivedId) && !eintrIds.has('e_'+e.id);
    })
    .map(e => ({
      id:e.id, datum:e.datum,
      beschreibung:e.beschreibung||'—',
      typ:e.typ,
      netto: e.typ==='vorsteuer' ? r2(e.netto||0) : r2((e.netto||0) || (e.betrag/(1+(e.rate||19)/100))),
      rate: e.rate||19,
      mwstBetrag: r2(parseFloat(e.betrag)||0),
      brutto: e.typ==='vorsteuer' ? r2((e.netto||0)+(parseFloat(e.betrag)||0)) : r2(parseFloat(e.betrag)||0),
      quelle:'Manual'
    }));

  const allMwst = [...rechMwst,...eintrMwst,...manualMwst]
    .sort((a,b)=>a.datum.localeCompare(b.datum));

  const totUst  = r2(allMwst.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.mwstBetrag,0));
  const totVorst= r2(allMwst.filter(e=>e.typ==='vorsteuer').reduce((s,e)=>s+e.mwstBetrag,0));
  const totZahl = r2(totUst-totVorst);
  const totNetto= r2(allMwst.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.netto,0));

  // ── Карточки 2x2 ──────────────────────────────────────────────────────────
  if(regelCards){
    regelCards.style.cssText = 'display:grid!important;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px';
    regelCards.innerHTML = `
    <div class="sc b" style="cursor:default">
      <div class="sc-lbl">Доходы нетто</div>
      <div class="sc-val">${fmt(totNetto)}</div>
      <div class="sc-sub">ohne USt ${yr}</div>
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">USt-Ausgang</div>
      <div class="sc-val" style="color:var(--red)">${fmt(totUst)}</div>
      <div class="sc-sub">schulde ich dem FA</div>
    </div>
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Входящий НДС</div>
      <div class="sc-val" style="color:var(--green)">${fmt(totVorst)}</div>
      <div class="sc-sub">erhalte ich vom FA</div>
    </div>
    <div class="sc ${totZahl>0?'r':'g'}" style="cursor:default">
      <div class="sc-lbl">Налоговое бремя</div>
      <div class="sc-val" style="color:${totZahl>0?'var(--red)':'var(--green)'}">
        ${totZahl>0?'+':''}${fmt(totZahl)}
      </div>
      <div class="sc-sub">${totZahl>0?'zahlen ans FA':'Erstattung vom FA'}</div>
    </div>`;
  }

  // ── Квартальная сводка ─────────────────────────────────────────────────────
  const qtbody = document.getElementById('ust-quartal-tbody');
  const qtfoot = document.getElementById('ust-quartal-tfoot');
  if(qtbody){
    const quarters = [1,2,3,4].map(q=>{
      const ms = [(q-1)*3+1,(q-1)*3+2,(q-1)*3+3];
      const qE = allMwst.filter(e=>ms.includes(parseInt(e.datum.substring(5,7))));
      const ust  = r2(qE.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.mwstBetrag,0));
      const vst  = r2(qE.filter(e=>e.typ==='vorsteuer').reduce((s,e)=>s+e.mwstBetrag,0));
      const netto= r2(qE.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.netto,0));
      const zl   = r2(ust-vst);
      return {q,ust,vst,netto,zl,any:ust>0||vst>0};
    });
    qtbody.innerHTML = quarters.map(q=>`
      <tr style="${!q.any?'opacity:.35':''}">
        <td><strong>Q${q.q} ${yr}</strong></td>
        <td style="text-align:right;font-family:var(--mono)">${q.netto>0?fmt(q.netto):'—'}</td>
        <td style="padding-right:10px;text-align:right;font-family:var(--mono);color:var(--red)">${q.ust>0?'+'+fmt(q.ust):'—'}</td>
        <td style="padding-right:10px;text-align:right;font-family:var(--mono);color:var(--green)">${q.vst>0?'-'+fmt(q.vst):'—'}</td>
        <td style="text-align:right;font-family:var(--mono);font-weight:700;color:${q.zl>0?'var(--red)':'var(--green)'}">
          ${q.any?(q.zl>0?'+':'')+fmt(q.zl):'—'}
        </td>
      </tr>`).join('');
    if(qtfoot) qtfoot.innerHTML = `<tr style="background:var(--s2);font-weight:700">
      <td style="padding:8px 20px">Gesamt ${yr}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmt(totNetto)}</td>
      <td style="padding-right:10px;text-align:right;font-family:var(--mono);color:var(--red)">${totUst>0?'+'+fmt(totUst):'—'}</td>
      <td style="padding-right:10px;text-align:right;font-family:var(--mono);color:var(--green)">${totVorst>0?'-'+fmt(totVorst):'—'}</td>
      <td style="text-align:right;font-family:var(--mono);font-weight:800;color:${totZahl>0?'var(--red)':'var(--green)'}">
        ${totZahl>0?'+':''}${fmt(totZahl)}
      </td>
    </tr>`;
  }

  // ── Таблица операций с пагинацией (20 строк) ─────────────────────────────
  const dtbody = document.getElementById('ust-detail-tbody');
  const tfoot  = document.getElementById('ust-tfoot');
  const empty  = document.getElementById('ust-empty');
  const PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(allMwst.length / PER_PAGE));
  if(ustPage > totalPages) ustPage = totalPages;
  if(ustPage < 1) ustPage = 1;

  if(!allMwst.length){
    if(dtbody) dtbody.innerHTML='';
    if(tfoot)  tfoot.innerHTML='';
    if(empty)  empty.style.display='';
  } else {
    if(empty) empty.style.display='none';
    const pageItems = allMwst.slice((ustPage-1)*PER_PAGE, ustPage*PER_PAGE);
    if(dtbody){
      let lastQ=0;
      dtbody.innerHTML = pageItems.map(e=>{
        const m=parseInt(e.datum.substring(5,7));
        const q=Math.ceil(m/3);
        let sep='';
        if(q!==lastQ){
          lastQ=q;
          sep=`<tr style="background:var(--s2)">
            <td colspan="7" style="font-size:11px;font-weight:700;color:var(--sub);padding:5px 20px;text-transform:uppercase;letter-spacing:.5px">Q${q} ${yr}</td>
          </tr>`;
        }
        const isUst=e.typ==='ust', canDel=e.quelle==='Manual';
        // Дата: 26.03.26 вместо 26.03.2026
        const shortDat = e.datum.substring(8,10)+'.'+e.datum.substring(5,7)+'.'+e.datum.substring(2,4);
        return sep+`<tr>
          <td style="font-size:12px;color:var(--sub);font-family:var(--mono);white-space:nowrap">${shortDat}</td>
          <td class="mob-hide" style="text-align:center">
            <span class="badge ${isUst?'b-aus':'b-ein'}" style="font-size:10px">${isUst?'🟠 USt':'🔵 Vorst.'}</span>
          </td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--sub)">${e.netto>0?fmt(e.netto):'—'}</td>
          <td style="text-align:right;font-size:11px;color:var(--sub)">${e.rate}%</td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:${isUst?'var(--red)':'var(--green)'}">${isUst?'+':'-'}${fmt(e.mwstBetrag)}</td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px">${e.brutto>0?fmt(e.brutto):'—'}</td>
          <td class="mob-hide">${canDel?`<button class="del-btn" onclick="delUstEintrag('${e.id}')">✕</button>`:''}</td>
        </tr>`;
      }).join('');
    }
    if(tfoot){
      const from=(ustPage-1)*PER_PAGE+1, to=Math.min(ustPage*PER_PAGE,allMwst.length);
      const pager = totalPages>1 ? `<tr><td colspan="7" style="padding:8px 12px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage=1;renderUst()" ${ustPage===1?'disabled':''}>«</button>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage--;renderUst()" ${ustPage===1?'disabled':''}>‹</button>
          <span style="font-size:12px;color:var(--sub)">Seite ${ustPage} / ${totalPages} &nbsp;(${from}–${to} von ${allMwst.length})</span>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage++;renderUst()" ${ustPage===totalPages?'disabled':''}>›</button>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage=${totalPages};renderUst()" ${ustPage===totalPages?'disabled':''}>»</button>
        </div>
      </td></tr>` : '';
      tfoot.innerHTML=`<tr style="background:var(--s2);font-weight:700">
        <td colspan="4" style="padding:8px 20px">Gesamt ${yr}</td>
        <td style="padding-right:10px;text-align:right;font-family:var(--mono);color:${totZahl>0?'var(--red)':'var(--green)'}">
          ${totZahl>0?'+':''}${fmt(totZahl)}
        </td>
        <td colspan="2"></td>
      </tr>${pager}`;
    }
  }
}
function addUstEintrag(){
  const datum = document.getElementById('ust-new-dat').value;
  const typ   = document.getElementById('ust-new-typ').value;
  const bet   = parseFloat(document.getElementById('ust-new-bet').value);
  const rate  = parseFloat(document.getElementById('ust-new-rate').value)||0;
  const dsc   = document.getElementById('ust-new-dsc').value.trim();
  if(!datum) return toast('Datum eingeben!','err');
  if(!bet||bet<=0) return toast('Betrag eingeben!','err');
  if(!data.ustEintraege) data.ustEintraege=[];
  const entry = { id: Date.now()+'', datum, typ, betrag: bet, rate, beschreibung: dsc };
  data.ustEintraege.push(entry);
  sbSaveUstEintrag(entry);
  renderUst();
  document.getElementById('ust-new-bet').value='';
  document.getElementById('ust-new-dsc').value='';
  toast('✅ USt-Eintrag gespeichert','ok');
}

function delUstEintrag(id){
  if(!confirm('Eintrag löschen?')) return;
  data.ustEintraege = (data.ustEintraege||[]).filter(e=>e.id!==id);
  sbDeleteUstEintrag(id);
  renderUst();
  toast('Gelöscht','err');
}
