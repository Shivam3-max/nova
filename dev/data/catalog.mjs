/**
 * Mock catalogue for the local dev harness.
 *
 * IMPORTANT: this file exists only so `npm run dev` can render the theme
 * without a Shopify store attached. Every object here mirrors the shape of the
 * real Liquid object it stands in for (`product`, `variant`, `collection`,
 * `article`, `linklist`), so the Liquid in theme/ is production Liquid — not a
 * local dialect. When the theme is pushed to a real store, Shopify supplies
 * these objects and this file is never loaded or deployed.
 *
 * Money is stored in the currency's minor unit, exactly like Shopify:
 * ₹3,499.00 -> 349900.
 */

const RUPEE = (n) => Math.round(n * 100);

let variantSeq = 40000000000;
const nextVariantId = () => ++variantSeq;

/** Sizes per garment family. */
const SIZES = {
  top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  bottom: ['28', '30', '32', '34', '36'],
  one: ['OS'],
};

/**
 * Build a full product. `colors` maps a display colour name to the art slug
 * used for its imagery, which is also what the 3D viewer keys its material off.
 */
function makeProduct({
  id,
  title,
  handle,
  garment,
  price,
  compareAt = null,
  colors,
  sizeSet = 'top',
  type,
  tags = [],
  description,
  story,
  badge = null,
  featured = false,
  rating = { value: 4.8, count: 128 },
  editorial = 'nova-campaign-editorial.svg',
  inventory = 42,
}) {
  const sizes = SIZES[sizeSet];
  const colorNames = Object.keys(colors);

  const variants = [];
  for (const color of colorNames) {
    for (const size of sizes) {
      // A couple of deliberate stock-outs so the disabled-variant UI is real.
      const soldOut = color === colorNames[colorNames.length - 1] && size === sizes[sizes.length - 1];
      variants.push({
        id: nextVariantId(),
        product_id: id,
        title: `${color} / ${size}`,
        option1: color,
        option2: size,
        option3: null,
        options: [color, size],
        sku: `NOVA-${handle.toUpperCase().replace(/-/g, '').slice(0, 8)}-${color.slice(0, 3).toUpperCase()}-${size}`,
        price: RUPEE(price),
        compare_at_price: compareAt ? RUPEE(compareAt) : null,
        available: !soldOut,
        inventory_quantity: soldOut ? 0 : inventory,
        inventory_management: 'shopify',
        requires_shipping: true,
        featured_image: { src: `${colors[color]}.svg`, alt: `${title} — ${color}` },
        url: `/products/${handle}?variant=`,
      });
    }
  }

  // Gallery: hero shot for every colourway, then the cropped detail plates.
  const images = [
    ...colorNames.map((c) => `${colors[c]}.svg`),
    ...colorNames.map((c) => `${colors[c]}-alt.svg`),
  ];

  const firstAvailable = variants.find((v) => v.available) || variants[0];

  return {
    id,
    title,
    handle,
    vendor: 'NØVA',
    type,
    tags,
    url: `/products/${handle}`,
    description,
    content: description,
    available: variants.some((v) => v.available),
    price: RUPEE(price),
    price_min: RUPEE(price),
    price_max: RUPEE(price),
    compare_at_price: compareAt ? RUPEE(compareAt) : null,
    compare_at_price_max: compareAt ? RUPEE(compareAt) : null,
    featured_image: { src: images[0], alt: title, width: 1000, height: 1250 },
    images: images.map((src) => ({ src, alt: title, width: 1000, height: 1250 })),
    media: images.map((src, i) => ({
      id: id * 100 + i,
      media_type: 'image',
      alt: title,
      preview_image: { src, width: 1000, height: 1250 },
    })),
    options: [
      { name: 'Color', position: 1, values: colorNames },
      { name: 'Size', position: 2, values: sizes },
    ],
    options_with_values: [
      { name: 'Color', position: 1, values: colorNames.map((v) => ({ name: v })) },
      { name: 'Size', position: 2, values: sizes.map((v) => ({ name: v })) },
    ],
    variants,
    first_available_variant: firstAvailable,
    selected_or_first_available_variant: firstAvailable,
    selected_variant: null,
    /* Metafields the custom frontend reads. Definitions in SHOPIFY-SETUP.md. */
    metafields: {
      custom: {
        badge: { value: badge, type: 'single_line_text_field' },
        product_story: { value: story, type: 'multi_line_text_field' },
        editorial_image: { value: editorial, type: 'file_reference' },
        product_3d_model: { value: garment, type: 'single_line_text_field' },
        featured_product: { value: featured, type: 'boolean' },
        /* A `json` metafield's `.value` is already parsed by Shopify — it hands
           back the array, not a string. Storing a string here (and calling a
           non-existent `parse_json` filter in Liquid) worked locally but would
           have failed on a real store. */
        color_data: {
          value: colorNames.map((name) => ({ name, swatch: SWATCH[name] || '#888', art: colors[name] })),
          type: 'json',
        },
      },
      reviews: {
        rating: { value: { rating: rating.value, scale_min: 1, scale_max: 5 }, type: 'rating' },
        rating_count: { value: rating.count, type: 'number_integer' },
      },
    },
  };
}

