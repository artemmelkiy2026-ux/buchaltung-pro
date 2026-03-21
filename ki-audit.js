// ── KI-AUDIT ─────────────────────────────────────────────────────────────

function initKiAudit() {
  // Jahresfilter befüllen
  const sel = document.getElementById('audit-jahr');
  if (!sel) return;
  const years = [...new Set((data.eintraege||[]).map(e=>e.datum?.substring(0,4)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="alle">Alle Jahre</option>' +
    years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

async function startKiAudit() {
  const btn = document.getElementById('audit-start-btn');
  const progress = document.getElementById('audit-progress');
  const result = document.getElementById('audit-result');
  const progressBar = document.getElementById('audit-progress-bar');
  const progressText = document.getElementById('audit-progress-text');
  const progressStep = document.getElementById('audit-progress-step');

  // Welche Bereiche sind ausgewählt?
  const checks = {
    eintraege:    document.getElementById('ac-eintraege')?.checked,
    rechnungen:   document.getElementById('ac-rechnungen')?.checked,
    ust:          document.getElementById('ac-ust')?.checked,
    wiederkehrend:document.getElementById('ac-wiederkehrend')?.checked,
    kunden:       document.getElementById('ac-kunden')?.checked,
    fahrtenbuch:  document.getElementById('ac-fahrtenbuch')?.checked,
  };

  if (!Object.values(checks).some(Boolean)) {
    return toast('Bitte mindestens einen Bereich auswählen!', 'err');
  }

  const jahr = document.getElementById('audit-jahr')?.value || 'alle';

  // UI — Start
  btn.disabled = true;
  btn.style.opacity = '.6';
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse läuft...';
  progress.style.display = 'block';
  result.style.display = 'none';
  result.innerHTML = '';

  // Daten zusammenstellen
  const setProgress = (pct, text, step='') => {
    progressBar.style.width = pct + '%';
    progressText.textContent = text;
    progressStep.textContent = step;
  };

  setProgress(10, 'Daten werden vorbereitet...', 'Buchhaltungsdaten laden');

  const filterByYear = (arr, field='datum') =>
    jahr === 'alle' ? arr : arr.filter(e => (e[field]||'').startsWith(jahr));

  const auditData = {};

  if (checks.eintraege) {
    const ein = filterByYear(data.eintraege||[]);
    const einnahmen = ein.filter(e=>e.typ==='Einnahme');
    const ausgaben  = ein.filter(e=>e.typ==='Ausgabe');
    auditData.eintraege = {
      gesamt: ein.length,
      einnahmen: { count: einnahmen.length, summe: einnahmen.reduce((s,e)=>s+e.betrag,0) },
      ausgaben:  { count: ausgaben.length,  summe: ausgaben.reduce((s,e)=>s+e.betrag,0) },
      gewinn: einnahmen.reduce((s,e)=>s+e.betrag,0) - ausgaben.reduce((s,e)=>s+e.betrag,0),
      kategorien: [...new Set(ein.map(e=>e.kategorie))],
      zahlungsarten: [...new Set(ein.map(e=>e.zahlungsart))],
      stornos: ein.filter(e=>e.is_storno).length,
      ohneBeleg: ein.filter(e=>!e.belegnr).length,
      korrekturen: ein.filter(e=>e.korrektur_von).length,
    };
  }

  if (checks.rechnungen) {
    const rech = filterByYear(data.rechnungen||[]);
    auditData.rechnungen = {
      gesamt: rech.length,
      offen:       rech.filter(r=>r.status==='offen').length,
      bezahlt:     rech.filter(r=>r.status==='bezahlt').length,
      ueberfaellig:rech.filter(r=>r.status==='ueberfaellig').length,
      summeOffen:  rech.filter(r=>r.status==='offen').reduce((s,r)=>s+r.betrag,0),
      gesamtVolumen: rech.reduce((s,r)=>s+r.betrag,0),
    };
  }

  if (checks.ust) {
    const ustE = filterByYear(data.ustEintraege||[]);
    const mwst = (data.eintraege||[]).filter(e=>e.mwstBetrag>0);
    const vost = (data.eintraege||[]).filter(e=>e.vorsteuerBet>0);
    auditData.ust = {
      mwstBuchungen: mwst.length,
      mwstGesamt:    mwst.reduce((s,e)=>s+(e.mwstBetrag||0),0),
      vorsteuerGesamt: vost.reduce((s,e)=>s+(e.vorsteuerBet||0),0),
      zahllast: mwst.reduce((s,e)=>s+(e.mwstBetrag||0),0) - vost.reduce((s,e)=>s+(e.vorsteuerBet||0),0),
      manuelleEintraege: ustE.length,
      ustJahre: [...new Set(Object.keys(data.ustMode||{}))],
    };
  }

  if (checks.wiederkehrend) {
    const wied = data.wiederkehrend||[];
    const today = new Date().toISOString().split('T')[0];
    auditData.wiederkehrend = {
      gesamt: wied.length,
      faellig: wied.filter(w=>w.naechste<=today&&w.status!=='paused').length,
      pausiert: wied.filter(w=>w.status==='paused').length,
      einnahmen: wied.filter(w=>w.typ==='Einnahme').reduce((s,w)=>s+w.betrag,0),
      ausgaben:  wied.filter(w=>w.typ==='Ausgabe').reduce((s,w)=>s+w.betrag,0),
    };
  }

  if (checks.kunden) {
    const k = data.kunden||[];
    const r = data.rechnungen||[];
    auditData.kunden = {
      gesamt: k.length,
      mitRechnungen: k.filter(c=>r.some(re=>re.kundeId===c.id||re.kunde===c.name)).length,
      ohneKontakt: k.filter(c=>!c.email&&!c.tel).length,
    };
  }

  if (checks.fahrtenbuch) {
    const fb = filterByYear(data.fahrtenbuch||[]);
    auditData.fahrtenbuch = {
      fahrten: fb.length,
      kmGesamt: fb.reduce((s,f)=>s+(f.km||0),0),
      kmGeschaeftlich: fb.filter(f=>f.typ==='Geschäftlich').reduce((s,f)=>s+(f.km||0),0),
      fahrzeuge: [...new Set(fb.map(f=>f.autoId).filter(Boolean))].length,
      hinZurueck: fb.filter(f=>f.hinZurueck).length,
    };
  }

  setProgress(30, 'KI-Analyse wird vorbereitet...', 'Daten an KI übermitteln');

  // Prompt für Claude
  const bereicheListe = Object.entries(checks).filter(([,v])=>v).map(([k])=>({
    eintraege:'Einträge & Buchungen', rechnungen:'Rechnungen',
    ust:'Umsatzsteuer', wiederkehrend:'Wiederkehrende Zahlungen',
    kunden:'Kunden (CRM)', fahrtenbuch:'Fahrtenbuch'
  }[k])).join(', ');

  const prompt = `Du bist ein erfahrener Steuerberater und Buchhalter in Deutschland. 
Analysiere die folgenden Buchhaltungsdaten eines deutschen Kleinunternehmers und erstelle einen detaillierten Audit-Bericht.
Zeitraum: ${jahr === 'alle' ? 'Alle verfügbaren Jahre' : 'Jahr ' + jahr}
Analysierte Bereiche: ${bereicheListe}

BUCHHALTUNGSDATEN:
${JSON.stringify(auditData, null, 2)}

Erstelle einen strukturierten Audit-Bericht als JSON mit folgender Struktur:
{
  "zusammenfassung": {
    "bewertung": "gut|warnung|kritisch",
    "text": "Kurze Gesamtbewertung 2-3 Sätze",
    "score": 85
  },
  "bereiche": [
    {
      "name": "Bereichsname",
      "icon": "fa-list",
      "bewertung": "gut|warnung|kritisch",
      "punkte": [
        {"typ": "ok|warnung|fehler|info", "text": "Befund mit konkreten Zahlen und Empfehlung"}
      ]
    }
  ],
  "empfehlungen": ["Konkrete Handlungsempfehlung 1", "Empfehlung 2"]
}

Wichtig:
- Bewertung "gut" = alles in Ordnung (grün)
- Bewertung "warnung" = Verbesserungsbedarf (gelb)  
- Bewertung "kritisch" = dringender Handlungsbedarf (rot)
- Gib konkrete Zahlen aus den Daten an
- Prüfe auf steuerliche Risiken (§19 UStG Grenze 25.000€, fehlende Belegnummern, überfällige Rechnungen etc.)
- Antworte NUR mit dem JSON-Objekt, kein Text davor oder danach`;

  setProgress(50, 'KI analysiert Ihre Daten...', 'Claude KI wird befragt');

  try {
    // Direkt Anthropic API aufrufen
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    setProgress(80, 'Ergebnisse werden aufbereitet...', 'Bericht wird erstellt');

    if (!response.ok) throw new Error('API Fehler: ' + response.status);

    const apiData = await response.json();
    const rawText = apiData.content?.[0]?.text || '';

    // JSON parsen
    let audit;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      audit = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch(e) {
      throw new Error('Antwort konnte nicht verarbeitet werden');
    }

    setProgress(100, 'Audit abgeschlossen!', '');

    setTimeout(() => {
      progress.style.display = 'none';
      _renderAuditResult(audit);
      result.style.display = 'block';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = '<i class="fas fa-robot"></i> Neuen Audit starten';
    }, 500);

  } catch(err) {
    progress.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.innerHTML = '<i class="fas fa-robot"></i> KI-Audit starten';
    result.style.display = 'block';
    result.innerHTML = `<div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r2);padding:20px;color:var(--red)">
      <i class="fas fa-exclamation-triangle"></i> Fehler: ${err.message}
    </div>`;
    toast('Audit fehlgeschlagen: ' + err.message, 'err');
  }
}

function _renderAuditResult(audit) {
  const result = document.getElementById('audit-result');
  const zus = audit.zusammenfassung || {};
  const score = zus.score || 0;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#e08c1a' : '#ef4444';

  const ratingLabel = { gut:'✓ Gut', warnung:'⚠ Warnung', kritisch:'✗ Kritisch' };
  const ratingClass = { gut:'audit-rating-ok', warnung:'audit-rating-warn', kritisch:'audit-rating-err' };
  const itemIcon = { ok:'✓', warnung:'⚠', fehler:'✗', info:'ℹ' };
  const itemColor = { ok:'var(--green)', warnung:'var(--yellow)', fehler:'var(--red)', info:'var(--blue)' };

  const bereicheHtml = (audit.bereiche||[]).map(b => `
    <div class="audit-section">
      <div class="audit-section-header">
        <div class="audit-section-icon" style="background:${b.bewertung==='gut'?'rgba(34,197,94,.12)':b.bewertung==='warnung'?'rgba(224,140,26,.12)':'rgba(239,68,68,.12)'};color:${b.bewertung==='gut'?'var(--green)':b.bewertung==='warnung'?'var(--yellow)':'var(--red)'}">
          <i class="fas ${b.icon||'fa-chart-bar'}"></i>
        </div>
        <div class="audit-section-title">${b.name}</div>
        <span class="audit-rating ${ratingClass[b.bewertung]||'audit-rating-ok'}">${ratingLabel[b.bewertung]||b.bewertung}</span>
      </div>
      <div class="audit-section-body">
        ${(b.punkte||[]).map(p=>`
          <div class="audit-item">
            <span class="audit-item-icon" style="color:${itemColor[p.typ]||'var(--sub)'}">
              ${itemIcon[p.typ]||'•'}
            </span>
            <span class="audit-item-text">${p.text}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  const empfehlungenHtml = (audit.empfehlungen||[]).length ? `
    <div class="audit-section">
      <div class="audit-section-header">
        <div class="audit-section-icon" style="background:rgba(26,69,120,.1);color:var(--blue)">
          <i class="fas fa-lightbulb"></i>
        </div>
        <div class="audit-section-title">Empfehlungen</div>
      </div>
      <div class="audit-section-body">
        ${(audit.empfehlungen||[]).map((e,i)=>`
          <div class="audit-item">
            <span class="audit-item-icon" style="color:var(--blue);font-weight:700">${i+1}.</span>
            <span class="audit-item-text">${e}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  result.innerHTML = `
    <!-- Zusammenfassung -->
    <div class="audit-summary" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700">
          <i class="fas fa-robot" style="margin-right:8px;opacity:.8"></i>KI-Audit Ergebnis
        </div>
        <div style="text-align:right">
          <div style="font-size:36px;font-weight:800;line-height:1;color:${scoreColor}">${score}</div>
          <div style="font-size:11px;opacity:.7">von 100 Punkten</div>
        </div>
      </div>
      <div style="font-size:14px;line-height:1.6;opacity:.9">${zus.text||''}</div>
      <div style="margin-top:10px;height:6px;background:rgba(255,255,255,.2);border-radius:3px">
        <div style="height:100%;width:${score}%;background:${scoreColor};border-radius:3px;transition:width .8s ease"></div>
      </div>
    </div>

    ${bereicheHtml}
    ${empfehlungenHtml}

    <div style="text-align:center;padding:12px;font-size:11px;color:var(--sub)">
      <i class="fas fa-info-circle"></i> Dieser Bericht wurde von einer KI erstellt und ersetzt keine professionelle Steuerberatung (§ 3 StBerG).
    </div>`;

  // Score Animation
  setTimeout(() => {
    const bar = result.querySelector('.audit-summary div[style*="width:' + score + '%"]');
    if (bar) bar.style.width = score + '%';
  }, 100);
}
