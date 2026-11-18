// How Weather Works: a 3D explainer for kids. Every frame is a pure function of time t.
import * as THREE from 'three';
import { makePerson, M, capsule } from './people.js';
import { earthTexture } from './earth.js';

const W = 1920, H = 1080;
const TL = await (await fetch('audio/timeline.json')).json();
const S = Object.fromEntries(TL.scenes.map(s => [s.scene, s]));
const L = (sc, i) => S[sc].lines[i];
const DURATION = TL.duration;
await document.fonts.load('700 40px Fredoka'); await document.fonts.load('600 40px Fredoka'); await document.fonts.ready;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const ramp = (x, a, b) => easeIO(clamp((x - a) / (b - a)));
const fadeIn = (t, a, d = .35) => clamp((t - a) / d);
const win = (t, a, b, d = .35) => Math.min(fadeIn(t, a, d), clamp((b - t) / d));
const pop = (t, a) => { const x = clamp((t - a) / .45); return x <= 0 ? 0 : 1 + Math.sin(x * Math.PI) * .18 * (1 - x); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const vl = (a, b, t) => a.clone().lerp(b, t);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = hex => new THREE.Color(hex);
const talking = (t, who) => {
  for (const s of TL.scenes) for (const l of s.lines) if ((l.who === who || (l.who === 'all' && who !== 'narrator')) && t > l.start && t < l.end)
    return .35 + .65 * Math.abs(Math.sin((t - l.start) * 14)) * Math.min(1, (l.end - t) * 6);
  return 0;
};

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- textures ----------
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const GLOW = tex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
const GRASS = tex(256, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#5fae3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${95 + r() * 20},55%,${35 + r() * 20}%)`; g.fillRect(r() * w, r() * h, 2, 6); } }, [14, 14]);
const FROST = tex(256, 256, (g, w, h) => { const r = rng(4); g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(235,245,255,.55)'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${.5 + r() * .5})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, [14, 14]);
const SIDING = tex(256, 256, (g, w, h) => { g.fillStyle = '#eef1f4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4); }, [5, 3]);
const GRID = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9b2a2'; g.lineWidth = 3; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
const WOOD = tex(512, 512, (g, w, h) => { const r = rng(2); g.fillStyle = '#c9925e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(90,50,20,.15)'; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + r() * 8, w * .6, y - r() * 8, w, y); g.stroke(); } }, [2, 2]);
const RIVER = tex(64, 256, (g, w, h) => { g.fillStyle = '#3d8fe0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.5)'; for (let y = 0; y < h; y += 32) g.fillRect(8 + (y % 64 ? 20 : 0), y, 18, 6); }, [1, 6]);
const EARTH_TEX = await earthTexture();

// ---------- building blocks ----------
const skyMat = () => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: C('#4f9ff0') }, bot: { value: C('#cfe8ff') } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.2 + .05, 0., 1.); gl_FragColor = vec4(mix(bot, top, h), 1.); \n#include <colorspace_fragment>\n}' });
function setSky(m, top, bot) { m.uniforms.top.value.set(top); m.uniforms.bot.value.set(bot); }
function starsMesh(n = 1200, R = 80) {
  const r = rng(5), p = [];
  for (let i = 0; i < n; i++) { const u = r() * .95 + .05, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.push(s * Math.cos(th) * R, u * R, s * Math.sin(th) * R); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
}
function sunMesh(r = .5) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffe36b, toneMapped: false })));
  const s1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffd23f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 })); s1.scale.setScalar(r * 6); g.add(s1);
  return g;
}
function cloudMesh(seed = 1, scale = 1, color = 0xffffff) {
  const g = new THREE.Group(), r = rng(seed), mat = M({ color, roughness: 1 });
  const puffs = [[0, 0, 0, 1], [.9, -.1, .1, .8], [-.9, -.15, 0, .75], [.4, .45, 0, .75], [-.4, .4, .1, .7], [1.6, -.3, 0, .55], [-1.6, -.3, .1, .55]];
  for (const [x, y, z, s] of puffs) { const m = new THREE.Mesh(new THREE.SphereGeometry(s * (.9 + r() * .2), 24, 18), mat); m.position.set(x, y, z); g.add(m); }
  g.scale.setScalar(scale); g.userData.mat = mat; return g;
}
function lights(scene, pos = V(3, 6, 4), int = 2.4) {
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x8a9a7a, 1.3); scene.add(hemi);
  const d = new THREE.DirectionalLight(0xffffff, int); d.position.copy(pos); d.castShadow = true; d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 40 }); d.shadow.bias = -.0005; scene.add(d);
  return { hemi, d };
}
function scarf(P, color) {
  const r = P.spec.headR, m = new THREE.Mesh(new THREE.TorusGeometry(r * .62, r * .2, 10, 24), M({ color })); m.rotation.x = Math.PI / 2; m.position.y = .02; P.chest.add(m);
  const tail = capsule(r * .14, r * .9, M({ color })); tail.position.set(r * .3, -r * .45, r * .45); P.chest.add(tail);
}
function garden({ frost = 0, puddle = false } = {}) {
  const scene = new THREE.Scene();
  const sky = skyMat(); scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), sky));
  const stars = starsMesh(); scene.add(stars);
  const L = lights(scene);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), M({ map: GRASS, roughness: .95 })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: FROST, transparent: true, opacity: frost, depthWrite: false, roughness: .6 })); fr.rotation.x = -Math.PI / 2; fr.position.y = .004; fr.receiveShadow = true; scene.add(fr);
  const house = new THREE.Group(); house.position.set(-3.2, 0, -5); scene.add(house);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3), M({ map: SIDING })); wall.position.y = 1.3; wall.castShadow = wall.receiveShadow = true; house.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.4, 4), M({ color: 0x8a4b3c })); roof.position.y = 3.3; roof.rotation.y = Math.PI / 4; roof.scale.z = .8; roof.castShadow = true; house.add(roof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.8, .7), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0xffd27a, emissiveIntensity: 0 })); win.position.set(.8, 1.5, 1.51); house.add(win);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.3), M({ color: 0x5b7fa6 })); door.position.set(-.7, .65, 1.51); house.add(door);
  const trees = [];
  [[3.2, -4.5, 1.3], [5, -6, 1.6], [-6.5, -6, 1.5], [1.2, -7.5, 1.4]].forEach(([x, z, s], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const tr = capsule(.12 * s, 1.1 * s, M({ color: 0x5a4030 })); tr.position.y = .6 * s; tr.castShadow = true; g.add(tr);
    const cm = M({ color: 0x3e8a46, roughness: .95 }), crown = new THREE.Group(); g.add(crown);
    for (const [cx, cy, cz, cr] of [[0, 1.6, 0, .75], [.45, 1.35, .1, .55], [-.45, 1.4, -.1, .55], [0, 2.05, 0, .5]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(cr * s, 20, 14), cm); c.position.set(cx * s, cy * s, cz * s); c.castShadow = true; crown.add(c); }
    trees.push({ g, crown, cm });
  });
  let pud = null;
  if (puddle) { pud = new THREE.Mesh(new THREE.CircleGeometry(.7, 48), new THREE.MeshStandardMaterial({ color: 0x5aa6e8, roughness: .1, metalness: .2 })); pud.rotation.x = -Math.PI / 2; pud.scale.set(1.4, 1, 1); pud.position.set(1.1, .006, .6); scene.add(pud); }
  const sun = sunMesh(.9); scene.add(sun);
  return { scene, sky, stars, L, grass, fr, house, win, trees, sun, pud };
}
function kidsTrio(scene, winter = false) {
  const K = { ella: makePerson('ella'), eitan: makePerson('eitan'), nili: makePerson('nili') };
  K.eitan.root.position.set(-.55, 0, .1); K.nili.root.position.set(0, 0, .3); K.ella.root.position.set(.55, 0, .1);
  if (winter) { scarf(K.ella, 0xd94a5a); scarf(K.eitan, 0x3a7bd5); scarf(K.nili, 0xf2a93b); }
  Object.values(K).forEach(k => scene.add(k.root)); return K;
}
const cam = (fov = 38) => new THREE.PerspectiveCamera(fov, W / H, .05, 400);
function place(c, pos, look) { c.position.copy(pos); c.lookAt(look); c.updateMatrixWorld(true); }
function dots(n, color = 0x9fd8ff, size = 9) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, color, transparent: true, opacity: .9, depthWrite: false, map: GLOW, alphaTest: .05 }));
}
function setDots(p, fn) { const a = p.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const v = fn(i); a.setXYZ(i, v.x, v.y, v.z); } a.needsUpdate = true; }
function crystal(size = .05, color = 0xffffff) {   // a little six-armed ice crystal
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, emissive: 0xbfe6ff, emissiveIntensity: .5, roughness: .3 });
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(size * 2, size * .18, size * .18), m); b.rotation.z = k * Math.PI / 3; g.add(b); }
  return g;
}
function kidsPose(K, t, cheer = 0) {
  for (const [n, P] of Object.entries(K)) {
    const tk = talking(t, n), a = clamp(tk * 3);
    const j = cheer ? Math.max(0, Math.sin((t * 6.5) + n.length)) * cheer : 0;
    P.root.position.y = j * .08;
    const up = Math.max(cheer, n === 'nili' ? 0 : 0);
    P.pose({ lSh: [lerp(-.2 * a, 0, up), 0, lerp(.12 + a * .5, 2.6, up)], rSh: [0, 0, lerp(-.12, -2.6, up)], lEl: [lerp(-.15 - a * .8, 0, up), 0, 0], head: [-.06, Math.sin(t * .7 + n.length) * .1, 0], lKn: [j * .4, 0, 0], rKn: [j * .4, 0, 0] });
    P.face(t, tk, n.length * .6);
  }
}

