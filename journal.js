// ── JOURNAL (GoBD Buchungsjournal) ────────────────────────────────────────

let journalSortCol = 'datum';
let journalSortAsc = false;
let journalPage = 1;
const journalPerPage = 3;
let journalTab = 'eintraege'; // 'eintraege' | 'rechnungen'

function setJournalTab(tab) {
  journalTab = tab;
  journalPage = 1;
  const btnE = document.getElementById('jtab-eintraege');
  const btnR = document.getElementById('jtab-rechnungen');
  if(btnE) { btnE.style.background = tab==='eintraege'?'var(--blue)':''; btnE.style.color = tab==='eintraege'?'#fff':''; }
  if(btnR) { btnR.style.background = tab==='rechnungen'?'var(--blue)':''; btnR.style.color = tab==='rechnungen'?'#fff':''; }
  // Показываем/скрываем сортировку Einträge
  const ctrl = document.getElementById('journal-eintraege-controls');
  if(ctrl) ctrl.style.display = tab==='eintraege' ? '' : 'none';
  renderJournal();
}

function sortJournal(col) {
  if (journalSortCol === col) { journalSortAsc = !journalSortAsc; }
  else { journalSortCol = col; journalSortAsc = false; }
  journalPage = 1;
  renderJournal();
}

function renderJournal() {
  const tb = document.getElementById('journal-tbody');
  const em = document.getElementById('journal-empty');
  if (!tb) return;
  // Dispatch по вкладке
  if (journalTab === 'rechnungen') { renderRechnungenLog(); return; }

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

    html += `<div style="background:var(--s1);border:1px solid var(--border);border-radius:6px;margin-bottom:12px;overflow:hidden">`;

    chain.forEach((e, idx) => {
      let badge = '', rowBg = '', opacity = '1';

      if (!e.is_storno && !e.korrektur_von && involved.has(e.id)) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:rgba(224,140,26,.12);color:var(--yellow);border:1px solid rgba(224,140,26,.3)">● Storniert</span>`;
        rowBg = 'background:rgba(224,140,26,.03);';
        opacity = '0.7';
      } else if (e.is_storno) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:rgba(148,163,184,.12);color:var(--sub);border:1px solid var(--border)">↩ Gegenbuchung</span>`;
        rowBg = 'background:rgba(148,163,184,.03);';
        opacity = '0.6';
      } else if (e.korrektur_von) {
        badge = `<span class="badge-korrektur">● Korrektur</span>`;
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
        if (stornoRec) link = `<span class="badge-storno">→ Storno ${fd(stornoRec.datum)}${korr ? ` · Korrektur ${fmt(korr.betrag)}` : ''}</span>`;
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
            <div style="flex:0 0 auto;width:32px;height:32px;border-radius:var(--r);background:${iconBg};display:flex;align-items:center;justify-content:center;margin-top:2px">
              <i class="fas fa-arrow-${isEin?'up':'down'}" style="color:${iconColor};font-size:11px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                ${badge}
                <span style="font-size:11px;color:var(--sub);font-family:var(--mono)">${fd(e.datum)}</span>
                ${e.created_at ? `<span style="font-size:10px;color:var(--sub);opacity:.6;font-family:var(--mono)">${fdt(e.created_at).slice(11)}</span>` : ''}
              </div>
              <div style="font-size:13px;font-weight:600;color:var(--text);word-break:break-word;line-height:1.3${link?';margin-bottom:4px':''}">
                ${e.belegnr?`<span style="font-size:10px;font-weight:700;font-family:var(--mono);background:var(--blue);color:#fff;padding:1px 5px;border-radius:4px;margin-right:5px">Nr.${e.belegnr}</span>`:''}
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

  // Пагинация
  const totalChains = chainList.length;
  const totalPages = Math.ceil(totalChains / journalPerPage);
  if (journalPage > totalPages) journalPage = totalPages || 1;
  const pgStart = (journalPage - 1) * journalPerPage;
  const pgEnd   = pgStart + journalPerPage;
  const pageChains = chainList.slice(pgStart, pgEnd);

  // Рендерим только текущую страницу
  let pageHtml = '';
  pageChains.forEach((chain) => {
    chain.sort((a, b) => {
      const ta = a.created_at || a.datum || '';
      const tb2 = b.created_at || b.datum || '';
      return tb2.localeCompare(ta);
    });

    pageHtml += `<div style="background:var(--s1);border:1px solid var(--border);border-radius:6px;margin-bottom:12px;overflow:hidden">`;

    chain.forEach((e, idx) => {
      let badge = '', rowBg = '', opacity = '1';
      if (!e.is_storno && !e.korrektur_von && involved.has(e.id)) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:rgba(224,140,26,.12);color:var(--yellow);border:1px solid rgba(224,140,26,.3)">● Storniert</span>`;
        rowBg = 'background:rgba(224,140,26,.03);'; opacity = '0.7';
      } else if (e.is_storno) {
        badge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:rgba(148,163,184,.12);color:var(--sub);border:1px solid var(--border)">↩ Gegenbuchung</span>`;
        rowBg = 'background:rgba(148,163,184,.03);'; opacity = '0.6';
      } else if (e.korrektur_von) {
        badge = `<span class="badge-korrektur">● Korrektur</span>`;
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
        if (stornoRec) link = `<span class="badge-storno">→ Storno ${fd(stornoRec.datum)}${korr ? ` · Korrektur ${fmt(korr.betrag)}` : ''}</span>`;
      }
      const sep = idx > 0 ? `<div style="height:1px;background:var(--border);margin:0 14px"></div>` : '';
      const isEin = e.typ === 'Einnahme';
      const iconBg = isEin ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
      const iconColor = isEin ? 'var(--green)' : 'var(--red)';
      const amtColor = isEin ? 'var(--green)' : 'var(--red)';
      const amtSign = isEin ? '+' : '−';
      pageHtml += `${sep}
        <div style="display:flex;flex-direction:column;padding:12px 14px;${rowBg}opacity:${opacity}">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
            <div style="flex:0 0 auto;width:32px;height:32px;border-radius:var(--r);background:${iconBg};display:flex;align-items:center;justify-content:center;margin-top:2px">
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
    pageHtml += `</div>`;
  });

  tb.innerHTML = pageHtml;
  window._journalPagerCb=function(p){journalPage=p;renderJournal();}
  renderPager('journal-pagination', journalPage, totalPages, totalChains, '_journalPagerCb');

  const el = document.getElementById('journal-count');
  if (el) el.textContent = `${totalChains} Storno-Kette${totalChains !== 1 ? 'n' : ''}`;
}


// ── RECHNUNGEN-LOG RENDERER ───────────────────────────────────────────────
function renderRechnungenLog() {
  const tb  = document.getElementById('journal-tbody');
  const em  = document.getElementById('journal-empty');
  const pg  = document.getElementById('journal-pagination');
  if (!tb) return;

  const log = (data.rechnungenLog || []).slice(); // уже отсортирован по created_at desc
  const AKTION_LABEL = {
    'erstellt':  { label:'Erstellt',       color:'var(--green)', icon:'fa-plus-circle' },
    'geaendert': { label:'Geändert',        color:'var(--blue)',  icon:'fa-edit' },
    'geloescht': { label:'Gelöscht',        color:'var(--red)',   icon:'fa-trash' },
    'bezahlt':   { label:'Bezahlt + Einnahme', color:'var(--green)', icon:'fa-check-circle' },
    'status':    { label:'Status geändert', color:'var(--yellow)', icon:'fa-exchange-alt' },
  };

  if (!log.length) {
    tb.innerHTML = '';
    em.style.display = 'block';
    if(pg) pg.innerHTML = '';
    return;
  }
  em.style.display = 'none';

  const PER = 10;
  const totalPages = Math.max(1, Math.ceil(log.length / PER));
  if(journalPage > totalPages) journalPage = totalPages;
  const items = log.slice((journalPage-1)*PER, journalPage*PER);

  tb.innerHTML = items.map((e,i) => {
    const a = AKTION_LABEL[e.aktion] || { label:e.aktion, color:'var(--sub)', icon:'fa-circle' };
    const dt = e.created_at ? fdt(e.created_at) : '—';

    // Парсим alt/neu значения
    let alt = null, neu = null;
    try { alt = e.alt_wert ? JSON.parse(e.alt_wert) : null; } catch(ex){}
    try { neu = e.neu_wert ? JSON.parse(e.neu_wert) : null; } catch(ex){}

    // Строим строки изменений
    let changeRows = '';
    if(alt && neu) {
      const FIELD_LABELS = { nr:'Nr.', betrag:'Betrag', status:'Status', kunde:'Kunde', faellig:'Fällig', einnahme_betrag:'Einnahme', datum_bezahlt:'Datum' };
      const changes = Object.keys({...alt,...neu}).filter(k => JSON.stringify(alt?.[k]) !== JSON.stringify(neu?.[k]));
      changeRows = changes.map(k => {
        const av = alt?.[k] !== undefined ? alt[k] : null;
        const nv = neu?.[k] !== undefined ? neu[k] : null;
        const fmtV = v => v===null||v===undefined ? '—' : (typeof v==='number' ? fmt(v) : String(v));
        const label = FIELD_LABELS[k] || k;
        return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 0">
          <span style="color:var(--sub);min-width:50px">${label}</span>
          ${av!==null ? `<span style="color:var(--red);text-decoration:line-through;font-family:var(--mono)">${fmtV(av)}</span><span style="color:var(--sub)">→</span>` : ''}
          <span style="color:var(--green);font-weight:600;font-family:var(--mono)">${fmtV(nv)}</span>
        </div>`;
      }).join('');
    } else if(neu) {
      const FIELD_LABELS = { nr:'Nr.', betrag:'Betrag', status:'Status', kunde:'Kunde' };
      changeRows = Object.entries(neu).filter(([,v])=>v!=null).slice(0,4).map(([k,v])=>{
        const label = FIELD_LABELS[k] || k;
        return `<div style="font-size:11px;color:var(--sub);padding:2px 0"><span style="min-width:50px;display:inline-block">${label}</span> <span style="color:var(--text);font-family:var(--mono);font-weight:600">${typeof v==='number'?fmt(v):v}</span></div>`;
      }).join('');
    }

    // Цвет фона строки
    const rowBg = e.aktion==='geloescht' ? 'background:rgba(239,68,68,.03)' :
                  e.aktion==='bezahlt'   ? 'background:rgba(34,197,94,.03)'  :
                  e.aktion==='erstellt'  ? 'background:rgba(34,197,94,.02)'  : '';

    const sep = i > 0 ? '' : '';
    return `<div style="background:var(--s1);border:1px solid var(--border);border-radius:6px;margin-bottom:10px;overflow:hidden">
      <div style="display:flex;align-items:flex-start;gap:12px;padding:13px 14px;${rowBg}">
        <!-- Иконка -->
        <div style="flex:0 0 32px;height:32px;border-radius:var(--r);background:${a.color}18;display:flex;align-items:center;justify-content:center;margin-top:1px">
          <i class="fas ${a.icon}" style="color:${a.color};font-size:13px"></i>
        </div>
        <!-- Контент -->
        <div style="flex:1;min-width:0">
          <!-- Бейдж + Nr + дата+время -->
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;background:${a.color}18;color:${a.color};border:1px solid ${a.color}33">${a.label}</span>
            <span style="font-size:12px;font-weight:800;font-family:var(--mono);background:var(--s2);padding:2px 8px;border-radius:6px;border:1px solid var(--border)">Nr.${e.rechnung_nr||'—'}</span>
            <span style="font-size:11px;color:var(--sub);font-family:var(--mono)">${dt}</span>
          </div>
          <!-- Изменения -->
          ${changeRows ? `<div style="border-top:1px solid var(--border);padding-top:7px;margin-top:3px">${changeRows}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  window._rlPagerCb = function(p){ journalPage=p; renderRechnungenLog(); };
  renderPager('journal-pagination', journalPage, totalPages, log.length, '_rlPagerCb');
}
