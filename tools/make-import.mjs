/**
 * Store import kit generator.
 *
 * Produces everything needed to populate a fresh Shopify store so the theme has
 * a catalogue to render:
 *
 *   import/images/*.png   rasterised product art — Shopify rejects SVG for
 *                         product and collection images, so the generated
 *                         plates are converted to PNG here
 *   import/products.csv   Shopify's product import format, one row per variant,
 *                         with image rows and metafield columns
 *   import/SETUP.md       the admin steps CSV cannot cover (collections, menus)
 *
 * Image URLs point at raw.githubusercontent.com. Shopify fetches them during
 * import, which is why the repository has to stay public until the import has
 * run — after that the images live on Shopify's CDN and the repo can be made
 * private again.
 *
 * Run: npm run import:build
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

import { products, collections, SWATCH } from '../dev/data/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'import');
const imgDir = path.join(outDir, 'images');
const assetDir = path.join(root, 'assets');

const REPO_RAW = 'https://raw.githubusercontent.com/Shivam3-max/nova/main/import/images';

mkdirSync(imgDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* 1. Rasterise                                                        */
/* ------------------------------------------------------------------ */

/** Only the art the catalogue actually references, not all 66 plates. */
function referencedArt() {
  const names = new Set();
  for (const product of products) {
    for (const image of product.images) names.add(image.src.replace(/\.svg$/, ''));
  }
  for (const collection of collections) {
    const src = collection.image?.src;
    if (src) names.add(src.replace(/\.svg$/, ''));
  }
  // World plates back the CHOOSE YOUR WORLD cards via collection images.
  for (const theme of ['street', 'minimal', 'active', 'luxury']) names.add(`nova-world-${theme}`);
  return [...names];
}