// ============================================================ SHOTS
function introShot() {
  const G = garden({ frost: 1 }); setSky(G.sky, '#7fb3e6', '#f3e2d8');
  G.sun.position.set(-14, 3.5, -30); G.L.d.position.set(-6, 3, 4); G.L.d.intensity = 1.8; G.L.d.color.set('#ffe2c0');
  const K = kidsTrio(G.scene, true);
  const camera = cam(36);
  return { scene: G.scene, camera, update(t) {
    kidsPose(K, t);
    const k = ramp(t, L('intro', 3).start - .3, S.intro.end);
    place(camera, vl(V(.1, 1.0, 3.3), V(.4, 1.8, 6.5), k), vl(V(0, .8, 0), V(0, 1.2, -1), k));
    return {};
  } };
}

function tiltShot() {
  const scene = new THREE.Scene(); scene.background = C('#070b20');
  const st = starsMesh(1500, 150); st.material.opacity = 1; st.material.size = 2; scene.add(st);
  const sun = sunMesh(1.6); sun.position.set(-6, 0, 0); scene.add(sun);
  const pl = new THREE.PointLight(0xffffff, 120, 0, 2); pl.position.set(-6, 0, 0); scene.add(pl); scene.add(new THREE.AmbientLight(0xffffff, .12));
  const tilt = new THREE.Group(); tilt.position.set(2.5, 0, 0); tilt.rotation.z = 23.44 * Math.PI / 180; scene.add(tilt);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.3, 64, 48), new THREE.MeshStandardMaterial({ map: EARTH_TEX, roughness: .8 })); tilt.add(earth);
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 3.6, 12), new THREE.MeshBasicMaterial({ color: 0xffc93c })); tilt.add(axis);
  const camera = cam(36); place(camera, V(-.8, .6, 9.5), V(-.8, 0, 0));
  return { scene, camera, update(t) {
    earth.rotation.y = t * .5;
    return { labels: [{ text: 'Tilted!', p: tilt.localToWorld(V(0, 1.95, 0)), o: fadeIn(t, L('tilt', 0).start + 1.2), cls: 'sun', s: pop(t, L('tilt', 0).start + 1.2) },
      { text: 'Sun', p: V(-5.2, -2.1, 0), o: 1, cls: 'sun' }], chapter: 'seasons', note: true };
  } };
}

function arcsShot() {
  const scene = new THREE.Scene();
  const sky = skyMat(); scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), sky));
  lights(scene, V(2, 8, 6), 1.6);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 64), M({ map: GRASS })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const hs = new THREE.Group(); scene.add(hs);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(.8, .55, .6), M({ map: SIDING })); wall.position.y = .28; wall.castShadow = true; hs.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.62, .35, 4), M({ color: 0x8a4b3c })); roof.position.y = .72; roof.rotation.y = Math.PI / 4; hs.add(roof);
  // sun paths (facing south: sunrise on the left, sunset on the right)
  const path = (Wd, Hm, D) => th => V(-Wd * Math.cos(th), Hm * Math.sin(th), -D * Math.sin(th) - .5);
  const summer = path(4.2, 3.3, 1.2), winter = path(2.9, 1.25, 1.6);
  const tube = (f, color) => { const pts = []; for (let i = 0; i <= 80; i++) pts.push(f(i / 80 * Math.PI));
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .035, 8), new THREE.MeshBasicMaterial({ color, transparent: true })); };
  const ts = tube(summer, 0xffb020), tw = tube(winter, 0x7cc4ff); scene.add(ts, tw);
  const sun = sunMesh(.28); scene.add(sun);
  const camera = cam(42); place(camera, V(0, 1.4, 6.8), V(0, 1.45, 0));
  const l1 = L('tilt', 1), l2 = L('tilt', 2);
  return { scene, camera, update(t) {
    const summerOn = t < l2.start - .2;
    const f = summerOn ? clamp((t - l1.start) / (l1.end - l1.start + .3)) : clamp((t - l2.start) / (l2.end - l2.start));
    sun.position.copy((summerOn ? summer : winter)(.05 + f * (Math.PI - .1)));
    ts.material.opacity = summerOn ? 1 : .35; tw.material.opacity = summerOn ? 0 : 1;
    setSky(sky, summerOn ? '#3f93ec' : '#86aed6', summerOn ? '#cfe8ff' : '#e6eef5');
    return { labels: [
      { text: 'Summer: high & long', p: summer(Math.PI / 2).add(V(0, .55, 0)), o: fadeIn(t, l1.start + 1.0), cls: 'warm', s: pop(t, l1.start + 1.0) },
      { text: 'Winter: low & short', p: winter(Math.PI / 2).add(V(0, -.55, 0)), o: fadeIn(t, l2.start + .6), cls: 'cool', s: pop(t, l2.start + .6) },
      { text: 'Sunrise', p: V(-3.6, .25, -.3), o: 1, cls: 'plain' }, { text: 'Sunset', p: V(3.6, .25, -.3), o: 1, cls: 'plain' }], chapter: 'seasons' };
  } };
}