/** Hex swatches for the colour picker — mirrors tools/generate-art.mjs. */
export const SWATCH = {
  Black: '#131316',
  Bone: '#e3ded4',
  Grey: '#8a8c92',
  Olive: '#575a44',
  Sand: '#c6bcab',
  'Off White': '#f0eeea',
  Ink: '#1a1d24',
  Charcoal: '#2c2d32',
  Slate: '#464d57',
};

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export const products = [
  makeProduct({
    id: 7001,
    title: 'NOVA Oversized Hoodie',
    handle: 'nova-oversized-hoodie',
    garment: 'hoodie',
    price: 3499,
    compareAt: 4299,
    type: 'Hoodie',
    tags: ['street', 'drop', 'unisex', 'heavyweight'],
    colors: { Black: 'nova-hoodie-black', Bone: 'nova-hoodie-bone', Grey: 'nova-hoodie-grey' },
    badge: 'NEW',
    featured: true,
    rating: { value: 4.8, count: 214 },
    editorial: 'nova-campaign-street.svg',
    description:
      '<p>A 480 GSM loopback cotton hoodie cut deliberately wide through the body and shoulder. Boxed sleeve, weighted hem, and a hood that holds its shape after the first wash.</p><p>Garment dyed in small batches, so no two pieces read exactly alike.</p>',
    story:
      'Loopback cotton, milled in Tiruppur. Dropped shoulder drafted at 4cm past the natural line. Hem weighted so the silhouette falls rather than clings.',
  }),
  makeProduct({
    id: 7002,
    title: 'NOVA Utility Cargo',
    handle: 'nova-utility-cargo',
    garment: 'cargo',
    price: 4299,
    type: 'Trouser',
    sizeSet: 'bottom',
    tags: ['street', 'drop', 'utility'],
    colors: { Olive: 'nova-cargo-olive', Black: 'nova-cargo-black', Sand: 'nova-cargo-sand' },
    badge: 'DROP 01',
    featured: true,
    rating: { value: 4.7, count: 96 },
    editorial: 'nova-campaign-street.svg',
    description:
      '<p>Wide-leg ripstop cargo with bellowed thigh pockets and a drawcord waist. Built to sit low and break once over the shoe.</p>',
    story: 'Cotton ripstop with a dry hand feel. Bar-tacked at every stress point. Pocket bags cut deep enough to actually use.',
  }),
  makeProduct({
    id: 7003,
    title: 'NOVA Signature Tee',
    handle: 'nova-signature-tee',
    garment: 'tee',
    price: 1999,
    type: 'T-Shirt',
    tags: ['street', 'minimal', 'essential'],
    colors: { 'Off White': 'nova-tee-offwhite', Black: 'nova-tee-black', Sand: 'nova-tee-sand' },
    rating: { value: 4.9, count: 512 },
    description:
      '<p>The reference tee. 240 GSM combed cotton, tubular body, ribbed collar that stays flat. Cut boxy but not cropped.</p>',
    story: 'Combed and ring-spun. Pre-shrunk twice so the length you buy is the length you keep.',
  }),
  makeProduct({
    id: 7004,
    title: 'NOVA Tech Bomber',
    handle: 'nova-tech-bomber',
    garment: 'bomber',
    price: 6999,
    compareAt: 8499,
    type: 'Jacket',
    tags: ['street', 'drop', 'outerwear'],
    colors: { Ink: 'nova-bomber-ink', Charcoal: 'nova-bomber-charcoal' },
    badge: 'LIMITED',
    featured: true,
    rating: { value: 4.6, count: 74 },
    editorial: 'nova-campaign-street.svg',
    description:
      '<p>Cropped bomber in a matte technical shell with a water-repellent finish. Ribbed collar, cuff and hem. Two-way centre zip.</p>',
    story: 'Shell bonded to a light mesh backer so it holds structure without bulk. Zip sourced from a 60-year-old Japanese maker.',
  }),
  makeProduct({
    id: 7005,
    title: 'NOVA Essential Shirt',
    handle: 'nova-essential-shirt',
    garment: 'shirt',
    price: 3299,
    type: 'Shirt',
    tags: ['minimal', 'essential'],
    colors: { Bone: 'nova-shirt-bone', Slate: 'nova-shirt-slate' },
    featured: true,
    rating: { value: 4.8, count: 141 },
    editorial: 'nova-campaign-minimal.svg',
    description:
      '<p>A camp-collar shirt in washed cotton poplin. Relaxed through the chest, straight hem, meant to be worn open.</p>',
    story: 'Poplin washed twice for softness. Collar interlined lightly so it rolls instead of standing.',
  }),
  makeProduct({
    id: 7006,
    title: 'NOVA Everyday Trouser',
    handle: 'nova-everyday-trouser',
    garment: 'trouser',
    price: 3999,
    type: 'Trouser',
    sizeSet: 'bottom',
    tags: ['minimal', 'essential'],
    colors: { Charcoal: 'nova-trouser-charcoal', Sand: 'nova-trouser-sand' },
    rating: { value: 4.7, count: 88 },
    editorial: 'nova-campaign-minimal.svg',
    description:
      '<p>A clean tapered trouser with a hidden elastic back and a pressed front. Formal enough for the room, easy enough for the day.</p>',
    story: 'Twill with 2% stretch. Front crease set with heat so it survives the wash.',
  }),
  makeProduct({
    id: 7007,
    title: 'NOVA Structured Jacket',
    handle: 'nova-structured-jacket',
    garment: 'jacket',
    price: 8999,
    compareAt: 10999,
    type: 'Jacket',
    tags: ['luxury', 'outerwear', 'tailored'],
    colors: { Black: 'nova-jacket-black', Slate: 'nova-jacket-slate' },
    badge: 'ARCHIVE',
    featured: true,
    rating: { value: 4.9, count: 43 },
    editorial: 'nova-campaign-luxury.svg',
    inventory: 12,
    description:
      '<p>A single-breasted jacket with a soft shoulder and a lengthened body. Half-canvassed, unlined through the back for movement.</p>',
    story: 'Half-canvas construction. Sleeve set by hand. The shoulder is left unpadded so the garment takes the wearer’s line, not the other way round.',
  }),
  makeProduct({
    id: 7008,
    title: 'NOVA Performance Set',
    handle: 'nova-performance-set',
    garment: 'activeset',
    price: 4999,
    type: 'Activewear',
    tags: ['active', 'train', 'run'],
    colors: { Charcoal: 'nova-activeset-charcoal', Black: 'nova-activeset-black' },
    badge: 'ACTIVE',
    featured: true,
    rating: { value: 4.7, count: 167 },
    editorial: 'nova-campaign-active.svg',
    description:
      '<p>Training top and short in a four-way stretch knit with flatlock seams. Sweat moves out; the fabric stays put.</p>',
    story: 'Knitted with a hollow-core yarn that wicks without feeling slick. Seams flatlocked to sit under a pack strap.',
  }),
  makeProduct({
    id: 7009,
    title: 'NOVA Column Dress',
    handle: 'nova-column-dress',
    garment: 'dress',
    price: 5499,
    type: 'Dress',
    tags: ['women', 'luxury', 'minimal'],
    colors: { Black: 'nova-dress-black', Bone: 'nova-dress-bone' },
    rating: { value: 4.8, count: 61 },
    editorial: 'nova-campaign-luxury.svg',
    description:
      '<p>A bias-cut column in heavy satin-back crepe. Falls straight from the shoulder with no closure — it goes on over the head.</p>',
    story: 'Cut on the true bias so the fabric moves with the body. Hem hand-rolled.',
  }),
  makeProduct({
    id: 7010,
    title: 'NOVA Arc Cap',
    handle: 'nova-arc-cap',
    garment: 'cap',
    price: 1499,
    type: 'Accessory',
    sizeSet: 'one',
    tags: ['accessories', 'street'],
    colors: { Black: 'nova-cap-black', Bone: 'nova-cap-bone' },
    rating: { value: 4.6, count: 203 },
    description: '<p>Six-panel cap in washed cotton twill with a pre-curved brim and a metal slider closure.</p>',
    story: 'Unstructured crown that packs flat. Brim pre-curved on a former, not by hand.',
  }),
  makeProduct({
    id: 7011,
    title: 'NOVA Carry Tote',
    handle: 'nova-carry-tote',
    garment: 'tote',
    price: 2799,
    type: 'Accessory',
    sizeSet: 'one',
    tags: ['accessories', 'minimal'],
    colors: { Sand: 'nova-tote-sand', Black: 'nova-tote-black' },
    rating: { value: 4.7, count: 118 },
    description: '<p>18oz canvas tote with reinforced webbing handles and an internal zip pocket. Holds a 16" laptop flat.</p>',
    story: 'Canvas woven heavy enough to stand on its own. Handles bar-tacked through four layers.',
  }),
  makeProduct({
    id: 7012,
    title: 'NOVA Shield Sunglasses',
    handle: 'nova-shield-sunglasses',
    garment: 'sunglasses',
    price: 2499,
    type: 'Accessory',
    sizeSet: 'one',
    tags: ['accessories', 'luxury', 'limited'],
    colors: { Ink: 'nova-sunglasses-ink' },
    badge: 'LIMITED',
    rating: { value: 4.5, count: 37 },
    inventory: 27,
    editorial: 'nova-campaign-luxury.svg',
    description: '<p>A single-lens shield in injected acetate with CAT-3 protection. Weighs 24 grams.</p>',
    story: 'Acetate block milled rather than moulded, then tumbled for eight hours to finish the edge.',
  }),
];

