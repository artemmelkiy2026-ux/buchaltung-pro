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
  // Scan-Button nur bei Ausgabe anzeigen
  const scanBox = document.getElementById('scan-beleg-box');
  if(scanBox) scanBox.style.display = t==='Ausgabe' ? 'block' : 'none';
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

  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Обновляем визуальные индикаторы сортировки
  const thHeaders = document.querySelectorAll('#d-recent-tbl th');
  thHeaders.forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const colName = {
      'Datum': 'datum',
      'Typ': 'typ',
      'Kat.': 'kategorie',
      'Zahlung': 'zahlungsart',
      'Beschreibung': 'beschreibung',
      'Betrag': 'betrag'
    }[th.textContent.trim()];
    if(colName === dashSortCol) {
      th.classList.add(dashSortAsc ? 'sort-asc' : 'sort-desc');
    }
  });
  
  // Recent 10 — показываем последние 10 ПО ВЫБРАННОМУ ГОДУ
  let recent=[...ye]  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Используем ye (отфильтрованные по году данные)
    .sort((a,b)=>b.datum.localeCompare(a.datum))  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Сначала сортируем по дате (новые сверху)
    .slice(0,10);                                   // <i class="fas fa-check-circle" style="color:var(--green)"></i> Берём первые 10 (последние по дате)
  
  // <i class="fas fa-check-circle" style="color:var(--green)"></i> Потом сортируем эти 10 по выбранной колонке
  if(dashSortCol !== 'datum') {
    recent.sort((a,b)=>{
      let va=a[dashSortCol], vb=b[dashSortCol];
      // Для чисел (betrag)
      if(dashSortCol==='betrag'){ va=+va; vb=+vb; }
      // Для других (typ, kategorie, zahlungsart, beschreibung)
      if(dashSortAsc) return va>vb?1:-1;
      return va<vb?1:-1;
    });
  } else {
    // Если сортируем по дате - используем dashSortAsc для порядка
    if(dashSortAsc) {
      recent.reverse(); // Обратный порядок (старые сверху)
    }
  }
  const mob=isMob();
  document.getElementById('d-recent').innerHTML=recent.length?recent.map(e=>`
    <tr onclick="${mob?`showMobDetail(${JSON.stringify(e).replace(/"/g,"'")})`:''}" style="${mob?'cursor:pointer':''};${(e.is_storno||e._storniert)?'opacity:0.45;background:rgba(148,163,184,0.07);':''}">
      <td style="font-family:var(--mono);font-size:11px;color:var(--sub);white-space:nowrap">${mob?fdm(e.datum):fd(e.datum)}</td>
      <td style="white-space:nowrap"><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}" style="display:inline-flex;align-items:center;gap:5px">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'}${mob?'':'<span style="font-size:11px;font-weight:600">'+(e.typ==='Einnahme'?'Einnahme':'Ausgabe')+'</span>'}</span></td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.kategorie}">${e.kategorie}</td>
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span class="badge ${ZBADGE[e.zahlungsart]||''}" style="font-size:10px">${e.zahlungsart||'—'}</span></td>
      <td class="mob-hide" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px" title="${e.beschreibung}">${e.beschreibung}</td>
      <td style="text-align:right;white-space:nowrap"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
    </tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--sub)">'+'Keine Einträge'+'</td></tr>';
}

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

// ── Bild-Vorverarbeitung für bessere OCR ──────────────────────────────────
function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Max 2000px Breite — größer bringt nichts, verlangsamt nur
      const MAX = 2000;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Bild zeichnen
      ctx.drawImage(img, 0, 0, w, h);

      // Graustufen + Kontrast erhöhen
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Graustufen
        const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        // Kontrast: Faktor 1.5, Mittelpunkt 128
        const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
        d[i] = d[i+1] = d[i+2] = contrast;
      }
      ctx.putImageData(imageData, 0, 0);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = url;
  });
}

