// ══════════════════════════════════════════════════════════════════════════
// FAHRTENBUCH — §6 EStG · mit Fahrzeugverwaltung & Google Maps
// ══════════════════════════════════════════════════════════════════════════

let fbPage = 1, fbSort = 'datum', fbSortAsc = false, fbEditId = null;
let fbGmapLoaded = false, fbDirectionsService = null, fbDirectionsRenderer = null, fbMap = null;
let fbGmapEnabled = false;
let _fbMapsKey = null; // ключ из Supabase Edge Function

const FB_PER = 10;

// ── GOOGLE MAPS KEY via Supabase Edge Function ────────────────────────────

async function _getFbMapsKey() {
  if (_fbMapsKey) return _fbMapsKey;
  try {
    const { data, error } = await sb.functions.invoke('get-maps-key');
    if (error || !data?.key) throw new Error(error?.message || 'Kein Key');
    _fbMapsKey = data.key;
    return _fbMapsKey;
  } catch (e) {
    toast('Google Maps Key konnte nicht geladen werden: ' + e.message, 'err');
    return null;
  }
}

// ── FAHRZEUGE ─────────────────────────────────────────────────────────────

function getFbAutos() { return data.fbAutos || []; }

function saveFbAutos(autos) {
  data.fbAutos = autos;
  if (typeof sbSaveFbAutos === 'function') sbSaveFbAutos(autos);
}

function renderFbAutoSelect(selectId, includeAll) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const autos = getFbAutos();
  const prev = sel.value;
  sel.innerHTML = (includeAll ? '<option value="">Alle Fahrzeuge</option>' : '<option value="">— Fahrzeug wählen —</option>') +
    autos.map(a => `<option value="${a.id}"${prev===a.id?' selected':''}>${a.kennzeichen}${a.name?' · '+a.name:''}</option>`).join('');
}

function openAutoModal(editId) {
  const a = editId ? getFbAutos().find(x => x.id === editId) : null;
  document.getElementById('auto-modal-title').textContent = a ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug';
  document.getElementById('auto-kennzeichen').value = a ? a.kennzeichen : '';
  document.getElementById('auto-name').value        = a ? (a.name  || '') : '';
  document.getElementById('auto-vin').value         = a ? (a.vin   || '') : '';
  document.getElementById('auto-marke').value       = a ? (a.marke || '') : '';
  document.getElementById('auto-km-initial').value  = a ? (a.kmInitial || '') : '';
  document.getElementById('auto-edit-id').value     = editId || '';
  openModal('auto-modal');
}

function saveAuto() {
  const kennzeichen = document.getElementById('auto-kennzeichen').value.trim().toUpperCase();
  if (!kennzeichen) return toast('Kennzeichen ist Pflichtfeld!', 'err');
  const editId = document.getElementById('auto-edit-id').value;
  const autos  = getFbAutos();
  const obj = {
    kennzeichen,
    name:      document.getElementById('auto-name').value.trim(),
    vin:       document.getElementById('auto-vin').value.trim().toUpperCase(),
    marke:     document.getElementById('auto-marke').value.trim(),
    kmInitial: parseFloat(document.getElementById('auto-km-initial').value) || 0,
  };
  if (editId) {
    const idx = autos.findIndex(x => x.id === editId);
    if (idx >= 0) Object.assign(autos[idx], obj);
  } else {
    autos.push({ id: 'auto-' + Date.now(), ...obj });
  }
  saveFbAutos(autos);
  closeModal('auto-modal');
  renderFbAutoList();
  renderFbAutoSelect('fb-auto-filter', true);
  renderFbAutoSelect('fb-form-auto', false);
  toast('✓ Fahrzeug gespeichert!', 'ok');
}

async function deleteAuto(id) {
  const ok = await appConfirm('Fahrzeug löschen?', { title: 'Fahrzeug löschen', icon: '🚗', okLabel: 'Löschen', danger: true });
  if (!ok) return;
  data.fbAutos = getFbAutos().filter(a => a.id !== id);
  if (typeof sbDeleteFbAuto === 'function') sbDeleteFbAuto(id);
  renderFbAutoList();
  renderFbAutoSelect('fb-auto-filter', true);
  renderFbAutoSelect('fb-form-auto', false);
  toast('Fahrzeug gelöscht', 'err');
}