export const productsByHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const collectionDefs = [
  {
    handle: 'the-new-drop',
    title: 'The New Drop',
    theme: 'drop',
    image: 'nova-campaign-street.svg',
    description: 'Engineered for the next version of you. Twelve pieces, released once.',
    tag: 'drop',
  },
  {
    handle: 'street',
    title: 'Street',
    theme: 'street',
    image: 'nova-campaign-street.svg',
    description: 'Built for the city. Heavyweight cotton, utility volume, and finishes that age.',
    tag: 'street',
  },
  {
    handle: 'minimal',
    title: 'Minimal',
    theme: 'minimal',
    image: 'nova-campaign-minimal.svg',
    description: 'Less. Better. The pieces that carry everything else.',
    tag: 'minimal',
  },
  {
    handle: 'active',
    title: 'Active',
    theme: 'active',
    image: 'nova-campaign-active.svg',
    description: 'Move different. Train, run, recover.',
    tag: 'active',
  },
  {
    handle: 'luxury',
    title: 'Luxury',
    theme: 'luxury',
    image: 'nova-campaign-luxury.svg',
    description: 'Considered construction, longer lines, and materials worth keeping.',
    tag: 'luxury',
  },
  {
    handle: 'accessories',
    title: 'Accessories',
    theme: 'minimal',
    image: 'nova-campaign-editorial.svg',
    description: 'The finishing decisions.',
    tag: 'accessories',
  },
  {
    handle: 'limited-edition',
    title: 'Limited Edition',
    theme: 'limited',
    image: 'nova-campaign-luxury.svg',
    description: 'Made once. When it is gone it does not return.',
    tag: 'limited',
  },
  {
    handle: 'women',
    title: "Women's Edit",
    theme: 'editorial',
    image: 'nova-campaign-editorial.svg',
    description: 'Dresses, co-ords and tailoring cut for a longer line.',
    tag: 'women',
  },
];

