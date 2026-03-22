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
    // Angebot — используем красивый шаблон _buildAngebotHTML
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
    htmlContent = typeof _buildAngebotHTML === 'function'
      ? _buildAngebotHTML(a)
      : `<pre>${JSON.stringify(a,null,2)}</pre>`;
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
