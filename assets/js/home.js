/* home.js — the home page.
   - research / practice switch + filters
   - video previews on project cards
   - the sneak-peek plot: drag things around
   - the garden: build one before you go (saved for next visit) */
(function () {
  'use strict';

  var S = window.SkyTime;
  var Site = window.Site;
  var reduceMotion = Site.reduceMotion;
  var GARDEN_KEY = 'maggie:garden';

  function mode() { return document.documentElement.getAttribute('data-mode'); }
  function store(kind) { try { return window[kind]; } catch (err) { return null; } }

  /* ---------- research / practice ---------- */

  function setupWork() {
    var track = document.querySelector('[data-switch]');
    if (!track) return;
    var labels = document.querySelectorAll('[data-side]');
    var panels = document.querySelectorAll('[data-panel]');

    function show(side, remember) {
      var practice = side === 'practice';
      track.setAttribute('aria-checked', practice ? 'true' : 'false');
      labels.forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('data-side') === side); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== side; });
      if (remember) history.replaceState(null, '', practice ? '#practice' : '#work');
    }
    track.addEventListener('click', function () {
      show(track.getAttribute('aria-checked') === 'true' ? 'research' : 'practice', true);
    });
    labels.forEach(function (l) {
      l.addEventListener('click', function () { show(l.getAttribute('data-side'), true); });
    });
    show(location.hash === '#practice' ? 'practice' : 'research');
    if (location.hash === '#practice') document.getElementById('work').scrollIntoView();

    // Filters are built from the tags on the cards, so new projects show up automatically.
    var cards = Array.prototype.slice.call(document.querySelectorAll('.project'));
    var selects = document.querySelectorAll('[data-filter]');
    var count = document.querySelector('[data-count]');
    var empty = document.querySelector('[data-empty]');

    function tagsOf(card, key) {
      return (card.getAttribute('data-' + key) || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    selects.forEach(function (sel) {
      var key = sel.getAttribute('data-filter');
      var all = {};
      cards.forEach(function (c) { tagsOf(c, key).forEach(function (t) { all[t] = true; }); });
      Object.keys(all).sort().forEach(function (t) {
        var o = document.createElement('option');
        o.value = t;
        o.textContent = t;
        sel.appendChild(o);
      });
      sel.addEventListener('change', apply);
    });

    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = true;
        selects.forEach(function (sel) {
          if (sel.value !== 'all' && tagsOf(c, sel.getAttribute('data-filter')).indexOf(sel.value) === -1) ok = false;
        });
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' project' : ' projects');
      if (empty) empty.hidden = shown > 0;
    }
    var clear = document.querySelector('[data-clear-filters]');
    if (clear) clear.addEventListener('click', function () {
      selects.forEach(function (s) { s.value = 'all'; });
      apply();
    });
    apply();
  }

  /* ---------- video previews ---------- */

  function setupPreviews() {
    var cards = document.querySelectorAll('.project[data-preview]');
    if (!cards.length) return;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function video(card) {
      if (!card._video) {
        var v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = 'none';
        v.src = card.getAttribute('data-preview');
        v.setAttribute('aria-hidden', 'true');
        card.querySelector('.media').appendChild(v);
        card._video = v;
      }
      return card._video;
    }
    function start(card) {
      if (reduceMotion.matches) return;
      var p = video(card).play();
      card.classList.add('is-playing');
      if (p && p.catch) p.catch(function () { card.classList.remove('is-playing'); });
    }
    function stop(card) {
      if (!card._video) return;
      card._video.pause();
      card._video.currentTime = 0;
      card.classList.remove('is-playing');
    }

    cards.forEach(function (card) {
      if (finePointer) {
        card.addEventListener('pointerenter', function () { start(card); });
        card.addEventListener('pointerleave', function () { stop(card); });
      }
      card.addEventListener('focusin', function () { start(card); });
      card.addEventListener('focusout', function () { stop(card); });
    });

    // On phones there's no hover: play whichever card is centered on screen.
    if (!finePointer && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(e.target); else stop(e.target); });
      }, { threshold: 0.75 });
      cards.forEach(function (c) { io.observe(c); });
    }
  }

  /* ---------- sneak peek plot ---------- */

  function setupPlot() {
    var plot = document.querySelector('[data-plot]');
    if (!plot) return;
    var chips = plot.querySelectorAll('.chip-sticker');
    var reset = document.querySelector('[data-plot-reset]');

    chips.forEach(function (chip) {
      chip.dataset.x0 = chip.style.getPropertyValue('--x');
      chip.dataset.y0 = chip.style.getPropertyValue('--y');
      var start;
      Site.draggable(chip, {
        onStart: function () {
          var box = plot.getBoundingClientRect();
          start = { x: parseFloat(chip.style.getPropertyValue('--x')) / 100 * box.width, y: parseFloat(chip.style.getPropertyValue('--y')) / 100 * box.height, box: box };
        },
        onMove: function (dx, dy) {
          var b = start.box;
          var x = Math.max(4, Math.min(b.width - 4, start.x + dx)) / b.width * 100;
          var y = Math.max(4, Math.min(b.height - 4, start.y + dy)) / b.height * 100;
          chip.style.setProperty('--x', x.toFixed(2) + '%');
          chip.style.setProperty('--y', y.toFixed(2) + '%');
          if (reset) reset.hidden = false;
        }
      });
    });

    if (reset) reset.addEventListener('click', function () {
      chips.forEach(function (chip) {
        chip.style.setProperty('--x', chip.dataset.x0);
        chip.style.setProperty('--y', chip.dataset.y0);
      });
      reset.hidden = true;
    });
  }

  /* ---------- garden ---------- */

  // Plant colors for each time of day.
  var GARDEN_COLORS = {
    sunrise: { leaf: '#6e9e7e', leaf2: '#9cc59a', blooms: ['#f6b3c6', '#ffd29a', '#c9b6f7', '#ffb38a', '#f9c6d6'], center: '#fff4c7', cactus: '#6aa587', cactusDark: '#4f8a6c', succulent: '#9cc7b3', succulent2: '#c3e0d0', tip: '#f09ab5', cap: '#e8746c', dot: '#fff7ef', stem: '#f4e6d4' },
    day: { leaf: '#5c9b6b', leaf2: '#86bf7f', blooms: ['#f4a6b8', '#f7c948', '#8fb8f2', '#f29a6b', '#b9a3f2'], center: '#fff4c7', cactus: '#4f9a74', cactusDark: '#3b7e5d', succulent: '#8fbfa8', succulent2: '#b7dccb', tip: '#e79bb0', cap: '#e2574c', dot: '#fff4e8', stem: '#f1e4cf' },
    afternoon: { leaf: '#7a9461', leaf2: '#a3b07a', blooms: ['#e7a96b', '#d98b8b', '#e6c26e', '#b9a07a', '#d6a3b0'], center: '#fbefd9', cactus: '#71926a', cactusDark: '#5a7954', succulent: '#a5b48e', succulent2: '#c8cfae', tip: '#d99a8a', cap: '#c9694f', dot: '#fbefd9', stem: '#efe0c6' },
    sunset: { leaf: '#7d9a7e', leaf2: '#a0b896', blooms: ['#ffb38a', '#ff8f7a', '#ffd29a', '#f7a1c0', '#ffc46b'], center: '#3b2338', cactus: '#86a383', cactusDark: '#647f63', succulent: '#a9bfa3', succulent2: '#c8d8c0', tip: '#ff9f8a', cap: '#ff8f7a', dot: '#ffe3c8', stem: '#f2d8c8' },
    night: { leaf: '#4f7f7a', leaf2: '#6b9a92', blooms: ['#c9d3ff', '#fff3b0', '#a6b6ff', '#e3c8ff', '#b8f0e0'], center: '#fff3b0', cactus: '#4f857a', cactusDark: '#3a6a61', succulent: '#6f9c95', succulent2: '#8fb8b0', tip: '#c9b6f7', cap: '#8f9bd6', dot: '#e8ebf7', stem: '#c7cde6' }
  };

  var PLANTS = [
    { id: 'mix', name: 'mix' },
    { id: 'flower', name: 'flower', gap: 22, layer: 2 },
    { id: 'tulip', name: 'tulip', gap: 18, layer: 2 },
    { id: 'succulent', name: 'succulent', gap: 30, layer: 3 },
    { id: 'cactus', name: 'cactus', gap: 34, layer: 1 },
    { id: 'grass', name: 'grass', gap: 12, layer: 3 },
    { id: 'mushroom', name: 'mushroom', gap: 18, layer: 3 }
  ];
  var BY_ID = {};
  PLANTS.forEach(function (p) { BY_ID[p.id] = p; });

  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(list, r) { return list[Math.floor(r() * list.length)]; }

  function pointedLeaf(ctx, x0, y0, x1, y1, w) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var len = Math.hypot(x1 - x0, y1 - y0) || 1;
    var nx = -(y1 - y0) / len * w, ny = (x1 - x0) / len * w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + nx, my + ny, x1, y1);
    ctx.quadraticCurveTo(mx - nx, my - ny, x0, y0);
    ctx.fill();
  }

  // Each drawer: (ctx, x, ground y, random, colors, growth 0–1, scale, mode)
  var DRAW = {
    flower: function (ctx, x, y0, r, C, g, k, m) {
      var hgt = (40 + r() * 50) * k * g;
      var lean = (r() - 0.5) * 16 * k * g;
      var color = pick(C.blooms, r);
      var petals = 5 + Math.floor(r() * 3);
      var size = (6 + r() * 4) * k * g;
      var droop = m === 'afternoon';
      var topX = x + lean, topY = y0 - hgt;
      var hx = droop ? topX + 14 * k * g : topX;
      var hy = droop ? topY + 12 * k * g : topY;
      ctx.strokeStyle = C.leaf;
      ctx.lineWidth = 1.5 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y0);
      if (droop) ctx.bezierCurveTo(x, y0 - hgt * 0.6, topX - 4 * k, topY - 8 * k, hx, hy);
      else ctx.quadraticCurveTo(x + lean * 0.2, y0 - hgt * 0.5, topX, topY);
      ctx.stroke();
      ctx.fillStyle = C.leaf2;
      pointedLeaf(ctx, x + lean * 0.1, y0 - hgt * 0.3, x + lean * 0.1 + 10 * k * g, y0 - hgt * 0.42, 3 * k * g);
      ctx.fillStyle = color;
      for (var i = 0; i < petals; i++) {
        var a = (i / petals) * Math.PI * 2 + (droop ? 0.6 : 0);
        ctx.beginPath();
        ctx.ellipse(hx + Math.cos(a) * size * 0.8, hy + Math.sin(a) * size * 0.8, size * 0.62, size * 0.42, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = C.center;
      ctx.beginPath();
      ctx.arc(hx, hy, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    },

    tulip: function (ctx, x, y0, r, C, g, k) {
      var hgt = (34 + r() * 36) * k * g;
      var lean = (r() - 0.5) * 8 * k * g;
      var w = (5 + r() * 2) * k * g;
      var hx = x + lean, hy = y0 - hgt;
      ctx.fillStyle = C.leaf2;
      pointedLeaf(ctx, x, y0, x - 9 * k * g, y0 - hgt * 0.55, 3.2 * k * g);
      pointedLeaf(ctx, x, y0, x + 8 * k * g, y0 - hgt * 0.45, 3 * k * g);
      ctx.strokeStyle = C.leaf;
      ctx.lineWidth = 1.6 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x, y0 - hgt * 0.5, hx, hy);
      ctx.stroke();
      ctx.fillStyle = pick(C.blooms, r);
      ctx.beginPath();
      ctx.moveTo(hx - w, hy - w * 0.9);
      ctx.quadraticCurveTo(hx - w * 1.05, hy + w * 0.6, hx, hy + w * 0.7);
      ctx.quadraticCurveTo(hx + w * 1.05, hy + w * 0.6, hx + w, hy - w * 0.9);
      ctx.lineTo(hx + w * 0.45, hy - w * 0.35);
      ctx.lineTo(hx, hy - w * 1.05);
      ctx.lineTo(hx - w * 0.45, hy - w * 0.35);
      ctx.closePath();
      ctx.fill();
    },

    succulent: function (ctx, x, y0, r, C, g, k) {
      var R = (13 + r() * 8) * k * g;
      var n = 7 + Math.floor(r() * 4);
      var rings = [[R, C.succulent], [R * 0.68, C.succulent2]];
      rings.forEach(function (ring) {
        for (var i = 0; i < n; i++) {
          var a = Math.PI + (i + 0.5) / n * Math.PI;
          var tx = x + Math.cos(a) * ring[0];
          var ty = y0 + Math.sin(a) * ring[0] * 0.9;
          ctx.fillStyle = ring[1];
          pointedLeaf(ctx, x, y0, tx, ty, ring[0] * 0.22);
          if (ring[1] === C.succulent) {
            ctx.fillStyle = C.tip;
            ctx.beginPath();
            ctx.arc(tx, ty, 1.2 * k, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    },

    cactus: function (ctx, x, y0, r, C, g, k) {
      var H = (34 + r() * 44) * k * g;
      var W = (10 + r() * 5) * k;
      var top = y0 - H + W / 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.cactus;
      var arms = Math.floor(r() * 3);
      var side = r() < 0.5 ? -1 : 1;
      for (var i = 0; i < arms; i++) {
        var ay = y0 - H * (0.35 + r() * 0.25);
        var out = (5 + r() * 5) * k;
        var up = (9 + r() * 12) * k * g;
        ctx.lineWidth = W * 0.68;
        ctx.beginPath();
        ctx.moveTo(x, ay);
        ctx.lineTo(x + side * (W / 2 + out), ay);
        ctx.lineTo(x + side * (W / 2 + out), ay - up);
        ctx.stroke();
        side = -side;
      }
      ctx.lineWidth = W;
      ctx.beginPath();
      ctx.moveTo(x, y0 + W);
      ctx.lineTo(x, top);
      ctx.stroke();
      ctx.strokeStyle = C.cactusDark;
      ctx.lineWidth = Math.max(0.8, 0.9 * k);
      ctx.beginPath();
      ctx.moveTo(x - W * 0.2, y0);
      ctx.lineTo(x - W * 0.2, top + 2 * k);
      ctx.moveTo(x + W * 0.2, y0);
      ctx.lineTo(x + W * 0.2, top + 2 * k);
      ctx.stroke();
      if (r() < 0.35) {
        ctx.fillStyle = pick(C.blooms, r);
        ctx.beginPath();
        ctx.arc(x, top - W * 0.45, W * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    grass: function (ctx, x, y0, r, C, g, k) {
      var blades = 5 + Math.floor(r() * 5);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6 * k;
      for (var i = 0; i < blades; i++) {
        var bx = x + (r() - 0.5) * 10 * k;
        var hgt = (12 + r() * 24) * k * g;
        var tip = (r() - 0.5) * 16 * k * g;
        ctx.strokeStyle = i % 2 ? C.leaf2 : C.leaf;
        ctx.beginPath();
        ctx.moveTo(bx, y0);
        ctx.quadraticCurveTo(bx, y0 - hgt * 0.6, bx + tip, y0 - hgt);
        ctx.stroke();
      }
    },

    mushroom: function (ctx, x, y0, r, C, g, k) {
      var stemH = (8 + r() * 12) * k * g;
      var stemW = (4 + r() * 3) * k;
      var capR = (7 + r() * 7) * k * g;
      ctx.fillStyle = C.stem;
      ctx.beginPath();
      ctx.moveTo(x - stemW / 2, y0);
      ctx.lineTo(x - stemW * 0.4, y0 - stemH);
      ctx.lineTo(x + stemW * 0.4, y0 - stemH);
      ctx.lineTo(x + stemW / 2, y0);
      ctx.fill();
      ctx.fillStyle = C.cap;
      ctx.beginPath();
      ctx.ellipse(x, y0 - stemH, capR, capR * 0.78, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.dot;
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + (i - 1) * capR * 0.45, y0 - stemH - capR * (0.3 + r() * 0.25), capR * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  function setupGarden() {
    var garden = document.querySelector('[data-garden]');
    if (!garden) return;
    var canvas = garden.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var tools = document.querySelector('[data-garden-tools]');
    var countEl = document.querySelector('[data-garden-count]');
    var clearBtn = document.querySelector('[data-garden-clear]');
    var prompt = document.querySelector('[data-garden-prompt]');
    var local = store('localStorage');
    var w = 0, h = 0, dpr = 1;
    var raf = null, visible = true;
    var selected = 'flower';
    var plants = load();
    var fireflies = [];
    var GROW = 700;

    var PROMPTS = {
      sunrise: 'Pick a plant, click to plant it, drag for a row. Early mornings are good for gardening.',
      day: 'Pick a plant, click to plant it, drag for a row. It’ll still be here next time you visit.',
      afternoon: 'Pick a plant, click to plant it, drag for a row. (The flowers are a little sleepy right now.)',
      sunset: 'Pick a plant, click to plant it, drag for a row. Someone might jog by.',
      night: 'Pick a plant, click to plant it, drag for a row. The fireflies come out at night.'
    };

    function load() {
      try {
        var raw = local && local.getItem(GARDEN_KEY);
        var list = raw ? JSON.parse(raw) : [];
        // Only keep plants that still exist (trees were retired).
        return Array.isArray(list) ? list.filter(function (p) { return DRAW[p.t] && BY_ID[p.t]; }) : [];
      } catch (err) { return []; }
    }
    function save() {
      try {
        if (local) local.setItem(GARDEN_KEY, JSON.stringify(plants.map(function (p) { return { t: p.t, x: p.x, s: p.s }; })));
      } catch (err) { /* storage full or blocked: the garden just won't be remembered */ }
    }

    function colors() { return GARDEN_COLORS[mode()] || GARDEN_COLORS.day; }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = garden.clientWidth;
      h = garden.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      garden.style.setProperty('--garden-w', w + 'px');
      draw(performance.now());
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      var scale = w < 500 ? 1.05 : 1.3;
      var C = colors();
      var m = mode();
      var growing = false;
      var order = plants.slice().sort(function (a, b) { return BY_ID[a.t].layer - BY_ID[b.t].layer; });
      order.forEach(function (p) {
        var g = 1;
        if (p.b !== undefined && !reduceMotion.matches) {
          g = Math.min(1, (time - p.b) / GROW);
          if (g < 1) growing = true;
          g = 1 - Math.pow(1 - g, 3);
        }
        if (g <= 0) return;
        ctx.save();
        DRAW[p.t](ctx, p.x * w, h, rng(p.s), C, g, scale, m);
        ctx.restore();
      });
      var glowing = drawFireflies(time, m);
      return growing || glowing;
    }

    // At night, a few fireflies drift over whatever you've planted.
    function drawFireflies(time, m) {
      if (m !== 'night' || !plants.length || reduceMotion.matches) {
        fireflies = [];
        return false;
      }
      var want = Math.min(14, 3 + Math.floor(plants.length / 3));
      while (fireflies.length < want) {
        fireflies.push({ x: Math.random(), y: 0.25 + Math.random() * 0.6, p: Math.random() * 6, s: 0.4 + Math.random() * 0.6 });
      }
      fireflies.length = want;
      fireflies.forEach(function (f) {
        var x = (f.x + Math.sin(time / 4000 * f.s + f.p) * 0.03) * w;
        var y = (f.y + Math.cos(time / 3000 * f.s + f.p) * 0.08) * h;
        var glow = 0.35 + 0.65 * Math.max(0, Math.sin(time / 600 * f.s + f.p));
        var grad = ctx.createRadialGradient(x, y, 0, x, y, 9);
        grad.addColorStop(0, 'rgba(255, 243, 176,' + glow + ')');
        grad.addColorStop(1, 'rgba(255, 243, 176, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      });
      return true;
    }

    function tick(time) {
      raf = null;
      var again = draw(time);
      if (again && visible && !document.hidden) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf) raf = requestAnimationFrame(tick); }

    function plant(xPx) {
      var type = selected === 'mix' ? PLANTS[1 + Math.floor(Math.random() * (PLANTS.length - 1))].id : selected;
      plants.push({ t: type, x: Math.max(0.01, Math.min(0.99, xPx / w)), s: Math.floor(Math.random() * 1e9), b: performance.now() });
      if (plants.length > 160) plants.splice(0, plants.length - 160);
      save();
      updateCount();
      wake();
      return type;
    }

    function updateCount() {
      if (countEl) countEl.textContent = plants.length ? plants.length + (plants.length === 1 ? ' plant' : ' plants') : '';
      if (clearBtn) clearBtn.hidden = !plants.length;
    }

    // Tool buttons, each with a little drawing of its plant.
    var buttons = [];
    var end = tools && tools.querySelector('.garden-tools__end');
    PLANTS.forEach(function (p) {
      if (!tools) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'garden-tool';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', p.id === selected ? 'true' : 'false');
      btn.innerHTML = '<canvas width="80" height="80" aria-hidden="true"></canvas><span>' + p.name + '</span>';
      btn.addEventListener('click', function () {
        selected = p.id;
        buttons.forEach(function (b) { b.btn.setAttribute('aria-checked', b.id === selected ? 'true' : 'false'); });
      });
      tools.insertBefore(btn, end);
      buttons.push({ id: p.id, btn: btn, canvas: btn.querySelector('canvas') });
    });

    function drawIcons() {
      var C = colors();
      buttons.forEach(function (b) {
        var c = b.canvas.getContext('2d');
        c.setTransform(2, 0, 0, 2, 0, 0);
        c.clearRect(0, 0, 40, 40);
        if (b.id === 'mix') {
          [['tulip', 0.42], ['succulent', 0.62], ['mushroom', 0.7]].forEach(function (t, i) {
            c.save();
            DRAW[t[0]](c, 9 + i * 11, 36, rng(7 + i), C, 1, t[1], 'day');
            c.restore();
          });
          return;
        }
        c.save();
        var seeds = { flower: 3, tulip: 11, succulent: 9, cactus: 14, grass: 2, mushroom: 6 };
        var scale = { flower: 0.45, tulip: 0.5, succulent: 0.95, cactus: 0.42, grass: 0.8, mushroom: 0.95 }[b.id];
        DRAW[b.id](c, 20, 37, rng(seeds[b.id]), C, 1, scale, 'day');
        c.restore();
      });
    }

    function onMode() {
      if (prompt) prompt.textContent = PROMPTS[mode()] || PROMPTS.day;
      drawIcons();
      wake();
    }

    // Click to plant, drag for a row.
    var last = null, down = false;
    function xOf(e) { return e.clientX - canvas.getBoundingClientRect().left; }
    garden.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true;
      last = xOf(e);
      plant(last);
    });
    garden.addEventListener('pointermove', function (e) {
      if (!down) return;
      var x = xOf(e);
      var gap = selected === 'mix' ? 26 : BY_ID[selected].gap;
      if (Math.abs(x - last) >= gap) {
        last = x;
        plant(x);
      }
    });
    window.addEventListener('pointerup', function () { down = false; });
    garden.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        plant(20 + Math.random() * (w - 40));
      }
    });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      plants = [];
      save();
      updateCount();
      draw(performance.now());
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) wake();
      }).observe(garden);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
    document.addEventListener('modechange', onMode);
    window.addEventListener('resize', resize);

    resize();
    onMode();
    updateCount();
  }

  function init() {
    setupWork();
    setupPreviews();
    setupPlot();
    setupGarden();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
