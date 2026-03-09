/**
 * ru.js — Система двуязычности DE/RU для Buchaltung Pro
 */

const DICT_RU = {
  'Dashboard':'Главная',
  'Einträge':'Операции',
  'Monatsbericht':'Отчёт за месяц',
  'Zahlungsarten':'Способы оплаты',
  'Neuer Eintrag':'Новая запись',
  'Prognose':'Прогноз',
  'Kategorien':'Категории',
  'Rechnungen':'Счета',
  'Wiederkehrend':'Регулярные платежи',
  'Steuererklärung':'Налоговая декларация',
  'Hauptmenü':'Главное меню',
  'Tools':'Инструменты',
  'Analyse':'Аналитика',
  'Finanzamt':'Налоговая (Finanzamt)',
  'Mehr':'Ещё',
  'Abbrechen':'Отмена',
  'Speichern':'Сохранить',
  'Löschen':'Удалить',
  'Bearbeiten':'Редактировать',
  'Buchen':'Провести',
  'Alle fälligen buchen':'Провести все',
  'Neu':'Новый',
  'Ja':'Да',
  'Nein':'Нет',
  'Alle':'Все',
  'Alle Jahre':'Все годы',
  'Suche...':'Поиск...',
  'Öffnen':'Открыть',
  'Speichern als…':'Сохранить как…',
  'Autospeichern':'Автосохранение',
  'Ein (5 Min)':'Вкл. (5 мин)',
  'Aus.':'Выкл.',
  'Datum':'Дата',
  'Typ':'Тип',
  'Betrag':'Сумма',
  'Beschreibung':'Описание',
  'Notiz':'Заметка',
  'Notiz (optional)':'Заметка (необязательно)',
  'Kategorie':'Категория',
  'Zahlungsart':'Способ оплаты',
  'Zahlung':'Оплата',
  'Zahl':'Оплата',
  'Status':'Статус',
  'Monat':'Месяц',
  'Jahr':'Год',
  'Intervall':'Интервал',
  'Bezeichnung':'Название',
  'Kunde':'Клиент',
  'Kunde / Beschreibung':'Клиент / Описание',
  'Kat.':'Кат.',
  'Beschr.':'Описание',
  'Nr.':'№',
  'Anteil':'Доля',
  'Bundesland':'Федеральная земля',
  'Tarif':'Тариф',
  'Einnahme':'Доход',
  'Ausgabe':'Расход',
  'Einnahmen':'Доходы',
  'Ausgaben':'Расходы',
  'Gewinn':'Прибыль',
  'Einträge gesamt':'Всего записей',
  'Einnahmen gesamt':'Всего доходов',
  'Ausgaben gesamt':'Всего расходов',
  'Letzte 10 Einträge':'Последние 10 операций',
  'Keine Einträge':'Нет записей',
  'Keine Einträge gefunden':'Записи не найдены',
  'Keine Daten':'Нет данных',
  'Keine Rechnungen':'Нет счетов',
  'Keine fälligen Zahlungen':'Нет просроченных платежей',
  'Kumuliert':'Накопленным итогом',
  'Bester Monat':'Лучший месяц',
  'Jahresgewinn':'Годовая прибыль',
  'Brutto Gewinn':'Валовая прибыль',
  'Gewinn (EÜR)':'Прибыль (EÜR)',
  'Kumuliert (EUR)':'Накоплено (€)',
  'Einnahmen (EUR)':'Доходы (€)',
  'Ausgaben (EUR)':'Расходы (€)',
  'Betrag (EUR)':'Сумма (€)',
  'Überweisung':'Банковский перевод',
  'Barzahlung':'Наличные',
  'EC-Karte':'Банковская карта',
  'Lastschrift':'Прямой дебет (Lastschrift)',
  'Sonstiges':'Прочее',
  'Dienstleistung':'Услуги',
  'Warenverkauf':'Продажа товаров',
  'Miete (Einnahme)':'Аренда (доход)',
  'Zinsen/Dividenden':'Проценты / Дивиденды',
  'Sonstiges Einnahme':'Прочие доходы',
  'Miete / Büro':'Аренда / Офис',
  'Marketing / Werbung':'Маркетинг / Реклама',
  'Telefon / Internet':'Телефон / Интернет',
  'Software / IT':'ПО / IT',
  'Büromaterial':'Канцтовары',
  'Versicherung':'Страхование',
  'Steuern / Abgaben':'Налоги / Сборы',
  'Bankgebühren':'Банковские комиссии',
  'Bewirtung':'Представительские расходы',
  'Berufliche Weiterbildung':'Проф. обучение',
  'AfA (Abschreibung)':'Амортизация (AfA)',
  'Spenden':'Пожертвования',
  'Hardware':'Оборудование (Hardware)',
  'Fortbildung':'Повышение квалификации',
  'Betriebsausgaben':'Операционные расходы',
  'Betriebseinnahmen':'Операционные доходы',
  'Offen':'К оплате',
  'Bezahlt':'Оплачен',
  'Überfällig':'Просрочен',
  '🟡 Offen':'🟡 К оплате',
  '🟢 Bezahlt':'🟢 Оплачен',
  '🔴 Überfällig':'🔴 Просрочен',
  'Rechnungs-Nr.':'Номер счёта',
  'Rechnungsdatum':'Дата счёта',
  'Fällig am':'Срок оплаты',
  'Monatlich':'Ежемесячно',
  'Quartalsweise':'Ежеквартально',
  'Jährlich':'Ежегодно',
  'gebucht!': 'проведено!',
  'Zahlungen gebucht!': 'платежей проведено!',
  'Keine fälligen Zahlungen': 'Нет просроченных платежей',
  // Buttons & Status
  'Einnahme': 'Доход',
  'Ausgabe': 'Расход',
  'Monatlich': 'Ежемесячно',
  'Quartalsweise': 'Ежеквартально',
  'Jährlich': 'Ежегодно',
  'fällig': 'просрочен',
  'fällig!': 'просрочен!',
  'Einnahme': 'Доход',
  'Ausgabe': 'Расход',
  'gespeichert': 'сохранен', // для Дохода получится "Доход сохранен"
  
  
  // Nachrichten & Toast
  'Alle Felder ausfüllen!': 'Заполните все поля!',
  '✅ Vorlage gespeichert!': '✅ Шаблон сохранён!',
  'Vorlage löschen?': 'Удалить шаблон?',
  'Gelöscht': 'Удалено',
  'Keine Daten': 'Нет данных',
  'CSV exportiert!': 'CSV экспортирован!',
  '📤 Jahresbericht exportiert!': '📤 Годовой отчёт экспортирован!',
  'gebucht!': 'проведено!',
  'Keine fälligen Zahlungen': 'Нет просроченных платежей',
  'Zahlungen gebucht!': 'платежей проведено!',
  
  // Tabellenköpfe & CSV
  'Datum': 'Дата',
  'Typ': 'Тип',
  'Kategorie': 'Категория',
  'Beschreibung': 'Описание',
  'Zahlungsart': 'Способ оплаты',
  'Notiz': 'Заметка',
  'Betrag (EUR)': 'Сумма (€)',
  'Monat': 'Месяц',
  'Einnahmen (EUR)': 'Доходы (€)',
  'Ausgaben (EUR)': 'Расходы (€)',
  'Gewinn (EUR)': 'Прибыль (€)',
  'Kumuliert (EUR)': 'Накоплено (€)',
  'Einträge': 'Записи',
  'GESAMT': 'ИТОГО',
'fällige Zahlung': 'просроченный платёж',
  'en': 'а', // получится "2 платеж-а"
  'fällig!': 'просрочен!',
  'klicke "Alle fälligen buchen"!': 'нажмите "Провести все ожидающие"!',
  'fällig': 'просрочен',
  'Einnahme': 'Доход',
  'Ausgabe': 'Расход',
  // Spezielle Plural-Logik
  'fällige Zahlung': 'просроченный платёж',
  'en': 'а', // Endung für Plural (2, 3, 4 платежА)
  'klicke "Alle fälligen buchen"!': 'нажмите "Провести все"!',
  'klicke "Alle fälligen buchen"!':'Нажмите "Провести все ожидающие"!',
  'Buchung':'Дата',
  'Erste Buchung ab':'Первая проводка с',
  'Progn. Gewinn':'Прогноз прибыли',
  'Progn. Jahreseinnahmen':'Прогноз годовых доходов',
  'Prognose Einnahmen Jahr':'Прогноз доходов за год',
  'Prognose Ausgaben Jahr':'Прогноз расходов за год',
  'Hochrechnung auf Basis der laufenden Monate':'Прогноз на базе текущих месяцев',
  'Analyse nach Zahlungsart':'Аналитика по способам оплаты',
  'Ausgaben & Einnahmen nach Kategorien':'Расходы и доходы по категориям',
  'Balken':'Гис',
  'Jährlich Reserve':'Годовой резерв',
  'Monatlich auf Steuerkonto':'Ежемесячно на налоговый счёт',
  'Steuerjahr':'Налоговый год',
  'Familienstand':'Семейное положение',
  'Ledig':'Холост / Не замужем',
  'Verheiratet':'Женат / Замужем',
  'Geschieden / Verwitwet':'Разведён / Вдовец',
  'Alleinerziehend':'Одинокий родитель',
  'Einkommensteuer':'Подоходный налог (ESt)',
  'Kirchensteuer':'Церковный налог',
  'Solidaritätszuschlag (5,5%)':'Надбавка солидарности (5,5%)',
  'Krankenversicherung':'Медицинское страхование (KV)',
  'Pflegeversicherung':'Страхование по уходу (PV)',
  'Altersversicherung':'Пенсионное страхование (RV)',
  'Nachzahlung':'Доплата',
  'Erstattung':'Возврат',
  'Nachzahlung/Erstattung':'Доплата / Возврат',
  'Steuerberater':'Налоговый консультант',
  'Vor- und Nachname':'Имя и фамилия',
  'Homeoffice-Tage (max. 210)':'Дни работы из дома (макс. 210)',
  'Arbeitstage/Jahr':'Рабочих дней в году',
  'Fahrtkosten:':'Транспортные расходы:',
  'Homeoffice:':'Удаленная работа:',
  'Vorteil:':'Выгода:',
  'Nachteil:':'Недостаток:',
  'Empfehlung:':'Рекомендация:',
  'Hinweis:':'Примечание:',
  'Wichtig:':'Важно:',
  'Kleinunternehmer':'Малый предприниматель (Kleinunternehmer)',
  'Januar':'Январь', 'Jan':'Янв',
  'Februar':'Февраль', 'Feb':'Фев',
  'März':'Март', 'Mär':'Мар',
  'April':'Апрель', 'Apr':'Апр',
  'Mai':'Май',
  'Juni':'Июнь', 'Jun':'Июн',
  'Juli':'Июль', 'Jul':'Июл',
  'August':'Август', 'Aug':'Авг',
  'September':'Сентябрь', 'Sep':'Сен',
  'Oktober':'Октябрь', 'Okt':'Окт',
  'November':'Ноябрь', 'Nov':'Ноя',
  'Dezember':'Декабрь', 'Dez':'Дек',
  '✅ Gespeichert!':'✅ Сохранено!',
  '✅ Rechnung gespeichert!':'✅ Счёт сохранён!',
  '✅ Vorlage gespeichert!':'✅ Шаблон сохранён!',
  '✅ Als bezahlt markiert':'✅ Отмечено как оплаченное',
  '✅ Berechnung abgeschlossen!':'✅ Расчёт завершён!',

// Состояние переключателя (текст в интерфейсе)
  'Ein (5 Min)': 'Вкл. (5 мин)',
  'Aus.': 'Выкл.', 
  'Ausgeschaltet': 'Выключено', // Добавьте этот ключ, если используете его в коде
// Уведомления (Toast)
  '✅ Autospeichern aktiv': '✅ Автосохранение включено',
  'Autospeichern deaktiviert': 'Автосохранение отключено',
  'Gelöscht':'Удалено',
  'Zurückgesetzt':'Сброшено',
  'Datum eingeben!':'Укажите дату!',
  'Betrag eingeben!':'Укажите сумму!',
  'Datum und Betrag prüfen!':'Проверьте дату и сумму!',
  'Alle Felder ausfüllen!':'Заполните все поля!',
  'Alle Pflichtfelder ausfüllen!':'Заполните все обязательные поля!',
  'Eintrag löschen?':'Удалить запись?',
  'Rechnung löschen?':'Удалить счёт?',
  'Vorlage löschen?':'Удалить шаблон?',
    '📤 Jahresbericht':'📤 Годовой отчёт',
  '📤 Jahresbericht exportiert!':'📤 Годовой отчёт экспортирован!',
  'Lokale Datenspeicherung':'Локальное хранение данных',
  'Datenschutz':'Конфиденциальность',
  'Bedingungen':'Условия использования',
  'Beta-Testphase':'Этап бета-тестирования',
  'Zusätzliche Informationen...':'Дополнительная информация...',

  // Дополнительные ключи app.js
  'Ist Einnahmen':                 'Фактические доходы',
  'Monate':                        'месяцев',
  'Hochrechnung bis Dez.':         'Прогноз до конца декабря',
  'vs. Vorjahr':                   'по сравнению с прошлым годом',
  'Keine Vorjahresdaten für ':     'Нет данных за прошлый год для ',
  ' vorhanden.':                   '.',
  'Progn. Jahreseinnahmen':        'Прогноз годовых доходов',
  'Progn. Jahresgewinn':           'Прогноз годовой прибыли',
  'KU-Vorjahresgrenze':            'Лимит пред. года для малого бизнеса',
  'Splittingtarif':                'Совместное налогообложение (Splitting)',
  'Grundtarif':                    'Базовый налоговый тариф',
  'Splittingtarif §32a (2)':       'Совм. налогообложение §32a (2)',
  'Grundtarif §32a (1)':           'Базовый тариф §32a (1)',
  'zu zahlen an Finanzamt':        'к уплате в налоговую (Finanzamt)',
  'vom Finanzamt zurück':          'возврат от налоговой',
  'zu zahlen':                     'к уплате',
  'Homeoffice-Pauschale':          'Единовременная выплата за Homeoffice',
  'GKV Nachzahlung (Sonderausgaben)': 'Доплата в гос. медстрах (особые расходы)',
  'Sonstige Werbungskosten':       'Прочие расходы на проф. деятельность',
  'Fortbildung / Kurse':           'Курсы / Обучение',
  'GWG (< 800€)':                  'Малоценные активы (< 800€)',
  'Investitionsabzugsbetrag (IAB)':'Инвестиционный вычет (IAB)',
  'PKW 1%-Regelung':               'Служебное авто (правило 1%)',
  'PKW Fahrtenbuch':               'Служебное авто (журнал поездок)',
  'Alleinerziehend-Freibetrag':    'Налоговый вычет для одинокого родителя',
  'Verpflegungsmehraufwand':       'Суточные командировочные',
  'Kinderfreibetrag':              'Налоговый вычет на детей',
  'Kinder':                        'детей',
  'Tage':                          'дней',
  'Tage!':                         'дней!',
  'Tarif':                         'Тариф',
  '− Vorauszahlungen':             '− Авансовые платежи',
  '− Einbehaltene KapESt':         '− Удержанный налог на кап. доход',
  'USt eingezogen (19%)':          'НДС собранный с клиентов (19%)',
  'USt bezahlt (19%)':             'НДС уплаченный при покупках (19%)',
  'Kapitalertragsteuer (25%)':     'Налог на доход с капитала (25%)',
  'Gesamtsteuer':                  'Итого налогов',
  'Haftpflichtversicherung':       'Страхование проф. ответственности',
  'Berufsunfähigkeitsvers.':       'Страх. от потери трудоспособности (BU)',
  'Berufsunfähigkeitsvers. (zusätzlich)': 'Страх. от потери трудосп. (доп.)',
  'Betriebseinnahmen':             'Доходы от операционной деятельности',
  'Betriebsausgaben':              'Расходы от операционной деятельности',
  'Gewinn (EÜR)':                  'Прибыль (согласно EÜR)',
  'Fahrtkosten':                   'Транспортные расходы',
  'inkl. GewSt, Soli':             'вкл. Промысловый налог (GewSt), Надбавку (Soli)',
  'Kirche':                        'Церк. налог',
  'Splitting':                     'Совместное налогообложение (Splitting)',
  'Ja':                            'Да',
  'Nein':                          'Нет',
  'GESAMT':                        'ИТОГО',
  'Zu verst. Einkommen':           'Налогооблагаемый доход',
  'gespeichert':                   'сохранено',
  'Rechnung':                      'Счёт',
  'bezahlt + Einnahme gebucht':    'оплачен + доход зафиксирован',
  'Geladen':                       'Загружено',
  'Ersetzen':                      'Заменить',
  'Datei gespeichert':             'Файл сохранён',
  'Datei wechseln':                'Сменить файл',
  'Heruntergeladen!':              'Скачан!',
  'Ungültige Datei':               'Недопустимый или поврежденный файл',
  'Fehler':                        'Ошибка',
  'Bitte Datei wählen: Schaltfläche Speichern als': '⚠ Выберите файл: нажмите кнопку "Сохранить как..."',
  'Gespeichert ✓':                 'Сохранено ✓',
  'Jahr muss zwischen 2000 und 2099 liegen!': 'Год должен быть в диапазоне от 2000 до 2099!',
  'hat nur':                       'имеет только',
  'Ungültiges Datum!':             'Некорректная дата!',
  'CSV exportiert!':               'CSV файл экспортирован!',
  'wiederkehrende Zahlung':        'регулярный платёж',
  'en':                            'ей',
  'fällig!':                       'ожидает оплаты!',
  '1️⃣ GKV NACHZAHLUNG':           '1️⃣ ДОПЛАТА ПО ГОС. МЕДСТРАХОВКЕ (GKV)',
  '2️⃣ USt-VORANMELDUNG':          '2️⃣ ПРЕДВАРИТЕЛЬНАЯ ДЕКЛАРАЦИЯ НДС',
  '3️⃣ TAGESGELDKONTO':            '3️⃣ НАКОПИТЕЛЬНЫЙ СЧЁТ (TAGESGELDKONTO)',
  '4️⃣ JAHRESABRECHNUNG':          '4️⃣ ГОДОВОЙ РАСЧЁТ',
  '⚠️ WICHTIGE HINWEISE':          '⚠️ ВАЖНЫЕ УКАЗАНИЯ',
  '🔴 KRITISCH':                   '🔴 КРИТИЧНО',
  'Auf separates Konto für Steuern!': 'Откладывать на отдельный налоговый счёт!',

  // Блок советов в налоговом разделе
  'Sofort handeln: Steuerbescheid an Krankenkasse schicken. Beiträge für {jahr} werden neu berechnet.':
    'Срочное действие: Отправьте налоговое уведомление (Steuerbescheid) в вашу больничную кассу. Взносы за {jahr} год будут пересчитаны.',
  'Pflicht: Bei Umsatz {ein} monatlich/quartalsweise Voranmeldung beim Finanzamt. ELSTER automatisiert.':
    'Обязанность: При обороте {ein} необходимо ежемесячно/ежеквартально подавать декларацию по НДС (USt-Voranmeldung). В системе ELSTER это автоматизировано.',
  'Separates Tagesgeldkonto eröffnen und jeden Monat {reserve} zurücklegen. So vermeiden Sie die Steuer-Überraschung.':
    'Откройте отдельный накопительный счёт и откладывайте {reserve} каждый месяц. Так вы избежите неожиданных налоговых счетов.',
  'Im Frühjahr {jahr1}: Finanzamt schickt Steuerbescheid. Rückständige Steuern schnell zahlen — Verzugszinsen 6%/Jahr.':
    'Весной {jahr1} года: Налоговая пришлёт уведомление. Быстро оплатите задолженность по налогам — пени за просрочку составляют 6% в год.',
  'Diese Zahl ({jahr_net}/Jahr oder {mon}/Monat) ist Ihr reales verfügbares Einkommen NACH allen Steuern.':
    'Эта сумма ({jahr_net}/год или {mon}/мес.) — ваш реальный располагаемый доход ПОСЛЕ уплаты абсолютно всех налогов.',

  // ── Заголовки разделов и кнопки с иконками ──────────────────
  '▲ Einnahmen':                   '▲ Доход',
  '▼ Ausgaben':                    '▼ Расход',
  '↺ Zurücksetzen':               '↺ Сбросить',
  'Alle fälligen buchen':       'Провести все',
  '✏️ Eintrag bearbeiten':        '✏️ Редактировать запись',
  '✓ Verstanden &amp; Akzeptiert — Software öffnen': '✓ Прочитано и принято — открыть программу',
  'Rechnung erstellen':         'Создать счёт',
  '🏛️ Steuererklärung':           '🏛️ Налоговая декларация',
  '💰 Kapitalerträge (optional)': '💰 Доход с капитала (опционально)',
  '💼 Anlage EÜR':                '💼 Приложение EÜR (Доходы и расходы)',
  '📊 Monat für Monat':           '📊 Детализация по месяцам',
  '🔁 Wiederkehrende Zahlung':    '🔁 Регулярный платёж',
  '🔍 Hebesatz für Stadt suchen': '🔍 Найти муниципальную ставку по городу',
  '🧪 Steuer-Szenarien-Test 2025/2026': '🧪 Тестирование налоговых сценариев 2025/2026',
  '🧾 Rechnung erstellen':        '🧾 Создать счёт',
  '⚙️ AfA (Abschreibung) & Anlagegüter': '⚙️ Амортизация (AfA) и основные средства',
  '+ Anlage hinzufügen':          '+ Добавить актив (ОС)',
  'Bericht':                      'Отчёт',
  'Übersicht —':                  'Обзор —',

  // ── Налоговая форма — поля ────────────────────────────────────
  'Aktuelle Krankenversicherung gezahlt (€/Jahr)': 'Уплачено за мед. страхование (€/год)',
  'Altersversicherung/RV (€/Jahr)':  'Пенсионное страхование / RV (€/год)',
  'Berufsunfähigkeitsvers. (€/Jahr)': 'Страх. от потери трудоспособности (€/год)',
  'Berufsunfähigkeitsversicherung (€/Jahr)': 'Страх. от потери трудоспособности (€/год)',
  'Haftpflichtversicherung (€/Jahr)': 'Профессиональная ответственность (€/год)',
  'Pflegeversicherung (€/Jahr)':     'Страхование по уходу / PV (€/год)',
  'Krankenversicherung (€/Jahr)':    'Медицинское страхование / KV (€/год)',
  'Kirchensteuer (€/Jahr) — alt.':   'Церковный налог (€/год) — альтерн.',
  'Fortbildung / Kurse (€/Jahr)':    'Обучение / Курсы (€/год)',
  'Kapitalerträge (Zinsen, Dividenden) (€)': 'Доходы с капитала (проценты, дивиденды) (€)',
  'USt bezahlt bei Einkauf (19%) (€)':  'НДС уплачен при покупках (19%) (€)',
  'USt eingezogen von Kunden (19%) (€)': 'НДС получен от клиентов (19%) (€)',
  'Einkommen Ehepartner/in (€ brutto/Jahr)': 'Доход супруга/и (€ брутто/год)',
  'Privatfahrten (km/Jahr)':         'Личные поездки (км/год)',
  'Geschäftsfahrten (km/Jahr)':      'Служебные поездки (км/год)',
  'km zur Arbeit (einfach)':         'км до работы (в одну сторону)',
  'Betrag (€)':                      'Сумма (€)',
  'Betrag €':                        'Сумма €',
  'GWG (Geringwertige Wirtschaftsgüter': 'Малоценные активы (GWG)',
  'Beschreibung (z.B. Drehmaschine)': 'Описание (например, Токарный станок)',
  'Mindestbeitrag (oder real)':      'Минимальный взнос (или реальный)',
  'Mindestbeitrag von ~2.600€/Jahr': 'Минимальный взнос около 2.600€/год',
  'Ca. 20% von KV':                  'Примерно 20% от взноса по мед. страховке',
  'Selbstständig versichert: ~10-11k€/Jahr': 'Страховка для самозанятых: ~10-11k€/год',

  // ── Подсказки и пояснения ─────────────────────────────────────
  'Als Sonderausgaben abzugsfähig':  'Списывается как особые расходы (Sonderausgaben)',
  'Vollständig abzugsfähig':         'Полностью подлежит вычету',
  'Sofort als Betriebsausgabe abzugsfähig': 'Моментально списывается как операционный расход',
  'Max. 50% der geplanten Kosten können 2025 abgezogen werden': 'В 2025 году можно вычесть макс. 50% от планируемых затрат',
  'Falls oben bereits als % angegeben, hier 0 lassen': 'Если выше уже указано в %, оставьте здесь 0',
  '1% pro Monat wird zur Einnahme addiert': '1% в месяц добавляется к налогооблагаемой базе',
  '19% der Einnahmen (falls nicht KU)': '19% от доходов (если вы не применяете статус малого бизнеса)',
  '19% der Betriebsausgaben':        '19% от операционных расходов',
  '8h im Jahr)':                     '8ч в год)',
  '0 € von 25.000 €':                '0 € из разрешенных 25.000 €',
  'Sonderausgaben nach §10 EStG':    'Особые расходы согласно §10 EStG',
  'Einkommensteuer-Berechnung · Orientierungswert, kein Steuerberater-Ersatz': 'Расчёт подоходного налога · Ориентировочно, не заменяет консультацию специалиста',
  'Vordefinierte Testfälle für Steuerberater-Prüfung — alle Werte basieren auf § 32a EStG, JStG 2024': 'Встроенные тестовые сценарии для проверки (основано на § 32a EStG, JStG 2024)',
  'Orientierungswert. Für die offizielle Erklärung bitte': 'Ориентировочное значение. Для официальной подачи декларации используйте',
  'Hinweis für Prüfer:':             'Уведомление для проверяющих:',
  'Status: offen · bezahlt · überfällig': 'Статус: к оплате · оплачен · просрочен',
  'Sparerpauschbetrag 1.000 € (Single) / 2.000 € (verheiratet) wird abgezogen': 'Применяется вычет на сбережения: 1.000 € (одиночки) / 2.000 € (супруги)',
  '§ 4 Abs. 3 EStG · Einnahmen-Überschuss-Rechnung': '§ 4 Abs. 3 EStG · Отчётность по доходам и расходам (EÜR)',
  ', unabhängig von Ihrem tatsächlichen Einkommen. Dies ist ein': ', независимо от вашего фактического дохода. Это',
  'Klicken für Details':             'Нажмите для просмотра деталей',

  // ── Опции / выборы ────────────────────────────────────────────
  'Bin unsicher (automatisch prüfen)': 'Не уверен (проверить автоматически)',
  'Möchten Sie als Kleinunternehmer optieren?': 'Хотите применять статус малого предпринимателя (Kleinunternehmer)?',
  'Sie können dies jährlich ändern': 'Вы можете менять это решение ежегодно',
  'Sind Sie über Familienversicherung versichert?': 'Вы застрахованы по программе семейного медицинского страхования?',
  'Ehepartner/in berufstätig?':      'Ваш(а) супруг(а) работает?',
  'Nein — nicht berufstätig':        'Нет — не работает',
  'Nein — normal (mit 19% USt)':     'Нет — на общих основаниях (с 19% НДС)',
  'Ja — 9% (alle anderen)':          'Да — 9% (все прочие случаи)',
  'Ja — kostenlos über Partner/Eltern': 'Да — бесплатно через партнёра/родителей',

  // ── Подсказки в налоговой ─────────────────────────────────────
  'Ihr Umsatz liegt unter 25.000€. Sie können': 'Ваш оборот ниже 25.000€. Вы можете',
  'auf Kleinunternehmer-Status wechseln und zahlen': 'перейти на статус малого бизнеса и не платить',
  'keine Einnahme':                  'доход отсутствует',
  'Sie können keine Vorsteuer zurückfordern (aber bei Ihrem Umsatz ist das minimal).': 'Вы не сможете возвращать входящий НДС (но при вашем обороте это минимальные потери).',
  'Sie sparen den USt-Saldo (aktuell —737,90€).': 'Вы экономите на уплате сальдо НДС (сейчас это —737,90€).',
  'wird berechnet...':               'вычисляется...',
  '3. Anlage <strong>U</strong> für Zusammenveranlagung<br>': '3. Приложение <strong>U</strong> для совместного налогообложения супругов<br>',

  // ── Смешанные строки (рус+нем) ────────────────────────────────
  'Город / Gemeinde (где Ihr Betriebsstätte)': 'Город / Муниципалитет (где зарегистрирована деятельность)',
  'КРИТИЧЕСКИ: Ежемесячный Steuer-Rücklage': 'КРИТИЧНО: Ежемесячный резерв на налоги',

  // ── Дисклеймер ────────────────────────────────────────────────
  '— Diese Software ist unfertig und nicht für den produktiven Einsatz geeignet. Keine Haftung für Berechnungen. Nur für Testzwecke. ':    '— Данное ПО не завершено и не предназначено для рабочего использования. Никакой ответственности за расчеты. Только для целей тестирования.',
    'BETA TEST VERSION':          'БЕТТА ТЕСТ ВЕРСИЯ',
      '— For testing purposes only. No liability for any calculations.':          '— Только для целей тестирования. Разработчик не несет ответственности за результаты расчетов.',
  
  'geeignet. Keine Haftung für Berechnungen. Nur für Testzwecke.  |  BETA TEST VERSION — For testing purposes only. No liability for any calculations.':  'не предназначено. Мы не несем ответственности за расчеты. Только для целей тестирования. | БЕТА-ВЕРСИЯ ДЛЯ ТЕСТИРОВАНИЯ — Только для целей тестирования. Никакой ответственности за расчеты.',
  'Alle Berechnungen sind':          'Все расчёты предоставляются',
  'unverbindlich und ohne Gewähr':   'для ознакомления и без каких-либо гарантий',
  'auf Richtigkeit, Vollständigkeit oder Aktualität.': 'их точности, полноты или актуальности.',
  'Der Entwickler übernimmt':        'Разработчик не несёт',
  'für Schäden, Verluste oder Nachteile, die durch die Nutzung dieser Software entstehen.': 'ответственности за ущерб, убытки или последствия, вызванные использованием этой программы.',
  'ausschließlich mit einem zugelassenen Steuerberater': 'исключительно с лицензированным налоговым консультантом',
  'Diese Version ist':               'Эта версия',
  'nicht für den produktiven Einsatz': 'не предназначена для коммерческого использования',
  'oder für offizielle Steuererklärungen geeignet.': 'или для подготовки официальных налоговых деклараций.',
  'Daten werden nur lokal im Browser gespeichert. Es erfolgt': 'Все данные хранятся исключительно локально в вашем браузере.',
  'keine Übertragung an Dritte':     'Передача данных на сторонние серверы не производится.',
  'keine Steuer-, Rechts- oder Finanzberatung': 'программа не является налоговой, юридической или финансовой консультацией',
  'und wird ausschließlich zu':      'и предоставляется исключительно в',
  'Dies ist eine Beta-Version. Alle Berechnungen sind unverbindlich und ohne Gewähr. Für steuerliche Entscheidungen konsultieren Sie einen zugelassenen Steuerberater (§ 3 StBerG).': 'Это бета-версия. Все расчеты приблизительны и не имеют юридической силы. Для принятия налоговых решений проконсультируйтесь с лицензированным налоговым специалистом (§ 3 StBerG).',
  '"Wie viel ECHTE Geld bleibt nach ALLEM?"': '«Сколько РЕАЛЬНЫХ денег у вас останется после вычета АБСОЛЮТНО ВСЕГО?»',
  'Das ist das Geld für Ihre Lebenshaltung, Familie, Rücklagen': 'Это те средства, которые остаются на жизнь, семью и личные сбережения',
  'Was Sie JETZT bezahlt haben':     'То, что вы УЖЕ фактически оплатили',
  'Gewinn aus Betrieb':              'Прибыль от предпринимательской деятельности',
  'Gewinn (EÜR)':                    'Прибыль (по отчёту EÜR)',
  'Hochrechnung auf Basis der laufenden Monate': 'Экстраполяция (прогноз) на основе текущих месяцев',
  'Automatisch jeden Monat / Quartal / Jahr buchen': 'Создавать проводку автоматически каждый месяц / квартал / год',
  'Analyse nach Zahlungsart':        'Аналитика по способам оплаты',
  'Ausgaben & Einnahmen nach Kategorien': 'Распределение доходов и расходов по категориям',

  // ── Прочие немецкие строки в app.js ──────────────────────────
  'Einnahmen gesamt':               'Всего доходов',
  'Einträge gesamt':                'Всего записей',
  'Ausgaben gesamt':                'Всего расходов',
  'Bester Monat':                   'Самый прибыльный месяц',
  'Jährlich Reserve':               'Резерв на год',
  'Monatlich auf Steuerkonto':      'Ежемесячный перевод на налоговый счёт',
  'Betrag (EUR)':                   'Сумма (€)',
  'Gewinn (EUR)':                   'Прибыль (€)',
  'Prognose Einnahmen Jahr':        'Ожидаемые доходы за год',
  'Prognose Ausgaben Jahr':         'Ожидаемые расходы за год',
  'Progn. Gewinn':                  'Ожидаемая прибыль',
  'Ist Einnahmen':                  'Фактические доходы',
  'Keine Einträge':                 'Записи отсутствуют',
  'Keine Einträge gefunden':        'Записи по фильтру не найдены',
  'Letzte 10 Einträge':             'Последние 10 операций',
  'Eintrag löschen?':               'Вы уверены, что хотите удалить запись?',
  'Rechnung löschen?':              'Вы уверены, что хотите удалить этот счёт?',
  'Vorlage löschen?':               'Вы уверены, что хотите удалить шаблон?',
  'Alle fälligen buchen':           'Провести все',
  'Klicken für Details':            'Кликните для подробностей',
  '} fällig!`':                     'ожидает оплаты!`',
  'vom Finanzamt zurück':           'возврат из налоговой',
  'Überfällig':                     'Просрочен',
  '🔴 Überfällig':                  '🔴 Просрочен',
  'Speichern als…':                 'Сохранить как…',

  // ── Города (нужны для налоговой формы - GewSt) ───────────────
  'Köln':'Кёльн', 'Lübeck':'Любек', 'München':'Мюнхен',
  'Münster':'Мюнстер', 'Nürnberg':'Нюрнберг', 'Düsseldorf':'Дюссельдорф',
  'Saarbrücken':'Саарбрюккен', 'Mönchengladbach':'Мёнхенгладбах',
  'Thüringen':'Тюрингия', 'Baden-Württemberg':'Баден-Вюртемберг',

  // ── Сценарии тестов ──────────────────────────────────────────
  '85.000 € — Soli prüfen':          '85.000 € — проверка надбавки (Soli)',
  'KU-Grenze überschritten':         'Лимит для малого бизнеса превышен',
  '1 € über Grundfreibetrag 2026':   'На 1 € выше базового необлагаемого минимума 2026',
  'Knapp unter Vorjahres-KU-Grenze.':'Чуть ниже лимита для малого бизнеса прошлого года.',
  'Günstigerprüfung Kindergeld/KFB.':'Сравнение выгоды: Детское пособие (Kindergeld) или Вычет (KFB).',
  '✅ 16 Steuer-Szenarien berechnet': '✅ Успешно рассчитано 16 налоговых сценариев',
  '❌ Stadt nicht in Datenbank. Hebesatz manuell eingeben.':
    '❌ Город не найден в базе. Пожалуйста, введите ставку вручную.',

  // ── Динамические строки в app.js ─────────────────────────────
  'Sonstiges Ausgabe':               'Прочие операционные расходы',
  'EÜR geladen:':                    'Данные EÜR загружены:',
  '· KFB günstiger':                 '· Применение налогового вычета выгоднее',
  '⚠️ Umsatz > 25.000€: Sie sind kein Kleinunternehmer mehr (ab nächstem Jahr).':
    '⚠️ Оборот превысил 25.000 €: Статус малого бизнеса (Kleinunternehmer) утрачивается со следующего года.',
  'fällige Zahlung':                 'ожидающий платёж',
  'fällig!':                         'пора оплатить!',
  'oder einen':                      'или в',
  ' Einträge':                       ' записей',
  'Anzahl Kinder (unter 25 / in Ausbildung)': 'Количество детей (младше 25 лет / студенты)',
  'Kleinunternehmer-Status (§19 UStG)?': 'У вас есть статус малого предпринимателя (§19 UStG)?',
  'Testversion — Rechtlicher Hinweis / Beta Disclaimer': 'Тестовая версия — Юридическая оговорка',

  // ── Отчёт / Bericht ──────────────────────────────────────────
  'Einnahmen':  'Доходы',
  'Ausgaben':   'Расходы',
  'Gewinn':     'Прибыль',
  'Einträge':   'Транзакции',
  'Kumuliert':  'Итого нарастающим итогом',
  'Monat':      'Месяц',
  'Jahr':       'Год',
  'Typ':        'Тип',
  'Datum':      'Дата',
  'Betrag':     'Сумма',
  'Beschreibung': 'Описание',
  'Zahlungsart':  'Способ оплаты',
  'Notiz':        'Доп. примечание',
  'Kategorie':    'Категория',
  'Status':       'Текущий статус',
  'Kunde':        'Заказчик',
  'Nr.':          '№',

  'wiederkehrende Zahlung': 'регулярный платёж',
  ' vorhanden.':            '.',
  'Keine Vorjahresdaten für ': 'Отсутствуют исторические данные за ',
  'Offen':      'К оплате',
  'Überfällig': 'Просрочено',
  'Bezahlt':    'Оплачено',
  'Anlage':     'Приложение к декларации',
  'Kind':       'Ребёнок',
  'für':        'за',
  'er':         'ей',
  'en':         'ей',
  'fällig!':    'требует оплаты!',
  'Offene Rechnungen':    'Счета к оплате',
    '🔁 Wiederkehrende Zahlungen':    '🔁 Регулярные платежи',
	    'Betrag eingeben!':    'Заполните поля!',
  

  // ── Полные составные строки (исправляем частичные переводы) ──
  'Monatsverlauf':   'Ежемесячная динамика',
  'Monatsdetails':   'Детализация за месяц',
  'Jahresende':      'Конец текущего года',

  // ── Заголовки разделов ────────────────────────────────────────
  '📈 Prognose & Vorjahresvergleich': '📈 Прогнозирование и сравнение с прошлым годом',
  '📅 Vorjahresvergleich':            '📅 Анализ "Год к году" (YoY)',
  '📉 Hochrechnung Jahresende':       '📉 Предварительный итог на конец года',
  '📊 Kategorienanalyse':             '📊 Анализ затрат по категориям',
  'Neue Vorlage':                  'Создать новый шаблон',

  // ── Налоговая форма — заголовки ───────────────────────────────
  '⚡ Berechnen':                       '⚡ Рассчитать налоги',
  '📋 Grunddaten':                      '📋 Базовые вводные данные',
  '👨‍👩‍👧 Familienstatus': '👨‍👩‍👧 Состав семьи и статус',
  '🔗 Aus Buchaltung laden:':          '🔗 Подтянуть данные из бухгалтерии:',
  '↻ Laden':                           '↻ Загрузить данные',
  '🏥 Soziale Versicherungen & Vorsorge (Sonderausgaben)': '🏥 Социальные страховки и обеспечение (особые вычеты)',
  '🔻 Weitere Sonderausgaben & Werbungskosten': '🔻 Дополнительные особые расходы и проф. затраты',
  '🚗 Betriebs-PKW (optional)':        '🚗 Служебный транспорт (необязательно)',
  'Verwenden Sie einen Betriebs-PKW?': 'Используете ли вы автомобиль для бизнеса?',
  '📊 Umsatzsteuer (USt) Saldo':       '📊 Баланс по налогу на добавленную стоимость (НДС)',
  '🛡️ Professionelle Versicherungen & Fortbildung': '🛡️ Профессиональные страховки и повышение квалификации',
  '🏥 GKV Krankenkasse — Mindestbeitrag & Nachzahlung': '🏥 Государственная медстраховка — Минимальный взнос и доплаты',
  '💡 KLEINUNTERNEHMER-EMPFEHLUNG (§19 UStG)': '💡 РЕКОМЕНДАЦИЯ: СТАТУС МАЛОГО ПРЕДПРИНИМАТЕЛЯ (§19 UStG)',
  '💰 NETTO-GEWINN — Was bleibt in Ihrem Portemonnaie?': '💰 ЧИСТАЯ ПРИБЫЛЬ — Что физически останется у вас на руках?',
  '🎯 NETTO ZUM LEBEN (Das Wichtigste!)': '🎯 ЧИСТЫЕ ДЕНЬГИ НА ЖИЗНЬ (Самый важный показатель!)',
  '💰 Pro Monat:':                     '💰 В пересчете на месяц:',
  '▶ Alle Szenarien berechnen':        '▶ Запустить расчёт всех сценариев',
  '📅 Monatsdetails':                  '📅 Детали выбранного месяца',

  // ── Прогноз — динамические строки ────────────────────────────
  'ggü.':                              'в сравнении с',
  'Vj:':                               'Пр.год:',
  'Ein. /':                            'Дох. /',
  '📊 Vorjahresgrenze-Prognose (25.000 €)': '📊 Прогноз по лимиту прошлого года (25.000 €)',
  '⚡ Laufendes Jahr — HARD LIMIT (100.000 €) Fallbeil-Effekt!': '⚡ Текущий год — ЖЁСТКИЙ ЛИМИТ (100.000 €)!',
  '⚠️ Vorjahresgrenze in Sicht — bei Überschreitung 25.000 € entfällt §19 UStG im Folgejahr!':
    '⚠️ Вы приближаетесь к лимиту прошлого года — при превышении 25.000 € статус малого бизнеса (§19 UStG) будет аннулирован в следующем году!',
  'ℹ️ Neu ab 01.01.2025 (JStG 2024): Vorjahresgrenze 25.000 € (netto) + laufendes Jahr max. 100.000 € (harte Grenze, sofort wirksam bei Überschreitung).':
    'ℹ️ Нововведение с 01.01.2025: лимит прошлого года 25.000 € (нетто) + текущий год макс. 100.000 € (жёсткий лимит, переход на НДС происходит немедленно при превышении).',

  // ── Категории — немецкие названия ────────────────────────────
  'Strom / Gas':       'Электроэнергия / Газ',
  'Wasser / Abwasser': 'Водоснабжение / Канализация',
  'Strom/Gas':         'Электр./Газ',
  'Wasser/Abwasser':   'Водоснабжение/Канализация',

  // ── Dashboard ─────────────────────────────────────────────────
  'BETA-TESTVERSION': 'ВЕРСИЯ ДЛЯ БЕТА-ТЕСТА',
  'BETA · TEST':      'БЕТА · ТЕСТ',
  'Limit KU (25k)':   'Лимит для малого бизнеса (25k)',
  'Autospeichern':    'Автосохранение',
  'Aus.':             'Откл.',
  'Ein (5 Min)':      'Вкл. (5 мин)',

  // ── Tax form — поля, подсказки ────────────────────────────────
  '6 €/Tag · max. 1.260 €':             '6 € в день · макс. 1.260 €',
  'Freiwillige RV-Pauschal: max. 3.046,49€': 'Добровольное пенс. страхование: макс. 3.046,49€',
  'ℹ️ Diese Beträge werden von Ihrem zu versteuerndem Einkommen (ZvE) abgezogen und reduzieren damit Ihre Steuerbelastung.':
    'ℹ️ Данные суммы вычитаются из вашего налогооблагаемого дохода (ZvE), тем самым законно снижая итоговое налоговое бремя.',
  'Bereits gezahlte Vorauszahlungen (€)':   'Уже совершённые авансовые налоговые платежи (€)',
  'Einbehaltene Kapitalertragsteuer (€)':   'Уже удержанный банком налог на прибыль с капитала (€)',
  '14€/Tag ohne Belege':                    '14€ в день (подтверждающие чеки не требуются)',
  'Professionelle Haftung':                 'Профессиональная материальная ответственность',
  '= Messbasis':                            '= База для исчисления',
  '× Messzahl 3,5%':                        '× Базовый коэффициент 3,5%',
  '× Hebesatz (Stadt)':                     '× Муниципальная ставка города (Hebesatz)',
  '= GEWERBESTEUER':                        '= ИТОГО ПРОМЫСЛОВЫЙ НАЛОГ (GEWERBESTEUER)',
  'Nach §35 EStG verrechenbar (max 40%)':   'Возможен взаимозачёт по §35 EStG (снижает подоходный налог макс. на 40%)',
  'Minus: Freibetrag §11 GewStG':           'Минус: Налоговый вычет согласно §11 GewStG',
  '⚡ Berechnung GKV:':                      '⚡ Расчёт платежей по государственному медстрахованию:',
  'Erwartete Jahresschuld GKV':             'Ожидаемый долг по медстраховке за год',
  '§10 SGB V - Familienversicherung':       '§10 SGB V — Включён в семейную страховку',
  'Nein — ich zahle selbst':                'Нет — я оплачиваю взносы самостоятельно',
  '⚠️ ACHTUNG: Auch bei niedrigem Einkommen zahlen Sie Mindestbeitrag (~2.600€/Jahr). Ausnahme: Familienversicherung über Ehepartner/Eltern.':
    '⚠️ ВНИМАНИЕ: Даже при крайне низких доходах вы обязаны платить минимальный взнос (около 2.600€/год). Единственное исключение: если вы вписаны в семейную страховку супруга или родителей.',
  'Wenn Umsatz < 22.000€ (2024) oder 25.000€ (2025+): Sie können befreit sein':
    'Если ваш оборот < 22.000€ (за 2024) или 25.000€ (с 2025): Вы имеете право на освобождение от НДС',
  'Nein — normale Umsatzsteuer (19%)':      'Нет — применяется стандартный НДС (19%)',
  'Das ist die Antwort auf die Frage: «Сколько РЕАЛЬНЫХ денег остаётся после ВСЕГО?»':
    'Это прямой ответ на вопрос: «Сколько РЕАЛЬНЫХ денег останется у меня после ВСЕХ отчислений?»',
  '▶ Alle Szenarien berechnen':             '▶ Рассчитать все тестовые сценарии',
  '⚠️ WICHTIG:':                            '⚠️ КРАЙНЕ ВАЖНО:',
  '⚠️ WICHTIG':                             '⚠️ ВАЖНО',
  'Hochrechnung auf Basis der laufenden Monate': 'Прогнозирование итогов на основании отработанных месяцев',
  'BETA TEST VERSION — For testing purposes only. No liability for any calculations.':
    'БЕТА-ВЕРСИЯ ДЛЯ ТЕСТИРОВАНИЯ — Используйте только в ознакомительных целях. Разработчик не несёт финансовой ответственности за результаты расчётов.',

  // ── Категории (из реальных данных) ───────────────────────────
  'Strom / Gas':           'Электроэнергия / Газ',
  'Wasser / Abwasser':     'Водоснабжение / Канализация',
  'Strom/Gas':             'Электричество/Газ',
  'Wasser/Abwasser':       'Вода/Канализация',
  'Büromaterial':          'Канцелярские товары',
  'Dienstleistung':        'Оказание услуг',
  'Fortbildung':           'Обучение / Тренинги',
  'Hardware':              'Техника и комплектующие',
  'Marketing / Werbung':   'Маркетинг и рекламные кампании',
  'Miete / Büro':          'Арендная плата / Содержание офиса',
  'Software / IT':         'Программное обеспечение / IT-услуги',
  'Telefon / Internet':    'Связь (Телефон / Интернет)',
  'Versicherung':          'Страховые взносы',
  'Bankgebühren':          'Расчётно-кассовое обслуживание (Банк)',
  'Steuern / Abgaben':     'Налоговые платежи и пошлины',
  'Fremdleistungen':       'Услуги субподрядчиков (Fremdleistungen)',
  'Bewirtung':             'Деловые встречи (Представительские расходы)',
  'Honorar':               'Выплата гонораров',
  'Warenverkauf':          'Реализация товаров',
  'Miete (Einnahme)':      'Сдача недвижимости в аренду (доход)',
  'Zinsen/Dividenden':     'Полученные проценты и дивиденды',
  'Fahrtkosten':           'Транспортные расходы / Бензин',

  // ── Способы оплаты ────────────────────────────────────────────
  'Überweisung':   'Банковский перевод',
  'Barzahlung':    'Наличный расчёт',
  'EC-Karte':      'Оплата банковской картой',
  'Lastschrift':   'Прямое списание (SEPA Lastschrift)',
  'Sonstiges':     'Прочие способы оплаты',

  // ── Dashboard misc ────────────────────────────────────────────
  'Limit KU (25k)':        'Лимит малого бизнеса (25 000 €)',
  'Einnahmen gesamt':      'Суммарные доходы',
  'Ausgaben gesamt':       'Суммарные расходы',
  'Einträge gesamt':       'Общее число транзакций',
  'Bester Monat':          'Самый финансово успешный месяц',
  'Letzte 10 Einträge':    'Последние 10 добавленных операций',
  'Keine Einträge':        'Список операций пуст',
  'Ein.':                  'Дох.',
  'Aus.':                  'Расх.',

  // ── Gewerbesteuer / IHK секция (теперь на немецком в HTML) ──
  '⚠️ GEWERBESTEUER — Gewerbesteuer (PFLICHT!)': '⚠️ ПРОМЫСЛОВЫЙ НАЛОГ — Gewerbesteuer (ОБЯЗАТЕЛЕН К УПЛАТЕ!)',
  'WICHTIG:':  'ОЧЕНЬ ВАЖНО:',
  'Kein Taschenrechner! Das Finanzamt schickt tatsächlich eine Rechnung. Bei 64k€ Gewinn können das 5-10k€ sein!':
    'Это не виртуальные цифры! Налоговая инспекция действительно выставит вам счёт на эту сумму. При прибыли в 64.000 € этот налог может составить от 5 до 10 тысяч евро!',
  'Stadt / Gemeinde (Betriebsstätte)':  'Город или муниципалитет (место регистрации бизнеса)',
  'Ihre Betriebsstadt — TAB/ENTER zum Suchen': 'Название вашего города — нажмите TAB или ENTER для поиска ставки',
  'Hebesatz (%) — wird automatisch gefunden': 'Муниципальный коэффициент (%) — будет подставлен автоматически',
  'Hebesatz der Stadt (Worms = 430%)': 'Муниципальный коэффициент выбранного города (например, Вормс = 430%)',
  '📋 IHK-Beitrag & Berufsgenossenschaft (Pflicht!)': '📋 Взносы в Торговую палату и Профсоюз (Обязательны к уплате!)',
  '🏢 IHK-Beitrag (Industrie- und Handelskammer)': '🏢 Взнос в Торгово-промышленную палату (IHK)',
  '~200,00 €/Jahr':  'Ориентировочно 200,00 €/год',
  'Pflicht bei Gewinn > 24.500€': 'Обязательно к уплате, если годовая прибыль превышает 24.500€',
  '⚠️ Berufsgenossenschaft (Unfallversicherung)': '⚠️ Профессиональная ассоциация (BG) (Обязательное страхование от несчастных случаев на производстве)',
  '~300,00 €/Jahr':  'Ориентировочно 300,00 €/год',
  'Pflicht für Handwerker & Selbstständige': 'Обязательно для ремесленников и большинства самозанятых лиц',
  'ℹ️ Diese Beträge sind bereits als Abzüge vom Gewinn berücksichtigt (senken ZvE). Sie müssen sie aber tatsächlich bezahlen!':
    'ℹ️ Данные суммы уже были учтены программой как производственные расходы (они снизили вашу налогооблагаемую базу). Тем не менее, вам необходимо будет физически перевести эти деньги в соответствующие ведомства!',
  'WICHTIG: Monatliche Steuerrücklage': 'ВНИМАНИЕ: Ежемесячный резерв для будущей уплаты налогов',
  'Autospeichern': 'Автосохранение',
  'Umsatzsteuer': 'НДС',
  '% Umsatzsteuer': '% НДС (MwSt.)',
  'Vorsteuer · Umsatzsteuer · Zahllast · Voranmeldung': 'Входящий НДС · Исходящий НДС · Налоговое бремя',
  'USt-Modus': 'Режим НДС',
  '§19 UStG — Kleinunternehmer (keine USt)': '§19 UStG — Малый предприниматель (без НДС)',
  'Regelbesteuerung (mit USt)': 'Обычное налогообложение (с НДС)',
  'Quartalsübersicht': 'Квартальный обзор',
  'Buchungen mit USt': 'Проводки с НДС',
  'Netto-Einnahmen': 'Доходы нетто',
  'USt. Ausgang': 'НДС исходящий',
  'an Finanzamt': 'в налоговую',
  'Vorsteuer': 'Входящий НДС',
  'vom Finanzamt': 'от налоговой',
  'Zahllast': 'Налоговое бремя',
  'zu zahlen': 'к оплате',
  'Erstattung': 'Возврат',
  'USt-Betrag manuell erfassen': 'Ввести НДС вручную',
  'Vorsteuer (Eingang)': 'Входящий НДС',
  'USt. (Ausgang)': 'Исходящий НДС',
  'Keine USt-pflichtigen Buchungen': 'Нет проводок с НДС',
  'Kunden (CRM)': 'Клиенты (CRM)',
  // CRM
  'Kunden (CRM)':         'Клиенты (CRM)',
  'Kundenverwaltung · Adressen · Kontakte': 'База клиентов · Адреса · Контакты',
  'Neuer Kunde':          'Новый клиент',
  'Kunden gesamt':        'Клиентов всего',
  'in der Datenbank':     'в базе данных',
  'Gesamtumsatz':         'Общий оборот',
  'aus Rechnungen':       'из счетов',
  'Aktive Kunden':        'Активных клиентов',
  'mit Umsatz':           'с оборотом',
  'Keine Kunden vorhanden': 'Клиентов нет',
  'Kunde anlegen / bearbeiten': 'Создать / редактировать клиента',
  'Name / Firma *':       'Имя / Компания *',
  'Ansprechpartner':      'Контактное лицо',
  'Straße und Hausnummer':'Улица и номер дома',
  'Aus Kundenliste':      'Из базы клиентов',
  'Kunde auswählen':      'Выбрать клиента',
  'Kunde übernommen':     'Клиент выбран',
  'Kunde gespeichert!':   'Клиент сохранён!',
  'Keine E-Mail-Adresse vorhanden': 'E-Mail адрес не указан',
  'PDF wird erstellt...': 'PDF создаётся...',
  'PDF gespeichert!':     'PDF сохранён!',
  'PDF gespeichert · E-Mail wird geöffnet': 'PDF сохранён · Открывается почта',
  'Aus.':          'Отключено.',
  'Ein (5 Min)':   'Включено (каждые 5 мин)',
  'Gespeichert ✓': 'Успешно сохранено ✓',
  'Ausgeschaltet': 'Выключено'
}

