// ── JOURNAL (GoBD Buchungsjournal) ────────────────────────────────────────

let journalSortCol = 'datum';
let journalSortAsc = false;

function sortJournal(col) {
  if (journalSortCol === col) { journalSortAsc = !journalSortAsc; }
  else { journalSortCol = col; journalSortAsc = false; }
  renderJournal();
}

function renderJournal() {
  const tb = document.getElementById('journal-tbody');
  const em = document.getElementById('journal-empty');
  if (!tb) return;

  const stornoIds = new Set(data.eintraege.filter(e => e.is_storno).map(e => e.storno_of).filter(Boolean));
  const korrIds   = new Set(data.eintraege.filter(e => e.korrektur_von).map(e => e.korrektur_von).filter(Boolean));
  const involved  = new Set([...stornoIds, ...korrIds]);

  const journalEntries = data.eintraege.filter(e =>
    e.is_storno || e.korrektur_von || involved.has(e.id)
  );

  if (!journalEntries.length) {
    tb.innerHTML = '';
    em.style.display = 'block';
    // Сбрасываем кнопки
    ['datum','betrag'].forEach(c => {
      const b = document.getElementById('jsort-'+c);
      if(b) { b.style.background=''; b.style.color=''; b.textContent = c==='datum'?'Datum':'Betrag'; }
    });
    return;
  }
  em.style.display = 'none';

  function getRootId(e) {
    if (e.korrektur_von) return e.korrektur_von;
    if (e.is_storno && e.storno_of) return e.storno_of;
    return e.id;
  }

  // Собираем цепочки
  const chains = {};
  journalEntries.forEach(e => {
    const root = getRootId(e);
    if (!chains[root]) chains[root] = [];
    if (!chains[root].find(x => x.id === e.id)) chains[root].push(e);
  });

  // Убеждаемся что оригинал тоже в цепочке
  Object.keys(chains).forEach(rootId => {
    const orig = data.eintraege.find(x => x.id === rootId);
    if (orig && !chains[rootId].find(x => x.id === rootId)) {
      chains[rootId].unshift(orig);
    }
  });

  function chainOrder(e) {
    if (!e.is_storno && !e.korrektur_von) return 0;
    if (e.is_storno) return 1;
    if (e.korrektur_von) return 2;
    return 3;
  }

  // Берём максимальный created_at по всей цепочке (оригинал + все сторно/корректуры)
  function getChainLatestTs(chain) {
    // Собираем все связанные записи — не только те что попали в chain
    const allIds = new Set(chain.map(e => e.id));
    // Добавляем записи из data.eintraege которые ссылаются на любой id цепочки
    const extra = data.eintraege.filter(e =>
      (e.storno_of && allIds.has(e.storno_of)) ||
      (e.korrektur_von && allIds.has(e.korrektur_von))
    );
    const all = [...chain, ...extra];
    return all.reduce((latest, e) => {
      const ts = e.created_at || e.updated_at || e.datum || '0000-00-00';
      return ts > latest ? ts : latest;
    }, '0000-00-00');
  }
  function getChainMaxBetrag(chain) {
    return Math.max(...chain.map(e => e.betrag));
  }

  // Сортируем цепочки
  let chainList = Object.values(chains);
  chainList.sort((a, b) => {
    const va = journalSortCol === 'datum' ? getChainLatestTs(a) : getChainMaxBetrag(a);
    const vb = journalSortCol === 'datum' ? getChainLatestTs(b) : getChainMaxBetrag(b);
    return journalSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  // Обновляем кнопки сортировки
  ['datum','betrag'].forEach(c => {
    const b = document.getElementById('jsort-'+c);
    if (!b) return;
    const lbl = c === 'datum' ? 'Datum' : 'Betrag';
    b.style.background = journalSortCol === c ? 'var(--blue)' : '';
    b.style.color      = journalSortCol === c ? '#fff' : '';
    b.textContent = lbl + (journalSortCol === c ? (journalSortAsc ? ' ↑' : ' ↓') : '');
  });

  let html = '';

  chainList.forEach((chain) => {
    // Внутри цепочки: по created_at убыванием — самое новое изменение вверху
    chain.sort((a, b) => {
      const ta = a.created_at || a.datum || '';
      const tb = b.created_at || b.datum || '';
      return tb.localeCompare(ta); // новее = выше
    });

    html += `<div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden">`;

    chain.forEach((e, idx) => {
      let badge = '', rowBg = '', opacity = '1';

      if (!e.is_storno && !e.korrektur_von && involved.has(e.id)) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(224,140,26,.12);color:var(--yellow);border:1px solid rgba(224,140,26,.3)">● Storniert</span>`;
        rowBg = 'background:rgba(224,140,26,.03);';
        opacity = '0.7';
      } else if (e.is_storno) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(148,163,184,.12);color:var(--sub);border:1px solid var(--border)">↩ Gegenbuchung</span>`;
        rowBg = 'background:rgba(148,163,184,.03);';
        opacity = '0.6';
      } else if (e.korrektur_von) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(93,157,105,.12);color:var(--green);border:1px solid rgba(93,157,105,.3)">✎ Korrektur</span>`;
        rowBg = 'background:rgba(93,157,105,.03);';
      }

      let link = '';
      if (e.is_storno && e.storno_of) {
        const orig = data.eintraege.find(x => x.id === e.storno_of);
        if (orig) link = `<span style="font-size:10px;color:var(--sub)">hebt auf: ${fd(orig.datum)} · ${fmt(orig.betrag)}</span>`;
      } else if (e.korrektur_von) {
        const orig = data.eintraege.find(x => x.id === e.korrektur_von);
        if (orig) link = `<span style="font-size:10px;color:var(--sub)">ersetzt: ${fd(orig.datum)} · ${fmt(orig.betrag)}</span>`;
      } else if (involved.has(e.id)) {
        const stornoRec = data.eintraege.find(x => x.storno_of === e.id);
        const korr = data.eintraege.find(x => x.korrektur_von === e.id);
        if (stornoRec) link = `<span style="font-size:10px;color:var(--sub)">→ Storno ${fd(stornoRec.datum)}${korr ? ` · Korrektur ${fmt(korr.betrag)}` : ''}</span>`;
      }

      const sep = idx > 0 ? `<div style="height:1px;background:var(--border);margin:0 14px"></div>` : '';
      const isEin = e.typ === 'Einnahme';
      const iconBg = isEin ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
      const iconColor = isEin ? 'var(--green)' : 'var(--red)';
      const amtColor = isEin ? 'var(--green)' : 'var(--red)';
      const amtSign = isEin ? '+' : '−';

      html += `${sep}
        <div style="display:flex;flex-direction:column;padding:12px 14px;${rowBg}opacity:${opacity}">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
            <div style="flex:0 0 auto;width:36px;height:36px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;margin-top:2px">
              <i class="fas fa-arrow-${isEin?'up':'down'}" style="color:${iconColor};font-size:11px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                ${badge}
                <span style="font-size:11px;color:var(--sub);font-family:var(--mono)">${fd(e.datum)}</span>
              </div>
              <div style="font-size:13px;font-weight:600;color:var(--text);word-break:break-word;line-height:1.3${link?';margin-bottom:4px':''}">
                ${e.beschreibung||e.kategorie||'—'}
              </div>
              ${link ? `<div>${link}</div>` : ''}
            </div>
            <div style="flex:0 0 auto;text-align:right">
              <div style="font-size:15px;font-weight:700;font-family:var(--mono);color:${amtColor};white-space:nowrap">${amtSign}${fmt(e.betrag)}</div>
              <div style="font-size:10px;color:var(--sub);margin-top:2px">${e.typ}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--sub)">
              <span>${e.kategorie||'—'}</span>
              ${e.zahlungsart ? `<span>·</span><span class="badge" style="font-size:10px">${e.zahlungsart}</span>` : ''}
            </div>
            <div style="font-size:10px;color:var(--sub);font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;max-width:120px;white-space:nowrap" title="${e.id}">${e.id}</div>
          </div>
        </div>`;
    });

    html += `</div>`;
  });

  tb.innerHTML = html;

  const total = chainList.length;
  const el = document.getElementById('journal-count');
  if (el) el.textContent = `${total} Storno-Kette${total !== 1 ? 'n' : ''}`;
}
