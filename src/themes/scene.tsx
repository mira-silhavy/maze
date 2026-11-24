import { useEffect, useId, useRef } from 'react';
import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from './catalog';

const STAR_COLORS = ['#e0f2fe', '#c4b5fd', '#fef08a', '#f8fafc', '#93c5fd'];

const GLADE_POOLS = [
  { fx: 0.2, fy: 0.25, fr: 0.36, color: '#34d399', opacity: 0.11 },
  { fx: 0.78, fy: 0.68, fr: 0.4, color: '#10b981', opacity: 0.09 },
  { fx: 0.56, fy: 0.18, fr: 0.28, color: '#facc15', opacity: 0.06 },
] as const;

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function collectWallJunctions(
  wallSegments: ReadonlyArray<[number, number, number, number]>,
): Array<{ x: number; y: number }> {
  const counts = new Map<string, { x: number; y: number; n: number }>();
  for (const [x1, y1, x2, y2] of wallSegments) {
    for (const [px, py] of [
      [x1, y1],
      [x2, y2],
    ]) {
      const key = `${Math.round(px)},${Math.round(py)}`;
      const existing = counts.get(key);
      if (existing) existing.n += 1;
      else counts.set(key, { x: px, y: py, n: 1 });
    }
  }
  const pts: Array<{ x: number; y: number }> = [];
  for (const pt of counts.values()) {
    if (pt.n >= 2) pts.push({ x: pt.x, y: pt.y });
  }
  return pts;
}

const NEBULA_CLOUDS = [
  {
    fx: 0.22,
    fy: 0.28,
    fr: 0.42,
    color: '#6366f1',
    opacity: 0.2,
  },
  {
    fx: 0.78,
    fy: 0.72,
    fr: 0.46,
    color: '#c026d3',
    opacity: 0.14,
  },
  {
    fx: 0.65,
    fy: 0.22,
    fr: 0.34,
    color: '#0ea5e9',
    opacity: 0.16,
  },
] as const;

interface StarPoint {
  fx: number;
  fy: number;
  r: number;
  color: string;
  opacity: number;
  sparkle: boolean;
}

function generateStars(count: number): StarPoint[] {
  const stars: StarPoint[] = [];
  for (let i = 0; i < count; i++) {
    const fx = (((Math.sin(i * 127.1 + 3.1) * 43758.5453) % 1) + 1) % 1;
    const fy = (((Math.sin(i * 269.5 + 5.7) * 24634.6345) % 1) + 1) % 1;
    stars.push({
      fx,
      fy,
      r: i % 11 === 0 ? 1.65 : i % 3 === 0 ? 1.15 : 0.75,
      color: STAR_COLORS[i % STAR_COLORS.length],
      opacity: i % 11 === 0 ? 0.85 : 0.48,
      sparkle: i % 17 === 0,
    });
  }
  return stars;
}