export const collections = collectionDefs.map((c, i) => {
  const items = products.filter((p) => p.tags.includes(c.tag));
  return {
    id: 5000 + i,
    handle: c.handle,
    title: c.title,
    description: c.description,
    url: `/collections/${c.handle}`,
    image: { src: c.image, alt: c.title },
    featured_image: { src: c.image, alt: c.title },
    products: items,
    all_products_count: items.length,
    products_count: items.length,
    all_tags: [...new Set(items.flatMap((p) => p.tags))],
    metafields: {
      custom: {
        collection_theme: { value: c.theme, type: 'single_line_text_field' },
        campaign_image: { value: c.image, type: 'file_reference' },
      },
    },
  };
});

/* Shopify always exposes an implicit `all` collection. */
collections.push({
  id: 5999,
  handle: 'all',
  title: 'Shop All',
  description: 'Every piece currently in the NØVA archive.',
  url: '/collections/all',
  image: { src: 'nova-campaign-editorial.svg', alt: 'Shop all' },
  featured_image: { src: 'nova-campaign-editorial.svg', alt: 'Shop all' },
  products,
  all_products_count: products.length,
  products_count: products.length,
  all_tags: [...new Set(products.flatMap((p) => p.tags))],
  metafields: { custom: { collection_theme: { value: 'editorial' } } },
});

