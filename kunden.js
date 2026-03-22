// ── WIEDERKEHREND ────────────────────────────────────────────────────────
let wiedTyp='Ausgabe';
let wiedSort='naechste', wiedSortAsc=true, wiedPage=1;
const WIED_PER_PAGE=10;

function sortWied(col){
  if(wiedSort===col) wiedSortAsc=!wiedSortAsc; else{wiedSort=col;wiedSortAsc=true;}
  wiedPage=1;
  renderWied();
}
function _updateWiedSortBtns(){
  [['bezeichnung','Bezeichnung'],['betrag','Betrag'],['naechste','Nächste'],['intervall','Intervall']].forEach(([col,lbl])=>{
    document.querySelectorAll(`#p-wiederkehrend button[onclick*="sortWied('${col}')"]`).forEach(btn=>{
      const active=wiedSort===col;
      btn.classList.toggle('active', active);
      btn.innerHTML=lbl+'<span class="sort-arrow">'+(active?(wiedSortAsc?' ↑':' ↓'):'&nbsp;')+'</span>';
    });
  });
}

function showWiedDetail(id) {
  const w = (data.wiederkehrend||[]).find(x=>x.id===id);
  if (!w) return;
  const isEin = w.typ === 'Einnahme';
  const isPaused = w.status === 'paused';
  const intervallLabel = {woechentlich:'Wöchentlich',monatlich:'Monatlich',quartalsweise:'Quartalsweise',halbjaehrlich:'Halbjährlich',jaehrlich:'Jährlich'};
  const bookedCount = (data.eintraege||[]).filter(e=>e.beschreibung===w.bezeichnung&&e.notiz==='Wiederkehrend').length;
  const multiplier = {woechentlich:52,monatlich:12,quartalsweise:4,halbjaehrlich:2,jaehrlich:1};
  const jahres = w.betrag * (multiplier[w.intervall]||1);
  showDetailSheet({
    title: `<span class="badge ${isEin?'b-ein':'b-aus'}">${isEin?'<i class="fas fa-arrow-up" style="color:var(--green)"></i> Einnahme':'<i class="fas fa-arrow-down" style="color:var(--red)"></i> Ausgabe'}</span>`,
    rows: [
      { key: 'Bezeichnung', val: w.bezeichnung || '—' },
      { key: 'Betrag',      val: `<span style="font-family:var(--mono);font-size:16px;font-weight:800;color:${isEin?'var(--green)':'var(--red)'}">${isEin?'+':'−'}${fmt(w.betrag)}</span>` },
      { key: 'Intervall',   val: intervallLabel[w.intervall] || w.intervall || '—' },
      { key: 'Kategorie',   val: w.kategorie || '—' },
      { key: 'Zahlungsart', val: `<span class="badge ${ZBADGE[w.zahlungsart]||''}">${w.zahlungsart||'—'}</span>` },
      { key: 'Nächste Buchung', val: fdm(w.naechste) || '—' },
      { key: 'Pro Jahr (≈)', val: `<span style="font-family:var(--mono)">${fmt(jahres)}</span>` },
      ...(w.enddatum ? [{ key: 'Enddatum', val: fdm(w.enddatum) }] : []),
      ...(w.anbieter ? [{ key: 'Anbieter', val: w.anbieter }] : []),
      ...(bookedCount ? [{ key: 'Gebucht', val: bookedCount + '× bisher' }] : []),
      { key: 'Status', val: isPaused ? '<span style="color:var(--sub)">Pausiert</span>' : '<span style="color:var(--green)">Aktiv</span>' },
    ],
    buttons: [
      { label: 'Jetzt buchen', icon: 'fa-hand-pointer', primary: true, action: () => wBuchen(id) },
      { label: 'Bearbeiten',   icon: 'fa-edit',  action: () => editWied(id) },
      { label: 'Löschen',      icon: 'fa-trash', danger: true, action: () => delWied(id) },
    ]
  });
}

// ── Info-Sheet für Wiederkehrend-Einträge (aus Einträge/Dashboard) ───────────
function showWiedEintragInfo(wiedId) {
  const w = (data.wiederkehrend||[]).find(x=>x.id===wiedId);
  if (!w) return;
  const isEin = w.typ === 'Einnahme';
  const isPaused = w.status === 'paused';
  const intervallLabel = {woechentlich:'Wöchentlich',monatlich:'Monatlich',quartalsweise:'Quartalsweise',halbjaehrlich:'Halbjährlich',jaehrlich:'Jährlich'};
  const bookedCount = (data.eintraege||[]).filter(e=>e.beschreibung===w.bezeichnung&&e.notiz==='Wiederkehrend').length;
  showDetailSheet({
    title: '<i class="fas fa-lock" style="color:var(--sub);margin-right:6px"></i>'
      + (w.bezeichnung||'Wiederkehrende Zahlung')
      + ' <span style="font-size:11px;color:var(--sub);padding:2px 8px;background:var(--s2);border-radius:4px;margin-left:4px">'
      + '<i class="fas fa-sync-alt" style="font-size:9px;margin-right:3px"></i>Wiederkehrend</span>',
    rows: [
      { key: 'Betrag',      val: `<span style="font-family:var(--mono);font-size:16px;font-weight:800;color:${isEin?'var(--green)':'var(--red)'}">${isEin?'+':'−'}${fmt(w.betrag)}</span>` },
      { key: 'Intervall',   val: intervallLabel[w.intervall] || w.intervall || '—' },
      { key: 'Kategorie',   val: w.kategorie || '—' },
      { key: 'Zahlungsart', val: w.zahlungsart || '—' },
      { key: 'Nächste',     val: fdm(w.naechste) || '—' },
      { key: 'Status',      val: isPaused ? '<span style="color:var(--sub)">⏸ Pausiert</span>' : '<span style="color:var(--green)">▶ Aktiv</span>' },
      { key: 'Gebucht',     val: bookedCount + '× bisher' },
      { key: 'Hinweis',     val: '<span style="color:var(--sub);font-size:12px">Dieser Eintrag wurde automatisch durch eine wiederkehrende Zahlung erstellt. Änderungen über den Bereich "Wiederkehrend".</span>' },
    ],
    buttons: [
      { label: 'Zur Vorlage', icon: 'fa-sync-alt', primary: true, action: () => {
          _closeDetailSheet();
          const el = document.querySelector('.nav-item[onclick*="wiederkehrend"]');
          if (el) nav('wiederkehrend', el);
          // Сначала переключаем страницу, потом ищем карточку
          setTimeout(() => {
            const _findWC = () => document.querySelector(`.wied-card[onclick*="${wiedId}"]`);

            // Всегда вычисляем нужную страницу и переключаем до поиска
            if (typeof data !== 'undefined' && data.wiederkehrend
                && typeof wiedPage !== 'undefined' && typeof WIED_PER_PAGE !== 'undefined') {
              const widx = (data.wiederkehrend||[]).findIndex(w => w.id === wiedId);
              if (widx >= 0) {
                const tp = Math.floor(widx / WIED_PER_PAGE) + 1;
                if (tp !== wiedPage) { wiedPage = tp; if(typeof renderWied==='function') renderWied(); }
              }
            }

            let wa = 0;
            const wr = setInterval(() => {
              wa++;
              const wcard = _findWC();
              if (wcard) {
                clearInterval(wr);
                wcard.scrollIntoView({ behavior:'smooth', block:'center' });
                wcard.classList.remove('highlight-flash');
                void wcard.offsetWidth;
                wcard.classList.add('highlight-flash');
                setTimeout(() => wcard.classList.remove('highlight-flash'), 1200);
              } else if (wa > 30) clearInterval(wr);
            }, 100);
          }, 400);
        }
      },
    ]
  });
}