function flashShot() {
  const scene = new THREE.Scene(); scene.background = C('#1b2036');
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const fill = new THREE.DirectionalLight(0xbfd0ff, .5); fill.position.set(0, 5, 5); scene.add(fill);
  const table = new THREE.Mesh(new THREE.BoxGeometry(9, .2, 5), M({ map: WOOD })); table.position.y = -.1; table.receiveShadow = true; scene.add(table);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.8), M({ map: GRID, roughness: .9 })); board.rotation.x = -Math.PI / 2; board.position.y = .01; board.receiveShadow = true; scene.add(board);
  GRID.repeat.set(1, .5); GRID.wrapS = GRID.wrapT = THREE.RepeatWrapping;
  const mk = (pos, target) => {
    const g = new THREE.Group(); g.position.copy(pos); scene.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.16, .13, 1.0, 24), M({ color: 0xe0483d, roughness: .4 })); body.position.y = .55; g.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.24, .17, .25, 24), M({ color: 0x333a44, roughness: .3 })); head.position.y = .05; g.add(head);
    const lensM = new THREE.MeshBasicMaterial({ color: 0x555555 }); const lens = new THREE.Mesh(new THREE.CircleGeometry(.21, 24), lensM); lens.rotation.x = Math.PI / 2; lens.position.y = -.08; g.add(lens);
    g.lookAt(target); g.rotateX(-Math.PI / 2);
    const sp = new THREE.SpotLight(0xfff2c8, 0, 0, .24, .25, 0); sp.position.copy(pos); sp.target.position.copy(target); scene.add(sp, sp.target);
    return { g, sp, lensM };
  };
  const A = mk(V(-1.9, 2.2, 0), V(-1.9, 0, 0)), B = mk(V(3.6, 1.6, 0), V(1.9, 0, 0));
  const camera = cam(36); place(camera, V(0, 5.2, 7.6), V(0, .7, .2));
  const l1 = L('flash', 1), l2 = L('flash', 2);
  return { scene, camera, update(t) {
    const a = fadeIn(t, l1.start + .3, .25), b = fadeIn(t, l2.start + .3, .25);
    A.sp.intensity = 1.7 * a; B.sp.intensity = 1.7 * b;
    A.lensM.color.set(a > .5 ? 0xfff6d0 : 0x555555); B.lensM.color.set(b > .5 ? 0xfff6d0 : 0x555555);
    return { labels: [
      { text: 'Small & strong = SUMMER', p: V(-1.9, 0, 1.35), o: fadeIn(t, l1.start + 2.6), cls: 'warm', s: pop(t, l1.start + 2.6) },
      { text: 'Spread out & weak = WINTER', p: V(1.9, 0, 1.55), o: fadeIn(t, l2.start + 2.4), cls: 'cool', s: pop(t, l2.start + 2.4) },
      { text: 'Straight down', p: V(-1.9, 2.75, 0), o: fadeIn(t, l1.start), cls: 'plain' },
      { text: 'At a slant', p: V(3.6, 2.2, 0), o: fadeIn(t, l2.start), cls: 'plain' }], chapter: 'seasons' };
  } };
}

function nightShot() {
  const G = garden(); const K = null;
  const sc = S.night, l = sc.lines;
  const heat = [], sunArrows = [];
  const hm = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, toneMapped: false });
  const squig = (() => { const pts = []; for (let i = 0; i <= 30; i++) pts.push(V(Math.sin(i / 30 * Math.PI * 3) * .12, i / 30 * .9, 0)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .035, 6); })();
  const r = rng(12);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(squig, hm.clone()); m.userData = { x: -5 + i * .75 + r() * .3, z: -1 - r() * 2, p: r() }; G.scene.add(m); heat.push(m); }
  const am = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, toneMapped: false });
  for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 8), am); const h = new THREE.Mesh(new THREE.ConeGeometry(.14, .3, 12), am); h.position.y = -.75; h.rotation.x = Math.PI; g.add(c, h); g.userData = { x: -4 + i * 1.6, p: i * .17 }; G.scene.add(g); sunArrows.push(g); }
  const cloud = new THREE.Group(); G.scene.add(cloud);
  for (let i = 0; i < 5; i++) { const c = cloudMesh(30 + i, 1.1, 0xc8ccd8); c.position.set(-7 + i * 3.4, 0, (i % 2) * .6); cloud.add(c); }
  const camera = cam(42); place(camera, V(0, 2.0, 9), V(0, 2.6, 0));
  return { scene: G.scene, camera, update(t) {
    // time of day
    const set = ramp(t, l[1].start - .3, l[1].start + 2.2), dawn = ramp(t, l[4].start + 1.2, l[4].end + 1.0);
    const night = set * (1 - dawn * .6);
    setSky(G.sky, '#' + C('#3f93ec').lerp(C('#0a1030'), night).getHexString(), '#' + C('#cfe8ff').lerp(C('#1d2b58'), night).lerp(C('#f2a07a'), dawn * .7).getHexString());
    G.stars.material.opacity = clamp(night * 1.3 - .3) * (1 - dawn);
    const sa = lerp(.35, 1.0, set) * (1 - dawn) + dawn * -.02;
    G.sun.position.set(lerp(0, 16, set) * (1 - dawn) + dawn * -16, lerp(12, -2, set) * (1 - dawn) + dawn * .8, -30);
    G.sun.visible = G.sun.position.y > -1;
    G.L.d.position.copy(G.sun.position).normalize().multiplyScalar(10); G.L.d.intensity = lerp(2.4, .05, night) + dawn * .4;
    G.L.hemi.intensity = lerp(1.3, .25, night) + dawn * .2; G.L.hemi.color.set(night > .5 ? 0x8fa6ff : 0xfff4e6);
    G.win.material.emissiveIntensity = night * 1.5;
    // sunlight arrows (day), heat squiggles (night)
    sunArrows.forEach(g => { const u = g.userData, ph = ((t * .6 + u.p) % 1); g.position.set(u.x, 6 - ph * 5, -1); g.children.forEach(m => m.material.opacity = (1 - set) * Math.sin(ph * Math.PI)); });
    const cl = ramp(t, l[3].start - .5, l[3].start + 1.5) * (1 - ramp(t, l[4].start + .5, l[4].start + 2.5));
    cloud.position.set(lerp(-18, 0, cl), 5.2, -3); cloud.visible = cl > 0.01;
    heat.forEach(m => { const u = m.userData, ph = (t * .35 + u.p) % 1;
      let y = ph * 6.5; let o = set * (1 - dawn) * Math.sin(ph * Math.PI);
      if (cl > .5 && y > 4.2) { y = 8.4 - y; m.rotation.z = Math.PI; } else m.rotation.z = 0;
      m.position.set(u.x, y, u.z); m.material.opacity = o; m.visible = o > .01; });
    const temp = .8 - .18 * set - .32 * ramp(t, l[2].start, l[3].start) - .08 * ramp(t, l[4].start, l[4].end) + .12 * ramp(t, l[4].end + .3, l[4].end + 1.5);
    const labels = [];
    labels.push({ text: 'Sunlight warms the ground', xy: [960, 160], o: win(t, l[0].start + .4, l[1].start + .5), cls: 'sun' });
    labels.push({ text: 'Warmth floats up', xy: [960, 160], o: win(t, l[1].start + 1.6, l[3].start), cls: 'warm' });
    labels.push({ text: 'Clouds = a blanket', xy: [960, 140], o: win(t, l[3].start + 1.2, l[4].start + .6), cls: 'cool' });
    labels.push({ text: 'Coldest: just before sunrise', xy: [960, 160], o: fadeIn(t, l[4].start + 1.5), cls: 'cool', s: pop(t, l[4].start + 1.5) });
    return { labels, chapter: 'night', thermo: { level: temp } };
  } };
}

