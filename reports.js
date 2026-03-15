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

  // ── 1. HERO-КАРТОЧКИ ПРОГНОЗА ─────────────────────────────────────────
  const deltaEin = prevEin>0 ? Math.round((progEin/prevEin-1)*100) : null;
  const deltaGew = prevGew!==0 ? Math.round((progGew/Math.abs(prevGew)-1)*100) : null;

  document.getElementById('prog-cards').innerHTML = `
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Prognose Einnahmen ${yr}</div>
      <div class="sc-val">${fmt(progEin)}</div>
      <div class="sc-sub">Aktuell: ${fmt(istEin)} · Ø ${fmt(Math.round(avgEin))}/Monat</div>
      ${deltaEin!==null?`<div class="prog-hero-delta ${deltaEin>=0?'delta-up':'delta-down'}" style="margin-top:8px">${deltaEin>=0?'▲':'▼'} ${Math.abs(deltaEin)}% ggü. ${prevYr}</div>`:''}
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">Prognose Ausgaben ${yr}</div>
      <div class="sc-val">${fmt(progAus)}</div>
      <div class="sc-sub">Aktuell: ${fmt(istAus)} · Ø ${fmt(Math.round(avgAus))}/Monat</div>
    </div>
    <div class="sc ${progGew>=0?'g':'r'}" style="cursor:default">
      <div class="sc-lbl">Prognose Gewinn ${yr}</div>
      <div class="sc-val">${progGew>=0?'+':''}${fmt(progGew)}</div>
      <div class="sc-sub">Vorjahr: ${prevGew>=0?'+':''}${fmt(prevGew)}</div>
      ${deltaGew!==null?`<div class="prog-hero-delta ${deltaGew>=0?'delta-up':'delta-down'}" style="margin-top:8px">${deltaGew>=0?'▲':'▼'} ${Math.abs(deltaGew)}% ggü. ${prevYr}</div>`:''}
    </div>`;

  // ── 2. МЕСЯЦЫ — горизонтальный ряд ───────────────────────────────────
  const maxEin=Math.max(...einM,1), maxAus=Math.max(...ausM,1);
  document.getElementById('prog-monat').innerHTML = `
    <div class="prog-months-row">
      ${MS.map((m,i)=>{
        const ein=einM[i],aus=ausM[i],gew=ein-aus;
        const isFuture=i>curM&&yr===now.getFullYear()+'';
        const isCur=i===curM&&yr===now.getFullYear()+'';
        const gc=gew>=0?'var(--green)':'var(--red)';
        const hasData=ein>0||aus>0;
        return `<div class="pmth${isFuture?' pmth-future':''}${isCur?' pmth-cur':''}">
          <div class="pmth-name">${m}</div>
          ${hasData?`
            <div class="pmth-ein">${fmt(Math.round(ein))}</div>
            <div class="pmth-aus">${fmt(Math.round(aus))}</div>
            <div class="pmth-gew" style="color:${gc}">${(gew>=0?'+':'')+fmt(Math.round(Math.abs(gew)))}</div>
          `:`<div class="pmth-empty">—</div>`}
        </div>`;
      }).join('')}
    </div>
    <div class="prog-months-legend" style="margin-top:12px">
      <span><span class="prog-legend-dot" style="background:var(--green)"></span>Einnahmen</span>
      <span><span class="prog-legend-dot" style="background:var(--red)"></span>Ausgaben</span>
      <span><span class="prog-legend-dot" style="background:var(--blue)"></span>Gewinn/Verlust</span>
    </div>`;

  // ── 3. VORJAHRESVERGLEICH ─────────────────────────────────────────────
  const hasVorjahr=pe.length>0;
  const verglEl=document.getElementById('prog-vergleich');
  if(!hasVorjahr){
    verglEl.innerHTML=`<div class="prog-no-data"><i class="fas fa-database"></i><span>Keine Daten für ${prevYr}</span></div>`;
  } else {
    const pairs=[
      {lbl:'Einnahmen', cur:istEin, prev:prevEin, col:'var(--green)'},
      {lbl:'Ausgaben',  cur:istAus, prev:prevAus, col:'var(--red)'},
      {lbl:'Gewinn',    cur:istEin-istAus, prev:prevEin-prevAus, col:istEin-istAus>=0?'var(--green)':'var(--red)'},
    ];
    const bigCards = pairs.map(p=>{
      const d=p.prev!==0?Math.round((p.cur/Math.abs(p.prev)-1)*100):null;
      return `<div class="prog-vj-card">
        <div class="prog-vj-label">${p.lbl}</div>
        <div class="prog-vj-cur" style="color:${p.col}">${p.cur>=0?'':'-'}${fmt(Math.abs(p.cur))}</div>
        <div class="prog-vj-prev">Vorjahr ${prevYr}: ${fmt(p.prev)}</div>
        ${d!==null?`<div class="prog-vj-delta ${d>=0?'delta-up':'delta-down'}">${d>=0?'▲':'▼'} ${Math.abs(d)}%</div>`:''}
      </div>`;
    }).join('');

    // Таблица месяцев — без баров, читаемые цифры
    const monthRows = MS.map((m,i)=>{
      const cur=einM[i], prev=einP[i];
      const d=prev>0?Math.round((cur/prev-1)*100):cur>0?100:null;
      const hasAny=cur>0||prev>0;
      return `<div class="pvj-row${!hasAny?' pvj-row-empty':''}">
        <div class="pvj-month">${m}</div>
        <div class="pvj-cur">${cur>0?fmt(cur):'—'}</div>
        <div class="pvj-prev">${prev>0?fmt(prev):'—'}</div>
        <div class="pvj-delta ${d===null?'pvj-delta-na':d>=0?'delta-up':'delta-down'}">
          ${d!==null?(d>=0?'+':'')+d+'%':''}
        </div>
      </div>`;
    }).join('');

    verglEl.innerHTML = `
      <div class="prog-vj-big">${bigCards}</div>
      <div class="pvj-table">
        <div class="pvj-header">
          <div class="pvj-month">Monat</div>
          <div class="pvj-cur">${yr}</div>
          <div class="pvj-prev">${prevYr}</div>
          <div class="pvj-delta">Δ</div>
        </div>
        ${monthRows}
      </div>`;
  }

  // ── 4. HOCHRECHNUNG / KU-LIMITE ──────────────────────────────────────
  const klimit=25000, klimit100=100000;
  const pctProg=Math.min(100,Math.round(progEin/klimit*100));
  const pct100=Math.min(100,Math.round(istEin/klimit100*100));
  const col25=pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)';
  const col100=pct100>80?'var(--red)':pct100>50?'var(--yellow)':'var(--blue)';

  const statusMsg = pct100>=100
    ? `<div class="prog-alert prog-alert-red"><i class="fas fa-exclamation-triangle"></i> <strong>100.000 € überschritten!</strong> Regelbesteuerung gilt sofort — USt-Pflicht! (§19 Fallbeil-Effekt)</div>`
    : pctProg>80
    ? `<div class="prog-alert prog-alert-yellow"><i class="fas fa-exclamation-circle"></i> Vorjahresgrenze in Sicht — bei Überschreitung 25.000 € entfällt §19 UStG im Folgejahr</div>`
    : `<div class="prog-alert prog-alert-green"><i class="fas fa-check-circle"></i> Kleinunternehmer-Status (§19 UStG) voraussichtlich sicher</div>`;

  document.getElementById('prog-hochrechnung').innerHTML = `
    <div class="prog-limit-grid">
      <div class="prog-limit-card">
        <div class="prog-limit-header">
          <div>
            <div class="prog-limit-title">Vorjahresgrenze §19</div>
            <div class="prog-limit-desc">25.000 € — Vorjahresumsatz netto</div>
          </div>
          <div class="prog-limit-pct" style="color:${col25}">${pctProg}%</div>
        </div>
        <div class="prog-limit-bar-track">
          <div class="prog-limit-bar-fill" style="width:${pctProg}%;background:${col25}"></div>
        </div>
        <div class="prog-limit-footer">
          <span>Prognose: <strong>${fmt(progEin)}</strong></span>
          <span style="color:var(--sub)">von 25.000 €</span>
        </div>
      </div>
      <div class="prog-limit-card">
        <div class="prog-limit-header">
          <div>
            <div class="prog-limit-title">HARD LIMIT §19</div>
            <div class="prog-limit-desc">100.000 € — laufendes Jahr (Fallbeil!)</div>
          </div>
          <div class="prog-limit-pct" style="color:${col100}">${pct100}%</div>
        </div>
        <div class="prog-limit-bar-track">
          <div class="prog-limit-bar-fill" style="width:${pct100}%;background:${col100}"></div>
        </div>
        <div class="prog-limit-footer">
          <span>Aktuell: <strong>${fmt(istEin)}</strong></span>
          <span style="color:var(--sub)">von 100.000 €</span>
        </div>
      </div>
    </div>
    ${statusMsg}
    <div class="prog-limit-note">ab 01.01.2025 (JStG 2024): Vorjahresgrenze 25.000 € + laufendes Jahr max. 100.000 € (sofort wirksam bei Überschreitung)</div>`;
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

