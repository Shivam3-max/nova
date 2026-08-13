/**
 * Store import kit generator.
 *
 * Produces everything needed to populate a Shopify store with the 100-product
 * NØVA catalogue:
 *
 *   import/images/*.png   rasterised garment plates — Shopify rejects SVG for
 *                         product and collection images
 *   import/products.csv   Shopify product import format, one row per variant,
 *                         with image rows and metafield columns
 *   import/SETUP.md       the admin steps CSV cannot cover (collections, menus)
 *
 * Image URLs point at raw.githubusercontent.com. Shopify fetches them during
 * import, so the repository must stay public until the import has run — after
 * that the images live on Shopify's CDN and the repo can go private.
 *
 * Run: npm run import:build
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

import { buildCatalogue, variantsFor, colourData, artSlug, COLLECTIONS } from './catalog-100.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'import');
const imgDir = path.join(outDir, 'images');
const assetDir = path.join(root, 'assets');

const REPO_RAW = 'https://raw.githubusercontent.com/Shivam3-max/nova/main/import/images';

mkdirSync(imgDir, { recursive: true });

const products = buildCatalogue();

/* ------------------------------------------------------------------ */
/* 1. Rasterise only the plates the catalogue references               */
/* ------------------------------------------------------------------ */

async function rasterise() {
  const names = new Set();
  for (const product of products) {
    for (const colour of product.colours) names.add(artSlug(product.garment, colour));
  }
  for (const theme of ['street', 'minimal', 'active', 'luxury']) names.add(`nova-world-${theme}`);
  for (const kind of ['street', 'minimal', 'active', 'luxury', 'editorial']) {
    names.add(`nova-campaign-${kind}`);
  }

  let written = 0;
  let skipped = 0;

  for (const name of names) {
    const svg = path.join(assetDir, `${name}.svg`);
    if (!existsSync(svg)) {
      console.warn(`[import] missing source art: ${name}.svg`);
      continue;
    }

    const png = path.join(imgDir, `${name}.png`);
    if (existsSync(png)) {
      skipped++;
      continue;
    }

    // Flatten onto the theme's plate colour: a transparent product image looks
    // wrong in Shopify's admin grid, and the storefront draws them on exactly
    // this surface anyway.
    await sharp(svg, { density: 200 })
      .resize(1400, 1750, { fit: 'contain', background: '#f7f6f4' })
      .flatten({ background: '#f7f6f4' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(png);

    written++;
  }

  console.log(`[import] rasterised ${written} new PNG(s), reused ${skipped}`);
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

const imageUrl = (slug) => `${REPO_RAW}/${slug}.png`;

function buildCSV() {
  const rows = [COLUMNS.join(',')];
  let variantCount = 0;

  for (const product of products) {
    const variants = variantsFor(product);
    variantCount += variants.length;

    // One gallery image per colourway, in colour-option order.
    const gallery = product.colours.map((c) => artSlug(product.garment, c));

    variants.forEach((variant, index) => {
      const row = { Handle: product.handle };

      if (index === 0) {
        row['Title'] = product.title;
        row['Body (HTML)'] = product.description;
        row['Vendor'] = 'NØVA';
        row['Type'] = product.type;
        row['Tags'] = product.tags.join(', ');
        row['Published'] = 'TRUE';
        row['Status'] = 'active';
        row['Metafield: custom.badge [single_line_text_field]'] = product.badge || '';
        row['Metafield: custom.product_story [multi_line_text_field]'] = product.story;
        row['Metafield: custom.product_3d_model [single_line_text_field]'] = product.garment;
        row['Metafield: custom.color_data [json]'] = JSON.stringify(colourData(product));
      }

      row['Option1 Name'] = 'Color';
      row['Option1 Value'] = variant.colour;
      row['Option2 Name'] = 'Size';
      row['Option2 Value'] = variant.size;

      row['Variant SKU'] = variant.sku;
      row['Variant Inventory Tracker'] = 'shopify';
      row['Variant Inventory Qty'] = String(variant.inventory);
      row['Variant Inventory Policy'] = 'deny';
      row['Variant Fulfillment Service'] = 'manual';
      row['Variant Price'] = variant.price.toFixed(2);
      row['Variant Compare At Price'] = variant.compareAt ? variant.compareAt.toFixed(2) : '';
      row['Variant Requires Shipping'] = 'TRUE';
      row['Variant Taxable'] = 'TRUE';
      row['Variant Image'] = imageUrl(variant.art);

      // Attach the gallery across the first rows, one image per row.
      if (index < gallery.length) {
        row['Image Src'] = imageUrl(gallery[index]);
        row['Image Position'] = String(index + 1);
        row['Image Alt Text'] = `${product.title} — ${product.colours[index]}`;
      }

      rows.push(COLUMNS.map((c) => esc(row[c])).join(','));
    });
  }

  writeFileSync(path.join(outDir, 'products.csv'), rows.join('\n') + '\n');
  console.log(
    `[import] wrote import/products.csv — ${products.length} products, ${variantCount} variants, ${rows.length - 1} rows`
  );
  return variantCount;
}

/* ------------------------------------------------------------------ */
/* 3. Admin runbook                                                    */
/* ------------------------------------------------------------------ */

function buildSetup(variantCount) {
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c.tag, 0]));
  for (const p of products) for (const t of p.tags) if (t in counts) counts[t]++;

  const collectionRows = COLLECTIONS.map(
    (c) =>
      `| ${c.title} | \`${c.handle}\` | Product tag is equal to \`${c.tag}\` | \`${c.theme}\` | ${counts[c.tag]} |`
  ).join('\n');

  const byType = {};
  for (const p of products) byType[p.type] = (byType[p.type] || 0) + 1;
  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `| ${t} | ${n} |`)
    .join('\n');

  const md = `# NØVA store import — 100 products

Generated by \`npm run import:build\`. Do not hand-edit; regenerate instead.

> The image URLs in \`products.csv\` point at this GitHub repository, so it must
> stay **public** until the import finishes. Shopify copies the images onto its
> own CDN during import — after that you can make the repo private again.

---

## What is in the file

- **${products.length} products**, **${variantCount} variants** (Color x Size)
- One image per colourway, 2–3 colourways per product
- Inventory, compare-at pricing on roughly one product in five
- Metafields: \`badge\`, \`product_story\`, \`product_3d_model\`, \`color_data\`

The first twelve handles match the original demo products, so importing this
**updates** them rather than creating duplicates.

### Product mix

| Type | Products |
| --- | --- |
${typeRows}

---

## 1. Metafield definitions — do this FIRST

**Settings → Custom data → Products.** The CSV carries the values, but without
definitions they are untyped and \`color_data\` will not drive the swatches.

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

## 2. Import the products

**Products → Import → Add file → \`import/products.csv\` → Upload and continue.**

${variantCount} variants with images fetched from GitHub. Expect this to take
several minutes; Shopify emails you when it finishes.

## 3. Collections

**Products → Collections → Create collection → Automated**, one condition each.
Set the handle in the URL field and \`custom.collection_theme\` at the bottom.

| Title | Handle | Condition | collection_theme | Products |
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
Until a blog exists the Journal section hides itself rather than rendering an
empty grid.

---

## Still placeholders

Every image is generated art. Replacing it is an admin task, not a code change:
upload real product photography in Shopify and the plates disappear.
`;

  writeFileSync(path.join(outDir, 'SETUP.md'), md);
  console.log('[import] wrote import/SETUP.md');
}

/* ------------------------------------------------------------------ */

await rasterise();
const variantCount = buildCSV();
buildSetup(variantCount);

console.log(`[import] done — ${readdirSync(imgDir).length} images in import/images`);
