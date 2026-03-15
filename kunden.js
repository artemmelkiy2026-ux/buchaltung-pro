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
      btn.style.background=active?'var(--blue)':'';
      btn.style.borderColor=active?'var(--blue)':'';
      btn.style.color=active?'#fff':'';
      btn.textContent=lbl+(active?(wiedSortAsc?' ↑':' ↓'):'');
    });
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
  const faelligCount=wied.filter(w=>w.naechste<=today).length;
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

  const intervallLabel={monatlich:'Monatlich',quartalsweise:'Quartalsweise',jaehrlich:'Jährlich'};
  const cards=pageItems.map(w=>{
    const isFaellig=w.naechste<=today;
    const isEin=w.typ==='Einnahme';
    return`<div class="wied-card${isFaellig?' wied-card--faellig':''}">
      <div class="wied-card-avatar" style="background:${isEin?'var(--gdim)':'var(--rdim)'};color:${isEin?'var(--green)':'var(--red)'}">
        <i class="fas fa-${isEin?'arrow-up':'arrow-down'}"></i>
      </div>
      <div class="wied-card-body">
        <div class="wied-card-name">${w.bezeichnung}${isFaellig?` <span class="wied-faellig-badge">● Fällig</span>`:''}</div>
        <div class="wied-card-meta">
          <span><i class="fas fa-tag" style="font-size:10px;margin-right:2px"></i>${w.kategorie}</span>
          <span><i class="fas fa-sync-alt" style="font-size:10px;margin-right:2px"></i>${intervallLabel[w.intervall]||w.intervall}</span>
          <span><i class="fas fa-credit-card" style="font-size:10px;margin-right:2px"></i>${w.zahlungsart}</span>
        </div>
        <div class="wied-card-next" style="color:${isFaellig?'var(--yellow)':'var(--sub)'}">
          <i class="fas fa-calendar-alt" style="font-size:10px;margin-right:3px"></i>Nächste Buchung: <strong>${fdm(w.naechste)}</strong>
        </div>
      </div>
      <div class="wied-card-right">
        <div class="wied-card-betrag" style="color:${isEin?'var(--green)':'var(--red)'}">
          ${isEin?'+':'−'}${fmt(w.betrag)}
        </div>
        <div class="wied-card-actions">
          <button class="rca-btn rca-green" onclick="wBuchen('${w.id}')" title="Jetzt buchen"><i class="fas fa-play"></i></button>
          <button class="rca-btn" onclick="delWied('${w.id}')" title="Vorlage löschen"><i class="fas fa-trash"></i></button>
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
}
function openWiedModal(){
  wiedTyp='Ausgabe';
  setWiedTyp('Ausgabe');
  document.getElementById('wied-dsc').value='';
  document.getElementById('wied-bet').value='';
  document.getElementById('wied-ab').value=new Date().toISOString().split('T')[0];
  openModal('wied-modal');
}
function saveWied(){
  const bez=document.getElementById('wied-dsc').value.trim();
  const betrag=parseFloat(document.getElementById('wied-bet').value);
  const ab=document.getElementById('wied-ab').value;
  if(!bez||!betrag||!ab)return toast('Alle Felder ausfüllen!','err');
  if(!data.wiederkehrend)data.wiederkehrend=[];
  const newW={
    id:Date.now()+'',bezeichnung:bez,typ:wiedTyp,betrag,
    kategorie:normKat(document.getElementById('wied-kat').value),
    zahlungsart:normZahl(document.getElementById('wied-zahl').value),
    intervall:document.getElementById('wied-int').value,
    naechste:ab
  };
  data.wiederkehrend.push(newW);
  sbSaveWied(newW);
  renderWied();closeModal('wied-modal');toast('✓ Vorlage gespeichert!','ok');
}
function wBuchenCore(id){
  // Только данные — без renderAll/renderWied
  const w=data.wiederkehrend.find(x=>x.id===id); if(!w) return null;
  const newE={
    id:Date.now()+'_'+Math.random().toString(36).slice(2,6),
    datum:w.naechste, typ:w.typ, kategorie:w.kategorie,
    zahlungsart:w.zahlungsart, beschreibung:w.bezeichnung,
    notiz:'Wiederkehrend', betrag:w.betrag
  };
  data.eintraege.unshift(newE);
  sbSaveEintrag(newE);
  // Вычисляем следующую дату без переполнения месяца (31 янв → 28 фев, не 3 мар)
  const d=new Date(w.naechste);
  const day=d.getDate();
  if(w.intervall==='monatlich'){
    d.setDate(1); d.setMonth(d.getMonth()+1);
    d.setDate(Math.min(day, new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  } else if(w.intervall==='quartalsweise'){
    d.setDate(1); d.setMonth(d.getMonth()+3);
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
  const faellig=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);
  if(!faellig.length) return toast('Keine fälligen Zahlungen', 'err');
  // Бронируем все без промежуточных renderAll
  faellig.forEach(w=>wBuchenCore(w.id));
  // Один рендер после всех
  renderAll(); renderWied();
  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> ${faellig.length} Zahlungen gebucht!`, 'ok');
}
async function delWied(id){const _okW=await appConfirm('Vorlage wirklich löschen?',{title:'Vorlage löschen',icon:'🗑️',okLabel:'Löschen',danger:true}); if(!_okW)return;data.wiederkehrend=(data.wiederkehrend||[]).filter(w=>w.id!==id);sbDeleteWied(id);renderWied();toast('Gelöscht','err');}



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
      <button onclick="exportCSVFormat('datev')" style="background:var(--blue);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit">
        <strong>DATEV-kompatibel</strong><br>
        <span style="opacity:.8;font-size:11px">Semikolon &middot; Komma als Dezimal &middot; TT.MM.JJJJ &middot; f&#252;r Steuerberater</span>
      </button>
      <button onclick="exportCSVFormat('universal')" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit">
        <strong>Universal (RFC 4180)</strong><br>
        <span style="opacity:.8;font-size:11px">Semikolon &middot; Punkt als Dezimal &middot; JJJJ-MM-TT &middot; f&#252;r Excel / Google Sheets</span>
      </button>
      <button onclick="document.getElementById('csv-fmt-popup').remove()" style="background:transparent;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;cursor:pointer;color:var(--sub);font-family:inherit">Abbrechen</button>
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
      fmtDate(e.datum), qv(e.typ), qv(e.kategorie), qv(e.beschreibung||''),
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
    const cols = ['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','MwSt','Brutto'];
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
      <button onclick="exportMonatCSVFormat('datev')" style="background:var(--blue);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit"><strong>DATEV-kompatibel</strong><br><span style="opacity:.8;font-size:11px">f&#252;r Steuerberater</span></button>
      <button onclick="exportMonatCSVFormat('universal')" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit"><strong>Universal (RFC 4180)</strong><br><span style="opacity:.8;font-size:11px">f&#252;r Excel / Google Sheets</span></button>
      <button onclick="document.getElementById('csv-fmt-popup').remove()" style="background:transparent;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;cursor:pointer;color:var(--sub);font-family:inherit">Abbrechen</button>
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

