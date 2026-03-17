// ── ACTIONS ───────────────────────────────────────────────────────────────
async function delE(e,id){
  e.stopPropagation();
  if(!confirm('Eintrag stornieren? (GoBD: Einträge können nicht gelöscht werden — es wird eine Storno-Gegenbuchung erstellt)'))return;
  const storno = await sbStornoEintrag(id);
  if (!storno) return toast('Fehler beim Stornieren','err');
  // sbStornoEintrag уже пометил оригинал и сторно-запись локально
  data.eintraege.push(storno);
  renderAll();
  toast('↩️ Storno-Gegenbuchung erstellt','ok');
}
function selR(tr){document.querySelectorAll('tbody tr').forEach(r=>r.classList.remove('sel'));tr.classList.add('sel');}

// ── EDIT ─────────────────────────────────────────────────────────────────
let editId=null, editTyp='Einnahme';
function editE(e,id){
  if(e) e.stopPropagation();
  const en=data.eintraege.find(x=>x.id===id); if(!en)return;
  editId=id; editTyp=en.typ;
  // Navigate to Neuer Eintrag page in edit mode
  openNeuEintrag(id);
  // Pre-fill the form with entry data
  setTimeout(()=>{
    setTyp(en.typ);
    document.getElementById('nf-dat').value=en.datum;
    document.getElementById('nf-bet').value=en.betrag;
    document.getElementById('nf-dsc').value=en.beschreibung||'';
    document.getElementById('nf-note').value=en.notiz||'';
    const _bnEl=document.getElementById('nf-belegnr'); if(_bnEl) _bnEl.value=en.belegnr||'';
    document.getElementById('nf-zahl').value=en.zahlungsart||'Überweisung';
    document.getElementById('nf-kat').value=en.kategorie;
    updateMwstFormVisibility();
    // MwSt rate if applicable
    if(en.mwstRate>0) setMwstRate(en.mwstRate);
    else if(en.vorsteuerRate>0) setMwstRate(en.vorsteuerRate);
    calcNfMwst();
    // Change button text and subtitle for edit mode
    const saveBtn=document.getElementById('btn-add-bezahlt');
    if(saveBtn){
      saveBtn.innerHTML='<span class="material-symbols-outlined">save</span> Korrektur speichern';
      saveBtn.onclick=function(){ saveEditFromForm(); };
    }
    const sub=document.getElementById('neu-form-sub');
    if(sub) sub.textContent='GoBD-konforme Korrektur · Storno + Neubuchung';
  },50);
}
function setEditTyp(t, skipKat=false){
  editTyp=t;
  // Legacy — keep for backward compat
}
// алиас для вызова из боковой колонки
function openEdit(id){ editE(null, id); }

async function saveEditFromForm(){
  const datum=document.getElementById('nf-dat').value;
  const betrag=parseFloat(document.getElementById('nf-bet').value);
  if(!datum||!betrag||betrag<=0)return toast('Datum und Betrag prüfen!','err');
  const i=data.eintraege.findIndex(x=>x.id===editId);
  if(i<0)return;
  const origEntry = {...data.eintraege[i]};
  const chainRoot = origEntry.korrektur_von || editId;
  const storno = await sbStornoEintrag(editId);
  if (!storno) return toast('Fehler beim Stornieren','err');
  data.eintraege.push(storno);
  const betragChanged = betrag !== origEntry.betrag;
  let newMwstBetrag = origEntry.mwstBetrag || 0;
  let newVorsteuerBet = origEntry.vorsteuerBet || 0;
  let newNettoBetrag = origEntry.nettoBetrag || betrag;
  if(betragChanged){
    if(curTyp==='Einnahme' && origEntry.mwstRate > 0){
      newMwstBetrag = r2(betrag * origEntry.mwstRate / (100 + origEntry.mwstRate));
      newNettoBetrag = r2(betrag - newMwstBetrag);
    } else if(curTyp==='Ausgabe' && origEntry.vorsteuerRate > 0){
      newVorsteuerBet = r2(betrag * origEntry.vorsteuerRate / (100 + origEntry.vorsteuerRate));
      newNettoBetrag = r2(betrag - newVorsteuerBet);
    }
  }
  const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const newEntry = {...origEntry,
    id: newId, datum, betrag, typ: curTyp,
    kategorie: normKat(document.getElementById('nf-kat').value),
    zahlungsart: normZahl(document.getElementById('nf-zahl').value),
    beschreibung: document.getElementById('nf-dsc').value.trim()||normKat(document.getElementById('nf-kat').value),
    notiz: document.getElementById('nf-note').value.trim(),
    belegnr: document.getElementById('nf-belegnr')?.value.trim()||'',
    mwstBetrag: newMwstBetrag, vorsteuerBet: newVorsteuerBet, nettoBetrag: newNettoBetrag,
    is_storno: false, storno_of: null, korrektur_von: chainRoot, _storniert: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  data.eintraege.push(newEntry);
  sbSaveEintrag(newEntry);
  // Reset edit mode
  editId=null;
  const saveBtn=document.getElementById('btn-add-bezahlt');
  if(saveBtn){
    saveBtn.innerHTML='<span class="material-symbols-outlined">check_circle</span> Speichern &amp; Bezahlt';
    saveBtn.onclick=function(){ addEintrag(true); };
  }
  renderAll();
  closeNeuEintrag();
  toast('Korrektur gespeichert (GoBD-konform)','ok');
}

async function saveEdit(){
  // Legacy redirect to new flow
  saveEditFromForm();
}

// ── DELETE FROM EDIT ───────────────────────────────────────────────
async function delFromEdit(){
  if(!editId) return;
  if(!confirm('Eintrag stornieren? (GoBD: Einträge können nicht gelöscht werden — es wird eine Storno-Gegenbuchung erstellt)')) return;
  const storno = await sbStornoEintrag(editId);
  if (!storno) return toast('Fehler beim Stornieren','err');
  data.eintraege.push(storno);
  editId=null;
  // Reset button
  const saveBtn=document.getElementById('btn-add-bezahlt');
  if(saveBtn){
    saveBtn.innerHTML='<span class="material-symbols-outlined">check_circle</span> Speichern &amp; Bezahlt';
    saveBtn.onclick=function(){ addEintrag(true); };
  }
  renderAll();
  closeNeuEintrag();
  toast('Storno-Gegenbuchung erstellt','ok');
}

// ── MODAL HELPERS ────────────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open'));
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();persist();toast('✓ Gespeichert!','ok');}
});
document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('open');}));

