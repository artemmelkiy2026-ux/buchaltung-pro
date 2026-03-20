/* ═══════════════════════════════════════════════════════════════════════
   CUSTOM UI — кастомные dropdown и confirm/alert в стиль программы
   ═══════════════════════════════════════════════════════════════════════ */

// ── КАСТОМНЫЙ CONFIRM / ALERT ─────────────────────────────────────────────

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
    @keyframes cs-fade-in  { from{opacity:0} to{opacity:1} }
    @keyframes cs-slide-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes app-confirm-in {
      from{opacity:0;transform:scale(.93) translateY(8px)}
      to  {opacity:1;transform:scale(1) translateY(0)}
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
        primary: 'background:var(--blue);color:#fff;border:none',
        danger:  'background:var(--red);color:#fff;border:none',
        success: 'background:var(--green);color:#fff;border:none',
        default: 'background:var(--s2);color:var(--text);border:1px solid var(--border)',
      };
      btn.style.cssText = `padding:10px 22px;border-radius:4px;font-size:14px;font-weight:600;
        cursor:pointer;min-width:100px;font-family:inherit;${styles[style]||styles.default}`;
      btn.onclick = () => {
        document.getElementById('app-confirm-overlay').classList.remove('visible');
        resolve(value);
      };
      btnsEl.appendChild(btn);
    });
    document.getElementById('app-confirm-overlay').classList.add('visible');
  });
}

window._nativeConfirm = window.confirm;
window.confirm = function(message) { return window._nativeConfirm(message); };

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
  return _showAppDialog({ icon, title, message, buttons: [{ label: 'OK', value: true, style: 'primary' }] });
};

// ── КАСТОМНЫЙ SELECT ──────────────────────────────────────────────────────
// Оптимизации:
// • Один глобальный click-listener вместо N штук
// • Опции строятся ЛЕНИВО — только при первом открытии
// • MutationObserver только помечает dirty, не пересоздаёт сразу
// • Object.defineProperty не используется — вместо этого updateCS(id)

const CS_SKIP    = ['nf-mwst-rate'];
const CS_COMPACT = ['rep-yr','dash-yr','z-yr','prog-yr','kat-yr','ust-yr','fb-yr','fb-auto-filter'];
const CS_MAP     = new Map(); // id → CustomSelect instance

// Один глобальный обработчик закрытия
document.addEventListener('click', (e) => {
  if (e.target.closest('.cs-wrap')) return;
  CS_MAP.forEach(cs => cs._close());
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') CS_MAP.forEach(cs => cs._close());
});

class CustomSelect {
  constructor(sel) {
    this.sel      = sel;
    this.id       = sel.id;
    this._dirty   = true; // нужно перестроить опции
    this._built   = false;
    this._build();
    CS_MAP.set(this.id, this);
    // MutationObserver — просто помечаем dirty
    const mo = new MutationObserver(() => { this._dirty = true; this._updateLabel(); });
    mo.observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected'] });
  }

  _build() {
    const sel       = this.sel;
    const isCompact = CS_COMPACT.includes(this.id);
    const wrap = document.createElement('div');
    wrap.className = 'cs-wrap';
    wrap.style.cssText = `position:relative;display:${isCompact?'inline-block':'block'};width:${isCompact?'auto':'100%'}`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `cs-trigger${isCompact?' cs-trigger--compact':''}`;
    trigger.innerHTML = `
      <span class="cs-label"></span>
      <i class="fas fa-chevron-down cs-arrow"></i>`;

    const panel = document.createElement('div');
    panel.className = 'cs-panel';

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    sel.parentNode.insertBefore(wrap, sel);
    sel.style.display = 'none';
    wrap.appendChild(sel);

    trigger.addEventListener('click', (e) => { e.stopPropagation(); this._toggle(); });

    this.wrap    = wrap;
    this.trigger = trigger;
    this.panel   = panel;
    this.label   = trigger.querySelector('.cs-label');
    this.arrow   = trigger.querySelector('.cs-arrow');

    this._updateLabel();
  }

