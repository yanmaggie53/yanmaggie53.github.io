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
index.html                 home: research interests chart, work (research / practice), sneak peek, garden
projects/*.html            case studies (one shared structure, see below)
after-hours.html           fine art, architecture sketches, fabrication
about.html                 interests, education, experience, CV
assets/css/style.css       all styles; mode colors are at the top
assets/js/sky-time.js      sun math + picks the mode (loads first, in <head>)
assets/js/site.js          sky, day bar, stickers, clock (every page)
assets/js/home.js          filters, previews, plot, garden
assets/js/after-hours.js   pin-up wall + night lamp
```

## Editing

- **Placeholder text** is wrapped in `<span class="todo">…</span>` (italic, dashed underline). Replace the whole span with your words.
- **Lately:** the `<ul class="news">` in the sidebar of `index.html`. Newest first, 2–4 items.
- **Research:** each `<article class="project">` in `index.html`, newest first. The `data-methods` and `data-domains` lists feed the filter dropdowns automatically. Add `data-preview="assets/video/clip.mp4"` to play a muted clip on hover.
- **Practice** (internship + class work): the `.tile`s in the `data-panel="practice"` block. Use `<a class="tile" href="…">` once a project has its own page.
- **Research interests chart:** the `<figure class="imap">` at the top of `index.html`. Fields, then themes (`.imap__theme`), then focus areas (`.imap__leaves`). Wrap a focus area in a link to tie it to a project.
- **After hours:** each `.piece` on the wall. `data-kind` must match one of the filter chips.
- **New case study:** copy `projects/zzalign.html`, then update the title, the sidebar table of contents, and the next-project link. Research pages link in a loop, newest to oldest.
- **Images:** swap a `<div class="media__placeholder">…</div>` for `<img src="assets/img/…" alt="…">` (keep it inside the `.media` box).
- **Sneak peek plot:** each `.chip-sticker` has `--x` (0% curious → 100% obsessed) and `--y` (0% lately → 100% for years).
- **CV:** put your PDF at `assets/Maggie_Yan_CV.pdf`. Every CV link already points there.
- **What the sidebar says you're doing** (based on the time in Boston): `HOME_STATUS` at the top of `assets/js/site.js`.
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
