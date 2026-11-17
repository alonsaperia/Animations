// How the Sky Works: a 3D explainer for kids. Every frame is a pure function of time t (seconds).
import * as THREE from 'three';

const W = 1920, H = 1080;
const TL = await (await fetch('audio/timeline.json')).json();
const S = Object.fromEntries(TL.scenes.map(s => [s.scene, s]));
const L = (sc, i) => S[sc].lines[i];
const DURATION = TL.duration;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const ramp = (x, a, b) => easeIO(clamp((x - a) / (b - a)));
const fadeIn = (t, a, d = .35) => clamp((t - a) / d);
const win = (t, a, b, d = .35) => Math.min(fadeIn(t, a, d), clamp((b - t) / d));
const pop = (t, a) => { const x = clamp((t - a) / .45); return x <= 0 ? 0 : 1 + Math.sin(x * Math.PI) * .18 * (1 - x) + 0 * x; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const az = v => Math.atan2(v.x, v.z);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TILT = 23.44 * Math.PI / 180;
const HOME = { lat: 31.8, lon: 35.2 };   // the "Your home" marker; change to move it
function lonLatDir(lon, lat) {
  const phi = (lon + 180) / 360 * Math.PI * 2, la = lat * Math.PI / 180;
  return V(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la));
}

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- textures ----------
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
async function earthTexture() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const CW = 2048, CH = 1024;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, CH);
  gr.addColorStop(0, '#2c5ea8'); gr.addColorStop(.5, '#2f8fe0'); gr.addColorStop(1, '#2c5ea8');
  g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  const m = document.createElement('canvas'); m.width = CW; m.height = CH; const mg = m.getContext('2d');
  mg.fillStyle = '#fff';
  const polys = [];
  for (const f of land.features) {
    const geo = f.geometry; if (!geo) continue;
    if (geo.type === 'Polygon') polys.push(geo.coordinates); else if (geo.type === 'MultiPolygon') polys.push(...geo.coordinates);
  }
  for (const poly of polys) {
    const rings = poly.map(ring => {
      const pts = []; let prev = null, off = 0;
      for (const [lo, la] of ring) {
        let x = lo + off;
        if (prev !== null) { while (x - prev > 180) { off -= 360; x -= 360; } while (x - prev < -180) { off += 360; x += 360; } }
        pts.push([x, la]); prev = x;
      }
      if (Math.abs(pts[pts.length - 1][0] - pts[0][0]) > 180) {
        const pole = pts.reduce((s, p) => s + p[1], 0) / pts.length > 0 ? 90 : -90;
        pts.push([pts[pts.length - 1][0], pole], [pts[0][0], pole]);
      }
      return pts;
    });
    for (const o of [-360, 0, 360]) {
      mg.beginPath();
      for (const pts of rings) pts.forEach(([lo, la], i) => {
        const x = (lo + o + 180) / 360 * CW, y = (90 - la) / 180 * CH; i ? mg.lineTo(x, y) : mg.moveTo(x, y);
      });
      mg.fill('evenodd');
    }
  }
  mg.globalCompositeOperation = 'source-in';
  const lg = mg.createLinearGradient(0, 0, 0, CH);
  [[0, '#f4f8ff'], [.12, '#eef3f6'], [.17, '#5fae4c'], [.3, '#6cb44e'], [.36, '#d8c07a'], [.4, '#cfb46a'], [.46, '#4fa443'],
   [.55, '#4c9d3f'], [.6, '#cdb56c'], [.64, '#d4bc72'], [.7, '#69a84d'], [.8, '#6aa84d'], [.86, '#eef3f6'], [1, '#f4f8ff']]
    .forEach(([s, col]) => lg.addColorStop(s, col));
  mg.fillStyle = lg; mg.fillRect(0, 0, CW, CH);
  g.drawImage(m, 0, 0);
  return canvasTex(c);
}
function moonTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#c4c4c8'; g.fillRect(0, 0, 1024, 512);
  const r = rng(7);
  for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(120,120,132,.55)'; g.beginPath();
    g.ellipse(r() * 1024, 120 + r() * 270, 50 + r() * 90, 35 + r() * 60, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 160; i++) {
    const x = r() * 1024, y = 30 + r() * 452, rad = 3 + Math.pow(r(), 3) * 30;
    g.fillStyle = 'rgba(95,95,105,.45)'; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    g.strokeStyle = 'rgba(235,235,240,.5)'; g.lineWidth = Math.max(1, rad * .18); g.beginPath(); g.arc(x - rad * .1, y - rad * .1, rad, 0, 7); g.stroke();
  }
  return canvasTex(c);
}
function glowTexture(hole = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  if (hole) { gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(hole, 'rgba(255,255,255,1)'); }
  else gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(Math.max(hole, .25) + .05, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return canvasTex(c);
}
// moon face for the 2D phase window
const MOONFACE = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 300; const g = c.getContext('2d');
  g.fillStyle = '#d9d9de'; g.beginPath(); g.arc(150, 150, 150, 0, 7); g.fill();
  const r = rng(11);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(140,140,152,.55)'; g.beginPath(); g.ellipse(60 + r() * 180, 60 + r() * 180, 20 + r() * 40, 15 + r() * 30, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(120,120,130,.4)'; g.beginPath(); g.arc(30 + r() * 240, 30 + r() * 240, 3 + r() * 9, 0, 7); g.fill(); }
  return c;
})();

const EARTH_TEX = await earthTexture();
const MOON_TEX = moonTexture();
const GLOW = glowTexture();
const CORONA = glowTexture(.42);

