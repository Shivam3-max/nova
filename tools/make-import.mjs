/**
 * Store import kit generator.
 *
 * Source of truth is `import/catalogue.json`, parsed from
 * NOVA-300-AI-Image-Prompts.docx. Products keep the document's numbering
 * (01–100) and section order, so row 01 in the doc is row 01 in the CSV and the
 * 300 generated images line up with the right products.
 *
 * Outputs:
 *   import/products.csv        Shopify product import, one row per variant
 *   import/image-manifest.csv  the 300 expected image filenames, per product
 *   import/images/*.png        placeholder plates so the store looks right now
 *   import/SETUP.md            admin steps CSV cannot express
 *
 * Run: npm run import:build
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'import');
const imgDir = path.join(outDir, 'images');
const assetDir = path.join(root, 'assets');

const REPO_RAW = 'https://raw.githubusercontent.com/Shivam3-max/nova/main/import/images';

mkdirSync(imgDir, { recursive: true });

const catalogue = JSON.parse(readFileSync(path.join(outDir, 'catalogue.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                   */
/* ------------------------------------------------------------------ */

const SWATCH = {
  Black: '#131316', Charcoal: '#2C2D32', Grey: '#8A8C92', Bone: '#E3DED4',
  'Off White': '#F0EEEA', Slate: '#464D57', Olive: '#575A44', Sand: '#C6BCAB', Ink: '#1A1D24',
};

const ART_KEY = {
  Black: 'black', Charcoal: 'charcoal', Grey: 'grey', Bone: 'bone',
  'Off White': 'offwhite', Slate: 'slate', Olive: 'olive', Sand: 'sand', Ink: 'ink',
};

const SIZES = {
  top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  bottom: ['28', '30', '32', '34', '36'],
  one: ['OS'],
};

const FABRIC = {
  hoodie: '420 GSM brushed fleece', tee: '240 GSM combed cotton',
  shirt: 'washed cotton poplin', bomber: 'matte technical shell',
  jacket: 'half-canvassed wool', activeset: 'four-way stretch knit',
  dress: 'satin-back crepe', cargo: 'cotton ripstop', trouser: 'stretch twill',
  cap: 'washed cotton twill', tote: '18oz cotton canvas', sunglasses: 'milled acetate',
};

const DETAIL = {
  hoodie: 'Dropped shoulder set four centimetres past the natural line, weighted ribbed hem and cuffs, kangaroo pocket, and a two-panel hood that holds its shape.',
  tee: 'Tubular body, ribbed collar that stays flat, cut boxy but never cropped.',
  shirt: 'Camp collar, straight hem, relaxed through the chest and meant to be worn open.',
  bomber: 'Ribbed collar, cuff and hem with a two-way centre zip and a water-repellent finish.',
  jacket: 'Soft shoulder, lengthened body, unlined through the back for movement.',
  activeset: 'Flatlock seams that sit under a pack strap. Sweat moves out; the fabric stays put.',
  dress: 'Falls straight from the shoulder with no closure, hem hand-rolled.',
  cargo: 'Bellowed thigh pockets, drawcord waist, cut to break once over the shoe.',
  trouser: 'Hidden elastic back, pressed front crease set with heat so it survives the wash.',
  cap: 'Six panels, pre-curved brim, metal slider closure and an unstructured crown.',
  tote: 'Reinforced webbing handles, internal zip pocket, holds a 16-inch laptop flat.',
  sunglasses: 'CAT-3 lenses, 24 grams, edges tumbled for eight hours to finish.',
};

const STORY = {
  hoodie: 'Milled in Tiruppur. The shoulder is drafted four centimetres past the natural line so the silhouette falls rather than clings.',
  tee: 'Combed and ring-spun, pre-shrunk twice, so the length you buy is the length you keep.',
  shirt: 'Poplin washed twice for softness. The collar is interlined lightly so it rolls instead of standing.',
  bomber: 'Shell bonded to a light mesh backer so it holds structure without bulk.',
  jacket: 'Half-canvas construction with the sleeve set by hand. The shoulder is left unpadded.',
  activeset: 'Knitted with a hollow-core yarn that wicks without feeling slick.',
  dress: 'Cut on the true bias so the fabric moves with the body rather than against it.',
  cargo: 'Bar-tacked at every stress point. Pocket bags cut deep enough to actually use.',
  trouser: 'Two per cent stretch through the warp, so it holds a crease and still sits down comfortably.',
  cap: 'Crown packs flat. Brim pre-curved on a former rather than by hand.',
  tote: 'Canvas woven heavy enough to stand on its own, handles bar-tacked through four layers.',
  sunglasses: 'Acetate block milled rather than moulded, which is slower and holds an edge better.',
};

