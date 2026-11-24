import type { Vec3 } from '../game/marble';
import type { MazeTheme } from '../maze/themes';

export interface MarbleRenderOptions {
  under?: boolean;
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
    elevated = false,
    u = [1, 0, 0],
    v = [0, 1, 0],
    squash = 0,
    squashAxis = 'x',
  } = options;
  const w = crossVec3(u, v);

  const scaleBoost = elevated ? 1.09 : 1;
  const r = radius * scaleBoost;
  const sq = squash * 0.14;
  const scaleX = squashAxis === 'x' ? 1 - sq : 1 + sq * 0.7;
  const scaleY = squashAxis === 'y' ? 1 - sq : 1 + sq * 0.7;

  ctx.save();
  ctx.translate(x, y);

  if (under) {
    ctx.globalAlpha = 0.5;
  } else {
    // Ground contact shadow offset down-right from overhead light
    const shadowOffset = elevated ? r * 0.34 : r * 0.18;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      shadowOffset * 0.75,
      shadowOffset,
      r * (elevated ? 1.06 : 0.96),
      r * (elevated ? 0.96 : 0.86),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = elevated ? 'rgba(0, 0, 0, 0.36)' : 'rgba(0, 0, 0, 0.42)';
    ctx.filter = `blur(${Math.max(1.5, r * (elevated ? 0.28 : 0.14)).toFixed(1)}px)`;
    ctx.fill();
    ctx.restore();
  }

  ctx.scale(scaleX, scaleY);

  // Base glossy glass sphere
  const grad = ctx.createRadialGradient(
    -r * 0.32,
    -r * 0.34,
    r * 0.06,
    0,
    0,
    r,
  );
  grad.addColorStop(0, theme.marble.highlight);
  grad.addColorStop(0.36, theme.marble.mid);
  grad.addColorStop(0.82, theme.marble.base);
  grad.addColorStop(1, '#020617');

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Clip interior to draw true 3D tumbling cat's-eye ribbon & flecks
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.clip();

  // Tumbling equatorial cat's-eye ribbon (3D curve in the u-w plane with slight v wave)
  const steps = 18;
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    const ribbonRadius = pass === 0 ? r * 0.82 : r * 0.66;
    ctx.beginPath();
    let penDown = false;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      const wave = Math.sin(t * 2 + pass * 1.4) * 0.24;
      const px = u[0] * cosT + w[0] * sinT + v[0] * wave;
      const py = u[1] * cosT + w[1] * sinT + v[1] * wave;
      const pz = u[2] * cosT + w[2] * sinT + v[2] * wave;

      if (pz > -0.15) {
        const sx = px * ribbonRadius;
        const sy = py * ribbonRadius;
        if (!penDown) {
          ctx.moveTo(sx, sy);
          penDown = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      } else {
        penDown = false;
      }
    }
    ctx.strokeStyle =
      pass === 0 ? 'rgba(255, 255, 255, 0.42)' : theme.marble.highlight;
    ctx.globalAlpha = pass === 0 ? 0.55 : 0.45;
    ctx.lineWidth = Math.max(1.4, r * (pass === 0 ? 0.28 : 0.14));
    ctx.stroke();
  }

  // Rolling surface flecks on front hemisphere for unmistakable spin feedback
  const flecks: ReadonlyArray<Vec3> = [
    [v[0], v[1], v[2]],
    [-v[0], -v[1], -v[2]],
    [
      (u[0] + v[0]) * 0.707,
      (u[1] + v[1]) * 0.707,
      (u[2] + v[2]) * 0.707,
    ],
    [
      (w[0] - v[0]) * 0.707,
      (w[1] - v[1]) * 0.707,
      (w[2] - v[2]) * 0.707,
    ],
  ];
  for (const f of flecks) {
    if (f[2] > 0.08) {
      const depth = Math.min(1, f[2]);
      ctx.beginPath();
      ctx.arc(f[0] * r * 0.74, f[1] * r * 0.74, r * 0.13 * depth, 0, Math.PI * 2);
      ctx.fillStyle = theme.marble.highlight;
      ctx.globalAlpha = 0.55 * depth;
      ctx.fill();
    }
  }
  ctx.restore();

  // Lower-right internal caustic bounce glow (fixed to light direction)
  ctx.beginPath();
  ctx.arc(r * 0.26, r * 0.28, r * 0.42, 0, Math.PI * 2);
  const caustic = ctx.createRadialGradient(
    r * 0.26,
    r * 0.28,
    0,
    r * 0.26,
    r * 0.28,
    r * 0.42,
  );
  caustic.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  caustic.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = caustic;
  ctx.fill();

  // Crisp glass rim
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.strokeStyle = theme.marble.rim;
  ctx.globalAlpha = under ? 0.35 : 0.72;
  ctx.stroke();

  // Fixed overhead glossy specular highlight
  ctx.globalAlpha = under ? 0.45 : 0.92;
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.31,
    -r * 0.33,
    r * 0.26,
    r * 0.14,
    -Math.PI / 4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.52, r * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();

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

  if (theme.id === 'space') {
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

  if (theme.id === 'space') {
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

  if (theme.id === 'space') {
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
  const clipId = `${idPrefix}-marble-clip`;
  const w = crossVec3(u, v);
  const rad = elevated ? r * 1.09 : r;

  const ribbonParts: string[] = [];
  const steps = 16;
  let penDown = false;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const wave = Math.sin(t * 2) * 0.24;
    const px = u[0] * cosT + w[0] * sinT + v[0] * wave;
    const py = u[1] * cosT + w[1] * sinT + v[1] * wave;
    const pz = u[2] * cosT + w[2] * sinT + v[2] * wave;
    if (pz > -0.15) {
      ribbonParts.push(
        `${penDown ? 'L' : 'M'} ${(px * rad * 0.8).toFixed(2)} ${(py * rad * 0.8).toFixed(2)}`,
      );
      penDown = true;
    } else {
      penDown = false;
    }
  }

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <defs>
        <radialGradient id={gradId} cx="32%" cy="30%" r="70%">
          <stop offset="0%" stopColor={theme.marble.highlight} />
          <stop offset="40%" stopColor={theme.marble.mid} />
          <stop offset="100%" stopColor={theme.marble.base} />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r={rad * 0.96} />
        </clipPath>
      </defs>
      <ellipse
        cx={elevated ? rad * 0.26 : rad * 0.14}
        cy={elevated ? rad * 0.34 : rad * 0.2}
        rx={rad * (elevated ? 1.04 : 0.94)}
        ry={rad * (elevated ? 0.92 : 0.84)}
        fill="rgba(0,0,0,0.36)"
      />
      <circle
        cx="0"
        cy="0"
        r={rad}
        fill={`url(#${gradId})`}
        stroke={theme.marble.rim}
        strokeWidth={Math.max(1, rad * 0.1)}
      />
      <g clipPath={`url(#${clipId})`}>
        {ribbonParts.length > 0 && (
          <path
            d={ribbonParts.join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.48)"
            strokeWidth={Math.max(1.5, rad * 0.26)}
            strokeLinecap="round"
          />
        )}
        {v[2] > 0.1 && (
          <circle
            cx={v[0] * rad * 0.72}
            cy={v[1] * rad * 0.72}
            r={rad * 0.14 * v[2]}
            fill={theme.marble.highlight}
            opacity={0.6 * v[2]}
          />
        )}
        {-v[2] > 0.1 && (
          <circle
            cx={-v[0] * rad * 0.72}
            cy={-v[1] * rad * 0.72}
            r={rad * 0.14 * -v[2]}
            fill={theme.marble.highlight}
            opacity={0.6 * -v[2]}
          />
        )}
      </g>
      <ellipse
        cx={-rad * 0.3}
        cy={-rad * 0.32}
        rx={rad * 0.26}
        ry={rad * 0.14}
        transform="rotate(-45)"
        fill="rgba(255,255,255,0.9)"
      />
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
  if (theme.id === 'space') {
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
  if (theme.id === 'space') {
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
  if (theme.id === 'space') {
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