// ─── Состояние языка ──────────────────────────────────────────
let currentLang = localStorage.getItem('app_lang') || 'de';
window.t = k => (currentLang === 'ru' && DICT_RU[k]) ? DICT_RU[k] : k;
window.getLang = () => currentLang;

// ─── Перевод элемента ─────────────────────────────────────────
function translateEl(el) {
  if (!el || currentLang !== 'ru') return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const p = node.parentNode;
    if (!p || ['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(p.tagName)) return;
    const s = node.textContent.trim();
    if (!s) return;
    // Exact match
    if (DICT_RU[s]) {
      node.textContent = node.textContent.replace(s, DICT_RU[s]);
      return;
    }
    // Try all dict keys as substring replacements (longest first to avoid partial overlaps)
    let text = node.textContent;
    let changed = false;
    const keys = Object.keys(DICT_RU).sort((a,b) => b.length - a.length);
    for (const k of keys) {
      if (k.length > 3 && text.includes(k)) {
        text = text.split(k).join(DICT_RU[k]);
        changed = true;
      }
    }
    if (changed) node.textContent = text;
  });
  el.querySelectorAll('[placeholder]').forEach(e => {
    const v = e.getAttribute('placeholder');
    if (DICT_RU[v]) e.setAttribute('placeholder', DICT_RU[v]);
  });
  el.querySelectorAll('[title]').forEach(e => {
    const v = e.getAttribute('title');
    if (DICT_RU[v]) e.setAttribute('title', DICT_RU[v]);
  });
  el.querySelectorAll('option').forEach(e => {
    const v = e.textContent.trim();
    if (DICT_RU[v]) e.textContent = DICT_RU[v];
    // value= всегда остаётся немецким ключом — не трогаем!
  });
  // Labels (for inputs)
  el.querySelectorAll('label').forEach(e => {
    // Only translate text nodes inside label, not child elements
    e.childNodes.forEach(n => {
      if (n.nodeType === 3) { // TEXT_NODE
        const v = n.textContent.trim();
        if (DICT_RU[v]) n.textContent = n.textContent.replace(v, DICT_RU[v]);
      }
    });
  });
}

