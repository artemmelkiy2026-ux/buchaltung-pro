// ══════════════════════════════════════════════════════════════════
// BON-SCANNER — через Vercel API (ключ скрыт на сервере)
// Фото → /api/bon-scan → Claude Vision → форма
// ══════════════════════════════════════════════════════════════════

const KA_SCAN = [
  'Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten',
  'Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung',
  'Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen',
  'Bewirtung','Sonstiges Ausgabe'
];

// ── Промпт ────────────────────────────────────────────────────────
function buildBonPrompt(ustMode) {
  const isMwSt = ustMode === 'MwSt';
  const today = new Date().toISOString().split('T')[0];
  return 'Du bist ein Buchhalter-Assistent. Analysiere das Foto eines Kassenbons.\n\nAntworte NUR mit einem JSON-Objekt:\n{"datum":"YYYY-MM-DD","betrag":0.00,"zahlungsart":"EC-Karte","laden":"Geschaeftsname","positionen":"Artikel1 x Preis · Artikel2","kategorie":"Kategorie","mwst_19":0.00,"mwst_7":0.00,"netto":0.00}\n\nRegeln:\n- datum: Datum YYYY-MM-DD, wenn nicht lesbar: ' + today + '\n- betrag: Gesamtbetrag Brutto (suche SUMME/GESAMT/TOTAL)\n- zahlungsart: EC-Karte / Barzahlung / PayPal / Sonstiges\n- laden: Geschaeftsname (meist erste Zeile)\n- positionen: Artikel kompakt getrennt durch " · "\n- kategorie genau eine aus: Hardware / Sonstiges Ausgabe / Büromaterial / Software / IT / Fahrtkosten / Miete / Büro / Marketing / Werbung / Fortbildung / Versicherung / Telefon / Internet / Fremdleistungen / Bankgebühren / Steuern / Abgaben / Bewirtung\n  Hardware=Werkzeug/Geraete, Sonstiges Ausgabe=Baumaterial/Glas/Schrauben/Baumarkt, Fahrtkosten=Tankstelle/Diesel, Bewirtung=Restaurant/Cafe\n' + (isMwSt ? '- mwst_19/mwst_7: MwSt-Betraege vom Bon\n- netto: Netto-Gesamtbetrag' : '- mwst_19: 0\n- mwst_7: 0\n- netto: gleich betrag') + '\n\nNur JSON, kein anderer Text.';
}

// ── State ─────────────────────────────────────────────────────────
let _bonImageBase64  = null;
let _bonImageType    = null;
let _bonResult       = null;

// ── Init ──────────────────────────────────────────────────────────
function openBonScanner() {
  const sel = document.getElementById('bon-res-kat');
  if (sel && !sel.options.length)
    sel.innerHTML = KA_SCAN.map(k => '<option value="' + k + '">' + k + '</option>').join('');
}
function closeBonScanner() { resetBonScanner(); }

// ── Обработка файла ───────────────────────────────────────────────
function handleBonFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    _bonImageBase64 = dataUrl.split(',')[1];
    _bonImageType   = file.type || 'image/jpeg';
    document.getElementById('bon-preview-img').src = dataUrl;
    document.getElementById('bon-preview-wrap').style.display = '';
    document.getElementById('bon-drop-zone').style.display = 'none';
    document.getElementById('bon-scan-start-btn').style.display = '';
  };
  reader.readAsDataURL(file);
}

function handleBonDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleBonFile({target:{files:[file]}});
}

// ── Сброс ─────────────────────────────────────────────────────────
function resetBonScanner() {
  _bonImageBase64 = null;
  _bonImageType   = null;
  _bonResult      = null;
  ['bon-preview-wrap','bon-step-result','bon-result','bon-error','bon-scan-start-btn']
    .forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
  ['bon-step-upload','bon-drop-zone']
    .forEach(id => { const el = document.getElementById(id); if(el) el.style.display = ''; });
  const fi = document.getElementById('bon-file-input');
  if (fi) fi.value = '';
  setBonStatus('🔍 Beleg wird analysiert…');
}

// ── Сканирование через Vercel API ─────────────────────────────────
async function startBonScan() {
  if (!_bonImageBase64) return;

  const yr = new Date().getFullYear().toString();
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
    ? (data.ustModeByYear[yr] || '§19') : '§19';

  document.getElementById('bon-step-upload').style.display = 'none';
  document.getElementById('bon-step-result').style.display = '';
  document.getElementById('bon-loading').style.display = '';
  document.getElementById('bon-result').style.display = 'none';
  document.getElementById('bon-error').style.display = 'none';
  setBonStatus('🔍 Beleg wird analysiert…');

  try {
    const response = await fetch('/api/bon-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: _bonImageBase64,
        image_type:   _bonImageType || 'image/jpeg',
        prompt:       buildBonPrompt(ustMode),
      })
    });

    const resp = await response.json();
    if (!response.ok || resp.error) throw new Error(resp.error || 'HTTP ' + response.status);

    const text  = resp.result || '';
    const clean = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);
    _bonResult = parsed;
    showBonResult(parsed, ustMode);

  } catch(err) {
    document.getElementById('bon-loading').style.display = 'none';
    document.getElementById('bon-error').style.display = '';
    let msg = err.message || 'Unbekannter Fehler';
    if (msg.includes('401') || msg.includes('403')) msg = 'Zugriff verweigert.';
    if (msg.includes('429')) msg = 'Zu viele Anfragen — bitte warten.';
    if (msg.includes('konfiguriert')) msg = 'API-Schlüssel in Vercel nicht gesetzt. Bitte in Vercel → Settings → Environment Variables eintragen.';
    document.getElementById('bon-error-msg').textContent = msg;
  }
}

