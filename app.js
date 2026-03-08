// ── CONFIG ────────────────────────────────────────────────────────────────
// ✅ Защита: если t() не определена (ru.js не загружен), используем дефолт
if(typeof window.t !== 'function') window.t = k => k;

const SK='buch_pro_v1';
const KE=['Dienstleistung','Honorar','Warenverkauf','Miete (Einnahme)','Zinsen/Dividenden','Erstattung','Sonstiges Einnahme'];
const KA=['Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten','Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung','Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen','Bewirtung','Sonstiges Ausgabe'];
const ZAHL=['Überweisung','Barzahlung','PayPal','EC-Karte','Lastschrift','Sonstiges'];
const ZICONS={'Überweisung':'<i class="fas fa-university"></i>','Barzahlung':'<i class="fas fa-solid fa-euro-sign"></i>','PayPal':'<i class="fab fa-cc-paypal"></i>','EC-Karte':'<i class="fas fa-credit-card"></i>','Lastschrift':'<i class="fas fa-exchange-alt"></i>','Sonstiges':'<i class="fas fa-solid fa-euro-sign"></i>'};
const ZCOLS={'Überweisung':'var(--blue)','Barzahlung':'var(--yellow)','PayPal':'var(--purple)','EC-Karte':'var(--cyan)','Lastschrift':'var(--green)','Sonstiges':'var(--muted)'};
const ZBADGE={'Überweisung':'b-bar','Barzahlung':'b-cash','PayPal':'b-pp','EC-Karte':'b-trans','Lastschrift':'b-ein','Sonstiges':''};
// ── НОРМАЛИЗАЦИЯ: русский/украинский → немецкий ключ ────────────
// Заhlungsart
const ZAHL_NORM = {
  // RU
  'Перевод':'Überweisung','Банковский перевод':'Überweisung',
  'Наличные':'Barzahlung','Наличные деньги':'Barzahlung',
  'Пейпал':'PayPal',
  'Карта':'EC-Karte','Банковская карта':'EC-Karte','ЕС-карта':'EC-Karte',
  'Прямой дебет':'Lastschrift','Автоплатёж':'Lastschrift',
  'Прочее':'Sonstiges','Разное':'Sonstiges',
  // UK
  'Переказ':'Überweisung','Банківський переказ':'Überweisung',
  'Готівка':'Barzahlung',
  'Картка':'EC-Karte','Банківська картка':'EC-Karte',
  'Пряме дебетування':'Lastschrift',
  'Інше':'Sonstiges',
};
// Kategorien Einnahme
const KE_NORM = {
  'Услуга':'Dienstleistung','Услуги':'Dienstleistung','Сервіс':'Dienstleistung',
  'Гонорар':'Honorar',
  'Продажа товаров':'Warenverkauf','Продаж товарів':'Warenverkauf','Продажа':'Warenverkauf',
  'Аренда (доход)':'Miete (Einnahme)','Оренда (дохід)':'Miete (Einnahme)',
  'Проценты/Дивиденды':'Zinsen/Dividenden','Відсотки/Дивіденди':'Zinsen/Dividenden',
  'Возврат':'Erstattung','Відшкодування':'Erstattung',
  'Прочие доходы':'Sonstiges Einnahme','Інші доходи':'Sonstiges Einnahme','Прочее':'Sonstiges Einnahme',
};
// Kategorien Ausgabe
const KA_NORM = {
  'Канцтовары':'Büromaterial','Офісне приладдя':'Büromaterial',
  'Программное обеспечение / ИТ':'Software / IT','ПО / ИТ':'Software / IT','Програмне забезпечення / ІТ':'Software / IT',
  'Телефон / Интернет':'Telefon / Internet','Телефон / Інтернет':'Telefon / Internet',
  'Транспортные расходы':'Fahrtkosten','Витрати на транспорт':'Fahrtkosten',
  'Аренда / Офис':'Miete / Büro','Оренда / Офіс':'Miete / Büro',
  'Маркетинг / Реклама':'Marketing / Werbung','Маркетинг / Рекламa':'Marketing / Werbung',
  'Обучение':'Fortbildung','Навчання':'Fortbildung',
  'Страхование':'Versicherung','Страхування':'Versicherung',
  'Банковские сборы':'Bankgebühren','Банківські збори':'Bankgebühren',
  'Налоги / Сборы':'Steuern / Abgaben','Податки / Збори':'Steuern / Abgaben',
  'Железо / Оборудование':'Hardware','Обладнання':'Hardware',
  'Внешние услуги':'Fremdleistungen','Зовнішні послуги':'Fremdleistungen',
  'Представительские расходы':'Bewirtung','Представницькі витрати':'Bewirtung',
  'Прочие расходы':'Sonstiges Ausgabe','Інші витрати':'Sonstiges Ausgabe',
};

function normZahl(v){ return ZAHL_NORM[v] || v; }
function normKat(v){  return KE_NORM[v] || KA_NORM[v] || v; }

// ── MATH HELPERS (must be early) ─────────────────────────────────────────
function r2(n){ return Math.round(n*100)/100; }

function calcBrutto(netto, rate){ return r2(netto * (1 + rate/100)); }

function calcNetto(brutto, rate){ return rate===0 ? brutto : r2(brutto / (1 + rate/100)); }

function calcMwst(netto, rate){ return r2(netto * rate/100); }

const MN=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// Данные загружаются из Supabase — инициализируем пустым объектом
let data = { eintraege: [] };

// Когда Supabase готов — загружаем данные
window.addEventListener('supabase-ready', () => {
  const remote = window._loadedRemoteData;
  if (remote) {
    data = remote;
    // Нормализуем старые записи
    if (data.eintraege) data.eintraege.forEach(e => {
      if (e.zahlungsart) e.zahlungsart = normZahl(e.zahlungsart);
      if (e.kategorie)   e.kategorie   = normKat(e.kategorie);
    });
  }
  // Инициализация
  if (!data.eintraege)    data.eintraege = [];
  if (!data.rechnungen)   data.rechnungen = [];
  if (!data.kunden)       data.kunden = [];
  if (!data.ustEintraege) data.ustEintraege = [];
  if (!data.ustModeByYear) data.ustModeByYear = {};
  if (!data.wiederkehrend) data.wiederkehrend = [];
  // Migrate old ustMode
  if (data.ustMode) {
    const oldMode = data.ustMode;
    if (Object.keys(data.ustModeByYear).length === 0) {
      const curYr = new Date().getFullYear() + '';
      data.ustModeByYear[curYr] = oldMode;
    }
    delete data.ustMode;
  }
  appInit();
});
let curTyp='Einnahme', fTyp='Alle', sortCol='datum', sortAsc=false;
let fileHandle=null, asOn=false, asTimer=null, curPage='dashboard';
// ✅ Переменные для сортировки Dashboard "Letzte 10"
let dashSortCol='datum', dashSortAsc=false;
// ✅ Переменные для пагинации Einträge
let einPage=1, einPerPage=50;
let zPage=1, zPerPage=50;  // Пагинация для Zahlungsarten
let ustPage=1;              // Пагинация для USt-Buchungen

// ── INIT — вызывается после загрузки данных из Supabase ──────────────────
function appInit(){
  document.getElementById('nf-dat').value=new Date().toISOString().split('T')[0];
  updateKatSel(); buildYearFilters(); renderAll();
  updateMwstFormVisibility();
  setTimeout(()=>{
    const today=new Date().toISOString().split('T')[0];
    const due=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);
    if(due.length) toast(`🔁 ${due.length} ${t('wiederkehrende Zahlung')}${due.length>1?t('en'):''} ${t('fällig!')}`, 'ok');
  },800);
}

function buildYearFilters(){
  const js=[...new Set(data.eintraege.map(e=>e.datum.substring(0,4)))].sort().reverse();
  const cur=new Date().getFullYear()+'';
  ['dash-yr','f-jahr','z-yr'].forEach(id=>{    const el=document.getElementById(id); if(!el)return;
    const prev=el.value;
    el.innerHTML='<option value="Alle">Alle Jahre</option>'+js.map(j=>`<option${j===prev?' selected':''}>${j}</option>`).join('');
  });
  // rep-yr: only real years — preserve current selection
  const ry=document.getElementById('rep-yr');
  const allJahre=js.length?js:[cur];
  const prevRy=ry.value;
  ry.innerHTML=allJahre.map((j,i)=>`<option${j===prevRy?' selected':(!prevRy&&i===0?' selected':'')}>${j}</option>`).join('');
  // kat filter
  const allKats=[...new Set(data.eintraege.map(e=>e.kategorie))].sort();
  const fk=document.getElementById('f-kat');
  const pk=fk.value;
  fk.innerHTML='<option value="Alle">Alle</option>'+allKats.map(k=>`<option${k===pk?' selected':''}>${k}</option>`).join('');
}

function renderAll(){ buildYearFilters(); renderDash(); renderEin(); renderZ(); }

// ── NAV ───────────────────────────────────────────────────────────────────
function nav(id, el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('p-'+id).classList.add('active');
  curPage=id;
  if(id==='bericht') renderRep();
  if(id==='zahlungen') renderZ();
  if(id==='dashboard') renderDash();
  if(id==='prognose') renderProg();
  if(id==='kategorien') renderKat();
  if(id==='rechnungen') renderRech();
  if(id==='kunden') renderKunden();
  if(id==='ust') renderUst();
  if(id==='wiederkehrend') renderWied();
}

// ── AUTOSAVE (облако — сохраняется автоматически через persist) ──────────

