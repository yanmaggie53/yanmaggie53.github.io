# yanmaggie53.github.io

Maggie Yan's portfolio. Plain HTML, CSS, and JavaScript, no build step. Push to `main` and GitHub Pages publishes it.

## The time-of-day modes

The site follows the real sun for whoever is visiting. It works out where they are from their time zone (no location prompt), then picks:

| Mode | When |
| --- | --- |
| **sunrise** | dawn (sun 6° down) until the sun is 6° up, about an hour |
| **day** | then until 2pm |
| **afternoon** | 2pm to golden hour (the after-lunch slump) |
| **sunset** | golden hour (sun 6° up) to dusk (6° down), usually 60–80 min, earlier in winter |
| **night** | dusk to dawn |

Visitors can drag through their day on the bar in the sidebar to change the mode. Their choice follows them between pages until they close the tab, and "Follow my sky" puts it back.

**Testing:** add `?mode=sunset` (or `sunrise`, `day`, `afternoon`, `night`) to any URL, or `?at=18:30` to pretend it's a certain time.

## Where things live

```
index.html                 home: research interests word cloud, work (research / practice), garden
projects/*.html            case studies (one shared structure, see below)
after-hours.html           fine art, architecture sketches, fabrication
about.html                 short intro + the full CV, readable on the page
assets/css/style.css       all styles; mode colors are at the top
assets/js/sky-time.js      sun math + picks the mode (loads first, in <head>)
assets/js/site.js          sky, day bar, stickers, clock (every page)
assets/js/home.js          word cloud, filters, previews, garden
assets/js/pdf-reader.js    shows PDFs (CV, papers) as pages you can scroll
assets/js/after-hours.js   pin-up wall + night lamp
```

## Editing

- **Placeholder text** is wrapped in `<span class="todo">…</span>` (italic, dashed underline). Replace the whole span with your words.
- **Lately:** the `<ul class="news">` in the sidebar of `index.html`. Newest first, 2–4 items.
- **Research:** each `<article class="project">` in `index.html`, newest first. The `data-methods` and `data-domains` lists feed the filter dropdowns automatically. Add `data-preview="assets/video/clip.mp4"` to play a muted clip on hover.
- **Practice** (internship + class work): the `.tile`s in the `data-panel="practice"` block. Use `<a class="tile" href="…">` once a project has its own page.
- **Research interests word cloud:** the `<figure data-wordcloud>` at the top of `index.html`. Each word's `data-w` (1 + the number of topics inside it) sets its size; `data-group` ties focus areas to their theme so they cluster and light up together. Wrap a word in a link to tie it to a project.
- **After hours:** each `.piece` on the wall. `data-kind` must match one of the filter chips.
- **New case study:** copy `projects/zzalign.html`, then update the title, the sidebar table of contents, and the next-project link. Research pages link in a loop, newest to oldest.
- **Images:** swap a `<div class="media__placeholder">…</div>` for `<img src="assets/img/…" alt="…">` (keep it inside the `.media` box).
- **CV:** replace `assets/Maggie_Yan_CV.pdf` (keep the file name) and update the "Updated" date on `about.html`. The About page draws it as pages and offers a download.
- **Any PDF on a page:** `<div class="pdf" data-pdf="path.pdf"><div class="pdf__pages"></div></div>` plus `assets/js/pdf-reader.js`. Add `pdf--framed` to scroll it inside a window.
- **What the sidebar says you're doing** (based on the time in Wellesley): `HOME_STATUS` at the top of `assets/js/site.js`.
- **Mode colors:** the `:root[data-mode="…"]` blocks at the top of `assets/css/style.css`.
- **Garden:** plant shapes and per-mode colors are in `assets/js/home.js` (`DRAW`, `GARDEN_COLORS`). Each visitor's garden is saved in their own browser.

## Fonts

- **Cabinet Grotesk** (Fontshare) for the name, headlines, and titles.
- **Satoshi** (Fontshare) for body text and interface.

Both load from Fontshare as two separate links. A combined Fontshare link returns Switzer in place of Satoshi, so keep them separate.

## Preview locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.
