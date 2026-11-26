import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import type { PolarMarbleBody } from '../game/marble';
import {
  hasPolarPassage,
  polarCellId,
  type PolarCell,
  type PolarMaze,
} from '../maze/polar';
import type { GameMode } from '../maze/types';
import {
  drawMarbleCanvas,
  ThemedGoalSvg,
  ThemedPlayerSvg,
  ThemedTargetSvg,
} from '../themes/art';
import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from '../themes/catalog';
import { GlowFilterSvg, ThemedWallPathSvg } from '../themes/sceneSvg';
import { drawLiveTrailCanvas } from './canvasLayers';
import { useSvgFogCanvas } from './useSvgFogCanvas';
import { useViewBoxCanvas } from './viewBoxCanvas';

interface CircularMazeProps {
  maze: PolarMaze;
  playerId: string;
  visited: Set<string>;
  explored: Set<string>;
  trail: string[];
  hintPath: string[];
  gameMode: GameMode;
  targets: string[];
  collected: Set<string>;
  theme: MazeTheme;
  marbleMode?: boolean;
  marbleRef?: MutableRefObject<PolarMarbleBody | null>;
  registerDraw?: (fn: (() => void) | null) => void;
  fogOfWar?: boolean;
  fullScreen?: boolean;
}

const RING_STEP = 36;
const MARGIN = 24;
const POLAR_MARBLE_RADIUS = 9.5;

