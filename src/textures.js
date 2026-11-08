import * as THREE from 'three';

export function rng(seed = 1234567) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function noiseOverlay(ctx, size, amount = 16, rand = Math.random) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() * 2 - 1) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function drawCracks(ctx, rand, size, count, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + Math.floor(rand() * 5);
    for (let s = 0; s < segs; s++) {
      x += (rand() - 0.5) * 46;
      y += (rand() - 0.5) * 46;
      ctx.lineTo(x, y);
    }
    ctx.lineWidth = 0.4 + rand() * 1.2;
    ctx.globalAlpha = 0.18 + rand() * 0.3;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function stain(ctx, rand, size, count, color) {
  for (let i = 0; i < count; i++) {
    const x = rand() * size, y = rand() * size, r = 8 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function makeFloorTexture(theme) {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rand = rng(theme.seed || 991);
  ctx.fillStyle = theme.floorBase;
  ctx.fillRect(0, 0, size, size);

  const cols = 4, rows = 4, tw = size / cols, th = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * tw, py = y * th;
      const v = 0.82 + rand() * 0.28;
      ctx.fillStyle = shade(theme.floorTile, v);
      ctx.fillRect(px + 2, py + 2, tw - 4, th - 4);
      // bevel
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      ctx.fillRect(px + 3, py + 3, tw - 6, 3);
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.fillRect(px + 3, py + th - 6, tw - 6, 3);
      // inset panel
      ctx.strokeStyle = 'rgba(0,0,0,.13)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + tw * 0.18, py + th * 0.18, tw * 0.64, th * 0.64);
      if (rand() < 0.3) {
        ctx.fillStyle = 'rgba(0,0,0,.09)';
        ctx.beginPath();
        ctx.ellipse(px + rand() * tw, py + rand() * th, 12 + rand() * 28, 5 + rand() * 14, rand() * 3, 0, 7);
        ctx.fill();
      }
    }
  }
  // grout lines
  ctx.strokeStyle = 'rgba(8,6,5,.55)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath(); ctx.moveTo(x * tw, 0); ctx.lineTo(x * tw, size); ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * th); ctx.lineTo(size, y * th); ctx.stroke();
  }
  stain(ctx, rand, size, 8, theme.stain || 'rgba(15,8,5,.28)');
  drawCracks(ctx, rand, size, 16, 'rgba(6,4,3,.7)');
  noiseOverlay(ctx, size, 15, rand);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function makeWallTexture(theme) {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rand = rng((theme.seed || 442) + 7);
  ctx.fillStyle = theme.wallBase;
  ctx.fillRect(0, 0, size, size);
  const rows = 6, cols = 4;
  const bh = size / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (size / cols) * 0.5;
    for (let col = -1; col < cols + 1; col++) {
      const x = col * (size / cols) + offset;
      const y = r * bh;
      const bw = size / cols;
      const v = 0.84 + rand() * 0.26;
      ctx.fillStyle = shade(theme.wallTile, v);
      ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      ctx.fillRect(x + 3, y + 3, bw - 6, 3);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(x + 3, y + bh - 7, bw - 6, 4);
      if (rand() < 0.16) {
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.beginPath();
        ctx.arc(x + 10 + rand() * (bw - 20), y + 10 + rand() * (bh - 20), 2 + rand() * 7, 0, 7);
        ctx.fill();
      }
    }
  }
  // mortar
  ctx.strokeStyle = 'rgba(5,4,3,.65)';
  ctx.lineWidth = 4;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * bh); ctx.lineTo(size, r * bh); ctx.stroke();
  }
  // moss / damp
  stain(ctx, rand, size, 5, theme.moss || 'rgba(40,52,28,.20)');
  stain(ctx, rand, size, 6, 'rgba(0,0,0,.22)');
  drawCracks(ctx, rand, size, 10, 'rgba(4,3,2,.8)');
  noiseOverlay(ctx, size, 18, rand);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function shade(hex, v) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(v);
  return '#' + c.getHexString();
}

export function makeGlowTexture(color = '#9feaff') {
  const size = 128;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, color);
  g.addColorStop(0.42, `rgba(${rgb},.38)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSoftShadowTexture() {
  const size = 128;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,.7)');
  g.addColorStop(0.55, 'rgba(0,0,0,.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function makeSplatTexture(seed = 1, color = '#4a0909') {
  const size = 128;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rand = rng(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  const cx = 64, cy = 64;
  const pts = 14;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = 16 + rand() * 25;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.7;
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = 20 + rand() * 38;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rand() * 5, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeRuneTexture() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.translate(128, 128);
  ctx.strokeStyle = 'rgba(231,193,116,.9)';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  for (let ring = 0; ring < 3; ring++) {
    ctx.beginPath();
    ctx.arc(0, 0, 35 + ring * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -80);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-5, 12); ctx.lineTo(5, 12); ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // central star
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 17 : 36;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeParticleTexture() {
  const size = 64;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
