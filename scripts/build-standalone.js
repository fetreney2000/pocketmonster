#!/usr/bin/env node
/**
 * build-standalone.js
 * Bundles the entire PocketMonster game into a single standalone.html that
 * opens directly in any modern browser without a web server.
 *
 * Usage:  node scripts/build-standalone.js
 * Output: standalone.html  (in the project root)
 */

import esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── 1. Bundle all JS (Three.js + game code + JSON data) ──────────────────────
const result = await esbuild.build({
  entryPoints: [resolve(ROOT, 'main.js')],
  bundle:      true,
  format:      'iife',           // single self-contained script, no modules
  globalName:  '__PM__',        // unused but required for iife format
  minify:      false,            // keep readable; set true for production
  sourcemap:   false,
  loader: {
    '.json': 'json',             // inline JSON files as JS objects
  },
  // Silence "assert { type: 'json' }" — it's supported but esbuild warns
  logLevel: 'warning',
  write:    false,               // capture output in memory
});

const bundleJs = result.outputFiles[0].text;

// ── 2. Extract CSS from index.html ───────────────────────────────────────────
const indexHtml   = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const cssMatch    = indexHtml.match(/<style>([\s\S]*?)<\/style>/i);
const inlineCss   = cssMatch ? cssMatch[1] : '';

// ── 3. Compose standalone.html ───────────────────────────────────────────────
const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PocketMonster</title>
  <style>${inlineCss}</style>
</head>
<body>
  <canvas id="game-canvas" width="640" height="480"></canvas>
  <div id="ui-overlay"></div>
  <script>
${bundleJs}
  </script>
</body>
</html>
`;

const outPath = resolve(ROOT, 'standalone.html');
writeFileSync(outPath, standalone, 'utf8');
const kb = (standalone.length / 1024).toFixed(1);
console.log(`✅  standalone.html written (${kb} KB) — open it directly in any browser!`);
