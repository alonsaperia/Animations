// Twin boys announcement. Every frame is a pure function of time t.
import * as THREE from 'three';

const W = 1080, H = 1920;
const q = new URLSearchParams(location.search);
const LANG = q.get('lang') || 'en';
const TL = await (await fetch('audio/timeline.json')).json();
const TXT = (await (await fetch('text.json')).json())[LANG];
const SH = TL.shots, LN = TL.lines, EV = TL.events, DURATION = TL.duration;
await document.fonts.load('700 60px Fredoka', 'אבג abc'); await document.fonts.load('600 60px Fredoka', 'אבג abc'); await document.fonts.ready;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const ramp = (x, a, b) => easeIO(clamp((x - a) / (b - a)));
const rampO = (x, a, b) => easeOut(clamp((x - a) / (b - a)));
const fadeIn = (t, a, d = .25) => clamp((t - a) / d);
const pop = (t, a, d = .4) => { const x = clamp((t - a) / d); return x <= 0 ? 0 : x >= 1 ? 1 : easeOut(x) + Math.sin(x * Math.PI) * .25; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const talking = (t, who) => {   // mouth openness while this person speaks
  for (const L of Object.values(LN)) if ((L.who === who || L.who === 'all') && t > L.start && t < L.end)
    return .35 + .65 * Math.abs(Math.sin((t - L.start) * 14)) * Math.min(1, (L.end - t) * 6);
  return 0;
};

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- canvas textures ----------
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const T = {
  wood: tex(512, 512, (g, w, h) => { const r = rng(2); g.fillStyle = '#c9925e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${40 + r() * 15}%,${50 + r() * 10}%)`; g.fillRect(0, i * 64, w, 62); g.fillStyle = 'rgba(80,40,10,.25)'; g.fillRect(0, i * 64 + 62, w, 2);
      for (let k = 0; k < 18; k++) { g.strokeStyle = 'rgba(90,50,20,.12)'; g.beginPath(); const y = i * 64 + r() * 60; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + r() * 6, w * .6, y - r() * 6, w, y); g.stroke(); } } }, [4, 4]),
  wall: tex(256, 256, (g, w, h) => { g.fillStyle = '#f6e7cf'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h); }, [6, 3]),
  rug: tex(512, 512, (g, w, h) => { g.fillStyle = '#6fa8dc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 14;
    for (let i = 1; i < 5; i++) { g.strokeRect(i * 30, i * 30, w - i * 60, h - i * 60); } }),
  ellaDress: tex(256, 256, (g, w, h) => { g.fillStyle = '#4f86d6'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4;
    for (let y = 16; y < h; y += 42) for (let x = (y / 42 % 2) * 21; x < w; x += 42) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); } }, [3, 2]),
  gingham: tex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,160,215,.45)';
    for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); } }, [4, 3]),
  sage: tex(256, 256, (g, w, h) => { g.fillStyle = '#9db3a5'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < .5 ? 'rgba(240,225,200,.7)' : 'rgba(170,110,90,.55)'; g.beginPath(); g.ellipse(r() * w, r() * h, 9, 15, r() * 3, 0, 7); g.fill(); } }, [3, 3]),
  knit: tex(128, 128, (g, w, h) => { g.fillStyle = '#a9cbe6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 6); }, [3, 3]),
  kippah: tex(128, 128, (g, w, h) => { g.fillStyle = '#2f63c6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7fb0ff'; g.lineWidth = 5; for (let r = 10; r < 90; r += 18) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } }),
  ultrasound: tex(1024, 768, (g, w, h) => {
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.moveTo(w / 2, 70); g.arc(w / 2, 70, 640, Math.PI * .27, Math.PI * .73); g.closePath(); g.clip();
    const r = rng(5); g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) { const v = 40 + r() * 110; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 1 + r() * 2); }
    const sac = (x, y, rx, ry) => { g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
    sac(340, 430, 170, 150); sac(690, 430, 170, 150);
    const bean = (x, y, s, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#d8d8d8'; g.shadowColor = '#fff'; g.shadowBlur = 18;
      g.beginPath(); g.ellipse(0, 0, 70 * s, 48 * s, 0, 0, 7); g.fill(); g.beginPath(); g.arc(-62 * s, -14 * s, 40 * s, 0, 7); g.fill(); g.restore(); };
    bean(345, 440, 1.1, -.3); bean(690, 425, 1.1, .35);
    g.restore();
    g.fillStyle = '#e8e8e8'; g.font = '700 46px Fredoka'; g.fillText('BABY A', 245, 640); g.fillText('BABY B', 600, 640);
    g.font = '600 32px Fredoka'; g.fillText('BOY', 290, 690); g.fillText('BOY', 645, 690);
    g.font = '600 26px DejaVu Sans'; g.fillStyle = '#9a9a9a'; g.fillText('TWIN GESTATION', 40, 50); g.fillText('12.4 cm', w - 170, 50);
  }),
  ball: tex(512, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1b1b';
    for (let i = 0; i < 12; i++) { const x = (i % 6) * 86 + (i < 6 ? 0 : 43), y = i < 6 ? 70 : 185; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * 7 - 1.57; g.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26 * 1.3); } g.fill(); } }),
  belly: tex(256, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd6c9'); gr.addColorStop(.5, '#ffb3ad'); gr.addColorStop(1, '#f08a96'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  sky: tex(256, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5aa9ff'); gr.addColorStop(.6, '#9fd0ff'); gr.addColorStop(1, '#e6f4ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  grass: tex(256, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#5fae3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${95 + r() * 20},55%,${35 + r() * 20}%)`; g.fillRect(r() * w, r() * h, 2, 6); } }, [12, 12]),
  siding: tex(256, 256, (g, w, h) => { g.fillStyle = '#e9edf0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4); }, [6, 4]),
};
function jersey(num) {
  return tex(256, 256, (g, w, h) => { g.fillStyle = '#3d7fe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
    g.font = '700 120px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), w * .25, h / 2 + 8); g.fillText(String(num), w * .75, h / 2 + 8); });
}
function banner(text) {
  return tex(1024, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 60); g.fill();
    g.strokeStyle = '#3d7fe0'; g.lineWidth = 14; g.stroke(); g.fillStyle = '#3d7fe0'; g.font = '700 120px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = LANG === 'he' ? 'rtl' : 'ltr'; g.fillText(text, w / 2, h / 2 + 6); });
}
function onesie(num) {
  return tex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#7fb6ff'; g.beginPath();
    g.moveTo(70, 30); g.lineTo(186, 30); g.lineTo(240, 80); g.lineTo(205, 115); g.lineTo(185, 95); g.lineTo(185, 200); g.quadraticCurveTo(128, 250, 71, 200); g.lineTo(71, 95); g.lineTo(51, 115); g.lineTo(16, 80); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 30, 26, 0, Math.PI); g.fill(); g.font = '700 90px Fredoka'; g.textAlign = 'center'; g.fillText(String(num), 128, 170); });
}

// ---------- materials ----------
const M = (opts) => new THREE.MeshStandardMaterial({ roughness: .75, metalness: 0, ...opts });
const SKIN = M({ color: 0xf2c7a6, roughness: .6 });
const DARK = M({ color: 0x1b1420, roughness: .4 });
const WHITE = M({ color: 0xffffff, roughness: .3 });
const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: .45 });
const MOUTH = M({ color: 0x9b2f3a, roughness: .5 });

