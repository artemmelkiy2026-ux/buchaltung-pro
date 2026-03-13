// ══════════════════════════════════════════════════════════════════
// BON-SCANNER — Claude Vision API
// Сканирует фото чека → заполняет форму Ausgabe
// ══════════════════════════════════════════════════════════════════

// ── Категории Ausgabe из core.js ──────────────────────────────────
const KA_SCAN = [
  'Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten',
  'Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung',
  'Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen',
  'Bewirtung','Sonstiges Ausgabe'
];

// ── Промпт для Claude ──────────────────────────────────────────────
function buildBonPrompt(ustMode) {
  const isMwSt = ustMode === 'MwSt';
  return `Du bist ein Buchhalter-Assistent. Analysiere das Foto eines Kassenbons oder Quittung.

Extrahiere folgende Daten und antworte NUR mit einem JSON-Objekt, ohne Erklärungen, ohne Markdown-Backticks:

{
  "datum": "YYYY-MM-DD",
  "betrag": 0.00,
  "zahlungsart": "EC-Karte",
  "laden": "Name des Geschäfts",
  "positionen": "kurze Liste der Artikel z.B. Schrauben M6 x 2,80€ · Silikon x 4,20€",
  "kategorie": "eine der folgenden Kategorien",
  "mwst_19": 0.00,
  "mwst_7": 0.00,
  "netto": 0.00
}

Regeln:
- datum: Datum vom Bon, Format YYYY-MM-DD. Wenn nicht lesbar: heutiges Datum ${new Date().toISOString().split('T')[0]}
- betrag: Gesamtbetrag (Brutto) als Zahl
- zahlungsart: "EC-Karte", "Barzahlung", "PayPal", oder "Sonstiges". Standard: "EC-Karte"
- laden: Name des Geschäfts/Lieferanten vom Bon
- positionen: alle Artikel als kompakte Liste mit Preisen, getrennt durch " · "
- kategorie: GENAU eine aus dieser Liste bestimmen anhand der Artikel:
  * "Hardware" → Werkzeug, Maschinen, Bohrer, Säge, Akkuschrauber, Geräte, Elektronik
  * "Sonstiges Ausgabe" → Baumaterial, Glas, Profile, Dichtung, Silikon, Schrauben, Nägel, Baumarkt
  * "Büromaterial" → Papier, Stifte, Toner, Druckerzubehör, Bürobedarf
  * "Software / IT" → Software, Apps, Lizenzen, IT-Dienste, Cloud
  * "Fahrtkosten" → Tankstelle, Diesel, Benzin, Kraftstoff, Maut, Parkgebühr, Werkstatt
  * "Marketing / Werbung" → Werbung, Druck, Flyer, Online-Marketing
  * "Bewirtung" → Restaurant, Café, Gaststätte, Essen, Trinken, Bewirtung
  * "Fortbildung" → Seminar, Kurs, Schulung, Bücher Fachbereich
  * "Versicherung" → Versicherung, Police
  * "Telefon / Internet" → Telekom, Vodafone, O2, Telefon, Internet, Handy
  * "Miete / Büro" → Miete, Raumkosten, Nebenkosten
  * "Fremdleistungen" → Subunternehmer, Monteur, externe Dienstleistung
  * "Bankgebühren" → Bank, Kontogebühren
  * "Steuern / Abgaben" → Steuer, Finanzamt, Abgaben
  Wenn unklar: "Sonstiges Ausgabe"
${isMwSt ? `- mwst_19: MwSt-Betrag 19% vom Bon (Zahl, 0 wenn nicht vorhanden)
- mwst_7: MwSt-Betrag 7% vom Bon (Zahl, 0 wenn nicht vorhanden)  
- netto: Netto-Gesamtbetrag (Brutto minus MwSt gesamt)` : `- mwst_19: 0
- mwst_7: 0
- netto: gleich wie betrag`}

Antworte ausschließlich mit dem JSON. Kein Text davor oder danach.`;
}

// ── State ─────────────────────────────────────────────────────────
let _bonImageBase64 = null;
let _bonImageType   = null;
let _bonResult      = null;

// ── Открыть/закрыть модалку ───────────────────────────────────────
function openBonScanner() {
  // Заполняем категории
  const sel = document.getElementById('bon-res-kat');
  sel.innerHTML = KA_SCAN.map(k => `<option value="${k}">${k}</option>`).join('');

  document.getElementById('bon-modal-bg').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeBonScanner() {
  document.getElementById('bon-modal-bg').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Обработка файла ───────────────────────────────────────────────
function handleBonFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  readBonImage(file);
}

function handleBonDrop(e) {
  e.preventDefault();
  document.getElementById('bon-drop-zone').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) readBonImage(file);
}

