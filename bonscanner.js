// ══════════════════════════════════════════════════════════════════
// BON-SCANNER — Mindee Receipt API
// Фото → Mindee OCR (специализированный для чеков) → форма
// ══════════════════════════════════════════════════════════════════

const KA_SCAN = [
  'Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten',
  'Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung',
  'Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen',
  'Bewirtung','Sonstiges Ausgabe'
];

const MINDEE_KEY = 'md_H-rt3i3DRYwvP6T9aj_icnrElnDMW32-wUjVZX1njhY';
const MINDEE_URL = 'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict';

// ── Маппинг категорий Mindee → наши категории ────────────────────
function mapMindeeCategory(cat, supplier) {
  if (!cat && !supplier) return 'Sonstiges Ausgabe';
  const c = (cat || '').toLowerCase();
  const s = (supplier || '').toLowerCase();
  const text = c + ' ' + s;

  if (/restaurant|café|cafe|bistro|gaststätte|essen|food|pizza|burger|döner/.test(text)) return 'Bewirtung';
  if (/tank|shell|aral|bp|esso|total|diesel|benzin|kraftstoff|autobahn|maut|werkstatt|reifen/.test(text)) return 'Fahrtkosten';
  if (/telekom|vodafone|o2|telefon|internet|handy|mobilfunk/.test(text)) return 'Telefon / Internet';
  if (/bauhaus|obi|hornbach|toom|baumarkt|glas|profil|dichtung|silikon|schraube|nagel/.test(text)) return 'Sonstiges Ausgabe';
  if (/werkzeug|bosch|makita|hilti|dewalt|säge|bohrer|akku|maschine|hardware/.test(text)) return 'Hardware';
  if (/büro|staples|paper|toner|drucker|stift|briefpapier/.test(text)) return 'Büromaterial';
  if (/versicherung|allianz|axa|huk|ergo/.test(text)) return 'Versicherung';
  if (/seminar|schulung|kurs|akademie|fortbildung/.test(text)) return 'Fortbildung';
  if (/werbe|marketing|druck|flyer|google|facebook/.test(text)) return 'Marketing / Werbung';
  if (/software|lizenz|adobe|microsoft|app|cloud/.test(text)) return 'Software / IT';
  if (/miete|nebenkosten|strom|wasser|heizung/.test(text)) return 'Miete / Büro';
  if (/subunternehmer|monteur|dienstleistung|handwerker/.test(text)) return 'Fremdleistungen';
  if (/bank|gebühr|konto/.test(text)) return 'Bankgebühren';
  if (/steuer|finanzamt|abgaben|ust|mwst/.test(text)) return 'Steuern / Abgaben';
  return 'Sonstiges Ausgabe';
}

// ── State ─────────────────────────────────────────────────────────
let _bonFile         = null;
let _bonImageDataUrl = null;
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
  _bonFile = file;
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
  _bonFile = null;
  _bonImageDataUrl = null;
  _bonResult = null;
  ['bon-preview-wrap','bon-step-result','bon-result','bon-error','bon-scan-start-btn']
    .forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
  ['bon-step-upload','bon-drop-zone']
    .forEach(id => { const el = document.getElementById(id); if(el) el.style.display = ''; });
  const fi = document.getElementById('bon-file-input');
  if (fi) fi.value = '';
  setBonStatus('🔍 Beleg wird analysiert…');
}

// ── Главная функция ───────────────────────────────────────────────
async function startBonScan() {
  if (!_bonFile) return;

  document.getElementById('bon-step-upload').style.display = 'none';
  document.getElementById('bon-step-result').style.display = '';
  document.getElementById('bon-loading').style.display = '';
  document.getElementById('bon-result').style.display = 'none';
  document.getElementById('bon-error').style.display = 'none';
  setBonStatus('🔍 Beleg wird analysiert…');

  try {
    // Отправляем фото в Mindee
    const formData = new FormData();
    formData.append('document', _bonFile);

    const response = await fetch(MINDEE_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Token ' + MINDEE_KEY },
      body: formData
    });

    const resp = await response.json();
    if (!response.ok) {
      throw new Error(resp?.api_request?.error?.message || 'HTTP ' + response.status);
    }

    const pred = resp?.document?.inference?.prediction;
    if (!pred) throw new Error('Keine Daten vom Server erhalten.');

    // Извлекаем данные из ответа Mindee
    const betrag    = pred.total_amount?.value || 0;
    const datum     = pred.date?.value || new Date().toISOString().split('T')[0];
    const supplier  = pred.supplier_name?.value || '';
    const zahlRaw   = pred.payment_details?.[0]?.card_number ? 'EC-Karte' : 'Barzahlung';

    // Позиции
    const items = (pred.line_items || [])
      .filter(i => i.description)
      .map(i => i.description + (i.total_amount ? ' ' + i.total_amount.toFixed(2) + '€' : ''))
      .join(' · ');

    // МwSt из Mindee
    const taxes   = pred.taxes || [];
    const mwst19  = taxes.filter(t => t.rate >= 18 && t.rate <= 20).reduce((s,t) => s + (t.value||0), 0);
    const mwst7   = taxes.filter(t => t.rate >= 6  && t.rate <= 8).reduce((s,t)  => s + (t.value||0), 0);
    const netto   = betrag - mwst19 - mwst7;

    // Категория
    const category = pred.category?.value || '';
    const kategorie = mapMindeeCategory(category, supplier);

    // USt-режим
    const yr = (datum || '').slice(0,4) || new Date().getFullYear().toString();
    const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
      ? (data.ustModeByYear[yr] || '§19') : '§19';

    _bonResult = { datum, betrag, zahlungsart: zahlRaw, laden: supplier,
      positionen: items, kategorie, mwst_19: mwst19, mwst_7: mwst7, netto };

    showBonResult(_bonResult, ustMode);

  } catch(err) {
    document.getElementById('bon-loading').style.display = 'none';
    document.getElementById('bon-error').style.display = '';
    let msg = err.message || 'Unbekannter Fehler';
    if (msg.includes('401') || msg.includes('403')) msg = 'API-Schlüssel ungültig.';
    if (msg.includes('429')) msg = 'Zu viele Anfragen — bitte warten.';
    if (msg.includes('NetworkError') || msg.includes('fetch')) msg = 'Keine Internetverbindung.';
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
      (r.mwst_19 > 0 ? '&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 19%:</span> <b>' + r.mwst_19.toFixed(2) + ' €</b>' : '') +
      (r.mwst_7  > 0 ? '&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 7%:</span> <b>'  + r.mwst_7.toFixed(2)  + ' €</b>' : '') +
      '&nbsp;&nbsp;<span style="color:var(--blue)">→ Vorsteuer wird verbucht</span>';
  } else {
    mwstDiv.style.display = 'none';
  }
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
        if (rateSel) rateSel.value = (r.mwst_7 > 0 && !r.mwst_19) ? '7' : '19';
        if (typeof calcNfMwst === 'function') calcNfMwst();
        if (typeof calcNfVorsteuer === 'function') calcNfVorsteuer();
      }
    }, 100);
  }

  resetBonScanner();
  toast('<i class="fas fa-check-circle" style="color:var(--green)"></i> Bon übernommen — bitte prüfen und speichern', 'ok');
  document.getElementById('nf-dat')?.scrollIntoView({behavior:'smooth', block:'center'});
}
