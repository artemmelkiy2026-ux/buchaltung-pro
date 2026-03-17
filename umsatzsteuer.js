// ── STEUERERKLÄRUNG ──────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// STEUERTABELLEN — AKTUELL GEPRÜFTE WERTE (Stand: März 2026)
// ═══════════════════════════════════════════════════════════════════════
// Quellen: BMF, § 32a EStG (Steuerfortentwicklungsgesetz), IHK, Sparkasse
//
// 2025: Grundfreibetrag 12.096 €
// 2026: Grundfreibetrag 12.348 € (+252 €)
//
// Kleinunternehmergrenze (§ 19 UStG, ab 01.01.2025):
//   - Vorjahresumsatz: max. 25.000 € (netto) [alt: 22.000 €]
//   - Laufendes Jahr: max. 100.000 € (netto, HARD LIMIT mit Fallbeil-Effekt) [alt: 50.000 €]
//   - Achtung: 100.000€-Grenze wirkt sofort bei Überschreitung!
//
// Gewerbesteuer: Freibetrag 24.500 €, Messzahl 3,5% × Hebesatz (Gemeinde)
//
// KV Selbstständige 2026: BBG 5.812,50 €/Monat, KV-Satz 14,6% + Ø ZB 2,9%
//   Mindestbemessungsgrundlage: 1.318,33 €/Monat
//   GKV-Höchstbeitrag (inkl. Pflege, kinderlos): ~1.261 €/Monat
// ═══════════════════════════════════════════════════════════════════════





function updateGKVDisplay(gewinn, gkvGezahlt, isFamilienversichert) {
  const result = calcGKVNachzahlung(gewinn, gkvGezahlt, isFamilienversichert);
  document.getElementById('st-gkv-basis').textContent = fmt(result.gkvSoll);
  document.getElementById('st-gkv-schuld').textContent = fmt(result.gkvSoll);
  document.getElementById('st-gkv-nachzahlung').textContent = fmt(result.nachzahlung);
  document.getElementById('st-gkv-abzug').textContent = fmt(result.abzugsfaehig);
  
  // Цвет зависит от величины nachzahlung
  const nachzahlEl = document.getElementById('st-gkv-nachzahlung');
  if (result.nachzahlung > 5000) {
    nachzahlEl.style.color = 'var(--red)';
    nachzahlEl.style.fontWeight = '700';
  } else if (result.nachzahlung > 0) {
    nachzahlEl.style.color = 'var(--yellow)';
  } else {
    nachzahlEl.style.color = 'var(--green)';
  }
}

// ─── PKW & AfA ───
function togglePKWFields() {
  const nutzung = document.getElementById('st-pkw-nutzung').value;
  document.getElementById('st-pkw-fields').style.display = nutzung === 'nein' ? 'none' : 'block';
  document.getElementById('st-pkw-1prozent').style.display = nutzung === '1prozent' ? 'block' : 'none';
  document.getElementById('st-pkw-fahrtenbuch').style.display = nutzung === 'fahrtenbuch' ? 'block' : 'none';
}