function readBonImage(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    const base64  = dataUrl.split(',')[1];
    _bonImageBase64 = base64;
    _bonImageType   = file.type || 'image/jpeg';

    // Показываем превью
    document.getElementById('bon-preview-img').src = dataUrl;
    document.getElementById('bon-preview-wrap').style.display = '';
    document.getElementById('bon-drop-zone').style.display = 'none';
    document.getElementById('bon-scan-start-btn').style.display = '';
  };
  reader.readAsDataURL(file);
}

// ── Сброс ─────────────────────────────────────────────────────────
function resetBonScanner() {
  _bonImageBase64 = null;
  _bonImageType   = null;
  _bonResult      = null;

  document.getElementById('bon-step-upload').style.display = '';
  document.getElementById('bon-step-result').style.display = 'none';
  document.getElementById('bon-preview-wrap').style.display = 'none';
  document.getElementById('bon-drop-zone').style.display = '';
  document.getElementById('bon-scan-start-btn').style.display = 'none';
  document.getElementById('bon-file-input').value = '';
  document.getElementById('bon-loading').style.display = '';
  document.getElementById('bon-result').style.display = 'none';
  document.getElementById('bon-error').style.display = 'none';
}

// ── Основная функция сканирования ─────────────────────────────────
// Вызывает Supabase Edge Function — ключ хранится на сервере, клиент его не видит
const BON_EDGE_URL = 'https://dvmhstytoonpacxwdxuj.supabase.co/functions/v1/bon-scanner';

async function startBonScan() {
  if (!_bonImageBase64) return;

  // Определяем USt-режим текущего года
  const yr = new Date().getFullYear().toString();
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
    ? (data.ustModeByYear[yr] || '§19') : '§19';

  // Показываем лоадер
  document.getElementById('bon-step-upload').style.display = 'none';
  document.getElementById('bon-step-result').style.display = '';
  document.getElementById('bon-loading').style.display = '';
  document.getElementById('bon-result').style.display = 'none';
  document.getElementById('bon-error').style.display = 'none';

  try {
    // Вызываем Edge Function — ключ на стороне Supabase
    const response = await fetch(BON_EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: _bonImageBase64,
        image_type:   _bonImageType || 'image/jpeg',
        prompt:       buildBonPrompt(ustMode),
      })
    });

    const resp = await response.json();

    if (!response.ok || resp.error) {
      throw new Error(resp.error || `HTTP ${response.status}`);
    }

    // Парсим JSON из ответа Claude
    const text  = resp.result || '';
    const clean = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);
    _bonResult = parsed;
    showBonResult(parsed, ustMode);

  } catch (err) {
    document.getElementById('bon-loading').style.display = 'none';
    document.getElementById('bon-error').style.display = '';
    let msg = err.message || 'Unbekannter Fehler';
    if (msg.includes('401') || msg.includes('403')) msg = 'Zugriff verweigert. Edge Function prüfen.';
    if (msg.includes('429')) msg = 'Zu viele Anfragen. Bitte kurz warten.';
    if (msg.includes('fetch') || msg.includes('network')) msg = 'Keine Internetverbindung.';
    if (msg.includes('nicht konfiguriert')) msg = 'API-Schlüssel in Supabase Secrets nicht gesetzt.';
    document.getElementById('bon-error-msg').textContent = msg;
  }
}