// Handle data-ru attributes — direct translation without dict lookup
function applyDataRu(root) {
  if (currentLang !== 'ru') return;
  (root || document.body).querySelectorAll('[data-ru]').forEach(el => {
    if (!el._origText) el._origText = el.textContent;
    el.textContent = el.getAttribute('data-ru');
  });
}

window.applyTranslations = () => {
  translateEl(document.body);
  applyDataRu(document.body);
};

// ─── Переключатель языка ──────────────────────────────────────
function injectLangSwitcher() {
  const style = document.createElement('style');
  style.textContent = `
    #lang-switcher{display:flex;align-items:center;gap:3px;background:var(--s2);
      border:1px solid var(--border);border-radius:20px;padding:3px 4px;flex-shrink:0}
    .lang-btn{background:none;border:none;cursor:pointer;font-size:11px;font-weight:600;
      padding:3px 8px;border-radius:14px;color:var(--sub);transition:all .15s;
      letter-spacing:.03em;white-space:nowrap}
    .lang-btn.active{background:var(--blue);color:#fff}
    .lang-btn:hover:not(.active){color:var(--text);background:var(--border)}
    @media(max-width:768px){
      #lang-switcher{display:none !important}
      #mob-lang-de.mob-lang-active,#mob-lang-ru.mob-lang-active{background:var(--blue);color:#fff !important}
    }
  `;
  document.head.appendChild(style);

  // Desktop switcher
  const hd = document.querySelector('.hd');
  if (hd) {
    const sw = document.createElement('div');
    sw.id = 'lang-switcher';
    sw.innerHTML = `
      <button class="lang-btn ${currentLang==='de'?'active':''}" onclick="switchLang('de')">🇩🇪 DE</button>
      <button class="lang-btn ${currentLang==='ru'?'active':''}" onclick="switchLang('ru')">🇷🇺 RU</button>
    `;
    hd.prepend(sw);
  }

  // Mobile drawer buttons — mark active
  const mobDe = document.getElementById('mob-lang-de');
  const mobRu = document.getElementById('mob-lang-ru');
  if (mobDe && mobRu) {
    if (currentLang === 'de') mobDe.classList.add('mob-lang-active');
    else mobRu.classList.add('mob-lang-active');
  }
}

window.switchLang = function(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  location.reload();
};

// ─── MutationObserver для динамического контента ──────────────
function startObserver() {
  if (currentLang !== 'ru') return;
  new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) translateEl(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
}

// ─── Старт ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectLangSwitcher();
  if (currentLang === 'ru') {
    setTimeout(() => { applyTranslations(); startObserver(); }, 80);
  }
});