// ---------- people ----------
const SPEC = {
  alon:  { headR: .16, torsoL: .56, torsoR: .21, legL: .84, armU: .31, armL: .29, top: { color: 0xf8f8fb }, sleeve: 'short', pants: 0xd6d0c2, shoes: 0x7a5a3a, hair: 'short', hairColor: 0x2b2420, beard: true, wide: 1.12 },
  dina:  { headR: .15, torsoL: .5, torsoR: .17, legL: .78, armU: .28, armL: .26, top: { map: T.sage }, sleeve: 'short', skirt: .62, shoes: 0x8a5a3a, hair: 'long', hairColor: 0x5b3a24 },
  ella:  { headR: .15, torsoL: .37, torsoR: .135, legL: .56, armU: .21, armL: .2, top: { map: T.ellaDress }, collar: 0xf3ead2, sleeve: 'none', skirt: .38, shoes: 0xffffff, hair: 'curly', hairColor: 0x6b4228, glasses: true },
  eitan: { headR: .145, torsoL: .33, torsoR: .13, legL: .5, armU: .19, armL: .18, top: { map: T.knit }, sleeve: 'short', pants: 0xc9a46c, shoes: 0xf2f2f2, hair: 'boy', hairColor: 0x4a3222, kippah: true },
  nili:  { headR: .14, torsoL: .25, torsoR: .115, legL: .35, armU: .14, armL: .13, top: { map: T.gingham }, sleeve: 'puff', skirt: .22, shoes: 0xe8cf8a, hair: 'bow', hairColor: 0x3a2618, bow: 0x9cc4ff },
};
function capsule(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(.001, len), 6, 16), mat); return m; }
function makePerson(name) {
  const o = SPEC[name], r = o.headR;
  const root = new THREE.Group(); root.name = name;
  const hips = new THREE.Group(); hips.position.y = o.legL; root.add(hips);
  const topMat = M(o.top.map ? { map: o.top.map, roughness: .9 } : { color: o.top.color, roughness: .85 });
  const torso = new THREE.Group(); hips.add(torso);
  const tr = o.torsoR, tw = o.wide || 1;
  const body = capsule(tr, o.torsoL - tr * 1.4, topMat); body.position.y = o.torsoL / 2; body.scale.set(tw, 1, .78); torso.add(body);
  if (o.collar) { const c = new THREE.Mesh(new THREE.TorusGeometry(tr * .62, tr * .16, 8, 24), M({ color: o.collar })); c.rotation.x = Math.PI / 2; c.position.y = o.torsoL - tr * .1; torso.add(c); }
  if (o.skirt) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(tr * 1.0 * tw, tr * 2.0, o.skirt, 28, 1), topMat); sk.position.y = -o.skirt / 2 + tr * .7; torso.add(sk); }
  const chest = new THREE.Group(); chest.position.y = o.torsoL; torso.add(chest);
  const neck = capsule(r * .28, .02, SKIN); neck.position.y = .02; chest.add(neck);
  const head = new THREE.Group(); head.position.y = r * .95; chest.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 30), SKIN));
  // face
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * r * .36, r * .1, r * .86); head.add(e);
    const eb = new THREE.Mesh(new THREE.SphereGeometry(r * .15, 16, 12), DARK); eb.scale.set(1, 1.25, .55); e.add(eb);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * .05, 8, 6), WHITE); hl.position.set(r * .05, r * .07, r * .07); e.add(hl);
    eyes.push(e);
    const brow = capsule(r * .028, r * .16, M({ color: o.hairColor })); brow.rotation.z = Math.PI / 2 + s * .12; brow.position.set(s * r * .36, r * .38, r * .88); head.add(brow);
    const ck = new THREE.Mesh(new THREE.CircleGeometry(r * .13, 20), BLUSH); ck.position.set(s * r * .55, -r * .18, r * .82); ck.lookAt(ck.position.clone().multiplyScalar(3)); head.add(ck);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(r * .2, 12, 10), SKIN); ear.scale.set(.5, 1, .8); ear.position.set(s * r * .98, 0, 0); head.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(r * .1, 12, 10), M({ color: 0xeab497 })); nose.position.set(0, -r * .07, r * 1.0); head.add(nose);
  const mz = o.beard ? r * 1.07 : r * .95;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(r * .2, r * .035, 8, 24, Math.PI), MOUTH); smile.rotation.z = Math.PI; smile.position.set(0, -r * .3, mz - r * .03); head.add(smile);
  const open = new THREE.Mesh(new THREE.SphereGeometry(r * .2, 20, 14), MOUTH); open.position.set(0, -r * .4, mz - r * .1); open.scale.set(1, .1, .45); head.add(open);
  // hair
  const hm = M({ color: o.hairColor, roughness: .85 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 40, 20, 0, Math.PI * 2, 0, Math.PI * (o.hair === 'boy' || o.hair === 'short' ? .42 : .5)), hm);
  cap.rotation.x = -.38; head.add(cap);
  if (o.hair === 'long') {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(r * .85, r * 1.6, 6, 16), hm); back.scale.set(1.05, 1, .45); back.position.set(0, -r * .85, -r * .55); head.add(back);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.CapsuleGeometry(r * .2, r * 1.5, 6, 10), hm); sd.position.set(s * r * .93, -r * .7, r * .05); head.add(sd); }
  }
  if (o.hair === 'curly') {
    const rr = rng(21);
    for (let i = 0; i < 46; i++) {
      const a = (rr() - .5) * Math.PI * 1.35 + Math.PI, y = r * (.55 - rr() * 2.1), rad = r * (1.0 - Math.max(0, -y / r - .2) * .12);
      const b = new THREE.Mesh(new THREE.SphereGeometry(r * (.2 + rr() * .1), 12, 10), hm);
      b.position.set(Math.sin(a) * rad, y, Math.cos(a) * rad - (y < -r * .4 ? r * .15 : 0)); head.add(b);
    }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(r * .17, 10, 8), hm); b.position.set(s * r * (.98 - i * .02), r * (.15 - i * .32), r * .25); head.add(b); }
  }
  if (o.hair === 'bow') {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(r * .8, r * .7, 6, 16), hm); back.scale.set(1.1, 1, .5); back.position.set(0, -r * .35, -r * .55); head.add(back);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.CapsuleGeometry(r * .2, r * .7, 6, 10), hm); sd.position.set(s * r * .92, -r * .35, r * .1); head.add(sd); }
    const bm = M({ color: o.bow });
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(r * .2, r * .4, 12), bm); w.rotation.z = s * Math.PI / 2; w.position.set(s * r * .24, r * 1.0, -r * .1); head.add(w); }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(r * .09, 10, 8), bm); knot.position.set(0, r * 1.0, -r * .1); head.add(knot);
  }
  if (o.kippah) { const k = new THREE.Mesh(new THREE.SphereGeometry(r * .62, 28, 8, 0, Math.PI * 2, 0, .55), M({ map: T.kippah })); k.position.set(0, r * .5, -r * .38); k.rotation.x = -.62; head.add(k); }
  if (o.beard) {
    const bd = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 40, 20, Math.PI / 2 - 1.45, 2.9, Math.PI * .62, Math.PI * .33), hm); head.add(bd);
    const mus = capsule(r * .07, r * .3, hm); mus.rotation.z = Math.PI / 2; mus.position.set(0, -r * .19, r * .99); mus.scale.set(.8, .8, .8); head.add(mus);
  }
  if (o.glasses) {
    const gm = M({ color: 0xf2cfd8, roughness: .3, transparent: true, opacity: .95 });
    for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * .25, r * .035, 8, 28), gm); ring.position.set(s * r * .36, r * .1, r * .99); head.add(ring); }
    const br = capsule(r * .025, r * .18, gm); br.rotation.z = Math.PI / 2; br.position.set(0, r * .14, r * 1.02); head.add(br);
  }
  // arms
  const sleeveMat = o.sleeve === 'none' ? SKIN : topMat;
  const arms = {};
  for (const [s, side] of [[1, 'l'], [-1, 'r']]) {
    const sh = new THREE.Group(); sh.position.set(s * (tr * tw + o.armU * .12), -tr * .45, 0); chest.add(sh);
    const ar = o.armU * .17;
    const up = capsule(ar, o.armU - ar, o.sleeve === 'short' || o.sleeve === 'puff' ? SKIN : sleeveMat); up.position.y = -o.armU / 2; sh.add(up);
    if (o.sleeve === 'short' || o.sleeve === 'puff') { const sl = new THREE.Mesh(new THREE.SphereGeometry(ar * (o.sleeve === 'puff' ? 1.9 : 1.55), 14, 10), topMat); sl.position.y = -ar * .9; sl.scale.y = 1.2; sh.add(sl); }
    const el = new THREE.Group(); el.position.y = -o.armU; sh.add(el);
    const lo = capsule(ar * .92, o.armL - ar, SKIN); lo.position.y = -o.armL / 2; el.add(lo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(ar * 1.45, 14, 10), SKIN); hand.position.y = -o.armL; el.add(hand);
    arms[side] = { sh, el, hand };
  }
  // legs
  const legs = {};
  const legMat = o.pants ? M({ color: o.pants }) : SKIN;
  for (const [s, side] of [[1, 'l'], [-1, 'r']]) {
    const hp = new THREE.Group(); hp.position.set(s * tr * .5, 0, 0); hips.add(hp);
    const lr = o.legL * .1, lu = o.legL * .5;
    const th = capsule(lr, lu - lr, legMat); th.position.y = -lu / 2; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -lu; hp.add(kn);
    const sh = capsule(lr * .9, lu - lr * 1.4, legMat); sh.position.y = -(lu - lr * .5) / 2; kn.add(sh);
    const ft = new THREE.Mesh(new THREE.CapsuleGeometry(lr * 1.05, lr * 1.3, 4, 10), M({ color: o.shoes })); ft.rotation.x = Math.PI / 2; ft.position.set(0, -lu + lr * 1.2, lr * .6); kn.add(ft);
    legs[side] = { hp, kn };
  }
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
  const P = { root, hips, torso, chest, head, arms, legs, eyes, smile, open, spec: o, name };
  P.pose = (p = {}) => {
    const g = (k, d) => p[k] ?? d;
    torso.rotation.set(...g('torso', [0, 0, 0])); head.rotation.set(...g('head', [0, 0, 0]));
    arms.l.sh.rotation.set(...g('lSh', [0, 0, .12])); arms.r.sh.rotation.set(...g('rSh', [0, 0, -.12]));
    arms.l.el.rotation.set(...g('lEl', [-.15, 0, 0])); arms.r.el.rotation.set(...g('rEl', [-.15, 0, 0]));
    legs.l.hp.rotation.set(...g('lHip', [0, 0, 0])); legs.r.hp.rotation.set(...g('rHip', [0, 0, 0]));
    legs.l.kn.rotation.set(...g('lKn', [0, 0, 0])); legs.r.kn.rotation.set(...g('rKn', [0, 0, 0]));
    hips.position.y = o.legL + g('drop', 0);
  };
  P.face = (t, mouth = 0, blinkSeed = 0) => {
    const ph = (t + blinkSeed) % 3.3, bl = ph < .12 ? .15 : 1;
    eyes.forEach(e => e.scale.y = bl);
    smile.visible = mouth < .08; open.visible = !smile.visible; open.scale.y = .2 + mouth * .9;
  };
  P.headWorld = (dy = 1.3) => head.localToWorld(V(0, r * dy, 0));
  P.pose(); P.face(0);
  return P;
}
function walk(P, ph, amp = 1, tiptoe = 0) {   // returns a pose for a walk phase
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    lHip: [-.45 * s * amp, 0, 0], rHip: [.45 * s * amp, 0, 0],
    lKn: [Math.max(0, -c) * .9 * amp + tiptoe * .2, 0, 0], rKn: [Math.max(0, c) * .9 * amp + tiptoe * .2, 0, 0],
    lSh: [.35 * s * amp - tiptoe * .6, 0, .15 + tiptoe * .25], rSh: [-.35 * s * amp - tiptoe * .6, 0, -.15 - tiptoe * .25],
    lEl: [-.4 - tiptoe * 1.0, 0, 0], rEl: [-.4 - tiptoe * 1.0, 0, 0],
    drop: -Math.abs(Math.sin(ph)) * .02 * amp - tiptoe * .03, torso: [tiptoe * .12, 0, 0],
  };
}
function makeBaby(num) {
  const g = new THREE.Group(), r = .16;
  const jm = M({ map: jersey(num), roughness: .8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 18), jm); body.scale.set(1, 1.1, .9); body.position.y = .3; g.add(body);
  const diaper = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 12, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55), M({ color: 0xffffff })); diaper.position.y = .25; diaper.scale.set(1.05, 1, .95); g.add(diaper);
  const head = new THREE.Group(); head.position.y = .58; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), SKIN));
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r * .13, 12, 10), DARK); e.scale.set(1, 1.2, .5); e.position.set(s * r * .35, r * .05, r * .9); head.add(e); eyes.push(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * .045, 8, 6), WHITE); hl.position.set(s * r * .35 + r * .04, r * .12, r * .97); head.add(hl);
    const ck = new THREE.Mesh(new THREE.CircleGeometry(r * .14, 16), BLUSH); ck.position.set(s * r * .55, -r * .2, r * .82); ck.lookAt(ck.position.clone().multiplyScalar(3)); head.add(ck);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(r * .18, 10, 8), SKIN); ear.scale.set(.5, 1, .8); ear.position.set(s * r * .98, 0, 0); head.add(ear);
  }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(r * .2, r * .04, 8, 20, Math.PI), MOUTH); sm.rotation.z = Math.PI; sm.position.set(0, -r * .32, r * .93); head.add(sm);
  const tuft = new THREE.Mesh(new THREE.TorusGeometry(r * .18, r * .05, 8, 16, Math.PI * 1.4), M({ color: 0x5b3a24 })); tuft.position.set(0, r * 1.05, 0); tuft.rotation.y = Math.PI / 2; head.add(tuft);
  const limbs = {};
  for (const [s, k] of [[1, 'l'], [-1, 'r']]) {
    const a = new THREE.Group(); a.position.set(s * .16, .38, 0); g.add(a);
    const am = capsule(.045, .1, SKIN); am.position.y = -.08; a.add(am); limbs[k + 'a'] = a;
    const l = new THREE.Group(); l.position.set(s * .08, .18, 0); g.add(l);
    const lm = capsule(.055, .08, SKIN); lm.position.y = -.07; l.add(lm);
    const sock = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), M({ color: 0xffffff })); sock.position.set(0, -.15, .02); sock.scale.set(1, .8, 1.3); l.add(sock);
    limbs[k + 'l'] = l;
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, head, limbs, eyes };
}

