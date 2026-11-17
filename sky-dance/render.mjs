// node render.mjs stills 1.5,12,40 <dir>      -> PNG stills
// node render.mjs video <out.mp4> [fps]        -> silent H.264 video (WORKERS=n parallel browsers)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });
  return page;
}
const shoot = (page, t, opts) => page.evaluate(t => window.renderAt(t), t).then(() => page.locator('#stage').screenshot(opts));

const [mode, arg1, arg2] = process.argv.slice(2);
if (mode === 'stills') {
  const dir = arg2 || 'stills'; fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const t of arg1.split(',').map(Number)) {
    await shoot(page, t, { path: path.join(dir, `t${t.toFixed(2)}.png`) });
    console.log('still', t);
  }
} else if (mode === 'video') {
  const fps = Number(arg2 || 30), out = arg1;
  const page0 = await openPage();
  const dur = await page0.evaluate(() => window.DURATION);
  await page0.close();
  const total = Math.round(dur * fps), N = Number(process.env.WORKERS || 3);
  const per = Math.ceil(total / N), tmp = fs.mkdtempSync(path.join(ROOT, '.segs-'));
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: N }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per); if (a >= b) return;
    const page = await openPage();
    const seg = path.join(tmp, `seg${w}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const finished = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
    for (let f = a; f < b; f++) {
      const buf = await shoot(page, f / fps, { type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
    }
    ff.stdin.end(); await finished; await page.close();
  }));
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, Array.from({ length: N }, (_, w) => `file '${path.join(tmp, `seg${w}.mp4`)}'`).filter((_, w) => w * per < total).join('\n'));
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' })
    .on('close', c => c === 0 ? res() : rej(new Error('concat ' + c))));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${out}: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} else {
  console.log('usage: node render.mjs stills <t1,t2,...> [dir] | video <out.mp4> [fps]');
}
await browser.close(); server.close();
