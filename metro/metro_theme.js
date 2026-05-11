/**
 * metro_theme.js
 * ───────────────────────────────────────────────────────
 * Utilidades JS para metro_theme · by RemiH06
 *
 * Uso mínimo:
 *   <script src="metro_theme.js"></script>
 *   <!-- El tema se inicializa automáticamente -->
 *
 * API disponible en window.metro:
 *   metro.toggleTheme()        → alterna claro/oscuro
 *   metro.setTheme('dark')     → fuerza modo oscuro
 *   metro.setTheme('light')    → fuerza modo claro
 *   metro.getTheme()           → 'dark' | 'light'
 *   metro.onThemeChange(fn)    → callback al cambiar tema
 */

(function () {
  'use strict';

  // ── Elemento raíz ───────────────────────────────────────
  function getRoot() {
    return document.querySelector('.metro') || document.body;
  }

  // ── Guardar/leer preferencia ────────────────────────────
  const STORAGE_KEY = 'metro-theme';

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function save(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }

  // ── Aplicar tema ────────────────────────────────────────
  const listeners = [];

  function applyTheme(theme) {
    const root = getRoot();
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    save(theme);

    // Actualizar botones de toggle si existen
    document.querySelectorAll('[data-metro-toggle]').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
    });

    // Callbacks registrados
    listeners.forEach(fn => fn(theme));
  }

  // ── Inicializar ─────────────────────────────────────────
  function init() {
    const saved = getSaved();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    // Escuchar cambios del sistema si no hay preferencia guardada
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!getSaved()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  // ── API pública ─────────────────────────────────────────
  window.metro = {
    toggleTheme() {
      const current = getRoot().classList.contains('dark') ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    },
    setTheme(theme) {
      applyTheme(theme === 'dark' ? 'dark' : 'light');
    },
    getTheme() {
      return getRoot().classList.contains('dark') ? 'dark' : 'light';
    },
    onThemeChange(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },
  };

  // ── Auto-init ───────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