  // Строим опции только когда нужно (лениво)
  _ensureOptions() {
    if (!this._dirty) return;
    this._dirty = false;
    const panel = this.panel;
    panel.innerHTML = '';
    Array.from(this.sel.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = 'cs-item';
      item.dataset.value = opt.value;
      item.style.cssText = `padding:8px 12px;border-radius:var(--r);cursor:pointer;font-size:13px;
        color:var(--text);display:flex;align-items:center;gap:8px;`;
      item.innerHTML = `<span style="flex:1">${opt.innerHTML||opt.text}</span>`;
      item.addEventListener('click', () => {
        this.sel.value = opt.value;
        this._updateLabel();
        this._close();
        this.sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      panel.appendChild(item);
    });
  }

  _updateLabel() {
    const opt = this.sel.options[this.sel.selectedIndex];
    if (opt) this.label.innerHTML = opt.innerHTML || opt.text;
    // Подсветка активного (только если опции уже построены)
    if (!this._dirty) {
      this.panel.querySelectorAll('.cs-item').forEach(item => {
        const active = item.dataset.value === this.sel.value;
        item.style.background = active ? 'var(--bdim)' : '';
        item.style.fontWeight = active ? '600' : '400';
        item.style.color      = active ? 'var(--blue)' : 'var(--text)';
      });
    }
  }

  _toggle() { this.panel.style.display === 'none' ? this._open() : this._close(); }

  _open() {
    // Закрываем все остальные
    CS_MAP.forEach((cs, id) => { if (id !== this.id) cs._close(); });

    this._ensureOptions(); // строим опции лениво
    this._updateLabel();

    this.trigger.style.borderColor = 'var(--blue)';
    this.arrow.style.transform     = 'rotate(180deg)';

    if (window.innerWidth <= 768) {
      this._openMobile();
    } else {
      this.panel.style.display = 'block';
      // Позиция: вверх если нет места снизу
      const rect  = this.trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const ph    = Math.min(260, this.panel.scrollHeight + 8);
      if (below < ph && rect.top > below) {
        this.panel.style.top = 'auto'; this.panel.style.bottom = 'calc(100% + 4px)';
      } else {
        this.panel.style.top = 'calc(100% + 4px)'; this.panel.style.bottom = 'auto';
      }
      const active = this.panel.querySelector(`[data-value="${CSS.escape(this.sel.value)}"]`);
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }

  _openMobile() {
    const overlay = document.createElement('div');
    overlay.className = 'cs-mob-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;
      display:flex;align-items:flex-end;justify-content:center;animation:cs-fade-in .15s ease`;
    const label = this.wrap.parentElement?.querySelector('label');
    overlay.innerHTML = `
      <div style="background:var(--s1);border-radius:18px 18px 0 0;width:100%;
        max-height:70vh;overflow:hidden;display:flex;flex-direction:column;
        animation:cs-slide-up .22s ease;padding-bottom:env(safe-area-inset-bottom,0)">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:14px 18px 10px;border-bottom:1px solid var(--border);flex-shrink:0">
          <span style="font-size:15px;font-weight:700;color:var(--text)">${label?.textContent||''}</span>
          <button style="background:var(--s2);border:1px solid var(--border);border-radius:var(--r);
            width:30px;height:30px;cursor:pointer;font-size:16px;color:var(--sub);
            display:flex;align-items:center;justify-content:center"
            onclick="this.closest('.cs-mob-overlay').remove()">✕</button>
        </div>
        <div class="cs-mob-list" style="overflow-y:auto;padding:8px;flex:1"></div>
      </div>`;
    const list = overlay.querySelector('.cs-mob-list');
    Array.from(this.sel.options).forEach(opt => {
      const active = opt.value === this.sel.value;
      const item = document.createElement('div');
      item.style.cssText = `padding:14px 16px;border-radius:4px;cursor:pointer;font-size:15px;
        display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px;
        background:${active?'var(--bdim)':'transparent'};
        color:${active?'var(--blue)':'var(--text)'};font-weight:${active?'700':'400'}`;
      item.innerHTML = `<span>${opt.innerHTML||opt.text}</span>${active?'<i class="fas fa-check" style="color:var(--blue);font-size:13px"></i>':''}`;
      item.addEventListener('click', () => {
        this.sel.value = opt.value;
        this._updateLabel();
        this.sel.dispatchEvent(new Event('change', { bubbles: true }));
        overlay.style.opacity = '0'; overlay.style.transition = 'opacity .15s';
        setTimeout(() => overlay.remove(), 150);
        this._close();
      });
      list.appendChild(item);
    });
    overlay.addEventListener('click', e => { if (e.target===overlay) { overlay.remove(); this._close(); } });
    document.body.appendChild(overlay);
    const activeItem = list.querySelector(`div[style*="var(--bdim)"]`);
    if (activeItem) setTimeout(() => activeItem.scrollIntoView({ block:'center' }), 50);
  }

  _close() {
    this.panel.style.display      = 'none';
    this.arrow.style.transform    = '';
    this.trigger.style.borderColor = '';
    document.querySelectorAll('.cs-mob-overlay').forEach(o => o.remove());
  }
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────

function initCustomUI() {
  document.querySelectorAll('select').forEach(sel => {
    if (CS_SKIP.includes(sel.id)) return;
    if (sel.closest('.cs-wrap')) return;
    try { new CustomSelect(sel); } catch(e) { console.warn('CustomSelect:', sel.id, e); }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomUI);
} else {
  initCustomUI();
}

// Вызывать после динамического добавления select в DOM
window.reinitCustomSelects = function() {
  document.querySelectorAll('select').forEach(sel => {
    if (CS_SKIP.includes(sel.id)) return;
    if (sel.closest('.cs-wrap')) return;
    try { new CustomSelect(sel); } catch(e) {}
  });
};

// Обновить label конкретного select после программного sel.value = '...'
window.updateCS = function(id) {
  const cs = CS_MAP.get(id);
  if (cs) { cs._dirty = true; cs._updateLabel(); }
};
