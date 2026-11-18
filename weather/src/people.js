// Family characters (shared look with the twins announcement). Procedural cartoon figures.
import * as THREE from 'three';
const LANG = 'en';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
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

export { makePerson, walk, T, M, capsule, SKIN };
