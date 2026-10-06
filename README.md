# yanmaggie53.github.io

Maggie Yan's portfolio. Plain HTML, CSS, and JavaScript, no build step. Push to `main` and GitHub Pages publishes it.

## The time-of-day modes

The site follows the real sun for whoever is visiting. It works out where they are from their time zone (no location prompt), then picks:

| Mode | When |
| --- | --- |
| **day** | sunrise to 2pm |
| **afternoon** | 2pm to golden hour (the after-lunch slump) |
| **sunset** | golden hour (sun 6° up) to dusk (6° down), usually 60–80 min, earlier in winter |
| **night** | dusk to sunrise |

Visitors can switch modes, or drag through their day on the bar in the sidebar. Their choice follows them between pages until they close the tab.

**Testing:** add `?mode=sunset` (or `day`, `afternoon`, `night`) to any URL, or `?at=18:30` to pretend it's a certain time.

## Where things live

```
index.html                 home: chat intro, work (research / play), sneak peek, garden
projects/*.html            case studies (one shared structure, see below)
after-hours.html           fine art, architecture sketches, fabrication
about.html                 interests, education, experience, CV
assets/css/style.css       all styles; mode colors are at the top
assets/js/sky-time.js      sun math + picks the mode (loads first, in <head>)
assets/js/site.js          sky, day bar, stickers, clock (every page)
assets/js/home.js          chat, filters, previews, plot, garden
assets/js/after-hours.js   pin-up wall + night lamp
```

## Editing

- **Placeholder text** is wrapped in `<span class="todo">…</span>` (italic, dashed underline). Replace the whole span with your words.
- **Chat intro:** the `<template>` blocks near the top of `index.html`. `data-from="them"` is the visitor, `data-from="me"` is you. The first exchange changes with the time of day.
- **Projects:** each `<article class="project">` in `index.html`. The `data-methods` and `data-domains` lists feed the filter dropdowns automatically. Add `data-preview="assets/video/clip.mp4"` to play a muted clip on hover.
- **New case study:** copy `projects/zzalign.html`, then update the title, the sidebar table of contents, and the next-project link.
- **Images:** swap a `<div class="media__placeholder">…</div>` for `<img src="assets/img/…" alt="…">` (keep it inside the `.media` box).
- **Sneak peek plot:** each `.chip-sticker` has `--x` (0% curious → 100% obsessed) and `--y` (0% lately → 100% for years).
- **CV:** put your PDF at `assets/Maggie_Yan_CV.pdf`. Every CV link already points there.
- **What the sidebar says you're doing** (based on the time in Boston): `HOME_STATUS` at the top of `assets/js/site.js`.
- **Mode colors:** the `:root[data-mode="…"]` blocks at the top of `assets/css/style.css`.

## Fonts

- **Satoshi** (Fontshare) for body text and interface.
- **Instrument Serif** (Google Fonts) for the name, headings, and italic accents.

## Preview locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.