function vaporShot() {
  const G = garden({ puddle: true }); G.sun.position.set(-10, 14, -30); G.L.d.position.set(-4, 8, 4);
  const K = kidsTrio(G.scene); K.eitan.root.position.set(-1.1, 0, .2); K.nili.root.position.set(-.5, 0, .45); K.ella.root.position.set(.05, 0, .25);
  const n = 220, P = dots(n), r = rng(9), d = []; for (let i = 0; i < n; i++) d.push({ x: r(), z: r(), p: r(), s: .4 + r() * .4, w: r() * 6 }); G.scene.add(P);
  const camera = cam(38); const l = S.vapor.lines;
  return { scene: G.scene, camera, update(t) {
    kidsPose(K, t);
    const spread = ramp(t, l[2].start, l[2].start + 2.5), on = fadeIn(t, l[1].start + 1.0, .8);
    setDots(P, i => { const u = d[i], ph = (t * .12 * u.s + u.p) % 1;
      const x0 = 1.1 + (u.x - .5) * 1.6, z0 = .6 + (u.z - .5) * 1.1;
      const x = lerp(x0, -2.5 + u.x * 5.5, spread * ph), z = lerp(z0, -1 + u.z * 2.5, spread * ph);
      return V(x + Math.sin(t + u.w) * .08, .05 + ph * 2.6, z); });
    P.material.opacity = .85 * on;
    const k = ramp(t, l[0].start, l[1].start + 1);
    place(camera, vl(V(-.2, 1.3, 5.2), V(.3, 1.1, 4.0), k), V(.1, .8, 0));
    return { labels: [
      { text: 'Water vapor (invisible! we drew dots)', xy: [1250, 170], o: fadeIn(t, l[1].start + 2.2), cls: 'cool', s: pop(t, l[1].start + 2.2) },
      { text: 'Humidity = how much vapor is in the air', xy: [760, 270], o: fadeIn(t, l[2].start + 2.5), cls: 'cool', s: pop(t, l[2].start + 2.5) }], chapter: 'humidity' };
  } };
}

function jarsShot() {
  const scene = new THREE.Scene(); scene.background = C('#20284a');
  lights(scene, V(2, 6, 6), 1.8);
  const table = new THREE.Mesh(new THREE.BoxGeometry(8, .2, 3), M({ map: WOOD })); table.position.y = -.1; table.receiveShadow = true; scene.add(table);
  const mkJar = (x, tint) => {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 1.4), new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: .22, roughness: .05, depthWrite: false })); glass.position.y = 1.2; g.add(glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 })); edges.position.y = 1.2; g.add(edges);
    return g;
  };
  mkJar(-1.7, 0xffa060); mkJar(1.7, 0x7cc4ff);
  const warm = dots(70, 0xbfe6ff, 12), cold = dots(20, 0xbfe6ff, 12); scene.add(warm, cold);
  const drops = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6fb7ff, roughness: .1 })); m.scale.y = .7; m.position.set(1.7 - .8 + i * .2, .06, -.3 + (i % 3) * .3); scene.add(m); drops.push(m); }
  const r = rng(21), dw = Array.from({ length: 70 }, () => [r(), r(), r(), r() * .6 + .4, r() * .6 + .4, r() * .6 + .4]), dc = Array.from({ length: 20 }, () => [r(), r(), r(), r() * .3 + .15, r() * .3 + .15, r() * .3 + .15]);
  const tri = x => { x = x % 2; return x < 1 ? x : 2 - x; };
  const camera = cam(36); place(camera, V(0, 2.2, 6.5), V(0, 1.1, 0));
  return { scene, camera, update(t) {
    setDots(warm, i => { const u = dw[i]; return V(-1.7 - 1 + 2 * tri(u[0] * 2 + t * u[3]), .1 + 2.2 * tri(u[1] * 2 + t * u[4]), -.6 + 1.2 * tri(u[2] * 2 + t * u[5])); });
    setDots(cold, i => { const u = dc[i]; return V(1.7 - 1 + 2 * tri(u[0] * 2 + t * u[3]), .1 + 2.2 * tri(u[1] * 2 + t * u[4]), -.6 + 1.2 * tri(u[2] * 2 + t * u[5])); });
    drops.forEach((m, i) => m.scale.setScalar(clamp((t - S.jars.start - 1 - i * .25) / .3)));
    return { labels: [{ text: 'Warm air: lots of vapor', p: V(-1.7, 2.6, .7), o: 1, cls: 'warm' }, { text: 'Cold air: less vapor', p: V(1.7, 2.6, .7), o: 1, cls: 'cool' },
      { text: 'extra turns into drops', p: V(1.7, .55, .8), o: fadeIn(t, S.jars.start + 2.5), cls: 'plain' }], chapter: 'humidity' };
  } };
}

