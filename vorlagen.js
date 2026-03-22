// ══════════════════════════════════════════════════════════════════════════════
// RECHNUNGS-VORLAGEN — MelaLogic
// ══════════════════════════════════════════════════════════════════════════════

// ── Сохранить Rechnung как Vorlage ────────────────────────────────────────
async function rechAlsVorlage(rechId) {
  const r = (data.rechnungen || []).find(x => x.id === rechId);
  if (!r) return;

  // Спрашиваем имя шаблона
  const defaultName = r.kunde
    ? `${r.kunde} — ${r.kategorie || 'Vorlage'}`
    : (r.beschreibung || r.kategorie || 'Neue Vorlage');

  const name = prompt('Name für diese Vorlage:', defaultName);
  if (name === null) return; // отмена
  if (!name.trim()) return toast('Name darf nicht leer sein', 'err');

  const vorlage = {
    id:          'vorl-' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    name:        name.trim(),
    beschreibung:r.beschreibung || '',
    kunde:       r.kunde        || '',
    adresse:     r.adresse      || '',
    email:       r.email        || '',
    tel:         r.tel          || '',
    kategorie:   r.kategorie    || '',
    zahlungsart: r.zahlungsart  || 'Überweisung',
    betrag:      r.betrag       || 0,
    netto:       r.netto        || 0,
    mwstRate:    r.mwstRate     || 0,
    notiz:       r.notiz        || '',
    positionen:  (r.positionen  || []).map(p => ({
      ...p,
      id: 'vpos-' + Date.now() + '_' + Math.random().toString(36).slice(2,6)
    })),
    created_at:  new Date().toISOString(),
  };

  if (!data.vorlagen) data.vorlagen = [];
  data.vorlagen.unshift(vorlage);
  await sbSaveVorlage(vorlage);
  renderVorlagen();
  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Vorlage "${vorlage.name}" gespeichert`, 'ok');
}

// ── Создать Rechnung из Vorlage ────────────────────────────────────────────
function rechAusVorlage(vorlId) {
  const v = (data.vorlagen || []).find(x => x.id === vorlId);
  if (!v) return;

  const today = new Date().toISOString().split('T')[0];
  const newR = {
    id:          'r-' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    nr:          '',
    datum:       today,
    faellig:     '',
    leistungsdatum: '',
    status:      'entwurf',
    kunde:       v.kunde       || '',
    adresse:     v.adresse     || '',
    email:       v.email       || '',
    tel:         v.tel         || '',
    beschreibung:v.beschreibung|| '',
    kategorie:   v.kategorie   || '',
    zahlungsart: v.zahlungsart || 'Überweisung',
    betrag:      v.betrag      || 0,
    netto:       v.netto       || 0,
    mwstRate:    v.mwstRate    || 0,
    notiz:       v.notiz       || '',
    positionen:  (v.positionen || []).map(p => ({
      ...p,
      id: 'pos-' + Date.now() + '_' + Math.random().toString(36).slice(2,6)
    })),
    mahnung_history: [],
    created_at:  new Date().toISOString(),
    _fromVorlage: vorlId,
  };

  if (!data.rechnungen) data.rechnungen = [];
  data.rechnungen.unshift(newR);
  sbSaveRechnung(newR);
  sbLogRechnung(newR, 'erstellt', null, { nr: newR.nr, status: 'offen', aus_vorlage: v.name });

  // Открываем форму редактирования
  renderRech();
  setTimeout(() => {
    _openRechForm(newR, newR.id, `Neue Rechnung aus Vorlage "${v.name}"`);
  }, 150);

  toast(`<i class="fas fa-check-circle" style="color:var(--green)"></i> Rechnung ${newNr} aus Vorlage erstellt`, 'ok');
}

// ── Удалить Vorlage ────────────────────────────────────────────────────────
async function delVorlage(id) {
  const ok = await appConfirm('Vorlage wirklich löschen?', {
    title: 'Vorlage löschen', icon: '🗑️', okLabel: 'Löschen', danger: true
  });
  if (!ok) return;
  data.vorlagen = (data.vorlagen || []).filter(v => v.id !== id);
  await sbDeleteVorlage(id);
  renderVorlagen();
  toast('Vorlage gelöscht', 'err');
}

// ── Рендер раздела Vorlagen ────────────────────────────────────────────────
function renderVorlagen() {
  const container = document.getElementById('vorl-list');
  const empty     = document.getElementById('vorl-empty');
  if (!container) return;

  const vorlagen = data.vorlagen || [];

  if (!vorlagen.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  container.innerHTML = vorlagen.map(v => {
    const posCount = (v.positionen || []).length;
    const date = v.created_at ? fd(v.created_at.split('T')[0]) : '';
    return `
    <div class="vorl-card" onclick="showVorlageDetail('${v.id}')" style="cursor:pointer">
      <div class="vorl-card-left">
        <div class="vorl-card-avatar">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="vorl-card-info">
          <div class="vorl-card-name">${v.name}</div>
          <div class="vorl-card-meta">
            ${v.kunde ? `<span><i class="fas fa-user" style="font-size:10px"></i>${v.kunde}</span>` : ''}
            ${v.kategorie ? `<span><i class="fas fa-tag" style="font-size:10px"></i>${v.kategorie}</span>` : ''}
            ${v.zahlungsart ? `<span><i class="fas fa-credit-card" style="font-size:10px"></i>${v.zahlungsart}</span>` : ''}
            ${posCount ? `<span><i class="fas fa-list" style="font-size:10px"></i>${posCount} Pos.</span>` : ''}
            ${date ? `<span style="opacity:.6"><i class="fas fa-calendar" style="font-size:10px"></i>${date}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="vorl-card-right">
        <div class="vorl-card-betrag">${fmt(v.betrag)}</div>
        <div class="vorl-card-actions" onclick="event.stopPropagation()">
          ${isMob() ? _moreBtn([
            {icon:'fa-plus',  label:'Rechnung erstellen', primary:true, action:()=>rechAusVorlage(v.id)},
            {icon:'fa-trash', label:'Löschen', danger:true, action:()=>delVorlage(v.id)}
          ]) : `
            <button class="rca-btn rca-green" onclick="rechAusVorlage('${v.id}')" title="Rechnung aus Vorlage erstellen">
              <i class="fas fa-plus"></i>
            </button>
            <button class="rca-btn rca-red" onclick="delVorlage('${v.id}')" title="Vorlage löschen">
              <i class="fas fa-trash"></i>
            </button>
          `}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Detail-Sheet für Vorlage ───────────────────────────────────────────────
function showVorlageDetail(id) {
  const v = (data.vorlagen || []).find(x => x.id === id);
  if (!v) return;
  const posCount = (v.positionen || []).length;
  const posRows = (v.positionen || []).map((p, i) => ({
    key: `Pos. ${i+1}`,
    val: `${p.bezeichnung || p.bez || '—'} · ${p.menge || 1}× · ${fmt(p.brutto || p.netto || 0)}`
  }));

  showDetailSheet({
    title: `<i class="fas fa-file-alt" style="color:var(--blue);margin-right:8px"></i>${v.name}`,
    rows: [
      { key: 'Betrag',      val: `<span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--blue)">${fmt(v.betrag)}</span>` },
      ...(v.kunde       ? [{ key: 'Kunde',       val: v.kunde }]       : []),
      ...(v.kategorie   ? [{ key: 'Kategorie',   val: v.kategorie }]   : []),
      ...(v.zahlungsart ? [{ key: 'Zahlungsart', val: v.zahlungsart }] : []),
      { key: 'Positionen', val: posCount + ' Pos.' },
      ...posRows,
      ...(v.notiz ? [{ key: 'Notiz', val: v.notiz }] : []),
      { key: 'Erstellt', val: v.created_at ? fd(v.created_at.split('T')[0]) : '—' },
    ],
    buttons: [
      { label: 'Rechnung erstellen', icon: 'fa-plus', primary: true, action: () => {
          _closeDetailSheet();
          rechAusVorlage(id);
        }
      },
      { label: 'Löschen', icon: 'fa-trash', danger: true, action: () => {
          _closeDetailSheet();
          delVorlage(id);
        }
      },
    ]
  });
}