function renderWied(){
  const wied=data.wiederkehrend||[];
  const container=document.getElementById('wied-list');
  const em=document.getElementById('wied-empty');
  const pagination=document.getElementById('wied-pagination');
  if(!wied.length){if(container)container.innerHTML='';em.style.display='block';if(pagination)pagination.innerHTML='';return;}
  em.style.display='none';
  const today=new Date().toISOString().split('T')[0];
  const faelligCount=wied.filter(w=>w.naechste<=today&&w.status!=='paused').length;
  const hint=document.getElementById('wied-hint');
  if(faelligCount>0){hint.style.display='';hint.innerHTML=`<strong>${faelligCount} fällige Zahlung${faelligCount>1?'en':''}</strong> — jetzt buchen!`;}
  else hint.style.display='none';

  // Сортировка
  const sorted=[...wied].sort((a,b)=>{
    let av=a[wiedSort]||'', bv=b[wiedSort]||'';
    if(wiedSort==='betrag'){av=a.betrag;bv=b.betrag;}
    return av<bv?(wiedSortAsc?-1:1):av>bv?(wiedSortAsc?1:-1):0;
  });

  // Пагинация
  const totalPages=Math.max(1,Math.ceil(sorted.length/WIED_PER_PAGE));
  if(wiedPage>totalPages)wiedPage=totalPages;
  const pageItems=sorted.slice((wiedPage-1)*WIED_PER_PAGE, wiedPage*WIED_PER_PAGE);

  const intervallLabel={woechentlich:'Wöchentlich',monatlich:'Monatlich',quartalsweise:'Quartalsweise',halbjaehrlich:'Halbjährlich',jaehrlich:'Jährlich'};
  const cards=pageItems.map(w=>{
    const isFaellig=w.naechste<=today&&w.status!=='paused';
    const isPaused=w.status==='paused';
    const isEin=w.typ==='Einnahme';
    // Нет ещё записей истории — кол-во раз забуканных
    const _wBookedCount = (data.eintraege||[]).filter(e=>e.beschreibung===w.bezeichnung&&e.notiz==='Wiederkehrend').length;
    // Годовой эквивалент
    const _wMultiplier = {woechentlich:52,monatlich:12,quartalsweise:4,halbjaehrlich:2,jaehrlich:1};
    const _wJahres = w.betrag * (_wMultiplier[w.intervall]||1);
    return`<div class="wied-card${isFaellig?' wied-card--faellig':''}${isPaused?' wied-card--paused':''}" onclick="showWiedDetail('${w.id}')" style="cursor:pointer">
      <div class="wied-card-left">
        <div class="wied-card-avatar" style="background:${isPaused?'var(--s2)':isEin?'var(--gdim)':'var(--rdim)'};color:${isPaused?'var(--sub)':isEin?'var(--green)':'var(--red)'}">
          <i class="fas fa-${isPaused?'pause':isEin?'arrow-up':'arrow-down'}"></i>
        </div>
        <div class="wied-card-name">
          ${w.bezeichnung}
          ${isFaellig?'<span class="wied-faellig-badge">● Fällig</span>':''}
          ${isPaused?'<span style="font-size:10px;font-weight:600;color:var(--sub);background:var(--s2);padding:1px 6px;border-radius:3px;margin-left:4px">Pausiert</span>':''}
        </div>
        <div class="wied-card-meta">
          <span><i class="fas fa-tag" style="font-size:10px"></i>${w.kategorie}</span>
          <span><i class="fas fa-sync-alt" style="font-size:10px"></i>${intervallLabel[w.intervall]||w.intervall}</span>
          <span><i class="fas fa-credit-card" style="font-size:10px"></i>${w.zahlungsart}</span>
          ${w.anbieter?`<span style="color:var(--blue)"><i class="fas fa-building" style="font-size:10px"></i>${w.anbieter}</span>`:''}
        </div>
        <div class="wied-card-schedule">
          <span class="wied-card-next" style="color:${isFaellig?'var(--yellow)':isPaused?'var(--sub)':'var(--sub)'}">
            <i class="fas fa-calendar-alt" style="font-size:10px;margin-right:3px"></i>Nächste: <strong>${fdm(w.naechste)}</strong>
            ${w.enddatum?`<span style="margin-left:4px;opacity:.7">· bis ${fdm(w.enddatum)}</span>`:''}
          </span>
          ${_wBookedCount>0?`<span style="font-size:11px;color:var(--sub)"><i class="fas fa-history" style="font-size:10px;margin-right:2px"></i>${_wBookedCount}× gebucht</span>`:''}
          <span style="font-size:11px;color:var(--sub)"><i class="fas fa-calendar-check" style="font-size:10px;margin-right:2px"></i>≈ ${fmt(_wJahres)}/Jahr</span>
        </div>
      </div>
      <div class="wied-card-right">
        <div class="wied-card-betrag" style="color:${isEin?'var(--green)':'var(--red)'}">
          ${isEin?'+':'−'}${fmt(w.betrag)}
        </div>
        <div class="wied-card-actions" onclick="event.stopPropagation()">
          ${isMob() ? _moreBtn([
            {icon:'fa-hand-pointer', label:'Jetzt buchen',  action:()=>wBuchen(w.id)},
            {icon:'fa-pause',        label:w.status==='paused'?'Fortsetzen':'Pausieren', action:()=>_wTogglePause(w.id)},
            {icon:'fa-edit',         label:'Bearbeiten',    action:()=>editWied(w.id)},
            {icon:'fa-trash',        label:'Löschen',       danger:true, action:()=>delWied(w.id)}
          ]) : `
            <button class="rca-btn rca-green" onclick="wBuchen('${w.id}')" title="Jetzt buchen"><i class="fas fa-hand-pointer"></i></button>
            <button class="rca-btn" onclick="_wTogglePause('${w.id}')" title="${isPaused?'Fortsetzen':'Pausieren'}" style="${isPaused?'color:var(--green)':''}"><i class="fas fa-${isPaused?'play-circle':'pause'}"></i></button>
            <button class="rca-btn" onclick="editWied('${w.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
            <button class="rca-btn rca-red" onclick="delWied('${w.id}')" title="Löschen"><i class="fas fa-trash"></i></button>
          `}
        </div>
      </div>
    </div>`;
  }).join('');

  // Сводка
  const totalEin=wied.filter(w=>w.typ==='Einnahme').reduce((s,w)=>s+w.betrag,0);
  const totalAus=wied.filter(w=>w.typ==='Ausgabe').reduce((s,w)=>s+w.betrag,0);
  const summary=`<div class="wied-summary">
    <span>${wied.length} Vorlage${wied.length!==1?'n':''}</span>
    <span><span style="color:var(--green)">+${fmt(totalEin)}</span> / <span style="color:var(--red)">−${fmt(totalAus)}</span> pro Intervall</span>
  </div>`;

  if(container) container.innerHTML=cards+summary;

  // Пагинация
  window._wiedPagerCb=function(p){wiedPage=p;renderWied();}
  renderPager('wied-pagination', wiedPage, totalPages, sorted.length, '_wiedPagerCb');
  _updateWiedSortBtns();
}
function setWiedTyp(t){
  wiedTyp=t;
  document.getElementById('wied-btn-e').className='tt'+(t==='Einnahme'?' ae':'');
  document.getElementById('wied-btn-a').className='tt'+(t==='Ausgabe'?' aa':'');
  document.getElementById('wied-kat').innerHTML=(t==='Einnahme'?KE:KA).map(k=>`<option value="${k}">${k}</option>`).join('');
  if(typeof updateWiedSidebar==='function') updateWiedSidebar();
}
let editWiedId = null;

