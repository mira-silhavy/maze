import { useMemo } from 'react';
import type { Vec3 } from '../game/marble';
import {
  bridgeNeighbors,
  corridorLinks,
  gridStep,
  pathThrough,
  positionKey,
} from '../maze/grid';
import type {
  AspectRatioId,
  Cell,
  GameMode,
  Maze,
  Position,
} from '../maze/types';
import {
  MarbleSvg,
  ThemedGoalSvg,
  ThemedPlayerSvg,
  ThemedTargetSvg,
} from '../themes/art';
import type { MazeTheme } from '../themes/catalog';
import {
  ThemedCorridorTubeSvg,
  ThemedCurvedBridgeBaseSvg,
  ThemedCurvedBridgeOverlaySvg,
  type CurvedBridgeCorner,
} from '../themes/sceneSvg';

interface CurvedMazeProps {
  maze: Maze;
  player: Position;
  trail: Position[];
  explored: Set<string>;
  hintPath: Position[];
  aspectRatioId: AspectRatioId;
  gameMode: GameMode;
  targets: Position[];
  collected: Set<string>;
  theme: MazeTheme;
  marbleMode?: boolean;
  marblePos?: {
    x: number;
    y: number;
    level?: 'over' | 'under';
    u?: Vec3;
    v?: Vec3;
  } | null;
  fogOfWar?: boolean;
  fullScreen?: boolean;
}

const CONTAINER_MAX_WIDTH: Record<AspectRatioId, string> = {
  square: 'max-w-[600px]',
  tablet: 'max-w-[820px]',
  widescreen: 'max-w-[1060px]',
};

const CELL_UNIT = 40;
const PADDING = 24;

function nodeCenter(pos: Position): { x: number; y: number } {
  const hash = Math.sin(pos.row * 12.9898 + pos.col * 78.233) * 43758.5453;
  const fracX = (hash - Math.floor(hash)) * 2 - 1;
  const hash2 = Math.sin(pos.row * 39.346 + pos.col * 11.135) * 24634.6345;
  const fracY = (hash2 - Math.floor(hash2)) * 2 - 1;
  const jitter = CELL_UNIT * 0.14;

  return {
    x: PADDING + (pos.col + 0.5) * CELL_UNIT + fracX * jitter,
    y: PADDING + (pos.row + 0.5) * CELL_UNIT + fracY * jitter,
  };
}

export function curvedPointFromGrid(
  gridX: number,
  gridY: number,
  rows: number,
  cols: number,
): { x: number; y: number } {
  const u = gridX - 0.5;
  const v = gridY - 0.5;
  const maxCol = Math.max(0, cols - 1);
  const maxRow = Math.max(0, rows - 1);

  const clampedU = Math.min(maxCol, Math.max(0, u));
  const clampedV = Math.min(maxRow, Math.max(0, v));

  const c0 = Math.floor(clampedU);
  const r0 = Math.floor(clampedV);
  const c1 = Math.min(maxCol, c0 + 1);
  const r1 = Math.min(maxRow, r0 + 1);
  const tx = clampedU - c0;
  const ty = clampedV - r0;

  const p00 = nodeCenter({ row: r0, col: c0 });
  const p10 = nodeCenter({ row: r0, col: c1 });
  const p01 = nodeCenter({ row: r1, col: c0 });
  const p11 = nodeCenter({ row: r1, col: c1 });

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  return {
    x:
      w00 * p00.x +
      w10 * p10.x +
      w01 * p01.x +
      w11 * p11.x +
      (u - clampedU) * CELL_UNIT,
    y:
      w00 * p00.y +
      w10 * p10.y +
      w01 * p01.y +
      w11 * p11.y +
      (v - clampedV) * CELL_UNIT,
  };
}

function curvedSegmentGeom(a: Position, b: Position) {
  const p1 = nodeCenter(a);
  const p2 = nodeCenter(b);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const sign = (a.row + a.col + b.row + b.col) % 2 === 0 ? 1 : -1;
  const bend = CELL_UNIT * 0.14 * sign;
  const cx = midX + (-dy / len) * bend;
  const cy = midY + (dx / len) * bend;
  return { p1, p2, cx, cy };
}