// ---------- environments ----------
function lights(scene, sun = V(2, 5, 4), int = 2.2) {
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xb79a80, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, int); d.position.copy(sun); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 20 }); d.shadow.bias = -.0005; d.shadow.radius = 4;
  scene.add(d); return d;
}
function room() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#f6e7cf');
  lights(scene, V(1.5, 4.5, 4));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M({ map: T.wood, roughness: .6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), M({ map: T.wall })); wall.position.set(0, 3, -1.2); wall.receiveShadow = true; scene.add(wall);
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, .12, .03), M({ color: 0xffffff })); base.position.set(0, .06, -1.18); scene.add(base);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), M({ map: T.rug })); rug.rotation.x = -Math.PI / 2; rug.position.set(-.4, .005, .3); rug.receiveShadow = true; scene.add(rug);
  // dresser
  const dr = new THREE.Group(); dr.position.set(.85, 0, -.92); scene.add(dr);
  const wm = M({ color: 0xfaf6ef, roughness: .5 });
  const carcass = new THREE.Mesh(new THREE.BoxGeometry(1.1, .92, .52), wm); carcass.position.y = .5; carcass.castShadow = carcass.receiveShadow = true; dr.add(carcass);
  const topb = new THREE.Mesh(new THREE.BoxGeometry(1.16, .04, .56), M({ color: 0xc9925e })); topb.position.y = .98; dr.add(topb);
  const drawers = [];
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Group(); d.position.set(0, .82 - i * .28, .26); dr.add(d);
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.0, .24, .03), M({ color: 0xffffff, roughness: .45 })); d.add(f);
    const k = new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 8), M({ color: 0xc9a24a, metalness: .6, roughness: .3 })); k.position.z = .03; d.add(k);
    if (i === 0) { const box = new THREE.Mesh(new THREE.BoxGeometry(.96, .18, .45), M({ color: 0xe9dfd0 })); box.position.set(0, 0, -.24); d.add(box); }
    drawers.push(d);
  }
  const lamp = new THREE.Group(); lamp.position.set(1.15, 1.0, -.95); scene.add(lamp);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, .3, 16), M({ color: 0x9ec7a8 })); lb.position.y = .15; lamp.add(lb);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, .22, 24, 1, true), M({ color: 0xfff3d6, side: THREE.DoubleSide, emissive: 0xffe2a0, emissiveIntensity: .4 })); sh.position.y = .38; lamp.add(sh);
  const plant = new THREE.Group(); plant.position.set(-2.2, 0, -.9); plant.scale.setScalar(3); scene.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.08, .06, .14, 16), M({ color: 0xe07a5f })); pot.position.y = .07; plant.add(pot);
  for (let i = 0; i < 6; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), M({ color: 0x4f9d58 })); lf.scale.set(.6, 1.6, .6); lf.position.set(Math.sin(i) * .05, .2 + (i % 3) * .03, Math.cos(i) * .05); lf.rotation.z = Math.sin(i * 2) * .5; plant.add(lf); }
  // picture frames on the wall
  [[-1.4, 1.75, .5, .4, 0x9fd0ff], [-.6, 1.9, .36, .46, 0xffc6a8], [.85, 1.7, .55, .4, 0xc8e6b0]].forEach(([x, y, w, h, c]) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w, h, .03), M({ color: 0x8a6a4a })); fr.position.set(x, y, -1.18); scene.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w - .08, h - .08), M({ color: c })); pic.position.set(x, y, -1.16); scene.add(pic);
  });
  return { scene, drawers };
}
function toyDino() {
  const g = new THREE.Group(), m = M({ color: 0x55b15e }), b = M({ color: 0xf5d76e });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), m); body.scale.set(1.5, 1, 1); g.add(body);
  const neck = capsule(.025, .05, m); neck.position.set(.07, .05, 0); neck.rotation.z = -.6; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), m); head.scale.set(1.4, 1, 1); head.position.set(.11, .09, 0); g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.03, .12, 10), m); tail.rotation.z = Math.PI / 2 + .3; tail.position.set(-.12, .01, 0); g.add(tail);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.012, .03, 6), b); sp.position.set(-.04 + i * .03, .065, 0); g.add(sp); }
  for (const [x, z] of [[-.04, .03], [-.04, -.03], [.04, .03], [.04, -.03]]) { const l = capsule(.015, .03, m); l.position.set(x, -.06, z); g.add(l); }
  return g;
}
function card() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.3, .225), new THREE.MeshBasicMaterial({ map: T.ultrasound, side: THREE.DoubleSide }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(.31, .235), M({ color: 0xffffff })); back.position.z = -.002; back.rotation.y = Math.PI;
  g.add(m, back); g.userData.front = m; return g;
}
const cam = (fov) => new THREE.PerspectiveCamera(fov, W / H, .02, 200);
function place(c, pos, look) { c.position.copy(pos); c.lookAt(look); c.updateMatrixWorld(true); }
const vl = (a, b, t) => a.clone().lerp(b, t);

