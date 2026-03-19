// ── HELPERS ───────────────────────────────────────────────────────────────
function fmt(n){const v=parseFloat(n);return(isNaN(v)?0:v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function fd(d){if(!d)return'';const p=d.split('-');if(p.length<3)return d;const[y,m,dd]=p;return`${dd}.${m}.${y}`}
// Мобильная дата: DD.MM.YY (год 2 цифры)
function fdm(d){if(!d)return'';const p=d.split('-');if(p.length<3)return d;const[y,m,dd]=p;return`${dd}.${m}.${y.slice(2)}`}
// Дата + время из ISO строки (created_at)
function fdt(iso){
  if(!iso)return'';
  try{
    const d=new Date(iso);
    if(isNaN(d.getTime()))return'';
    const dd=String(d.getDate()).padStart(2,'0');
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const yy=String(d.getFullYear());
    const hh=String(d.getHours()).padStart(2,'0');
    const mn=String(d.getMinutes()).padStart(2,'0');
    return`${dd}.${mm}.${yy} ${hh}:${mn}`;
  }catch{return'';}
}
function isMob(){return window.innerWidth<=768}
function sum(arr,t){return arr.filter(e=>e.typ===t).reduce((s,e)=>s+(parseFloat(e.betrag)||0),0)}

// ── USt-Modus (нужен dashboard.js и другим модулям) ──────────────────────
function getUstModeForYear(yr){
  if(!yr) yr = new Date().getFullYear()+'';
  return (typeof data !== 'undefined' && data.ustModeByYear ? data.ustModeByYear[yr] : null) || '§19';
}
function isKleinunternehmer(yr){ return getUstModeForYear(yr)==='§19'; }

function g(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function dl(csv,name){const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()}
function toast(msg,type='ok',onClick=null){
  const t=document.getElementById('toast');
  if(!t) return;
  if(t._toastTimer) clearTimeout(t._toastTimer);
  if(t._toastFadeTimer) clearTimeout(t._toastFadeTimer);
  // Сбрасываем старый обработчик клика
  t.onclick = null;
  if(onClick){
    t.classList.add('clickable');
    t.onclick = ()=>{ onClick(); t.classList.remove('show'); clearTimeout(t._toastTimer); };
  } else {
    t.classList.remove('clickable');
  }
  // Убираем HTML-теги (<i class="fas...">, <span> и т.д.)
  let clean = msg.replace(/<[^>]*>/g, '');
  // Убираем иконки-символы в начале строки: ✓ ✗ ↩️ ⚡ и пробелы после них
  clean = clean.replace(/^[\u2713\u2717\u21A9\u26A1\uFE0F\s✓✗↩️⚡]+\s*/u, '');
  // Убираем лишние пробелы
  clean = clean.trim();
  t.textContent = clean;
  t.className=`toast ${type}${onClick?' clickable':''}`;
  void t.offsetWidth;
  t.classList.add('show');
  t._toastTimer=setTimeout(()=>{
    t.classList.remove('show');
    t._toastFadeTimer=setTimeout(()=>{ t.className='toast'; },300);
  },5000);
}

// ── МОБИЛЬНЫЙ DETAIL POPUP ─────────────────────────────────────────────────
function showMobDetail(entry){
  const modal=document.getElementById('mob-detail-modal');
  if(!modal)return;
  const isEin=entry.typ==='Einnahme';
  document.getElementById('mdm-title').innerHTML=`<span class="badge ${isEin?'b-ein':'b-aus'}">${isEin?'<i class="fas fa-arrow-up" style="color:var(--green)"></i> Einnahme':'<i class="fas fa-arrow-down" style="color:var(--red)"></i> Ausgabe'}</span>`;
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
    <button class="btn" style="color:var(--red);border-color:var(--red)" onclick="closeMobDetail();delE(event,'${entry.id}')"> Löschen</button>
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
  dashboard:  'mobt-dashboard',
  eintraege:  'mobt-eintraege',
  neu:        'mobt-neu',
  rechnungen: 'mobt-rechnungen',
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

function toggleMobGroup(headerEl) {
  const group = headerEl.closest('.mob-drawer-group');
  if (!group) return;
  const isOpen = group.classList.contains('open');
  // Закрываем все группы
  document.querySelectorAll('.mob-drawer-group').forEach(g => g.classList.remove('open'));
  // Открываем кликнутую только если она была закрыта
  if (!isOpen) group.classList.add('open');
}

function mobNavDrawer(page) {
  closeMobDrawer();
  // Подсвечиваем активный child
  document.querySelectorAll('.mob-drawer-child').forEach(el => el.classList.remove('active'));
  const sidebarEl = document.querySelector('.nav-item[onclick*="' + page + '"]');
  if (sidebarEl) nav(page, sidebarEl);
  else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('p-' + page);
    if (pg) pg.classList.add('active');
  }
  // Снимаем активность с табов
  document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
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

let kundenSort='name', kundenSortAsc=true, kundenPage=1;
const KUNDEN_PER_PAGE=10;

function sortKunden(col){
  if(kundenSort===col) kundenSortAsc=!kundenSortAsc; else{kundenSort=col;kundenSortAsc=true;}
  kundenPage=1;
  renderKunden();
}
function _updateKundenSortBtns(){
  [['name','Name'],['ort','Ort'],['umsatz','Umsatz']].forEach(([col,lbl])=>{
    document.querySelectorAll(`#p-kunden button[onclick*="sortKunden('${col}')"]`).forEach(btn=>{
      const active=kundenSort===col;
      btn.classList.toggle('active', active);
      btn.innerHTML=lbl+'<span class="sort-arrow">'+(active?(kundenSortAsc?' ↑':' ↓'):'&nbsp;')+'</span>';
    });
  });
}
function renderKunden(){
  const kunden = data.kunden||[];
  const q = (document.getElementById('kunden-search')||{value:''}).value.toLowerCase();
  const filtered = q ? kunden.filter(k=>
    (k.name||'').toLowerCase().includes(q)||
    (k.email||'').toLowerCase().includes(q)||
    (k.ort||'').toLowerCase().includes(q)
  ) : kunden;

  const totalUmsatz  = kunden.reduce((s,k)=>s+getKundeUmsatz(k.id),0);
  const mitRechnung  = kunden.filter(k=>(data.rechnungen||[]).some(r=>r.kundeId===k.id)).length;
  const offeneRech   = (data.rechnungen||[]).filter(r=>r.status==='offen'||r.status==='ueberfaellig').length;

  document.getElementById('kunden-cards').innerHTML=`
    <div class="sc b" style="cursor:default"><div class="sc-lbl">Kunden gesamt</div><div class="sc-val">${kunden.length}</div><div class="sc-sub">${mitRechnung} mit Rechnungen</div></div>
    <div class="sc g" style="cursor:default"><div class="sc-lbl">Gesamtumsatz</div><div class="sc-val">${fmt(totalUmsatz)}</div><div class="sc-sub">alle Rechnungen</div></div>
    <div class="sc y" style="cursor:default"><div class="sc-lbl">Offene Rechnungen</div><div class="sc-val">${offeneRech}</div><div class="sc-sub">offen + überfällig</div></div>
  `;

  const container = document.getElementById('kunden-list');
  const em = document.getElementById('kunden-empty');
  if(!filtered.length){
    if(container) container.innerHTML='';
    em.style.display='block';
    return;
  }
  em.style.display='none';

  const cards = filtered.map(k=>{
    const umsatz = getKundeUmsatz(k.id);
    const rechCount = (data.rechnungen||[]).filter(r=>r.kundeId===k.id).length;
    const initials = (k.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const hasContact = k.email || k.tel;
    const _kSelMode = window._selectMode && window._selectMode['kunden'];
    const _kCb = _kSelMode ? _selCb('kunden', k.id) : '';
    const _kClick = _kSelMode ? '' : `onclick="showKundeRechnungen('${k.id}')"`;
    return `<div class="kunde-card" ${_kClick} style="cursor:${_kSelMode?'default':'pointer'}">
      <div class="kunde-card-avatar">${initials}</div>
      <div class="kunde-card-body">
        <div class="kunde-card-name">${k.name||'—'}</div>
        ${k.ansprechpartner?`<div class="kunde-card-role">${k.ansprechpartner}</div>`:''}
        <div class="kunde-card-meta">
          ${k.email?`<a href="mailto:${k.email}" onclick="event.stopPropagation()" class="kunde-meta-link"><i class="fas fa-envelope"></i> ${k.email}</a>`:''}
          ${k.tel?`<span class="kunde-meta-item"><i class="fas fa-phone"></i> ${k.tel}</span>`:''}
          ${k.ort?`<span class="kunde-meta-item"><i class="fas fa-map-marker-alt"></i> ${k.plz?k.plz+' ':''}${k.ort}</span>`:''}
        </div>
        <div class="sel-cb-row">${_selCb('kunden', k.id)}</div>
      </div>
      <div class="kunde-card-right">
        ${umsatz>0?`<div class="kunde-umsatz">${fmt(umsatz)}</div><div class="kunde-rech-cnt">${rechCount} Rechnung${rechCount!==1?'en':''}</div>`:'<div class="kunde-rech-cnt" style="color:var(--muted)">Keine Rechnungen</div>'}
        <div class="kunde-card-actions" onclick="event.stopPropagation()">
          <button class="rca-btn" onclick="neueRechnungFuerKunde('${k.id}')" title="Neue Rechnung"><i class="fas fa-file-invoice"></i></button>
          ${isMob() && !window._selectMode?.['kunden'] ? _moreBtn([
            {icon:'fa-edit',  label:'Bearbeiten', action:()=>editKunde('${k.id}')},
            {icon:'fa-trash', label:'Löschen',    danger:true, action:()=>delKunde('${k.id}')}
          ]) : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  if(container) container.innerHTML = cards;
  _updateKundenSortBtns();
}

function getKundeUmsatz(id){
  return (data.rechnungen||[]).filter(r=>r.kundeId===id).reduce((s,r)=>s+r.betrag,0);
}

function openKundeModal(){
  editKundeId=null;
  ['km-name','km-ansprechpartner','km-email','km-tel','km-strasse','km-plz','km-ort','km-iban','km-ustid','km-notiz'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const t=document.getElementById('km-form-title'); if(t) t.textContent='Neuer Kunde';
  nav('kunden-form', null);
}

function closeKundeForm(){
  editKundeId=null;
  nav('kunden', document.querySelector('.nav-item[onclick*="kunden"]:not([onclick*="form"])') || null);
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
  const t=document.getElementById('km-form-title'); if(t) t.textContent='Kunde bearbeiten';
  nav('kunden-form', null);
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
    const newK={id:Date.now()+'_'+Math.random().toString(36).slice(2,6), ...obj};
    data.kunden.push(newK);
    sbSaveKunde(newK);
  }
  renderKunden(); closeKundeForm();
  toast('✓ Kunde gespeichert!','ok');
}

async function delKunde(id){
  const _ok1=await appConfirm('Kunden wirklich löschen?',{title:'Kunde löschen',icon:'🗑️',okLabel:'Löschen',danger:true}); if(!_ok1)return;
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
  document.getElementById('rn-tel').value=k.tel||'';
  document.getElementById('rn-nr').dataset.kundeTel=k.tel||'';
  closeModal('kunde-pick-modal');
  toast('✓ Kunde übernommen','ok');
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

  document.getElementById('kunde-rech-name').textContent = k.name + (k.email ? ' · ' + k.email : '');

  const rechs = (data.rechnungen||[]).filter(r =>
    r.kundeId === id || r.kunde === k.name
  ).sort((a,b) => b.datum.localeCompare(a.datum));

  const list  = document.getElementById('kunde-rech-list');
  const empty = document.getElementById('kunde-rech-empty');
  const stats = document.getElementById('kunde-rech-stats');
  const total = document.getElementById('kunde-rech-total');

  if (!rechs.length) {
    empty.style.display = 'block';
    list.innerHTML = '';
    stats.innerHTML = '';
    total.textContent = '';
    openModal('kunde-rech-modal');
    return;
  }

  empty.style.display = 'none';

  // Мини-статистика
  const gesamt   = rechs.reduce((s,r)=>s+r.betrag,0);
  const bezahlt  = rechs.filter(r=>r.status==='bezahlt').reduce((s,r)=>s+r.betrag,0);
  const offen    = rechs.filter(r=>r.status==='offen'||r.status==='ueberfaellig').reduce((s,r)=>s+r.betrag,0);
  stats.innerHTML = `
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:10px 12px;text-align:center">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Gesamt</div>
      <div style="font-family:var(--mono);font-size:15px;font-weight:700">${fmt(gesamt)}</div>
      <div style="font-size:10px;color:var(--sub);margin-top:2px">${rechs.length} Rechnung${rechs.length!==1?'en':''}</div>
    </div>
    <div style="background:var(--gdim);border:1px solid rgba(93,157,105,.25);border-radius:4px;padding:10px 12px;text-align:center">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Bezahlt</div>
      <div style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--green)">${fmt(bezahlt)}</div>
    </div>
    <div style="background:var(--ydim);border:1px solid rgba(224,140,26,.25);border-radius:4px;padding:10px 12px;text-align:center">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Offen</div>
      <div style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--yellow)">${fmt(offen)}</div>
    </div>`;

  const statusCfg = {
    offen:       {icon:'fas fa-clock',              label:'Offen',      avatarCls:'rech-badge-offen',   pillCls:'rech-badge-offen-pill'},
    ueberfaellig:{icon:'fas fa-exclamation-circle', label:'Überfällig', avatarCls:'rech-badge-ueber',   pillCls:'rech-badge-ueber-pill'},
    bezahlt:     {icon:'fas fa-check-circle',       label:'Bezahlt',    avatarCls:'rech-badge-bezahlt', pillCls:'rech-badge-bezahlt-pill'}
  };

  const today = new Date().toISOString().split('T')[0];

  list.innerHTML = rechs.map(r => {
    const st = statusCfg[r.status] || statusCfg.offen;
    let overdueTxt = '';
    if(r.status==='ueberfaellig'&&r.faellig){
      const diff = Math.floor((new Date(today)-new Date(r.faellig))/(1000*86400));
      if(diff>0) overdueTxt = `<span class="rech-overdue">+${diff}T</span>`;
    }
    return `<div class="krech-card" onclick="openRechFromKunde('${r.id}')">
      <div class="krech-avatar ${st.avatarCls}"><i class="${st.icon}"></i></div>
      <div class="krech-info">
        <div class="krech-nr">${r.nr}</div>
        <div class="krech-desc">${r.beschreibung||'—'}</div>
        <div class="krech-meta">
          <span>${fd(r.datum)}</span>
          ${r.faellig?`<span>·</span><span style="color:${r.status==='ueberfaellig'?'var(--red)':'var(--sub)'}">Fällig ${fd(r.faellig)}</span>`:''}
          ${overdueTxt}
        </div>
      </div>
      <div class="krech-right">
        <div class="krech-betrag">${fmt(r.betrag)}</div>
        <div class="${st.pillCls}"><i class="${st.icon}" style="font-size:9px"></i> ${st.label}</div>
      </div>
    </div>`;
  }).join('');

  total.innerHTML = `${rechs.length} Rechnung${rechs.length!==1?'en':''} · Gesamt: <strong>${fmt(gesamt)}</strong> · Bezahlt: <strong style="color:var(--green)">${fmt(bezahlt)}</strong>`;
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
// PDF GENERATION — html2canvas → jsPDF
// ═══════════════════════════════════════════════════════════════

function _buildRechnungHTML(r) {
  const f = typeof getFirmaData==='function' ? getFirmaData() : {};
  const firmaLogo   = f.logo || null;
  const firmaName   = f.name        || 'Meine Firma';
  const firmaStr    = f.strasse     || '';
  const firmaPlzOrt = [f.plz, f.ort].filter(Boolean).join(' ');
  const firmaTel    = f.tel         || '';
  const firmaEmail  = f.email       || '';
  const firmaWeb    = f.web         || '';
  const firmaIban   = f.iban        || '';
  const firmaBic    = f.bic         || '';
  const firmaStNr   = f.steuernummer|| '';
  const firmaUstId  = f.ust_id      || '';
  // mwstMode из счёта, или из настроек USt по году счёта
  const rJahr = r.datum ? r.datum.substring(0,4) : new Date().getFullYear()+'';
  const resolvedMode = r.mwstMode || (typeof getUstModeForYear==='function' ? getUstModeForYear(rJahr) : '§19');
  const isKlein = resolvedMode === '§19';
  const initials    = firmaName.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();

  const pos = r.positionen && r.positionen.length
    ? r.positionen
    : [{bez:r.beschreibung||'Leistung', menge:1, einheit:'Stk.', preis:r.betrag, netto:r.betrag, mwstRate:0}];

  let totNetto=0, totMwst=0;
  const posRows = pos.map((p,i) => {
    const netto = p.netto!==undefined ? p.netto : (p.preis||0);
    // Если regel-Besteuerung но rate не сохранён — берём 19% по умолчанию
    const savedRate = p.mwstRate!==undefined ? p.mwstRate : (p.rate!==undefined ? p.rate : 19);
    const rate  = isKlein ? 0 : (savedRate || 19);
    const lineN = r2((p.menge||1)*netto);
    const lineM = r2(lineN*rate/100);
    totNetto += lineN; totMwst += lineM;
    return `<tr>
      <td>${i+1}</td>
      <td>
        <strong>${p.bez||p.beschreibung||'—'}</strong>
        ${p.desc ? `<div class="pos-desc">${p.desc}</div>` : ''}
      </td>
      <td class="text-right">${p.menge||1} ${p.einheit||'Stk.'}</td>
      <td class="text-right">${fmt(netto)}</td>
      <td class="text-right">${fmt(lineN)}</td>
    </tr>`;
  }).join('');
  const totBrutto = r2(totNetto+totMwst);
  const addrLines = (r.adresse||'').split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  const giroData  = encodeURIComponent(`BCD\n002\n1\nSCT\n${firmaBic}\n${firmaName}\n${firmaIban}\nEUR${totBrutto}\n\nRechnung ${r.nr}`);

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rechnung</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #0052cc;
    --text-main: #1c1c1e;
    --text-sub: #636366;
    --border: #e5e5ea;
    --bg-qr: #f2f2f7;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #fff;
    font-family: 'Inter', sans-serif;
    color: var(--text-main);
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
    padding: 15mm 15mm 10mm;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 45px;
  }

  .logo-placeholder {
    width: 64px;
    height: 64px;
    background: var(--primary);
    border-radius: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 22px;
    font-weight: 700;
  }

  .logo-img {
    max-width: 160px;
    max-height: 64px;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .sender-info-top {
    text-align: right;
    font-size: 11px;
    color: var(--text-sub);
    line-height: 1.6;
  }

  .address-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 50px;
  }

  .absender-zeile {
    font-size: 9px;
    color: var(--text-sub);
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
    margin-bottom: 12px;
    display: inline-block;
  }

  .recipient-details {
    font-size: 14px;
    line-height: 1.5;
  }

  .invoice-meta {
    width: 220px;
    background: #fafafa;
    padding: 15px;
    border-radius: 0;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .meta-row span:last-child { font-weight: 600; }

  .invoice-title {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 30px;
    letter-spacing: -0.5px;
  }

  .pos-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }

  .pos-table th {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 1px solid var(--text-main);
    font-size: 10px;
    text-transform: uppercase;
  }

  .pos-table td {
    padding: 15px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    vertical-align: top;
  }

  .pos-desc { color: var(--text-sub); font-size: 10.5px; margin-top: 4px; line-height: 1.4; }
  .text-right { text-align: right; }

  .bottom-row-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 20px;
    margin-top: 10px;
  }

  .qr-symmetric-widget {
    flex: 1;
    display: grid;
    grid-template-columns: 85px 1fr 85px;
    background: var(--bg-qr);
    padding: 15px;
    border-radius: 0;
    gap: 15px;
    align-items: center;
  }

  .qr-code-box { text-align: center; }

  .qr-img {
    width: 85px;
    height: 85px;
    background: #fff;
    padding: 5px;
    border-radius: 0;
    border: 1px solid #e5e5e5;
    margin-bottom: 5px;
  }

  .qr-img img { width: 100%; height: 100%; display: block; }
  .qr-mini-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: var(--text-sub); }
  .qr-center-text { text-align: center; padding: 0 5px; }
  .qr-center-text h4 { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
  .qr-center-text p { font-size: 10px; color: var(--text-sub); line-height: 1.4; }

  .totals-area { width: 240px; display: flex; flex-direction: column; justify-content: flex-end; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .grand-total { border-top: 2px solid var(--text-main); margin-top: 10px; padding: 12px 0; font-weight: 800; font-size: 15px; color: #000; }

  .closing-text {
    margin-top: 35px;
    font-size: 12px;
    line-height: 1.6;
  }

  .closing-text .thanks { font-weight: 600; margin-bottom: 4px; display: block; }
  .closing-text .payment-terms { color: var(--text-main); }

  .footer {
    margin-top: auto;
    padding-top: 25px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 20px;
    font-size: 9px;
    color: var(--text-sub);
    line-height: 1.6;
  }

  .footer-col strong { color: var(--text-main); font-size: 10px; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${f.logo
      ? `<img class="logo-img" src="${f.logo}" alt="Logo">`
      : `<div class="logo-placeholder">${initials}</div>`}
    <div class="sender-info-top">
      <strong>${firmaName}</strong><br>
      ${firmaStr}${firmaStr && firmaPlzOrt ? ', ' : ''}${firmaPlzOrt}<br>
      ${firmaTel ? 'Tel: '+firmaTel+'<br>' : ''}
      ${firmaEmail}${firmaWeb ? '<br>'+firmaWeb : ''}
    </div>
  </div>

  <div class="address-section">
    <div class="recipient-box">
      <div class="absender-zeile">${[firmaName, firmaStr, firmaPlzOrt].filter(Boolean).join(' · ')}</div>
      <div class="recipient-details">
        <strong>${r.kunde||'—'}</strong><br>
        ${addrLines.join('<br>')}
        ${r.tel ? '<br>Tel: '+r.tel : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="meta-row"><span>Rechnungs-Nr.</span><span>${r.nr||'—'}</span></div>
      <div class="meta-row"><span>Datum</span><span>${fd(r.datum)}</span></div>
      <div class="meta-row"><span>Fällig bis</span><span>${r.faellig?fd(r.faellig):'—'}</span></div>
    </div>
  </div>

  <h1 class="invoice-title">Rechnung</h1>

  <table class="pos-table">
    <thead>
      <tr>
        <th style="width: 8%">Pos</th>
        <th style="width: 50%">Leistung</th>
        <th style="width: 12%" class="text-right">Menge</th>
        <th style="width: 15%" class="text-right">Einzel</th>
        <th style="width: 15%" class="text-right">Gesamt</th>
      </tr>
    </thead>
    <tbody>${posRows}</tbody>
  </table>

  <div class="bottom-row-wrapper">
    <div class="qr-symmetric-widget">
      <div class="qr-code-box">
        <div class="qr-img">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${giroData}" alt="GiroCode" crossorigin="anonymous">
        </div>
        <div class="qr-mini-label">GiroCode</div>
      </div>
      <div class="qr-center-text">
        <h4>Schnell &amp; Sicher bezahlen</h4>
        <p>Scannen Sie den GiroCode mit Ihrer Banking-App. Alle Daten werden automatisch übernommen – keine Tippfehler, kein Stress.</p>
      </div>
      <div class="qr-code-box">
        <div class="qr-img">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('PayPal:'+firmaEmail)}" alt="PayPal" crossorigin="anonymous">
        </div>
        <div class="qr-mini-label">PayPal Pay</div>
      </div>
    </div>

    <div class="totals-area">
      <div class="total-row"><span>Netto-Gesamt</span><span>${fmt(totNetto)}</span></div>
      ${!isKlein && totMwst>0 ? `<div class="total-row"><span>MwSt 19%</span><span>${fmt(totMwst)}</span></div>` : ''}
      <div class="total-row grand-total"><span>Gesamtbetrag</span><span>${fmt(totBrutto)}</span></div>
    </div>
  </div>

  <div class="closing-text">
    <span class="thanks">Vielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit!</span>
    <p class="payment-terms">Bitte überweisen Sie den Rechnungsbetrag innerhalb von <strong>14 Tagen</strong>${r.faellig?' (bis zum '+fd(r.faellig)+')':''} ohne Abzug auf unser unten genanntes Konto.</p>
  </div>

  ${r.notiz ? `<div style="margin-top:20px;padding:12px 15px;background:#f2f2f7;border-left:3px solid var(--primary);font-size:11px;line-height:1.6">${r.notiz}</div>` : ''}
  ${isKlein ? '<p style="margin-top:16px;font-size:10px;color:var(--text-sub);font-style:italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmer).</p>' : ''}


  <div class="footer">
    <div class="footer-col">
      <strong>Absender</strong>
      ${firmaName}<br>
      ${firmaStr}<br>
      ${firmaPlzOrt}
    </div>
    <div class="footer-col">
      <strong>Bankverbindung</strong>
      ${firmaIban?'IBAN: '+firmaIban:'—'}<br>
      ${firmaBic?'BIC: '+firmaBic:''}
    </div>
    <div class="footer-col">
      <strong>Kontakt</strong>
      ${firmaTel?'Tel: '+firmaTel+'<br>':''}
      ${firmaEmail}
    </div>

  </div>

</div>
</body>
</html>`;
}

async function generateRechnungPDF(r) {
  const {jsPDF} = window.jspdf;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;visibility:hidden';
  document.body.appendChild(iframe);

  try {
    iframe.contentDocument.open();
    iframe.contentDocument.write(_buildRechnungHTML(r));
    iframe.contentDocument.close();

    await new Promise(res => { iframe.onload = res; setTimeout(res, 1200); });
    await iframe.contentDocument.fonts.ready;
    await new Promise(res => setTimeout(res, 500));

    const pageEl = iframe.contentDocument.querySelector('.page');

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      logging: false,
    });

    if(!canvas || canvas.width === 0 || canvas.height === 0)
      throw new Error('html2canvas lieferte leeres Canvas');

    const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
    const PW = 210, PH = 297;
    const scale = PW / canvas.width;
    const renderedH = Math.floor(canvas.height * scale * 10) / 10;

    if(renderedH <= PH) {
      pdf.addImage(canvas, 'JPEG', 0, 0, PW, renderedH, '', 'FAST');
    } else {
      const pageHeightPx = Math.floor(canvas.width * (PH / PW));
      let offsetY = 0;
      while(offsetY < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - offsetY);
        if(sliceH <= 0) break;
        const sc = document.createElement('canvas');
        sc.width = canvas.width;
        sc.height = sliceH;
        sc.getContext('2d').drawImage(canvas, 0, -offsetY);
        const slicePdfH = Math.floor(sliceH * scale * 10) / 10;
        if(offsetY > 0) pdf.addPage();
        pdf.addImage(sc, 'JPEG', 0, 0, PW, slicePdfH, '', 'FAST');
        offsetY += pageHeightPx;
      }
    }

    return pdf;

  } finally {
    document.body.removeChild(iframe);
  }
}

// Скачать PDF
async function downloadRechnungPDF(r){
  toast('[PDF] PDF wird erstellt...','ok');
  try{
    const doc = await generateRechnungPDF(r);
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    toast('✓ PDF gespeichert!','ok');
  }catch(e){console.error(e);toast('Fehler beim PDF-Erstellen','err');}
}

// Email mit PDF
async function emailMitPDF(r){
  if(!r.email){toast('Keine E-Mail-Adresse vorhanden','err');return;}
  toast('[PDF] PDF wird erstellt...','ok');
  try{
    const doc = await generateRechnungPDF(r);
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    const f2 = typeof getFirmaData==='function' ? getFirmaData() : {};
    const subject = encodeURIComponent(`Rechnung Nr. ${r.nr} — ${f2.name||'Meine Firma'}`);
    const body = encodeURIComponent(
`Sehr geehrte Damen und Herren,${r.kunde?'\n\nSehr geehrte/r '+r.kunde+',':''}

anbei erhalten Sie unsere Rechnung Nr. ${r.nr} über ${fmt(r.betrag)}.
${r.faellig?'\nZahlungsziel: '+fd(r.faellig):''}

Bitte hängen Sie die soeben heruntergeladene PDF-Datei an diese E-Mail an.

Mit freundlichen Grüßen
${f2.name||''}
${f2.tel?'Tel: '+f2.tel:''}
${f2.email||''}`);
    setTimeout(()=>window.open(`mailto:${r.email}?subject=${subject}&body=${body}`),500);
    toast('✓ PDF gespeichert · E-Mail wird geöffnet','ok');
  }catch(e){console.error(e);toast('Fehler: '+e.message,'err');}
}



// ═══════════════════════════════════════════════════════════════
// UMSATZSTEUER — НДС УЧЁТ
// ═══════════════════════════════════════════════════════════════

let _ustSaving = false;
let ustQuartalFilter = 0; // 0 = все, 1-4 = квартал
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
    ? `<i class="fas fa-check-circle" style="color:var(--green)"></i> ${yr}: §19 Kleinunternehmer gesetzt`
    : `<i class="fas fa-chart-bar"></i> ${yr}: MwSt gesetzt`, 'ok');
}




