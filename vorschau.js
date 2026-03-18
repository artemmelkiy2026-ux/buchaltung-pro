// ═══════════════════════════════════════════════════════════════════
// VORSCHAU — PDF-Vorschau Modal für Angebot und Rechnung
// ═══════════════════════════════════════════════════════════════════

function openVorschau(type) {
  // type = 'angebot' | 'rechnung'
  let htmlContent;
  if (type === 'rechnung') {
    const pos = getRechPositionen();
    if (!pos.length) { toast('Bitte mind. eine Position hinzufügen', 'err'); return; }
    const nr    = document.getElementById('rn-nr').value.trim() || 'Entwurf';
    const datum = document.getElementById('rn-dat').value;
    const r = {
      nr, datum,
      faellig:   document.getElementById('rn-faellig')?.value || '',
      kunde:     document.getElementById('rn-kunde')?.value.trim() || '',
      adresse:   document.getElementById('rn-adresse')?.value.trim() || '',
      email:     document.getElementById('rn-email')?.value.trim() || '',
      tel:       document.getElementById('rn-tel')?.value.trim() || '',
      notiz:     document.getElementById('rn-notiz')?.value.trim() || '',
      positionen: pos,
      betrag:    pos.reduce((s,p) => s + (p.menge||1) * (p.netto||p.preis||0), 0),
      mwstMode:  typeof editRechId !== 'undefined' && editRechId
        ? (data.rechnungen||[]).find(x=>x.id===editRechId)?.mwstMode || null
        : null,
    };
    htmlContent = buildRechnungHTML(r);
  } else {
    // Angebot
    const positionen = _angGetPos ? _angGetPos() : [];
    const a = {
      nr:       document.getElementById('ang-nr')?.value || '',
      datum:    document.getElementById('ang-dat')?.value || '',
      gueltig:  document.getElementById('ang-gueltig')?.value || '',
      kunde:    document.getElementById('ang-kunde')?.value || '',
      adresse:  document.getElementById('ang-adresse')?.value || '',
      betreff:  document.getElementById('ang-betreff')?.value || '',
      kopftext: document.getElementById('ang-kopftext')?.value || '',
      fusstext: document.getElementById('ang-fusstext')?.value || '',
      betrag:   parseFloat(document.getElementById('ang-sum-brutto')?.textContent) || 0,
      positionen,
    };
    // Build HTML the same way as angDruck but inline
    let firma = {};
    try { firma = JSON.parse(localStorage.getItem('bp_firma')||'{}'); } catch(e){}
    const rows = (a.positionen||[]).map(p=>`<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.bez||''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.menge||1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(p.netto)} €</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.rate||0}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt((p.menge||1)*p.brutto)} €</td>
    </tr>`).join('');
    const netto  = r2((a.positionen||[]).reduce((s,p)=>s+(p.menge||1)*p.netto,0));
    const brutto = a.betrag||0;
    const mwst   = r2(brutto-netto);
    const logoSrc = firma.logo || null;

    htmlContent = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>Angebot ${a.nr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:0 auto}
  h1{font-size:24px;font-weight:800;color:#1a4578;margin-bottom:4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #1a4578}
  .firma-info{font-size:12px;color:#555;line-height:1.6}
  .ang-nr{text-align:right}
  .ang-nr h2{font-size:20px;color:#1a4578;margin-bottom:6px}
  .ang-nr p{font-size:12px;color:#555;margin:2px 0}
  .kunde-box{background:#f8f9fa;padding:16px;border-radius:6px;margin-bottom:24px;min-height:70px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead{background:#1a4578;color:#fff}
  thead th{padding:10px 12px;font-size:12px;text-align:left}
  thead th:nth-child(n+2){text-align:center}
  thead th:last-child{text-align:right}
  .total-row td{padding:10px 12px;font-size:15px;font-weight:700;background:#f0f4ff;border-top:2px solid #1a4578}
  .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#888;line-height:1.8;text-align:center}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div>
    ${logoSrc ? `<img src="${logoSrc}" style="max-height:60px;max-width:180px;margin-bottom:8px;display:block">` : ''}
    <h1>${firma.name||'Unternehmen'}</h1>
    <div class="firma-info">${firma.strasse||''} ${firma.plz||''} ${firma.ort||''}<br>${firma.tel?'Tel: '+firma.tel+' · ':''}${firma.email||''}</div>
  </div>
  <div class="ang-nr">
    <h2>ANGEBOT</h2>
    <p><strong>Nr.:</strong> ${a.nr}</p>
    <p><strong>Datum:</strong> ${fd(a.datum)}</p>
    ${a.gueltig?`<p><strong>Gültig bis:</strong> ${fd(a.gueltig)}</p>`:''}
  </div>
</div>
<div class="kunde-box">
  <strong>${a.kunde||'—'}</strong><br>
  <span style="font-size:12px;color:#555;white-space:pre-line">${a.adresse||''}</span>
</div>
${a.betreff?`<div style="margin-bottom:16px"><strong>Betreff:</strong> ${a.betreff}</div>`:''}
${a.kopftext?`<div style="margin-bottom:20px;line-height:1.6">${a.kopftext.replace(/\n/g,'<br>')}</div>`:''}
<table>
  <thead><tr>
    <th>Leistung / Beschreibung</th>
    <th style="text-align:center">Menge</th>
    <th style="text-align:right">Preis (Netto)</th>
    <th style="text-align:center">USt.</th>
    <th style="text-align:right">Betrag</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table style="width:260px;margin-left:auto;margin-top:8px">
  <tr><td style="padding:5px 12px;color:#666">Netto</td><td style="padding:5px 12px;text-align:right">${fmt(netto)} €</td></tr>
  <tr><td style="padding:5px 12px;color:#666">MwSt.</td><td style="padding:5px 12px;text-align:right">${fmt(mwst)} €</td></tr>
  <tr class="total-row"><td>Gesamt (Brutto)</td><td style="text-align:right;color:#1a4578">${fmt(brutto)} €</td></tr>
</table>
${a.fusstext?`<div class="footer">${a.fusstext.replace(/\n/g,'<br>')}</div>`:''}
</body></html>`;
  }

  // Inject into modal
  const modal = document.getElementById('vorschau-modal');
  const frame = document.getElementById('vorschau-frame');
  if (!modal || !frame) return;

  // Write HTML into iframe
  frame.srcdoc = htmlContent;
  // Store for "Als PDF" button
  window._vorschauHTML = htmlContent;
  window._vorschauType = type;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeVorschau() {
  const modal = document.getElementById('vorschau-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function vorschauPrint() {
  const frame = document.getElementById('vorschau-frame');
  if (frame && frame.contentWindow) {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }
}

// Close on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeVorschau();
});