function glassShot() {
  const scene = new THREE.Scene(); scene.background = C('#f3e7d3');
  lights(scene, V(3, 6, 5), 2.0);
  const table = new THREE.Mesh(new THREE.BoxGeometry(8, .2, 4), M({ map: WOOD })); table.position.y = -.1; table.receiveShadow = true; scene.add(table);
  const R = .55, Hh = 1.5;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(R * .93, R * .88, Hh * .75, 40), new THREE.MeshStandardMaterial({ color: 0x9fd2ff, transparent: true, opacity: .55, roughness: .05 })); water.position.y = Hh * .375; scene.add(water);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .92, Hh, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .02, side: THREE.DoubleSide, depthWrite: false })); glass.position.y = Hh / 2; scene.add(glass);
  for (let i = 0; i < 4; i++) { const ic = new THREE.Mesh(new THREE.BoxGeometry(.26, .24, .26), new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: .8, roughness: .1 })); ic.position.set(Math.sin(i * 2.1) * .2, Hh * .72 + (i % 2) * .05, Math.cos(i * 2.1) * .2); ic.rotation.set(i, i * .7, 0); scene.add(ic); }
  const r = rng(33), drops = [], dm = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: .05, metalness: .1, transparent: true, opacity: .9 });
  for (let i = 0; i < 160; i++) { const a = (r() - .5) * 2.6, y = .1 + r() * (Hh - .25); const rr = R * (1 - (y / Hh) * .0) * (.92 + .08 * y / Hh) + .02;
    const m = new THREE.Mesh(new THREE.SphereGeometry(.014 + r() * .016, 10, 8), dm); m.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); m.scale.y = 1.3; m.userData.at = r(); scene.add(m); drops.push(m); }
  const vap = dots(90, 0x7fb8ff, 10), vd = Array.from({ length: 90 }, () => [r() * 6.28, r(), r()]); scene.add(vap);
  const camera = cam(32); place(camera, V(0, 1.2, 4.2), V(0, .8, 0));
  const l = S.glass.lines;
  return { scene, camera, update(t) {
    const grow = clamp((t - l[1].start + .5) / (l[1].end - l[1].start + 1));
    drops.forEach(m => m.visible = m.userData.at < grow);
    setDots(vap, i => { const u = vd[i], ph = (t * .25 + u[1]) % 1, rad = lerp(2.4, R + .05, ph); return V(Math.sin(u[0]) * rad, .15 + u[2] * 1.3, Math.cos(u[0]) * rad); });
    vap.material.opacity = .8 * fadeIn(t, l[1].start, .6);
    return { labels: [{ text: 'Cold glass', p: V(-.9, 1.7, 0), o: fadeIn(t, l[0].start + 1), cls: 'cool' }, { text: 'Tiny drops!', p: V(.95, .5, .3), o: fadeIn(t, l[1].start + 2.5), cls: 'cool', s: pop(t, l[1].start + 2.5) },
      { text: 'water vapor', p: V(-1.3, .5, .8), o: fadeIn(t, l[1].start + .8) * .9, cls: 'plain' }], chapter: 'frost' };
  } };
}

function frostShot() {
  const scene = new THREE.Scene();
  const sky = skyMat(); scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), sky));
  const st = starsMesh(900, 50); scene.add(st);
  const hemi = new THREE.HemisphereLight(0x8fa6ff, 0x203020, .9); scene.add(hemi);
  const moonL = new THREE.DirectionalLight(0xbfd0ff, 1.0); moonL.position.set(-3, 5, 4); scene.add(moonL);
  const sunL = new THREE.DirectionalLight(0xffc88a, 0); sunL.position.set(6, 1.5, 2); scene.add(sunL);
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), M({ color: 0x3d5a2e })); soil.rotation.x = -Math.PI / 2; scene.add(soil);
  const r = rng(44), blades = [], bm = M({ color: 0x4fa23e, roughness: .7 });
  const bladeGeo = new THREE.ConeGeometry(.05, 1.0, 4, 6); bladeGeo.translate(0, .5, 0);
  { const p = bladeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + y * y * .25); p.setZ(i, p.getZ(i) * .35); } bladeGeo.computeVertexNormals(); }
  for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(bladeGeo, bm); m.position.set((r() - .5) * 3.2, 0, (r() - .5) * 1.6); m.rotation.y = r() * 6.28; m.scale.set(1, .6 + r() * .6, 1); scene.add(m); blades.push(m); }
  // dew drops and frost crystals sitting on the blades
  const dew = [], ice = [], dm = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: .02, metalness: .2, transparent: true, opacity: .9 });
  for (let i = 0; i < 140; i++) { const b = blades[i % blades.length], y = .15 + r() * .7, sy = b.scale.y;
    const local = V(y * y * .25 * sy, y * sy, .02); const w = local.applyEuler(b.rotation).add(b.position);
    const d = new THREE.Mesh(new THREE.SphereGeometry(.022 + r() * .012, 10, 8), dm); d.position.copy(w); d.userData.at = r(); scene.add(d); dew.push(d);
    const c = crystal(.03 + r() * .015); c.position.copy(w); c.rotation.set(r() * 3, r() * 3, r() * 3); c.userData.at = r(); scene.add(c); ice.push(c); }
  const camera = cam(34); place(camera, V(0, .75, 2.6), V(0, .45, 0));
  const l = S.frost.lines;
  return { scene, camera, update(t) {
    const dewOn = clamp((t - l[0].start - .5) / 3), frz = ramp(t, l[2].start + .3, l[2].start + 2.5), sun = ramp(t, l[3].start + .2, l[3].start + 2.0), melt = ramp(t, l[3].start + 1.0, l[3].end + .6);
    dew.forEach(d => { const show = d.userData.at < dewOn; d.visible = show && (frz < .5 || melt > .3) && melt < .95; d.scale.setScalar(melt > .3 ? 1 - melt : 1); });
    ice.forEach(c => { c.visible = c.userData.at < frz && melt < .6; c.scale.setScalar(clamp(frz * 1.5 - c.userData.at) * (1 - melt)); });
    bm.color.set(C('#4fa23e').lerp(C('#dfeef8'), frz * .6 * (1 - melt)));
    setSky(sky, '#' + C('#0a1030').lerp(C('#5aa0e8'), sun).getHexString(), '#' + C('#1d2b58').lerp(C('#ffc49a'), sun).getHexString());
    st.material.opacity = 1 - sun; hemi.intensity = lerp(.9, 1.4, sun); hemi.color.set(sun > .5 ? 0xfff4e6 : 0x8fa6ff); sunL.intensity = sun * 2.5; moonL.intensity = 1 - sun;
    const temp = lerp(.5, .38, clamp((t - l[0].start) / 4)) - .2 * ramp(t, l[1].start, l[1].end) + .3 * sun;
    return { labels: [
      { text: 'DEW', xy: [960, 200], o: win(t, l[0].start + 3, l[1].end), cls: 'big cool', s: pop(t, l[0].start + 3) },
      { text: 'FROST', xy: [960, 200], o: win(t, l[2].start + 2.2, l[3].start + 1), cls: 'big', s: pop(t, l[2].start + 2.2) },
      { text: 'The Sun melts it', xy: [960, 200], o: fadeIn(t, l[3].start + 1.4), cls: 'sun' }], chapter: 'frost', thermo: { level: temp, freeze: .3 } };
  } };
}

