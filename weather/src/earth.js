import * as THREE from 'three';
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
export { earthTexture };
