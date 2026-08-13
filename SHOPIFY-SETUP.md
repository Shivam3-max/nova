# Connecting NØVA to a real Shopify store

Everything below is done once, in Shopify admin, before or just after the first
theme push. The theme code does not change.

---

## 1. Push the theme

```bash
npm install -g @shopify/cli@latest
```

```bash
npm run build
```

In this repository the Shopify theme lives at the project root, so use:

```bash
shopify theme push --path . --unpublished
```

Preview it from **Online Store → Themes**, and publish when the client signs off.

If this is your first Shopify deployment, the full flow is:

1. Create or access a Shopify store.
2. Make sure you can log into that store in the browser.
3. Run `shopify login` and complete the browser sign-in.
4. Run `shopify theme push --path . --unpublished`.
5. In Shopify admin, open **Online Store → Themes** and preview the uploaded theme.
6. Use the theme editor to connect menus, homepage collections, and branding.
7. Publish only after reviewing products, cart, and mobile layouts.

That uploads it as an unpublished theme so the live store is untouched. Preview
it from **Online Store → Themes**, and publish when the client signs off.

For day-to-day work against the real store:

```bash
shopify theme dev --path . --store your-store.myshopify.com
```

> Run `npm run dev:watch` alongside it so `src/` changes recompile into
> `assets/` and the CLI syncs them.

---

## 2. Navigation

**Online Store → Navigation.** Create two menus:

| Handle | Purpose | Items |
| --- | --- | --- |
| `main-menu` | Header | Shop, Collections, Drops, Journal |
| `mega-categories` | Mega menu | Men, Women, Unisex, Active, Accessories |

Footer columns use `footer-shop`, `footer-customer`, `footer-legal` — or point
the footer blocks at whatever menus already exist, in the theme editor.

Each `mega-categories` item should link to a collection. The mega menu derives
its preview image from that collection's image.

---

## 3. Collections

Create these handles so the homepage sections resolve without editing anything:

`the-new-drop`, `street`, `minimal`, `active`, `luxury`, `accessories`,
`limited-edition`, `women`

Give each one a collection image — it becomes the campaign plate on the
collection page and in the mega menu.

Every section that references a collection is also a theme-editor setting, so
these are defaults, not requirements.

---

## 4. Metafield definitions

**Settings → Custom data → Products.** Create these definitions. The theme reads
them; none are mandatory, and each one degrades gracefully when absent.

| Namespace + key | Type | Used for |
| --- | --- | --- |
| `custom.badge` | Single line text | Card/PDP badge (`NEW`, `DROP 01`, `LIMITED`) |
| `custom.product_story` | Multi-line text | The FABRIC accordion on the PDP |
| `custom.editorial_image` | File reference | Campaign image for the product |
| `custom.product_3d_model` | Single line text | GLB URL override for the 3D viewer |
| `custom.featured_product` | Boolean | Merchandising flag |
| `custom.color_data` | JSON | Swatch hexes + colourway art (see below) |

**Settings → Custom data → Collections:**

| Namespace + key | Type | Used for |
| --- | --- | --- |
| `custom.collection_theme` | Single line text | `street` / `minimal` / `active` / `luxury` / `limited` / `editorial` — drives whether the collection header inverts |
| `custom.campaign_image` | File reference | Optional campaign override |

### `custom.color_data`

Drives the PDP swatches, the product-card colour dots and the 3D viewer's
colourway switching. One entry per colour option value, and `name` **must** match
the product's Color option value exactly:

```json
[
  { "name": "Black", "swatch": "#131316", "art": "nova-hoodie-black" },
  { "name": "Bone",  "swatch": "#e3ded4", "art": "nova-hoodie-bone" },
  { "name": "Grey",  "swatch": "#8a8c92", "art": "nova-hoodie-grey" }
]
```

`art` is the asset basename (without `.svg`) used by the 3D viewer. Once real
product photography is in place, point `art` at the uploaded file instead, or
drop the field and let the viewer fall back to the variant's featured image.

If `color_data` is absent, swatches render in a neutral grey and the VIEW IN 3D
button is hidden — nothing breaks.

---

## 5. Products

Each product needs:

- **Options** named exactly `Color` and `Size`, in that order. The variant picker
  resolves option position 1 to colour and 2 to size.
