import { chromium } from 'playwright-core';
const exe = '/Users/liaoxingyi/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8567/index.html'); await page.waitForTimeout(1500);
const r = await page.evaluate(async () => { const g = window.game; g.ui.title.remove(); g.state.reset(); g.ui.showHUD(true); await g.director.startDay(1, { scene: 'village', px: 1560, py: 1240 }); g.r.fade(0); g.clock.set(22); g.weather.set(1, true); g.flood.start(); g.flood.level = 0.6; await new Promise(r => setTimeout(r, 1500)); let n = 0; const t0 = performance.now(); await new Promise(res => { const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); }); return { fps: (n / 3).toFixed(1), dpr: g.r.gl.getPixelRatio(), drawCalls: g.r.gl.info.render.calls, tris: g.r.gl.info.render.triangles, mem: g.r.gl.info.memory }; });
console.log(JSON.stringify(r)); await browser.close();
