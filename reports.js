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
  const avgEin=curM>=0?istEin/(curM+1):0, avgAus=curM>=0?istAus/(curM+1):0;
  const progEin=Math.round((istEin+avgEin*(11-curM))*100)/100;
  const progAus=Math.round((istAus+avgAus*(11-curM))*100)/100;
  const prevEin=einP.reduce((s,v)=>s+v,0), prevAus=ausP.reduce((s,v)=>s+v,0);
  const delta=e=>prevEin>0?Math.round((e/prevEin-1)*100):0;

  // Cards
  const c=(cls,lbl,val,sub)=>`<div class="sc ${cls}" style="cursor:default"><div class="sc-lbl">${lbl}</div><div class="sc-val">${val}</div><div class="sc-sub">${sub}</div></div>`;
  document.getElementById('prog-cards').innerHTML=
    c('b','Ist Einnahmen',fmt(istEin),`${curM+1} Monate`)+
    c('g','Prognose Einnahmen Jahr',fmt(progEin),`Hochrechnung bis Dez.`)+
    c('r','Prognose Ausgaben Jahr',fmt(progAus),`Ø ${fmt(avgAus)}/Monat`)+
    c(progEin-progAus>=0?'g':'r','Progn. Gewinn',fmt(progEin-progAus),`vs. Vorjahr: ${fmt(prevEin-prevAus)}`);

  // Monat für Monat
  document.getElementById('prog-monat').innerHTML=MS.map((m,i)=>{
    const ein=einM[i],aus=ausM[i],gew=ein-aus;
    const isFuture=i>curM&&yr===now.getFullYear()+'';
    const gc=gew>=0?'var(--green)':'var(--red)';
    return`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);${isFuture?'opacity:.45':''}">
      <span style="font-size:11px;color:var(--sub);width:28px;font-family:var(--mono)">${m}</span>
      <div style="flex:1">
        <div class="prog-bar-wrap" style="margin-bottom:4px">
          <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${ein>0?Math.min(100,Math.round(ein/(Math.max(...einM,1))*100)):0}%;background:var(--green)"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:var(--green);width:90px;text-align:right">${ein>0?fmt(ein):'—'}</span>
        </div>
        <div class="prog-bar-wrap" style="margin-bottom:0">
          <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${aus>0?Math.min(100,Math.round(aus/(Math.max(...ausM,1))*100)):0}%;background:var(--red)"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:var(--red);width:90px;text-align:right">${aus>0?fmt(aus):'—'}</span>
        </div>
      </div>
      <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${gc};width:90px;text-align:right">${ein||aus?(gew>=0?'+':'')+fmt(gew):'—'}</span>
    </div>`;
  }).join('');

  // Vorjahresvergleich
  const hasVorjahr=pe.length>0;
  if(!hasVorjahr){
    document.getElementById('prog-vergleich').innerHTML='<p style="color:var(--sub);font-size:12px">'+t('Keine Vorjahresdaten für ')+prevYr+t(' vorhanden.')+'</p>';
  } else {
    document.getElementById('prog-vergleich').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        ${[['Einnahmen',istEin,prevEin,'var(--green)'],['Ausgaben',istAus,prevAus,'var(--red)']].map(([lbl,cur,prev,col])=>{
          const d=prev>0?Math.round((cur/prev-1)*100):0;
          return`<div style="background:var(--s2);border-radius:var(--r);padding:12px">
            <div style="font-size:10px;color:var(--sub);margin-bottom:5px">${lbl}</div>
            <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:${col}">${fmt(cur)}</div>
            <div style="font-size:10px;color:var(--sub);margin-top:3px">${t('Vj:')} ${fmt(prev)}</div>
            <div style="font-size:11px;font-weight:600;margin-top:4px;color:${d>=0?'var(--green)':'var(--red)'}">${d>=0?'+':''}${d}% ${t('ggü.')} ${prevYr}</div>
          </div>`;
        }).join('')}
      </div>
      ${MS.map((m,i)=>{
        const dE=einP[i]>0?Math.round((einM[i]/einP[i]-1)*100):einM[i]>0?100:0;
        return`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">
          <span style="color:var(--sub);width:28px;font-family:var(--mono)">${m}</span>
          <span style="font-family:var(--mono);width:80px">${einM[i]>0?fmt(einM[i]):'—'}</span>
          <span style="color:var(--sub);width:80px;font-size:10px">${t('Vj:')} ${einP[i]>0?fmt(einP[i]):'—'}</span>
          <span style="font-weight:600;color:${dE>=0?'var(--green)':'var(--red)'}">${einM[i]||einP[i]?(dE>=0?'+':'')+dE+'%':'—'}</span>
        </div>`;
      }).join('')}`;
  }

  // Hochrechnung
  const klimit=25000;   // Vorjahres-Grenze (§19 UStG ab 2025)
  const klimit100=100000; // Laufendes Jahr HARD LIMIT (§19 UStG ab 2025)
  const pctNow=Math.min(100,Math.round(istEin/klimit*100));
  const pctProg=Math.min(100,Math.round(progEin/klimit*100));
  const pct100=Math.min(100,Math.round(istEin/klimit100*100));
  document.getElementById('prog-hochrechnung').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">Progn. Jahreseinnahmen</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:var(--green)">${fmt(progEin)}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">Progn. Jahresgewinn</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:${progEin-progAus>=0?'var(--green)':'var(--red)'}">${fmt(progEin-progAus)}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">KU-Vorjahresgrenze</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:${pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)'}">${pctProg}%</div>
        <div style="font-size:10px;color:var(--sub);margin-top:3px">${fmt(progEin)} von 25.000 € (§19)</div>
      </div>
    </div>
    <div style="margin-bottom:4px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between">
      <span>${t('📊 Vorjahresgrenze-Prognose (25.000 €)')}</span><span style="font-family:var(--mono)">${pctProg}%</span>
    </div>
    <div style="height:10px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:12px">
      <div style="height:100%;width:${pctProg}%;background:${pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)'};border-radius:6px;transition:width .6s"></div>
    </div>
    <div style="margin-bottom:4px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between">
      <span>${t('⚡ Laufendes Jahr — HARD LIMIT (100.000 €) Fallbeil-Effekt!')}</span><span style="font-family:var(--mono)">${pct100}%</span>
    </div>
    <div style="height:10px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:10px">
      <div style="height:100%;width:${pct100}%;background:${pct100>80?'var(--red)':pct100>50?'var(--yellow)':'var(--blue)'};border-radius:6px;transition:width .6s"></div>
    </div>
    ${pct100>=100?`<div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:10px;font-size:12px;color:var(--red)">🚨 <strong>100.000 € überschritten!</strong> Ab diesem Moment gilt Regelbesteuerung — sofortige USt-Pflicht! (§19 UStG Fallbeil-Effekt)</div>`
    :pctProg>80?`<div style="color:var(--yellow);font-size:12px">${t('⚠️ Vorjahresgrenze in Sicht — bei Überschreitung 25.000 € entfällt §19 UStG im Folgejahr!')}</div>`
    :'<div style="color:var(--green);font-size:12px">✅ Kleinunternehmer-Status (§19 UStG) voraussichtlich sicher</div>'}
    <div style="margin-top:10px;font-size:10px;color:var(--sub);background:var(--s3);padding:8px 10px;border-radius:var(--r);border:1px solid var(--border)">
      ${t('ℹ️ Neu ab 01.01.2025 (JStG 2024): Vorjahresgrenze 25.000 € (netto) + laufendes Jahr max. 100.000 € (harte Grenze, sofort wirksam bei Überschreitung).')}
    </div>`;
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

  // Canvas donut
  const canvas=document.getElementById('kat-canvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,264,264);
  const cx=132,cy=132,ro=120,ri=70;
  let angle=-Math.PI/2;
  if(sorted.length){
    sorted.forEach(([,val],i)=>{
      const slice=(val/total)*2*Math.PI;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,ro,angle,angle+slice);
      ctx.closePath();ctx.fillStyle=PIE_COLORS[i%PIE_COLORS.length];ctx.fill();
      angle+=slice;
    });
    // hole
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle='#1a1e28';ctx.fill();
    // center text
    ctx.fillStyle='#f1f5f9';ctx.font='bold 14px Inter';ctx.textAlign='center';
    ctx.fillText(fmt(total),cx,cy+5);
  } else {
    ctx.beginPath();ctx.arc(cx,cy,ro,0,2*Math.PI);ctx.fillStyle='#2c3147';ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle='#1a1e28';ctx.fill();
    ctx.fillStyle='#64748b';ctx.font='13px Inter';ctx.textAlign='center';ctx.fillText('Keine Daten',cx,cy+5);
  }

  // Legend
  document.getElementById('kat-legend').innerHTML=sorted.slice(0,8).map(([k,v],i)=>`
    <div class="donut-leg-item">
      <div class="donut-dot" style="background:${PIE_COLORS[i%PIE_COLORS.length]}"></div>
      <span style="flex:1;color:var(--sub);font-size:14px">${k}</span>
      <span style="font-family:var(--mono);font-size:14px">${Math.round(v/total*100)}%</span>
    </div>`).join('');

  // Table
  document.getElementById('kat-tbody').innerHTML=sorted.length?sorted.map(([k,v],i)=>`
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 14px;display:flex;align-items:center;gap:8px">
        <div style="width:10px;height:10px;border-radius:2px;background:${PIE_COLORS[i%PIE_COLORS.length]};flex-shrink:0"></div>
        ${k}
      </td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:${katTyp==='Einnahme'?'var(--green)':'var(--red)'}">${fmt(v)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--sub)">${Math.round(v/total*100)}%</td>
      <td style="padding:10px 14px">
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;min-width:50%">
          <div style="height:100%;width:${Math.round(v/sorted[0][1]*100)}%;background:${PIE_COLORS[i%PIE_COLORS.length]};border-radius:3px"></div>
        </div>
      </td>
    </tr>`).join('')
    :'<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--sub)">Keine Daten</td></tr>';
}

