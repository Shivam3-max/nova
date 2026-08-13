/**
 * The 100-product NØVA catalogue used to build the Shopify import.
 *
 * This is a *demo* catalogue: names, copy and prices are invented, but the
 * shape of the data is exactly what the theme reads — Color/Size options in
 * that order, one image per colourway, tags that drive collection membership,
 * and the custom.* metafields the storefront depends on.
 *
 * The first twelve handles deliberately match the original demo set. Shopify's
 * CSV import matches on handle, so re-importing updates those twelve in place
 * rather than creating duplicates.
 */

/* ------------------------------------------------------------------ */
/* Palette + sizing                                                    */
/* ------------------------------------------------------------------ */

export const SWATCH = {
  Black: '#131316',
  Charcoal: '#2c2d32',
  Grey: '#8a8c92',
  Bone: '#e3ded4',
  'Off White': '#f0eeea',
  Slate: '#464d57',
  Olive: '#575a44',
  Sand: '#c6bcab',
  Ink: '#1a1d24',
};

/** Display name -> the art slug fragment used by tools/generate-art.mjs. */
const ART_KEY = {
  Black: 'black',
  Charcoal: 'charcoal',
  Grey: 'grey',
  Bone: 'bone',
  'Off White': 'offwhite',
  Slate: 'slate',
  Olive: 'olive',
  Sand: 'sand',
  Ink: 'ink',
};

const SIZES = {
  top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  bottom: ['28', '30', '32', '34', '36'],
  one: ['OS'],
};

/** Which size run and silhouette each garment family uses. */
const GARMENT = {
  hoodie:     { sizeSet: 'top',    type: 'Hoodie' },
  tee:        { sizeSet: 'top',    type: 'T-Shirt' },
  shirt:      { sizeSet: 'top',    type: 'Shirt' },
  bomber:     { sizeSet: 'top',    type: 'Jacket' },
  jacket:     { sizeSet: 'top',    type: 'Jacket' },
  activeset:  { sizeSet: 'top',    type: 'Activewear' },
  dress:      { sizeSet: 'top',    type: 'Dress' },
  cargo:      { sizeSet: 'bottom', type: 'Trouser' },
  trouser:    { sizeSet: 'bottom', type: 'Trouser' },
  cap:        { sizeSet: 'one',    type: 'Accessory' },
  tote:       { sizeSet: 'one',    type: 'Accessory' },
  sunglasses: { sizeSet: 'one',    type: 'Accessory' },
};

/* ------------------------------------------------------------------ */
/* Copy banks                                                          */
/* ------------------------------------------------------------------ */

const FABRIC = {
  hoodie: ['480 GSM loopback cotton', '420 GSM brushed fleece', 'garment-dyed french terry'],
  tee: ['240 GSM combed cotton', '210 GSM slub jersey', 'compact-spun supima'],
  shirt: ['washed cotton poplin', 'Japanese oxford', 'linen-cotton canvas'],
  bomber: ['matte technical shell', 'bonded ripstop', 'coated nylon twill'],
  jacket: ['half-canvassed wool', 'dry-finish gabardine', 'brushed melton'],
  activeset: ['four-way stretch knit', 'hollow-core performance yarn', 'brushed compression jersey'],
  dress: ['satin-back crepe', 'bias-cut viscose', 'heavy matte georgette'],
  cargo: ['cotton ripstop', '12oz dry denim', 'washed herringbone'],
  trouser: ['stretch twill', 'tropical wool', 'pressed cotton drill'],
  cap: ['washed cotton twill', 'brushed canvas'],
  tote: ['18oz cotton canvas', 'coated ripstop'],
  sunglasses: ['milled acetate', 'injected bio-acetate'],
};

