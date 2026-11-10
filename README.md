# Amier — amier-slayer 🗡️

**Live site: https://xerox1010555.github.io/amier-slayer/** · **CV: [`assets/cv.pdf`](assets/cv.pdf)** · **GitHub: [Xerox1010555](https://github.com/Xerox1010555)**
Live client demos: [Azure Dashboard](https://azure-theta-87.vercel.app/) · [Carpentry & Decor](https://ok-web-blue.vercel.app)

A **Demon Slayer ("Kimetsu no Yaiba") themed** personal portfolio — dark abyss scene, crimson ash embers, 刃 kanji ghost, one-time blade sweep, and a real-time **3D warrior (KayKit "Adventurers" Character Pack, CC0 by Kay Lousberg)** loaded from a vendored `.glb` with three.js — he plays his built-in idle, **greets you with a "Hi!" bubble** and a random flourish on every visit, **aims his sword with your cursor**, and **fights on demand**: click the stage, sweep your cursor across it, or watch his periodic auto-duel. A **different welcome intro is rolled on every refresh** (5 variants: slash / ink / stamp / ember / blink — always released after the curtain, so the hero is never stuck hidden). Built with **vanilla HTML / CSS / JavaScript only** — `three.js` (MIT) + `GLTFLoader` are vendored locally. Zero frameworks, zero build step, zero network dependencies at runtime (fonts aside).

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
├── styles.css          # Design system — demon-slayer tokens, choreography + intro variants, responsive tiers
├── script.js           # Interactions — randomizer, wbrick splitter, char cascade, scroll exit, copy
├── slayer3d.js         # 3D stage — GLB loader, idle/greeting/attack animations, parallax, fallbacks
├── GLTFLoader.js       # three.js r149 GLTFLoader (+ BufferGeometryUtils) — classic-script build for CSP
├── three.min.js        # three.js r149 (MIT) — vendored locally to satisfy CSP
├── assets/
│   ├── slayer-knight.glb   # KayKit Adventurers character (CC0 · kaylousberg.itch.io)
│   └── cv.pdf          # Downloadable CV
├── content.json        # Every piece of site data (source of truth for edits)
├── vercel.json         # Security headers + caching for Vercel deploys
├── server.js           # Optional hardened local preview server (traversal-safe)
└── README.md
```

## Sections (mirroring the reference video's choreography)

1. **Hero** — professional split layout: copy column left (eyebrow pill, bone name with echo, wbrick role, social chips, Download CV, animated stat counters), full **3D slayer stage** right (KayKit warrior GLB with idle animation, **cursor-tracking sword aim**, cursor parallax, **click-to-attack / hover-provoked duel / periodic auto-duel**, crimson halo, floor glow, **"Hi!" greeting bubble**, placard with rotating tagline). Abyss scene with embers, kanji ghost 刃, blade sweep, monitor annotations, and a randomized welcome intro on every visit. Graceful `「刃 ⚔ 夢」` fallback badge if WebGL is unavailable. Fully responsive: split holds on tablets, stacks under 900px **with the slayer lifted into the first screen** (`display: contents` re-order), nav folds below 640px.
2. **Marquee** — dark tech ticker with ember-red diamonds.
3. **About / Experience / Stack / Projects / Reviews** — light editorial paper sections with crimson accents, char-cascade headings, transient swipe bars, ledger builds, CSS-only project shots; every non-live project card links to its public GitHub source (`view code ↗`).
4. **Get in touch** — dark blade chamber: mini contact rows with copy button, send button, keyword ticker, the big "LET'S BUILD SOMETHING [IMPACTFUL] TOGETHER." stamp statement, five channel cards (Telegram / LinkedIn / Email / GitHub / WhatsApp) with crimson hover + sparkle confetti, availability badge, reverse footer ticker.

## Motion system ("bricks" rule)

- **wbrick** — every word in hero role + contact sub drops in like masonry (staggered, blurred, rotated → settles).
- **chars** — headings draw in letter-by-letter (126 animated chars).
- **scroll exit** — the entire hero collapses upward at per-layer depths with motion blur on the name (`--sy` engine in script.js).
- `IntersectionObserver` drives every reveal; `prefers-reduced-motion` honoured everywhere.

## Tech notes

- **Performance**: no frameworks, GPU-cheap transforms only, single 3.6MB GLB loaded lazily by the same hero (`rAF` paused off-screen, `prefers-reduced-motion` renders a single static frame). Responsive tiers at 1020 / 900 / 720 / 640 / 400px.
- **Accessibility**: skip link, focus-visible, ARIA labels, semantic landmarks, Lighthouse **100**.
- **Security**: strict CSP (`script-src 'self'`; `connect-src`/`img-src` additionally allow same-page `blob:` URLs — required to load embedded GLB textures), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS on prod, `form-action 'none'`, `base-uri 'self'`; identical header set in `vercel.json` + `server.js`. Lighthouse Best-Practices **100**.
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
