/* TAMANT — Hero Network Graph (Akteur-Netzwerk Leitmotiv).
   Vanilla JS port of the React design prototype. */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ARCHETYPES = [
    { id: 'MENSCH',    label: 'Mensch',    kind: 'human', weight: 1.00, anchor: { x: 0.58, y: 0.50 } },
    { id: 'KI',        label: 'KI',        kind: 'ai',    weight: 1.00, anchor: { x: 0.80, y: 0.42 } },
    { id: 'DATEN',     label: 'Daten',     kind: 'data',  weight: 0.85 },
    { id: 'TEAM',      label: 'Team',      kind: 'human', weight: 0.90 },
    { id: 'KUNDE',     label: 'Kunde',     kind: 'human', weight: 0.85 },
    { id: 'FORSCHUNG', label: 'Forschung', kind: 'data',  weight: 0.70 },
    { id: 'PRAXIS',    label: 'Praxis',    kind: 'data',  weight: 0.70 },
    { id: 'DIALOG',    label: 'Dialog',    kind: 'ai',    weight: 0.60 },
    { id: 'GUIDELINE', label: 'Guideline', kind: 'data',  weight: 0.55 },
    { id: 'TRAINING',  label: 'Schulung',  kind: 'human', weight: 0.65 },
    { id: 'PROZESS',   label: 'Prozess',   kind: 'data',  weight: 0.55 },
    { id: 'CHATBOT',   label: 'Chatbot',   kind: 'ai',    weight: 0.55 },
    { id: 'STRATEGIE', label: 'Strategie', kind: 'data',  weight: 0.70 },
    { id: 'VERTRAUEN', label: 'Vertrauen', kind: 'human', weight: 0.55 },
    { id: 'AKZEPTANZ', label: 'Akzeptanz', kind: 'human', weight: 0.60 },
    { id: 'WIRKUNG',   label: 'Wirkung',   kind: 'data',  weight: 0.55 },
  ];

  const EDGE_LIST = [
    ['MENSCH','KI'],['MENSCH','TEAM'],['MENSCH','KUNDE'],['MENSCH','DIALOG'],
    ['MENSCH','VERTRAUEN'],['MENSCH','AKZEPTANZ'],
    ['KI','DATEN'],['KI','DIALOG'],['KI','CHATBOT'],['KI','PROZESS'],
    ['KI','STRATEGIE'],['KI','GUIDELINE'],
    ['FORSCHUNG','DATEN'],['FORSCHUNG','PRAXIS'],['FORSCHUNG','KI'],
    ['PRAXIS','PROZESS'],['PRAXIS','KUNDE'],
    ['TEAM','TRAINING'],['TRAINING','AKZEPTANZ'],
    ['KUNDE','DIALOG'],['KUNDE','WIRKUNG'],
    ['GUIDELINE','VERTRAUEN'],['STRATEGIE','WIRKUNG'],
    ['CHATBOT','DIALOG'],['AKZEPTANZ','WIRKUNG'],
  ];

  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function readVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function NetworkGraph(container) {
    this.container = container;
    this.size = { w: 0, h: 0 };
    this.mouse = { x: -9999, y: -9999, active: false };
    this.hovered = null;

    this.nodes = ARCHETYPES.map((a) => ({
      ...a,
      x: 0, y: 0, vx: 0, vy: 0,
      seed: Math.random() * 1000,
      _initialized: false,
    }));

    this.idToNode = new Map();
    this.nodes.forEach((n) => this.idToNode.set(n.id, n));

    this.edges = EDGE_LIST
      .map(([a, b]) => [this.idToNode.get(a), this.idToNode.get(b)])
      .filter(([a, b]) => a && b);

    this._buildSvg();
    this._bindEvents();
    this._resize();
    this._loop();
  }

  NetworkGraph.prototype._buildSvg = function () {
    this.svg = el('svg', { width: '100%', height: '100%', preserveAspectRatio: 'none' });
    this.svg.style.display = 'block';

    // grid lines
    this.gridGroup = el('g', { opacity: '0.5' });
    this.svg.appendChild(this.gridGroup);

    // edges
    this.edgeGroup = el('g');
    this.svg.appendChild(this.edgeGroup);
    this.edgeEls = this.edges.map(() => {
      const line = el('line', { stroke: 'currentColor', 'stroke-width': '0.7', 'stroke-opacity': '0.18' });
      this.edgeGroup.appendChild(line);
      return line;
    });

    // nodes
    this.nodeGroup = el('g');
    this.svg.appendChild(this.nodeGroup);
    this.nodeEls = this.nodes.map((n) => {
      const g = el('g');
      const halo = el('circle', { r: 0, fill: 'none', 'stroke-width': '1', 'stroke-opacity': '0.25' });
      halo.setAttribute('display', 'none');
      const circle = el('circle', { r: String(4 + n.weight * 5) });
      const text = el('text', {
        x: String(4 + n.weight * 5 + 8),
        y: '3',
        'font-size': '10',
        'fill-opacity': '0.55',
      });
      text.setAttribute('style', 'font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; pointer-events: none;');
      text.textContent = n.label;
      g.appendChild(halo);
      g.appendChild(circle);
      g.appendChild(text);
      this.nodeGroup.appendChild(g);
      return { g, halo, circle, text };
    });

    // vignette overlay
    const defs = el('defs');
    const grad = el('radialGradient', { id: 'ng-vignette', cx: '50%', cy: '50%', r: '60%' });
    const paperHex = readVar('--paper-hex', '#f5f0e6');
    this.stop1 = el('stop', { offset: '0%', 'stop-color': paperHex, 'stop-opacity': '0' });
    this.stop2 = el('stop', { offset: '100%', 'stop-color': paperHex, 'stop-opacity': '0.85' });
    grad.appendChild(this.stop1); grad.appendChild(this.stop2);
    defs.appendChild(grad);
    this.svg.appendChild(defs);

    this.vignette = el('rect', { x: '0', y: '0', fill: 'url(#ng-vignette)' });
    this.vignette.setAttribute('pointer-events', 'none');
    this.svg.appendChild(this.vignette);

    this.container.appendChild(this.svg);
  };

  NetworkGraph.prototype._bindEvents = function () {
    this._onResize = this._resize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._onMove = (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    };
    this._onLeave = () => {
      this.mouse.active = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
      this.hovered = null;
    };
    this.container.addEventListener('mousemove', this._onMove);
    this.container.addEventListener('mouseleave', this._onLeave);
  };

  NetworkGraph.prototype._resize = function () {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(rect.width, 50);
    const h = Math.max(rect.height, 50);
    this.size.w = w;
    this.size.h = h;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    this.vignette.setAttribute('width', w);
    this.vignette.setAttribute('height', h);
    this._initPositions();
    this._buildGrid();
  };

  NetworkGraph.prototype._initPositions = function () {
    const W = this.size.w, H = this.size.h;
    this.nodes.forEach((n, i) => {
      if (!n._initialized) {
        if (n.anchor) {
          n.x = n.anchor.x * W;
          n.y = n.anchor.y * H;
        } else {
          const angle = (i / this.nodes.length) * Math.PI * 2 + Math.random() * 0.6;
          const r = Math.min(W, H) * (0.24 + Math.random() * 0.20);
          n.x = W * 0.70 + Math.cos(angle) * r;
          n.y = H * 0.55 + Math.sin(angle) * r * 0.7;
        }
        n._initialized = true;
      }
    });
  };

  NetworkGraph.prototype._buildGrid = function () {
    while (this.gridGroup.firstChild) this.gridGroup.removeChild(this.gridGroup.firstChild);
    const W = this.size.w, H = this.size.h;
    for (let i = 0, x = 0; x < W; x += 80, i++) {
      this.gridGroup.appendChild(el('line', {
        x1: x, x2: x, y1: 0, y2: H,
        stroke: 'currentColor', 'stroke-opacity': '0.04',
      }));
    }
    for (let i = 0, y = 0; y < H; y += 80, i++) {
      this.gridGroup.appendChild(el('line', {
        x1: 0, x2: W, y1: y, y2: y,
        stroke: 'currentColor', 'stroke-opacity': '0.04',
      }));
    }
  };

  NetworkGraph.prototype._step = function (dt, t) {
    const W = this.size.w, H = this.size.h;
    const mx = this.mouse.x, my = this.mouse.y;

    // hover detection
    let nearest = null;
    let nd2 = 28 * 28;
    this.nodes.forEach((n) => {
      const dx = n.x - mx; const dy = n.y - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < nd2) { nd2 = d2; nearest = n.id; }
    });
    this.hovered = nearest;

    this.nodes.forEach((n) => {
      // gentle drift
      const drift = 12;
      n.vx += Math.cos(t * 0.4 + n.seed) * drift * dt * 0.4;
      n.vy += Math.sin(t * 0.35 + n.seed * 1.3) * drift * dt * 0.4;

      // anchor pull or center pull
      if (n.anchor) {
        const tx = n.anchor.x * W;
        const ty = n.anchor.y * H;
        n.vx += (tx - n.x) * 0.6 * dt;
        n.vy += (ty - n.y) * 0.6 * dt;
      } else {
        const cx = W * 0.70;
        const cy = H * 0.55;
        n.vx += (cx - n.x) * 0.04 * dt;
        n.vy += (cy - n.y) * 0.04 * dt;
      }

      // mouse repulsion
      if (this.mouse.active) {
        const dx = n.x - mx; const dy = n.y - my;
        const d2 = dx * dx + dy * dy;
        const r = 140;
        if (d2 < r * r && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = ((r - d) / r) * 320;
          n.vx += (dx / d) * f * dt;
          n.vy += (dy / d) * f * dt;
        }
      }
    });

    // node-node repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = 70;
        if (d2 < min * min && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = ((min - d) / min) * 60;
          const fx = (dx / d) * f * dt;
          const fy = (dy / d) * f * dt;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
    }

    // edge spring
    this.edges.forEach(([A, B]) => {
      const dx = B.x - A.x; const dy = B.y - A.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 180;
      const f = (d - target) * 0.12;
      const fx = (dx / d) * f * dt;
      const fy = (dy / d) * f * dt;
      A.vx += fx; A.vy += fy;
      B.vx -= fx; B.vy -= fy;
    });

    // integrate + damp + bounds
    this.nodes.forEach((n) => {
      n.vx *= 0.92;
      n.vy *= 0.92;
      n.x += n.vx;
      n.y += n.vy;
      const m = 40;
      if (n.x < m) { n.x = m; n.vx *= -0.5; }
      if (n.x > W - m) { n.x = W - m; n.vx *= -0.5; }
      if (n.y < m) { n.y = m; n.vy *= -0.5; }
      if (n.y > H - m) { n.y = H - m; n.vy *= -0.5; }
    });
  };

  NetworkGraph.prototype._render = function () {
    const accent = readVar('--accent', '#1f7ae0');
    const ink    = readVar('--ink-hex', '#1a1f2e');
    const paper  = readVar('--paper-hex', '#f5f0e6');
    const hovered = this.hovered;

    // edge updates
    const adjacency = new Set();
    if (hovered) {
      this.edges.forEach(([a, b]) => {
        if (a.id === hovered) adjacency.add(b.id);
        if (b.id === hovered) adjacency.add(a.id);
      });
    }

    this.edges.forEach(([a, b], i) => {
      const line = this.edgeEls[i];
      const hi = hovered && (a.id === hovered || b.id === hovered);
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', b.y);
      line.setAttribute('stroke', hi ? accent : ink);
      line.setAttribute('stroke-opacity', hi ? '0.6' : '0.18');
      line.setAttribute('stroke-width', hi ? '1.2' : '0.7');
    });

    this.nodes.forEach((n, i) => {
      const els = this.nodeEls[i];
      const hi = hovered && (n.id === hovered || adjacency.has(n.id));
      const r = 4 + n.weight * 5;
      els.g.setAttribute('transform', `translate(${n.x}, ${n.y})`);

      // halo on direct hover
      if (n.id === hovered) {
        els.halo.setAttribute('display', '');
        els.halo.setAttribute('r', String(r + 8));
        els.halo.setAttribute('stroke', accent);
      } else {
        els.halo.setAttribute('display', 'none');
      }

      // node fill / stroke per kind
      let fill, stroke;
      if (n.kind === 'human') {
        fill = hi ? accent : ink;
        stroke = ink;
      } else if (n.kind === 'ai') {
        fill = hi ? accent : paper;
        stroke = accent;
      } else {
        fill = hi ? accent : paper;
        stroke = ink;
      }
      els.circle.setAttribute('fill', fill);
      els.circle.setAttribute('stroke', stroke);
      els.circle.setAttribute('stroke-width', n.kind === 'ai' ? '1.4' : '1');

      // labels: only for important or hovered
      if (n.weight > 0.7 || hi) {
        els.text.setAttribute('display', '');
        els.text.setAttribute('fill', hi ? accent : ink);
        els.text.setAttribute('fill-opacity', hi ? '1' : '0.55');
      } else {
        els.text.setAttribute('display', 'none');
      }
    });
  };

  NetworkGraph.prototype._loop = function () {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      this._step(dt, t);
      this._render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  };

  NetworkGraph.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.container.removeEventListener('mousemove', this._onMove);
    this.container.removeEventListener('mouseleave', this._onLeave);
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
  };

  function init() {
    const container = document.getElementById('hero-graph');
    if (!container) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const graph = new NetworkGraph(container);
    if (reduce) {
      // single render then freeze
      cancelAnimationFrame(graph._raf);
    }
    window.__tamantNetwork = graph;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
