/* after-hours.js — the pin-up wall.
   - drag pieces around, click one to see it up close
   - filter by kind
   - at night (and dimly at sunset) the cursor becomes a desk lamp */
(function () {
  'use strict';

  var Site = window.Site;
  var wall = document.querySelector('[data-wall]');
  if (!wall) return;
  var pieces = wall.querySelectorAll('.piece');
  var tidy = document.querySelector('[data-tidy]');

  /* ---------- drag to rearrange ---------- */

  pieces.forEach(function (piece) {
    var start;
    Site.draggable(piece, {
      onStart: function () {
        start = {
          x: parseFloat(piece.style.getPropertyValue('--dx')) || 0,
          y: parseFloat(piece.style.getPropertyValue('--dy')) || 0
        };
      },
      onMove: function (dx, dy) {
        piece.style.setProperty('--dx', (start.x + dx) + 'px');
        piece.style.setProperty('--dy', (start.y + dy) + 'px');
        if (tidy) tidy.hidden = false;
      }
    });
    piece.addEventListener('click', function () { open(piece); });
  });

  if (tidy) tidy.addEventListener('click', function () {
    pieces.forEach(function (p) {
      p.style.removeProperty('--dx');
      p.style.removeProperty('--dy');
    });
    tidy.hidden = true;
  });

  /* ---------- filter ---------- */

  var chips = document.querySelectorAll('[data-kind-filter]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var kind = chip.getAttribute('data-kind-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      pieces.forEach(function (p) { p.hidden = kind !== 'all' && p.getAttribute('data-kind') !== kind; });
    });
  });

  /* ---------- up close ---------- */

  var box = document.querySelector('[data-lightbox]');
  function open(piece) {
    if (!box || typeof box.showModal !== 'function') return;
    box.querySelector('[data-lb-title]').textContent = piece.getAttribute('data-title');
    box.querySelector('[data-lb-meta]').textContent = piece.getAttribute('data-meta');
    box.querySelector('[data-lb-desc]').textContent = piece.getAttribute('data-desc');
    var media = box.querySelector('[data-lb-media]');
    media.innerHTML = piece.querySelector('.media').innerHTML;
    box.showModal();
  }
  if (box) {
    box.querySelector('[data-lb-close]').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  }

  /* ---------- the lamp ---------- */

  var lamp = document.querySelector('[data-lamp]');
  var main = document.querySelector('.main');
  if (lamp && main && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var pending = false, x = 0, y = 0;

    // The dark only covers the wall side, so the sidebar (and the day bar) stay lit.
    function fit() {
      var left = main.getBoundingClientRect().left - 36;
      lamp.style.left = Math.max(0, left) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);

    window.addEventListener('pointermove', function (e) {
      x = e.clientX;
      y = e.clientY;
      lamp.classList.add('is-on');
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        var offset = parseFloat(lamp.style.left) || 0;
        lamp.style.setProperty('--lx', (x - offset) + 'px');
        lamp.style.setProperty('--ly', y + 'px');
        pending = false;
      });
    });
    document.documentElement.addEventListener('pointerleave', function () { lamp.classList.remove('is-on'); });
  }
})();