// ============================================================ SHOTS
// --- Living room (A1..A6 share one scene)
const R = room();
const kids = { ella: makePerson('ella'), eitan: makePerson('eitan'), nili: makePerson('nili') };
Object.values(kids).forEach(k => R.scene.add(k.root));
const dino = toyDino(); kids.eitan.arms.r.hand.add(dino); dino.position.set(0, -.05, .05); dino.rotation.set(0, -Math.PI / 2, 0);
const uc = card(); R.scene.add(uc);
const camA = cam(40);
const END = { ella: V(.6, 0, -.28), eitan: V(-.12, 0, .12), nili: V(-.62, 0, .2) };
const START = { ella: V(-2.2, 0, -.2), eitan: V(-2.8, 0, .1), nili: V(-3.3, 0, .25) };

function updateRoom(t) {
  const [a0, a1] = SH.A1, A2 = SH.A2[0];
  const walkEnd = a1 - .5;
  for (const [n, P] of Object.entries(kids)) {
    const k = clamp((t - a0) / (walkEnd - a0));
    const pos = vl(START[n], END[n], easeOut(k) * .15 + k * .85);
    P.root.position.copy(pos);
    const moving = k < 1 ? 1 : 0;
    const ph = (t - a0) * 7 + (n === 'nili' ? 1 : n === 'eitan' ? 2 : 0);
    let p = moving ? walk(P, ph, .8, 1) : {};
    P.root.rotation.y = moving ? Math.PI / 2 : 0;
    if (!moving) P.root.rotation.y = n === 'ella' ? 0 : n === 'eitan' ? .25 : .35;
    // Ella: "shh" finger at lips while saying L1
    if (n === 'ella') {
      const sh = clamp(Math.min((t - LN.L1.start + .2) / .3, (LN.L1.end + .3 - t) / .3));
      if (sh > 0) { P.root.rotation.y = lerp(P.root.rotation.y, .9, sh); p = { ...p, rSh: [lerp(0, -1.25, sh), 0, lerp(-.15, .55, sh)], rEl: [lerp(-.4, -2.0, sh), 0, 0], head: [0, -.5 * sh, 0] }; }
      // opening the drawer, lifting the card, turning round
      if (t >= A2) {
        const open = ramp(t, EV.drawer - .2, EV.drawer + .5), lift = ramp(t, EV.card, EV.card + .5), turn = ramp(t, EV.turn, EV.turn + .5);
        P.root.rotation.y = lerp(Math.PI, 0, turn);
        const reach = 1 - lift;
        p = {
          rSh: [lerp(-1.5 * clamp(open * 2), -.75, lift), 0, lerp(-.1, .3, lift)], rEl: [lerp(-.3, -.9, lift), 0, 0],
          lSh: [lerp(0, -.75, lift), 0, lerp(.12, -.3, lift)], lEl: [lerp(-.15, -.9, lift), 0, 0],
          head: [lerp(.15 * reach, .05, turn), 0, 0], torso: [.08 * reach * open, 0, 0],
        };
        R.drawers[0].position.z = .26 + .32 * open;
      } else R.drawers[0].position.z = .26;
    }
    if (n === 'eitan' && t >= SH.A5[0]) {
      const raw = ramp(t, EV.rawr, EV.rawr + .35);
      const jump = t > EV.rawr ? Math.max(0, Math.sin((t - EV.rawr) * 7)) * .07 * clamp((EV.rawr + 1.2 - t) / .4) : 0;
      p = { rSh: [lerp(-.5, -2.6, raw), 0, lerp(-.2, -.3, raw)], rEl: [lerp(-1.1, -.3, raw), 0, 0], lSh: [lerp(0, -2.4, raw), 0, lerp(.15, .4, raw)], lEl: [-.3, 0, 0], head: [lerp(.25, -.15, raw), 0, 0] };
      P.root.position.y = jump; P.root.rotation.y = .1;
    } else if (n === 'eitan' && !moving) p = { ...p, rSh: [-.5, 0, -.2], rEl: [-1.1, 0, 0] };
    if (n === 'nili' && t >= SH.A4[0] && t < SH.A5[0]) {
      const bino = 1 - ramp(t, LN.L3.start - .15, LN.L3.start + .15);
      const hop = t > LN.L3.start ? Math.max(0, Math.sin((t - LN.L3.start) * 9)) * .05 * clamp((LN.L3.end + .4 - t) / .3) : 0;
      p = { lSh: [lerp(-.6, -2.05, bino), 0, lerp(.6, -.38, bino)], rSh: [lerp(-.6, -2.05, bino), 0, lerp(-.6, .38, bino)], lEl: [lerp(-.3, -1.75, bino), 0, 0], rEl: [lerp(-.3, -1.75, bino), 0, 0], head: [-.1, 0, 0] };
      P.root.position.y = hop; P.root.rotation.y = 0;
    }
    if (n === 'nili' && t >= SH.A5[0]) p = { lSh: [-.2, 0, .3], rSh: [-.2, 0, -.3] };
    P.pose(p);
    P.face(t, talking(t, n), n.length * .7);
  }
  // the card: hidden in the drawer, then in Ella's hands
  const E = kids.ella;
  if (t < EV.card) { uc.visible = t >= SH.A2[0]; uc.position.set(.85, .8, -.66 + .32 * ramp(t, EV.drawer - .2, EV.drawer + .5) - .15); uc.rotation.set(-Math.PI / 2, 0, 0); }
  else {
    uc.visible = true; E.root.updateMatrixWorld(true);
    const lift = ramp(t, EV.card, EV.card + .5);
    const handPos = E.root.localToWorld(V(0, .8, .36));
    const from = V(.85, .86, -.5);
    uc.position.copy(vl(from, handPos, lift));
    uc.rotation.set(lerp(-Math.PI / 2, -.35, lift), E.root.rotation.y, 0);
    const onTop = t > EV.turn + .5; uc.userData.front.material.depthTest = !onTop; uc.userData.front.renderOrder = onTop ? 10 : 0;
  }
}
function roomShot(kind) {
  return { scene: R.scene, camera: camA, update(t) {
    updateRoom(t);
    const out = { bubbles: [], rings: [] };
    if (kind === 'A1') {
      const k = ramp(t, SH.A1[0], SH.A1[1] - .4);
      place(camA, vl(V(-1.7, 1.0, 4.3), V(-.05, .95, 3.6), k), vl(V(-1.6, .75, 0), V(-.05, .7, -.2), k));
      out.bubbles.push({ id: 'L1', who: 'ella' });
    } else if (kind === 'A2') {
      place(camA, V(.25, 1.05, 2.25), V(.45, .78, -.5));
      out.bubbles.push({ id: 'L2', who: 'ella' });
    } else if (kind === 'A3' || kind === 'A6') {
      uc.updateMatrixWorld(true);
      const c = uc.localToWorld(V(0, 0, 0)), n = V(0, 0, 1).applyQuaternion(uc.quaternion);
      let d = .5; if (kind === 'A6') d = lerp(.5, .06, ramp(t, SH.A6[0] + .5, SH.A6[1]));
      const tgt = kind === 'A6' ? uc.localToWorld(V(-.05 * ramp(t, SH.A6[0] + .5, SH.A6[1]), 0, 0)) : c;
      place(camA, tgt.clone().add(n.multiplyScalar(d)), tgt);
      const ra = uc.localToWorld(V(-.064, -.013, 0)), rb = uc.localToWorld(V(.072, -.01, 0));
      if (kind === 'A3') out.rings.push({ p: ra, r: 150, o: fadeIn(t, EV.ringA, .2), s: pop(t, EV.ringA) });
      else { out.rings.push({ p: ra, r: 150 * (.5 / d), o: 1 - ramp(t, SH.A6[1] - .4, SH.A6[1]), s: 1 }); out.rings.push({ p: rb, r: 150 * (.5 / d), o: 1 - ramp(t, SH.A6[1] - .4, SH.A6[1]), s: 1 }); }
      out.flash = clamp((t - (SH.A6[1] - .25)) / .25) * (kind === 'A6' ? 1 : 0);
    } else if (kind === 'A4') {
      const N = kids.nili, hp = N.root.position;
      place(camA, V(hp.x + .05, .72, hp.z + 1.25), V(hp.x, .62, hp.z));
      out.bubbles.push({ id: 'L3', who: 'nili' });
    } else if (kind === 'A5') {
      const P = kids.eitan.root.position;
      place(camA, V(P.x + .15, .95, P.z + 1.55), V(P.x + .05, .78, P.z));
      out.bubbles.push({ id: 'L4', who: 'eitan' });
    }
    return out;
  } };
}

