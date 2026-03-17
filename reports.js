// ── PROGNOSE ─────────────────────────────────────────────────────────────
function renderProg(){
  const years=[...new Set((data.eintraege||[]).filter(e=>e.datum).map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('prog-yr');
  if(!sel.innerHTML||!sel.value){
    sel.innerHTML=years.map((y,i)=>`<option${i===0?' selected':''}>${y}</option>`).join('');
  }
  const yr=sel.value||new Date().getFullYear()+'';
  const prevYr=String(parseInt(yr)-1);
  const now=new Date(); const curM=yr===now.getFullYear()+''?now.getMonth():11;
  const ye=activeEintraegeMitRech(yr);
  const pe=activeEintraegeMitRech(prevYr);

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
      ${deltaEin!==null?`<div class="pg-badge ${deltaEin>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px;display:inline-flex">${deltaEin>=0?'+':''}${deltaEin}% ggü. ${prevYr}</div>`:''}
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
      ${deltaGew!==null?`<div class="pg-badge ${deltaGew>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px;display:inline-flex">${deltaGew>=0?'+':''}${deltaGew}%</div>`:''}
    </div>`;

  // ── 2. VORJAHRESVERGLEICH ────────────────────────────────────────────────
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
        ${d!==null?`<div class="pg-badge ${d>=0?'pg-badge-up':'pg-badge-down'}" style="margin-top:8px">${d>=0?'+':''+ d}%</div>`:''}
      </div>`;
    }).join('');

    const maxVal=Math.max(...einM,...einP,1);
    const monthCards=MS.map((m,i)=>{
      const cur=einM[i], prev=einP[i];
      const diff=cur-prev;
      const d=prev>0?Math.round((cur/prev-1)*100):null;
      const hasAny=cur>0||prev>0;
      const curPct=Math.round(cur/maxVal*100);
      const prevPct=Math.round(prev/maxVal*100);
      const isCurMonth=i===curM&&yr===now.getFullYear()+'';
      const isFuture=i>curM&&yr===now.getFullYear()+'';

      // Цвет и знак дельты
      const dColor=d===null?'var(--sub)':d>0?'var(--green)':'var(--red)';
      const dSign=d===null?'':d>=0?'+':'';
      const dTxt=d!==null?`${dSign}${d}%`:'';

      return `<div class="vjm${!hasAny?' vjm-empty':''}${isCurMonth?' vjm-cur':''}${isFuture?' vjm-future':''}">
        <div class="vjm-name">${m}</div>
        <div class="vjm-body">
          <div class="vjm-row">
            <div class="vjm-bar-wrap">
              <div class="vjm-bar vjm-bar-cur" style="width:${curPct}%"></div>
            </div>
            <span class="vjm-val vjm-val-cur">${cur>0?fmt(Math.round(cur)):'—'}</span>
          </div>
          <div class="vjm-row">
            <div class="vjm-bar-wrap">
              <div class="vjm-bar vjm-bar-prev" style="width:${prevPct}%"></div>
            </div>
            <span class="vjm-val vjm-val-prev">${prev>0?fmt(Math.round(prev)):'—'}</span>
          </div>
        </div>
        ${hasAny&&d!==null?`<div class="vjm-delta" style="color:${dColor}">${dTxt}</div>`:'<div class="vjm-delta"></div>'}
      </div>`;
    }).join('');

    // Легенда
    const legend=`<div class="vjm-legend">
      <span><span class="vjm-dot vjm-dot-cur"></span>${yr}</span>
      <span><span class="vjm-dot vjm-dot-prev"></span>${prevYr}</span>
      <span style="font-size:11px;color:var(--sub)">Δ = Veränderung ggü. Vorjahr</span>
    </div>`;

    verglEl.innerHTML=`
      <div class="pg-vj-cards">${bigCards}</div>
      ${legend}
      <div class="vjm-grid">${monthCards}</div>`;
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
  document.querySelectorAll('[id^="kat-tab-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._katSel=null;
  renderKat();
}
function renderKat(){
  // ── данные ────────────────────────────────────────────────────────────────
  const years=[...new Set((data.eintraege||[]).filter(e=>e.datum).map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('kat-yr');
  if(!sel.innerHTML) sel.innerHTML='<option value="Alle">Alle Jahre</option>'+years.map(y=>`<option>${y}</option>`).join('');
  const yr=sel.value||'Alle';
  const ye=activeEintraegeMitRech(yr==='Alle'?null:yr);
  const filtered=ye.filter(e=>e.typ===katTyp);
  const byKat={};
  filtered.forEach(e=>{byKat[e.kategorie]=(byKat[e.kategorie]||0)+e.betrag;});
  const sorted=Object.entries(byKat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);
  const isEin=katTyp==='Einnahme';

  // ── сброс состояния выделения ─────────────────────────────────────────────
  window._katSel=null; // null = всё активно

  // ── SVG Donut ─────────────────────────────────────────────────────────────
  const donutWrap=document.getElementById('kat-donut-wrap');
  if(donutWrap){
    const R=90, ri=54, CX=110, CY=110, SZ=220;
    const CIRC=2*Math.PI*R;
    const GAP=sorted.length>1?2.5:0; // gap только если несколько сегментов

    if(!sorted.length){
      donutWrap.innerHTML=`<svg width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${R-ri}"/>
        <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="middle"
          font-size="12" fill="var(--sub)" font-family="Inter,sans-serif">Keine Daten</text>
      </svg>`;
    } else {
      // Правильная математика:
      // Каждый сегмент — отдельный <circle> с dasharray=[segLen, CIRC]
      // dashoffset смещает начало дуги: offset в единицах circumference
      // Начальная точка (12 часов) = rotate(-90) на SVG
      let angleAcc=0;
      const segs=sorted.map(([k,val],i)=>{
        const frac=val/total;
        const segLen=Math.max(frac*CIRC-GAP, 0.1);
        const offset=angleAcc; // накопленный сдвиг
        angleAcc+=frac*CIRC;
        return {k,val,i,frac,segLen,offset,
          color:PIE_COLORS[i%PIE_COLORS.length],
          pct:Math.round(frac*100)};
      });

      // Рисуем круги: каждый показывает свой кусок через dasharray + dashoffset
      // dasharray = [len, CIRC] — показываем len, прячем остаток
      // dashoffset = -offset — сдвигаем начало дуги
      const paths=segs.map(s=>`<circle
        cx="${CX}" cy="${CY}" r="${R}"
        fill="none" stroke="${s.color}" stroke-width="${R-ri}"
        stroke-dasharray="${s.segLen} ${CIRC}"
        stroke-dashoffset="${-s.offset}"
        transform="rotate(-90 ${CX} ${CY})"
        class="kat-seg" data-idx="${s.i}"
        data-name="${s.k.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}"
        data-val="${fmt(s.val)}" data-pct="${s.pct}%"
        style="opacity:1;cursor:pointer"
      />`).join('');

      donutWrap.innerHTML=`<svg width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}" class="kat-svg">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${R-ri}"/>
        ${paths}
        <circle cx="${CX}" cy="${CY}" r="${ri-2}" fill="var(--s1)" style="pointer-events:none"/>
        <text x="${CX}" y="${CY-10}" text-anchor="middle" dominant-baseline="middle"
          font-size="10" fill="var(--sub)" font-family="Inter,sans-serif" font-weight="600"
          style="pointer-events:none">${isEin?'EINNAHMEN':'AUSGABEN'}</text>
        <text id="kat-cv" x="${CX}" y="${CY+8}" text-anchor="middle" dominant-baseline="middle"
          font-size="15" fill="var(--text)" font-family="JetBrains Mono,monospace" font-weight="700"
          style="pointer-events:none">${fmt(total)}</text>
        <text id="kat-cs" x="${CX}" y="${CY+26}" text-anchor="middle" dominant-baseline="middle"
          font-size="10" fill="var(--sub)" font-family="Inter,sans-serif"
          style="pointer-events:none">${sorted.length} Kategorien</text>
      </svg>`;

      // ── Анимация: плавный dashoffset от 0 к финальному значению ───────────
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const circles=[...donutWrap.querySelectorAll('.kat-seg')];
        // Сохраняем финальные значения и ставим начальное = скрыто
        const finals=circles.map(c=>{
          const segIdx=parseInt(c.dataset.idx);
          const s=segs[segIdx];
          const finalOffset=-s.offset;
          // Начинаем с полностью "намотанного" — сегмент не виден
          c.style.strokeDashoffset=2*Math.PI*90;
          return finalOffset;
        });
        const DUR=700, T0=performance.now();
        const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
        (function tick(now){
          const t=ease(Math.min((now-T0)/DUR,1));
          circles.forEach((c,ci)=>{
            const start=2*Math.PI*90;
            c.style.strokeDashoffset=start+(finals[ci]-start)*t;
          });
          if(t<1){
            requestAnimationFrame(tick);
          } else {
            // Анимация завершена — вешаем события
            circles.forEach(c=>{
              c.onmouseenter=()=>_katHL(parseInt(c.dataset.idx),c.dataset.name,c.dataset.val,c.dataset.pct,segs,total,sorted.length);
              c.onmouseleave=()=>_katReset(segs,total,sorted.length);
              c.onclick=()=>_katClick(parseInt(c.dataset.idx),segs,total,sorted.length);
            });
          }
        })(performance.now());
      }));
    }
  }

  // ── Stats карточки ────────────────────────────────────────────────────────
  const katStats=document.getElementById('kat-stats');
  if(katStats) katStats.innerHTML=`
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
      <div class="kat-stat-label">Ø Kategorie</div>
      <div class="kat-stat-val">${sorted.length?fmt(Math.round(total/sorted.length)):'—'}</div>
      <div class="kat-stat-sub">Durchschnitt</div>
    </div>`;

  // ── Плитки ────────────────────────────────────────────────────────────────
  const katGrid=document.getElementById('kat-grid');
  if(katGrid){
    if(!sorted.length){
      katGrid.innerHTML='<div style="padding:40px;text-align:center;color:var(--sub);grid-column:1/-1">Keine Daten</div>';
    } else {
      // Строим segs для плиток (нужен тот же массив что и для SVG)
      let angleAcc2=0;
      const tilesSegs=sorted.map(([k,v],i)=>{
        const frac=v/total;
        const s={k,v,i,frac,segLen:Math.max(frac*(2*Math.PI*90)-2.5,0.1),
          offset:angleAcc2, color:PIE_COLORS[i%PIE_COLORS.length], pct:Math.round(frac*100)};
        angleAcc2+=frac*(2*Math.PI*90);
        return s;
      });

      katGrid.innerHTML=sorted.map(([k,v],i)=>{
        const pct=Math.round(v/total*100);
        const bar=Math.round(v/sorted[0][1]*100);
        const color=PIE_COLORS[i%PIE_COLORS.length];
        return `<div class="kat-tile" data-katidx="${i}" data-rawval="${v}"
          onmouseenter="_katHL(${i},'${k.replace(/'/g,"\'")}','${fmt(v)}','${pct}%',null,${total},${sorted.length})"
          onmouseleave="_katReset(null,${total},${sorted.length})"
          onclick="_katClick(${i},null,${total},${sorted.length})">
          <div class="kat-tile-top">
            <div class="kat-tile-dot" style="background:${color}"></div>
            <div class="kat-tile-name">${k}</div>
            <div class="kat-tile-pct">${pct}%</div>
          </div>
          <div class="kat-tile-val" style="color:${isEin?'var(--green)':'var(--red)'}">${fmt(v)}</div>
          <div class="kat-tile-bar"><div class="kat-tile-bar-fill" style="width:${bar}%;background:${color}"></div></div>
        </div>`;
      }).join('');
    }
  }
}