function rainShot() {
  const scene = new THREE.Scene();
  const sky = skyMat(); scene.add(new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), sky));
  const Lt = lights(scene, V(-6, 10, 6), 2.2); Lt.d.shadow.camera.left = -14; Lt.d.shadow.camera.right = 14;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: .15, metalness: .1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-8, 0, -2); scene.add(sea);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), M({ map: GRASS })); land.rotation.x = -Math.PI / 2; land.position.set(7, .01, -2); land.receiveShadow = true; scene.add(land);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 14), M({ color: 0xe8d29a })); beach.rotation.x = -Math.PI / 2; beach.position.set(-.3, .015, -2); scene.add(beach);
  const mtn = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.2, 6), M({ color: 0x7c8f5a, flatShading: true })); mtn.position.set(6.5, 2.1, -5); mtn.castShadow = true; scene.add(mtn);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.3, 6), M({ color: 0xffffff, flatShading: true })); cap.position.set(6.5, 3.6, -5); scene.add(cap);
  [[3.5, -3, 1.6], [9.5, -4, 2]].forEach(([x, z, s]) => { const h = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 16), M({ color: 0x6aa84d })); h.scale.y = .45; h.position.set(x, 0, z); scene.add(h); });
  // river from the mountain to the sea
  const rc = new THREE.CatmullRomCurve3([V(5.6, .03, -3.2), V(4.5, .03, -1.5), V(2.8, .03, -.8), V(1.2, .03, .2), V(-.8, .03, .6)]);
  const rGeo = new THREE.TubeGeometry(rc, 80, .22, 4); rGeo.scale(1, .05, 1);
  RIVER.wrapS = RIVER.wrapT = THREE.RepeatWrapping;
  const river = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ map: RIVER, roughness: .2 })); scene.add(river);
  const sun = sunMesh(1.0); sun.position.set(-10, 6.5, -8); scene.add(sun);
  const cloud = cloudMesh(7, 1.6, 0xffffff); cloud.position.set(4, 7, -4); scene.add(cloud);
  const r = rng(51), n = 160, vap = dots(n, 0xbfe6ff, 10), vd = Array.from({ length: n }, () => [r(), r(), r()]); scene.add(vap);
  const rainG = new THREE.BufferGeometry(), NR = 140; rainG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NR * 6), 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true })); scene.add(rain);
  const rd = Array.from({ length: NR }, () => [r(), r(), r()]);
  // water cycle loop
  const loopPts = [V(-4, .3, -1), V(-2.5, 4, -2), V(1.5, 6.6, -3.5), V(4.8, 5.4, -4), V(6, 2.5, -4), V(3.5, .3, -1), V(0, .3, 0)];
  const loop = new THREE.CatmullRomCurve3(loopPts, true);
  const loopLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(loop.getPoints(200)), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .3, gapSize: .2, transparent: true, opacity: 0 })); loopLine.computeLineDistances(); scene.add(loopLine);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4fa3ff })); scene.add(ball);
  const camera = cam(40); place(camera, V(0, 4.2, 15), V(0, 3.3, -2));
  const l = S.rain.lines;
  return { scene, camera, update(t) {
    const up = fadeIn(t, l[1].start, 1), form = ramp(t, l[2].start + .3, l[2].start + 3.5), dark = ramp(t, l[3].start, l[3].start + 2), pour = fadeIn(t, l[4].start + .2, .5), cyc = fadeIn(t, l[5].start + .5, .6);
    setDots(vap, i => { const u = vd[i], ph = (t * .16 + u[0]) % 1; const x = lerp(-6 + u[1] * 5, 2.5 + u[1] * 3, ph * ph), y = .2 + ph * 6.8; return V(x, y, -2 - u[2] * 3); });
    vap.material.opacity = up * .9 * (1 - pour * .6);
    cloud.scale.setScalar(1.6 * form + .001); cloud.visible = form > .01;
    cloud.userData.mat.color.set(C('#ffffff').lerp(C('#7f8796'), dark));
    setSky(sky, '#' + C('#3f93ec').lerp(C('#6f86a6'), dark * .7).getHexString(), '#cfe8ff');
    const a = rainG.attributes.position;
    for (let i = 0; i < NR; i++) { const u = rd[i], ph = (t * 1.6 + u[0]) % 1, x = 2.2 + u[1] * 4.2, z = -3 - u[2] * 2, y = 6.4 - ph * 6.4; a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, x - .05, y - .4, z); }
    a.needsUpdate = true; rain.material.opacity = pour * .9; rain.visible = pour > 0;
    RIVER.offset.y = -t * .6;
    loopLine.material.opacity = cyc * .9; ball.visible = cyc > 0; ball.position.copy(loop.getPointAt(((t - l[5].start) * .12) % 1 + 1 - 1 < 0 ? 0 : ((t - l[5].start) * .12) % 1));
    const labels = [
      { text: 'Water vapor rises', p: V(-3.6, 3.4, -2), o: win(t, l[1].start + 1.5, l[5].start), cls: 'cool' },
      { text: 'Cloud = lots of tiny droplets', p: V(4, 9.2, -4), o: win(t, l[2].start + 2.5, l[4].start), cls: 'plain' },
      { text: 'Too heavy: RAIN!', p: V(4.2, 9.2, -4), o: win(t, l[4].start + .8, l[5].start + .3), cls: 'cool', s: pop(t, l[4].start + .8) },
      { text: 'Back to the sea', p: V(1.4, .4, .5), o: fadeIn(t, l[5].start + 1.5), cls: 'cool' },
      { text: 'The water cycle', xy: [960, 150], o: fadeIn(t, l[5].start + 4), cls: 'big', s: pop(t, l[5].start + 4) }];
    const insets = [];
    const io = win(t, l[3].start - .2, l[4].start + .8);
    if (io > 0) insets.push({ kind: 'merge', x: 1640, y: 330, r: 190, p: clamp((t - l[3].start) / (l[3].end - l[3].start + .5)), o: io, title: 'Droplets join up' });
    return { labels, insets, chapter: 'rain', note: true };
  } };
}

