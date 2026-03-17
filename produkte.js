// ── PRODUKTE & LEISTUNGEN ────────────────────────────────────────────────────

let prodFilter = 'alle';
let editProduktId = null;

function setProdFilter(f, btn) {
  prodFilter = f;
  document.querySelectorAll('#p-produkte .ftab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProdukte();
}

function renderProdukte() {
  const list    = document.getElementById('produkte-list');
  const empty   = document.getElementById('produkte-empty');
  const stats   = document.getElementById('produkte-stats');
  const q       = (document.getElementById('produkte-search')?.value || '').toLowerCase();
  if (!list) return;

  const all = data.produkte || [];

  // Статистика
  const artikel  = all.filter(p => p.kategorie === 'Artikel').length;
  const dienst   = all.filter(p => p.kategorie === 'Dienstleistung').length;
  const avgPrice = all.length ? (all.reduce((s,p) => s + (p.vkNetto||0), 0) / all.length) : 0;
  const fmt = v => v.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (stats) stats.innerHTML = `
    <div class="sc b"><div class="sc-lbl">Gesamt</div><div class="sc-val">${all.length}</div><div class="sc-sub">Produkte &amp; Leistungen</div></div>
    <div class="sc g"><div class="sc-lbl">Artikel</div><div class="sc-val">${artikel}</div><div class="sc-sub">${dienst} Dienstleistungen</div></div>
    <div class="sc p"><div class="sc-lbl">Ø VK-Preis (Netto)</div><div class="sc-val">${fmt(avgPrice)} €</div><div class="sc-sub">Durchschnitt</div></div>`;

  // Фильтрация
  let items = all;
  if (prodFilter !== 'alle') items = items.filter(p => p.kategorie === prodFilter);
  if (q) items = items.filter(p =>
    (p.name||'').toLowerCase().includes(q) ||
    (p.artnr||'').toLowerCase().includes(q) ||
    (p.beschreibung||'').toLowerCase().includes(q)
  );

  if (!items.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const katIcon = k => k === 'Artikel' ? 'fa-box' : k === 'Dienstleistung' ? 'fa-tools' : 'fa-ellipsis-h';
  const katIconName = k => k === 'Artikel' ? 'box' : k === 'Dienstleistung' ? 'tools' : 'ellipsis-h';
  const katColor = k => k === 'Artikel' ? 'var(--blue)' : k === 'Dienstleistung' ? 'var(--green)' : 'var(--sub)';

  list.innerHTML = items.map(p => `
    <div class="prod-card" onclick="openProduktModal('${p.id}')">
      <div class="prod-card-left">
        <div class="prod-avatar" style="background:${katColor(p.kategorie)}22;color:${katColor(p.kategorie)}">
          ${ic(katIconName(p.kategorie)||"box")}
        </div>
        <div class="prod-info">
          <div class="prod-name">${p.name}</div>
          <div class="prod-meta">
            ${p.artnr ? `<span>Art.-Nr. ${p.artnr}</span>` : ''}
            <span>${p.einheit || 'Stk'}</span>
            <span>${p.ust ?? 19}% USt.</span>
            ${p.beschreibung ? `<span style="color:var(--sub);font-style:italic">${p.beschreibung.slice(0,40)}${p.beschreibung.length>40?'…':''}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="prod-card-right">
        <div class="prod-prices">
          <div class="prod-price-main">${fmt(p.vkNetto || 0)} €<span style="font-size:10px;color:var(--sub);font-weight:400"> Netto</span></div>
          <div class="prod-price-sub">${fmt(p.vkBrutto || 0)} € Brutto</div>
        </div>
        <div class="prod-actions">
          <button class="rca-btn" onclick="event.stopPropagation();openProduktModal('${p.id}')" title="Bearbeiten">${ic('edit')}</button>
          <button class="rca-btn" onclick="event.stopPropagation();delProdukt('${p.id}')" title="Löschen">${ic('trash')}</button>
        </div>
      </div>
    </div>`).join('');
}

// ── FORM öffnen/schließen ────────────────────────────────────────────────────
function openProduktModal(id) {
  editProduktId = id || null;
  const p = id ? (data.produkte||[]).find(x => x.id === id) : null;

  document.getElementById('ap-name').value        = p?.name || '';
  document.getElementById('ap-einheit').value     = p?.einheit || 'Stk';
  document.getElementById('ap-artnr').value       = p?.artnr || '';
  document.getElementById('ap-kategorie').value   = p?.kategorie || 'Artikel';
  const apUstVal = p?.ust ?? 19;
  document.getElementById('ap-ust').value         = apUstVal;
  const apUstLbl = document.getElementById('ap-ust-label');
  if (apUstLbl) apUstLbl.textContent = apUstVal + '%';
  document.getElementById('ap-ek-netto').value    = p?.ekNetto || '';
  document.getElementById('ap-vk-netto').value    = p?.vkNetto || '';
  document.getElementById('ap-ek-brutto').value   = p?.ekBrutto || '';
  document.getElementById('ap-vk-brutto').value   = p?.vkBrutto || '';
  document.getElementById('ap-beschreibung').value= p?.beschreibung || '';
  document.getElementById('ap-bemerkung').value   = p?.bemerkung || '';
  document.getElementById('ap-einheiten-list').innerHTML = '';
  apAddEinheit();

  const title = document.getElementById('ap-form-title');
  if (title) title.textContent = p ? 'Produkt bearbeiten' : 'Neues Produkt';

  // Первый таб
  document.querySelectorAll('.ap-tab').forEach(b => b.classList.remove('ap-tab-active'));
  document.querySelectorAll('.ap-tab-pane').forEach(pane => pane.style.display = 'none');
  document.querySelector('.ap-tab').classList.add('ap-tab-active');
  document.getElementById('ap-pane-beschreibung').style.display = 'block';

  nav('produkte-form', null);
}

function closeProduktForm() {
  editProduktId = null;
  nav('produkte', document.querySelector('.nav-item[onclick*="produkte"]') || null);
}

// ── СОХРАНЕНИЕ ────────────────────────────────────────────────────────────────
function saveAngProdukt(andNew) {
  const name = document.getElementById('ap-name').value.trim();
  if (!name) return toast('Produktname ist Pflichtfeld!', 'err');
  if (!data.produkte) data.produkte = [];

  const prod = {
    id:          editProduktId || ('p-' + Date.now() + '_' + Math.random().toString(36).slice(2,6)),
    name,
    artnr:       document.getElementById('ap-artnr').value.trim(),
    einheit:     document.getElementById('ap-einheit').value,
    kategorie:   document.getElementById('ap-kategorie').value,
    ust:         parseFloat(document.getElementById('ap-ust').value) || 0,
    ekNetto:     parseFloat(document.getElementById('ap-ek-netto').value) || 0,
    vkNetto:     parseFloat(document.getElementById('ap-vk-netto').value) || 0,
    ekBrutto:    parseFloat(document.getElementById('ap-ek-brutto').value) || 0,
    vkBrutto:    parseFloat(document.getElementById('ap-vk-brutto').value) || 0,
    beschreibung:document.getElementById('ap-beschreibung').value.trim(),
    bemerkung:   document.getElementById('ap-bemerkung').value.trim(),
  };

  if (editProduktId) {
    const idx = data.produkte.findIndex(x => x.id === editProduktId);
    if (idx >= 0) data.produkte[idx] = prod;
  } else {
    data.produkte.push(prod);
  }

  sbSaveProdukt(prod);
  toast(editProduktId ? `Produkt „${name}" aktualisiert` : `Produkt „${name}" erstellt`, 'ok');

  // Если открыто из строки позиции — вставить данные
  if (!editProduktId && typeof _angCurBezInput !== 'undefined' && _angCurBezInput) {
    const row = _angCurBezInput.closest('.ang-pos-row');
    if (row && typeof angBezSelect === 'function') angBezSelect(row, prod);
  }

  renderProdukte();

  if (andNew) {
    editProduktId = null;
    ['ap-name','ap-artnr','ap-vk-netto','ap-vk-brutto','ap-ek-netto','ap-ek-brutto','ap-beschreibung','ap-bemerkung']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const t = document.getElementById('ap-form-title');
    if (t) t.textContent = 'Neues Produkt';
    document.getElementById('ap-name').focus();
  } else {
    closeProduktForm();
  }
}

// ── LÖSCHEN ───────────────────────────────────────────────────────────────────
async function delProdukt(id) {
  const p = (data.produkte||[]).find(x => x.id === id);
  if (!p) return;
  const ok = await appConfirm(`Produkt „${p.name}" löschen?`, {title:'Löschen', icon:'🗑️', okLabel:'Löschen', danger:true});
  if (!ok) return;
  data.produkte = data.produkte.filter(x => x.id !== id);
  sbDeleteProdukt(id);
  renderProdukte();
  toast('Produkt gelöscht', 'ok');
}

// ── BRUTTO-KALKULATION ────────────────────────────────────────────────────────
function apCalcBrutto() {
  const netto = parseFloat(document.getElementById('ap-vk-netto').value) || 0;
  const ust   = parseFloat(document.getElementById('ap-ust').value) || 0;
  document.getElementById('ap-vk-brutto').value = netto ? (Math.round(netto * (1 + ust/100) * 100)/100) : '';
}
function apCalcEkBrutto() {
  const netto = parseFloat(document.getElementById('ap-ek-netto').value) || 0;
  const ust   = parseFloat(document.getElementById('ap-ust').value) || 0;
  document.getElementById('ap-ek-brutto').value = netto ? (Math.round(netto * (1 + ust/100) * 100)/100) : '';
}

function apAddEinheit() {
  const list = document.getElementById('ap-einheiten-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'ap-einheit-row';
  row.innerHTML = `
    <select><option>Stk</option><option>h</option><option>kg</option><option>m</option><option>m²</option><option>l</option><option>Pauschal</option></select>
    <span class="ap-op">×</span>
    <input type="number" placeholder="1" value="1" min="0.001" step="0.001">
    <span class="ap-op">=</span>
    <input type="number" placeholder="Preis (Brutto)" min="0" step="0.01">
    <button class="btn" style="padding:4px 8px;color:var(--blue)" onclick="this.closest('.ap-einheit-row').remove()">
      ${ic('trash')}
    </button>`;
  list.appendChild(row);
}

function apSetTab(tab, btn) {
  document.querySelectorAll('.ap-tab').forEach(b => b.classList.remove('ap-tab-active'));
  document.querySelectorAll('.ap-tab-pane').forEach(p => p.style.display = 'none');
  btn.classList.add('ap-tab-active');
  document.getElementById('ap-pane-' + tab).style.display = 'block';
}