function openWiedModal(){
  editWiedId = null;
  wiedTyp='Ausgabe';
  window._wiedPrevPage = curPage || 'wiederkehrend';
  nav('wiedform', null);
  setTimeout(()=>{
    setWiedTyp('Ausgabe');
    document.getElementById('wied-dsc').value='';
    document.getElementById('wied-bet').value='';
    document.getElementById('wied-ab').value=new Date().toISOString().split('T')[0];
    document.getElementById('wied-kat').value='';
    document.getElementById('wied-int').value='monatlich';
    document.getElementById('wied-zahl').value='Überweisung';
    // New fields
    const bis=document.getElementById('wied-bis');if(bis)bis.value='';
    const rem=document.getElementById('wied-remind');if(rem)rem.value='3';
    const auto=document.getElementById('wied-auto');if(auto)auto.value='manual';
    const anb=document.getElementById('wied-anbieter');if(anb)anb.value='';
    const vtr=document.getElementById('wied-vertrag');if(vtr)vtr.value='';
    const ku=document.getElementById('wied-kuendigung');if(ku)ku.value='';
    const lz=document.getElementById('wied-laufzeit');if(lz)lz.value='';
    const notiz=document.getElementById('wied-notiz');if(notiz)notiz.value='';
    // Hide edit-only blocks
    const sb=document.getElementById('wied-status-block');if(sb)sb.style.display='none';
    const hb=document.getElementById('wied-history-block');if(hb)hb.style.display='none';
    // Collapse contract
    const cf=document.getElementById('wied-contract-fields');if(cf)cf.style.display='none';
    const ct=document.getElementById('wied-contract-toggle');if(ct)ct.textContent='Einblenden ▾';
    // Title
    const hdr=document.getElementById('wied-form-title');if(hdr)hdr.textContent='Neue Vorlage';
    updateWiedSidebar();
  },30);
}

function editWied(id){
  const w=(data.wiederkehrend||[]).find(x=>x.id===id);
  if(!w)return;
  editWiedId=id;
  window._wiedPrevPage=curPage||'wiederkehrend';
  nav('wiedform',null);
  setTimeout(()=>{
    wiedTyp=w.typ||'Ausgabe';
    setWiedTyp(wiedTyp);
    document.getElementById('wied-dsc').value=w.bezeichnung||w.beschreibung||'';
    document.getElementById('wied-bet').value=w.betrag||'';
    document.getElementById('wied-ab').value=w.naechste||'';
    const katSel=document.getElementById('wied-kat');
    if(katSel){[...katSel.options].forEach(o=>{if(o.value===w.kategorie)o.selected=true;});}
    const intSel=document.getElementById('wied-int');if(intSel)intSel.value=w.intervall||'monatlich';
    const zahlSel=document.getElementById('wied-zahl');if(zahlSel)zahlSel.value=w.zahlungsart||'Überweisung';
    // Extended fields
    const bis=document.getElementById('wied-bis');if(bis)bis.value=w.enddatum||'';
    const rem=document.getElementById('wied-remind');if(rem)rem.value=(w.erinnerung!=null?w.erinnerung:'3');
    const auto=document.getElementById('wied-auto');if(auto)auto.value=w.autoBuchung||'manual';
    const anb=document.getElementById('wied-anbieter');if(anb)anb.value=w.anbieter||'';
    const vtr=document.getElementById('wied-vertrag');if(vtr)vtr.value=w.vertragsnr||'';
    const ku=document.getElementById('wied-kuendigung');if(ku)ku.value=w.kuendigung||'';
    const lz=document.getElementById('wied-laufzeit');if(lz)lz.value=w.laufzeit||'';
    const notiz=document.getElementById('wied-notiz');if(notiz)notiz.value=w.notiz||'';
    // Show contract block if any contract data exists
    if(w.anbieter||w.vertragsnr||w.kuendigung||w.laufzeit||w.notiz){
      const cf=document.getElementById('wied-contract-fields');if(cf)cf.style.display='';
      const ct=document.getElementById('wied-contract-toggle');if(ct)ct.textContent='Ausblenden ▴';
    }
    // Show status block (edit mode)
    const sb=document.getElementById('wied-status-block');if(sb)sb.style.display='';
    setWiedStatus(w.status||'active');
    // Show history
    const hb=document.getElementById('wied-history-block');if(hb)hb.style.display='';
    renderWiedHistory(w);
    // Title
    const hdr=document.getElementById('wied-form-title');if(hdr)hdr.textContent='Vorlage bearbeiten';
    updateWiedSidebar();
  },30);
}
function closeWiedForm(){
  const prev=window._wiedPrevPage||'wiederkehrend';
  nav(prev,document.querySelector('.nav-item[onclick*="wiederkehrend"]')||document.querySelector('.nav-item'));
}
function saveWied(){
  const bez=document.getElementById('wied-dsc').value.trim();
  const betrag=parseFloat(document.getElementById('wied-bet').value);
  const ab=document.getElementById('wied-ab').value;
  if(!bez||!betrag||!ab)return toast('Bezeichnung, Betrag und Startdatum sind Pflicht!','err');
  if(!data.wiederkehrend)data.wiederkehrend=[];
  const obj={
    bezeichnung:bez,typ:wiedTyp,betrag,
    kategorie:normKat(document.getElementById('wied-kat').value),
    zahlungsart:normZahl(document.getElementById('wied-zahl').value),
    intervall:document.getElementById('wied-int').value,
    naechste:ab,
    // Extended
    enddatum:document.getElementById('wied-bis')?.value||'',
    erinnerung:parseInt(document.getElementById('wied-remind')?.value)||0,
    autoBuchung:document.getElementById('wied-auto')?.value||'manual',
    anbieter:document.getElementById('wied-anbieter')?.value.trim()||'',
    vertragsnr:document.getElementById('wied-vertrag')?.value.trim()||'',
    kuendigung:document.getElementById('wied-kuendigung')?.value||'',
    laufzeit:document.getElementById('wied-laufzeit')?.value||'',
    notiz:document.getElementById('wied-notiz')?.value.trim()||'',
  };
  if(editWiedId){
    const w=data.wiederkehrend.find(x=>x.id===editWiedId);
    if(w){
      const prevStatus=w.status;
      Object.assign(w,obj);
      w.status=w.status||prevStatus||'active';
      sbSaveWied(w);
    }
    editWiedId=null;
    toast('Vorlage aktualisiert','ok');
  } else {
    const newW={id:Date.now()+'_'+Math.random().toString(36).slice(2,6),status:'active',buchungen:0,...obj};
    data.wiederkehrend.push(newW);
    sbSaveWied(newW);
    toast('Vorlage gespeichert','ok');
  }
  renderWied();closeWiedForm();
}