function curvedSegment(a: Position, b: Position): string {
  const { p1, p2, cx, cy } = curvedSegmentGeom(a, b);
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

function curvedSubSegment(a: Position, b: Position, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.001) return '';
  if (clamped >= 0.999) return curvedSegment(a, b);
  const { p1, p2, cx, cy } = curvedSegmentGeom(a, b);
  const q1x = p1.x + (cx - p1.x) * clamped;
  const q1y = p1.y + (cy - p1.y) * clamped;
  const r1x = cx + (p2.x - cx) * clamped;
  const r1y = cy + (p2.y - cy) * clamped;
  const endX = q1x + (r1x - q1x) * clamped;
  const endY = q1y + (r1y - q1y) * clamped;
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${q1x.toFixed(1)} ${q1y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

function bridgeGeometry(cell: Cell): {
  deck: string;
  corners: CurvedBridgeCorner[];
} {
  const [from, to] = bridgeNeighbors(cell);
  const g1 = curvedSegmentGeom(from, cell);
  const g2 = curvedSegmentGeom(cell, to);

  // Trim to 0.64 on each side of the cell center (matching Rect's 0.14 overhang)
  const a = 0.36;
  const oma = 1 - a;
  const q0x = oma * oma * g1.p1.x + 2 * a * oma * g1.cx + a * a * g1.p2.x;
  const q0y = oma * oma * g1.p1.y + 2 * a * oma * g1.cy + a * a * g1.p2.y;
  const q1x = oma * g1.cx + a * g1.p2.x;
  const q1y = oma * g1.cy + a * g1.p2.y;

  const b = 0.64;
  const omb = 1 - b;
  const r1x = omb * g2.p1.x + b * g2.cx;
  const r1y = omb * g2.p1.y + b * g2.cy;
  const r2x = omb * omb * g2.p1.x + 2 * b * omb * g2.cx + b * b * g2.p2.x;
  const r2y = omb * omb * g2.p1.y + 2 * b * omb * g2.cy + b * b * g2.p2.y;

  const deck = `M ${q0x.toFixed(1)} ${q0y.toFixed(1)} Q ${q1x.toFixed(1)} ${q1y.toFixed(1)} ${g1.p2.x.toFixed(1)} ${g1.p2.y.toFixed(1)} Q ${r1x.toFixed(1)} ${r1y.toFixed(1)} ${r2x.toFixed(1)} ${r2y.toFixed(1)}`;

  const railR = CELL_UNIT * 0.335;
  const endCorners = (
    px: number,
    py: number,
    tx: number,
    ty: number,
  ): CurvedBridgeCorner[] => {
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const angleDeg = (Math.atan2(ty, tx) * 180) / Math.PI;
    return [
      { x: px + nx * railR, y: py + ny * railR, angleDeg, side: 1 },
      { x: px - nx * railR, y: py - ny * railR, angleDeg, side: -1 },
    ];
  };

  return {
    deck,
    corners: [
      ...endCorners(q0x, q0y, q1x - q0x, q1y - q0y),
      ...endCorners(r2x, r2y, r2x - r1x, r2y - r1y),
    ],
  };
}

export function CurvedMaze({
  maze,
  player,
  trail,
  explored,
  hintPath,
  aspectRatioId,
  gameMode,
  targets,
  collected,
  theme,
  marbleMode = false,
  marblePos = null,
  fogOfWar = false,
  fullScreen = false,
}: CurvedMazeProps) {
  const viewWidth = maze.cols * CELL_UNIT + PADDING * 2;
  const viewHeight = maze.rows * CELL_UNIT + PADDING * 2;

  const corridorPathD = useMemo(
    () => corridorLinks(maze).map(([a, b]) => curvedSegment(a, b)).join(' '),
    [maze],
  );

  const bridges = useMemo(
    () => maze.grid.flat().filter((cell) => cell.bridge),
    [maze],
  );

  const extendCurvedFromCenter = (
    cur: Position,
    mp: { x: number; y: number },
  ): string => {
    const relX = mp.x - (cur.col + 0.5);
    const relY = mp.y - (cur.row + 0.5);
    if (Math.abs(relX) >= Math.abs(relY)) {
      if (relX > 0.02) {
        const next = gridStep(maze, cur, 'right');
        if (next) return curvedSubSegment(cur, next, relX);
      } else if (relX < -0.02) {
        const next = gridStep(maze, cur, 'left');
        if (next) return curvedSubSegment(cur, next, -relX);
      }
    } else {
      if (relY > 0.02) {
        const next = gridStep(maze, cur, 'bottom');
        if (next) return curvedSubSegment(cur, next, relY);
      } else if (relY < -0.02) {
        const next = gridStep(maze, cur, 'top');
        if (next) return curvedSubSegment(cur, next, -relY);
      }
    }
    return '';
  };

  const buildTrailD = (points: Position[], trimLiveEnd: boolean): string => {
    if (points.length === 0) return '';
    if (!marbleMode || !marblePos || !trimLiveEnd) {
      if (points.length < 2) return '';
      const segments: string[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        segments.push(curvedSegment(points[i], points[i + 1]));
      }
      return segments.join(' ');
    }
    if (points.length === 1) {
      return extendCurvedFromCenter(points[0], marblePos);
    }
    const segments: string[] = [];
    for (let i = 0; i < points.length - 2; i++) {
      segments.push(curvedSegment(points[i], points[i + 1]));
    }
    const prev = points[points.length - 2];
    const cur = points[points.length - 1];
    const dx = cur.col - prev.col;
    const dy = cur.row - prev.row;
    const proj = Math.max(
      0,
      Math.min(
        1,
        (marblePos.x - (prev.col + 0.5)) * dx +
          (marblePos.y - (prev.row + 0.5)) * dy,
      ),
    );
    const tipSeg = curvedSubSegment(prev, cur, proj);
    if (tipSeg) segments.push(tipSeg);
    if (proj >= 0.999) {
      const ext = extendCurvedFromCenter(cur, marblePos);
      if (ext) segments.push(ext);
    }
    return segments.join(' ');
  };

  const pencilPathD = useMemo(
    () => buildTrailD(trail, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trail, marbleMode, marblePos, maze],
  );

  const hintPathD = useMemo(() => {
    if (hintPath.length < 2) return '';
    const segments: string[] = [];
    for (let i = 0; i < hintPath.length - 1; i++) {
      segments.push(curvedSegment(hintPath[i], hintPath[i + 1]));
    }
    return segments.join(' ');
  }, [hintPath]);

  const exploredCenters = useMemo(() => {
    if (!fogOfWar) return [];
    const seen = new Set<string>();
    const pts: Array<{ key: string; x: number; y: number }> = [];
    for (const key of explored) {
      const parts = key.split(',');
      const row = Number(parts[0]);
      const col = Number(parts[1]);
      const cellKey = `${row},${col}`;
      if (seen.has(cellKey)) continue;
      seen.add(cellKey);
      const pt = nodeCenter({ row, col });
      pts.push({ key: cellKey, x: pt.x, y: pt.y });
    }
    return pts;
  }, [explored, fogOfWar]);

  const startPos = nodeCenter(maze.start);
  const endPos = nodeCenter(maze.end);
  const playerPos = useMemo(() => {
    if (marbleMode && marblePos) {
      return curvedPointFromGrid(marblePos.x, marblePos.y, maze.rows, maze.cols);
    }
    return nodeCenter(player);
  }, [marbleMode, marblePos, player, maze.rows, maze.cols]);

  const effectiveLevel = marbleMode && marblePos ? marblePos.level : player.level;
  const effectiveRow =
    marbleMode && marblePos
      ? Math.min(maze.rows - 1, Math.max(0, Math.floor(marblePos.y)))
      : player.row;
  const effectiveCol =
    marbleMode && marblePos
      ? Math.min(maze.cols - 1, Math.max(0, Math.floor(marblePos.x)))
      : player.col;

  const playerMarker = marbleMode ? (
    <MarbleSvg
      x={playerPos.x}
      y={playerPos.y}
      r={10.5}
      theme={theme}
      idPrefix="curved"
      u={marblePos?.u}
      v={marblePos?.v}
      elevated={effectiveLevel === 'over'}
    />
  ) : (
    <ThemedPlayerSvg x={playerPos.x} y={playerPos.y} r={10.5} theme={theme} />
  );
  const pathD = (points: Position[]) =>
    points
      .slice(1)
      .map((pos, i) => curvedSegment(points[i], pos))
      .join(' ');

  return (
    <div
      style={fullScreen ? undefined : { aspectRatio: `${maze.cols} / ${maze.rows}` }}
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
          : `flex max-h-[68vh] w-full ${CONTAINER_MAX_WIDTH[aspectRatioId]} items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
      }
    >
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="h-full w-full rounded-xl"
        role="img"
        aria-label="Křivkové bludiště"
      >
        <defs>
          <filter id="curved-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {bridges.map((cell) => {
            const overhang = CELL_UNIT * 0.14;
            const padX = cell.bridge === 'horizontal' ? overhang : 0;
            const padY = cell.bridge === 'vertical' ? overhang : 0;
            return (
              <clipPath
                key={positionKey(cell)}
                id={`curved-bridge-${cell.row}-${cell.col}`}
              >
                <rect
                  x={PADDING + cell.col * CELL_UNIT - padX}
                  y={PADDING + cell.row * CELL_UNIT - padY}
                  width={CELL_UNIT + padX * 2}
                  height={CELL_UNIT + padY * 2}
                />
              </clipPath>
            );
          })}
          {fogOfWar && (
            <>
              <radialGradient id="curved-fog-mem">
                <stop offset="0%" stopColor="black" stopOpacity="0.56" />
                <stop offset="100%" stopColor="black" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="curved-fog-light">
                <stop offset="0%" stopColor="black" stopOpacity="1" />
                <stop offset="64%" stopColor="black" stopOpacity="0.9" />
                <stop offset="100%" stopColor="black" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="curved-fog-tint">
                <stop offset="0%" stopColor={theme.lightTint} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <mask id="curved-fog-mask">
                <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="white" />
                {exploredCenters.map((pt) => (
                  <circle
                    key={pt.key}
                    cx={pt.x}
                    cy={pt.y}
                    r={CELL_UNIT * 1.65}
                    fill="url(#curved-fog-mem)"
                  />
                ))}
                <circle
                  cx={playerPos.x}
                  cy={playerPos.y}
                  r={CELL_UNIT * 2.8}
                  fill="url(#curved-fog-light)"
                />
              </mask>
            </>
          )}
        </defs>

        {/* Corridor tube (themed outer wall + inner floor) */}
        <ThemedCorridorTubeSvg
          d={corridorPathD}
          outerWidth={CELL_UNIT * 0.72}
          innerWidth={CELL_UNIT * 0.54}
          theme={theme}
          glowFilterId="curved-glow"
        />

        {/* Continuous pencil line */}
        {pencilPathD && (
          <path
            d={pencilPathD}
            fill="none"
            stroke={theme.pencilLine}
            strokeWidth={CELL_UNIT * 0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={theme.isLight ? 0.85 : 0.8}
          />
        )}

        {/* Hint path */}
        {hintPathD && (
          <path
            d={hintPathD}
            fill="none"
            stroke={theme.hintStroke}
            strokeWidth={CELL_UNIT * 0.14}
            strokeLinecap="round"
            strokeDasharray="6 8"
            opacity="0.9"
          />
        )}

        {bridges.map((cell) => {
          const { deck, corners } = bridgeGeometry(cell);
          const isUnder =
            effectiveLevel === 'under' &&
            effectiveRow === cell.row &&
            effectiveCol === cell.col;
          return (
            <g
              key={positionKey(cell)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ThemedCurvedBridgeBaseSvg
                deck={deck}
                cellUnit={CELL_UNIT}
                theme={theme}
              />
              <g clipPath={`url(#curved-bridge-${cell.row}-${cell.col})`}>
                {pathThrough(trail, cell, 'over').map((part, i) => {
                  const isLiveEnd =
                    marbleMode &&
                    marblePos !== null &&
                    part.length >= 2 &&
                    part[part.length - 1] === trail[trail.length - 1];
                  const d = buildTrailD(part, isLiveEnd);
                  return d ? (
                    <path
                      key={i}
                      d={d}
                      stroke={theme.pencilLine}
                      strokeWidth={CELL_UNIT * 0.2}
                      opacity={theme.isLight ? 0.85 : 0.8}
                    />
                  ) : null;
                })}
                {pathThrough(hintPath, cell, 'over').map((part, i) => (
                  <path
                    key={i}
                    d={pathD(part)}
                    stroke={theme.hintStroke}
                    strokeWidth={CELL_UNIT * 0.14}
                    strokeDasharray="6 8"
                    opacity="0.9"
                  />
                ))}
                {isUnder && (
                  <g
                    opacity={
                      marbleMode && marblePos
                        ? (() => {
                            const d =
                              cell.bridge === 'horizontal'
                                ? Math.abs(marblePos.y - (cell.row + 0.5))
                                : Math.abs(marblePos.x - (cell.col + 0.5));
                            const t = Math.max(0, Math.min(1, 1 - d / 0.72));
                            const smooth = t * t * (3 - 2 * t);
                            return 0.85 - smooth * 0.53;
                          })()
                        : 0.55
                    }
                  >
                    {playerMarker}
                  </g>
                )}
              </g>
              <ThemedCurvedBridgeOverlaySvg
                deck={deck}
                corners={corners}
                cellUnit={CELL_UNIT}
                theme={theme}
                glowFilterId="curved-glow"
              />
            </g>
          );
        })}

        {/* Start marker */}
        {gameMode === 'collect' ? (
          <g stroke={theme.startCross} strokeWidth="4.5" strokeLinecap="round">
            <line
              x1={startPos.x - 8}
              y1={startPos.y - 8}
              x2={startPos.x + 8}
              y2={startPos.y + 8}
            />
            <line
              x1={startPos.x + 8}
              y1={startPos.y - 8}
              x2={startPos.x - 8}
              y2={startPos.y + 8}
            />
          </g>
        ) : (
          <circle
            cx={startPos.x}
            cy={startPos.y}
            r="7"
            fill={theme.startHighlight}
          />
        )}

        {/* Goal(s) */}
        {gameMode === 'classic' ? (
          <g filter={theme.isLight ? undefined : 'url(#curved-glow)'}>
            <ThemedGoalSvg x={endPos.x} y={endPos.y} r={9.5} theme={theme} />
          </g>
        ) : (
          targets.map((target) => {
            const key = positionKey(target);
            const isCollected = collected.has(key);
            const pt = nodeCenter(target);
            return (
              <ThemedTargetSvg
                key={key}
                x={pt.x}
                y={pt.y}
                r={9.5}
                theme={theme}
                collected={isCollected}
                glowFilter={theme.isLight ? undefined : 'url(#curved-glow)'}
              />
            );
          })
        )}

        {/* Player */}
        {effectiveLevel !== 'under' && (
          <g filter={theme.isLight ? undefined : 'url(#curved-glow)'}>
            {playerMarker}
          </g>
        )}

        {/* Fog of War + Flashlight */}
        {fogOfWar && (
          <>
            <rect
              x="0"
              y="0"
              width={viewWidth}
              height={viewHeight}
              fill={theme.fogColor}
              mask="url(#curved-fog-mask)"
            />
            <circle
              cx={playerPos.x}
              cy={playerPos.y}
              r={CELL_UNIT * 2.8}
              fill="url(#curved-fog-tint)"
            />
          </>
        )}
      </svg>
    </div>
  );
}
