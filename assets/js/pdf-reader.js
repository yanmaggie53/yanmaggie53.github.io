/* pdf-reader.js — shows a PDF as a stack of paper pages right on the page,
   so people can read it without downloading anything. Works on phones too.

   <div class="pdf" data-pdf="path/to/file.pdf" aria-label="What this is">
     <div class="pdf__pages"></div>
     <p class="pdf__fallback">…link to the file…</p>
   </div>

   Add class "pdf--framed" to scroll inside a fixed-height window instead of
   flowing with the page. Uses PDF.js (Mozilla), loaded only on pages that need it. */
(function () {
  'use strict';

  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var readers = Array.prototype.slice.call(document.querySelectorAll('[data-pdf]'));
  if (!readers.length) return;

  function loadLib(done, fail) {
    if (window.pdfjsLib) return done();
    var s = document.createElement('script');
    s.src = LIB + 'pdf.min.js';
    s.onload = function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIB + 'pdf.worker.min.js';
      done();
    };
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function showFallback(el) {
    el.classList.add('is-failed');
  }

  function setup(el) {
    var pagesEl = el.querySelector('.pdf__pages');
    var status = el.querySelector('[data-pdf-status]');
    var url = el.getAttribute('data-pdf');
    var doc = null;
    var renderedWidth = 0;
    var busy = false;

    var seamless = el.classList.contains('pdf--seamless');

    function contentWidth() {
      var pad = el.classList.contains('pdf--framed') && !seamless ? 32 : 0;
      return Math.floor(pagesEl.clientWidth - pad);
    }

    // Which rows of a drawn page have ink on them (anything darker than near-white).
    function inkRows(canvas) {
      var w = canvas.width, h = canvas.height;
      var data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
      var rows = new Uint8Array(h);
      for (var y = 0; y < h; y++) {
        var start = y * w * 4;
        for (var x = 0; x < w; x += 2) {
          var i = start + x * 4;
          if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] < 690) { rows[y] = 1; break; }
        }
      }
      return rows;
    }

    // First and last inked rows, and the blank gaps between lines in between.
    function measure(rows) {
      var first = -1, last = -1, run = 0, gaps = [];
      for (var y = 0; y < rows.length; y++) {
        if (rows[y]) {
          if (first < 0) first = y;
          else if (run > 1) gaps.push(run);
          last = y;
          run = 0;
        } else if (first >= 0) {
          run++;
        }
      }
      return { first: first, last: last, gaps: gaps };
    }

    function median(list) {
      if (!list.length) return 0;
      var sorted = list.slice().sort(function (a, b) { return a - b; });
      return sorted[Math.floor(sorted.length / 2)];
    }

    // Join the pages into one sheet: trim the blank margins at each page break
    // so the last line of a page and the first line of the next sit exactly one
    // ordinary line-gap apart, the same as any two lines of the CV.
    function trim(pages, dpr) {
      var gaps = [];
      pages.forEach(function (p) { gaps = gaps.concat(p.gaps); });
      var lineGap = median(gaps) / dpr;
      var topMargin = pages[0].first > 0 ? pages[0].first : 0;
      pages.forEach(function (p, i) {
        if (p.first < 0) {
          p.sheet.style.display = 'none';
          return;
        }
        var top = i === 0 ? 0 : Math.max(0, p.first - lineGap / 2);
        var isLast = i === pages.length - 1;
        var bottom = Math.min(p.height, p.last + (isLast ? topMargin : lineGap / 2));
        p.sheet.style.height = (bottom - top) + 'px';
        p.inner.style.top = -top + 'px';
      });
    }

    function render() {
      if (!doc || busy) return;
      var width = contentWidth();
      if (!width || Math.abs(width - renderedWidth) < 30) return;
      busy = true;
      renderedWidth = width;
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var drawn = [];
      pagesEl.innerHTML = '';

      var chain = Promise.resolve();
      for (var n = 1; n <= doc.numPages; n++) {
        (function (num) {
          chain = chain.then(function () { return doc.getPage(num); }).then(function (page) {
            var base = page.getViewport({ scale: 1 });
            var cssScale = width / base.width;
            var view = page.getViewport({ scale: cssScale });
            var hiRes = page.getViewport({ scale: cssScale * dpr });

            // sheet = what shows (can be trimmed); inner = the whole page, shifted up as needed
            var sheet = document.createElement('div');
            sheet.className = 'pdf__page';
            sheet.style.width = view.width + 'px';
            sheet.style.height = view.height + 'px';
            var inner = document.createElement('div');
            inner.className = 'pdf__inner';
            inner.style.width = view.width + 'px';
            inner.style.height = view.height + 'px';
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(hiRes.width);
            canvas.height = Math.floor(hiRes.height);
            canvas.setAttribute('aria-hidden', 'true');
            inner.appendChild(canvas);
            sheet.appendChild(inner);
            pagesEl.appendChild(sheet);

            // Clickable links, laid over the drawing where the PDF has them.
            page.getAnnotations().then(function (annots) {
              annots.forEach(function (a) {
                if (a.subtype !== 'Link' || !a.url) return;
                var r = view.convertToViewportRectangle(a.rect);
                var link = document.createElement('a');
                link.className = 'pdf__link';
                link.href = a.url;
                link.target = '_blank';
                link.rel = 'noopener';
                link.style.left = Math.min(r[0], r[2]) + 'px';
                link.style.top = Math.min(r[1], r[3]) + 'px';
                link.style.width = Math.abs(r[2] - r[0]) + 'px';
                link.style.height = Math.abs(r[3] - r[1]) + 'px';
                link.setAttribute('aria-label', a.url.replace(/^mailto:/, 'Email '));
                inner.appendChild(link);
              });
            });

            // The page's words, for screen readers and find-in-page.
            page.getTextContent().then(function (content) {
              var text = document.createElement('div');
              text.className = 'visually-hidden';
              text.textContent = content.items.map(function (i) { return i.str; }).join(' ');
              inner.appendChild(text);
            });

            return page.render({ canvasContext: canvas.getContext('2d'), viewport: hiRes }).promise.then(function () {
              if (!seamless) return;
              var m = measure(inkRows(canvas));
              drawn.push({
                sheet: sheet,
                inner: inner,
                height: view.height,
                first: m.first < 0 ? -1 : m.first / dpr,
                last: m.last / dpr,
                gaps: m.gaps
              });
            });
          });
        })(n);
      }
      chain.then(function () {
        if (seamless && drawn.length) trim(drawn, dpr);
        busy = false;
        el.classList.add('is-ready');
        updateStatus();
        // The window may have changed size while we were drawing.
        if (Math.abs(contentWidth() - renderedWidth) >= 30) render();
      }).catch(function () {
        busy = false;
        showFallback(el);
      });
    }

    // "Page 2 of 5" for framed readers that scroll inside their own window.
    function updateStatus() {
      if (!status || !doc) return;
      var sheets = pagesEl.querySelectorAll('.pdf__page:not([style*="display: none"])');
      var mark = pagesEl.scrollTop + pagesEl.clientHeight / 3;
      var current = 1;
      for (var i = 0; i < sheets.length; i++) if (sheets[i].offsetTop <= mark) current = i + 1;
      // Scrolled all the way down: that's the last page, however short it is.
      if (pagesEl.scrollTop + pagesEl.clientHeight >= pagesEl.scrollHeight - 2) current = sheets.length;
      status.textContent = 'Page ' + current + ' of ' + sheets.length + (current < sheets.length ? ' · scroll for more' : '');
    }
    pagesEl.addEventListener('scroll', updateStatus, { passive: true });

    function start() {
      loadLib(function () {
        window.pdfjsLib.getDocument(url).promise.then(function (d) {
          doc = d;
          render();
        }, function () { showFallback(el); });
      }, function () { showFallback(el); });
    }

    // Only fetch and draw once the reader is close to being on screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        start();
      }, { rootMargin: '600px 0px' });
      io.observe(el);
    } else {
      start();
    }

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(render, 250);
    });
  }

  readers.forEach(setup);
})();
