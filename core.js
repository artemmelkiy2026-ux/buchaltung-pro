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
// <i class="fas fa-check-circle" style="color:var(--green)"></i> Переменные для сортировки Dashboard "Letzte 10"
let dashSortCol='datum', dashSortAsc=false;
// <i class="fas fa-check-circle" style="color:var(--green)"></i> Переменные для пагинации Einträge
let einPage=1, einPerPage=10;
let zPage=1, zPerPage=10;  // Пагинация für Zahlungsarten
let zSortCol='datum', zSortAsc=false;  // Сортировка Zahlungsarten
let ustPage=1;              // Пагинация для USt-Buchungen

// ── INIT — вызывается после загрузки данных из Supabase ──────────────────
function appInit(){
  document.getElementById('nf-dat').value=new Date().toISOString().split('T')[0];
  updateKatSel(); buildYearFilters(); renderAll();
  updateMwstFormVisibility();
  setTyp(curTyp);
  setTimeout(()=>{
    const today=new Date().toISOString().split('T')[0];
    const due=(data.wiederkehrend||[]).filter(w=>w.naechste<=today);
    if(due.length) toast(`<i class="fas fa-sync-alt"></i> ${due.length} ${'wiederkehrende Zahlung'}${due.length>1?'en':''} ${'fällig!'}`, 'ok');
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

// Все записи без сторно — используется во всех расчётах
function activeEintraege() {
  return (data.eintraege || []).filter(e => !e.is_storno && !e._storniert);
}

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
  if(id==='journal') renderJournal();
  if(id==='prognose') renderProg();
  if(id==='kategorien') renderKat();
  if(id==='rechnungen') renderRech();
  if(id==='kunden') renderKunden();
  if(id==='ust') renderUst();
  if(id==='wiederkehrend') renderWied();
  if(id==='neu') updateNeuToolbar(false);
}

// ── AUTOSAVE (облако — сохраняется автоматически через persist) ──────────

// ── Единая функция пагинации — всегда занимает место ──────────────────────
function renderPager(containerId, page, totalPages, total, onPageChange){
  const el = document.getElementById(containerId);
  if(!el) return;
  // Счётчик всегда показывается
  const from = total===0 ? 0 : (page-1)*Math.ceil(total/totalPages)+1;
  const to   = total===0 ? 0 : Math.min(page*Math.ceil(total/totalPages), total);
  const counter = `<span class="pager-count">${total===0?'0':from+'–'+to} / ${total}</span>`;

  if(totalPages<=1){
    // Кнопки скрыты но счётчик держит высоту
    el.innerHTML=`<div class="pager"><div class="pager-btns pager-btns-hidden"></div>${counter}</div>`;
    return;
  }
  const btn=(label,pg,disabled,title='')=>
    `<button class="btn pager-btn${disabled?' pager-btn-dis':''}" ${disabled?'disabled':''} onclick="${onPageChange}(${pg})" title="${title}">${label}</button>`;

  let pages='';
  const start=Math.max(1,page-2), end=Math.min(totalPages,page+2);
  if(start>1) pages+=btn('1',1,false);
  if(start>2) pages+=`<span class="pager-ellipsis">…</span>`;
  for(let i=start;i<=end;i++) pages+=`<button class="btn pager-btn${i===page?' pager-btn-cur':''}" onclick="${onPageChange}(${i})">${i}</button>`;
  if(end<totalPages-1) pages+=`<span class="pager-ellipsis">…</span>`;
  if(end<totalPages) pages+=btn(totalPages,totalPages,false);

  el.innerHTML=`<div class="pager">
    <div class="pager-btns">
      ${btn('‹',page-1,page===1,'Zurück')}
      ${pages}
      ${btn('›',page+1,page===totalPages,'Weiter')}
    </div>
    ${counter}
  </div>`;
}