const DETAIL = {
  hoodie: 'Dropped shoulder, weighted hem, and a hood that holds its shape after the first wash.',
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

/* Distinct, brand-plausible product names. */
const NAMES = [
  'Atlas', 'Terrain', 'Vector', 'Halo', 'Onyx', 'Drift', 'Prism', 'Nomad',
  'Vertex', 'Ridge', 'Ember', 'Slate', 'Kinetic', 'Cipher', 'Meridian', 'Aurora',
  'Solace', 'Quarry', 'Lumen', 'Pivot', 'Anchor', 'Basin', 'Cadence', 'Delta',
  'Echo', 'Forge', 'Grain', 'Harbour', 'Index', 'Junction', 'Kestrel', 'Lattice',
  'Mantle', 'Nadir', 'Orbit', 'Parallel', 'Quartz', 'Relay', 'Summit', 'Tessellate',
  'Umbra', 'Vantage', 'Warden', 'Axis', 'Beacon', 'Contour', 'Datum', 'Element',
  'Fathom', 'Gradient', 'Horizon', 'Inlet', 'Juniper', 'Keystone', 'Ledger', 'Marrow',
  'Nocturne', 'Obsidian', 'Plateau', 'Quiet', 'Rampart', 'Stratum', 'Threshold', 'Underline',
  'Vellum', 'Wick', 'Xenon', 'Yield', 'Zenith', 'Alloy', 'Bramble', 'Compass',
  'Dune', 'Etch', 'Flint', 'Girder', 'Haven', 'Ivory', 'Jetty', 'Kiln',
  'Loam', 'Mesa', 'Notch', 'Ochre', 'Pier', 'Quill', 'Rill', 'Shale',
];

const LABEL = {
  hoodie: 'Hoodie', tee: 'Tee', shirt: 'Shirt', bomber: 'Bomber', jacket: 'Jacket',
  activeset: 'Performance Set', dress: 'Dress', cargo: 'Cargo', trouser: 'Trouser',
  cap: 'Cap', tote: 'Tote', sunglasses: 'Sunglasses',
};

/* ------------------------------------------------------------------ */
/* Catalogue definition                                                */
/* ------------------------------------------------------------------ */

/**
 * Each group is [garment, count, priceRange, tags, colourways].
 * Tags drive collection membership — the collections in SETUP.md are automated
 * collections with a single "product tag equals X" condition.
 */
const GROUPS = [
  // ---- Street: heavyweight cotton, utility volume -------------------
  ['hoodie', 7,  [3199, 4599], ['street', 'unisex'],            ['Black', 'Bone', 'Grey', 'Charcoal']],
  ['tee',    7,  [1499, 2499], ['street', 'unisex'],            ['Off White', 'Black', 'Sand']],
  ['cargo',  6,  [3799, 5299], ['street', 'utility'],           ['Olive', 'Black', 'Sand', 'Charcoal']],
  ['bomber', 4,  [5999, 8999], ['street', 'outerwear'],         ['Ink', 'Charcoal', 'Olive']],

  // ---- Minimal: the pieces everything else is built around ---------
  ['tee',     6, [1799, 2699], ['minimal', 'essential'],        ['Off White', 'Bone', 'Grey']],
  ['shirt',   6, [2999, 4499], ['minimal', 'essential'],        ['Bone', 'Slate', 'Off White']],
  ['trouser', 6, [3499, 4999], ['minimal', 'essential'],        ['Charcoal', 'Sand', 'Black']],
  ['hoodie',  3, [3499, 4299], ['minimal', 'essential'],        ['Bone', 'Grey']],

  // ---- Active ------------------------------------------------------
  ['activeset', 7, [4199, 5999], ['active', 'train'],           ['Charcoal', 'Black', 'Slate']],
  ['tee',       4, [1999, 2799], ['active', 'run'],             ['Black', 'Slate', 'Grey']],
  ['trouser',   3, [3299, 4499], ['active', 'recover'],         ['Black', 'Charcoal']],

  // ---- Luxury / tailoring ------------------------------------------
  ['jacket',  6, [8499, 14999], ['luxury', 'tailored'],         ['Black', 'Slate', 'Ink']],
  ['trouser', 4, [4999, 7499],  ['luxury', 'tailored'],         ['Black', 'Charcoal', 'Slate']],
  ['shirt',   3, [4499, 6499],  ['luxury'],                     ['Bone', 'Off White']],

  // ---- Women's edit -------------------------------------------------
  ['dress',   7, [4999, 9499],  ['women', 'luxury'],            ['Black', 'Bone', 'Ink', 'Sand']],
  ['shirt',   3, [3299, 4699],  ['women', 'minimal'],           ['Bone', 'Off White', 'Slate']],
  ['trouser', 3, [3799, 5299],  ['women', 'minimal'],           ['Charcoal', 'Sand']],

  // ---- Accessories --------------------------------------------------
  ['cap',        5, [1299, 1999], ['accessories', 'street'],    ['Black', 'Bone', 'Olive', 'Charcoal']],
  ['tote',       5, [2299, 3499], ['accessories', 'minimal'],   ['Sand', 'Black', 'Bone']],
  ['sunglasses', 5, [2199, 3799], ['accessories', 'luxury'],    ['Ink', 'Black', 'Slate']],
];

/** Handles from the original demo set, reused so a re-import updates in place. */
const LEGACY = [
  ['nova-oversized-hoodie', 'NOVA Oversized Hoodie', 'hoodie'],
  ['nova-signature-tee', 'NOVA Signature Tee', 'tee'],
  ['nova-utility-cargo', 'NOVA Utility Cargo', 'cargo'],
  ['nova-tech-bomber', 'NOVA Tech Bomber', 'bomber'],
  ['nova-essential-shirt', 'NOVA Essential Shirt', 'shirt'],
  ['nova-everyday-trouser', 'NOVA Everyday Trouser', 'trouser'],
  ['nova-performance-set', 'NOVA Performance Set', 'activeset'],
  ['nova-structured-jacket', 'NOVA Structured Jacket', 'jacket'],
  ['nova-column-dress', 'NOVA Column Dress', 'dress'],
  ['nova-arc-cap', 'NOVA Arc Cap', 'cap'],
  ['nova-carry-tote', 'NOVA Carry Tote', 'tote'],
  ['nova-shield-sunglasses', 'NOVA Shield Sunglasses', 'sunglasses'],
];

/* Deterministic pseudo-random so repeated runs produce an identical CSV. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const handleize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Round to a believable retail price ending in 99. */
const retail = (n) => Math.round(n / 100) * 100 - 1;

export function buildCatalogue() {
  const random = rng(20260812);
  const products = [];
  const usedNames = new Set();
  const legacyByGarment = new Map();
  for (const [handle, title, garment] of LEGACY) {
    if (!legacyByGarment.has(garment)) legacyByGarment.set(garment, []);
    legacyByGarment.get(garment).push({ handle, title });
  }

  let nameIndex = 0;
  let id = 7001;

  for (const [garment, count, [lo, hi], tags, palette] of GROUPS) {
    for (let i = 0; i < count; i++) {
      // Spend the legacy handles first so the original twelve are updated,
      // not duplicated, when this CSV is imported over the earlier one.
      const legacy = legacyByGarment.get(garment)?.shift();

      let title;
      let handle;
      if (legacy) {
        ({ title, handle } = legacy);
      } else {
        let name;
        do {
          name = NAMES[nameIndex++ % NAMES.length];
        } while (usedNames.has(`${name}-${garment}`));
        usedNames.add(`${name}-${garment}`);
        title = `NOVA ${name} ${LABEL[garment]}`;
        handle = handleize(title);
      }

      // Two or three colourways per product, taken from the group palette.
      const colourCount = Math.min(palette.length, 2 + Math.floor(random() * 2));
      const start = Math.floor(random() * palette.length);
      const colours = [];
      for (let c = 0; c < colourCount; c++) {
        colours.push(palette[(start + c) % palette.length]);
      }

      const price = retail(lo + random() * (hi - lo));
      // Roughly one product in five carries a compare-at price.
      const onSale = random() < 0.2;

      const fabrics = FABRIC[garment];
      const fabric = fabrics[Math.floor(random() * fabrics.length)];

      const allTags = [...tags];
      // Seed the drop and limited collections across the catalogue.
      if (products.length % 9 === 0) allTags.push('drop');
      if (products.length % 13 === 0) allTags.push('limited');

      let badge = null;
      if (allTags.includes('limited')) badge = 'LIMITED';
      else if (allTags.includes('drop')) badge = 'DROP 01';
      else if (onSale) badge = null;
      else if (products.length % 7 === 0) badge = 'NEW';

      products.push({
        id: id++,
        title,
        handle,
        garment,
        type: GARMENT[garment].type,
        sizeSet: GARMENT[garment].sizeSet,
        price,
        compareAt: onSale ? retail(price * 1.25) : null,
        tags: allTags,
        badge,
        colours,
        inventory: allTags.includes('limited') ? 12 + Math.floor(random() * 30) : 30 + Math.floor(random() * 80),
        description:
          `<p>A ${fabric} ${LABEL[garment].toLowerCase()}. ${DETAIL[garment]}</p>` +
          `<p>Made in small batches, so no two pieces read exactly alike.</p>`,
        story: STORY[garment],
      });
    }
  }

  return products;
}

/** Expand a product definition into Shopify variant rows. */
export function variantsFor(product) {
  const sizes = SIZES[product.sizeSet];
  const rows = [];

  for (const colour of product.colours) {
    for (const size of sizes) {
      // A deliberate stock-out on the last size of the last colourway keeps the
      // disabled-size UI honest rather than theoretical.
      const soldOut =
        colour === product.colours[product.colours.length - 1] && size === sizes[sizes.length - 1];

      rows.push({
        colour,
        size,
        sku: `NOVA-${product.handle.replace(/[^a-z0-9]/g, '').slice(0, 10).toUpperCase()}-${ART_KEY[colour].slice(0, 3).toUpperCase()}-${size}`,
        price: product.price,
        compareAt: product.compareAt,
        available: !soldOut,
        inventory: soldOut ? 0 : product.inventory,
        art: artSlug(product.garment, colour),
      });
    }
  }

  return rows;
}

export const artSlug = (garment, colour) => `nova-${garment}-${ART_KEY[colour]}`;

export function colourData(product) {
  return product.colours.map((name) => ({
    name,
    swatch: SWATCH[name],
    art: artSlug(product.garment, name),
  }));
}

/** Collections the catalogue expects, each an automated tag rule. */
export const COLLECTIONS = [
  { title: 'The New Drop',    handle: 'the-new-drop',    tag: 'drop',        theme: 'drop' },
  { title: 'Street',          handle: 'street',          tag: 'street',      theme: 'street' },
  { title: 'Minimal',         handle: 'minimal',         tag: 'minimal',     theme: 'minimal' },
  { title: 'Active',          handle: 'active',          tag: 'active',      theme: 'active' },
  { title: 'Luxury',          handle: 'luxury',          tag: 'luxury',      theme: 'luxury' },
  { title: "Women's Edit",    handle: 'women',           tag: 'women',       theme: 'editorial' },
  { title: 'Accessories',     handle: 'accessories',     tag: 'accessories', theme: 'minimal' },
  { title: 'Limited Edition', handle: 'limited-edition', tag: 'limited',     theme: 'limited' },
];
