# NØVA — custom Shopify fashion storefront

**Wear what's next.**

A production-shaped custom Shopify theme built to demonstrate that a Shopify
store can carry an immersive, heavily animated commerce experience without
giving up real Shopify commerce.

Everything in `theme/` is a real Shopify theme. `dev/` is a local harness that
renders the same Liquid without a store attached, so the theme can be built and
reviewed before anyone connects a Shopify account.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:3610**.

`npm run dev` builds `src/` into `theme/assets/` and starts the local Liquid
harness with a mock catalogue of 12 products across 9 collections.

| Command | What it does |
| --- | --- |
| `npm run dev` | Build assets, then serve the theme at :3610 |
| `npm run dev:watch` | Same, with esbuild watching `src/` |
| `npm run build` | Regenerate placeholder art + build assets |
| `npm run art` | Regenerate the SVG placeholder art only |
| `npm run shopify:dev` | `shopify theme dev` against a real store |
| `npm run shopify:push` | Push `theme/` to a store |

### Debug flags

Append to any URL:

- `?motion=off` — disables all cinematic motion. Identical to what a customer
  with "reduce motion" enabled sees. Useful for screenshots and layout review.
- `?webgl=off` — forces the static hero plate instead of the WebGL scene.
- `?only=<section>` — renders one homepage section with full page chrome
  (local harness only).

---

## Architecture

```
theme/                    ← the actual Shopify theme (this is what ships)
  assets/                 built CSS/JS + generated SVG art (flat, as Shopify requires)
  config/                 settings_schema.json, settings_data.json
  layout/theme.liquid
  locales/en.default.json
  sections/               17 sections, each with a {% schema %}
  snippets/               product-card, overlays, icons, accordion-item
  templates/              JSON templates + customer templates

src/                      ← compiled into theme/assets
  styles/                 8 CSS modules -> nova.css
  scripts/
    core/                 env detection, DOM helpers, smooth scroll, registry
    animation/            GSAP setup, reveals, line splitting, magnetic, cursor
    webgl/                renderer lifecycle, garment shader, hero, 3D viewer
    components/           18 UI components
    shopify/              cart AJAX client

dev/                      ← local only, never deployed
  server.mjs              Liquid runtime emulation + cart API
  data/catalog.mjs        mock catalogue shaped like real Shopify objects

tools/
  build.mjs               esbuild pipeline
  generate-art.mjs        SVG placeholder generator
```

### What Shopify owns vs what the frontend owns

Shopify remains the source of truth for products, variants, prices, inventory,
images, collections, discounts, cart, checkout, customers and orders. Nothing
commercial is hardcoded — the demo catalogue lives only in the dev harness and
is replaced by real Shopify objects the moment the theme is pushed.

The custom frontend owns the WebGL scene, GSAP choreography, cursor, transitions,
the 3D viewer, product discovery, and the cart drawer UI. The cart drawer talks
to Shopify's real `/cart/*.js` endpoints; checkout is Shopify's hosted checkout.

### JavaScript

`src/scripts/entry.js` registers components and mounts anything the current
template rendered with `data-component="…"`. Each component returns a teardown
function, and the registry calls it on `shopify:section:unload` — which is what
keeps the theme editor from stacking duplicate ScrollTriggers and orphaned
WebGL contexts.

**Bundle split:**

| Chunk | Size | When it loads |
| --- | --- | --- |
| `nova.js` + shared chunk | ~154 kB | Always |
| Three.js chunk | ~511 kB | Only when a WebGL scene actually starts |
| `nova.css` | ~58 kB | Always |

Three.js is behind a dynamic `import()` in `components/hero.js` and
`components/product-viewer.js`. A customer on a phone, on a data-saver
connection, or with reduce-motion enabled never downloads it.

### Motion and WebGL policy

One place decides: `src/scripts/core/env.js`.

`allowWebGL()` returns false — and the static plate is used instead — for any of:
reduce-motion, `?webgl=off`, coarse pointer (phones/tablets), `saveData` or a 2G
effective connection, ≤4 CPU cores or ≤4 GB device memory, or no WebGL context.

The hero scene is also deferred to `requestIdleCallback`, pauses when scrolled
out of view via IntersectionObserver, pauses on tab blur, and disposes every
geometry, material, texture and the GL context on teardown. Opening the 3D
viewer marks itself `exclusive`, which pauses the hero — only one GPU surface
renders at a time. A lost context reverts to the static plate rather than
leaving a blank canvas.

The closing section's particle field is deliberately a 2D canvas at a capped
30fps, not a second WebGL context.

### Smooth scrolling

`core/scroll.js` damps the *real* scroll position rather than transforming a
wrapper element. The theme leans on `position: sticky` for the product page, the
story section and the collection toolbar, and a transformed ancestor breaks
sticky. Touch devices keep native momentum scrolling.

### Accessibility

- Semantic landmarks, one `<h1>` per page, skip link
- Keyboard-operable variant pickers, accordions, rail (arrow keys), overlays
- Focus trap + focus restore on every overlay, Escape to close
- Visible focus rings (`:focus-visible` only)
- Split headlines keep the full sentence as `aria-label`; fragments are
  `aria-hidden`, so a screen reader reads one clean sentence
- Sold-out sizes are marked with a strike *and* `disabled` — not colour alone
- `prefers-reduced-motion` replaces all cinematic motion with plain state changes

---

## Placeholder art

There is no stock photography. `tools/generate-art.mjs` produces 66 SVGs:

- **Garment plates** — technical flat-lay illustrations per colourway, drawn on
  a transparent ground so the same file reads on white sections and inverted
  campaign blocks. Light colourways get a dark edge, dark ones a light rim.
- **Campaign plates** — abstract editorial compositions, each stamped
  `[ STREET — PLACEHOLDER ]` so nobody mistakes one for a final asset.

Replacing them means uploading real images to the Shopify product — no code
change. See `SHOPIFY-SETUP.md`.

---

## Known limitations

- **Checkout is not themeable** outside Shopify Plus checkout extensibility. The
  cart is fully custom; `/checkout` hands off to Shopify.
- **The 3D viewer's default path is a cloth-shell presentation**, not a true
  garment mesh. If a real GLB is attached to the product in Shopify, the viewer
  loads that instead via GLTFLoader. See `SHOPIFY-SETUP.md`.
- **The wishlist is a `localStorage` stub.** It is a single storage key and is
  meant to be swapped for a customer metafield or an app.
- **`dev/` is not a Shopify emulator.** It implements the Liquid objects, filters
  and tags this theme uses, and nothing more. Always smoke-test on a real store
  with `npm run shopify:dev` before launch.
