// ── PROGNOSE ─────────────────────────────────────────────────────────────
function renderProg(){
  const years=[...new Set(data.eintraege.map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('prog-yr');
  if(!sel.innerHTML||!sel.value){
    sel.innerHTML=years.map((y,i)=>`<option${i===0?' selected':''}>${y}</option>`).join('');
  }
  const yr=sel.value||new Date().getFullYear()+'';
  const prevYr=String(parseInt(yr)-1);
  const now=new Date(); const curM=yr===now.getFullYear()+''?now.getMonth():11;
  const ye=activeEintraege().filter(e=>e.datum.startsWith(yr));
  const pe=activeEintraege().filter(e=>e.datum.startsWith(prevYr));

  const einM=Array(12).fill(0),ausM=Array(12).fill(0);
  const einP=Array(12).fill(0),ausP=Array(12).fill(0);
  ye.forEach(e=>{const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')einM[m]+=e.betrag;else ausM[m]+=e.betrag;});
  pe.forEach(e=>{const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')einP[m]+=e.betrag;else ausP[m]+=e.betrag;});

  const istEin=einM.slice(0,curM+1).reduce((s,v)=>s+v,0);
  const istAus=ausM.slice(0,curM+1).reduce((s,v)=>s+v,0);
  const aktMonate=einM.slice(0,curM+1).filter(v=>v>0).length||1;
  const aktMonateAus=ausM.slice(0,curM+1).filter(v=>v>0).length||1;
  const avgEin=istEin/aktMonate, avgAus=istAus/aktMonateAus;
  const progEin=Math.round((istEin+avgEin*(11-curM))*100)/100;
  const progAus=Math.round((istAus+avgAus*(11-curM))*100)/100;
  const progGew=progEin-progAus;
  const prevEin=einP.reduce((s,v)=>s+v,0);
  const prevAus=ausP.reduce((s,v)=>s+v,0);
  const prevGew=prevEin-prevAus;
  const deltaEin=prevEin>0?Math.round((progEin/prevEin-1)*100):null;
  const deltaGew=prevGew!==0?Math.round((progGew/Math.abs(prevGew)-1)*100):null;

  // ── 1. SUMMARY CARDS ────────────────────────────────────────────────────
  document.getElementById('prog-cards').innerHTML=`
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Prognose Einnahmen ${yr}</div>
      <div class="sc-val">${fmt(progEin)}</div>
      <div class="sc-sub">Bisher: ${fmt(istEin)} · Ø ${fmt(Math.round(avgEin))}/Monat</div>
      ${deltaEin!==null?`<div class="pg-badge ${deltaEin>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px;display:inline-flex">${deltaEin>=0?'↑':'↓'} ${Math.abs(deltaEin)}% ggü. ${prevYr}</div>`:''}
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">Prognose Ausgaben ${yr}</div>
      <div class="sc-val">${fmt(progAus)}</div>
      <div class="sc-sub">Bisher: ${fmt(istAus)} · Ø ${fmt(Math.round(avgAus))}/Monat</div>
    </div>
    <div class="sc ${progGew>=0?'g':'r'}" style="cursor:default">
      <div class="sc-lbl">Prognose Gewinn ${yr}</div>
      <div class="sc-val">${progGew>=0?'+':''}${fmt(progGew)}</div>
      <div class="sc-sub">Vorjahr: ${prevGew>=0?'+':''}${fmt(prevGew)}</div>
      ${deltaGew!==null?`<div class="pg-badge ${deltaGew>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px;display:inline-flex">${deltaGew>=0?'↑':'↓'} ${Math.abs(deltaGew)}%</div>`:''}
    </div>`;

  // ── 2. MONAT FÜR MONAT ──────────────────────────────────────────────────
  document.getElementById('prog-monat').innerHTML=`
    <div class="pg-months">
      ${MS.map((m,i)=>{
        const ein=einM[i],aus=ausM[i],gew=ein-aus;
        const isFuture=i>curM&&yr===now.getFullYear()+'';
        const isCur=i===curM&&yr===now.getFullYear()+'';
        const hasData=ein>0||aus>0;
        const gc=gew>=0?'var(--green)':'var(--red)';
        return `<div class="pg-month${isFuture?' pg-month-future':''}${isCur?' pg-month-cur':''}">
          <div class="pg-month-name">${m}</div>
          <div class="pg-month-body">
            <div class="pg-month-row">
              <span class="pg-month-dot" style="background:var(--green)"></span>
              <span class="pg-month-num pg-month-ein">${ein>0?fmt(Math.round(ein)):'—'}</span>
            </div>
            <div class="pg-month-row">
              <span class="pg-month-dot" style="background:var(--red)"></span>
              <span class="pg-month-num pg-month-aus">${aus>0?fmt(Math.round(aus)):'—'}</span>
            </div>
          </div>
          ${hasData?`<div class="pg-month-gew" style="color:${gc}">${(gew>=0?'+':'')+fmt(Math.round(Math.abs(gew)))}</div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div class="pg-legend">
      <span><span class="pg-legend-dot" style="background:var(--green)"></span>Einnahmen</span>
      <span><span class="pg-legend-dot" style="background:var(--red)"></span>Ausgaben</span>
    </div>`;

  // ── 3. VORJAHRESVERGLEICH ────────────────────────────────────────────────
  const verglEl=document.getElementById('prog-vergleich');
  const hasVorjahr=pe.length>0;
  if(!hasVorjahr){
    verglEl.innerHTML=`<div class="pg-empty"><i class="fas fa-chart-line"></i><span>Keine Daten für ${prevYr}</span></div>`;
  } else {
    const pairs=[
      {lbl:'Einnahmen',cur:istEin,prev:prevEin,col:'var(--green)',icon:'fa-arrow-up'},
      {lbl:'Ausgaben', cur:istAus,prev:prevAus,col:'var(--red)',  icon:'fa-arrow-down'},
      {lbl:'Gewinn',   cur:istEin-istAus,prev:prevEin-prevAus,col:istEin-istAus>=0?'var(--green)':'var(--red)',icon:'fa-wallet'},
    ];
    const bigCards=pairs.map(p=>{
      const d=p.prev!==0?Math.round((p.cur/Math.abs(p.prev)-1)*100):null;
      return `<div class="pg-vj-card">
        <div class="pg-vj-label"><i class="fas ${p.icon}"></i> ${p.lbl}</div>
        <div class="pg-vj-cur" style="color:${p.col}">${p.cur>=0?'':'-'}${fmt(Math.abs(p.cur))}</div>
        <div class="pg-vj-prev">Vorjahr ${prevYr}:&nbsp;<strong>${fmt(p.prev)}</strong></div>
        ${d!==null?`<div class="pg-badge ${d>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px">${d>=0?'↑':'↓'} ${Math.abs(d)}%</div>`:''}
      </div>`;
    }).join('');

    const monthRows=MS.map((m,i)=>{
      const cur=einM[i],prev=einP[i];
      const d=prev>0?Math.round((cur/prev-1)*100):cur>0?100:null;
      const hasAny=cur>0||prev>0;
      return `<div class="pg-vj-row${!hasAny?' pg-vj-row-empty':''}">
        <div class="pg-vj-month">${m}</div>
        <div class="pg-vj-val pg-vj-val-cur">${cur>0?fmt(cur):'—'}</div>
        <div class="pg-vj-val pg-vj-val-prev">${prev>0?fmt(prev):'—'}</div>
        <div class="pg-vj-delta ${d===null?'':d>=0?'pg-badge-up':'pg-badge-down'}">
          ${d!==null?(d>=0?'↑':'↓')+' '+Math.abs(d)+'%':''}
        </div>
      </div>`;
    }).join('');

    verglEl.innerHTML=`
      <div class="pg-vj-cards">${bigCards}</div>
      <div class="pg-vj-table">
        <div class="pg-vj-thead">
          <div class="pg-vj-month">Monat</div>
          <div class="pg-vj-val">${yr}</div>
          <div class="pg-vj-val">${prevYr}</div>
          <div class="pg-vj-delta">Δ</div>
        </div>
        <div class="pg-vj-body">${monthRows}</div>
      </div>`;
  }

  // ── 4. KU-GRENZEN ───────────────────────────────────────────────────────
  const klimit=25000,klimit100=100000;
  const pctProg=Math.min(100,Math.round(progEin/klimit*100));
  const pct100=Math.min(100,Math.round(istEin/klimit100*100));
  const col25=pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)';
  const col100=pct100>80?'var(--red)':pct100>50?'var(--yellow)':'var(--blue)';
  const alertCls=pct100>=100?'pg-alert-red':pctProg>80?'pg-alert-yellow':'pg-alert-green';
  const alertTxt=pct100>=100
    ?'100.000 € überschritten — Regelbesteuerung gilt sofort (§19 Fallbeil-Effekt)'
    :pctProg>80
    ?'Vorjahresgrenze in Sicht — bei Überschreitung 25.000 € entfällt §19 UStG im Folgejahr'
    :'Kleinunternehmer-Status (§19 UStG) voraussichtlich sicher';

  document.getElementById('prog-hochrechnung').innerHTML=`
    <div class="pg-limits">
      <div class="pg-limit">
        <div class="pg-limit-head">
          <div>
            <div class="pg-limit-title">Vorjahresgrenze §19</div>
            <div class="pg-limit-desc">25.000 € netto</div>
          </div>
          <div class="pg-limit-pct" style="color:${col25}">${pctProg}%</div>
        </div>
        <div class="pg-limit-track"><div class="pg-limit-fill" style="width:${pctProg}%;background:${col25}"></div></div>
        <div class="pg-limit-foot">
          <span>Prognose <strong>${fmt(progEin)}</strong></span>
          <span>von 25.000 €</span>
        </div>
      </div>
      <div class="pg-limit">
        <div class="pg-limit-head">
          <div>
            <div class="pg-limit-title">Hard Limit §19</div>
            <div class="pg-limit-desc">100.000 € laufendes Jahr</div>
          </div>
          <div class="pg-limit-pct" style="color:${col100}">${pct100}%</div>
        </div>
        <div class="pg-limit-track"><div class="pg-limit-fill" style="width:${pct100}%;background:${col100}"></div></div>
        <div class="pg-limit-foot">
          <span>Aktuell <strong>${fmt(istEin)}</strong></span>
          <span>von 100.000 €</span>
        </div>
      </div>
    </div>
    <div class="pg-alert ${alertCls}">${alertTxt}</div>
    <div class="pg-note">§19 UStG (ab 01.01.2025): Vorjahresgrenze 25.000 € · laufendes Jahr max. 100.000 € (Fallbeil-Effekt, sofort wirksam)</div>`;
}

// ── KATEGORIEN ───────────────────────────────────────────────────────────
let katTyp='Ausgabe';
const PIE_COLORS=['#3b82f6','#22c55e','#ef4444','#f59e0b','#a855f7','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16','#6366f1','#e11d48'];

function setKatTab(t,btn){
  katTyp=t;
  document.querySelectorAll('#p-kategorien .ftab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderKat();
}
function renderKat(){
  const years=[...new Set(data.eintraege.map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('kat-yr');
  if(!sel.innerHTML) sel.innerHTML='<option value="Alle">Alle Jahre</option>'+years.map(y=>`<option>${y}</option>`).join('');
  const yr=sel.value||'Alle';
  const ye=yr==='Alle'?activeEintraege():activeEintraege().filter(e=>e.datum.startsWith(yr));
  const filtered=ye.filter(e=>e.typ===katTyp);
  const byKat={};
  filtered.forEach(e=>{byKat[e.kategorie]=(byKat[e.kategorie]||0)+e.betrag;});
  const sorted=Object.entries(byKat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);
  const isEin=katTyp==='Einnahme';

  // ── Donut Canvas (адаптивный размер) ─────────────────────────────────────
  const canvas=document.getElementById('kat-canvas');
  const SIZE=220;
  canvas.width=SIZE; canvas.height=SIZE;
  canvas.style.width=SIZE+'px'; canvas.style.height=SIZE+'px';
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,SIZE,SIZE);
  const cx=SIZE/2,cy=SIZE/2,ro=SIZE/2-8,ri=SIZE/2-44;
  let angle=-Math.PI/2;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--s1').trim()||'#fff';

  if(sorted.length){
    // Рисуем сегменты с небольшим gap
    sorted.forEach(([,val],i)=>{
      const slice=(val/total)*2*Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,ro,angle+0.02,angle+slice-0.02);
      ctx.closePath();
      ctx.fillStyle=PIE_COLORS[i%PIE_COLORS.length];
      ctx.fill();
      angle+=slice;
    });
    // Центральное отверстие
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);
    ctx.fillStyle=bg||'#fff';ctx.fill();
    // Текст по центру
    ctx.fillStyle='var(--text)';
    ctx.font='bold 13px Inter, sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#64748b';
    ctx.font='11px Inter';
    ctx.fillText(isEin?'Einnahmen':'Ausgaben',cx,cy-10);
    ctx.fillStyle='#1a2332';
    ctx.font='bold 14px Inter';
    ctx.fillText(fmt(total),cx,cy+8);
  } else {
    ctx.beginPath();ctx.arc(cx,cy,ro,0,2*Math.PI);ctx.fillStyle='#f1f5f9';ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle=bg||'#fff';ctx.fill();
    ctx.fillStyle='#94a3b8';ctx.font='12px Inter';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Keine Daten',cx,cy);
  }

  // ── Summary Stats ─────────────────────────────────────────────────────────
  const katStats = document.getElementById('kat-stats');
  if(katStats){
    const top3=sorted.slice(0,3);
    const top3sum=top3.reduce((s,[,v])=>s+v,0);
    const restPct=total>0?Math.round((total-top3sum)/total*100):0;
    katStats.innerHTML=`
      <div class="kat-stat-card">
        <div class="kat-stat-label">Gesamt</div>
        <div class="kat-stat-val" style="color:${isEin?'var(--green)':'var(--red)'}">${fmt(total)}</div>
        <div class="kat-stat-sub">${sorted.length} Kategorien</div>
      </div>
      <div class="kat-stat-card">
        <div class="kat-stat-label">Top 1</div>
        <div class="kat-stat-val">${sorted[0]?fmt(sorted[0][1]):'—'}</div>
        <div class="kat-stat-sub">${sorted[0]?sorted[0][0]:'—'}</div>
      </div>
      <div class="kat-stat-card">
        <div class="kat-stat-label">Ø pro Kategorie</div>
        <div class="kat-stat-val">${sorted.length?fmt(Math.round(total/sorted.length)):'—'}</div>
        <div class="kat-stat-sub">Durchschnitt</div>
      </div>`;
  }

  // ── Категории — плитки в стиле Канва ─────────────────────────────────────
  const katGrid = document.getElementById('kat-grid');
  if(katGrid){
    if(!sorted.length){
      katGrid.innerHTML='<div style="padding:40px;text-align:center;color:var(--sub);grid-column:1/-1">Keine Daten für diesen Zeitraum</div>';
    } else {
      katGrid.innerHTML = sorted.map(([k,v],i)=>{
        const pct=total>0?Math.round(v/total*100):0;
        const pctOfTop=Math.round(v/sorted[0][1]*100);
        const color=PIE_COLORS[i%PIE_COLORS.length];
        return `<div class="kat-tile" onclick="this.classList.toggle('kat-tile-active')">
          <div class="kat-tile-top">
            <div class="kat-tile-dot" style="background:${color}"></div>
            <div class="kat-tile-name">${k}</div>
            <div class="kat-tile-pct">${pct}%</div>
          </div>
          <div class="kat-tile-val" style="color:${isEin?'var(--green)':'var(--red)'}">${fmt(v)}</div>
          <div class="kat-tile-bar">
            <div class="kat-tile-bar-fill" style="width:${pctOfTop}%;background:${color}"></div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