export function drawThemedBackdropCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  rows: number,
  cols: number,
  theme: MazeTheme,
  isPage = false,
): void {
  const { backdrop } = theme.scene;

  if (backdrop === 'nebula') {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, '#050816');
    base.addColorStop(0.5, '#0b1026');
    base.addColorStop(1, '#090d1f');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    for (const cl of NEBULA_CLOUDS) {
      const cx = cl.fx * width;
      const cy = cl.fy * height;
      const rad = cl.fr * Math.max(width, height);
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      g.addColorStop(0, cl.color);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.globalAlpha = cl.opacity;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.save();
    const starCount = isPage
      ? 160
      : Math.min(96, Math.max(48, Math.floor((rows * cols) / 3)));
    for (const star of generateStars(starCount)) {
      const px = star.fx * width;
      const py = star.fy * height;
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.opacity;
      ctx.beginPath();
      ctx.arc(px, py, star.r, 0, Math.PI * 2);
      ctx.fill();

      if (star.sparkle) {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(px - 4.5, py);
        ctx.lineTo(px + 4.5, py);
        ctx.moveTo(px, py - 4.5);
        ctx.lineTo(px, py + 4.5);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  if (backdrop === 'radar') {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(width, height) * 0.52;
    const ringStep = Math.max(48, maxR / 4.5);
    for (let rad = ringStep; rad < maxR; rad += ringStep) {
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    const arm = Math.max(1.8, Math.min(2.8, cellSize * 0.075));
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = offsetX + (c + 0.5) * cellSize;
        const py = offsetY + (r + 0.5) * cellSize;
        ctx.moveTo(px - arm, py);
        ctx.lineTo(px + arm, py);
        ctx.moveTo(px, py - arm);
        ctx.lineTo(px, py + arm);
      }
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (backdrop === 'glade') {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, '#03190d');
    base.addColorStop(0.5, '#072b17');
    base.addColorStop(1, '#041d10');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const maxDim = Math.max(width, height);
    for (const pool of GLADE_POOLS) {
      const px = pool.fx * width;
      const py = pool.fy * height;
      const rad = pool.fr * maxDim;
      const g = ctx.createRadialGradient(px, py, 4, px, py, rad);
      g.addColorStop(0, pool.color);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.globalAlpha = pool.opacity;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(22, 101, 52, 0.28)';
    const mossCount = isPage ? 72 : 42;
    for (let i = 0; i < mossCount; i++) {
      const mx = hash(i * 4.1 + 3) * width;
      const my = hash(i * 6.7 + 11) * height;
      ctx.beginPath();
      ctx.arc(mx, my, 2.2 + hash(i * 2.3) * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const flyCount = isPage ? 48 : 26;
    const flyR = isPage ? 8.5 : 7;
    for (let i = 0; i < flyCount; i++) {
      const fx = hash(i * 7.3 + 1) * width;
      const fy = hash(i * 5.1 + 9) * height;
      const glow = 0.45 + hash(i * 2.9 + 5) * 0.45;
      const g = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, flyR);
      g.addColorStop(0, `rgba(254, 240, 138, ${glow * 0.85})`);
      g.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, flyR, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (backdrop === 'chart') {
    const base = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      isPage ? 40 : 20,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    base.addColorStop(0, '#fdf6e3');
    base.addColorStop(0.7, '#f6e4bc');
    base.addColorStop(1, '#e8cd96');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const rcx = width * (isPage ? 0.84 : 0.82);
    const rcy = height * 0.24;
    const reach = Math.hypot(width, height);
    const roseScale = isPage ? 1.85 : 1;
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.08)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      ctx.beginPath();
      ctx.moveTo(rcx, rcy);
      ctx.lineTo(rcx + Math.cos(a) * reach, rcy + Math.sin(a) * reach);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(rcx, rcy, 28 * roseScale, 0, Math.PI * 2);
    ctx.arc(rcx, rcy, 34 * roseScale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(120, 53, 15, 0.07)';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const rad = roseScale * (i % 2 === 0 ? (i % 4 === 0 ? 26 : 17) : 6);
      const a = (i * Math.PI) / 8 - Math.PI / 2;
      if (i === 0) ctx.moveTo(rcx + Math.cos(a) * rad, rcy + Math.sin(a) * rad);
      else ctx.lineTo(rcx + Math.cos(a) * rad, rcy + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();

    if (!isPage) {
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(5, 5, width - 10, height - 10);
    }
    ctx.restore();
    return;
  }

  if (backdrop === 'notebook') {
    ctx.fillStyle = '#fcfcfd';
    ctx.fillRect(0, 0, width, height);

    const step = isPage ? 24 : Math.max(10, cellSize / 2);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.11)';
    ctx.lineWidth = isPage ? 0.9 : 0.8;
    ctx.beginPath();
    for (let x = offsetX % step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY % step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.26)';
    ctx.lineWidth = isPage ? 1.4 : 1.2;
    const marginX = isPage ? Math.max(36, width * 0.08) : Math.max(6, offsetX - 5);
    ctx.beginPath();
    ctx.moveTo(marginX, 0);
    ctx.lineTo(marginX, height);
    ctx.stroke();
    return;
  }

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
}

export function strokeThemedWallsCanvas(
  ctx: CanvasRenderingContext2D,
  wallSegments: ReadonlyArray<[number, number, number, number]>,
  wallWidth: number,
  cellSize: number,
  theme: MazeTheme,
): void {
  const trace = () => {
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of wallSegments) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  };

  const { scene } = theme;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (scene.wallStyle === 'plasma') {
    ctx.save();
    ctx.strokeStyle = scene.wallGlow ?? 'rgba(96, 165, 250, 0.42)';
    ctx.lineWidth = wallWidth * 2.05;
    ctx.shadowColor = theme.pencilLine;
    ctx.shadowBlur = Math.max(5, cellSize * 0.24);
    trace();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = wallWidth;
    trace();
    ctx.stroke();

    ctx.strokeStyle = scene.wallCore ?? '#e0f2fe';
    ctx.lineWidth = Math.max(0.85, wallWidth * 0.36);
    trace();
    ctx.stroke();
  } else if (scene.wallStyle === 'doubleRail') {
    ctx.strokeStyle = theme.wall;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(2.6, wallWidth * 1.45);
    trace();
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = scene.wallInner ?? '#041226';
    ctx.lineWidth = Math.max(1.2, wallWidth * 0.62);
    trace();
    ctx.stroke();

    const dot = Math.max(2.4, wallWidth * 1.2);
    ctx.fillStyle = scene.wallNode ?? '#67e8f9';
    for (const pt of collectWallJunctions(wallSegments)) {
      ctx.fillRect(pt.x - dot / 2, pt.y - dot / 2, dot, dot);
    }
  } else if (scene.wallStyle === 'hedgerow') {
    const scale = wallWidth / 3.2;
    ctx.save();
    ctx.translate(1.5 * scale, 2.2 * scale);
    ctx.strokeStyle = 'rgba(2, 18, 9, 0.72)';
    ctx.lineWidth = Math.max(3.6, wallWidth * 2.2);
    trace();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = scene.wallGlow ?? '#14532d';
    ctx.lineWidth = Math.max(3.2, wallWidth * 1.85);
    trace();
    ctx.stroke();

    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = Math.max(2, wallWidth * 1.15);
    trace();
    ctx.stroke();

    const leafR = Math.max(1.2, wallWidth * 0.68);
    const jitter = Math.max(1, wallWidth * 0.72);
    for (let i = 0; i < wallSegments.length; i++) {
      const [x1, y1, x2, y2] = wallSegments[i];
      for (const t of [0.25, 0.55, 0.82]) {
        const lx = x1 + (x2 - x1) * t + (hash(i * 7 + t * 13) - 0.5) * jitter;
        const ly = y1 + (y2 - y1) * t + (hash(i * 11 + t * 19) - 0.5) * jitter;
        ctx.fillStyle = t === 0.55 ? (scene.wallCore ?? '#4ade80') : '#22c55e';
        ctx.beginPath();
        ctx.arc(lx, ly, leafR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const nodes = collectWallJunctions(wallSegments);
    const capR = Math.max(1.8, wallWidth * 0.96);
    const dewR = Math.max(0.8, wallWidth * 0.36);
    for (let i = 0; i < nodes.length; i++) {
      const { x: nx, y: ny } = nodes[i];
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(nx, ny, capR, 0, Math.PI * 2);
      ctx.fill();
      if (i % 4 === 0) {
        ctx.fillStyle = scene.wallNode ?? '#fef08a';
        ctx.beginPath();
        ctx.arc(nx - dewR * 0.5, ny - dewR * 0.5, dewR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (scene.wallStyle === 'inked') {
    const shift = Math.max(0.9, wallWidth * 0.44);
    ctx.save();
    ctx.translate(shift, shift);
    ctx.strokeStyle = scene.wallGlow ?? 'rgba(120, 53, 15, 0.20)';
    ctx.lineWidth = wallWidth * 1.45;
    trace();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = wallWidth;
    trace();
    ctx.stroke();

    const dSize = Math.max(2.4, wallWidth * 1.25);
    ctx.fillStyle = scene.wallNode ?? theme.wall;
    for (const pt of collectWallJunctions(wallSegments)) {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-dSize / 2, -dSize / 2, dSize, dSize);
      ctx.restore();
    }
  } else if (scene.wallStyle === 'fountain') {
    const sx = Math.max(0.8, wallWidth * 0.44);
    const sy = Math.max(1.0, wallWidth * 0.5);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.strokeStyle = scene.wallGlow ?? 'rgba(15, 23, 42, 0.14)';
    ctx.lineWidth = wallWidth * 1.22;
    trace();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = wallWidth;
    trace();
    ctx.stroke();
  } else {
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = wallWidth;
    trace();
    ctx.stroke();
  }

  ctx.restore();
}

export function drawThemedBridgeDeckCanvas(
  ctx: CanvasRenderingContext2D,
  half: number,
  overhang: number,
  deckW: number,
  cellSize: number,
  wallWidth: number,
  theme: MazeTheme,
): void {
  const { scene } = theme;

  if (scene.bridgeStyle === 'hardlight') {
    ctx.fillStyle = scene.bridgeDeck;
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);

    const glowGrad = ctx.createLinearGradient(0, -half, 0, half);
    glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
    glowGrad.addColorStop(0.5, 'rgba(129, 140, 248, 0.22)');
    glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0.34)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      -half - overhang,
      -half + wallWidth * 0.5,
      deckW,
      Math.max(1, cellSize - wallWidth),
    );
    ctx.clip();
    const step = Math.max(7, cellSize * 0.32);
    const chev = step * 0.35;
    ctx.strokeStyle = scene.bridgeAccent;
    ctx.lineWidth = Math.max(1, cellSize * 0.04);
    for (let x = -half - overhang; x < half + overhang + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x - chev, -half + wallWidth);
      ctx.lineTo(x + chev * 0.6, 0);
      ctx.lineTo(x - chev, half - wallWidth);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (scene.bridgeStyle === 'holodeck') {
    ctx.fillStyle = scene.bridgeDeck;
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      -half - overhang,
      -half + wallWidth * 0.5,
      deckW,
      Math.max(1, cellSize - wallWidth),
    );
    ctx.clip();
    const scanStep = Math.max(4.5, cellSize * 0.16);
    ctx.strokeStyle = scene.bridgeAccent;
    ctx.lineWidth = Math.max(0.8, cellSize * 0.028);
    for (let x = -deckW; x < deckW; x += scanStep) {
      ctx.beginPath();
      ctx.moveTo(x, -half);
      ctx.lineTo(x + cellSize * 0.6, half);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.5)';
    ctx.lineWidth = Math.max(1, cellSize * 0.035);
    ctx.setLineDash([
      Math.max(3, cellSize * 0.11),
      Math.max(3, cellSize * 0.11),
    ]);
    ctx.beginPath();
    ctx.moveTo(-half - overhang + 3, 0);
    ctx.lineTo(half + overhang - 3, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (scene.bridgeStyle === 'timber') {
    ctx.fillStyle = '#3b1d0a';
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);
    const count = 6;
    const pw = deckW / count;
    const pad = Math.max(1.2, wallWidth * 0.6);
    for (let i = 0; i < count; i++) {
      const px = -half - overhang + i * pw;
      ctx.fillStyle = i % 2 === 0 ? scene.bridgeDeck : scene.bridgeAccent;
      ctx.fillRect(px + 0.8, -half + pad, pw - 1.6, cellSize - pad * 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
      ctx.fillRect(px + 1.4, -half + pad + 1, Math.max(1, pw - 2.8), 2);
    }
    return;
  }

  if (scene.bridgeStyle === 'gangplank') {
    ctx.fillStyle = '#6b3410';
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);
    const planks = 5;
    const pw = deckW / planks;
    const pad = Math.max(1.2, wallWidth * 0.6);
    const nail = Math.max(1.2, cellSize * 0.045);
    for (let i = 0; i < planks; i++) {
      const px = -half - overhang + i * pw;
      ctx.fillStyle = i % 2 === 0 ? scene.bridgeDeck : scene.bridgeAccent;
      ctx.fillRect(px + 0.8, -half + pad, pw - 1.6, cellSize - pad * 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(px + pw * 0.45, -half + pad + 2, nail, nail);
      ctx.fillRect(px + pw * 0.45, half - pad - 2 - nail, nail, nail);
    }
    return;
  }

  if (scene.bridgeStyle === 'folded') {
    ctx.fillStyle = scene.bridgeDeck;
    ctx.fillRect(-half - overhang, -half, deckW, cellSize);

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      -half - overhang,
      -half + wallWidth * 0.5,
      deckW,
      Math.max(1, cellSize - wallWidth),
    );
    ctx.clip();
    const step = Math.max(4.5, cellSize * 0.16);
    ctx.strokeStyle = scene.bridgeAccent;
    ctx.lineWidth = Math.max(0.8, cellSize * 0.025);
    for (let x = -deckW; x < deckW; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -half);
      ctx.lineTo(x + cellSize * 0.55, half);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Classic wooden / paper plank deck
  ctx.fillStyle = theme.background;
  ctx.fillRect(-half - overhang, -half, deckW, cellSize);

  const plankCount = 5;
  const plankW = deckW / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const px = -half - overhang + i * plankW;
    ctx.fillStyle = scene.bridgeDeck;
    ctx.globalAlpha =
      i % 2 === 0
        ? theme.isLight
          ? 0.34
          : 0.76
        : theme.isLight
          ? 0.22
          : 0.54;
    ctx.fillRect(
      px + 0.5,
      -half + wallWidth * 0.5,
      plankW - 1,
      cellSize - wallWidth,
    );
  }
  ctx.globalAlpha = 1;

  const bevel = ctx.createLinearGradient(0, -half, 0, half);
  bevel.addColorStop(
    0,
    theme.isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.12)',
  );
  bevel.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  bevel.addColorStop(
    1,
    theme.isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.24)',
  );
  ctx.fillStyle = bevel;
  ctx.fillRect(-half - overhang, -half, deckW, cellSize);

  ctx.strokeStyle = scene.bridgeAccent;
  ctx.lineWidth = Math.max(0.8, cellSize * 0.03);
  ctx.beginPath();
  for (let i = 1; i < plankCount; i++) {
    const px = -half - overhang + i * plankW;
    ctx.moveTo(px, -half + wallWidth * 0.5);
    ctx.lineTo(px, half - wallWidth * 0.5);
  }
  ctx.stroke();
}

export function drawThemedBridgeRailsCanvas(
  ctx: CanvasRenderingContext2D,
  half: number,
  overhang: number,
  cellSize: number,
  wallWidth: number,
  theme: MazeTheme,
): void {
  const { scene } = theme;

  if (scene.bridgeStyle === 'hardlight') {
    const rail = scene.bridgeRail ?? '#38bdf8';
    ctx.save();
    ctx.strokeStyle = rail;
    ctx.shadowColor = rail;
    ctx.shadowBlur = Math.max(5, cellSize * 0.24);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, wallWidth * 1.15);
    ctx.beginPath();
    ctx.moveTo(-half - overhang, -half);
    ctx.lineTo(half + overhang, -half);
    ctx.moveTo(-half - overhang, half);
    ctx.lineTo(half + overhang, half);
    ctx.stroke();

    ctx.strokeStyle = scene.bridgeRailCore ?? '#e0f2fe';
    ctx.lineWidth = Math.max(0.9, wallWidth * 0.4);
    ctx.stroke();
    ctx.restore();

    const pylonOuter = Math.max(2.4, wallWidth * 1.15);
    const pylonInner = Math.max(1.3, wallWidth * 0.65);
    for (const px of [-half - overhang, half + overhang]) {
      for (const py of [-half, half]) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px, py, pylonOuter, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.arc(px, py, pylonInner, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (scene.bridgeStyle === 'holodeck') {
    ctx.strokeStyle = scene.bridgeRail ?? '#22d3ee';
    ctx.lineWidth = Math.max(1.8, wallWidth * 0.95);
    ctx.beginPath();
    ctx.moveTo(-half - overhang, -half);
    ctx.lineTo(half + overhang, -half);
    ctx.moveTo(-half - overhang, half);
    ctx.lineTo(half + overhang, half);
    ctx.stroke();

    ctx.strokeStyle = scene.bridgeRailCore ?? '#a5f3fc';
    ctx.lineWidth = Math.max(1.4, wallWidth * 0.7);
    const bLen = Math.max(3.5, cellSize * 0.14);
    for (const dir of [-1, 1]) {
      const ex = dir * (half + overhang);
      ctx.beginPath();
      ctx.moveTo(ex, -half - 1.5);
      ctx.lineTo(ex, -half + bLen);
      ctx.moveTo(ex, half + 1.5);
      ctx.lineTo(ex, half - bLen);
      ctx.stroke();
    }
    return;
  }

  if (scene.bridgeStyle === 'timber') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b1306';
    ctx.lineWidth = Math.max(3.6, wallWidth * 1.8);
    ctx.beginPath();
    ctx.moveTo(-half - overhang, -half);
    ctx.lineTo(half + overhang, -half);
    ctx.moveTo(-half - overhang, half);
    ctx.lineTo(half + overhang, half);
    ctx.stroke();

    ctx.strokeStyle = scene.bridgeRail ?? '#a16207';
    ctx.lineWidth = Math.max(1.8, wallWidth * 0.95);
    ctx.stroke();

    const outerR = Math.max(2.4, wallWidth * 1.15);
    const innerR = Math.max(1.3, wallWidth * 0.62);
    for (const px of [-half - overhang, half + overhang]) {
      for (const py of [-half, half]) {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(px, py, outerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = scene.bridgeRailCore ?? '#fde047';
        ctx.beginPath();
        ctx.arc(px, py, innerR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (scene.bridgeStyle === 'gangplank') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = Math.max(3.4, wallWidth * 1.6);
    ctx.beginPath();
    ctx.moveTo(-half - overhang, -half);
    ctx.lineTo(half + overhang, -half);
    ctx.moveTo(-half - overhang, half);
    ctx.lineTo(half + overhang, half);
    ctx.stroke();

    ctx.strokeStyle = scene.bridgeRail ?? '#92400e';
    ctx.lineWidth = Math.max(1.8, wallWidth * 0.88);
    ctx.stroke();

    const outerR = Math.max(2.3, wallWidth * 1.1);
    const innerR = Math.max(1.1, wallWidth * 0.52);
    for (const px of [-half - overhang, half + overhang]) {
      for (const py of [-half, half]) {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(px, py, outerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = scene.bridgeRailCore ?? '#fbbf24';
        ctx.beginPath();
        ctx.arc(px, py, innerR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (scene.bridgeStyle === 'folded') {
    const rail = scene.bridgeRail ?? theme.wall;
    ctx.strokeStyle = rail;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.2, wallWidth * 1.05);
    ctx.beginPath();
    ctx.moveTo(-half - overhang, -half);
    ctx.lineTo(half + overhang, -half);
    ctx.moveTo(-half - overhang, half);
    ctx.lineTo(half + overhang, half);
    ctx.stroke();

    const postSize = Math.max(3, wallWidth * 1.45);
    ctx.fillStyle = rail;
    for (const px of [-half - overhang, half + overhang]) {
      for (const py of [-half, half]) {
        ctx.fillRect(px - postSize / 2, py - postSize / 2, postSize, postSize);
      }
    }
    return;
  }

  ctx.strokeStyle = theme.wall;
  ctx.lineCap = 'round';
  ctx.lineWidth = wallWidth * 1.5;
  ctx.beginPath();
  ctx.moveTo(-half - overhang, -half);
  ctx.lineTo(half + overhang, -half);
  ctx.moveTo(-half - overhang, half);
  ctx.lineTo(half + overhang, half);
  ctx.stroke();

  const postSize = Math.max(2.6, wallWidth * 1.8);
  ctx.fillStyle = theme.wall;
  for (const px of [-half - overhang, half + overhang]) {
    for (const py of [-half, half]) {
      ctx.fillRect(px - postSize / 2, py - postSize / 2, postSize, postSize);
    }
  }
}

export function ThemedBackdropSvg({
  x = 0,
  y = 0,
  width,
  height,
  theme,
  idPrefix,
  starCount = 68,
  crosshairs,
}: {
  x?: number;
  y?: number;
  width: number;
  height: number;
  theme: MazeTheme;
  idPrefix: string;
  starCount?: number;
  crosshairs?: ReadonlyArray<{ x: number; y: number }>;
}) {
  const { backdrop } = theme.scene;

  if (backdrop === 'nebula') {
    const stars = generateStars(starCount);
    const maxDim = Math.max(width, height);
    return (
      <g>
        <defs>
          <linearGradient
            id={`${idPrefix}-nebula-base`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#050816" />
            <stop offset="50%" stopColor="#0b1026" />
            <stop offset="100%" stopColor="#090d1f" />
          </linearGradient>
          {NEBULA_CLOUDS.map((cl, idx) => (
            <radialGradient key={idx} id={`${idPrefix}-nebula-c${idx}`}>
              <stop offset="0%" stopColor={cl.color} stopOpacity={cl.opacity} />
              <stop offset="100%" stopColor={cl.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${idPrefix}-nebula-base)`}
        />
        {NEBULA_CLOUDS.map((cl, idx) => (
          <circle
            key={idx}
            cx={x + cl.fx * width}
            cy={y + cl.fy * height}
            r={cl.fr * maxDim}
            fill={`url(#${idPrefix}-nebula-c${idx})`}
          />
        ))}
        {stars.map((s, idx) => {
          const sx = x + s.fx * width;
          const sy = y + s.fy * height;
          return (
            <g key={idx}>
              <circle
                cx={sx.toFixed(1)}
                cy={sy.toFixed(1)}
                r={s.r}
                fill={s.color}
                opacity={s.opacity}
              />
              {s.sparkle && (
                <path
                  d={`M ${(sx - 4.5).toFixed(1)} ${sy.toFixed(1)} H ${(sx + 4.5).toFixed(1)} M ${sx.toFixed(1)} ${(sy - 4.5).toFixed(1)} V ${(sy + 4.5).toFixed(1)}`}
                  stroke={s.color}
                  strokeWidth="0.85"
                  opacity="0.52"
                />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  if (backdrop === 'radar') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const maxR = Math.hypot(width, height) * 0.52;
    const step = Math.max(48, maxR / 4.5);
    const rings: number[] = [];
    for (let rad = step; rad < maxR; rad += step) rings.push(rad);

    const crossD = crosshairs
      ? crosshairs
          .map(
            (pt) =>
              `M ${(pt.x - 2.5).toFixed(1)} ${pt.y.toFixed(1)} H ${(pt.x + 2.5).toFixed(1)} M ${pt.x.toFixed(1)} ${(pt.y - 2.5).toFixed(1)} V ${(pt.y + 2.5).toFixed(1)}`,
          )
          .join(' ')
      : '';

    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={theme.background} />
        {rings.map((rad, idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={rad}
            fill="none"
            stroke="rgba(34, 211, 238, 0.09)"
            strokeWidth="1"
          />
        ))}
        {crossD && (
          <path
            d={crossD}
            fill="none"
            stroke="rgba(56, 189, 248, 0.14)"
            strokeWidth="0.9"
          />
        )}
      </g>
    );
  }

  if (backdrop === 'glade') {
    const maxDim = Math.max(width, height);
    const fireflies = Array.from({ length: 24 }, (_, i) => ({
      cx: x + hash(i * 7.3 + 1) * width,
      cy: y + hash(i * 5.1 + 9) * height,
      opacity: 0.45 + hash(i * 2.9 + 5) * 0.45,
    }));
    const moss = Array.from({ length: 36 }, (_, i) => ({
      cx: x + hash(i * 4.1 + 3) * width,
      cy: y + hash(i * 6.7 + 11) * height,
      r: 2.2 + hash(i * 2.3) * 3.5,
    }));
    return (
      <g>
        <defs>
          <linearGradient
            id={`${idPrefix}-glade-base`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#03190d" />
            <stop offset="50%" stopColor="#072b17" />
            <stop offset="100%" stopColor="#041d10" />
          </linearGradient>
          {GLADE_POOLS.map((pool, idx) => (
            <radialGradient key={idx} id={`${idPrefix}-glade-p${idx}`}>
              <stop offset="0%" stopColor={pool.color} stopOpacity={pool.opacity} />
              <stop offset="100%" stopColor={pool.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id={`${idPrefix}-glade-fly`}>
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${idPrefix}-glade-base)`}
        />
        {GLADE_POOLS.map((pool, idx) => (
          <circle
            key={idx}
            cx={x + pool.fx * width}
            cy={y + pool.fy * height}
            r={pool.fr * maxDim}
            fill={`url(#${idPrefix}-glade-p${idx})`}
          />
        ))}
        {moss.map((m, idx) => (
          <circle
            key={`m-${idx}`}
            cx={m.cx.toFixed(1)}
            cy={m.cy.toFixed(1)}
            r={m.r.toFixed(1)}
            fill="rgba(22, 101, 52, 0.28)"
          />
        ))}
        {fireflies.map((f, idx) => (
          <circle
            key={`f-${idx}`}
            cx={f.cx.toFixed(1)}
            cy={f.cy.toFixed(1)}
            r="7"
            fill={`url(#${idPrefix}-glade-fly)`}
            opacity={f.opacity.toFixed(2)}
          />
        ))}
      </g>
    );
  }

  if (backdrop === 'chart') {
    const rcx = x + width * 0.82;
    const rcy = y + height * 0.24;
    const reach = Math.hypot(width, height);
    const rhumbD = Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8;
      return `M ${rcx.toFixed(1)} ${rcy.toFixed(1)} L ${(rcx + Math.cos(a) * reach).toFixed(1)} ${(rcy + Math.sin(a) * reach).toFixed(1)}`;
    }).join(' ');
    const compassPoints = Array.from({ length: 16 }, (_, i) => {
      const rad = i % 2 === 0 ? (i % 4 === 0 ? 28 : 18) : 6.5;
      const a = (i * Math.PI) / 8 - Math.PI / 2;
      return `${(rcx + Math.cos(a) * rad).toFixed(1)},${(rcy + Math.sin(a) * rad).toFixed(1)}`;
    }).join(' ');
    return (
      <g>
        <defs>
          <radialGradient id={`${idPrefix}-chart-base`} cx="50%" cy="50%" r="72%">
            <stop offset="0%" stopColor="#fdf6e3" />
            <stop offset="70%" stopColor="#f6e4bc" />
            <stop offset="100%" stopColor="#e8cd96" />
          </radialGradient>
          <clipPath id={`${idPrefix}-chart-clip`}>
            <rect x={x} y={y} width={width} height={height} />
          </clipPath>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${idPrefix}-chart-base)`}
        />
        <g clipPath={`url(#${idPrefix}-chart-clip)`}>
          <path d={rhumbD} stroke="rgba(120, 53, 15, 0.09)" strokeWidth="0.9" />
          <circle
            cx={rcx}
            cy={rcy}
            r="30"
            fill="none"
            stroke="rgba(120, 53, 15, 0.1)"
            strokeWidth="0.9"
          />
          <circle
            cx={rcx}
            cy={rcy}
            r="36"
            fill="none"
            stroke="rgba(120, 53, 15, 0.1)"
            strokeWidth="0.9"
          />
          <polygon points={compassPoints} fill="rgba(120, 53, 15, 0.08)" />
          <rect
            x={x + 6}
            y={y + 6}
            width={Math.max(0, width - 12)}
            height={Math.max(0, height - 12)}
            fill="none"
            stroke="rgba(120, 53, 15, 0.22)"
            strokeWidth="1.1"
          />
        </g>
      </g>
    );
  }

  if (backdrop === 'notebook') {
    const step = 20;
    const marginX = x + 18;
    return (
      <g>
        <defs>
          <pattern
            id={`${idPrefix}-notebook-grid`}
            width={step}
            height={step}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${step} 0 L 0 0 0 ${step}`}
              fill="none"
              stroke="rgba(59, 130, 246, 0.12)"
              strokeWidth="0.9"
            />
          </pattern>
        </defs>
        <rect x={x} y={y} width={width} height={height} fill="#fcfcfd" />
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${idPrefix}-notebook-grid)`}
        />
        <line
          x1={marginX}
          y1={y}
          x2={marginX}
          y2={y + height}
          stroke="rgba(244, 63, 94, 0.26)"
          strokeWidth="1.3"
        />
      </g>
    );
  }

  return (
    <rect x={x} y={y} width={width} height={height} fill={theme.background} />
  );
}

export function ThemedWallPathSvg({
  d,
  wallWidth,
  theme,
  glowFilterId,
}: {
  d: string;
  wallWidth: number;
  theme: MazeTheme;
  glowFilterId?: string;
}) {
  const { scene } = theme;
  if (scene.wallStyle === 'plasma') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          stroke={scene.wallGlow ?? 'rgba(96, 165, 250, 0.45)'}
          strokeWidth={wallWidth * 2}
          filter={glowFilterId ? `url(#${glowFilterId})` : undefined}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#e0f2fe'}
          strokeWidth={wallWidth * 0.36}
        />
      </g>
    );
  }

  if (scene.wallStyle === 'doubleRail') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={wallWidth * 1.4}
        />
        <path
          d={d}
          stroke={scene.wallInner ?? '#041226'}
          strokeWidth={wallWidth * 0.58}
        />
      </g>
    );
  }

  if (scene.wallStyle === 'hedgerow') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.5 2.2)"
          stroke="rgba(2, 18, 9, 0.72)"
          strokeWidth={wallWidth * 2.15}
        />
        <path
          d={d}
          stroke={scene.wallGlow ?? '#14532d'}
          strokeWidth={wallWidth * 1.85}
        />
        <path d={d} stroke="#16a34a" strokeWidth={wallWidth * 1.15} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#4ade80'}
          strokeWidth={wallWidth * 0.65}
          strokeDasharray="1.5 9"
        />
      </g>
    );
  }

  if (scene.wallStyle === 'inked') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.4 1.4)"
          stroke={scene.wallGlow ?? 'rgba(120, 53, 15, 0.20)'}
          strokeWidth={wallWidth * 1.45}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
      </g>
    );
  }

  if (scene.wallStyle === 'fountain') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.4 1.6)"
          stroke={scene.wallGlow ?? 'rgba(15, 23, 42, 0.14)'}
          strokeWidth={wallWidth * 1.22}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
      </g>
    );
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={theme.wall}
      strokeWidth={wallWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function ThemedCorridorTubeSvg({
  d,
  outerWidth,
  innerWidth,
  theme,
  glowFilterId,
}: {
  d: string;
  outerWidth: number;
  innerWidth: number;
  theme: MazeTheme;
  glowFilterId?: string;
}) {
  const { scene } = theme;
  const maskId = `corridor-hollow-${useId().replace(/:/g, '')}`;
  const midWidth = (outerWidth + innerWidth) / 2;
  const wallThickness = (outerWidth - innerWidth) / 2;

  let backdropEffect = null;
  let wallLayers;

  if (scene.wallStyle === 'plasma') {
    const coreBand = wallThickness * 0.36;
    backdropEffect = (
      <g filter={glowFilterId ? `url(#${glowFilterId})` : undefined}>
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(96, 165, 250, 0.45)'}
            strokeWidth={outerWidth + 4}
          />
        </g>
      </g>
    );
    wallLayers = (
      <>
        <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#e0f2fe'}
          strokeWidth={midWidth + coreBand}
        />
        <path d={d} stroke={theme.wall} strokeWidth={midWidth - coreBand} />
      </>
    );
  } else if (scene.wallStyle === 'doubleRail') {
    const railOuter = outerWidth + 1.2;
    const railMid = (railOuter + innerWidth) / 2;
    const grooveBand = ((railOuter - innerWidth) / 2) * 0.42;
    wallLayers = (
      <>
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={railOuter}
        />
        <path
          d={d}
          stroke={scene.wallInner ?? '#041226'}
          strokeWidth={railMid + grooveBand}
        />
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={railMid - grooveBand}
        />
      </>
    );
  } else if (scene.wallStyle === 'hedgerow') {
    const hedgeOuter = outerWidth + 2;
    const hedgeMid = (hedgeOuter + innerWidth) / 2;
    const hedgeThick = (hedgeOuter - innerWidth) / 2;
    const midBand = hedgeThick * 0.62;
    const coreBand = hedgeThick * 0.34;
    const darkEdge = scene.wallGlow ?? '#14532d';
    backdropEffect = (
      <g transform="translate(1.5 2.2)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke="rgba(2, 18, 9, 0.68)"
            strokeWidth={hedgeOuter + 1.5}
          />
        </g>
      </g>
    );
    wallLayers = (
      <>
        <path d={d} stroke={darkEdge} strokeWidth={hedgeOuter} />
        <path d={d} stroke="#16a34a" strokeWidth={hedgeMid + midBand} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#4ade80'}
          strokeOpacity="0.6"
          strokeWidth={hedgeMid + coreBand}
          strokeDasharray="2 10"
        />
        <path d={d} stroke="#16a34a" strokeWidth={hedgeMid - coreBand} />
        <path d={d} stroke={darkEdge} strokeWidth={hedgeMid - midBand} />
      </>
    );
  } else if (scene.wallStyle === 'inked') {
    backdropEffect = (
      <g transform="translate(1.5 1.5)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(120, 53, 15, 0.22)'}
            strokeWidth={outerWidth + 1.5}
          />
        </g>
      </g>
    );
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  } else if (scene.wallStyle === 'fountain') {
    backdropEffect = (
      <g transform="translate(1.4 1.6)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(15, 23, 42, 0.14)'}
            strokeWidth={outerWidth + 1.2}
          />
        </g>
      </g>
    );
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  } else {
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  }

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="-10000"
          y="-10000"
          width="20000"
          height="20000"
        >
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
          <path d={d} stroke="black" strokeWidth={innerWidth} />
        </mask>
      </defs>
      <path
        d={d}
        stroke={theme.corridorFloor}
        strokeOpacity={CORRIDOR_FLOOR_OPACITY}
        strokeWidth={innerWidth}
      />
      {backdropEffect}
      <g mask={`url(#${maskId})`}>{wallLayers}</g>
    </g>
  );
}

export interface CurvedBridgeCorner {
  x: number;
  y: number;
  angleDeg: number;
  side: 1 | -1;
}

export function ThemedCurvedBridgeBaseSvg({
  deck,
  cellUnit,
  theme,
}: {
  deck: string;
  cellUnit: number;
  theme: MazeTheme;
}) {
  const { scene } = theme;
  const deckW = cellUnit * 0.56;
  const shadowColor = theme.isLight
    ? 'rgba(0, 0, 0, 0.22)'
    : 'rgba(0, 0, 0, 0.68)';

  let deckLayers;
  if (scene.bridgeStyle === 'hardlight') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke="#38bdf8"
          strokeOpacity="0.28"
          strokeWidth={deckW}
        />
        <path
          d={deck}
          stroke="#818cf8"
          strokeOpacity="0.16"
          strokeWidth={deckW * 0.55}
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.86}
          strokeDasharray="2 7"
          strokeDashoffset="2"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'holodeck') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.9}
          strokeDasharray="1.5 4.8"
        />
        <path
          d={deck}
          stroke="rgba(103, 232, 249, 0.5)"
          strokeWidth={cellUnit * 0.04}
          strokeDasharray="4 4"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'timber') {
    const plankW = deckW * 0.92;
    deckLayers = (
      <>
        <path d={deck} stroke="#3b1d0a" strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeDeck}
          strokeWidth={plankW}
          strokeDasharray="5.5 8.5"
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={plankW}
          strokeDasharray="5.5 8.5"
          strokeDashoffset="7"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'gangplank') {
    const plankW = deckW * 0.92;
    deckLayers = (
      <>
        <path d={deck} stroke="#6b3410" strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeDeck}
          strokeWidth={plankW}
          strokeDasharray="6 10"
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={plankW}
          strokeDasharray="6 10"
          strokeDashoffset="8"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'folded') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.9}
          strokeDasharray="1.4 4.6"
        />
      </>
    );
  } else {
    deckLayers = (
      <path d={deck} stroke={theme.corridorFloor} strokeWidth={deckW} />
    );
  }

  return (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <path d={deck} stroke={shadowColor} strokeWidth={deckW + 11} />
      {deckLayers}
    </g>
  );
}

export function ThemedCurvedBridgeOverlaySvg({
  deck,
  corners,
  cellUnit,
  theme,
  glowFilterId,
}: {
  deck: string;
  corners: ReadonlyArray<CurvedBridgeCorner>;
  cellUnit: number;
  theme: MazeTheme;
  glowFilterId?: string;
}) {
  const { scene } = theme;
  const maskId = `curved-bridge-rails-${useId().replace(/:/g, '')}`;
  const deckW = cellUnit * 0.56;
  const railOuter = cellUnit * 0.78;
  const railMid = (railOuter + deckW) / 2;
  const railThick = (railOuter - deckW) / 2;

  let railGlow = null;
  let railLayers;
  let cornerMarkers = null;

  if (scene.bridgeStyle === 'hardlight') {
    const rail = scene.bridgeRail ?? '#38bdf8';
    const core = scene.bridgeRailCore ?? '#e0f2fe';
    const coreBand = railThick * 0.38;
    railGlow = (
      <g filter={glowFilterId ? `url(#${glowFilterId})` : undefined}>
        <g mask={`url(#${maskId})`}>
          <path
            d={deck}
            stroke={rail}
            strokeOpacity="0.65"
            strokeWidth={railOuter + 4}
          />
        </g>
      </g>
    );
    railLayers = (
      <>
        <path d={deck} stroke={rail} strokeWidth={railOuter} />
        <path d={deck} stroke={core} strokeWidth={railMid + coreBand} />
        <path d={deck} stroke={rail} strokeWidth={railMid - coreBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.6} fill="#0f172a" />
        <circle cx={c.x} cy={c.y} r={2.0} fill="#7dd3fc" />
      </g>
    ));
  } else if (scene.bridgeStyle === 'holodeck') {
    const rail = scene.bridgeRail ?? '#22d3ee';
    const core = scene.bridgeRailCore ?? '#a5f3fc';
    railLayers = <path d={deck} stroke={rail} strokeWidth={railOuter} />;
    cornerMarkers = corners.map((c, idx) => (
      <line
        key={idx}
        x1={0}
        y1={0}
        x2={0}
        y2={-c.side * 5}
        transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.angleDeg.toFixed(1)})`}
        stroke={core}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ));
  } else if (scene.bridgeStyle === 'timber') {
    const timberOuter = cellUnit * 0.84;
    const timberMid = (timberOuter + deckW) / 2;
    const innerBand = ((timberOuter - deckW) / 2) * 0.52;
    railLayers = (
      <>
        <path d={deck} stroke="#2b1306" strokeWidth={timberOuter} />
        <path
          d={deck}
          stroke={scene.bridgeRail ?? '#a16207'}
          strokeWidth={timberMid + innerBand}
        />
        <path d={deck} stroke="#2b1306" strokeWidth={timberMid - innerBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.6} fill="#451a03" />
        <circle
          cx={c.x}
          cy={c.y}
          r={2.0}
          fill={scene.bridgeRailCore ?? '#fde047'}
        />
      </g>
    ));
  } else if (scene.bridgeStyle === 'gangplank') {
    const plankOuter = cellUnit * 0.82;
    const plankMid = (plankOuter + deckW) / 2;
    const innerBand = ((plankOuter - deckW) / 2) * 0.52;
    railLayers = (
      <>
        <path d={deck} stroke="#451a03" strokeWidth={plankOuter} />
        <path
          d={deck}
          stroke={scene.bridgeRail ?? '#92400e'}
          strokeWidth={plankMid + innerBand}
        />
        <path d={deck} stroke="#451a03" strokeWidth={plankMid - innerBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.4} fill="#451a03" />
        <circle
          cx={c.x}
          cy={c.y}
          r={1.7}
          fill={scene.bridgeRailCore ?? '#fbbf24'}
        />
      </g>
    ));
  } else if (scene.bridgeStyle === 'folded') {
    const rail = scene.bridgeRail ?? theme.wall;
    railLayers = <path d={deck} stroke={rail} strokeWidth={railOuter} />;
    cornerMarkers = corners.map((c, idx) => (
      <rect
        key={idx}
        x={-2.2}
        y={-2.2}
        width={4.4}
        height={4.4}
        transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.angleDeg.toFixed(1)})`}
        fill={rail}
      />
    ));
  } else {
    railLayers = <path d={deck} stroke={theme.wall} strokeWidth={railOuter} />;
  }

  return (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="-10000"
          y="-10000"
          width="20000"
          height="20000"
        >
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
          <path d={deck} stroke="black" strokeWidth={deckW} />
        </mask>
      </defs>
      {railGlow}
      <g mask={`url(#${maskId})`}>{railLayers}</g>
      {cornerMarkers}
    </g>
  );
}

export function PageBackdrop({ theme }: { theme: MazeTheme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = 44;
      drawThemedBackdropCanvas(
        ctx,
        w,
        h,
        0,
        0,
        cell,
        Math.ceil(h / cell),
        Math.ceil(w / cell),
        theme,
        true,
      );
    };

    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen print:hidden"
    />
  );
}
