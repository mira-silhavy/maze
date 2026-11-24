import type { MazeTheme } from '../maze/themes';

export function drawMarbleCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: MazeTheme,
  under = false,
): void {
  ctx.save();
  if (under) {
    ctx.globalAlpha = 0.5;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(4, radius * 0.7);
    ctx.shadowOffsetY = Math.max(1.5, radius * 0.2);
  }

  const grad = ctx.createRadialGradient(
    x - radius * 0.32,
    y - radius * 0.34,
    radius * 0.08,
    x,
    y,
    radius,
  );
  grad.addColorStop(0, theme.marble.highlight);
  grad.addColorStop(0.38, theme.marble.mid);
  grad.addColorStop(1, theme.marble.base);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1, radius * 0.12);
  ctx.strokeStyle = theme.marble.rim;
  ctx.globalAlpha = under ? 0.35 : 0.75;
  ctx.stroke();

  // Glossy specular reflection dot
  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.3,
    y - radius * 0.32,
    radius * 0.24,
    radius * 0.14,
    -Math.PI / 4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
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
}: {
  x: number;
  y: number;
  r?: number;
  theme: MazeTheme;
  idPrefix: string;
}) {
  const gradId = `${idPrefix}-marble-grad-${theme.id}`;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <defs>
        <radialGradient id={gradId} cx="32%" cy="30%" r="70%">
          <stop offset="0%" stopColor={theme.marble.highlight} />
          <stop offset="40%" stopColor={theme.marble.mid} />
          <stop offset="100%" stopColor={theme.marble.base} />
        </radialGradient>
      </defs>
      <circle
        cx="0"
        cy="0"
        r={r}
        fill={`url(#${gradId})`}
        stroke={theme.marble.rim}
        strokeWidth={Math.max(1, r * 0.12)}
      />
      <ellipse
        cx={-r * 0.3}
        cy={-r * 0.32}
        rx={r * 0.25}
        ry={r * 0.14}
        transform="rotate(-45)"
        fill="rgba(255,255,255,0.85)"
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
