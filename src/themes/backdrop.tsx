import { memo, useEffect, useRef } from 'react';
import type { MazeTheme } from './catalog';

const MAX_BACKDROP_DPR = 1.5;

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

function drawThemedBackdropCanvas(
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

export const PageBackdrop = memo(function PageBackdrop({
  theme,
}: {
  theme: MazeTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_BACKDROP_DPR);
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
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
});