// ── Показать результат ────────────────────────────────────────────
function showBonResult(r, ustMode) {
  document.getElementById('bon-loading').style.display = 'none';
  document.getElementById('bon-result').style.display  = '';

  // Дата
  const datInp = document.getElementById('bon-res-datum');
  datInp.value = r.datum || new Date().toISOString().split('T')[0];

  // Сумма
  document.getElementById('bon-res-betrag').value = r.betrag || '';

  // Категория
  const katSel = document.getElementById('bon-res-kat');
  const matchKat = KA_SCAN.find(k => k === r.kategorie);
  if (matchKat) katSel.value = matchKat;

  // Zahlungsart
  const zahlMap = {
    'EC-Karte':'EC-Karte','Barzahlung':'Barzahlung','Bar':'Barzahlung',
    'Überweisung':'Überweisung','PayPal':'PayPal','Lastschrift':'Lastschrift'
  };
  const zahlSel = document.getElementById('bon-res-zahl');
  zahlSel.value = zahlMap[r.zahlungsart] || 'EC-Karte';

  // Beschreibung: "Bon-Scan · Laden · Datum"
  const datLabel = r.datum ? r.datum.split('-').reverse().join('.') : '';
  document.getElementById('bon-res-beschr').value =
    `Bon-Scan · ${r.laden || 'Unbekannt'} · ${datLabel}`;

  // Notiz: позиции
  document.getElementById('bon-res-notiz').value = r.positionen || '';

  // MwSt блок
  const mwstDiv = document.getElementById('bon-mwst-info');
  if (ustMode === 'MwSt' && (r.mwst_19 > 0 || r.mwst_7 > 0)) {
    const netto   = r.netto   || (r.betrag - r.mwst_19 - r.mwst_7);
    const mwstSum = (r.mwst_19 || 0) + (r.mwst_7 || 0);
    mwstDiv.style.display = '';
    mwstDiv.innerHTML =
      `<span style="color:var(--sub)">Netto:</span> <b>${netto.toFixed(2)} €</b>` +
      (r.mwst_19 > 0 ? `&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 19%:</span> <b>${r.mwst_19.toFixed(2)} €</b>` : '') +
      (r.mwst_7  > 0 ? `&nbsp;&nbsp;<span style="color:var(--sub)">MwSt 7%:</span> <b>${r.mwst_7.toFixed(2)} €</b>` : '') +
      `&nbsp;&nbsp;<span style="color:var(--blue)">→ Vorsteuer wird verbucht</span>`;
  } else {
    mwstDiv.style.display = 'none';
  }
}

// ── Применить результат → заполнить форму ─────────────────────────
function applyBonResult() {
  if (!_bonResult) return;
  const r       = _bonResult;
  const yr      = (r.datum || '').slice(0,4) || new Date().getFullYear().toString();
  const ustMode = (typeof data !== 'undefined' && data.ustModeByYear)
    ? (data.ustModeByYear[yr] || '§19') : '§19';

  // Переключаем на Ausgabe если ещё не
  if (typeof setTyp === 'function') setTyp('Ausgabe');

  // Дата
  const datVal = document.getElementById('bon-res-datum').value;
  if (datVal) document.getElementById('nf-dat').value = datVal;

  // Betrag
  const betVal = parseFloat(document.getElementById('bon-res-betrag').value);
  if (betVal) document.getElementById('nf-bet').value = betVal.toFixed(2);

  // Kategorie
  const katSel  = document.getElementById('nf-kat');
  const bonKat  = document.getElementById('bon-res-kat').value;
  if (bonKat) katSel.value = bonKat;

  // Zahlungsart
  const zahlSel  = document.getElementById('nf-zahl');
  const bonZahl  = document.getElementById('bon-res-zahl').value;
  if (bonZahl) zahlSel.value = bonZahl;

  // Beschreibung
  const bonBeschr = document.getElementById('bon-res-beschr').value;
  document.getElementById('nf-dsc').value = bonBeschr;

  // Notiz
  const bonNotiz = document.getElementById('bon-res-notiz').value;
  document.getElementById('nf-note').value = bonNotiz;

  // Если MwSt — обновляем дату чтобы тригернуть updateMwstFormVisibility
  if (typeof updateMwstFormVisibility === 'function') {
    updateMwstFormVisibility();
  }

  // Если MwSt режим и есть Vorsteuer — заполняем поля
  if (ustMode === 'MwSt' && betVal) {
    setTimeout(() => {
      const mwstRow = document.getElementById('nf-mwst-row');
      if (mwstRow && mwstRow.style.display !== 'none') {
        // Определяем ставку
        const hasMwst7  = r.mwst_7  > 0;
        const hasMwst19 = r.mwst_19 > 0 || (!hasMwst7 && r.betrag > 0);
        const rateSel = document.getElementById('nf-mwst-rate');
        if (rateSel) {
          rateSel.value = hasMwst7 && !hasMwst19 ? '7' : '19';
        }
        if (typeof calcNfMwst === 'function') calcNfMwst();
        if (typeof calcNfVorsteuer === 'function') calcNfVorsteuer();
      }
    }, 100);
  }

  closeBonScanner();
  toast('<i class="fas fa-check-circle" style="color:var(--green)"></i> Bon übernommen — bitte prüfen und speichern', 'ok');

  // Скроллим к форме
  const form = document.getElementById('nf-dat');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