const COLLECTIONS = [
  { title: 'Street / Drop 01',      handle: 'street',          tag: 'street',      theme: 'street' },
  { title: 'Minimal Essentials',    handle: 'minimal',         tag: 'minimal',     theme: 'minimal' },
  { title: 'Active / Train',        handle: 'active',          tag: 'active',      theme: 'active' },
  { title: 'Luxury / Tailored',     handle: 'luxury',          tag: 'luxury',      theme: 'luxury' },
  { title: "Women / Bias & Minimal", handle: 'women',          tag: 'women',       theme: 'editorial' },
  { title: 'Accessories',           handle: 'accessories',     tag: 'accessories', theme: 'minimal' },
  { title: 'The New Drop',          handle: 'the-new-drop',    tag: 'drop',        theme: 'drop' },
  { title: 'Limited Edition',       handle: 'limited-edition', tag: 'limited',     theme: 'limited' },
];

const artSlug = (garment, colour) => `nova-${garment}-${ART_KEY[colour]}`;
const imageUrl = (slug) => `${REPO_RAW}/${slug}.png`;

/* ------------------------------------------------------------------ */
/* 1. Rasterise the plates the catalogue references                    */
/* ------------------------------------------------------------------ */

async function rasterise() {
  const names = new Set();
  for (const p of catalogue) for (const c of p.colours) names.add(artSlug(p.garment, c));
  for (const t of ['street', 'minimal', 'active', 'luxury']) names.add(`nova-world-${t}`);
  for (const k of ['street', 'minimal', 'active', 'luxury', 'editorial']) names.add(`nova-campaign-${k}`);

  let written = 0;
  let reused = 0;

  for (const name of names) {
    const svg = path.join(assetDir, `${name}.svg`);
    if (!existsSync(svg)) {
      console.warn(`[import] missing source art: ${name}.svg`);
      continue;
    }
    const png = path.join(imgDir, `${name}.png`);
    if (existsSync(png)) {
      reused++;
      continue;
    }
    await sharp(svg, { density: 200 })
      .resize(1400, 1750, { fit: 'contain', background: '#f7f6f4' })
      .flatten({ background: '#f7f6f4' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(png);
    written++;
  }

  console.log(`[import] rasterised ${written} new PNG(s), reused ${reused}`);
}

/* ------------------------------------------------------------------ */
/* 2. Product CSV — doc order preserved                                */
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
  'Metafield: custom.catalogue_index [number_integer]',
];

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function buildCSV() {
  const rows = [COLUMNS.join(',')];
  let variantCount = 0;

  // catalogue.json is already in document order; keep it that way so Shopify's
  // "created" sort matches the doc, and row 01 stays row 01.
  for (const p of catalogue) {
    const sizes = SIZES[p.sizeSet];
    const gallery = p.colours.map((c) => artSlug(p.garment, c));
    const colourData = p.colours.map((name) => ({
      name,
      swatch: SWATCH[name],
      art: artSlug(p.garment, name),
    }));

    let index = 0;
    for (const colour of p.colours) {
      for (const size of sizes) {
        // One deliberate stock-out per product keeps the disabled-size UI honest.
        const soldOut = colour === p.colours[p.colours.length - 1] && size === sizes[sizes.length - 1];
        const row = { Handle: p.handle };

        if (index === 0) {
          row['Title'] = p.title;
          row['Body (HTML)'] =
            `<p>A ${FABRIC[p.garment]} ${p.type.toLowerCase()}. ${DETAIL[p.garment]}</p>` +
            `<p>Made in small batches, so no two pieces read exactly alike.</p>`;
          row['Vendor'] = 'NØVA';
          row['Type'] = p.type;
          row['Tags'] = p.tags.join(', ');
          row['Published'] = 'TRUE';
          row['Status'] = 'active';
          row['Metafield: custom.badge [single_line_text_field]'] = p.badge || '';
          row['Metafield: custom.product_story [multi_line_text_field]'] = STORY[p.garment];
          row['Metafield: custom.product_3d_model [single_line_text_field]'] = p.garment;
          row['Metafield: custom.color_data [json]'] = JSON.stringify(colourData);
          row['Metafield: custom.catalogue_index [number_integer]'] = String(p.n);
        }

        row['Option1 Name'] = 'Color';
        row['Option1 Value'] = colour;
        row['Option2 Name'] = 'Size';
        row['Option2 Value'] = size;

        row['Variant SKU'] =
          `NOVA-${String(p.n).padStart(3, '0')}-${ART_KEY[colour].slice(0, 3).toUpperCase()}-${size}`;
        row['Variant Inventory Tracker'] = 'shopify';
        row['Variant Inventory Qty'] = soldOut ? '0' : String(p.tags.includes('limited') ? 18 : 60);
        row['Variant Inventory Policy'] = 'deny';
        row['Variant Fulfillment Service'] = 'manual';
        row['Variant Price'] = p.price.toFixed(2);
        row['Variant Compare At Price'] = '';
        row['Variant Requires Shipping'] = 'TRUE';
        row['Variant Taxable'] = 'TRUE';
        row['Variant Image'] = imageUrl(artSlug(p.garment, colour));

        if (index < gallery.length) {
          row['Image Src'] = imageUrl(gallery[index]);
          row['Image Position'] = String(index + 1);
          row['Image Alt Text'] = `${p.title} — ${p.colours[index]}`;
        }

        rows.push(COLUMNS.map((c) => esc(row[c])).join(','));
        variantCount++;
        index++;
      }
    }
  }

  writeFileSync(path.join(outDir, 'products.csv'), rows.join('\n') + '\n');
  console.log(
    `[import] wrote import/products.csv — ${catalogue.length} products, ${variantCount} variants, ${rows.length - 1} rows`
  );
  return variantCount;
}

/* ------------------------------------------------------------------ */
/* 3. Image manifest — the 300 filenames the doc specifies             */
/* ------------------------------------------------------------------ */

function buildManifest() {
  const cols = ['No', 'Section', 'Handle', 'Title', 'Type', 'Colours', 'Shot', 'Filename', 'Position'];
  const rows = [cols.join(',')];

  const shots = [
    ['Studio product', 'studio', 1],
    ['On model', 'model', 2],
    ['Detail / third shot', 'detail', 3],
  ];

  for (const p of catalogue) {
    for (const [label, slug, position] of shots) {
      rows.push(
        [
          p.n,
          p.section,
          p.handle,
          p.title,
          p.type,
          p.colours.join(' / '),
          label,
          `${p.handle}-0${position}-${slug}.png`,
          position,
        ]
          .map(esc)
          .join(',')
      );
    }
  }

  writeFileSync(path.join(outDir, 'image-manifest.csv'), rows.join('\n') + '\n');
  console.log(`[import] wrote import/image-manifest.csv — ${rows.length - 1} image slots`);
}

/* ------------------------------------------------------------------ */
/* 4. Runbook                                                          */
/* ------------------------------------------------------------------ */

function buildSetup(variantCount) {
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c.tag, 0]));
  for (const p of catalogue) for (const t of p.tags) if (t in counts) counts[t]++;

  const sections = [];
  let seen = null;
  for (const p of catalogue) {
    if (p.section !== seen) {
      seen = p.section;
      sections.push({ name: p.section, from: p.n, to: p.n, count: 0 });
    }
    const s = sections[sections.length - 1];
    s.to = p.n;
    s.count++;
  }

  const md = `# NØVA store import — 100 products, document order

Generated by \`npm run import:build\` from \`import/catalogue.json\`, which was
parsed from **NOVA-300-AI-Image-Prompts.docx**. Do not hand-edit; regenerate.

**Products are in the document's order.** Row 01 in the doc is row 01 here, so
the 300 image prompts line up with the right products.

| Section | Products | Count |
| --- | --- | --- |
${sections.map((s) => `| ${s.name} | ${String(s.from).padStart(2, '0')} – ${String(s.to).padStart(2, '0')} | ${s.count} |`).join('\n')}

Totals: **${catalogue.length} products, ${variantCount} variants.**

---

## Before you import: delete the old products

You said you are re-listing from scratch. In **Products**, select all → **Delete
products**. Handles must be free or Shopify will update the old rows instead of
creating them in this order.

## 1. Metafield definitions — do this FIRST

**Settings → Custom data → Products.**

| Namespace and key | Type |
| --- | --- |
| \`custom.badge\` | Single line text |
| \`custom.product_story\` | Multi-line text |
| \`custom.product_3d_model\` | Single line text |
| \`custom.color_data\` | JSON |
| \`custom.catalogue_index\` | Integer |

\`catalogue_index\` holds the document number (1–100). Sort by it in admin and
the catalogue matches the doc exactly.

**Settings → Custom data → Collections:** \`custom.collection_theme\` and
\`custom.image_fit\`, both single line text.

## 2. Import

**Products → Import → \`import/products.csv\` → Upload and continue.**

${variantCount} variants. Images are fetched from GitHub during import, so this
repository must stay **public** until it finishes.

## 3. Collections

**Products → Collections → Create collection → Automated**, one condition each.

| Title | Handle | Condition | collection_theme | Products |
| --- | --- | --- | --- | --- |
${COLLECTIONS.map((c) => `| ${c.title} | \`${c.handle}\` | Product tag is equal to \`${c.tag}\` | \`${c.theme}\` | ${counts[c.tag]} |`).join('\n')}

## 4. Navigation

**Content → Menus.**

| Menu handle | Items |
| --- | --- |
| \`main-menu\` | Shop → /collections/all, Collections → /collections, Drops → /collections/the-new-drop, Journal → /blogs/journal |
| \`mega-categories\` | Men → /collections/street, Women → /collections/women, Unisex → /collections/all, Active → /collections/active, Accessories → /collections/accessories |

---

## The 300 images

\`import/image-manifest.csv\` lists all 300 slots — product number, section,
handle, title, colourways, shot type and the exact filename the doc specifies:

    <handle>-01-studio.png
    <handle>-02-model.png
    <handle>-03-detail.png

Use it as the generation checklist. When the images are ready, drop them into
\`import/generated/\`, push, and I will produce an image-only update CSV that
attaches them to the right products by handle.

Until then the products carry the generated placeholder plates, so the store
looks complete rather than empty.
`;

  writeFileSync(path.join(outDir, 'SETUP.md'), md);
  console.log('[import] wrote import/SETUP.md');
}

/* ------------------------------------------------------------------ */

await rasterise();
const variantCount = buildCSV();
buildManifest();
buildSetup(variantCount);

console.log(`[import] done — ${readdirSync(imgDir).length} images in import/images`);
