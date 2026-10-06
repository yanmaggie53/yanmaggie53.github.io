/* home.js — the home page.
   - chat-message intro (text lives in index.html <template>s)
   - research / play switch + filters
   - video previews on project cards
   - the sneak-peek plot: drag things around
   - the garden: plant something before you go */
(function () {
  'use strict';

  var S = window.SkyTime;
  var Site = window.Site;
  var reduceMotion = Site.reduceMotion;
  var CHAT_SEEN = 'maggie:chat-seen';
  var EMAIL = 'yanmaggie53@gmail.com';

  function mode() { return document.documentElement.getAttribute('data-mode'); }

  /* ---------- chat intro ---------- */

  function setupChat() {
    var chat = document.querySelector('[data-chat]');
    if (!chat) return;
    var opener = document.createElement('div');
    var rest = document.createElement('div');
    opener.style.display = rest.style.display = 'contents';
    chat.appendChild(opener);
    chat.appendChild(rest);
    var reply = document.querySelector('[data-chat-reply]');

    function messagesFrom(template) {
      if (!template) return [];
      return Array.prototype.map.call(template.content.children, function (node) {
        return { from: node.getAttribute('data-from'), node: node };
      });
    }
    function openerFor(m) { return messagesFrom(chat.querySelector('template[data-opener="' + m + '"]')); }
    var later = messagesFrom(chat.querySelector('template[data-chat-rest]'));

    function bubble(msg) {
      var el;
      if (msg.from === 'file') {
        el = msg.node.cloneNode(true);
        el.classList.add('msg', 'msg--me', 'msg--file');
        el.removeAttribute('data-from');
      } else {
        el = document.createElement('p');
        el.className = 'msg msg--' + msg.from;
        el.innerHTML = msg.node.innerHTML;
      }
      return el;
    }
    function side(msg) { return msg.from === 'them' ? 'them' : 'me'; }
    function stamp(msg) {
      var t = document.createElement('span');
      t.className = 'msg__time msg__time--' + side(msg);
      t.textContent = S.formatTime(Site.skyDate());
      return t;
    }

    // Render a list instantly, with a timestamp after each run of messages.
    function renderAll(target, list) {
      target.innerHTML = '';
      list.forEach(function (msg, i) {
        target.appendChild(bubble(msg));
        var next = list[i + 1];
        if (!next || side(next) !== side(msg)) target.appendChild(stamp(msg));
      });
    }

    function finish() {
      if (reply) reply.classList.add('is-ready');
      try { sessionStorage.setItem(CHAT_SEEN, '1'); } catch (err) { /* fine */ }
    }

    var seen = false;
    try { seen = sessionStorage.getItem(CHAT_SEEN) === '1'; } catch (err) { /* fine */ }

    if (seen || reduceMotion.matches) {
      renderAll(opener, openerFor(mode()));
      renderAll(rest, later);
      finish();
    } else {
      play(openerFor(mode()).map(function (m) { return [opener, m]; }).concat(later.map(function (m) { return [rest, m]; })));
    }

    // Plays messages one by one, with a typing indicator before Maggie's.
    function play(queue) {
      var i = 0;
      (function next() {
        if (i >= queue.length) return finish();
        var target = queue[i][0], msg = queue[i][1];
        var following = queue[i + 1] && queue[i + 1][1];
        i++;
        var show = function () {
          target.appendChild(bubble(msg));
          if (!following || side(following) !== side(msg)) target.appendChild(stamp(msg));
          setTimeout(next, msg.from === 'them' ? 650 : 380);
        };
        if (side(msg) === 'me') {
          var typing = document.createElement('p');
          typing.className = 'msg msg--me msg--typing';
          typing.setAttribute('aria-hidden', 'true');
          typing.innerHTML = '<i></i><i></i><i></i>';
          target.appendChild(typing);
          var len = msg.node.textContent.length;
          setTimeout(function () { typing.remove(); show(); }, Math.min(420 + len * 11, 1150));
        } else {
          show();
        }
      })();
    }

    // Switching modes swaps the greeting to match.
    document.addEventListener('modechange', function (e) {
      if (opener.childNodes.length) renderAll(opener, openerFor(e.detail.mode));
    });

    if (reply) {
      reply.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = reply.querySelector('input').value.trim();
        location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('hi maggie!') + (text ? '&body=' + encodeURIComponent(text) : '');
      });
    }
  }

  /* ---------- research / play ---------- */

  function setupWork() {
    var track = document.querySelector('[data-switch]');
    if (!track) return;
    var labels = document.querySelectorAll('[data-side]');
    var panels = document.querySelectorAll('[data-panel]');

    function show(side, focus) {
      var play = side === 'play';
      track.setAttribute('aria-checked', play ? 'true' : 'false');
      labels.forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('data-side') === side); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== side; });
      if (focus) history.replaceState(null, '', play ? '#play' : '#work');
    }
    track.addEventListener('click', function () {
      show(track.getAttribute('aria-checked') === 'true' ? 'research' : 'play', true);
    });
    labels.forEach(function (l) {
      l.addEventListener('click', function () { show(l.getAttribute('data-side'), true); });
    });
    show(location.hash === '#play' ? 'play' : 'research');
    if (location.hash === '#play') document.getElementById('work').scrollIntoView();

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
      cards.forEach(function (c) { tagsOf(c, key).forEach(function (t) { all[t] = (all[t] || 0) + 1; }); });
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

  function setupGarden() {
    var garden = document.querySelector('[data-garden]');
    if (!garden) return;
    var canvas = garden.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var plants = [];
    var raf = null;
    var w = 0, h = 0;
    var LIFE = 5200, GROW = 700, FADE = 1300;

    var PALETTES = {
      day: ['#f4a6b8', '#f7c948', '#8fb8f2', '#f29a6b', '#b9a3f2'],
      afternoon: ['#e7a96b', '#d98b8b', '#e6c26e', '#b9a07a', '#d6a3b0'],
      sunset: ['#ffb38a', '#ff8f7a', '#ffd29a', '#f7a1c0', '#ffc46b'],
      night: ['#fff3b0', '#d6f5ff', '#ffe08a']
    };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = garden.clientWidth;
      h = garden.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      garden.style.setProperty('--garden-w', w + 'px');
    }
    resize();
    window.addEventListener('resize', resize);

    var prompt = document.querySelector('[data-garden-prompt]');
    var PROMPTS = {
      day: 'Plant something before you go.',
      afternoon: 'Plant something before you go. (They’re a little sleepy right now.)',
      sunset: 'Plant something before you go. Someone might jog by.',
      night: 'Let a firefly out before you go.'
    };
    function updatePrompt() { if (prompt) prompt.textContent = PROMPTS[mode()] || PROMPTS.day; }
    updatePrompt();
    document.addEventListener('modechange', updatePrompt);

    function ink() { return getComputedStyle(document.body).color; }

    function plant(x, y) {
      var m = mode();
      var palette = PALETTES[m];
      var now = performance.now();
      if (m === 'night') {
        for (var i = 0; i < 3; i++) {
          plants.push({ kind: 'firefly', x: x + (Math.random() - 0.5) * 30, y: y, t0: now + i * 90, color: palette[i % palette.length], drift: (Math.random() - 0.5) * 0.04, rise: 0.02 + Math.random() * 0.025, phase: Math.random() * 6 });
        }
      } else {
        plants.push({ kind: m === 'afternoon' ? 'droop' : 'flower', x: x, t0: now, color: palette[Math.floor(Math.random() * palette.length)], height: 46 + Math.random() * 70, petals: 5 + Math.floor(Math.random() * 3), size: 6 + Math.random() * 5, lean: (Math.random() - 0.5) * 16 });
      }
      if (plants.length > 160) plants.splice(0, plants.length - 160);
      if (!raf) raf = requestAnimationFrame(draw);
    }

    function draw(time) {
      raf = null;
      ctx.clearRect(0, 0, w, h);
      var stem = ink();
      plants = plants.filter(function (p) { return time - p.t0 < LIFE + FADE; });
      plants.forEach(function (p) {
        var age = time - p.t0;
        if (age < 0) return;
        var alpha = age > LIFE ? 1 - (age - LIFE) / FADE : 1;
        var grow = reduceMotion.matches ? 1 : Math.min(1, age / GROW);
        grow = 1 - Math.pow(1 - grow, 3);
        ctx.globalAlpha = Math.max(0, alpha);
        if (p.kind === 'firefly') return drawFirefly(p, age, time);
        drawFlower(p, grow, stem, time);
      });
      ctx.globalAlpha = 1;
      if (plants.length) raf = requestAnimationFrame(draw);
    }

    function drawFlower(p, grow, stemColor, time) {
      var droop = p.kind === 'droop';
      var hgt = p.height * grow;
      var sway = reduceMotion.matches ? 0 : Math.sin(time / 900 + p.x) * 3;
      var topX = p.x + p.lean * grow + sway;
      var topY = h - hgt;
      var headX = droop ? topX + 16 * grow : topX;
      var headY = droop ? topY + 14 * grow : topY;

      ctx.strokeStyle = stemColor;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, h);
      if (droop) ctx.bezierCurveTo(p.x, h - hgt * 0.6, topX - 4, topY - 8, headX, headY);
      else ctx.quadraticCurveTo(p.x + p.lean * 0.2, h - hgt * 0.5, topX, topY);
      ctx.stroke();

      // a leaf
      if (grow > 0.5) {
        ctx.fillStyle = stemColor;
        ctx.beginPath();
        var ly = h - hgt * 0.35;
        ctx.ellipse(p.x + 5, ly, 6 * grow, 2.4 * grow, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      var size = p.size * grow;
      ctx.fillStyle = p.color;
      for (var i = 0; i < p.petals; i++) {
        var a = (i / p.petals) * Math.PI * 2 + (droop ? 0.6 : 0);
        ctx.beginPath();
        ctx.ellipse(headX + Math.cos(a) * size * 0.8, headY + Math.sin(a) * size * 0.8, size * 0.62, size * 0.42, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = mode() === 'sunset' ? '#3b2338' : '#fff4c7';
      ctx.beginPath();
      ctx.arc(headX, headY, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFirefly(p, age, time) {
      var x = p.x + Math.sin(age / 700 + p.phase) * 12 + p.drift * age;
      var y = p.y - p.rise * age;
      var blink = 0.55 + 0.45 * Math.sin(time / 260 + p.phase);
      var g = ctx.createRadialGradient(x, y, 0, x, y, 12);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.globalAlpha *= blink;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Click to plant one, drag to plant a row.
    var last = null, down = false;
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    garden.addEventListener('pointerdown', function (e) {
      down = true;
      last = pos(e);
      plant(last.x, last.y);
    });
    garden.addEventListener('pointermove', function (e) {
      if (!down || e.pointerType === 'touch') return;
      var p = pos(e);
      if (Math.abs(p.x - last.x) > 20) {
        last = p;
        plant(p.x, p.y);
      }
    });
    window.addEventListener('pointerup', function () { down = false; });
    garden.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        plant(20 + Math.random() * (w - 40), h * 0.6);
      }
    });
  }

  function init() {
    setupChat();
    setupWork();
    setupPreviews();
    setupPlot();
    setupGarden();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
