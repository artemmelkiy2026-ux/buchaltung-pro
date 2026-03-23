// ══════════════════════════════════════════════════════════════════════════
// BANKABGLEICH — MelaLogic Banking Module
// Поддержка: CSV (Sparkasse/Deutsche Bank/Commerzbank/VR/ING/DKB/N26)
//            MT940 (SWIFT) · CAMT.053 (ISO 20022 XML)
// Логика: import → parse → auto-match → manual assign → buchen
// ══════════════════════════════════════════════════════════════════════════

'use strict';

// ── Состояние модуля ───────────────────────────────────────────────────────
let _bankTx        = [];   // все импортированные транзакции
let _bankMatches   = {};   // txId → { eintragId, rechnungId, status }
let _bankPage      = 1;
const BANK_PER_PAGE = 20;
let _bankFilter    = 'all'; // all | unmatched | matched | ignored
let _bankSort      = 'date_desc';

// ── CSS ────────────────────────────────────────────────────────────────────
(function injectBankCSS() {
  if (document.getElementById('bank-css')) return;
  const s = document.createElement('style');
  s.id = 'bank-css';
  s.textContent = `
/* ── Bankabgleich Layout ── */
#p-bankabgleich .bank-header { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
#p-bankabgleich .bank-drop-zone {
  border: 2px dashed var(--border); border-radius: 12px;
  padding: 32px 24px; text-align: center; cursor: pointer;
  transition: border-color .2s, background .2s; margin-bottom: 16px;
  background: var(--s2);
}
#p-bankabgleich .bank-drop-zone:hover,
#p-bankabgleich .bank-drop-zone.drag-over {
  border-color: var(--blue); background: var(--bdim);
}
#p-bankabgleich .bank-drop-icon { font-size:36px; color:var(--sub); margin-bottom:8px; }
#p-bankabgleich .bank-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:16px;
}
@media(max-width:600px){#p-bankabgleich .bank-stats{grid-template-columns:repeat(2,1fr);}}
#p-bankabgleich .bank-stat-card {
  background:var(--s2); border:1px solid var(--border); border-radius:10px;
  padding:12px 14px;
}
#p-bankabgleich .bank-stat-label { font-size:11px; color:var(--sub); margin-bottom:4px; }
#p-bankabgleich .bank-stat-val   { font-size:18px; font-weight:700; color:var(--text); font-family:var(--mono); }

/* ── Filter Tabs ── */
#p-bankabgleich .bank-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
#p-bankabgleich .bank-ftab {
  padding:5px 12px; border-radius:20px; border:1px solid var(--border);
  font-size:12px; font-weight:600; cursor:pointer; background:var(--s2); color:var(--sub);
  transition:all .15s;
}
#p-bankabgleich .bank-ftab.active { background:var(--blue); color:#fff; border-color:var(--blue); }

/* ── Transaction List ── */
#p-bankabgleich .bank-tx-list { display:flex; flex-direction:column; gap:6px; }
#p-bankabgleich .bank-tx {
  display:flex; align-items:center; gap:10px;
  background:var(--s2); border:1px solid var(--border); border-radius:10px;
  padding:10px 12px; transition:box-shadow .15s; cursor:pointer;
}
#p-bankabgleich .bank-tx:hover { box-shadow:0 2px 8px rgba(0,0,0,.08); }
#p-bankabgleich .bank-tx.matched  { border-left:3px solid var(--green); }
#p-bankabgleich .bank-tx.unmatched{ border-left:3px solid var(--yellow); }
#p-bankabgleich .bank-tx.ignored  { border-left:3px solid var(--border); opacity:.55; }
#p-bankabgleich .bank-tx.booked   { border-left:3px solid var(--blue); }

#p-bankabgleich .bank-tx-date  { font-size:11px; color:var(--sub); min-width:56px; font-family:var(--mono); }
#p-bankabgleich .bank-tx-info  { flex:1; min-width:0; }
#p-bankabgleich .bank-tx-name  { font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#p-bankabgleich .bank-tx-ref   { font-size:11px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#p-bankabgleich .bank-tx-amt   { font-family:var(--mono); font-size:14px; font-weight:700; min-width:80px; text-align:right; }
#p-bankabgleich .bank-tx-amt.pos{ color:var(--green); }
#p-bankabgleich .bank-tx-amt.neg{ color:var(--red); }
#p-bankabgleich .bank-tx-badge {
  font-size:10px; padding:2px 7px; border-radius:10px; font-weight:600;
  white-space:nowrap;
}
#p-bankabgleich .bank-tx-badge.matched  { background:var(--gdim); color:var(--green); }
#p-bankabgleich .bank-tx-badge.unmatched{ background:#fef9c3; color:#854d0e; }
#p-bankabgleich .bank-tx-badge.ignored  { background:var(--s2); color:var(--sub); }
#p-bankabgleich .bank-tx-badge.booked  { background:var(--bdim); color:var(--blue); }

/* ── Match Sheet ── */
#bank-match-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:2000;
  display:flex; align-items:flex-end; justify-content:center;
}
#bank-match-sheet {
  background:var(--bg); border-radius:16px 16px 0 0; width:100%; max-width:560px;
  max-height:80vh; overflow-y:auto; padding:20px 16px 32px;
  box-shadow:0 -4px 24px rgba(0,0,0,.15);
}
#bank-match-sheet .bms-handle {
  width:36px; height:4px; background:var(--border); border-radius:2px;
  margin:0 auto 16px;
}
#bank-match-sheet .bms-title { font-size:15px; font-weight:700; margin-bottom:4px; }
#bank-match-sheet .bms-amount{ font-size:22px; font-weight:800; font-family:var(--mono); margin-bottom:14px; }
#bank-match-sheet .bms-section{ font-size:11px; font-weight:700; text-transform:uppercase; color:var(--sub); margin:14px 0 6px; letter-spacing:.5px; }
#bank-match-sheet .bms-suggest {
  display:flex; align-items:center; gap:10px; padding:10px; margin-bottom:6px;
  background:var(--s2); border:1px solid var(--border); border-radius:8px; cursor:pointer;
  transition:border-color .15s;
}
#bank-match-sheet .bms-suggest:hover { border-color:var(--blue); }
#bank-match-sheet .bms-suggest.selected { border-color:var(--green); background:var(--gdim); }
#bank-match-sheet .bms-match-score {
  font-size:10px; padding:2px 6px; border-radius:8px; font-weight:700;
  background:var(--green); color:#fff;
}
#bank-match-sheet .bms-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
#bank-match-sheet .bms-btn {
  flex:1; padding:11px; border:none; border-radius:8px; font-size:13px;
  font-weight:600; cursor:pointer; font-family:inherit; transition:opacity .15s;
}
#bank-match-sheet .bms-btn:hover { opacity:.85; }
#bank-match-sheet .bms-btn.primary { background:var(--blue); color:#fff; }
#bank-match-sheet .bms-btn.success { background:var(--green); color:#fff; }
#bank-match-sheet .bms-btn.danger  { background:var(--red); color:#fff; }
#bank-match-sheet .bms-btn.neutral { background:var(--s2); border:1px solid var(--border); color:var(--text); }

/* ── Import formats info ── */
#p-bankabgleich .bank-formats {
  display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;
}
#p-bankabgleich .bank-fmt-badge {
  padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600;
  background:var(--bdim); color:var(--blue); border:1px solid var(--blue);
}

/* ── Progress ── */
#bank-progress-bar {
  height:4px; border-radius:2px; background:var(--border); margin-bottom:16px; overflow:hidden;
}
#bank-progress-fill {
  height:100%; background:var(--blue); border-radius:2px;
  transition:width .4s ease; width:0%;
}
`;
  document.head.appendChild(s);
})();