- **One image per colourway**, in the same order as the colour option values.
  The card's hover image is the second image.
- Product type set (shown on cards and in breadcrumbs).
- Tags matching the collection handles you want it to appear in.

Inventory tracking should be on — the size buttons are disabled from real
availability, and the LIMITED section's scarcity counter reads
`variant.inventory_quantity`.

### Photography style (cut-out vs model shots)

**Theme settings → Commerce → Product photography style.** Three options:

| Option | Image 1 | Image 2 (hover) |
| --- | --- | --- |
| Cut-outs only | contained on the plate | contained |
| **Mixed** (default) | contained cut-out | **cropped model shot** |
| Model shots only | cropped | cropped |

The default is **Mixed**: upload the cut-out as the product's first image and the
model shot as the second. The card shows the cut-out, and the model shot fills
the frame on hover. The product page follows the same rule — first shot
contained, the rest cropped.

**Per-collection override:** create a Collection metafield
`custom.image_fit` (single line text) with the value `cutout`, `mixed` or
`model`. Useful when, say, Accessories are all cut-outs but Street is all
lifestyle.

> The WebGL hero maps the hero product's **first** image onto a cloth surface.
> That only reads correctly with a cut-out on a transparent background. If the
> hero product has a rectangular photo as image 1, turn off the WebGL hero in
> Theme settings → Motion, and the static plate is used instead.

### Reviews

The PDP star rating reads `product.metafields.reviews.rating` and
`reviews.rating_count` — the standard namespace used by Shopify Product Reviews
and most review apps. Install a review app and it populates automatically; with
no app, the rating block is skipped.

---

## 6. 3D models (optional, recommended)

Shopify supports GLB files as native product media.

**Products → [product] → Media → Add media → 3D model.**

The viewer prefers, in order:

1. A `model` entry in `product.media` (Shopify-hosted GLB) — loaded with
   GLTFLoader, normalised to a consistent height, three-point studio lighting.
2. `custom.product_3d_model` if it contains a `.glb` URL.
3. The procedural cloth-shell presentation of the product plate.

Path 3 always works and needs no assets, which is why the demo ships on it.

---

## 7. Theme settings

**Online Store → Themes → Customize → Theme settings:**

- **Brand** — wordmark, tagline, logo, favicon
- **Commerce** — free-shipping threshold (in rupees), quick add, one-tap sizes,
  wishlist, grid density
- **Motion** — WebGL hero, damped scrolling, custom cursor. All three are
  automatically overridden for reduce-motion, phones and data-saver.
- **Social** — Instagram / TikTok / YouTube URLs

Every homepage section is reorderable and removable in the editor, and the five
cinematic acts each expose their own heading, body, collection and CTA.

---

## 8. Before launch

- [ ] Set a real ISO deadline on the **Act 05 — Limited** section
      (e.g. `2026-09-01T23:59:00+05:30`). It falls back to a rolling demo
      countdown, which must not ship.
- [ ] Replace every `[ … PLACEHOLDER ]` plate with real photography.
- [ ] Set policies under **Settings → Policies** (footer links to them).
- [ ] Confirm the free-shipping threshold matches the real shipping profile.
- [ ] Run Lighthouse on the PDP and homepage on a throttled connection.
- [ ] Test with a screen reader and with reduce-motion enabled.
- [ ] Check any installed apps that inject scripts — they are the most common
      cause of a custom theme breaking after handoff.

---

## Notes for the mobile app build

The point of this demo is that the same commerce spine drives a native app.

- The catalogue, variants, pricing, inventory and cart all come from Shopify, so
  an app consumes the **Storefront API** (GraphQL) against the same data. Nothing
  in this theme is a private data source.
- `src/scripts/shopify/cart.js` is the only module that touches commerce. Its
  surface — `addItem`, `changeItem`, `removeItem`, `fetchCart`,
  `shippingProgress` — maps one-to-one onto Storefront API cart mutations
  (`cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cart`).
- `custom.color_data` and `custom.product_3d_model` are already the app's
  colourway and 3D-asset contract: the same GLB Shopify serves to the viewer here
  can be loaded by SceneKit / Filament / `react-three-fiber`.
- Checkout in the app is Shopify's checkout sheet, exactly as it is here.