// ── Toggle contract section ─────
function toggleWiedContract(){
  const f=document.getElementById('wied-contract-fields');
  const t=document.getElementById('wied-contract-toggle');
  if(!f)return;
  if(f.style.display==='none'){f.style.display='';if(t)t.textContent='Ausblenden ▴';}
  else{f.style.display='none';if(t)t.textContent='Einblenden ▾';}
}

// ── Status toggle ───────────────
function setWiedStatus(status){
  const ab=document.getElementById('wied-status-active');
  const pb=document.getElementById('wied-status-paused');
  const pi=document.getElementById('wied-pause-info');
  if(ab){ ab.classList.toggle('wied-status-active-sel', status==='active'); ab.style.background=''; ab.style.borderColor=''; ab.style.color=''; }
  if(pb){ pb.classList.toggle('wied-status-paused-sel', status==='paused'); pb.style.background=''; pb.style.borderColor=''; pb.style.color=''; }
  if(pi) pi.style.display=status==='paused'?'':'none';
  if(editWiedId){
    const w=(data.wiederkehrend||[]).find(x=>x.id===editWiedId);
    if(w){w.status=status;sbSaveWied(w);}
  }
}

// ── History of booked payments ──
function renderWiedHistory(w){
  const hc=document.getElementById('wied-history-content');if(!hc)return;
  // Find entries that match this template
  const matches=(data.eintraege||[]).filter(e=>
    !e.is_storno&&!e._storniert&&
    e.beschreibung===w.bezeichnung&&e.typ===w.typ&&
    Math.abs(e.betrag-w.betrag)<0.02
  ).sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')).slice(0,8);
  if(!matches.length){hc.innerHTML='<div style="color:var(--sub)">Noch keine Buchungen zu dieser Vorlage</div>';return;}
  const total=matches.reduce((s,e)=>s+e.betrag,0);
  hc.innerHTML=`<div style="margin-bottom:8px;font-weight:600;color:var(--text)">${matches.length} Buchung${matches.length!==1?'en':''} · ${fmt(total)}</div>`+
    matches.map(e=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
      <span style="font-family:var(--mono);font-size:11px">${fd(e.datum)}</span>
      <span style="font-family:var(--mono);font-size:11px;font-weight:600;color:${e.typ==='Einnahme'?'var(--green)':'var(--red)'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span>
    </div>`).join('');
}

// ── Live sidebar update ─────────
function updateWiedSidebar(){
  const bet=parseFloat(document.getElementById('wied-bet')?.value)||0;
  const intv=document.getElementById('wied-int')?.value||'monatlich';
  const startDate=document.getElementById('wied-ab')?.value||'';
  const endDate=document.getElementById('wied-bis')?.value||'';

  // 1. Hochrechnung
  const calcEl=document.getElementById('wied-calc-info');
  if(calcEl){
    if(!bet){calcEl.innerHTML='<div style="color:var(--sub);font-size:14px">Betrag und Intervall eingeben</div>';}
    else{
      const mult={woechentlich:52,monatlich:12,quartalsweise:4,halbjaehrlich:2,jaehrlich:1};
      const labels={woechentlich:'Woche',monatlich:'Monat',quartalsweise:'Quartal',halbjaehrlich:'Halbjahr',jaehrlich:'Jahr'};
      const perYear=bet*(mult[intv]||12);
      const perMonth=perYear/12;
      const perDay=perYear/365;
      calcEl.innerHTML=`
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--sub)">Pro ${labels[intv]||'Monat'}</span>
          <span style="font-family:var(--mono);font-weight:700">${bet.toLocaleString('de-DE',{minimumFractionDigits:2})} €</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--sub)">Pro Monat</span>
          <span style="font-family:var(--mono);font-weight:600">${perMonth.toLocaleString('de-DE',{minimumFractionDigits:2})} €</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--sub)">Pro Tag</span>
          <span style="font-family:var(--mono);font-size:14px">${perDay.toLocaleString('de-DE',{minimumFractionDigits:2})} €</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0">
          <span style="color:var(--sub);font-weight:600">Pro Jahr</span>
          <span style="font-family:var(--mono);font-weight:700;font-size:15px">${perYear.toLocaleString('de-DE',{minimumFractionDigits:2})} €</span>
        </div>
        ${endDate?`<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:space-between">
          <span style="color:var(--sub);font-size:14px">Gesamtkosten bis ${fd(endDate)}</span>
          <span style="font-family:var(--mono);font-weight:700;font-size:12px">${_calcTotalUntil(bet,intv,startDate,endDate)}</span>
        </div>`:''}`;
    }
  }

  // 2. Next dates
  const datesEl=document.getElementById('wied-dates-preview');
  if(datesEl){
    if(!startDate){datesEl.innerHTML='Startdatum eingeben für Vorschau';}
    else{
      const dates=_calcNextDates(startDate,intv,endDate,8);
      const today=new Date().toISOString().split('T')[0];
      datesEl.innerHTML=dates.map((d,i)=>{
        const isPast=d<today;
        const isNext=!isPast&&(i===0||dates[i-1]<today);
        return`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;${i<dates.length-1?'border-bottom:1px solid var(--border)':''}${isPast?';opacity:.4':''}">
          <span style="width:16px;height:16px;border-radius:var(--r);background:${isNext?'var(--blue)':isPast?'var(--border)':'var(--s2)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${isNext?'<span style="width:5px;height:5px;border-radius:50%;background:#fff"></span>':'<span style="font-size:8px;color:var(--sub)">'+(i+1)+'</span>'}
          </span>
          <span style="font-family:var(--mono);font-size:14px;${isNext?'font-weight:700;color:var(--blue)':''}">${fd(d)}</span>
          ${isNext?'<span style="font-size:9px;font-weight:700;color:var(--blue);background:var(--bdim);padding:1px 5px;border-radius:3px">NÄCHSTE</span>':''}
          ${isPast?'<span style="font-size:9px;color:var(--sub)">✓</span>':''}
        </div>`;
      }).join('')||'<span>Keine Termine</span>';
    }
  }

  // 3. Budget share
  const budgetEl=document.getElementById('wied-budget-info');
  if(budgetEl&&bet){
    const mult={woechentlich:52,monatlich:12,quartalsweise:4,halbjaehrlich:2,jaehrlich:1};
    const yearCost=bet*(mult[intv]||12);
    const totalRef=(data.eintraege||[]).filter(e=>!e.is_storno&&!e._storniert&&e.typ===wiedTyp).reduce((s,e)=>s+e.betrag,0);
    const pct=totalRef>0?Math.round(yearCost/totalRef*100):0;
    const bar=Math.min(pct,100);
    budgetEl.innerHTML=`
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span>${wiedTyp==='Ausgabe'?'Anteil an Ausgaben':'Anteil an Einnahmen'}</span>
        <span style="font-family:var(--mono);font-weight:700">${pct}%</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${bar}%;background:${pct>50?'var(--red)':pct>25?'var(--yellow)':'var(--blue)'};border-radius:3px;transition:width .4s"></div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--sub)">${fmt(yearCost)} / Jahr von ${fmt(totalRef)} Gesamt</div>`;
  } else if(budgetEl){budgetEl.innerHTML='—';}
}

// ── Helpers ─────────────────────
function _calcNextDates(start,intv,end,count){
  const dates=[];const d=new Date(start);if(isNaN(d.getTime()))return dates;
  const day=d.getDate();
  for(let i=0;i<count;i++){
    const ds=d.toISOString().split('T')[0];
    if(end&&ds>end)break;
    dates.push(ds);
    // Advance
    if(intv==='woechentlich'){d.setDate(d.getDate()+7);}
    else if(intv==='monatlich'){d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
    else if(intv==='quartalsweise'){d.setDate(1);d.setMonth(d.getMonth()+3);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
    else if(intv==='halbjaehrlich'){d.setDate(1);d.setMonth(d.getMonth()+6);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
    else{d.setFullYear(d.getFullYear()+1);}
  }
  return dates;
}
function _calcTotalUntil(bet,intv,start,end){
  if(!start||!end)return'—';
  const dates=_calcNextDates(start,intv,end,500);
  const total=dates.length*bet;
  return fmt(total);
}
function wBuchenCore(id){
  // Только данные — без renderAll/renderWied
  const w=data.wiederkehrend.find(x=>x.id===id); if(!w) return null;
  const newE={
    id:Date.now()+'_'+Math.random().toString(36).slice(2,6),
    datum:w.naechste, typ:w.typ, kategorie:w.kategorie,
    zahlungsart:w.zahlungsart, beschreibung:w.bezeichnung,
    notiz:'Wiederkehrend', betrag:w.betrag,
    _fromWiederkehrend: true,
    _wiederkehrendId: w.id
  };
  data.eintraege.unshift(newE);
  sbSaveEintrag(newE);
  // Вычисляем следующую дату без переполнения месяца (31 янв → 28 фев, не 3 мар)
  const d=new Date(w.naechste);
  if(isNaN(d.getTime())) return newE; // невалидная дата — не обновляем naechste
  const day=d.getDate();
  if(w.intervall==='woechentlich'){
    d.setDate(d.getDate()+7);
  } else if(w.intervall==='monatlich'){
    d.setDate(1); d.setMonth(d.getMonth()+1);
    d.setDate(Math.min(day, new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  } else if(w.intervall==='quartalsweise'){
    d.setDate(1); d.setMonth(d.getMonth()+3);
    d.setDate(Math.min(day, new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  } else if(w.intervall==='halbjaehrlich'){
    d.setDate(1); d.setMonth(d.getMonth()+6);
    d.setDate(Math.min(day, new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  } else {
    d.setFullYear(d.getFullYear()+1);
  }
  w.naechste=d.toISOString().split('T')[0];
  sbSaveWied(w);
  return newE;
}

function wBuchen(id){
  const newE = wBuchenCore(id);
  if(!newE) return;
  renderAll(); renderWied();
  const w=data.wiederkehrend.find(x=>x.id===id);
  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> ${newE.beschreibung} gebucht!`, 'ok');
}

