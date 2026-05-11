/**
 * sherry_theme.js
 * ───────────────────────────────────────────────────────
 * Utilidades JS para sherry_theme · by RemiH06 · iroFactory
 *
 * Uso mínimo:
 *   <script src="sherry_theme.js"></script>
 *   <!-- El tema se inicializa automáticamente -->
 *
 * API disponible en window.sherry:
 *   sherry.toggleTheme()        → alterna oscuro/claro
 *   sherry.setTheme('dark')     → fuerza modo oscuro
 *   sherry.setTheme('light')    → fuerza modo claro
 *   sherry.getTheme()           → 'dark' | 'light'
 *   sherry.onThemeChange(fn)    → callback al cambiar tema
 *   sherry.toggleCRT()          → alterna efecto scanlines
 *   sherry.toggleGrid()         → alterna fondo triangular
 */

(function () {
  'use strict';

  const STORAGE_KEY  = 'sherry-theme';
  const STORAGE_CRT  = 'sherry-crt';
  const STORAGE_GRID = 'sherry-grid';
  const listeners = [];

  // ── Elemento raíz ────────────────────────────────────────
  function getRoot() {
    return document.querySelector('.sherry') || document.body;
  }

  function getSaved(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  // ── Aplicar tema ─────────────────────────────────────────
  function applyTheme(theme) {
    const root = getRoot();
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    save(STORAGE_KEY, theme);

    document.querySelectorAll('[data-sherry-toggle]').forEach(btn => {
      btn.textContent = theme === 'light' ? '⬛ dark' : '⬜ light';
    });

    listeners.forEach(fn => fn(theme));

    // Si el CRT está activo, re-aplicar según el nuevo tema
    if (getRoot().classList.contains('sherry-crt')) {
      applyCRT(true);
    }
  }

  // ── CRT / Grid ───────────────────────────────────────────
  function applyCRT(enabled) {
    const isDark = !getRoot().classList.contains('light');
    if (enabled && isDark) {
      document.body.style.background = 'repeating-linear-gradient(to bottom, #080808 0px, #080808 3px, #0a0c10 3px, #0a0c10 4px)';
    } else {
      document.body.style.background = '';
    }
    getRoot().classList.toggle('sherry-crt', enabled);
    save(STORAGE_CRT, enabled ? '1' : '0');
  }

  function applyGrid(enabled) {
    getRoot().classList.toggle('sherry-tri', enabled);
    save(STORAGE_GRID, enabled ? '1' : '0');
  }

  // ── Inicializar ──────────────────────────────────────────
  function init() {
    // Oscuro por defecto — no sigue preferencia del sistema
    const saved = getSaved(STORAGE_KEY) || 'dark';
    applyTheme(saved);

    // Grid activo por defecto; CRT apagado por defecto
    if (getSaved(STORAGE_GRID) !== '0') applyGrid(true);
    if (getSaved(STORAGE_CRT)  === '1') applyCRT(true);
  }

  // ── API pública ──────────────────────────────────────────
  window.sherry = {
    toggleTheme() {
      const current = getRoot().classList.contains('light') ? 'light' : 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    },
    setTheme(t) {
      applyTheme(t === 'light' ? 'light' : 'dark');
    },
    getTheme() {
      return getRoot().classList.contains('light') ? 'light' : 'dark';
    },
    onThemeChange(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },
    toggleCRT() {
      applyCRT(!getRoot().classList.contains('sherry-crt'));
    },
    toggleGrid() {
      applyGrid(!getRoot().classList.contains('sherry-tri'));
    },
  };

  // ── Auto-init ────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();