function flakeShot() {
  const scene = new THREE.Scene(); scene.background = C('#1a2a55');
  scene.add(new THREE.AmbientLight(0xffffff, .6)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 3, 5); scene.add(d);
  const st = starsMesh(600, 40); st.material.opacity = .5; scene.add(st);
  const flake = new THREE.Group(); scene.add(flake);
  const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaad8ff, emissiveIntensity: .45, roughness: .2, metalness: .1 });
  const tips = [];
  for (let k = 0; k < 6; k++) {
    const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 3; flake.add(arm);
    const main = new THREE.Mesh(new THREE.BoxGeometry(2.0, .12, .05), fm); main.position.x = 1.0; arm.add(main);
    for (const [px, len] of [[.7, .55], [1.3, .4]]) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, .08, .05), fm); b.position.set(px + len * .35, s * len * .3, 0); b.rotation.z = s * Math.PI / 3; arm.add(b); }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.12), fm); tip.position.x = 2.05; arm.add(tip); tips.push(tip);
  }
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .06, 6), fm); hex.rotation.x = Math.PI / 2; flake.add(hex);
  const camera = cam(36); place(camera, V(0, 0, 9), V(0, 0, 0));
  const l = S.flake.lines;
  return { scene, camera, update(t) {
    const g = ramp(t, S.flake.start, l[0].end + .5);
    flake.scale.setScalar(.15 + .85 * g); flake.rotation.set(Math.sin(t * .4) * .3, Math.sin(t * .3) * .3, t * .15);
    flake.updateMatrixWorld(true);
    const labels = tips.map((tp, i) => ({ text: String(i + 1), p: tp.getWorldPosition(V()), off: [0, 0], o: fadeIn(t, l[1].start + 1.6 + i * .3), cls: 'sun', s: pop(t, l[1].start + 1.6 + i * .3) }));
    labels.push({ text: 'Ice crystal', xy: [960, 130], o: win(t, l[0].start + 1.5, l[1].start), cls: 'cool' });
    labels.push({ text: 'Six arms!', xy: [960, 130], o: fadeIn(t, l[1].start + 3.6), cls: 'big', s: pop(t, l[1].start + 3.6) });
    return { labels, chapter: 'snow' };
  } };
}

function fallShot() {
  const scene = new THREE.Scene(); const sky = skyMat(); setSky(sky, '#6f86a6', '#c9d6e4'); scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), sky));
  lights(scene, V(2, 8, 6), 1.4);
  const gL = new THREE.Mesh(new THREE.BoxGeometry(4.2, .3, 3), M({ map: GRASS })); gL.position.set(-2.4, -.15, 0); scene.add(gL);
  const gR = gL.clone(); gR.position.x = 2.4; scene.add(gR);
  const snow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 3), M({ color: 0xf6fbff, roughness: .9 })); snow.position.set(-2.4, 0, 0); scene.add(snow);
  const band = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 2.8), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: .38, depthWrite: false })); band.position.set(2.4, .8, 0); scene.add(band);
  const cl = new THREE.Group(); scene.add(cl); for (let i = 0; i < 5; i++) { const c = cloudMesh(60 + i, .9, 0xb7c0cc); c.position.set(-4.2 + i * 2.1, 4.75, -.5 + (i % 2) * .4); cl.add(c); }
  const r = rng(71), N = 90, fl = [], dr = [];
  const dm = new THREE.MeshStandardMaterial({ color: 0x4f9dff, emissive: 0x2a6fd0, emissiveIntensity: .7, roughness: .1 });
  for (let i = 0; i < N; i++) { const c = crystal(.12); c.userData = { x: r(), z: r(), p: r(), s: r() * 6 }; scene.add(c); fl.push(c);
    const d = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), dm); d.scale.y = 1.5; scene.add(d); dr.push(d); }
  const camera = cam(40); place(camera, V(0, 2.2, 12.5), V(0, 1.75, 0));
  const l = S.fall.lines;
  return { scene, camera, update(t) {
    const lt = t - S.fall.start;
    fl.forEach((c, i) => { const u = c.userData, ph = (lt * .14 + u.p) % 1, right = i % 2 === 1;
      const x = (right ? 2.4 : -2.4) + (u.x - .5) * 3.6 + Math.sin(lt * 1.5 + u.s) * .15, y = 4.4 - ph * 4.4, z = (u.z - .5) * 2;
      c.position.set(x, y, z); c.rotation.set(lt + u.s, lt * .7, 0);
      const rainNow = right && y < 1.6; c.visible = !rainNow; dr[i].visible = rainNow; dr[i].position.set(x, y, z); });
    snow.scale.y = .02 + .3 * clamp(lt / 14); snow.position.y = snow.scale.y * .5;
    return { labels: [
      { text: 'Cold all the way down: SNOW', p: V(-2.4, 5.9, .5), o: fadeIn(t, l[0].start + .5), cls: 'cool', s: pop(t, l[0].start + .5) },
      { text: 'Warm near the ground: RAIN', p: V(2.4, 5.9, .5), o: fadeIn(t, l[1].start + .5), cls: 'warm', s: pop(t, l[1].start + .5) },
      { text: 'warm air', p: V(4.0, 1.75, 1.4), o: fadeIn(t, l[1].start + 1.5), cls: 'plain' },
      { text: 'Lots of rain starts as snow!', xy: [960, 420], o: fadeIn(t, l[1].start + 5.2), cls: 'sun', s: pop(t, l[1].start + 5.2) }], chapter: 'snow' };
  } };
}

function outroShot() {
  const G = garden(); G.sun.position.set(-12, 16, -34); const K = kidsTrio(G.scene);
  const tree = G.trees[0]; tree.g.position.set(2.4, 0, -1.6); tree.g.scale.setScalar(1.1);
  const blossom = new THREE.Group(); tree.g.add(blossom); const r = rng(81);
  for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), M({ color: 0xffb7d0 })); b.position.set((r() - .5) * 1.6, 1.3 + r() * 1.2, (r() - .5) * 1.0 + .3); blossom.add(b); }
  const camera = cam(38);
  const l = S.outro.lines, s0 = S.outro.start, s1 = S.outro.end;
  return { scene: G.scene, camera, update(t) {
    // seasons cycle on the tree: summer -> autumn -> winter -> spring
    const c = ((t - s0) / 4) % 4, st = Math.floor(c), f = c - st;
    const cols = ['#3e8a46', '#d9822b', '#3e8a46', '#7fc46a'];
    tree.cm.color.set(C(cols[st]).lerp(C(cols[(st + 1) % 4]), ramp(f, .7, 1)));
    const winterA = st === 2 ? 1 - ramp(f, .75, 1) : st === 1 ? ramp(f, .75, 1) : 0;
    tree.crown.visible = winterA < .9; tree.crown.scale.setScalar(1 - winterA * .9 + .001);
    G.fr.material.opacity = winterA * .9; blossom.visible = st === 3 || (st === 2 && f > .75);
    setSky(G.sky, '#' + C('#3f93ec').lerp(C('#86aed6'), winterA).getHexString(), '#cfe8ff');
    kidsPose(K, t, fadeIn(t, l[4].start - .1, .3) * (1 - fadeIn(t, l[4].end + 1.5, .5)));
    place(camera, V(-.4, 1.5, 4.6), V(-.6, 1.05, 0));
    camera.setViewOffset(W, H, 330, 0, W, H);
    const rows = ['Tilt of the Earth → <span>seasons</span>', 'Sun by day, clear nights → <span>warm & cold</span>', 'Cold grass → <span>dew & frost</span>', 'Warm wet air rises → <span>clouds, rain & snow</span>'];
    const html = rows.map((x, i) => { const o = fadeIn(t, l[i].start - .1); return o > 0 ? `<div class="recap" style="top:${130 + i * 112}px;opacity:${o}">${x}</div>` : ''; }).join('');
    return { html, chapter: null };
  } };
}

