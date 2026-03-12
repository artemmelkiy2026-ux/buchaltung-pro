// ── JOURNAL (GoBD Buchungsjournal) ────────────────────────────────────────

function renderJournal() {
  const tb = document.getElementById('journal-tbody');
  const em = document.getElementById('journal-empty');
  if (!tb) return;

  // Только записи которые участвуют в сторно-цепочках
  const stornoIds  = new Set(data.eintraege.filter(e => e.is_storno).map(e => e.storno_of).filter(Boolean));
  const korrIds    = new Set(data.eintraege.filter(e => e.korrektur_von).map(e => e.korrektur_von).filter(Boolean));
  const involved   = new Set([...stornoIds, ...korrIds]);

  // Собираем все записи в цепочках
  const journalEntries = data.eintraege.filter(e =>
    e.is_storno || e.korrektur_von || involved.has(e.id)
  ).sort((a, b) => b.datum.localeCompare(a.datum));

  if (!journalEntries.length) {
    tb.innerHTML = '';
    em.style.display = 'block';
    return;
  }
  em.style.display = 'none';

  // Группируем в цепочки по корневому id
  function getRootId(e) {
    if (e.korrektur_von) return e.korrektur_von;
    if (e.is_storno && e.storno_of) return e.storno_of;
    return e.id;
  }

  const chains = {};
  journalEntries.forEach(e => {
    const root = getRootId(e);
    if (!chains[root]) chains[root] = [];
    chains[root].push(e);
  });

  // Сортируем внутри цепочки: оригинал → сторно → корректура
  function chainOrder(e) {
    if (!e.is_storno && !e.korrektur_von) return 0; // оригинал
    if (e.is_storno) return 1;                       // сторно
    if (e.korrektur_von) return 2;                   // корректура
    return 3;
  }

  const mob = isMob();
  let html = '';

  Object.values(chains).forEach((chain, ci) => {
    chain.sort((a, b) => chainOrder(a) - chainOrder(b));

    chain.forEach((e, idx) => {
      // Бейдж и стиль строки
      let badge = '', rowStyle = '', rowBg = '';

      if (!e.is_storno && !e.korrektur_von && involved.has(e.id)) {
        // Оригинал который был сторнирован
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(224,140,26,.12);color:var(--yellow);border:1px solid rgba(224,140,26,.3)">● Storniert</span>`;
        rowStyle = 'opacity:0.6;';
        rowBg = 'background:rgba(224,140,26,.04);';
      } else if (e.is_storno) {
        // Сторно-запись
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(148,163,184,.12);color:var(--sub);border:1px solid var(--border)">↩ Gegenbuchung</span>`;
        rowStyle = 'opacity:0.55;';
        rowBg = 'background:rgba(148,163,184,.04);';
      } else if (e.korrektur_von) {
        // Корректирующая запись
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(93,157,105,.12);color:var(--green);border:1px solid rgba(93,157,105,.3)">✎ Korrektur</span>`;
        rowBg = 'background:rgba(93,157,105,.04);';
      }

      // Связь между записями
      let link = '';
      if (e.is_storno && e.storno_of) {
        const orig = data.eintraege.find(x => x.id === e.storno_of);
        if (orig) link = `<div style="font-size:10px;color:var(--sub);margin-top:3px">hebt auf: ${fd(orig.datum)} · ${fmt(orig.betrag)}</div>`;
      } else if (e.korrektur_von) {
        const orig = data.eintraege.find(x => x.id === e.korrektur_von);
        if (orig) link = `<div style="font-size:10px;color:var(--sub);margin-top:3px">ersetzt: ${fd(orig.datum)} · ${fmt(orig.betrag)}</div>`;
      } else if (involved.has(e.id)) {
        const stornoRec = data.eintraege.find(x => x.storno_of === e.id);
        const korr = data.eintraege.find(x => x.korrektur_von === e.id);
        if (stornoRec) link = `<div style="font-size:10px;color:var(--sub);margin-top:3px">→ Storno am ${fd(stornoRec.datum)}${korr ? ` · Korrektur: ${fmt(korr.betrag)} am ${fd(korr.datum)}` : ''}</div>`;
      }

      // Разделитель между цепочками
      const chainSep = idx === 0 && ci > 0
        ? `<tr><td colspan="6" style="padding:4px 0;background:var(--bg)"></td></tr>`
        : '';

      html += `${chainSep}<tr style="${rowStyle}${rowBg}border-bottom:1px solid var(--border)">
        <td style="padding:10px 14px;font-family:var(--mono);font-size:11px;white-space:nowrap">${fd(e.datum)}</td>
        <td style="padding:10px 14px">${badge}</td>
        <td style="padding:10px 14px;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="mob-hide">
          ${e.beschreibung||e.kategorie||'—'}
          ${link}
        </td>
        <td style="padding:10px 14px" class="mob-hide">
          <span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'▲':'▼'} ${e.typ}</span>
        </td>
        <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:600;font-size:13px;white-space:nowrap">
          <span style="color:${e.typ==='Einnahme'?'var(--green)':'var(--red)'}">${e.typ==='Einnahme'?'+':'-'}${fmt(e.betrag)}</span>
        </td>
        <td style="padding:10px 14px;font-size:11px;color:var(--sub);font-family:var(--mono)" class="mob-hide">${e.id}</td>
      </tr>`;
    });
  });

  tb.innerHTML = html;

  // Обновляем счётчик
  const total = Object.keys(chains).length;
  const el = document.getElementById('journal-count');
  if (el) el.textContent = `${total} Storno-Kette${total !== 1 ? 'n' : ''}`;
}
