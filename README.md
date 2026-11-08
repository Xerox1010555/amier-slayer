# Amier — amier-slayer 🗡️

A **Demon Slayer ("Kimetsu no Yaiba") themed** personal portfolio — dark abyss scene, crimson ash embers, 刃 kanji ghost, one-time blade sweep, and a Tanjiro portrait that greets you while every word assembles like bricks as you scroll. Built with **vanilla HTML / CSS / JavaScript only**. Zero frameworks, zero build step, zero dependencies.

## Live preview

Open `index.html` in any modern browser — no server, no install, no build.

```powershell
start index.html
```

Or serve it locally (optional — hardened preview server):

```powershell
node server.js   # then open http://localhost:8130
```

## Structure

```
amier-slayer/
├── index.html          # All sections (static-first, SEO + a11y scored 100/100/100)
├── styles.css          # Design system — demon-slayer tokens, choreography engine
├── script.js           # Interactions — wbrick splitter, char cascade, scroll exit, copy
├── content.json        # Every piece of site data (source of truth for edits)
├── vercel.json         # Security headers + caching for Vercel deploys
├── server.js           # Optional hardened local preview server (traversal-safe)
├── tanjiro.png         # Hero portrait
├── me.jpg              # Profile photo
├── assets/cv.pdf       # Downloadable CV
└── README.md
```

## Sections (mirroring the reference video's choreography)

1. **Hero** — abyss scene with embers, kanji ghost 刃, blade sweep, arch-masked Tanjiro card with crimson glow + slash marks and a floating "Hi!" bubble, bone name with echo, monitor annotations, social chips, Download CV, animated stat counters.
2. **Marquee** — dark tech ticker with ember-red diamonds.
3. **About / Experience / Stack / Projects / Reviews / Writing** — light editorial paper sections with crimson accents, char-cascade headings, transient swipe bars, ledger builds, CSS-only project shots.
4. **Get in touch** — dark blade chamber: mini contact rows with copy button, send button, keyword ticker, the big "LET'S BUILD SOMETHING [IMPACTFUL] TOGETHER." stamp statement, five channel cards (Telegram / LinkedIn / Email / GitHub / WhatsApp) with crimson hover + sparkle confetti, availability badge, reverse footer ticker.

## Motion system ("bricks" rule)

- **wbrick** — every word in hero role + contact sub drops in like masonry (staggered, blurred, rotated → settles).
- **chars** — headings draw in letter-by-letter (126 animated chars).
- **scroll exit** — the entire hero collapses upward at per-layer depths with motion blur on the name (`--sy` engine in script.js).
- `IntersectionObserver` drives every reveal; `prefers-reduced-motion` honoured everywhere.

## Tech notes

- **Performance**: no frameworks, no JS libraries, GPU-cheap transforms only, lazy counters/service-free.
- **Accessibility**: skip link, focus-visible, ARIA labels, semantic landmarks, Lighthouse **100**.
- **Security**: strict CSP (`script-src 'self'`), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS on prod, `form-action 'none'`, `base-uri 'self'`; identical header set in `vercel.json` + `server.js`. Lighthouse Best-Practices **100**.
- **SEO**: JSON-LD `Person`, OpenGraph + Twitter cards, Lighthouse **100**.

## Editing content

Everything textual lives in `content.json`. Static HTML is the rendering source — keep both in sync when you edit.

## Deployment

**Vercel** (recommended — `vercel.json` included):

```powershell
npx vercel --prod
```

**GitHub Pages**: push as-is; the site is fully static.

---

© Amier — forged & built from scratch. No templates. 刃
