// ── CONFIG ────────────────────────────────────────────────────────────────
const SK='buch_pro_v1';
const KE=['Dienstleistung','Honorar','Warenverkauf','Miete (Einnahme)','Zinsen/Dividenden','Erstattung','Sonstiges Einnahme'];
const KA=['Büromaterial','Software / IT','Telefon / Internet','Fahrtkosten','Miete / Büro','Marketing / Werbung','Fortbildung','Versicherung','Bankgebühren','Steuern / Abgaben','Hardware','Fremdleistungen','Bewirtung','Sonstiges Ausgabe'];
const ZAHL=['Überweisung','Barzahlung','PayPal','EC-Karte','Lastschrift','Sonstiges'];
const ZICONS={'Überweisung':'<i class="fas fa-university"></i>','Barzahlung':'<i class="fas fa-solid fa-euro-sign"></i>','PayPal':'<i class="fa-brands fa-paypal"></i>','EC-Karte':'<i class="fas fa-credit-card"></i>','Lastschrift':'<i class="fas fa-exchange-alt"></i>','Sonstiges':'<i class="fas fa-solid fa-euro-sign"></i>'};
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
function r2(n){ const v=parseFloat(n); return isNaN(v)?0:Math.round(v*100)/100; }

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
  if (!data.angebote)     data.angebote = [];
  if (!data.rechnungen)   data.rechnungen = [];
  if (!data.kunden)       data.kunden = [];
  if (!data.produkte)     data.produkte = [];
  if (!data.ustEintraege) data.ustEintraege = [];
  if (!data.ustModeByYear) data.ustModeByYear = {};
  if (!data.wiederkehrend) data.wiederkehrend = [];
  if (!data.rechnungenLog) data.rechnungenLog = [];
  // Migrate old ustMode
  if (data.ustMode) {
    const oldMode = data.ustMode;
    if (Object.keys(data.ustModeByYear).length === 0) {
      const curYr = new Date().getFullYear() + '';
      data.ustModeByYear[curYr] = oldMode;
    }
    delete data.ustMode;
  }
  // Синхронизация: создаём Einnahmen для bezahlt Rechnungen без Einnahme
  if(data.rechnungen && data.eintraege !== undefined && typeof _buchRechnungAlsEinnahme === 'function'){
    let _synced = 0;
    (data.rechnungen||[]).filter(r=>r.status==='bezahlt').forEach(r=>{
      const e = _buchRechnungAlsEinnahme(r);
      if(e) _synced++;
    });
    if(_synced > 0) console.log(`[Sync] ${_synced} Rechnung(en) als Einnahme nachgebucht`);
  }
  appInit();
});
let curTyp='Einnahme', fTyp='Alle', sortCol='datum', sortAsc=false;
let fileHandle=null, asOn=false, asTimer=null, curPage='dashboard';
// <i class="fas fa-check-circle" style="color:var(--green)"></i> Переменные для сортировки Dashboard "Letzte 10"
let dashSortCol='datum', dashSortAsc=false;
// <i class="fas fa-check-circle" style="color:var(--green)"></i> Переменные для пагинации Einträge
let einPage=1, einPerPage=10;
let zPage=1, zPerPage=10;  // Пагинация für Zahlungsarten
let zSortCol='datum', zSortAsc=false;  // Сортировка Zahlungsarten
let ustPage=1;              // Пагинация для USt-Buchungen

// ── INIT — вызывается после загрузки данных из Supabase ──────────────────

// ── NAV GROUP TOGGLE ─────────────────────────────────────────
function toggleNavGroup(groupId, headerId) {
  const group  = document.getElementById(groupId);
  const header = headerId ? document.getElementById(headerId) : group?.previousElementSibling;
  if (!group) return;
  const isOpen = group.classList.contains('open');
  group.classList.toggle('open', !isOpen);
  if (header) header.classList.toggle('open', !isOpen);
}

// Открываем группу Aufträge при переходе в Angebote / Rechnungen / Wiederkehrend
function openNavGroupIfNeeded(id) {
  if (['angebote','angebote-form','rechnungen'].includes(id)) {
    const group  = document.getElementById('auftraege-group');
    const header = document.getElementById('auftraege-header');
    if (group && !group.classList.contains('open')) {
      group.classList.add('open');
      if (header) header.classList.add('open');
    }
  }
}

function appInit(){
  document.getElementById('nf-dat').value=new Date().toISOString().split('T')[0];
  updateKatSel(); buildYearFilters(); renderAll();
  updateMwstFormVisibility();
  setTyp(curTyp);
  // Группа Aufträge открывается при переходе в неё
  setTimeout(()=>{
    const today=new Date().toISOString().split('T')[0];
    const due=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);
    if(due.length) toast(`<i class="fas fa-sync-alt"></i> ${due.length} ${'wiederkehrende Zahlung'}${due.length>1?'en':''} ${'fällig!'}`, 'ok');
  },800);
}