// --- B: inside the belly
function bellyShot() {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 24), new THREE.MeshBasicMaterial({ map: T.belly, side: THREE.BackSide })); scene.add(dome);
  lights(scene, V(1, 5, 4), 2.0);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), M({ color: 0xffc2b8, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), M({ color: 0x9fd98a, roughness: .9 })); pitch.rotation.x = -Math.PI / 2; pitch.position.y = .005; pitch.scale.set(1.2, .8, 1); pitch.receiveShadow = true; scene.add(pitch);
  const line = new THREE.Mesh(new THREE.RingGeometry(.48, .52, 48), M({ color: 0xffffff })); line.rotation.x = -Math.PI / 2; line.position.y = .01; scene.add(line);
  // goal behind
  const gm = M({ color: 0xffffff });
  const goal = new THREE.Group(); goal.position.set(0, 0, -1.6); scene.add(goal);
  for (const x of [-.7, .7]) { const p = capsule(.03, .6, gm); p.position.set(x, .33, 0); goal.add(p); }
  const bar = capsule(.03, 1.4, gm); bar.rotation.z = Math.PI / 2; bar.position.y = .66; goal.add(bar);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .66, 14, 7), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .6 })); net.position.set(0, .33, -.15); goal.add(net);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshBasicMaterial({ map: banner(TXT.team), transparent: true })); ban.position.set(0, 1.15, -1.7); scene.add(ban);
  // floating bubbles
  const bubbles = []; const r = rng(8);
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.04 + r() * .1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .35, roughness: .1 }));
    b.userData = { x: (r() - .5) * 5, y: r() * 3, z: -2 + r() * 2.5, s: .1 + r() * .25, p: r() * 6 }; scene.add(b); bubbles.push(b);
  }
  const b1 = makeBaby(1), b2 = makeBaby(2); scene.add(b1.g, b2.g);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.09, 24, 18), M({ map: T.ball, roughness: .5 })); ball.castShadow = true; scene.add(ball);
  const camera = cam(40);
  const s0 = SH.B[0], s1 = SH.B[1];
  const babyRun = (B, ph, amp) => { B.limbs.ll.rotation.x = Math.sin(ph) * .8 * amp; B.limbs.rl.rotation.x = -Math.sin(ph) * .8 * amp;
    B.limbs.la.rotation.x = -Math.sin(ph) * .7 * amp; B.limbs.ra.rotation.x = Math.sin(ph) * .7 * amp; B.g.position.y = Math.abs(Math.sin(ph)) * .03 * amp; };
  return { scene, camera, update(t) {
    const lt = t - s0;
    bubbles.forEach(b => { const u = b.userData; b.position.set(u.x + Math.sin(t * .7 + u.p) * .1, (u.y + t * u.s) % 3.2, u.z); });
    // baby 1 dribbles in from the left, passes to baby 2, who turns and kicks to camera
    const dr = clamp(lt / (EV.pass - s0));
    const x1 = lerp(-1.0, -.32, dr);
    b1.g.position.set(x1, 0, .25); b1.g.rotation.y = dr < 1 ? Math.PI / 2 : lerp(Math.PI / 2, .4, ramp(t, EV.pass, EV.pass + .6));
    babyRun(b1, lt * 12, dr < 1 ? 1 : 0); if (dr >= 1) { const ch = Math.sin((t - EV.pass) * 9); b1.limbs.la.rotation.z = 2.4 + ch * .3; b1.limbs.ra.rotation.z = -2.4 - ch * .3; }
    b2.g.position.set(.3, 0, .1);
    const turn = ramp(t, EV.pass + .5, EV.kick - .6);
    b2.g.rotation.y = lerp(-Math.PI / 2, 0, turn);
    if (t < EV.pass + .5) { const w = Math.sin(t * 8); b2.limbs.la.rotation.z = 2.3 + w * .4; b2.limbs.ra.rotation.z = -2.3 - w * .4; babyRun(b2, t * 6, .3); }
    else { b2.limbs.la.rotation.z = .3; b2.limbs.ra.rotation.z = -.3; babyRun(b2, 0, 0);
      const wind = ramp(t, EV.kick - .45, EV.kick - .1), kick = rampO(t, EV.kick - .1, EV.kick + .05);
      b2.limbs.rl.rotation.x = lerp(0, .9, wind) - kick * 2.0; }
    [b1, b2].forEach((B, i) => { B.head.rotation.z = Math.sin(t * 3 + i) * .12; B.eyes.forEach(e => e.scale.y = ((t + i) % 2.7) < .1 ? .15 : 1.2); });
    // ball
    let bp;
    if (t < EV.pass) bp = V(x1 + .2, .09, .3);
    else if (t < EV.pass + .7) bp = vl(V(-.12, .09, .3), V(.3, .09, .36), rampO(t, EV.pass, EV.pass + .7));
    else if (t < EV.kick) bp = V(.3, .09, .36);
    else { const k = clamp((t - EV.kick) / .65); bp = vl(V(.3, .09, .36), camera.position.clone().add(V(0, -.05, -.25)), k * k * (3 - 2 * k)); bp.y += Math.sin(k * Math.PI) * .25; }
    ball.position.copy(bp); ball.rotation.set(t * 6, t * 4, 0);
    const k2 = ramp(t, s0, EV.pass);
    place(camera, vl(V(-.3, .62, 3.1), V(.05, .58, 2.85), k2), vl(V(-.35, .42, 0), V(.02, .42, 0), k2));
    return { flash: Math.max(clamp(1 - lt / .35), clamp((t - (s1 - .25)) / .25)) };
  } };
}

