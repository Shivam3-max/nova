/**
 * NØVA local Shopify harness.
 *
 * Renders the theme with LiquidJS while emulating the parts of Shopify's Liquid
 * runtime the theme depends on: the object graph (shop/product/collection/
 * cart/routes/settings), the Shopify-only filters (money, image_url,
 * asset_url…), the Shopify-only tags (section, schema, form, paginate) and the
 * /cart *.js AJAX API.
 *
 * The goal is that no theme file is written against this harness. Push the
 * same repository to a real store with `shopify theme push` and it behaves the
 * same — this file is dev-only and is never deployed.
 */
import express from 'express';
import { Liquid } from 'liquidjs';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  products,
  productsByHandle,
  collections,
  collectionsByHandle,
  blog,
  articlesByHandle,
  linklists,
  pages,
  shop,
  FREE_SHIPPING_THRESHOLD,
} from './data/catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The theme is the repository root (Shopify's GitHub integration requires it).
const THEME = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3610);

/* ------------------------------------------------------------------ */
/* Liquid engine                                                       */
/* ------------------------------------------------------------------ */

const engine = new Liquid({
  root: [
    path.join(THEME, 'snippets'),
    path.join(THEME, 'sections'),
    path.join(THEME, 'layout'),
    THEME,
  ],
  extname: '.liquid',
  cache: false,
  jsTruthy: true,
  // Shopify is lenient about undefined drops; matching that avoids false
  // failures locally that would never happen in production.
  strictVariables: false,
  strictFilters: false,
});

/* ---------------------------- filters ----------------------------- */

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toMajor = (cents) => (Number(cents) || 0) / 100;

engine.registerFilter('money', (v) => `₹${inr.format(toMajor(v))}`);
engine.registerFilter('money_with_currency', (v) => `₹${inr2.format(toMajor(v))} INR`);
engine.registerFilter('money_without_currency', (v) => inr2.format(toMajor(v)));
engine.registerFilter('money_without_trailing_zeros', (v) => `₹${inr.format(toMajor(v))}`);

/**
 * Shopify's asset_url returns a CDN URL carrying a `?v=` fingerprint, so a
 * rebuilt stylesheet is always a new URL to the browser. Without the same
 * behaviour here, Safari happily serves a cached nova.css against freshly
 * rendered markup and the page looks broken for reasons that have nothing to
 * do with the code. Fingerprint on mtime to match.
 */
function assetVersion(file) {
  try {
    return Math.floor(statSync(path.join(THEME, 'assets', file)).mtimeMs).toString(36);
  } catch {
    return '0';
  }
}

