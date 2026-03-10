// ── WIEDERKEHREND ────────────────────────────────────────────────────────
let wiedTyp='Ausgabe';
function renderWied(){
  const wied=data.wiederkehrend||[];
  const tb=document.getElementById('wied-tbody'),em=document.getElementById('wied-empty');
  if(!wied.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const today=new Date().toISOString().split('T')[0];
  const faelligCount=wied.filter(w=>w.naechste<=today).length;
  const hint=document.getElementById('wied-hint');
  if(faelligCount>0){hint.style.display='';hint.innerHTML=`⚡ <strong>${faelligCount} ${t('fällige Zahlung')}${faelligCount>1?t('en'):''}`;}
  else hint.style.display='none';

  tb.innerHTML=wied.map(w=>{
    const isFaellig=w.naechste<=today;
    return`<tr style="${isFaellig?'background:var(--ydim)':''}">
      <td style="font-weight:500">${w.bezeichnung}${isFaellig?` <span style="color:var(--yellow);font-size:10px">● fällig</span>`:''}</td>
      <td class="mob-hide"><span class="badge ${w.typ==='Einnahme'?'b-ein':'b-aus'}">${w.typ==='Einnahme'?'▲':'▼'} ${w.typ}</span></td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px">${w.kategorie}</td>
      <td style="font-family:var(--mono);font-weight:600;color:${w.typ==='Einnahme'?'var(--green)':'var(--red)'}">${fmt(w.betrag)}</td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px">${{monatlich:t('Monatlich'),quartalsweise:t('Quartalsweise'),jaehrlich:t('Jährlich')}[w.intervall]}</td>
      <td style="font-family:var(--mono);font-size:11px;color:${isFaellig?'var(--yellow)':'var(--sub)'}">${fdm(w.naechste)}</td>
      <td class="mob-hide"><span class="badge ${ZBADGE[w.zahlungsart]||''}">${w.zahlungsart}</span></td>
      <td style="white-space:nowrap">
        <button class="del-btn" style="opacity:1;color:var(--green)" onclick="wBuchen('${w.id}')">▶</button>
        <button class="del-btn" style="opacity:1" onclick="delWied('${w.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
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
  renderWied();closeModal('wied-modal');toast('✅ Vorlage gespeichert!','ok');
}
function wBuchen(id){
  const w=data.wiederkehrend.find(x=>x.id===id); if(!w) return;
  const newE={
    id:Date.now()+'', datum:w.naechste, typ:w.typ, kategorie:w.kategorie,
    zahlungsart:w.zahlungsart, beschreibung:w.bezeichnung,
    notiz:'Wiederkehrend', betrag:w.betrag
  };
  data.eintraege.unshift(newE);
  sbSaveEintrag(newE);
  const d=new Date(w.naechste);
  if(w.intervall==='monatlich') d.setMonth(d.getMonth()+1);
  else if(w.intervall==='quartalsweise') d.setMonth(d.getMonth()+3);
  else d.setFullYear(d.getFullYear()+1);
  w.naechste=d.toISOString().split('T')[0];
  sbSaveWied(w);
  renderAll(); renderWied();
  toast(`✅ ${w.bezeichnung} ${t('gebucht!')}`, 'ok');
}

function wBuchenAlle(){
  const today=new Date().toISOString().split('T')[0];
  const faellig=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);

  // ИСПРАВЛЕНИЕ ТУТ: Переводим ошибку
  if(!faellig.length) return toast(t('Keine fälligen Zahlungen'), 'err');

  faellig.forEach(w=>wBuchen(w.id));

  // ИСПРАВЛЕНИЕ ТУТ: Переводим сообщение об успехе
  toast(`✅ ${faellig.length} ${t('Zahlungen gebucht!')}`, 'ok');
}
function delWied(id){if(!confirm('Vorlage löschen?'))return;data.wiederkehrend=(data.wiederkehrend||[]).filter(w=>w.id!==id);sbDeleteWied(id);renderWied();toast('Gelöscht','err');}



function exportCSV(){
  const entries=getFiltered();
  if(!entries.length)return toast('Keine Daten','err');
  const rows=[['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','Notiz','Betrag (EUR)']];
  entries.forEach(e=>rows.push([e.datum,e.typ,e.kategorie,e.beschreibung,e.zahlungsart||'',e.notiz||'',r2(e.betrag)]));
  dl('\uFEFF'+rows.map(r=>r.join(';')).join('\n'),`buchaltung_${new Date().toISOString().split('T')[0]}.csv`);
  toast('CSV exportiert!','ok');
}
function exportRepCSV(){
  const yr=document.getElementById('rep-yr')?.value||new Date().getFullYear()+'';
  const ye=data.eintraege.filter(e=>e.datum.startsWith(yr));
  const rows=[['Monat','Einnahmen (EUR)','Ausgaben (EUR)','Gewinn (EUR)',t('Kumuliert (EUR)'),'Einträge']];
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
  toast('📤 Jahresbericht exportiert!','ok');
}

// ── MONATSDETAIL ─────────────────────────────────────────────────────────
let _monEntries=[], _monLabel='';

function openMonatDetail(yr, mi){
  const entries = data.eintraege
    .filter(e=>e.datum.startsWith(yr) && e.datum.substring(5,7)===mi)
    .sort((a,b)=>a.datum.localeCompare(b.datum));
  _monEntries = entries;
  const monName = MN[parseInt(mi)-1];
  _monLabel = `${monName} ${yr}`;

  document.getElementById('mon-modal-title').textContent = `📅 ${_monLabel}`;

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

  document.getElementById('mon-modal-count').textContent = `${entries.length} ${t('Einträge')}`;

  if(!entries.length){
    document.getElementById('mon-modal-tbody').innerHTML=`<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--sub)">Keine Einträge für ${_monLabel}</td></tr>`;
  } else {
    document.getElementById('mon-modal-tbody').innerHTML=entries.map(e=>`
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <td style="padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--sub)">${fdm(e.datum)}</td>
        <td style="padding:8px 12px"><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'}</span></td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px;color:var(--sub)">${e.kategorie}</td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px">${e.beschreibung}${e.notiz?` <span title="${e.notiz}" style="color:var(--sub);font-size:10px">📝</span>`:''}</td>
        <td class="mob-hide" style="padding:8px 12px"><span class="badge ${ZBADGE[e.zahlungsart]||''}">${e.zahlungsart||'—'}</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-weight:600;color:${e.typ==='Einnahme'?'var(--green)':'var(--red)'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</td>
      </tr>`).join('');
  }
  openModal('mon-modal');
}

function exportMonatCSV(){
  if(!_monEntries.length) return toast('Keine Daten','err');
  const rows=[['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','Notiz','Betrag (EUR)']];
  _monEntries.forEach(e=>rows.push([e.datum,e.typ,e.kategorie,e.beschreibung,e.zahlungsart||'',e.notiz||'',r2(e.betrag)]));
  dl('\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n'),
    `buchaltung_${_monLabel.replace(' ','_')}.csv`);
  toast(`📤 CSV — ${_monLabel} exportiert`,'ok');
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
    <Cell ss:MergeAcross="5"><Data ss:Type="String">${t('GESAMT')} ${esc(_monLabel)}</Data></Cell>
    <Cell><Data ss:Type="Number">${(ein-aus).toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row><Cell ss:MergeAcross="7"><Data ss:Type="String"></Data></Cell></Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Einnahmen')}</Data></Cell>
    <Cell><Data ss:Type="Number">${ein.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Ausgaben')}</Data></Cell>
    <Cell><Data ss:Type="Number">${aus.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Gewinn')}</Data></Cell>
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
  toast(`📊 Excel — ${_monLabel} exportiert`,'ok');
}