// ---------- shaders ----------
const planetVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
gl_Position = projectionMatrix * viewMatrix * w; }`;
const earthFS = `uniform sampler2D map; uniform vec3 sunDir; uniform vec3 shC; uniform float shR; uniform float shA;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 tex = texture2D(map, vUv).rgb;
  float d = dot(n, normalize(sunDir));
  float day = smoothstep(-0.07, 0.10, d);
  vec3 lit = tex * (0.42 + 0.78 * max(d, 0.));
  vec3 dark = tex * vec3(0.10, 0.12, 0.24) + vec3(0.012, 0.018, 0.05);
  vec3 col = mix(dark, lit, day);
  float dist = length(vW - shC);
  float sh = shA * (1. - smoothstep(shR * 0.3, shR, dist));
  col *= 1. - 0.88 * sh;
  vec3 V = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(n, V), 0.), 2.6);
  col += vec3(0.35, 0.62, 1.0) * fr * (0.18 + 0.7 * day);
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;
const moonFS = `uniform sampler2D map; uniform vec3 sunDir; uniform float amb;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 tex = texture2D(map, vUv).rgb;
  float d = dot(n, normalize(sunDir));
  float day = smoothstep(-0.03, 0.08, d);
  vec3 col = mix(tex * amb, tex * (0.35 + 0.85 * max(d, 0.)), day);
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

// ---------- models ----------
const STAR_GEO = (() => {
  const r = rng(3), a = [], b = [];
  for (let i = 0; i < 2600; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    (r() < .25 ? a : b).push(s * Math.cos(th) * 400, u * 400, s * Math.sin(th) * 400);
  }
  const ga = new THREE.BufferGeometry(); ga.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(b, 3));
  return [ga, gb];
})();
function stars(opacity = 1) {
  const g = new THREE.Group();
  g.add(new THREE.Points(STAR_GEO[0], new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity })));
  g.add(new THREE.Points(STAR_GEO[1], new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, color: 0xcfd8ff, transparent: true, opacity: .7 * opacity })));
  return g;
}
function stage(bg = '#070b20') {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  scene.add(new THREE.AmbientLight(0xffffff, .55));
  return scene;
}
function makeHouse() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 1), new THREE.MeshLambertMaterial({ color: 0xfff1d0 }));
  body.position.y = .4; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.86, .62, 4), new THREE.MeshLambertMaterial({ color: 0xe2483d }));
  roof.position.y = 1.11; roof.rotation.y = Math.PI / 4; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(.26, .44, .04), new THREE.MeshLambertMaterial({ color: 0x7a4a2a }));
  door.position.set(0, .22, .51); g.add(door);
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(.22, .2, .04), new THREE.MeshLambertMaterial({ color: 0x6cc3ff }));
  win1.position.set(.3, .52, .51); g.add(win1);
  return g;
}
function makeEarth() {
  const root = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();
  root.add(tilt); tilt.add(spin);
  const mat = new THREE.ShaderMaterial({ vertexShader: planetVS, fragmentShader: earthFS, uniforms: {
    map: { value: EARTH_TEX }, sunDir: { value: V(-1, 0, 0) }, shC: { value: V(0, 999, 0) }, shR: { value: .5 }, shA: { value: 0 } } });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat));
  const homeDir = lonLatDir(HOME.lon, HOME.lat);
  const house = makeHouse(); house.scale.setScalar(.085);
  house.position.copy(homeDir); house.quaternion.setFromUnitVectors(V(0, 1, 0), homeDir); spin.add(house);
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 2.8, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  axis.visible = false; tilt.add(axis);
  const E = { root, tilt, spin, mat, house, axis, homeDir };
  E.setSun = (sunPos) => { root.updateMatrixWorld(true); mat.uniforms.sunDir.value.copy(sunPos).sub(root.getWorldPosition(V())).normalize(); };
  E.homeWorld = () => { root.updateMatrixWorld(true); return house.getWorldPosition(V()); };
  E.homeNormal = () => { root.updateMatrixWorld(true); return homeDir.clone().transformDirection(spin.matrixWorld); };
  // spin angle that puts the home at noon for a sun direction given in world space
  E.noonSpin = (sunDirWorld) => {
    root.updateMatrixWorld(true);
    const inv = new THREE.Quaternion(); tilt.getWorldQuaternion(inv).invert();
    return az(sunDirWorld.clone().applyQuaternion(inv)) - az(homeDir);
  };
  return E;
}
function makeMoon(scale = 1) {
  const mat = new THREE.ShaderMaterial({ vertexShader: planetVS, fragmentShader: moonFS, uniforms: {
    map: { value: MOON_TEX }, sunDir: { value: V(-1, 0, 0) }, amb: { value: .05 } } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(.27 * scale, 64, 48), mat);
  m.userData.r = .27 * scale;
  m.setSun = (sunPos) => mat.uniforms.sunDir.value.copy(sunPos).sub(m.position).normalize();
  return m;
}
function makeSun(r) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffe066 })));
  const s1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffd23f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .95 }));
  s1.scale.setScalar(r * 4.2); g.add(s1);
  const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9a2e, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .5 }));
  s2.scale.setScalar(r * 9); g.add(s2);
  return g;
}
function circleLine(r, color, opacity, f = null, n = 256) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(f ? f(a) : V(r * Math.sin(a), 0, r * Math.cos(a))); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
function arcLine(r, a0, color, n = 360) {  // grows counterclockwise from azimuth a0; use setDrawRange
  const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI * 2; pts.push(V(r * Math.sin(a), 0, r * Math.cos(a))); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true }));
  l.userData.n = n; return l;
}
const cam = (fov) => new THREE.PerspectiveCamera(fov, W / H, .05, 3000);
function place(c, pos, look) { c.position.copy(pos); c.lookAt(look); c.updateMatrixWorld(true); }
function vlerp(a, b, t) { return a.clone().lerp(b, t); }

// ============================================================ SHOTS
// update(t) receives global time and returns { labels, insets, html, chapter, note }

function systemShot(mode) {
  const scene = stage(); scene.add(stars());
  const sun = makeSun(2.2); scene.add(sun);
  scene.add(new THREE.PointLight(0xffffff, 260, 0, 2));
  const E = makeEarth(); E.root.scale.setScalar(.8); E.tilt.rotation.z = -TILT; E.axis.visible = true; scene.add(E.root);
  const moon = makeMoon(.85); scene.add(moon);
  scene.add(circleLine(9, 0x8fb4ff, .35));
  const camera = cam(36);
  const T0 = mode === 'intro' ? 0 : S.outro.start;
  return { scene, camera, update(t) {
    const lt = t - T0;
    const ea = (mode === 'intro' ? .55 : -.9) + lt * Math.PI * 2 / 80;
    E.root.position.set(9 * Math.sin(ea), 0, 9 * Math.cos(ea));
    E.spin.rotation.y = lt * Math.PI * 2 / 3.5;
    const ma = lt * Math.PI * 2 / 9 + 1;
    moon.position.copy(E.root.position).add(V(2.1 * Math.sin(ma), 0, 2.1 * Math.cos(ma)));
    moon.rotation.y = ma;
    E.setSun(V(0, 0, 0)); moon.setSun(V(0, 0, 0));
    const ca = (mode === 'intro' ? -.15 : .1) + lt * .018;
    const dist = mode === 'intro' ? lerp(24, 19.5, ramp(t, 0, 8)) : 23;
    place(camera, V(Math.sin(ca) * dist, 7.2, Math.cos(ca) * dist), V(0, -.6, 0));
    if (mode === 'outro') camera.setViewOffset(W, H, -300 * ramp(t, L('outro', 0).start - 1, L('outro', 0).start + .5), 0, W, H);
    const labels = [], html = [];
    if (mode === 'intro') {
      const a = L('intro', 0), b = L('intro', 1);
      labels.push({ text: 'How the Sky Works', xy: [960, 250], o: win(t, .4, 5.0, .5), cls: 'huge', s: pop(t, .4) });
      labels.push({ text: 'Sun', p: V(0, 3.2, 0), o: fadeIn(t, b.start + .5), cls: 'sun', s: pop(t, b.start + .5) });
      labels.push({ text: 'Earth', p: E.root.position.clone().add(V(0, 1.6, 0)), o: fadeIn(t, b.start + 1.3), cls: 'cool', s: pop(t, b.start + 1.3) });
      labels.push({ text: 'Moon', p: moon.position.clone().add(V(0, .9, 0)), o: fadeIn(t, b.start + 2.1), cls: 'moon', s: pop(t, b.start + 2.1) });
    } else {
      const rows = [['Earth spins once', '1 day'], ['Moon goes around Earth', '1 month'], ['Earth goes around the Sun', '1 year']];
      rows.forEach(([a, b], i) => {
        const st = L('outro', i).start - .1, o = fadeIn(t, st);
        if (o > 0) html.push(`<div class="recap" style="top:${150 + i * 120}px;opacity:${o};transform:translateX(${(1 - ramp(t, st, st + .5)) * -60}px)">${a} → <span>${b}</span></div>`);
      });
      const q = L('outro', 3).start;
      labels.push({ text: "Isn't the sky amazing?", xy: [560, 600], o: fadeIn(t, q, .5), cls: 'huge', s: pop(t, q) });
    }
    return { labels, html: html.join(''), note: true };
  } };
}

function dayShot() {
  const scene = stage(); scene.add(stars());
  const sunPos = V(-4.9, .35, -.4);
  const sun = makeSun(.95); sun.position.copy(sunPos); scene.add(sun);
  const dl = new THREE.DirectionalLight(0xffffff, 2.6); dl.position.copy(sunPos); scene.add(dl);
  const E = makeEarth(); E.tilt.rotation.x = TILT; scene.add(E.root);
  // spin arrow around the equator
  const arrow = new THREE.Group();
  const amat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(1.32, .035, 12, 80, Math.PI * 1.35), amat);
  arc.rotation.x = Math.PI / 2; arrow.add(arc);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .26, 16), amat);
  // torus arc runs from angle 0 to 1.35pi in its own xy plane; after rotation.x=pi/2 that plane is xz
  const ta = Math.PI * 1.35; tip.position.set(1.32 * Math.cos(ta), 0, 1.32 * Math.sin(ta));
  tip.rotation.set(0, -ta, 0); tip.rotateZ(Math.PI / 2 * (1)); arrow.add(tip);
  E.tilt.add(arrow);
  const camera = cam(34);
  const sunDir = sunPos.clone().normalize();
  E.setSun(sunPos);
  const aNoon = E.noonSpin(sunDir);
  const T0 = (L('day', 2).start + L('day', 2).end) / 2, P = 7.4;
  return { scene, camera, update(t) {
    E.spin.rotation.y = aNoon + Math.PI * 2 * (t - T0) / P;
    E.setSun(sunPos);
    const l0 = L('day', 0), l1 = L('day', 1), l4 = L('day', 4);
    amat.opacity = win(t, l0.start - .2, l1.start + .2);
    arrow.visible = amat.opacity > 0;
    arrow.rotation.y = -(t - l0.start) * .6;
    place(camera, V(2.3, 1.15, 6.6), V(-1.55, .35, 0));
    const labels = [], insets = [];
    const hn = E.homeNormal(), hw = E.homeWorld();
    const camDir = camera.position.clone().sub(hw).normalize();
    const vis = clamp((hn.dot(camDir) - .05) / .2);
    const od = win(t, l1.start, S.day.end + 1);
    labels.push({ text: 'DAY', p: V(-1.25, 1.35, .6), o: od, cls: 'big sun', s: pop(t, l1.start) });
    labels.push({ text: 'NIGHT', xy: [1690, 790], o: od, cls: 'big cool', s: pop(t, l1.start + .5) });
    labels.push({ text: 'Your home', p: hw, dot: true, off: [-170, -40], o: vis * fadeIn(t, L('day', 2).start - .6) });
    labels.push({ text: 'Spinning!', p: V(0, -1.55, .9), o: amat.opacity, cls: 'warm' });
    labels.push({ text: '1 spin = 1 day', xy: [560, 800], o: fadeIn(t, l4.start), cls: 'big sun', s: pop(t, l4.start) });
    // sky above the home
    const sd = sunDir.clone();
    const elev = hn.dot(sd);
    const axisW = V(0, 1, 0).applyQuaternion(E.tilt.getWorldQuaternion(new THREE.Quaternion()));
    const east = new THREE.Vector3().crossVectors(axisW, hn).normalize();
    insets.push({ kind: 'sky', x: 1650, y: 330, r: 190, elev, east: east.dot(sd), o: fadeIn(t, L('day', 2).start - .8), title: 'The sky above your home' });
    return { labels, insets, chapter: 'day', note: true };
  } };
}

function hoursShot() {
  const scene = stage(); scene.add(stars());
  const sunPos = V(-60, 0, 0);
  const sun = makeSun(4.5); sun.position.set(-17, 0, -3); scene.add(sun);
  const dl = new THREE.DirectionalLight(0xffffff, 2.6); dl.position.copy(sunPos); scene.add(dl);
  const E = makeEarth(); scene.add(E.root); E.setSun(sunPos);
  const aNoon = E.noonSpin(V(-1, 0, 0));
  const L0 = Math.PI * 2 / 24, segs = [], dim = new THREE.Color('#2a3566'), on = new THREE.Color('#ffc93c');
  const sunAz = az(V(-1, 0, 0));
  for (let k = 0; k < 24; k++) {
    const g = new THREE.RingGeometry(1.3, 1.6, 8, 1, 0, L0 * .86); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: dim.clone(), side: THREE.DoubleSide, transparent: true }));
    m.rotation.y = sunAz + k * L0 + L0 * .07 - Math.PI / 2; scene.add(m); segs.push(m);
  }
  const camera = cam(38);
  const T1 = L('hours', 0).start + .3, T2 = L('hours', 1).end + .1;
  return { scene, camera, update(t) {
    const f = (t - T1) / (T2 - T1);
    E.spin.rotation.y = aNoon + Math.PI * 2 * f;
    E.setSun(sunPos);
    const n = Math.floor(clamp(f) * 24 + 1e-6);
    segs.forEach((m, k) => { const lit = k < n; m.material.color.copy(lit ? on : dim); m.material.opacity = fadeIn(t, S.hours.start + .2 + k * .02); });
    place(camera, V(.6, 5.6, 3.4), V(.3, -.35, .2));
    const labels = [];
    const hw = E.homeWorld();
    labels.push({ text: 'Your home', p: hw, dot: true, off: [0, -70], o: 1 });
    if (f < 1.02) labels.push({ text: `${clamp(n, 0, 24)} hour${n === 1 ? '' : 's'}`, xy: [1560, 470], o: fadeIn(t, T1 - .2), cls: 'big sun' });
    labels.push({ text: '1 day = 24 hours', xy: [1500, 470], o: fadeIn(t, T2 + .05), cls: 'big sun', s: pop(t, T2 + .05) });
    labels.push({ text: 'Sunlight', xy: [170, 540], o: 1, cls: 'sun' });
    return { labels, chapter: 'hours' };
  } };
}

function monthShot() {
  const scene = stage(); scene.add(stars());
  const sunPos = V(-60, 0, 0);
  const sun = makeSun(4.5); sun.position.set(-19, 0, -5); scene.add(sun);
  const E = makeEarth(); scene.add(E.root); E.setSun(sunPos);
  const R = 3.4, moon = makeMoon(1.45); scene.add(moon);
  scene.add(circleLine(R, 0x8fb4ff, .3));
  const sl = S.month.lines;
  const T0 = S.month.start, Tp = sl[2].start;        // full orbit of phases starts here
  const w = Math.PI * 2 / (sl[4].end + .4 - Tp);
  // moon speed slows to a stop while the camera visits it
  const speed = t => w * (1 - ramp(t, sl[1].start - .4, sl[1].start + .9) + ramp(t, sl[1].end - 1.2, sl[1].end - .2));
  const integ = (a, b) => { let s = 0; const dt = 1 / 120; for (let x = a; x < b; x += dt) s += speed(Math.min(x + dt / 2, b)) * Math.min(dt, b - x); return s; };
  const A0 = -integ(T0, Tp);   // moon az = 0 (first quarter) at Tp
  const trace = arcLine(R + .001, 0, 0xffc93c); scene.add(trace);
  const sight = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), V()]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .15, gapSize: .1, transparent: true }));
  scene.add(sight);
  const camera = cam(40);
  return { scene, camera, update(t) {
    const a = A0 + integ(T0, t);
    moon.position.set(R * Math.sin(a), 0, R * Math.cos(a)); moon.rotation.y = a + Math.PI;
    moon.setSun(sunPos); E.spin.rotation.y = (t - T0) * Math.PI * 2 / 4;
    E.setSun(sunPos);
    trace.geometry.setDrawRange(0, Math.floor(clamp((t - Tp) / (sl[4].end + .4 - Tp)) * trace.userData.n) + 1);
    trace.material.opacity = t > Tp ? 1 : 0;
    const wide = [V(0, 8.6, 7.2), V(0, -.2, .6)];
    const close = [moon.position.clone().add(V(.4, 1.5, 2.6)), moon.position.clone().add(V(0, -.05, 0))];
    const k = ramp(t, sl[1].start - .2, sl[1].start + 1.2) * (1 - ramp(t, sl[1].end + .2, sl[2].start + .8));
    place(camera, vlerp(wide[0], close[0], k), vlerp(wide[1], close[1], k));
    // sight line Earth -> Moon during the phase orbit
    const so = win(t, Tp - .3, sl[4].end + .8);
    const p0 = moon.position.clone().normalize().multiplyScalar(1.05), p1 = moon.position.clone().multiplyScalar(1 - moon.userData.r * 1.1 / R);
    sight.geometry.setFromPoints([p0, p1]); sight.computeLineDistances(); sight.material.opacity = so * .9;
    const labels = [], insets = [];
    labels.push({ text: 'Moon', p: moon.position.clone().add(V(0, .75, 0)), o: win(t, sl[0].start - .2, sl[1].start), cls: 'moon', s: pop(t, sl[0].start - .2) });
    labels.push({ text: 'Earth', p: V(0, 1.5, 0), o: win(t, sl[0].start + .4, sl[1].start), cls: 'cool' });
    labels.push({ text: 'Sunlight', xy: [170, 540], o: 1, cls: 'sun' });
    const ko = clamp((k - .7) / .3);
    labels.push({ text: 'Lit half', xy: [700, 300], o: ko * fadeIn(t, sl[1].start + 1.8), cls: 'sun' });
    labels.push({ text: 'Dark half', xy: [1220, 300], o: ko * fadeIn(t, sl[1].start + 2.6), cls: 'cool' });
    const el = ((a - az(V(-1, 0, 0))) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
    const io = win(t, Tp - .4, S.month.end + 1);
    insets.push({ kind: 'phase', x: 1620, y: 330, r: 170, elong: el, o: io, title: 'What we see from Earth' });
    const names = [[0, 'New Moon'], [Math.PI / 2, 'First Quarter'], [Math.PI, 'Full Moon'], [Math.PI * 1.5, 'Last Quarter'], [Math.PI * 2, 'New Moon']];
    for (const [e, nm] of names) { const d = Math.abs(el - e); if (d < .4) labels.push({ text: nm, xy: [1620, 600], o: io * clamp((.4 - d) / .15), cls: 'moon' }); }
    labels.push({ text: '1 trip ≈ 1 month', xy: [960, 160], o: fadeIn(t, sl[4].start), cls: 'big sun', s: pop(t, sl[4].start) });
    return { labels, insets, chapter: 'month', note: true };
  } };
}

function weekShot() {
  const scene = stage(); scene.add(stars(.7));
  const moons = [], xs = [-4.2, -1.4, 1.4, 4.2];
  const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
  xs.forEach((x, i) => {
    const m = makeMoon(3.4); m.position.set(x, .9, 0);
    const e = i * Math.PI / 2; m.material.uniforms.sunDir.value.set(Math.sin(e), 0, -Math.cos(e));
    m.material.uniforms.amb.value = .09; scene.add(m); moons.push(m);
  });
  const ring = circleLine(.27 * 3.4 + .03, 0xffffff, .5, a => V(xs[0] + (.27 * 3.4 + .03) * Math.sin(a), .9 + (.27 * 3.4 + .03) * Math.cos(a), 0));
  scene.add(ring);
  const camera = cam(32); place(camera, V(0, 0, 13.5), V(0, -.2, 0));
  const l0 = L('week', 0), l1 = L('week', 1);
  return { scene, camera, update(t) {
    const t0 = S.week.start;
    moons.forEach((m, i) => { const s = Math.max(.001, pop(t, t0 + .25 + i * .3)); m.scale.setScalar(s); });
    ring.material.opacity = .5 * fadeIn(t, t0 + .25);
    const labels = [], html = [];
    moons.forEach((m, i) => labels.push({ text: names[i], p: m.position.clone().add(V(0, -1.35, 0)), o: fadeIn(t, t0 + .4 + i * .3), cls: 'plain' }));
    for (let i = 0; i < 3; i++) {
      const st = l0.start + .5 + i * .9;
      labels.push({ text: '7 days →', p: V((xs[i] + xs[i + 1]) / 2, 2.35, 0), o: fadeIn(t, st), cls: 'sun', s: pop(t, st) });
    }
    for (let d = 0; d < 7; d++) {
      const st = l1.start + .15 + d * .25, s = pop(t, st);
      if (s > 0) html.push(`<div class="chip" style="left:${960 + (d - 3) * 128}px;top:735px;transform:scale(${s})">${d + 1}</div>`);
    }
    labels.push({ text: '1 week = 7 days', xy: [960, 870], o: fadeIn(t, l1.start + 2.0), cls: 'big sun', s: pop(t, l1.start + 2.0) });
    return { labels, html: html.join(''), chapter: 'week' };
  } };
}

function yearShot() {
  const scene = stage(); scene.add(stars());
  const sun = makeSun(2.0); scene.add(sun);
  scene.add(new THREE.PointLight(0xffffff, 260, 0, 2));
  const R = 9, E = makeEarth(); E.root.scale.setScalar(.85); E.tilt.rotation.z = -TILT; E.axis.visible = true; scene.add(E.root);
  scene.add(circleLine(R, 0x8fb4ff, .3));
  const trace = arcLine(R + .001, -Math.PI / 2, 0xffc93c); scene.add(trace);
  const sl = S.year.lines;
  const camera = cam(38);
  return { scene, camera, update(t) {
    const orbit = ramp(t, sl[0].start + .1, sl[1].end + .3);
    const toWinter = ramp(t, sl[3].end - .5, sl[4].start + .4);
    const a = -Math.PI / 2 + Math.PI * 2 * orbit + Math.PI * toWinter;
    const ep = V(R * Math.sin(a), 0, R * Math.cos(a));
    E.root.position.copy(ep); E.spin.rotation.y = t * Math.PI * 2 / 6; E.setSun(V(0, 0, 0));
    trace.geometry.setDrawRange(0, Math.floor(orbit * trace.userData.n) + 1);
    trace.material.opacity = 1 - ramp(t, sl[2].start, sl[2].start + .8);
    const toSun = ep.clone().negate().normalize();
    const close = [ep.clone().add(toSun.clone().multiplyScalar(2.4)).add(V(0, .9, 5.4)), ep.clone().add(toSun.clone().multiplyScalar(1.4))];
    const wide = [V(0, 12.5, 17.5), V(0, -1, 0)];
    const k = ramp(t, sl[1].end + .2, sl[2].start + 1.2);
    place(camera, vlerp(wide[0], close[0], k), vlerp(wide[1], close[1], k));
    E.axis.material.color.set(t > sl[2].start && t < sl[3].start ? 0xffc93c : 0xffffff);
    const labels = [];
    labels.push({ text: 'Sun', p: V(0, 3.1, 0), o: 1 - k, cls: 'sun' });
    labels.push({ text: 'Earth', p: ep.clone().add(V(0, 1.5, 0)), o: win(t, S.year.start, sl[1].start) , cls: 'cool' });
    labels.push({ text: '1 trip = 1 year', xy: [960, 170], o: win(t, sl[1].start, sl[2].start + .3), cls: 'big sun', s: pop(t, sl[1].start) });
    labels.push({ text: 'Tilted!', p: E.tilt.localToWorld(V(0, 1.45, 0)), off: [90, -20], o: win(t, sl[2].start + .6, sl[3].start), cls: 'sun', s: pop(t, sl[2].start + .6) });
    const yourSide = E.tilt.localToWorld(lonLatDir(0, 42).set(0, Math.sin(.73), Math.cos(.73)));
    labels.push({ text: 'Your side', p: yourSide, dot: true, off: [-170, -90], o: fadeIn(t, sl[3].start - .3) * (1 - ramp(t, sl[3].end - .5, sl[3].end)) + fadeIn(t, sl[4].start) });
    const sunSide = toSun.x > 0 ? 1 : -1;
    labels.push({ text: 'SUMMER', xy: [960 - sunSide * 520, 220], o: win(t, sl[3].start + 2.2, sl[3].end - .3), cls: 'big warm', s: pop(t, sl[3].start + 2.2) });
    labels.push({ text: 'WINTER', xy: [960 - sunSide * 520, 220], o: fadeIn(t, sl[4].start + 2.0), cls: 'big cool', s: pop(t, sl[4].start + 2.0) });
    labels.push({ text: sunSide > 0 ? 'Sun →' : '← Sun', xy: [sunSide > 0 ? 1780 : 140, 540], o: k * (1 - win(t, sl[3].end - .5, sl[4].start + .4, .2)), cls: 'sun' });
    return { labels, chapter: 'year', note: true };
  } };
}

// eclipse, space view. tilted=true: the Moon's orbit is tipped so it passes above the Sun-Earth line
function eclipseSpace(tilted) {
  const scene = stage(); scene.add(stars());
  const sunPos = V(-9.5, 0, 0), ep = V(4.5, 0, 0);
  const sun = makeSun(1.7); sun.position.copy(sunPos); scene.add(sun);
  const pl = new THREE.PointLight(0xffffff, 300, 0, 2); pl.position.copy(sunPos); scene.add(pl);
  const E = makeEarth(); E.root.position.copy(ep); scene.add(E.root);
  const R = 3.0, inc = tilted ? .42 : 0;
  const mpos = a => V(R * Math.sin(a) * Math.cos(inc), -R * Math.sin(a) * Math.sin(inc), R * Math.cos(a)).add(ep);
  const orbit = circleLine(R, 0x8fb4ff, .4, mpos); scene.add(orbit);
  const moon = makeMoon(1.2); scene.add(moon);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(.1, moon.userData.r, 1, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(cone);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, ep]),
    new THREE.LineDashedMaterial({ color: 0xffe08a, dashSize: .25, gapSize: .18, transparent: true, opacity: 0 }));
  line.computeLineDistances(); scene.add(line);
  const camera = cam(46);
  const el = S.eclipse.lines;
  return { scene, camera, update(t) {
    let a;
    if (!tilted) a = -Math.PI / 2 + (t - (el[1].start + 1.5)) * .085 - 1.5 * (1 - ramp(t, S.eclipse.start, el[0].end + .2));
    else a = lerp(-2.75, -.4, clamp((t - el[3].start + .3) / (el[3].end - el[3].start + .8)));
    moon.position.copy(mpos(a)); moon.rotation.y = a + Math.PI; moon.setSun(sunPos);
    E.spin.rotation.y = t * Math.PI * 2 / 8; E.setSun(sunPos);
    // shadow along the Sun -> Moon line
    const dir = moon.position.clone().sub(sunPos).normalize();
    const oc = moon.position.clone().sub(ep);
    const b = oc.dot(dir), c = oc.lengthSq() - 1, disc = b * b - c;
    const tc = -b, closest = oc.clone().add(dir.clone().multiplyScalar(tc)).length();
    const hitAmt = tc > 0 ? 1 - THREE.MathUtils.smoothstep(closest, .75, 1.25) : 0;
    let len = 4.2;
    if (disc > 0 && tc > 0) { const th = -b - Math.sqrt(disc); E.mat.uniforms.shC.value.copy(moon.position).add(dir.clone().multiplyScalar(th)); len = th; }
    E.mat.uniforms.shA.value = hitAmt; E.mat.uniforms.shR.value = .55;
    const vis = tc > 0 ? clamp(1.6 - Math.abs(moon.position.z) * 1.1) : 0;
    cone.scale.set(1, len, 1);
    cone.position.copy(moon.position).add(dir.clone().multiplyScalar(len / 2));
    cone.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    cone.material.opacity = .5 * vis; cone.visible = vis > .01;
    const labels = [];
    if (!tilted) {
      const k = ramp(t, el[1].start - .2, el[1].start + 1.3);
      place(camera, vlerp(V(-2.5, 2.2, 11.5), V(.6, 1.6, 5.4), k), vlerp(V(-2.5, 0, 0), V(3.2, 0, 0), k));
      const t0 = S.eclipse.start;
      labels.push({ text: 'Sun', p: sunPos.clone().add(V(0, 2.6, 0)), o: (1 - k) * fadeIn(t, t0 + .3), cls: 'sun' });
      labels.push({ text: 'Moon', p: moon.position.clone().add(V(0, .85, 0)), o: fadeIn(t, t0 + .7), cls: 'moon' });
      labels.push({ text: 'Earth', p: ep.clone().add(V(0, 1.6, 0)), o: fadeIn(t, t0 + 1.1) * (1 - k), cls: 'cool' });
      labels.push({ text: "Moon's shadow", p: E.mat.uniforms.shC.value.clone(), dot: true, off: [150, 150], o: hitAmt * fadeIn(t, el[1].start + 1.6) });
      labels.push({ text: 'Sunlight', p: sunPos.clone().add(V(3.3, -1.1, 0)), o: (1 - k), cls: 'sun' });
    } else {
      place(camera, V(-1.5, 2.6, 10.5), V(-.8, .2, 0));
      line.material.opacity = .8 * fadeIn(t, S.eclipse.lines[3].start - .2);
      labels.push({ text: 'Sun', p: sunPos.clone().add(V(0, 2.5, 0)), o: 1, cls: 'sun' });
      labels.push({ text: 'Earth', p: ep.clone().add(V(0, -1.6, 0)), o: 1, cls: 'cool' });
      labels.push({ text: 'Moon', p: moon.position.clone().add(V(0, .8, 0)), o: 1, cls: 'moon' });
      const pass = Math.abs(a + Math.PI / 2) < .45;
      labels.push({ text: 'Shadow misses Earth!', xy: [1380, 250], o: win(t, el[3].start + 1.8, S.eclipse.lines[4].start, .3) * (pass ? 1 : .0) + 0, cls: 'big warm' });
      labels.push({ text: "The Moon's path is tilted", xy: [700, 170], o: fadeIn(t, el[3].start + .4), cls: 'cool' });
    }
    return { labels, chapter: 'eclipse', note: true };
  } };
}

function groundStage() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#7cc8ff');
  const hemi = new THREE.HemisphereLight(0xdff1ff, 0x5a8a3a, 1.6); scene.add(hemi);
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 10, 4); scene.add(dl);
  const gmat = new THREE.MeshLambertMaterial({ color: 0x6cc04a });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gmat); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  [[-14, -30, 9, 0x5fb244], [16, -36, 12, 0x63b847], [2, -55, 16, 0x58a83f]].forEach(([x, z, r, c]) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshLambertMaterial({ color: c })); h.scale.y = .35; h.position.set(x, 0, z); scene.add(h); });
  const house = makeHouse(); house.scale.setScalar(2.2); house.position.set(-3.2, 0, -4); house.rotation.y = .5; scene.add(house);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2, .28, 2, 12), new THREE.MeshLambertMaterial({ color: 0x8a5a33 })); trunk.position.set(3.4, 1, -5); scene.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), new THREE.MeshLambertMaterial({ color: 0x3f9a3a })); crown.position.set(3.4, 2.8, -5); scene.add(crown);
  const sky = stars(); sky.children.forEach(p => p.material.opacity = 0); scene.add(sky);
  const camera = cam(50); place(camera, V(0, 1.4, 6.5), V(0, 4.4, -10));
  const sunC = V(.2, 15.5, -32);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(2.0, 64), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
  sunDisc.position.copy(sunC); sunDisc.lookAt(camera.position); scene.add(sunDisc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xfff0b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(13); glow.position.copy(sunC).add(V(0, 0, -.5)); scene.add(glow);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: CORONA, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  corona.scale.setScalar(9.5); corona.position.copy(sunC).add(V(0, 0, -.3)); scene.add(corona);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(2.06, 64), new THREE.MeshBasicMaterial({ color: 0x1c2030 }));
  moonDisc.position.copy(sunC).add(V(0, 0, .4)); moonDisc.lookAt(camera.position); scene.add(moonDisc);
  return { scene, camera, hemi, dl, gmat, sky, sunDisc, glow, corona, moonDisc, sunC };
}
const DAY_SKY = new THREE.Color('#7cc8ff'), ECL_SKY = new THREE.Color('#0e1633');
function overlapFrac(d) { if (d >= 2) return 0; return (2 * Math.acos(d / 2) - (d / 2) * Math.sqrt(4 - d * d)) / Math.PI; }

function eclipseGround() {
  const G = groundStage();
  const ln = S.eclipse.lines[2];
  return { scene: G.scene, camera: G.camera, update(t) {
    const d = lerp(2.3, 0, ramp(t, ln.start - .4, ln.start + 2.0)) ;
    G.moonDisc.position.copy(G.sunC).add(V(d * 2.0, d * .5, .4));
    const f = overlapFrac(d), dark = Math.pow(f, 5);
    G.scene.background.copy(DAY_SKY).lerp(ECL_SKY, dark);
    G.hemi.intensity = lerp(1.6, .25, dark); G.dl.intensity = lerp(2.2, .1, dark);
    G.glow.material.opacity = 1 - f; G.corona.material.opacity = clamp((f - .97) / .03) * .95;
    G.sky.children.forEach((p, i) => p.material.opacity = clamp((dark - .7) / .3) * (i ? .6 : 1));
    const labels = [{ text: 'SOLAR ECLIPSE', xy: [960, 650], o: fadeIn(t, ln.start + 2.2), cls: 'huge', s: pop(t, ln.start + 2.2) }];
    labels.push({ text: 'Moon', p: G.moonDisc.position.clone().add(V(0, -2.9, 0)), o: win(t, ln.start - .4, ln.start + 1.2), cls: 'moon' });
    return { labels, chapter: 'eclipse' };
  } };
}
function warningShot() {
  const G = groundStage();
  G.moonDisc.visible = false;
  const svg = `<svg width="200" height="200" viewBox="0 0 200 200"><g stroke="#ffb020" stroke-width="10" stroke-linecap="round">
    ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${100 + Math.cos(a) * 52}" y1="${100 + Math.sin(a) * 52}" x2="${100 + Math.cos(a) * 72}" y2="${100 + Math.sin(a) * 72}"/>`; }).join('')}
    </g><circle cx="100" cy="100" r="40" fill="#ffd23f"/><circle cx="100" cy="100" r="88" fill="none" stroke="#d7263d" stroke-width="16"/>
    <line x1="38" y1="162" x2="162" y2="38" stroke="#d7263d" stroke-width="16" stroke-linecap="round"/></svg>`;
  const ln = S.eclipse.lines[4];
  return { scene: G.scene, camera: G.camera, update(t) {
    const s = pop(t, ln.start - .3), o = fadeIn(t, ln.start - .3);
    const html = o > 0 ? `<div id="card" style="opacity:${o};transform:translate(-50%,-50%) scale(${s})">${svg}<h1>Never look at the Sun!</h1>
      <p>Not even during an eclipse. Grown-ups use special eclipse glasses.</p></div>` : '';
    return { html, chapter: 'eclipse' };
  } };
}

// ============================================================ EDIT
const EC = S.eclipse.lines;
const cutB = (EC[1].end + EC[2].start) / 2, cutC = (EC[2].end + EC[3].start) / 2, cutD = (EC[3].end + EC[4].start) / 2;
const SHOTS = [
  { start: 0, end: S.intro.end, build: () => systemShot('intro') },
  { start: S.day.start, end: S.day.end, build: dayShot },
  { start: S.hours.start, end: S.hours.end, build: hoursShot },
  { start: S.month.start, end: S.month.end, build: monthShot },
  { start: S.week.start, end: S.week.end, build: weekShot },
  { start: S.year.start, end: S.year.end, build: yearShot },
  { start: S.eclipse.start, end: cutB, build: () => eclipseSpace(false) },
  { start: cutB, end: cutC, build: eclipseGround },
  { start: cutC, end: cutD, build: () => eclipseSpace(true) },
  { start: cutD, end: S.eclipse.end, build: warningShot },
  { start: S.outro.start, end: DURATION + 1, build: () => systemShot('outro') },
];
const CHAPTERS = { day: [1, 'Day & Night'], hours: [2, 'Hours'], month: [3, 'Months'], week: [4, 'Weeks'], year: [5, 'Years & Seasons'], eclipse: [6, 'Solar Eclipse'] };
const built = SHOTS.map(s => ({ ...s, shot: s.build() }));

// ============================================================ OVERLAY
const $ = id => document.getElementById(id);
const labelLayer = $('labels'), extra = $('extra');
const insetBox = document.createElement('div'), htmlBox = document.createElement('div');
extra.append(insetBox, htmlBox);
const insetPool = [];
function project(p, camera) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z < 1]; }
function drawSky(g, R, elev, east) {
  const D = R * 2; g.clearRect(0, 0, D, D);
  const day = clamp((elev + .08) / .3), dusk = clamp(1 - Math.abs(elev) / .18);
  const top = new THREE.Color('#0b1030').lerp(new THREE.Color('#3d9be9'), day), bot = new THREE.Color('#1a1f4a').lerp(new THREE.Color('#bfe6ff'), day);
  bot.lerp(new THREE.Color('#ff9a5a'), dusk * .7);
  const gr = g.createLinearGradient(0, 0, 0, D); gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(1, '#' + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, D, D);
  const r = rng(5); g.fillStyle = `rgba(255,255,255,${clamp(1 - day * 1.6)})`;
  for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * D, r() * D * .7, 1 + r() * 2.2, 0, 7); g.fill(); }
  // sun: east on the left when facing south
  const hz = D * .74;
  const sx = R - east * R * .8, sy = hz - elev * D * .62;
  if (elev > -.15) { const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 70); sg.addColorStop(0, 'rgba(255,240,170,1)'); sg.addColorStop(.35, 'rgba(255,215,90,1)'); sg.addColorStop(.4, 'rgba(255,200,80,.5)'); sg.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 70, 0, 7); g.fill(); }
  const gc = new THREE.Color('#1d3b22').lerp(new THREE.Color('#5fb244'), day);
  g.fillStyle = '#' + gc.getHexString(); g.beginPath(); g.moveTo(0, hz); g.quadraticCurveTo(R, hz - 30, D, hz + 10); g.lineTo(D, D); g.lineTo(0, D); g.fill();
  // little house
  const hx = R * .62, hy = hz + 4, s = 34;
  g.fillStyle = day > .3 ? '#fff1d0' : '#6a6650'; g.fillRect(hx - s / 2, hy - s * .8, s, s * .8);
  g.fillStyle = day > .3 ? '#e2483d' : '#5a2a28'; g.beginPath(); g.moveTo(hx - s * .65, hy - s * .78); g.lineTo(hx, hy - s * 1.35); g.lineTo(hx + s * .65, hy - s * .78); g.fill();
  g.fillStyle = day > .3 ? '#6cc3ff' : '#ffd86b'; g.fillRect(hx + s * .1, hy - s * .62, s * .25, s * .22);
}
function drawPhase(g, R, elong) {
  const D = R * 2; g.clearRect(0, 0, D, D);
  g.fillStyle = '#060a1c'; g.fillRect(0, 0, D, D);
  const r = R * .78, cx = R, cy = R;
  g.globalAlpha = .1; g.drawImage(MOONFACE, cx - r, cy - r, r * 2, r * 2); g.globalAlpha = 1;
  const s = elong < Math.PI ? 1 : -1, c = Math.cos(elong);
  g.save(); g.beginPath();
  const N = 64;
  for (let i = 0; i <= N; i++) { const th = -Math.PI / 2 + i / N * Math.PI; const x = cx + s * r * Math.cos(th), y = cy + r * Math.sin(th); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let i = N; i >= 0; i--) { const th = -Math.PI / 2 + i / N * Math.PI; g.lineTo(cx + s * c * r * Math.cos(th), cy + r * Math.sin(th)); }
  g.closePath(); g.clip(); g.drawImage(MOONFACE, cx - r, cy - r, r * 2, r * 2); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
}
function overlay(t, out, camera) {
  // labels
  const items = (out.labels || []).filter(l => l.o > .01);
  labelLayer.innerHTML = items.map(l => {
    let [x, y, ok] = l.p ? project(l.p, camera) : [...l.xy, true];
    if (!ok) return '';
    const off = l.off || [0, 0];
    let h = '';
    if (l.dot) {
      const lx = x + off[0], ly = y + off[1], len = Math.hypot(off[0], off[1]) - 26, ang = Math.atan2(off[1], off[0]);
      h += `<div class="lead" style="left:${x}px;top:${y}px;width:${Math.max(0, len)}px;transform:rotate(${ang}rad);opacity:${l.o}"></div><div class="dot" style="left:${x}px;top:${y}px;opacity:${l.o}"></div>`;
      x = lx; y = ly;
    } else { x += off[0]; y += off[1]; }
    return h + `<div class="lbl ${l.cls || ''}" style="left:${x}px;top:${y}px;opacity:${l.o};transform:translate(-50%,-50%) scale(${l.s ?? 1})">${l.text}</div>`;
  }).join('');
  // insets
  const ins = (out.insets || []).filter(i => i.o > .01);
  while (insetPool.length < ins.length) {
    const wrap = document.createElement('div'); const cv = document.createElement('canvas'); cv.className = 'inset'; const tt = document.createElement('div'); tt.className = 'inset-title';
    wrap.append(cv, tt); insetBox.append(wrap); insetPool.push({ wrap, cv, tt });
  }
  insetPool.forEach((p, i) => {
    const d = ins[i]; p.wrap.style.display = d ? '' : 'none'; if (!d) return;
    const D = d.r * 2; if (p.cv.width !== D) { p.cv.width = p.cv.height = D; }
    Object.assign(p.cv.style, { left: d.x - d.r + 'px', top: d.y - d.r + 'px', width: D + 'px', height: D + 'px' });
    Object.assign(p.tt.style, { left: d.x + 'px', top: d.y - d.r - 56 + 'px' });
    p.tt.textContent = d.title; p.wrap.style.opacity = d.o;
    const g = p.cv.getContext('2d');
    if (d.kind === 'sky') drawSky(g, d.r, d.elev, d.east); else drawPhase(g, d.r, d.elong);
  });
  htmlBox.innerHTML = out.html || '';
  // chapter, note
  const ch = CHAPTERS[out.chapter];
  $('chapter').style.display = ch ? '' : 'none';
  if (ch) $('chapter').innerHTML = `<b>${ch[0]}</b>${ch[1]}`;
  $('note').style.opacity = out.note ? 1 : 0;
  // caption
  const lines = TL.scenes.flatMap(s => s.lines);
  let cap = '', co = 0;
  lines.forEach((l, i) => {
    const nx = lines[i + 1] ? lines[i + 1].start - .15 : DURATION;
    const end = Math.min(l.end + .7, nx);
    if (t >= l.start - .15 && t < end) { cap = l.text; co = Math.min(clamp((t - l.start + .15) / .15), clamp((end - t) / .15)); }
  });
  $('caption').textContent = cap; $('caption').style.opacity = co;
  // dips to black at every cut, fade out at the end
  let f = 0;
  for (const s of SHOTS.slice(1)) f = Math.max(f, 1 - Math.abs(t - s.start) / .3);
  f = Math.max(f, clamp((t - (DURATION - 1.2)) / 1.0), clamp(1 - t / .4));
  $('fade').style.opacity = clamp(f);
}

window.renderAt = (t) => {
  let s = built.find(b => t >= b.start && t < b.end) || built[built.length - 1];
  const out = s.shot.update(t) || {};
  renderer.render(s.shot.scene, s.shot.camera);
  overlay(t, out, s.shot.camera);
};
window.DURATION = DURATION;
await document.fonts.ready;
await Promise.all([500, 600, 700].map(w => document.fonts.load(`${w} 40px Fredoka`)));
// compile every shot once so the first frame of each is not slow
for (const b of built) { b.shot.update(b.start + .01); renderer.compile(b.shot.scene, b.shot.camera); }

const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(parseFloat(q.get('t')));
else if (!navigator.webdriver) {
  const audio = new Audio('audio/vo.wav'); let t0 = null;
  window.renderAt(0);
  document.body.addEventListener('click', () => { audio.currentTime = 0; audio.play(); t0 = performance.now(); });
  const loop = () => { if (t0 !== null) window.renderAt(Math.min(DURATION, audio.currentTime)); requestAnimationFrame(loop); };
  loop();
}
window.ready = true;