export const collectionsByHandle = Object.fromEntries(collections.map((c) => [c.handle, c]));

/* ------------------------------------------------------------------ */
/* Journal                                                             */
/* ------------------------------------------------------------------ */

export const articles = [
  {
    id: 9001,
    handle: 'the-new-language-of-streetwear',
    title: 'The New Language of Streetwear',
    author: 'NØVA Editorial',
    published_at: '2026-07-18',
    tags: ['Culture'],
    image: { src: 'nova-journal-streetwear.svg', alt: 'The new language of streetwear' },
    excerpt:
      'Volume replaced logos. Construction replaced hype. A note on what the last five years did to the way a city dresses.',
    content:
      '<p>Streetwear stopped shouting somewhere around the middle of the decade. The logo shrank, then disappeared, and what was left had to justify itself on cut alone.</p><p>What replaced it is quieter and harder to make: weight, drape, and a shoulder line that reads from across a road. You cannot screen-print your way to that.</p><p>The pieces that survive now are the ones that still look considered after eighty washes. That is a manufacturing problem before it is a design one.</p>',
    url: '/blogs/journal/the-new-language-of-streetwear',
  },
  {
    id: 9002,
    handle: 'why-oversized-is-here-to-stay',
    title: 'Why Oversized Is Here to Stay',
    author: 'NØVA Editorial',
    published_at: '2026-06-30',
    tags: ['Design'],
    image: { src: 'nova-journal-oversized.svg', alt: 'Why oversized is here to stay' },
    excerpt: 'Not a trend — a change in how garments are drafted. Inside the pattern decisions behind the drop shoulder.',
    content:
      '<p>An oversized garment is not a larger garment. Scale up a standard block and you get something that hangs wrong at the neck and pools at the wrist.</p><p>The drop shoulder has to be redrafted: armhole lowered, sleeve head flattened, body width added without adding length. Get it wrong and the wearer looks smaller, not larger.</p><p>That is why the silhouette has outlasted the trend cycle. It is a drafting technique, and techniques do not go out of season.</p>',
    url: '/blogs/journal/why-oversized-is-here-to-stay',
  },
  {
    id: 9003,
    handle: 'inside-the-making-of-the-next-drop',
    title: 'Inside the Making of the Next Drop',
    author: 'NØVA Studio',
    published_at: '2026-06-02',
    tags: ['Process'],
    image: { src: 'nova-journal-drop.svg', alt: 'Inside the making of the next drop' },
    excerpt: 'Eleven months, four fabric mills and thirty-one rejected samples. What it actually takes to release twelve pieces.',
    content:
      '<p>The drop began with a fabric, not a sketch. A loopback cotton from a mill in Tiruppur that took four attempts to get to the weight we wanted.</p><p>Thirty-one samples were rejected. Most of them for the same reason: the hem lifted after washing.</p><p>The twelve pieces that made it are the twelve that survived a wash test we run at three times the normal cycle count.</p>',
    url: '/blogs/journal/inside-the-making-of-the-next-drop',
  },
];