function getUstMode(yr){
  if(!yr){ const el=document.getElementById('ust-yr'); yr=el?el.value:new Date().getFullYear()+''; }
  return getUstModeForYear(yr);
}

function renderUst(){
  if(!data.ustEintraege) data.ustEintraege = [];

  // ── Список лет ────────────────────────────────────────────────────────────
  const years = [...new Set([
    ...(data.eintraege||[]).filter(e=>e.datum).map(e=>e.datum.substring(0,4)),
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
      return `<div onclick="ustSetYear('${y}')" class="ust-yr-badge${active?' ust-yr-badge--active':''}${isK?' ust-yr-badge--klein':' ust-yr-badge--regel'}">
        <div class="ust-yr-badge-year">${y}</div>
        <div class="ust-yr-badge-mode">${isK?'§19 KU':'MwSt'}</div>
        <div class="ust-yr-badge-sum">${fmt(einY)}</div>
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
    ? '<span style="color:var(--blue);font-size:12px"> USt 19%/7% wird auf Einnahmen erhoben. Vorsteuer aus Ausgaben wird gegengerechnet. Monatliche oder quartalsweise Voranmeldung beim Finanzamt erforderlich.</span>'
    : '<span style="color:var(--green);font-size:12px">✓ Keine Umsatzsteuer auf Rechnungen. Keine Voranmeldung nötig. Hinweis auf §19 UStG in jede Rechnung aufnehmen.</span>';

  // ── Показываем нужный контент ─────────────────────────────────────────────
  const kleinInfo  = document.getElementById('ust-klein-info');
  const regelCards = document.getElementById('ust-cards');
  const quartalSec = document.getElementById('ust-quartal-section');
  const buchSec    = document.getElementById('ust-buchungen-section');

  if(kleinInfo) kleinInfo.style.display = isRegel ? 'none' : '';
  if(regelCards) regelCards.style.display = isRegel ? 'grid' : 'none';
  if(quartalSec) quartalSec.style.display = isRegel ? '' : 'none';
  if(buchSec)    buchSec.style.display    = isRegel ? '' : 'none';
  const addSec   = document.getElementById('ust-add-section');
  const rechnerEl = document.getElementById('ust-rechner');
  if(addSec)    addSec.style.display    = isRegel ? '' : 'none';
  if(rechnerEl) rechnerEl.style.display = isRegel ? 'none' : '';

  // ── §19 — показываем статистику Einnahmen ─────────────────────────────────
  if(!isRegel){
    const kleinStats = document.getElementById('ust-klein-stats');
    if(kleinStats){
      const einY  = activeEintraege().filter(e=>e.datum.startsWith(yr)&&e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
      const ausY  = activeEintraege().filter(e=>e.datum.startsWith(yr)&&e.typ==='Ausgabe').reduce((s,e)=>s+e.betrag,0);
      const limit = 25000;
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
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px">KU-Grenze (25.000 €)</div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:8px;border-radius:4px;width:${pct}%;background:${over?'var(--red)':'var(--green)'};transition:width .4s"></div>
          </div>
          <div style="font-size:11px;margin-top:4px;color:${over?'var(--red)':'var(--sub)'}">
            ${pct}% genutzt ${over?'⚠ Grenze überschritten!':''}
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
    .filter(e => {
      // Только записи с явно сохранённым MwSt-Betrag — не считаем обратным методом для §19-лет
      const isEin = e.typ==='Einnahme';
      return isEin ? (e.mwstBetrag > 0) : (e.vorsteuerBet > 0);
    })
    .map(e => {
      const isEin = e.typ==='Einnahme';
      const rate = e.mwstRate || e.vorsteuerRate || 19;
      const mwstBetrag = isEin ? e.mwstBetrag : e.vorsteuerBet;
      const netto = r2(e.nettoBetrag || (e.betrag - mwstBetrag));
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
      <div class="sc-lbl">Netto-Einnahmen</div>
      <div class="sc-val">${fmt(totNetto)}</div>
      <div class="sc-sub">ohne USt ${yr}</div>
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">USt-Ausgang</div>
      <div class="sc-val">${fmt(totUst)}</div>
      <div class="sc-sub">schulde ich dem FA</div>
    </div>
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Vorsteuer</div>
      <div class="sc-val">${fmt(totVorst)}</div>
      <div class="sc-sub">erhalte ich vom FA</div>
    </div>
    <div class="sc ${totZahl>0?'r':'g'}" style="cursor:default">
      <div class="sc-lbl">Zahllast</div>
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
    // Quartal als Karten
    const qtContainer = document.getElementById('ust-quartal-list');
    // Добавляем заголовок прямо перед сеткой через соседний элемент
    const qtSection = document.getElementById('ust-quartal-section');
    if(qtSection){
      let lbl = qtSection.querySelector('.ust-q-section-lbl');
      if(!lbl){
        lbl = document.createElement('div');
        lbl.className = 'ust-q-section-lbl';
        lbl.style.cssText = 'font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px';
        qtSection.insertBefore(lbl, qtContainer);
      }
      lbl.textContent = 'Quartalsübersicht ' + yr;
    }
    if(qtContainer){
      qtContainer.innerHTML = quarters.map(q=>`
        <div class="ust-q-card${!q.any?' ust-q-empty':''}">
          <div class="ust-q-label">Q${q.q} ${yr}</div>
          <div class="ust-q-row">
            <span class="ust-q-key">Netto-Ein.</span>
            <span class="ust-q-val">${q.netto>0?fmt(q.netto):'—'}</span>
          </div>
          <div class="ust-q-row">
            <span class="ust-q-key">USt Ausgang</span>
            <span class="ust-q-val" style="color:var(--red)">${q.ust>0?'+'+fmt(q.ust):'—'}</span>
          </div>
          <div class="ust-q-row">
            <span class="ust-q-key">Vorsteuer</span>
            <span class="ust-q-val" style="color:var(--green)">${q.vst>0?'−'+fmt(q.vst):'—'}</span>
          </div>
          <div class="ust-q-divider"></div>
          <div class="ust-q-row ust-q-total">
            <span class="ust-q-key">Zahllast</span>
            <span class="ust-q-val" style="color:${q.zl>0?'var(--red)':'var(--green)'}">
              ${q.any?(q.zl>0?'+':'')+fmt(q.zl):'—'}
            </span>
          </div>
        </div>`).join('');
      // Итоговая карточка
      qtContainer.innerHTML += `
        <div class="ust-q-card ust-q-gesamt">
          <div class="ust-q-label">Gesamt ${yr}</div>
          <div class="ust-q-row">
            <span class="ust-q-key">Netto-Ein.</span>
            <span class="ust-q-val">${fmt(totNetto)}</span>
          </div>
          <div class="ust-q-row">
            <span class="ust-q-key">USt Ausgang</span>
            <span class="ust-q-val" style="color:var(--red)">${totUst>0?'+'+fmt(totUst):'—'}</span>
          </div>
          <div class="ust-q-row">
            <span class="ust-q-key">Vorsteuer</span>
            <span class="ust-q-val" style="color:var(--green)">${totVorst>0?'−'+fmt(totVorst):'—'}</span>
          </div>
          <div class="ust-q-divider"></div>
          <div class="ust-q-row ust-q-total">
            <span class="ust-q-key">Zahllast</span>
            <span class="ust-q-val" style="font-size:15px;color:${totZahl>0?'var(--red)':'var(--green)'}">
              ${totZahl>0?'+':''}${fmt(totZahl)}
            </span>
          </div>
        </div>`;
    }
  }

  // ── Таблица операций с пагинацией (20 строк) ─────────────────────────────
  const empty2  = document.getElementById('ust-empty');
  const PER_PAGE = 5;

  // Фильтр по кварталу
  const filteredMwst = ustQuartalFilter > 0
    ? allMwst.filter(e=>{
        const m=parseInt(e.datum.substring(5,7));
        return Math.ceil(m/3)===ustQuartalFilter;
      })
    : allMwst;

  // Обновляем кнопки квартального фильтра
  [0,1,2,3,4].forEach(q=>{
    const btn=document.getElementById('ust-q-filter-'+q);
    if(btn){
      const active=ustQuartalFilter===q;
      btn.style.background=active?'var(--blue)':'';
      btn.style.borderColor=active?'var(--blue)':'';
      btn.style.color=active?'#fff':'';
    }
  });
  const totalPages = Math.max(1, Math.ceil(filteredMwst.length / PER_PAGE));
  if(ustPage > totalPages) ustPage = totalPages;
  if(ustPage < 1) ustPage = 1;

  if(!filteredMwst.length){
    if(empty2){
      empty2.style.display='';
      empty2.innerHTML = ustQuartalFilter > 0
        ? `<div class="ei"><i class="fas fa-calendar-times"></i></div><p>Keine Buchungen in Q${ustQuartalFilter} ${yr}</p><p style="font-size:12px;color:var(--sub);margin-top:4px">Für dieses Quartal liegen keine USt-Buchungen vor</p>`
        : `<div class="ei"><i class="fas fa-receipt"></i></div><p>Keine USt-Buchungen für ${yr}</p>`;
    }
    const detContainer = document.getElementById('ust-detail-list');
    if(detContainer) detContainer.innerHTML = '';
  } else {
    if(empty2) empty2.style.display='none';
    const pageItems = filteredMwst.slice((ustPage-1)*PER_PAGE, ustPage*PER_PAGE);

    // Блочный рендер строк
    const detContainer = document.getElementById('ust-detail-list');
    if(detContainer){
      let lastQ=0;
      let html='';
      pageItems.forEach(e=>{
        const m=parseInt(e.datum.substring(5,7));
        const q=Math.ceil(m/3);
        if(q!==lastQ){
          lastQ=q;
          html+=`<div class="ust-q-sep">Q${q} ${yr}</div>`;
        }
        const isUst=e.typ==='ust', canDel=e.quelle==='Manual';
        const shortDat=e.datum.substring(8,10)+'.'+e.datum.substring(5,7)+'.'+e.datum.substring(2,4);
        const quelleBadge = e.quelle==='Manual'
          ? `<span class="ust-src-badge ust-src-manual">Manuell</span>`
          : e.quelle==='Rechnung'
          ? `<span class="ust-src-badge ust-src-rechnung" title="Aus Offene Rechnungen — dort löschen">Rechnung</span>`
          : `<span class="ust-src-badge ust-src-eintrag" title="Aus Einträge — dort löschen">Eintrag</span>`;
        html+=`<div class="ust-row">
          <div class="ust-row-left">
            <div class="ust-row-badge ${isUst?'ust-badge-ust':'ust-badge-vst'}">${isUst?'USt':'Vorst.'}</div>
            <div class="ust-row-info">
              <div class="ust-row-desc">${e.beschreibung||'—'}</div>
              <div class="ust-row-meta">
                <span>${shortDat}</span>
                <span>${e.rate}%</span>
                ${e.netto>0?`<span>Netto: ${fmt(e.netto)}</span>`:''}
                ${quelleBadge}
              </div>
            </div>
          </div>
          <div class="ust-row-right">
            <div class="ust-row-mwst" style="color:${isUst?'var(--red)':'var(--green)'}">
              ${isUst?'+':'−'}${fmt(e.mwstBetrag)}
            </div>
            <div class="ust-row-brutto">${e.brutto>0?fmt(e.brutto):'—'}</div>
            ${canDel
              ? `<button class="rca-btn rca-red" onclick="delUstEintrag('${e.id}')" title="Löschen"><i class="fas fa-trash"></i></button>`
              : `<span class="ust-src-lock" title="Aus ${e.quelle} — dort löschen"><i class="fas fa-lock"></i></span>`
            }
          </div>
        </div>`;
      });
      detContainer.innerHTML = html;
    }
  }

  // Pagination + summary — всегда рендерится, вне зависимости от количества записей
  window._ustPagerCb=function(p){ustPage=p;renderUst();}
  renderPager('ust-detail-pager', ustPage, totalPages, filteredMwst.length, '_ustPagerCb');
  const detSummary = document.getElementById('ust-detail-summary');
  if(detSummary){
    const filtUst  = r2(filteredMwst.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.mwstBetrag,0));
    const filtVorst= r2(filteredMwst.filter(e=>e.typ==='vorsteuer').reduce((s,e)=>s+e.mwstBetrag,0));
    const filtZahl = r2(filtUst-filtVorst);
    const label = ustQuartalFilter>0 ? `Q${ustQuartalFilter} — ${filteredMwst.length} Buchungen` : `${filteredMwst.length} Buchungen`;
    detSummary.innerHTML=`<span>${label}</span>
      <span class="ust-summary-zahl" style="color:${filtZahl>0?'var(--red)':'var(--green)'}">
        Zahllast: ${filtZahl>0?'+':''}${fmt(filtZahl)}
      </span>`;
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
  const entry = { id: Date.now()+'_'+Math.random().toString(36).slice(2,6), datum, typ, betrag: bet, rate, beschreibung: dsc };
  data.ustEintraege.push(entry);
  sbSaveUstEintrag(entry);
  // Переключаем год на год созданной записи, чтобы она была видна
  const entryYr = datum.substring(0,4);
  const yrSel = document.getElementById('ust-yr');
  if(yrSel) yrSel.value = entryYr;
  renderUst();
  document.getElementById('ust-new-bet').value='';
  document.getElementById('ust-new-dsc').value='';
  document.getElementById('ust-new-dat').value='';
  toast('✓ USt-Eintrag gespeichert ('+entryYr+')','ok');
}

function delUstEintrag(id){
  appConfirm('Eintrag wirklich löschen?',{title:'Eintrag löschen',icon:'🗑️',okLabel:'Löschen',danger:true}).then(ok=>{
    if(!ok) return;
    data.ustEintraege = (data.ustEintraege||[]).filter(e=>e.id!==id);
    sbDeleteUstEintrag(id);
    renderUst();
    toast('Gelöscht','err');
  });
}

// ═══════════════════════════════════════════════════════════════
// SCHNELLRECHNER §19
// ═══════════════════════════════════════════════════════════════
let _kuRate=19, _kuMode='brutto';

function kuSetRate(r){
  _kuRate=r;
  document.querySelectorAll('#ku-btn-19, #ku-btn-7').forEach(b=>b.classList.remove('active'));
  document.getElementById('ku-btn-'+r)?.classList.add('active');
  kuCalc();
}
function kuSetMode(m){
  _kuMode=m;
  document.querySelectorAll('#ku-m-brutto, #ku-m-netto').forEach(b=>b.classList.remove('active'));
  document.getElementById('ku-m-'+m)?.classList.add('active');
  kuCalc();
}
function kuCalc(){
  const raw=parseFloat(String(document.getElementById('ku-input')?.value||'').replace(',','.'))||0;
  if(!raw){
    ['ku-r-ku','ku-r-netto','ku-r-mwst','ku-r-brutto','ku-r-diff'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.textContent='—';
    });
    return;
  }
  let netto, brutto, mwst;
  if(_kuMode==='brutto'){
    brutto=raw;
    mwst=r2(brutto*_kuRate/(100+_kuRate));
    netto=r2(brutto-mwst);
  } else {
    netto=raw;
    mwst=r2(netto*_kuRate/100);
    brutto=r2(netto+mwst);
  }
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=fmt(v); };
  set('ku-r-ku',    netto);   // §19 — выставляется нетто
  set('ku-r-netto', netto);
  set('ku-r-mwst',  mwst);
  set('ku-r-brutto',brutto);
  set('ku-r-diff',  mwst);   // экономия = MwSt которую не платишь
}

// Переключение года в UST — безопасно находит select
function ustSetYear(yr){
  const sel = document.getElementById('ust-yr');
  if(sel){ sel.value = yr; }
  ustPage = 1;
  ustQuartalFilter = 0; // сбрасываем фильтр квартала при смене года
  renderUst();
}

// ── Универсальный USt Flag Dropdown (для статических полей в index.html) ─
function toggleUstDropdown(id) {
  const panel = document.getElementById(id + '-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('.ust-flag-panel, [id$="-panel"]').forEach(p => {
    if (p.id && p.id.endsWith('-panel') && p.id !== 'nf-mwst-panel') p.style.display = 'none';
  });
  if (!isOpen) {
    panel.style.display = 'block';
    setTimeout(() => document.addEventListener('click', function h(e) {
      if (!panel.contains(e.target) && !e.target.closest('[onclick*="toggleUstDropdown(\'' + id + '\')"]')) {
        panel.style.display = 'none';
        document.removeEventListener('click', h);
      }
    }), 0);
  }
}

function setUstRate(id, rate, callbackName) {
  const hidden = document.getElementById(id);
  if (hidden) hidden.value = rate;
  const label = document.getElementById(id + '-label');
  if (label) label.textContent = rate + '%';
  const panel = document.getElementById(id + '-panel');
  if (panel) panel.style.display = 'none';
  if (callbackName && typeof window[callbackName] === 'function') window[callbackName]();
}

// posRateChanged для rechnungen — читает hidden input вместо select

// ── USt Flag Dropdown (общая для позиций Angebot и Rechnung) ─────────────
function toggleAngUstDropdown(btn) {
  const panel = btn.closest('.ust-flag-wrap').querySelector('.ust-flag-panel');
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('.ust-flag-panel').forEach(p => p.style.display = 'none');
  if (!isOpen) {
    panel.style.display = 'block';
    setTimeout(() => document.addEventListener('click', function h(e) {
      if (!btn.closest('.ust-flag-wrap').contains(e.target)) {
        panel.style.display = 'none';
        document.removeEventListener('click', h);
      }
    }), 0);
  }
}

// ═══════════════════════════════════════════════════════════════
// KUNDEN PICKER — Aus Kundenbuch wählen (Angebot + Rechnung)
// ═══════════════════════════════════════════════════════════════
let _kpTarget = ''; // 'ang' or 'rn'

function openKundenPicker(target) {
  _kpTarget = target;
  const search = document.getElementById('kp-search');
  if (search) search.value = '';
  renderKundenPicker();
  openModal('kunden-picker-modal');
  setTimeout(() => { if (search) search.focus(); }, 100);
}

function filterKundenPicker() {
  renderKundenPicker();
}

function renderKundenPicker() {
  const list = document.getElementById('kp-list');
  const empty = document.getElementById('kp-empty');
  if (!list) return;

  const q = (document.getElementById('kp-search')?.value || '').toLowerCase();
  let kunden = (data.kunden || []).slice();

  if (q) {
    kunden = kunden.filter(k =>
      (k.name || '').toLowerCase().includes(q) ||
      (k.firma || '').toLowerCase().includes(q) ||
      (k.ort || '').toLowerCase().includes(q) ||
      (k.email || '').toLowerCase().includes(q)
    );
  }

  // Sort: last used first, then alphabetical
  kunden.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (!kunden.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = kunden.map(k => {
    const initials = (k.name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const adr = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const hasEmail = k.email;
    const hasTel = k.tel;

    return `<div onclick="selectKundenPicker('${k.id}')"
      style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r);cursor:pointer;transition:all .12s"
      onmouseover="this.style.borderColor='var(--blue)';this.style.background='var(--bdim)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background=''">
      <div style="width:38px;height:38px;border-radius:var(--r);background:var(--bdim);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:2px">${k.name || '—'}</div>
        <div style="font-size:12px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${adr || 'Keine Adresse'}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;font-size:11px;color:var(--sub)">
        ${hasEmail ? '<span title="'+k.email+'"><i class="fas fa-envelope" style="font-size:11px"></i></span>' : ''}
        ${hasTel ? '<span title="'+k.tel+'"><i class="fas fa-phone" style="font-size:11px"></i></span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function selectKundenPicker(id) {
  const k = (data.kunden || []).find(x => x.id === id);
  if (!k) return;

  if (_kpTarget === 'ang') {
    // Angebot form
    document.getElementById('ang-kunde').value = k.name || '';
    const adr = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join('\n');
    document.getElementById('ang-adresse').value = adr;
  } else if (_kpTarget === 'rn') {
    // Rechnung form
    document.getElementById('rn-kunde').value = k.name || '';
    const adr = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    document.getElementById('rn-adresse').value = adr;
    if (k.email) document.getElementById('rn-email').value = k.email;
    if (k.tel) document.getElementById('rn-tel').value = k.tel;
    const rnNr = document.getElementById('rn-nr');
    if (rnNr) rnNr.dataset.kundeId = id;
  }

  closeModal('kunden-picker-modal');
  toast('Kunde übernommen: ' + (k.name || ''), 'ok');
}
