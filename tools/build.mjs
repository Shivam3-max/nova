/**
 * NØVA build pipeline.
 *
 * Compiles src/ into theme/assets/ — the only directory Shopify serves.
 * Shopify's assets folder is FLAT (no subdirectories), so entry points and
 * code-split chunks are all emitted side by side. Dynamic-import chunks
 * resolve relative to the loading script URL, which on Shopify's CDN is
 *   /cdn/shop/t/1/assets/nova.js  ->  /cdn/shop/t/1/assets/nova-chunk-xxx.js
 * so relative resolution works unchanged in production.
 */
import * as esbuild from 'esbuild';
import { readdirSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'theme', 'assets');
const watch = process.argv.includes('--watch');
const cssOnly = process.argv.includes('--css-only');

if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });

// Remove stale hashed chunks so the assets folder does not accumulate garbage
// across builds (Shopify pushes every file in the directory).
for (const f of readdirSync(outdir)) {
  if (/^nova-chunk-.*\.js(\.map)?$/.test(f)) unlinkSync(path.join(outdir, f));
}

const shared = {
  bundle: true,
  outdir,
  minify: true,
  sourcemap: false,
  target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
  logLevel: 'info',
  legalComments: 'none',
};

/** JS: ES module bundle with code splitting for the expensive WebGL layer. */
const jsConfig = {
  ...shared,
  entryPoints: [path.join(root, 'src/scripts/entry.js')],
  entryNames: 'nova',
  chunkNames: 'nova-chunk-[hash]',
  format: 'esm',
  splitting: true,
  define: { 'process.env.NODE_ENV': '"production"' },
};

/** CSS: single bundle. No url() references — imagery comes through Liquid. */
const cssConfig = {
  ...shared,
  entryPoints: [path.join(root, 'src/styles/index.css')],
  entryNames: 'nova',
  loader: { '.css': 'css' },
};

async function run() {
  const configs = cssOnly ? [cssConfig] : [jsConfig, cssConfig];
  if (watch) {
    for (const c of configs) {
      const ctx = await esbuild.context(c);
      await ctx.watch();
    }
    console.log('[nova] watching src/ …');
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    const built = readdirSync(outdir).filter((f) => /^nova.*\.(js|css)$/.test(f));
    console.log(`[nova] built ${built.length} asset(s): ${built.join(', ')}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