// --- C: the reveal
function revealShot() {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 24), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide })); scene.add(dome);
  lights(scene, V(1, 5, 5), 2.2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), M({ color: 0xdcecff })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const P = { ella: makePerson('ella'), eitan: makePerson('eitan'), nili: makePerson('nili') };
  P.ella.root.position.set(.48, 0, 0); P.eitan.root.position.set(-.48, 0, 0); P.nili.root.position.set(0, 0, .25);
  Object.values(P).forEach(p => scene.add(p.root));
  // balloons
  const balloons = [];
  for (const [x, c] of [[-.85, 0x4f8fe8], [.85, 0x6fb0ff]]) {
    const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 18), M({ color: c, roughness: .25 })); b.scale.y = 1.18; g.add(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, 1.0), M({ color: 0xffffff })); s.position.y = -.7; g.add(s);
    g.position.set(x, 1.75, -.3); scene.add(g); balloons.push(g);
  }
  // confetti
  const conf = []; const r = rng(17), cols = [0x4f8fe8, 0xffffff, 0xffd84d, 0x8fd0ff, 0x7bd67b];
  for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.035, .02), new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide }));
    m.userData = { x: (r() - .5) * 2.4, y: 2.6 + r() * 2, z: -.6 + r() * 1.4, v: .35 + r() * .4, s: r() * 9, p: r() * 6 }; scene.add(m); conf.push(m); }
  const camera = cam(40); place(camera, V(0, 1.15, 3.6), V(0, 1.05, 0));
  return { scene, camera, update(t) {
    const lt = t - SH.C[0];
    for (const [n, p] of Object.entries(P)) {
      const off = n === 'nili' ? .15 : n === 'eitan' ? .3 : 0;
      const j = Math.max(0, Math.sin((lt + off) * 6.5)), jump = j * (n === 'nili' ? .1 : .14);
      p.root.position.y = jump;
      const arm = 2.6 + Math.sin(lt * 6.5 + off) * .2;
      p.pose({ lSh: [0, 0, arm], rSh: [0, 0, -arm], lEl: [0, 0, .2], rEl: [0, 0, -.2], lKn: [j * .5, 0, 0], rKn: [j * .5, 0, 0], lHip: [-j * .3, 0, 0], rHip: [-j * .3, 0, 0], head: [-.12, 0, 0] });
      p.face(t, Math.max(talking(t, n), .45), off);
    }
    balloons.forEach((b, i) => { b.position.y = 1.75 + Math.sin(t * 1.5 + i) * .05; b.rotation.z = Math.sin(t * 1.2 + i) * .08; });
    conf.forEach(m => { const u = m.userData; const y = u.y - lt * u.v * 1.6; m.position.set(u.x + Math.sin(lt * 2 + u.p) * .1, y, u.z); m.rotation.set(lt * u.s, lt * u.s * .7, 0); m.visible = y > 0; });
    return { cards: [{ text: TXT.title, cls: 't1', y: 300, s: pop(t, SH.C[0] + .2, .5) }, { text: TXT.due, cls: 't2', y: 470, s: pop(t, SH.C[0] + .9, .5) }],
      flash: clamp(1 - lt / .4) };
  } };
}