function wBuchenAlle(){
  const today=new Date().toISOString().split('T')[0];
  const faellig=(data.wiederkehrend||[]).filter(w=>w.naechste<=today&&w.status!=='paused');
  if(!faellig.length) return toast('Keine fälligen Zahlungen', 'err');
  // Бронируем все без промежуточных renderAll
  faellig.forEach(w=>wBuchenCore(w.id));
  // Один рендер после всех
  renderAll(); renderWied();
  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> ${faellig.length} Zahlungen gebucht!`, 'ok');
}
async function delWied(id){const _okW=await appConfirm('Vorlage wirklich löschen?',{title:'Vorlage löschen',icon:'🗑️',okLabel:'Löschen',danger:true}); if(!_okW)return;data.wiederkehrend=(data.wiederkehrend||[]).filter(w=>w.id!==id);sbDeleteWied(id);renderWied();toast('Gelöscht','err');}

function _wTogglePause(id){
  const w=data.wiederkehrend.find(x=>x.id===id); if(!w) return;
  w.status = w.status==='paused' ? 'active' : 'paused';
  sbSaveWied(w); renderWied();
  toast(w.status==='paused' ? '⏸ Pausiert' : '▶ Fortgesetzt', 'ok');
}



// ── Имя файла по выбранному периоду фильтра ───────────────────────────────
function _getPeriodLabel() {
  const j = document.getElementById('f-jahr')?.value || 'Alle';
  const m = document.getElementById('f-mon')?.value  || 'Alle';
  if (j === 'Alle') return 'Gesamt';
  if (m === 'Alle') return j;
  return `${j}-${m.padStart(2,'0')}`;
}

// ── CSV: выбор формата ────────────────────────────────────────────────────
function exportCSV() {
  const entries = getFiltered();
  if (!entries.length) return toast('Keine Daten', 'err');
  if (document.getElementById('csv-fmt-popup')) return;
  const popup = document.createElement('div');
  popup.id = 'csv-fmt-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:18px 22px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.2);font-family:inherit;min-width:280px';
  popup.innerHTML = `
    <div style="font-weight:600;font-size:13px;margin-bottom:12px;color:var(--text)">&#128229; CSV-Format w&#228;hlen</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button onclick="exportCSVFormat('datev')" style="background:var(--blue);color:#fff;border:none;border-radius:var(--r);padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit">
        <strong>DATEV-kompatibel</strong><br>
        <span style="opacity:.8;font-size:11px">Semikolon &middot; Komma als Dezimal &middot; TT.MM.JJJJ &middot; f&#252;r Steuerberater</span>
      </button>
      <button onclick="exportCSVFormat('universal')" style="background:var(--green);color:#fff;border:none;border-radius:var(--r);padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit">
        <strong>Universal (RFC 4180)</strong><br>
        <span style="opacity:.8;font-size:11px">Semikolon &middot; Punkt als Dezimal &middot; JJJJ-MM-TT &middot; f&#252;r Excel / Google Sheets</span>
      </button>
      <button onclick="document.getElementById('csv-fmt-popup').remove()" style="background:transparent;border:1px solid var(--border);border-radius:var(--r);padding:8px;font-size:12px;cursor:pointer;color:var(--sub);font-family:inherit">Abbrechen</button>
    </div>`;
  document.body.appendChild(popup);
  setTimeout(() => { if (popup.parentNode) popup.remove(); }, 15000);
}

function exportCSVFormat(fmt) {
  document.getElementById('csv-fmt-popup')?.remove();
  const entries = getFiltered();
  if (!entries.length) return toast('Keine Daten', 'err');

  const period  = _getPeriodLabel();
  const ein     = sum(entries, 'Einnahme');
  const aus     = sum(entries, 'Ausgabe');
  const gew     = ein - aus;
  const mwstSum = entries.reduce((s,e) => s + (e.mwstBetrag||0), 0);

  const byCat = {};
  entries.forEach(e => {
    if (!byCat[e.kategorie]) byCat[e.kategorie] = {ein:0, aus:0};
    if (e.typ==='Einnahme') byCat[e.kategorie].ein += e.betrag;
    else                    byCat[e.kategorie].aus += e.betrag;
  });

  const isDatev = fmt === 'datev';
  const fmtNum  = n => isDatev ? String(r2(n)).replace('.',',') : r2(n).toFixed(2);
  const fmtDate = d => isDatev ? (d ? d.split('-').reverse().join('.') : '') : (d||'');
  const sep = ';';
  const qv = v => {
    const s = String(v).replace(/"/g,'""');
    return isDatev ? s.replace(/;/g,'|') : `"${s}"`;
  };

  const rows = [];
  rows.push([qv('Buchaltung Pro'), qv('Zeitraum: '+period), '', '', '', '', '', ''].join(sep));
  rows.push([qv('Erstellt: '+new Date().toLocaleDateString('de-DE')), '', '', '', '', '', '', ''].join(sep));
  rows.push(['','','','','','','',''].join(sep));

  rows.push([
    isDatev?'Datum':'Datum',
    isDatev?'Belegtyp':'Typ',
    'Kategorie','Beschreibung','Zahlungsart','Notiz',
    'Betrag (EUR)','MwSt (EUR)'
  ].map(qv).join(sep));

  entries.forEach(e => {
    rows.push([
      qv(e.belegnr||''), fmtDate(e.datum), qv(e.typ), qv(e.kategorie), qv(e.beschreibung||''),
      qv(e.zahlungsart||''), qv(e.notiz||''),
      fmtNum(e.typ==='Einnahme' ? e.betrag : -e.betrag),
      fmtNum(e.mwstBetrag||0)
    ].join(sep));
  });

  rows.push(['','','','','','','',''].join(sep));
  rows.push([qv('GESAMT'),'','','','','','',''].join(sep));
  rows.push([qv('Einnahmen'),'','','','','',fmtNum(ein),''].join(sep));
  rows.push([qv('Ausgaben'),'','','','','',fmtNum(-aus),''].join(sep));
  rows.push([qv('Gewinn/Verlust'),'','','','','',fmtNum(gew),''].join(sep));
  rows.push([qv('MwSt gesamt'),'','','','','','',fmtNum(mwstSum)].join(sep));

  rows.push(['','','','','','','',''].join(sep));
  rows.push([qv('KATEGORIEN'),'','','','','','',''].join(sep));
  Object.entries(byCat).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([cat,v]) => {
    rows.push([qv(cat),'','','','','',fmtNum(v.ein - v.aus),''].join(sep));
  });

  const suffix = isDatev ? 'DATEV' : 'Universal';
  dl('\uFEFF' + rows.join('\n'), `Buchaltung_${period}_${suffix}.csv`);
  toast('CSV (' + suffix + ') exportiert!', 'ok');
}

// ── PDF Eintraege mit Zusammenfassung ─────────────────────────────────────
async function exportPDF() {
  const entries = getFiltered();
  if (!entries.length) return toast('Keine Daten', 'err');
  toast('PDF wird erstellt...', 'ok');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const period  = _getPeriodLabel();
    const ein     = sum(entries, 'Einnahme');
    const aus     = sum(entries, 'Ausgabe');
    const gew     = ein - aus;
    const mwstSum = entries.reduce((s,e) => s + (e.mwstBetrag||0), 0);
    const W = 297, pad = 14;

    // Header
    doc.setFillColor(26,69,120);
    doc.rect(0,0,W,20,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text('Buchaltung Pro \u2014 Eintr\u00e4ge', pad, 13);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text('Zeitraum: ' + period + '   Erstellt: ' + new Date().toLocaleDateString('de-DE'), W-pad, 13, {align:'right'});

    // KPI блоки
    let y = 28;
    const kpis = [
      {label:'EINNAHMEN', val:fmt(ein), r:22, g:163, b:74},
      {label:'AUSGABEN',  val:fmt(aus), r:220,g:38, b:38},
      {label:'GEWINN/VERLUST', val:(gew>=0?'+':'')+fmt(gew), r:gew>=0?22:220, g:gew>=0?163:38, b:gew>=0?74:38},
      {label:'MWST GESAMT', val:fmt(mwstSum), r:180, g:120, b:0},
    ];
    const bw = (W - pad*2 - 9) / 4;
    kpis.forEach((k,i) => {
      const x = pad + i*(bw+3);
      doc.setFillColor(k.r,k.g,k.b);
      doc.roundedRect(x,y,bw,14,2,2,'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal'); doc.setFontSize(7);
      doc.text(k.label, x+3, y+5);
      doc.setFont('helvetica','bold'); doc.setFontSize(9);
      doc.text(k.val, x+3, y+11);
    });
    y += 20;

    // Разбивка по категориям
    const byCat = {};
    entries.forEach(e => {
      if (!byCat[e.kategorie]) byCat[e.kategorie] = {ein:0,aus:0};
      if (e.typ==='Einnahme') byCat[e.kategorie].ein += e.betrag;
      else                    byCat[e.kategorie].aus += e.betrag;
    });
    doc.setTextColor(80,80,80); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('Kategorien:', pad, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    let cx = pad;
    Object.entries(byCat).sort((a,b)=>(b[1].ein+b[1].aus)-(a[1].ein+a[1].aus)).forEach(([cat,v]) => {
      const g = v.ein - v.aus;
      const label = cat + ': ' + (g>=0?'+':'') + fmt(g);
      const tw = doc.getTextWidth(label) + 8;
      if (cx + tw > W - pad) { cx = pad; y += 5; }
      doc.setFillColor(240,244,248); doc.setDrawColor(180,200,220);
      doc.roundedRect(cx,y-3.5,tw,5,1.5,1.5,'FD');
      doc.setTextColor(g>=0?16:160, g>=0?100:20, g>=0?60:20);
      doc.text(label, cx+4, y); cx += tw + 3;
    });
    y += 8;

    // Разбивка по месяцам
    const j = document.getElementById('f-jahr')?.value;
    if (j && j !== 'Alle') {
      const months = [...new Set(entries.map(e=>e.datum.substring(5,7)))].sort();
      if (months.length > 1) {
        doc.setTextColor(80,80,80); doc.setFont('helvetica','bold'); doc.setFontSize(8);
        doc.text('Monatsverlauf:', pad, y); y += 5;
        doc.setFont('helvetica','normal'); doc.setFontSize(7);
        let mx = pad;
        months.forEach(mi => {
          const me = entries.filter(e=>e.datum.substring(5,7)===mi);
          const mg = sum(me,'Einnahme') - sum(me,'Ausgabe');
          const mname = (typeof MN !== 'undefined' ? MN[parseInt(mi)-1] : mi).slice(0,3);
          const label = mname + ': ' + (mg>=0?'+':'') + fmt(mg);
          const tw = doc.getTextWidth(label) + 8;
          if (mx + tw > W - pad) { mx = pad; y += 5; }
          doc.setFillColor(mg>=0?235:255, mg>=0?248:235, mg>=0?235:235);
          doc.setDrawColor(mg>=0?22:180, mg>=0?163:30, mg>=0?74:30);
          doc.roundedRect(mx,y-3.5,tw,5,1.5,1.5,'FD');
          doc.setTextColor(mg>=0?16:160, mg>=0?100:20, mg>=0?60:20);
          doc.text(label, mx+4, y); mx += tw + 3;
        });
        y += 8;
      }
    }

    // Разделитель
    doc.setDrawColor(200,210,220); doc.line(pad,y,W-pad,y); y += 2;

    // Заголовок таблицы
    const cols = ['Beleg-Nr.','Datum','Typ','Kategorie','Beschreibung','Zahlungsart','MwSt','Brutto'];
    const cw   = [22,     20,   38,          80,            28,           22,    28];
    doc.setFillColor(241,245,249);
    doc.rect(pad,y,W-pad*2,6,'F');
    doc.setTextColor(80,80,80); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
    let cx2 = pad;
    cols.forEach((c,i) => { doc.text(c, cx2+1, y+4.2); cx2 += cw[i]; });
    y += 7;

    // Строки записей
    doc.setFont('helvetica','normal'); doc.setFontSize(7);
    entries.forEach((e,idx) => {
      if (y > 185) { doc.addPage(); y = 14; }
      if (idx%2===0) { doc.setFillColor(249,250,251); doc.rect(pad,y-1,W-pad*2,6,'F'); }
      const isEin = e.typ==='Einnahme';
      cx2 = pad;
      const vals = [
        e.datum ? e.datum.split('-').reverse().join('.') : '',
        e.typ, e.kategorie,
        (e.beschreibung||'').substring(0,42),
        e.zahlungsart||'\u2014',
        fmt(e.mwstBetrag||0),
        (isEin?'+':'\u2212')+fmt(e.betrag)
      ];
      vals.forEach((v,i) => {
        doc.setTextColor(i===6 ? (isEin?22:180) : 60, i===6 ? (isEin?120:30) : 60, i===6 ? (isEin?70:30) : 60);
        doc.text(String(v), cx2+1, y+3.5);
        cx2 += cw[i];
      });
      y += 6;
    });

    // Итоговая строка
    doc.setDrawColor(26,69,120); doc.line(pad,y,W-pad,y); y += 1;
    doc.setFillColor(26,69,120); doc.rect(pad,y,W-pad*2,7,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('Einnahmen: '+fmt(ein), pad+2, y+5);
    doc.text('Ausgaben: '+fmt(aus), pad+60, y+5);
    doc.text('Gewinn/Verlust: '+(gew>=0?'+':'')+fmt(gew), pad+120, y+5);
    doc.text('MwSt: '+fmt(mwstSum), pad+200, y+5);

    doc.save('Buchaltung_' + period + '.pdf');
    toast('PDF gespeichert!', 'ok');
  } catch(e) {
    console.error(e); toast('Fehler beim PDF-Erstellen', 'err');
  }
}


function exportRepCSV(){
  const yr=document.getElementById('rep-yr')?.value||new Date().getFullYear()+'';
  const ye=activeEintraege().filter(e=>e.datum.startsWith(yr));
  const rows=[['Monat','Einnahmen (EUR)','Ausgaben (EUR)','Gewinn (EUR)','Kumuliert (EUR)','Einträge']];
  let c=0;
  for(let i=0;i<12;i++){
    const mi=String(i+1).padStart(2,'0');
    const me=ye.filter(e=>e.datum.substring(5,7)===mi);
    const ein=sum(me,'Einnahme'),aus=sum(me,'Ausgabe'),gew=ein-aus;c+=gew;
    rows.push([MN[i],r2(ein),r2(aus),r2(gew),r2(c),me.length]);
  }
  const ein=sum(ye,'Einnahme'),aus=sum(ye,'Ausgabe');
  rows.push(['GESAMT',r2(ein),r2(aus),r2(ein-aus),'',ye.length]);
  dl('\uFEFF'+rows.map(r=>r.join(';')).join('\n'),`monatsbericht_${yr}.csv`);
  toast(' Jahresbericht exportiert!','ok');
}

// ── MONATSDETAIL ─────────────────────────────────────────────────────────
let _monEntries=[], _monLabel='';

function openMonatDetail(yr, mi){
  const entries = activeEintraege()
    .filter(e=>e.datum.startsWith(yr) && e.datum.substring(5,7)===mi)
    .sort((a,b)=>a.datum.localeCompare(b.datum));
  _monEntries = entries;
  const monName = MN[parseInt(mi)-1];
  _monLabel = `${monName} ${yr}`;

  document.getElementById('mon-modal-title').innerHTML = `<i class="fas fa-calendar-alt"></i> ${_monLabel}`;

  const ein=sum(entries,'Einnahme'), aus=sum(entries,'Ausgabe'), gew=ein-aus;
  document.getElementById('mon-modal-stats').innerHTML=`
    <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Einnahmen</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--green)">${fmt(ein)}</div>
    </div>
    <div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Ausgaben</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--red)">${fmt(aus)}</div>
    </div>
    <div style="background:${gew>=0?'var(--gdim)':'var(--rdim)'};border:1px solid ${gew>=0?'var(--green)':'var(--red)'};border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Gewinn</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:${gew>=0?'var(--green)':'var(--red)'}">${gew>=0?'+':''}${fmt(gew)}</div>
    </div>`;

  document.getElementById('mon-modal-count').textContent = `${entries.length} ${'Einträge'}`;

  if(!entries.length){
    document.getElementById('mon-modal-tbody').innerHTML=`<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--sub)">Keine Einträge für ${_monLabel}</td></tr>`;
  } else {
    document.getElementById('mon-modal-tbody').innerHTML=entries.map(e=>`
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <td style="padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--sub)">${fdm(e.datum)}</td>
        <td style="padding:8px 12px"><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'}</span></td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px;color:var(--sub)">${e.kategorie}</td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px">${e.beschreibung}${e.notiz?` <span title="${e.notiz}" style="color:var(--sub);font-size:10px">[PDF]</span>`:''}</td>
        <td class="mob-hide" style="padding:8px 12px"><span class="badge ${ZBADGE[e.zahlungsart]||''}">${e.zahlungsart||'—'}</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-weight:600;color:${e.typ==='Einnahme'?'var(--green)':'var(--red)'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</td>
      </tr>`).join('');
  }
  openModal('mon-modal');
}

