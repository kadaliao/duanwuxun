import * as esbuild from 'esbuild';
const watch = process.argv.includes('--watch');
const ctx = await esbuild.context({ entryPoints: ['src/main.js'], bundle: true, outfile: 'build/game.js', format: 'iife', sourcemap: true, target: 'es2020', minify: process.argv.includes('--min'), logLevel: 'info' });
if (watch) await ctx.watch(); else { await ctx.rebuild(); await ctx.dispose(); }
