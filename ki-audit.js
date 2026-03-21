// ── KI-AUDIT mit Google Gemini API ────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

function initKiAudit() {
  const sel = document.getElementById('audit-jahr');
  if (!sel) return;
  const years = [...new Set((data.eintraege||[]).map(e=>e.datum?.substring(0,4)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="alle">Alle Jahre</option>' +
    years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

async function startKiAudit() {
  const btn          = document.getElementById('audit-start-btn');
  const progress     = document.getElementById('audit-progress');
  const result       = document.getElementById('audit-result');
  const progressBar  = document.getElementById('audit-progress-bar');
  const progressText = document.getElementById('audit-progress-text');
  const progressStep = document.getElementById('audit-progress-step');

  const checks = {
    eintraege:    document.getElementById('ac-eintraege')?.checked,
    rechnungen:   document.getElementById('ac-rechnungen')?.checked,
    ust:          document.getElementById('ac-ust')?.checked,
    wiederkehrend:document.getElementById('ac-wiederkehrend')?.checked,
    kunden:       document.getElementById('ac-kunden')?.checked,
    fahrtenbuch:  document.getElementById('ac-fahrtenbuch')?.checked,
  };

  const types = {
    fehler:      document.getElementById('at-fehler')?.checked,
    steuer:      document.getElementById('at-steuer')?.checked,
    optimierung: document.getElementById('at-optimierung')?.checked,
    cashflow:    document.getElementById('at-cashflow')?.checked,
    compliance:  document.getElementById('at-compliance')?.checked,
    benchmark:   document.getElementById('at-benchmark')?.checked,
  };

  if (!Object.values(checks).some(Boolean)) return toast('Bitte mindestens einen Bereich auswählen!','err');
  if (!Object.values(types).some(Boolean))  return toast('Bitte mindestens eine Analyse-Art auswählen!','err');

  const jahr = document.getElementById('audit-jahr')?.value || 'alle';

  btn.disabled = true; btn.style.opacity = '.6';
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse läuft...';
  progress.style.display = 'block';
  result.style.display = 'none'; result.innerHTML = '';

  const setP = (pct, text, step='') => {
    progressBar.style.width = pct+'%';
    progressText.textContent = text;
    progressStep.textContent = step;
  };

  setP(10,'Daten werden vorbereitet...','Buchhaltungsdaten laden');

  const filterY = arr => jahr==='alle' ? arr : arr.filter(e=>(e.datum||'').startsWith(jahr));
  const r2 = v => Math.round(v*100)/100;
  const auditData = {};

  if (checks.eintraege) {
    const ein = filterY(data.eintraege||[]);
    const einSum = ein.filter(e=>e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
    const ausSum = ein.filter(e=>e.typ==='Ausgabe').reduce((s,e)=>s+e.betrag,0);
    const katMap = {}; ein.forEach(e=>{ katMap[e.kategorie]=(katMap[e.kategorie]||0)+e.betrag; });
    auditData.eintraege = {
      gesamt: ein.length,
      einnahmen: { count: ein.filter(e=>e.typ==='Einnahme').length, summe: r2(einSum) },
      ausgaben:  { count: ein.filter(e=>e.typ==='Ausgabe').length,  summe: r2(ausSum) },
      gewinn: r2(einSum-ausSum),
      topKategorien: Object.entries(katMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({kategorie:k,summe:r2(v)})),
      stornos: ein.filter(e=>e.is_storno).length,
      korrekturen: ein.filter(e=>e.korrektur_von).length,
      einnahmenOhneBeleg: ein.filter(e=>e.typ==='Einnahme'&&!e.belegnr).length,
      grosseOhneNotiz: ein.filter(e=>!e.notiz&&!e.beschreibung&&e.betrag>500).length,
    };
  }

  if (checks.rechnungen) {
    const rech = filterY(data.rechnungen||[]);
    const today = new Date().toISOString().split('T')[0];
    const uebf = rech.filter(r=>r.status==='ueberfaellig'||(r.status==='offen'&&r.faellig&&r.faellig<today));
    auditData.rechnungen = {
      gesamt: rech.length,
      offen: rech.filter(r=>r.status==='offen').length,
      bezahlt: rech.filter(r=>r.status==='bezahlt').length,
      ueberfaellig: uebf.length,
      summeOffen: r2(rech.filter(r=>r.status==='offen').reduce((s,r)=>s+r.betrag,0)),
      summeUeberfaellig: r2(uebf.reduce((s,r)=>s+r.betrag,0)),
      gesamtVolumen: r2(rech.reduce((s,r)=>s+r.betrag,0)),
    };
  }

  if (checks.ust) {
    const mwst = (data.eintraege||[]).filter(e=>e.mwstBetrag>0);
    const vost = (data.eintraege||[]).filter(e=>e.vorsteuerBet>0);
    const mwstS = r2(mwst.reduce((s,e)=>s+(e.mwstBetrag||0),0));
    const vostS = r2(vost.reduce((s,e)=>s+(e.vorsteuerBet||0),0));
    auditData.ust = {
      mwstBuchungen: mwst.length, mwstGesamt: mwstS,
      vorsteuerGesamt: vostS, zahllast: r2(mwstS-vostS),
      ustModi: Object.entries(data.ustModeByYear||data.ustMode||{}).map(([y,m])=>({jahr:y,modus:m})),
    };
  }

  if (checks.wiederkehrend) {
    const wied = data.wiederkehrend||[];
    const today = new Date().toISOString().split('T')[0];
    const mult = {woechentlich:52,monatlich:12,quartalsweise:4,halbjaehrlich:2,jaehrlich:1};
    auditData.wiederkehrend = {
      gesamt: wied.length,
      faellig: wied.filter(w=>w.naechste<=today&&w.status!=='paused').length,
      pausiert: wied.filter(w=>w.status==='paused').length,
      jahresAusgaben: r2(wied.filter(w=>w.typ==='Ausgabe').reduce((s,w)=>s+w.betrag*(mult[w.intervall]||1),0)),
      jahresEinnahmen: r2(wied.filter(w=>w.typ==='Einnahme').reduce((s,w)=>s+w.betrag*(mult[w.intervall]||1),0)),
    };
  }

  if (checks.kunden) {
    const k = data.kunden||[]; const r = data.rechnungen||[];
    auditData.kunden = {
      gesamt: k.length,
      mitRechnungen: k.filter(c=>r.some(re=>re.kundeId===c.id||re.kunde===c.name)).length,
      ohneKontakt: k.filter(c=>!c.email&&!c.tel).length,
    };
  }

  if (checks.fahrtenbuch) {
    const fb = filterY(data.fahrtenbuch||[]);
    const kmGsch = fb.filter(f=>f.typ==='Geschäftlich').reduce((s,f)=>s+(f.km||0),0);
    auditData.fahrtenbuch = {
      fahrten: fb.length,
      kmGesamt: r2(fb.reduce((s,f)=>s+(f.km||0),0)),
      kmGeschaeftlich: r2(kmGsch),
      steuerlichAbsetzbar: r2(kmGsch*0.30),
      hinZurueck: fb.filter(f=>f.hinZurueck).length,
    };
  }

  setP(35,'KI-Verbindung wird aufgebaut...','Google Gemini API');

  // Gemini Key laden
  let apiKey = null;
  try {
    const resp = await fetch(SUPA_URL + '/functions/v1/get-gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPA_KEY
      },
      body: '{}'
    });
    if (resp.ok) {
      const kd = await resp.json();
      if (kd?.key) apiKey = kd.key;
    }
  } catch(e) {}

  if (!apiKey) {
    _auditErr('Google Gemini API Key nicht gefunden. Bitte Supabase Edge Function "get-gemini-key" einrichten (return { key: "DEIN_GEMINI_KEY" }).');
    _auditReset(btn); return;
  }

  // Активные типы и читаемые данные
  const aktiveTypen = Object.entries(types).filter(([,v])=>v).map(([k])=>k);
  const realYears = [...new Set((data.eintraege||[]).map(e=>e.datum&&e.datum.slice(0,4)).filter(Boolean))].sort();
  const _d = [];
  if(auditData.eintraege){const e=auditData.eintraege;
    _d.push('EINNAHMEN: Summe='+e.einnahmen.summe+'EUR, Anzahl='+e.einnahmen.count);
    _d.push('AUSGABEN: Summe='+e.ausgaben.summe+'EUR, Anzahl='+e.ausgaben.count);
    _d.push('GEWINN: '+e.gewinn+'EUR');
    _d.push('BELEGE: Einnahmen ohne Belegnummer='+e.einnahmenOhneBeleg+' (Ausgaben haben normal keine Belegnummern!)');
    _d.push('STORNOS='+e.stornos+' KORREKTUREN='+e.korrekturen);
    _d.push('TOP-KATEGORIEN: '+(e.topKategorien||[]).map(k=>k.kategorie+'='+k.summe+'EUR').join(', '));
  }
  if(auditData.rechnungen){const r=auditData.rechnungen;
    _d.push('RECHNUNGEN: gesamt='+r.gesamt+', offen='+r.offen+' ('+r.summeOffen+'EUR), ueberfaellig='+r.ueberfaellig+' ('+r.summeUeberfaellig+'EUR)');
  }
  if(auditData.ust){const u=auditData.ust;
    _d.push('UMSATZSTEUER: MwSt='+u.mwstGesamt+'EUR, Vorsteuer='+u.vorsteuerGesamt+'EUR, Zahllast='+u.zahllast+'EUR');
    _d.push('UST-MODUS pro Jahr: '+(u.ustModi||[]).map(m=>m.jahr+'='+m.modus).join(', '));
  }
  if(auditData.wiederkehrend){const w=auditData.wiederkehrend;
    _d.push('WIEDERKEHREND: gesamt='+w.gesamt+', faellig='+w.faellig+', JahresAusgaben='+w.jahresAusgaben+'EUR');
  }
  if(auditData.kunden){const k=auditData.kunden;
    _d.push('KUNDEN: gesamt='+k.gesamt+', mit_Rechnungen='+k.mitRechnungen+', ohne_Kontakt='+k.ohneKontakt);
  }
  if(auditData.fahrtenbuch){const f=auditData.fahrtenbuch;
    _d.push('FAHRTENBUCH: Fahrten='+f.fahrten+', km_geschaeftlich='+f.kmGeschaeftlich+', steuerlich_absetzbar='+f.steuerlichAbsetzbar+'EUR (0.30EUR/km)');
  }
  const _dStr = _d.join('\n');

  const typeMap = {

    fehler:      'Fehlersuche & Inkonsistenzen (fehlende Belege, Datenlücken, Widersprüche)',
    steuer:      'Steuerliche Risiken (§19 UStG Grenzen, MwSt-Pflichten, fehlende Voranmeldungen)',
    optimierung: 'Optimierungspotenziale (Kostenreduzierung, Effizienz, Rentabilität)',
    cashflow:    'Cashflow & Liquiditätsanalyse (Zahlungsströme, Forderungen, Engpässe)',
    compliance:  'GoBD-Compliance (§146/§147 AO, Belegpflicht, Aufbewahrung)',
    benchmark:   'Branchenvergleich & KPIs (Kennzahlen, Margen, Performance-Indikatoren)',
  };
  const selectedTypes = Object.entries(types).filter(([,v])=>v).map(([k])=>typeMap[k]).join('\n- ');

  const prompt = `Du bist ein erfahrener Wirtschaftsprüfer und Steuerberater in Deutschland mit 20+ Jahren Erfahrung.

Analysiere diese Buchhaltungsdaten eines deutschen Unternehmers:

ZEITRAUM: ${jahr==='alle'?'Alle Jahre':'Jahr '+jahr}
ANALYSE-SCHWERPUNKTE:
- ${selectedTypes}

REGELN (ZWINGEND BEACHTEN):
1. Ausgaben haben KEINE Belegnummern - das ist normal und kein Fehler!
2. 'einnahmenOhneBeleg'=0 bedeutet alle Einnahmen haben Belegnummern - sehr gut!
3. Nur Jahre analysieren die in den Daten vorkommen: ${realYears.join(', ')}
4. §19 UStG: bis 2024 Vorjahr max 22000 EUR laufend max 50000 EUR, ab 2025 Vorjahr max 25000 EUR laufend max 100000 EUR
5. Keine Daten erfinden oder hochrechnen

BUCHHALTUNGSDATEN:
${_dStr}

Analyse-Schwerpunkte: ${aktiveTypen.join(', ')}

Antworte NUR mit diesem JSON:
{
  "zusammenfassung": {
    "bewertung": "gut|warnung|kritisch",
    "text": "3-4 Sätze Gesamtbewertung mit konkreten Zahlen",
    "score": 0-100,
    "highlights": ["Positiver Aspekt 1", "Positiver Aspekt 2"]
  },
  "bereiche": [
    {
      "name": "Bereichsname",
      "icon": "fa-list",
      "bewertung": "gut|warnung|kritisch",
      "punkte": [
        {"typ": "ok|warnung|fehler|info", "text": "Konkreter Befund mit Zahlen und Empfehlung"}
      ]
    }
  ],
  "empfehlungen": [
    {"prioritaet": "hoch|mittel|niedrig", "text": "Konkrete Handlungsempfehlung"}
  ],
  "naechste_schritte": ["Sofortige Maßnahme", "Kurzfristig", "Mittelfristig"]
}`;

  setP(55,'Google Gemini analysiert Ihre Daten...','KI-Verarbeitung');

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{ temperature:0.2, maxOutputTokens:8192, responseMimeType:'application/json' }
        })
      }
    );

    setP(80,'Ergebnisse werden aufbereitet...','Bericht erstellen');

    if (!resp.ok) {
      const ed = await resp.json().catch(()=>({}));
      throw new Error(ed?.error?.message || 'Gemini API Fehler '+resp.status);
    }

    const apiData = await resp.json();
    const raw = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let audit;
    try { audit = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); }
    catch(e) { throw new Error('JSON-Verarbeitung fehlgeschlagen'); }

    setP(100,'Audit abgeschlossen! ✓','');
    setTimeout(() => {
      progress.style.display = 'none';
      _renderAudit(audit);
      result.style.display = 'block';
      _auditReset(btn);
    }, 400);

  } catch(err) {
    progress.style.display = 'none';
    _auditErr(err.message);
    _auditReset(btn);
    toast('Audit fehlgeschlagen: '+err.message,'err');
  }
}