function renderFbAutoList() {
  const el = document.getElementById('fb-auto-list');
  if (!el) return;
  const autos = getFbAutos();
  if (!autos.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--sub);font-size:13px">
      <i class="fas fa-car" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px"></i>
      Noch keine Fahrzeuge angelegt
    </div>`;
    return;
  }
  el.innerHTML = autos.map(a => {
    const fahrten  = (data.fahrtenbuch || []).filter(f => f.autoId === a.id);
    const totalKm  = fahrten.reduce((s, f) => s + (f.km || 0), 0);
    const sortedF  = [...fahrten].sort((x,y) => (y.datum||'').localeCompare(x.datum||''));
    const lastKmEnd= sortedF.length ? (sortedF[0].km_end || 0) : (a.kmInitial || 0);
    return `<div class="fb-auto-card">
      <div class="fb-auto-icon"><i class="fas fa-car"></i></div>
      <div class="fb-auto-info">
        <div class="fb-auto-kz">${a.kennzeichen}${a.marke ? ` <span style="font-weight:400;color:var(--sub)">· ${a.marke}</span>` : ''}</div>
        ${a.name ? `<div style="font-size:12px;color:var(--sub)">${a.name}</div>` : ''}
        ${a.vin  ? `<div style="font-size:11px;color:var(--sub);font-family:var(--mono)">VIN: ${a.vin}</div>` : ''}
        <div class="fb-auto-stats">
          <span><i class="fas fa-road" style="opacity:.5;font-size:10px"></i> ${fmtKm(totalKm)} gefahren</span>
          <span><i class="fas fa-tachometer-alt" style="opacity:.5;font-size:10px"></i> ~${fmtKm(lastKmEnd)} aktuell</span>
          <span>${fahrten.length} Fahrten</span>
        </div>
      </div>
      <div class="fb-auto-actions">
        <button class="rca-btn" onclick="openAutoModal('${a.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
        <button class="rca-btn rca-red" onclick="deleteAuto('${a.id}')" title="Löschen"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ── HAUPTLISTE ────────────────────────────────────────────────────────────

function renderFahrtenbuch() {
  const fahrten    = data.fahrtenbuch || [];
  const yr         = document.getElementById('fb-yr')?.value || 'Alle';
  const autoFilter = document.getElementById('fb-auto-filter')?.value || '';

  let filtered = yr === 'Alle' ? [...fahrten] : fahrten.filter(f => f.datum?.startsWith(yr));
  if (autoFilter) filtered = filtered.filter(f => f.autoId === autoFilter);

  const allKm  = filtered.reduce((s,f) => s+(f.km||0), 0);
  const bizKm  = filtered.filter(f=>f.typ==='Geschäftlich').reduce((s,f)=>s+(f.km||0),0);
  const privKm = filtered.filter(f=>f.typ==='Privat').reduce((s,f)=>s+(f.km||0),0);
  const wegKm  = filtered.filter(f=>f.typ==='Arbeitsweg').reduce((s,f)=>s+(f.km||0),0);
  const bizPauschale = bizKm * 0.30;
  const wegF   = filtered.filter(f=>f.typ==='Arbeitsweg').length;
  const wegE   = wegKm / 2;
  const wegPauschale = Math.min(wegE, 20*wegF)*0.30 + Math.max(0, wegE-20*wegF)*0.38;

  const statsEl = document.getElementById('fb-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="sc b"><div class="sc-lbl">Gesamt</div><div class="sc-val">${fmtKm(allKm)}</div><div class="sc-sub">${filtered.length} Fahrten</div></div>
    <div class="sc g"><div class="sc-lbl">Geschäftlich</div><div class="sc-val">${fmtKm(bizKm)}</div><div class="sc-sub">${allKm?Math.round(bizKm/allKm*100):0}% · ${fmt(bizPauschale)}</div></div>
    <div class="sc r"><div class="sc-lbl">Privat</div><div class="sc-val">${fmtKm(privKm)}</div><div class="sc-sub">${allKm?Math.round(privKm/allKm*100):0}%</div></div>
    <div class="sc y"><div class="sc-lbl">Arbeitsweg</div><div class="sc-val">${fmtKm(wegKm)}</div><div class="sc-sub">${allKm?Math.round(wegKm/allKm*100):0}% · ${fmt(wegPauschale)}</div></div>
  `;

  const sorted = [...filtered].sort((a,b) => {
    const av = fbSort==='km'?(a.km||0):(a[fbSort]||'');
    const bv = fbSort==='km'?(b.km||0):(b[fbSort]||'');
    const d = fbSortAsc?1:-1;
    return av<bv?-d:av>bv?d:0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length/FB_PER));
  if (fbPage > totalPages) fbPage = totalPages;
  const pageItems = sorted.slice((fbPage-1)*FB_PER, fbPage*FB_PER);

  const list  = document.getElementById('fb-list');
  const empty = document.getElementById('fb-empty');
  if (!pageItems.length) {
    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    window._fbPagerCb = p => { fbPage=p; renderFahrtenbuch(); };
    renderPager('fb-pagination', 1, 1, 0, '_fbPagerCb');
    _updateFbSortBtns(); return;
  }
  if (empty) empty.style.display = 'none';

  const typColor = {'Geschäftlich':'var(--blue)','Privat':'var(--sub)','Arbeitsweg':'var(--yellow)'};
  const typIcon  = {'Geschäftlich':'fa-briefcase','Privat':'fa-user','Arbeitsweg':'fa-road'};
  const typBg    = {'Geschäftlich':'var(--bdim)','Privat':'var(--s2)','Arbeitsweg':'var(--ydim)'};
  const autos    = getFbAutos();

  if (list) list.innerHTML = pageItems.map(f => {
    const km   = f.km||0;
    const col  = typColor[f.typ]||'var(--sub)';
    const icon = typIcon[f.typ]||'fa-car';
    const bg   = typBg[f.typ]||'var(--s2)';
    const auto = autos.find(a => a.id===f.autoId);
    const kzLabel = auto ? auto.kennzeichen : (f.kennzeichen||'');
    return `<div class="fb-row" onclick="showFahrtDetail('${f.id}')" style="cursor:pointer">
      <div class="fb-row-left">
        <div class="fb-row-icon" style="background:${bg};color:${col}"><i class="fas ${icon}"></i></div>
        <div class="fb-row-name">
          ${f.abfahrt||'?'} → ${f.ziel||'?'}
          <span class="fb-row-typ" style="color:${col}">${f.typ}</span>
        </div>
        <div class="fb-row-meta">
          <span><i class="fas fa-calendar" style="font-size:10px;opacity:.5"></i> ${fd(f.datum)}</span>
          ${f.zweck?`<span><i class="fas fa-tag" style="font-size:10px;opacity:.5"></i> ${f.zweck}</span>`:''}
          ${kzLabel?`<span><i class="fas fa-car" style="font-size:10px;opacity:.5"></i> ${kzLabel}</span>`:''}
          <span style="font-size:10px;color:var(--sub)">Stand: ${fmtKm(f.km_start||0)} → ${fmtKm(f.km_end||0)}</span>
          ${f.hinZurueck?`<span style="font-size:10px;font-weight:600;color:var(--blue)"><i class="fas fa-exchange-alt" style="font-size:9px;margin-right:2px"></i>Hin & Zurück ×2</span>`:''}
        </div>
      </div>
      <div class="fb-row-right">
        <div class="fb-row-km" style="color:${col}">${fmtKm(km)}</div>
        <div class="fb-row-actions" onclick="event.stopPropagation()">
          ${isMob()?_moreBtn([
            {icon:'fa-edit',label:'Bearbeiten',action:()=>editFahrt(f.id)},
            {icon:'fa-trash',label:'Löschen',danger:true,action:()=>delFahrt(f.id)}
          ]):`<button class="rca-btn rca-red" onclick="event.stopPropagation();delFahrt('${f.id}')" title="Löschen"><i class="fas fa-trash"></i></button>`}
        </div>
      </div>
    </div>`;
  }).join('');

  if (list) list.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px 18px;font-size:12px;color:var(--sub);border-top:1px solid var(--border)">
    <span>${sorted.length} Fahrten</span>
    <span style="font-family:var(--mono);font-weight:600">${fmtKm(allKm)} gesamt</span>
  </div>`;

  window._fbPagerCb = p => { fbPage=p; renderFahrtenbuch(); };
  renderPager('fb-pagination', fbPage, totalPages, sorted.length, '_fbPagerCb');
  _updateFbSortBtns();
  _buildFbYearFilter();
  renderFbAutoSelect('fb-auto-filter', true);
}

function fmtKm(v) { return (v||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' km'; }

function _updateFbSortBtns() {
  [['datum','Datum'],['km','Kilometer'],['typ','Typ'],['ziel','Ziel']].forEach(([col,lbl]) => {
    document.querySelectorAll(`#p-fahrtenbuch button[onclick*="sortFb('${col}')"]`).forEach(btn => {
      btn.classList.toggle('active', fbSort===col);
      btn.innerHTML = lbl+'<span class="sort-arrow">'+(fbSort===col?(fbSortAsc?' ↑':' ↓'):'&nbsp;')+'</span>';
    });
  });
}

function sortFb(col) {
  if (fbSort===col) fbSortAsc=!fbSortAsc; else { fbSort=col; fbSortAsc=false; }
  fbPage=1; renderFahrtenbuch();
}

function _buildFbYearFilter() {
  const sel = document.getElementById('fb-yr');
  if (!sel) return;
  const years = [...new Set((data.fahrtenbuch||[]).filter(f=>f.datum).map(f=>f.datum.substring(0,4)))].sort().reverse();
  const cur = new Date().getFullYear()+'';
  if (!years.length) years.push(cur);
  const prev = sel.value;
  sel.innerHTML = '<option value="Alle">Alle Jahre</option>'+years.map(y=>`<option${y===prev?' selected':''}>${y}</option>`).join('');
}

// ── FORM ──────────────────────────────────────────────────────────────────

function openFahrtForm() {
  fbEditId = null;
  document.getElementById('fb-form-title').textContent = 'Neue Fahrt';
  document.getElementById('fb-datum').value = new Date().toISOString().split('T')[0];
  document.getElementById('fb-abfahrt').value = '';
  document.getElementById('fb-ziel').value = '';
  document.getElementById('fb-zweck').value = '';
  document.getElementById('fb-typ').value = 'Geschäftlich';
  renderFbAutoSelect('fb-form-auto', false);
  const lastAutoId = localStorage.getItem('fb_last_auto')||'';
  if (lastAutoId) { const s=document.getElementById('fb-form-auto'); if(s) s.value=lastAutoId; }
  _onFbAutoChange();
  document.getElementById('fb-km-end').value = '';
  const _hinCb = document.getElementById('fb-hin-zurueck'); if(_hinCb) { _hinCb.checked = false; }
  _calcFbKm();
  _clearFbMapState();
  nav('fahrtenbuch-form', null);
  setTimeout(() => { if (fbGmapEnabled) _initFbMap(); }, 350);
}

function editFahrt(id) {
  const f = (data.fahrtenbuch||[]).find(x=>x.id===id);
  if (!f) return;
  fbEditId = id;
  document.getElementById('fb-form-title').textContent = 'Fahrt bearbeiten';
  document.getElementById('fb-datum').value   = f.datum||'';
  document.getElementById('fb-abfahrt').value = f.abfahrt||'';
  document.getElementById('fb-ziel').value    = f.ziel||'';
  document.getElementById('fb-zweck').value   = f.zweck||'';
  document.getElementById('fb-typ').value     = f.typ||'Geschäftlich';
  renderFbAutoSelect('fb-form-auto', false);
  if (f.autoId) document.getElementById('fb-form-auto').value = f.autoId;
  _onFbAutoChange();
  document.getElementById('fb-km-start').value = f.km_start||'';
  document.getElementById('fb-km-end').value   = f.km_end||'';
  const _hinCbE = document.getElementById('fb-hin-zurueck'); if(_hinCbE) _hinCbE.checked = f.hinZurueck||false;
  _calcFbKm();
  _clearFbMapState();
  nav('fahrtenbuch-form', null);
  setTimeout(() => { if (fbGmapEnabled) _initFbMap(); }, 350);
}

function closeFahrtForm() {
  fbEditId = null;
  nav('fahrtenbuch', document.querySelector('.nav-item[onclick*="fahrtenbuch"]:not([onclick*="form"])')||null);
}

function _onFbAutoChange() {
  const autoId = document.getElementById('fb-form-auto')?.value;
  const kmStartInp = document.getElementById('fb-km-start');
  if (!kmStartInp) return;
  if (!autoId) { kmStartInp.readOnly=false; kmStartInp.style.opacity='1'; kmStartInp.value=''; return; }
  const auto = getFbAutos().find(a=>a.id===autoId);
  if (!auto) return;
  const fahrten = (data.fahrtenbuch||[])
    .filter(f => f.autoId===autoId && f.id!==fbEditId)
    .sort((a,b) => (b.datum||'').localeCompare(a.datum||''));
  const isFirst  = fahrten.length === 0;
  const lastKmEnd= isFirst ? (auto.kmInitial||0) : (fahrten[0].km_end||0);
  kmStartInp.value    = lastKmEnd || '';
  kmStartInp.readOnly = !isFirst;
  kmStartInp.style.opacity = isFirst ? '1' : '.65';
  kmStartInp.title = isFirst
    ? 'Ersten Kilometerstand eingeben'
    : 'Automatisch aus letzter Fahrt übernommen';
  const hint = document.getElementById('fb-km-start-hint');
  if (hint) hint.textContent = isFirst ? 'Bitte Anfangs-km eingeben' : 'Aus letzter Fahrt übernommen';
  _calcFbKm();
}

function saveFahrt() {
  const datum   = document.getElementById('fb-datum').value;
  const abfahrt = document.getElementById('fb-abfahrt').value.trim();
  const ziel    = document.getElementById('fb-ziel').value.trim();
  const zweck   = document.getElementById('fb-zweck').value.trim();
  const typ     = document.getElementById('fb-typ').value;
  const autoId  = document.getElementById('fb-form-auto')?.value||'';
  const kmStart = parseFloat(document.getElementById('fb-km-start').value)||0;
  const kmEnd   = parseFloat(document.getElementById('fb-km-end').value)||0;
  const hinZurueck = document.getElementById('fb-hin-zurueck')?.checked || false;

  if (!datum)           return toast('Datum ist Pflichtfeld!','err');
  if (!abfahrt||!ziel)  return toast('Abfahrts- und Zielort eingeben!','err');
  if (kmEnd<=kmStart)   return toast('km-Stand Ende muss größer als Start sein!','err');

  const kmBase = Math.round((kmEnd-kmStart)*10)/10;
  const km = hinZurueck ? Math.round(kmBase * 2 * 10) / 10 : kmBase;
  if (autoId) localStorage.setItem('fb_last_auto', autoId);
  if (!data.fahrtenbuch) data.fahrtenbuch=[];
  const obj = { datum, abfahrt, ziel, zweck, typ, autoId, km_start:kmStart, km_end:kmEnd, km, hinZurueck };

  if (fbEditId) {
    const f = data.fahrtenbuch.find(x=>x.id===fbEditId);
    if (f) { Object.assign(f,obj); if(typeof sbSaveFahrt==='function') sbSaveFahrt(f); }
    fbEditId=null;
  } else {
    const newF = { id:'fb-'+Date.now()+'_'+Math.random().toString(36).slice(2,6), ...obj };
    data.fahrtenbuch.push(newF);
    if (typeof sbSaveFahrt==='function') sbSaveFahrt(newF);
  }
  fbPage=1; fbSort='datum'; fbSortAsc=false;
  closeFahrtForm(); renderFahrtenbuch(); toast('✓ Fahrt gespeichert!','ok');
}

async function delFahrt(id) {
  const ok = await appConfirm('Fahrt wirklich löschen?',{title:'Fahrt löschen',icon:'🗑️',okLabel:'Löschen',danger:true});
  if (!ok) return;
  data.fahrtenbuch=(data.fahrtenbuch||[]).filter(f=>f.id!==id);
  if (typeof sbDeleteFahrt==='function') sbDeleteFahrt(id);
  renderFahrtenbuch(); toast('Fahrt gelöscht','err');
}

function _calcFbKm() {
  const s = parseFloat(document.getElementById('fb-km-start')?.value)||0;
  const e = parseFloat(document.getElementById('fb-km-end')?.value)||0;
  const hinZurueck = document.getElementById('fb-hin-zurueck')?.checked || false;
  let km = Math.max(0, Math.round((e-s)*10)/10);
  if (hinZurueck) km = Math.round(km * 2 * 10) / 10;
  const el = document.getElementById('fb-km');
  if (el) {
    el.textContent = fmtKm(km);
    el.style.color = hinZurueck ? 'var(--blue)' : 'var(--text)';
  }
}

// ── GOOGLE MAPS ──────────────────────────────────────────────────────────

async function toggleFbGmap() {
  fbGmapEnabled = !fbGmapEnabled;
  const btn = document.getElementById('fb-gmap-toggle');
  if (btn) {
    btn.classList.toggle('active', fbGmapEnabled);
    btn.innerHTML = `<i class="fas fa-map-marked-alt"></i> Maps ${fbGmapEnabled?'AN':'AUS'}`;
  }
  const mapSec = document.getElementById('fb-map-section');
  if (mapSec) mapSec.style.display = fbGmapEnabled ? 'block' : 'none';
  if (fbGmapEnabled) {
    const key = await _getFbMapsKey();
    if (key) _loadGmapScript(key);
  } else {
    _clearFbMapState();
  }
  localStorage.setItem('fb_gmap_enabled', fbGmapEnabled?'1':'0');
}

function _loadGmapScript(key) {
  if (fbGmapLoaded && window.google) { _initFbMap(); return; }
  if (document.querySelector('script[data-fbgmap]')) return;
  const s = document.createElement('script');
  s.setAttribute('data-fbgmap','1');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=_fbGmapCallback&language=de&region=DE`;
  s.async = true; s.defer = true;
  window._fbGmapCallback = () => { fbGmapLoaded=true; _initFbMap(); };
  document.head.appendChild(s);
}

function _initFbMap() {
  const canvas = document.getElementById('fb-map-canvas');
  if (!canvas||!window.google||!window.google.maps) return;
  if (!fbMap) {
    fbMap = new google.maps.Map(canvas, {
      zoom:10, center:{lat:49.632,lng:8.359},
      mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
      styles:[
        {featureType:'poi',stylers:[{visibility:'off'}]},
        {featureType:'transit',stylers:[{visibility:'off'}]},
      ]
    });
    fbDirectionsService  = new google.maps.DirectionsService();
    fbDirectionsRenderer = new google.maps.DirectionsRenderer({
      map:fbMap, suppressMarkers:false,
      polylineOptions:{strokeColor:'#1a4578',strokeWeight:5,strokeOpacity:.85}
    });
  }
  _attachFbAutocomplete('fb-abfahrt');
  _attachFbAutocomplete('fb-ziel');
  const from = document.getElementById('fb-abfahrt')?.value;
  const to   = document.getElementById('fb-ziel')?.value;
  if (from && to) _calcFbRoute();
}

function _attachFbAutocomplete(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp||inp._fbAcDone||!window.google) return;
  inp._fbAcDone = true;
  const ac = new google.maps.places.Autocomplete(inp, {
    componentRestrictions:{country:'de'}, fields:['formatted_address','geometry']
  });
  ac.addListener('place_changed', () => {
    const p = ac.getPlace();
    if (p.formatted_address) inp.value = p.formatted_address;
    _calcFbRoute();
  });
}

function fbAddressChanged() {
  const rc = document.getElementById('fb-route-choices');
  if (rc) { rc.innerHTML=''; rc.style.display='none'; }
  if (!fbGmapEnabled||!fbMap) return;
  clearTimeout(window._fbRouteTimer);
  window._fbRouteTimer = setTimeout(_calcFbRoute, 900);
}

function _calcFbRoute() {
  if (!fbDirectionsService||!fbMap) return;
  const from = document.getElementById('fb-abfahrt')?.value.trim();
  const to   = document.getElementById('fb-ziel')?.value.trim();
  if (!from||!to) return;
  const statusEl = document.getElementById('fb-route-status');
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Route wird berechnet…';
  fbDirectionsService.route({
    origin:from, destination:to,
    travelMode:google.maps.TravelMode.DRIVING,
    provideRouteAlternatives:true, region:'de'
  }, (result, status) => {
    if (status!=='OK') {
      if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--red)"></i> Route nicht gefunden';
      return;
    }
    fbDirectionsRenderer.setDirections(result);
    _applyFbRoute(result, 0);
    if (result.routes.length>1) _renderFbRouteChoices(result);
  });
}

function _applyFbRoute(result, idx) {
  fbDirectionsRenderer.setRouteIndex(idx);
  const leg   = result.routes[idx].legs[0];
  const kmDist = Math.round(leg.distance.value/100)/10;
  const kmStart= parseFloat(document.getElementById('fb-km-start')?.value)||0;
  document.getElementById('fb-km-end').value = (kmStart+kmDist).toFixed(1);
  _calcFbKm();
  const statusEl = document.getElementById('fb-route-status');
  if (statusEl) statusEl.innerHTML =
    `<i class="fas fa-check-circle" style="color:var(--green)"></i> <b>${leg.distance.text}</b> · ${leg.duration.text}`;
}

function _renderFbRouteChoices(result) {
  const el = document.getElementById('fb-route-choices');
  if (!el) return;
  el.innerHTML = result.routes.map((r,i) => {
    const leg = r.legs[0];
    return `<button class="fb-route-btn${i===0?' active':''}" onclick="_selectFbRoute(this,${i})">
      <i class="fas fa-route" style="color:var(--blue)"></i>
      <span><b>${leg.distance.text}</b></span>
      <span style="color:var(--sub);font-size:11px">${leg.duration.text}</span>
    </button>`;
  }).join('');
  el.style.display = 'flex';
  el._result = result;
}

function _selectFbRoute(btn, idx) {
  const el = document.getElementById('fb-route-choices');
  if (!el||!el._result) return;
  document.querySelectorAll('.fb-route-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
  _applyFbRoute(el._result, idx);
}

function _clearFbMapState() {
  const canvas = document.getElementById('fb-map-canvas');
  if (canvas) canvas.innerHTML='';
  fbMap=null; fbDirectionsService=null; fbDirectionsRenderer=null;
  ['fb-abfahrt','fb-ziel'].forEach(id => { const inp=document.getElementById(id); if(inp) inp._fbAcDone=false; });
  const rc = document.getElementById('fb-route-choices');
  if (rc) { rc.innerHTML=''; rc.style.display='none'; }
  const st = document.getElementById('fb-route-status');
  if (st) st.textContent='';
}

// ── INIT ──────────────────────────────────────────────────────────────────

async function initFahrtenbuch() {
  // Maps standardmäßig immer deaktiviert (AUS)
  fbGmapEnabled = false;
  const _gmapBtn = document.getElementById('fb-gmap-toggle');
  if (_gmapBtn) { _gmapBtn.classList.remove('active'); _gmapBtn.innerHTML='<i class="fas fa-map-marked-alt"></i> Maps AUS'; }
  const _mapSec = document.getElementById('fb-map-section');
  if (_mapSec) _mapSec.style.display = 'none';
  renderFbAutoList();
  renderFbAutoSelect('fb-auto-filter', true);
  renderFahrtenbuch();
}

function showFahrtDetail(id) {
  const f = (data.fahrtenbuch||[]).find(x=>x.id===id);
  if (!f) return;
  const auto = (getFbAutos()||[]).find(a=>a.id===f.autoId);
  showDetailSheet({
    title: `<i class="fas fa-car" style="color:var(--blue);margin-right:8px"></i>${f.abfahrt} → ${f.ziel}`,
    rows: [
      { key: 'Strecke',   val: `<span style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--blue)">${fmtKm(f.km)}</span>` },
      { key: 'Datum',     val: fd(f.datum) },
      { key: 'Typ',       val: f.typ },
      { key: 'Fahrzeug',  val: auto ? auto.kennzeichen : (f.kennzeichen||'—') },
      { key: 'km-Stand',  val: fmtKm(f.km_start) + ' → ' + fmtKm(f.km_end) },
      ...(f.zweck ? [{ key: 'Zweck', val: f.zweck }] : []),
    ],
    buttons: [
      { label: 'Bearbeiten', icon: 'fa-edit', primary: true, action: () => editFahrt(id) },
      { label: 'Löschen', icon: 'fa-trash', danger: true, action: () => delFahrt(id) },
    ]
  });
}