// ── Beleg scannen (Tesseract.js OCR) ──────────────────────────────────────
async function scanBeleg(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('scan-status');
  status.style.display = 'block';
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bild wird geladen…';

  try {
    // Bild via Canvas vorverarbeiten: Kontrast + Graustufen → bessere OCR-Qualität
    const imgUrl = await preprocessImage(file);

    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Text wird erkannt… (kann 10–20 Sek. dauern)';

    // Tesseract OCR — Deutsch + Englisch für bessere Zahlenerkennung
    const { data: { text } } = await Tesseract.recognize(imgUrl, 'deu+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          status.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Erkenne Text… ${pct}%`;
        }
      }
    });

    URL.revokeObjectURL(imgUrl);

    if (!text || text.trim().length < 5) {
      throw new Error('Kein Text erkannt. Bitte deutlicheres Foto machen.');
    }

    // Text parsen
    const result = parseBelegText(text);

    // Felder befüllen
    let filled = [];

    // 1. Datum
    if (result.datum) {
      document.getElementById('nf-dat').value = result.datum;
      updateMwstFormVisibility();
      filled.push('Datum');
    }
    // 2. MwSt-Satz zuerst setzen — damit calcNfMwst korrekt rechnet
    if (result.mwst_rate !== undefined) {
      const mwstSel = document.getElementById('nf-mwst-rate');
      if (mwstSel) mwstSel.value = result.mwst_rate;
    }
    // 3. Brutto-Betrag eintragen + neu berechnen
    if (result.betrag) {
      document.getElementById('nf-bet').value = result.betrag.toFixed(2);
      calcNfVorsteuer();
      calcNfMwst(); // berechnet Netto + MwSt-Betrag aus Brutto
      filled.push('Betrag ' + result.betrag.toFixed(2) + ' € (Brutto)');
    }
    // 4. Beschreibung
    if (result.beschreibung) {
      document.getElementById('nf-dsc').value = result.beschreibung;
      filled.push('Beschreibung');
    }
    // 5. Notiz
    if (result.notiz) {
      const noteEl = document.getElementById('nf-note');
      if (noteEl) noteEl.value = result.notiz;
      filled.push('Notiz');
    }

    if (filled.length === 0) {
      status.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:var(--orange)"></i> Text erkannt, aber keine Beträge gefunden. Bitte manuell eingeben.';
    } else {
      status.innerHTML = `<i class="fas fa-check-circle" style="color:var(--green)"></i> Erkannt: ${filled.join(', ')} — bitte prüfen!`;
    }
    setTimeout(() => { status.style.display = 'none'; }, 5000);

  } catch (err) {
    status.innerHTML = `<i class="fas fa-exclamation-circle" style="color:var(--red)"></i> ${err.message}`;
    setTimeout(() => { status.style.display = 'none'; }, 6000);
  }

  input.value = '';
}

