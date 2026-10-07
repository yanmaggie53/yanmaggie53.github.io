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

    function render() {
      if (!doc || busy) return;
      var width = Math.floor(pagesEl.clientWidth - (el.classList.contains('pdf--framed') ? 32 : 0));
      if (!width || Math.abs(width - renderedWidth) < 30) return;
      busy = true;
      renderedWidth = width;
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      pagesEl.innerHTML = '';

      var chain = Promise.resolve();
      for (var n = 1; n <= doc.numPages; n++) {
        (function (num) {
          chain = chain.then(function () { return doc.getPage(num); }).then(function (page) {
            var base = page.getViewport({ scale: 1 });
            var cssScale = width / base.width;
            var view = page.getViewport({ scale: cssScale });
            var hiRes = page.getViewport({ scale: cssScale * dpr });

            var sheet = document.createElement('div');
            sheet.className = 'pdf__page';
            sheet.style.width = view.width + 'px';
            sheet.style.height = view.height + 'px';
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(hiRes.width);
            canvas.height = Math.floor(hiRes.height);
            canvas.setAttribute('aria-hidden', 'true');
            sheet.appendChild(canvas);
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
                sheet.appendChild(link);
              });
            });

            // The page's words, for screen readers and find-in-page.
            page.getTextContent().then(function (content) {
              var text = document.createElement('div');
              text.className = 'visually-hidden';
              text.textContent = content.items.map(function (i) { return i.str; }).join(' ');
              sheet.appendChild(text);
            });

            return page.render({ canvasContext: canvas.getContext('2d'), viewport: hiRes }).promise;
          });
        })(n);
      }
      chain.then(function () {
        busy = false;
        el.classList.add('is-ready');
        updateStatus();
        // The window may have changed size while we were drawing.
        if (Math.abs(Math.floor(pagesEl.clientWidth - (el.classList.contains('pdf--framed') ? 32 : 0)) - renderedWidth) >= 30) render();
      }).catch(function () {
        busy = false;
        showFallback(el);
      });
    }

    // "Page 2 of 5" for framed readers that scroll inside their own window.
    function updateStatus() {
      if (!status || !doc) return;
      var sheets = pagesEl.querySelectorAll('.pdf__page');
      var mark = pagesEl.scrollTop + pagesEl.clientHeight / 3;
      var current = 1;
      for (var i = 0; i < sheets.length; i++) if (sheets[i].offsetTop <= mark) current = i + 1;
      status.textContent = 'Page ' + current + ' of ' + doc.numPages + (current < doc.numPages ? ' · scroll for more' : '');
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