function buildYearFilters(){
  const js=[...new Set((data.eintraege||[]).filter(e=>e.datum).map(e=>e.datum.substring(0,4)))].sort().reverse();
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

// Все записи без сторно — используется во всех расчётах
function activeEintraege() {
  return (data.eintraege || []).filter(e => !e.is_storno && !e._storniert);
}

// Bezahlte Rechnungen als virtuelle Einnahmen —
// gibt nur solche zurück die KEINEN echten Einnahme-Eintrag haben
function rechAlsEinnahmen(filterDatum) {
  const rech = (data.rechnungen || []).filter(r => r.status === 'bezahlt');
  const aktiveE = activeEintraege();
  return rech
    .filter(r => {
      // Kein echter Einnahme-Eintrag für diese Rechnung vorhanden
      const hat = aktiveE.some(e =>
        e.typ === 'Einnahme' &&
        e.beschreibung && e.beschreibung.includes(`Rechnung ${r.nr}:`)
      );
      if (hat) return false;
      if (filterDatum && r.datum && !r.datum.startsWith(filterDatum)) return false;
      return true;
    })
    .map(r => ({
      id: '__rech__' + r.id,
      datum: r.datum || '',
      typ: 'Einnahme',
      kategorie: r.kategorie || 'Dienstleistung',
      zahlungsart: r.zahlungsart || 'Überweisung',
      beschreibung: `Rechnung ${r.nr}: ${r.beschreibung || r.kunde || ''}`,
      betrag: r.betrag,
      nettoBetrag: r.netto || r.betrag,
      mwstBetrag: r.mwstBetrag || 0,
      mwstRate: r.mwstRate || 0,
      _fromRechnung: true,
    }));
}

// Einträge + bezahlte Rechnungen (ohne Doppelzählung)
function activeEintraegeMitRech(yr) {
  const eintr = yr ? activeEintraege().filter(e => e.datum && e.datum.startsWith(yr)) : activeEintraege();
  const rVirt = rechAlsEinnahmen(yr);
  return [...eintr, ...rVirt];
}

// ── NAV ───────────────────────────────────────────────────────────────────
function nav(id, el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  openNavGroupIfNeeded(id);
  el.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('p-'+id).classList.add('active');
  curPage=id;
  if(id==='bericht') renderRep();
  if(id==='zahlungen') renderZ();
  if(id==='dashboard') renderDash();
  if(id==='journal') renderJournal();
  if(id==='prognose') renderProg();
  if(id==='kategorien') renderKat();
  if(id==='angebote') renderAngebote();
  if(id==='angebote-form') { updateAngBanner(); recalcAngSumme(); }
  if(id==='rechnungen') renderRech();
  if(id==='kunden') renderKunden();
  if(id==='produkte') renderProdukte();
  if(id==='ust') renderUst();
  if(id==='wiederkehrend') renderWied();
  if(id==='neu') updateNeuToolbar(false);
}

// ── AUTOSAVE (облако — сохраняется автоматически через persist) ──────────

// ── Единая функция пагинации — всегда занимает место ──────────────────────
function renderPager(containerId, page, totalPages, total, onPageChange){
  const el = document.getElementById(containerId);
  if(!el) return;

  const perPage = totalPages>0 ? Math.ceil(total/totalPages) : total;
  const from = total===0 ? 0 : (page-1)*perPage+1;
  const to   = total===0 ? 0 : Math.min(page*perPage, total);

  // Всегда 5 цифровых слотов фиксированной ширины
  const SLOTS = 5;
  let startPage = Math.max(1, page - Math.floor(SLOTS/2));
  let endPage   = startPage + SLOTS - 1;
  if(endPage > totalPages){ endPage = totalPages; startPage = Math.max(1, endPage - SLOTS + 1); }

  // Стрелки — всегда одинаковые визуально, просто onclick=noop на границах
  const prevCb = page > 1        ? `${onPageChange}(${page-1})` : 'void(0)';
  const nextCb = page < totalPages ? `${onPageChange}(${page+1})` : 'void(0)';

  let slots = '';
  for(let s=0; s<SLOTS; s++){
    const pg = startPage + s;
    if(pg < 1 || pg > totalPages){
      // Пустой слот — невидим, но полностью такой же элемент
      slots += `<button class="btn pager-btn pager-slot-empty" onclick="void(0)"></button>`;
    } else {
      slots += `<button class="btn pager-btn${pg===page?' pager-btn-cur':''}" onclick="${onPageChange}(${pg})">${pg}</button>`;
    }
  }

  el.innerHTML=`<div class="pager">
    <div class="pager-btns">
      <button class="btn pager-btn pager-nav" onclick="${prevCb}">‹</button>
      ${slots}
      <button class="btn pager-btn pager-nav" onclick="${nextCb}">›</button>
    </div>
    <span class="pager-count">${total===0?'0':from+'–'+to} / ${total}</span>
  </div>`;
}