function polarToCartesian(radius: number, angle: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function arcPath(radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(radius, startAngle);
  const end = polarToCartesian(radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function sectorWedgePath(cell: PolarCell): string {
  if (cell.ring === 0) {
    const r = cell.rOuter * RING_STEP;
    return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
  }
  const rIn = cell.rInner * RING_STEP;
  const rOut = cell.rOuter * RING_STEP;
  const p1 = polarToCartesian(rOut, cell.angleStart);
  const p2 = polarToCartesian(rOut, cell.angleEnd);
  const p3 = polarToCartesian(rIn, cell.angleEnd);
  const p4 = polarToCartesian(rIn, cell.angleStart);
  const largeArc = cell.angleEnd - cell.angleStart > Math.PI ? 1 : 0;

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function projectPolarTowardOpenNeighbor(
  maze: PolarMaze,
  cur: PolarCell,
  mp: { x: number; y: number },
  excludeId?: string,
): { x: number; y: number } | null {
  const mx = mp.x - cur.x;
  const my = mp.y - cur.y;
  let best: { x: number; y: number } | null = null;
  let bestScore = 0.02;
  for (const nId of cur.neighbors) {
    if (nId === excludeId || !hasPolarPassage(maze, cur.id, nId)) continue;
    const n = maze.cells.get(nId);
    if (!n) continue;
    const vx = n.x - cur.x;
    const vy = n.y - cur.y;
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1e-6) continue;
    const u = Math.min(1, (mx * vx + my * vy) / lenSq);
    if (u > bestScore) {
      bestScore = u;
      best = { x: cur.x + vx * u, y: cur.y + vy * u };
    }
  }
  return best;
}

function buildPolarLiveTipD(
  maze: PolarMaze,
  trail: string[],
  mp: { x: number; y: number },
): string {
  if (trail.length === 0) return '';
  if (trail.length === 1) {
    const cur = maze.cells.get(trail[0]);
    if (!cur) return '';
    const ext = projectPolarTowardOpenNeighbor(maze, cur, mp);
    if (!ext) return '';
    return `M ${(cur.x * RING_STEP).toFixed(2)} ${(cur.y * RING_STEP).toFixed(2)} L ${(ext.x * RING_STEP).toFixed(2)} ${(ext.y * RING_STEP).toFixed(2)}`;
  }

  const prev = maze.cells.get(trail[trail.length - 2])!;
  const cur = maze.cells.get(trail[trail.length - 1])!;
  const vx = cur.x - prev.x;
  const vy = cur.y - prev.y;
  const lenSq = vx * vx + vy * vy;
  const t =
    lenSq > 1e-6
      ? Math.max(
          0,
          Math.min(1, ((mp.x - prev.x) * vx + (mp.y - prev.y) * vy) / lenSq),
        )
      : 1;
  const tipX = (prev.x + vx * t) * RING_STEP;
  const tipY = (prev.y + vy * t) * RING_STEP;
  const parts = [
    `M ${(prev.x * RING_STEP).toFixed(2)} ${(prev.y * RING_STEP).toFixed(2)}`,
    `L ${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
  ];

  if (t >= 0.999) {
    const ext = projectPolarTowardOpenNeighbor(maze, cur, mp, prev.id);
    if (ext) {
      parts.push(
        `L ${(ext.x * RING_STEP).toFixed(2)} ${(ext.y * RING_STEP).toFixed(2)}`,
      );
    }
  }
  return parts.join(' ');
}

export function CircularMaze({
  maze,
  playerId,
  visited,
  explored,
  trail,
  hintPath,
  gameMode,
  targets,
  collected,
  theme,
  marbleMode = false,
  marbleRef,
  registerDraw,
  fogOfWar = false,
  fullScreen = false,
}: CircularMazeProps) {
  const maxRadius = maze.rings * RING_STEP;
  const halfExtent = maxRadius + MARGIN;
  const viewBox = `${-halfExtent} ${-halfExtent} ${halfExtent * 2} ${halfExtent * 2}`;

  const wallsPathD = useMemo(() => {
    const paths: string[] = [];

    for (const cell of maze.cellList) {
      if (cell.ring === 0) continue;

      const innerCount = maze.ringCounts[cell.ring - 1];
      const ratio = cell.sectorCount / innerCount;
      const innerSector = Math.floor(cell.sector / ratio);
      const innerId = polarCellId(cell.ring - 1, innerSector);
      if (!hasPolarPassage(maze, cell.id, innerId)) {
        paths.push(
          arcPath(cell.rInner * RING_STEP, cell.angleStart, cell.angleEnd),
        );
      }

      const cwId = polarCellId(cell.ring, (cell.sector + 1) % cell.sectorCount);
      if (!hasPolarPassage(maze, cell.id, cwId)) {
        const pIn = polarToCartesian(cell.rInner * RING_STEP, cell.angleEnd);
        const pOut = polarToCartesian(cell.rOuter * RING_STEP, cell.angleEnd);
        paths.push(
          `M ${pIn.x.toFixed(2)} ${pIn.y.toFixed(2)} L ${pOut.x.toFixed(2)} ${pOut.y.toFixed(2)}`,
        );
      }

      if (cell.ring === maze.rings - 1) {
        const isClassicEntry = gameMode === 'classic' && cell.id === maze.startId;
        if (!isClassicEntry) {
          paths.push(
            arcPath(cell.rOuter * RING_STEP, cell.angleStart, cell.angleEnd),
          );
        }
      }
    }

    return paths.join(' ');
  }, [maze, gameMode]);

  const sectorWedges = useMemo(() => {
    const map = new Map<string, string>();
    for (const cell of maze.cellList) {
      map.set(cell.id, sectorWedgePath(cell));
    }
    return map;
  }, [maze]);

  const visitedWedgeD = useMemo(() => {
    if (visited.size === 0) return '';
    const parts: string[] = [];
    for (const id of visited) {
      const d = sectorWedges.get(id);
      if (d) parts.push(d);
    }
    return parts.join(' ');
  }, [visited, sectorWedges]);

  const staticPencilPathD = useMemo(() => {
    const count = marbleMode ? trail.length - 1 : trail.length;
    if (count < 2) return '';
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const cell = maze.cells.get(trail[i])!;
      const x = (cell.x * RING_STEP).toFixed(2);
      const y = (cell.y * RING_STEP).toFixed(2);
      parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return parts.join(' ');
  }, [trail, maze, marbleMode]);

  const hintPathD = useMemo(() => {
    if (hintPath.length < 2) return '';
    return hintPath
      .map((id, idx) => {
        const cell = maze.cells.get(id)!;
        const x = (cell.x * RING_STEP).toFixed(2);
        const y = (cell.y * RING_STEP).toFixed(2);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [hintPath, maze]);

  const playerCell = maze.cells.get(playerId)!;
  const startCell = maze.cells.get(maze.startId)!;
  const endCell = maze.cells.get(maze.endId)!;
  const wallStroke = Math.max(2.2, Math.min(4, RING_STEP * 0.095));

  const marbleBody = marbleMode && marbleRef ? marbleRef.current : null;
  const activeX = marbleBody
    ? marbleBody.x * RING_STEP
    : playerCell.x * RING_STEP;
  const activeY = marbleBody
    ? marbleBody.y * RING_STEP
    : playerCell.y * RING_STEP;
  const showOverlay = marbleMode && Boolean(marbleRef);
  const trailOpacity = theme.isLight ? 0.85 : 0.8;

  const viewBoxRect = {
    x: -halfExtent,
    y: -halfExtent,
    width: halfExtent * 2,
    height: halfExtent * 2,
  };
  const fog = useSvgFogCanvas(
    fogOfWar
      ? {
          viewBox: viewBoxRect,
          cellUnit: RING_STEP,
          theme,
          explored,
          cellOf: (id) => {
            const cell = maze.cells.get(id);
            return cell
              ? { id, x: cell.x * RING_STEP, y: cell.y * RING_STEP }
              : null;
          },
          boardToken: maze,
          active: { x: activeX, y: activeY },
        }
      : null,
  );
  const updateLiveDomRef = useRef<() => void>(() => {});
  const live = useViewBoxCanvas(viewBoxRect, showOverlay, () =>
    updateLiveDomRef.current(),
  );
  updateLiveDomRef.current = () => {
    if (!marbleMode || !marbleRef?.current) return;
    const body = marbleRef.current;
    const px = body.x * RING_STEP;
    const py = body.y * RING_STEP;
    if (fogOfWar) fog.draw({ x: px, y: py });

    const frame = live.begin();
    if (!frame) return;
    frame.useViewBoxUnits();
    const tipD = buildPolarLiveTipD(maze, trail, body);
    drawLiveTrailCanvas(frame.ctx, `${staticPencilPathD} ${tipD}`.trim(), {
      color: theme.pencilLine,
      width: 6.5,
      alpha: trailOpacity,
      cutouts: [],
      bounds: viewBoxRect,
    });
    drawMarbleCanvas(frame.ctx, px, py, POLAR_MARBLE_RADIUS, theme, {
      u: body.u,
      v: body.v,
    });
  };

  useEffect(() => {
    if (!registerDraw) return;
    const draw = () => updateLiveDomRef.current();
    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw]);

  // Redraw the live layer after every render (new step, theme, restart).
  useEffect(() => updateLiveDomRef.current());

  const pencilLine = staticPencilPathD && (
    <path
      d={staticPencilPathD}
      fill="none"
      stroke={theme.pencilLine}
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={trailOpacity}
    />
  );

  return (
    <div
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
          : `flex aspect-square max-h-[68vh] w-full max-w-[620px] items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
      }
    >
      <div className="relative h-full w-full">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full rounded-xl"
          role="img"
          aria-label="Kruhové bludiště"
        >
          <defs>
            <GlowFilterSvg id="polar-glow" />
          </defs>

          {/* Circular floor */}
          <circle
            cx="0"
            cy="0"
            r={maxRadius}
            fill={theme.corridorFloor}
            fillOpacity={CORRIDOR_FLOOR_OPACITY}
          />

          {/* Visited cells (single combined path) */}
          {visitedWedgeD && <path d={visitedWedgeD} fill={theme.visitedFill} />}

          {!showOverlay && pencilLine}

          {/* Hint path */}
          {hintPathD && (
            <path
              d={hintPathD}
              fill="none"
              stroke={theme.hintStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 8"
              opacity="0.9"
            />
          )}

          {/* Start marker */}
          {gameMode === 'collect' ? (
            <g
              transform={`translate(${(startCell.x * RING_STEP).toFixed(2)} ${(startCell.y * RING_STEP).toFixed(2)})`}
              stroke={theme.startCross}
              strokeWidth="4.5"
              strokeLinecap="round"
            >
              <line x1="-8" y1="-8" x2="8" y2="8" />
              <line x1="8" y1="-8" x2="-8" y2="8" />
            </g>
          ) : (
            <circle
              cx={startCell.x * RING_STEP}
              cy={startCell.y * RING_STEP}
              r="8"
              fill={theme.startHighlight}
            />
          )}

          {/* Goal(s) */}
          {gameMode === 'classic' ? (
            <g filter={theme.isLight ? undefined : 'url(#polar-glow)'}>
              <ThemedGoalSvg
                x={endCell.x * RING_STEP}
                y={endCell.y * RING_STEP}
                r={9}
                theme={theme}
              />
            </g>
          ) : (
            targets.map((targetId) => {
              const cell = maze.cells.get(targetId);
              if (!cell) return null;
              const isCollected = collected.has(targetId);
              const cx = cell.x * RING_STEP;
              const cy = cell.y * RING_STEP;
              return (
                <ThemedTargetSvg
                  key={targetId}
                  x={cx}
                  y={cy}
                  r={8.5}
                  theme={theme}
                  collected={isCollected}
                  glowFilter={theme.isLight ? undefined : 'url(#polar-glow)'}
                />
              );
            })
          )}

          {/* Polar walls */}
          <ThemedWallPathSvg
            d={wallsPathD}
            wallWidth={wallStroke}
            theme={theme}
            glowFilterId="polar-glow"
          />

          {/* Non-marble player */}
          {!showOverlay && (
            <g filter={theme.isLight ? undefined : 'url(#polar-glow)'}>
              <ThemedPlayerSvg
                x={playerCell.x * RING_STEP}
                y={playerCell.y * RING_STEP}
                r={9.5}
                theme={theme}
              />
            </g>
          )}

        </svg>

        {fogOfWar && (
          <canvas
            ref={fog.canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-xl"
          />
        )}

        {showOverlay && (
          <canvas
            ref={live.canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
          />
        )}
      </div>
    </div>
  );
}
