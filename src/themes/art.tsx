import type { Vec3 } from '../game/marble';
import type { MazeTheme } from './catalog';

export interface MarbleRenderOptions {
  under?: boolean;
  alpha?: number;
  elevated?: boolean;
  u?: Vec3;
  v?: Vec3;
  squash?: number;
  squashAxis?: 'x' | 'y';
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function stroke3DCircleCanvas(
  ctx: CanvasRenderingContext2D,
  r: number,
  basisA: Vec3,
  basisB: Vec3,
  basisC: Vec3,
  lat: number,
  strokeStyle: string,
  lineWidth: number,
  alpha: number,
  dashed = false,
): void {
  const steps = 28;
  const cosL = Math.cos(lat);
  const sinL = Math.sin(lat);
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  if (dashed) {
    const dash = Math.max(1.8, r * 0.14);
    ctx.setLineDash([dash, dash]);
  }
  ctx.beginPath();
  let penDown = false;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ca = Math.cos(t) * cosL;
    const cb = Math.sin(t) * cosL;
    const px = basisA[0] * ca + basisB[0] * cb + basisC[0] * sinL;
    const py = basisA[1] * ca + basisB[1] * cb + basisC[1] * sinL;
    const pz = basisA[2] * ca + basisB[2] * cb + basisC[2] * sinL;
    if (pz > -0.05) {
      if (!penDown) {
        ctx.moveTo(px * r, py * r);
        penDown = true;
      } else {
        ctx.lineTo(px * r, py * r);
      }
    } else {
      penDown = false;
    }
  }
  ctx.stroke();
  ctx.restore();
}

