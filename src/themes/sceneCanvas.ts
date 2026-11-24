import type { MazeTheme } from './catalog';

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
