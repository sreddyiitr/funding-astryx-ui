#!/usr/bin/env node
// Records a captioned walkthrough of the app with Playwright and turns it into an
// animated WebP for the README (docs/demo.webp).
//
//   npm run dev            # in another terminal (app on :5173, API on :4000)
//   npm run record:demo
//
// Needs ffmpeg and img2webp (brew install ffmpeg webp). Read-only: the script never
// saves a status change or a note, so it doesn't touch the data.

import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readdirSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const BASE_URL = process.env.DEMO_URL ?? 'http://localhost:5173';
const OUT = resolve(process.env.DEMO_OUT ?? 'docs/demo.webp');
const SIZE = {width: 1440, height: 900};
const OUT_WIDTH = Number(process.env.DEMO_WIDTH ?? 1200);
const FPS = Number(process.env.DEMO_FPS ?? 8);

// Caption pill + fake cursor, drawn into the page so they are part of the video.
const OVERLAY = () => {
  const install = () => {
    if (document.getElementById('__demo_caption')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__demo_caption{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;
        max-width:80%;padding:12px 22px;border-radius:999px;background:rgba(17,17,39,.88);color:#fff;
        font:600 17px/1.35 Figtree,system-ui,sans-serif;letter-spacing:.1px;box-shadow:0 8px 30px rgba(0,0,0,.25);
        text-align:center;transition:opacity .25s ease;pointer-events:none}
      #__demo_caption b{color:#b9b2ff}
      #__demo_cursor{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
        background:rgba(91,78,230,.35);border:2px solid #5b4ee6;z-index:2147483647;pointer-events:none;
        transition:transform .12s ease;left:-50px;top:-50px}
      #__demo_cursor.down{transform:scale(.7);background:rgba(91,78,230,.6)}`;
    document.head.appendChild(style);
    const cap = document.createElement('div');
    cap.id = '__demo_caption';
    cap.style.opacity = '0';
    const cur = document.createElement('div');
    cur.id = '__demo_cursor';
    document.body.append(cap, cur);
    addEventListener('mousemove', e => {
      cur.style.left = e.clientX + 'px';
      cur.style.top = e.clientY + 'px';
    }, true);
    addEventListener('mousedown', () => cur.classList.add('down'), true);
    addEventListener('mouseup', () => cur.classList.remove('down'), true);
    window.__caption = html => {
      cap.style.opacity = html ? '1' : '0';
      if (html) cap.innerHTML = html;
    };
  };
  if (document.body) install();
  else addEventListener('DOMContentLoaded', install);
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const work = mkdtempSync(join(tmpdir(), 'funding-demo-'));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    colorScheme: 'light',
    recordVideo: {dir: work, size: SIZE},
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();

  const caption = async (html, holdMs = 2600) => {
    await page.evaluate(h => window.__caption(h), html);
    await sleep(holdMs);
  };
  const moveTo = async locator => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Not visible: ${locator}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 18});
    await sleep(250);
  };
  const click = async locator => {
    await moveTo(locator);
    await page.mouse.down();
    await sleep(80);
    await page.mouse.up();
    await sleep(500);
  };
  const choose = async (label, option) => {
    await click(page.getByRole('combobox', {name: label, exact: true}));
    await click(page.getByRole('option', {name: option}).first());
  };
  const queueCards = () => page.getByRole('button', {name: /^Open application /});

  // 1. Queue
  await page.goto(BASE_URL);
  await queueCards().first().waitFor();
  await page.mouse.move(700, 450);
  await caption('<b>Funding Backoffice</b> on Meta’s Astryx design system', 2400);
  await moveTo(queueCards().nth(1));
  await caption('The queue opens on applications that <b>need action</b>, each with its SLA countdown');

  // 2. Filters
  await caption('Filter by <b>status</b>, for example everything not yet funded', 1400);
  await choose('Status', /^All not funded/);
  await sleep(800);
  await caption('…then by <b>task type</b> and <b>task status</b>', 1200);
  await choose('Task type', /^VIN verification/);
  await choose('Task status', /^Discrepancy/);
  await sleep(900);
  await caption('Only unfunded applications with a <b>VIN discrepancy</b> are left (filtered on the server)');

  // 3. Hero
  await click(queueCards().first());
  await page.getByRole('heading', {name: 'Funding tasks'}).waitFor();
  await sleep(700);
  await caption('The <b>hero</b> shows 10 key deal facts at a glance', 3000);
  await moveTo(page.getByRole('combobox', {name: 'Application status'}));
  await caption('The application status can be changed right from the header', 2400);

  // 4. Tasks
  const content = page.getByRole('main');
  await page.mouse.move(900, 600, {steps: 12});
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 140);
    await sleep(120);
  }
  await sleep(500);
  await caption('<b>Funding tasks</b>: progress, open work first, and a status picker on each card', 3000);
  const collapsed = content.getByRole('button', {name: /^Activity \(/, expanded: false}).first();
  if (await collapsed.count()) {
    await click(collapsed);
    await caption('Every task keeps its own <b>activity</b> history', 2600);
  }
  await click(page.getByRole('radio', {name: /^Open \(/}));
  await caption('Switch to <b>Open</b> to see only what still blocks funding', 2600);
  await click(page.getByRole('radio', {name: /^All \(/}));

  // 5. Search + URL
  await page.mouse.move(200, 200, {steps: 12});
  await click(page.getByRole('button', {name: 'Reset'}));
  await sleep(600);
  const search = page.getByRole('searchbox', {name: 'Application or deal number'});
  await click(search);
  await caption('Or jump straight to an <b>application ID or deal number</b>', 800);
  await search.pressSequentially('88404', {delay: 140});
  await sleep(1200);
  await click(queueCards().first());
  await page.getByRole('heading', {name: 'Funding tasks'}).waitFor();
  await sleep(1500);
  // The address bar isn't in the recording, so show the shareable link in the caption.
  const url = new URL(page.url());
  const link = (url.pathname + url.search).replace(/&/g, '&amp;');
  await caption(`Filters and selection live in the <b>URL</b>, so any view can be shared<br>` +
    `<code style="font:500 14px ui-monospace,Menlo,monospace;opacity:.85">${link}</code>`, 3800);
  await caption('', 600);

  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();

  // webm -> PNG frames -> animated WebP
  const frames = join(work, 'frames');
  mkdirSync(frames);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-i', webm,
    '-vf', `fps=${FPS},scale=${OUT_WIDTH}:-1:flags=lanczos`, join(frames, 'f%05d.png')]);
  const files = readdirSync(frames).filter(f => f.endsWith('.png')).sort().map(f => join(frames, f));
  mkdirSync(resolve(OUT, '..'), {recursive: true});
  execFileSync('img2webp', ['-loop', '0', '-lossy', '-q', '62', '-m', '4', '-d', String(Math.round(1000 / FPS)),
    ...files, '-o', OUT], {stdio: ['ignore', 'ignore', 'inherit']});

  if (process.env.DEMO_KEEP) console.log(`Kept raw video: ${webm}`);
  else rmSync(work, {recursive: true, force: true});
  console.log(`Wrote ${OUT} (${files.length} frames, ${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
