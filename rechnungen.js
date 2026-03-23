// ── RECHNUNG STATUS DROPDOWN ─────────────────────────────────────────────
const _RECH_ST_CFG = {
  'entwurf':     {icon:'fas fa-pencil-alt',         color:'var(--sub)',    label:'Entwurf'},
  'offen':       {icon:'fas fa-clock',              color:'var(--yellow)', label:'Offen'},
  'bezahlt':     {icon:'fas fa-check-circle',       color:'var(--green)',  label:'Bezahlt'},
  'ueberfaellig':{icon:'fas fa-exclamation-circle', color:'var(--red)',    label:'Überfällig'},
};

// Обновляет поле номера в зависимости от статуса
function _updateNrFieldForStatus(status) {
  const nrEl = document.getElementById('rn-nr');
  if (!nrEl) return;
  if (status === 'entwurf') {
    nrEl.placeholder = 'wird beim Ausstellen vergeben';
    nrEl.style.color = 'var(--sub)';
    nrEl.style.fontStyle = 'italic';
  } else {
    nrEl.placeholder = '2026-001';
    nrEl.style.color = '';
    nrEl.style.fontStyle = '';
    if (!nrEl.value.trim()) {
      nrEl.value = autoRechNr(new Date().getFullYear());
    }
  }
}

function setRechStatus(val){
  const cfg = _RECH_ST_CFG[val] || _RECH_ST_CFG['offen'];
  const inp  = document.getElementById('rn-status');
  const icon = document.getElementById('rn-status-icon');
  const txt  = document.getElementById('rn-status-text');
  if(inp)  inp.value = val;
  if(icon) { icon.className = cfg.icon; icon.style.color = cfg.color; }
  if(txt)  txt.textContent = cfg.label;
  const panel = document.getElementById('rn-status-panel');
  if(panel) panel.style.display = 'none';
  _updateNrFieldForStatus(val);
}