// --- D: the whole family in the garden
function familyShot() {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 24), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide })); scene.add(dome);
  lights(scene, V(2, 6, 5), 2.3);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M({ map: T.grass, roughness: .95 })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const house = new THREE.Mesh(new THREE.BoxGeometry(6, 3, .2), M({ map: T.siding })); house.position.set(1.5, 1.5, -4.5); scene.add(house);
  const tm = M({ color: 0x2f6b3a, roughness: .95 }), tm2 = M({ color: 0x3e8a46, roughness: .95 }), trunk = M({ color: 0x5a4030 });
  [[-2.2, -2.2, 1.3], [-.9, -3.0, 1.6], [1.0, -2.8, 1.5], [2.4, -2.0, 1.1], [-3.2, -1.2, 1.0], [3.2, -1.0, .9]].forEach(([x, z, s], i) => {
    const tr = capsule(.08 * s, .8 * s, trunk); tr.position.set(x, .45 * s, z); scene.add(tr);
    const c = new THREE.Mesh(i % 2 ? new THREE.SphereGeometry(.75 * s, 20, 14) : new THREE.ConeGeometry(.8 * s, 2.0 * s, 20), i % 2 ? tm2 : tm);
    c.position.set(x, (i % 2 ? 1.2 : 1.5) * s, z); c.castShadow = true; scene.add(c);
  });
  // clothesline with two onesies
  const line = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 2.4), M({ color: 0xffffff })); line.rotation.z = Math.PI / 2; line.position.set(0, 2.5, -.9); scene.add(line);
  const onesies = [1, 2].map((n, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.38, .38), new THREE.MeshStandardMaterial({ map: onesie(n), transparent: true, side: THREE.DoubleSide, roughness: .9 }));
    m.position.set(i ? .32 : -.32, 2.31, -.88); scene.add(m); return m; });
  const F = { alon: makePerson('alon'), dina: makePerson('dina'), ella: makePerson('ella'), eitan: makePerson('eitan'), nili: makePerson('nili') };
  F.dina.root.position.set(-.32, 0, -.35); F.alon.root.position.set(.36, 0, -.4);
  F.eitan.root.position.set(-.5, 0, .2); F.nili.root.position.set(-.02, 0, .32); F.ella.root.position.set(.44, 0, .22);
  Object.values(F).forEach(p => scene.add(p.root));
  // a small bump for Dina
  const bump = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), F.dina.torso.children[0].material); bump.scale.set(1, 1, .7); bump.position.set(0, .08, .1); F.dina.torso.add(bump);
  const camera = cam(38);
  return { scene, camera, update(t) {
    const lt = t - SH.D[0];
    F.dina.pose({ rSh: [-.5, 0, .25], rEl: [-1.3, 0, 0], lSh: [-.2, 0, .35], lEl: [-.6, 0, 0], head: [0, .1, .06] });
    F.alon.pose({ lSh: [-.3, 0, -.25], lEl: [-.9, 0, 0], rSh: [-.1, 0, .2], head: [0, -.08, -.04] });
    F.ella.pose({ lSh: [0, 0, .1], rSh: [0, .0, -.1], head: [0, 0, .05] });
    F.eitan.pose({ lSh: [.1, 0, .9], lEl: [-1.4, 0, 0], head: [0, 0, -.12] });
    F.nili.pose({ lSh: [-.3, 0, -.1], rSh: [-.3, 0, .1], lEl: [-.5, 0, 0], rEl: [-.5, 0, 0] });
    // the kids cheer on their line
    const ch = clamp(Math.min((t - LN.L6.start + .1) / .3, (LN.L6.end + .5 - t) / .3));
    if (ch > 0) for (const n of ['ella', 'eitan', 'nili']) { const p = F[n]; p.arms.l.sh.rotation.z = lerp(p.arms.l.sh.rotation.z, 2.5, ch); p.arms.r.sh.rotation.z = lerp(p.arms.r.sh.rotation.z, -2.5, ch); p.arms.l.sh.rotation.x = 0; p.arms.r.sh.rotation.x = 0; p.arms.l.el.rotation.x = 0; p.arms.r.el.rotation.x = 0; p.root.position.y = Math.max(0, Math.sin((t - LN.L6.start) * 7)) * .06 * ch; }
    for (const [n, p] of Object.entries(F)) p.face(t, talking(t, n), n.length * .4);
    onesies.forEach((m, i) => m.rotation.z = Math.sin(t * 2 + i * 2) * .06);
    const k = ramp(t, SH.D[0], SH.D[1] - 1);
    place(camera, vl(V(0, 1.35, 4.5), V(0, 1.38, 4.0), k), V(0, 1.32, 0));
    const lo = fadeIn(t, EV.love, .5);
    return { bubbles: [{ id: 'L6', who: 'nili', anchor: F.nili, xy: [540, 760] }], cards: lo > 0 ? [{ text: TXT.love, cls: 'panel', y: 40, s: lo, sub: TXT.names }] : [] };
  } };
}

