/**
 * elixir_theme.js
 * ───────────────────────────────────────────────────────
 * Utilidades JS para elixir_theme · by RemiH06 · iroFactory
 *
 * Uso mínimo:
 *   <script src="elixir_theme.js"></script>
 *
 * API disponible en window.elixir:
 *   elixir.toggleTheme()     → alterna claro/oscuro
 *   elixir.setTheme('dark')  → fuerza modo oscuro
 *   elixir.setTheme('light') → fuerza modo claro
 *   elixir.getTheme()        → 'dark' | 'light'
 *   elixir.onThemeChange(fn) → callback al cambiar tema
 *   elixir.graph.pause()     → pausa la animación
 *   elixir.graph.resume()    → reanuda la animación
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'elixir-theme';
  const listeners   = [];

  // ── Raíz ─────────────────────────────────────────────
  function getRoot() {
    return document.querySelector('.elixir') || document.body;
  }

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function save(t) {
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }

  // ── Aplicar tema ──────────────────────────────────────
  function applyTheme(theme) {
    const root = getRoot();
    root.classList.toggle('dark', theme === 'dark');
    save(theme);

    document.querySelectorAll('[data-elixir-toggle]').forEach(btn => {
      btn.textContent = theme === 'dark' ? '◑ light' : '◐ dark';
    });

    listeners.forEach(fn => fn(theme));
    if (window._elixirGraph) window._elixirGraph.syncColors();
  }

  // ── API pública ───────────────────────────────────────
  window.elixir = {
    toggleTheme() {
      applyTheme(getRoot().classList.contains('dark') ? 'light' : 'dark');
    },
    setTheme(t) {
      applyTheme(t === 'dark' ? 'dark' : 'light');
    },
    getTheme() {
      return getRoot().classList.contains('dark') ? 'dark' : 'light';
    },
    onThemeChange(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },
    graph: {
      pause()  { if (window._elixirGraph) window._elixirGraph.pause();  },
      resume() { if (window._elixirGraph) window._elixirGraph.resume(); },
    },
  };

  // ════════════════════════════════════════════════════
  // NEURAL GRAPH
  // ════════════════════════════════════════════════════
  const PALETTES = {
    light: {
      nodes: ['#0A5C58','#2A3A7A','#1A5C30','#3A2A6A','#1A4A6A','#3A4A6A','#2A3C52'],
      edge:  '#B8BDD0',
      pulse: ['#0A5C58','#2A3A7A','#1A5C30','#3A2A6A','#1A4A6A'],
    },
    dark: {
      nodes: ['#00E8D8','#4D8FFF','#00F090','#8060FF','#00C8FF','#7090C0','#5080A0'],
      edge:  '#181E2E',
      pulse: ['#00E8D8','#4D8FFF','#00F090','#8060FF','#00C8FF'],
    },
  };

  function initGraph() {
    const canvas = document.getElementById('elixir-graph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, raf, paused = false, last = 0;

    const NODE_COUNT = 42;
    const EDGE_DIST  = 160;
    const SPEED      = 0.22;

    let nodes = [];

    function palette() {
      return getRoot().classList.contains('dark') ? PALETTES.dark : PALETTES.light;
    }

    function rndColor(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function makeNode() {
      const pal = palette();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * SPEED,
        vy: (Math.random() - .5) * SPEED,
        r: 2 + Math.random() * 2.5,
        color: rndColor(pal.nodes),
        pulseColor: null,
        pulseT: 0,
        pulseDur: 0,
      };
    }

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function spawnPulse() {
      if (paused) return;
      const n   = nodes[Math.floor(Math.random() * nodes.length)];
      const pal = palette();
      n.pulseColor = rndColor(pal.pulse);
      n.pulseT     = 0;
      n.pulseDur   = 700 + Math.random() * 800;
      setTimeout(spawnPulse, 300 + Math.random() * 1000);
    }

    function draw(ts) {
      if (paused) return;
      const dt = Math.min(ts - last, 50);
      last = ts;
      ctx.clearRect(0, 0, W, H);

      const pal = palette();

      // Aristas
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EDGE_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = pal.edge;
            ctx.globalAlpha = (1 - dist / EDGE_DIST) * .7;
            ctx.lineWidth   = .7;
            ctx.stroke();
          }
        }
      }

      // Nodos
      for (const n of nodes) {
        // mover
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) { n.vx *= -1; n.x = Math.max(0, Math.min(W, n.x)); }
        if (n.y < 0 || n.y > H) { n.vy *= -1; n.y = Math.max(0, Math.min(H, n.y)); }

        let color = n.color;
        let r     = n.r;

        if (n.pulseColor && n.pulseDur > 0) {
          n.pulseT += dt;
          const t    = Math.min(n.pulseT / n.pulseDur, 1);
          const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          r          = n.r + ease * 5;
          color      = n.pulseColor;
          ctx.globalAlpha = .25 + ease * .75;
          if (n.pulseT >= n.pulseDur) { n.pulseColor = null; n.pulseDur = 0; }
        } else {
          ctx.globalAlpha = .7;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    window._elixirGraph = {
      pause()  { paused = true;  cancelAnimationFrame(raf); },
      resume() { paused = false; last = performance.now(); raf = requestAnimationFrame(draw); },
      syncColors() {
        const pal = palette();
        nodes.forEach(n => { n.color = rndColor(pal.nodes); });
      },
    };

    resize();
    nodes = Array.from({ length: NODE_COUNT }, makeNode);
    setTimeout(spawnPulse, 500);
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
  }

  // ── Auto-init ─────────────────────────────────────────
  function init() {
    applyTheme(getSaved() || 'light');
    initGraph();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();