// ── RECHNUNGEN ───────────────────────────────────────────────────────────
let rechFilter='alle', editRechId=null;
function renderRech(){
  const rech=data.rechnungen||[];
  // Auto-update überfällig
  const today=new Date().toISOString().split('T')[0];
  rech.forEach(r=>{if(r.status==='offen'&&r.faellig&&r.faellig<today)r.status='ueberfaellig';});

  const filtered=rechFilter==='alle'?rech:rech.filter(r=>r.status===rechFilter);
  const offen=rech.filter(r=>r.status==='offen');
  const uebf=rech.filter(r=>r.status==='ueberfaellig');
  const bezahlt=rech.filter(r=>r.status==='bezahlt');

  document.getElementById('rech-cards').innerHTML=`
    <div class="sc y" style="cursor:default"><div class="sc-lbl">Offen</div><div class="sc-val">${fmt(offen.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${offen.length} Rechnungen</div></div>
    <div class="sc r" style="cursor:default"><div class="sc-lbl">Überfällig</div><div class="sc-val">${fmt(uebf.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${uebf.length} Rechnungen</div></div>
    <div class="sc g" style="cursor:default"><div class="sc-lbl">Bezahlt</div><div class="sc-val">${fmt(bezahlt.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${bezahlt.length} Rechnungen</div></div>`;

  const tb=document.getElementById('rech-tbody'),em=document.getElementById('rech-empty');
  if(!filtered.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const smap={offen:'rs-offen 🟡 '+t('Offen'),ueberfaellig:'rs-ueberfaellig 🔴 '+t('Überfällig'),bezahlt:'rs-bezahlt 🟢 '+t('Bezahlt')};
  const smapMob={offen:'🟡',ueberfaellig:'🔴',bezahlt:'🟢'};
  const mob=isMob();
  tb.innerHTML=filtered.sort((a,b)=>b.datum.localeCompare(a.datum)).map(r=>`
    <tr onclick="editRech('${r.id}')" style="cursor:pointer">
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <div style="font-family:var(--mono);font-size:11px;font-weight:600">${r.nr}</div>
        ${mob?`<div style="font-size:11px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${r.kunde||r.beschreibung||'—'}</div>`:''}
      </td>
      <td class="mob-hide" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px" title="${r.kunde||r.beschreibung||''}">${r.kunde||r.beschreibung||'—'}</td>
      <td class="mob-hide" style="font-family:var(--mono);font-size:11px;color:var(--sub)">${fd(r.datum)}</td>
      <td class="mob-hide" style="font-family:var(--mono);font-size:11px;color:${r.status==='ueberfaellig'?'var(--red)':'var(--sub)'}">${r.faellig?fd(r.faellig):'—'}</td>
      <td style="text-align:right;font-family:var(--mono);font-weight:600;font-size:12px;white-space:nowrap">${fmt(r.betrag)}</td>
      <td style="text-align:center">
        ${mob
          ? `<span style="font-size:15px">${smapMob[r.status]||'❔'}</span>`
          : `<span class="rech-status ${smap[r.status].split(' ')[0]}">${smap[r.status].split(' ').slice(1).join(' ')}</span>`}
      </td>
      <td style="white-space:nowrap;text-align:right">
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1" onclick="event.stopPropagation();editRech('${r.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>`}
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1;color:var(--blue)" onclick="event.stopPropagation();druckRechnungId('${r.id}')" title="Drucken / PDF"><i class="fas fa-print"></i></button>`}
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1;color:#1e3a5f" onclick="event.stopPropagation();downloadZUGFeRDId('${r.id}')" title="ZUGFeRD (PDF+XML)"><i class="fas fa-file-pdf"></i></button>`}
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1;color:#0d6b3b" onclick="event.stopPropagation();downloadXRechnungId('${r.id}')" title="XRechnung XML"><i class="fas fa-file-code"></i></button>`}
        ${r.status!=='bezahlt'?`<button class="del-btn" style="opacity:1;color:var(--green)" onclick="event.stopPropagation();rechBezahlt('${r.id}')" title="✓">✓</button>`:''}
        <button class="del-btn" style="opacity:1" onclick="event.stopPropagation();delRech('${r.id}')" title="✕">✕</button>
      </td>
    </tr>`).join('');
}
function setRechFilter(f,btn){rechFilter=f;document.querySelectorAll('#p-rechnungen .ftab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRech();}
function openRechModal(){
  document.getElementById('rn-nr').value=autoRechNr();
  const _rnDatEl=document.getElementById('rn-dat');
  _rnDatEl.value=new Date().toISOString().split('T')[0];
  _rnDatEl.oninput=()=>{updateRechBanner();reRenderRechPos();};
  const faellig=new Date();faellig.setDate(faellig.getDate()+14);
  document.getElementById('rn-faellig').value=faellig.toISOString().split('T')[0];
  document.getElementById('rn-bet').value='';
  ['rn-kunde','rn-adresse','rn-email','rn-tel','rn-notiz'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rn-status').value='offen';
  editRechId=null;
  document.getElementById('rn-nr').dataset.kundeId='';
  updateRechBanner();
  setRechPositionen([{bez:'',menge:1,netto:'',rate:19,brutto:''}]);
  openModal('rech-modal');
}
function editRech(id){
  const r=data.rechnungen.find(x=>x.id===id);
  if(!r)return;
  editRechId=id;
  document.getElementById('rn-nr').value=r.nr;
  const _rnDatEl2=document.getElementById('rn-dat');
  _rnDatEl2.value=r.datum;
  _rnDatEl2.oninput=()=>{updateRechBanner();reRenderRechPos();};
  document.getElementById('rn-faellig').value=r.faellig||'';
  document.getElementById('rn-bet').value=r.betrag;
  document.getElementById('rn-status').value=r.status;
  document.getElementById('rn-kunde').value=r.kunde||'';
  document.getElementById('rn-adresse').value=r.adresse||'';
  document.getElementById('rn-email').value=r.email||'';
  document.getElementById('rn-tel').value=r.tel||'';
  document.getElementById('rn-notiz').value=r.notiz||'';
  document.getElementById('rn-nr').dataset.kundeTel=r.tel||'';
  updateRechBanner();
  const posData=r.positionen&&r.positionen.length?r.positionen:[{bez:r.beschreibung||'',menge:1,netto:r.netto||r.betrag||'',rate:r.mwstRate||0,brutto:r.betrag||''}];
  setRechPositionen(posData);
  openModal('rech-modal');
}
function autoRechNr(){
  const yr=new Date().getFullYear();
  const rech=data.rechnungen||[];
  const n=rech.filter(r=>r.nr.startsWith(yr+'')).length+1;
  return`${yr}-${String(n).padStart(3,'0')}`;
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
  if(!nr||!betrag||!datum)return toast('Rechnungs-Nr., Datum und mind. 1 Position erforderlich!','err');
  if(!data.rechnungen)data.rechnungen=[];
  const obj={
    nr, betrag:Math.round(betrag*100)/100,
    beschreibung:dsc,
    datum,
    faellig:document.getElementById('rn-faellig').value,
    status:document.getElementById('rn-status').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    tel:document.getElementById('rn-tel').value.trim()||document.getElementById('rn-nr').dataset.kundeTel||'',
    notiz:document.getElementById('rn-notiz').value.trim(),
    kundeId:document.getElementById('rn-nr').dataset.kundeId||'',
    positionen,
    netto, mwstBetrag:mwst, mwstRate:0, mwstMode:isKleinunternehmer(datum?datum.substring(0,4):new Date().getFullYear()+'')?'§19':'regel'
  };
  if(editRechId){
    const r=data.rechnungen.find(x=>x.id===editRechId);
    if(r){Object.assign(r,obj); sbSaveRechnung(r);}
    editRechId=null;
  } else {
    const newR={id:Date.now()+'', ...obj};
    data.rechnungen.push(newR);
    sbSaveRechnung(newR);
  }
  renderRech();closeModal('rech-modal');toast('✅ Rechnung gespeichert!','ok');
}
function rechBezahlt(id){
  const r=data.rechnungen.find(x=>x.id===id);if(!r)return;
  if(confirm(`Rechnung ${r.nr} als bezahlt markieren und automatisch als Einnahme buchen?`)){
    r.status='bezahlt';
    const newE={id:Date.now()+'',datum:new Date().toISOString().split('T')[0],typ:'Einnahme',kategorie:'Dienstleistung',zahlungsart:'Überweisung',beschreibung:`Rechnung ${r.nr}: ${r.beschreibung}`,notiz:'',betrag:r.betrag};
    data.eintraege.unshift(newE);
    sbSaveRechnung(r); sbSaveEintrag(newE);
    renderAll();toast(`✅ Rechnung ${r.nr} bezahlt + Einnahme gebucht`,'ok');
  } else if(confirm(`Nur als bezahlt markieren (ohne Einnahme buchen)?`)){
    r.status='bezahlt';
    sbSaveRechnung(r);
    renderRech();toast(`✅ Rechnung ${r.nr} als bezahlt markiert`,'ok');
  }
}
function delRech(id){if(!confirm('Rechnung löschen?'))return;data.rechnungen=(data.rechnungen||[]).filter(r=>r.id!==id);sbDeleteRechnung(id);renderRech();toast('Gelöscht','err');}
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
    el.innerHTML='✅ §19 UStG Kleinunternehmer — alle Positionen ohne USt. <a href="#" onclick="nav(\'ust\',null);closeModal(\'rech-modal\')" style="color:var(--green);text-decoration:underline;font-size:11px">Ändern im USt-Bereich</a>';
  } else {
    el.style.display='';
    el.style.background='rgba(59,130,246,.08)';
    el.style.border='1px solid var(--blue)';
    el.style.color='var(--blue)';
    el.innerHTML='📊 MwSt — USt wird pro Position berechnet.';
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
    const inputs = row.querySelectorAll('input,select');
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
    div.style.cssText='background:var(--s2,#f7f8fa);border-radius:10px;padding:10px;margin-bottom:8px;border:1px solid var(--border)';
    div.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:10px;color:var(--sub);font-weight:600;text-transform:uppercase;letter-spacing:.4px">Position ${i+1}</span>
        <button onclick="this.closest('.rn-pos-row').remove();calcRechTotal()" style="background:none;border:none;color:var(--sub);cursor:pointer;font-size:18px;padding:0;line-height:1">✕</button>
      </div>
      <input type="text" placeholder="Bezeichnung / Leistung" value="${p.bez||''}" oninput="calcRechTotal()" style="${INP};font-size:14px;width:100%;box-sizing:border-box;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 80px;gap:6px;align-items:end">
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Menge</div>
          <input type="number" placeholder="1" value="${p.menge||1}" min="0.01" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:center;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Netto/St.</div>
          <input type="number" placeholder="0.00" value="${nettoVal}" min="0" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:right;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">Brutto/St.</div>
          <input type="number" placeholder="0.00" value="${bruttoVal!==''?parseFloat(bruttoVal).toFixed(2):''}" min="0" step="0.01" oninput="posBruttoChanged(this)" style="${INP};text-align:right;color:var(--blue);width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:10px;color:var(--sub);margin-bottom:2px">USt %</div>
          <select onchange="posRateChanged(this)" style="${INP};padding:7px 4px;width:100%;box-sizing:border-box;${klein?'opacity:.4;pointer-events:none':''}">
            <option value="0"  ${rateVal==0 ?'selected':''}>0%</option>
            <option value="7"  ${rateVal==7 ?'selected':''}>7%</option>
            <option value="19" ${rateVal==19?'selected':''}>19%</option>
          </select>
        </div>
      </div>`;
  } else {
    // Desktop layout: оригинальный grid
    div.style.cssText='display:grid;grid-template-columns:1fr 60px 90px 70px 90px 28px;gap:6px;margin-bottom:6px;align-items:center';
    div.innerHTML=`
      <input type="text"   placeholder="Bezeichnung" value="${p.bez||''}" oninput="calcRechTotal()" style="${INP};font-size:13px">
      <input type="number" placeholder="Menge" value="${p.menge||1}" min="0.01" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:center">
      <input type="number" placeholder="Netto" value="${nettoVal}" min="0" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:right">
      <select onchange="posRateChanged(this)" style="${INP};padding:7px 4px;${klein?'opacity:.4;pointer-events:none':''}">
        <option value="0"  ${rateVal==0 ?'selected':''}>§19 / 0%</option>
        <option value="7"  ${rateVal==7 ?'selected':''}>7%</option>
        <option value="19" ${rateVal==19?'selected':''}>19%</option>
      </select>
      <input type="number" placeholder="Brutto" value="${bruttoVal!==''?parseFloat(bruttoVal).toFixed(2):''}" min="0" step="0.01" oninput="posBruttoChanged(this)" style="${INP};text-align:right;color:var(--blue)">
      <button onclick="this.closest('.rn-pos-row').remove();calcRechTotal()" style="background:none;border:none;color:var(--sub);cursor:pointer;font-size:16px;padding:0">✕</button>`;
  }
  document.getElementById('rn-positionen').appendChild(div);
}

// Вводим Netto → пересчитываем Brutto
function posNettoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input,select');
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
  const inputs=row.querySelectorAll('input,select');
  const netto=parseFloat(inputs[2].value)||0;
  const rate =parseFloat(sel.value)||0;
  const rnYr2=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  inputs[4].value=calcBrutto(netto,isKleinunternehmer(rnYr2)?0:rate).toFixed(2);
  calcRechTotal();
}
// Вводим Brutto → пересчитываем Netto
function posBruttoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input,select');
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
    const inputs=row.querySelectorAll('input,select');
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
      <span style="font-size:12px;color:var(--sub)">Netto-Summe</span>
      <span style="font-family:var(--mono);font-size:13px">${fmt(totalNetto)}</span>
    </div>
    <div style="font-size:11px;color:var(--green);margin-bottom:6px">§19 UStG — keine Umsatzsteuer</div>`;
  } else {
    const totNetto=rates.reduce((s,r)=>s+groups[r].netto,0);
    const totMwst =rates.reduce((s,r)=>s+groups[r].mwst,0);
    rows+=`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--sub)">
      <span>Netto gesamt</span><span style="font-family:var(--mono)">${fmt(r2(totNetto))}</span></div>`;
    rates.forEach(rate=>{
      const g=groups[rate];
      if(g.netto===0&&g.mwst===0) return;
      rows+=`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:var(--sub)">
        <span>USt. ${rate}% (auf ${fmt(g.netto)})</span>
        <span style="font-family:var(--mono);color:var(--red)">+ ${fmt(g.mwst)}</span>
      </div>`;
    });
  }

  el.innerHTML=rows+`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 4px;border-top:2px solid var(--border);margin-top:4px">
    <strong style="font-size:14px">Gesamtbetrag (Brutto)</strong>
    <strong style="font-family:var(--mono);font-size:16px;color:var(--blue)">${fmt(totalBrutto)}</strong>
  </div>`;
}

function getRechPositionen(){
  const pos=[];
  const rnYr5=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(rnYr5);
  document.querySelectorAll('.rn-pos-row').forEach(row=>{
    const inputs=row.querySelectorAll('input,select');
    const bez   =inputs[0].value.trim();
    const menge =parseFloat(inputs[1].value)||1;
    const netto =parseFloat(inputs[2].value)||0;
    const rate  =klein?0:parseFloat(inputs[3].value)||0;
    const brutto=parseFloat(inputs[4].value)||calcBrutto(netto,rate);
    if(bez||netto) pos.push({bez,menge,netto,rate,brutto,preis:netto}); // preis=netto для совместимости
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

  const posRows = pos.map(p=>{
    const netto=p.netto!==undefined?p.netto:p.preis;
    const rate=isKlein?0:(p.rate||0);
    const lineN=r2((p.menge||1)*netto);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.bez}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.menge}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(netto)}</td>
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
  <title>Rechnung ${r.nr}</title>
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
    <button class="btn-print" onclick="window.print()">🖨️ Drucken / Als PDF speichern</button>
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
  box.style.cssText = 'background:var(--s1);border-radius:16px;padding:24px;width:320px;max-width:90vw;box-shadow:0 20px 60px #0004';

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
    btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;margin-bottom:8px;background:var(--s2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:14px;color:var(--text);text-align:left';
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
  // E-Mail Vorlage
  const tmpl = getEmailTemplate();
  const subEl = document.getElementById('email-tmpl-subject');
  const bodEl = document.getElementById('email-tmpl-body');
  if (subEl) subEl.value = tmpl.subject;
  if (bodEl) bodEl.value = tmpl.body;
  openModal('firma-modal');
}

function saveFirmaData() {
  const fields = ['name','strasse','plz','ort','tel','email','iban','bic','steuernr','ustid'];
  const p = {};
  fields.forEach(k => {
    const el = document.getElementById('firma-' + k);
    if (el) p[k] = el.value.trim();
  });
  const footer = document.getElementById('firma-footer');
  if (footer) p.rechnung_footer = footer.value.trim();
  p.kleinuntern = true;
  localStorage.setItem('bp_firma', JSON.stringify(p));
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
  toast('✅ Einstellungen gespeichert!', 'ok');
  closeModal('firma-modal');
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
  toast('✅ E-Mail Vorlage zurückgesetzt', 'ok');
}

// ══════════════════════════════════════════════════════════════════════════
// E-RECHNUNG — XRechnung (XML) + ZUGFeRD (PDF+XML)
// Standard: UN/CEFACT CII D16B / EN 16931
// ══════════════════════════════════════════════════════════════════════════

function getFirmaData() {
  // Данные фирмы — сначала из localStorage (profile), затем дефолт
  const p = JSON.parse(localStorage.getItem('bp_firma') || '{}');
  return {
    name:        p.name        || 'Autowäsche Berg',
    strasse:     p.strasse     || 'Musterstraße 1',
    plz:         p.plz         || '67547',
    ort:         p.ort         || 'Worms',
    land:        p.land        || 'DE',
    email:       p.email       || 'info@autowaesche-berg.de',
    tel:         p.tel         || '+49 6241 000000',
    iban:        p.iban        || 'DE12345678901234567890',
    bic:         p.bic         || 'SSKMDEMMXXX',
    steuernr:    p.steuernr    || '',
    ustid:       p.ustid       || '',
    kleinuntern:       p.kleinuntern !== false,
    rechnung_footer:  p.rechnung_footer || '',
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
      <ram:BuyerTradeParty>
        <ram:Name>${esc(r.kunde || 'Kunde')}</ram:Name>
        ${r.adresse ? `<ram:PostalTradeAddress><ram:LineOne>${esc(r.adresse)}</ram:LineOne><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>` : ''}
        ${r.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(r.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery/>

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
    toast('✅ XRechnung XML gespeichert!', 'ok');
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

  toast('📄 ZUGFeRD wird erstellt...', 'ok');
  const safeNr = (r.nr || 'rechnung').replace(/[\/]/g, '-');

  try {
    // 1. Normales PDF erzeugen und sofort speichern
    const doc = await generateRechnungPDF(r);
    doc.save(`ZUGFeRD_${safeNr}.pdf`);
  } catch(e) {
    console.error('[ZUGFeRD PDF error]', e);
    toast('❌ PDF-Fehler: ' + e.message, 'err');
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
      toast('✅ PDF + Factur-X XML gespeichert!', 'ok');
    }, 500);
  } catch(e) {
    console.error('[ZUGFeRD XML error]', e);
    toast('⚠️ PDF gespeichert, XML-Fehler: ' + e.message, 'err');
  }
}

function downloadZUGFeRDId(id) {
  const r = data.rechnungen.find(x => x.id === id);
  if (r) downloadZUGFeRD(r);
}
