/* site.js — shared by every page.
   - the sky (sun, moon, stars, clouds) drawn for the visitor's real time
   - the day bar: drag through the day to change the mode
   - Maggie's own clock in Wellesley
   - stickers you can pick up and toss
   - table-of-contents highlighting on case studies */
(function () {
  'use strict';

  var S = window.SkyTime;
  if (!S) return;

  // What the sidebar says Maggie is probably doing, based on the sky in Wellesley.
  var HOME_STATUS = {
    sunrise: 'so I’m probably just waking up.',
    day: 'so I’m probably in class or at my desk.',
    afternoon: 'so I’m probably fighting the afternoon slump.',
    sunset: 'so I’m probably out on a run.',
    night: 'so I’m probably asleep (or should be).'
  };

  var MODE_NAMES = { sunrise: 'sunrise', day: 'day', afternoon: 'afternoon', sunset: 'sunset', night: 'night' };

  var ICONS = {
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17.5h19M6 21h12"/><path d="M7 17.5a5 5 0 0 1 10 0"/><path d="M12 3.5v6M9.5 6l2.5-2.5L14.5 6"/></svg>',
    day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>',
    afternoon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V10z"/><path d="M16.5 11.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.6"/><path d="M8.5 3.5c-.8 1 .8 1.9 0 3M12 3.5c-.8 1 .8 1.9 0 3"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 17.5h19M6 21h12"/><path d="M7 17.5a5 5 0 0 1 10 0"/><path d="M12 6.5v2.5M5.2 10.6l1.6 1.4M18.8 10.6l-1.6 1.4"/></svg>',
    night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/><path d="M17 3.5v3M15.5 5h3" stroke-linecap="round"/></svg>'
  };

  var FAVICONS = {
    sunrise: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M5 22a11 11 0 0 1 22 0z" fill="#f7a8b8"/><path d="M9 22a7 7 0 0 1 14 0z" fill="#ffd2a8"/><rect x="2" y="23.5" width="28" height="3" rx="1.5" fill="#7f8fc8"/></svg>',
    day: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#f4b73c"/><g stroke="#f4b73c" stroke-width="2.4" stroke-linecap="round"><path d="M16 2v3M16 27v3M2 16h3M27 16h3M6.1 6.1l2.1 2.1M23.8 23.8l2.1 2.1M6.1 25.9l2.1-2.1M23.8 8.2l2.1-2.1"/></g></svg>',
    afternoon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="17" r="11" fill="#eab35a"/><circle cx="16" cy="17" r="6.5" fill="#fff3d6"/></svg>',
    sunset: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M5 22a11 11 0 0 1 22 0z" fill="#ff8a5c"/><rect x="2" y="23.5" width="28" height="3" rx="1.5" fill="#a84a63"/></svg>',
    night: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M26 19.5A10.5 10.5 0 0 1 12.5 6 10.5 10.5 0 1 0 26 19.5z" fill="#a6b6ff"/></svg>'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  var place = S.place;
  var plan = S.dayPlan(S.now(), place);
  var planDay = S.now().toDateString();
  var virtualMinute = S.overrideMinute();

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function midnightOf(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function atMinute(minute) { return new Date(midnightOf(S.now()).getTime() + minute * 6e4); }
  function minuteOf(date) { return date.getHours() * 60 + date.getMinutes(); }

  // The moment the sky should show: now, or the visitor's chosen time.
  function skyDate() {
    var chosen = S.override();
    if (!chosen) return S.now();
    if (virtualMinute !== null && S.modeAt(atMinute(virtualMinute), place) === chosen) return atMinute(virtualMinute);
    return atMinute(S.minuteFor(chosen, plan));
  }

  /* ---------- sky ---------- */

  var sky = document.querySelector('[data-sky]');
  var skyParts = null;

  function buildSky() {
    if (!sky) return;
    if (!sky.querySelector('.sky__gradient')) sky.insertAdjacentHTML('afterbegin', '<div class="sky__gradient"></div>');
    var clouds = [
      { w: 300, y: '14%', t: 190, d: -60 },
      { w: 200, y: '30%', t: 150, d: -125 },
      { w: 360, y: '46%', t: 230, d: -20 },
      { w: 170, y: '8%', t: 130, d: -95 }
    ].map(function (c, i) {
      return '<span class="cloud" style="--w:' + c.w + 'px;--y:' + c.y + ';--t:' + c.t + 's;--d:' + c.d + 's;--x:' + (12 + i * 22) + '%"></span>';
    }).join('');
    sky.insertAdjacentHTML('beforeend',
      '<canvas class="sky__stars"></canvas>' +
      '<div class="sky__clouds">' + clouds + '</div>' +
      '<div class="sky__sun"></div>' +
      '<svg class="sky__moon" viewBox="-24 -24 48 48"><circle r="22" fill="rgba(200,210,255,0.08)"/><path class="moon-lit" fill="#e9edff"/></svg>');
    skyParts = {
      canvas: sky.querySelector('.sky__stars'),
      sun: sky.querySelector('.sky__sun'),
      moonLit: sky.querySelector('.moon-lit')
    };
    drawMoon(S.moonPhase(S.now()));
    stars.init();
  }

  function placeSun(date) {
    if (!skyParts) return;
    var t = S.solarTimes(new Date(midnightOf(date).getTime() + 12 * 36e5), place.lat, place.lng);
    var alt = S.sunAltitude(date, place.lat, place.lng);
    var noonAlt = Math.max(S.sunAltitude(t.noon, place.lat, place.lng), 12);
    var f = (t.sunrise && t.sunset)
      ? (date - t.sunrise) / (t.sunset - t.sunrise)
      : minuteOf(date) / 1440;
    var x = 10 + clamp(f, -0.06, 1.06) * 80;
    var horizon = 66;
    var y = horizon - (alt / noonAlt) * (horizon - 14);
    sky.style.setProperty('--sun-x', x.toFixed(2) + '%');
    sky.style.setProperty('--sun-y', clamp(y, 8, 104).toFixed(2) + '%');
  }

  // Draws tonight's actual moon phase.
  function drawMoon(phase) {
    if (!skyParts) return;
    var r = 18;
    var k = Math.cos(phase * 2 * Math.PI);            // 1 at new moon, -1 at full
    var waxing = phase < 0.5;
    var rx = Math.abs(k) * r;
    var outer = waxing ? 1 : 0;                        // which edge is lit
    var inner = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    skyParts.moonLit.setAttribute('d',
      'M0,' + -r + ' A' + r + ',' + r + ' 0 0 ' + outer + ' 0,' + r +
      ' A' + rx.toFixed(2) + ',' + r + ' 0 0 ' + inner + ' 0,' + -r + 'Z');
  }

  var stars = (function () {
    var canvas, ctx, list = [], w = 0, h = 0, raf = null, visible = true, shooting = null, nextShot = 0;

    function seeded(seed) {
      return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rand = seeded(53);
      var count = Math.min(420, Math.round((w * h) / 2600));
      list = [];
      for (var i = 0; i < count; i++) {
        list.push({
          x: rand() * w,
          y: Math.pow(rand(), 1.7) * h * 0.92,
          r: 0.35 + Math.pow(rand(), 3) * 1.25,
          a: 0.35 + rand() * 0.65,
          s: 0.4 + rand() * 1.6,
          p: rand() * Math.PI * 2
        });
      }
      draw(performance.now());
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      var still = reduceMotion.matches;
      for (var i = 0; i < list.length; i++) {
        var st = list[i];
        var tw = still ? 1 : 0.65 + 0.35 * Math.sin(time / 1000 * st.s + st.p);
        ctx.globalAlpha = st.a * tw;
        ctx.fillStyle = '#f4f6ff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (shooting) {
        var k = (time - shooting.start) / 900;
        if (k >= 1) shooting = null;
        else {
          var x = shooting.x + shooting.dx * k;
          var y = shooting.y + shooting.dy * k;
          var grad = ctx.createLinearGradient(x, y, x - shooting.dx * 0.18, y - shooting.dy * 0.18);
          grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * (1 - k)) + ')');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - shooting.dx * 0.18, y - shooting.dy * 0.18);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(time) {
      raf = null;
      if (!shouldRun()) return;
      if (!shooting && root.getAttribute('data-mode') === 'night' && time > nextShot) {
        if (nextShot) shooting = { start: time, x: w * (0.3 + Math.random() * 0.6), y: h * Math.random() * 0.3, dx: -(160 + Math.random() * 160), dy: 70 + Math.random() * 60 };
        nextShot = time + 7000 + Math.random() * 9000;
      }
      draw(time);
      raf = requestAnimationFrame(loop);
    }

    function shouldRun() {
      var mode = root.getAttribute('data-mode');
      return visible && !document.hidden && !reduceMotion.matches && (mode === 'night' || mode === 'sunset');
    }

    return {
      init: function () {
        canvas = skyParts.canvas;
        ctx = canvas.getContext('2d');
        resize();
        var timer;
        window.addEventListener('resize', function () {
          clearTimeout(timer);
          timer = setTimeout(resize, 150);
        });
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            this.wake();
          }.bind(this)).observe(sky);
        }
        document.addEventListener('visibilitychange', this.wake);
        this.wake();
      },
      wake: function () {
        if (!canvas) return;
        if (shouldRun()) { if (!raf) raf = requestAnimationFrame(loop); }
        else draw(performance.now());
      }
    };
  })();

  /* ---------- day bar ---------- */

  var bars = [];

  function buildDaybars() {
    document.querySelectorAll('[data-daybar]').forEach(function (el) {
      el.classList.add('daybar');
      el.innerHTML =
        '<div class="daybar__head"><span class="daybar__now-mode" data-db-mode></span><span class="daybar__time" data-db-time></span></div>' +
        '<div class="daybar__track"><div class="daybar__segments" data-db-segments></div><span class="daybar__now" data-db-now></span>' +
        '<input class="daybar__range" type="range" min="0" max="1435" step="5" aria-label="Drag through your day to change the time of day" data-db-range></div>' +
        '<div class="daybar__ticks" aria-hidden="true"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>' +
        '<p class="daybar__note"><span data-db-note></span> <button type="button" class="daybar__auto" data-db-auto>Follow my sky</button></p>';

      var bar = {
        el: el,
        mode: el.querySelector('[data-db-mode]'),
        time: el.querySelector('[data-db-time]'),
        note: el.querySelector('[data-db-note]'),
        segments: el.querySelector('[data-db-segments]'),
        now: el.querySelector('[data-db-now]'),
        range: el.querySelector('[data-db-range]')
      };
      bars.push(bar);

      bar.range.addEventListener('input', function () {
        var minute = +bar.range.value;
        var mode = S.modeAt(atMinute(minute), place);
        virtualMinute = minute;
        // Dragging back to right now means "follow my sky" again.
        if (Math.abs(minute - minuteOf(S.now())) < 5) S.followSun();
        else S.choose(mode, minute);
        render();
      });
      el.querySelector('[data-db-auto]').addEventListener('click', function () {
        virtualMinute = null;
        S.followSun();
        render();
      });
    });
    drawSegments();
  }

  function drawSegments() {
    bars.forEach(function (bar) {
      bar.segments.innerHTML = plan.map(function (s) {
        return '<span class="daybar__seg" data-mode="' + s.mode + '" style="width:' + ((s.end - s.start) / 14.4).toFixed(3) + '%"></span>';
      }).join('');
    });
  }

  function sunTimes(date) {
    return S.solarTimes(new Date(midnightOf(date).getTime() + 12 * 36e5), place.lat, place.lng);
  }

  function skyNote(now) {
    var t = sunTimes(now);
    var fmt = S.formatTime;
    if (!t.sunset || !t.sunrise) return 'No sunrise or sunset for you today. Enjoy the long light (or the long night).';
    if (now < t.sunrise) return 'Sunrise at ' + fmt(t.sunrise) + ' for you today.';
    if (now < t.sunset) return (t.goldenHour ? 'Golden hour starts ' + fmt(t.goldenHour) + ', sunset at ' : 'Sunset at ') + fmt(t.sunset) + ' for you today.';
    var tomorrow = sunTimes(new Date(now.getTime() + 864e5));
    return 'The sun set at ' + fmt(t.sunset) + '.' + (tomorrow.sunrise ? ' Sunrise tomorrow at ' + fmt(tomorrow.sunrise) + '.' : '');
  }

  function updateDaybars(mode, date) {
    if (!bars.length) return;
    var now = S.now();
    var auto = !S.override();
    var note = auto
      ? skyNote(now)
      : 'Showing ' + MODE_NAMES[mode] + '. Your real sky is ' + MODE_NAMES[S.modeAt(now, place)] + ' right now.';
    bars.forEach(function (bar) {
      bar.mode.innerHTML = ICONS[mode] + '<span>' + MODE_NAMES[mode] + '</span>';
      bar.time.textContent = auto ? S.formatTime(now) + ' for you' : S.formatTime(date);
      bar.note.textContent = note;
      bar.now.style.left = (minuteOf(now) / 14.4).toFixed(2) + '%';
      if (document.activeElement !== bar.range) bar.range.value = minuteOf(date) - (minuteOf(date) % 5);
      bar.range.setAttribute('aria-valuetext', S.formatTime(date) + ', ' + MODE_NAMES[mode]);
    });
  }

  /* ---------- Maggie's clock ---------- */

  function updateHomeClock() {
    var el = document.querySelector('[data-home-clock]');
    if (!el) return;
    var now = new Date();
    var home = S.HOME;
    var homeMode = S.modeAt(now, home);
    el.innerHTML = 'In ' + home.name + ' it’s <b>' + S.formatTime(now, home.tz) + '</b>, ' + HOME_STATUS[homeMode];
  }

  /* ---------- favicon ---------- */

  function updateFavicon(mode) {
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(FAVICONS[mode]);
  }

  /* ---------- render loop ---------- */

  var lastMode = null;

  function render() {
    var today = S.now().toDateString();
    if (today !== planDay) {
      planDay = today;
      plan = S.dayPlan(S.now(), place);
      drawSegments();
    }
    var mode = S.current();
    var date = skyDate();
    S.apply(mode);
    placeSun(date);
    updateDaybars(mode, date);
    updateHomeClock();
    if (mode !== lastMode) {
      updateFavicon(mode);
      document.querySelectorAll('[data-mode-icon]').forEach(function (el) { el.innerHTML = ICONS[mode]; });
      stars.wake && skyParts && stars.wake();
      document.dispatchEvent(new CustomEvent('modechange', { detail: { mode: mode } }));
      lastMode = mode;
    }
  }

  /* ---------- dragging (shared by stickers, the plot and the wall) ---------- */

  // Calls onStart/onMove/onEnd with pixel offsets from where the drag began.
  // A press that never moves counts as a tap, so clicks still work.
  // Listens on the window during a drag (not the element), so small targets and
  // elements that get moved around the DOM mid-drag keep following the pointer.
  function draggable(el, opts) {
    var id = null, x0 = 0, y0 = 0, moved = false, samples = [];

    function onMove(e) {
      if (e.pointerId !== id) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        moved = true;
        el.classList.add('is-held');
        document.documentElement.style.userSelect = 'none';
        if (opts.onStart) opts.onStart(e);
      }
      samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (samples.length > 5) samples.shift();
      opts.onMove(dx, dy, e);
      e.preventDefault();
    }

    function finish(e) {
      if (e.pointerId !== id) return;
      id = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (!moved) return;
      el.classList.remove('is-held');
      document.documentElement.style.userSelect = '';
      var v = { x: 0, y: 0 };
      if (samples.length > 1) {
        var a = samples[0], b = samples[samples.length - 1];
        var dt = Math.max(b.t - a.t, 1);
        v = { x: (b.x - a.x) / dt * 16, y: (b.y - a.y) / dt * 16 };
      }
      if (opts.onEnd) opts.onEnd(v, e);
    }

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || id !== null) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      moved = false;
      samples = [];
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    });
    el.addEventListener('click', function (e) {
      if (moved) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moved = false;
      }
    }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------- stickers in the bio: pick them up, toss them ---------- */

  function setupStickers() {
    var stickers = document.querySelectorAll('.sticker');
    var reset = document.querySelector('[data-sticker-reset]');
    var hint = document.querySelector('[data-sticker-hint]');
    if (!stickers.length) return;
    var loose = [];

    stickers.forEach(function (st) {
      var pos = { x: 0, y: 0 }, start = null, spin = 0;

      draggable(st, {
        onStart: function () {
          if (!st.classList.contains('is-loose')) {
            var rect = st.getBoundingClientRect();
            var slot = document.createElement('span');
            slot.className = 'sticker-slot';
            slot.style.fontSize = getComputedStyle(st).fontSize;
            st.parentNode.insertBefore(slot, st);
            st._slot = slot;
            st.style.width = rect.width + 'px';
            st.style.height = rect.height + 'px';
            pos = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
            st.classList.add('is-loose');
            document.body.appendChild(st);
            loose.push(st);
            if (reset) reset.hidden = false;
            if (hint) hint.hidden = true;
          }
          st._fling && cancelAnimationFrame(st._fling);
          start = { x: pos.x, y: pos.y };
          moveTo(st, pos);
        },
        onMove: function (dx, dy) {
          pos = { x: start.x + dx, y: start.y + dy };
          moveTo(st, pos);
        },
        onEnd: function (v) {
          if (reduceMotion.matches) return;
          var vx = clamp(v.x, -60, 60), vy = clamp(v.y, -60, 60);
          var maxX = document.documentElement.scrollWidth - st.offsetWidth;
          var maxY = document.documentElement.scrollHeight - st.offsetHeight;
          (function step() {
            pos.x += vx;
            pos.y += vy;
            if (pos.x < 0 || pos.x > maxX) { vx *= -0.6; pos.x = clamp(pos.x, 0, maxX); }
            if (pos.y < 0 || pos.y > maxY) { vy *= -0.6; pos.y = clamp(pos.y, 0, maxY); }
            vx *= 0.93;
            vy *= 0.93;
            spin += vx * 0.6;
            moveTo(st, pos, spin);
            if (Math.abs(vx) + Math.abs(vy) > 0.4) st._fling = requestAnimationFrame(step);
          })();
        }
      });
    });

    function moveTo(st, p, rot) {
      st.style.left = p.x + 'px';
      st.style.top = p.y + 'px';
      if (rot !== undefined) st.style.setProperty('--r', (rot % 360).toFixed(1) + 'deg');
    }

    if (reset) {
      reset.addEventListener('click', function () {
        loose.forEach(function (st) {
          st._fling && cancelAnimationFrame(st._fling);
          var slot = st._slot;
          var r = slot.getBoundingClientRect();
          st.style.transition = 'left .6s var(--ease), top .6s var(--ease), transform .6s var(--ease)';
          st.style.left = (r.left + window.scrollX) + 'px';
          st.style.top = (r.top + window.scrollY) + 'px';
          st.style.removeProperty('--r');
          setTimeout(function () {
            st.classList.remove('is-loose');
            st.removeAttribute('style');
            slot.parentNode.replaceChild(st, slot);
          }, reduceMotion.matches ? 0 : 620);
        });
        loose = [];
        reset.hidden = true;
        if (hint) hint.hidden = false;
      });
    }
  }

  /* ---------- case study table of contents ---------- */

  function setupToc() {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var link = byId[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* ---------- little things ---------- */

  function setupUpdated() {
    var el = document.querySelector('[data-updated]');
    if (!el) return;
    var d = new Date(document.lastModified);
    if (!isNaN(d)) el.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function setupYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- go ---------- */

  window.Site = { draggable: draggable, icons: ICONS, reduceMotion: reduceMotion, skyDate: skyDate };

  function init() {
    buildSky();
    buildDaybars();
    setupStickers();
    setupToc();
    setupUpdated();
    setupYear();
    render();
    setInterval(render, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