// ── FILE IO (только экспорт/импорт для резервной копии) ──────────────────
function persist(){ sbPersist(data); }
function dlJson(){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`buchaltung_${new Date().getFullYear()}.json`;a.click();toast('✅ Backup heruntergeladen!','ok');}
function loadFile(){document.getElementById('fi').click();}
function onLoad(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{try{
    const d=JSON.parse(e.target.result);
    if(!d.eintraege)throw 0;
    if(!d.rechnungen) d.rechnungen=[];
    if(!d.wiederkehrend) d.wiederkehrend=[];
    if(data.eintraege.length&&!confirm(`Заменить ${data.eintraege.length} записей?`))return;
    data=d;
    if(data.eintraege) data.eintraege.forEach(e=>{
      if(e.zahlungsart) e.zahlungsart=normZahl(e.zahlungsart);
      if(e.kategorie)   e.kategorie=normKat(e.kategorie);
    });
    renderAll();
    renderDash();
    toast(`✅ Загружено ${data.eintraege.length} записей`,'ok');
  }catch{
    toast('❌ Неверный файл','err');
  }};
  r.readAsText(f);ev.target.value='';
}
// ── FORM ──────────────────────────────────────────────────────────────────
function setTyp(t){
  curTyp=t;
  document.getElementById('btn-e').className='tt'+(t==='Einnahme'?' ae':'');
  document.getElementById('btn-a').className='tt'+(t==='Ausgabe'?' aa':'');
  updateKatSel();
  updateMwstFormVisibility();
}
function updateMwstFormVisibility(){
  const yr=document.getElementById('nf-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(yr);
  const mwRow=document.getElementById('nf-mwst-row');
  if(!mwRow) return;
  if(klein){
    mwRow.style.display='none';
    const info=document.getElementById('nf-betrag-info');
    if(info) info.textContent='';
    return;
  }
  // Regelbesteuerung: show for both types
  mwRow.style.display='';
  const isEin=(curTyp==='Einnahme');
  // Color scheme: orange for Einnahme (USt), blue for Ausgabe (Vorsteuer)
  if(isEin){
    mwRow.style.background='rgba(249,115,22,.07)';
    mwRow.style.border='1px solid rgba(249,115,22,.3)';
    const title=document.getElementById('nf-mwst-title');
    if(title){title.textContent='🟠 Umsatzsteuer auf diese Einnahme';title.style.color='#f97316';}
    const betLbl=document.getElementById('nf-mwst-bet-lbl');
    if(betLbl) betLbl.textContent='USt-Betrag (€)';
    const betEl=document.getElementById('nf-mwst-bet');
    if(betEl) betEl.style.color='#f97316';
    const info=document.getElementById('nf-betrag-info');
    if(info){info.textContent='= Brutto';info.style.color='#f97316';}
  } else {
    mwRow.style.background='rgba(59,130,246,.07)';
    mwRow.style.border='1px solid rgba(59,130,246,.3)';
    const title=document.getElementById('nf-mwst-title');
    if(title){title.textContent='🔵 Vorsteuer aus dieser Ausgabe';title.style.color='var(--blue)';}
    const betLbl=document.getElementById('nf-mwst-bet-lbl');
    if(betLbl) betLbl.textContent='Vorsteuer (€)';
    const betEl=document.getElementById('nf-mwst-bet');
    if(betEl) betEl.style.color='var(--blue)';
    const info=document.getElementById('nf-betrag-info');
    if(info){info.textContent='= Brutto';info.style.color='var(--blue)';}
  }
  calcNfMwst();
}
function updateKatSel(){
  document.getElementById('nf-kat').innerHTML=(curTyp==='Einnahme'?KE:KA).map(k=>`<option value="${k}">${k}</option>`).join('');
}
function clearForm(){
  document.getElementById('nf-bet').value='';
  document.getElementById('nf-dsc').value='';
  document.getElementById('nf-note').value='';
  // Дату НЕ сбрасываем — пользователь мог выбрать другой год
}
function addEintrag(){
  const datum=document.getElementById('nf-dat').value;
  const betrag=parseFloat(document.getElementById('nf-bet').value);
  const kat=document.getElementById('nf-kat').value;
  const zahl=document.getElementById('nf-zahl').value;
  const dsc=document.getElementById('nf-dsc').value.trim();
  const note=document.getElementById('nf-note').value.trim();
  calcNfVorsteuer(); // пересчёт при изменении суммы
  if(!datum)return toast('Datum eingeben!','err');
  // Валидация даты
  const [dy,dm,dd]=datum.split('-').map(Number);
  if(dy<2000||dy>2099)return toast('Jahr muss zwischen 2000 und 2099 liegen!','err');
  // Проверка февраля
  const isLeap=(dy%4===0&&(dy%100!==0||dy%400===0));
  const febMax=isLeap?29:28;
  if(dm===2&&dd>febMax)return toast(`Februar ${dy} hat nur ${febMax} Tage!`,'err');
  // Проверка дней месяца
  const daysInMonth=[0,31,febMax,31,30,31,30,31,31,30,31,30,31];
  if(dd<1||dd>daysInMonth[dm])return toast(`Ungültiges Datum!`,'err');
  if(!betrag || betrag <= 0) return toast(t('Betrag eingeben!'), 'err');
  const entryYear=datum.substring(0,4);

  // MwSt / Vorsteuer bei Regelbesteuerung
  const mwRateRaw=document.getElementById('nf-mwst-rate')?.value;
  const mwRate=mwRateRaw===null||mwRateRaw===undefined?19:parseFloat(mwRateRaw);
  const mwBet=r2(parseFloat(document.getElementById('nf-mwst-bet')?.value)||0);
  const netBet=r2(parseFloat(document.getElementById('nf-netto-bet')?.value)||betrag);
  const entry={id:Date.now()+'',datum,typ:curTyp,kategorie:normKat(kat),zahlungsart:normZahl(zahl),beschreibung:dsc||normKat(kat),notiz:note,betrag};
  const entryYrMode=datum.substring(0,4);
  if(!isKleinunternehmer(entryYrMode)&&mwBet>0){
    if(curTyp==='Einnahme'){
      entry.mwstRate=mwRate;
      entry.mwstBetrag=mwBet;
      entry.nettoBetrag=netBet;
      if(!data.ustEintraege) data.ustEintraege=[];
      data.ustEintraege.push({
        id:Date.now()+'_ust',datum,typ:'ust',
        netto:netBet,rate:mwRate,betrag:mwBet,
        beschreibung:dsc||kat
      });
    } else {
      entry.vorsteuerRate=mwRate;
      entry.vorsteuerBet=mwBet;
      entry.nettoBetrag=netBet;
      if(!data.ustEintraege) data.ustEintraege=[];
      data.ustEintraege.push({
        id:Date.now()+'_vs',datum,typ:'vorsteuer',
        netto:netBet,rate:mwRate,betrag:mwBet,
        beschreibung:dsc||kat,lieferant:''
      });
    }
  }
  data.eintraege.unshift(entry);
  sbSaveEintrag(entry);
  renderAll();
  renderDash();
  const fj=document.getElementById('f-jahr');
  if(fj){
    const opt=[...fj.options].find(o=>o.value===entryYear);
    if(opt) fj.value=entryYear; else fj.value='Alle';
    renderEin();
  }
  clearForm();
  calcNfMwst(); // reset summary
  const mwLabel = !isKleinunternehmer(datum.substring(0,4))&&mwBet>0 ? ` (Netto: ${netBet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €, MwSt: ${mwBet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €)` : '';
  toast(`${t(curTyp)} ${t('gespeichert')}: ${fmt(betrag)}${mwLabel}`, 'ok');
}

function calcNfVorsteuer(){
  const bet =parseFloat(document.getElementById('nf-bet')?.value)||0;
  const rate=parseFloat(document.getElementById('nf-vs-rate')?.value)||0;
  const mwst=rate===0?0:r2(bet*rate/(100+rate));
  const el=document.getElementById('nf-vs-bet');
  if(el) el.value=mwst>0?mwst.toFixed(2):'';
}

// MwSt-Kalkulator (Brutto → Netto + MwSt, für Einnahme und Ausgabe)
function calcNfMwst(){
  const bet=parseFloat(document.getElementById('nf-bet')?.value)||0;
  const rateRaw=document.getElementById('nf-mwst-rate')?.value;
  const rate=rateRaw===null||rateRaw===undefined?19:parseFloat(rateRaw);
  const mwst=rate===0?0:r2(bet*rate/(100+rate));
  const netto=r2(bet-mwst);
  const mwEl=document.getElementById('nf-mwst-bet');
  const neEl=document.getElementById('nf-netto-bet');
  if(mwEl) mwEl.value=bet>0&&rate>0?mwst.toFixed(2):'';
  if(neEl) neEl.value=bet>0?netto.toFixed(2):'';
  // Summary line
  const sumEl=document.getElementById('nf-mwst-summary');
  if(sumEl){
    if(bet>0&&rate>0){
      const isEin=(curTyp==='Einnahme');
      sumEl.style.display='';
      sumEl.style.background=isEin?'rgba(249,115,22,.1)':'rgba(59,130,246,.1)';
      sumEl.style.color=isEin?'#f97316':'var(--blue)';
      const label=isEin?'USt':'Vorsteuer';
      sumEl.innerHTML=
        '<span style="color:var(--sub)">Netto: </span><strong>'+netto.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>'
        +' &nbsp;+&nbsp; <span style="color:var(--sub)">'+label+' '+rate+'%: </span><strong>'+mwst.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>'
        +' &nbsp;= &nbsp;<span style="color:var(--sub)">Brutto: </span><strong>'+bet.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</strong>';
    } else {
      sumEl.style.display='none';
    }
  }
}


// ── DASHBOARD SORTING ─────────────────────────────────────────────────────
function sortDash(col){
  // ✅ Для ВСЕХ колонок - можно менять порядок (↑↓)
  dashSortAsc = dashSortCol === col ? !dashSortAsc : false;
  dashSortCol = col;
  renderDash();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDash(){
  buildYearFilters();
  const yr=document.getElementById('dash-yr').value;
  document.getElementById('dash-yr-lbl').textContent=yr==='Alle'?'Alle Jahre':yr;
  const ye=yr==='Alle'?data.eintraege:data.eintraege.filter(e=>e.datum.startsWith(yr));
  const ein=sum(ye,'Einnahme'),aus=sum(ye,'Ausgabe'),gew=ein-aus;
  // MwSt Dashboard-Berechnung
  const mwstTotal = ye.filter(e=>e.mwstBetrag>0).reduce((s,e)=>s+e.mwstBetrag,0);
  const vstTotal  = ye.filter(e=>e.vorsteuerBet>0).reduce((s,e)=>s+e.vorsteuerBet,0);
  const zahllastDash = mwstTotal - vstTotal;
  const regelYr = (yr==='Alle' ? new Date().getFullYear()+'' : yr);
  const isRegel = !isKleinunternehmer(regelYr);
  // MwSt card visibility
  const mwstCard = document.getElementById('d-mwst-card');
  if(mwstCard) mwstCard.style.display = isRegel ? '' : 'none';
  if(isRegel && mwstCard){
    mwstCard.querySelector('.sc-lbl').textContent = 'MwSt-Zahllast';
    mwstCard.querySelector('.sc-val').textContent = (zahllastDash>=0?'+':'')+fmt(Math.abs(zahllastDash));
    mwstCard.querySelector('.sc-val').style.color = zahllastDash>0?'var(--red)':'var(--green)';
    mwstCard.querySelector('.sc-sub').textContent = 'USt '+fmt(mwstTotal)+' − VoSt '+fmt(vstTotal);
  }
  const pct=Math.min(100,Math.round(ein/250));
  g('d-ein',fmt(ein));g('d-ein-c',ye.filter(e=>e.typ==='Einnahme').length+' Einträge');
  g('d-aus',fmt(aus));g('d-aus-c',ye.filter(e=>e.typ==='Ausgabe').length+' Einträge');
  g('d-gew',fmt(gew));document.getElementById('d-gew').style.color=gew>=0?'var(--green)':'var(--red)';
  document.getElementById('d-gew').style.setProperty('color',gew>=0?'var(--green)':'var(--red)','important');
  // ✅ Меняем класс карточки для изменения цвета верхней полоски
  const gewCard = document.getElementById('d-gew').closest('.sc');
  if(gewCard) {
    gewCard.classList.remove('g','r','b','y','p');
    gewCard.classList.add(gew>=0?'g':'r');
  }
  g('d-lim',pct+'%');g('d-lim-s',fmt(ein)+' von 25.000 €');
  document.getElementById('d-lim-bar').style.width=pct+'%';
  document.getElementById('d-lim-bar').style.background=pct>80?'var(--red)':pct>60?'var(--yellow)':'var(--yellow)';
  document.getElementById('d-ein-bar').style.width=ein>0?Math.min(100,Math.round(ein/(ein+aus)*100))+'%':'0%';
  document.getElementById('d-aus-bar').style.width=aus>0?Math.min(100,Math.round(aus/(ein+aus)*100))+'%':'0%';
  g('d-cnt',ye.length+'');g('d-cnt-s',`${ye.filter(e=>e.typ==='Einnahme').length} ${t('Ein.')} / ${ye.filter(e=>e.typ==='Ausgabe').length} ${t('Aus.')}`);

  // Chart - CHART.JS (профессиональный график)
  const chartYr=yr==='Alle'?new Date().getFullYear()+'':yr;
  const ea=Array(12).fill(0),aa=Array(12).fill(0);
  data.eintraege.forEach(e=>{if(!e.datum.startsWith(chartYr))return;const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')ea[m]+=e.betrag;else aa[m]+=e.betrag;});
  const ga=ea.map((e,i)=>e-aa[i]); // Gewinn pro Monat
  
  // Уничтожаем старый график если есть
  if(window.dashChart) window.dashChart.destroy();
  
  // Создаём новый график
  const chartCanvas = document.getElementById('d-chart');
  if(chartCanvas) {
    window.dashChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: MS,
        datasets: [
          {
            label: ('  '+t('Einnahme')),
            data: ea,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
          },
          {
            label: ('  '+t('Ausgabe')),
            data: aa,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
          },
          {
            label: ('  '+t('Gewinn')),
            data: ga,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.08)',
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: ga.map(v => v >= 0 ? '#a78bfa' : '#f97316'),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            segment: {
              borderColor: ctx => ctx.p0.parsed.y < 0 || ctx.p1.parsed.y < 0 ? '#f97316' : '#a78bfa',
            },
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10 // небольшой отступ от самого верха канваса
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            // ЭТО ВАЖНО: увеличиваем этот параметр, он толкает график вниз
            // В новых версиях Chart.js это работает как margin-bottom
            padding: 40, 
            labels: {
              color: '#64748b',
              font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
              padding: 20, // Расстояние между кнопками (Einnahme <-> Ausgabe)
              usePointStyle: true,
              pointStyle: 'circle',
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'var(--border)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: false },
            ticks: {
              color: '#64748b', 
              font: { size: 11, family: "'JetBrains Mono', monospace" },
              padding: 10,
              callback: function(value) { return fmt(value); }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 }, padding: 5 }
          }
        }
      },
      // ХАК ДЛЯ ГАРАНТИРОВАННОГО ОТСТУПА (Margin Bottom для легенды)
      plugins: [{
        beforeInit: function(chart) {
          const originalFit = chart.legend.fit;
          chart.legend.fit = function fit() {
            originalFit.bind(chart.legend)();
            this.height += 30; // ВОТ ТВОИ 30 ПИКСЕЛЕЙ ОТСТУПА ВНИЗ ПОД ЛЕГЕНДОЙ
          };
        }
      }]
    });
  }

  // ✅ Обновляем визуальные индикаторы сортировки
  const thHeaders = document.querySelectorAll('#d-recent-tbl th');
  thHeaders.forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const colName = {
      'Datum': 'datum',
      'Typ': 'typ',
      'Kat.': 'kategorie',
      'Zahlung': 'zahlungsart',
      'Beschreibung': 'beschreibung',
      'Betrag': 'betrag'
    }[th.textContent.trim()];
    if(colName === dashSortCol) {
      th.classList.add(dashSortAsc ? 'sort-asc' : 'sort-desc');
    }
  });
  
  // Recent 10 — показываем последние 10 ПО ВЫБРАННОМУ ГОДУ
  let recent=[...ye]  // ✅ Используем ye (отфильтрованные по году данные)
    .sort((a,b)=>b.datum.localeCompare(a.datum))  // ✅ Сначала сортируем по дате (новые сверху)
    .slice(0,10);                                   // ✅ Берём первые 10 (последние по дате)
  
  // ✅ Потом сортируем эти 10 по выбранной колонке
  if(dashSortCol !== 'datum') {
    recent.sort((a,b)=>{
      let va=a[dashSortCol], vb=b[dashSortCol];
      // Для чисел (betrag)
      if(dashSortCol==='betrag'){ va=+va; vb=+vb; }
      // Для других (typ, kategorie, zahlungsart, beschreibung)
      if(dashSortAsc) return va>vb?1:-1;
      return va<vb?1:-1;
    });
  } else {
    // Если сортируем по дате - используем dashSortAsc для порядка
    if(dashSortAsc) {
      recent.reverse(); // Обратный порядок (старые сверху)
    }
  }
  const mob=isMob();
  document.getElementById('d-recent').innerHTML=recent.length?recent.map(e=>`
    <tr onclick="${mob?`showMobDetail(${JSON.stringify(e).replace(/"/g,"'")})`:''}" style="${mob?'cursor:pointer':''}">
      <td style="font-family:var(--mono);font-size:11px;color:var(--sub);white-space:nowrap">${mob?fdm(e.datum):fd(e.datum)}</td>
      <td><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'}</span></td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.kategorie}">${e.kategorie}</td>
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span class="badge ${ZBADGE[e.zahlungsart]||''}" style="font-size:10px">${mob?(ZICONS[e.zahlungsart]||'<i class="fas fa-solid fa-euro-sign"></i>'):e.zahlungsart||'—'}</span></td>
      <td class="mob-hide" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px" title="${e.beschreibung}">${e.beschreibung}</td>
      <td style="text-align:right;white-space:nowrap"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
    </tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--sub)">'+t('Keine Einträge')+'</td></tr>';
}

// ── EINTRÄGE ──────────────────────────────────────────────────────────────
function getFiltered(){
  const j=document.getElementById('f-jahr').value;
  const m=document.getElementById('f-mon').value;
  const k=document.getElementById('f-kat').value;
  const z=document.getElementById('f-zahl').value;
  const q=document.getElementById('f-q').value.toLowerCase();
  return data.eintraege.filter(e=>{
    if(fTyp!=='Alle'&&e.typ!==fTyp)return false;
    if(j!=='Alle'&&!e.datum.startsWith(j))return false;
    if(m!=='Alle'&&e.datum.substring(5,7)!==m)return false;
    if(k!=='Alle'&&e.kategorie!==k)return false;
    if(z!=='Alle'&&(e.zahlungsart||'Sonstiges')!==z)return false;
    // Поиск по описанию, категории И ДАТЕ
    if(q&&!e.beschreibung.toLowerCase().includes(q)
       &&!e.kategorie.toLowerCase().includes(q)
       &&!e.datum.includes(q))return false;
    return true;
  });
}

let sortHeaders={'datum':'th-datum','typ':'th-typ','kategorie':'th-kat','beschreibung':'th-desc','zahlungsart':'th-zahl','betrag':'th-bet'};
function sortE(col){
  Object.values(sortHeaders).forEach(id=>{const el=document.getElementById(id);if(el){el.classList.remove('sort-asc','sort-desc');}});
  sortAsc=sortCol===col?!sortAsc:false; sortCol=col;
  const hid=sortHeaders[col];
  if(hid){const el=document.getElementById(hid);if(el)el.classList.add(sortAsc?'sort-asc':'sort-desc');}
  renderEin();
}

function setFTyp(t,btn){fTyp=t;document.querySelectorAll('.ftab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderEin();}

// ── PAGINATION HELPERS ────────────────────────────────────────────────────
function nextTenPages(total) { einPage = Math.min(total, einPage + 10); renderEin(); }
function prevTenPages() { einPage = Math.max(1, einPage - 10); renderEin(); }

function renderEin(){
  const entries=getFiltered().sort((a,b)=>{
    let va=a[sortCol],vb=b[sortCol];
    if(sortCol==='betrag'){va=+va;vb=+vb;}
    // ✅ Для дат: sortAsc=false означает новые сверху (убывающий порядок)
    if(sortCol==='datum') {
      return sortAsc ? (va.localeCompare(vb)) : (vb.localeCompare(va)); // DESC по умолчанию
    }
    // Для других колонок: стандартная логика
    return sortAsc?(va>vb?1:-1):(va<vb?1:-1);
  });
  const tb=document.getElementById('e-tbody'),em=document.getElementById('e-empty');
  const mob=isMob();
  
  // Показываем/скрываем мобильный заголовок Beschreibung
  const thDescMob = document.getElementById('th-desc-mob');
  if(thDescMob) {
    thDescMob.style.display = mob ? 'table-cell' : 'none';
  }
  // MwSt-Spalten anzeigen wenn Regelbesteuerung aktiv
  const einJahr = document.getElementById('f-jahr')?.value || 'Alle';
  const showMwstHdr = !isKleinunternehmer(einJahr==='Alle'?new Date().getFullYear()+'':einJahr) && !mob;
  ['th-netto','th-mwst'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = showMwstHdr ? 'table-cell' : 'none';
  });
  // Betrag-Spalten-Titel
  const thBet=document.getElementById('th-bet');
  if(thBet) thBet.textContent = showMwstHdr ? 'Brutto' : 'Betrag';
  
  if(!entries.length){
    tb.innerHTML='';
    em.style.display='block';
    document.getElementById('e-pagination').innerHTML='';
  } else {
    em.style.display='none';
    
    // ✅ ПАГИНАЦИЯ: показываем только 50 записей на странице
    const totalPages = Math.ceil(entries.length / einPerPage);
    if(einPage > totalPages) einPage = totalPages; // Если страница потеряна
    
    const start = (einPage - 1) * einPerPage;
    const end = start + einPerPage;
    const pageEntries = entries.slice(start, end);
    
    // Рендеринг записей текущей страницы
    tb.innerHTML=pageEntries.map(e=>{
      const rowYr=e.datum.substring(0,4);
      const showMwst = !isKleinunternehmer(rowYr);
      const hasMwst = e.mwstBetrag>0||e.vorsteuerBet>0;
      const mwstVal = e.typ==='Einnahme'?(e.mwstBetrag||0):(e.vorsteuerBet||0);
      const nettoVal = e.typ==='Einnahme'?(e.nettoBetrag||e.betrag):(e.betrag-(e.vorsteuerBet||0));
      const mwstRate = e.mwstRate||e.vorsteuerRate||0;
      return `
      <tr onclick="${mob?`showMobDetail(${JSON.stringify(e).replace(/"/g,"'")})`:''}" style="${mob?'cursor:pointer':''}">
        <td style="font-family:var(--mono);font-size:11px;color:var(--sub)">${mob?fdm(e.datum):fd(e.datum)}</td>
        <td><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'} ${mob?'':e.typ}</span></td>
        <td class="mob-hide" style="color:var(--sub);font-size:12px">${e.kategorie}</td>
        <td class="mob-hide"><span title="${e.notiz||''}">${e.beschreibung}${e.notiz?` <span style="color:var(--sub);font-size:10px"><i class="fas fa-sticky-note"></i></span>`:''}</span></td>
        ${mob?`<td style="font-size:11px;color:var(--muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.beschreibung||'—'}</td>`:''}
        <td class="mob-hide"><span class="badge ${ZBADGE[e.zahlungsart]||''}">${e.zahlungsart||'—'}</span></td>
        ${showMwst&&!mob?`<td class="mob-hide" style="text-align:right;font-size:11px;font-family:var(--mono);color:var(--sub)">${hasMwst?fmt(nettoVal):'—'}</td>
        <td class="mob-hide" style="text-align:right;font-size:11px;font-family:var(--mono);color:#f97316">${hasMwst?'+'+fmt(mwstVal)+' ('+mwstRate+'%)':'—'}</td>`:''}
        <td style="text-align:right"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
        <td style="white-space:nowrap">
          ${mob?'':`<button class="del-btn edit-btn" title="Bearbeiten" onclick="editE(event,'${e.id}')"><i class="fas fa-edit"></i></button>`}
          <button class="del-btn" onclick="delE(event,'${e.id}')"><i class="fas fa-times"></i></button>
        </td>
      </tr>`;}).join('');
    
    // ✅ Пагинация навигация
    let paginationHTML = '';
    if(totalPages > 1) {
      paginationHTML += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;flex-wrap:wrap">`;
      
      // Кнопка "на первую страницу"
      if(einPage > 1) {
        paginationHTML += `<button class="btn" onclick="einPage=1;renderEin()" style="padding:6px 10px" title="На первую"><i class="fas fa-step-backward"></i></button>`;
      }
      
      // Кнопка "назад на 10 страниц"
      if(einPage > 10) {
        paginationHTML += `<button class="btn" onclick="prevTenPages()" style="padding:6px 10px" title="-10 страниц"><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>`;
      }
      
      // Кнопка "назад"
      if(einPage > 1) {
        paginationHTML += `<button class="btn" onclick="einPage--;renderEin()" style="padding:6px 10px" title="Назад"><i class="fas fa-chevron-left"></i></button>`;
      }
      
      // Номера страниц
      const maxPagesToShow = 5;
      let startPage = Math.max(1, einPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      if(endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for(let i = startPage; i <= endPage; i++) {
        if(i === einPage) {
          paginationHTML += `<button class="btn" style="background:var(--blue);color:#fff;padding:6px 10px">${i}</button>`;
        } else {
          paginationHTML += `<button class="btn" onclick="einPage=${i};renderEin()" style="padding:6px 10px">${i}</button>`;
        }
      }
      
      // Кнопка "вперёд"
      if(einPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="einPage++;renderEin()" style="padding:6px 10px" title="Вперёд"><i class="fas fa-chevron-right"></i></button>`;
      }
      
      // Кнопка "вперёд на 10 страниц"
      if(einPage < totalPages - 9) {
        paginationHTML += `<button class="btn" onclick="nextTenPages(${totalPages})" style="padding:6px 10px" title="+10 страниц"><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>`;
      }
      
      // Кнопка "на последнюю страницу"
      if(einPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="einPage=${totalPages};renderEin()" style="padding:6px 10px" title="На последнюю"><i class="fas fa-step-forward"></i></button>`;
      }
      
      paginationHTML += `<span style="font-size:11px;color:var(--sub);margin-left:12px">${start+1}-${Math.min(end, entries.length)} / ${entries.length}</span>`;
      paginationHTML += `</div>`;
    }
    document.getElementById('e-pagination').innerHTML = paginationHTML;
  }
  
  const ein=sum(entries,'Einnahme'),aus=sum(entries,'Ausgabe'),gew=ein-aus;
  g('es-cnt',entries.length+'');
  g('es-ein',fmt(ein));g('es-aus',fmt(aus));
  g('es-gew',(gew>=0?'+':'')+fmt(gew));
  document.getElementById('es-gew').style.setProperty('color',gew>=0?'var(--green)':'var(--red)','important');
}

// ── MONTHLY REPORT ────────────────────────────────────────────────────────
function renderRep(){
  buildYearFilters();
  const repYr=document.getElementById('rep-yr');
  const yr=repYr.value||new Date().getFullYear()+'';
  const ye=data.eintraege.filter(e=>e.datum.startsWith(yr));

  const repJahr=document.getElementById('rep-yr')?.value||new Date().getFullYear()+'';
  const isRegel=!isKleinunternehmer(repJahr);
  // MwSt-Spalten im Bericht ein-/ausblenden
  ['rep-th-netto','rep-th-mwst','rep-th-zl'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = isRegel ? 'table-cell' : 'none';
  });
  const months=Array.from({length:12},(_,i)=>{
    const mi=String(i+1).padStart(2,'0');
    const me=ye.filter(e=>e.datum.substring(5,7)===mi);
    const ein=sum(me,'Einnahme'),aus=sum(me,'Ausgabe');
    const mwst=me.filter(e=>e.mwstBetrag>0).reduce((s,e)=>s+e.mwstBetrag,0);
    const vost=me.filter(e=>e.vorsteuerBet>0).reduce((s,e)=>s+e.vorsteuerBet,0);
    const netto=me.filter(e=>e.typ==='Einnahme').reduce((s,e)=>s+(e.nettoBetrag||e.betrag),0);
    return{i,mi,ein,aus,gew:ein-aus,count:me.length,mwst,vost,netto,zahllast:mwst-vost};
  });

  // Year stats
  const tEin=months.reduce((s,m)=>s+m.ein,0),tAus=months.reduce((s,m)=>s+m.aus,0);
  const tMwst=months.reduce((s,m)=>s+m.mwst,0), tVost=months.reduce((s,m)=>s+m.vost,0);
  const tZl=tMwst-tVost;
  g('rs-ein',fmt(tEin));g('rs-aus',fmt(tAus));
  g('rs-gew',fmt(tEin-tAus));document.getElementById('rs-gew').style.setProperty('color',(tEin-tAus)>=0?'var(--green)':'var(--red)','important');
  // MwSt Jahressummary card
  const rsMwstCard=document.getElementById('rs-mwst-card');
  if(rsMwstCard){
    rsMwstCard.style.display=isRegel?'':'none';
    if(isRegel){
      rsMwstCard.querySelector('.sc-lbl').textContent='MwSt-Zahllast '+yr;
      rsMwstCard.querySelector('.sc-val').textContent=(tZl>=0?'+':'')+fmt(tZl);
      rsMwstCard.querySelector('.sc-val').style.color=tZl>0?'var(--red)':'var(--green)';
      rsMwstCard.querySelector('.sc-sub').textContent='USt '+fmt(tMwst)+' − VoSt '+fmt(tVost);
    }
  }
  const bestM=months.reduce((b,m)=>m.gew>b.gew?m:b,months[0]);
  g('rs-best',bestM.count?fmt(bestM.gew):'—');g('rs-best-s',bestM.count?MN[bestM.i]:'');

  const mxE=Math.max(...months.map(m=>m.ein),1),mxA=Math.max(...months.map(m=>m.aus),1);
  const curMon=new Date().getMonth();
  const mob=isMob();
  document.getElementById('month-cards').innerHTML=months.map(m=>{
    const gc=m.gew>=0?'var(--green)':'var(--red)';
    const isCur=m.i===curMon&&yr===new Date().getFullYear()+'';
    const mname=mob?MS[m.i]:MN[m.i];
    return`<div class="mc${isCur?' current':''}" onclick="openMonatDetail('${yr}','${m.mi}')" style="cursor:pointer" title="${MN[m.i]} ${yr} — Details anzeigen">
      <div class="mc-top"><span class="mc-name">${mname}</span><span class="mc-gew" style="color:${gc}">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</span></div>
      <div class="mc-body">
        <div class="mc-stat"><label>Einnahmen</label><span style="color:var(--green)">${m.ein>0?fmt(m.ein):'—'}</span></div>
        <div class="mc-stat"><label>Ausgaben</label><span style="color:var(--red)">${m.aus>0?fmt(m.aus):'—'}</span></div>
      </div>
      <div class="mc-bars">
        <div class="mc-bar-row"><label style="color:var(--green);font-size:9px">E</label><div class="mc-bar-bg"><div class="mc-bar-fill ein" style="width:${Math.round(m.ein/mxE*100)}%"></div></div></div>
        <div class="mc-bar-row"><label style="color:var(--red);font-size:9px">A</label><div class="mc-bar-bg"><div class="mc-bar-fill aus" style="width:${Math.round(m.aus/mxA*100)}%"></div></div></div>
      </div>
    </div>`;
  }).join('');

  // Table — короткие месяцы на мобиле, КОМПАКТНАЯ ВЕРСИЯ
  let cumul=0,tot={ein:0,aus:0,cnt:0};
  document.getElementById('rep-tbody').innerHTML=months.map(m=>{
    tot.ein+=m.ein;tot.aus+=m.aus;tot.cnt+=m.count;cumul+=m.gew;
    const gc=m.gew>=0?'var(--green)':'var(--red)';
    const cc=cumul>=0?'var(--green)':'var(--red)';
    // ✅ Мобильная версия - более компактная
    if(mob) {
      return `<tr style="cursor:pointer" onclick="openMonatDetail('${yr}','${m.mi}')" title="Klicken für Details">
        <td style="font-weight:${m.count?'500':'400'};color:${m.count?'var(--text)':'var(--sub)'}">
          <span style="font-size:12px">${MS[m.i]}</span><br/>
          <span style="font-size:10px;color:var(--sub)">E: ${fmt(m.ein)}</span><br/>
          <span style="font-size:10px;color:var(--sub)">A: ${fmt(m.aus)}</span>
        </td>
        <td style="text-align:right;color:${gc};font-weight:600;padding-left:12px">
          <span style="font-size:12px">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</span>
        </td>
      </tr>`;
    } else {
      return `<tr style="cursor:pointer" onclick="openMonatDetail('${yr}','${m.mi}')" title="Klicken für Details" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <td style="font-weight:${m.count?'500':'400'};color:${m.count?'var(--text)':'var(--sub)'}">${MN[m.i]} <span style="font-size:10px;color:var(--sub)">↗</span></td>
        <td style="color:var(--green)">${m.ein>0?fmt(m.ein):'—'}</td>
        ${isRegel?`<td style="color:var(--sub);font-size:11px">${m.netto>0?fmt(m.netto):'—'}</td><td style="color:#f97316;font-size:11px">${m.mwst>0?fmt(m.mwst):'—'}</td><td style="color:var(--cyan);font-size:11px;font-weight:600">${m.zahllast!=0?(m.zahllast>0?'+':'')+fmt(m.zahllast):'—'}</td>`:''}
        <td style="color:var(--red)">${m.aus>0?fmt(m.aus):'—'}</td>
        <td style="color:${gc};font-weight:600">${m.count?(m.gew>=0?'+':'')+fmt(m.gew):'—'}</td>
        <td style="color:${cc}">${m.count?(cumul>=0?'+':'')+fmt(cumul):'—'}</td>
        <td style="color:var(--sub)">${m.count||'—'}</td>
      </tr>`;
    }
  }).join('');
  const tg=tot.ein-tot.aus;
  // ✅ Footer также адаптивен
  if(mob) {
    document.getElementById('rep-tfoot').innerHTML=`<tr>
      <td style="font-weight:600">
        <span style="font-size:12px">GESAMT ${yr.substring(2)}</span><br/>
        <span style="font-size:10px;color:var(--green)">E: ${fmt(tot.ein)}</span><br/>
        <span style="font-size:10px;color:var(--red)">A: ${fmt(tot.aus)}</span>
      </td>
      <td style="text-align:right;color:${tg>=0?'var(--green)':'var(--red)'};font-weight:600">
        <span style="font-size:12px">${tg>=0?'+':''}${fmt(tg)}</span>
      </td>
    </tr>`;
  } else {
    const totMwst=months.reduce((s,m)=>s+m.mwst,0);
    const totVost=months.reduce((s,m)=>s+m.vost,0);
    const totNetto=months.reduce((s,m)=>s+m.netto,0);
    const totZl=totMwst-totVost;
    document.getElementById('rep-tfoot').innerHTML=`<tr>
      <td>GESAMT ${yr}</td>
      <td style="color:var(--green)">${fmt(tot.ein)}</td>
      ${isRegel?`<td style="color:var(--sub);font-size:11px">${fmt(totNetto)}</td><td style="color:#f97316;font-size:11px">${fmt(totMwst)}</td><td style="color:var(--cyan);font-size:11px;font-weight:700">${totZl>0?'+':''}${fmt(totZl)}</td>`:''}
      <td style="color:var(--red)">${fmt(tot.aus)}</td>
      <td style="color:${tg>=0?'var(--green)':'var(--red)'}">${tg>=0?'+':''}${fmt(tg)}</td>
      <td></td>
      <td style="color:var(--sub)">${tot.cnt}</td>
    </tr>`;
  }
}

// ── ZAHLUNGSARTEN ─────────────────────────────────────────────────────────
function renderZ(){
  buildYearFilters();
  const yr=document.getElementById('z-yr').value;
  const ye=yr==='Alle'?data.eintraege:data.eintraege.filter(e=>e.datum.startsWith(yr));
  const mob=isMob();

  const zkStats={};
  ZAHL.forEach(z=>zkStats[z]={ein:0,aus:0,cnt:0});
  ye.forEach(e=>{
    const z=e.zahlungsart||'Sonstiges';
    if(!zkStats[z])zkStats[z]={ein:0,aus:0,cnt:0};
    if(e.typ==='Einnahme')zkStats[z].ein+=e.betrag; else zkStats[z].aus+=e.betrag;
    zkStats[z].cnt++;
  });

  document.getElementById('zk-grid').innerHTML=ZAHL.map(z=>{
    const s=zkStats[z]||{ein:0,aus:0,cnt:0};
    const gew=s.ein-s.aus;
    const gc=gew>0?'var(--green)':gew<0?'var(--red)':'var(--sub)';
    return`<div class="zk">
      <div class="zk-icon">${ZICONS[z]||'<i class="fas fa-solid fa-euro-sign"></i>'}</div>
      <div class="zk-name">${z}</div>
      <div class="zk-val" style="color:${ZCOLS[z]||'var(--text)'}">${s.cnt>0?fmt(s.ein+s.aus):'—'}</div>
      <div class="zk-sub">${s.cnt} Einträge${s.cnt?` · Gewinn: <span style="color:${gc}">${gew>=0?'+':''}${fmt(gew)}</span>`:''}</div>
    </div>`;
  }).join('');

  const sorted=[...ye].sort((a,b)=>b.datum.localeCompare(a.datum));
  const ztb=document.getElementById('z-tbody'),zem=document.getElementById('z-empty');
  const zpag=document.getElementById('z-pagination');
  
  if(!sorted.length){
    ztb.innerHTML='';
    zem.style.display='block';
    if(zpag) zpag.innerHTML='';
  } else {
    zem.style.display='none';
    
    // ✅ ПАГИНАЦИЯ: показываем только 50 записей на странице
    const totalPages = Math.ceil(sorted.length / zPerPage);
    if(zPage > totalPages) zPage = totalPages;
    
    const start = (zPage - 1) * zPerPage;
    const end = start + zPerPage;
    const pageEntries = sorted.slice(start, end);
    
    ztb.innerHTML=pageEntries.map(e=>{
      const yearForDisplay = mob ? e.datum.substring(2,4) : e.datum.substring(0,4);
      return `<tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--sub)">${fd(e.datum)}</td>
        <td><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'} ${mob?'':''+e.typ}</span></td>
        ${mob?'':`<td>${e.beschreibung}</td>`}
        <td><span class="badge ${ZBADGE[e.zahlungsart]||''}">${ZICONS[e.zahlungsart]||''} ${mob?'':e.zahlungsart||'Sonstiges'}</span></td>
        <td style="text-align:right"><span class="amt ${e.typ==='Einnahme'?'ein':'aus'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</span></td>
      </tr>`;
    }).join('');
    
    // ✅ Пагинация навигация
    let paginationHTML = '';
    if(totalPages > 1) {
      paginationHTML += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;flex-wrap:wrap">`;
      
      if(zPage > 1) {
        paginationHTML += `<button class="btn" onclick="zPage=1;renderZ()" style="padding:6px 10px" title="На первую"><i class="fas fa-step-backward"></i></button>`;
      }
      
      if(zPage > 10) {
        paginationHTML += `<button class="btn" onclick="zPage=Math.max(1,zPage-10);renderZ()" style="padding:6px 10px" title="-10"><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>`;
      }
      
      if(zPage > 1) {
        paginationHTML += `<button class="btn" onclick="zPage--;renderZ()" style="padding:6px 10px" title="Назад"><i class="fas fa-chevron-left"></i></button>`;
      }
      
      const maxPagesToShow = 5;
      let startPage = Math.max(1, zPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      if(endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for(let i = startPage; i <= endPage; i++) {
        if(i === zPage) {
          paginationHTML += `<button class="btn" style="background:var(--blue);color:#fff;padding:6px 10px">${i}</button>`;
        } else {
          paginationHTML += `<button class="btn" onclick="zPage=${i};renderZ()" style="padding:6px 10px">${i}</button>`;
        }
      }
      
      if(zPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="zPage++;renderZ()" style="padding:6px 10px" title="Вперёд"><i class="fas fa-chevron-right"></i></button>`;
      }
      
      if(zPage <= totalPages - 10) {
        paginationHTML += `<button class="btn" onclick="zPage=Math.min(${totalPages},zPage+10);renderZ()" style="padding:6px 10px" title="+10"><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>`;
      }
      
      if(zPage < totalPages) {
        paginationHTML += `<button class="btn" onclick="zPage=${totalPages};renderZ()" style="padding:6px 10px" title="На последнюю"><i class="fas fa-step-forward"></i></button>`;
      }
      
      paginationHTML += `<span style="font-size:11px;color:var(--sub);margin-left:12px">${start+1}-${Math.min(end, sorted.length)} / ${sorted.length}</span>`;
      paginationHTML += `</div>`;
    }
    if(zpag) zpag.innerHTML = paginationHTML;
  }
}

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

// ── PROGNOSE ─────────────────────────────────────────────────────────────
function renderProg(){
  const years=[...new Set(data.eintraege.map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('prog-yr');
  if(!sel.innerHTML||!sel.value){
    sel.innerHTML=years.map((y,i)=>`<option${i===0?' selected':''}>${y}</option>`).join('');
  }
  const yr=sel.value||new Date().getFullYear()+'';
  const prevYr=String(parseInt(yr)-1);
  const now=new Date(); const curM=yr===now.getFullYear()+''?now.getMonth():11;
  const ye=data.eintraege.filter(e=>e.datum.startsWith(yr));
  const pe=data.eintraege.filter(e=>e.datum.startsWith(prevYr));

  const einM=Array(12).fill(0),ausM=Array(12).fill(0);
  const einP=Array(12).fill(0),ausP=Array(12).fill(0);
  ye.forEach(e=>{const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')einM[m]+=e.betrag;else ausM[m]+=e.betrag;});
  pe.forEach(e=>{const m=parseInt(e.datum.substring(5,7))-1;if(e.typ==='Einnahme')einP[m]+=e.betrag;else ausP[m]+=e.betrag;});

  const istEin=einM.slice(0,curM+1).reduce((s,v)=>s+v,0);
  const istAus=ausM.slice(0,curM+1).reduce((s,v)=>s+v,0);
  const avgEin=curM>=0?istEin/(curM+1):0, avgAus=curM>=0?istAus/(curM+1):0;
  const progEin=Math.round((istEin+avgEin*(11-curM))*100)/100;
  const progAus=Math.round((istAus+avgAus*(11-curM))*100)/100;
  const prevEin=einP.reduce((s,v)=>s+v,0), prevAus=ausP.reduce((s,v)=>s+v,0);
  const delta=e=>prevEin>0?Math.round((e/prevEin-1)*100):0;

  // Cards
  const c=(cls,lbl,val,sub)=>`<div class="sc ${cls}" style="cursor:default"><div class="sc-lbl">${lbl}</div><div class="sc-val">${val}</div><div class="sc-sub">${sub}</div></div>`;
  document.getElementById('prog-cards').innerHTML=
    c('b','Ist Einnahmen',fmt(istEin),`${curM+1} Monate`)+
    c('g','Prognose Einnahmen Jahr',fmt(progEin),`Hochrechnung bis Dez.`)+
    c('r','Prognose Ausgaben Jahr',fmt(progAus),`Ø ${fmt(avgAus)}/Monat`)+
    c(progEin-progAus>=0?'g':'r','Progn. Gewinn',fmt(progEin-progAus),`vs. Vorjahr: ${fmt(prevEin-prevAus)}`);

  // Monat für Monat
  document.getElementById('prog-monat').innerHTML=MS.map((m,i)=>{
    const ein=einM[i],aus=ausM[i],gew=ein-aus;
    const isFuture=i>curM&&yr===now.getFullYear()+'';
    const gc=gew>=0?'var(--green)':'var(--red)';
    return`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);${isFuture?'opacity:.45':''}">
      <span style="font-size:11px;color:var(--sub);width:28px;font-family:var(--mono)">${m}</span>
      <div style="flex:1">
        <div class="prog-bar-wrap" style="margin-bottom:4px">
          <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${ein>0?Math.min(100,Math.round(ein/(Math.max(...einM,1))*100)):0}%;background:var(--green)"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:var(--green);width:90px;text-align:right">${ein>0?fmt(ein):'—'}</span>
        </div>
        <div class="prog-bar-wrap" style="margin-bottom:0">
          <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${aus>0?Math.min(100,Math.round(aus/(Math.max(...ausM,1))*100)):0}%;background:var(--red)"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:var(--red);width:90px;text-align:right">${aus>0?fmt(aus):'—'}</span>
        </div>
      </div>
      <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${gc};width:90px;text-align:right">${ein||aus?(gew>=0?'+':'')+fmt(gew):'—'}</span>
    </div>`;
  }).join('');

  // Vorjahresvergleich
  const hasVorjahr=pe.length>0;
  if(!hasVorjahr){
    document.getElementById('prog-vergleich').innerHTML='<p style="color:var(--sub);font-size:12px">'+t('Keine Vorjahresdaten für ')+prevYr+t(' vorhanden.')+'</p>';
  } else {
    document.getElementById('prog-vergleich').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        ${[['Einnahmen',istEin,prevEin,'var(--green)'],['Ausgaben',istAus,prevAus,'var(--red)']].map(([lbl,cur,prev,col])=>{
          const d=prev>0?Math.round((cur/prev-1)*100):0;
          return`<div style="background:var(--s2);border-radius:var(--r);padding:12px">
            <div style="font-size:10px;color:var(--sub);margin-bottom:5px">${lbl}</div>
            <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:${col}">${fmt(cur)}</div>
            <div style="font-size:10px;color:var(--sub);margin-top:3px">${t('Vj:')} ${fmt(prev)}</div>
            <div style="font-size:11px;font-weight:600;margin-top:4px;color:${d>=0?'var(--green)':'var(--red)'}">${d>=0?'+':''}${d}% ${t('ggü.')} ${prevYr}</div>
          </div>`;
        }).join('')}
      </div>
      ${MS.map((m,i)=>{
        const dE=einP[i]>0?Math.round((einM[i]/einP[i]-1)*100):einM[i]>0?100:0;
        return`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">
          <span style="color:var(--sub);width:28px;font-family:var(--mono)">${m}</span>
          <span style="font-family:var(--mono);width:80px">${einM[i]>0?fmt(einM[i]):'—'}</span>
          <span style="color:var(--sub);width:80px;font-size:10px">${t('Vj:')} ${einP[i]>0?fmt(einP[i]):'—'}</span>
          <span style="font-weight:600;color:${dE>=0?'var(--green)':'var(--red)'}">${einM[i]||einP[i]?(dE>=0?'+':'')+dE+'%':'—'}</span>
        </div>`;
      }).join('')}`;
  }

  // Hochrechnung
  const klimit=25000;   // Vorjahres-Grenze (§19 UStG ab 2025)
  const klimit100=100000; // Laufendes Jahr HARD LIMIT (§19 UStG ab 2025)
  const pctNow=Math.min(100,Math.round(istEin/klimit*100));
  const pctProg=Math.min(100,Math.round(progEin/klimit*100));
  const pct100=Math.min(100,Math.round(istEin/klimit100*100));
  document.getElementById('prog-hochrechnung').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">Progn. Jahreseinnahmen</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:var(--green)">${fmt(progEin)}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">Progn. Jahresgewinn</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:${progEin-progAus>=0?'var(--green)':'var(--red)'}">${fmt(progEin-progAus)}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px">
        <div style="font-size:10px;color:var(--sub);margin-bottom:5px">KU-Vorjahresgrenze</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:600;color:${pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)'}">${pctProg}%</div>
        <div style="font-size:10px;color:var(--sub);margin-top:3px">${fmt(progEin)} von 25.000 € (§19)</div>
      </div>
    </div>
    <div style="margin-bottom:4px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between">
      <span>${t('📊 Vorjahresgrenze-Prognose (25.000 €)')}</span><span style="font-family:var(--mono)">${pctProg}%</span>
    </div>
    <div style="height:10px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:12px">
      <div style="height:100%;width:${pctProg}%;background:${pctProg>90?'var(--red)':pctProg>70?'var(--yellow)':'var(--green)'};border-radius:6px;transition:width .6s"></div>
    </div>
    <div style="margin-bottom:4px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between">
      <span>${t('⚡ Laufendes Jahr — HARD LIMIT (100.000 €) Fallbeil-Effekt!')}</span><span style="font-family:var(--mono)">${pct100}%</span>
    </div>
    <div style="height:10px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:10px">
      <div style="height:100%;width:${pct100}%;background:${pct100>80?'var(--red)':pct100>50?'var(--yellow)':'var(--blue)'};border-radius:6px;transition:width .6s"></div>
    </div>
    ${pct100>=100?`<div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:10px;font-size:12px;color:var(--red)">🚨 <strong>100.000 € überschritten!</strong> Ab diesem Moment gilt Regelbesteuerung — sofortige USt-Pflicht! (§19 UStG Fallbeil-Effekt)</div>`
    :pctProg>80?`<div style="color:var(--yellow);font-size:12px">${t('⚠️ Vorjahresgrenze in Sicht — bei Überschreitung 25.000 € entfällt §19 UStG im Folgejahr!')}</div>`
    :'<div style="color:var(--green);font-size:12px">✅ Kleinunternehmer-Status (§19 UStG) voraussichtlich sicher</div>'}
    <div style="margin-top:10px;font-size:10px;color:var(--sub);background:var(--s3);padding:8px 10px;border-radius:var(--r);border:1px solid var(--border)">
      ${t('ℹ️ Neu ab 01.01.2025 (JStG 2024): Vorjahresgrenze 25.000 € (netto) + laufendes Jahr max. 100.000 € (harte Grenze, sofort wirksam bei Überschreitung).')}
    </div>`;
}

// ── KATEGORIEN ───────────────────────────────────────────────────────────
let katTyp='Ausgabe';
const PIE_COLORS=['#3b82f6','#22c55e','#ef4444','#f59e0b','#a855f7','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16','#6366f1','#e11d48'];

function setKatTab(t,btn){
  katTyp=t;
  document.querySelectorAll('#p-kategorien .ftab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderKat();
}
function renderKat(){
  const years=[...new Set(data.eintraege.map(e=>e.datum.substring(0,4)))].sort().reverse();
  const sel=document.getElementById('kat-yr');
  if(!sel.innerHTML) sel.innerHTML='<option value="Alle">Alle Jahre</option>'+years.map(y=>`<option>${y}</option>`).join('');
  const yr=sel.value||'Alle';
  const ye=yr==='Alle'?data.eintraege:data.eintraege.filter(e=>e.datum.startsWith(yr));
  const filtered=ye.filter(e=>e.typ===katTyp);
  const byKat={};
  filtered.forEach(e=>{byKat[e.kategorie]=(byKat[e.kategorie]||0)+e.betrag;});
  const sorted=Object.entries(byKat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);

  // Canvas donut
  const canvas=document.getElementById('kat-canvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,264,264);
  const cx=132,cy=132,ro=120,ri=70;
  let angle=-Math.PI/2;
  if(sorted.length){
    sorted.forEach(([,val],i)=>{
      const slice=(val/total)*2*Math.PI;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,ro,angle,angle+slice);
      ctx.closePath();ctx.fillStyle=PIE_COLORS[i%PIE_COLORS.length];ctx.fill();
      angle+=slice;
    });
    // hole
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle='#1a1e28';ctx.fill();
    // center text
    ctx.fillStyle='#f1f5f9';ctx.font='bold 14px Inter';ctx.textAlign='center';
    ctx.fillText(fmt(total),cx,cy+5);
  } else {
    ctx.beginPath();ctx.arc(cx,cy,ro,0,2*Math.PI);ctx.fillStyle='#2c3147';ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,ri,0,2*Math.PI);ctx.fillStyle='#1a1e28';ctx.fill();
    ctx.fillStyle='#64748b';ctx.font='13px Inter';ctx.textAlign='center';ctx.fillText('Keine Daten',cx,cy+5);
  }

  // Legend
  document.getElementById('kat-legend').innerHTML=sorted.slice(0,8).map(([k,v],i)=>`
    <div class="donut-leg-item">
      <div class="donut-dot" style="background:${PIE_COLORS[i%PIE_COLORS.length]}"></div>
      <span style="flex:1;color:var(--sub);font-size:14px">${k}</span>
      <span style="font-family:var(--mono);font-size:14px">${Math.round(v/total*100)}%</span>
    </div>`).join('');

  // Table
  document.getElementById('kat-tbody').innerHTML=sorted.length?sorted.map(([k,v],i)=>`
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 14px;display:flex;align-items:center;gap:8px">
        <div style="width:10px;height:10px;border-radius:2px;background:${PIE_COLORS[i%PIE_COLORS.length]};flex-shrink:0"></div>
        ${k}
      </td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:${katTyp==='Einnahme'?'var(--green)':'var(--red)'}">${fmt(v)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--sub)">${Math.round(v/total*100)}%</td>
      <td style="padding:10px 14px">
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;min-width:50%">
          <div style="height:100%;width:${Math.round(v/sorted[0][1]*100)}%;background:${PIE_COLORS[i%PIE_COLORS.length]};border-radius:3px"></div>
        </div>
      </td>
    </tr>`).join('')
    :'<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--sub)">Keine Daten</td></tr>';
}

// ── RECHNUNGEN ───────────────────────────────────────────────────────────
let rechFilter='alle', editRechId=null;
function renderRech(){
  const rech=data.rechnungen||[];
  // Auto-update überfällig
  const today=new Date().toISOString().split('T')[0];
  rech.forEach(r=>{if(r.status==='offen'&&r.faellig&&r.faellig<today)r.status='ueberfaellig';});

  const filtered=rechFilter==='alle'?rech:rech.filter(r=>r.status===rechFilter);
  const offen=rech.filter(r=>r.status==='offen');
  const uebf=rech.filter(r=>r.status==='ueberfaellig');
  const bezahlt=rech.filter(r=>r.status==='bezahlt');

  document.getElementById('rech-cards').innerHTML=`
    <div class="sc y" style="cursor:default"><div class="sc-lbl">Offen</div><div class="sc-val">${fmt(offen.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${offen.length} Rechnungen</div></div>
    <div class="sc r" style="cursor:default"><div class="sc-lbl">Überfällig</div><div class="sc-val">${fmt(uebf.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${uebf.length} Rechnungen</div></div>
    <div class="sc g" style="cursor:default"><div class="sc-lbl">Bezahlt</div><div class="sc-val">${fmt(bezahlt.reduce((s,r)=>s+r.betrag,0))}</div><div class="sc-sub">${bezahlt.length} Rechnungen</div></div>`;

  const tb=document.getElementById('rech-tbody'),em=document.getElementById('rech-empty');
  if(!filtered.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const smap={offen:'rs-offen 🟡 '+t('Offen'),ueberfaellig:'rs-ueberfaellig 🔴 '+t('Überfällig'),bezahlt:'rs-bezahlt 🟢 '+t('Bezahlt')};
  const smapMob={offen:'🟡',ueberfaellig:'🔴',bezahlt:'🟢'};
  const mob=isMob();
  tb.innerHTML=filtered.sort((a,b)=>b.datum.localeCompare(a.datum)).map(r=>`
    <tr onclick="editRech('${r.id}')" style="cursor:pointer">
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <div style="font-family:var(--mono);font-size:11px;font-weight:600">${r.nr}</div>
        ${mob?`<div style="font-size:11px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${r.kunde||r.beschreibung||'—'}</div>`:''}
      </td>
      <td class="mob-hide" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px" title="${r.kunde||r.beschreibung||''}">${r.kunde||r.beschreibung||'—'}</td>
      <td class="mob-hide" style="font-family:var(--mono);font-size:11px;color:var(--sub)">${fd(r.datum)}</td>
      <td class="mob-hide" style="font-family:var(--mono);font-size:11px;color:${r.status==='ueberfaellig'?'var(--red)':'var(--sub)'}">${r.faellig?fd(r.faellig):'—'}</td>
      <td style="text-align:right;font-family:var(--mono);font-weight:600;font-size:12px;white-space:nowrap">${fmt(r.betrag)}</td>
      <td style="text-align:center">
        ${mob
          ? `<span style="font-size:15px">${smapMob[r.status]||'❔'}</span>`
          : `<span class="rech-status ${smap[r.status].split(' ')[0]}">${smap[r.status].split(' ').slice(1).join(' ')}</span>`}
      </td>
      <td style="white-space:nowrap;text-align:right">
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1" onclick="event.stopPropagation();editRech('${r.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>`}
        ${mob?'':`<button class="del-btn edit-btn" style="opacity:1;color:var(--blue)" onclick="event.stopPropagation();druckRechnungId('${r.id}')" title="Drucken"><i class="fas fa-print"></i></button>`}
        ${r.status!=='bezahlt'?`<button class="del-btn" style="opacity:1;color:var(--green)" onclick="event.stopPropagation();rechBezahlt('${r.id}')" title="✓">✓</button>`:''}
        <button class="del-btn" style="opacity:1" onclick="event.stopPropagation();delRech('${r.id}')" title="✕">✕</button>
      </td>
    </tr>`).join('');
}
function setRechFilter(f,btn){rechFilter=f;document.querySelectorAll('#p-rechnungen .ftab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRech();}
function openRechModal(){
  document.getElementById('rn-nr').value=autoRechNr();
  document.getElementById('rn-dat').value=new Date().toISOString().split('T')[0];
  const faellig=new Date();faellig.setDate(faellig.getDate()+14);
  document.getElementById('rn-faellig').value=faellig.toISOString().split('T')[0];
  document.getElementById('rn-bet').value='';
  ['rn-kunde','rn-adresse','rn-email','rn-wa','rn-notiz'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rn-status').value='offen';
  editRechId=null;
  updateRechBanner();
  setRechPositionen([{bez:'',menge:1,netto:'',rate:19,brutto:''}]);
  openModal('rech-modal');
}
function editRech(id){
  const r=data.rechnungen.find(x=>x.id===id);
  if(!r)return;
  editRechId=id;
  document.getElementById('rn-nr').value=r.nr;
  document.getElementById('rn-dat').value=r.datum;
  document.getElementById('rn-faellig').value=r.faellig||'';
  document.getElementById('rn-bet').value=r.betrag;
  document.getElementById('rn-status').value=r.status;
  document.getElementById('rn-kunde').value=r.kunde||'';
  document.getElementById('rn-adresse').value=r.adresse||'';
  document.getElementById('rn-email').value=r.email||'';
  document.getElementById('rn-wa').value=r.wa||'';
  document.getElementById('rn-notiz').value=r.notiz||'';
  updateRechBanner();
  const posData=r.positionen&&r.positionen.length?r.positionen:[{bez:r.beschreibung||'',menge:1,netto:r.netto||r.betrag||'',rate:r.mwstRate||0,brutto:r.betrag||''}];
  setRechPositionen(posData);
  openModal('rech-modal');
}
function autoRechNr(){
  const yr=new Date().getFullYear();
  const rech=data.rechnungen||[];
  const n=rech.filter(r=>r.nr.startsWith(yr+'')).length+1;
  return`${yr}-${String(n).padStart(3,'0')}`;
}
function saveRechnung(){
  const nr=document.getElementById('rn-nr').value.trim();
  const datum=document.getElementById('rn-dat').value;
  const positionen=getRechPositionen();
  const brutto=r2(positionen.reduce((s,p)=>s+p.menge*p.brutto,0));
  const netto =r2(positionen.reduce((s,p)=>s+p.menge*p.netto,0));
  const mwst  =r2(brutto-netto);
  const betrag=brutto;
  const dsc=positionen.map(p=>p.bez).join(', ')||document.getElementById('rn-kunde').value.trim();
  if(!nr||!betrag||!datum)return toast('Rechnungs-Nr., Datum und mind. 1 Position erforderlich!','err');
  if(!data.rechnungen)data.rechnungen=[];
  const obj={
    nr, betrag:Math.round(betrag*100)/100,
    beschreibung:dsc,
    datum,
    faellig:document.getElementById('rn-faellig').value,
    status:document.getElementById('rn-status').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    wa:document.getElementById('rn-wa').value.trim(),
    notiz:document.getElementById('rn-notiz').value.trim(),
    positionen,
    netto, mwstBetrag:mwst, mwstRate:0, mwstMode:isKleinunternehmer(datum?datum.substring(0,4):new Date().getFullYear()+'')?'§19':'regel'
  };
  if(editRechId){
    const r=data.rechnungen.find(x=>x.id===editRechId);
    if(r){Object.assign(r,obj); sbSaveRechnung(r);}
    editRechId=null;
  } else {
    const newR={id:Date.now()+'', ...obj};
    data.rechnungen.push(newR);
    sbSaveRechnung(newR);
  }
  renderRech();closeModal('rech-modal');toast('✅ Rechnung gespeichert!','ok');
}
function rechBezahlt(id){
  const r=data.rechnungen.find(x=>x.id===id);if(!r)return;
  if(confirm(`Rechnung ${r.nr} als bezahlt markieren und automatisch als Einnahme buchen?`)){
    r.status='bezahlt';
    const newE={id:Date.now()+'',datum:new Date().toISOString().split('T')[0],typ:'Einnahme',kategorie:'Dienstleistung',zahlungsart:'Überweisung',beschreibung:`Rechnung ${r.nr}: ${r.beschreibung}`,notiz:'',betrag:r.betrag};
    data.eintraege.unshift(newE);
    sbSaveRechnung(r); sbSaveEintrag(newE);
    renderAll();toast(`✅ Rechnung ${r.nr} bezahlt + Einnahme gebucht`,'ok');
  } else if(confirm(`Nur als bezahlt markieren (ohne Einnahme buchen)?`)){
    r.status='bezahlt';
    sbSaveRechnung(r);
    renderRech();toast(`✅ Rechnung ${r.nr} als bezahlt markiert`,'ok');
  }
}
function delRech(id){if(!confirm('Rechnung löschen?'))return;data.rechnungen=(data.rechnungen||[]).filter(r=>r.id!==id);sbDeleteRechnung(id);renderRech();toast('Gelöscht','err');}
// ── RECHNUNG POSITIONEN ───────────────────────────────────────────────────

// Хелпер: округление до 2 знаков без ошибок float


// USt-Modus je Jahr
function getUstModeForYear(yr){
  if(!yr) yr = document.getElementById('nf-dat')?.value?.substring(0,4) || new Date().getFullYear()+'';
  return (data.ustModeByYear||{})[yr] || '§19';
}
function isKleinunternehmer(yr){ return getUstModeForYear(yr)==='§19'; }

// Обновляем баннер в модале счёта
function updateRechBanner(){
  const el = document.getElementById('rn-ust-banner');
  if(!el) return;
  const rBannerYr=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  if(isKleinunternehmer(rBannerYr)){
    el.style.display='';
    el.style.background='rgba(34,197,94,.08)';
    el.style.border='1px solid var(--green)';
    el.style.color='var(--green)';
    el.innerHTML='✅ §19 UStG Kleinunternehmer — alle Positionen ohne USt. <a href="#" onclick="nav(\'ust\',null);closeModal(\'rech-modal\')" style="color:var(--green);text-decoration:underline;font-size:11px">Ändern im USt-Bereich</a>';
  } else {
    el.style.display='';
    el.style.background='rgba(59,130,246,.08)';
    el.style.border='1px solid var(--blue)';
    el.style.color='var(--blue)';
    el.innerHTML='📊 MwSt — USt wird pro Position berechnet.';
  }
}

const INP = 'background:var(--s2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);padding:7px 8px;font-size:12px;outline:none;width:100%';

function setRechPositionen(arr){
  const el=document.getElementById('rn-positionen');
  el.innerHTML='';
  updateRechBanner();
  arr.forEach((p,i)=>addRechPosRow(i,p));
  calcRechTotal();
}
function addRechPos(){
  const rows=document.querySelectorAll('.rn-pos-row');
  addRechPosRow(rows.length,{bez:'',menge:1,netto:'',rate:19,brutto:''});
  calcRechTotal();
}

function addRechPosRow(i,p){
  const div=document.createElement('div');
  div.className='rn-pos-row';
  div.style.cssText='display:grid;grid-template-columns:1fr 60px 90px 70px 90px 28px;gap:6px;margin-bottom:6px;align-items:center';
  const rDatumYr=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein = isKleinunternehmer(rDatumYr);
  // Совместимость со старым форматом (preis = нетто)
  const nettoVal = p.netto !== undefined ? p.netto : (p.preis||'');
  const rateVal  = p.rate  !== undefined ? p.rate  : 19;
  const bruttoVal= p.brutto !== undefined && p.brutto !== ''
    ? p.brutto
    : (nettoVal !== '' ? calcBrutto(parseFloat(nettoVal)||0, klein?0:rateVal) : '');

  div.innerHTML=`
    <input type="text"   placeholder="Bezeichnung" value="${p.bez||''}" oninput="calcRechTotal()" style="${INP};font-size:13px">
    <input type="number" placeholder="Menge" value="${p.menge||1}" min="0.01" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:center">
    <input type="number" placeholder="Netto" value="${nettoVal}" min="0" step="0.01" oninput="posNettoChanged(this)" style="${INP};text-align:right">
    <select onchange="posRateChanged(this)" style="${INP};padding:7px 4px;${klein?'opacity:.4;pointer-events:none':''}">
      <option value="0"  ${rateVal==0 ?'selected':''}>§19 / 0%</option>
      <option value="7"  ${rateVal==7 ?'selected':''}>7%</option>
      <option value="19" ${rateVal==19?'selected':''}>19%</option>
    </select>
    <input type="number" placeholder="Brutto" value="${bruttoVal!==''?parseFloat(bruttoVal).toFixed(2):''}" min="0" step="0.01" oninput="posBruttoChanged(this)" style="${INP};text-align:right;color:var(--blue)">
    <button onclick="this.closest('.rn-pos-row').remove();calcRechTotal()" style="background:none;border:none;color:var(--sub);cursor:pointer;font-size:16px;padding:0">✕</button>`;
  document.getElementById('rn-positionen').appendChild(div);
}

// Вводим Netto → пересчитываем Brutto
function posNettoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input,select');
  const menge =parseFloat(inputs[1].value)||1;
  const netto =parseFloat(inputs[2].value)||0;
  const rate  =parseFloat(inputs[3].value)||0;
  const rnYr1=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const brutto=calcBrutto(netto,isKleinunternehmer(rnYr1)?0:rate);
  inputs[4].value=brutto.toFixed(2);
  calcRechTotal();
}
// Меняем ставку → пересчитываем Brutto из Netto
function posRateChanged(sel){
  const row=sel.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input,select');
  const netto=parseFloat(inputs[2].value)||0;
  const rate =parseFloat(sel.value)||0;
  const rnYr2=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  inputs[4].value=calcBrutto(netto,isKleinunternehmer(rnYr2)?0:rate).toFixed(2);
  calcRechTotal();
}
// Вводим Brutto → пересчитываем Netto
function posBruttoChanged(input){
  const row=input.closest('.rn-pos-row');
  const inputs=row.querySelectorAll('input,select');
  const brutto=parseFloat(inputs[4].value)||0;
  const rate  =parseFloat(inputs[3].value)||0;
  const rnYr3=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const netto =calcNetto(brutto, isKleinunternehmer(rnYr3)?0:rate);
  inputs[2].value=netto.toFixed(2);
  calcRechTotal();
}

// Главный расчёт итога + группировка по ставкам
function calcRechTotal(){
  const rnYr4=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(rnYr4);
  // Группируем: { rate: {netto, mwst} }
  const groups={};
  let totalNetto=0;
  let totalMwst=0;

  document.querySelectorAll('.rn-pos-row').forEach(row=>{
    const inputs=row.querySelectorAll('input,select');
    const menge =parseFloat(inputs[1].value)||0;
    const netto =parseFloat(inputs[2].value)||0;
    const rate  =klein?0:parseFloat(inputs[3].value)||0;
    const lineNetto = r2(menge*netto);
    const lineMwst  = r2(lineNetto*rate/100);
    totalNetto+=lineNetto;
    totalMwst+=lineMwst;
    if(!groups[rate]) groups[rate]={netto:0,mwst:0};
    groups[rate].netto = r2(groups[rate].netto+lineNetto);
    groups[rate].mwst  = r2(groups[rate].mwst+lineMwst);
  });

  totalNetto=r2(totalNetto);
  totalMwst=r2(totalMwst);
  const totalBrutto=r2(totalNetto+totalMwst);
  document.getElementById('rn-bet').value=totalBrutto.toFixed(2);

  // Строим summary
  const el=document.getElementById('rn-summary');
  if(!el) return;
  let rows='';
  const rates=Object.keys(groups).map(Number).sort((a,b)=>b-a);

  if(klein){
    rows=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
      <span style="font-size:12px;color:var(--sub)">Netto-Summe</span>
      <span style="font-family:var(--mono);font-size:13px">${fmt(totalNetto)}</span>
    </div>
    <div style="font-size:11px;color:var(--green);margin-bottom:6px">§19 UStG — keine Umsatzsteuer</div>`;
  } else {
    const totNetto=rates.reduce((s,r)=>s+groups[r].netto,0);
    const totMwst =rates.reduce((s,r)=>s+groups[r].mwst,0);
    rows+=`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--sub)">
      <span>Netto gesamt</span><span style="font-family:var(--mono)">${fmt(r2(totNetto))}</span></div>`;
    rates.forEach(rate=>{
      const g=groups[rate];
      if(g.netto===0&&g.mwst===0) return;
      rows+=`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:var(--sub)">
        <span>USt. ${rate}% (auf ${fmt(g.netto)})</span>
        <span style="font-family:var(--mono);color:var(--red)">+ ${fmt(g.mwst)}</span>
      </div>`;
    });
  }

  el.innerHTML=rows+`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 4px;border-top:2px solid var(--border);margin-top:4px">
    <strong style="font-size:14px">Gesamtbetrag (Brutto)</strong>
    <strong style="font-family:var(--mono);font-size:16px;color:var(--blue)">${fmt(totalBrutto)}</strong>
  </div>`;
}

function getRechPositionen(){
  const pos=[];
  const rnYr5=document.getElementById('rn-dat')?.value?.substring(0,4)||new Date().getFullYear()+'';
  const klein=isKleinunternehmer(rnYr5);
  document.querySelectorAll('.rn-pos-row').forEach(row=>{
    const inputs=row.querySelectorAll('input,select');
    const bez   =inputs[0].value.trim();
    const menge =parseFloat(inputs[1].value)||1;
    const netto =parseFloat(inputs[2].value)||0;
    const rate  =klein?0:parseFloat(inputs[3].value)||0;
    const brutto=parseFloat(inputs[4].value)||calcBrutto(netto,rate);
    if(bez||netto) pos.push({bez,menge,netto,rate,brutto,preis:netto}); // preis=netto для совместимости
  });
  return pos;
}

// ── RECHNUNG DRUCKEN / PDF ────────────────────────────────────────────────
function buildRechnungHTML(r){
  const firmaName = 'Autowäsche Berg';
  const firmaAdresse = 'Musterstraße 1 · 67547 Worms';
  const firmaKontakt = 'Tel: +49 (0) 6241 000000 · info@autowaesche-berg.de';
  const firmaBank = 'IBAN: DE12 3456 7890 1234 5678 90 · BIC: SSKMDEMMXXX';
  const USt = 'Kleinunternehmer gem. § 19 UStG — keine USt ausgewiesen';
  const pos = r.positionen&&r.positionen.length ? r.positionen : [{bez:r.beschreibung||'Leistung',menge:1,preis:r.betrag}];
  const total = pos.reduce((s,p)=>s+(p.menge*p.preis),0);
  const faellig = r.faellig ? `<p style="margin:4px 0"><strong>Fällig bis:</strong> ${fd(r.faellig)}</p>` : '';
  const notiz = r.notiz ? `<p style="margin-top:20px;padding:12px;background:#f8f9fa;border-left:3px solid #3b82f6;font-size:13px">${r.notiz}</p>` : '';
  // calculateTotals() — группировка по ставкам
  const isKlein = !r.mwstMode || r.mwstMode==='§19';
  const groups={};
  pos.forEach(p=>{
    const netto=p.netto!==undefined?p.netto:p.preis;
    const rate=isKlein?0:(p.rate||0);
    const lineN=r2((p.menge||1)*netto);
    const lineM=r2(lineN*rate/100);
    if(!groups[rate]) groups[rate]={netto:0,mwst:0};
    groups[rate].netto=r2(groups[rate].netto+lineN);
    groups[rate].mwst =r2(groups[rate].mwst+lineM);
  });
  const totNetto=Object.values(groups).reduce((s,g)=>s+g.netto,0);
  const totMwst =Object.values(groups).reduce((s,g)=>s+g.mwst,0);
  const totBrutto=r2(totNetto+totMwst);

  const posRows = pos.map(p=>{
    const netto=p.netto!==undefined?p.netto:p.preis;
    const rate=isKlein?0:(p.rate||0);
    const lineN=r2((p.menge||1)*netto);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.bez}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.menge}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(netto)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;color:#888">${isKlein?'§19':rate+'%'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(lineN)}</td>
    </tr>`;
  }).join('');

  // Строки итога по ставкам
  const summaryRows = isKlein ? '' : Object.keys(groups).map(Number).sort((a,b)=>b-a).map(rate=>{
    const g=groups[rate];
    if(g.netto===0) return '';
    return `<tr><td colspan="4" style="padding:4px 12px;font-size:12px;color:#666">Netto ${rate}%: ${fmt(g.netto)}</td>
             <td style="padding:4px 12px;text-align:right;font-size:12px;color:#666">USt ${rate}%: +${fmt(g.mwst)}</td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Rechnung ${r.nr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:0 auto}
    @media print{body{padding:20px}button{display:none!important}}
    h1{font-size:28px;font-weight:700;color:#1e3a5f;margin-bottom:4px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1e3a5f}
    .firma-info{font-size:12px;color:#555;line-height:1.6}
    .rech-nr{text-align:right}
    .rech-nr h2{font-size:20px;color:#1e3a5f;margin-bottom:6px}
    .rech-nr p{font-size:12px;color:#555;margin:2px 0}
    .kunde-box{background:#f8f9fa;padding:16px;border-radius:6px;margin-bottom:24px;min-height:80px}
    .kunde-box strong{font-size:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    thead{background:#1e3a5f;color:#fff}
    thead th{padding:10px 12px;text-align:left;font-size:12px}
    thead th:nth-child(2){text-align:center}
    thead th:nth-child(3){text-align:right}thead th:nth-child(4){text-align:center}thead th:nth-child(5){text-align:right}
    .total-row td{padding:12px;font-size:15px;font-weight:700;background:#f0f4ff;border-top:2px solid #1e3a5f}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#888;line-height:1.8;text-align:center}
    .btn-bar{display:flex;gap:10px;margin-bottom:24px}
    .btn-print{padding:10px 20px;background:#1e3a5f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
    .btn-close{padding:10px 20px;background:#e5e7eb;border:none;border-radius:6px;cursor:pointer;font-size:13px}
  </style></head><body>
  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Drucken / Als PDF speichern</button>
    <button class="btn-close" onclick="window.close()">✕ Schließen</button>
  </div>
  <div class="header">
    <div>
      <h1>${firmaName}</h1>
      <div class="firma-info">${firmaAdresse}<br>${firmaKontakt}</div>
    </div>
    <div class="rech-nr">
      <h2>RECHNUNG</h2>
      <p><strong>Nr.:</strong> ${r.nr}</p>
      <p><strong>Datum:</strong> ${fd(r.datum)}</p>
      ${faellig}
    </div>
  </div>
  <div class="kunde-box">
    <strong>${r.kunde||'—'}</strong><br>
    <span style="font-size:12px;color:#555">${r.adresse||''}</span>
  </div>
  <table>
    <thead><tr><th>Leistung / Beschreibung</th><th style="text-align:center">Menge</th><th style="text-align:right">Netto/Stk.</th><th style="text-align:center">USt</th><th style="text-align:right">Gesamt Netto</th></tr></thead>
    <tbody>${posRows}</tbody>
    <tfoot>${summaryRows}<tr class="total-row"><td colspan="${isKlein?4:3}">Netto-Summe${isKlein?'':''}</td><td style="text-align:right">${fmt(totNetto)}</td></tr>${isKlein?'':`<tr style="background:#fff8f0"><td colspan="4" style="padding:8px 12px;font-size:13px">USt. gesamt</td><td style="padding:8px 12px;text-align:right;font-size:13px;color:#e53935">+${fmt(totMwst)}</td></tr>`}<tr class="total-row"><td colspan="4"><strong>Gesamtbetrag (Brutto)</strong></td><td style="text-align:right"><strong>${fmt(totBrutto)}</strong></td></tr></tfoot>
  </table>
  <p style="font-size:11px;color:#888;margin-bottom:8px">${isKlein?USt:'Umsatzsteuer-Ausweis gem. §14 UStG'}</p>
  ${notiz}
  <div class="footer">${firmaBank}</div>
  </body></html>`;
}

function druckRechnung(){
  const pos=getRechPositionen();
  if(!pos.length){toast('Bitte mind. eine Position hinzufügen','err');return;}
  const nr=document.getElementById('rn-nr').value.trim();
  const datum=document.getElementById('rn-dat').value;
  if(!nr||!datum){toast('Rechnungs-Nr. und Datum erforderlich','err');return;}
  const total=pos.reduce((s,p)=>s+p.menge*p.preis,0);
  const r={
    nr, datum,
    faellig:document.getElementById('rn-faellig').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    notiz:document.getElementById('rn-notiz').value.trim(),
    positionen:pos, betrag:total
  };
  downloadRechnungPDF(r);
}
function druckRechnungId(id){
  const r=data.rechnungen.find(x=>x.id===id);
  if(!r)return;
  downloadRechnungPDF(r);
}
function openRechnungPrint(r){
  const win=window.open('','_blank','width=900,height=700');
  win.document.write(buildRechnungHTML(r));
  win.document.close();
}

// ── RECHNUNG PER E-MAIL ───────────────────────────────────────────────────
function emailRechnung(){
  const pos=getRechPositionen();
  const total=pos.reduce((s,p)=>s+p.menge*p.preis,0);
  const r={
    nr:document.getElementById('rn-nr').value.trim(),
    datum:document.getElementById('rn-dat').value,
    faellig:document.getElementById('rn-faellig').value,
    kunde:document.getElementById('rn-kunde').value.trim(),
    adresse:document.getElementById('rn-adresse').value.trim(),
    email:document.getElementById('rn-email').value.trim(),
    notiz:document.getElementById('rn-notiz').value.trim(),
    positionen:pos, betrag:total
  };
  if(!r.email){toast('Bitte E-Mail-Adresse eingeben!','err');return;}
  emailMitPDF(r);
}

// ── RECHNUNG PER WHATSAPP ─────────────────────────────────────────────────
function waRechnung(){
  const wa=document.getElementById('rn-wa').value.trim().replace(/[^0-9+]/g,'');
  const nr=document.getElementById('rn-nr').value.trim()||'—';
  const kunde=document.getElementById('rn-kunde').value.trim();
  const total=parseFloat(document.getElementById('rn-bet').value)||0;
  const faellig=document.getElementById('rn-faellig').value;
  const msg=encodeURIComponent(
`🧾 *Rechnung Nr. ${nr}*
Autowäsche Berg

${kunde?'Kunde: '+kunde+'\n':''}Betrag: *${fmt(total)}*${faellig?'\nFällig bis: '+fd(faellig):''}

Bitte überweisen Sie den Betrag fristgerecht.
Bei Fragen: +49 (0) 6241 000000`);
  const url=wa?`https://wa.me/${wa.replace('+','')}?text=${msg}`:`https://wa.me/?text=${msg}`;
  window.open(url,'_blank');
}


// ── WIEDERKEHREND ────────────────────────────────────────────────────────
let wiedTyp='Ausgabe';
function renderWied(){
  const wied=data.wiederkehrend||[];
  const tb=document.getElementById('wied-tbody'),em=document.getElementById('wied-empty');
  if(!wied.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const today=new Date().toISOString().split('T')[0];
  const faelligCount=wied.filter(w=>w.naechste<=today).length;
  const hint=document.getElementById('wied-hint');
  if(faelligCount>0){hint.style.display='';hint.innerHTML=`⚡ <strong>${faelligCount} ${t('fällige Zahlung')}${faelligCount>1?t('en'):''}`;}
  else hint.style.display='none';

  tb.innerHTML=wied.map(w=>{
    const isFaellig=w.naechste<=today;
    return`<tr style="${isFaellig?'background:var(--ydim)':''}">
      <td style="font-weight:500">${w.bezeichnung}${isFaellig?` <span style="color:var(--yellow);font-size:10px">● fällig</span>`:''}</td>
      <td class="mob-hide"><span class="badge ${w.typ==='Einnahme'?'b-ein':'b-aus'}">${w.typ==='Einnahme'?'▲':'▼'} ${w.typ}</span></td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px">${w.kategorie}</td>
      <td style="font-family:var(--mono);font-weight:600;color:${w.typ==='Einnahme'?'var(--green)':'var(--red)'}">${fmt(w.betrag)}</td>
      <td class="mob-hide" style="color:var(--sub);font-size:12px">${{monatlich:t('Monatlich'),quartalsweise:t('Quartalsweise'),jaehrlich:t('Jährlich')}[w.intervall]}</td>
      <td style="font-family:var(--mono);font-size:11px;color:${isFaellig?'var(--yellow)':'var(--sub)'}">${fdm(w.naechste)}</td>
      <td class="mob-hide"><span class="badge ${ZBADGE[w.zahlungsart]||''}">${w.zahlungsart}</span></td>
      <td style="white-space:nowrap">
        <button class="del-btn" style="opacity:1;color:var(--green)" onclick="wBuchen('${w.id}')">▶</button>
        <button class="del-btn" style="opacity:1" onclick="delWied('${w.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}
function setWiedTyp(t){
  wiedTyp=t;
  document.getElementById('wied-btn-e').className='tt'+(t==='Einnahme'?' ae':'');
  document.getElementById('wied-btn-a').className='tt'+(t==='Ausgabe'?' aa':'');
  document.getElementById('wied-kat').innerHTML=(t==='Einnahme'?KE:KA).map(k=>`<option value="${k}">${k}</option>`).join('');
}
function openWiedModal(){
  wiedTyp='Ausgabe';
  setWiedTyp('Ausgabe');
  document.getElementById('wied-dsc').value='';
  document.getElementById('wied-bet').value='';
  document.getElementById('wied-ab').value=new Date().toISOString().split('T')[0];
  openModal('wied-modal');
}
function saveWied(){
  const bez=document.getElementById('wied-dsc').value.trim();
  const betrag=parseFloat(document.getElementById('wied-bet').value);
  const ab=document.getElementById('wied-ab').value;
  if(!bez||!betrag||!ab)return toast('Alle Felder ausfüllen!','err');
  if(!data.wiederkehrend)data.wiederkehrend=[];
  const newW={
    id:Date.now()+'',bezeichnung:bez,typ:wiedTyp,betrag,
    kategorie:normKat(document.getElementById('wied-kat').value),
    zahlungsart:normZahl(document.getElementById('wied-zahl').value),
    intervall:document.getElementById('wied-int').value,
    naechste:ab
  };
  data.wiederkehrend.push(newW);
  sbSaveWied(newW);
  renderWied();closeModal('wied-modal');toast('✅ Vorlage gespeichert!','ok');
}
function wBuchen(id){
  const w=data.wiederkehrend.find(x=>x.id===id); if(!w) return;
  const newE={
    id:Date.now()+'', datum:w.naechste, typ:w.typ, kategorie:w.kategorie,
    zahlungsart:w.zahlungsart, beschreibung:w.bezeichnung,
    notiz:'Wiederkehrend', betrag:w.betrag
  };
  data.eintraege.unshift(newE);
  sbSaveEintrag(newE);
  const d=new Date(w.naechste);
  if(w.intervall==='monatlich') d.setMonth(d.getMonth()+1);
  else if(w.intervall==='quartalsweise') d.setMonth(d.getMonth()+3);
  else d.setFullYear(d.getFullYear()+1);
  w.naechste=d.toISOString().split('T')[0];
  sbSaveWied(w);
  renderAll(); renderWied();
  toast(`✅ ${w.bezeichnung} ${t('gebucht!')}`, 'ok');
}

function wBuchenAlle(){
  const today=new Date().toISOString().split('T')[0];
  const faellig=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);

  // ИСПРАВЛЕНИЕ ТУТ: Переводим ошибку
  if(!faellig.length) return toast(t('Keine fälligen Zahlungen'), 'err');

  faellig.forEach(w=>wBuchen(w.id));

  // ИСПРАВЛЕНИЕ ТУТ: Переводим сообщение об успехе
  toast(`✅ ${faellig.length} ${t('Zahlungen gebucht!')}`, 'ok');
}
function delWied(id){if(!confirm('Vorlage löschen?'))return;data.wiederkehrend=(data.wiederkehrend||[]).filter(w=>w.id!==id);sbDeleteWied(id);renderWied();toast('Gelöscht','err');}



function exportCSV(){
  const entries=getFiltered();
  if(!entries.length)return toast('Keine Daten','err');
  const rows=[['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','Notiz','Betrag (EUR)']];
  entries.forEach(e=>rows.push([e.datum,e.typ,e.kategorie,e.beschreibung,e.zahlungsart||'',e.notiz||'',r2(e.betrag)]));
  dl('\uFEFF'+rows.map(r=>r.join(';')).join('\n'),`buchaltung_${new Date().toISOString().split('T')[0]}.csv`);
  toast('CSV exportiert!','ok');
}
function exportRepCSV(){
  const yr=document.getElementById('rep-yr')?.value||new Date().getFullYear()+'';
  const ye=data.eintraege.filter(e=>e.datum.startsWith(yr));
  const rows=[['Monat','Einnahmen (EUR)','Ausgaben (EUR)','Gewinn (EUR)',t('Kumuliert (EUR)'),'Einträge']];
  let c=0;
  for(let i=0;i<12;i++){
    const mi=String(i+1).padStart(2,'0');
    const me=ye.filter(e=>e.datum.substring(5,7)===mi);
    const ein=sum(me,'Einnahme'),aus=sum(me,'Ausgabe'),gew=ein-aus;c+=gew;
    rows.push([MN[i],r2(ein),r2(aus),r2(gew),r2(c),me.length]);
  }
  const ein=sum(ye,'Einnahme'),aus=sum(ye,'Ausgabe');
  rows.push(['GESAMT',r2(ein),r2(aus),r2(ein-aus),'',ye.length]);
  dl('\uFEFF'+rows.map(r=>r.join(';')).join('\n'),`monatsbericht_${yr}.csv`);
  toast('📤 Jahresbericht exportiert!','ok');
}

// ── MONATSDETAIL ─────────────────────────────────────────────────────────
let _monEntries=[], _monLabel='';

function openMonatDetail(yr, mi){
  const entries = data.eintraege
    .filter(e=>e.datum.startsWith(yr) && e.datum.substring(5,7)===mi)
    .sort((a,b)=>a.datum.localeCompare(b.datum));
  _monEntries = entries;
  const monName = MN[parseInt(mi)-1];
  _monLabel = `${monName} ${yr}`;

  document.getElementById('mon-modal-title').textContent = `📅 ${_monLabel}`;

  const ein=sum(entries,'Einnahme'), aus=sum(entries,'Ausgabe'), gew=ein-aus;
  document.getElementById('mon-modal-stats').innerHTML=`
    <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Einnahmen</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--green)">${fmt(ein)}</div>
    </div>
    <div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Ausgaben</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--red)">${fmt(aus)}</div>
    </div>
    <div style="background:${gew>=0?'var(--gdim)':'var(--rdim)'};border:1px solid ${gew>=0?'var(--green)':'var(--red)'};border-radius:var(--r);padding:12px">
      <div style="font-size:10px;color:var(--sub);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Gewinn</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:${gew>=0?'var(--green)':'var(--red)'}">${gew>=0?'+':''}${fmt(gew)}</div>
    </div>`;

  document.getElementById('mon-modal-count').textContent = `${entries.length} ${t('Einträge')}`;

  if(!entries.length){
    document.getElementById('mon-modal-tbody').innerHTML=`<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--sub)">Keine Einträge für ${_monLabel}</td></tr>`;
  } else {
    document.getElementById('mon-modal-tbody').innerHTML=entries.map(e=>`
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <td style="padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--sub)">${fdm(e.datum)}</td>
        <td style="padding:8px 12px"><span class="badge ${e.typ==='Einnahme'?'b-ein':'b-aus'}">${e.typ==='Einnahme'?'<i class="fas fa-arrow-up" style="color:var(--green)"></i>':'<i class="fas fa-arrow-down" style="color:var(--red)"></i>'}</span></td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px;color:var(--sub)">${e.kategorie}</td>
        <td class="mob-hide" style="padding:8px 12px;font-size:12px">${e.beschreibung}${e.notiz?` <span title="${e.notiz}" style="color:var(--sub);font-size:10px">📝</span>`:''}</td>
        <td class="mob-hide" style="padding:8px 12px"><span class="badge ${ZBADGE[e.zahlungsart]||''}">${e.zahlungsart||'—'}</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-weight:600;color:${e.typ==='Einnahme'?'var(--green)':'var(--red)'}">${e.typ==='Einnahme'?'+':'−'}${fmt(e.betrag)}</td>
      </tr>`).join('');
  }
  openModal('mon-modal');
}

function exportMonatCSV(){
  if(!_monEntries.length) return toast('Keine Daten','err');
  const rows=[['Datum','Typ','Kategorie','Beschreibung','Zahlungsart','Notiz','Betrag (EUR)']];
  _monEntries.forEach(e=>rows.push([e.datum,e.typ,e.kategorie,e.beschreibung,e.zahlungsart||'',e.notiz||'',r2(e.betrag)]));
  dl('\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n'),
    `buchaltung_${_monLabel.replace(' ','_')}.csv`);
  toast(`📤 CSV — ${_monLabel} exportiert`,'ok');
}

function exportMonatXLS(){
  if(!_monEntries.length) return toast('Keine Daten','err');
  const ein=sum(_monEntries,'Einnahme'), aus=sum(_monEntries,'Ausgabe'), gew=ein-aus;

  // Build XLSX-compatible XML (SpreadsheetML) — works in Excel, LibreOffice, Google Sheets
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const numCell=(v,color='')=>`<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  const strCell=(v,bold=false,color='')=>`<Cell${bold?' ss:StyleID="bold"':''}><Data ss:Type="String">${esc(v)}</Data></Cell>`;

  const rows = _monEntries.map(e=>`    <Row>
      ${strCell(e.datum)}
      ${strCell(e.typ)}
      ${strCell(e.kategorie)}
      ${strCell(e.beschreibung)}
      ${strCell(e.zahlungsart||'')}
      ${strCell(e.notiz||'')}
      <Cell><Data ss:Type="Number">${e.typ==='Einnahme'?e.betrag:-e.betrag}</Data></Cell>
      <Cell><Data ss:Type="Number">${e.betrag}</Data></Cell>
    </Row>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/></Style>
  <Style ss:ID="ein"><Font ss:Color="#16a34a" ss:Bold="1"/></Style>
  <Style ss:ID="aus"><Font ss:Color="#dc2626" ss:Bold="1"/></Style>
  <Style ss:ID="total"><Font ss:Bold="1"/><Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${esc(_monLabel)}">
  <Table>
   <Column ss:Width="90"/><Column ss:Width="80"/><Column ss:Width="120"/>
   <Column ss:Width="180"/><Column ss:Width="100"/><Column ss:Width="150"/>
   <Column ss:Width="90"/><Column ss:Width="90"/>
   <Row ss:StyleID="hdr">
    <Cell><Data ss:Type="String">Datum</Data></Cell>
    <Cell><Data ss:Type="String">Typ</Data></Cell>
    <Cell><Data ss:Type="String">Kategorie</Data></Cell>
    <Cell><Data ss:Type="String">Beschreibung</Data></Cell>
    <Cell><Data ss:Type="String">Zahlungsart</Data></Cell>
    <Cell><Data ss:Type="String">Notiz</Data></Cell>
    <Cell><Data ss:Type="String">Betrag netto (EUR)</Data></Cell>
    <Cell><Data ss:Type="String">Betrag abs. (EUR)</Data></Cell>
   </Row>
${rows}
   <Row ss:StyleID="total">
    <Cell ss:MergeAcross="5"><Data ss:Type="String">${t('GESAMT')} ${esc(_monLabel)}</Data></Cell>
    <Cell><Data ss:Type="Number">${(ein-aus).toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row><Cell ss:MergeAcross="7"><Data ss:Type="String"></Data></Cell></Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Einnahmen')}</Data></Cell>
    <Cell><Data ss:Type="Number">${ein.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Ausgaben')}</Data></Cell>
    <Cell><Data ss:Type="Number">${aus.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="total">
    <Cell><Data ss:Type="String">${t('Gewinn')}</Data></Cell>
    <Cell><Data ss:Type="Number">${gew.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`buchaltung_${_monLabel.replace(' ','_')}.xls`;
  a.click();
  toast(`📊 Excel — ${_monLabel} exportiert`,'ok');
}

// ── STEUERERKLÄRUNG ──────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// STEUERTABELLEN — AKTUELL GEPRÜFTE WERTE (Stand: März 2026)
// ═══════════════════════════════════════════════════════════════════════
// Quellen: BMF, § 32a EStG (Steuerfortentwicklungsgesetz), IHK, Sparkasse
//
// 2025: Grundfreibetrag 12.096 €
// 2026: Grundfreibetrag 12.348 € (+252 €)
//
// Kleinunternehmergrenze (§ 19 UStG, ab 01.01.2025):
//   - Vorjahresumsatz: max. 25.000 € (netto) [alt: 22.000 €]
//   - Laufendes Jahr: max. 100.000 € (netto, HARD LIMIT mit Fallbeil-Effekt) [alt: 50.000 €]
//   - Achtung: 100.000€-Grenze wirkt sofort bei Überschreitung!
//
// Gewerbesteuer: Freibetrag 24.500 €, Messzahl 3,5% × Hebesatz (Gemeinde)
//
// KV Selbstständige 2026: BBG 5.812,50 €/Monat, KV-Satz 14,6% + Ø ZB 2,9%
//   Mindestbemessungsgrundlage: 1.318,33 €/Monat
//   GKV-Höchstbeitrag (inkl. Pflege, kinderlos): ~1.261 €/Monat
// ═══════════════════════════════════════════════════════════════════════





function updateGKVDisplay(gewinn, gkvGezahlt, isFamilienversichert) {
  const result = calcGKVNachzahlung(gewinn, gkvGezahlt, isFamilienversichert);
  document.getElementById('st-gkv-basis').textContent = fmt(result.gkvSoll);
  document.getElementById('st-gkv-schuld').textContent = fmt(result.gkvSoll);
  document.getElementById('st-gkv-nachzahlung').textContent = fmt(result.nachzahlung);
  document.getElementById('st-gkv-abzug').textContent = fmt(result.abzugsfaehig);
  
  // Цвет зависит от величины nachzahlung
  const nachzahlEl = document.getElementById('st-gkv-nachzahlung');
  if (result.nachzahlung > 5000) {
    nachzahlEl.style.color = 'var(--red)';
    nachzahlEl.style.fontWeight = '700';
  } else if (result.nachzahlung > 0) {
    nachzahlEl.style.color = 'var(--yellow)';
  } else {
    nachzahlEl.style.color = 'var(--green)';
  }
}

// ─── PKW & AfA ───
function togglePKWFields() {
  const nutzung = document.getElementById('st-pkw-nutzung').value;
  document.getElementById('st-pkw-fields').style.display = nutzung === 'nein' ? 'none' : 'block';
  document.getElementById('st-pkw-1prozent').style.display = nutzung === '1prozent' ? 'block' : 'none';
  document.getElementById('st-pkw-fahrtenbuch').style.display = nutzung === 'fahrtenbuch' ? 'block' : 'none';
}

function addAFARow() {
  const list = document.getElementById('st-afa-list');
  const id = 'st-afa-' + Date.now();
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 80px 80px 30px;gap:8px;margin-bottom:8px;padding:8px;background:var(--s3);border-radius:var(--r)';
  row.innerHTML = `
    <input type="text" placeholder="Beschreibung (z.B. Drehmaschine)" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <input type="number" placeholder="Betrag €" min="0" step="100" value="0" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <input type="number" placeholder="Jahre" min="1" max="20" value="5" style="padding:6px;border:1px solid var(--border);border-radius:var(--r);background:var(--s2);color:var(--text);font-size:12px">
    <button class="btn" style="padding:6px;font-size:11px" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(row);
}

function getAFATotal() {
  let total = 0;
  const rows = document.querySelectorAll('#st-afa-list > div');
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const betrag = parseFloat(inputs[1].value) || 0;
    const jahre = parseInt(inputs[2].value) || 1;
    total += betrag / jahre; // Jahresabschreibung
  });
  return total;
}

function calcUSTSaldo() {
  const eingezogen = parseFloat(document.getElementById('st-ust-eingezogen').value) || 0;
  const bezahlt = parseFloat(document.getElementById('st-ust-bezahlt').value) || 0;
  const saldo = eingezogen - bezahlt;
  const display = document.getElementById('st-ust-ausgleich');
  if (display) {
    display.textContent = fmt(Math.abs(saldo));
    display.style.color = saldo >= 0 ? 'var(--red)' : 'var(--green)';
  }
  return saldo;
}

function stReset() {
  ['st-name','st-ein','st-aus','st-gew','st-ho','st-km','st-arbtage',
   'st-spenden','st-wk','st-vorausz','st-kap','st-kest','st-kv','st-pv','st-av','st-buv',
   'st-pkw-nutzung','st-pkw-wert','st-pkw-km','st-iab','st-gwg','st-ust-eingezogen','st-ust-bezahlt',
   'st-bu','st-haft','st-fortbildung','st-verpflegung-tage'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value=id==='st-arbtage'?'220':id==='st-pkw-nutzung'?'nein':'';
  });
  document.getElementById('st-ho-val').textContent='0,00 €';
  document.getElementById('st-fk-val').textContent='0,00 €';
  document.getElementById('st-afa-list').innerHTML='';
  document.getElementById('st-result').style.display='none';
  togglePKWFields();
  calcUSTSaldo();
  toast('Zurückgesetzt','err');
}

function stCard(cls,label,val,sub='') {
  return `<div class="sc ${cls}" style="cursor:default">
    <div class="sc-lbl">${label}</div>
    <div class="sc-val">${val}</div>
    ${sub?`<div class="sc-sub">${sub}</div>`:''}
  </div>`;
}

function stRow(label,val,bold=false,color=''){
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:12px;color:var(--sub)">${label}</span>
    <span style="font-family:var(--mono);font-size:13px;font-weight:${bold?700:500};color:${color||'var(--text)'}">${val}</span>
  </div>`;
}

function stBerechnen() {
  try {
  // ── Eingaben lesen ──
  const jahr    = parseInt(document.getElementById('st-jahr').value)||2025;
  const fam     = document.getElementById('st-fam').value;
  const partner = document.getElementById('st-partner').value;
  const pein    = parseFloat(document.getElementById('st-pein')?.value)||0;
  const nKinder = parseInt(document.getElementById('st-kinder').value)||0;
  const kirche  = parseFloat(document.getElementById('st-kirche').value)||0;
  const ein     = parseFloat(document.getElementById('st-ein').value)||0;
  const aus     = parseFloat(document.getElementById('st-aus').value)||0;
  const gewinn  = ein - aus;
  const ho      = Math.min(parseInt(document.getElementById('st-ho').value)||0, 210);
  const km      = parseFloat(document.getElementById('st-km').value)||0;
  const arbt    = parseInt(document.getElementById('st-arbtage').value)||220;
  const spenden = parseFloat(document.getElementById('st-spenden').value)||0;
  const wk      = parseFloat(document.getElementById('st-wk').value)||0;
  const vorausz = parseFloat(document.getElementById('st-vorausz').value)||0;
  const kap     = parseFloat(document.getElementById('st-kap').value)||0;
  const kest    = parseFloat(document.getElementById('st-kest').value)||0;

  // ── NEUE FELDER: Soziale Versicherungen ──
  const kv      = parseFloat(document.getElementById('st-kv')?.value)||0;
  const pv      = parseFloat(document.getElementById('st-pv')?.value)||0;
  const av      = parseFloat(document.getElementById('st-av')?.value)||0;
  const buv     = parseFloat(document.getElementById('st-buv')?.value)||0;
  const kircheneuralt = parseFloat(document.getElementById('st-kirchensteuer-eur')?.value)||0;
  const sozVersSum = kv + pv + av + buv; // Summa Sozialversicherungen

  // ── NEUE FELDER: PKW, AfA, USt, Sonderausgaben ──
  const pkwNutzung = document.getElementById('st-pkw-nutzung')?.value || 'nein';
  let pkwKosten = 0;
  if (pkwNutzung === '1prozent') {
    const pkwWert = parseFloat(document.getElementById('st-pkw-wert')?.value) || 0;
    pkwKosten = pkwWert * 0.01 / 12 * 12; // 1% vom Jahreswert zur Einnahme (wird später addiert!)
  } else if (pkwNutzung === 'fahrtenbuch') {
    const pkwKm = parseFloat(document.getElementById('st-pkw-km')?.value) || 0;
    pkwKosten = pkwKm * 0.30; // Geschäftsfahrten als Ausgaben
  }
  
  const iab = parseFloat(document.getElementById('st-iab')?.value) || 0;
  const iabAbzug = Math.min(iab * 0.5, iab); // Max 50%
  
  const gwg = parseFloat(document.getElementById('st-gwg')?.value) || 0;
  const afaJahresabschreibung = getAFATotal(); // Funktion berechnet AfA
  
  const bu = parseFloat(document.getElementById('st-bu')?.value) || 0;
  const haft = parseFloat(document.getElementById('st-haft')?.value) || 0;
  const fortbildung = parseFloat(document.getElementById('st-fortbildung')?.value) || 0;
  const verpflegungTage = parseInt(document.getElementById('st-verpflegung-tage')?.value) || 0;
  const verpflegungAbzug = verpflegungTage * 14; // 14€/Tag

  const isSplitting = fam === 'zusammen';
  const isAlleinerziehend = fam === 'alleinerziehend';

  // ── Freibeträge (jahresabhängig) ──
  const sw = getSteuerwerte(jahr);
  const grundfb  = isSplitting ? sw.grundfb * 2 : sw.grundfb;
  const hoPausch = Math.min(ho * 6, 1260);
  const fahrtk   = km * arbt * 0.30;

  // Kinderfreibetrag vs Kindergeld: was ist günstiger?
  const kindergeld_jahr = nKinder * sw.kindergeld * 12;
  const kinderfb_gesamt = nKinder * sw.kfreibetrag;

  // Alleinerziehend-Freibetrag 2026 (§ 24b EStG)
  const alleinerziehendFB = isAlleinerziehend ? (4260 + Math.max(0, nKinder-1)*240) : 0;

  // ─── GKV NACHZAHLUNG (ПЕРЕД расчётом налога!) ───
  // КРИТИЧНО: GKV взносы вычитаются из базы для подоходного налога (§10 EStG)
  const gkvGezahlt = parseFloat(document.getElementById('st-gkv-gezahlt')?.value) || 0;
  const isFamilienversichert = document.getElementById('st-gkv-familienvers')?.value === 'ja';
  const gkvData = calcGKVNachzahlung(gewinn, gkvGezahlt, isFamilienversichert);
  const gkvNachzahlung = gkvData.nachzahlung;
  const gkvAbzugsfaehig = gkvData.abzugsfaehig; // Это вычитается из дохода

  // Sparerpauschbetrag
  const sparerpausch = isSplitting ? 2000 : 1000;
  const kapNach = Math.max(0, kap - sparerpausch);

  // ── zu versteuerndes Einkommen (ohne Kinder zuerst) ──
  let einkommen = gewinn
    - hoPausch
    - fahrtk
    - spenden
    - wk
    - sozVersSum    // Социальные страховки
    - gkvAbzugsfaehig  // ← НОВОЕ: GKV вычитается как Sonderausgaben!
    - bu            // Berufsunfähigkeitsversicherung
    - haft          // Haftpflichtversicherung
    - fortbildung   // Fortbildung
    - verpflegungAbzug // Verpflegungsmehraufwand
    - gwg           // GWG (sofort abzugsfähig)
    - afaJahresabschreibung // AfA Jahresabschreibung
    - iabAbzug      // Investitionsabzugsbetrag
    - pkwKosten     // PKW Kosten (je nach Methode)
    - alleinerziehendFB;

  if (isSplitting && partner === 'nein') {
    // Partner-Einkommen 0 → volles Splitting
  }

  einkommen = Math.max(0, einkommen);

  // Steuer ohne Kinderfreibetrag
  let estOhneKind = isSplitting ? estSplitting(einkommen, jahr) : estGrundtarifY(einkommen, jahr);

  // Kinderfreibetrag: Steuerersparnis
  let zveMitKind = Math.max(0, einkommen - kinderfb_gesamt);
  let estMitKind = isSplitting ? estSplitting(zveMitKind, jahr) : estGrundtarifY(zveMitKind, jahr);
  const steuerersparnis = estOhneKind - estMitKind;

  // Günstiger: Kinderfreibetrag oder Kindergeld?
  let kindAbzug, kindMethod;
  if (nKinder > 0 && steuerersparnis > kindergeld_jahr) {
    kindAbzug = kinderfb_gesamt;
    kindMethod = `Kinderfreibetrag (${fmt(steuerersparnis)} Ersparnis > Kindergeld ${fmt(kindergeld_jahr)})`;
  } else if (nKinder > 0) {
    kindAbzug = 0; // Kindergeld bleibt, kein Freibetrag abzuziehen
    kindMethod = `Kindergeld (${fmt(kindergeld_jahr)}/Jahr günstiger)`;
  } else {
    kindAbzug = 0;
    kindMethod = 'Keine Kinder';
  }

  // Finales zvE
  const zveEndgueltig = Math.max(0, einkommen - kindAbzug);
  let estFinal = isSplitting ? estSplitting(zveEndgueltig, jahr) : estGrundtarifY(zveEndgueltig, jahr);

  // Kindergeld anrechnen wenn Kindergeld günstiger
  let kindergeldAnrechnung = 0;
  if (nKinder > 0 && kindAbzug === 0) {
    kindergeldAnrechnung = kindergeld_jahr; // wird ausgezahlt, nicht angerechnet
  }

  // Kapitalertragsteuer (Abgeltungsteuer 25% auf kapNach)
  const kapSteuer = Math.round(kapNach * 0.25);
  const kapSoli   = calcSoli(kapSteuer, jahr);

  // Soli (auf Einkommensteuer)
  const soli = calcSoli(estFinal, jahr);

  // Kirchensteuer
  const kirchenst = kirche > 0 ? Math.round(estFinal * kirche / 100) : 0;

  // ─── НОВОЕ: GEWERBESTEUER ───
  const gewstData = calcGewerbesteuer(gewinn);
  const gewst = gewstData.gewst;
  const gewstVerrechenbar = gewstData.verrechenbar;
  
  // Показать предупреждение если Mindestbeitrag и не Familienversichert
  if (gkvData.hasMindestbeitrag && !isFamilienversichert) {
    document.getElementById('st-gkv-warning-mindest').style.display = 'block';
  } else {
    document.getElementById('st-gkv-warning-mindest').style.display = 'none';
  }

  // ─── НОВОЕ: USt SALDO (автоматически из EÜR) ───
  // ВАЖНО: Если Kleinunternehmer, то УСт = 0!
  const isKleinunternehmer = document.getElementById('st-kleinunternehmer-option')?.value === 'ja';
  let ustEingezogen = isKleinunternehmer ? 0 : ein * 0.19; // 19% от брутто-доходов (или 0 если KU)
  let ustBezahlt = isKleinunternehmer ? 0 : aus * 0.19;     // 19% от брутто-расходов (или 0 если KU)
  const ustSaldo = ustEingezogen - ustBezahlt; // Если положительно - платим государству
  
  // Рекомендация по Kleinunternehmer
  const ustPercent = ein > 0 ? ((ustEingezogen / ein) * 100) : 0;
  if (!isKleinunternehmer && ein < 25000 && ustSaldo > 100) {
    document.getElementById('st-klein-recommendation').textContent = 
      `✅ EMPFOHLEN: Sie zahlen ${fmt(ustSaldo)} USt. Als Kleinunternehmer sparen Sie diese Summe!`;
    document.getElementById('st-klein-recommendation').style.color = 'var(--green)';
  } else if (!isKleinunternehmer && ein >= 25000) {
    document.getElementById('st-klein-recommendation').textContent = 
      `'+t('⚠️ Umsatz > 25.000€: Sie sind kein Kleinunternehmer mehr (ab nächstem Jahr).')+'`;
    document.getElementById('st-klein-recommendation').style.color = 'var(--yellow)';
  } else if (isKleinunternehmer) {
    document.getElementById('st-klein-recommendation').textContent = 
      `✅ Kleinunternehmer aktiv — Sie zahlen KEINE Umsatzsteuer!`;
    document.getElementById('st-klein-recommendation').style.color = 'var(--cyan)';
  }

  // Gesamtsteuer (теперь с GewSt)
  const gesamtSteuer = estFinal + soli + kirchenst + kapSteuer + kapSoli + gewst - gewstVerrechenbar;

  // ─── КРИТИЧЕСКОЕ: NETTO-GEWINN (реальные деньги в кармане) ───
  // ПРАВИЛЬНАЯ ФОРМУЛА (без "взаимозачётов"):
  // Gewinn - ALL real payments = что физически останется
  const ihabeitrag = 200; // IHK (примерно)
  const bgbeitrag = 300;  // BG (примерно)
  const netoGewinnKriterion = gewinn - estFinal - soli - gewst - gkvNachzahlung - Math.max(0, ustSaldo) - ihabeitrag - bgbeitrag;

  // Ergebnis: Zahlung oder Erstattung
  const diff = gesamtSteuer - vorausz - kest;

  // ── Ausgabe ──
  document.getElementById('st-result').style.display = 'block';
  document.getElementById('st-res-jr').textContent = jahr;

  // Обновить Gewerbesteuer дисплей
  updateGewersteuherDisplay(gewinn);
  updateGKVDisplay(gewinn, gkvGezahlt, isFamilienversichert);

  // Cards
  const cardColor = diff > 0 ? 'r' : 'g';
  document.getElementById('st-cards').innerHTML =
    stCard('b','Zu verst. Einkommen', fmt(zveEndgueltig), `Splitting: ${isSplitting?'Ja':'Nein'}`) +
    stCard('y','Einkommensteuer', fmt(estFinal), isSplitting?'Splittingtarif':'Grundtarif') +
    stCard('p','Gesamtsteuer', fmt(gesamtSteuer), `inkl. GewSt, Soli${kirche>0?', Kirche':''}`) +
    stCard(cardColor, diff>0?t('Nachzahlung'):t('Erstattung'), fmt(Math.abs(diff)), diff>0?t('zu zahlen an Finanzamt'):t('vom Finanzamt zurück'));

  // Left breakdown: Einkommensberechnung
  document.getElementById('st-bl').innerHTML = `
    <h3 style="margin-bottom:12px">📐 Einkommensberechnung</h3>
    ${stRow('Betriebseinnahmen', '+'+fmt(ein))}
    ${stRow('Betriebsausgaben', '−'+fmt(aus))}
    ${stRow('Gewinn (EÜR)', fmt(gewinn), true, 'var(--green)')}
    ${stRow('Homeoffice-Pauschale', '−'+fmt(hoPausch), false, 'var(--yellow)')}
    ${stRow('Fahrtkosten', '−'+fmt(fahrtk), false, 'var(--yellow)')}
    ${kv?stRow('Krankenversicherung', '−'+fmt(kv), false, 'var(--cyan)'):''}
    ${pv?stRow('Pflegeversicherung', '−'+fmt(pv), false, 'var(--cyan)'):''}
    ${av?stRow('Altersversicherung', '−'+fmt(av), false, 'var(--cyan)'):''}
    ${buv?stRow('Berufsunfähigkeitsvers.', '−'+fmt(buv), false, 'var(--cyan)'):''}
    ${bu?stRow('Berufsunfähigkeitsvers. (zusätzlich)', '−'+fmt(bu), false, 'var(--purple)'):''}
    ${haft?stRow('Haftpflichtversicherung', '−'+fmt(haft), false, 'var(--purple)'):''}
    ${gkvAbzugsfaehig>0?stRow('GKV Nachzahlung (Sonderausgaben)', '−'+fmt(gkvAbzugsfaehig), false, 'var(--red)'):''}
    ${spenden?stRow('Spenden', '−'+fmt(spenden)):''}
    ${wk?stRow('Sonstige Werbungskosten', '−'+fmt(wk)):''}
    ${fortbildung?stRow('Fortbildung / Kurse', '−'+fmt(fortbildung)):''}
    ${gwg?stRow('GWG (< 800€)', '−'+fmt(gwg), false, 'var(--yellow)'):''}
    ${afaJahresabschreibung>0?stRow('AfA (Abschreibung)', '−'+fmt(afaJahresabschreibung), false, 'var(--yellow)'):''}
    ${iabAbzug>0?stRow('Investitionsabzugsbetrag (IAB)', '−'+fmt(iabAbzug), false, 'var(--yellow)'):''}
    ${pkwKosten>0?stRow(pkwNutzung==='1prozent'?'PKW 1%-Regelung':'PKW Fahrtenbuch', '−'+fmt(pkwKosten), false, 'var(--yellow)'):''}
    ${verpflegungAbzug>0?stRow('Verpflegungsmehraufwand ('+verpflegungTage+' Tage)', '−'+fmt(verpflegungAbzug), false, 'var(--purple)'):''}
    ${alleinerziehendFB?stRow('Alleinerziehend-Freibetrag', '−'+fmt(alleinerziehendFB)):''}
    ${kindAbzug?stRow('Kinderfreibetrag ('+nKinder+' Kinder)', '−'+fmt(kindAbzug)):''}
    <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px">
      <span style="font-size:13px;font-weight:700">Zu versteuerndes Einkommen</span>
      <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--blue)">${fmt(zveEndgueltig)}</span>
    </div>`;

  // Right breakdown: Steuerberechnung
  document.getElementById('st-br').innerHTML = `
    <h3 style="margin-bottom:12px">🧮 Steuerberechnung</h3>
    ${stRow('Tarif', isSplitting?'Splittingtarif §32a (2)':'Grundtarif §32a (1)')}
    ${stRow('Einkommensteuer', fmt(estFinal), true, 'var(--red)')}
    ${stRow('Solidaritätszuschlag (5,5%)', fmt(soli))}
    ${kirche>0?stRow(`Kirchensteuer (${kirche}%)`, fmt(kirchenst)):''}
    ${kapNach>0?stRow('Kapitalertragsteuer (25%)', fmt(kapSteuer+kapSoli)):''}
    ${stRow('Gesamtsteuer', fmt(gesamtSteuer), true)}
    ${stRow('− Vorauszahlungen', '−'+fmt(vorausz), false, 'var(--green)')}
    ${kest?stRow('− Einbehaltene KapESt', '−'+fmt(kest), false, 'var(--green)'):''}
    <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px;border-top:2px solid var(--border)">
      <span style="font-size:13px;font-weight:700">${diff>0?'⬆ Nachzahlung':'⬇ Erstattung'}</span>
      <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:${diff>0?'var(--red)':'var(--green)'}">${fmt(Math.abs(diff))}</span>
    </div>`;

  // Freibeträge block
  document.getElementById('st-fb').innerHTML = `
    <h3 style="margin-bottom:12px">📋 Angewandte Freibeträge & Hinweise</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px">
      <div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Grundfreibetrag ${jahr}</div>
        <div style="font-family:var(--mono);color:var(--green)">${fmt(grundfb)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${isSplitting?'Splitting (×2)':'Einzelveranlagung'}</div>
      </div>
      ${nKinder>0?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Kinderfreibetrag / Kindergeld</div>
        <div style="font-family:var(--mono);color:var(--yellow)">${nKinder} × ${fmt(KFREIBETRAG_2025)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${kindMethod}</div>
      </div>`:''}
      ${isAlleinerziehend?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Alleinerziehend-Freibetrag</div>
        <div style="font-family:var(--mono);color:var(--purple)">${fmt(alleinerziehendFB)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">§24b EStG</div>
      </div>`:''}
      ${isSplitting?`<div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Zusammenveranlagung</div>
        <div style="font-family:var(--mono);color:var(--blue)">Splitting aktiv</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">Halbes ZvE × 2 → Steuervorteil</div>
      </div>`:''}
      <div style="background:var(--s2);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Sparerpauschbetrag</div>
        <div style="font-family:var(--mono);color:var(--cyan)">${fmt(sparerpausch)}</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">§20 Abs.9 EStG</div>
      </div>
      ${nKinder>0&&kindAbzug===0?`<div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:10px">
        <div style="color:var(--sub);margin-bottom:4px">Kindergeld ${jahr}</div>
        <div style="font-family:var(--mono);color:var(--green)">${fmt(kindergeld_jahr)}/Jahr</div>
        <div style="color:var(--sub);font-size:10px;margin-top:3px">${nKinder} × 255 €/Monat · günstiger!</div>
      </div>`:''}
    </div>
    <div style="margin-top:14px;padding:10px 12px;background:var(--s2);border-radius:var(--r);font-size:11px;color:var(--sub);line-height:1.7">
      <strong style="color:var(--muted)">Nächste Schritte:</strong><br>
      1. Daten in <strong>ELSTER Online</strong> (elster.de) eingeben — kostenlos und offiziell<br>
      2. Anlage <strong>S</strong> (Selbstständige) + Anlage <strong>EÜR</strong> ausfüllen<br>
      ${isSplitting?'3. Anlage <strong>U</strong> für Zusammenveranlagung<br>':''}
      ${nKinder>0?`${isSplitting?'4':'3'}. ${t('Anlage')} <strong>${t('Kind')}</strong> ${t('für')} ${nKinder} ${t('Kind')}${nKinder>1?t('er'):''}<br>`:''}
      <strong style="color:var(--yellow)">Abgabefrist:</strong> 31. Juli des Folgejahres (mit Steuerberater: 28. Februar übernächstes Jahr)
    </div>`;

  // USt & Steuerrücklage Info
  const steuerRuecklage = Math.round(gesamtSteuer * 0.3); // 30% Reserve
  document.getElementById('st-result').innerHTML += `
    
    <!-- ═══ KRITISCH: NETTO-GEWINN ═══ -->
    <div style="background:var(--gdim);border:3px solid var(--green);border-radius:var(--r2);padding:20px;margin:20px 0">
      <h3 style="color:var(--green);margin-bottom:16px;font-size:18px">💰 KRITISCH: Netto-Gewinn nach ALLEM</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">BRUTTO Gewinn</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--green)">${fmt(gewinn)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Einkommensteuer</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(estFinal)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Soli + Kirche</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(soli + kirchenst)}</div>
        </div>
      <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Gewerbesteuer (реально платить)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(gewst)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: GKV Nachzahlung</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(gkvNachzahlung)}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: USt Saldo (Staat)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−${fmt(Math.max(0, ustSaldo))}</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: IHK-Beitrag (~200€)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−200,00 €</div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:4px">Minus: Berufsgenossenschaft (~300€)</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--red)">−300,00 €</div>
        </div>
      </div>
      <div style="background:var(--gdim);border:2px solid var(--green);border-radius:var(--r2);padding:16px;text-align:center">
        <div style="font-size:12px;color:var(--sub);margin-bottom:8px">🎯 <strong>NETTO ZUM LEBEN — Ваш реальный доход:</strong></div>
        <div style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--green)">${fmt(Math.max(0, netoGewinnKriterion))}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">Это деньги для Их жизни, семьи, рентабельности, инвестиций</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--green);margin-bottom:12px;font-size:14px">${t('📊 Umsatzsteuer (USt) Saldo')}</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">USt eingezogen (19% × Einnahmen)</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--green)">${fmt(ustEingezogen)}</div>
        </div>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">USt bezahlt (19% × Ausgaben)</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--red)">−${fmt(ustBezahlt)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r);border:1px solid var(--green)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Saldo: ${ustSaldo > 0 ? 'zu zahlen' : 'Erstattung'}</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:700;color:${ustSaldo > 0 ? 'var(--red)' : 'var(--green)'}">${ustSaldo > 0 ? '−' : '+'} ${fmt(Math.abs(ustSaldo))}</div>
        </div>
      </div>

      <div style="background:var(--ydim);border:1px solid var(--yellow);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--yellow);margin-bottom:12px;font-size:14px">🏦 Steuerrücklage (Empfehlung)</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Gesamtsteuer</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:600">${fmt(gesamtSteuer)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r);border:1px solid var(--yellow)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">30% Reserve</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--yellow)">${fmt(steuerRuecklage)}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:6px">⚠️ На отдельный счёт для налогов!</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div style="background:var(--gdim);border:1px solid var(--green);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--green);margin-bottom:12px;font-size:14px">${t('📊 Umsatzsteuer (USt) Saldo')}</h3>
        ${stRow('USt eingezogen (19%)', fmt(ustEingezogen), false, 'var(--green)')}
        ${stRow('USt bezahlt (19%)', fmt(ustBezahlt), false, 'var(--red)')}
        <div style="border-top:1px solid var(--green);padding-top:8px;margin-top:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="font-weight:600;color:var(--green)">Saldo: ${ustSaldo>=0?'zu zahlen':'Erstattung'}</span>
            <span style="font-family:var(--mono);font-weight:700;color:var(--green)">${fmt(Math.abs(ustSaldo))}</span>
          </div>
        </div>
      </div>
      <div style="background:var(--ydim);border:1px solid var(--yellow);border-radius:var(--r);padding:14px">
        <h3 style="color:var(--yellow);margin-bottom:12px;font-size:14px">🏦 Steuerrücklage (Empfehlung)</h3>
        <div style="background:var(--s2);padding:10px;border-radius:var(--r);margin-bottom:10px">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">Gesamtsteuer</div>
          <div style="font-family:var(--mono);font-size:14px;font-weight:600">${fmt(gesamtSteuer)}</div>
        </div>
        <div style="background:var(--s3);padding:10px;border-radius:var(--r)">
          <div style="font-size:10px;color:var(--sub);margin-bottom:3px">30% Reserve empfohlen</div>
          <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--yellow)">${fmt(steuerRuecklage)}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:6px">⚠️ Halten Sie diesen Betrag auf separatem Konto für Steuerzahlungen!</div>
        </div>
      </div>
    </div>`;

  // ─── ОБЪЯВИТЬ переменные ДО использования в hinweiseHTML ───
  const nettoGewinnFinal = Math.max(0, netoGewinnKriterion); // Используем уже рассчитанное значение
  const monatlichReserve = Math.round(gesamtSteuer / 12);
  const monatlichNettoLeben = Math.round(nettoGewinnFinal / 12);

  // Финальный блок предупреждений и советов
  const hinweiseHTML = `
    <div style="background:var(--ydim);border:2px solid var(--yellow);border-radius:var(--r2);padding:16px;margin-top:20px">
      <h3 style="color:var(--yellow);margin-bottom:12px">⚠️ WICHTIGE HINWEISE & MASSNAHMEN FÜR 2025/2026</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">1️⃣ GKV NACHZAHLUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Sofort handeln:</strong> Schicken Sie Ihren Steuerbescheid (Steuerbescheid) an Ihre Krankenkasse. Sie werden dann automatisch die Beiträge für ${jahr} neu berechnen und Sie nicht mit 11k€ überraschen.
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">2️⃣ USt-VORANMELDUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Pflicht:</strong> Bei einem Umsatz von ${fmt(ein)} müssen Sie monatlich oder quartalsweise eine Voranmeldung beim Finanzamt einreichen. Dies ist in ELSTER automatisiert.
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">3️⃣ TAGESGELDKONTO</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Eröffnen Sie sofort:</strong> Ein separates Tagesgeldkonto (z.B. bei comdirect, ING) und legen Sie jeden Monat <strong>${fmt(monatlichReserve)}</strong> zur Seite. So vermeiden Sie die \"November-Überraschung\".
          </div>
        </div>
        <div style="background:var(--s2);padding:12px;border-radius:var(--r)">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px;font-weight:600">4️⃣ JAHRESABRECHNUNG</div>
          <div style="font-size:12px;line-height:1.6">
            <strong>Im Frühjahr ${jahr+1}:</strong> Das Finanzamt schickt den Steuerbescheid (Bescheid). Zahlen Sie alle rückständigen Steuern schnell — Verzugszinsen sind hoch (6% pro Jahr).
          </div>
        </div>
      </div>
      <div style="background:var(--rdim);border:1px solid var(--red);border-radius:var(--r);padding:10px;margin-top:12px;font-size:11px;color:var(--muted)">
        <strong style="color:var(--red)">🔴 KRITISCH:</strong> Diese Zahl (${fmt(nettoGewinnFinal)}/Jahr oder ${fmt(monatlichNettoLeben)}/Monat) ist Ihr reales verfügbares Einkommen NACH allen Steuern. Nicht verwechseln mit Umsatz oder Brutto-Gewinn!
      </div>
    </div>`;
  
  document.getElementById('st-result').innerHTML += hinweiseHTML;
  
  document.getElementById('st-netto-brutto').textContent = fmt(gewinn);
  document.getElementById('st-netto-steuern').textContent = fmt(estFinal + soli + gewst + gkvNachzahlung + Math.max(0, ustSaldo) + ihabeitrag + bgbeitrag);
  document.getElementById('st-netto-final').textContent = fmt(nettoGewinnFinal);
  document.getElementById('st-netto-monatlich').textContent = fmt(monatlichNettoLeben);
  document.getElementById('st-monats-reserve').textContent = fmt(monatlichReserve);
  document.getElementById('st-jahres-reserve').textContent = fmt(gesamtSteuer);

  toast('✅ Berechnung abgeschlossen!','ok');
  } catch(e) {
    console.error('Fehler in stBerechnen:', e);
    toast('❌ Fehler: '+e.message,'error');
  }
}

// ── SZENARIEN-TEST ────────────────────────────────────────────────────────
function runSzenarien() {
  const szenarien = [
    { id:'S01', jr:2025, zvE:12096,  sp:false, k:0, label:'Grundfreibetrag 2025 (exakt)',    desc:'ESt muss 0 € sein.' },
    { id:'S02', jr:2026, zvE:12348,  sp:false, k:0, label:'Grundfreibetrag 2026 (exakt)',    desc:'ESt muss 0 € sein.' },
    { id:'S03', jr:2026, zvE:12349,  sp:false, k:0, label:'1 € über Grundfreibetrag 2026',  desc:'Erster steuerpflichtiger Euro.' },
    { id:'S04', jr:2026, zvE:20000,  sp:false, k:0, label:'KU-typisch 20.000 €',            desc:'Typischer Kleinunternehmer.' },
    { id:'S05', jr:2026, zvE:24999,  sp:false, k:0, label:'KU-Grenze 24.999 € (ledig)',     desc:'Knapp unter Vorjahres-KU-Grenze.' },
    { id:'S06', jr:2026, zvE:25001,  sp:false, k:0, label:'KU-Grenze überschritten',        desc:'Folgejahr Regelbesteuerung.' },
    { id:'S07', jr:2026, zvE:40000,  sp:false, k:0, label:'40.000 € ledig',                 desc:'Mittleres Einkommen.' },
    { id:'S08', jr:2026, zvE:40000,  sp:true,  k:0, label:'40.000 € Splitting',             desc:'Splittingvorteil erkennbar.' },
    { id:'S09', jr:2026, zvE:60000,  sp:false, k:0, label:'60.000 € ledig',                 desc:'Progressionszone 42%.' },
    { id:'S10', jr:2026, zvE:60000,  sp:false, k:2, label:'60.000 € + 2 Kinder',            desc:'Günstigerprüfung Kindergeld/KFB.' },
    { id:'S11', jr:2026, zvE:70000,  sp:false, k:0, label:'Soli-Grenzbereich 70k',          desc:'Soli-Freigrenze 2026: 20.350 € ESt.' },
    { id:'S12', jr:2026, zvE:85000,  sp:false, k:0, label:'85.000 € — Soli prüfen',        desc:'Oberhalb Soli-Milderungszone.' },
    { id:'S13', jr:2026, zvE:100000, sp:false, k:0, label:'Spitzenverdiener 100k',          desc:'42% Spitzensteuersatz.' },
    { id:'S14', jr:2026, zvE:277825, sp:false, k:0, label:'Reichensteuer-Grenze 277.825 €', desc:'Letzter Euro vor 45%.' },
    { id:'S15', jr:2026, zvE:277826, sp:false, k:0, label:'Reichensteuer ab 277.826 €',     desc:'45% Reichensteuer aktiv.' },
    { id:'S16', jr:2026, zvE:150000, sp:true,  k:3, label:'Splitting 150k + 3 Kinder',      desc:'Komplexfall: Splitting + KFB.' },
  ];

  let html = `<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--s2);border-bottom:2px solid var(--border2)">
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">ID</th>
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">Szenario</th>
      <th style="padding:10px 8px;text-align:center;font-size:10px;color:var(--sub);font-weight:600">Jahr</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">zvE</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">ESt</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Effsatz</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Soli</th>
      <th style="padding:10px 8px;text-align:right;font-size:10px;color:var(--sub);font-weight:600">Gesamt</th>
      <th style="padding:10px 8px;text-align:left;font-size:10px;color:var(--sub);font-weight:600">Beschreibung</th>
      <th style="padding:10px 8px;text-align:center;font-size:10px;color:var(--sub);font-weight:600">OK</th>
    </tr></thead><tbody>`;

  szenarien.forEach(sz => {
    const sw = getSteuerwerte(sz.jr);
    let zvEFinal = sz.zvE;
    let kindNote = '';
    if (sz.k > 0) {
      const kfb = sz.k * sw.kfreibetrag;
      const kgeld = sz.k * sw.kindergeld * 12;
      const estOhne = sz.sp ? estSplitting(sz.zvE, sz.jr) : estGrundtarifY(sz.zvE, sz.jr);
      const estMit  = sz.sp ? estSplitting(Math.max(0,sz.zvE-kfb), sz.jr) : estGrundtarifY(Math.max(0,sz.zvE-kfb), sz.jr);
      if ((estOhne - estMit) > kgeld) {
        zvEFinal = Math.max(0, sz.zvE - kfb);
        kindNote = `${t('· KFB günstiger')}`;
      } else {
        kindNote = ` · Kindergeld ${fmt(kgeld)} günstiger`;
      }
    }
    const est    = sz.sp ? estSplitting(zvEFinal, sz.jr) : estGrundtarifY(zvEFinal, sz.jr);
    const soli   = calcSoli(est, sz.jr);
    const gesamt = est + soli;
    const effsatz = sz.zvE > 0 ? (gesamt/sz.zvE*100).toFixed(1)+'%' : '0,0%';
    const erwartetNull = sz.zvE <= sw.grundfb;
    const statusOk = erwartetNull ? est === 0 : est > 0;

    html += `<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <td style="padding:8px;font-family:var(--mono);font-size:10px;color:var(--sub)">${sz.id}</td>
      <td style="padding:8px;font-weight:500;font-size:12px">${sz.label}
        ${sz.sp?`<span style="margin-left:5px;background:var(--pdim);border:1px solid var(--purple);border-radius:4px;padding:1px 5px;font-size:9px;color:var(--purple);font-family:var(--mono)">SPLIT</span>`:''}
        ${sz.k?`<span style="margin-left:3px;background:var(--cdim);border:1px solid var(--cyan);border-radius:4px;padding:1px 5px;font-size:9px;color:var(--cyan);font-family:var(--mono)">${sz.k}K</span>`:''}
      </td>
      <td style="padding:8px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--sub)">${sz.jr}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px">${fmt(sz.zvE)}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:${est>0?'var(--red)':'var(--green)'}">${fmt(est)}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--sub)">${effsatz}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:${soli>0?'var(--yellow)':'var(--sub)'}">${soli>0?fmt(soli):'—'}</td>
      <td style="padding:8px;text-align:right;font-family:var(--mono);font-size:12px;font-weight:700">${fmt(gesamt)}</td>
      <td style="padding:8px;font-size:11px;color:var(--muted)">${sz.desc}${kindNote}</td>
      <td style="padding:8px;text-align:center;font-size:14px">${statusOk?'✅':'⚠️'}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div style="font-size:10px;color:var(--sub);background:var(--s3);padding:10px 14px;border-radius:var(--r);border:1px solid var(--border);line-height:1.6">
    <strong>Quellen (Stand März 2026):</strong> §32a EStG · Jahressteuergesetz 2024 · BMF · IHK München/Stuttgart · Bundesfinanzministerium.de · Sparkasse.de<br>
    Grundfreibetrag 2025: <strong>12.096 €</strong> | 2026: <strong>12.348 €</strong> &nbsp;·&nbsp;
    Soli-Freigrenze 2026: <strong>20.350 € ESt</strong> &nbsp;·&nbsp;
    Kinderfreibetrag 2026: <strong>6.828 € (3.414 je Elternteil)</strong> + Betreuungsfreibetrag 2.928 € &nbsp;·&nbsp;
    Kindergeld 2026: <strong>259 €/Monat</strong><br>
    KU-Grenzen ab 01.01.2025 §19 UStG: Vorjahr <strong>25.000 € netto</strong> + laufendes Jahr <strong>100.000 € netto</strong> (Fallbeil-Effekt) &nbsp;·&nbsp;
    Gewerbesteuer-Freibetrag: <strong>24.500 €</strong> · Messzahl: <strong>3,5%</strong> × Hebesatz (Gemeinde)
  </div>`;

  document.getElementById('sz-results').innerHTML = html;
  toast(''+t('✅ 16 Steuer-Szenarien berechnet')+'','ok');
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function fmt(n){return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function fd(d){if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}.${m}.${y}`}
// Мобильная дата: DD.MM.YY (год 2 цифры)
function fdm(d){if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}.${m}.${y.slice(2)}`}
function isMob(){return window.innerWidth<=768}
function sum(arr,t){return arr.filter(e=>e.typ===t).reduce((s,e)=>s+e.betrag,0)}
function g(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function dl(csv,name){const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type} show`;setTimeout(()=>t.classList.remove('show'),3200)}

// ── МОБИЛЬНЫЙ DETAIL POPUP ─────────────────────────────────────────────────
function showMobDetail(entry){
  const modal=document.getElementById('mob-detail-modal');
  if(!modal)return;
  const isEin=entry.typ==='Einnahme';
  document.getElementById('mdm-title').innerHTML=`<span class="badge ${isEin?'b-ein':'b-aus'}">${isEin?'<i class="fas fa-arrow-up" style="color:var(--green)"></i> '+t('Einnahme'):'<i class="fas fa-arrow-down" style="color:var(--red)"></i> '+t('Ausgabe')}</span>`;
  // Добавляем крестик в кнопку
  modal.querySelector('.mdm-close-btn').innerHTML='✕';
  document.getElementById('mdm-body').innerHTML=`
    <div class="mdm-row">
      <span class="mdm-key">Betrag</span>
      <span class="mdm-val mdm-amt" style="color:${isEin?'var(--green)':'var(--red)'}">${isEin?'+':'−'}${fmt(entry.betrag)}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Datum</span>
      <span class="mdm-val">${fd(entry.datum)}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Kategorie</span>
      <span class="mdm-val">${entry.kategorie||'—'}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Beschreibung</span>
      <span class="mdm-val">${entry.beschreibung||'—'}</span>
    </div>
    <div class="mdm-row">
      <span class="mdm-key">Zahlungsart</span>
      <span class="mdm-val"><span class="badge ${ZBADGE[entry.zahlungsart]||''}">${entry.zahlungsart||'—'}</span></span>
    </div>
    ${entry.notiz?`<div class="mdm-row"><span class="mdm-key">Notiz</span><span class="mdm-val">${entry.notiz}</span></div>`:''}
  `;
  document.getElementById('mdm-btns').innerHTML=`
    <button class="btn primary" style="flex:1" onclick="closeMobDetail();editE(event,'${entry.id}')"><i class="fas fa-edit"></i> Bearbeiten</button>
    <button class="btn" style="color:var(--red);border-color:var(--red)" onclick="closeMobDetail();delE(event,'${entry.id}')"><i class="fas fa-trash"></i> Löschen</button>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeMobDetail(){
  const modal=document.getElementById('mob-detail-modal');
  if(modal)modal.classList.add('hidden');
  document.body.style.overflow='';
}
// Закрытие по клику на overlay
document.addEventListener('click',function(e){
  const modal=document.getElementById('mob-detail-modal');
  if(modal&&!modal.classList.contains('hidden')&&e.target===modal){closeMobDetail();}
});

// ── MOBILE BOTTOM NAV ─────────────────────────────────────────
// Таббары которые соответствуют разделам
const MOB_TAB_MAP = {
  dashboard: 'mobt-dashboard',
  eintraege: 'mobt-eintraege',
  neu:       'mobt-neu',
  bericht:   'mobt-bericht',
};

function mobNav(page, tabEl) {
  // Используем общую nav() функцию
  const sidebarEl = document.querySelector('.nav-item[onclick*="' + page + '"]');
  if (sidebarEl) nav(page, sidebarEl);
  else { // если нет — просто переключаем страницу напрямую
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pg=document.getElementById('p-'+page);
    if(pg) pg.classList.add('active');
  }
  // Обновляем активный таб
  document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
  if(tabEl) tabEl.classList.add('active');
}

function mobNavDrawer(page) {
  closeMobDrawer();
  const sidebarEl = document.querySelector('.nav-item[onclick*="' + page + '"]');
  if (sidebarEl) nav(page, sidebarEl);
  // Снимаем активность с табов (раздел не в нижней панели)
  document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
}

function openMobDrawer() {
  document.getElementById('mob-drawer').classList.add('open');
  document.getElementById('mob-drawer-overlay').classList.add('open');
}
function closeMobDrawer() {
  document.getElementById('mob-drawer').classList.remove('open');
  document.getElementById('mob-drawer-overlay').classList.remove('open');
}

// Синхронизируем мобильные табы с desktop nav()
// Патчим оригинальную функцию nav после её загрузки
(function syncMobTabs(){
  const origNav = window.nav;
  window.nav = function(page, el) {
    if(origNav) origNav(page, el);
    // Синхронизируем мобильные табы
    const tabId = MOB_TAB_MAP[page];
    if(tabId) {
      document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
      const t=document.getElementById(tabId);
      if(t) t.classList.add('active');
    }
  };
})();

// ═══════════════════════════════════════════════════════════════
// CRM — KUNDENVERWALTUNG
// ═══════════════════════════════════════════════════════════════
let editKundeId = null;

function renderKunden(){
  const kunden = data.kunden||[];
  const q = (document.getElementById('kunden-search')||{value:''}).value.toLowerCase();
  const filtered = q ? kunden.filter(k=>(k.name||'').toLowerCase().includes(q)||(k.email||'').toLowerCase().includes(q)) : kunden;

  // Cards

  document.getElementById('kunden-cards').innerHTML=`
    <div class="sc b" style="cursor:default"><div class="sc-lbl">Kunden gesamt</div><div class="sc-val">${kunden.length}</div><div class="sc-sub">in der Datenbank</div></div>
`;

  const tb = document.getElementById('kunden-tbody');
  const em = document.getElementById('kunden-empty');
  if(!filtered.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  const mob = isMob();
  tb.innerHTML = filtered.map(k=>{
    return `<tr>
      <td>
        <div style="font-weight:600;font-size:13px">${k.name||'—'}</div>
        ${k.ansprechpartner?`<div style="font-size:11px;color:var(--sub)">${k.ansprechpartner}</div>`:''}
      </td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.email||'—'}</td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.tel||'—'}</td>
      <td class="mob-hide" style="font-size:12px;color:var(--sub)">${k.plz?k.plz+' ':''} ${k.ort||''}</td>
      <td style="white-space:nowrap">
        <button class="del-btn edit-btn" style="opacity:1" onclick="editKunde('${k.id}')" title="Bearbeiten"><i class="fas fa-edit"></i></button>
        <button class="del-btn edit-btn" style="opacity:1;color:var(--blue)" onclick="neueRechnungFuerKunde('${k.id}')" title="Rechnung erstellen"><i class="fas fa-receipt"></i></button>
        <button class="del-btn" style="opacity:1" onclick="delKunde('${k.id}')" title="Löschen">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function getKundeUmsatz(id){
  return (data.rechnungen||[]).filter(r=>r.kundeId===id).reduce((s,r)=>s+r.betrag,0);
}

function openKundeModal(){
  editKundeId=null;
  ['km-name','km-ansprechpartner','km-email','km-tel','km-strasse','km-plz','km-ort','km-iban','km-ustid','km-notiz'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  openModal('kunde-modal');
}

function editKunde(id){
  const k=(data.kunden||[]).find(x=>x.id===id);
  if(!k)return;
  editKundeId=id;
  document.getElementById('km-name').value=k.name||'';
  document.getElementById('km-ansprechpartner').value=k.ansprechpartner||'';
  document.getElementById('km-email').value=k.email||'';
  document.getElementById('km-tel').value=k.tel||'';
  document.getElementById('km-strasse').value=k.strasse||'';
  document.getElementById('km-plz').value=k.plz||'';
  document.getElementById('km-ort').value=k.ort||'';
  document.getElementById('km-iban').value=k.iban||'';
  document.getElementById('km-ustid').value=k.ustid||'';
  document.getElementById('km-notiz').value=k.notiz||'';
  openModal('kunde-modal');
}

function saveKunde(){
  const name=document.getElementById('km-name').value.trim();
  if(!name)return toast('Name / Firma ist Pflichtfeld!','err');
  if(!data.kunden)data.kunden=[];
  const obj={
    name,
    ansprechpartner:document.getElementById('km-ansprechpartner').value.trim(),
    email:document.getElementById('km-email').value.trim(),
    tel:document.getElementById('km-tel').value.trim(),
    strasse:document.getElementById('km-strasse').value.trim(),
    plz:document.getElementById('km-plz').value.trim(),
    ort:document.getElementById('km-ort').value.trim(),
    iban:document.getElementById('km-iban').value.trim(),
    ustid:document.getElementById('km-ustid').value.trim(),
    notiz:document.getElementById('km-notiz').value.trim(),
  };
  if(editKundeId){
    const k=data.kunden.find(x=>x.id===editKundeId);
    if(k){ Object.assign(k,obj); sbSaveKunde(k); }
    editKundeId=null;
  } else {
    const newK={id:Date.now()+'', ...obj};
    data.kunden.push(newK);
    sbSaveKunde(newK);
  }
  renderKunden(); closeModal('kunde-modal');
  toast('✅ Kunde gespeichert!','ok');
}

function delKunde(id){
  if(!confirm('Kunde löschen?'))return;
  data.kunden=(data.kunden||[]).filter(k=>k.id!==id);
  sbDeleteKunde(id); renderKunden(); toast('Gelöscht','err');
}

// Выбор клиента в модале счёта
function openKundePick(){
  document.getElementById('kpick-search').value='';
  renderKundePick();
  openModal('kunde-pick-modal');
}
function renderKundePick(){
  const q=(document.getElementById('kpick-search').value||'').toLowerCase();
  const kunden=(data.kunden||[]).filter(k=>!q||k.name.toLowerCase().includes(q)||(k.email||'').toLowerCase().includes(q));
  const el=document.getElementById('kpick-list');
  if(!kunden.length){el.innerHTML='<p style="text-align:center;padding:20px;color:var(--sub)">Keine Kunden gefunden</p>';return;}
  el.innerHTML=kunden.map(k=>`
    <div onclick="selectKunde('${k.id}')" style="padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;border-radius:var(--r)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600;font-size:13px">${k.name}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:2px">${[k.email,k.tel,k.plz&&k.ort?k.plz+' '+k.ort:''].filter(Boolean).join(' · ')}</div>
    </div>`).join('');
}
function selectKunde(id){
  const k=(data.kunden||[]).find(x=>x.id===id);
  if(!k)return;
  document.getElementById('rn-kunde').value=k.name;
  document.getElementById('rn-adresse').value=[k.strasse,k.plz&&k.ort?k.plz+' '+k.ort:''].filter(Boolean).join(', ');
  document.getElementById('rn-email').value=k.email||'';
  document.getElementById('rn-wa').value=k.tel||'';
  // Сохраняем ссылку на клиента
  document.getElementById('rn-nr').dataset.kundeId=k.id;
  closeModal('kunde-pick-modal');
  toast('✅ Kunde übernommen','ok');
}
function neueRechnungFuerKunde(id){
  openRechModal();
  setTimeout(()=>selectKunde(id),50);
  nav('rechnungen',document.querySelector('[onclick*="rechnungen"]'));
}

// IBAN Validierung
function validateIBAN(input){
  const v=input.value.replace(/\s/g,'').toUpperCase();
  const ok=/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(v);
  input.style.borderColor=v.length>4?(ok?'var(--green)':'var(--red)'):'';
}
// PLZ Validierung
function validatePLZ(input){
  const ok=/^[0-9]{5}$/.test(input.value);
  input.style.borderColor=input.value.length>0?(ok?'var(--green)':'var(--red)'):'';
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION — jsPDF
// ═══════════════════════════════════════════════════════════════
async function generateRechnungPDF(r){
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const W=210, margin=20;
  let y=20;

  // Цвета
  const BLUE=[30,58,95];
  const GRAY=[100,116,139];
  const LIGHTGRAY=[243,244,246];
  const BLACK=[17,24,39];

  // Шапка — фирма
  doc.setFillColor(...BLUE);
  doc.rect(0,0,W,28,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  doc.text('Autowäsche Berg',margin,12);
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.text('Musterstraße 1 · 67547 Worms · Tel: +49 (0) 6241 000000 · info@autowaesche-berg.de',margin,20);
  y=38;

  // Rechnung Nr / Datum — правый блок
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica','bold');
  doc.setFontSize(20);
  doc.text('RECHNUNG',margin,y);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Nr.: ${r.nr}`,W-margin,y-6,{align:'right'});
  doc.text(`Datum: ${fd(r.datum)}`,W-margin,y,{align:'right'});
  if(r.faellig) doc.text(`Fällig bis: ${fd(r.faellig)}`,W-margin,y+6,{align:'right'});
  y+=16;

  // Kundenbox
  doc.setFillColor(...LIGHTGRAY);
  doc.roundedRect(margin,y,W-2*margin,22,2,2,'F');
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.text(r.kunde||'—',margin+4,y+8);
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(r.adresse||'',margin+4,y+15);
  y+=30;

  // Tabelle Header
  doc.setFillColor(...BLUE);
  doc.rect(margin,y,W-2*margin,8,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.text('Leistung / Beschreibung',margin+2,y+5.5);
  doc.text('Menge',W-margin-52,y+5.5,{align:'right'});
  doc.text('Einzelpreis',W-margin-26,y+5.5,{align:'right'});
  doc.text('Gesamt',W-margin,y+5.5,{align:'right'});
  y+=10;

  // Позиции
  const pos=r.positionen&&r.positionen.length?r.positionen:[{bez:r.beschreibung||'Leistung',menge:1,preis:r.betrag}];
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  let total=0;
  pos.forEach((p,i)=>{
    const g=p.menge*p.preis;
    total+=g;
    if(i%2===0){doc.setFillColor(250,251,252);doc.rect(margin,y-1,W-2*margin,8,'F');}
    doc.text(p.bez||'',margin+2,y+5);
    doc.text(String(p.menge),W-margin-52,y+5,{align:'right'});
    doc.text(fmt(p.preis),W-margin-26,y+5,{align:'right'});
    doc.text(fmt(g),W-margin,y+5,{align:'right'});
    y+=8;
    if(y>260){doc.addPage();y=20;}
  });

  // Итого
  y+=2;
  doc.setFillColor(...BLUE);
  doc.rect(margin,y,W-2*margin,10,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.text('Gesamtbetrag',margin+2,y+7);
  doc.text(fmt(total),W-margin,y+7,{align:'right'});
  y+=18;

  // Notiz
  if(r.notiz){
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const lines=doc.splitTextToSize(r.notiz,W-2*margin);
    doc.text(lines,margin,y);
    y+=lines.length*5+6;
  }

  // §19 UStG
  doc.setFont('helvetica','italic');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmer).',margin,y);
  y+=8;

  // Footer — IBAN
  doc.setFillColor(...LIGHTGRAY);
  doc.rect(0,277,W,20,'F');
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('IBAN: DE12 3456 7890 1234 5678 90 · BIC: SSKMDEMMXXX · Sparkasse Worms-Alzey-Ried',W/2,285,{align:'center'});
  doc.text('Autowäsche Berg · Inhaber: Max Bergmann · Musterstraße 1 · 67547 Worms',W/2,291,{align:'center'});

  return doc;
}

// Скачать PDF
async function downloadRechnungPDF(r){
  toast('📄 PDF wird erstellt...','ok');
  try{
    const doc=await generateRechnungPDF(r);
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    toast('✅ PDF gespeichert!','ok');
  }catch(e){console.error(e);toast('Fehler beim PDF-Erstellen','err');}
}

// Email mit PDF
async function emailMitPDF(r){
  if(!r.email){toast('Keine E-Mail-Adresse vorhanden','err');return;}
  toast('📄 PDF wird erstellt...','ok');
  try{
    const doc=await generateRechnungPDF(r);
    // Скачиваем PDF
    doc.save(`Rechnung_${r.nr.replace(/\//g,'-')}.pdf`);
    // Открываем почтовый клиент
    const subject=encodeURIComponent(`Rechnung Nr. ${r.nr} — Autowäsche Berg`);
    const body=encodeURIComponent(
`Sehr geehrte Damen und Herren,${r.kunde?'\n\nSehr geehrte/r '+r.kunde+',':''}

anbei erhalten Sie unsere Rechnung Nr. ${r.nr} über ${fmt(r.betrag)}.
${r.faellig?'\nZahlungsziel: '+fd(r.faellig):''}

Bitte hängen Sie die soeben heruntergeladene PDF-Datei an diese E-Mail an.

Mit freundlichen Grüßen
Autowäsche Berg
Tel: +49 (0) 6241 000000
info@autowaesche-berg.de`);
    setTimeout(()=>window.open(`mailto:${r.email}?subject=${subject}&body=${body}`),500);
    toast('✅ PDF gespeichert · E-Mail wird geöffnet','ok');
  }catch(e){console.error(e);toast('Fehler: '+e.message,'err');}
}


// ═══════════════════════════════════════════════════════════════
// UMSATZSTEUER — НДС УЧЁТ
// ═══════════════════════════════════════════════════════════════

let _ustSaving = false;
function saveUstMode(){
  if(_ustSaving) return;
  const sel = document.querySelector('input[name="ust-mode"]:checked');
  if(!sel) return;
  const yr = document.getElementById('ust-yr')?.value || new Date().getFullYear()+'';
  if(!data.ustModeByYear) data.ustModeByYear={};
  data.ustModeByYear[yr] = sel.value;
  sbSaveUstMode(yr, sel.value);
  _ustSaving = true;
  updateMwstFormVisibility();
  renderUst();
  _ustSaving = false;
  toast(sel.value==='§19'
    ? `✅ ${yr}: §19 Kleinunternehmer gesetzt`
    : `📊 ${yr}: MwSt gesetzt`, 'ok');
}




function getUstMode(yr){
  if(!yr){ const el=document.getElementById('ust-yr'); yr=el?el.value:new Date().getFullYear()+''; }
  return getUstModeForYear(yr);
}

function renderUst(){
  if(!data.ustEintraege) data.ustEintraege = [];

  // ── Список лет ────────────────────────────────────────────────────────────
  const years = [...new Set([
    ...data.eintraege.map(e=>e.datum.substring(0,4)),
    ...data.ustEintraege.map(e=>e.datum.substring(0,4)),
    new Date().getFullYear()+''
  ])].sort().reverse();

  const yrSel = document.getElementById('ust-yr');
  if(yrSel){
    const cur = yrSel.value || years[0];
    yrSel.innerHTML = years.map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
  }
  const yr = yrSel ? yrSel.value : years[0];

  // ── Обзор всех лет — строка бейджей ──────────────────────────────────────
  const overviewEl = document.getElementById('ust-years-overview');
  if(overviewEl){
    overviewEl.innerHTML = years.map(y=>{
      const m = getUstModeForYear(y);
      const isK = m==='§19';
      const active = y===yr;
      const einY = data.eintraege.filter(e=>e.datum.startsWith(y)&&e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
      return `<div onclick="document.getElementById('ust-yr').value='${y}';renderUst()"
        style="cursor:pointer;padding:12px 18px;border-radius:var(--r);border:2px solid ${active?(isK?'var(--green)':'var(--blue)'):'var(--border)'};
        background:${active?(isK?'rgba(34,197,94,.08)':'rgba(59,130,246,.08)'):'var(--s2)'};
        min-width:130px;transition:all .15s">
        <div style="font-size:18px;font-weight:800;color:var(--text)">${y}</div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;
            background:${isK?'rgba(34,197,94,.15)':'rgba(59,130,246,.15)'};
            color:${isK?'var(--green)':'var(--blue)'}">
            ${isK?'§19':'MwSt'}
          </span>
        </div>
        <div style="font-size:12px;color:var(--sub);margin-top:4px;font-family:var(--mono)">${fmt(einY)}</div>
      </div>`;
    }).join('');
  }

  // ── Режим для выбранного года ─────────────────────────────────────────────
  const mode = getUstModeForYear(yr);
  const isRegel = mode !== '§19';

  // Set radio without triggering onclick (use _ustSaving guard)
  _ustSaving = true;
  const modeEl = document.querySelector('input[name="ust-mode"][value="'+mode+'"]');
  if(modeEl) modeEl.checked = true;
  _ustSaving = false;

  const yrLabel = document.getElementById('ust-mode-yr-label');
  if(yrLabel) yrLabel.textContent = yr;

  const lblK = document.getElementById('ust-lbl-klein');
  const lblR = document.getElementById('ust-lbl-regel');
  if(lblK && lblR){
    if(isRegel){
      lblR.style.borderColor='var(--blue)'; lblR.style.background='rgba(59,130,246,.07)';
      lblK.style.borderColor='transparent'; lblK.style.background='transparent';
    } else {
      lblK.style.borderColor='var(--green)'; lblK.style.background='rgba(34,197,94,.07)';
      lblR.style.borderColor='transparent'; lblR.style.background='transparent';
    }
  }

  const hint = document.getElementById('ust-mode-hint');
  if(hint) hint.innerHTML = isRegel
    ? '<span style="color:var(--blue);font-size:12px">📊 USt 19%/7% wird auf Einnahmen erhoben. Vorsteuer aus Ausgaben wird gegengerechnet. Monatliche oder quartalsweise Voranmeldung beim Finanzamt erforderlich.</span>'
    : '<span style="color:var(--green);font-size:12px">✅ Keine Umsatzsteuer auf Rechnungen. Keine Voranmeldung nötig. Hinweis auf §19 UStG in jede Rechnung aufnehmen.</span>';

  // ── Показываем нужный контент ─────────────────────────────────────────────
  const kleinInfo  = document.getElementById('ust-klein-info');
  const regelCards = document.getElementById('ust-cards');
  const quartalSec = document.getElementById('ust-quartal-section');
  const buchSec    = document.getElementById('ust-buchungen-section');

  if(kleinInfo) kleinInfo.style.display = isRegel ? 'none' : '';
  if(regelCards) regelCards.style.display = isRegel ? 'grid' : 'none';
  if(quartalSec) quartalSec.style.display = isRegel ? (isMob()?'none':'') : 'none';
  if(buchSec)    buchSec.style.display    = isRegel ? '' : 'none';

  // ── §19 — показываем статистику Einnahmen ─────────────────────────────────
  if(!isRegel){
    const kleinStats = document.getElementById('ust-klein-stats');
    if(kleinStats){
      const einY  = data.eintraege.filter(e=>e.datum.startsWith(yr)&&e.typ==='Einnahme').reduce((s,e)=>s+e.betrag,0);
      const ausY  = data.eintraege.filter(e=>e.datum.startsWith(yr)&&e.typ==='Ausgabe').reduce((s,e)=>s+e.betrag,0);
      const limit = 22000;
      const pct   = Math.min(100, Math.round(einY/limit*100));
      const over  = einY > limit;
      kleinStats.innerHTML = `
        <div>
          <div style="font-size:11px;color:var(--sub)">Einnahmen ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--mono)">${fmt(einY)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--sub)">Ausgaben ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--mono)">${fmt(ausY)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--sub)">Gewinn ${yr}</div>
          <div style="font-size:20px;font-weight:800;color:var(--green);font-family:var(--mono)">${fmt(einY-ausY)}</div>
        </div>
        <div style="flex:1;min-width:160px">
          <div style="font-size:11px;color:var(--sub);margin-bottom:6px">KU-Grenze (22.000 €)</div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:8px;border-radius:4px;width:${pct}%;background:${over?'var(--red)':'var(--green)'};transition:width .4s"></div>
          </div>
          <div style="font-size:11px;margin-top:4px;color:${over?'var(--red)':'var(--sub)'}">
            ${pct}% genutzt ${over?'⚠️ Grenze überschritten!':''}
          </div>
        </div>`;
    }
    return;
  }



  // ── Regelbesteuerung: собираем все операции ───────────────────────────────
  const rechMwst = (data.rechnungen||[])
    .filter(r => r.datum && r.datum.startsWith(yr) && r.mwstMode==='regel' && r.mwstBetrag > 0)
    .map(r => ({
      id:'r_'+r.id, datum:r.datum,
      beschreibung:'Rechnung '+r.nr+(r.kunde?' — '+r.kunde:''),
      typ:'ust',
      netto: r2(r.netto || (r.betrag-(r.mwstBetrag||0))),
      rate: r.mwstRate||19, mwstBetrag:r.mwstBetrag,
      brutto:r.betrag, quelle:'Rechnung'
    }));

  // Все записи года — если MwSt не сохранён явно, считаем из betrag по 19%
  const eintrMwst = data.eintraege
    .filter(e => e.datum.startsWith(yr))
    .map(e => {
      const isEin = e.typ==='Einnahme';
      // Если поля MwSt уже есть — берём их, иначе считаем из betrag
      const rate    = e.mwstRate || e.vorsteuerRate || 19;
      const hasSaved = isEin ? (e.mwstBetrag > 0) : (e.vorsteuerBet > 0);
      let mwstBetrag, netto;
      if(hasSaved){
        mwstBetrag = isEin ? e.mwstBetrag : e.vorsteuerBet;
        netto      = r2(e.nettoBetrag || (e.betrag - mwstBetrag));
      } else {
        // betrag = Brutto → считаем MwSt обратным методом
        mwstBetrag = r2(e.betrag * rate / (100 + rate));
        netto      = r2(e.betrag - mwstBetrag);
      }
      return {
        id:'e_'+e.id, datum:e.datum,
        beschreibung: e.beschreibung||e.kategorie,
        typ: isEin ? 'ust' : 'vorsteuer',
        netto, rate, mwstBetrag,
        brutto: e.betrag, quelle:'Eintrag'
      };
    });

  // устаревшие ручные записи — только те которых нет в eintrMwst
  const eintrIds = new Set(eintrMwst.map(x=>x.id));
  const manualMwst = (data.ustEintraege||[])
    .filter(e => e.datum && e.datum.startsWith(yr))
    .filter(e => {
      const derivedId = 'e_'+(e.id||'').replace(/_ust$|_vs$/,'');
      return !eintrIds.has(derivedId) && !eintrIds.has('e_'+e.id);
    })
    .map(e => ({
      id:e.id, datum:e.datum,
      beschreibung:e.beschreibung||'—',
      typ:e.typ,
      netto: e.typ==='vorsteuer' ? r2(e.netto||0) : r2((e.netto||0) || (e.betrag/(1+(e.rate||19)/100))),
      rate: e.rate||19,
      mwstBetrag: r2(parseFloat(e.betrag)||0),
      brutto: e.typ==='vorsteuer' ? r2((e.netto||0)+(parseFloat(e.betrag)||0)) : r2(parseFloat(e.betrag)||0),
      quelle:'Manual'
    }));

  const allMwst = [...rechMwst,...eintrMwst,...manualMwst]
    .sort((a,b)=>a.datum.localeCompare(b.datum));

  const totUst  = r2(allMwst.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.mwstBetrag,0));
  const totVorst= r2(allMwst.filter(e=>e.typ==='vorsteuer').reduce((s,e)=>s+e.mwstBetrag,0));
  const totZahl = r2(totUst-totVorst);
  const totNetto= r2(allMwst.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.netto,0));

  // ── Карточки 2x2 ──────────────────────────────────────────────────────────
  if(regelCards){
    regelCards.style.cssText = 'display:grid!important;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px';
    regelCards.innerHTML = `
    <div class="sc b" style="cursor:default">
      <div class="sc-lbl">Доходы нетто</div>
      <div class="sc-val">${fmt(totNetto)}</div>
      <div class="sc-sub">ohne USt ${yr}</div>
    </div>
    <div class="sc r" style="cursor:default">
      <div class="sc-lbl">USt-Ausgang</div>
      <div class="sc-val" style="color:var(--red)">${fmt(totUst)}</div>
      <div class="sc-sub">schulde ich dem FA</div>
    </div>
    <div class="sc g" style="cursor:default">
      <div class="sc-lbl">Входящий НДС</div>
      <div class="sc-val" style="color:var(--green)">${fmt(totVorst)}</div>
      <div class="sc-sub">erhalte ich vom FA</div>
    </div>
    <div class="sc ${totZahl>0?'r':'g'}" style="cursor:default">
      <div class="sc-lbl">Налоговое бремя</div>
      <div class="sc-val" style="color:${totZahl>0?'var(--red)':'var(--green)'}">
        ${totZahl>0?'+':''}${fmt(totZahl)}
      </div>
      <div class="sc-sub">${totZahl>0?'zahlen ans FA':'Erstattung vom FA'}</div>
    </div>`;
  }

  // ── Квартальная сводка ─────────────────────────────────────────────────────
  const qtbody = document.getElementById('ust-quartal-tbody');
  const qtfoot = document.getElementById('ust-quartal-tfoot');
  if(qtbody){
    const quarters = [1,2,3,4].map(q=>{
      const ms = [(q-1)*3+1,(q-1)*3+2,(q-1)*3+3];
      const qE = allMwst.filter(e=>ms.includes(parseInt(e.datum.substring(5,7))));
      const ust  = r2(qE.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.mwstBetrag,0));
      const vst  = r2(qE.filter(e=>e.typ==='vorsteuer').reduce((s,e)=>s+e.mwstBetrag,0));
      const netto= r2(qE.filter(e=>e.typ==='ust').reduce((s,e)=>s+e.netto,0));
      const zl   = r2(ust-vst);
      return {q,ust,vst,netto,zl,any:ust>0||vst>0};
    });
    qtbody.innerHTML = quarters.map(q=>`
      <tr style="${!q.any?'opacity:.35':''}">
        <td><strong>Q${q.q} ${yr}</strong></td>
        <td style="text-align:right;font-family:var(--mono)">${q.netto>0?fmt(q.netto):'—'}</td>
        <td style="text-align:right;font-family:var(--mono);color:var(--red)">${q.ust>0?'+'+fmt(q.ust):'—'}</td>
        <td style="text-align:right;font-family:var(--mono);color:var(--green)">${q.vst>0?'-'+fmt(q.vst):'—'}</td>
        <td style="text-align:right;font-family:var(--mono);font-weight:700;color:${q.zl>0?'var(--red)':'var(--green)'}">
          ${q.any?(q.zl>0?'+':'')+fmt(q.zl):'—'}
        </td>
      </tr>`).join('');
    if(qtfoot) qtfoot.innerHTML = `<tr style="background:var(--s2);font-weight:700">
      <td style="padding:8px 20px">Gesamt ${yr}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmt(totNetto)}</td>
      <td style="text-align:right;font-family:var(--mono);color:var(--red)">${totUst>0?'+'+fmt(totUst):'—'}</td>
      <td style="text-align:right;font-family:var(--mono);color:var(--green)">${totVorst>0?'-'+fmt(totVorst):'—'}</td>
      <td style="text-align:right;font-family:var(--mono);font-weight:800;color:${totZahl>0?'var(--red)':'var(--green)'}">
        ${totZahl>0?'+':''}${fmt(totZahl)}
      </td>
    </tr>`;
  }

  // ── Таблица операций с пагинацией (20 строк) ─────────────────────────────
  const dtbody = document.getElementById('ust-detail-tbody');
  const tfoot  = document.getElementById('ust-tfoot');
  const empty  = document.getElementById('ust-empty');
  const PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(allMwst.length / PER_PAGE));
  if(ustPage > totalPages) ustPage = totalPages;
  if(ustPage < 1) ustPage = 1;

  if(!allMwst.length){
    if(dtbody) dtbody.innerHTML='';
    if(tfoot)  tfoot.innerHTML='';
    if(empty)  empty.style.display='';
  } else {
    if(empty) empty.style.display='none';
    const pageItems = allMwst.slice((ustPage-1)*PER_PAGE, ustPage*PER_PAGE);
    if(dtbody){
      let lastQ=0;
      dtbody.innerHTML = pageItems.map(e=>{
        const m=parseInt(e.datum.substring(5,7));
        const q=Math.ceil(m/3);
        let sep='';
        if(q!==lastQ){
          lastQ=q;
          sep=`<tr style="background:var(--s2)">
            <td colspan="7" style="font-size:11px;font-weight:700;color:var(--sub);padding:5px 20px;text-transform:uppercase;letter-spacing:.5px">Q${q} ${yr}</td>
          </tr>`;
        }
        const isUst=e.typ==='ust', canDel=e.quelle==='Manual';
        // Дата: 26.03.26 вместо 26.03.2026
        const shortDat = e.datum.substring(8,10)+'.'+e.datum.substring(5,7)+'.'+e.datum.substring(2,4);
        return sep+`<tr>
          <td style="font-size:12px;color:var(--sub);font-family:var(--mono);white-space:nowrap">${shortDat}</td>
          <td class="mob-hide" style="text-align:center">
            <span class="badge ${isUst?'b-aus':'b-ein'}" style="font-size:10px">${isUst?'🟠 USt':'🔵 Vorst.'}</span>
          </td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--sub)">${e.netto>0?fmt(e.netto):'—'}</td>
          <td style="text-align:right;font-size:11px;color:var(--sub)">${e.rate}%</td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:${isUst?'var(--red)':'var(--green)'}">${isUst?'+':'-'}${fmt(e.mwstBetrag)}</td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px">${e.brutto>0?fmt(e.brutto):'—'}</td>
          <td class="mob-hide">${canDel?`<button class="del-btn" onclick="delUstEintrag('${e.id}')">✕</button>`:''}</td>
        </tr>`;
      }).join('');
    }
    if(tfoot){
      const from=(ustPage-1)*PER_PAGE+1, to=Math.min(ustPage*PER_PAGE,allMwst.length);
      const pager = totalPages>1 ? `<tr><td colspan="7" style="padding:8px 12px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage=1;renderUst()" ${ustPage===1?'disabled':''}>«</button>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage--;renderUst()" ${ustPage===1?'disabled':''}>‹</button>
          <span style="font-size:12px;color:var(--sub)">Seite ${ustPage} / ${totalPages} &nbsp;(${from}–${to} von ${allMwst.length})</span>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage++;renderUst()" ${ustPage===totalPages?'disabled':''}>›</button>
          <button class="btn" style="padding:4px 10px;font-size:11px" onclick="ustPage=${totalPages};renderUst()" ${ustPage===totalPages?'disabled':''}>»</button>
        </div>
      </td></tr>` : '';
      tfoot.innerHTML=`<tr style="background:var(--s2);font-weight:700">
        <td colspan="4" style="padding:8px 20px">Gesamt ${yr}</td>
        <td style="text-align:right;font-family:var(--mono);color:${totZahl>0?'var(--red)':'var(--green)'}">
          ${totZahl>0?'+':''}${fmt(totZahl)}
        </td>
        <td colspan="2"></td>
      </tr>${pager}`;
    }
  }
}
function addUstEintrag(){
  const datum = document.getElementById('ust-new-dat').value;
  const typ   = document.getElementById('ust-new-typ').value;
  const bet   = parseFloat(document.getElementById('ust-new-bet').value);
  const rate  = parseFloat(document.getElementById('ust-new-rate').value)||0;
  const dsc   = document.getElementById('ust-new-dsc').value.trim();
  if(!datum) return toast('Datum eingeben!','err');
  if(!bet||bet<=0) return toast('Betrag eingeben!','err');
  if(!data.ustEintraege) data.ustEintraege=[];
  data.ustEintraege.push({
    id: Date.now()+'',
    datum, typ, betrag: bet, rate, beschreibung: dsc
  });
  renderUst();
  document.getElementById('ust-new-bet').value='';
  document.getElementById('ust-new-dsc').value='';
  toast('✅ USt-Eintrag gespeichert','ok');
}

function delUstEintrag(id){
  if(!confirm('Eintrag löschen?')) return;
  data.ustEintraege = (data.ustEintraege||[]).filter(e=>e.id!==id);
  renderUst();
  toast('Gelöscht','err');
}