export const blog = {
  id: 8001,
  handle: 'journal',
  title: 'NØVA Journal',
  url: '/blogs/journal',
  articles,
  articles_count: articles.length,
  all_tags: ['Culture', 'Design', 'Process'],
};

export const articlesByHandle = Object.fromEntries(articles.map((a) => [a.handle, a]));

/* ------------------------------------------------------------------ */
/* Navigation + shop                                                   */
/* ------------------------------------------------------------------ */

const link = (title, url, links = []) => ({ title, url, links, active: false, child_active: false });

export const linklists = {
  'main-menu': {
    title: 'Main menu',
    handle: 'main-menu',
    links: [
      link('Shop', '/collections/all'),
      link('Collections', '/collections'),
      link('Drops', '/collections/the-new-drop'),
      link('Journal', '/blogs/journal'),
    ],
  },
  'mega-categories': {
    title: 'Mega categories',
    handle: 'mega-categories',
    links: [
      link('Men', '/collections/street'),
      link('Women', '/collections/women'),
      link('Unisex', '/collections/all'),
      link('Active', '/collections/active'),
      link('Accessories', '/collections/accessories'),
    ],
  },
  'footer-shop': {
    title: 'Shop',
    handle: 'footer-shop',
    links: [
      link('Shop', '/collections/all'),
      link('Collections', '/collections'),
      link('Drops', '/collections/the-new-drop'),
      link('Journal', '/blogs/journal'),
      link('About', '/pages/about'),
      link('Contact', '/pages/contact'),
    ],
  },
  'footer-customer': {
    title: 'Customer',
    handle: 'footer-customer',
    links: [
      link('Account', '/account'),
      link('Orders', '/account'),
      link('Shipping', '/pages/shipping'),
      link('Returns', '/pages/returns'),
      link('FAQ', '/pages/faq'),
    ],
  },
  'footer-legal': {
    title: 'Legal',
    handle: 'footer-legal',
    links: [
      link('Privacy', '/policies/privacy-policy'),
      link('Terms', '/policies/terms-of-service'),
      link('Refund Policy', '/policies/refund-policy'),
    ],
  },
};

export const pages = {
  about: {
    title: 'About NØVA',
    handle: 'about',
    url: '/pages/about',
    content:
      '<p>NØVA is a multi-niche fashion house working across streetwear, essentials, tailoring, activewear and accessories.</p><p>We release in drops rather than seasons. Each drop is designed, sampled and manufactured against a single material decision, and it is not repeated.</p>',
  },
  contact: {
    title: 'Contact',
    handle: 'contact',
    url: '/pages/contact',
    content: '<p>Studio enquiries and wholesale: studio@nova.example</p><p>Customer care: Monday to Saturday, 10:00–19:00 IST.</p>',
  },
  shipping: {
    title: 'Shipping',
    handle: 'shipping',
    url: '/pages/shipping',
    content:
      '<p>Free shipping on orders over ₹4,999. Metro delivery in 2–4 working days, rest of India in 4–7.</p><p>Every order ships with tracking. Drops ship within 72 hours of release close.</p>',
  },
  returns: {
    title: 'Returns',
    handle: 'returns',
    url: '/pages/returns',
    content: '<p>Fourteen days from delivery, unworn with tags attached. Limited edition pieces are final sale.</p>',
  },
  faq: {
    title: 'FAQ',
    handle: 'faq',
    url: '/pages/faq',
    content:
      '<p><strong>Do drops restock?</strong> No. A drop is produced once.</p><p><strong>How do I choose a size?</strong> Every product page carries measured garment dimensions under FIT.</p>',
  },
};

export const shop = {
  name: 'NØVA',
  description: 'Wear what’s next.',
  email: 'studio@nova.example',
  domain: 'nova.example',
  permanent_domain: 'nova-demo.myshopify.com',
  url: '',
  currency: 'INR',
  money_format: '₹{{amount}}',
  enabled_payment_types: ['visa', 'master', 'american_express', 'upi'],
  policies: [],
};

/** Free-shipping threshold used by the cart drawer progress meter. */
export const FREE_SHIPPING_THRESHOLD = RUPEE(4999);
