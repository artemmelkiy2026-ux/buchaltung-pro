/* ═══════════════════════════════════════════════════════════════════════
   CUSTOM UI — кастомные dropdown и confirm/alert в стиль программы
   Подключается ПОСЛЕДНИМ скриптом на странице
   ═══════════════════════════════════════════════════════════════════════ */

// ── КАСТОМНЫЙ CONFIRM / ALERT ─────────────────────────────────────────────
// Заменяем window.confirm и window.alert на красивые модалки

window._customConfirmResolve = null;

(function injectConfirmModal() {
  const div = document.createElement('div');
  div.id = 'app-confirm-overlay';
  div.style.cssText = [
    'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);',
    'z-index:9999;align-items:center;justify-content:center;padding:20px'
  ].join('');
  div.innerHTML = `
    <div id="app-confirm-box" style="
      background:var(--s1);border:1px solid var(--border);border-radius:6px;
      padding:28px 24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);
      animation:app-confirm-in .18s ease">
      <div id="app-confirm-icon" style="text-align:center;margin-bottom:14px;font-size:36px"></div>
      <div id="app-confirm-title" style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;text-align:center"></div>
      <div id="app-confirm-msg" style="font-size:14px;color:var(--sub);line-height:1.6;text-align:center;margin-bottom:22px"></div>
      <div id="app-confirm-btns" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"></div>
    </div>`;
  document.body.appendChild(div);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cs-fade-in {
      from { opacity:0; } to { opacity:1; }
    }
    @keyframes cs-slide-up {
      from { transform:translateY(100%); } to { transform:translateY(0); }
    }
    @keyframes app-confirm-in {
      from { opacity:0; transform:scale(.93) translateY(8px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    #app-confirm-overlay { display:none; }
    #app-confirm-overlay.visible { display:flex !important; }
  `;
  document.head.appendChild(style);
})();

function _showAppDialog({ icon='⚠️', title='', message='', buttons=[] }) {
  return new Promise(resolve => {
    document.getElementById('app-confirm-icon').textContent  = icon;
    document.getElementById('app-confirm-title').textContent = title;
    document.getElementById('app-confirm-msg').innerHTML     = message;
    const btnsEl = document.getElementById('app-confirm-btns');
    btnsEl.innerHTML = '';
    buttons.forEach(({ label, value, style='default' }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      const styles = {
        primary:  'background:var(--blue);color:#fff;border:none',
        danger:   'background:var(--red);color:#fff;border:none',
        success:  'background:var(--green);color:#fff;border:none',
        default:  'background:var(--s2);color:var(--text);border:1px solid var(--border)',
      };
      btn.style.cssText = `
        padding:10px 22px;border-radius:4px;font-size:14px;font-weight:600;
        cursor:pointer;min-width:100px;font-family:inherit;
        ${styles[style]||styles.default}`;
      btn.onclick = () => {
        document.getElementById('app-confirm-overlay').classList.remove('visible');
        resolve(value);
      };
      btnsEl.appendChild(btn);
    });
    document.getElementById('app-confirm-overlay').classList.add('visible');
  });
}

// Сохраняем оригинальный confirm ДО переопределения
window._nativeConfirm = window.confirm;
// Заменяем window.confirm — проксируем на нативный
window.confirm = function(message) {
  return window._nativeConfirm(message);
};

// Новая глобальная функция для async confirm
window.appConfirm = function(message, { title='Bestätigung', icon='❓', okLabel='Ja', cancelLabel='Abbrechen', danger=false }={}) {
  return _showAppDialog({
    icon, title, message,
    buttons: [
      { label: cancelLabel, value: false, style: 'default' },
      { label: okLabel,     value: true,  style: danger ? 'danger' : 'primary' },
    ]
  });
};

window.appAlert = function(message, { title='Hinweis', icon='ℹ️' }={}) {
  return _showAppDialog({
    icon, title, message,
    buttons: [{ label: 'OK', value: true, style: 'primary' }]
  });
};

// ── КАСТОМНЫЙ SELECT DROPDOWN ─────────────────────────────────────────────

const CS_SKIP = ['nf-mwst-rate']; // уже кастомный — пропускаем
// Селекты которым нужна фиксированная компактная ширина (год-фильтры)
const CS_COMPACT = ['rep-yr','dash-yr','z-yr','prog-yr','kat-yr','ust-yr'];

class CustomSelect {
  constructor(originalSelect) {
    this.sel = originalSelect;
    this.id  = originalSelect.id;
    this._build();
    this._syncFromOriginal();
    this._observe();
  }

  _build() {
    const sel = this.sel;

    // Обёртка
    const wrap = document.createElement('div');
    wrap.className = 'cs-wrap';
    wrap.style.cssText = 'position:relative;display:block;width:100%';
    if (sel.style.width) wrap.style.width = sel.style.width;

    // Кнопка-триггер
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    const isCompact = CS_COMPACT.includes(this.id);
    trigger.style.cssText = `
      display:inline-flex;align-items:center;justify-content:space-between;gap:8px;
      width:${isCompact ? 'auto' : '100%'};min-width:${isCompact ? '90px' : '0'};padding:7px 12px;
      background:var(--s2);border:1px solid var(--border);border-radius:var(--r);
      color:var(--text);font-size:14px;font-family:inherit;font-weight:500;
      cursor:pointer;text-align:left;outline:none;
      transition:border-color .15s,box-shadow .15s;`;
    if (isCompact) wrap.style.width = 'auto';
    trigger.innerHTML = `
      <span class="cs-label" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
      <i class="fas fa-chevron-down cs-arrow" style="font-size:10px;color:var(--sub);flex-shrink:0;transition:transform .2s"></i>`;

    // Копируем font-size если был задан
    const origFs = sel.style.fontSize || sel.style.getPropertyValue('font-size');
    if (origFs) trigger.style.fontSize = origFs;
    const origFw = sel.style.fontFamily;
    if (origFw) trigger.style.fontFamily = origFw;

    // Dropdown панель
    const panel = document.createElement('div');
    panel.className = 'cs-panel';
    panel.style.cssText = `
      display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);
      background:var(--s1);border:1px solid var(--border);border-radius:4px;
      box-shadow:0 8px 30px rgba(0,0,0,.15);z-index:1000;
      max-height:260px;overflow-y:auto;padding:4px;
      min-width:180px;width:max-content;max-width:min(320px, 90vw);
      right:0;left:auto;`;

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    // Вставляем обёртку перед оригиналом, скрываем оригинал
    sel.parentNode.insertBefore(wrap, sel);
    sel.style.display = 'none';
    wrap.appendChild(sel);

    this.wrap    = wrap;
    this.trigger = trigger;
    this.panel   = panel;
    this.label   = trigger.querySelector('.cs-label');
    this.arrow   = trigger.querySelector('.cs-arrow');

    // События
    trigger.addEventListener('click', (e) => { e.stopPropagation(); this._toggle(); });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) this._close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._close();
    });

    this._buildOptions();
  }

  _buildOptions() {
    const panel = this.panel;
    panel.innerHTML = '';
    Array.from(this.sel.options).forEach((opt, i) => {
      const item = document.createElement('div');
      item.className = 'cs-item';
      item.dataset.value = opt.value;
      item.dataset.index = i;
      item.style.cssText = `
        padding:8px 12px;border-radius:7px;cursor:pointer;font-size:13px;
        color:var(--text);transition:background .12s;display:flex;align-items:center;gap:8px;`;
      item.innerHTML = `<span style="flex:1">${opt.innerHTML||opt.text}</span>`;
      item.addEventListener('mouseenter', () => { item.style.background = 'var(--s2)'; });
      item.addEventListener('mouseleave', () => {
        item.style.background = item.dataset.value === this.sel.value ? 'var(--bdim)' : '';
      });
      item.addEventListener('click', () => {
        this.sel.value = opt.value;
        this._updateLabel();
        this._close();
        // Триггерим change событие
        this.sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      panel.appendChild(item);
    });
  }

  _updateLabel() {
    const opt = this.sel.options[this.sel.selectedIndex];
    if (opt) {
      this.label.innerHTML = opt.innerHTML || opt.text;
    }
    // Подсветка активного
    this.panel.querySelectorAll('.cs-item').forEach(item => {
      const active = item.dataset.value === this.sel.value;
      item.style.background  = active ? 'var(--bdim)' : '';
      item.style.fontWeight  = active ? '600' : '400';
      item.style.color       = active ? 'var(--blue)' : 'var(--text)';
    });
  }

  _syncFromOriginal() {
    this._buildOptions();
    this._updateLabel();
  }

  _toggle() {
    this.panel.style.display === 'none' ? this._open() : this._close();
  }

  _isMobile() {
    return window.innerWidth <= 768;
  }

  _open() {
    // Закрываем все другие
    document.querySelectorAll('.cs-panel').forEach(p => { p.style.display = 'none'; });
    document.querySelectorAll('.cs-arrow').forEach(a => { a.style.transform = ''; });
    // Убираем все мобильные оверлеи
    document.querySelectorAll('.cs-mob-overlay').forEach(o => o.remove());

    this.trigger.style.borderColor = 'var(--blue)';
    this.trigger.style.boxShadow   = '0 0 0 2px rgba(59,130,246,.2)';
    this.arrow.style.transform     = 'rotate(180deg)';

    // Пересоздаём опции
    this._buildOptions();
    this._updateLabel();

    if (this._isMobile()) {
      // ── МОБИЛЬ: bottom sheet ──────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.className = 'cs-mob-overlay';
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;
        display:flex;align-items:flex-end;justify-content:center;
        animation:cs-fade-in .15s ease`;
      overlay.innerHTML = `
        <div class="cs-mob-sheet" style="
          background:var(--s1);border-radius:4px 18px 0 0;width:100%;
          max-height:70vh;overflow:hidden;display:flex;flex-direction:column;
          animation:cs-slide-up .22s ease;padding-bottom:env(safe-area-inset-bottom,0)">
          <div style="display:flex;align-items:center;justify-content:space-between;
            padding:14px 18px 10px;border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:15px;font-weight:700;color:var(--text)" id="cs-mob-title"></span>
            <button style="background:var(--s2);border:1px solid var(--border);border-radius:var(--r);
              width:30px;height:30px;cursor:pointer;font-size:16px;color:var(--sub);
              display:flex;align-items:center;justify-content:center"
              onclick="this.closest('.cs-mob-overlay').remove()">✕</button>
          </div>
          <div class="cs-mob-list" style="overflow-y:auto;padding:8px;flex:1"></div>
        </div>`;

      // Заголовок = label над select
      const label = this.wrap.parentElement?.querySelector('label');
      overlay.querySelector('#cs-mob-title').textContent = label?.textContent || '';

      // Опции
      const list = overlay.querySelector('.cs-mob-list');
      Array.from(this.sel.options).forEach(opt => {
        const item = document.createElement('div');
        const active = opt.value === this.sel.value;
        item.style.cssText = `
          padding:14px 16px;border-radius:4px;cursor:pointer;font-size:15px;
          display:flex;align-items:center;justify-content:space-between;gap:10px;
          background:${active ? 'var(--bdim)' : 'transparent'};
          color:${active ? 'var(--blue)' : 'var(--text)'};
          font-weight:${active ? '700' : '400'};
          margin-bottom:2px;`;
        item.innerHTML = `<span>${opt.innerHTML||opt.text}</span>${active ? '<i class="fas fa-check" style="color:var(--blue);font-size:13px"></i>' : ''}`;
        item.addEventListener('click', () => {
          this.sel.value = opt.value;
          this._updateLabel();
          this.sel.dispatchEvent(new Event('change', { bubbles: true }));
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity .15s';
          setTimeout(() => overlay.remove(), 150);
          this._close();
        });
        list.appendChild(item);
      });

      // Закрыть по клику на оверлей
      overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.remove(); this._close(); }
      });

      document.body.appendChild(overlay);

      // Скроллим к активному
      const activeItem = list.querySelector(`[style*="var(--bdim)"]`);
      if (activeItem) setTimeout(() => activeItem.scrollIntoView({ block: 'center' }), 50);

    } else {
      // ── ДЕСКТОП: обычный dropdown ─────────────────────────────────────
      this.panel.style.display = 'block';

      // Позиционируем: вверх если снизу не хватает места
      const triggerRect = this.trigger.getBoundingClientRect();
      const panelH = Math.min(260, this.panel.scrollHeight + 8);
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      if (spaceBelow < panelH && triggerRect.top > spaceBelow) {
        this.panel.style.top    = 'auto';
        this.panel.style.bottom = 'calc(100% + 4px)';
      } else {
        this.panel.style.top    = 'calc(100% + 4px)';
        this.panel.style.bottom = 'auto';
      }

      // Скроллим к активному
      const active = this.panel.querySelector(`[data-value="${CSS.escape(this.sel.value)}"]`);
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }

  _close() {
    this.panel.style.display = 'none';
    this.arrow.style.transform = '';
    this.trigger.style.borderColor = '';
    this.trigger.style.boxShadow   = '';
    // Убираем мобильный overlay если есть
    document.querySelectorAll('.cs-mob-overlay').forEach(o => o.remove());
  }

  // Наблюдатель — если JS меняет select.value программно
  _observe() {
    // Полифил: перехватываем .value setter
    const sel = this.sel;
    const self = this;
    const orig = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (orig) {
      Object.defineProperty(sel, 'value', {
        get() { return orig.get.call(sel); },
        set(v) {
          orig.set.call(sel, v);
          self._updateLabel();
        }
      });
    }
    // Также слушаем изменения options (MutationObserver)
    const mo = new MutationObserver(() => self._syncFromOriginal());
    mo.observe(sel, { childList: true, subtree: true });
  }
}

// ── ИНИЦИАЛИЗАЦИЯ — запускается после загрузки DOM ───────────────────────

function initCustomUI() {
  // Заменяем все select на странице кроме исключённых
  document.querySelectorAll('select').forEach(sel => {
    if (CS_SKIP.includes(sel.id)) return;
    if (sel.closest('.cs-wrap')) return; // уже обёрнут
    try { new CustomSelect(sel); } catch(e) { console.warn('CustomSelect error:', sel.id, e); }
  });
}

// Запускаем после полной загрузки
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomUI);
} else {
  initCustomUI();
}

// Экспортируем для вызова после динамических изменений DOM
window.reinitCustomSelects = function() {
  document.querySelectorAll('select').forEach(sel => {
    if (CS_SKIP.includes(sel.id)) return;
    if (sel.closest('.cs-wrap')) return;
    try { new CustomSelect(sel); } catch(e) {}
  });
};