function parseBelegText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = {};

  // ── Datum ──────────────────────────────────────────────────────────────
  // Formate: 01.02.2025 / 2025-02-01 / 01/02/2025 / 01.02.25
  const datPatterns = [
    /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](20\d{2})\b/,  // DD.MM.YYYY
    /\b(20\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\b/,  // YYYY-MM-DD
    /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2})\b/,    // DD.MM.YY
  ];
  for (const line of lines) {
    for (let i = 0; i < datPatterns.length; i++) {
      const m = line.match(datPatterns[i]);
      if (m) {
        let d, mo, y;
        if (i === 1) { [, y, mo, d] = m; }
        else {
          [, d, mo, y] = m;
          if (y.length === 2) y = '20' + y;
        }
        d = d.padStart(2,'0'); mo = mo.padStart(2,'0');
        if (parseInt(mo) >= 1 && parseInt(mo) <= 12 && parseInt(d) >= 1 && parseInt(d) <= 31) {
          result.datum = `${y}-${mo}-${d}`;
          break;
        }
      }
    }
    if (result.datum) break;
  }

  // ── Betrag — Gesamtbetrag ───────────────────────────────────────────────
  // Suche nach Schlüsselwörtern: Gesamt, Total, Summe, Zahlung, Betrag, EUR
  const totalKeywords = /gesamt|total|summe|zahlung|endbetrag|zu zahlen|gesamtbetrag|bar|brutto/i;
  const amountRx = /(\d{1,6}[.,]\d{2})/g;

  let candidates = [];

  for (const line of lines) {
    const amounts = [...line.matchAll(amountRx)].map(m => parseFloat(m[1].replace(',','.')));
    if (amounts.length === 0) continue;
    const maxAmt = Math.max(...amounts);
    const isTotal = totalKeywords.test(line);
    candidates.push({ amt: maxAmt, isTotal, line });
  }

  // Bevorzuge Zeilen mit Schlüsselwort
  const totalLine = candidates.filter(c => c.isTotal).sort((a,b) => b.amt - a.amt)[0];
  if (totalLine) {
    result.betrag = totalLine.amt;
  } else {
    // Fallback: größte Zahl auf dem Beleg (wahrscheinlich Gesamtbetrag)
    const largest = candidates.sort((a,b) => b.amt - a.amt)[0];
    if (largest && largest.amt > 0) result.betrag = largest.amt;
  }

  // ── MwSt-Satz — wähle den auf dem Beleg dominanten Satz ───────────────
  // Suche MwSt-Beträge neben dem Prozentsatz: "19% 12,34" oder "7% 0,89"
  const mwstLineRx = /(19|7)\s*%[^\n]{0,30}?(\d{1,4}[.,]\d{2})/gi;
  const mwstMatches = { 19: 0, 7: 0 };
  let m;
  while ((m = mwstLineRx.exec(text)) !== null) {
    const rate = parseInt(m[1]);
    const amt = parseFloat(m[2].replace(',','.'));
    if (rate === 19 || rate === 7) mwstMatches[rate] = Math.max(mwstMatches[rate], amt);
  }
  if (mwstMatches[19] > 0 || mwstMatches[7] > 0) {
    result.mwst_rate = mwstMatches[19] >= mwstMatches[7] ? 19 : 7;
  } else if (/\b19\s*%/.test(text)) {
    result.mwst_rate = 19;
  } else if (/\b7\s*%/.test(text)) {
    result.mwst_rate = 7;
  } else {
    result.mwst_rate = 19; // Standard-Fallback
  }

  // ── Beschreibung — Firmenname + Belegnummer ───────────────────────────
  let firmaName = '';
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3) continue;
    if (/^\d/.test(line)) continue;
    if (/^[*\-=_#]{2,}/.test(line)) continue;
    firmaName = line.substring(0, 40);
    break;
  }
  // Belegnummer suchen: Bon-Nr, Beleg-Nr, Rechnung, Nr., #
  let belegNr = '';
  const belegRx = /(?:bon[\s\-]?nr|beleg[\s\-]?nr|re[\s\-]?nr|rechnungs[\s\-]?nr|nr\.|receipt|#)\s*[:\.]?\s*([A-Z0-9\-\/]+)/i;
  for (const line of lines) {
    const m = line.match(belegRx);
    if (m) { belegNr = m[1].substring(0, 20); break; }
  }
  if (firmaName) {
    result.beschreibung = belegNr ? `${firmaName} · Nr. ${belegNr}` : firmaName;
  }

  // ── Notiz — Artikelliste ────────────────────────────────────────────────
  // Zeilen die wie Artikel aussehen: Text + Preis daneben, nicht Header/Footer
  const skipRx = /gesamt|total|summe|mwst|steuer|zahlung|vielen dank|datum|uhrzeit|kasse|beleg|bon|rechnung|tel|fax|www|@|ust|%/i;
  const articleRx = /^(.{2,40}?)\s{2,}(\d{1,4}[.,]\d{2})\s*$/;
  const articles = [];
  for (const line of lines) {
    if (skipRx.test(line)) continue;
    const m = line.match(articleRx);
    if (m) {
      articles.push(`${m[1].trim()} ${m[2]}`);
      if (articles.length >= 8) break;
    }
  }
  if (articles.length > 0) result.notiz = articles.join('\n');

  return result;
}