// ── ПАРСЕРЫ ────────────────────────────────────────────────────────────────

function _parseCSVLine(line, delim = ';') {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === delim && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function _detectDelimiter(text) {
  const first = text.split('\n')[0];
  const sc = (first.match(/;/g)||[]).length;
  const co = (first.match(/,/g)||[]).length;
  const tb = (first.match(/\t/g)||[]).length;
  if (tb > sc && tb > co) return '\t';
  if (co > sc) return ',';
  return ';';
}

function _parseDate(str) {
  if (!str) return '';
  str = str.trim().replace(/"/g,'');
  // DD.MM.YYYY
  let m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // YYYY-MM-DD
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return str;
  // DD/MM/YYYY
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // YYYYMMDD (MT940)
  m = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DDMMYY (MT940 kurz)
  m = str.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

function _parseAmount(str) {
  if (!str) return 0;
  str = String(str).trim().replace(/"/g,'').replace(/\s/g,'');
  // Немецкий формат: 1.234,56 → 1234.56
  if (str.match(/\d+\.\d{3},\d{2}/)) str = str.replace(/\./g,'').replace(',','.');
  // 1234,56 → 1234.56
  else if (str.match(/,\d{1,2}$/)) str = str.replace(/\./g,'').replace(',','.');
  return parseFloat(str) || 0;
}

// Определяем тип банка по заголовкам CSV
function _detectBankFormat(headers) {
  const h = headers.map(x => (x||'').toLowerCase());
  const joined = h.join('|');
  if (joined.includes('buchungstag') && joined.includes('glaeubiger')) return 'sparkasse';
  if (joined.includes('buchungstag') && joined.includes('beguenstigter')) return 'deutsche_bank';
  if (joined.includes('buchungstag') && joined.includes('empfänger')) return 'commerzbank';
  if (joined.includes('valutadatum') && joined.includes('auftraggeber')) return 'vr_bank';
  if (joined.includes('buchungsdatum') && joined.includes('betrag (eur)')) return 'ing';
  if (joined.includes('buchungsdatum') && joined.includes('gläubiger-id')) return 'dkb';
  if (joined.includes('date') && joined.includes('amount')) return 'n26';
  if (joined.includes('wertstellung') && joined.includes('umsatz')) return 'comdirect';
  return 'generic';
}

// Маппинг колонок по типу банка
const BANK_COLUMN_MAP = {
  sparkasse:     { date:'Buchungstag', valuta:'Valutadatum', name:'Auftraggeber/Beg√ºnstigter', ref:'Verwendungszweck', amount:'Betrag' },
  deutsche_bank: { date:'Buchungstag', valuta:'Wertstellung', name:'Beg√ºnstigter', ref:'Verwendungszweck', amount:'Betrag' },
  commerzbank:   { date:'Buchungstag', valuta:'Wertstellung', name:'Empfänger', ref:'Verwendungszweck', amount:'Betrag (EUR)' },
  vr_bank:       { date:'Buchungsdatum', valuta:'Valutadatum', name:'Auftraggeber', ref:'Verwendungszweck', amount:'Umsatz' },
  ing:           { date:'Buchungsdatum', valuta:'Valutadatum', name:'Auftraggeber/Empfänger', ref:'Verwendungszweck', amount:'Betrag (EUR)' },
  dkb:           { date:'Buchungsdatum', valuta:'Wertstellung', name:'Auftraggeber / Beg√ºnstigter', ref:'Verwendungszweck', amount:'Glaubiger-ID' },
  n26:           { date:'Date', valuta:'Date', name:'Payee', ref:'Transaction type', amount:'Amount (EUR)' },
  comdirect:     { date:'Buchungstag', valuta:'Wertstellung', name:'Buchungstext', ref:'Umsatz in EUR', amount:'Umsatz in EUR' },
  generic:       { date:null, valuta:null, name:null, ref:null, amount:null },
};

function _findCol(headers, candidates) {
  if (!candidates) return -1;
  const cands = Array.isArray(candidates) ? candidates : [candidates];
  for (const c of cands) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(c.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

// Парсер CSV
function parseBankCSV(text) {
  const delim = _detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  
  // Ищем строку с заголовками (первая строка с несколькими колонками)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = _parseCSVLine(lines[i], delim);
    if (cols.length >= 4) { headerIdx = i; break; }
  }
  
  const headers = _parseCSVLine(lines[headerIdx], delim);
  const bankType = _detectBankFormat(headers);
  
  // Ищем индексы колонок
  const dateIdx   = _findCol(headers, ['Buchungstag','Buchungsdatum','Date','Datum']);
  const valutaIdx = _findCol(headers, ['Valutadatum','Wertstellung','Value Date']);
  const nameIdx   = _findCol(headers, ['Auftraggeber','Begünstigter','Beguenstigter','Empfänger','Payee','Name','Glaeubiger']);
  const refIdx    = _findCol(headers, ['Verwendungszweck','Transaction type','Buchungstext','Memo','Betreff','Referenz']);
  const amtIdx    = _findCol(headers, ['Betrag','Amount','Umsatz','Summe','Soll','Haben']);
  const ibanIdx   = _findCol(headers, ['IBAN','Kontonummer','Account']);
  const typeIdx   = _findCol(headers, ['Buchungstext','Transaktionstyp','Art']);

  const txs = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = _parseCSVLine(lines[i], delim);
    if (cols.length < 2) continue;
    
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : '';
    const rawAmt  = amtIdx  >= 0 ? cols[amtIdx]  : '';
    if (!rawDate && !rawAmt) continue;
    
    const date   = _parseDate(rawDate);
    const amount = _parseAmount(rawAmt);
    if (!date || amount === 0) continue;
    
    txs.push({
      id:       'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      date,
      valuta:   valutaIdx >= 0 ? _parseDate(cols[valutaIdx]) : date,
      name:     nameIdx >= 0 ? (cols[nameIdx]||'').trim() : '',
      ref:      refIdx  >= 0 ? (cols[refIdx ]||'').trim() : '',
      iban:     ibanIdx >= 0 ? (cols[ibanIdx]||'').trim() : '',
      type:     typeIdx >= 0 ? (cols[typeIdx]||'').trim() : '',
      amount,
      source:   'csv',
      bank:     bankType,
      raw:      cols.join('|'),
    });
  }
  return txs;
}

// Парсер MT940 (SWIFT)
function parseMT940(text) {
  const txs = [];
  const entries = text.split(':61:').slice(1);
  
  // Получаем IBAN из :25:
  const ibanMatch = text.match(/:25:([A-Z]{2}\d{2}[A-Z0-9]{4,})/);
  const iban = ibanMatch ? ibanMatch[1] : '';
  
  for (const entry of entries) {
    try {
      // :61: YYMMDDMMDDС/D BETRAG N...REFERENZ
      const txLine = entry.split('\n')[0];
      const txMatch = txLine.match(/^(\d{6})(\d{4})?(C|D|RD|RC|CD|CR)([A-Z]?)(\d+[,]\d{2})(N.{3,4})?(.+)?/);
      if (!txMatch) continue;
      
      const dateStr = txMatch[1];
      const crdr    = txMatch[3];
      const amtStr  = txMatch[5];
      
      const date   = _parseDate(dateStr);
      const amount = _parseAmount(amtStr) * (['D','RD'].includes(crdr) ? -1 : 1);
      
      // :86: — детали
      const detailMatch = entry.match(/:86:([\s\S]+?)(?=:(?:61|62|64|65|86|20|25|28|60):|$)/);
      const detail = detailMatch ? detailMatch[1].replace(/\n/g,'').trim() : '';
      
      // Разбираем subfields :86:
      const refMatch  = detail.match(/\?20(.{1,27})/);
      const nameMatch = detail.match(/\?3[23](.{1,27})/);
      const ibanM     = detail.match(/\?31([A-Z0-9]{8,34})/);
      
      txs.push({
        id:     'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        date,
        valuta: date,
        name:   nameMatch ? nameMatch[1].trim() : '',
        ref:    refMatch  ? refMatch[1].trim()  : detail.substring(0, 60),
        iban:   ibanM ? ibanM[1] : iban,
        type:   crdr === 'C' ? 'Gutschrift' : 'Lastschrift',
        amount,
        source: 'mt940',
        bank:   'mt940',
        raw:    entry,
      });
    } catch(e) { /* skip malformed entry */ }
  }
  return txs;
}

// Парсер CAMT.053 (ISO 20022 XML)
function parseCAMT053(text) {
  const txs = [];
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(text, 'text/xml');
    const ns     = doc.documentElement.namespaceURI || '';
    const q      = (parent, tag) => [...parent.querySelectorAll(tag), ...parent.getElementsByTagNameNS(ns, tag)][0];
    const qAll   = (parent, tag) => [...parent.querySelectorAll(tag), ...parent.getElementsByTagNameNS(ns, tag)];
    
    const ntries = qAll(doc, 'Ntry');
    for (const ntry of ntries) {
      const amtEl  = q(ntry, 'Amt');
      const crdtDbt= q(ntry, 'CdtDbtInd')?.textContent?.trim();
      const dtEl   = q(ntry, 'ValDt > Dt') || q(ntry, 'BookgDt > Dt');
      
      const rawAmt = amtEl?.textContent?.trim() || '0';
      const amount = parseFloat(rawAmt) * (crdtDbt === 'DBIT' ? -1 : 1);
      const date   = _parseDate(dtEl?.textContent?.trim() || '');
      if (!date || amount === 0) continue;
      
      // Детали транзакции
      const txDtls = q(ntry, 'TxDtls') || ntry;
      const name   = q(txDtls, 'Nm')?.textContent?.trim() || '';
      const ref    = q(txDtls, 'Ustrd')?.textContent?.trim()
                  || q(txDtls, 'AddtlTxInf')?.textContent?.trim() || '';
      const iban   = q(txDtls, 'IBAN')?.textContent?.trim() || '';
      
      txs.push({
        id:     'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        date,
        valuta: date,
        name,
        ref,
        iban,
        type:   crdtDbt === 'CRDT' ? 'Gutschrift' : 'Lastschrift',
        amount,
        source: 'camt053',
        bank:   'camt053',
        raw:    '',
      });
    }
  } catch(e) { console.error('[CAMT parse]', e); }
  return txs;
}

// ── AUTO-MATCHING ENGINE ───────────────────────────────────────────────────

function _scoreMatch(tx, candidate) {
  let score = 0;
  const txAmt  = Math.abs(tx.amount);
  const cAmt   = Math.abs(candidate.betrag || candidate.amount || 0);
  
  // Сумма совпадает (±0.01)
  if (Math.abs(txAmt - cAmt) < 0.02) score += 50;
  else if (Math.abs(txAmt - cAmt) < 1)   score += 20;
  
  // Дата (±3 дня)
  if (tx.date && (candidate.datum || candidate.date)) {
    const d1 = new Date(tx.date).getTime();
    const d2 = new Date(candidate.datum || candidate.date).getTime();
    const diff = Math.abs(d1 - d2) / 86400000;
    if (diff === 0)      score += 30;
    else if (diff <= 1)  score += 20;
    else if (diff <= 3)  score += 10;
    else if (diff <= 7)  score += 3;
  }
  
  // Номер Rechnung в Verwendungszweck
  const nr = candidate.nr || candidate.belegnr || '';
  if (nr && tx.ref && tx.ref.includes(nr)) score += 25;
  
  // Имя клиента/поставщика
  const cName = (candidate.kunde || candidate.beschreibung || '').toLowerCase();
  const txName = (tx.name || '').toLowerCase();
  if (cName && txName && cName.length > 3 && txName.includes(cName.split(' ')[0])) score += 15;
  if (txName && cName && txName.split(' ').some(w => w.length > 3 && cName.includes(w))) score += 10;
  
  // IBAN совпадает
  if (tx.iban && candidate.iban && tx.iban === candidate.iban) score += 30;
  
  return Math.min(score, 100);
}

function autoMatchAll() {
  const eintraege  = (data.eintraege  || []).filter(e => !e.is_storno && !e._storniert);
  const rechnungen = (data.rechnungen || []).filter(r => r.status === 'offen' || r.status === 'ueberfaellig');
  
  let matched = 0;
  for (const tx of _bankTx) {
    if (_bankMatches[tx.id]?.status === 'matched' || _bankMatches[tx.id]?.status === 'booked') continue;
    
    const suggestions = [];
    
    // Матчим с открытыми Rechnungen (входящие платежи)
    if (tx.amount > 0) {
      for (const r of rechnungen) {
        const s = _scoreMatch(tx, r);
        if (s >= 40) suggestions.push({ type:'rechnung', item:r, score:s });
      }
    }
    
    // Матчим с Einträgen
    for (const e of eintraege) {
      const s = _scoreMatch(tx, e);
      if (s >= 45) suggestions.push({ type:'eintrag', item:e, score:s });
    }
    
    suggestions.sort((a,b) => b.score - a.score);
    
    if (suggestions.length > 0 && suggestions[0].score >= 60) {
      const best = suggestions[0];
      _bankMatches[tx.id] = {
        status: 'matched',
        type:   best.type,
        itemId: best.item.id,
        score:  best.score,
        item:   best.item,
        suggestions: suggestions.slice(0,5),
      };
      matched++;
    } else if (suggestions.length > 0) {
      _bankMatches[tx.id] = {
        status: 'suggestion',
        suggestions: suggestions.slice(0,5),
      };
    }
  }
  return matched;
}

// ── BUCHUNG ────────────────────────────────────────────────────────────────

async function _buchTx(txId, matchInfo) {
  const tx = _bankTx.find(t => t.id === txId);
  if (!tx) return;
  
  if (matchInfo.type === 'rechnung') {
    // Помечаем Rechnung как bezahlt
    const r = (data.rechnungen||[]).find(r => r.id === matchInfo.itemId);
    if (r && r.status !== 'bezahlt') {
      r.status = 'bezahlt';
      sbSaveRechnung(r);
      _buchRechnungAlsEinnahme(r);
      sbLogRechnung(r, 'bezahlt', {status:'offen'}, {status:'bezahlt', via:'bankabgleich'});
    }
  } else if (matchInfo.type === 'eintrag') {
    // Просто привязываем транзакцию к существующему Eintrag
    // (маркируем что подтверждён банком)
    const e = (data.eintraege||[]).find(e => e.id === matchInfo.itemId);
    if (e) {
      e._bankTxId    = txId;
      e._bankVerified = true;
      sbSaveEintrag(e);
    }
  } else if (matchInfo.type === 'new') {
    // Создаём новый Eintrag из транзакции
    const newE = {
      id:          'tx_e_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
      datum:       tx.date,
      leistungsdatum: tx.date,
      typ:         tx.amount > 0 ? 'Einnahme' : 'Ausgabe',
      kategorie:   matchInfo.kategorie || (tx.amount > 0 ? 'Sonstiges Einnahme' : 'Sonstiges Ausgabe'),
      zahlungsart: 'Überweisung',
      beschreibung: matchInfo.beschreibung || (tx.name || tx.ref || 'Banktransaktion').slice(0,80),
      belegnr:     '',
      notiz:       tx.ref ? tx.ref.slice(0,200) : '',
      betrag:      Math.abs(tx.amount),
      nettoBetrag: Math.abs(tx.amount),
      mwstBetrag:  0,
      mwstRate:    0,
      _bankTxId:   txId,
      _bankVerified: true,
    };
    data.eintraege.unshift(newE);
    await sbSaveEintrag(newE);
  }
  
  _bankMatches[txId] = { ...(_bankMatches[txId]||{}), status:'booked', ...matchInfo };
  _saveBankState();
  renderBankabgleich();
  if (typeof renderAll === 'function') {
    window._forceFilterYear = tx.date?.substring(0,4);
    renderAll();
  }
}

// ── PERSISTENCE ────────────────────────────────────────────────────────────

function _saveBankState() {
  try {
    localStorage.setItem('ml_bank_tx',      JSON.stringify(_bankTx.slice(0, 500)));
    localStorage.setItem('ml_bank_matches', JSON.stringify(_bankMatches));
  } catch(e) {}
}

function _loadBankState() {
  try {
    const tx = localStorage.getItem('ml_bank_tx');
    const mx = localStorage.getItem('ml_bank_matches');
    if (tx) _bankTx      = JSON.parse(tx);
    if (mx) _bankMatches = JSON.parse(mx);
  } catch(e) {}
}

// ── IMPORT HANDLER ─────────────────────────────────────────────────────────

async function handleBankFile(file) {
  if (!file) return;
  const bar  = document.getElementById('bank-progress-fill');
  const zone = document.getElementById('bank-drop-zone');
  if (bar)  { bar.style.width  = '30%'; }
  if (zone) zone.innerHTML = `<div class="bank-drop-icon"><i class="fas fa-spinner fa-spin"></i></div><div style="font-size:13px;color:var(--sub)">Datei wird eingelesen...</div>`;
  
  const text = await file.text();
  let newTxs = [];
  
  try {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xml') || name.includes('camt')) {
      newTxs = parseCAMT053(text);
    } else if (name.endsWith('.sta') || name.endsWith('.mt940') || text.includes(':20:') && text.includes(':61:')) {
      newTxs = parseMT940(text);
    } else {
      newTxs = parseBankCSV(text);
    }
  } catch(e) {
    toast('Fehler beim Einlesen: ' + e.message, 'err');
    if (bar) bar.style.width = '0%';
    _renderDropZone();
    return;
  }
  
  if (bar) bar.style.width = '60%';
  
  if (!newTxs.length) {
    toast('Keine Transaktionen gefunden. Format prüfen.', 'err');
    if (bar) bar.style.width = '0%';
    _renderDropZone();
    return;
  }
  
  // Дедупликация по дате+сумме+имени
  const existingKeys = new Set(_bankTx.map(t => `${t.date}|${t.amount}|${t.name}`));
  const fresh = newTxs.filter(t => !existingKeys.has(`${t.date}|${t.amount}|${t.name}`));
  _bankTx = [...fresh, ..._bankTx].sort((a,b) => b.date.localeCompare(a.date));
  
  if (bar) bar.style.width = '80%';
  
  // Автоматический матчинг
  const matched = autoMatchAll();
  _saveBankState();
  
  if (bar) bar.style.width = '100%';
  setTimeout(() => { if (bar) bar.style.width = '0%'; }, 600);
  
  toast(`✓ ${fresh.length} Transaktionen importiert · ${matched} automatisch zugeordnet`, 'ok');
  renderBankabgleich();
}

// ── MATCH SHEET ────────────────────────────────────────────────────────────

let _currentTxId = null;
let _selectedMatchId = null;

function openMatchSheet(txId) {
  _currentTxId = txId;
  _selectedMatchId = null;
  const tx = _bankTx.find(t => t.id === txId);
  if (!tx) return;
  
  const match = _bankMatches[txId] || {};
  const suggestions = match.suggestions || [];
  
  // Получаем дополнительные предложения для ручного выбора
  const allEin  = (data.eintraege  || []).filter(e => !e.is_storno).slice(0,50);
  const allRech = (data.rechnungen || []).filter(r => ['offen','ueberfaellig'].includes(r.status));
  
  const isIncoming = tx.amount > 0;
  const amtColor   = isIncoming ? 'var(--green)' : 'var(--red)';
  const sign       = isIncoming ? '+' : '';
  
  const suggestHTML = suggestions.length > 0 ? `
    <div class="bms-section">Vorschläge</div>
    ${suggestions.map(s => `
      <div class="bms-suggest" data-id="${s.item.id}" data-type="${s.type}" onclick="_selectSuggest(this,'${s.item.id}','${s.type}')">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600">${s.item.nr||s.item.belegnr||''} ${s.item.kunde||s.item.beschreibung||''}</div>
          <div style="font-size:11px;color:var(--sub)">${s.type==='rechnung'?'Rechnung':'Eintrag'} · ${fd(s.item.datum||s.item.date)} · ${fmt(Math.abs(s.item.betrag||s.item.amount||0))}</div>
        </div>
        <span class="bms-match-score">${s.score}%</span>
      </div>
    `).join('')}
  ` : `<div style="font-size:12px;color:var(--sub);padding:8px 0">Keine automatischen Vorschläge</div>`;
  
  const html = `
    <div id="bank-match-overlay" onclick="if(event.target===this)closeBankMatch()">
      <div id="bank-match-sheet">
        <div class="bms-handle"></div>
        <div class="bms-title">${tx.name || 'Banktransaktion'}</div>
        <div class="bms-amount" style="color:${amtColor}">${sign}${fmt(Math.abs(tx.amount))}</div>
        <div style="font-size:12px;color:var(--sub);margin-bottom:8px">
          <i class="fas fa-calendar-alt" style="margin-right:4px"></i>${fd(tx.date)}
          ${tx.ref ? `&nbsp;·&nbsp;<i class="fas fa-comment-alt" style="margin-right:4px"></i>${tx.ref.slice(0,60)}` : ''}
        </div>
        
        ${suggestHTML}
        
        <div class="bms-section">Oder neuen Eintrag erstellen</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select id="bms-kat" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:inherit;font-size:12px">
            <option value="">Kategorie wählen...</option>
            ${(isIncoming ? ['Dienstleistung','Produktverkauf','Sonstiges Einnahme'] : (typeof KA!=='undefined'?KA:[])).map(k=>`<option>${k}</option>`).join('')}
          </select>
        </div>
        <input type="text" id="bms-beschr" placeholder="Beschreibung (optional)"
          value="${(tx.name||'').slice(0,60)}"
          style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:12px">
        
        <div class="bms-actions">
          <button class="bms-btn success" onclick="_buchFromSheet('new')">
            <i class="fas fa-plus" style="margin-right:6px"></i>Neu buchen
          </button>
          ${suggestions.length>0 ? `<button class="bms-btn primary" onclick="_buchFromSheet('selected')">
            <i class="fas fa-link" style="margin-right:6px"></i>Zuordnen
          </button>` : ''}
          <button class="bms-btn neutral" onclick="_ignoreAndClose()">
            <i class="fas fa-eye-slash" style="margin-right:6px"></i>Ignorieren
          </button>
        </div>
        <div style="text-align:center;margin-top:10px">
          <span onclick="closeBankMatch()" style="font-size:12px;color:var(--sub);cursor:pointer">Schließen</span>
        </div>
      </div>
    </div>`;
  
  const existing = document.getElementById('bank-match-overlay');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function _selectSuggest(el, id, type) {
  document.querySelectorAll('.bms-suggest').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  _selectedMatchId = { id, type };
}

async function _buchFromSheet(mode) {
  if (!_currentTxId) return;
  const tx = _bankTx.find(t => t.id === _currentTxId);
  if (!tx) return;
  
  if (mode === 'selected') {
    if (!_selectedMatchId) { toast('Bitte zuerst einen Vorschlag auswählen', 'err'); return; }
    await _buchTx(_currentTxId, { type: _selectedMatchId.type, itemId: _selectedMatchId.id });
  } else if (mode === 'new') {
    const kat    = document.getElementById('bms-kat')?.value || (tx.amount > 0 ? 'Sonstiges Einnahme' : 'Sonstiges Ausgabe');
    const beschr = document.getElementById('bms-beschr')?.value?.trim() || tx.name || 'Banktransaktion';
    if (!kat) { toast('Bitte Kategorie wählen', 'err'); return; }
    await _buchTx(_currentTxId, { type:'new', kategorie:kat, beschreibung:beschr });
  }
  closeBankMatch();
}

function _ignoreAndClose() {
  if (_currentTxId) {
    _bankMatches[_currentTxId] = { status:'ignored' };
    _saveBankState();
    renderBankabgleich();
  }
  closeBankMatch();
}

function closeBankMatch() {
  const el = document.getElementById('bank-match-overlay');
  if (el) el.remove();
  _currentTxId = null;
}

// ── RENDER ─────────────────────────────────────────────────────────────────

function _renderDropZone() {
  const zone = document.getElementById('bank-drop-zone');
  if (!zone) return;
  zone.innerHTML = `
    <div class="bank-drop-icon"><i class="fas fa-file-import"></i></div>
    <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Kontoauszug importieren</div>
    <div style="font-size:12px;color:var(--sub);margin-bottom:12px">Datei hier ablegen oder klicken zum Auswählen</div>
    <div class="bank-formats">
      <span class="bank-fmt-badge">CSV</span>
      <span class="bank-fmt-badge">MT940</span>
      <span class="bank-fmt-badge">CAMT.053</span>
    </div>
    <div style="font-size:11px;color:var(--sub)">Sparkasse · Deutsche Bank · Commerzbank · VR Bank · ING · DKB · N26 · Comdirect</div>
  `;
}

function renderBankabgleich() {
  const container = document.getElementById('bank-tx-container');
  if (!container) return;
  
  // Считаем статистику
  const total     = _bankTx.length;
  const matched   = _bankTx.filter(t => ['matched','booked'].includes(_bankMatches[t.id]?.status)).length;
  const booked    = _bankTx.filter(t => _bankMatches[t.id]?.status === 'booked').length;
  const unmatched = _bankTx.filter(t => !_bankMatches[t.id] || _bankMatches[t.id].status === 'suggestion').length;
  const ignored   = _bankTx.filter(t => _bankMatches[t.id]?.status === 'ignored').length;
  
  // Обновляем статистику
  const stats = document.getElementById('bank-stats');
  if (stats) stats.innerHTML = `
    <div class="bank-stat-card">
      <div class="bank-stat-label">Gesamt</div>
      <div class="bank-stat-val">${total}</div>
    </div>
    <div class="bank-stat-card">
      <div class="bank-stat-label" style="color:var(--yellow)">Offen</div>
      <div class="bank-stat-val" style="color:var(--yellow)">${unmatched}</div>
    </div>
    <div class="bank-stat-card">
      <div class="bank-stat-label" style="color:var(--blue)">Zugeordnet</div>
      <div class="bank-stat-val" style="color:var(--blue)">${matched}</div>
    </div>
    <div class="bank-stat-card">
      <div class="bank-stat-label" style="color:var(--green)">Gebucht</div>
      <div class="bank-stat-val" style="color:var(--green)">${booked}</div>
    </div>
  `;
  
  // Прогресс матчинга
  const progBar = document.getElementById('bank-match-progress');
  if (progBar && total > 0) {
    const pct = Math.round((booked / total) * 100);
    progBar.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:4px">
        <span>Buchungsfortschritt</span><span>${pct}%</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px;transition:width .4s"></div>
      </div>
    `;
  }
  
  if (!total) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--sub)">
        <i class="fas fa-university" style="font-size:40px;opacity:.2;margin-bottom:12px;display:block"></i>
        <div style="font-size:14px;font-weight:600">Noch keine Transaktionen importiert</div>
        <div style="font-size:12px;margin-top:4px">Importiere einen Kontoauszug von deiner Bank</div>
      </div>`;
    return;
  }
  
  // Фильтрация
  let filtered = _bankTx;
  if (_bankFilter === 'unmatched')  filtered = _bankTx.filter(t => !_bankMatches[t.id] || ['suggestion'].includes(_bankMatches[t.id]?.status));
  if (_bankFilter === 'matched')    filtered = _bankTx.filter(t => _bankMatches[t.id]?.status === 'matched');
  if (_bankFilter === 'booked')     filtered = _bankTx.filter(t => _bankMatches[t.id]?.status === 'booked');
  if (_bankFilter === 'ignored')    filtered = _bankTx.filter(t => _bankMatches[t.id]?.status === 'ignored');
  
  // Пагинация
  const totalPages = Math.max(1, Math.ceil(filtered.length / BANK_PER_PAGE));
  if (_bankPage > totalPages) _bankPage = 1;
  const page = filtered.slice((_bankPage-1)*BANK_PER_PAGE, _bankPage*BANK_PER_PAGE);
  
  container.innerHTML = `
    <div class="bank-tx-list">
      ${page.map(tx => {
        const match  = _bankMatches[tx.id] || {};
        const status = match.status || 'unmatched';
        const isPos  = tx.amount > 0;
        
        let badge = '';
        if (status === 'booked')     badge = '<span class="bank-tx-badge booked">Gebucht</span>';
        else if (status === 'matched') badge = '<span class="bank-tx-badge matched">Zugeordnet</span>';
        else if (status === 'ignored') badge = '<span class="bank-tx-badge ignored">Ignoriert</span>';
        else if (match.suggestions?.length > 0) badge = `<span class="bank-tx-badge unmatched">${match.suggestions.length} Vorschlag${match.suggestions.length>1?'e':''}</span>`;
        else badge = '<span class="bank-tx-badge unmatched">Offen</span>';
        
        const matchedItem = match.item;
        const matchInfo = matchedItem
          ? `<div style="font-size:10px;color:var(--blue);margin-top:1px"><i class="fas fa-link" style="margin-right:3px"></i>${matchedItem.nr||matchedItem.beschreibung||''}</div>`
          : '';
        
        return `
          <div class="bank-tx ${status}" onclick="openMatchSheet('${tx.id}')">
            <div class="bank-tx-date">${fd(tx.date)}</div>
            <div class="bank-tx-info">
              <div class="bank-tx-name">${tx.name || '—'}</div>
              <div class="bank-tx-ref">${tx.ref?.slice(0,60) || ''}</div>
              ${matchInfo}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <span class="bank-tx-amt ${isPos?'pos':'neg'}">${isPos?'+':''}${fmt(Math.abs(tx.amount))}</span>
              ${badge}
            </div>
          </div>`;
      }).join('')}
    </div>
    ${totalPages > 1 ? `
      <div style="display:flex;justify-content:center;gap:8px;margin-top:14px;align-items:center">
        <button onclick="_bankPrevPage()" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--s2);cursor:pointer;font-size:12px" ${_bankPage===1?'disabled':''}>‹ Zurück</button>
        <span style="font-size:12px;color:var(--sub)">Seite ${_bankPage} / ${totalPages}</span>
        <button onclick="_bankNextPage(${totalPages})" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--s2);cursor:pointer;font-size:12px" ${_bankPage===totalPages?'disabled':''}>Weiter ›</button>
      </div>` : ''}
  `;
}

function _bankPrevPage() { if (_bankPage > 1) { _bankPage--; renderBankabgleich(); } }
function _bankNextPage(total) { if (_bankPage < total) { _bankPage++; renderBankabgleich(); } }

function setBankFilter(f, btn) {
  _bankFilter = f;
  document.querySelectorAll('.bank-ftab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _bankPage = 1;
  renderBankabgleich();
}

function clearBankData() {
  appConfirm('Alle importierten Transaktionen löschen?', {
    title: 'Bankdaten löschen', okLabel:'Ja, löschen', danger:true
  }).then(ok => {
    if (!ok) return;
    _bankTx = []; _bankMatches = {};
    localStorage.removeItem('ml_bank_tx');
    localStorage.removeItem('ml_bank_matches');
    renderBankabgleich();
    _renderDropZone();
    toast('Bankdaten gelöscht', 'ok');
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────

function initBankabgleich() {
  _loadBankState();
  
  // Drop zone events
  const zone  = document.getElementById('bank-drop-zone');
  const input = document.getElementById('bank-file-input');
  if (!zone || !input) return;
  
  _renderDropZone();
  
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleBankFile(file);
  });
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { handleBankFile(file); input.value = ''; }
  });
  
  renderBankabgleich();
  autoMatchAll();
  renderBankabgleich();
}