function exportMonatCSV(){
  if(!_monEntries.length) return toast('Keine Daten','err');
  if(document.getElementById('csv-fmt-popup')) return;
  const popup = document.createElement('div');
  popup.id = 'csv-fmt-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:18px 22px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.2);font-family:inherit;min-width:280px';
  popup.innerHTML = `
    <div style="font-weight:600;font-size:13px;margin-bottom:12px">&#128229; CSV-Format</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button onclick="exportMonatCSVFormat('datev')" style="background:var(--blue);color:#fff;border:none;border-radius:var(--r);padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit"><strong>DATEV-kompatibel</strong><br><span style="opacity:.8;font-size:11px">f&#252;r Steuerberater</span></button>
      <button onclick="exportMonatCSVFormat('universal')" style="background:var(--green);color:#fff;border:none;border-radius:var(--r);padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit"><strong>Universal (RFC 4180)</strong><br><span style="opacity:.8;font-size:11px">f&#252;r Excel / Google Sheets</span></button>
      <button onclick="document.getElementById('csv-fmt-popup').remove()" style="background:transparent;border:1px solid var(--border);border-radius:var(--r);padding:8px;font-size:12px;cursor:pointer;color:var(--sub);font-family:inherit">Abbrechen</button>
    </div>`;
  document.body.appendChild(popup);
  setTimeout(()=>{if(popup.parentNode)popup.remove();},15000);
}

