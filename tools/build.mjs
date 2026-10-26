import * as esbuild from 'esbuild';
const watch = process.argv.includes('--watch');
const ctx = await esbuild.context({ entryPoints: ['src/main.js'], bundle: true, outfile: 'build/game.js', format: 'iife', sourcemap: true, target: 'es2020', minify: process.argv.includes('--min'), logLevel: 'info' });
if (watch) await ctx.watch(); else { await ctx.rebuild(); await ctx.dispose(); }

// cachebust：把版本号写进 index.html，浏览器不会再用旧的 game.js / ui.css
import { readFileSync, writeFileSync } from 'node:fs';
const stamp = () => { const v = Date.now().toString(36); let h = readFileSync('index.html', 'utf8'); h = h.replace(/build\/game\.js(\?v=[^"]*)?/, 'build/game.js?v=' + v).replace(/css\/ui\.css(\?v=[^"]*)?/, 'css/ui.css?v=' + v); writeFileSync('index.html', h); };
stamp();