function setBonStatus(msg) {
  const el = document.getElementById('bon-loading');
  if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:#6366f1;margin-bottom:8px;display:block"></i><div style="font-size:13px;font-weight:600">' + msg + '</div>';
}

// ── Показать результат ────────────────────────────────────────────
function showBonResult(r, ustMode) {
  document.getElementById('bon-loading').style.display = 'none';
  document.getElementById('bon-result').style.display  = '';
  document.getElementById('bon-res-datum').value  = r.datum || new Date().toISOString().split('T')[0];
  document.getElementById('bon-res-betrag').value = r.betrag ? parseFloat(r.betrag).toFixed(2) : '';
  const matchKat = KA_SCAN.find(k => k === r.kategorie);
  if (matchKat) document.getElementById('bon-res-kat').value = matchKat;
  const zahlMap = {'EC-Karte':'EC-Karte','Barzahlung':'Barzahlung','Bar':'Barzahlung','Überweisung':'Überweisung','PayPal':'PayPal','Lastschrift':'Lastschrift'};
  document.getElementById('bon-res-zahl').value = zahlMap[r.zahlungsart] || 'EC-Karte';
  const datLabel = r.datum ? r.datum.split('-').reverse().join('.') : '';
  document.getElementById('bon-res-beschr').value = 'Bon-Scan · ' + (r.laden || 'Unbekannt') + ' · ' + datLabel;
  document.getElementById('bon-res-notiz').value  = r.positionen || '';
  const mwstDiv = document.getElementById('bon-mwst-info');
  if (ustMode === 'MwSt' && (r.mwst_19 > 0 || r.mwst_7 > 0)) {
    const netto = r.netto || (r.betrag - (r.mwst_19||0) - (r.mwst_7||0));
    mwstDiv.style.display = '';
    mwstDiv.innerHTML =
      '<span style="color:var(--sub)">Netto:</span> <b>' + parseFloat(netto).toFixed(2) + ' €</b>' +
      (r.mwst_19>0 ? '&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 19%:</span> <b>' + r.mwst_19.toFixed(2) + ' €</b>' : '') +
      (r.mwst_7>0  ? '&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 7%:</span> <b>'  + r.mwst_7.toFixed(2)  + ' €</b>' : '') +
      '&nbsp;&nbsp;<span style="color:var(--blue)">→ Vorsteuer wird verbucht</span>';
  } else { mwstDiv.style.display = 'none'; }
}

// ── Übernehmen → форма ────────────────────────────────────────────
function applyBonResult() {
  if (!_bonResult) return;
  const r = _bonResult;
  const yr = (r.datum||'').slice(0,4) || new Date().getFullYear().toString();
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
    ? (data.ustModeByYear[yr] || '§19') : '§19';
  if (typeof setTyp === 'function') setTyp('Ausgabe');
  const datVal = document.getElementById('bon-res-datum').value;
  if (datVal) document.getElementById('nf-dat').value = datVal;
  const betVal = parseFloat(document.getElementById('bon-res-betrag').value);
  if (betVal) document.getElementById('nf-bet').value = betVal.toFixed(2);
  const bonKat = document.getElementById('bon-res-kat').value;
  if (bonKat) document.getElementById('nf-kat').value = bonKat;
  const bonZahl = document.getElementById('bon-res-zahl').value;
  if (bonZahl) document.getElementById('nf-zahl').value = bonZahl;
  document.getElementById('nf-dsc').value  = document.getElementById('bon-res-beschr').value;
  document.getElementById('nf-note').value = document.getElementById('bon-res-notiz').value;
  if (typeof updateMwstFormVisibility === 'function') updateMwstFormVisibility();
  if (ustMode === 'MwSt' && betVal) {
    setTimeout(() => {
      const mwstRow = document.getElementById('nf-mwst-row');
      if (mwstRow && mwstRow.style.display !== 'none') {
        const rateSel = document.getElementById('nf-mwst-rate');
        if (rateSel) rateSel.value = (r.mwst_7>0 && !r.mwst_19) ? '7' : '19';
        if (typeof calcNfMwst === 'function') calcNfMwst();
        if (typeof calcNfVorsteuer === 'function') calcNfVorsteuer();
      }
    }, 100);
  }
  resetBonScanner();
  toast('<i class="fas fa-check-circle" style="color:var(--green)"></i> Bon übernommen — bitte prüfen und speichern', 'ok');
  document.getElementById('nf-dat')?.scrollIntoView({behavior:'smooth', block:'center'});
}