// ============================================================ EDIT
const SHOTS = [
  ['intro', introShot], ['tilt', tiltShot, 'tilt', 1], ['flash', flashShot], ['night', nightShot], ['vapor', vaporShot], ['jars', jarsShot],
  ['glass', glassShot], ['frost', frostShot], ['rain', rainShot], ['flake', flakeShot], ['fall', fallShot], ['outro', outroShot],
];
const built = [];
for (const [name, fn] of SHOTS) {
  if (name === 'tilt') {   // the tilt scene is two shots: the globe, then the sun paths in the sky
    const cut = (L('tilt', 0).end + L('tilt', 1).start) / 2;
    built.push({ start: S.tilt.start, end: cut, shot: tiltShot() }, { start: cut, end: S.tilt.end, shot: arcsShot() });
  } else built.push({ start: S[name].start, end: name === 'outro' ? DURATION + 1 : S[name].end, shot: fn() });
}
const CHAPTERS = { seasons: [1, 'Seasons'], night: [2, 'Warm Days, Cold Nights'], humidity: [3, 'Humidity'], frost: [4, 'Dew & Frost'], rain: [5, 'Clouds & Rain'], snow: [6, 'Snow'] };

// ============================================================ OVERLAY
const $ = id => document.getElementById(id);
const labelLayer = $('labels'), extra = $('extra');
const insetBox = document.createElement('div'), htmlBox = document.createElement('div'); extra.append(insetBox, htmlBox);
const insetPool = [];
function project(p, camera) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z < 1]; }
function drawMerge(g, R, p) {
  const D = R * 2; g.fillStyle = '#e9f3fb'; g.fillRect(0, 0, D, D);
  const r = rng(3), n = 14, pts = [];
  for (let i = 0; i < n; i++) pts.push([R + (r() - .5) * R * 1.3, R * .55 + (r() - .5) * R * .8, 9 + r() * 6]);
  const k = clamp(p * 1.3);
  const groups = [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13]];
  g.fillStyle = '#4f9df0';
  groups.forEach((grp, gi) => { const cx = grp.reduce((s, i) => s + pts[i][0], 0) / grp.length, cy = grp.reduce((s, i) => s + pts[i][1], 0) / grp.length;
    if (k < .8) grp.forEach(i => { const [x, y, rr] = pts[i]; g.beginPath(); g.arc(lerp(x, cx, k / .8), lerp(y, cy, k / .8), rr, 0, 7); g.fill(); });
    else { const big = 26, y = cy + (k - .8) / .2 * R * .9; g.beginPath(); g.arc(cx, y, big, 0, 7); g.fill(); } });
}
function overlay(t, out, camera) {
  const items = (out.labels || []).filter(l => l.o > .01);
  labelLayer.innerHTML = items.map(l => {
    let [x, y, ok] = l.p ? project(l.p, camera) : [...l.xy, true]; if (!ok) return '';
    return `<div class="lbl ${l.cls || ''}" style="left:${x}px;top:${y}px;opacity:${l.o};transform:translate(-50%,-50%) scale(${l.s ?? 1})">${l.text}</div>`;
  }).join('');
  const ins = (out.insets || []).filter(i => i.o > .01);
  while (insetPool.length < ins.length) { const wrap = document.createElement('div'), cv = document.createElement('canvas'), tt = document.createElement('div'); cv.className = 'inset'; tt.className = 'inset-title'; wrap.append(cv, tt); insetBox.append(wrap); insetPool.push({ wrap, cv, tt }); }
  insetPool.forEach((p, i) => { const d = ins[i]; p.wrap.style.display = d ? '' : 'none'; if (!d) return; const D = d.r * 2; if (p.cv.width !== D) p.cv.width = p.cv.height = D;
    Object.assign(p.cv.style, { left: d.x - d.r + 'px', top: d.y - d.r + 'px', width: D + 'px', height: D + 'px' }); Object.assign(p.tt.style, { left: d.x + 'px', top: d.y - d.r - 56 + 'px' });
    p.tt.textContent = d.title; p.wrap.style.opacity = d.o; drawMerge(p.cv.getContext('2d'), d.r, d.p); });
  let h = out.html || '';
  if (out.thermo) {
    const lv = clamp(out.thermo.level) * 100;
    h += `<div class="thermo"><div class="tube"><div class="fill" style="height:${lv}%"></div></div><div class="bulb"></div><div class="hot">warm</div><div class="cold">cold</div>` +
      (out.thermo.freeze != null ? `<div class="frz" style="top:${520 - out.thermo.freeze * 520}px"><span>freezing</span></div>` : '') + '</div>';
  }
  htmlBox.innerHTML = h;
  const ch = CHAPTERS[out.chapter]; $('chapter').style.display = ch ? '' : 'none'; if (ch) $('chapter').innerHTML = `<b>${ch[0]}</b>${ch[1]}`;
  $('note').style.opacity = out.note ? 1 : 0;
  const lines = TL.scenes.flatMap(s => s.lines);
  let cap = '', co = 0;
  lines.forEach((l, i) => { const nx = lines[i + 1] ? lines[i + 1].start - .15 : DURATION, end = Math.min(l.end + .7, nx);
    if (t >= l.start - .15 && t < end) { const nm = { ella: 'Ella', eitan: 'Eitan', nili: 'Nili', all: 'Ella, Eitan & Nili' }[l.who];
      cap = (nm ? `<span class="who">${nm}:</span> ` : '') + l.text; co = Math.min(clamp((t - l.start + .15) / .15), clamp((end - t) / .15)); } });
  $('caption').innerHTML = cap; $('caption').style.opacity = co;
  let f = clamp(1 - t / .4);
  for (const s of built.slice(1)) f = Math.max(f, 1 - Math.abs(t - s.start) / .3);
  f = Math.max(f, clamp((t - (DURATION - 1.2)) / 1.0));
  $('fade').style.opacity = clamp(f);
}
window.renderAt = (t) => {
  const s = built.find(b => t >= b.start && t < b.end) || built[built.length - 1];
  const out = s.shot.update(t) || {};
  renderer.render(s.shot.scene, s.shot.camera);
  overlay(t, out, s.shot.camera);
};
window.DURATION = DURATION;
for (const b of built) { b.shot.update(b.start + .01); renderer.compile(b.shot.scene, b.shot.camera); }
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(parseFloat(q.get('t')));
else if (!navigator.webdriver) {
  const audio = new Audio('audio/vo.wav'); window.renderAt(0);
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); });
  const loop = () => { if (!audio.paused) window.renderAt(audio.currentTime); requestAnimationFrame(loop); }; loop();
}
window.ready = true;