function draw3DDotCanvas(
  ctx: CanvasRenderingContext2D,
  r: number,
  pt: Vec3,
  dotRadius: number,
  color: string,
  alpha: number,
): void {
  if (pt[2] <= 0.05) return;
  const depth = Math.min(1, pt[2]);
  ctx.save();
  ctx.globalAlpha = alpha * (0.35 + 0.65 * depth);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt[0] * r, pt[1] * r, dotRadius * (0.55 + 0.45 * depth), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlassSpecularCanvas(
  ctx: CanvasRenderingContext2D,
  r: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.31,
    -r * 0.33,
    r * 0.25,
    r * 0.13,
    -Math.PI / 4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.52, r * 0.065, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.fill();
  ctx.restore();
}

export function drawMarbleCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: MazeTheme,
  options: MarbleRenderOptions = {},
): void {
  const {
    under = false,
    alpha,
    elevated = false,
    u = [1, 0, 0],
    v = [0, 1, 0],
    squash = 0,
    squashAxis = 'x',
  } = options;
  const baseAlpha = alpha ?? (under ? 0.5 : 1);
  const w = crossVec3(u, v);
  const negU: Vec3 = [-u[0], -u[1], -u[2]];
  const negV: Vec3 = [-v[0], -v[1], -v[2]];

  const scaleBoost = elevated ? 1.09 : 1;
  const r = radius * scaleBoost;
  const sq = squash * 0.14;
  const scaleX = squashAxis === 'x' ? 1 - sq : 1 + sq * 0.7;
  const scaleY = squashAxis === 'y' ? 1 - sq : 1 + sq * 0.7;

  ctx.save();
  ctx.translate(x, y);

  if (under) {
    ctx.globalAlpha = baseAlpha;
  } else {
    ctx.globalAlpha = baseAlpha;
    const shadowOffset = elevated ? r * 0.34 : r * 0.18;
    const shadowRx = r * (elevated ? 1.24 : 1.08);
    const shadowRy = r * (elevated ? 1.12 : 0.96);
    const shadowAlpha = theme.isLight
      ? elevated
        ? 0.24
        : 0.28
      : elevated
        ? 0.38
        : 0.44;
    const shadowColor = theme.isLight ? '15, 23, 42' : '0, 0, 0';
    ctx.save();
    ctx.translate(shadowOffset * 0.75, shadowOffset);
    ctx.scale(1, shadowRy / shadowRx);
    const shadowGrad = ctx.createRadialGradient(0, 0, shadowRx * 0.35, 0, 0, shadowRx);
    shadowGrad.addColorStop(0, `rgba(${shadowColor}, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.7, `rgba(${shadowColor}, ${(shadowAlpha * 0.5).toFixed(3)})`);
    shadowGrad.addColorStop(1, `rgba(${shadowColor}, 0)`);
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowRx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.scale(scaleX, scaleY);

  if (theme.id === 'space') {
    // Plasma Energy Orb
    ctx.save();
    if (!under) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = Math.max(4, r * 0.55);
    }
    const base = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.08, 0, 0, r);
    base.addColorStop(0, '#1e3a8a');
    base.addColorStop(0.55, '#0f172a');
    base.addColorStop(1, '#020617');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.62);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.28, '#7dd3fc');
    core.addColorStop(0.65, 'rgba(129, 140, 248, 0.45)');
    core.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    stroke3DCircleCanvas(ctx, r * 0.86, u, w, v, 0, '#38bdf8', Math.max(1.3, r * 0.14), baseAlpha * 0.9);
    stroke3DCircleCanvas(ctx, r * 0.86, u, w, v, 0, '#e0f2fe', Math.max(0.7, r * 0.055), baseAlpha * 0.95);
    stroke3DCircleCanvas(ctx, r * 0.82, v, w, u, 0.25, '#c084fc', Math.max(1.1, r * 0.11), baseAlpha * 0.8);

    for (const pt of [u, negU, v, negV, w]) {
      draw3DDotCanvas(ctx, r * 0.8, pt, Math.max(1.1, r * 0.095), '#f0f9ff', baseAlpha * 0.95);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(1, r * 0.095);
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.stroke();
    drawGlassSpecularCanvas(ctx, r, baseAlpha * 0.88);
  } else if (theme.id === 'hologram') {
    // Wireframe Holo-Globe
    ctx.save();
    if (!under) {
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = Math.max(4, r * 0.45);
    }
    const base = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    base.addColorStop(0, 'rgba(34, 211, 238, 0.28)');
    base.addColorStop(0.75, 'rgba(6, 21, 41, 0.92)');
    base.addColorStop(1, 'rgba(34, 211, 238, 0.42)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.clip();

    const lw = Math.max(0.85, r * 0.065);
    stroke3DCircleCanvas(ctx, r * 0.92, u, w, v, 0, '#67e8f9', lw * 1.35, baseAlpha * 0.95);
    stroke3DCircleCanvas(ctx, r * 0.92, u, w, v, 0.55, '#22d3ee', lw, baseAlpha * 0.65);
    stroke3DCircleCanvas(ctx, r * 0.92, u, w, v, -0.55, '#22d3ee', lw, baseAlpha * 0.65);
    stroke3DCircleCanvas(ctx, r * 0.92, u, v, w, 0, '#22d3ee', lw, baseAlpha * 0.75);
    stroke3DCircleCanvas(ctx, r * 0.92, v, w, u, 0, '#22d3ee', lw, baseAlpha * 0.75);

    ctx.fillStyle = '#ecfeff';
    ctx.globalAlpha = baseAlpha;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, r * 0.14), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = Math.max(1.1, r * 0.095);
    ctx.globalAlpha = baseAlpha * 0.95;
    ctx.stroke();
  } else if (theme.id === 'forest') {
    // Amber Firefly Marble
    const base = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.06, 0, 0, r);
    base.addColorStop(0, '#fef3c7');
    base.addColorStop(0.35, '#f59e0b');
    base.addColorStop(0.78, '#b45309');
    base.addColorStop(1, '#451a03');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.58);
    glow.addColorStop(0, '#fef9c3');
    glow.addColorStop(0.5, 'rgba(250, 204, 21, 0.45)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();

    stroke3DCircleCanvas(ctx, r * 0.78, u, w, v, 0.15, '#fde047', Math.max(1.4, r * 0.18), baseAlpha * 0.65);
    draw3DDotCanvas(ctx, r * 0.74, v, Math.max(1.2, r * 0.14), '#4ade80', baseAlpha * 0.88);
    draw3DDotCanvas(ctx, r * 0.74, negV, Math.max(1.1, r * 0.13), '#86efac', baseAlpha * 0.88);
    draw3DDotCanvas(ctx, r * 0.72, u, Math.max(1, r * 0.11), '#fef08a', baseAlpha * 0.95);
    draw3DDotCanvas(ctx, r * 0.72, w, Math.max(1, r * 0.11), '#4ade80', baseAlpha * 0.82);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = Math.max(1, r * 0.085);
    ctx.globalAlpha = baseAlpha * 0.88;
    ctx.stroke();
    drawGlassSpecularCanvas(ctx, r, baseAlpha * 0.9);
  } else if (theme.id === 'pirate') {
    // Brass Compass Sphere
    const base = ctx.createRadialGradient(-r * 0.32, -r * 0.34, r * 0.05, 0, 0, r);
    base.addColorStop(0, '#fef9c3');
    base.addColorStop(0.35, '#f59e0b');
    base.addColorStop(0.8, '#92400e');
    base.addColorStop(1, '#451a03');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    stroke3DCircleCanvas(ctx, r * 0.96, u, w, v, 0, '#78350f', Math.max(1.6, r * 0.18), baseAlpha * 0.85);
    stroke3DCircleCanvas(ctx, r * 0.96, u, w, v, 0, '#fef08a', Math.max(0.7, r * 0.055), baseAlpha * 0.9, true);
    stroke3DCircleCanvas(ctx, r * 0.96, u, v, w, 0, '#dc2626', Math.max(1.3, r * 0.13), baseAlpha * 0.88);
    draw3DDotCanvas(ctx, r * 0.82, v, Math.max(1.6, r * 0.22), '#dc2626', baseAlpha * 0.95);
    draw3DDotCanvas(ctx, r * 0.82, v, Math.max(0.8, r * 0.09), '#fef08a', baseAlpha);
    draw3DDotCanvas(ctx, r * 0.82, negV, Math.max(1.6, r * 0.22), '#1e3a8a', baseAlpha * 0.95);
    draw3DDotCanvas(ctx, r * 0.82, negV, Math.max(0.8, r * 0.09), '#fef08a', baseAlpha);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.1, r * 0.095);
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.stroke();
    drawGlassSpecularCanvas(ctx, r, baseAlpha * 0.82);
  } else {
    // Paper: Labyrinth Steel Bearing
    const base = ctx.createRadialGradient(-r * 0.32, -r * 0.35, r * 0.04, 0, 0, r);
    base.addColorStop(0, '#ffffff');
    base.addColorStop(0.28, '#e2e8f0');
    base.addColorStop(0.62, '#64748b');
    base.addColorStop(0.86, '#1e293b');
    base.addColorStop(1, '#475569');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    stroke3DCircleCanvas(ctx, r * 0.96, u, w, v, 0, '#2563eb', Math.max(1.4, r * 0.14), baseAlpha * 0.9);
    stroke3DCircleCanvas(ctx, r * 0.96, u, w, v, 0, '#93c5fd', Math.max(0.7, r * 0.055), baseAlpha * 0.85);

    const bounce = ctx.createRadialGradient(r * 0.25, r * 0.45, 0, r * 0.25, r * 0.45, r * 0.55);
    bounce.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    bounce.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bounce;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1, r * 0.085);
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.stroke();
    drawGlassSpecularCanvas(ctx, r, baseAlpha * 0.96);
  }

  ctx.restore();
}

export function drawThemedPlayerCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  theme: MazeTheme,
  under = false,
): void {
  const r = Math.max(4, size * 0.34);
  ctx.save();
  ctx.translate(x, y);
  if (under) {
    ctx.globalAlpha = 0.55;
  } else if (!theme.isLight) {
    ctx.shadowColor = theme.playerFill;
    ctx.shadowBlur = Math.max(6, size * 0.35);
  }

  if (theme.id === 'space' || theme.id === 'hologram') {
    // Rocket pointing up-right
    ctx.rotate(-Math.PI / 4);
    // Thruster flame
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.65);
    ctx.lineTo(0, r * 1.15);
    ctx.lineTo(r * 0.3, r * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#fb923c';
    ctx.fill();

    // Fins
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.15);
    ctx.lineTo(-r * 0.85, r * 0.75);
    ctx.lineTo(-r * 0.35, r * 0.68);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.42, r * 0.15);
    ctx.lineTo(r * 0.85, r * 0.75);
    ctx.lineTo(r * 0.35, r * 0.68);
    ctx.closePath();
    ctx.fill();

    // Fuselage
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.6, -r * 0.2, r * 0.42, r * 0.7);
    ctx.lineTo(-r * 0.42, r * 0.7);
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.2, 0, -r * 1.05);
    ctx.closePath();
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();

    // Nose cone
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.34, -r * 0.55, r * 0.36, -r * 0.35);
    ctx.lineTo(-r * 0.36, -r * 0.35);
    ctx.quadraticCurveTo(-r * 0.34, -r * 0.55, 0, -r * 1.05);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    // Porthole
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.23, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
  } else if (theme.id === 'forest') {
    // Cute Fox face
    // Ears
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -r * 0.15);
    ctx.lineTo(-r * 0.72, -r * 0.95);
    ctx.lineTo(-r * 0.15, -r * 0.52);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.78, -r * 0.15);
    ctx.lineTo(r * 0.72, -r * 0.95);
    ctx.lineTo(r * 0.15, -r * 0.52);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.moveTo(0, r * 0.92);
    ctx.lineTo(-r * 0.85, -r * 0.15);
    ctx.quadraticCurveTo(0, -r * 0.72, r * 0.85, -r * 0.15);
    ctx.closePath();
    ctx.fillStyle = '#fb923c';
    ctx.fill();

    // White cheeks
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.85);
    ctx.lineTo(-r * 0.65, r * 0.05);
    ctx.lineTo(-r * 0.15, r * 0.32);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, r * 0.85);
    ctx.lineTo(r * 0.65, r * 0.05);
    ctx.lineTo(r * 0.15, r * 0.32);
    ctx.closePath();
    ctx.fill();

    // Eyes & nose
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.05, r * 0.11, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.05, r * 0.11, 0, Math.PI * 2);
    ctx.arc(0, r * 0.75, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme.id === 'pirate') {
    // Pirate ship
    // Mast
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.5, r * 0.18);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.88);
    ctx.lineTo(0, r * 0.35);
    ctx.stroke();

    // Red pennant
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(r * 0.45, -r * 0.72);
    ctx.lineTo(0, -r * 0.54);
    ctx.closePath();
    ctx.fill();

    // Sail
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.48);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.42, r * 0.62, r * 0.2);
    ctx.lineTo(-r * 0.55, r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wooden hull
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.24);
    ctx.lineTo(r * 0.85, r * 0.24);
    ctx.lineTo(r * 0.55, r * 0.75);
    ctx.lineTo(-r * 0.55, r * 0.75);
    ctx.closePath();
    ctx.fill();
  } else {
    // Classic clean dot (Paper)
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = theme.playerFill;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = theme.playerCore;
    ctx.fill();
  }

  ctx.restore();
}

export function drawThemedGoalCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  theme: MazeTheme,
): void {
  const r = Math.max(4, size * 0.3);
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = theme.goalFill;
  ctx.shadowBlur = theme.isLight ? 3 : Math.max(6, size * 0.35);

  if (theme.id === 'space' || theme.id === 'hologram') {
    // Ringed planet
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = theme.goalFill;
    ctx.fill();

    ctx.save();
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.32, r * 0.38, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.stroke();
    ctx.restore();
  } else if (theme.id === 'forest') {
    // Cozy forest cabin
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-r * 0.72, -r * 0.1, r * 1.44, r * 0.92);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.98, -r * 0.05);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(r * 0.98, -r * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.fillRect(-r * 0.25, r * 0.16, r * 0.5, r * 0.45);
  } else if (theme.id === 'pirate') {
    // Treasure chest
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-r * 0.85, -r * 0.55, r * 1.7, r * 1.2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1.5, r * 0.2);
    ctx.strokeRect(-r * 0.85, -r * 0.55, r * 1.7, r * 1.2);

    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.05);
    ctx.lineTo(r * 0.85, -r * 0.05);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-r * 0.22, -r * 0.22, r * 0.44, r * 0.42);
  } else {
    const goalSize = Math.max(5, size * 0.44);
    ctx.beginPath();
    ctx.fillStyle = theme.goalFill;
    ctx.roundRect(
      -goalSize / 2,
      -goalSize / 2,
      goalSize,
      goalSize,
      Math.max(2, size * 0.12),
    );
    ctx.fill();
  }

  ctx.restore();
}

function traceStarPath(
  ctx: CanvasRenderingContext2D,
  outerR: number,
  innerR: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawThemedTargetCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  theme: MazeTheme,
  collected: boolean,
): void {
  const r = Math.max(3.5, size * 0.28);
  ctx.save();
  ctx.translate(x, y);

  if (collected) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.strokeStyle = theme.targetCollected;
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.shadowColor = theme.targetStroke;
  ctx.shadowBlur = theme.isLight ? 3 : Math.max(6, size * 0.35);

  if (theme.id === 'space' || theme.id === 'hologram') {
    traceStarPath(ctx, r * 1.08, r * 0.48);
    ctx.fillStyle = theme.targetStroke;
    ctx.fill();
  } else if (theme.id === 'forest') {
    // Golden berry + leaf
    ctx.beginPath();
    ctx.arc(0, r * 0.14, r * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = theme.targetStroke;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(r * 0.22, -r * 0.68, r * 0.42, r * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
  } else if (theme.id === 'pirate') {
    // Gold coin
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.strokeStyle = '#b45309';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.targetStroke;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.stroke();
  }

  ctx.restore();
}

function project3DCircleSvgPath(
  r: number,
  basisA: Vec3,
  basisB: Vec3,
  basisC: Vec3,
  lat: number,
): string {
  const steps = 22;
  const cosL = Math.cos(lat);
  const sinL = Math.sin(lat);
  const parts: string[] = [];
  let penDown = false;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ca = Math.cos(t) * cosL;
    const cb = Math.sin(t) * cosL;
    const px = basisA[0] * ca + basisB[0] * cb + basisC[0] * sinL;
    const py = basisA[1] * ca + basisB[1] * cb + basisC[1] * sinL;
    const pz = basisA[2] * ca + basisB[2] * cb + basisC[2] * sinL;
    if (pz > -0.05) {
      parts.push(
        `${penDown ? 'L' : 'M'} ${(px * r).toFixed(2)} ${(py * r).toFixed(2)}`,
      );
      penDown = true;
    } else {
      penDown = false;
    }
  }
  return parts.join(' ');
}

export function MarbleSvg({
  x,
  y,
  r = 9.5,
  theme,
  idPrefix,
  u = [1, 0, 0],
  v = [0, 1, 0],
  elevated = false,
}: {
  x: number;
  y: number;
  r?: number;
  theme: MazeTheme;
  idPrefix: string;
  u?: Vec3;
  v?: Vec3;
  elevated?: boolean;
}) {
  const gradId = `${idPrefix}-marble-grad-${theme.id}`;
  const coreId = `${idPrefix}-marble-core-${theme.id}`;
  const clipId = `${idPrefix}-marble-clip-${theme.id}`;
  const w = crossVec3(u, v);
  const negU: Vec3 = [-u[0], -u[1], -u[2]];
  const negV: Vec3 = [-v[0], -v[1], -v[2]];
  const rad = elevated ? r * 1.09 : r;

  const equatorD = project3DCircleSvgPath(rad * 0.9, u, w, v, 0);
  const meridianAD = project3DCircleSvgPath(rad * 0.9, u, v, w, 0);
  const meridianBD = project3DCircleSvgPath(rad * 0.86, v, w, u, 0.2);

  const renderDot = (pt: Vec3, dist: number, dotR: number, fill: string, opacity = 0.92) => {
    if (pt[2] <= 0.05) return null;
    const depth = Math.min(1, pt[2]);
    return (
      <circle
        cx={(pt[0] * rad * dist).toFixed(2)}
        cy={(pt[1] * rad * dist).toFixed(2)}
        r={(dotR * (0.55 + 0.45 * depth)).toFixed(2)}
        fill={fill}
        opacity={opacity * (0.35 + 0.65 * depth)}
      />
    );
  };

  const rimColor =
    theme.id === 'space'
      ? '#7dd3fc'
      : theme.id === 'hologram'
        ? '#67e8f9'
        : theme.id === 'forest'
          ? '#fcd34d'
          : theme.id === 'pirate'
            ? '#78350f'
            : '#334155';

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <defs>
        {theme.id === 'space' && (
          <>
            <radialGradient id={gradId} cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </>
        )}
        {theme.id === 'hologram' && (
          <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="75%" stopColor="#061529" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.42" />
          </radialGradient>
        )}
        {theme.id === 'forest' && (
          <>
            <radialGradient id={gradId} cx="32%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="38%" stopColor="#f59e0b" />
              <stop offset="82%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </radialGradient>
            <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </radialGradient>
          </>
        )}
        {theme.id === 'pirate' && (
          <radialGradient id={gradId} cx="32%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="38%" stopColor="#f59e0b" />
            <stop offset="82%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#451a03" />
          </radialGradient>
        )}
        {theme.id === 'paper' && (
          <radialGradient id={gradId} cx="32%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="65%" stopColor="#64748b" />
            <stop offset="90%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        )}
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r={rad * 0.96} />
        </clipPath>
      </defs>

      <ellipse
        cx={elevated ? rad * 0.26 : rad * 0.14}
        cy={elevated ? rad * 0.34 : rad * 0.2}
        rx={rad * (elevated ? 1.04 : 0.94)}
        ry={rad * (elevated ? 0.92 : 0.84)}
        fill={theme.isLight ? 'rgba(15,23,42,0.26)' : 'rgba(0,0,0,0.4)'}
      />
      <circle
        cx="0"
        cy="0"
        r={rad}
        fill={`url(#${gradId})`}
        stroke={rimColor}
        strokeWidth={Math.max(1, rad * 0.1)}
      />

      <g clipPath={`url(#${clipId})`}>
        {theme.id === 'space' && (
          <>
            <circle cx="0" cy="0" r={rad * 0.65} fill={`url(#${coreId})`} />
            {equatorD && (
              <>
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={Math.max(1.3, rad * 0.14)}
                  strokeLinecap="round"
                />
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth={Math.max(0.6, rad * 0.055)}
                  strokeLinecap="round"
                />
              </>
            )}
            {meridianBD && (
              <path
                d={meridianBD}
                fill="none"
                stroke="#c084fc"
                strokeWidth={Math.max(1, rad * 0.11)}
                strokeLinecap="round"
                opacity="0.82"
              />
            )}
            {renderDot(u, 0.8, rad * 0.1, '#f0f9ff')}
            {renderDot(negU, 0.8, rad * 0.1, '#f0f9ff')}
            {renderDot(v, 0.8, rad * 0.1, '#f0f9ff')}
          </>
        )}

        {theme.id === 'hologram' && (
          <>
            {equatorD && (
              <path
                d={equatorD}
                fill="none"
                stroke="#67e8f9"
                strokeWidth={Math.max(1.1, rad * 0.1)}
                strokeLinecap="round"
              />
            )}
            {meridianAD && (
              <path
                d={meridianAD}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={Math.max(0.8, rad * 0.07)}
                strokeLinecap="round"
                opacity="0.75"
              />
            )}
            {meridianBD && (
              <path
                d={meridianBD}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={Math.max(0.8, rad * 0.07)}
                strokeLinecap="round"
                opacity="0.75"
              />
            )}
            <circle cx="0" cy="0" r={Math.max(1.4, rad * 0.14)} fill="#ecfeff" />
          </>
        )}

        {theme.id === 'forest' && (
          <>
            <circle cx="0" cy="0" r={rad * 0.58} fill={`url(#${coreId})`} />
            {equatorD && (
              <path
                d={equatorD}
                fill="none"
                stroke="#fde047"
                strokeWidth={Math.max(1.4, rad * 0.17)}
                strokeLinecap="round"
                opacity="0.65"
              />
            )}
            {renderDot(v, 0.74, rad * 0.14, '#4ade80', 0.88)}
            {renderDot(negV, 0.74, rad * 0.13, '#86efac', 0.88)}
            {renderDot(u, 0.72, rad * 0.11, '#fef08a', 0.95)}
            {renderDot(w, 0.72, rad * 0.11, '#4ade80', 0.82)}
          </>
        )}

        {theme.id === 'pirate' && (
          <>
            {equatorD && (
              <>
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#78350f"
                  strokeWidth={Math.max(1.5, rad * 0.18)}
                  strokeLinecap="round"
                />
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth={Math.max(0.7, rad * 0.055)}
                  strokeDasharray="2 2"
                />
              </>
            )}
            {meridianAD && (
              <path
                d={meridianAD}
                fill="none"
                stroke="#dc2626"
                strokeWidth={Math.max(1.2, rad * 0.12)}
                strokeLinecap="round"
              />
            )}
            {renderDot(v, 0.8, rad * 0.22, '#dc2626', 0.95)}
            {renderDot(v, 0.8, rad * 0.09, '#fef08a', 1)}
            {renderDot(negV, 0.8, rad * 0.22, '#1e3a8a', 0.95)}
            {renderDot(negV, 0.8, rad * 0.09, '#fef08a', 1)}
          </>
        )}

        {theme.id === 'paper' && (
          <>
            {equatorD && (
              <>
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={Math.max(1.3, rad * 0.14)}
                  strokeLinecap="round"
                />
                <path
                  d={equatorD}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth={Math.max(0.6, rad * 0.055)}
                  strokeLinecap="round"
                />
              </>
            )}
          </>
        )}
      </g>

      {theme.id !== 'hologram' && (
        <ellipse
          cx={-rad * 0.3}
          cy={-rad * 0.32}
          rx={rad * 0.25}
          ry={rad * 0.13}
          transform="rotate(-45)"
          fill="rgba(255,255,255,0.9)"
        />
      )}
    </g>
  );
}

export function ThemedPlayerSvg({
  x,
  y,
  r = 9.5,
  theme,
}: {
  x: number;
  y: number;
  r?: number;
  theme: MazeTheme;
}) {
  if (theme.id === 'space' || theme.id === 'hologram') {
    const s = r / 10;
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(-45) scale(${s})`}>
        <polygon points="-3,6.5 0,11.5 3,6.5" fill="#fb923c" />
        <polygon points="-4,1.5 -8.5,7.5 -3.5,6.8" fill="#f43f5e" />
        <polygon points="4,1.5 8.5,7.5 3.5,6.8" fill="#f43f5e" />
        <path
          d="M 0 -10.5 Q 6 -2 4.2 7 L -4.2 7 Q -6 -2 0 -10.5 Z"
          fill="#e0f2fe"
        />
        <path
          d="M 0 -10.5 Q 3.4 -5.5 3.6 -3.5 L -3.6 -3.5 Q -3.4 -5.5 0 -10.5 Z"
          fill="#f43f5e"
        />
        <circle cx="0" cy="0.5" r="2.3" fill="#0284c7" />
      </g>
    );
  }
  if (theme.id === 'forest') {
    const s = r / 10;
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}>
        <polygon points="-7.8,-1.5 -7.2,-9.5 -1.5,-5.2" fill="#ea580c" />
        <polygon points="7.8,-1.5 7.2,-9.5 1.5,-5.2" fill="#ea580c" />
        <path d="M 0 9.2 L -8.5 -1.5 Q 0 -7.2 8.5 -1.5 Z" fill="#fb923c" />
        <polygon points="0,8.5 -6.5,0.5 -1.5,3.2" fill="#fff7ed" />
        <polygon points="0,8.5 6.5,0.5 1.5,3.2" fill="#fff7ed" />
        <circle cx="-2.8" cy="-0.5" r="1.2" fill="#1e293b" />
        <circle cx="2.8" cy="-0.5" r="1.2" fill="#1e293b" />
        <circle cx="0" cy="7.5" r="1.5" fill="#1e293b" />
      </g>
    );
  }
  if (theme.id === 'pirate') {
    const s = r / 10;
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}>
        <line x1="0" y1="-8.8" x2="0" y2="3.5" stroke="#78350f" strokeWidth="1.8" />
        <polygon points="0,-9 4.5,-7.2 0,-5.4" fill="#dc2626" />
        <path
          d="M -5.5 -4.8 Q 3 -4.2 6.2 2 L -5.5 2 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="1"
        />
        <polygon points="-8.5,2.4 8.5,2.4 5.5,7.5 -5.5,7.5" fill="#92400e" />
      </g>
    );
  }
  return (
    <>
      <circle cx={x} cy={y} r={r} fill={theme.playerFill} />
      <circle cx={x} cy={y} r={r * 0.42} fill={theme.playerCore} />
    </>
  );
}

export function ThemedGoalSvg({
  x,
  y,
  r = 9,
  theme,
}: {
  x: number;
  y: number;
  r?: number;
  theme: MazeTheme;
}) {
  const s = r / 9;
  if (theme.id === 'space' || theme.id === 'hologram') {
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}>
        <circle cx="0" cy="0" r="7.5" fill={theme.goalFill} />
        <ellipse
          cx="0"
          cy="0"
          rx="12.5"
          ry="3.6"
          transform="rotate(-20)"
          fill="none"
          stroke="#6ee7b7"
          strokeWidth="2.1"
        />
      </g>
    );
  }
  if (theme.id === 'forest') {
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}>
        <rect x="-6.5" y="-1" width="13" height="8.5" fill="#92400e" />
        <polygon points="-9,-0.5 0,-8.8 9,-0.5" fill="#22c55e" />
        <rect x="-2.2" y="1.5" width="4.4" height="4" fill="#fde047" />
      </g>
    );
  }
  if (theme.id === 'pirate') {
    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}>
        <rect
          x="-7.8"
          y="-5"
          width="15.6"
          height="11"
          rx="1.5"
          fill="#92400e"
          stroke="#f59e0b"
          strokeWidth="1.8"
        />
        <line x1="-7.8" y1="-0.5" x2="7.8" y2="-0.5" stroke="#f59e0b" strokeWidth="1.8" />
        <rect x="-2" y="-2" width="4" height="3.8" fill="#fbbf24" />
      </g>
    );
  }
  return (
    <rect
      x={x - r}
      y={y - r}
      width={r * 2}
      height={r * 2}
      rx={r * 0.55}
      fill={theme.goalFill}
    />
  );
}

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const rad = i % 2 === 0 ? 10 : 4.5;
  const angle = (i * Math.PI) / 5 - Math.PI / 2;
  return `${(Math.cos(angle) * rad).toFixed(2)},${(Math.sin(angle) * rad).toFixed(2)}`;
}).join(' ');

export function ThemedTargetSvg({
  x,
  y,
  r = 9,
  theme,
  collected,
  glowFilter,
}: {
  x: number;
  y: number;
  r?: number;
  theme: MazeTheme;
  collected: boolean;
  glowFilter?: string;
}) {
  if (collected) {
    return (
      <circle
        cx={x}
        cy={y}
        r={r * 0.72}
        fill="none"
        stroke={theme.targetCollected}
        strokeWidth="3"
      />
    );
  }

  const s = r / 9;
  if (theme.id === 'space' || theme.id === 'hologram') {
    return (
      <g
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}
        filter={glowFilter}
      >
        <polygon points={STAR_POINTS} fill={theme.targetStroke} />
      </g>
    );
  }
  if (theme.id === 'forest') {
    return (
      <g
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}
        filter={glowFilter}
      >
        <circle cx="0" cy="1.2" r="7" fill={theme.targetStroke} />
        <ellipse
          cx="2"
          cy="-6.2"
          rx="3.8"
          ry="2"
          transform="rotate(-28 2 -6.2)"
          fill="#4ade80"
        />
      </g>
    );
  }
  if (theme.id === 'pirate') {
    return (
      <g
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`}
        filter={glowFilter}
      >
        <circle
          cx="0"
          cy="0"
          r="8.2"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="2"
        />
        <circle
          cx="0"
          cy="0"
          r="3.8"
          fill="none"
          stroke="#fef08a"
          strokeWidth="1.5"
        />
      </g>
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={theme.targetFill}
      stroke={theme.targetStroke}
      strokeWidth="4"
      filter={glowFilter}
    />
  );
}