function exportMonatCSVFormat(fmt){
  document.getElementById('csv-fmt-popup')?.remove();
  if(!_monEntries.length) return toast('Keine Daten','err');
  const ein=sum(_monEntries,'Einnahme'), aus=sum(_monEntries,'Ausgabe'), gew=ein-aus;
  const mwst=_monEntries.reduce((s,e)=>s+(e.mwstBetrag||0),0);
  const byCat={};
  _monEntries.forEach(e=>{
    if(!byCat[e.kategorie])byCat[e.kategorie]={ein:0,aus:0};
    if(e.typ==='Einnahme')byCat[e.kategorie].ein+=e.betrag;
    else byCat[e.kategorie].aus+=e.betrag;
  });
  const isDatev=fmt==='datev';
  const fmtNum=n=>isDatev?String(r2(n)).replace('.',','):r2(n).toFixed(2);
  const fmtDate=d=>isDatev?(d?d.split('-').reverse().join('.'):''):(d||'');
  const qv=v=>{const s=String(v).replace(/"/g,'""');return isDatev?s.replace(/;/g,'|'):`"${s}"`;};
  const sep=';';
  const rows=[];
  rows.push([qv('Buchaltung Pro'),qv('Zeitraum: '+_monLabel),'','','','','',''].join(sep));
  rows.push([qv('Erstellt: '+new Date().toLocaleDateString('de-DE')),'','','','','','',''].join(sep));
  rows.push(['','','','','','','',''].join(sep));
  rows.push(['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','Notiz','Betrag (EUR)','MwSt (EUR)'].map(qv).join(sep));
  _monEntries.forEach(e=>rows.push([
    fmtDate(e.datum),qv(e.typ),qv(e.kategorie),qv(e.beschreibung||''),
    qv(e.zahlungsart||''),qv(e.notiz||''),
    fmtNum(e.typ==='Einnahme'?e.betrag:-e.betrag),
    fmtNum(e.mwstBetrag||0)
  ].join(sep)));
  rows.push(['','','','','','','',''].join(sep));
  rows.push([qv('GESAMT'),'','','','','','',''].join(sep));
  rows.push([qv('Einnahmen'),'','','','','',fmtNum(ein),''].join(sep));
  rows.push([qv('Ausgaben'),'','','','','',fmtNum(-aus),''].join(sep));
  rows.push([qv('Gewinn/Verlust'),'','','','','',fmtNum(gew),''].join(sep));
  rows.push([qv('MwSt gesamt'),'','','','','','',fmtNum(mwst)].join(sep));
  rows.push(['','','','','','','',''].join(sep));
  rows.push([qv('KATEGORIEN'),'','','','','','',''].join(sep));
  Object.entries(byCat).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([cat,v])=>{
    rows.push([qv(cat),'','','','','',fmtNum(v.ein-v.aus),''].join(sep));
  });
  const suffix=isDatev?'DATEV':'Universal';
  const fname=_monLabel.replace(' ','_');
  dl('\uFEFF'+rows.join('\n'),`Buchaltung_${fname}_${suffix}.csv`);
  toast('CSV ('+suffix+') exportiert!','ok');
}

function exportMonatXLS(){
  if(!_monEntries.length) return toast('Keine Daten','err');
  const ein=sum(_monEntries,'Einnahme'), aus=sum(_monEntries,'Ausgabe'), gew=ein-aus;

  // Build XLSX-compatible XML (SpreadsheetML) — works in Excel, LibreOffice, Google Sheets
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const numCell=(v,color='')=>`<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  const strCell=(v,bold=false,color='')=>`<Cell${bold?' ss:StyleID="bold"':''}><Data ss:Type="String">${esc(v)}</Data></Cell>`;

  const rows = _monEntries.map(e=>`    <Row>
      ${strCell(e.datum)}
      ${strCell(e.typ)}
      ${strCell(e.kategorie)}
      ${strCell(e.beschreibung)}
      ${strCell(e.zahlungsart||'')}
      ${strCell(e.notiz||'')}
      <Cell><Data ss:Type="Number">${e.typ==='Einnahme'?e.betrag:-e.betrag}</Data></Cell>
      <Cell><Data ss:Type="Number">${e.betrag}</Data></Cell>
    </Row>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/></Style>
  <Style ss:ID="ein"><Font ss:Color="#16a34a" ss:Bold="1"/></Style>
  <Style ss:ID="aus"><Font ss:Color="#dc2626" ss:Bold="1"/></Style>
  <Style ss:ID="total"><Font ss:Bold="1"/><Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${esc(_monLabel)}">
  <Table>
   <Column ss:Width="90"/><Column ss:Width="80"/><Column ss:Width="120"/>
   <Column ss:Width="180"/><Column ss:Width="100"/><Column ss:Width="150"/>
   <Column ss:Width="90"/><Column ss:Width="90"/>
   <Row ss:StyleID="hdr">
    <Cell><Data ss:Type="String">Datum</Data></Cell>
    <Cell><Data ss:Type="String">Typ</Data></Cell>
    <Cell><Data ss:Type="String">Kategorie</Data></Cell>
    <Cell><Data ss:Type="String">Beschreibung</Data></Cell>
    <Cell><Data ss:Type="String">Zahlungsart</Data></Cell>
    <Cell><Data ss:Type="String">Notiz</Data></Cell>
    <Cell><Data ss:Type="String">Betrag netto (EUR)</Data></Cell>
    <Cell><Data ss:Type="String">Betrag abs. (EUR)</Data></Cell>
   </Row>
${rows}
   <Row ss:StyleID="total">
    <Cell ss:MergeAcross="5"><Data ss:Type="String">${'GESAMT'} ${esc(_monLabel)}</Data></Cell>
    <Cell><Data ss:Type="Number">${(ein-aus).toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row><Cell ss:MergeAcross="7"><Data ss:Type="String"></Data></Cell></Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${'Einnahmen'}</Data></Cell>
    <Cell><Data ss:Type="Number">${ein.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${'Ausgaben'}</Data></Cell>
    <Cell><Data ss:Type="Number">${aus.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${'Gewinn'}</Data></Cell>
    <Cell><Data ss:Type="Number">${gew.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`buchaltung_${_monLabel.replace(' ','_')}.xls`;
  a.click();
  toast(`<i class="fas fa-chart-bar"></i> Excel — ${_monLabel} exportiert`,'ok');
}
