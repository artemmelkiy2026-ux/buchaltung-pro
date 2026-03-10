// ── ACTIONS ───────────────────────────────────────────────────────────────
function delE(e,id){
  e.stopPropagation();if(!confirm('Eintrag löschen?'))return;
  data.eintraege=data.eintraege.filter(x=>x.id!==id);
  sbDeleteEintrag(id);
  renderAll();toast('Gelöscht','err');
}
function selR(tr){document.querySelectorAll('tbody tr').forEach(r=>r.classList.remove('sel'));tr.classList.add('sel');}

// ── EDIT ─────────────────────────────────────────────────────────────────
let editId=null, editTyp='Einnahme';
function editE(e,id){
  if(e) e.stopPropagation();
  const en=data.eintraege.find(x=>x.id===id); if(!en)return;
  editId=id; editTyp=en.typ;
  document.getElementById('edit-dat').value=en.datum;
  document.getElementById('edit-bet').value=en.betrag;
  document.getElementById('edit-dsc').value=en.beschreibung;
  document.getElementById('edit-note').value=en.notiz||'';
  document.getElementById('edit-zahl').value=en.zahlungsart||'Überweisung';
  setEditTyp(en.typ, true);
  document.getElementById('edit-kat').value=en.kategorie;
  openModal('edit-modal');
}
function setEditTyp(t, skipKat=false){
  editTyp=t;
  document.getElementById('edit-btn-e').className='tt'+(t==='Einnahme'?' ae':'');
  document.getElementById('edit-btn-a').className='tt'+(t==='Ausgabe'?' aa':'');
  const prev=document.getElementById('edit-kat').value;
  document.getElementById('edit-kat').innerHTML=(t==='Einnahme'?KE:KA).map(k=>`<option value="${k}">${k}</option>`).join('');
  if(!skipKat) return;
  // restore prev val if possible
  const opts=[...document.getElementById('edit-kat').options].map(o=>o.value);
  if(opts.includes(prev)) document.getElementById('edit-kat').value=prev;
}
function saveEdit(){
  const datum=document.getElementById('edit-dat').value;
  const betrag=parseFloat(document.getElementById('edit-bet').value);
  if(!datum||!betrag||betrag<=0)return toast('Datum und Betrag prüfen!','err');
  const i=data.eintraege.findIndex(x=>x.id===editId);
  if(i<0)return;
  data.eintraege[i]={...data.eintraege[i],
    datum, betrag,
    typ:editTyp,
    kategorie:normKat(document.getElementById('edit-kat').value),
    zahlungsart:normZahl(document.getElementById('edit-zahl').value),
    beschreibung:document.getElementById('edit-dsc').value.trim()||normKat(document.getElementById('edit-kat').value),
    notiz:document.getElementById('edit-note').value.trim()
  };
  sbSaveEintrag(data.eintraege[i]);
  renderAll(); closeModal('edit-modal'); toast('✅ Gespeichert!','ok');
}

// ── MODAL HELPERS ────────────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open'));
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();persist();toast('✅ Gespeichert!','ok');}
});
document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('open');}));