async function rasterise() {
  const names = referencedArt();
  let written = 0;

  for (const name of names) {
    const svg = path.join(assetDir, `${name}.svg`);
    if (!existsSync(svg)) {
      console.warn(`[import] missing source art: ${name}.svg`);
      continue;
    }

    const png = path.join(imgDir, `${name}.png`);

    // Flatten onto the theme's plate colour. Product images cannot be
    // transparent on Shopify's CDN without looking wrong in the admin grid,
    // and the storefront draws them on this exact surface anyway.
    await sharp(svg, { density: 200 })
      .resize(1400, 1750, { fit: 'contain', background: '#f7f6f4' })
      .flatten({ background: '#f7f6f4' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(png);

    written++;
  }

  console.log(`[import] rasterised ${written} PNG(s) into import/images`);
}

/* ------------------------------------------------------------------ */
/* 2. Product CSV                                                      */
/* ------------------------------------------------------------------ */

const COLUMNS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty',
  'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
  'Variant Taxable', 'Variant Image',
  'Image Src', 'Image Position', 'Image Alt Text',
  'Status',
  'Metafield: custom.badge [single_line_text_field]',
  'Metafield: custom.product_story [multi_line_text_field]',
  'Metafield: custom.product_3d_model [single_line_text_field]',
  'Metafield: custom.color_data [json]',
];

const esc = (value) => {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rupees = (paise) => (paise / 100).toFixed(2);
const imageUrl = (src) => `${REPO_RAW}/${src.replace(/\.svg$/, '.png')}`;

function buildCSV() {
  const rows = [COLUMNS.join(',')];

  for (const product of products) {
    const colours = product.metafields.custom.color_data.value;

    product.variants.forEach((variant, index) => {
      const first = index === 0;
      const row = {};

      row['Handle'] = product.handle;

      if (first) {
        row['Title'] = product.title;
        row['Body (HTML)'] = product.description;
        row['Vendor'] = product.vendor;
        row['Type'] = product.type;
        row['Tags'] = product.tags.join(', ');
        row['Published'] = 'TRUE';
        row['Status'] = 'active';
        row['Metafield: custom.badge [single_line_text_field]'] =
          product.metafields.custom.badge.value || '';
        row['Metafield: custom.product_story [multi_line_text_field]'] =
          product.metafields.custom.product_story.value || '';
        row['Metafield: custom.product_3d_model [single_line_text_field]'] =
          product.metafields.custom.product_3d_model.value || '';
        // `art` stays the plate basename: the 3D viewer resolves it through
        // asset_url against the theme's own SVGs, not through product images.
        row['Metafield: custom.color_data [json]'] = JSON.stringify(
          colours.map((c) => ({ name: c.name, swatch: c.swatch, art: c.art }))
        );
      }

      row['Option1 Name'] = 'Color';
      row['Option1 Value'] = variant.option1;
      row['Option2 Name'] = 'Size';
      row['Option2 Value'] = variant.option2;

      row['Variant SKU'] = variant.sku;
      row['Variant Inventory Tracker'] = 'shopify';
      row['Variant Inventory Qty'] = String(variant.inventory_quantity);
      row['Variant Inventory Policy'] = 'deny';
      row['Variant Fulfillment Service'] = 'manual';
      row['Variant Price'] = rupees(variant.price);
      row['Variant Compare At Price'] = variant.compare_at_price ? rupees(variant.compare_at_price) : '';
      row['Variant Requires Shipping'] = 'TRUE';
      row['Variant Taxable'] = 'TRUE';
      row['Variant Image'] = imageUrl(variant.featured_image.src);

      // Attach the gallery across the first rows, one image per row.
      const image = product.images[index];
      if (image) {
        row['Image Src'] = imageUrl(image.src);
        row['Image Position'] = String(index + 1);
        row['Image Alt Text'] = `${product.title} — ${image.alt || ''}`.trim();
      }

      rows.push(COLUMNS.map((c) => esc(row[c])).join(','));
    });

    // Any gallery images beyond the variant count get their own handle-only rows.
    for (let i = product.variants.length; i < product.images.length; i++) {
      const row = { Handle: product.handle };
      row['Image Src'] = imageUrl(product.images[i].src);
      row['Image Position'] = String(i + 1);
      row['Image Alt Text'] = product.title;
      rows.push(COLUMNS.map((c) => esc(row[c])).join(','));
    }
  }

  writeFileSync(path.join(outDir, 'products.csv'), rows.join('\n') + '\n');
  console.log(`[import] wrote import/products.csv — ${products.length} products, ${rows.length - 1} rows`);
}

/* ------------------------------------------------------------------ */
/* 3. Admin steps CSV cannot express                                   */
/* ------------------------------------------------------------------ */

function buildSetup() {
  const cols = collections.filter((c) => c.handle !== 'all');

  const collectionRows = cols
    .map((c) => {
      const tag = [...new Set(c.products.flatMap((p) => p.tags))].find((t) =>
        c.products.every((p) => p.tags.includes(t))
      );
      return `| ${c.title} | \`${c.handle}\` | Product tag is equal to \`${tag || c.handle}\` | \`${c.metafields.custom.collection_theme.value}\` | \`nova-world-*.png\` / campaign plate |`;
    })
    .join('\n');

  const md = `# NØVA store import

Generated by \`npm run import:build\`. Everything here populates a fresh store so
the theme has a catalogue to render.

> The image URLs in \`products.csv\` point at this GitHub repository, so it must
> stay **public** until the import finishes. Shopify copies the images onto its
> own CDN during import — after that you can make the repo private again.

---

## 1. Metafield definitions (do this first)

**Settings → Custom data → Products.** The CSV carries the values, but without
definitions they will not show in admin and \`color_data\` will not be typed.

| Namespace and key | Type |
| --- | --- |
| \`custom.badge\` | Single line text |
| \`custom.product_story\` | Multi-line text |
| \`custom.product_3d_model\` | Single line text |
| \`custom.color_data\` | JSON |

**Settings → Custom data → Collections:**

| Namespace and key | Type |
| --- | --- |
| \`custom.collection_theme\` | Single line text |
| \`custom.image_fit\` | Single line text |

## 2. Products

**Products → Import → Add file → \`import/products.csv\` → Upload and continue.**

${products.length} products, ${products.reduce((n, p) => n + p.variants.length, 0)} variants. Images are fetched from GitHub during
import — allow a couple of minutes.

## 3. Collections

**Products → Collections → Create collection → Automated.** Each one needs a
single condition. Set the handle by editing the URL handle field, and set
\`custom.collection_theme\` at the bottom of the collection page.

| Title | Handle | Condition | collection_theme | Image to upload |
| --- | --- | --- | --- | --- |
${collectionRows}

Collection images are in \`import/images/\` — upload the matching
\`nova-campaign-*.png\` or \`nova-world-*.png\` plate to each.

## 4. Navigation

**Content → Menus.**

| Menu handle | Items |
| --- | --- |
| \`main-menu\` | Shop → /collections/all, Collections → /collections, Drops → /collections/the-new-drop, Journal → /blogs/journal |
| \`mega-categories\` | Men → /collections/street, Women → /collections/women, Unisex → /collections/all, Active → /collections/active, Accessories → /collections/accessories |
| \`footer-shop\` | Shop, Collections, Drops, Journal, About, Contact |
| \`footer-customer\` | Account, Orders, Shipping, Returns, FAQ |
| \`footer-legal\` | Privacy, Terms, Refund Policy |

Then open the theme editor and point each footer column block at its menu.

## 5. Blog

**Content → Blogs → Create blog**, handle \`journal\`, title "NØVA Journal".
Add three posts with a featured image each — copy is in \`dev/data/catalog.mjs\`.

## 6. Theme settings

**Online Store → Themes → Customize → Theme settings → Commerce:** confirm the
free-shipping threshold and set *Product photography style* to match the real
photography once it replaces these placeholders.

---

## What is still a placeholder

Every image here is generated art, clearly labelled where it stands in for
photography. Replacing it is an admin task, not a code change: upload real
product images in Shopify and the plates disappear.
`;

  writeFileSync(path.join(outDir, 'SETUP.md'), md);
  console.log('[import] wrote import/SETUP.md');
}

/* ------------------------------------------------------------------ */

await rasterise();
buildCSV();
buildSetup();

const total = readdirSync(imgDir).length;
console.log(`[import] done — ${total} images, products.csv, SETUP.md in import/`);