// ============================================================ EDIT
const SHOTS = [
  ['A1', roomShot('A1')], ['A2', roomShot('A2')], ['A3', roomShot('A3')], ['A4', roomShot('A4')], ['A5', roomShot('A5')], ['A6', roomShot('A6')],
  ['B', bellyShot()], ['C', revealShot()], ['D', familyShot()],
].map(([k, s]) => ({ start: SH[k][0], end: SH[k][1], shot: s, key: k }));

// ============================================================ OVERLAY
const ov = document.getElementById('ov');
function project(p, camera) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z < 1]; }
function overlay(t, out, camera) {
  let h = '';
  for (const b of out.bubbles || []) {
    const L = LN[b.id]; if (!L) continue;
    const o = Math.min(clamp((t - L.start + .15) / .15), clamp((L.end + .9 - t) / .2));
    if (o <= 0) continue;
    const who = b.anchor || kids[b.who];
    let [x, y] = b.xy || project(who.headWorld(1.6), camera);
    if (!b.xy) y = clamp(y - 30, 330, 1500);
    const bx = clamp(x, 420, W - 420), tail = clamp(50 + (x - bx) / 7.6, 12, 88);
    const s = pop(t, L.start - .15, .3);
    h += `<div class="bubble" dir="${LANG === 'he' ? 'rtl' : 'ltr'}" style="left:${bx}px;top:${y}px;opacity:${o};--tail:${tail}%;transform:translate(-50%,-100%) scale(${s})">${TXT[b.id]}</div>`;
  }
  for (const r of out.rings || []) { if (r.o <= 0) continue; const [x, y] = project(r.p, camera); h += `<div class="ring" style="left:${x}px;top:${y}px;width:${r.r * 2}px;height:${r.r * 2}px;opacity:${r.o};transform:translate(-50%,-50%) scale(${r.s})"></div>`; }
  for (const c of out.cards || []) if (c.s > 0) h += c.cls === 'panel'
    ? `<div class="panel" dir="${LANG === 'he' ? 'rtl' : 'ltr'}" style="top:${c.y}px;opacity:${c.s}"><div>${c.text}</div><b>${c.sub}</b></div>`
    : `<div class="big ${c.cls}" dir="${LANG === 'he' ? 'rtl' : 'ltr'}" style="top:${c.y}px;transform:scale(${c.s})">${c.text}</div>`;
  ov.innerHTML = h;
  document.getElementById('flash').style.opacity = clamp(out.flash || 0);
  let f = clamp(1 - t / .5);
  f = Math.max(f, clamp((t - (DURATION - 1.2)) / 1.0));
  for (const k of ['A2', 'A4', 'A5', 'D']) f = Math.max(f, 1 - Math.abs(t - SH[k][0]) / .18);
  document.getElementById('fade').style.opacity = clamp(f) * (1 - (out.flash ? 1 : 0));
}
window.renderAt = (t) => {
  const s = SHOTS.find(b => t >= b.start && t < b.end) || SHOTS[SHOTS.length - 1];
  const out = s.shot.update(t) || {};
  renderer.render(s.shot.scene, s.shot.camera);
  overlay(t, out, s.shot.camera);
};
window.DURATION = DURATION;
for (const b of SHOTS) { b.shot.update(b.start + .01); renderer.compile(b.shot.scene, b.shot.camera); }
if (q.has('t')) window.renderAt(parseFloat(q.get('t')));
else if (!navigator.webdriver) {
  const audio = new Audio(`audio/mix_${LANG}.wav`); window.renderAt(0);
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); });
  const loop = () => { if (!audio.paused) window.renderAt(audio.currentTime); requestAnimationFrame(loop); }; loop();
}
window.ready = true;