// ── Highlight / Reset / Toggle ─────────────────────────────────────────────
window._katSel=null; // Set выбранных idx, null = все

function _katSetCenter(txt, sub){
  const cv=document.getElementById('kat-cv');
  const cs=document.getElementById('kat-cs');
  if(cv) cv.textContent=txt;
  if(cs) cs.textContent=sub;
}

function _katHL(idx, name, val, pct, segs, total, count){
  _katSetCenter(val, name+' · '+pct);
  document.querySelectorAll('.kat-seg').forEach((c,i)=>{
    c.style.opacity= i===idx ? '1' : '0.2';
  });
  document.querySelectorAll('.kat-tile').forEach((t,i)=>{
    t.style.opacity= i===idx ? '1' : '0.4';
  });
}

function _katReset(segs, total, count){
  const sel=window._katSel;
  if(sel){
    let selSum=0;
    document.querySelectorAll('.kat-tile').forEach((t,i)=>{
      if(sel.has(i)) selSum+=parseFloat(t.dataset.rawval)||0;
    });
    _katSetCenter(fmt(selSum), sel.size+' ausgewählt');
  } else {
    _katSetCenter(fmt(total), count+' Kategorien');
  }
  document.querySelectorAll('.kat-seg').forEach((c,i)=>{
    c.style.opacity= (!sel||sel.has(i)) ? '1' : '0.2';
  });
  document.querySelectorAll('.kat-tile').forEach((t,i)=>{
    t.classList.toggle('kat-tile-active', !!sel&&sel.has(i));
    t.style.opacity= (!sel||sel.has(i)) ? '1' : '0.45';
  });
}

function _katClick(idx, segs, total, count){
  if(!window._katSel){
    window._katSel=new Set([idx]);
  } else if(window._katSel.has(idx)){
    window._katSel.delete(idx);
    if(window._katSel.size===0) window._katSel=null;
  } else {
    window._katSel.add(idx);
  }
  _katReset(segs, total, count);
}