function toggleRechStatusDropdown(){
  const panel = document.getElementById('rn-status-panel');
  if(!panel) return;
  const isOpen = panel.style.display !== 'none';
  // Закрываем все другие dropdown
  document.querySelectorAll('[id$="-panel"]').forEach(p => { if(p !== panel) p.style.display = 'none'; });
  panel.style.display = isOpen ? 'none' : 'block';
  if(!isOpen){
    const close = (e) => {
      if(!panel.contains(e.target) && e.target.id !== 'rn-status-btn'){
        panel.style.display = 'none';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

// ── RECHNUNGEN ───────────────────────────────────────────────────────────
let rechFilter='alle', editRechId=null, rechSort='datum', rechSortDir=-1, rechPage=1;
const RECH_PER_PAGE=10;
function renderRech(){
  const rech=data.rechnungen||[];
  const today=new Date().toISOString().split('T')[0];
  rech.forEach(r=>{if(r.status==='offen'&&r.faellig&&r.faellig<today)r.status='ueberfaellig';});

  const q = (document.getElementById('rech-search')||{value:''}).value.toLowerCase();
  let filtered = rechFilter==='alle' ? [...rech] : rech.filter(r=>r.status===rechFilter);
  if(q) filtered = filtered.filter(r=>(r.nr||'').toLowerCase().includes(q)||(r.kunde||'').toLowerCase().includes(q));

  const entwurf = rech.filter(r=>r.status==='entwurf');
  const offen   = rech.filter(r=>r.status==='offen');
  const uebf    = rech.filter(r=>r.status==='ueberfaellig');
  const bezahlt = rech.filter(r=>r.status==='bezahlt');

  // Карточки статистики
  document.getElementById('rech-cards').innerHTML=`
    <div class="sc y" style="cursor:pointer" onclick="setRechFilter('offen',document.querySelector('.ftab[onclick*=offen]'))">
      <div class="sc-lbl">Offen</div>
      <div class="sc-val">${fmt(offen.reduce((s,r)=>s+r.betrag,0))}</div>
      <div class="sc-sub">${offen.length} Rechnung${offen.length!==1?'en':''}</div>
    </div>
    <div class="sc r" style="cursor:pointer" onclick="setRechFilter('ueberfaellig',document.querySelector('.ftab[onclick*=ueberfaellig]'))">
      <div class="sc-lbl">Überfällig</div>
      <div class="sc-val">${fmt(uebf.reduce((s,r)=>s+r.betrag,0))}</div>
      <div class="sc-sub">${uebf.length} Rechnung${uebf.length!==1?'en':''}</div>
    </div>
    <div class="sc g" style="cursor:pointer" onclick="setRechFilter('bezahlt',document.querySelector('.ftab[onclick*=bezahlt]'))">
      <div class="sc-lbl">Bezahlt</div>
      <div class="sc-val">${fmt(bezahlt.reduce((s,r)=>s+r.betrag,0))}</div>
      <div class="sc-sub">${bezahlt.length} Rechnung${bezahlt.length!==1?'en':''}</div>
    </div>`;

  const container = document.getElementById('rech-list');
  const em = document.getElementById('rech-empty');
  if(!filtered.length){
    if(container) container.innerHTML='';
    em.style.display='block';
    renderPager('rech-pagination', 1, 1, 0, '_rechPagerCb');
    return;
  }
  em.style.display='none';

  // Сортировка
  filtered.sort((a,b)=>{
    let av = rechSort==='betrag' ? (a.betrag||0) : (a[rechSort]||'');
    let bv = rechSort==='betrag' ? (b.betrag||0) : (b[rechSort]||'');
    return av<bv ? rechSortDir : av>bv ? -rechSortDir : 0;
  });

  // Пагинация
  const totalPages = Math.max(1, Math.ceil(filtered.length / RECH_PER_PAGE));
  if(rechPage > totalPages) rechPage = totalPages;
  const pageItems = filtered.slice((rechPage-1)*RECH_PER_PAGE, rechPage*RECH_PER_PAGE);

  const statusCfg = {
    entwurf:     {cls:'rech-badge-entwurf',  icon:'fas fa-pencil-alt',         label:'Entwurf',    color:'var(--sub)'},
    offen:       {cls:'rech-badge-offen',    icon:'fas fa-clock',              label:'Offen',      color:'var(--yellow)'},
    ueberfaellig:{cls:'rech-badge-ueber',    icon:'fas fa-exclamation-circle', label:'Überfällig', color:'var(--red)'},
    bezahlt:     {cls:'rech-badge-bezahlt',  icon:'fas fa-check-circle',       label:'Bezahlt',    color:'var(--green)'}
  };

  const cards = pageItems.map(r=>{
    const st = statusCfg[r.status] || statusCfg.offen;
    let overdueTxt = '';
    if(r.status==='ueberfaellig'&&r.faellig){
      const diff = Math.floor((new Date(today)-new Date(r.faellig))/(1000*86400));
      if(diff>0) overdueTxt = `<span class="rech-overdue">+${diff} Tag${diff!==1?'e':''} überfällig</span>`;
    }
    const dueColor = r.status==='ueberfaellig' ? 'color:var(--red)' : 'color:var(--sub)';
    // Проверяем есть ли сторно для Einnahme этой рекоманды
    const _rechStorno = (data.eintraege||[]).filter(e =>
      e.is_storno && (data.eintraege||[]).some(orig =>
        !orig.is_storno && orig.beschreibung && orig.beschreibung.includes(`Rechnung ${r.nr}:`) && e.storno_of===orig.id
      )
    );
    const stornoBadge = _rechStorno.length > 0
      ? `<span class="badge-storno" style="font-size:10px;padding:2px 6px;border-radius:4px">↩ Storniert</span>` : '';
    const _isStorniert = r.status === 'storniert' || r._storniert;
    const _rClick = _isStorniert
      ? `onclick="showRechDetailReadonly('${r.id}')"`
      : `onclick="showRechDetail('${r.id}')"`;
    // Anzahl Positionen
    const _rPosCount = (r.positionen||[]).length;
    // Wie alt ist die Rechnung?
    const _rDaysSince = r.datum ? Math.floor((Date.now()-new Date(r.datum))/(864e5)) : null;
    const _rAgeLabel = _rDaysSince===0?'Heute':_rDaysSince===1?'Gestern':_rDaysSince!==null?`vor ${_rDaysSince} Tagen`:'';
    return `<div class="rech-card${(_isStorniert||_rechStorno.length)?' rech-card-storniert':''}" data-rech-id="${r.id}" ${_rClick} style="cursor:pointer;${_isStorniert?'pointer-events:auto':''}">
      <div class="rech-card-avatar ${st.cls}">
        <i class="${st.icon}"></i>
      </div>
      <div class="rech-card-content">
        <div class="rech-card-row1">
          <div class="rech-card-nr">${r.nr || '<span style="color:var(--sub);font-style:italic;font-size:11px">Entwurf (ohne Nr.)</span>'} ${stornoBadge}</div>
          <div class="rech-card-betrag">${fmt(r.betrag)}</div>
        </div>
        <div class="rech-card-row2">
          <div class="rech-card-kunde">${r.kunde||r.beschreibung||'—'}</div>
          <div class="rech-card-end" onclick="event.stopPropagation()">
            ${isMob() ? (_isStorniert
              ? _moreBtn([
                  {icon:'fa-eye', label:'Details anzeigen', action:()=>showRechDetailReadonly(r.id)}
                ])
              : _moreBtn([
                  ...(r.status!=='bezahlt' ? [{icon:'fa-check-circle', label:'Als bezahlt markieren', action:()=>rechBezahlt(r.id)}] : []),
                  ...(r.status==='entwurf' ? [{icon:'fa-paper-plane', label:'Ausstellen', action:()=>rechAusstellen(r.id)}] : [{icon:'fa-print', label:'Drucken / PDF', action:()=>druckRechnungId(r.id)}]),
                  {icon:'fa-eye',     label:'HTML-Vorschau',  action:()=>vorschauRechnungId(r.id)},
                  {icon:'fa-file-alt', label:'Als Vorlage',   action:()=>rechAlsVorlage(r.id)},
                  {icon:'fa-edit',    label:'Bearbeiten',     action:()=>editRech(r.id)},
                  {icon:'fa-undo-alt', label:'Stornieren (GoBD)', danger:true, action:()=>delRech(r.id)}
                ])) : `<div class="rech-desktop-actions">
              ${_isStorniert ? `
                <button class="rda-btn" onclick="showRechDetailReadonly('${r.id}')" title="Details anzeigen"><i class="fas fa-eye"></i></button>
                <button class="rda-btn" onclick="druckRechnungId('${r.id}')" title="PDF / Drucken"><i class="fas fa-print"></i></button>
              ` : `
                ${r.status!=='bezahlt' ? `<button class="rda-btn rda-green" onclick="rechBezahlt('${r.id}')" title="Als bezahlt markieren" style="width:32px;height:32px;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center"><i class="fas fa-check-circle"></i></button>` : ''}
                ${r.status==='entwurf' ? `<button class="rda-btn rda-green" onclick="rechAusstellen('${r.id}')" title="Ausstellen"><i class="fas fa-paper-plane"></i></button>` : ''}
                <button class="rda-btn" onclick="vorschauRechnungId('${r.id}')" title="HTML-Vorschau"><i class="fas fa-eye"></i></button>
                ${r.status!=='entwurf' ? `<button class="rda-btn" onclick="druckRechnungId('${r.id}')" title="Drucken / PDF"><i class="fas fa-print"></i></button>` : ''}
                <button class="rda-btn" onclick="rechAlsVorlage('${r.id}')" title="Als Vorlage speichern"><i class="fas fa-file-alt"></i></button>
                <button class="rda-btn" onclick="editRech('${r.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
                <button class="rda-btn rda-red" onclick="delRech('${r.id}')" title="Stornieren (GoBD)"><i class="fas fa-undo-alt"></i></button>
              `}
            </div>`}
          </div>
        </div>
        <div class="rech-card-meta">
          <span><i class="fas fa-calendar" style="opacity:.5;width:10px"></i>${fd(r.datum)}</span>
          ${_rAgeLabel?`<span style="opacity:.5">·</span><span style="font-size:10px;color:var(--sub)">${_rAgeLabel}</span>`:''}
          ${r.faellig ? `<span style="color:var(--sub)">·</span><span style="${dueColor}"><i class="fas fa-hourglass-half" style="opacity:.5;width:10px"></i>Fällig ${fd(r.faellig)}</span>` : ''}
          ${overdueTxt}
          ${_rPosCount?`<span style="color:var(--sub)">·</span><span style="font-size:10px;color:var(--sub)"><i class="fas fa-list" style="opacity:.5;width:10px"></i>${_rPosCount} Pos.</span>`:''}
          ${(r.mahnung_history||[]).length?`<span style="color:var(--sub)">·</span><span style="font-size:10px;font-weight:600;color:var(--yellow)"><i class="fas fa-bell" style="opacity:.7;width:10px"></i>${r.mahnung_history.length}× gemahnt</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');

  const filtTotal = filtered.reduce((s,r)=>s+r.betrag,0);
  const summary = `<div class="rech-summary">
    <span>${filtered.length} Rechnung${filtered.length!==1?'en':''}</span>
    <span class="rech-summary-total">${fmt(filtTotal)}</span>
  </div>`;

  if(container) container.innerHTML = cards + summary;
  window._rechPagerCb=function(p){rechPage=p;renderRech();};
  renderPager('rech-pagination', rechPage, totalPages, filtered.length, '_rechPagerCb');
  _updateRechSortBtns();
}
function setRechFilter(f,btn){rechFilter=f;rechPage=1;document.querySelectorAll('#p-rechnungen .ftab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderRech();}
function sortRech(col){
  if(rechSort===col) rechSortDir*=-1; else{rechSort=col;rechSortDir=-1;}
  rechPage=1;
  renderRech();
}
function _updateRechSortBtns(){
  [['datum','Datum'],['faellig','Fällig'],['betrag','Betrag'],['kunde','Kunde']].forEach(([col,lbl])=>{
    document.querySelectorAll(`#p-rechnungen button[onclick*="sortRech('${col}')"]`).forEach(btn=>{
      const active = rechSort===col;
      btn.classList.toggle('active', active);
      btn.innerHTML = lbl + '<span class="sort-arrow">'+(active?(rechSortDir===1?' ↑':' ↓'):'&nbsp;')+'</span>';
    });
  });
}


function openRechModal(){
  document.getElementById('rn-nr').value=autoRechNr(new Date().getFullYear());
  const _rnDatEl=document.getElementById('rn-dat');
  _rnDatEl.value=new Date().toISOString().split('T')[0];
  const faellig=new Date();faellig.setDate(faellig.getDate()+14);
  document.getElementById('rn-faellig').value=faellig.toISOString().split('T')[0];
  document.getElementById('rn-bet').value='';
  ['rn-kunde','rn-adresse','rn-email','rn-tel','rn-notiz','rn-leitweg'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sug = document.getElementById('rn-kunde-suggest');
  if (sug) sug.style.display = 'none';
  setRechStatus('offen');
  editRechId=null;
  document.getElementById('rn-nr').dataset.kundeId='';
  updateRechBanner();
  setRechPositionen([{bez:'',menge:1,netto:'',rate:19,brutto:''}]);
  const t = document.getElementById('rn-form-title');
  if (t) t.textContent = 'Rechnung erstellen';
  nav('rechnungen-form', null);
}
function closeRechForm(){
  editRechId=null;
  nav('rechnungen', document.querySelector('.nav-item[onclick*="rechnungen"]:not([onclick*="form"])') || null);
}
// ── GoBD Storno + Neuerstellung ──────────────────────────────────────────
async function _rechStornierenGoBD(r) {
  // Стернируем старый рехнунг
  r.status = 'storniert';
  r._storniert = true;
  r._storniert_am = new Date().toISOString();
  sbSaveRechnung(r);
  sbLogRechnung(r, 'storniert', {status: r.status}, {status: 'storniert', grund: 'GoBD-Korrektur'});
  // Если был bezahlt — сторнируем связанный Einnahme-Eintrag
  if (r.status === 'bezahlt') {
    const linked = (data.eintraege||[]).find(e =>
      e.beschreibung && e.beschreibung.includes(`Rechnung ${r.nr}:`) && !e.is_storno
    );
    if (linked) {
      linked.is_storno = true;
      linked._storniert = true;
      await sbSaveEintrag(linked);
    }
  }
  toast(`Rechnung ${r.nr} storniert`, 'ok');
}

function _editRechAsNew(orig) {
  editRechId = null;
  document.getElementById('rn-nr').value = '';
  document.getElementById('rn-dat').value = new Date().toISOString().split('T')[0];
  document.getElementById('rn-faellig').value = orig.faellig || '';
  setRechStatus('entwurf');
  document.getElementById('rn-kunde').value = orig.kunde || '';
  document.getElementById('rn-adresse').value = orig.adresse || '';
  document.getElementById('rn-email').value = orig.email || '';
  document.getElementById('rn-tel').value = orig.tel || '';
  document.getElementById('rn-notiz').value = orig.notiz || '';
  document.getElementById('rn-nr').dataset.kundeTel = orig.tel || '';
  document.getElementById('rn-nr').dataset.kundeId = orig.kundeId || '';
  updateRechBanner();
  const posData = orig.positionen && orig.positionen.length
    ? orig.positionen.map(p => ({...p, id: 'pos-'+Date.now()+'_'+Math.random().toString(36).slice(2,6)}))
    : [{bez: orig.beschreibung||'', menge:1, netto:orig.netto||orig.betrag||'', rate:orig.mwstRate||0, brutto:orig.betrag||''}];
  setRechPositionen(posData);
  const t = document.getElementById('rn-form-title');
  if (t) t.textContent = `Neue Rechnung (Storno von ${orig.nr})`;
  nav('rechnungen-form', null);
  toast(`Neue Rechnung ${newNr} als Entwurf — bitte prüfen und ausstellen`, 'ok');
}

// Ausstellen: Entwurf → Offen

async function editRech(id){
  const r=data.rechnungen.find(x=>x.id===id);
  if(!r)return;
  // Stornierte und bezahlte Rechnungen sind unveränderbar
  if(r.status==='storniert' || r._storniert){
    toast('Stornierte Rechnungen können nicht bearbeitet werden (GoBD §146)','err');
    return;
  }
  if(r.status==='bezahlt'){
    showRechDetail(r.id);
    return;
  }
  // Черновик — редактируем напрямую
  if(!r.status || r.status==='entwurf') {
    _openRechForm(r, id, 'Entwurf bearbeiten');
    return;
  }

  // Открытый счёт — предупреждение но разрешаем
  if(r.status==='offen') {
    const ok = await appConfirm(
      `Rechnung ${r.nr} wurde bereits ausgestellt.

Gemäß GoBD empfehlen wir: Storniere den alten Beleg und erstelle eine neue Rechnung.

Möchtest du trotzdem direkt bearbeiten?`,
      {title:'⚠️ GoBD-Hinweis', okLabel:'Direkt bearbeiten', cancelLabel:'Abbrechen', danger:false}
    );
    if(!ok) return;
    _openRechForm(r, id, 'Rechnung bearbeiten');
    return;
  }

  // Bezahlt/storniert — обязательно Storno + новый
  if(r.status==='bezahlt' || r.status==='storniert') {
    const ok = await appConfirm(
      `Rechnung ${r.nr} (${r.status}) kann gemäß §14 UStG & GoBD nicht direkt geändert werden.

Es wird automatisch erstellt:
• Stornorechnung für ${r.nr}
• Neue Rechnung mit der nächsten Nummer

Fortfahren?`,
      {title:'📋 Storno & Neuausstellung', okLabel:'Storno + Neu erstellen', cancelLabel:'Abbrechen', danger:false}
    );
    if(!ok) return;
    _stornoUndNeu(r);
    return;
  }

  _openRechForm(r, id, 'Rechnung bearbeiten');
}

function _openRechForm(r, id, title) {
  editRechId = id;
  document.getElementById('rn-nr').value=r.nr;
  document.getElementById('rn-dat').value=r.datum;
  document.getElementById('rn-faellig').value=r.faellig||'';
  const _leistEl = document.getElementById('rn-leistung');
  if(_leistEl) _leistEl.value=r.leistungsdatum||'';
  document.getElementById('rn-bet').value=r.betrag;
  setRechStatus(r.status||'offen');
  document.getElementById('rn-kunde').value=r.kunde||'';
  document.getElementById('rn-adresse').value=r.adresse||'';
  document.getElementById('rn-email').value=r.email||'';
  document.getElementById('rn-tel').value=r.tel||'';
  document.getElementById('rn-notiz').value=r.notiz||'';
  const _leitwegEl = document.getElementById('rn-leitweg');
  if (_leitwegEl) _leitwegEl.value = r.leitwegId || '';
  document.getElementById('rn-nr').dataset.kundeTel=r.tel||'';
  document.getElementById('rn-nr').dataset.kundeId=r.kundeId||'';
  updateRechBanner();
  const posData=r.positionen&&r.positionen.length?r.positionen:[{bez:r.beschreibung||'',menge:1,netto:r.netto||r.betrag||'',rate:r.mwstRate||0,brutto:r.betrag||''}];
  setRechPositionen(posData);
  const t = document.getElementById('rn-form-title');
  if (t) t.textContent = title || 'Rechnung bearbeiten';
  // Обновить состояние поля номера по текущему статусу
  _updateNrFieldForStatus(r.status || 'offen');
  nav('rechnungen-form', null);
}

function _stornoUndNeu(r) {
  // 1. Storniere den alten Beleg
  const storno = {
    ...r,
    id: Date.now()+'_storno_'+Math.random().toString(36).slice(2,5),
    status: 'storniert',
    storniert_am: new Date().toISOString().split('T')[0],
    storno_von: r.nr,
    _storniert: true,
  };
  // Если уже не storniert — добавляем запись
  if(r.status !== 'storniert') {
    r.status = 'storniert';
    r._storniert = true;
    r.storniert_am = new Date().toISOString().split('T')[0];
    sbSaveRechnung(r);
    sbLogRechnung(r, 'storniert', {status:'bezahlt'}, {status:'storniert', storno_von: r.nr});
  }

  // 2. Новый рехнунг с следующим номером
  const newR = {
    ...r,
    id: Date.now()+'_'+Math.random().toString(36).slice(2,6),
    nr: '',
    datum: new Date().toISOString().split('T')[0],
    status: 'entwurf',
    storno_von: r.nr,
    mahnung_history: [],
  };
  delete newR._storniert;
  delete newR.storniert_am;

  data.rechnungen.push(newR);
  sbSaveRechnung(newR);
  sbLogRechnung(newR, 'erstellt', null, {nr:'(Entwurf)', status:'entwurf', storno_von:r.nr});

  renderRech();
  toast(`✓ ${r.nr} storniert · Neuer Entwurf erstellt (Nr. wird beim Ausstellen vergeben)`, 'ok');

  setTimeout(() => _openRechForm(newR, newR.id, `Entwurf (aus Storno von ${r.nr})`), 300);
}

// Создаёт Einnahme из Rechnung и сохраняет в БД
// Возвращает созданный entry или null если уже существует
function _buchRechnungAlsEinnahme(r) {
  // Проверяем — нет ли уже Einnahme für diese Rechnung
  // Nur echte Einträge prüfen (nicht virtuelle __rech__)
  const alreadyBooked = data.eintraege.some(e =>
    !e.id?.startsWith('__rech__') &&
    e.beschreibung && e.beschreibung.includes(`Rechnung ${r.nr}:`) && !e.is_storno && !e._storniert
  );
  if (alreadyBooked) return null;
  const _rNetto = r.positionen&&r.positionen.length ? r2(r.positionen.reduce((s,p)=>s+(p.menge||1)*p.netto,0)) : (r.netto||r.betrag);
  const _rMwst  = r.positionen&&r.positionen.length ? r2(r.positionen.reduce((s,p)=>s+(p.menge||1)*(p.brutto-p.netto),0)) : (r.mwstBetrag||0);
  const _rRate  = r.positionen&&r.positionen.length ? (r.positionen.find(p=>p.rate>0)?.rate||0) : (r.mwstRate||0);
  const _today = new Date().toISOString().split('T')[0];
  const newE = {
    id: Date.now()+'_'+Math.random().toString(36).slice(2,6),
    datum: _today, // Buchungsdatum = heute
    leistungsdatum: r.leistungsdatum || r.datum || _today, // Leistungsdatum = Rechnungsdatum
    typ:'Einnahme',
    kategorie: r.kategorie||'Dienstleistung',
    zahlungsart: r.zahlungsart||'Überweisung',
    beschreibung: `Rechnung ${r.nr}: ${r.beschreibung||r.kunde||''}`,
    belegnr: r.nr||'',
    notiz: '',
    betrag: r.betrag,
    nettoBetrag: _rNetto,
    mwstBetrag: _rMwst,
    mwstRate: _rRate,
    _fromRechnung: true,
    _rechnungId: r.id
  };
  data.eintraege.unshift(newE);
  sbSaveEintrag(newE);
  return newE;
}

// Извлекает порядковый номер N из формата "YYYY-N" или просто "N"
function _parseSeqNr(raw){
  if(!raw) return 0;
  raw=String(raw).trim();
  const part=raw.includes('-')?raw.split('-').pop():raw;
  const n=parseInt(part,10);
  return isNaN(n)?0:n;
}

function autoRechNr(yr){
  // §14 UStG — единая сквозная нумерация (Einnahmen + Rechnungen)
  // Формат: YYYY-N, где N — глобальный счётчик
  if(!yr) yr=new Date().getFullYear();
  let maxN=0;
  // Из Rechnungen — поле nr
  (data.rechnungen||[]).forEach(r=>{
    const n=_parseSeqNr(r.nr);
    if(n>maxN) maxN=n;
  });
  // Из Einträge — поле belegnr
  (data.eintraege||[]).forEach(e=>{
    if(e.is_storno||e._storniert) return;
    const n=_parseSeqNr(e.belegnr);
    if(n>maxN) maxN=n;
  });
  return yr+'-'+(maxN+1);
}

// Проверяет, заблокирован ли номер (занят оплаченным документом)
// Возвращает описание блокировки или null если свободен
function isNrLocked(nr, excludeRechId, excludeEintragId){
  if(!nr) return null;
  const seq=_parseSeqNr(nr);
  if(seq===0) return null;
  // При редактировании Rechnung — находим её текущий seq, чтобы не блокировать свой собственный номер
  let excludeSeqFromRech=0;
  if(excludeRechId){
    const exR=(data.rechnungen||[]).find(r=>r.id===excludeRechId);
    if(exR) excludeSeqFromRech=_parseSeqNr(exR.nr);
  }
  // Проверяем Rechnungen со статусом bezahlt
  const lockedRech=(data.rechnungen||[]).find(r=>{
    if(excludeRechId && r.id===excludeRechId) return false;
    return _parseSeqNr(r.nr)===seq && r.status==='bezahlt';
  });
  if(lockedRech) return `Nr. ${lockedRech.nr} ist bereits durch eine bezahlte Rechnung belegt.`;
  // Проверяем Einnahmen (belegnr)
  // Пропускаем Einnahmen с тем же seq, что и редактируемая Rechnung (связанная пара)
  const lockedEin=(data.eintraege||[]).find(e=>{
    if(excludeEintragId && e.id===excludeEintragId) return false;
    if(e.is_storno||e._storniert) return false;
    if(e.typ!=='Einnahme') return false;
    const eSeq=_parseSeqNr(e.belegnr);
    if(excludeSeqFromRech>0 && eSeq===excludeSeqFromRech && eSeq===seq) return false;
    return eSeq===seq;
  });
  if(lockedEin) return `Nr. ${nr} ist bereits durch eine gebuchte Einnahme belegt.`;
  return null;
}
// При смене даты в форме Rechnung — обновляем год в номере (только если не редактирование)
function _rechDatumNrSync(){
  if(editRechId) return; // при редактировании не трогаем номер
  const nrEl=document.getElementById('rn-nr');
  const datEl=document.getElementById('rn-dat');
  if(!nrEl||!datEl) return;
  const curNr=nrEl.value.trim();
  const newYr=datEl.value?.substring(0,4);
  if(!newYr||newYr.length!==4) return;
  const seq=_parseSeqNr(curNr);
  if(seq>0) nrEl.value=newYr+'-'+seq;
}
function saveRechnung(){
  const nr=document.getElementById('rn-nr').value.trim();
  const datum=document.getElementById('rn-dat').value;
  const positionen=getRechPositionen();
  const brutto=r2(positionen.reduce((s,p)=>s+p.menge*p.brutto,0));
  const netto =r2(positionen.reduce((s,p)=>s+p.menge*p.netto,0));
  const mwst  =r2(brutto-netto);
  const betrag=brutto;
  const dsc=positionen.map(p=>p.bez).join(', ')||document.getElementById('rn-kunde').value.trim();
  const status = document.getElementById('rn-status').value;
  if(status !== 'entwurf' && !nr)
    return toast('Rechnungs-Nr. ist erforderlich (nur Entwürfe können ohne Nr. gespeichert werden)','err');
  if(!betrag||!datum)return toast('Datum und mind. 1 Position erforderlich!','err');
  if(!data.rechnungen)data.rechnungen=[];
  // Проверка блокировки номера (занят оплаченным документом)
  const lockMsg=isNrLocked(nr, editRechId, null);
  if(lockMsg) return toast(lockMsg,'err');
  const obj={
    nr, betrag:Math.round(betrag*100)/100,
    beschreibung:dsc,
    datum,
    faellig:document.getElementById('rn-faellig').value,
    leistungsdatum:document.getElementById('rn-leistung')?.value||'',
    status:document.getElementById('rn-status').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
    notiz:document.getElementById('rn-notiz').value.trim(),
    leitwegId:document.getElementById('rn-leitweg')?.value.trim()||'',
    kundeId:document.getElementById('rn-nr').dataset.kundeId||'',
    positionen,
    netto, mwstBetrag:mwst, mwstRate:positionen.length>0?(positionen.find(p=>p.rate>0)?.rate||0):0, mwstMode:isKleinunternehmer(datum?datum.substring(0,4):new Date().getFullYear()+'')?'§19':'regel'
  };
  if(editRechId){
    const r=data.rechnungen.find(x=>x.id===editRechId);
    if(r){
      const altWert={nr:r.nr,betrag:r.betrag,status:r.status,kunde:r.kunde,faellig:r.faellig};
      const wasNotBezahlt = r.status !== 'bezahlt';
      Object.assign(r,obj);
      sbSaveRechnung(r);
      sbLogRechnung(r,'geaendert',altWert,{nr:r.nr,betrag:r.betrag,status:r.status,kunde:r.kunde,faellig:r.faellig});
      // Wenn neu auf bezahlt gesetzt → Einnahme automatisch buchen
      if(wasNotBezahlt && r.status==='bezahlt'){
        const newE = _buchRechnungAlsEinnahme(r);
        if(newE){
          sbLogRechnung(r,'bezahlt',{status:altWert.status},{status:'bezahlt',einnahme_betrag:r.betrag});
          // Сбрасываем фильтры Einträge
          const _fjEl2 = document.getElementById('f-jahr');
          if(_fjEl2) _fjEl2.value = newE.datum.substring(0,4);
          const _fmEl2 = document.getElementById('f-mon');
          if(_fmEl2) _fmEl2.value = 'Alle';
          if(typeof einPage !== 'undefined') einPage = 1;
          if(typeof fTyp !== 'undefined') fTyp = 'Alle';
          document.querySelectorAll('.ftab').forEach(b=>b.classList.remove('active'));
          const _allTab = document.querySelector('.ftab[onclick*="Alle"]');
          if(_allTab) _allTab.classList.add('active');
          renderAll();
          if(typeof renderDash === 'function') renderDash();
        }
      }
    }
    editRechId=null;
  } else {
    const seq=_parseSeqNr(nr);
    const dupNr = (data.rechnungen||[]).find(r=>_parseSeqNr(r.nr)===seq);
    if(dupNr) return toast(`Rechnungs-Nr. ${nr} bereits vergeben!`,'err');
    const dupEin = (data.eintraege||[]).find(e=>!e.is_storno&&!e._storniert&&e.typ==='Einnahme'&&_parseSeqNr(e.belegnr)===seq);
    if(dupEin) return toast(`Nr. ${nr} ist bereits durch eine Einnahme belegt!`,'err');
    const newR={id:Date.now()+'_'+Math.random().toString(36).slice(2,6), ...obj};
    data.rechnungen.push(newR);
    sbSaveRechnung(newR);
    sbLogRechnung(newR, 'erstellt', null, {nr:newR.nr, betrag:newR.betrag, kunde:newR.kunde, status:newR.status});
    // Если сразу bezahlt — буксуем Einnahme
    if(newR.status === 'bezahlt'){
      const _newE2 = _buchRechnungAlsEinnahme(newR);
      if(_newE2){
        const _fjEl3 = document.getElementById('f-jahr');
        if(_fjEl3) _fjEl3.value = _newE2.datum.substring(0,4);
        const _fmEl3 = document.getElementById('f-mon');
        if(_fmEl3) _fmEl3.value = 'Alle';
        if(typeof einPage !== 'undefined') einPage = 1;
        if(typeof fTyp !== 'undefined') fTyp = 'Alle';
        document.querySelectorAll('.ftab').forEach(b=>b.classList.remove('active'));
        const _allTab2 = document.querySelector('.ftab[onclick*="Alle"]');
        if(_allTab2) _allTab2.classList.add('active');
      }
    }
  }
  renderRech(); closeRechForm();
  if(typeof renderAll === 'function') renderAll();
  if(typeof renderDash === 'function') renderDash();
  toast('✓ Rechnung gespeichert!','ok'); checkMahnungen();
}
async function rechAusstellen(id) {
  const r = data.rechnungen.find(x=>x.id===id);
  if (!r) return;
  const ok = await appConfirm(
    `Entwurf ${r.nr} als offene Rechnung ausstellen?

Nach dem Ausstellen gelten GoBD-Regeln — Änderungen nur noch per Storno möglich.`,
    {title:'📄 Rechnung ausstellen', okLabel:'Ja, ausstellen', cancelLabel:'Abbrechen'}
  );
  if (!ok) return;
  if (!r.nr || r.nr.trim() === '') {
    r.nr = autoRechNr(new Date().getFullYear());
  }
  r.status = 'offen';
  if (!r.datum) r.datum = new Date().toISOString().split('T')[0];
  sbSaveRechnung(r);
  sbLogRechnung(r, 'ausgestellt', {status:'entwurf'}, {status:'offen', nr:r.nr});
  renderRech();
  toast(`✓ Rechnung ${r.nr} ausgestellt`, 'ok');
}

async function rechBezahlt(id){
  const r=data.rechnungen.find(x=>x.id===id);if(!r)return;
  if(r.status==='storniert' || r._storniert){
    toast('Stornierte Rechnungen können nicht als bezahlt markiert werden','err');
    return;
  }
  if(r.status==='bezahlt'){
    toast('Diese Rechnung ist bereits als bezahlt markiert','err');
    return;
  }
  const ok = await appConfirm(
    `Rechnung ${r.nr} auf bezahlt setzen und Einnahme ${fmt(r.betrag)} automatisch buchen?`,
    {title:'Rechnung bezahlt', icon:'✅', okLabel:'Ja, bezahlt + Einnahme', cancelLabel:'Abbrechen'}
  );
  if(!ok) return;
  r.status='bezahlt';
  sbSaveRechnung(r);
  const newE = _buchRechnungAlsEinnahme(r);
  // Сбрасываем фильтры Einträge чтобы новая запись точно была видна
  const _curYr = new Date().getFullYear()+'';
  const _fjEl  = document.getElementById('f-jahr');
  const _fmEl  = document.getElementById('f-mon');
  if(_fjEl) _fjEl.value = _curYr;
  if(_fmEl) _fmEl.value = 'Alle';
  if(typeof einPage !== 'undefined') einPage = 1;

  if(newE){
    sbLogRechnung(r,'bezahlt',{status:'offen'},{status:'bezahlt',einnahme_betrag:r.betrag,datum_bezahlt:newE.datum});
    // Убеждаемся что запись в data.eintraege
    if (!data.eintraege.find(e => e.id === newE.id)) {
      data.eintraege.unshift(newE);
    }
    // Сбрасываем сортировку на created_at — новая запись будет первой
    if (typeof sortCol !== 'undefined') { sortCol = 'created_at'; sortAsc = false; }
    // Сбрасываем все фильтры Einträge
    if (typeof fTyp !== 'undefined') fTyp = 'Alle';
    if (typeof einPage !== 'undefined') einPage = 1;
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    const allTab = document.querySelector('.ftab[onclick*="Alle"]');
    if (allTab) allTab.classList.add('active');
    const _fmEl = document.getElementById('f-mon');
    if (_fmEl) _fmEl.value = 'Alle';
    const _fkEl = document.getElementById('f-kat');
    if (_fkEl) _fkEl.value = 'Alle';
    const _fzEl = document.getElementById('f-zahl');
    if (_fzEl) _fzEl.value = 'Alle';
    const _fqEl = document.getElementById('f-q');
    if (_fqEl) _fqEl.value = '';
    // Перезагружаем eintraege из Supabase чтобы гарантированно получить свежие данные
    renderAll();
    toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Rechnung ${r.nr} bezahlt · Einnahme ${fmt(r.betrag)} gebucht`,'ok');
    if (typeof sbRefreshEintraege === 'function') {
      sbRefreshEintraege().then(() => {
        const _fjEl = document.getElementById('f-jahr');
        if (_fjEl) _fjEl.value = 'Alle';
        if (typeof fTyp !== 'undefined') fTyp = 'Alle';
        if (typeof einPage !== 'undefined') einPage = 1;
        document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
        const _allTab = document.querySelector('.ftab[onclick*="Alle"]');
        if (_allTab) _allTab.classList.add('active');
        if (typeof renderEin === 'function') renderEin();
        if (typeof renderDash === 'function') renderDash();
        setTimeout(() => {
          const _newRow = document.getElementById('ein-row-' + newE.id);
          if (_newRow) _newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      });
    }
  } else {
    // Einnahme existiert bereits
    sbLogRechnung(r,'status',{status:'offen'},{status:'bezahlt'});
    window._forceFilterYear = new Date().getFullYear()+'';
    renderAll();
    toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Rechnung ${r.nr} als bezahlt markiert`,'ok');
  }
  checkMahnungen();
}
function _rechDuplizieren(id){
  const orig = data.rechnungen.find(r=>r.id===id); if(!orig) return;
  const newR = JSON.parse(JSON.stringify(orig));
  newR.id = 'r-' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
  // Новые ID для позиций чтобы не было конфликта primary key
  if (newR.positionen && newR.positionen.length) {
    newR.positionen = newR.positionen.map(p => ({
      ...p,
      id: 'pos-' + Date.now() + '_' + Math.random().toString(36).slice(2,6)
    }));
  }
  newR.nr = autoRechNr(new Date().getFullYear());
  newR.datum = new Date().toISOString().split('T')[0];
  newR.status = 'offen';
  newR.created_at = new Date().toISOString();
  // Убираем все флаги сторнирования из копии
  delete newR._storniert;
  delete newR.storniert_am;
  delete newR._storniert_am;
  delete newR.storno_von;
  newR.mahnung_history = [];
  delete newR.bezahlt_am;
  data.rechnungen.unshift(newR);
  if(typeof sbSaveRechnung==='function') sbSaveRechnung(newR);
  renderRech();
  toast('Rechnung dupliziert — als Entwurf gespeichert', 'ok');
}

async function delRech(id){
  const _rDel=data.rechnungen.find(r=>r.id===id); if(!_rDel) return;

  // Уже сторнирована — только просмотр
  if(_rDel.status==='storniert' || _rDel._storniert){
    showRechDetailReadonly(id);
    return;
  }

  // Черновик — можно удалить физически
  if(_rDel.status==='entwurf'){
    const _okDel = await appConfirm(
      `Entwurf "${_rDel.nr||'Entwurf'}" löschen?`,
      {title:'Entwurf löschen', icon:'🗑️', okLabel:'Löschen', danger:true}
    );
    if(!_okDel) return;
    sbLogRechnung(_rDel,'geloescht',{nr:_rDel.nr,betrag:_rDel.betrag,status:_rDel.status,kunde:_rDel.kunde},null);
    data.rechnungen=(data.rechnungen||[]).filter(r=>r.id!==id);
    if(typeof sbDeleteRechnung==='function') sbDeleteRechnung(id);
    renderRech();
    toast(`Entwurf gelöscht`,'ok');
    return;
  }

  // Все остальные статусы (offen, bezahlt, ueberfaellig) → только Stornieren
  const warBezahlt = _rDel.status==='bezahlt';
  const confirmMsg = warBezahlt
    ? `Rechnung ${_rDel.nr} stornieren?
⚠ Diese Rechnung ist bezahlt — die zugehörige Einnahme wird ebenfalls storniert (GoBD §146).`
    : `Rechnung ${_rDel.nr} stornieren?

Gemäß GoBD §146 kann die Rechnung nicht gelöscht werden. Sie wird als storniert markiert und bleibt im System sichtbar.`;
  const _okR = await appConfirm(confirmMsg, {
    title:'Rechnung stornieren', icon:'↩️', okLabel:'Stornieren (GoBD)', danger:true
  });
  if(!_okR) return;

  // Стornируем связанную Einnahme если bezahlt
  if(warBezahlt){
    const linkedE = data.eintraege.find(e =>
      e.beschreibung && e.beschreibung.includes(`Rechnung ${_rDel.nr}:`) && !e.is_storno && !e._storniert
    );
    if(linkedE){
      const storno = await sbStornoEintrag(linkedE.id);
      if(storno) data.eintraege.push(storno);
    }
  }

  // Помечаем рехнунг как сторнированный (НЕ удаляем)
  _rDel.status = 'storniert';
  _rDel._storniert = true;
  _rDel._storniert_am = new Date().toISOString();
  sbSaveRechnung(_rDel);
  sbLogRechnung(_rDel,'storniert',{status:warBezahlt?'bezahlt':'offen'},{status:'storniert'});

  renderRech();
  renderAll();
  toast(`↩️ Rechnung ${_rDel.nr} storniert (GoBD §146) — Rechnung bleibt als storniert sichtbar`,'ok');
}
// ── RECHNUNG POSITIONEN ───────────────────────────────────────────────────

// Хелпер: округление до 2 знаков без ошибок float


// USt-Modus je Jahr
// Обновляем баннер в модале счёта
function updateRechBanner(){
  const el = document.getElementById('rn-ust-banner');
  if(!el) return;
  const rBannerYr=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  if(isKleinunternehmer(rBannerYr)){
    el.style.display='';
    el.style.background='rgba(34,197,94,.08)';
    el.style.border='1px solid var(--green)';
    el.style.color='var(--green)';
    el.innerHTML='✓ §19 UStG Kleinunternehmer — alle Positionen ohne USt. <a href="#" onclick="closeRechForm();nav(\'ust\',document.querySelector(\'.nav-item[onclick*=ust]\'))" style="color:var(--green);text-decoration:underline;font-size:11px">Ändern im USt-Bereich</a>';
  } else {
    el.style.display='';
    el.style.background='rgba(59,130,246,.08)';
    el.style.border='1px solid var(--blue)';
    el.style.color='var(--blue)';
    el.innerHTML=' MwSt — USt wird pro Position berechnet.';
  }
}

const INP = 'background:var(--s2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);padding:7px 8px;font-size:12px;outline:none;width:100%';

function setRechPositionen(arr){
  const el=document.getElementById('rn-positionen');
  el.innerHTML='';
  updateRechBanner();
  arr.forEach((p,i)=>addRechPosRow(i,p));
  calcRechTotal();
}
function reRenderRechPos(){
  // Перерисовываем позиции с текущим годом (для правильного klein/regel)
  const rows = Array.from(document.querySelectorAll('.rn-pos-row'));
  const current = rows.map(row => {
    const inputs = row.querySelectorAll('input');
    return {
      bez:    inputs[0].value.trim(),
      menge:  parseFloat(inputs[1].value)||1,
      netto:  parseFloat(inputs[2].value)||0,
      rate:   parseFloat(inputs[3]?.value)||19,
      brutto: parseFloat(inputs[4]?.value)||0,
    };
  });
  if(current.length) setRechPositionen(current);
}
function addRechPos(){
  const rows=document.querySelectorAll('.rn-pos-row');
  addRechPosRow(rows.length,{bez:'',menge:1,netto:'',rate:19,brutto:''});
  calcRechTotal();
}

function addRechPosRow(i,p){
  const div=document.createElement('div');
  div.className='rn-pos-row';
  const mob = isMob();
  const rDatumYr=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein = isKleinunternehmer(rDatumYr);
  // Совместимость со старым форматом (preis = нетто)
  const nettoVal = p.netto !== undefined ? p.netto : (p.preis||'');
  const rateVal  = p.rate  !== undefined ? p.rate  : 19;
  const bruttoVal= p.brutto !== undefined && p.brutto !== ''
    ? p.brutto
    : (nettoVal !== '' ? calcBrutto(parseFloat(nettoVal)||0, klein?0:rateVal) : '');

  if (mob) {
    // Мобильный layout: Bezeichnung на всю ширину, числа в строку
    div.style.cssText='margin-bottom:8px;';
    div.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:10px;color:var(--sub);font-weight:600;text-transform:uppercase;letter-spacing:.4px">Position ${i+1}</span>
        <button onclick="this.closest('.rn-pos-row').remove();calcRechTotal()" style="background:none;border:none;color:var(--sub);cursor:pointer;font-size:18px;padding:0;line-height:1">✕</button>
      </div>
      <input type="text" placeholder="Bezeichnung / Leistung" value="${p.bez||''}" oninput="calcRechTotal()" style="${INP};font-size:14px;width:100%;box-sizing:border-box;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr 80px 1fr;gap:6px;align-items:end">
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Menge</div>
          <input type="number" placeholder="1" value="${p.menge||1}" min="0.01" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:center;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Netto/St.</div>
          <input type="number" placeholder="0.00" value="${nettoVal}" min="0" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:right;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">USt %</div>
          <div class="ust-flag-wrap" style="position:relative;${klein?'opacity:.4;pointer-events:none':''}">
            <button type="button" class="ust-flag-btn" onclick="toggleAngUstDropdown(this)"
              style="display:flex;align-items:center;justify-content:space-between;gap:5px;width:100%;padding:7px 8px;border-radius:var(--r);border:1px solid var(--border);background:var(--s2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-sizing:border-box">
              <span style="display:flex;align-items:center;gap:4px">
                <span class="flag-circle" style="width:1.3em;height:1.3em"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>
                <span class="ust-flag-label">${rateVal}%</span>
              </span>
              <i class="fas fa-chevron-down" style="font-size:9px;color:var(--sub)"></i>
            </button>
            <input type="hidden" class="ust-flag-val rn-ust-hidden" value="${rateVal}" oninput="posRateChanged(this)">
            <div class="ust-flag-panel" style="display:none;position:absolute;left:0;top:calc(100% + 4px);background:var(--s1);border:1px solid var(--border);border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.06);z-index:300;padding:4px;min-width:110px">
              <div onclick="setRechUstRate(this,0)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>0%</div>
              <div onclick="setRechUstRate(this,7)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>7%</div>
              <div onclick="setRechUstRate(this,19)" style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>19%</div>
            </div>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Brutto/St.</div>
          <input type="number" placeholder="0.00" value="${bruttoVal!==''?parseFloat(bruttoVal).toFixed(2):''}" min="0" step="0.01" oninput="posBruttoChanged(this)" style="${INP};text-align:right;color:var(--blue);width:100%;box-sizing:border-box">
        </div>
      </div>`;
  } else {
    // Desktop layout: оригинальный grid
    div.style.cssText='display:grid;grid-template-columns:1fr 60px 90px 90px 90px 28px;gap:6px;margin-bottom:6px;align-items:center';
    div.innerHTML=`
      <input type="text"   placeholder="Bezeichnung" value="${p.bez||''}" oninput="calcRechTotal()" style="${INP};font-size:13px">
      <input type="number" placeholder="Menge" value="${p.menge||1}" min="0.01" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:center">
      <input type="number" placeholder="Netto" value="${nettoVal}" min="0" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:right">
      <div class="ust-flag-wrap" style="position:relative;${klein?'opacity:.4;pointer-events:none':''}">
        <button type="button" class="ust-flag-btn" onclick="toggleAngUstDropdown(this)"
          style="display:flex;align-items:center;justify-content:space-between;gap:5px;width:100%;padding:7px 8px;border-radius:var(--r);border:1px solid var(--border);background:var(--s2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-sizing:border-box">
          <span style="display:flex;align-items:center;gap:4px">
            <span class="flag-circle" style="width:1.3em;height:1.3em"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>
            <span class="ust-flag-label">${rateVal}%</span>
          </span>
          <i class="fas fa-chevron-down" style="font-size:9px;color:var(--sub)"></i>
        </button>
        <input type="hidden" class="ust-flag-val rn-ust-hidden" value="${rateVal}" oninput="posRateChanged(this)">
        <div class="ust-flag-panel" style="display:none;position:absolute;left:0;top:calc(100% + 4px);background:var(--s1);border:1px solid var(--border);border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.06);z-index:300;padding:4px;min-width:110px">
          <div onclick="setRechUstRate(this,0)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>0%</div>
          <div onclick="setRechUstRate(this,7)"  style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>7%</div>
          <div onclick="setRechUstRate(this,19)" style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''"><span class="flag-circle"><span class="band black"></span><span class="band red"></span><span class="band gold"></span></span>19%</div>
        </div>
      </div>
      <input type="number" placeholder="Brutto" value="${bruttoVal!==''?parseFloat(bruttoVal).toFixed(2):''}" min="0" step="0.01" oninput="posBruttoChanged(this)" style="${INP};text-align:right;color:var(--blue)">
      <button onclick="this.closest('.rn-pos-row').remove();calcRechTotal()" style="background:none;border:none;color:var(--sub);cursor:pointer;font-size:16px;padding:0"><i class="fas fa-trash"></i></button>`;
  }
  document.getElementById('rn-positionen').appendChild(div);
}

// Вводим Netto → пересчитываем Brutto
function posNettoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input');
  const menge =parseFloat(inputs[1].value)||1;
  const netto =parseFloat(inputs[2].value)||0;
  const rate  =parseFloat(inputs[3].value)||0;
  const rnYr1=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const brutto=calcBrutto(netto,isKleinunternehmer(rnYr1)?0:rate);
  inputs[4].value=brutto.toFixed(2);
  calcRechTotal();
}
// Меняем ставку → пересчитываем Brutto из Netto
function posRateChanged(sel){
  const row=sel.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input');
  const netto=parseFloat(inputs[2].value)||0;
  const rate =parseFloat(sel.value)||0;
  const rnYr2=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  inputs[4].value=calcBrutto(netto,isKleinunternehmer(rnYr2)?0:rate).toFixed(2);
  calcRechTotal();
}
// Вводим Brutto → пересчитываем Netto
function posBruttoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input');
  const brutto=parseFloat(inputs[4].value)||0;
  const rate  =parseFloat(inputs[3].value)||0;
  const rnYr3=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const netto =calcNetto(brutto, isKleinunternehmer(rnYr3)?0:rate);
  inputs[2].value=netto.toFixed(2);
  calcRechTotal();
}

// Главный расчёт итога + группировка по ставкам
function calcRechTotal(){
  const rnYr4=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(rnYr4);
  // Группируем: { rate: {netto, mwst} }
  const groups={};
  let totalNetto=0;
  let totalMwst=0;

  document.querySelectorAll('.rn-pos-row').forEach(row=>{
    const inputs=row.querySelectorAll('input');
    const menge =parseFloat(inputs[1].value)||0;
    const netto =parseFloat(inputs[2].value)||0;
    const rate  =klein?0:parseFloat(inputs[3].value)||0;
    const lineNetto = r2(menge*netto);
    const lineMwst  = r2(lineNetto*rate/100);
    totalNetto+=lineNetto;
    totalMwst+=lineMwst;
    if(!groups[rate]) groups[rate]={netto:0,mwst:0};
    groups[rate].netto = r2(groups[rate].netto+lineNetto);
    groups[rate].mwst  = r2(groups[rate].mwst+lineMwst);
  });

  totalNetto=r2(totalNetto);
  totalMwst=r2(totalMwst);
  const totalBrutto=r2(totalNetto+totalMwst);
  document.getElementById('rn-bet').value=totalBrutto.toFixed(2);

  // Строим summary
  const el=document.getElementById('rn-summary');
  if(!el) return;
  let rows='';
  const rates=Object.keys(groups).map(Number).sort((a,b)=>b-a);

  if(klein){
    rows=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
      <span style="font-size:14px;color:var(--sub)">Netto-Summe</span>
      <span style="font-family:var(--mono);font-size:14px">${fmt(totalNetto)}</span>
    </div>
    <div style="font-size:14px;color:var(--green);margin-bottom:6px">§19 UStG — keine Umsatzsteuer</div>`;
  } else {
    const totNetto=rates.reduce((s,r)=>s+groups[r].netto,0);
    const totMwst =rates.reduce((s,r)=>s+groups[r].mwst,0);
    rows+=`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;color:var(--sub)">
      <span>Netto gesamt</span><span style="font-family:var(--mono)">${fmt(r2(totNetto))}</span></div>`;
    rates.forEach(rate=>{
      const g=groups[rate];
      if(g.netto===0&&g.mwst===0) return;
      rows+=`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:14px;color:var(--sub)">
        <span>USt. ${rate}% (auf ${fmt(g.netto)})</span>
        <span style="font-family:var(--mono);color:var(--red)">+ ${fmt(g.mwst)}</span>
      </div>`;
    });
  }

  el.innerHTML=rows+`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 4px;border-top:2px solid var(--border);margin-top:4px">
    <strong style="font-size:14px">Gesamtbetrag (Brutto)</strong>
    <strong style="font-family:var(--mono);font-size:14px;color:var(--blue)">${fmt(totalBrutto)}</strong>
  </div>`;
}

function _getRnRate(row){
  const h=row.querySelector('.rn-ust-hidden');
  return h?parseFloat(h.value)||0:19;
}

function getRechPositionen(){
  const pos=[];
  const rnYr5=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(rnYr5);
  document.querySelectorAll('.rn-pos-row').forEach(row=>{
    const inputs=row.querySelectorAll('input[type=text],input[type=number]');
    const bez   =inputs[0]?.value.trim()||'';
    const menge =parseFloat(inputs[1]?.value)||1;
    const netto =parseFloat(inputs[2]?.value)||0;
    const rate  =klein?0:_getRnRate(row);
    const brutto=parseFloat(inputs[3]?.value)||calcBrutto(netto,rate);
    if(bez||netto) pos.push({bez,menge,netto,rate,brutto,preis:netto});
  });
  return pos;
}

// ── RECHNUNG DRUCKEN / PDF ────────────────────────────────────────────────
function buildRechnungHTML(r){
  const f = getFirmaData();
  const firmaName    = f.name    || 'Meine Firma';
  const firmaAdresse = [f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '';
  const firmaKontakt = [f.tel ? 'Tel: '+f.tel : '', f.email].filter(Boolean).join(' · ');
  const firmaBank    = [f.iban ? 'IBAN: '+f.iban : '', f.bic ? 'BIC: '+f.bic : ''].filter(Boolean).join(' · ');
  const firmaExtra   = f.rechnung_footer || '';
  const USt = 'Kleinunternehmer gem. § 19 UStG — keine USt ausgewiesen';
  const pos = r.positionen&&r.positionen.length ? r.positionen : [{bez:r.beschreibung||'Leistung',menge:1,preis:r.betrag}];
  const total = pos.reduce((s,p)=>s+(p.menge*p.preis),0);
  const faellig = r.faellig ? `<p style="margin:4px 0"><strong>Fällig bis:</strong> ${fd(r.faellig)}</p>` : '';
  const notiz = r.notiz ? `<p style="margin-top:20px;padding:12px;background:#f8f9fa;border-left:3px solid #3b82f6;font-size:13px">${r.notiz}</p>` : '';
  // calculateTotals() — группировка по ставкам
  const isKlein = !r.mwstMode || r.mwstMode==='§19';
  const groups={};
  pos.forEach(p=>{
    const netto=p.netto!==undefined?p.netto:p.preis;
    const rate=isKlein?0:(p.rate||0);
    const lineN=r2((p.menge||1)*netto);
    const lineM=r2(lineN*rate/100);
    if(!groups[rate]) groups[rate]={netto:0,mwst:0};
    groups[rate].netto=r2(groups[rate].netto+lineN);
    groups[rate].mwst =r2(groups[rate].mwst+lineM);
  });
  const totNetto=Object.values(groups).reduce((s,g)=>s+g.netto,0);
  const totMwst =Object.values(groups).reduce((s,g)=>s+g.mwst,0);
  const totBrutto=r2(totNetto+totMwst);

  const _hasRabatt = pos.some(p => parseFloat(p.rabatt) > 0);
  const posRows = pos.map(p=>{
    const netto=p.netto!==undefined?p.netto:p.preis;
    const rate=isKlein?0:(p.rate||0);
    const lineN=r2((p.menge||1)*netto);
    const rab    = parseFloat(p.rabatt)||0;
    const rabStr = rab>0 ? (p.rabattTyp==='%' ? `−${rab}%` : `−${fmt(rab)}`) : '';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.bez}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.menge}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(netto)}</td>
      ${_hasRabatt ? `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;color:#e85d04">${rabStr}</td>` : ''}
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;color:#888">${isKlein?'§19':rate+'%'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(lineN)}</td>
    </tr>`;
  }).join('');

  // Строки итога по ставкам
  const summaryRows = isKlein ? '' : Object.keys(groups).map(Number).sort((a,b)=>b-a).map(rate=>{
    const g=groups[rate];
    if(g.netto===0) return '';
    return `<tr><td colspan="4" style="padding:4px 12px;font-size:12px;color:#666">Netto ${rate}%: ${fmt(g.netto)}</td>
             <td style="padding:4px 12px;text-align:right;font-size:12px;color:#666">USt ${rate}%: +${fmt(g.mwst)}</td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title style="font-size: 18px">Rechnung ${r.nr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:0 auto}
    @media print{body{padding:20px}button{display:none!important}}
    h1{font-size:28px;font-weight:700;color:#1e3a5f;margin-bottom:4px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1e3a5f}
    .firma-info{font-size:12px;color:#555;line-height:1.6}
    .rech-nr{text-align:right}
    .rech-nr h2{font-size:20px;color:#1e3a5f;margin-bottom:6px}
    .rech-nr p{font-size:12px;color:#555;margin:2px 0}
    .kunde-box{background:#f8f9fa;padding:16px;border-radius:6px;margin-bottom:24px;min-height:80px}
    .kunde-box strong{font-size:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    thead{background:#1e3a5f;color:#fff}
    thead th{padding:10px 12px;text-align:left;font-size:12px}
    thead th:nth-child(2){text-align:center}
    thead th:nth-child(3){text-align:right}thead th:nth-child(4){text-align:center}thead th:nth-child(5){text-align:right}
    .total-row td{padding:12px;font-size:15px;font-weight:700;background:#f0f4ff;border-top:2px solid #1e3a5f}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#888;line-height:1.8;text-align:center}
    .btn-bar{display:flex;gap:10px;margin-bottom:24px}
    .btn-print{padding:10px 20px;background:#1e3a5f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
    .btn-close{padding:10px 20px;background:#e5e7eb;border:none;border-radius:6px;cursor:pointer;font-size:13px}
  </style></head><body>
  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()"><i class="fas fa-print"></i>️ Drucken / Als PDF speichern</button>
    <button class="btn-close" onclick="window.close()">✕ Schließen</button>
  </div>
  <div class="header">
    <div>
      <h1>${firmaName}</h1>
      <div class="firma-info">${firmaAdresse}<br>${firmaKontakt}</div>
    </div>
    <div class="rech-nr">
      <h2>RECHNUNG</h2>
      <p><strong>Nr.:</strong> ${r.nr}</p>
      <p><strong>Datum:</strong> ${fd(r.datum)}</p>
      ${faellig}
    </div>
  </div>
  <div class="kunde-box">
    <strong>${r.kunde||'—'}</strong><br>
    <span style="font-size:12px;color:#555">${r.adresse||''}</span>
    ${r.tel ? `<br><span style="font-size:12px;color:#555">Tel: ${r.tel}</span>` : ''}
  </div>
  <table>
    <thead><tr><th>Leistung / Beschreibung</th><th style="text-align:center">Menge</th><th style="text-align:right">Netto/Stk.</th><th style="text-align:center">USt</th><th style="text-align:right">Gesamt Netto</th></tr></thead>
    <tbody>${posRows}</tbody>
    <tfoot>${summaryRows}<tr class="total-row"><td colspan="${isKlein?4:3}">Netto-Summe${isKlein?'':''}</td><td style="text-align:right">${fmt(totNetto)}</td></tr>${isKlein?'':`<tr style="background:#fff8f0"><td colspan="4" style="padding:8px 12px;font-size:13px">USt. gesamt</td><td style="padding:8px 12px;text-align:right;font-size:13px;color:#e53935">+${fmt(totMwst)}</td></tr>`}<tr class="total-row"><td colspan="4"><strong>Gesamtbetrag (Brutto)</strong></td><td style="text-align:right"><strong>${fmt(totBrutto)}</strong></td></tr></tfoot>
  </table>
  <p style="font-size:11px;color:#888;margin-bottom:8px">${isKlein?USt:'Umsatzsteuer-Ausweis gem. §14 UStG'}</p>
  ${notiz}
  <div class="footer">${[firmaBank, firmaExtra].filter(Boolean).join('<br>')}</div>
  </body></html>`;
}

function druckRechnung(){
  const pos=getRechPositionen();
  if(!pos.length){toast('Bitte mind. eine Position hinzufügen','err');return;}
  const nr=document.getElementById('rn-nr').value.trim();
  const datum=document.getElementById('rn-dat').value;
  if(!nr||!datum){toast('Rechnungs-Nr. und Datum erforderlich','err');return;}
  const total=pos.reduce((s,p)=>s+p.menge*(p.netto||p.preis||0),0);
  const r={
    nr, datum,
    faellig:document.getElementById('rn-faellig').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
    notiz:document.getElementById('rn-notiz').value.trim(),
    positionen:pos, betrag:total
  };
  openRechnungPrint(r);
}
// ── HTML-Vorschau einer gespeicherten Rechnung öffnen ─────────────────────
function vorschauRechnungId(id) {
  const r = data.rechnungen.find(x => x.id === id);
  if (!r) return;
  // Используем _buildRechnungHTML — красивая форма как для PDF/ZUGFeRD
  const html = typeof _buildRechnungHTML === 'function'
    ? _buildRechnungHTML(r)
    : buildRechnungHTML(r);
  const modal = document.getElementById('vorschau-modal');
  const frame = document.getElementById('vorschau-frame');
  if (!modal || !frame) {
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    return;
  }
  // Заголовок модала
  const titleEl = modal.querySelector('.fas.fa-eye')?.parentElement;
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-eye" style="color:var(--blue)"></i> Vorschau — Rechnung ' + (r.nr || '');
  frame.srcdoc = html;
  window._vorschauHTML = html;
  window._vorschauType = 'rechnung';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function druckRechnungId(id){
  const r=data.rechnungen.find(x=>x.id===id);
  if(!r)return;
  openRechnungPrint(r);
}
function openRechnungPrint(r){
  const win=window.open('','_blank','width=900,height=700');
  const html = buildRechnungHTML(r);
  win.document.write(html);
  win.document.close();
  // Диалог печати открывается автоматически после загрузки страницы
  win.addEventListener('load', () => { win.focus(); win.print(); });
}

// ── RECHNUNG PER E-MAIL ───────────────────────────────────────────────────
function emailRechnung(){
  const pos=getRechPositionen();
  const total=pos.reduce((s,p)=>s+p.menge*(p.netto||p.preis||0),0);
  const r={
    nr:document.getElementById('rn-nr').value.trim(),
    datum:document.getElementById('rn-dat').value,
    faellig:document.getElementById('rn-faellig').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
    notiz:document.getElementById('rn-notiz').value.trim(),
    positionen:pos, betrag:total
  };
  showEmailServicePicker(r);
}

function showEmailServicePicker(r) {
  document.getElementById('email-service-picker')?.remove();

  const firma = getFirmaData();
  const safeNr = (r.nr||'rechnung').replace(/[\/]/g,'-');
  const tmpl = getEmailTemplate();

  // Подставляем переменные в шаблон
  function fillTmpl(tpl) {
    return tpl
      .replace(/\{\{NR\}\}/g,      r.nr||'')
      .replace(/\{\{KUNDE\}\}/g,   r.kunde||'')
      .replace(/\{\{BETRAG\}\}/g,  fmt(r.betrag))
      .replace(/\{\{FAELLIG\}\}/g, r.faellig ? fd(r.faellig) : '')
      .replace(/\{\{FIRMA\}\}/g,   firma.name||'')
      .replace(/\{\{TEL\}\}/g,     firma.tel||'')
      // Удобные «условные» строки — если пусто убираем всю строку
      .replace(/\{\{KUNDE_ZEILE\}\}/g,  r.kunde  ? '\n\nSehr geehrte/r ' + r.kunde + ',' : '')
      .replace(/\{\{FAELLIG_ZEILE\}\}/g,r.faellig? '\nZahlungsziel: ' + fd(r.faellig) : '')
      .replace(/\{\{TEL_ZEILE\}\}/g,    firma.tel? '\nTel: ' + firma.tel : '');
  }

  const subject = encodeURIComponent(fillTmpl(tmpl.subject));
  const body    = encodeURIComponent(fillTmpl(tmpl.body));
  const to = r.email||'';

  const services = [
    { label: '\ud83d\udce7 Standard E-Mail', url: 'mailto:' + to + '?subject=' + subject + '&body=' + body },
    { label: 'Gmail',     url: 'https://mail.google.com/mail/?view=cm&to=' + to + '&su=' + subject + '&body=' + body },
    { label: 'Outlook',   url: 'https://outlook.live.com/mail/0/deeplink/compose?to=' + to + '&subject=' + subject + '&body=' + body },
    { label: 'Yahoo Mail',url: 'https://compose.mail.yahoo.com/?to=' + to + '&subject=' + subject + '&body=' + body },
  ];

  const overlay = document.createElement('div');
  overlay.id = 'email-service-picker';
  overlay.style.cssText = 'position:fixed;inset:0;background:#00000066;z-index:9999;display:flex;align-items:center;justify-content:center';

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--s1);border-radius:6px;padding:24px;width:320px;max-width:90vw;box-shadow:0 20px 60px #0004';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
  hdr.innerHTML = '<strong style="font-size:15px">E-Mail senden \u00fcber...</strong>';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:var(--sub)';
  closeBtn.onclick = function() { overlay.remove(); };
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  const hint = document.createElement('p');
  hint.style.cssText = 'font-size:12px;color:var(--sub);margin-bottom:14px';
  hint.textContent = 'PDF wird zuerst gespeichert. Dann bitte anh\u00e4ngen.';
  box.appendChild(hint);

  services.forEach(function(s) {
    const btn = document.createElement('button');
    btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;margin-bottom:8px;background:var(--s2);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:14px;color:var(--text);text-align:left';
    btn.textContent = s.label;
    btn.onclick = function() {
      overlay.remove();
      window.open(s.url, '_blank');
    };
    box.appendChild(btn);
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if(e.target===overlay) overlay.remove(); });

  generateRechnungPDF(r).then(function(doc) { doc.save('Rechnung_' + safeNr + '.pdf'); }).catch(function(){});
}



// ── FIRMA EINSTELLUNGEN ───────────────────────────────────────────────────
function openFirmaModal() {
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  const fields = ['name','strasse','plz','ort','tel','email','iban','bic','steuernr','ustid'];
  fields.forEach(k => {
    const el = document.getElementById('firma-' + k);
    if (el) el.value = p[k] || '';
  });
  const footer = document.getElementById('firma-footer');
  if (footer) footer.value = p.rechnung_footer || '';
  // Логотип — показываем превью если есть
  const prev  = document.getElementById('firma-logo-preview');
  const del   = document.getElementById('firma-logo-delete');
  const phIco = document.getElementById('firma-logo-placeholder-icon');
  if (p.logo) {
    if (prev)  { prev.src = p.logo; prev.style.display = 'block'; }
    if (phIco) { phIco.style.display = 'none'; }
    if (del)   { del.style.display = 'inline-flex'; }
  } else {
    if (prev)  { prev.style.display = 'none'; }
    if (phIco) { phIco.style.display = 'block'; }
    if (del)   { del.style.display = 'none'; }
  }
  // E-Mail Vorlage
  const tmpl = getEmailTemplate();
  const subEl = document.getElementById('email-tmpl-subject');
  const bodEl = document.getElementById('email-tmpl-body');
  if (subEl) subEl.value = tmpl.subject;
  if (bodEl) bodEl.value = tmpl.body;
  // Mahnung editor
  _populateMahnEditor();
  nav('firma', null);
  // Автопредпросмотр после открытия формы
  setTimeout(() => {
    if (typeof firmaVorschauRechnung === 'function') firmaVorschauRechnung();
    if (typeof firmaVorschauEmail    === 'function') firmaVorschauEmail();
  }, 200);
}

function closeFirmaForm() {
  nav('rechnungen', document.querySelector('.nav-item[onclick*="rechnungen"]:not([onclick*="form"])') || null);
}

// ── Предпросмотр Rechnung в Firmenprofil ───────────────────────────────────
function firmaVorschauRechnung() {
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  // Читаем текущие значения из формы (если форма открыта)
  const firma = {
    name:          document.getElementById('firma-name')?.value     || p.name     || 'Muster GmbH',
    strasse:       document.getElementById('firma-strasse')?.value  || p.strasse  || 'Musterstraße 1',
    plz:           document.getElementById('firma-plz')?.value      || p.plz      || '67547',
    ort:           document.getElementById('firma-ort')?.value      || p.ort      || 'Worms',
    tel:           document.getElementById('firma-tel')?.value      || p.tel      || '',
    email:         document.getElementById('firma-email')?.value    || p.email    || '',
    iban:          document.getElementById('firma-iban')?.value     || p.iban     || '',
    bic:           document.getElementById('firma-bic')?.value      || p.bic      || '',
    steuernr:      document.getElementById('firma-steuernr')?.value || p.steuernr || '',
    ustid:         document.getElementById('firma-ustid')?.value    || p.ustid    || '',
    rechnung_footer: document.getElementById('firma-footer')?.value || p.rechnung_footer || '',
    logo:          p.logo || null,
  };
  // Временно сохраняем в localStorage для buildRechnungHTML
  const _backup = localStorage.getItem('bp_firma');
  localStorage.setItem('bp_firma', JSON.stringify(firma));

  // Демо-рехнунг
  const today = new Date().toISOString().split('T')[0];
  const demoR = {
    nr: '2026-001',
    datum: today,
    faellig: new Date(Date.now() + 14*86400000).toISOString().split('T')[0],
    kunde: 'Musterkunde GmbH',
    adresse: 'Kundenstraße 5\n12345 Musterstadt',
    email: 'kunde@beispiel.de',
    tel: '+49 123 456789',
    notiz: 'Zahlbar innerhalb von 14 Tagen.',
    betrag: 1190.00,
    netto: 1000.00,
    mwstBetrag: 190.00,
    mwstRate: 19,
    mwstMode: null,
    positionen: [
      { bez: 'Webdesign & Entwicklung', menge: 1, netto: 600, brutto: 714, rate: 19, bezeichnung: 'Webdesign & Entwicklung' },
      { bez: 'SEO-Optimierung',          menge: 2, netto: 200, brutto: 238, rate: 19, bezeichnung: 'SEO-Optimierung' },
    ],
  };

  // Используем красивый шаблон _buildRechnungHTML (как для PDF)
  const html = typeof _buildRechnungHTML === 'function'
    ? _buildRechnungHTML(demoR)
    : buildRechnungHTML(demoR);

  // Восстанавливаем оригинальные данные
  if (_backup) localStorage.setItem('bp_firma', _backup);
  else localStorage.removeItem('bp_firma');

  const frame = document.getElementById('firma-rechnung-frame');
  if (frame) frame.srcdoc = html;
}

// ── Предпросмотр E-Mail в Firmenprofil ────────────────────────────────────
function firmaVorschauEmail() {
  const tmpl = getEmailTemplate();
  // Подставляем примерные данные
  const demoVars = {
    '{{NR}}':      '2026-001',
    '{{KUNDE}}':   'Musterkunde GmbH',
    '{{BETRAG}}':  '1.190,00 €',
    '{{FAELLIG}}': new Date(Date.now() + 14*86400000).toLocaleDateString('de-DE'),
    '{{FIRMA}}':   document.getElementById('firma-name')?.value || 'Ihre Firma',
    '{{TEL}}':     document.getElementById('firma-tel')?.value  || '+49 000 000000',
    '{{TAGE}}':    '5',
    '{{STUFE}}':   '1',
  };

  let subject = tmpl.subject || '';
  let body    = tmpl.body    || '';
  Object.entries(demoVars).forEach(([k, v]) => {
    subject = subject.replaceAll(k, v);
    body    = body.replaceAll(k, v);
  });

  const subEl  = document.getElementById('firma-email-preview-subject');
  const bodyEl = document.getElementById('firma-email-preview-body');
  if (subEl)  subEl.textContent  = subject || '—';
  if (bodyEl) bodyEl.textContent = body    || '—';
}

// Сжимаем изображение до maxW×maxH и maxKB — возвращает base64 или null
function compressLogo(file, maxW=300, maxH=150, maxKB=80) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve(null);
    if (file.size > 5 * 1024 * 1024) { toast('✗ Bild zu groß (max. 5 MB)', 'err'); return resolve(null); }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Масштабируем сохраняя пропорции
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // Сжимаем качество пока размер не вписывается
        let q = 0.85, b64;
        do { b64 = canvas.toDataURL('image/jpeg', q); q -= 0.05; }
        while (b64.length > maxKB * 1024 * 1.37 && q > 0.3);
        resolve(b64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Обработка выбора файла логотипа
async function onLogoChange(input) {
  const file = input.files[0];
  if (!file) return;
  toast('⏳ Logo wird verarbeitet...', 'ok');
  const b64 = await compressLogo(file);
  if (!b64) return;
  const prev = document.getElementById('firma-logo-preview');
  const del  = document.getElementById('firma-logo-delete');
  if (prev) { prev.src = b64; prev.style.display = 'block'; }
  if (del)  { del.style.display = 'inline-flex'; }
  // Сохраняем во временный атрибут — применится при Speichern
  input.dataset.b64 = b64;
  const kb = Math.round(b64.length * 0.75 / 1024);
  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Logo geladen (${kb} KB)`, 'ok');
}

// Удалить логотип
function deleteFirmaLogo() {
  const prev  = document.getElementById('firma-logo-preview');
  const del   = document.getElementById('firma-logo-delete');
  const phIco = document.getElementById('firma-logo-placeholder-icon');
  const input = document.getElementById('firma-logo-input');
  if (prev)  { prev.src = ''; prev.style.display = 'none'; }
  if (del)   { del.style.display = 'none'; }
  if (phIco) { phIco.style.display = 'block'; }
  if (input) { input.value = ''; delete input.dataset.b64; }
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  delete p.logo;
  localStorage.setItem('bp_firma', JSON.stringify(p));
  // Удаляем из Supabase
  if (currentUser) {
    sb.from('user_data').upsert({ user_id: currentUser.id, logo: null }, { onConflict: 'user_id' }).then(()=>{}).catch(()=>{});
  }
  toast('️ Logo entfernt', 'ok');
}

async function saveFirmaData() {
  const fields = ['name','strasse','plz','ort','tel','email','iban','bic','steuernr','ustid'];
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  fields.forEach(k => {
    const el = document.getElementById('firma-' + k);
    if (el) p[k] = el.value.trim();
  });
  const footer = document.getElementById('firma-footer');
  if (footer) p.rechnung_footer = footer.value.trim();
  p.kleinuntern = true;
  // Логотип — берём из dataset если был загружен новый
  const logoInput = document.getElementById('firma-logo-input');
  if (logoInput && logoInput.dataset.b64) {
    p.logo = logoInput.dataset.b64;
  }
  // Сохраняем в localStorage (быстрый доступ)
  localStorage.setItem('bp_firma', JSON.stringify(p));
  // Сохраняем ВСЁ в Supabase user_data (основное хранилище)
  if (currentUser) {
    try {
      const { error } = await sb.from('user_data').upsert({
        user_id:       currentUser.id,
        firma_name:    p.name            || null,
        firma_strasse: p.strasse         || null,
        firma_plz:     p.plz             || null,
        firma_ort:     p.ort             || null,
        firma_tel:     p.tel             || null,
        firma_email:   p.email           || null,
        firma_iban:    p.iban            || null,
        firma_bic:     p.bic             || null,
        firma_steuernr:p.steuernr        || null,
        firma_ustid:   p.ustid           || null,
        firma_footer:  p.rechnung_footer || null,
        logo:          p.logo            || null,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch(e) { console.warn('[firma save]', e); toast('⚠ Supabase-Fehler beim Speichern', 'err'); return; }
  }
  // Сохраняем E-Mail шаблон
  const subEl = document.getElementById('email-tmpl-subject');
  const bodEl = document.getElementById('email-tmpl-body');
  if (subEl || bodEl) {
    const tmpl = {
      subject: subEl ? subEl.value.trim() : '',
      body:    bodEl ? bodEl.value.trim() : '',
    };
    localStorage.setItem('bp_email_template', JSON.stringify(tmpl));
  }
  // Mahnung Vorlagen speichern
  saveMahnTemplates();
  toast('✓ Firmendaten gespeichert!', 'ok');
  closeFirmaForm();
}

function getEmailTemplate() {
  const DEFAULT_SUBJECT = 'Rechnung Nr. {{NR}} — {{FIRMA}}';
  const DEFAULT_BODY =
    'Sehr geehrte Damen und Herren,{{KUNDE_ZEILE}}\n\n' +
    'anbei erhalten Sie unsere Rechnung Nr. {{NR}} über {{BETRAG}}.{{FAELLIG_ZEILE}}\n\n' +
    'Bitte hängen Sie die soeben heruntergeladene PDF-Datei an diese E-Mail an.\n\n' +
    'Mit freundlichen Grüßen\n{{FIRMA}}{{TEL_ZEILE}}';
  try {
    const saved = JSON.parse(localStorage.getItem('bp_email_template') || '{}');
    return {
      subject: saved.subject || DEFAULT_SUBJECT,
      body:    saved.body    || DEFAULT_BODY,
    };
  } catch(e) {
    return { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY };
  }
}

function resetEmailTemplate() {
  localStorage.removeItem('bp_email_template');
  const tmpl = getEmailTemplate();
  const subEl = document.getElementById('email-tmpl-subject');
  const bodEl = document.getElementById('email-tmpl-body');
  if (subEl) subEl.value = tmpl.subject;
  if (bodEl) bodEl.value = tmpl.body;
  toast('✓ E-Mail Vorlage zurückgesetzt', 'ok');
}

// ── MAHNUNG TEMPLATES ────────────────────────────────────────────────────

const MAHN_DEFAULTS = [
  {
    subject: 'Zahlungserinnerung — Rechnung {{NR}}',
    body: 'Sehr geehrte Damen und Herren,\n\nhiermit möchten wir Sie freundlich daran erinnern, dass die Rechnung Nr. {{NR}} über {{BETRAG}} seit dem {{FAELLIG}} fällig ist.\n\nBitte überweisen Sie den offenen Betrag innerhalb der nächsten 7 Tage.\n\nSollte sich Ihre Zahlung mit diesem Schreiben gekreuzt haben, betrachten Sie diese Erinnerung bitte als gegenstandslos.\n\nMit freundlichen Grüßen\n{{FIRMA}}'
  },
  {
    subject: '2. Mahnung — Rechnung {{NR}}',
    body: 'Sehr geehrte Damen und Herren,\n\ntrotz unserer ersten Erinnerung ist die Rechnung Nr. {{NR}} über {{BETRAG}} weiterhin offen (fällig seit {{FAELLIG}}, {{TAGE}} Tage überfällig).\n\nWir bitten Sie dringend, den Betrag umgehend zu begleichen.\n\nMit freundlichen Grüßen\n{{FIRMA}}'
  },
  {
    subject: '{{STUFE}}. Mahnung — Rechnung {{NR}}',
    body: 'Sehr geehrte Damen und Herren,\n\ndie Rechnung Nr. {{NR}} über {{BETRAG}} ist seit {{TAGE}} Tagen überfällig (Fälligkeitsdatum: {{FAELLIG}}).\n\nDies ist unsere {{STUFE}}. Mahnung. Wir fordern Sie letztmalig auf, den offenen Betrag innerhalb von 5 Werktagen zu überweisen.\n\nAndernfalls behalten wir uns weitere rechtliche Schritte vor.\n\nMit freundlichen Grüßen\n{{FIRMA}}'
  }
];

function isMahnungEnabled() {
  try {
    var v = localStorage.getItem('bp_mahnung_enabled');
    // v14 migration: old code stored "false" as default on all devices
    if (v === 'false' && !localStorage.getItem('bp_mahnung_v14')) {
      localStorage.removeItem('bp_mahnung_enabled');
      localStorage.setItem('bp_mahnung_v14', '1');
      return true;
    }
    if (v === null) return true;
    return JSON.parse(v);
  }
  catch(e) { return true; }
}

function getMahnTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem('bp_mahnung_templates') || '[]');
    return [0,1,2].map(i => ({
      subject: (saved[i] && saved[i].subject) || MAHN_DEFAULTS[i].subject,
      body:    (saved[i] && saved[i].body)    || MAHN_DEFAULTS[i].body,
    }));
  } catch(e) { return MAHN_DEFAULTS.map(d => ({...d})); }
}

function saveMahnTemplates() {
  const tmpls = [1,2,3].map(i => ({
    subject: (document.getElementById('mahn-subject-'+i)||{}).value || '',
    body:    (document.getElementById('mahn-body-'+i)||{}).value    || '',
  }));
  localStorage.setItem('bp_mahnung_templates', JSON.stringify(tmpls));
}

function resetMahnTemplates() {
  localStorage.removeItem('bp_mahnung_templates');
  _populateMahnEditor();
  toast('✓ Mahnung-Vorlagen zurückgesetzt', 'ok');
}

function toggleMahnSection() {
  const on = document.getElementById('mahnung-enabled')?.checked;
  localStorage.setItem('bp_mahnung_enabled', JSON.stringify(!!on));
  localStorage.setItem('bp_mahnung_v14', '1');
  const sec = document.getElementById('mahnung-settings');
  if (sec) sec.style.display = on ? '' : 'none';
}

function setMahnTab(n) {
  [1,2,3].forEach(i => {
    const tab = document.getElementById('mahn-tab-'+i);
    const panel = document.getElementById('mahn-panel-'+i);
    if (tab) tab.classList.toggle('active', i === n);
    if (panel) panel.style.display = i === n ? '' : 'none';
  });
}

function _populateMahnEditor() {
  const tmpls = getMahnTemplates();
  [1,2,3].forEach(i => {
    const subEl = document.getElementById('mahn-subject-'+i);
    const bodEl = document.getElementById('mahn-body-'+i);
    if (subEl) subEl.value = tmpls[i-1].subject;
    if (bodEl) bodEl.value = tmpls[i-1].body;
  });
  const enEl = document.getElementById('mahnung-enabled');
  if (enEl) enEl.checked = isMahnungEnabled();
  const sec = document.getElementById('mahnung-settings');
  if (sec) sec.style.display = isMahnungEnabled() ? '' : 'none';
  setMahnTab(1);
}

// ══════════════════════════════════════════════════════════════════════════
// E-RECHNUNG — XRechnung (XML) + ZUGFeRD (PDF+XML)
// Standard: UN/CEFACT CII D16B / EN 16931
// ══════════════════════════════════════════════════════════════════════════

function getFirmaData() {
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  return {
    name:            p.name            || '',
    strasse:         p.strasse         || '',
    plz:             p.plz             || '',
    ort:             p.ort             || '',
    land:            p.land            || 'DE',
    email:           p.email           || '',
    tel:             p.tel             || '',
    iban:            p.iban            || '',
    bic:             p.bic             || '',
    steuernr:        p.steuernr        || '',
    ustid:           p.ustid           || '',
    inhaber:         p.inhaber         || '',
    kleinuntern:     p.kleinuntern !== false,
    rechnung_footer: p.rechnung_footer || '',
    logo:            p.logo            || null,
  };
}

// ── Генератор XRechnung XML (UN/CEFACT CII D16B / EN 16931) ───────────────
function generateXRechnungXML(r) {
  const firma = getFirmaData();
  const pos = r.positionen && r.positionen.length
    ? r.positionen
    : [{ bez: r.beschreibung || 'Leistung', menge: 1, netto: r.betrag, preis: r.betrag, rate: 0 }];

  const isKlein = firma.kleinuntern || !r.mwstMode || r.mwstMode === '§19';

  // Считаем суммы
  let totNetto = 0, totMwst = 0;
  const lines = pos.map((p, i) => {
    const netto  = p.netto !== undefined ? p.netto : p.preis;
    const menge  = p.menge || 1;
    const rate   = isKlein ? 0 : (p.rate || 0);
    const lineN  = Math.round(menge * netto * 100) / 100;
    const lineMwst = Math.round(lineN * rate / 100 * 100) / 100;
    totNetto += lineN;
    totMwst  += lineMwst;
    return { bez: p.bez || p.beschreibung || 'Leistung', menge, netto, rate, lineN, lineMwst, idx: i + 1 };
  });
  totNetto = Math.round(totNetto * 100) / 100;
  totMwst  = Math.round(totMwst  * 100) / 100;
  const totBrutto = Math.round((totNetto + totMwst) * 100) / 100;

  const taxCode   = isKlein ? 'E' : 'S'; // E=exempt §19, S=standard
  const taxReason = isKlein ? 'Steuerbefreiung gemäß §19 UStG (Kleinunternehmer)' : '';
  const taxRate   = isKlein ? '0' : (lines[0]?.rate || 19).toString();

  const esc = s => String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');

  const lineItems = lines.map(l => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${l.idx}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(l.bez)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${l.netto.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${l.menge}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${l.rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${l.lineN.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${esc(r.nr)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${(r.datum||'').replace(/-/g,'')}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${lineItems}

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(firma.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(firma.strasse)}</ram:LineOne>
          <ram:PostcodeCode>${esc(firma.plz)}</ram:PostcodeCode>
          <ram:CityName>${esc(firma.ort)}</ram:CityName>
          <ram:CountryID>${esc(firma.land)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${esc(firma.email)}</ram:URIID>
        </ram:URIUniversalCommunication>
        ${firma.ustid ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(firma.ustid)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        ${firma.steuernr ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(firma.steuernr)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      ${r.leitwegId ? `<ram:BuyerReference>${esc(r.leitwegId)}</ram:BuyerReference>` : ''}
      <ram:BuyerTradeParty>
        <ram:Name>${esc(r.kunde || 'Kunde')}</ram:Name>
        ${r.adresse ? `<ram:PostalTradeAddress><ram:LineOne>${esc(r.adresse)}</ram:LineOne><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>` : ''}
        ${r.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(r.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      ${(r.leistungsdatum || r.datum) ? `
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${((r.leistungsdatum||r.datum)||'').replace(/-/g,'')}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>` : ''}
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(r.nr)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${firma.iban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${esc(firma.iban.replace(/\s/g,''))}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${firma.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${esc(firma.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${totMwst.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${taxReason ? `<ram:ExemptionReason>${esc(taxReason)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${totNetto.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${r.faellig ? `
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${r.faellig.replace(/-/g,'')}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>` : ''}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totNetto.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${totNetto.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totMwst.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totBrutto.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totBrutto.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
  return xml;
}

// ── Скачать XRechnung XML ─────────────────────────────────────────────────
function downloadXRechnung(r) {
  if (!r) {
    // Вызов из модала — собираем данные
    const pos = getRechPositionen();
    if (!pos.length) { toast('Bitte mind. eine Position hinzufügen', 'err'); return; }
    const nr = document.getElementById('rn-nr').value.trim();
    const datum = document.getElementById('rn-dat').value;
    if (!nr || !datum) { toast('Rechnungs-Nr. und Datum erforderlich', 'err'); return; }
    r = {
      nr, datum,
      faellig:  document.getElementById('rn-faellig').value,
      kunde:    document.getElementById('rn-kunde').value.trim(),
      adresse:  document.getElementById('rn-adresse').value.trim(),
      email:    document.getElementById('rn-email').value.trim(),
      tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
      notiz:    document.getElementById('rn-notiz').value.trim(),
      positionen: pos,
      betrag: pos.reduce((s, p) => s + p.menge * p.preis, 0)
    };
  }
  try {
    const xml = generateXRechnungXML(r);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XRechnung_${r.nr.replace(/\//g, '-')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✓ XRechnung XML gespeichert!', 'ok');
  } catch(e) {
    console.error(e);
    toast('Fehler beim XML-Erstellen: ' + e.message, 'err');
  }
}

function downloadXRechnungId(id) {
  const r = data.rechnungen.find(x => x.id === id);
  if (r) downloadXRechnung(r);
}

// ── ZUGFeRD: PDF + XML (Factur-X / EN 16931) ────────────────────────────
// jsPDF 2.5.1 unterstützt kein echtes PDF/A-3 Embedding.
// Wir erzeugen daher: normales PDF (öffnet immer) + separates XML (EN 16931).
async function downloadZUGFeRD(r) {
  if (!r) {
    const pos = getRechPositionen();
    if (!pos.length) { toast('Bitte mind. eine Position hinzufügen', 'err'); return; }
    const nr = document.getElementById('rn-nr').value.trim();
    const datum = document.getElementById('rn-dat').value;
    if (!nr || !datum) { toast('Rechnungs-Nr. und Datum erforderlich', 'err'); return; }
    r = {
      nr, datum,
      faellig:  document.getElementById('rn-faellig').value,
      kunde:    document.getElementById('rn-kunde').value.trim(),
      adresse:  document.getElementById('rn-adresse').value.trim(),
      email:    document.getElementById('rn-email').value.trim(),
      tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
      notiz:    document.getElementById('rn-notiz').value.trim(),
      positionen: pos,
      betrag: pos.reduce((s, p) => s + (p.menge||1) * (p.netto||p.preis||0), 0)
    };
  }

  toast('[PDF] ZUGFeRD wird erstellt...', 'ok');
  const safeNr = (r.nr || 'rechnung').replace(/[\/]/g, '-');

  try {
    // 1. Normales PDF erzeugen und sofort speichern
    const doc = await generateRechnungPDF(r);
    doc.save(`ZUGFeRD_${safeNr}.pdf`);
  } catch(e) {
    console.error('[ZUGFeRD PDF error]', e);
    toast('✗ PDF-Fehler: ' + e.message, 'err');
    return;
  }

  try {
    // 2. Factur-X / XRechnung XML separat speichern
    setTimeout(() => {
      const xmlStr = generateXRechnungXML(r);
      const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factur-x_${safeNr}.xml`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('✓ PDF + Factur-X XML gespeichert!', 'ok');
    }, 500);
  } catch(e) {
    console.error('[ZUGFeRD XML error]', e);
    toast('⚠ PDF gespeichert, XML-Fehler: ' + e.message, 'err');
  }
}

function downloadZUGFeRDId(id) {
  const r = data.rechnungen.find(x => x.id === id);
  if (r) downloadZUGFeRD(r);
}

// ── KUNDE AUTOCOMPLETE für Rechnungen-Form ──────────────────────────────────
function rnKundeSearch(q) {
  const sug = document.getElementById('rn-kunde-suggest');
  if (!sug) return;
  if (!q || q.length < 1) { sug.style.display='none'; return; }
  const matches = (data.kunden||[]).filter(k=>(k.name||'').toLowerCase().includes(q.toLowerCase())).slice(0,6);
  if (!matches.length) { sug.style.display='none'; return; }
  sug.style.display = 'block';
  sug.innerHTML = matches.map(k=>`
    <div onclick="rnSelectKunde('${k.id}')"
      style="padding:8px 12px;cursor:pointer;font-size:13px"
      onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600">${k.name}</div>
      ${k.strasse?`<div style="font-size:11px;color:var(--sub)">${k.strasse}${k.plz?' · '+k.plz:''} ${k.ort||''}</div>`:''}
    </div>`).join('');
}
function rnSelectKunde(id) {
  const k = (data.kunden||[]).find(x=>x.id===id);
  if (!k) return;
  document.getElementById('rn-kunde').value = k.name||'';
  const parts = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean);
  document.getElementById('rn-adresse').value = parts.join(', ');
  if (k.email) document.getElementById('rn-email').value = k.email;
  if (k.tel)   document.getElementById('rn-tel').value   = k.tel;
  document.getElementById('rn-nr').dataset.kundeId = id;
  document.getElementById('rn-kunde-suggest').style.display = 'none';
}

// ── USt Flag Dropdown (Rechnung positions) ───────────────────────────────
function setRechUstRate(el, rate) {
  const wrap = el.closest('.ust-flag-wrap');
  const hidden = wrap.querySelector('.ust-flag-val');
  hidden.value = rate;
  wrap.querySelector('.ust-flag-label').textContent = rate + '%';
  wrap.querySelector('.ust-flag-panel').style.display = 'none';
  posRateChanged(hidden);
}

// ══════════════════════════════════════════════════════════════════════════
// ZAHLUNGSERINNERUNG (Mahnung) — автоматические напоминания об оплате
// ══════════════════════════════════════════════════════════════════════════

function _getMahnEmail(r) {
  // Email из Rechnung или из Kunden-DB
  if (r.email) return r.email;
  if (r.kundeId) {
    const k = (data.kunden || []).find(x => x.id === r.kundeId);
    if (k && k.email) return k.email;
  }
  return '';
}

function _getMahnStufe(r) {
  const hist = r.mahnung_history || [];
  return hist.length; // 0 = erste Mahnung, 1 = zweite, etc.
}

function _mahnFaellig(r) {
  // Rechnung muss überfällig sein + Email vorhanden
  if (r.status !== 'ueberfaellig') return false;
  if (!_getMahnEmail(r)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const hist = r.mahnung_history || [];
  if (!hist.length) {
    // Noch nie gemahnt — fällig wenn überfällig
    return true;
  }
  // Letzte Mahnung vor 7+ Tagen?
  const last = new Date(hist[hist.length - 1]);
  last.setHours(0,0,0,0);
  const diff = Math.floor((today - last) / 864e5);
  return diff >= 7;
}

let _mahnLastState = null; // отслеживаем состояние чтобы не дёргать анимацию лишний раз

function checkMahnungen() {
  try {
    const banner    = document.getElementById('dash-mahnung-banner');
    if (!banner) return;

    // Добавляем CSS анимации один раз
    if (!document.getElementById('mahnung-keyframes')) {
      const s = document.createElement('style');
      s.id = 'mahnung-keyframes';
      s.textContent = `
        @keyframes mahnung-pulse {
          0%,100% { opacity: 0; }
          50%      { opacity: 1; }
        }
        @keyframes mahnung-slide-in {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes mahnung-bell-ring {
          0%,100% { transform: rotate(0deg); }
          15%     { transform: rotate(-18deg); }
          30%     { transform: rotate(18deg); }
          45%     { transform: rotate(-12deg); }
          60%     { transform: rotate(12deg); }
          75%     { transform: rotate(-6deg); }
          90%     { transform: rotate(6deg); }
        }
        #dash-mahnung-banner.state-alert #dash-mahnung-icon {
          animation: mahnung-bell-ring 1.2s ease 0.3s both;
        }
        #dash-mahnung-banner.state-ok { cursor:default; }
        #dash-mahnung-banner.state-alert { cursor:pointer; }
      `;
      document.head.appendChild(s);
    }

    const titleEl   = document.getElementById('dash-mahnung-title');
    const subEl     = document.getElementById('dash-mahnung-sub');
    const iconWrap  = document.getElementById('dash-mahnung-icon-wrap');
    const iconEl    = document.getElementById('dash-mahnung-icon');
    const pulseEl   = document.getElementById('dash-mahnung-pulse');
    const arrowEl   = document.getElementById('dash-mahnung-arrow');

    // Обновляем статусы просроченных
    const today = new Date().toISOString().split('T')[0];
    (data.rechnungen||[]).forEach(r => {
      if (r.status === 'offen' && r.faellig && r.faellig < today) r.status = 'ueberfaellig';
    });

    // Собираем fällige
    const mahnEnabled = isMahnungEnabled();
    const faellige = mahnEnabled
      ? (data.rechnungen||[]).filter(r => { try { return _mahnFaellig(r); } catch(e) { return false; } })
      : [];
    const total = faellige.reduce((s,r) => s + (r.betrag||0), 0);

    const newState = faellige.length > 0 ? 'alert' : 'ok';
    const stateChanged = _mahnLastState !== newState;
    _mahnLastState = newState;

    const _set = (alert) => {
      banner.classList.toggle('state-alert', alert);
      banner.classList.toggle('state-ok', !alert);
      const clr  = alert ? 'var(--red)'   : 'var(--green)';
      const bg   = alert ? 'var(--rdim,#fef2f2)' : 'var(--gdim,#f0fdf4)';
      const bord = alert ? 'var(--red)'   : 'var(--green)';
      banner.style.background   = bg;
      banner.style.borderColor  = bord;
      if (iconWrap)  iconWrap.style.background = alert ? 'var(--red)' : 'var(--green)';
      if (iconEl)  { iconEl.className = alert ? 'fas fa-bell' : 'fas fa-check-circle'; }
      if (titleEl) { titleEl.style.color = clr; }
      if (arrowEl) { arrowEl.style.color = clr; arrowEl.style.display = alert ? '' : 'none'; }
      if (pulseEl) { pulseEl.style.display = alert ? 'block' : 'none'; }
      // Анимация ТОЛЬКО при реальной смене состояния
      if (stateChanged) {
        banner.style.animation = 'none';
        void banner.offsetWidth;
        banner.style.animation = 'mahnung-slide-in .35s ease both';
      }
    };

    if (!faellige.length) {
      // Всё хорошо
      _set(false);
      if (titleEl) titleEl.textContent = 'Keine offenen Mahnungen';
      if (subEl)   subEl.textContent   = mahnEnabled
        ? 'Alle Rechnungen sind rechtzeitig bezahlt — weiter so!'
        : 'Zahlungserinnerungen sind deaktiviert';
      banner.onclick = null;
    } else {
      // Есть просрочки
      _set(true);
      if (titleEl) titleEl.textContent = faellige.length + ' Zahlungserinnerung' + (faellige.length > 1 ? 'en' : '') + ' fällig';
      if (subEl)   subEl.textContent   = 'Offene Forderungen: ' + fmt(total) + ' — Jetzt Mahnungen versenden';
      banner.onclick = openMahnModal;
    }
  } catch(e) { console.error('[checkMahnungen]', e); }
}


function openMahnModal() {
  const today = new Date().toISOString().split('T')[0];
  (data.rechnungen || []).forEach(r => {
    if (r.status === 'offen' && r.faellig && r.faellig < today) r.status = 'ueberfaellig';
  });
  const faellige = (data.rechnungen || []).filter(r => _mahnFaellig(r));
  if (!faellige.length) {
    toast('Keine Mahnungen fällig', 'ok');
    return;
  }

  document.getElementById('mahnung-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mahnung-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#00000066;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--s1);border-radius:var(--r2);padding:0;width:520px;max-width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px #0004;overflow:hidden';

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0';
  hdr.innerHTML = `<div>
    <div style="font-size:16px;font-weight:700;color:var(--text)"><i class="fas fa-bell" style="color:var(--yellow);margin-right:6px"></i>Zahlungserinnerungen</div>
    <div style="font-size:12px;color:var(--sub);margin-top:2px">${faellige.length} überfällige Rechnung${faellige.length !== 1 ? 'en' : ''} mit E-Mail</div>
  </div>`;
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;color:var(--sub);padding:4px';
  closeBtn.onclick = function() { overlay.remove(); };
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  // Alle senden Button
  const allBar = document.createElement('div');
  allBar.style.cssText = 'padding:12px 20px;background:var(--s2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0';
  const allBtn = document.createElement('button');
  allBtn.className = 'btn primary';
  allBtn.style.cssText = 'font-size:13px;height:32px;padding:0 14px';
  allBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Alle senden';
  allBtn.onclick = function() {
    faellige.forEach(r => _sendMahnung(r));
    overlay.remove();
    toast(`${faellige.length} Mahnung${faellige.length > 1 ? 'en' : ''} vorbereitet`, 'ok');
    checkMahnungen();
  };
  allBar.innerHTML = `<span style="font-size:12px;color:var(--sub)">${faellige.length} E-Mails werden vorbereitet</span>`;
  allBar.appendChild(allBtn);
  box.appendChild(allBar);

  // List
  const list = document.createElement('div');
  list.style.cssText = 'overflow-y:auto;flex:1;padding:8px 12px';

  faellige.forEach(r => {
    const email = _getMahnEmail(r);
    const stufe = _getMahnStufe(r);
    const stufeLbl = stufe === 0 ? '1. Mahnung' : stufe === 1 ? '2. Mahnung' : `${stufe + 1}. Mahnung`;
    const overdueDays = Math.floor((new Date() - new Date(r.faellig)) / 864e5);
    const lastMahn = (r.mahnung_history || []).length
      ? fd((r.mahnung_history || [])[(r.mahnung_history || []).length - 1])
      : '—';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--r);margin-bottom:8px;background:var(--s1)';
    row.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px">
          <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--sub)">${r.nr}</span>
          <span style="font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.kunde || '—'}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--sub)">
          <span style="color:var(--red);font-weight:600">+${overdueDays} Tage überfällig</span>
          <span>·</span>
          <span style="font-family:var(--mono)">${fmt(r.betrag)}</span>
          <span>·</span>
          <span>${stufeLbl}</span>
          <span>·</span>
          <span>Letzte: ${lastMahn}</span>
        </div>
        <div style="font-size:10px;color:var(--sub);margin-top:2px;opacity:.7">→ ${email}</div>
      </div>
    `;
    const sendBtn = document.createElement('button');
    sendBtn.className = 'btn';
    sendBtn.style.cssText = 'font-size:12px;height:30px;padding:0 12px;flex-shrink:0;color:var(--blue);border-color:var(--blue)';
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendBtn.title = 'Mahnung senden';
    sendBtn.onclick = function(e) {
      e.stopPropagation();
      _sendMahnung(r);
      row.style.opacity = '0.4';
      row.style.pointerEvents = 'none';
      sendBtn.innerHTML = '<i class="fas fa-check" style="color:var(--green)"></i>';
    };
    row.appendChild(sendBtn);
    list.appendChild(row);
  });

  box.appendChild(list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function _sendMahnung(r) {
  const firma = getFirmaData();
  const email = _getMahnEmail(r);
  if (!email) return;

  const stufe = _getMahnStufe(r);
  const overdueDays = Math.floor((new Date() - new Date(r.faellig)) / 864e5);
  const tmpls = getMahnTemplates();
  const idx = Math.min(stufe, 2); // 0, 1, or 2

  function fillVars(tpl) {
    return tpl
      .replace(/\{\{NR\}\}/g,      r.nr||'')
      .replace(/\{\{KUNDE\}\}/g,   r.kunde||'')
      .replace(/\{\{BETRAG\}\}/g,  fmt(r.betrag))
      .replace(/\{\{FAELLIG\}\}/g, r.faellig ? fd(r.faellig) : '')
      .replace(/\{\{FIRMA\}\}/g,   firma.name||'')
      .replace(/\{\{TAGE\}\}/g,    String(overdueDays))
      .replace(/\{\{STUFE\}\}/g,   String(stufe + 1));
  }

  const betreff = fillVars(tmpls[idx].subject);
  const text    = fillVars(tmpls[idx].body);

  // Mahnung-Historie aktualisieren
  if (!r.mahnung_history) r.mahnung_history = [];
  r.mahnung_history.push(new Date().toISOString().split('T')[0]);
  if (typeof sbSaveRechnung === 'function') sbSaveRechnung(r);

  // Email öffnen
  const mailto = 'mailto:' + encodeURIComponent(email)
    + '?subject=' + encodeURIComponent(betreff)
    + '&body=' + encodeURIComponent(text);
  window.open(mailto, '_blank');
}

function showRechDetail(id) {
  const r = (data.rechnungen||[]).find(x=>x.id===id);
  if (!r) return;
  // Сторнированные — только readonly просмотр
  if (r.status === 'storniert' || r._storniert) { showRechDetailReadonly(id); return; }
  const statusLabels = {entwurf:'Entwurf',offen:'Offen',bezahlt:'Bezahlt',ueberfaellig:'Überfällig',storniert:'Storniert'};
  showDetailSheet({
    title: `<i class="fas fa-file-invoice" style="color:var(--blue);margin-right:8px"></i>${r.nr||'Rechnung'}`,
    rows: [
      { key: 'Betrag',     val: `<span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--blue)">${fmt(r.betrag)}</span>` },
      { key: 'Kunde',      val: r.kunde||'—' },
      { key: 'Datum',      val: fd(r.datum) },
      { key: 'Fällig',     val: r.faellig ? fd(r.faellig) : '—' },
      { key: 'Status',     val: `<span class="badge">${statusLabels[r.status]||r.status}</span>` },
      { key: 'Positionen', val: (r.positionen||[]).length + ' Pos.' },
      ...(r.notiz ? [{ key: 'Notiz', val: r.notiz }] : []),
    ],
    buttons: [
      ...( r.status !== 'bezahlt' ? [{ label: 'Bearbeiten', icon: 'fa-edit', primary: true, action: () => editRech(id) }] : [] ),
      { label: 'Als Vorlage',   icon: 'fa-file-alt',              action: () => { _closeDetailSheet(); rechAlsVorlage(id); } },
      { label: 'Vorschau',      icon: 'fa-eye',                   action: () => { _closeDetailSheet(); vorschauRechnungId(id); } },
      // Löschen nur für nicht-stornierte — für stornierte ist showRechDetailReadonly zuständig
    ]
  });
}

// ── Readonly-Ansicht für stornierte Rechnungen ──────────────────────────────
function showRechDetailReadonly(id) {
  const r = (data.rechnungen||[]).find(x=>x.id===id);
  if (!r) return;
  const statusLabels = {entwurf:'Entwurf',offen:'Offen',bezahlt:'Bezahlt',ueberfaellig:'Überfällig',storniert:'Storniert'};
  // Позиции — полный список
  const _posRows = (r.positionen||[]).map((p,i) =>
    ({ key: `Pos. ${i+1}`, val: `${p.bezeichnung||'—'} · ${p.menge||1}× · ${fmt(p.brutto)} €` })
  );
  // Связанные Einträge — Einnahme + Gegenbuchung
  const _linked = (data.eintraege||[]).filter(e =>
    e.beschreibung && e.beschreibung.includes(`Rechnung ${r.nr}:`)
  );
  const _linkedRows = _linked.map(e => ({
    key: e.is_storno ? '↩ Gegenbuchung' : '✓ Einnahme',
    val: `<span style="font-family:var(--mono);color:${e.is_storno?'var(--red)':'var(--green)'}">
      ${e.is_storno?'−':'+'}${fmt(e.betrag)} €
    </span> <span style="color:var(--sub);font-size:11px">${fd(e.datum)}</span>`
  }));
  showDetailSheet({
    title: `<i class="fas fa-lock" style="color:var(--red);margin-right:8px"></i>${r.nr||'Rechnung'}
      <span style="font-size:11px;color:var(--red);padding:2px 8px;background:var(--rdim);border-radius:4px;margin-left:6px;font-weight:600">Storniert</span>`,
    rows: [
      { key: 'Betrag',     val: `<span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--sub);text-decoration:line-through">${fmt(r.betrag)}</span>` },
      { key: 'Kunde',      val: r.kunde||'—' },
      { key: 'Datum',      val: fd(r.datum) },
      { key: 'Storniert',  val: r.storniert_am ? fd(r.storniert_am) : fd(r._storniert_am?.slice(0,10)||'') },
      { key: 'Kategorie',  val: r.kategorie||'—' },
      { key: 'Zahlungsart',val: r.zahlungsart||'—' },
      { key: 'Positionen', val: (r.positionen||[]).length + ' Pos.' },
      ..._posRows,
      ...(_linkedRows.length ? _linkedRows : []),
      ...(r.notiz ? [{ key: 'Notiz', val: r.notiz }] : []),
      { key: 'Hinweis', val: '<span style="color:var(--sub);font-size:11px">Diese Rechnung wurde storniert und kann nicht mehr geändert werden (GoBD §146).</span>' },
    ],
    buttons: [
      { label: 'PDF / Drucken', icon: 'fa-print', action: () => druckRechnungId(id) },
    ]
  });
}
