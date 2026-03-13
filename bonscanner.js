// ══════════════════════════════════════════════════════════════════
// BON-SCANNER — Tesseract.js OCR + Claude Text API
// Фото → OCR текст локально → Claude анализирует текст → форма
// ══════════════════════════════════════════════════════════════════

const KA_SCAN = [
  'Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten',
  'Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung',
  'Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen',
  'Bewirtung','Sonstiges Ausgabe'
];

const ANTHROPIC_API_KEY = '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';

// ── Промпт — принимает OCR текст ─────────────────────────────────
function buildBonPrompt(ocrText, ustMode) {
  const isMwSt = ustMode === 'MwSt';
  const today = new Date().toISOString().split('T')[0];
  return 'Du bist ein Buchhalter-Assistent. Analysiere den folgenden Text eines Kassenbons.\n\nBON-TEXT:\n"""\n' + ocrText + '\n"""\n\nExtrahiere die Daten und antworte NUR mit einem JSON-Objekt:\n\n{"datum":"YYYY-MM-DD","betrag":0.00,"zahlungsart":"EC-Karte","laden":"Geschaeftsname","positionen":"Artikel1 x Preis · Artikel2 x Preis","kategorie":"Kategorie","mwst_19":0.00,"mwst_7":0.00,"netto":0.00}\n\nRegeln:\n- datum: Datum YYYY-MM-DD. Wenn nicht erkennbar: ' + today + '\n- betrag: Gesamtbetrag als Zahl (suche SUMME/GESAMT/TOTAL)\n- zahlungsart: EC-Karte / Barzahlung / PayPal / Sonstiges\n- laden: Geschaeftsname (meist erste Zeile)\n- positionen: Artikel kompakt mit Preisen, getrennt durch " · "\n- kategorie eine aus: Büromaterial / Software / IT / Telefon / Internet / Fahrtkosten / Miete / Büro / Marketing / Werbung / Fortbildung / Versicherung / Bankgebühren / Steuern / Abgaben / Hardware / Fremdleistungen / Bewirtung / Sonstiges Ausgabe\n  Hardware=Werkzeug/Geraete, Sonstiges Ausgabe=Baumaterial/Glas/Schrauben, Fahrtkosten=Tankstelle/Diesel\n' + (isMwSt ? '- mwst_19/mwst_7: MwSt-Betraege vom Bon\n- netto: Netto-Gesamtbetrag' : '- mwst_19: 0\n- mwst_7: 0\n- netto: gleich betrag') + '\n\nNur JSON, kein anderer Text.';
}

// ── State ─────────────────────────────────────────────────────────
let _bonImageDataUrl = null;
let _bonResult = null;

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
    _bonImageDataUrl = ev.target.result;
    document.getElementById('bon-preview-img').src = _bonImageDataUrl;
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
  _bonImageDataUrl = null;
  _bonResult = null;
  ['bon-preview-wrap','bon-step-result','bon-result','bon-error','bon-scan-start-btn']
    .forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; });
  ['bon-step-upload','bon-drop-zone'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display=''; });
  const fi = document.getElementById('bon-file-input');
  if (fi) fi.value = '';
  const ld = document.getElementById('bon-loading');
  if (ld) ld.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:#6366f1;margin-bottom:8px;display:block"></i><div style="font-size:13px;font-weight:600">Beleg wird analysiert…</div>';
}

// ── OCR → Claude ──────────────────────────────────────────────────
async function startBonScan() {
  if (!_bonImageDataUrl) return;

  const yr = new Date().getFullYear().toString();
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
    ? (data.ustModeByYear[yr] || '§19') : '§19';

  document.getElementById('bon-step-upload').style.display = 'none';
  document.getElementById('bon-step-result').style.display = '';
  document.getElementById('bon-loading').style.display = '';
  document.getElementById('bon-result').style.display = 'none';
  document.getElementById('bon-error').style.display = 'none';

  try {
    // ШАГ 1: Tesseract OCR
    setBonStatus('📷 Text wird erkannt…');

    if (typeof Tesseract === 'undefined') throw new Error('OCR-Bibliothek nicht geladen. Seite neu laden.');

    const ocrResult = await Tesseract.recognize(_bonImageDataUrl, 'deu+eng', {
      logger: m => { if (m.status === 'recognizing text') setBonStatus('📷 OCR: ' + Math.round(m.progress*100) + '%'); }
    });

    const ocrText = ocrResult.data.text.trim();
    if (!ocrText || ocrText.length < 5) throw new Error('Text nicht erkannt. Bitte deutlicheres Foto.');

    // ШАГ 2: Claude Text API
    setBonStatus('🤖 Claude analysiert…');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: buildBonPrompt(ocrText, ustMode) }]
      })
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp?.error?.message || 'HTTP ' + response.status);

    const text = (resp.content || []).map(b => b.text || '').join('').trim();
    const clean = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);
    _bonResult = parsed;
    showBonResult(parsed, ustMode);

  } catch(err) {
    document.getElementById('bon-loading').style.display = 'none';
    document.getElementById('bon-error').style.display = '';
    let msg = err.message || 'Unbekannter Fehler';
    if (msg.includes('401')) msg = 'API-Schlüssel ungültig.';
    if (msg.includes('429')) msg = 'Zu viele Anfragen — bitte warten.';
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
  document.getElementById('bon-result').style.display = '';
  document.getElementById('bon-res-datum').value  = r.datum || new Date().toISOString().split('T')[0];
  document.getElementById('bon-res-betrag').value = r.betrag || '';
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
    mwstDiv.innerHTML = '<span style="color:var(--sub)">Netto:</span> <b>' + netto.toFixed(2) + ' €</b>' +
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
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear) ? (data.ustModeByYear[yr]||'§19') : '§19';
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
  document.getElementById('nf-dat')?.scrollIntoView({behavior:'smooth',block:'center'});
}