const assetUrl = (name) => {
  const file = String(name || '').replace(/^.*\//, '');
  if (!file) return '';
  return `/assets/${file}?v=${assetVersion(file)}`;
};
engine.registerFilter('asset_url', assetUrl);
engine.registerFilter('asset_img_url', assetUrl);
engine.registerFilter('file_url', assetUrl);
engine.registerFilter('file_img_url', assetUrl);
engine.registerFilter('shopify_asset_url', assetUrl);

/** Shopify's image_url takes width/height/crop kwargs; SVGs ignore them. */
function imageUrl(src) {
  if (!src) return '';
  const raw = typeof src === 'string' ? src : src.src || src.url || '';
  if (!raw) return '';
  if (raw.startsWith('http') || raw.startsWith('/')) return raw;
  return assetUrl(raw);
}
engine.registerFilter('image_url', imageUrl);
engine.registerFilter('img_url', imageUrl);

engine.registerFilter('stylesheet_tag', (url, ...rest) => {
  // Shopify supports `| stylesheet_tag: preload: true`. LiquidJS hands named
  // arguments over as either an object or [key, value] pairs depending on call
  // shape, so normalise both.
  const opts = {};
  for (const arg of rest) {
    if (Array.isArray(arg) && arg.length === 2) opts[arg[0]] = arg[1];
    else if (arg && typeof arg === 'object') Object.assign(opts, arg);
  }
  const preload = opts.preload ? `<link rel="preload" href="${url}" as="style">` : '';
  return `${preload}<link rel="stylesheet" href="${url}">`;
});
engine.registerFilter('script_tag', (url) => `<script src="${url}" defer></script>`);
engine.registerFilter('handleize', (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
);
engine.registerFilter('handle', (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
);
engine.registerFilter('t', function (key, ...args) {
  return translate(key, Object.fromEntries(args));
});
engine.registerFilter('within', (url, collection) =>
  collection && collection.handle ? `/collections/${collection.handle}${url}` : url
);
engine.registerFilter('link_to', (label, url) => `<a href="${url}">${label}</a>`);
engine.registerFilter('strip_newlines', (s) => String(s || '').replace(/[\r\n]/g, ''));
engine.registerFilter('pluralize', (n, one, many) => (Number(n) === 1 ? one : many));
engine.registerFilter('weight_with_unit', (v) => `${(Number(v) || 0) / 1000} kg`);
engine.registerFilter('placeholder_svg_tag', (_v, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 100 100" role="presentation"><rect width="100" height="100" fill="currentColor" opacity=".06"/></svg>`
);
engine.registerFilter('payment_type_svg_tag', (t) => `<span class="pay-mark" aria-hidden="true">${t}</span>`);
engine.registerFilter('highlight', (s, q) =>
  q ? String(s).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>') : s
);
engine.registerFilter('format_address', (a) => `${a?.address1 || ''} ${a?.city || ''}`.trim());
engine.registerFilter('metafield_text', (m) => (m && m.value != null ? String(m.value) : ''));
/* Note: there is deliberately no `parse_json` filter. Shopify has no such
   filter — a `json` metafield's `.value` arrives already parsed. Registering one
   here would let templates use it locally and break in production. */
engine.registerFilter('camelize', (s) => String(s || '').replace(/[-_ ](.)/g, (_, c) => c.toUpperCase()));
engine.registerFilter('hex_to_rgba', (hex, a = 1) => {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
});

/* ----------------------------- tags ------------------------------- */

/** Consume a block tag's body and emit nothing (schema/javascript/stylesheet). */
const swallow = (endName) => ({
  parse(tagToken, remainTokens) {
    while (remainTokens.length) {
      const token = remainTokens.shift();
      if (token.name === endName) return;
    }
  },
  render() {
    return '';
  },
});

engine.registerTag('schema', swallow('endschema'));
engine.registerTag('javascript', swallow('endjavascript'));
engine.registerTag('stylesheet', swallow('endstylesheet'));

/** `{% section 'name' %}` — render a section with its own `section` drop. */
engine.registerTag('section', {
  parse(tagToken) {
    this.name = tagToken.args.trim().replace(/^["']|["']$/g, '');
  },
  async render(ctx) {
    const globals = ctx.getAll();
    return renderSection(this.name, null, globals);
  },
});

/** `{% sections 'group' %}` — section groups; each group is a JSON file. */
engine.registerTag('sections', {
  parse(tagToken) {
    this.name = tagToken.args.trim().replace(/^["']|["']$/g, '');
  },
  async render(ctx) {
    const file = path.join(THEME, 'sections', `${this.name}.json`);
    if (!existsSync(file)) return renderSection(this.name, null, ctx.getAll());
    const group = JSON.parse(readFileSync(file, 'utf8'));
    const globals = ctx.getAll();
    const out = [];
    for (const id of group.order || []) {
      out.push(await renderSection(group.sections[id].type, { id, ...group.sections[id] }, globals));
    }
    return out.join('\n');
  },
});

/** `{% form 'type', object %}` — emits the same markup shape Shopify does. */
engine.registerTag('form', {
  parse(tagToken, remainTokens) {
    this.args = tagToken.args;
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => {
        throw new Error('tag {% form %} not closed');
      });
    stream.start();
  },
  /* Generator, not async: LiquidJS's renderTemplates returns a generator that
     the engine drives. Awaiting it resolves to the generator object without
     ever running it, which silently renders an empty block. */
  *render(ctx, emitter) {
    const parts = this.args.split(',').map((s) => s.trim()).filter(Boolean);
    const type = (yield this.liquid.evalValue(parts[0], ctx)) ?? parts[0].replace(/['"]/g, '');

    // Everything after the type is either the target object or a `key: value`
    // attribute, in any order — Shopify accepts both forms.
    let target = null;
    const attrs = {};

    for (const part of parts.slice(1)) {
      const kwarg = part.match(/^([\w-]+)\s*:\s*(.+)$/);
      if (kwarg) {
        attrs[kwarg[1]] = String((yield this.liquid.evalValue(kwarg[2], ctx)) ?? '');
      } else if (target === null) {
        target = yield this.liquid.evalValue(part, ctx);
      }
    }

    const config = {
      product: { action: '/cart/add', method: 'post' },
      cart: { action: '/cart', method: 'post' },
      customer: { action: '/contact#contact_form', method: 'post' },
      contact: { action: '/contact#contact_form', method: 'post' },
      new_comment: { action: '#', method: 'post' },
      localization: { action: '/localization', method: 'post' },
    }[type] || { action: '/', method: 'post' };

    const attrStr = Object.entries(attrs)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    const id = attrs.id ? ` id="${attrs.id}"` : '';

    emitter.write(
      `<form method="${config.method}" action="${config.action}" accept-charset="UTF-8"${id}${attrStr}>` +
        `<input type="hidden" name="form_type" value="${type}"><input type="hidden" name="utf8" value="✓">`
    );
    if (type === 'product' && target) {
      emitter.write(
        `<input type="hidden" name="id" value="${target.selected_or_first_available_variant?.id || target.variants?.[0]?.id || ''}">`
      );
    }
    ctx.push({ form: { posted_successfully: false, errors: null, id: attrs.id || '' } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
});

/** `{% paginate array by n %}` */
engine.registerTag('paginate', {
  parse(tagToken, remainTokens) {
    this.args = tagToken.args;
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endpaginate', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => {
        throw new Error('tag {% paginate %} not closed');
      });
    stream.start();
  },
  *render(ctx, emitter) {
    const m = this.args.match(/^(.+?)\s+by\s+(\d+)/);
    const collectionExpr = m ? m[1].trim() : this.args.trim();
    const per = m ? Number(m[2]) : 24;

    const all = (yield this.liquid.evalValue(collectionExpr, ctx)) || [];
    const items = Array.isArray(all) ? all : [];
    const page = Number(ctx.getSync(['request_page'])) || 1;
    const pageCount = Math.max(1, Math.ceil(items.length / per));
    const slice = items.slice((page - 1) * per, page * per);

    const basePath = ctx.getSync(['request', 'path']) || '/';
    const parts = [];
    for (let i = 1; i <= pageCount; i++) {
      parts.push({ title: String(i), url: `${basePath}?page=${i}`, is_link: i !== page });
    }

    const paginate = {
      items: items.length,
      current_page: page,
      current_offset: (page - 1) * per,
      pages: pageCount,
      page_size: per,
      parts,
      next: page < pageCount ? { title: 'Next', url: `${basePath}?page=${page + 1}`, is_link: true } : null,
      previous: page > 1 ? { title: 'Previous', url: `${basePath}?page=${page - 1}`, is_link: true } : null,
    };

    // Shopify replaces the paginated array in place inside the block.
    ctx.push({ paginate, __paginated: slice });
    // Rebind the expression (e.g. `collection.products`) to the current slice.
    const target = collectionExpr.split('.');
    if (target.length === 2) {
      const parent = ctx.getSync([target[0]]);
      if (parent) ctx.push({ [target[0]]: { ...parent, [target[1]]: slice } });
    }
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    if (target.length === 2) ctx.pop();
    ctx.pop();
  },
});

/** `{% style %}` -> <style>, matching Shopify. */
engine.registerTag('style', {
  parse(tagToken, remainTokens) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endstyle', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => {
        throw new Error('tag {% style %} not closed');
      });
    stream.start();
  },
  *render(ctx, emitter) {
    emitter.write('<style>');
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</style>');
  },
});

/** `{% layout none %}` — accepted and ignored; the harness picks the layout. */
engine.registerTag('layout', { parse() {}, render: () => '' });

/* ------------------------------------------------------------------ */
/* Locales                                                             */
/* ------------------------------------------------------------------ */

let locale = {};
const localeFile = path.join(THEME, 'locales', 'en.default.json');
if (existsSync(localeFile)) locale = JSON.parse(readFileSync(localeFile, 'utf8'));

function translate(key, vars = {}) {
  const value = String(key)
    .split('.')
    .reduce((acc, k) => (acc == null ? acc : acc[k]), locale);
  if (typeof value !== 'string') return `translation missing: ${key}`;
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => (vars[name] != null ? vars[name] : ''));
}

/* ------------------------------------------------------------------ */
/* Section rendering                                                   */
/* ------------------------------------------------------------------ */

/**
 * Shopify's ambient objects.
 *
 * `{% render %}` deliberately isolates its scope — a snippet sees only the
 * parameters it is passed. But on Shopify, global objects (shop, settings,
 * routes, cart, collections, linklists…) remain visible inside that isolated
 * scope. LiquidJS models exactly that distinction with `renderOptions.globals`,
 * so these must be handed over as globals rather than as ordinary scope, or
 * every snippet rendered from the layout loses its settings and routes.
 */
function ambientGlobals(globals) {
  const {
    shop, settings, routes, linklists, collections, all_products, cart, blogs,
    customer, request, localization, canonical_url, free_shipping_threshold,
    // `collection` is ambient on collection pages in Shopify, and snippets read
    // it (product-card checks its image_fit metafield), so it belongs here too.
    collection, product, article, blog, page, search,
  } = globals;

  return {
    shop, settings, routes, linklists, collections, all_products, cart, blogs,
    customer, request, localization, canonical_url, free_shipping_threshold,
    collection, product, article, blog, page, search,
  };
}

const schemaCache = new Map();

function sectionSchema(name) {
  if (schemaCache.has(name)) return schemaCache.get(name);
  const file = path.join(THEME, 'sections', `${name}.liquid`);
  let schema = {};
  if (existsSync(file)) {
    const src = readFileSync(file, 'utf8');
    const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
    if (m) {
      try {
        schema = JSON.parse(m[1]);
      } catch (err) {
        console.warn(`[nova] invalid schema JSON in sections/${name}.liquid: ${err.message}`);
      }
    }
  }
  schemaCache.set(name, schema);
  return schema;
}

function defaultsFrom(settingsDefs = []) {
  const out = {};
  for (const s of settingsDefs) {
    if (s.id !== undefined && s.default !== undefined) out[s.id] = s.default;
  }
  return out;
}

/**
 * Render one section. `config` is the entry from a JSON template
 * ({ type, settings, blocks, block_order }); when absent the section is
 * rendered from its schema defaults + first preset, which is what
 * `{% section 'header' %}` does on a real store.
 */
async function renderSection(name, config, globals) {
  const file = path.join(THEME, 'sections', `${name}.liquid`);
  if (!existsSync(file)) {
    console.warn(`[nova] missing section: ${name}`);
    return `<!-- missing section: ${name} -->`;
  }

  const schema = sectionSchema(name);

  /* Two different sources of defaults, and Shopify treats them differently:
     `presets` seed a section added through the editor (JSON templates only),
     while `default` seeds a section rendered statically with {% section %}.
     The footer relies on `default`; the homepage sections declare their blocks
     in templates/index.json. */
  const preset = (schema.presets && schema.presets[0]) || {};
  const staticDefault = schema.default || {};
  const seed = config ? preset : { ...preset, ...staticDefault };

  const settings = {
    ...defaultsFrom(schema.settings),
    ...(preset.settings || {}),
    ...(staticDefault.settings || {}),
    ...((config && config.settings) || {}),
  };

  const blockDefaults = (type) => defaultsFrom((schema.blocks || []).find((b) => b.type === type)?.settings);

  let blocks = [];
  if (config && config.blocks) {
    const order = config.block_order || Object.keys(config.blocks);
    blocks = order.map((id) => ({
      id,
      type: config.blocks[id].type,
      settings: { ...blockDefaults(config.blocks[id].type), ...(config.blocks[id].settings || {}) },
      shopify_attributes: `data-shopify-editor-block='{"id":"${id}"}'`,
    }));
  } else if (seed.blocks) {
    blocks = seed.blocks.map((b, i) => ({
      id: `${name}-${i}`,
      type: b.type,
      settings: { ...blockDefaults(b.type), ...(b.settings || {}) },
      shopify_attributes: `data-shopify-editor-block='{"id":"${name}-${i}"}'`,
    }));
  }

  const section = {
    id: (config && config.id) || name,
    settings,
    blocks,
    blocks_count: blocks.length,
    index: 1,
    location: 'template',
  };

  const html = await engine.renderFile(
    path.join(THEME, 'sections', `${name}.liquid`),
    { ...globals, section },
    { globals: ambientGlobals(globals) }
  );

  return `<div id="shopify-section-${section.id}" class="shopify-section shopify-section--${name}">${html}</div>`;
}

/* ------------------------------------------------------------------ */
/* Cart (in-memory, mirrors Shopify's /cart.js payload)                */
/* ------------------------------------------------------------------ */

let cart = emptyCart();

function emptyCart() {
  return { items: [], item_count: 0, total_price: 0, items_subtotal_price: 0, original_total_price: 0, currency: 'INR', note: '', attributes: {} };
}

function findVariant(id) {
  for (const p of products) {
    const v = p.variants.find((v) => String(v.id) === String(id));
    if (v) return { product: p, variant: v };
  }
  return null;
}

function recalcCart() {
  cart.item_count = cart.items.reduce((n, i) => n + i.quantity, 0);
  cart.total_price = cart.items.reduce((n, i) => n + i.final_line_price, 0);
  cart.items_subtotal_price = cart.total_price;
  cart.original_total_price = cart.items.reduce(
    (n, i) => n + (i.original_price || i.final_price) * i.quantity,
    0
  );
  cart.total_discount = Math.max(0, cart.original_total_price - cart.total_price);
  return cart;
}

function addToCart(variantId, quantity = 1, properties = null) {
  const found = findVariant(variantId);
  if (!found) return null;
  const { product, variant } = found;

  const existing = cart.items.find((i) => String(i.variant_id) === String(variantId));
  if (existing) {
    existing.quantity += quantity;
    existing.final_line_price = existing.final_price * existing.quantity;
    existing.line_price = existing.final_line_price;
    recalcCart();
    return existing;
  }

  const item = {
    id: variant.id,
    key: `${variant.id}:${Date.now()}`,
    variant_id: variant.id,
    product_id: product.id,
    quantity,
    title: `${product.title} - ${variant.title}`,
    product_title: product.title,
    variant_title: variant.title,
    handle: product.handle,
    url: `/products/${product.handle}?variant=${variant.id}`,
    sku: variant.sku,
    price: variant.price,
    final_price: variant.price,
    original_price: variant.compare_at_price || variant.price,
    line_price: variant.price * quantity,
    final_line_price: variant.price * quantity,
    original_line_price: (variant.compare_at_price || variant.price) * quantity,
    image: imageUrl(variant.featured_image?.src || product.featured_image.src),
    featured_image: { url: imageUrl(variant.featured_image?.src || product.featured_image.src), alt: product.title },
    options_with_values: [
      { name: 'Color', value: variant.option1 },
      { name: 'Size', value: variant.option2 },
    ],
    properties: properties || {},
    product_has_only_default_variant: false,
  };
  cart.items.push(item);
  recalcCart();
  return item;
}

/* ------------------------------------------------------------------ */
/* Globals                                                             */
/* ------------------------------------------------------------------ */

const settingsData = JSON.parse(readFileSync(path.join(THEME, 'config', 'settings_data.json'), 'utf8'));

const routes = {
  root_url: '/',
  account_url: '/account',
  account_login_url: '/account/login',
  account_logout_url: '/account/logout',
  account_register_url: '/account/register',
  collections_url: '/collections',
  all_products_collection_url: '/collections/all',
  search_url: '/search',
  predictive_search_url: '/search/suggest',
  cart_url: '/cart',
  cart_add_url: '/cart/add',
  cart_change_url: '/cart/change',
  cart_update_url: '/cart/update',
  cart_clear_url: '/cart/clear',
};

function baseGlobals(req, extra = {}) {
  const page = Number(req.query.page) || 1;
  return {
    shop,
    settings: settingsData.current,
    routes,
    linklists,
    cart: liquidCart(),
    customer: null,
    blogs: { journal: blog },
    collections: collectionsByHandle,
    all_products: productsByHandle,
    request: {
      path: req.path,
      host: `localhost:${PORT}`,
      origin: `http://localhost:${PORT}`,
      design_mode: false,
      page_type: extra.page_type || 'index',
      locale: { iso_code: 'en', endonym_name: 'English' },
      only: req.query.only ? String(req.query.only) : null,
    },
    request_page: page,
    canonical_url: `http://localhost:${PORT}${req.path}`,
    content_for_header: '',
    powered_by_link: '',
    current_tags: [],
    localization: { available_countries: [], country: { iso_code: 'IN', currency: { iso_code: 'INR' } } },
    free_shipping_threshold: FREE_SHIPPING_THRESHOLD,
    ...extra,
  };
}

/** Liquid's `cart` drop uses slightly different keys than /cart.js. */
function liquidCart() {
  return {
    ...cart,
    items: cart.items.map((i) => ({
      ...i,
      image: { src: i.image, alt: i.product_title },
      product: productsByHandle[i.handle],
    })),
  };
}

async function renderPage(res, { template, globals, pageTitle, pageDescription, bodyClass = '' }) {
  const templateFile = path.join(THEME, 'templates', `${template}.json`);
  let contentForLayout = '';

  if (existsSync(templateFile)) {
    const tpl = JSON.parse(readFileSync(templateFile, 'utf8'));

    /* Dev-only: ?only=<section-id> renders the full page chrome with a single
       section, so a section can be reviewed in isolation on a fresh load. */
    const only = globals.request?.only;
    const order = only ? tpl.order.filter((id) => id.includes(only)) : tpl.order;

    const out = [];
    for (const id of order) {
      out.push(await renderSection(tpl.sections[id].type, { id, ...tpl.sections[id] }, globals));
    }
    contentForLayout = out.join('\n');
  } else {
    const liquidFile = path.join(THEME, 'templates', `${template}.liquid`);
    if (!existsSync(liquidFile)) {
      res.status(404).send(`Template not found: ${template}`);
      return;
    }
    contentForLayout = await engine.renderFile(liquidFile, globals, {
      globals: ambientGlobals(globals),
    });
  }

  const layoutScope = {
    ...globals,
    content_for_layout: contentForLayout,
    page_title: pageTitle || shop.name,
    page_description: pageDescription || shop.description,
    template: { name: template.split('.')[0], suffix: null, directory: null },
    body_class: bodyClass,
  };

  const html = await engine.renderFile(path.join(THEME, 'layout', 'theme.liquid'), layoutScope, {
    globals: { ...ambientGlobals(globals), template: layoutScope.template },
  });

  res.type('html').send(html);
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  '/assets',
  express.static(path.join(THEME, 'assets'), {
    etag: true,
    lastModified: true,
    // Dev only. Code-split JS chunks are requested without a ?v= (the browser
    // resolves them relative to the entry), so revalidation has to be forced
    // here or a rebuilt chunk can be served stale.
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, must-revalidate'),
  })
);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* Home */
app.get('/', wrap(async (req, res) => {
  await renderPage(res, {
    template: 'index',
    globals: baseGlobals(req, { page_type: 'index' }),
    pageTitle: 'NØVA — Wear What’s Next.',
    bodyClass: 'template-index',
  });
}));

/* Collections */
app.get('/collections', wrap(async (req, res) => {
  await renderPage(res, {
    template: 'list-collections',
    globals: baseGlobals(req, { page_type: 'list-collections', collections: collections.filter((c) => c.handle !== 'all') }),
    pageTitle: 'Collections — NØVA',
    bodyClass: 'template-list-collections',
  });
}));

app.get('/collections/:handle', wrap(async (req, res, next) => {
  const collection = collectionsByHandle[req.params.handle];
  if (!collection) return next();

  // Emulate Shopify's sort_by + filter query params.
  let items = [...collection.products];
  const sort = req.query.sort_by || 'manual';
  if (sort === 'price-ascending') items.sort((a, b) => a.price - b.price);
  if (sort === 'price-descending') items.sort((a, b) => b.price - a.price);
  if (sort === 'title-ascending') items.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'created-descending') items.reverse();

  await renderPage(res, {
    template: 'collection',
    globals: baseGlobals(req, {
      page_type: 'collection',
      collection: { ...collection, products: items, sort_by: sort },
    }),
    pageTitle: `${collection.title} — NØVA`,
    pageDescription: collection.description,
    bodyClass: `template-collection collection--${collection.handle}`,
  });
}));

/* Product */
app.get('/products/:handle', wrap(async (req, res, next) => {
  const product = productsByHandle[req.params.handle];
  if (!product) return next();

  const selected = req.query.variant
    ? product.variants.find((v) => String(v.id) === String(req.query.variant))
    : null;

  const productGlobals = () =>
    baseGlobals(req, {
      page_type: 'product',
      product: {
        ...product,
        selected_variant: selected || null,
        selected_or_first_available_variant: selected || product.selected_or_first_available_variant,
      },
    });

  /* Section Rendering API: /products/x?section_id=quick-add returns just that
     section's HTML. Shopify supports this on every storefront route; quick add
     and any future async section swap rely on it. */
  if (req.query.section_id) {
    const html = await renderSection(String(req.query.section_id), null, productGlobals());
    res.type('html').send(html);
    return;
  }

  await renderPage(res, {
    template: 'product',
    globals: baseGlobals(req, {
      page_type: 'product',
      product: {
        ...product,
        selected_variant: selected || null,
        selected_or_first_available_variant: selected || product.selected_or_first_available_variant,
      },
      recommendations: { products: products.filter((p) => p.id !== product.id).slice(0, 4), performed: true },
    }),
    pageTitle: `${product.title} — NØVA`,
    pageDescription: product.description.replace(/<[^>]+>/g, '').slice(0, 150),
    bodyClass: 'template-product',
  });
}));

/* Search */
app.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const results = q ? searchProducts(q) : [];
  await renderPage(res, {
    template: 'search',
    globals: baseGlobals(req, {
      page_type: 'search',
      search: {
        performed: Boolean(q),
        terms: q,
        results,
        results_count: results.length,
      },
    }),
    pageTitle: q ? `Search: ${q} — NØVA` : 'Search — NØVA',
    bodyClass: 'template-search',
  });
}));

function searchProducts(q) {
  const needle = q.toLowerCase();
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(needle) ||
      p.type.toLowerCase().includes(needle) ||
      p.tags.some((t) => t.includes(needle)) ||
      p.description.toLowerCase().includes(needle)
  );
}

/* Predictive search JSON — same envelope shape Shopify returns. */
app.get('/search/suggest', (req, res) => {
  const q = String(req.query.q || '').trim();
  const matched = q ? searchProducts(q) : [];
  const matchedCollections = q
    ? collections.filter((c) => c.handle !== 'all' && c.title.toLowerCase().includes(q.toLowerCase()))
    : [];
  res.json({
    resources: {
      results: {
        products: matched.slice(0, 6).map((p) => ({
          title: p.title,
          url: p.url,
          handle: p.handle,
          price: p.price,
          compare_at_price: p.compare_at_price,
          featured_image: { url: imageUrl(p.featured_image.src), alt: p.title },
          vendor: p.vendor,
          type: p.type,
        })),
        collections: matchedCollections.slice(0, 4).map((c) => ({ title: c.title, url: c.url, handle: c.handle })),
      },
    },
  });
});

/* Blog */
app.get('/blogs/journal', wrap(async (req, res) => {
  await renderPage(res, {
    template: 'blog',
    globals: baseGlobals(req, { page_type: 'blog', blog }),
    pageTitle: 'NØVA Journal',
    bodyClass: 'template-blog',
  });
}));

app.get('/blogs/journal/:handle', wrap(async (req, res, next) => {
  const article = articlesByHandle[req.params.handle];
  if (!article) return next();
  await renderPage(res, {
    template: 'article',
    globals: baseGlobals(req, { page_type: 'article', blog, article }),
    pageTitle: `${article.title} — NØVA Journal`,
    pageDescription: article.excerpt,
    bodyClass: 'template-article',
  });
}));

/* Pages + policies */
app.get('/pages/:handle', wrap(async (req, res, next) => {
  const page = pages[req.params.handle];
  if (!page) return next();
  await renderPage(res, {
    template: 'page',
    globals: baseGlobals(req, { page_type: 'page', page }),
    pageTitle: `${page.title} — NØVA`,
    bodyClass: 'template-page',
  });
}));

app.get('/policies/:handle', wrap(async (req, res) => {
  const title = req.params.handle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  await renderPage(res, {
    template: 'page',
    globals: baseGlobals(req, {
      page_type: 'page',
      page: {
        title,
        handle: req.params.handle,
        content: '<p>Policy content is managed in Shopify admin under Settings → Policies.</p>',
      },
    }),
    pageTitle: `${title} — NØVA`,
    bodyClass: 'template-page',
  });
}));

/* Cart page */
app.get('/cart', wrap(async (req, res) => {
  await renderPage(res, {
    template: 'cart',
    globals: baseGlobals(req, { page_type: 'cart' }),
    pageTitle: 'Bag — NØVA',
    bodyClass: 'template-cart',
  });
}));

/* Account — stub so nav links resolve locally. */
app.get(['/account', '/account/login', '/account/register'], wrap(async (req, res) => {
  await renderPage(res, {
    template: 'page',
    globals: baseGlobals(req, {
      page_type: 'page',
      page: {
        title: 'Account',
        handle: 'account',
        content:
          '<p>Customer accounts are handled by Shopify. On a live store this route renders Shopify’s hosted account experience or the theme’s customer templates.</p>',
      },
    }),
    pageTitle: 'Account — NØVA',
    bodyClass: 'template-page',
  });
}));

/* --------------------------- Cart AJAX ---------------------------- */

app.get('/cart.js', (_req, res) => res.json(recalcCart()));

app.post('/cart/add.js', (req, res) => {
  const body = req.body || {};
  const list = body.items || [{ id: body.id, quantity: Number(body.quantity) || 1, properties: body.properties }];
  const added = [];
  for (const entry of list) {
    const item = addToCart(entry.id, Number(entry.quantity) || 1, entry.properties);
    if (!item) return res.status(422).json({ status: 422, message: 'Cart Error', description: 'Variant not found' });
    added.push(item);
  }
  res.json({ items: added, ...recalcCart() });
});

app.post('/cart/change.js', (req, res) => {
  const { id, line, quantity } = req.body || {};
  const idx = line ? Number(line) - 1 : cart.items.findIndex((i) => String(i.key) === String(id) || String(i.variant_id) === String(id));
  if (idx >= 0 && cart.items[idx]) {
    const q = Number(quantity);
    if (q <= 0) cart.items.splice(idx, 1);
    else {
      cart.items[idx].quantity = q;
      cart.items[idx].final_line_price = cart.items[idx].final_price * q;
      cart.items[idx].line_price = cart.items[idx].final_line_price;
      cart.items[idx].original_line_price = cart.items[idx].original_price * q;
    }
  }
  res.json(recalcCart());
});

app.post('/cart/update.js', (req, res) => {
  const updates = (req.body && req.body.updates) || {};
  for (const [key, qty] of Object.entries(updates)) {
    const item = cart.items.find((i) => String(i.key) === String(key) || String(i.variant_id) === String(key));
    if (!item) continue;
    const q = Number(qty);
    if (q <= 0) cart.items = cart.items.filter((i) => i !== item);
    else {
      item.quantity = q;
      item.final_line_price = item.final_price * q;
      item.line_price = item.final_line_price;
    }
  }
  if (req.body && req.body.note != null) cart.note = req.body.note;
  res.json(recalcCart());
});

app.post('/cart/clear.js', (_req, res) => {
  cart = emptyCart();
  res.json(cart);
});

/* Non-AJAX cart form posts (progressive enhancement path). */
app.post('/cart/add', (req, res) => {
  addToCart(req.body.id, Number(req.body.quantity) || 1);
  res.redirect('/cart');
});

app.post('/cart', (req, res) => {
  const updates = req.body.updates;
  if (Array.isArray(updates)) {
    updates.forEach((q, i) => {
      const item = cart.items[i];
      if (!item) return;
      const n = Number(q);
      if (n <= 0) cart.items.splice(i, 1);
      else {
        item.quantity = n;
        item.final_line_price = item.final_price * n;
      }
    });
  }
  recalcCart();
  res.redirect('/cart');
});

/* Checkout — on a real store this is Shopify's hosted checkout. */
app.all('/checkout', (_req, res) => {
  res
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Shopify Checkout</title>
       <style>body{font:15px/1.6 -apple-system,system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#fff;color:#111;text-align:center}
       div{max-width:34rem;padding:2rem}code{background:#f3f2ef;padding:.15em .4em;border-radius:3px}</style>
       <div><h1 style="font-size:1.25rem;letter-spacing:.04em;text-transform:uppercase">Shopify Checkout</h1>
       <p>On a live store this is Shopify's hosted checkout — PCI-compliant, and not themeable outside Shopify Plus checkout extensibility.</p>
       <p>Cart total: <strong>₹${inr.format(toMajor(recalcCart().total_price))}</strong> across ${cart.item_count} item(s).</p>
       <p><a href="/">← Back to NØVA</a></p></div>`
    );
});

/* 404 */
app.use(wrap(async (req, res) => {
  res.status(404);
  await renderPage(res, {
    template: '404',
    globals: baseGlobals(req, { page_type: '404' }),
    pageTitle: 'Not found — NØVA',
    bodyClass: 'template-404',
  });
}));

/* Error surface — loud in dev so template bugs are never silent. */
app.use((err, _req, res, _next) => {
  console.error('[nova] render error:', err);
  res
    .status(500)
    .type('html')
    .send(`<pre style="padding:2rem;font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap">${String(err.stack || err)}</pre>`);
});

app.listen(PORT, () => {
  const sectionCount = existsSync(path.join(THEME, 'sections'))
    ? readdirSync(path.join(THEME, 'sections')).filter((f) => f.endsWith('.liquid')).length
    : 0;
  console.log(`[nova] dev harness on http://localhost:${PORT} — ${sectionCount} sections, ${products.length} products`);
});
