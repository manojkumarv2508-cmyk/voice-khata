// Headless smoke test of the desktop layout + onboarding + one turn. Dev tool only.
import puppeteer from 'puppeteer-core'; import fs from 'fs';
const shots = process.argv[2] || 'shots'; fs.mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--force-color-scheme=light', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
const errors = []; p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await sleep(600);
await p.screenshot({ path: `${shots}/a-lang.png` });
await p.click('.langgrid [data-l=en]'); await sleep(300);
await p.click('#obNext'); await sleep(2800); await p.screenshot({ path: `${shots}/b-slide2.png` });
await p.click('#obNext'); await sleep(1800); await p.screenshot({ path: `${shots}/c-slide3.png` });
await p.click('#obNext'); await sleep(900); await p.click('#obNext'); await sleep(500); await p.click('#obNext'); await sleep(900);
await p.type('#fName', 'Harshit'); await p.type('#fShop', 'Sri Lakshmi Stores'); await p.type('#fPin', '1234'); await p.click('#authBtn');
await p.waitForSelector('#main:not([hidden])'); await sleep(1200); await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await sleep(500); await p.screenshot({ path: `${shots}/d-home.png` });
await p.click('.mic-tab'); await sleep(400); await p.click('#suggest button'); await sleep(2500); await p.screenshot({ path: `${shots}/e-turn.png` });
console.log('said:', await p.$eval('#said', (e) => e.textContent)); console.log('errors:', JSON.stringify(errors));
await b.close();