function _auditReset(btn) {
  btn.disabled=false; btn.style.opacity='1';
  btn.innerHTML=' KI-Audit starten';
}

function _auditErr(msg) {
  const r = document.getElementById('audit-result');
  r.style.display='block';
  r.innerHTML=`<div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r2);padding:20px;color:var(--red)">
    <i class="fas fa-exclamation-triangle"></i> <strong>Fehler:</strong> ${msg}
  </div>`;
}

function _renderAudit(audit) {
  const result = document.getElementById('audit-result');
  const zus = audit.zusammenfassung||{};
  const score = zus.score||0;
  const sc = score>=80?'#22c55e':score>=60?'#e08c1a':'#ef4444';
  const bg = score>=80?'linear-gradient(135deg,#16a34a,#22c55e)':score>=60?'linear-gradient(135deg,#b45309,#e08c1a)':'linear-gradient(135deg,#dc2626,#ef4444)';

  const rLbl={gut:'✓ Gut',warnung:'⚠ Warnung',kritisch:'✗ Kritisch'};
  const rCls={gut:'audit-rating-ok',warnung:'audit-rating-warn',kritisch:'audit-rating-err'};
  const iIco={ok:'✓',warnung:'⚠',fehler:'✗',info:'ℹ'};
  const iCol={ok:'var(--green)',warnung:'var(--yellow)',fehler:'var(--red)',info:'var(--blue)'};
  const pCol={hoch:'var(--red)',mittel:'var(--yellow)',niedrig:'var(--green)'};

  const highlights = (zus.highlights||[]).map(h=>`<span style="background:rgba(255,255,255,.18);padding:3px 10px;border-radius:20px;font-size:12px">${h}</span>`).join('');

  const bereiche = (audit.bereiche||[]).map(b=>`
    <div class="audit-section">
      <div class="audit-section-header">
        <div class="audit-section-icon" style="background:${b.bewertung==='gut'?'rgba(34,197,94,.12)':b.bewertung==='warnung'?'rgba(224,140,26,.12)':'rgba(239,68,68,.12)'};color:${b.bewertung==='gut'?'var(--green)':b.bewertung==='warnung'?'var(--yellow)':'var(--red)'}">
          <i class="fas ${b.icon||'fa-chart-bar'}"></i></div>
        <div class="audit-section-title">${b.name}</div>
        <span class="audit-rating ${rCls[b.bewertung]||'audit-rating-ok'}">${rLbl[b.bewertung]||b.bewertung}</span>
      </div>
      <div class="audit-section-body">
        ${(b.punkte||[]).map(p=>`<div class="audit-item">
          <span class="audit-item-icon" style="color:${iCol[p.typ]||'var(--sub)'}">${iIco[p.typ]||'•'}</span>
          <span class="audit-item-text">${p.text}</span></div>`).join('')}
      </div></div>`).join('');

  const empf = (audit.empfehlungen||[]).length ? `
    <div class="audit-section">
      <div class="audit-section-header">
        <div class="audit-section-icon" style="background:rgba(26,69,120,.1);color:var(--blue)"><i class="fas fa-lightbulb"></i></div>
        <div class="audit-section-title">Handlungsempfehlungen</div>
      </div>
      <div class="audit-section-body">
        ${(audit.empfehlungen||[]).map(e=>{
          const p=typeof e==='object'?e.prioritaet:'mittel', t=typeof e==='object'?e.text:e;
          return `<div class="audit-item">
            <span class="audit-item-icon" style="color:${pCol[p]||'var(--blue)'}"><i class="fas fa-arrow-right" style="font-size:10px"></i></span>
            <span class="audit-item-text"><strong style="color:${pCol[p]||'var(--sub)'}; text-transform:uppercase;font-size:9px;margin-right:5px">${p||''}</strong>${t}</span></div>`;
        }).join('')}
      </div></div>` : '';

  const steps = (audit.naechste_schritte||[]).length ? `
    <div class="audit-section">
      <div class="audit-section-header">
        <div class="audit-section-icon" style="background:rgba(93,157,105,.12);color:var(--green)"><i class="fas fa-tasks"></i></div>
        <div class="audit-section-title">Nächste Schritte</div>
      </div>
      <div class="audit-section-body">
        ${(audit.naechste_schritte||[]).map((s,i)=>`<div class="audit-item">
          <span class="audit-item-icon" style="color:var(--blue);font-weight:700">${i+1}.</span>
          <span class="audit-item-text">${s}</span></div>`).join('')}
      </div></div>` : '';

  result.innerHTML = `
    <div class="audit-summary" style="background:${bg};margin-bottom:12px; margin-top:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; margin-top:10px">
        <div style="font-size:16px;font-weight:700;color:#fff">KI-Audit Ergebnis</div>
        <div style="text-align:right">
          <div style="font-size:42px;font-weight:800;line-height:1;color:#fff">${score}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.8)">von 100 Punkten</div>
        </div>
      </div>
      <div style="font-size:14px;line-height:1.6;color:rgba(255,255,255,.95)">${zus.text||''}</div>
      <div style="margin-top:12px;height:6px;background:rgba(255,255,255,.2);border-radius:3px">
        <div style="height:100%;width:${score}%;background:#fff;border-radius:3px;opacity:.9"></div>
      </div>
      ${highlights?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${highlights}</div>`:''}
    </div>
    ${bereiche}${empf}${steps}
    <div style="text-align:center;padding:12px;font-size:11px;color:var(--sub)">
      Analyse durch Google Gemini KI ·
      <i class="fas fa-info-circle"></i> Ersetzt keine professionelle Steuerberatung (§ 3 StBerG)
    </div>`;
}