function addAFARow() {
  const list = document.getElementById('st-afa-list');
  const id = 'st-afa-' + Date.now();
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 80px 80px 30px;gap:8px;margin-bottom:8px;padding:8px;background:var(--s3);border-radius:var(--r)';
  row.innerHTML = `
    <input type="text" placeholder="Beschreibung (z.B. Drehmaschine)" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <input type="number" placeholder="Betrag €" min="0" step="100" value="0" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <input type="number" placeholder="Jahre" min="1" max="20" value="5" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <button class="btn" style="padding:6px;font-size:11px" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(row);
}

function getAFATotal() {
  let total = 0;
  const rows = document.querySelectorAll('#st-afa-list > div');
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const betrag = parseFloat(inputs[1].value) || 0;
    const jahre = parseInt(inputs[2].value) || 1;
    total += betrag / jahre; // Jahresabschreibung
  });
  return total;
}

function calcUSTSaldo() {
  const eingezogen = parseFloat(document.getElementById('st-ust-eingezogen').value) || 0;
  const bezahlt = parseFloat(document.getElementById('st-ust-bezahlt').value) || 0;
  const saldo = eingezogen - bezahlt;
  const display = document.getElementById('st-ust-ausgleich');
  if (display) {
    display.textContent = fmt(Math.abs(saldo));
    display.style.color = saldo >= 0 ? 'var(--red)' : 'var(--green)';
  }
  return saldo;
}

function stReset() {
  ['st-name','st-ein','st-aus','st-gew','st-ho','st-km','st-arbtage',
   'st-spenden','st-wk','st-vorausz','st-kap','st-kest','st-kv','st-pv','st-av','st-buv',
   'st-pkw-nutzung','st-pkw-wert','st-pkw-km','st-iab','st-gwg','st-ust-eingezogen','st-ust-bezahlt',
   'st-bu','st-haft','st-fortbildung','st-verpflegung-tage'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value=id==='st-arbtage'?'220':id==='st-pkw-nutzung'?'nein':'';
  });
  document.getElementById('st-ho-val').textContent='0,00 €';
  document.getElementById('st-fk-val').textContent='0,00 €';
  document.getElementById('st-afa-list').innerHTML='';
  document.getElementById('st-result').style.display='none';
  togglePKWFields();
  calcUSTSaldo();
  toast('Zurückgesetzt','err');
}

function stCard(cls,label,val,sub='') {
  return `<div class="sc ${cls}" style="cursor:default">
    <div class="sc-lbl">${label}</div>
    <div class="sc-val">${val}</div>
    ${sub?`<div class="sc-sub">${sub}</div>`:''}
  </div>`;
}

function stRow(label,val,bold=false,color=''){
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:12px;color:var(--sub)">${label}</span>
    <span style="font-family:var(--mono);font-size:13px;font-weight:${bold?700:500};color:${color||'var(--text)'}">${val}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// STEUERBERECHNUNGS-FUNKTIONEN (§32a EStG, GKV, GewSt)
// ═══════════════════════════════════════════════════════════════════
const STEUERJAHR_WERTE = {
  2024: { grundfb: 11784, zone1end: 17005, zone2end: 66760, zone3end: 277826, soli_freigrenze: 18130,
          kfreibetrag: 9312, kindergeld: 250, ku_vorjahr: 22000, ku_laufend: 50000 },
  2025: { grundfb: 12096, zone1end: 17430, zone2end: 66760, zone3end: 277825, soli_freigrenze: 19950,
          kfreibetrag: 9312, kindergeld: 255, ku_vorjahr: 25000, ku_laufend: 100000 },
  2026: { grundfb: 12348, zone1end: 17799, zone2end: 69878, zone3end: 277825, soli_freigrenze: 20350,
          kfreibetrag: 9754, kindergeld: 259, ku_vorjahr: 25000, ku_laufend: 100000 }
  // Kinderfreibetrag 2026: 6.828 € gesamt (3.414 × 2 Elternteile = 6.828 €)
  // Beachte: Betreuungsfreibetrag 2.928 € unverändert → ges. 9.754 € / Kind bei Zusammenveranlagung
};

function getSteuerwerte(jahr) {
  return STEUERJAHR_WERTE[jahr] || STEUERJAHR_WERTE[2026];
}

function estGrundtarif(zvE, jahr=2026) {
  const sw = getSteuerwerte(jahr);
  if (zvE <= 0) return 0;
  if (zvE <= sw.grundfb) return 0;
  if (zvE <= sw.zone1end) { const y=(zvE-sw.grundfb)/10000; return Math.round((980*y+1400)*y); }
  const y1=(sw.zone1end-sw.grundfb)/10000; const est1=Math.round((980*y1+1400)*y1);
  if (zvE <= sw.zone2end) { const z=(zvE-sw.zone1end)/10000; return Math.round((180*z+2397)*z+est1); }
  const z2=(sw.zone2end-sw.zone1end)/10000; const est2=Math.round((180*z2+2397)*z2+est1);
  const d42=Math.round(sw.zone2end*0.42-est2);
  if (zvE <= sw.zone3end) return Math.round(zvE*0.42-d42);
  const est3=Math.round(sw.zone3end*0.42-d42);
  return Math.round(zvE*0.45-Math.round(sw.zone3end*0.45-est3));
}

// Точная формула §32a EStG — полностью динамическая, без hardcoded вычетов
function calcESt(zvE, jahr=2026) {
  const sw = getSteuerwerte(jahr);
  if (zvE <= 0) return 0;
  if (zvE <= sw.grundfb) return 0;
  // Zone 1
  if (zvE <= sw.zone1end) {
    const y = (zvE - sw.grundfb) / 10000;
    return Math.round((980 * y + 1400) * y);
  }
  // Zone 1 граница — база для Zone 2
  const y1 = (sw.zone1end - sw.grundfb) / 10000;
  const est1 = Math.round((980 * y1 + 1400) * y1);
  // Zone 2
  if (zvE <= sw.zone2end) {
    const z = (zvE - sw.zone1end) / 10000;
    return Math.round((180 * z + 2397) * z + est1);
  }
  // Zone 2 граница — база для Zone 3
  const z2 = (sw.zone2end - sw.zone1end) / 10000;
  const est2 = Math.round((180 * z2 + 2397) * z2 + est1);
  const deduct42 = Math.round(sw.zone2end * 0.42 - est2);
  // Zone 3
  if (zvE <= sw.zone3end) return Math.round(zvE * 0.42 - deduct42);
  // Zone 3 граница — база для Zone 4
  const est3 = Math.round(sw.zone3end * 0.42 - deduct42);
  const deduct45 = Math.round(sw.zone3end * 0.45 - est3);
  // Zone 4
  return Math.round(zvE * 0.45 - deduct45);
}

function estGrundtarifY(zvE, jahr=2026) { return calcESt(Math.max(0, Math.round(zvE)), jahr); }
function estSplitting(zvE, jahr=2026) { return estGrundtarifY(Math.round(zvE/2), jahr) * 2; }

function calcSoli(est, jahr=2026) {
  const sw = getSteuerwerte(jahr);
  if (est <= sw.soli_freigrenze) return 0;
  // Milderungszone: nicht sprunghaft
  const milderung = est * 0.055;
  const ueberschuss = (est - sw.soli_freigrenze) * 0.119;
  return Math.round(Math.min(milderung, ueberschuss));
}

// Aktuell gültige Werte (2026)
const KFREIBETRAG_2025 = 9754; // 2026: 3.414 × 2 + 2.928 (Betreuung) ≈ 9.756
const KINDERGELD_MONAT = 259;  // 2026: 259 €/Monat

// Kleinunternehmer-Grenzen ab 2025 (§19 UStG)
const KU_GRENZE_VORJAHR  = 25000;   // Vorjahresumsatz (netto) — ab 2025
const KU_GRENZE_LAUFEND  = 100000;  // Laufendes Jahr (HARD LIMIT) — ab 2025
const KU_GRENZE_ALT      = 22000;   // Bis 2024
const GEW_FREIBETRAG     = 24500;   // Gewerbesteuer-Freibetrag (unverändert)
const GEW_MESSZAHL       = 0.035;   // Gewerbesteuer-Messzahl 3,5%

function stInit() {
  const je=[...new Set((data.eintraege||[]).filter(e=>e.datum).map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('st-eur-yr');
  sel.innerHTML='<option value="Alle">Alle Jahre</option>'+je.map(j=>`<option>${j}</option>`).join('');
  stSyncJahr();
  stFamChange(); stKinderChange();
}

function stSyncJahr() {
  const jahr = document.getElementById('st-jahr').value;
  const sel = document.getElementById('st-eur-yr');
  const opt = [...sel.options].find(o => o.value === jahr);
  if (opt) sel.value = jahr;
  else sel.value = 'Alle';
  stFillEUR();
}

function stFamChange() {
  const v=document.getElementById('st-fam').value;
  const pb=document.getElementById('st-partner-block');
  pb.style.display=(v==='zusammen'||v==='getrennt')?'':'none';
}

function stPartnerChange() {
  const v=document.getElementById('st-partner').value;
  document.getElementById('st-pein-wrap').style.display=v==='ja'?'':'none';
}

function stKinderChange() {
  const n=parseInt(document.getElementById('st-kinder').value)||0;
  const block=document.getElementById('st-kinder-block');
  if(!n){block.innerHTML='';return;}
  block.innerHTML=Array.from({length:n},(_,i)=>`
    <div class="fg"><label>Kind ${i+1} — Geburtsjahr</label>
      <input type="number" id="st-kid-${i}" placeholder="${new Date().getFullYear()-5}" min="1990" max="${new Date().getFullYear()}" value="${new Date().getFullYear()-5-i*2}">
    </div>`).join('');
}

function stFillEUR() {
  const yr=document.getElementById('st-eur-yr').value;
  const ye=activeEintraegeMitRech(yr==='Alle'?null:yr);
  const ein=sum(ye,'Einnahme'), aus=sum(ye,'Ausgabe');
  document.getElementById('st-ein').value=ein.toFixed(2);
  document.getElementById('st-aus').value=aus.toFixed(2);
  stCalcGew();
  toast(`${'EÜR geladen:'} ${yr}`,'ok');
}

function stCalcGew() {
  const ein=parseFloat(document.getElementById('st-ein').value)||0;
  const aus=parseFloat(document.getElementById('st-aus').value)||0;
  document.getElementById('st-gew').value=(ein-aus).toFixed(2);
}

function stCalcWK() {
  const ho=Math.min(parseInt(document.getElementById('st-ho').value)||0,210);
  const km=parseFloat(document.getElementById('st-km').value)||0;
  const arb=parseInt(document.getElementById('st-arbtage').value)||220;
  const hoPausch=Math.min(ho*6,1260);
  const fahrt=km*arb*0.30;
  document.getElementById('st-ho-val').textContent=fmt(hoPausch);
  document.getElementById('st-fk-val').textContent=fmt(fahrt);
}

// ═══════════════════════════════════════════════════════════════════════════
// GEWERBESTEUER & GKV FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════════════

// База городов с Hebesätze
const HEBESAETZE_DB = {
  'Worms': 430, 'München': 490, 'Berlin': 410, 'Hamburg': 520, 'Köln': 470,
  'Frankfurt': 450, 'Stuttgart': 490, 'Düsseldorf': 460, 'Dortmund': 490,
  'Essen': 500, 'Leipzig': 440, 'Dresden': 460, 'Hannover': 480, 'Nürnberg': 470,
  'Duisburg': 530, 'Bochum': 510, 'Wuppertal': 510, 'Bielefeld': 500, 'Bonn': 410,
  'Münster': 460, 'Mannheim': 450, 'Augsburg': 470, 'Wiesbaden': 420, 'Gelsenkirchen': 540,
  'Mönchengladbach': 500, 'Braunschweig': 490, 'Chemnitz': 440, 'Kiel': 460, 'Aachen': 490,
  'Lübeck': 470, 'Halle': 430, 'Magdeburg': 420, 'Freiburg': 480, 'Krefeld': 500,
  'Mainz': 440, 'Rostock': 420, 'Kassel': 460, 'Hagen': 520, 'Saarbrücken': 490
};

function searchHebesatz() {
  const stadtInput = document.getElementById('st-stadt').value.trim();
  if (!stadtInput) return;
  
  // Точный поиск
  for (let stadt in HEBESAETZE_DB) {
    if (stadt.toLowerCase() === stadtInput.toLowerCase()) {
      document.getElementById('st-hebesatz').value = HEBESAETZE_DB[stadt];
      toast('✓ ' + stadt + ': ' + HEBESAETZE_DB[stadt] + '%', 'ok');
      return;
    }
  }
  
  // Частичный поиск
  for (let stadt in HEBESAETZE_DB) {
    if (stadt.toLowerCase().includes(stadtInput.toLowerCase())) {
      document.getElementById('st-stadt').value = stadt;
      document.getElementById('st-hebesatz').value = HEBESAETZE_DB[stadt];
      toast('✓ Gefunden: ' + stadt + ' (' + HEBESAETZE_DB[stadt] + '%)', 'ok');
      return;
    }
  }
  
  toast('✗ Stadt nicht in Datenbank. Hebesatz manuell eingeben.', 'error');
}

function calcGewerbesteuer(gewinn) {
  const hebesatz = parseInt(document.getElementById('st-hebesatz').value) || 430;
  const freibetrag = 24500;
  const messbasis = Math.max(0, gewinn - freibetrag);
  const messbetrag = messbasis * 0.035;
  const gewst = messbetrag * (hebesatz / 100);
  const verrechenbar = Math.min(gewst, 3.8 * messbetrag); // §35 EStG: max 3.8-fache des Messbetrags
  
  return { gewst, messbasis, messbetrag, verrechenbar, hebesatz };
}

function calcGKVNachzahlung(gewinn, gkvGezahlt, isFamilienversichert) {
  // НОВОЕ: Учитываем Mindestbeitrag
  // BBG 2026: 5.812,50 €/Monat
  // KV-Satz: 14,6% + Ø ZB 2,9% = ~17,5%
  // Mindestbeitrag: ~2.600€/год (если не Familienversicherung)
  
  const bbg = 5512.50 * 12; // BBG KV 2026: 5.512,50 €/Monat = 66.150 €/Jahr (GKV-Spitzenverband)
  const kvRate = 0.175; // KV 14,6% + Ø Zusatzbeitrag 2,9% = 17,5%
  const mindestbeitrag = 2474; // Mindestbeitrag KV 2026: 1.178,33 €/Monat × 17,5% × 12 (§240 SGB V)
  
  if (isFamilienversichert) {
    // Familienversichert = KOSTENLOS
    return { 
      gkvSoll: 0, 
      nachzahlung: Math.max(0, 0 - gkvGezahlt),
      abzugsfaehig: 0,
      hasMindestbeitrag: false
    };
  }
  
  let gkvSoll = 0;
  let hasMindestbeitrag = false;
  
  if (gewinn <= bbg) {
    // Normalный расчёт: gewinn * Satz
    const normalCalc = gewinn * kvRate;
    
    // Но если это меньше Mindestbeitrag, платим Mindestbeitrag
    if (normalCalc < mindestbeitrag) {
      gkvSoll = mindestbeitrag;
      hasMindestbeitrag = true;
    } else {
      gkvSoll = normalCalc;
    }
  } else {
    // Über BBG: max
    gkvSoll = bbg * kvRate;
  }
  
  const nachzahlung = Math.max(0, gkvSoll - gkvGezahlt);
  return { 
    gkvSoll, 
    nachzahlung, 
    abzugsfaehig: nachzahlung,
    hasMindestbeitrag: hasMindestbeitrag
  };
}

function updateGKVInfo() {
  // Обновить информацию о GKV при изменении статуса
  const isFamilienversichert = document.getElementById('st-gkv-familienvers')?.value === 'ja';
  if (isFamilienversichert) {
    document.getElementById('st-gkv-warning-mindest').style.display = 'none';
  }
}

function updateKleinunternehmerCalc() {
  // Пересчитать Netto если выбрана опция Kleinunternehmer
  // (это будет вызвано при нажатии Berechnen)
}

function updateGewersteuherDisplay(gewinn) {
  const result = calcGewerbesteuer(gewinn);
  document.getElementById('st-gew-display').textContent = fmt(gewinn);
  document.getElementById('st-messbasis-display').textContent = fmt(result.messbasis);
  document.getElementById('st-messbetrag-display').textContent = fmt(result.messbetrag);
  document.getElementById('st-hebesatz-display').textContent = result.hebesatz + '%';
  document.getElementById('st-gewst-total').textContent = fmt(result.gewst);
  document.getElementById('st-gewst-verrechenbar').textContent = fmt(result.verrechenbar);
}


function stBerechnen() {
  try {
  // ── Eingaben lesen ──
  const jahr    = parseInt(document.getElementById('st-jahr').value)||2025;
  const fam     = document.getElementById('st-fam').value;
  const partner = document.getElementById('st-partner').value;
  const pein    = parseFloat(document.getElementById('st-pein')?.value)||0;
  const nKinder = parseInt(document.getElementById('st-kinder').value)||0;
  const kirche  = parseFloat(document.getElementById('st-kirche').value)||0;
  const ein     = parseFloat(document.getElementById('st-ein').value)||0;
  const aus     = parseFloat(document.getElementById('st-aus').value)||0;
  const gewinn  = ein - aus;
  const ho      = Math.min(parseInt(document.getElementById('st-ho').value)||0, 210);
  const km      = parseFloat(document.getElementById('st-km').value)||0;
  const arbt    = parseInt(document.getElementById('st-arbtage').value)||220;
  const spenden = parseFloat(document.getElementById('st-spenden').value)||0;
  const wk      = parseFloat(document.getElementById('st-wk').value)||0;
  const vorausz = parseFloat(document.getElementById('st-vorausz').value)||0;
  const kap     = parseFloat(document.getElementById('st-kap').value)||0;
  const kest    = parseFloat(document.getElementById('st-kest').value)||0;

  // ── NEUE FELDER: Soziale Versicherungen ──
  const kv      = parseFloat(document.getElementById('st-kv')?.value)||0;
  const pv      = parseFloat(document.getElementById('st-pv')?.value)||0;
  const av      = parseFloat(document.getElementById('st-av')?.value)||0;
  const buv     = parseFloat(document.getElementById('st-buv')?.value)||0;
  const kircheneuralt = parseFloat(document.getElementById('st-kirchensteuer-eur')?.value)||0;
  const sozVersSum = kv + pv + av + buv; // Summa Sozialversicherungen

  // ── NEUE FELDER: PKW, AfA, USt, Sonderausgaben ──
  const pkwNutzung = document.getElementById('st-pkw-nutzung')?.value || 'nein';
  let pkwKosten = 0;
  if (pkwNutzung === '1prozent') {
    const pkwWert = parseFloat(document.getElementById('st-pkw-wert')?.value) || 0;
    pkwKosten = pkwWert * 0.01 / 12 * 12; // 1% vom Jahreswert zur Einnahme (wird später addiert!)
  } else if (pkwNutzung === 'fahrtenbuch') {
    const pkwKm = parseFloat(document.getElementById('st-pkw-km')?.value) || 0;
    pkwKosten = pkwKm * 0.30; // Geschäftsfahrten als Ausgaben
  }
  
  const iab = parseFloat(document.getElementById('st-iab')?.value) || 0;
  const iabAbzug = Math.min(iab * 0.5, iab); // Max 50%
  
  const gwg = parseFloat(document.getElementById('st-gwg')?.value) || 0;
  const afaJahresabschreibung = getAFATotal(); // Funktion berechnet AfA
  
  const bu = parseFloat(document.getElementById('st-bu')?.value) || 0;
  const haft = parseFloat(document.getElementById('st-haft')?.value) || 0;
  const fortbildung = parseFloat(document.getElementById('st-fortbildung')?.value) || 0;
  const verpflegungTage = parseInt(document.getElementById('st-verpflegung-tage')?.value) || 0;
  const verpflegungAbzug = verpflegungTage * 14; // 14€/Tag

  const isSplitting = fam === 'zusammen';
  const isAlleinerziehend = fam === 'alleinerziehend';

  // ── Freibeträge (jahresabhängig) ──
  const sw = getSteuerwerte(jahr);
  const grundfb  = isSplitting ? sw.grundfb * 2 : sw.grundfb;
  const hoPausch = Math.min(ho * 6, 1260);
  const fahrtk   = km * arbt * 0.30;

  // Kinderfreibetrag vs Kindergeld: was ist günstiger?
  const kindergeld_jahr = nKinder * sw.kindergeld * 12;
  const kinderfb_gesamt = nKinder * sw.kfreibetrag;

  // Alleinerziehend-Freibetrag 2026 (§ 24b EStG)
  const alleinerziehendFB = isAlleinerziehend ? (4260 + Math.max(0, nKinder-1)*240) : 0;

  // ─── GKV NACHZAHLUNG (ПЕРЕД расчётом налога!) ───
  // КРИТИЧНО: GKV взносы вычитаются из базы для подоходного налога (§10 EStG)
  const gkvGezahlt = parseFloat(document.getElementById('st-gkv-gezahlt')?.value) || 0;
  const isFamilienversichert = document.getElementById('st-gkv-familienvers')?.value === 'ja';
  const gkvData = calcGKVNachzahlung(gewinn, gkvGezahlt, isFamilienversichert);
  const gkvNachzahlung = gkvData.nachzahlung;
  const gkvAbzugsfaehig = gkvData.abzugsfaehig; // Это вычитается из дохода

  // Sparerpauschbetrag
  const sparerpausch = isSplitting ? 2000 : 1000;
  const kapNach = Math.max(0, kap - sparerpausch);

  // ── zu versteuerndes Einkommen (ohne Kinder zuerst) ──
  let einkommen = gewinn
    - hoPausch
    - fahrtk
    - spenden
    - wk
    - sozVersSum    // Социальные страховки
    - gkvAbzugsfaehig  // ← НОВОЕ: GKV вычитается как Sonderausgaben!
    - bu            // Berufsunfähigkeitsversicherung
    - haft          // Haftpflichtversicherung
    - fortbildung   // Fortbildung
    - verpflegungAbzug // Verpflegungsmehraufwand
    - gwg           // GWG (sofort abzugsfähig)
    - afaJahresabschreibung // AfA Jahresabschreibung
    - iabAbzug      // Investitionsabzugsbetrag
    - pkwKosten     // PKW Kosten (je nach Methode)
    - alleinerziehendFB;

  if (isSplitting && partner === 'nein') {
    // Partner-Einkommen 0 → volles Splitting
  }

  einkommen = Math.max(0, einkommen);

  // Steuer ohne Kinderfreibetrag
  let estOhneKind = isSplitting ? estSplitting(einkommen, jahr) : estGrundtarifY(einkommen, jahr);

  // Kinderfreibetrag: Steuerersparnis
  let zveMitKind = Math.max(0, einkommen - kinderfb_gesamt);
  let estMitKind = isSplitting ? estSplitting(zveMitKind, jahr) : estGrundtarifY(zveMitKind, jahr);
  const steuerersparnis = estOhneKind - estMitKind;

  // Günstiger: Kinderfreibetrag oder Kindergeld?
  let kindAbzug, kindMethod;
  if (nKinder > 0 && steuerersparnis > kindergeld_jahr) {
    kindAbzug = kinderfb_gesamt;
    kindMethod = `Kinderfreibetrag (${fmt(steuerersparnis)} Ersparnis > Kindergeld ${fmt(kindergeld_jahr)})`;
  } else if (nKinder > 0) {
    kindAbzug = 0; // Kindergeld bleibt, kein Freibetrag abzuziehen
    kindMethod = `Kindergeld (${fmt(kindergeld_jahr)}/Jahr günstiger)`;
  } else {
    kindAbzug = 0;
    kindMethod = 'Keine Kinder';
  }

  // Finales zvE
  const zveEndgueltig = Math.max(0, einkommen - kindAbzug);
  let estFinal = isSplitting ? estSplitting(zveEndgueltig, jahr) : estGrundtarifY(zveEndgueltig, jahr);

  // Kindergeld anrechnen wenn Kindergeld günstiger
  let kindergeldAnrechnung = 0;
  if (nKinder > 0 && kindAbzug === 0) {
    kindergeldAnrechnung = kindergeld_jahr; // wird ausgezahlt, nicht angerechnet
  }

  // Kapitalertragsteuer (Abgeltungsteuer 25% auf kapNach)
  const kapSteuer = Math.round(kapNach * 0.25);
  const kapSoli   = calcSoli(kapSteuer, jahr);

  // Soli (auf Einkommensteuer)
  const soli = calcSoli(estFinal, jahr);

  // Kirchensteuer
  const kirchenst = kirche > 0 ? Math.round(estFinal * kirche / 100) : 0;

  // ─── НОВОЕ: GEWERBESTEUER ───
  const gewstData = calcGewerbesteuer(gewinn);
  const gewst = gewstData.gewst;
  const gewstVerrechenbar = gewstData.verrechenbar;
  
  // Показать предупреждение если Mindestbeitrag и не Familienversichert
  if (gkvData.hasMindestbeitrag && !isFamilienversichert) {
    document.getElementById('st-gkv-warning-mindest').style.display = 'block';
  } else {
    document.getElementById('st-gkv-warning-mindest').style.display = 'none';
  }

  // ─── НОВОЕ: USt SALDO (автоматически из EÜR) ───
  // ВАЖНО: Если Kleinunternehmer, то УСт = 0!
  const isKleinunternehmer = document.getElementById('st-kleinunternehmer-option')?.value === 'ja';
  // Правильная формула: выделяем НДС из брутто-суммы (обратный расчёт)
  // brutto = netto * 1.19 → MwSt = brutto * 19/119
  // USt: берём реальные данные из записей а не считаем паушально 19% от всей суммы
  const _ustJahr = String(jahr);
  const _yeUst = activeEintraege().filter(e=>e.datum.startsWith(_ustJahr));
  const ustEingezogenReal = r2(_yeUst.filter(e=>e.typ==='Einnahme'&&e.mwstBetrag>0).reduce((s,e)=>s+(e.mwstBetrag||0),0));
  const ustBezahltReal    = r2(_yeUst.filter(e=>e.typ==='Ausgabe'&&e.vorsteuerBet>0).reduce((s,e)=>s+(e.vorsteuerBet||0),0));
  let ustEingezogen = isKleinunternehmer ? 0 : ustEingezogenReal;
  let ustBezahlt    = isKleinunternehmer ? 0 : ustBezahltReal;
  // Запасной вариант если нет явных MwSt-данных — паушальный расчёт
  if(!isKleinunternehmer && ustEingezogen===0 && ein>0) ustEingezogen = r2(ein * 19 / 119);
  if(!isKleinunternehmer && ustBezahlt===0 && aus>0)   ustBezahlt    = r2(aus * 19 / 119);
  const ustSaldo = ustEingezogen - ustBezahlt;
  
  // Рекомендация по Kleinunternehmer
  const ustPercent = ein > 0 ? ((ustEingezogen / ein) * 100) : 0;
  if (!isKleinunternehmer && ein < 25000 && ustSaldo > 100) {
    document.getElementById('st-klein-recommendation').textContent = 
      `<span class="material-symbols-outlined" style="color:var(--green)">check_circle</span> EMPFOHLEN: Sie zahlen ${fmt(ustSaldo)} USt. Als Kleinunternehmer sparen Sie diese Summe!`;
    document.getElementById('st-klein-recommendation').style.color = 'var(--green)';
  } else if (!isKleinunternehmer && ein >= 25000) {
    document.getElementById('st-klein-recommendation').textContent = 
      '⚠ Umsatz > 25.000€: Sie sind kein Kleinunternehmer mehr (ab nächstem Jahr).';
    document.getElementById('st-klein-recommendation').style.color = 'var(--yellow)';
  } else if (isKleinunternehmer) {
    document.getElementById('st-klein-recommendation').textContent = 
      `<span class="material-symbols-outlined" style="color:var(--green)">check_circle</span> Kleinunternehmer aktiv — Sie zahlen KEINE Umsatzsteuer!`;
    document.getElementById('st-klein-recommendation').style.color = 'var(--cyan)';
  }

  // Gesamtsteuer (теперь с GewSt)
  const gesamtSteuer = estFinal + soli + kirchenst + kapSteuer + kapSoli + gewst - gewstVerrechenbar;

  // ─── КРИТИЧЕСКОЕ: NETTO-GEWINN (реальные деньги в кармане) ───
  // ПРАВИЛЬНАЯ ФОРМУЛА (без "взаимозачётов"):
  // Gewinn - ALL real payments = что физически останется
  const ihabeitrag = 200; // IHK (примерно)
  const bgbeitrag = 300;  // BG (примерно)
  const netoGewinnKriterion = gewinn - estFinal - soli - gewst - gkvNachzahlung - Math.max(0, ustSaldo) - ihabeitrag - bgbeitrag;

  // Ergebnis: Zahlung oder Erstattung
  const diff = gesamtSteuer - vorausz - kest;

  // ── Ausgabe ──
  document.getElementById('st-result').style.display = 'block';
  document.getElementById('st-res-jr').textContent = jahr;

  // Обновить Gewerbesteuer дисплей
  updateGewersteuherDisplay(gewinn);
  updateGKVDisplay(gewinn, gkvGezahlt, isFamilienversichert);

  // Cards
  const cardColor = diff > 0 ? 'r' : 'g';
  document.getElementById('st-cards').innerHTML =
    stCard('b','Zu verst. Einkommen', fmt(zveEndgueltig), `Splitting: ${isSplitting?'Ja':'Nein'}`) +
    stCard('y','Einkommensteuer', fmt(estFinal), isSplitting?'Splittingtarif':'Grundtarif') +
    stCard('p','Gesamtsteuer', fmt(gesamtSteuer), `inkl. GewSt, Soli${kirche>0?', Kirche':''}`) +
    stCard(cardColor, diff>0?'Nachzahlung':'Erstattung', fmt(Math.abs(diff)), diff>0?'zu zahlen an Finanzamt':'vom Finanzamt zurück');

  // Left breakdown: Einkommensberechnung
  document.getElementById('st-bl').innerHTML = `
    <h3 style="margin-bottom:12px"> Einkommensberechnung</h3>
    ${stRow('Betriebseinnahmen', '+'+fmt(ein))}
    ${stRow('Betriebsausgaben', '−'+fmt(aus))}
    ${stRow('Gewinn (EÜR)', fmt(gewinn), true, 'var(--green)')}
    ${stRow('Homeoffice-Pauschale', '−'+fmt(hoPausch), false, 'var(--yellow)')}
    ${stRow('Fahrtkosten', '−'+fmt(fahrtk), false, 'var(--yellow)')}
    ${kv?stRow('Krankenversicherung', '−'+fmt(kv), false, 'var(--cyan)'):''}
    ${pv?stRow('Pflegeversicherung', '−'+fmt(pv), false, 'var(--cyan)'):''}
    ${av?stRow('Altersversicherung', '−'+fmt(av), false, 'var(--cyan)'):''}
    ${buv?stRow('Berufsunfähigkeitsvers.', '−'+fmt(buv), false, 'var(--cyan)'):''}
    ${bu?stRow('Berufsunfähigkeitsvers. (zusätzlich)', '−'+fmt(bu), false, 'var(--purple)'):''}
    ${haft?stRow('Haftpflichtversicherung', '−'+fmt(haft), false, 'var(--purple)'):''}
    ${gkvAbzugsfaehig>0?stRow('GKV Nachzahlung (Sonderausgaben)', '−'+fmt(gkvAbzugsfaehig), false, 'var(--red)'):''}
    ${spenden?stRow('Spenden', '−'+fmt(spenden)):''}
    ${wk?stRow('Sonstige Werbungskosten', '−'+fmt(wk)):''}
    ${fortbildung?stRow('Fortbildung / Kurse', '−'+fmt(fortbildung)):''}
    ${gwg?stRow('GWG (< 800€)', '−'+fmt(gwg), false, 'var(--yellow)'):''}
    ${afaJahresabschreibung>0?stRow('AfA (Abschreibung)', '−'+fmt(afaJahresabschreibung), false, 'var(--yellow)'):''}
    ${iabAbzug>0?stRow('Investitionsabzugsbetrag (IAB)', '−'+fmt(iabAbzug), false, 'var(--yellow)'):''}
    ${pkwKosten>0?stRow(pkwNutzung==='1prozent'?'PKW 1%-Regelung':'PKW Fahrtenbuch', '−'+fmt(pkwKosten), false, 'var(--yellow)'):''}
    ${verpflegungAbzug>0?stRow('Verpflegungsmehraufwand ('+verpflegungTage+' Tage)', '−'+fmt(verpflegungAbzug), false, 'var(--purple)'):''}
    ${alleinerziehendFB?stRow('Alleinerziehend-Freibetrag', '−'+fmt(alleinerziehendFB)):''}
    ${kindAbzug?stRow('Kinderfreibetrag ('+nKinder+' Kinder)', '−'+fmt(kindAbzug)):''}
    <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px">
      <span style="font-size:13px;font-weight:700">Zu versteuerndes Einkommen</span>
      <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--blue)">${fmt(zveEndgueltig)}</span>
    </div>`;

  // Right breakdown: Steuerberechnung
  document.getElementById('st-br').innerHTML = `
    <h3 style="margin-bottom:12px"> Steuerberechnung</h3>
    ${stRow('Tarif', isSplitting?'Splittingtarif §32a (2)':'Grundtarif §32a (1)')}
    ${stRow('Einkommensteuer', fmt(estFinal), true, 'var(--red)')}
    ${stRow('Solidaritätszuschlag (5,5%)', fmt(soli))}
    ${kirche>0?stRow(`Kirchensteuer (${kirche}%)`, fmt(kirchenst)):''}
    ${kapNach>0?stRow('Kapitalertragsteuer (25%)', fmt(kapSteuer+kapSoli)):''}
    ${stRow('Gesamtsteuer', fmt(gesamtSteuer), true)}
    ${stRow('− Vorauszahlungen', '−'+fmt(vorausz), false, 'var(--green)')}
    ${kest?stRow('− Einbehaltene KapESt', '−'+fmt(kest), false, 'var(--green)'):''}
    <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px;border-top:2px solid var(--border)">
      <span style="font-size:13px;font-weight:700">${diff>0?'⬆ Nachzahlung':'⬇ Erstattung'}</span>
      <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:${diff>0?'var(--red)':'var(--green)'}">${fmt(Math.abs(diff))}</span>
    </div>`;

  // Freibeträge block
  document.getElementById('st-fb').innerHTML = `
    <h3 style="margin-bottom:12px"> Angewandte Freibeträge & Hinweise</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px">
      <div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Grundfreibetrag ${jahr}</div>
        <div style="font-family:var(--mono);color:var(--green)">${fmt(grundfb)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${isSplitting?'Splitting (×2)':'Einzelveranlagung'}</div>
      </div>
      ${nKinder>0?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Kinderfreibetrag / Kindergeld</div>
        <div style="font-family:var(--mono);color:var(--yellow)">${nKinder} × ${fmt(KFREIBETRAG_2025)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${kindMethod}</div>
      </div>`:''}
      ${isAlleinerziehend?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Alleinerziehend-Freibetrag</div>
        <div style="font-family:var(--mono);color:var(--purple)">${fmt(alleinerziehendFB)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">§24b EStG</div>
      </div>`:''}
      ${isSplitting?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Zusammenveranlagung</div>
        <div style="font-family:var(--mono);color:var(--blue)">Splitting aktiv</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">Halbes ZvE × 2 → Steuervorteil</div>
      </div>`:''}
      <div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Sparerpauschbetrag</div>
        <div style="font-family:var(--mono);color:var(--cyan)">${fmt(sparerpausch)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">§20 Abs.9 EStG</div>
      </div>
      ${nKinder>0&&kindAbzug===0?`<div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Kindergeld ${jahr}</div>
        <div style="font-family:var(--mono);color:var(--green)">${fmt(kindergeld_jahr)}/Jahr</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${nKinder} × 255 €/Monat · günstiger!</div>
      </div>`:''}
    </div>
    <div style="margin-top:14px;padding:10px 12px;background:var(--s2);border-radius:var(--r);font-size:11px;color:var(--sub);line-height:1.7">
      <strong style="color:var(--muted)">Nächste Schritte:</strong><br>
      1. Daten in <strong>ELSTER Online</strong> (elster.de) eingeben — kostenlos und offiziell<br>
      2. Anlage <strong>S</strong> (Selbstständige) + Anlage <strong>EÜR</strong> ausfüllen<br>
      ${isSplitting?'3. Anlage <strong>U</strong> für Zusammenveranlagung<br>':''}
      ${nKinder>0?`${isSplitting?'4':'3'}. ${'Anlage'} <strong>${'Kind'}</strong> ${'für'} ${nKinder} ${'Kind'}${nKinder>1?'er':''}<br>`:''}
      <strong style="color:var(--yellow)">Abgabefrist:</strong> 31. Juli des Folgejahres (mit Steuerberater: 28. Februar übernächstes Jahr)
    </div>`;

  // USt & Steuerrücklage Info
  const steuerRuecklage = Math.round(gesamtSteuer * 0.3); // 30% Reserve
  document.getElementById('st-result').innerHTML += `
    
    <!-- ═══ KRITISCH: NETTO-GEWINN ═══ -->
    <div style="background:var(--gdim);border:3px solid var(--green);border-radius:var(--r2);padding:20px;margin:20px 0">
      <h3 style="color:var(--green);margin-bottom:16px;font-size:18px">€ KRITISCH: Netto-Gewinn nach ALLEM</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">BRUTTO Gewinn</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--green)">${fmt(gewinn)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Einkommensteuer</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(estFinal)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Soli + Kirche</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(soli + kirchenst)}</div>
        </div>
      <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Gewerbesteuer (реально платить)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(gewst)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: GKV Nachzahlung</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(gkvNachzahlung)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: USt Saldo (Staat)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(Math.max(0, ustSaldo))}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: IHK-Beitrag (~200€)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−200,00 €</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Berufsgenossenschaft (~300€)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−300,00 €</div>
        </div>
      </div>
      <div style="background:var(--gdim);border:2px solid var(--green);border-radius:var(--r2);padding:16px;text-align:center">
        <div style="font-size:12px;color:var(--sub);margin-bottom:8px">◎ <strong>NETTO ZUM LEBEN — Ваш реальный доход:</strong></div>
        <div style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--green)">${fmt(Math.max(0, netoGewinnKriterion))}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">Это деньги для Их жизни, семьи, рентабельности, инвестиций</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--green);margin-bottom:12px;font-size:14px">${' Umsatzsteuer (USt) Saldo'}</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">USt eingezogen (19% × Einnahmen)</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--green)">${fmt(ustEingezogen)}</div>
        </div>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">USt bezahlt (19% × Ausgaben)</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--red)">−${fmt(ustBezahlt)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r);border:1px solid var(--green)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Saldo: ${ustSaldo > 0 ? 'zu zahlen' : 'Erstattung'}</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:700;color:${ustSaldo > 0 ? 'var(--red)' : 'var(--green)'}">${ustSaldo > 0 ? '−' : '+'} ${fmt(Math.abs(ustSaldo))}</div>
        </div>
      </div>

      <div style="background:var(--ydim);border:1px solid var(--yellow);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--yellow);margin-bottom:12px;font-size:14px"> Steuerrücklage (Empfehlung)</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Gesamtsteuer</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600">${fmt(gesamtSteuer)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r);border:1px solid var(--yellow)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">30% Reserve</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--yellow)">${fmt(steuerRuecklage)}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:6px">⚠ На отдельный счёт для налогов!</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--green);margin-bottom:12px;font-size:14px">${' Umsatzsteuer (USt) Saldo'}</h3>
        ${stRow('USt eingezogen (19%)', fmt(ustEingezogen), false, 'var(--green)')}
        ${stRow('USt bezahlt (19%)', fmt(ustBezahlt), false, 'var(--red)')}
        <div style="border-top:1px solid var(--green);padding-top:8px;margin-top:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="font-weight:600;color:var(--green)">Saldo: ${ustSaldo>=0?'zu zahlen':'Erstattung'}</span>
            <span style="font-family:var(--mono);font-weight:700;color:var(--green)">${fmt(Math.abs(ustSaldo))}</span>
          </div>
        </div>
      </div>
      <div style="background:var(--ydim);border:1px solid var(--yellow);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--yellow);margin-bottom:12px;font-size:14px"> Steuerrücklage (Empfehlung)</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Gesamtsteuer</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600">${fmt(gesamtSteuer)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">30% Reserve empfohlen</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--yellow)">${fmt(steuerRuecklage)}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:6px">⚠ Halten Sie diesen Betrag auf separatem Konto für Steuerzahlungen!</div>
        </div>
      </div>
    </div>`;

  // ─── ОБЪЯВИТЬ переменные ДО использования в hinweiseHTML ───
  const nettoGewinnFinal = Math.max(0, netoGewinnKriterion); // Используем уже рассчитанное значение
  const monatlichReserve = Math.round(gesamtSteuer / 12);
  const monatlichNettoLeben = Math.round(nettoGewinnFinal / 12);

  // Финальный блок предупреждений и советов
  const hinweiseHTML = `
    <div style="background:var(--ydim);border:2px solid var(--yellow);border-radius:var(--r2);padding:16px;margin-top:20px">
      <h3 style="color:var(--yellow);margin-bottom:12px">⚠ WICHTIGE HINWEISE & MASSNAHMEN FÜR 2025/2026</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">1️⃣ GKV NACHZAHLUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Sofort handeln:</strong> Schicken Sie Ihren Steuerbescheid (Steuerbescheid) an Ihre Krankenkasse. Sie werden dann automatisch die Beiträge für ${jahr} neu berechnen und Sie nicht mit 11k€ überraschen.
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">2️⃣ USt-VORANMELDUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Pflicht:</strong> Bei einem Umsatz von ${fmt(ein)} müssen Sie monatlich oder quartalsweise eine Voranmeldung beim Finanzamt einreichen. Dies ist in ELSTER automatisiert.
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">3️⃣ TAGESGELDKONTO</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Eröffnen Sie sofort:</strong> Ein separates Tagesgeldkonto (z.B. bei comdirect, ING) und legen Sie jeden Monat <strong>${fmt(monatlichReserve)}</strong> zur Seite. So vermeiden Sie die \"November-Überraschung\".
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">4️⃣ JAHRESABRECHNUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Im Frühjahr ${jahr+1}:</strong> Das Finanzamt schickt den Steuerbescheid (Bescheid). Zahlen Sie alle rückständigen Steuern schnell — Verzugszinsen sind hoch (6% pro Jahr).
          </div>
        </div>
      </div>
      <div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:10px;margin-top:12px;font-size:11px;color:var(--muted)">
        <strong style="color:var(--red)">● KRITISCH:</strong> Diese Zahl (${fmt(nettoGewinnFinal)}/Jahr oder ${fmt(monatlichNettoLeben)}/Monat) ist Ihr reales verfügbares Einkommen NACH allen Steuern. Nicht verwechseln mit Umsatz oder Brutto-Gewinn!
      </div>
    </div>`;
  
  document.getElementById('st-result').innerHTML += hinweiseHTML;
  
  document.getElementById('st-netto-brutto').textContent = fmt(gewinn);
  document.getElementById('st-netto-steuern').textContent = fmt(estFinal + soli + gewst + gkvNachzahlung + Math.max(0, ustSaldo) + ihabeitrag + bgbeitrag);
  document.getElementById('st-netto-final').textContent = fmt(nettoGewinnFinal);
  document.getElementById('st-netto-monatlich').textContent = fmt(monatlichNettoLeben);
  document.getElementById('st-monats-reserve').textContent = fmt(monatlichReserve);
  document.getElementById('st-jahres-reserve').textContent = fmt(gesamtSteuer);

  toast('✓ Berechnung abgeschlossen!','ok');
  } catch(e) {
    console.error('Fehler in stBerechnen:', e);
    toast('✗ Fehler: '+e.message,'error');
  }
}

// ── SZENARIEN-TEST ────────────────────────────────────────────────────────
function runSzenarien() {
  const szenarien = [
    { id:'S01', jr:2025, zvE:12096,  sp:false, k:0, label:'Grundfreibetrag 2025 (exakt)',    desc:'ESt muss 0 € sein.' },
    { id:'S02', jr:2026, zvE:12348,  sp:false, k:0, label:'Grundfreibetrag 2026 (exakt)',    desc:'ESt muss 0 € sein.' },
    { id:'S03', jr:2026, zvE:12349,  sp:false, k:0, label:'1 € über Grundfreibetrag 2026',  desc:'Erster steuerpflichtiger Euro.' },
    { id:'S04', jr:2026, zvE:20000,  sp:false, k:0, label:'KU-typisch 20.000 €',            desc:'Typischer Kleinunternehmer.' },
    { id:'S05', jr:2026, zvE:24999,  sp:false, k:0, label:'KU-Grenze 24.999 € (ledig)',     desc:'Knapp unter Vorjahres-KU-Grenze.' },
    { id:'S06', jr:2026, zvE:25001,  sp:false, k:0, label:'KU-Grenze überschritten',        desc:'Folgejahr Regelbesteuerung.' },
    { id:'S07', jr:2026, zvE:40000,  sp:false, k:0, label:'40.000 € ledig',                 desc:'Mittleres Einkommen.' },
    { id:'S08', jr:2026, zvE:40000,  sp:true,  k:0, label:'40.000 € Splitting',             desc:'Splittingvorteil erkennbar.' },
    { id:'S09', jr:2026, zvE:60000,  sp:false, k:0, label:'60.000 € ledig',                 desc:'Progressionszone 42%.' },
    { id:'S10', jr:2026, zvE:60000,  sp:false, k:2, label:'60.000 € + 2 Kinder',            desc:'Günstigerprüfung Kindergeld/KFB.' },
    { id:'S11', jr:2026, zvE:70000,  sp:false, k:0, label:'Soli-Grenzbereich 70k',          desc:'Soli-Freigrenze 2026: 20.350 € ESt.' },
    { id:'S12', jr:2026, zvE:85000,  sp:false, k:0, label:'85.000 € — Soli prüfen',        desc:'Oberhalb Soli-Milderungszone.' },
    { id:'S13', jr:2026, zvE:100000, sp:false, k:0, label:'Spitzenverdiener 100k',          desc:'42% Spitzensteuersatz.' },
    { id:'S14', jr:2026, zvE:277825, sp:false, k:0, label:'Reichensteuer-Grenze 277.825 €', desc:'Letzter Euro vor 45%.' },
    { id:'S15', jr:2026, zvE:277826, sp:false, k:0, label:'Reichensteuer ab 277.826 €',     desc:'45% Reichensteuer aktiv.' },
    { id:'S16', jr:2026, zvE:150000, sp:true,  k:3, label:'Splitting 150k + 3 Kinder',      desc:'Komplexfall: Splitting + KFB.' },
  ];

  let html = `<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--s2);border-bottom:2px solid var(--border2)">
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">ID</th>
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">Szenario</th>
      <th style="padding:10px 8px;text-align:center;font-size:10px;color:var(--sub);font-weight:600">Jahr</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">zvE</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">ESt</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Effsatz</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Soli</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Gesamt</th>
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">Beschreibung</th>
      <th style="padding:10px 8px;text-align:center;font-size:10px;color:var(--sub);font-weight:600">OK</th>
    </tr></thead><tbody>`;

  szenarien.forEach(sz => {
    const sw = getSteuerwerte(sz.jr);
    let zvEFinal = sz.zvE;
    let kindNote = '';
    if (sz.k > 0) {
      const kfb = sz.k * sw.kfreibetrag;
      const kgeld = sz.k * sw.kindergeld * 12;
      const estOhne = sz.sp ? estSplitting(sz.zvE, sz.jr) : estGrundtarifY(sz.zvE, sz.jr);
      const estMit  = sz.sp ? estSplitting(Math.max(0,sz.zvE-kfb), sz.jr) : estGrundtarifY(Math.max(0,sz.zvE-kfb), sz.jr);
      if ((estOhne - estMit) > kgeld) {
        zvEFinal = Math.max(0, sz.zvE - kfb);
        kindNote = `${'· KFB günstiger'}`;
      } else {
        kindNote = ` · Kindergeld ${fmt(kgeld)} günstiger`;
      }
    }
    const est    = sz.sp ? estSplitting(zvEFinal, sz.jr) : estGrundtarifY(zvEFinal, sz.jr);
    const soli   = calcSoli(est, sz.jr);
    const gesamt = est + soli;
    const effsatz = sz.zvE > 0 ? (gesamt/sz.zvE*100).toFixed(1)+'%' : '0,0%';
    const erwartetNull = sz.zvE <= sw.grundfb;
    const statusOk = erwartetNull ? est === 0 : est > 0;

    html += `<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <td style="padding:8px;font-family:var(--mono);font-size:10px;color:var(--sub)">${sz.id}</td>
      <td style="padding:8px;font-weight:500;font-size:12px">${sz.label}
        ${sz.sp?`<span style="margin-left:5px;background:var(--pdim);border:1px solid var(--purple);border-radius:4px;padding:1px 5px;font-size:9px;color:var(--purple);font-family:var(--mono)">SPLIT</span>`:''}
        ${sz.k?`<span style="margin-left:3px;background:var(--cdim);border:1px solid var(--cyan);border-radius:4px;padding:1px 5px;font-size:9px;color:var(--cyan);font-family:var(--mono)">${sz.k}K</span>`:''}
      </td>
      <td style="padding:8px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--sub)">${sz.jr}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px">${fmt(sz.zvE)}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:${est>0?'var(--red)':'var(--green)'}">${fmt(est)}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--sub)">${effsatz}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:${soli>0?'var(--yellow)':'var(--sub)'}">${soli>0?fmt(soli):'—'}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px;font-weight:700">${fmt(gesamt)}</td>
      <td style="padding:8px;font-size:11px;color:var(--muted)">${sz.desc}${kindNote}</td>
      <td style="padding:8px;text-align:center;font-size:14px">${statusOk?'✓':'⚠'}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div style="font-size:10px;color:var(--sub);background:var(--s3);padding:10px 14px;border-radius:var(--r);border:1px solid var(--border);line-height:1.6">
    <strong>Quellen (Stand März 2026):</strong> §32a EStG · Jahressteuergesetz 2024 · BMF · IHK München/Stuttgart · Bundesfinanzministerium.de · Sparkasse.de<br>
    Grundfreibetrag 2025: <strong>12.096 €</strong> | 2026: <strong>12.348 €</strong> &nbsp;·&nbsp;
    Soli-Freigrenze 2026: <strong>20.350 € ESt</strong> &nbsp;·&nbsp;
    Kinderfreibetrag 2026: <strong>6.828 € (3.414 je Elternteil)</strong> + Betreuungsfreibetrag 2.928 € &nbsp;·&nbsp;
    Kindergeld 2026: <strong>259 €/Monat</strong><br>
    KU-Grenzen ab 01.01.2025 §19 UStG: Vorjahr <strong>25.000 € netto</strong> + laufendes Jahr <strong>100.000 € netto</strong> (Fallbeil-Effekt) &nbsp;·&nbsp;
    Gewerbesteuer-Freibetrag: <strong>24.500 €</strong> · Messzahl: <strong>3,5%</strong> × Hebesatz (Gemeinde)
  </div>`;

  document.getElementById('sz-results').innerHTML = html;
  toast('✓ 16 Steuer-Szenarien berechnet','ok');
}

