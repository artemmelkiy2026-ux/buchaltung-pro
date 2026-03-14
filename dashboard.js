// ── FILE IO (только экспорт/импорт для резервной копии) ──────────────────
// persist() — в Supabase-архитектуре данные сохраняются автоматически
// через отдельные sbSave* при каждом действии. Ctrl+S = показать подтверждение.
function persist(){ if(typeof toast==="function") toast("✓ Daten werden automatisch gespeichert","ok"); }
function dlJson(){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`buchaltung_${new Date().getFullYear()}.json`;a.click();toast('✓ Backup heruntergeladen!','ok');}
function loadFile(){document.getElementById('fi').click();}
function onLoad(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{try{
    const d=JSON.parse(e.target.result);
    if(!d.eintraege)throw 0;
    if(!d.rechnungen) d.rechnungen=[];
    if(!d.wiederkehrend) d.wiederkehrend=[];
    if(data.eintraege.length&&!confirm(`Заменить ${data.eintraege.length} записей?`))return;
    data=d;
    if(data.eintraege) data.eintraege.forEach(e=>{
      if(e.zahlungsart) e.zahlungsart=normZahl(e.zahlungsart);
      if(e.kategorie)   e.kategorie=normKat(e.kategorie);
    });
    renderAll();
    renderDash();
    toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Загружено ${data.eintraege.length} записей`,'ok');
  }catch{
    toast('✗ Неверный файл','err');
  }};
  r.readAsText(f);ev.target.value='';
}
// ── FORM ──────────────────────────────────────────────────────────────────
function setTyp(t){
  curTyp=t;
  document.getElementById('btn-e').className='tt'+(t==='Einnahme'?' ae':'');
  document.getElementById('btn-a').className='tt'+(t==='Ausgabe'?' aa':'');
  updateKatSel();
  updateMwstFormVisibility();
  const isMobile = window.innerWidth <= 900;
  const layout = document.getElementById('neu-layout');
  const scanBox = document.getElementById('scan-beleg-box');
  const einBox  = document.getElementById('letzte-einnahmen-box');

  if(isMobile) {
    // Mobil: scan nur bei Ausgabe, einnahmen-box nie
    if(scanBox) { scanBox.style.display = t === 'Ausgabe' ? 'block' : 'none'; scanBox.style.visibility = ''; }
    if(einBox)  einBox.style.display = 'none';
    if(layout)  layout.style.gridTemplateColumns = '1fr';
  } else {
    // Desktop: rechte Spalte immer 380px — wechselt Inhalt
    if(layout) layout.style.gridTemplateColumns = '1fr 380px';
    if(t === 'Ausgabe') {
      if(scanBox) { scanBox.style.display = 'block'; scanBox.style.visibility = 'visible'; }
      if(einBox)  einBox.style.display = 'none';
    } else {
      if(scanBox) { scanBox.style.display = 'none'; scanBox.style.visibility = ''; }
      if(einBox)  { einBox.style.display = 'block'; renderLetzteEinnahmen(); }
    }
  }
}

function renderLetzteEinnahmen() {
  const list = document.getElementById('letzte-ein-list');
  const sumEl = document.getElementById('letzte-ein-summe');
  if (!list) return;
  const recent = activeEintraege()
    .filter(e => e.typ === 'Einnahme')
    .sort((a,b) => b.datum.localeCompare(a.datum))
    .slice(0, 9);
  if (!recent.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--sub);font-size:13px">Noch keine Einnahmen</div>';
    if(sumEl) sumEl.textContent = '';
    return;
  }
  const total = recent.reduce((s,e) => s + e.betrag, 0);
  if(sumEl) sumEl.textContent = 'Gesamt: ' + fmt(total);
  list.innerHTML = recent.map(e => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-radius:12px;margin-bottom: 10px;">
      <div style="flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center">
        <i class="fas fa-arrow-up" style="color:var(--green);font-size:11px"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${e.beschreibung}">${e.beschreibung||e.kategorie}</div>
        <div style="font-size:11px;color:var(--sub);display:flex;gap:6px;margin-top:2px">
          <span>${fd(e.datum)}</span>
          <span>·</span>
          <span>${e.kategorie}</span>
        </div>
      </div>
      <div style="flex:0 0 auto;font-size:14px;font-weight:700;color:var(--green);font-family:var(--mono)">+${fmt(e.betrag)}</div>
    </div>`).join('');
}
function updateMwstFormVisibility(){
  const yr=document.getElementById('nf-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(yr);
  const mwRow=document.getElementById('nf-mwst-row');
  if(!mwRow) return;
  if(klein){
    mwRow.style.display='none';
    const info=document.getElementById('nf-betrag-info');
    if(info) info.textContent='';
    return;
  }
  // Regelbesteuerung: show for both types
  mwRow.style.display='';
  const isEin=(curTyp==='Einnahme');
  // Color scheme: orange for Einnahme (USt), blue for Ausgabe (Vorsteuer)
  if(isEin){
    mwRow.style.background='rgba(249,115,22,.07)';
    mwRow.style.border='1px solid rgba(249,115,22,.3)';
    const title=document.getElementById('nf-mwst-title');
    if(title){title.textContent='● Umsatzsteuer auf diese Einnahme';title.style.color='#f97316';}
    const betLbl=document.getElementById('nf-mwst-bet-lbl');
    if(betLbl) betLbl.textContent='USt-Betrag (€)';
    const betEl=document.getElementById('nf-mwst-bet');
    if(betEl) betEl.style.color='#f97316';
    const info=document.getElementById('nf-betrag-info');
    if(info){info.textContent='= Brutto';info.style.color='#f97316';}
  } else {
    mwRow.style.background='rgba(59,130,246,.07)';
    mwRow.style.border='1px solid rgba(59,130,246,.3)';
    const title=document.getElementById('nf-mwst-title');
    if(title){title.textContent='● Vorsteuer aus dieser Ausgabe';title.style.color='var(--blue)';}
    const betLbl=document.getElementById('nf-mwst-bet-lbl');
    if(betLbl) betLbl.textContent='Vorsteuer (€)';
    const betEl=document.getElementById('nf-mwst-bet');
    if(betEl) betEl.style.color='var(--blue)';
    const info=document.getElementById('nf-betrag-info');
    if(info){info.textContent='= Brutto';info.style.color='var(--blue)';}
  }
  calcNfMwst();
}
function updateKatSel(){
  document.getElementById('nf-kat').innerHTML=(curTyp==='Einnahme'?KE:KA).map(k=>`<option value="${k}">${k}</option>`).join('');
}
function clearForm(){
  document.getElementById('nf-bet').value='';
  document.getElementById('nf-dsc').value='';
  document.getElementById('nf-note').value='';
  // Дату НЕ сбрасываем — пользователь мог выбрать другой год
}
function addEintrag(){
  const datum=document.getElementById('nf-dat').value;
  const betrag=parseFloat(document.getElementById('nf-bet').value);
  const kat=document.getElementById('nf-kat').value;
  const zahl=document.getElementById('nf-zahl').value;
  const dsc=document.getElementById('nf-dsc').value.trim();
  const note=document.getElementById('nf-note').value.trim();
  calcNfVorsteuer(); // пересчёт при изменении суммы
  if(!datum)return toast('Datum eingeben!','err');
  // Валидация даты
  const [dy,dm,dd]=datum.split('-').map(Number);
  if(dy<2000||dy>2099)return toast('Jahr muss zwischen 2000 und 2099 liegen!','err');
  // Проверка февраля
  const isLeap=(dy%4===0&&(dy%100!==0||dy%400===0));
  const febMax=isLeap?29:28;
  if(dm===2&&dd>febMax)return toast(`Februar ${dy} hat nur ${febMax} Tage!`,'err');
  // Проверка дней месяца
  const daysInMonth=[0,31,febMax,31,30,31,30,31,31,30,31,30,31];
  if(dd<1||dd>daysInMonth[dm])return toast(`Ungültiges Datum!`,'err');
  if(!betrag || betrag <= 0) return toast('Betrag eingeben!', 'err');
  const entryYear=datum.substring(0,4);

  // MwSt / Vorsteuer bei Regelbesteuerung
  const mwRateRaw=document.getElementById('nf-mwst-rate')?.value;
  const mwRate=mwRateRaw===null||mwRateRaw===undefined?19:parseFloat(mwRateRaw);
  const mwBet=r2(parseFloat(document.getElementById('nf-mwst-bet')?.value)||0);
  const netBet=r2(parseFloat(document.getElementById('nf-netto-bet')?.value)||betrag);
  const entry={id:Date.now()+'',datum,typ:curTyp,kategorie:normKat(kat),zahlungsart:normZahl(zahl),beschreibung:dsc||normKat(kat),notiz:note,betrag};
  const entryYrMode=datum.substring(0,4);
  if(!isKleinunternehmer(entryYrMode)&&mwBet>0){
    if(curTyp==='Einnahme'){
      entry.mwstRate=mwRate;
      entry.mwstBetrag=mwBet;
      entry.nettoBetrag=netBet;
      if(!data.ustEintraege) data.ustEintraege=[];
      const ustAutoE={id:Date.now()+'_ust',datum,typ:'Ausgang',rate:mwRate,betrag:mwBet,beschreibung:dsc||kat};
      data.ustEintraege.push(ustAutoE);
      sbSaveUstEintrag(ustAutoE);
    } else {
      entry.vorsteuerRate=mwRate;
      entry.vorsteuerBet=mwBet;
      entry.nettoBetrag=netBet;
      if(!data.ustEintraege) data.ustEintraege=[];
      const ustAutoA={id:Date.now()+'_vs',datum,typ:'Vorsteuer',rate:mwRate,betrag:mwBet,beschreibung:dsc||kat};
      data.ustEintraege.push(ustAutoA);
      sbSaveUstEintrag(ustAutoA);
    }
  }
  data.eintraege.unshift(entry);
  sbSaveEintrag(entry);
  renderAll();
  renderDash();
  const fj=document.getElementById('f-jahr');
  if(fj){
    const opt=[...fj.options].find(o=>o.value===entryYear);
    if(opt) fj.value=entryYear; else fj.value='Alle';
    renderEin();
  }
  clearForm();
  calcNfMwst(); // reset summary
  const mwLabel = !isKleinunternehmer(datum.substring(0,4))&&mwBet>0 ? ` (Netto: ${netBet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €, MwSt: ${mwBet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €)` : '';
  toast(`${curTyp} gespeichert: ${fmt(betrag)}${mwLabel}`, 'ok');
}

function calcNfVorsteuer(){
  const bet =parseFloat(document.getElementById('nf-bet')?.value)||0;
  const rate=parseFloat(document.getElementById('nf-vs-rate')?.value)||0;
  const mwst=rate===0?0:r2(bet*rate/(100+rate));
  const el=document.getElementById('nf-vs-bet');
  if(el) el.value=mwst>0?mwst.toFixed(2):'';
}

// MwSt-Kalkulator (Brutto → Netto + MwSt, für Einnahme und Ausgabe)
function calcNfMwst(){
  const bet=parseFloat(document.getElementById('nf-bet')?.value)||0;
  const rateRaw=document.getElementById('nf-mwst-rate')?.value;
  const rate=rateRaw===null||rateRaw===undefined?19:parseFloat(rateRaw);
  const mwst=rate===0?0:r2(bet*rate/(100+rate));
  const netto=r2(bet-mwst);
  const mwEl=document.getElementById('nf-mwst-bet');
  const neEl=document.getElementById('nf-netto-bet');
  if(mwEl) mwEl.value=bet>0&&rate>0?mwst.toFixed(2):'';
  if(neEl) neEl.value=bet>0?netto.toFixed(2):'';
  // Summary line
  const sumEl=document.getElementById('nf-mwst-summary');
  if(sumEl){
    if(bet>0&&rate>0){
      const isEin=(curTyp==='Einnahme');
      sumEl.style.display='';
      sumEl.style.background=isEin?'rgba(249,115,22,.1)':'rgba(59,130,246,.1)';
      sumEl.style.color=isEin?'#f97316':'var(--blue)';
      const label=isEin?'USt':'Vorsteuer';
      sumEl.innerHTML=
        '<span style="color:var(--sub)">Netto: </span><strong>'+netto.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>'
        +' &nbsp;+&nbsp; <span style="color:var(--sub)">'+label+' '+rate+'%: </span><strong>'+mwst.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>'
        +' &nbsp;= &nbsp;<span style="color:var(--sub)">Brutto: </span><strong>'+bet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>';
    } else {
      sumEl.style.display='none';
    }
  }
}


// ── DASHBOARD SORTING ─────────────────────────────────────────────────────
function sortDash(col){
  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Для ВСЕХ колонок - можно менять порядок (↑↓)
  dashSortAsc = dashSortCol === col ? !dashSortAsc : false;
  dashSortCol = col;
  renderDash();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDash(){
  buildYearFilters();
  const yr=document.getElementById('dash-yr').value;
  document.getElementById('dash-yr-lbl').textContent=yr==='Alle'?'Alle Jahre':yr;
  const ye=(yr==='Alle'?activeEintraege():activeEintraege().filter(e=>e.datum.startsWith(yr)));
  const ein=sum(ye,'Einnahme'),aus=sum(ye,'Ausgabe'),gew=ein-aus;
  // MwSt Dashboard-Berechnung
  const mwstTotal = ye.filter(e=>e.mwstBetrag>0).reduce((s,e)=>s+e.mwstBetrag,0);
  const vstTotal  = ye.filter(e=>e.vorsteuerBet>0).reduce((s,e)=>s+e.vorsteuerBet,0);
  const zahllastDash = mwstTotal - vstTotal;
  const regelYr = (yr==='Alle' ? new Date().getFullYear()+'' : yr);
  const isRegel = !isKleinunternehmer(regelYr);
  // MwSt card visibility
  const mwstCard = document.getElementById('d-mwst-card');
  if(mwstCard) mwstCard.style.display = isRegel ? '' : 'none';
  if(isRegel && mwstCard){
    mwstCard.querySelector('.sc-lbl').textContent = 'MwSt-Zahllast';
    mwstCard.querySelector('.sc-val').textContent = (zahllastDash>=0?'+':'')+fmt(Math.abs(zahllastDash));
    mwstCard.querySelector('.sc-val').style.color = zahllastDash>0?'var(--red)':'var(--green)';
    mwstCard.querySelector('.sc-sub').textContent = 'USt '+fmt(mwstTotal)+' − VoSt '+fmt(vstTotal);
  }
  const pct=Math.min(100,Math.round(ein/250));
  g('d-ein',fmt(ein));g('d-ein-c',ye.filter(e=>e.typ==='Einnahme').length+' Einträge');
  g('d-aus',fmt(aus));g('d-aus-c',ye.filter(e=>e.typ==='Ausgabe').length+' Einträge');
  g('d-gew',fmt(gew));document.getElementById('d-gew').style.color=gew>=0?'var(--green)':'var(--red)';
  document.getElementById('d-gew').style.setProperty('color',gew>=0?'var(--green)':'var(--red)','important');
  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Меняем класс карточки для изменения цвета верхней полоски
  const gewCard = document.getElementById('d-gew').closest('.sc');
  if(gewCard) {
    gewCard.classList.remove('g','r','b','y','p');
    gewCard.classList.add(gew>=0?'g':'r');
  }
  g('d-lim',pct+'%');g('d-lim-s',fmt(ein)+' von 25.000 €');
  document.getElementById('d-lim-bar').style.width=pct+'%';
  document.getElementById('d-lim-bar').style.background=pct>80?'var(--red)':pct>60?'var(--yellow)':'var(--yellow)';
  document.getElementById('d-ein-bar').style.width=ein>0?Math.min(100,Math.round(ein/(ein+aus)*100))+'%':'0%';
  document.getElementById('d-aus-bar').style.width=aus>0?Math.min(100,Math.round(aus/(ein+aus)*100))+'%':'0%';
  g('d-cnt',ye.length+'');g('d-cnt-s',`${ye.filter(e=>e.typ==='Einnahme').length} ${'Ein.'} / ${ye.filter(e=>e.typ==='Ausgabe').length} ${'Aus.'}`);

  // Chart - CHART.JS (профессиональный график)
  const chartYr=yr==='Alle'?new Date().getFullYear()+'':yr;
  const ea=Array(12).fill(0),aa=Array(12).fill(0);
  activeEintraege().forEach(e=>{if(!e.datum.startsWith(chartYr))return;const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')ea[m]+=e.betrag;else aa[m]+=e.betrag;});
  const ga=ea.map((e,i)=>e-aa[i]); // Gewinn pro Monat
  
  // Уничтожаем старый график если есть
  if(window.dashChart) window.dashChart.destroy();
  
  // Создаём новый график
  const chartCanvas = document.getElementById('d-chart');
  if(chartCanvas) {
    window.dashChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: MS,
        datasets: [
          {
            label: ('  '+'Einnahme'),
            data: ea,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
          },
          {
            label: ('  '+'Ausgabe'),
            data: aa,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
          },
          {
            label: ('  '+'Gewinn'),
            data: ga,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.08)',
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: ga.map(v => v >= 0 ? '#a78bfa' : '#f97316'),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            segment: {
              borderColor: ctx => ctx.p0.parsed.y < 0 || ctx.p1.parsed.y < 0 ? '#f97316' : '#a78bfa',
            },
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10 // небольшой отступ от самого верха канваса
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            // ЭТО ВАЖНО: увеличиваем этот параметр, он толкает график вниз
            // В новых версиях Chart.js это работает как margin-bottom
            padding: 40, 
            labels: {
              color: '#64748b',
              font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
              padding: 20, // Расстояние между кнопками (Einnahme <-> Ausgabe)
              usePointStyle: true,
              pointStyle: 'circle',
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'var(--border)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: false },
            ticks: {
              color: '#64748b', 
              font: { size: 11, family: "'JetBrains Mono', monospace" },
              padding: 10,
              callback: function(value) { return fmt(value); }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 }, padding: 5 }
          }
        }
      },
      // ХАК ДЛЯ ГАРАНТИРОВАННОГО ОТСТУПА (Margin Bottom для легенды)
      plugins: [{
        beforeInit: function(chart) {
          const originalFit = chart.legend.fit;
          chart.legend.fit = function fit() {
            originalFit.bind(chart.legend)();
            this.height += 30; // ВОТ ТВОИ 30 ПИКСЕЛЕЙ ОТСТУПА ВНИЗ ПОД ЛЕГЕНДОЙ
          };
        }
      }]
    });
  }

  // Обновляем sort-кнопки
  ['datum','betrag','typ'].forEach(col=>{
    const btn=document.getElementById('dsort-'+col);
    if(!btn) return;
    btn.style.background = dashSortCol===col ? 'var(--blue)' : '';
    btn.style.color      = dashSortCol===col ? '#fff' : '';
    const lbl = col==='datum'?'Datum':col==='betrag'?'Betrag':'Typ';
    btn.textContent = lbl + (dashSortCol===col ? (dashSortAsc?' ↑':' ↓') : '');
  });

  // Recent 10 — последние по выбранному году
  let recent=[...ye].sort((a,b)=>b.datum.localeCompare(a.datum)).slice(0,10);
  if(dashSortCol !== 'datum') {
    recent.sort((a,b)=>{
      let va=a[dashSortCol], vb=b[dashSortCol];
      if(dashSortCol==='betrag'){ va=+va; vb=+vb; }
      if(dashSortAsc) return va>vb?1:-1;
      return va<vb?1:-1;
    });
  } else { if(dashSortAsc) recent.reverse(); }

  const mob=isMob();
  document.getElementById('d-recent').innerHTML = recent.length ? recent.map(e => {
    const isEin=e.typ==='Einnahme', st=e.is_storno||e._storniert;
    const click=mob?'showMobDetail('+JSON.stringify(e).replace(/"/g,"'")+')':'';
    return '<div onclick="'+click+'"'
      +' style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:#fff;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s,background .15s;'+(st?'opacity:0.45;':'')+'"'
      +' onmouseover="this.style.background=\'var(--s2)\';this.style.boxShadow=\'0 2px 10px rgba(0,0,0,.07)\'"'
      +' onmouseout="this.style.background=\'#fff\';this.style.boxShadow=\'\'">'
      +'<div style="flex:0 0 auto;width:36px;height:36px;border-radius:50%;background:'+(isEin?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)')+';display:flex;align-items:center;justify-content:center">'
      +'<i class="fas fa-arrow-'+(isEin?'up':'down')+'" style="color:var(--'+(isEin?'green':'red')+');font-size:12px"></i></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">'+(e.beschreibung||e.kategorie)+'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--sub)">'
      +'<span style="font-family:var(--mono)">'+(mob?fdm(e.datum):fd(e.datum))+'</span>'
      +'<span>&middot;</span><span>'+e.kategorie+'</span>'
      +'<span>&middot;</span><span class="badge '+(ZBADGE[e.zahlungsart]||'')+'" style="font-size:10px">'+(e.zahlungsart||'—')+'</span>'
      +'</div></div>'
      +'<div style="flex:0 0 auto;font-size:14px;font-weight:700;color:var(--'+(isEin?'green':'red')+');font-family:var(--mono);white-space:nowrap">'+(isEin?'+':'−')+fmt(e.betrag)+'</div>'
      +'</div>';
  }).join('') : '<div style="text-align:center;padding:30px;color:var(--sub)">Keine Einträge</div>';

// ── EINTRÄGE ──────────────────────────────────────────────────────────────
function getFiltered(){
  const j=document.getElementById('f-jahr').value;
  const m=document.getElementById('f-mon').value;
  const k=document.getElementById('f-kat').value;
  const z=document.getElementById('f-zahl').value;
  const q=document.getElementById('f-q').value.toLowerCase();
  // Journal-Modus: alle Buchungen inkl. Storno anzeigen
  if(fTyp==='Journal'){
    return data.eintraege.filter(e=>{
      const j=document.getElementById('f-jahr').value;
      const m=document.getElementById('f-mon').value;
      const q=document.getElementById('f-q').value.toLowerCase();
      if(j!=='Alle'&&!e.datum.startsWith(j))return false;
      if(m!=='Alle'&&e.datum.substring(5,7)!==m)return false;
      if(q&&!e.beschreibung.toLowerCase().includes(q)
         &&!(e.kategorie||'').toLowerCase().includes(q)
         &&!e.datum.includes(q))return false;
      return true;
    });
  }
  return data.eintraege.filter(e=>{
    if(e.is_storno||e._storniert)return false; // GoBD: скрываем sторно-записи
    if(fTyp!=='Alle'&&e.typ!==fTyp)return false;
    if(j!=='Alle'&&!e.datum.startsWith(j))return false;
    if(m!=='Alle'&&e.datum.substring(5,7)!==m)return false;
    if(k!=='Alle'&&e.kategorie!==k)return false;
    if(z!=='Alle'&&(e.zahlungsart||'Sonstiges')!==z)return false;
    // Поиск по описанию, категории И ДАТЕ
    if(q&&!e.beschreibung.toLowerCase().includes(q)
       &&!e.kategorie.toLowerCase().includes(q)
       &&!e.datum.includes(q))return false;
    return true;
  });
}

let sortHeaders={'datum':'th-datum','typ':'th-typ','kategorie':'th-kat','beschreibung':'th-desc','zahlungsart':'th-zahl','betrag':'th-bet'};
function sortE(col){
  Object.values(sortHeaders).forEach(id=>{const el=document.getElementById(id);if(el){el.classList.remove('sort-asc','sort-desc');}});
  sortAsc=sortCol===col?!sortAsc:false; sortCol=col;
  const hid=sortHeaders[col];
  if(hid){const el=document.getElementById(hid);if(el)el.classList.add(sortAsc?'sort-asc':'sort-desc');}
  renderEin();
}

function setFTyp(t,btn){fTyp=t;document.querySelectorAll('.ftab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderEin();}

// ── PAGINATION HELPERS ────────────────────────────────────────────────────
function nextTenPages(total) { einPage = Math.min(total, einPage + 10); renderEin(); }
function prevTenPages() { einPage = Math.max(1, einPage - 10); renderEin(); }

function renderEin(){
  const entries=getFiltered().sort((a,b)=>{
    let va=a[sortCol],vb=b[sortCol];
    if(sortCol==='betrag'){va=+va;vb=+vb;}
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> Для дат: sortAsc=false означает новые сверху (убывающий порядок)
    if(sortCol==='datum') {
      return sortAsc ? (va.localeCompare(vb)) : (vb.localeCompare(va)); // DESC по умолчанию
    }
    // Для других колонок: стандартная логика
    return sortAsc?(va>vb?1:-1):(va<vb?1:-1);
  });
  const tb=document.getElementById('e-tbody'),em=document.getElementById('e-empty');
  const mob=isMob();
  
  // Показываем/скрываем мобильный заголовок Beschreibung
  const thDescMob = document.getElementById('th-desc-mob');
  if(thDescMob) {
    thDescMob.style.display = mob ? 'table-cell' : 'none';
  }
  // MwSt-Spalten anzeigen wenn Regelbesteuerung aktiv
  const einJahr = document.getElementById('f-jahr')?.value || 'Alle';
  const showMwstHdr = !isKleinunternehmer(einJahr==='Alle'?new Date().getFullYear()+'':einJahr) && !mob;
  ['th-netto','th-mwst'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = showMwstHdr ? 'table-cell' : 'none';
  });
  // Betrag-Spalten-Titel
  const thBet=document.getElementById('th-bet');
  if(thBet) thBet.textContent = showMwstHdr ? 'Brutto' : 'Betrag';
  
  if(!entries.length){
    tb.innerHTML='';
    em.style.display='block';
    document.getElementById('e-pagination').innerHTML='';
  } else {
    em.style.display='none';
    
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> ПАГИНАЦИЯ: показываем только 50 записей на странице
    const totalPages = Math.ceil(entries.length / einPerPage);
    if(einPage > totalPages) einPage = totalPages; // Если страница потеряна
    
    const start = (einPage - 1) * einPerPage;
    const end = start + einPerPage;
    const pageEntries = entries.slice(start, end);
    
    // Рендеринг записей текущей страницы
    tb.innerHTML=pageEntries.map(e=>{
      const rowYr=e.datum.substring(0,4);
      const showMwst = !isKleinunternehmer(rowYr);
      const hasMwst = e.mwstBetrag>0||e.vorsteuerBet>0;
      const mwstVal = e.typ==='Einnahme'?(e.mwstBetrag||0):(e.vorsteuerBet||0);
      const nettoVal = e.typ==='Einnahme'?(e.nettoBetrag||e.betrag):(e.betrag-(e.vorsteuerBet||0));
      const mwstRate = e.mwstRate||e.vorsteuerRate||0;
      return `
      <tr onclick="${mob?`showMobDetail(${JSON.stringify(e).replace(/"/g,"'")})`:''}" style="${mob?'cursor:pointer':''};${(e.is_storno||e._storniert)?'opacity:0.45;background:rgba(148,163,184,0.07);':''}">
        <td style="font-family:var(--mono);font-size:11px;color:var(--sub)">${mob?fdm(e.datum):fd(e.datum)}</td>
        <td><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'} ${mob?'':e.typ}</span></td>
        <td class="mob-hide" style="color:var(--sub);font-size:12px">${e.kategorie}</td>
        <td class="mob-hide"><span title="${e.notiz||''}">
          ${(()=>{
            // Sторно-Gegenbuchung: zeige auf welchen Originalbeleg sie sich bezieht
            if(e.is_storno&&e.storno_of){
              const orig=data.eintraege.find(x=>x.id===e.storno_of);
              const ref=orig?('<b>'+fd(orig.datum)+'</b> · '+fmt(orig.betrag)+' ('+orig.beschreibung+')'):'Beleg nicht gefunden';
              const korr=data.eintraege.find(x=>x.korrektur_von===e.storno_of);
              const korrRef=korr?' → Korrektur: <b>'+fmt(korr.betrag)+'</b>':'';
              return '<span style="font-size:9px;font-weight:700;color:#94a3b8;background:rgba(148,163,184,0.15);padding:2px 6px;border-radius:3px;margin-right:4px">↩ Storno-Gegenbuchung</span>'
                    +'<span style="font-size:10px;color:var(--sub)">hebt auf: '+ref+korrRef+'</span>';
            }
            // Stornierter Originalbeleg
            if(e.is_storno&&!e.storno_of){
              const stornoRec=data.eintraege.find(x=>x.storno_of===e.id);
              const korr=data.eintraege.find(x=>x.korrektur_von===e.id);
              const stornoRef=stornoRec?('<b>'+fd(stornoRec.datum)+'</b>'):'?';
              const korrRef=korr?' → Korrektur: <b>'+fmt(korr.betrag)+'</b> am '+fd(korr.datum):'';
              return '<span style="font-size:9px;font-weight:700;color:#f97316;background:rgba(249,115,22,0.1);padding:2px 6px;border-radius:3px;margin-right:4px">✗ Storniert</span>'
                    +'<span style="font-size:10px;color:var(--sub)">am '+stornoRef+korrRef+'</span>';
            }
            // Korrigierter Beleg: zeige Bezug zum stornierten Original
            if(e.korrektur_von){
              const orig=data.eintraege.find(x=>x.id===e.korrektur_von);
              const ref=orig?('<b>'+fd(orig.datum)+'</b> · '+fmt(orig.betrag)):'?';
              return '<span style="font-size:9px;font-weight:700;color:#22c55e;background:rgba(34,197,94,0.1);padding:2px 6px;border-radius:3px;margin-right:4px">✎ Korrektur</span>'
                    +'<span style="font-size:10px;color:var(--sub)">ersetzt: '+ref+'</span> ';
            }
            return '';
          })()}${e.beschreibung}${e.notiz?` <span style="color:var(--sub);font-size:10px"><i class="fas fa-sticky-note"></i></span>`:''}</span></td>
        ${mob?`<td style="font-size:11px;color:var(--muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.beschreibung||'—'}</td>`:''}
        <td class="mob-hide"><span class="badge ${ZBADGE[e.zahlungsart]||''}">${e.zahlungsart||'—'}</span></td>
        ${showMwst&&!mob?`<td class="mob-hide" style="text-align:right;font-size:11px;font-family:var(--mono);color:var(--sub)">${hasMwst?fmt(nettoVal):'—'}</td>
        <td class="mob-hide" style="text-align:right;font-size:11px;font-family:var(--mono);color:#f97316">${hasMwst?'+'+fmt(mwstVal)+' ('+mwstRate+'%)':'—'}</td>`:''}
        <td style="text-align:right"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
        <td class="mob-hide" style="white-space:nowrap">
          ${!(e.is_storno||e._storniert)?`
          <button class="del-btn edit-btn" title="Bearbeiten" onclick="editE(event,'${e.id}')"><i class="fas fa-edit"></i></button>
          <button class="del-btn" onclick="delE(event,'${e.id}')"><i class="fas fa-times"></i></button>
          `:'<span style="font-size:10px;color:var(--sub)">GoBD</span>'}
        </td>
      </tr>`;}).join('');
    
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> Пагинация навигация
    let paginationHTML = '';
    if(totalPages > 1) {
      paginationHTML += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;flex-wrap:wrap">`;
      
      // Кнопка "на первую страницу"
      if(einPage > 1) {
        paginationHTML += `<button class="btn" onclick="einPage=1;renderEin()" style="padding:6px 10px" title="На первую"><i class="fas fa-step-backward"></i></button>`;
      }
      
      // Кнопка "назад на 10 страниц"
      if(einPage > 10) {
        paginationHTML += `<button class="btn" onclick="prevTenPages()" style="padding:6px 10px" title="-10 страниц"><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>`;
      }
      
      // Кнопка "назад"
      if(einPage > 1) {
        paginationHTML += `<button class="btn" onclick="einPage--;renderEin()" style="padding:6px 10px" title="Назад"><i class="fas fa-chevron-left"></i></button>`;
      }
      
      // Номера страниц
      const maxPagesToShow = 5;
      let startPage = Math.max(1, einPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      if(endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for(let i = startPage; i <= endPage; i++) {
        if(i === einPage) {
          paginationHTML += `<button class="btn" style="background:var(--blue);color:#fff;padding:6px 10px">${i}</button>`;
        } else {
          paginationHTML += `<button class="btn" onclick="einPage=${i};renderEin()" style="padding:6px 10px">${i}</button>`;
        }
      }
      
      // Кнопка "вперёд"
      if(einPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="einPage++;renderEin()" style="padding:6px 10px" title="Вперёд"><i class="fas fa-chevron-right"></i></button>`;
      }
      
      // Кнопка "вперёд на 10 страниц"
      if(einPage < totalPages - 9) {
        paginationHTML += `<button class="btn" onclick="nextTenPages(${totalPages})" style="padding:6px 10px" title="+10 страниц"><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>`;
      }
      
      // Кнопка "на последнюю страницу"
      if(einPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="einPage=${totalPages};renderEin()" style="padding:6px 10px" title="На последнюю"><i class="fas fa-step-forward"></i></button>`;
      }
      
      paginationHTML += `<span style="font-size:11px;color:var(--sub);margin-left:12px">${start+1}-${Math.min(end, entries.length)} / ${entries.length}</span>`;
      paginationHTML += `</div>`;
    }
    document.getElementById('e-pagination').innerHTML = paginationHTML;
  }
  
  // Im Journal: nur aktive Buchungen für Summen
  const activeE = entries.filter(e=>!e.is_storno&&!e._storniert);
  const stornoE = entries.filter(e=>e.is_storno||e._storniert);
  const ein=sum(activeE,'Einnahme'),aus=sum(activeE,'Ausgabe'),gew=ein-aus;
  g('es-cnt', fTyp==='Journal'
    ? `${activeE.length} aktiv · <span style="color:var(--sub);font-size:11px">${stornoE.length} Storno/Storniert</span>`
    : entries.length+'');
  g('es-ein',fmt(ein));g('es-aus',fmt(aus));
  g('es-gew',(gew>=0?'+':'')+fmt(gew));
  document.getElementById('es-gew').style.setProperty('color',gew>=0?'var(--green)':'var(--red)','important');
}

// ── MONTHLY REPORT ────────────────────────────────────────────────────────
function renderRep(){
  buildYearFilters();
  const repYr=document.getElementById('rep-yr');
  const yr=repYr.value||new Date().getFullYear()+'';
  const ye=activeEintraege().filter(e=>e.datum.startsWith(yr));

  const repJahr=document.getElementById('rep-yr')?.value||new Date().getFullYear()+'';
  const isRegel=!isKleinunternehmer(repJahr);
  // MwSt-Spalten im Bericht ein-/ausblenden
  ['rep-th-netto','rep-th-mwst','rep-th-zl'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = isRegel ? 'table-cell' : 'none';
  });
  const months=Array.from({length:12},(_,i)=>{
    const mi=String(i+1).padStart(2,'0');
    const me=ye.filter(e=>e.datum.substring(5,7)===mi);
    const ein=sum(me,'Einnahme'),aus=sum(me,'Ausgabe');
    const mwst=me.filter(e=>e.mwstBetrag>0).reduce((s,e)=>s+e.mwstBetrag,0);
    const vost=me.filter(e=>e.vorsteuerBet>0).reduce((s,e)=>s+e.vorsteuerBet,0);
    const netto=me.filter(e=>e.typ==='Einnahme').reduce((s,e)=>s+(e.nettoBetrag||e.betrag),0);
    return{i,mi,ein,aus,gew:ein-aus,count:me.length,mwst,vost,netto,zahllast:mwst-vost};
  });

  // Year stats
  const tEin=months.reduce((s,m)=>s+m.ein,0),tAus=months.reduce((s,m)=>s+m.aus,0);
  const tMwst=months.reduce((s,m)=>s+m.mwst,0), tVost=months.reduce((s,m)=>s+m.vost,0);
  const tZl=tMwst-tVost;
  g('rs-ein',fmt(tEin));g('rs-aus',fmt(tAus));
  g('rs-gew',fmt(tEin-tAus));document.getElementById('rs-gew').style.setProperty('color',(tEin-tAus)>=0?'var(--green)':'var(--red)','important');
  // MwSt Jahressummary card
  const rsMwstCard=document.getElementById('rs-mwst-card');
  if(rsMwstCard){
    rsMwstCard.style.display=isRegel?'':'none';
    if(isRegel){
      rsMwstCard.querySelector('.sc-lbl').textContent='MwSt-Zahllast '+yr;
      rsMwstCard.querySelector('.sc-val').textContent=(tZl>=0?'+':'')+fmt(tZl);
      rsMwstCard.querySelector('.sc-val').style.color=tZl>0?'var(--red)':'var(--green)';
      rsMwstCard.querySelector('.sc-sub').textContent='USt '+fmt(tMwst)+' − VoSt '+fmt(tVost);
    }
  }
  const bestM=months.reduce((b,m)=>m.gew>b.gew?m:b,months[0]);
  g('rs-best',bestM.count?fmt(bestM.gew):'—');g('rs-best-s',bestM.count?MN[bestM.i]:'');

  const mxE=Math.max(...months.map(m=>m.ein),1),mxA=Math.max(...months.map(m=>m.aus),1);
  const curMon=new Date().getMonth();
  const mob=isMob();
  document.getElementById('month-cards').innerHTML=months.map(m=>{
    const gc=m.gew>=0?'var(--green)':'var(--red)';
    const isCur=m.i===curMon&&yr===new Date().getFullYear()+'';
    const mname=mob?MS[m.i]:MN[m.i];
    return`<div class="mc${isCur?' current':''}" onclick="openMonatDetail('${yr}','${m.mi}')" style="cursor:pointer" title="${MN[m.i]} ${yr} — Details anzeigen">
      <div class="mc-top"><span class="mc-name">${mname}</span><span class="mc-gew" style="color:${gc}">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</span></div>
      <div class="mc-body">
        <div class="mc-stat"><label>Einnahmen</label><span style="color:var(--green)">${m.ein>0?fmt(m.ein):'—'}</span></div>
        <div class="mc-stat"><label>Ausgaben</label><span style="color:var(--red)">${m.aus>0?fmt(m.aus):'—'}</span></div>
      </div>
      <div class="mc-bars">
        <div class="mc-bar-row"><label style="color:var(--green);font-size:9px">E</label><div class="mc-bar-bg"><div class="mc-bar-fill ein" style="width:${Math.round(m.ein/mxE*100)}%"></div></div></div>
        <div class="mc-bar-row"><label style="color:var(--red);font-size:9px">A</label><div class="mc-bar-bg"><div class="mc-bar-fill aus" style="width:${Math.round(m.aus/mxA*100)}%"></div></div></div>
      </div>
    </div>`;
  }).join('');

  // Table — короткие месяцы на мобиле, КОМПАКТНАЯ ВЕРСИЯ
  let cumul=0,tot={ein:0,aus:0,cnt:0};
  document.getElementById('rep-tbody').innerHTML=months.map(m=>{
    tot.ein+=m.ein;tot.aus+=m.aus;tot.cnt+=m.count;cumul+=m.gew;
    const gc=m.gew>=0?'var(--green)':'var(--red)';
    const cc=cumul>=0?'var(--green)':'var(--red)';
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> Мобильная версия - более компактная
    if(mob) {
      return `<tr style="cursor:pointer" onclick="openMonatDetail('${yr}','${m.mi}')" title="Klicken für Details">
        <td style="font-weight:${m.count?'500':'400'};color:${m.count?'var(--text)':'var(--sub)'}">
          <span style="font-size:12px">${MS[m.i]}</span><br/>
          <span style="font-size:10px;color:var(--sub)">E: ${fmt(m.ein)}</span><br/>
          <span style="font-size:10px;color:var(--sub)">A: ${fmt(m.aus)}</span>
        </td>
        <td style="text-align:right;color:${gc};font-weight:600;padding-left:12px">
          <span style="font-size:12px">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</span>
        </td>
      </tr>`;
    } else {
      return `<tr style="cursor:pointer" onclick="openMonatDetail('${yr}','${m.mi}')" title="Klicken für Details" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <td style="font-weight:${m.count?'500':'400'};color:${m.count?'var(--text)':'var(--sub)'}">${MN[m.i]} <span style="font-size:10px;color:var(--sub)">↗</span></td>
        <td style="color:var(--green)">${m.ein>0?fmt(m.ein):'—'}</td>
        ${isRegel?`<td style="color:var(--sub);font-size:11px">${m.netto>0?fmt(m.netto):'—'}</td><td style="color:#f97316;font-size:11px">${m.mwst>0?fmt(m.mwst):'—'}</td><td style="color:var(--cyan);font-size:11px;font-weight:600">${m.zahllast!=0?(m.zahllast>0?'+':'')+fmt(m.zahllast):'—'}</td>`:''}
        <td style="color:var(--red)">${m.aus>0?fmt(m.aus):'—'}</td>
        <td style="color:${gc};font-weight:600">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</td>
        <td style="color:${cc}">${m.count?(cumul>=0?'+':'')+fmt(cumul):'—'}</td>
        <td style="color:var(--sub)">${m.count||'—'}</td>
      </tr>`;
    }
  }).join('');
  const tg=tot.ein-tot.aus;
  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Footer также адаптивен
  if(mob) {
    document.getElementById('rep-tfoot').innerHTML=`<tr>
      <td style="font-weight:600">
        <span style="font-size:12px">GESAMT ${yr.substring(2)}</span><br/>
        <span style="font-size:10px;color:var(--green)">E: ${fmt(tot.ein)}</span><br/>
        <span style="font-size:10px;color:var(--red)">A: ${fmt(tot.aus)}</span>
      </td>
      <td style="padding-right:10px; text-align:right;color:${tg>=0?'var(--green)':'var(--red)'};font-weight:600">
        <span style="font-size:12px">${tg>=0?'+':''}${fmt(tg)}</span>
      </td>
    </tr>`;
  } else {
    const totMwst=months.reduce((s,m)=>s+m.mwst,0);
    const totVost=months.reduce((s,m)=>s+m.vost,0);
    const totNetto=months.reduce((s,m)=>s+m.netto,0);
    const totZl=totMwst-totVost;
    document.getElementById('rep-tfoot').innerHTML=`<tr>
      <td>GESAMT ${yr}</td>
      <td style="color:var(--green)">${fmt(tot.ein)}</td>
      ${isRegel?`<td style="color:var(--sub);font-size:11px">${fmt(totNetto)}</td><td style="color:#f97316;font-size:11px">${fmt(totMwst)}</td><td style="color:var(--cyan);font-size:11px;font-weight:700">${totZl>0?'+':''}${fmt(totZl)}</td>`:''}
      <td style="color:var(--red)">${fmt(tot.aus)}</td>
      <td style="color:${tg>=0?'var(--green)':'var(--red)'}">${tg>=0?'+':''}${fmt(tg)}</td>
      <td></td>
      <td style="color:var(--sub)">${tot.cnt}</td>
    </tr>`;
  }
}

// ── ZAHLUNGSARTEN ─────────────────────────────────────────────────────────
function renderZ(){
  buildYearFilters();
  const yr=document.getElementById('z-yr').value;
  const ye=(yr==='Alle'?activeEintraege():activeEintraege().filter(e=>e.datum.startsWith(yr)));
  const mob=isMob();

  const zkStats={};
  ZAHL.forEach(z=>zkStats[z]={ein:0,aus:0,cnt:0});
  ye.forEach(e=>{
    const z=e.zahlungsart||'Sonstiges';
    if(!zkStats[z])zkStats[z]={ein:0,aus:0,cnt:0};
    if(e.typ==='Einnahme')zkStats[z].ein+=e.betrag; else zkStats[z].aus+=e.betrag;
    zkStats[z].cnt++;
  });

  document.getElementById('zk-grid').innerHTML=ZAHL.map(z=>{
    const s=zkStats[z]||{ein:0,aus:0,cnt:0};
    const gew=s.ein-s.aus;
    const gc=gew>0?'var(--green)':gew<0?'var(--red)':'var(--sub)';
    const col=ZCOLS[z]||'var(--blue)';
    // Прогрессбар: доля einnahmen от общего оборота
    const total=s.ein+s.aus;
    const einPct=total>0?Math.round(s.ein/total*100):0;
    // Иконка в круге с прозрачным фоном цвета
    const iconBg=col.replace('var(--','').replace(')','');
    const bgMap={'--blue':'rgba(26,69,120,.1)','--yellow':'rgba(224,140,26,.1)','--purple':'rgba(111,66,193,.1)','--cyan':'rgba(13,127,170,.1)','--green':'rgba(93,157,105,.1)','--muted':'rgba(132,150,170,.1)'};
    const iconBgCol=bgMap[col]||'rgba(26,69,120,.1)';
    return `<div class="zk">

      <div class="zk-body">
        <div class="zk-header">
          <div class="zk-icon-wrap" style="background:${iconBgCol};color:${col}">
            ${ZICONS[z]||'€'}
          </div>
          <div>
            <div class="zk-name">${z}</div>
            <div class="zk-name-sub">${s.cnt} Einträge</div>
          </div>
        </div>
        <div class="zk-val">${s.cnt>0?fmt(total):'—'}</div>
        <div class="zk-row">
          <span class="zk-pill"><i class="fas fa-arrow-up" style="color:var(--green)"></i>${fmt(s.ein)}</span>
          <span class="zk-pill"><i class="fas fa-arrow-down" style="color:var(--red)"></i>${fmt(s.aus)}</span>
        </div>
        ${s.cnt>0?`<div class="zk-prog"><div class="zk-prog-fill" style="width:${einPct}%;background:${col}"></div></div>`:''}
        <div class="zk-sub">Gewinn: <strong style="color:${gc}">${gew>=0?'+':''}${fmt(gew)}</strong></div>
      </div>
    </div>`;
  }).join('');

  const sorted=[...ye].sort((a,b)=>b.datum.localeCompare(a.datum));
  const ztb=document.getElementById('z-tbody'),zem=document.getElementById('z-empty');
  const zpag=document.getElementById('z-pagination');
  
  if(!sorted.length){
    ztb.innerHTML='';
    zem.style.display='block';
    if(zpag) zpag.innerHTML='';
  } else {
    zem.style.display='none';
    
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> ПАГИНАЦИЯ: показываем только 50 записей на странице
    const totalPages = Math.ceil(sorted.length / zPerPage);
    if(zPage > totalPages) zPage = totalPages;
    
    const start = (zPage - 1) * zPerPage;
    const end = start + zPerPage;
    const pageEntries = sorted.slice(start, end);
    
    ztb.innerHTML=pageEntries.map(e=>{
      const yearForDisplay = mob ? e.datum.substring(2,4) : e.datum.substring(0,4);
      return `<tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--sub)">${fd(e.datum)}</td>
        <td><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'} ${mob?'':''+e.typ}</span></td>
        ${mob?'':`<td>${e.beschreibung}</td>`}
        <td><span class="badge ${ZBADGE[e.zahlungsart]||''}">${ZICONS[e.zahlungsart]||''} ${mob?'':e.zahlungsart||'Sonstiges'}</span></td>
        <td style="text-align:right"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
      </tr>`;
    }).join('');
    
    // <i class="fas fa-check-circle" style="color:var(--green)"></i> Пагинация навигация
    let paginationHTML = '';
    if(totalPages > 1) {
      paginationHTML += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;flex-wrap:wrap">`;
      
      if(zPage > 1) {
        paginationHTML += `<button class="btn" onclick="zPage=1;renderZ()" style="padding:6px 10px" title="На первую"><i class="fas fa-step-backward"></i></button>`;
      }
      
      if(zPage > 10) {
        paginationHTML += `<button class="btn" onclick="zPage=Math.max(1,zPage-10);renderZ()" style="padding:6px 10px" title="-10"><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>`;
      }
      
      if(zPage > 1) {
        paginationHTML += `<button class="btn" onclick="zPage--;renderZ()" style="padding:6px 10px" title="Назад"><i class="fas fa-chevron-left"></i></button>`;
      }
      
      const maxPagesToShow = 5;
      let startPage = Math.max(1, zPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      if(endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for(let i = startPage; i <= endPage; i++) {
        if(i === zPage) {
          paginationHTML += `<button class="btn" style="background:var(--blue);color:#fff;padding:6px 10px">${i}</button>`;
        } else {
          paginationHTML += `<button class="btn" onclick="zPage=${i};renderZ()" style="padding:6px 10px">${i}</button>`;
        }
      }
      
      if(zPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="zPage++;renderZ()" style="padding:6px 10px" title="Вперёд"><i class="fas fa-chevron-right"></i></button>`;
      }
      
      if(zPage <= totalPages - 10) {
        paginationHTML += `<button class="btn" onclick="zPage=Math.min(${totalPages},zPage+10);renderZ()" style="padding:6px 10px" title="+10"><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>`;
      }
      
      if(zPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="zPage=${totalPages};renderZ()" style="padding:6px 10px" title="На последнюю"><i class="fas fa-step-forward"></i></button>`;
      }
      
      paginationHTML += `<span style="font-size:11px;color:var(--sub);margin-left:12px">${start+1}-${Math.min(end, sorted.length)} / ${sorted.length}</span>`;
      paginationHTML += `</div>`;
    }
    if(zpag) zpag.innerHTML = paginationHTML;
  }
}

// ── Beleg scannen via Gemini Vision API (Supabase Edge Function) ──────────
let _scanBase64 = null;
let _scanMediaType = null;

async function scanBelegPreview(input) {
  const file = input.files[0];
  if (!file) return;

  // Sofort zu base64 konvertieren — kein File-Objekt speichern
  const { data: imgData, mediaType: imgType } = await resizeToBase64(file, 600);
  _scanBase64 = imgData;
  _scanMediaType = imgType;

  const preview = document.getElementById('scan-preview-box');
  const img = document.getElementById('scan-preview-img');
  // Preview aus base64 anzeigen
  img.src = `data:${_scanMediaType};base64,${_scanBase64}`;
  preview.style.display = 'block';
  document.getElementById('scan-status').style.display = 'none';
  const btnArea = document.getElementById('scan-btn-area');
  if (btnArea) btnArea.style.display = 'none';
  input.value = '';
}

function openScanZoom() {
  const img = document.getElementById('scan-preview-img');
  if (!img || !img.src) return;
  const modal = document.getElementById('scan-zoom-modal');
  if (!modal) return;
  document.getElementById('scan-zoom-img').src = img.src;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeScanZoom() {
  document.getElementById('scan-zoom-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function scanBelegCancel() {
  _scanBase64 = null;
  _scanMediaType = null;
  document.getElementById('scan-preview-box').style.display = 'none';
  const btnArea = document.getElementById('scan-btn-area');
  if (btnArea) btnArea.style.display = '';
}

async function scanBelegStart() {
  if (!_scanBase64) return;
  await scanBeleg(_scanBase64, _scanMediaType);
  _scanBase64 = null;
  _scanMediaType = null;
}

async function scanBeleg(base64, mediaType) {
  const status = document.getElementById('scan-status');
  const statusInner = document.getElementById('scan-status-inner');
  status.style.display = 'block';
  if (statusInner) {
    statusInner.className = '';
    statusInner.style.cssText = 'padding:8px 0;background:none;border:none;text-align:left';
    statusInner.innerHTML = `
      <div style="font-size:12px;color:var(--sub);margin-bottom:5px">Laden...</div>
      <div style="height:3px;border-radius:2px;background:var(--border);overflow:hidden">
        <div style="height:100%;width:30%;background:rgba(59,130,246,.5);border-radius:2px;animation:scan-progress-slide 1.4s ease-in-out infinite"></div>
      </div>`;
  }

  try {
    const resp = await fetch(`${SUPA_URL}/functions/v1/scan-beleg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPA_KEY}`
      },
      body: JSON.stringify({ image: base64, mediaType })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Serverfehler');
    }

    const result = await resp.json();

    if (result.datum) {
      document.getElementById('nf-dat').value = result.datum;
      updateMwstFormVisibility();
    }
    if (result.mwst_rate !== undefined) {
      const mwstSel = document.getElementById('nf-mwst-rate');
      if (mwstSel) mwstSel.value = result.mwst_rate;
    }
    if (result.betrag) {
      document.getElementById('nf-bet').value = parseFloat(result.betrag).toFixed(2);
      calcNfVorsteuer(); calcNfMwst();
    }
    if (result.beschreibung) {
      document.getElementById('nf-dsc').value = result.beschreibung;
    }
    if (result.notiz) {
      const noteEl = document.getElementById('nf-note');
      if (noteEl) noteEl.value = result.notiz;
    }
    if (result.zahlungsart) {
      const zahlSel = document.getElementById('nf-zahl');
      if (zahlSel) zahlSel.value = result.zahlungsart;
    }

    // Hide progress bar, keep preview visible
    status.style.display = 'none';
    if (statusInner) statusInner.style.cssText = '';

  } catch (err) {
    if (statusInner) {
      statusInner.style.cssText = 'padding:8px 0;background:none;border:none;text-align:left';
      statusInner.innerHTML = `<div style="font-size:12px;color:var(--red)">${err.message}</div>`;
    }
    setTimeout(() => { status.style.display = 'none'; if(statusInner) statusInner.style.cssText=''; }, 4000);
  }
}

// Bild skalieren + zu base64 konvertieren
// Bild skalieren, Beleg-Autocrop + Scan-Effekt, zu base64 konvertieren
function resizeToBase64(file, maxW) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      // Ориентация: чек вертикальный — ограничиваем по короткой стороне
      const isPortrait = h >= w;
      if (isPortrait && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (!isPortrait && h > maxW) { w = Math.round(w * maxW / h); h = maxW; }

      // Шаг 1: рисуем в grayscale для анализа пикселей
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      tctx.filter = 'grayscale(1)';
      tctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      // Шаг 2: автокроп — ищем границы чека по светлым пикселям
      const pixels = tctx.getImageData(0, 0, w, h).data;
      const threshold = 200;       // пиксели светлее этого — часть чека
      const margin = 3;            // отступ вокруг найденного края
      const minLightFraction = 0.3; // минимум 30% светлых пикселей в строке

      const isLight = (x, y) => {
        const i = (y * w + x) * 4;
        return pixels[i] > threshold && pixels[i+1] > threshold && pixels[i+2] > threshold;
      };

      let top = 0, bottom = h - 1, left = 0, right = w - 1;
      for (let y = 0; y < h; y++) {
        let cnt = 0; for (let x = 0; x < w; x++) if (isLight(x, y)) cnt++;
        if (cnt / w >= minLightFraction) { top = y; break; }
      }
      for (let y = h - 1; y >= 0; y--) {
        let cnt = 0; for (let x = 0; x < w; x++) if (isLight(x, y)) cnt++;
        if (cnt / w >= minLightFraction) { bottom = y; break; }
      }
      for (let x = 0; x < w; x++) {
        let cnt = 0; for (let y = top; y <= bottom; y++) if (isLight(x, y)) cnt++;
        if (cnt / (bottom - top + 1) >= minLightFraction) { left = x; break; }
      }
      for (let x = w - 1; x >= 0; x--) {
        let cnt = 0; for (let y = top; y <= bottom; y++) if (isLight(x, y)) cnt++;
        if (cnt / (bottom - top + 1) >= minLightFraction) { right = x; break; }
      }

      top    = Math.max(0, top - margin);
      bottom = Math.min(h - 1, bottom + margin);
      left   = Math.max(0, left - margin);
      right  = Math.min(w - 1, right + margin);

      const cropW = right - left + 1;
      const cropH = bottom - top + 1;
      const useCrop = cropW > w * 0.1 && cropH > h * 0.1;

      // Шаг 3: финальный canvas — кропнутый + скан-эффект
      const canvas = document.createElement('canvas');
      canvas.width  = useCrop ? cropW : w;
      canvas.height = useCrop ? cropH : h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'grayscale(1) contrast(1.5) brightness(1.3)';
      if (useCrop) {
        ctx.drawImage(tmp, left, top, cropW, cropH, 0, 0, cropW, cropH);
      } else {
        ctx.drawImage(tmp, 0, 0);
      }

      // Шаг 4: WebP 0.55 или JPEG fallback
      const webp = canvas.toDataURL('image/webp', 0.55);
      const isWebp = webp.startsWith('data:image/webp');
      const out = isWebp ? webp : canvas.toDataURL('image/jpeg', 0.65);
      resolve({ data: out.split(',')[1], mediaType: isWebp ? 'image/webp' : 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = url;
  });
}

function parseBelegText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = {};

  // ── 1. DATUM ────────────────────────────────────────────────────────────
  // Priorität: Zeile mit "Datum:" zuerst, dann alle anderen
  const dateRx = /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\b/;
  const tryDate = (line) => {
    const m = line.match(dateRx);
    if (!m) return null;
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const yi=parseInt(y), mi=parseInt(mo), di=parseInt(d);
    if (yi>=2010 && yi<=2035 && mi>=1 && mi<=12 && di>=1 && di<=31)
      return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    return null;
  };
  for (const line of lines) {
    if (/datum/i.test(line)) { const d = tryDate(line); if (d) { result.datum = d; break; } }
  }
  if (!result.datum) {
    for (const line of lines) { const d = tryDate(line); if (d) { result.datum = d; break; } }
  }

  // ── 2. BRUTTO-BETRAG ────────────────────────────────────────────────────
  const amountRx = /(\d{1,6}[.,]\d{2})/g;
  const getAmounts = (line) => [...line.matchAll(amountRx)].map(m => parseFloat(m[1].replace(',','.')));

  // Prio 1: строка с BRUTTO (MwSt-Tabelle внизу чека)
  for (const line of lines) {
    if (!/brutto/i.test(line)) continue;
    const nums = getAmounts(line);
    if (nums.length) { result.betrag = Math.max(...nums); break; }
  }
  // Prio 2: SUMME/GESAMT/TOTAL — ищем снизу вверх
  if (!result.betrag) {
    for (let i = lines.length-1; i >= 0; i--) {
      if (!/\b(summe|gesamt|total|gesamtbetrag|endbetrag|zu zahlen|zahlbetrag)\b/i.test(lines[i])) continue;
      const nums = getAmounts(lines[i]);
      if (nums.length) { result.betrag = Math.max(...nums); break; }
    }
  }
  // Prio 3: GEGEBEN / Betrag EUR
  if (!result.betrag) {
    for (const line of lines) {
      if (!/\b(gegeben|betrag eur|betrag)\b/i.test(line)) continue;
      const nums = getAmounts(line);
      if (nums.length) { result.betrag = Math.max(...nums); break; }
    }
  }
  // Prio 4: größte Zahl im Text
  if (!result.betrag) {
    const all = [...text.matchAll(amountRx)].map(m => parseFloat(m[1].replace(',','.'))).filter(n => n > 0.5 && n < 99999);
    if (all.length) result.betrag = Math.max(...all);
  }

  // ── 3. MWST-SATZ ────────────────────────────────────────────────────────
  const has19 = /\b19\s*%/.test(text);
  const has7  = /\b7\s*%/.test(text);
  result.mwst_rate = has19 ? 19 : has7 ? 7 : 19;

  // ── 4. FIRMENNAME → für Beschreibung ────────────────────────────────────
  const skipLineRx = /^[*\-=_#+.\d\s]{0,3}$|^(tel|fax|www|http|ust|weee|steuer|iban|bic|filiale|filial)/i;
  let firma = '';
  for (const line of lines.slice(0, 12)) {
    if (line.length < 3 || skipLineRx.test(line)) continue;
    if (/[A-Za-zÄÖÜäöüß]{3,}/.test(line)) { firma = line.replace(/\s+/g,' ').substring(0,35); break; }
  }

  // ── 5. BELEGNUMMER ───────────────────────────────────────────────────────
  let belegNr = '';
  const belegRx = /(?:beleg[-\s]?nr|bon[-\s]?nr|re[-\s]?nr|belegnr|bonnr|rechnungs[-\s]?nr)[.\s:]*([A-Z0-9\-\/]{1,15})/i;
  for (const line of lines) {
    const m = line.match(belegRx);
    if (m && m[1]) { belegNr = m[1]; break; }
  }

  // ── 6. BESCHREIBUNG = Firmenname + Datum + Belegnummer ──────────────────
  const parts = [];
  if (firma) parts.push(firma);
  if (result.datum) {
    const [y,mo,d] = result.datum.split('-');
    parts.push(`${d}.${mo}.${y}`);
  }
  if (belegNr) parts.push(`Nr. ${belegNr}`);
  result.beschreibung = parts.join(' · ');

  // ── 7. ARTIKELLISTE → Notiz ─────────────────────────────────────────────
  // Zeilen die wie Artikel aussehen: Text (min 3 Zeichen) + Leerzeichen + Preis
  // Ausschließen: Kopfzeilen, Summen, Zahlungsinfos, MwSt-Tabelle
  const skipNotizRx = /gesamt|summe|total|mwst|steuer|gegeben|zahlung|datum|uhrzeit|beleg|bon|rechnung|tel|fax|www|@|iban|bic|sepa|terminal|trace|transaktion|vielen dank|filial|steuernr|weee|artean|art\/ean|stück|stk\.|brutto|netto|sonderp/i;

  // Artikel-Pattern: optionale Menge am Anfang, dann Name, dann Preis
  // Beispiele: "Brot           1,29"  "2x Kaffee    4,50"  "D6XNP 28/34    25,95"
  const articleRx = /^(?:\d+\s*[xX×]\s*)?(.{3,35}?)\s{2,}(\d{1,4}[.,]\d{2})\s*[\d\s]*$/;
  const articles = [];

  // Bereich: nach Kopfzeilen (ca. ab Zeile 5) bis vor Summen-Bereich
  // Summen-Bereich finden
  let sumIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/\b(summe|gesamt|total)\b/i.test(lines[i])) { sumIdx = i; break; }
  }

  for (let i = 4; i < sumIdx; i++) {
    const line = lines[i];
    if (skipNotizRx.test(line)) continue;
    const m = line.match(articleRx);
    if (m) {
      let name = m[1].trim().replace(/^\d+\s*[xX×]\s*/,'');
      const price = m[2];
      if (name.length >= 3 && !/^\d+$/.test(name) && !/^[*\-=]{2,}/.test(name)) {
        articles.push(`${name}  ${price} €`);
        if (articles.length >= 12) break;
      }
    }
  }

  // Wenn keine Artikel gefunden — versuche mittleren Bereich des Textes
  if (articles.length === 0) {
    const midStart = Math.floor(lines.length * 0.15);
    const midEnd   = Math.floor(lines.length * 0.65);
    for (let i = midStart; i < midEnd; i++) {
      const line = lines[i];
      if (skipNotizRx.test(line)) continue;
      const nums = getAmounts(line);
      if (nums.length > 0 && line.length > 5 && /[A-Za-zÄÖÜäöüß]{2,}/.test(line)) {
        const clean = line.replace(/^\d+\s*[xX×]\s*/, '').trim();
        if (clean.length >= 3) {
          articles.push(clean);
          if (articles.length >= 12) break;
        }
      }
    }
  }

  if (articles.length > 0) result.notiz = articles.join('\n');

  // ── 8. ZAHLUNGSART ──────────────────────────────────────────────────────
  const hasKarte = /ec.?karte|kartenzahlung|kontaktlos|girocard|debit|kreditkarte|mastercard|visa|amex|credit/i.test(text);
  const hasBar   = /\bbar(?:zahlung|geld)?\b|\bcash\b/i.test(text);
  if (hasKarte)                          result.zahlungsart = 'EC-Karte';
  else if (/paypal/i.test(text))         result.zahlungsart = 'PayPal';
  else if (/lastschrift|sepa/i.test(text)) result.zahlungsart = 'Lastschrift';
  else if (hasBar)                       result.zahlungsart = 'Barzahlung';
  else if (/überweisung/i.test(text))    result.zahlungsart = 'Überweisung';

  return result;
}
