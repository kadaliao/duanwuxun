// 用 playwright 截图：node tools/shot.mjs out.png [脚本js] [宽 高]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const out = process.argv[2] || 'tools/shots/shot.png';
const script = process.argv[3] || '';
const W = parseInt(process.argv[4] || '1440', 10), H = parseInt(process.argv[5] || '900', 10);
const url = process.env.URL || 'http://127.0.0.1:8567/index.html';
const exe = ['/Users/liaoxingyi/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Users/liaoxingyi/Library/Caches/ms-playwright/chromium-1243/chrome-mac/Chromium.app/Contents/MacOS/Chromium'].find(p => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', e => logs.push('ERROR: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
if (script) { try { await page.evaluate(script); } catch (e) { logs.push('EVAL ERROR: ' + e.message); } }
await page.waitForTimeout(parseInt(process.env.WAIT || '1200', 10));
await page.screenshot({ path: resolve(out) });
console.log(logs.slice(-40).join('\n'));
await browser.close();
