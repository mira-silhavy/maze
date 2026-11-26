import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import { layerPath, layerTipParts, marbleDepth } from '../game/bridgeDepth';
import type { MarbleBody } from '../game/marble';
import {
  bridgeNeighbors,
  corridorLinks,
  gridStep,
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
  drawMarbleCanvas,
  ThemedGoalSvg,
  ThemedPlayerSvg,
  ThemedTargetSvg,
} from '../themes/art';
import type { MazeTheme } from '../themes/catalog';
import {
  GlowFilterSvg,
  ThemedCorridorTubeSvg,
  ThemedCurvedBridgeBaseSvg,
  ThemedCurvedBridgeOverlaySvg,
  type CurvedBridgeCorner,
  type SvgBounds,
} from '../themes/sceneSvg';
import { drawLiveTrailCanvas } from './canvasLayers';
import { useSvgFogCanvas } from './useSvgFogCanvas';
import { useViewBoxCanvas } from './viewBoxCanvas';

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
  marbleRef?: MutableRefObject<MarbleBody>;
  registerDraw?: (fn: (() => void) | null) => void;
  fogOfWar?: boolean;
  fullScreen?: boolean;
}

const CONTAINER_MAX_WIDTH: Record<AspectRatioId, string> = {
  square: 'max-w-[600px]',
  tablet: 'max-w-[820px]',
  widescreen: 'max-w-[1060px]',
};

const CELL_UNIT = 40;
const CURVED_MARBLE_RADIUS = 10.5;
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

interface TrailPart {
  from: Position;
  to: Position;
  d: string;
}

function extendCurvedFromCenter(
  maze: Maze,
  cur: Position,
  mp: { x: number; y: number },
): TrailPart | null {
  const relX = mp.x - (cur.col + 0.5);
  const relY = mp.y - (cur.row + 0.5);
  const horizontal = Math.abs(relX) >= Math.abs(relY);
  const rel = horizontal ? relX : relY;
  if (Math.abs(rel) <= 0.02) return null;
  const dir = horizontal
    ? rel > 0
      ? 'right'
      : 'left'
    : rel > 0
      ? 'bottom'
      : 'top';
  const next = gridStep(maze, cur, dir);
  if (!next) return null;
  const d = curvedSubSegment(cur, next, Math.abs(rel));
  return d ? { from: cur, to: next, d } : null;
}

/** Live trail tip as segments: the last trail segment up to the marble, then the start of the next one. */
function curvedLiveTipParts(
  maze: Maze,
  points: Position[],
  mp: { x: number; y: number },
): TrailPart[] {
  if (points.length === 0) return [];
  const cur = points[points.length - 1];
  if (points.length === 1) {
    const ext = extendCurvedFromCenter(maze, cur, mp);
    return ext ? [ext] : [];
  }
  const prev = points[points.length - 2];
  const dx = cur.col - prev.col;
  const dy = cur.row - prev.row;
  const proj = Math.max(
    0,
    Math.min(
      1,
      (mp.x - (prev.col + 0.5)) * dx + (mp.y - (prev.row + 0.5)) * dy,
    ),
  );
  const parts: TrailPart[] = [];
  const tipSeg = curvedSubSegment(prev, cur, proj);
  if (tipSeg) parts.push({ from: prev, to: cur, d: tipSeg });
  if (proj >= 0.999) {
    const ext = extendCurvedFromCenter(maze, cur, mp);
    if (ext) parts.push(ext);
  }
  return parts;
}

interface LayeredTrail {
  lowerD: string;
  upperD: string;
  upperCutouts: Array<{ x: number; y: number }>;
}

function runsD(runs: Position[][]): string {
  return runs
    .flatMap((run) => run.slice(1).map((to, i) => curvedSegment(run[i], to)))
    .join(' ');
}

function layeredTrail(points: Position[], endIdx: number): LayeredTrail {
  const path = layerPath(points, endIdx);
  return {
    lowerD: runsD(path.lower),
    upperD: runsD(path.upper),
    upperCutouts: path.upperCutouts.map(nodeCenter),
  };
}

function cutoutClipD(
  width: number,
  height: number,
  cutouts: Array<{ x: number; y: number }>,
  r: number,
): string {
  return [
    `M 0 0 H ${width} V ${height} H 0 Z`,
    ...cutouts.map(
      (c) =>
        `M ${(c.x - r).toFixed(2)} ${c.y.toFixed(2)} a ${r} ${r} 0 1 0 ${(r * 2).toFixed(2)} 0 a ${r} ${r} 0 1 0 ${(-r * 2).toFixed(2)} 0 Z`,
    ),
  ].join(' ');
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
  marbleRef,
  registerDraw,
  fogOfWar = false,
  fullScreen = false,
}: CurvedMazeProps) {
  const viewWidth = maze.cols * CELL_UNIT + PADDING * 2;
  const viewHeight = maze.rows * CELL_UNIT + PADDING * 2;

  const corridorMaskBounds = useMemo<SvgBounds>(
    () => ({
      x: -24,
      y: -24,
      width: viewWidth + 48,
      height: viewHeight + 48,
    }),
    [viewWidth, viewHeight],
  );

  const corridorPathD = useMemo(
    () => corridorLinks(maze).map(([a, b]) => curvedSegment(a, b)).join(' '),
    [maze],
  );

  const bridgeItems = useMemo(() => {
    const maskPad = CELL_UNIT * 1.05;
    return maze.grid
      .flat()
      .filter((cell) => cell.bridge)
      .map((cell) => {
        const { deck, corners } = bridgeGeometry(cell);
        return {
          cell,
          key: positionKey(cell),
          deck,
          corners,
          maskBounds: {
            x: PADDING + cell.col * CELL_UNIT - maskPad,
            y: PADDING + cell.row * CELL_UNIT - maskPad,
            width: CELL_UNIT + maskPad * 2,
            height: CELL_UNIT + maskPad * 2,
          },
        };
      });
  }, [maze]);

  const trailWidth = CELL_UNIT * 0.2;
  const committedTrail = useMemo(
    () => layeredTrail(trail, marbleMode ? trail.length - 2 : trail.length - 1),
    [trail, marbleMode],
  );
  const committedHint = useMemo(
    () => layeredTrail(hintPath, hintPath.length - 1),
    [hintPath],
  );

  const startPos = useMemo(() => nodeCenter(maze.start), [maze.start]);
  const endPos = useMemo(() => nodeCenter(maze.end), [maze.end]);

  const marbleBody = marbleMode && marbleRef ? marbleRef.current : null;
  const initialPos = marbleBody
    ? curvedPointFromGrid(marbleBody.x, marbleBody.y, maze.rows, maze.cols)
    : nodeCenter(player);
  const playerDepth = marbleDepth(maze, {
    x: player.col + 0.5,
    y: player.row + 0.5,
    row: player.row,
    col: player.col,
    level: player.level,
  });

  const showOverlay = marbleMode && Boolean(marbleRef);
  const viewBox = { x: 0, y: 0, width: viewWidth, height: viewHeight };
  const trailOpacity = theme.isLight ? 0.85 : 0.8;

  const fog = useSvgFogCanvas(
    fogOfWar
      ? {
          viewBox,
          cellUnit: CELL_UNIT,
          theme,
          explored,
          cellOf: (key) => {
            const [row, col] = key.split(',').map(Number);
            return { id: `${row},${col}`, ...nodeCenter({ row, col }) };
          },
          boardToken: maze,
          active: initialPos,
        }
      : null,
  );

  const updateLiveDomRef = useRef<() => void>(() => {});
  const ghostScratchRef = useRef<HTMLCanvasElement | null>(null);
  const redrawLive = () => updateLiveDomRef.current();
  const lowerLive = useViewBoxCanvas(viewBox, showOverlay, redrawLive);
  const upperLive = useViewBoxCanvas(viewBox, showOverlay, redrawLive);
  updateLiveDomRef.current = () => {
    if (!marbleMode || !marbleRef) return;
    const body = marbleRef.current;
    const pt = curvedPointFromGrid(body.x, body.y, maze.rows, maze.cols);
    if (fogOfWar) fog.draw(pt);

    const lower = lowerLive.begin();
    const upper = upperLive.begin();
    if (!lower || !upper) return;
    lower.useViewBoxUnits();
    upper.useViewBoxUnits();
    const layers = { lower: lower.ctx, upper: upper.ctx };

    const tip = layerTipParts(trail, curvedLiveTipParts(maze, trail, body));
    for (const layer of ['lower', 'upper'] as const) {
      drawLiveTrailCanvas(
        layers[layer],
        [
          layer === 'upper' ? committedTrail.upperD : committedTrail.lowerD,
          ...tip[layer].parts.map((part) => part.d),
        ].join(' '),
        {
          color: theme.pencilLine,
          width: trailWidth,
          alpha: trailOpacity,
          cutouts: [
            ...(layer === 'upper' ? committedTrail.upperCutouts : []),
            ...tip[layer].cutouts.map(nodeCenter),
          ],
          bounds: viewBox,
        },
      );
    }

    const depth = marbleDepth(maze, body);
    const marbleOptions = {
      elevated: body.level === 'over',
      u: body.u,
      v: body.v,
      squash: body.squash,
      squashAxis: body.squashAxis,
    };
    drawMarbleCanvas(
      layers[depth.layer],
      pt.x,
      pt.y,
      CURVED_MARBLE_RADIUS,
      theme,
      marbleOptions,
    );
    if (depth.ghost) {
      const deck = bridgeItems.find((item) => item.cell === depth.ghost!.cell)?.deck;
      const target = upper.ctx;
      const scratch = (ghostScratchRef.current ??= document.createElement('canvas'));
      if (deck) {
        scratch.width = target.canvas.width;
        scratch.height = target.canvas.height;
        const sctx = scratch.getContext('2d');
        if (sctx) {
          sctx.setTransform(target.getTransform());
          drawMarbleCanvas(sctx, pt.x, pt.y, CURVED_MARBLE_RADIUS, theme, {
            ...marbleOptions,
            under: true,
            alpha: depth.ghost.alpha,
          });
          sctx.globalCompositeOperation = 'destination-in';
          sctx.lineWidth = CELL_UNIT * 0.56;
          sctx.lineCap = 'butt';
          sctx.strokeStyle = '#000';
          sctx.stroke(new Path2D(deck));
          target.save();
          target.setTransform(1, 0, 0, 1, 0, 0);
          target.drawImage(scratch, 0, 0);
          target.restore();
        }
      }
    }
  };

  useEffect(() => {
    if (!registerDraw) return;
    const draw = () => updateLiveDomRef.current();
    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw]);

  // Redraw the live layers after every render (new step, theme, restart).
  useEffect(() => updateLiveDomRef.current());

  const playerMarker = (
    <ThemedPlayerSvg x={initialPos.x} y={initialPos.y} r={10.5} theme={theme} />
  );
  const glowedPlayer = (filterId: string) => (
    <g filter={theme.isLight ? undefined : `url(#${filterId})`}>{playerMarker}</g>
  );

  const trailStroke = (d: string, clipId?: string) =>
    d && (
      <path
        d={d}
        fill="none"
        stroke={theme.pencilLine}
        strokeWidth={trailWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={trailOpacity}
        clipPath={clipId ? `url(#${clipId})` : undefined}
      />
    );
  const hintStroke = (d: string, clipId?: string) =>
    d && (
      <path
        d={d}
        fill="none"
        stroke={theme.hintStroke}
        strokeWidth={CELL_UNIT * 0.14}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 8"
        opacity="0.9"
        clipPath={clipId ? `url(#${clipId})` : undefined}
      />
    );

  const bridgeRails = (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {bridgeItems.map((item) => (
                <ThemedCurvedBridgeOverlaySvg
                  key={item.key}
                  deck={item.deck}
                  corners={item.corners}
                  cellUnit={CELL_UNIT}
                  theme={theme}
                  glowFilterId={showOverlay ? 'curved-rail-glow' : 'curved-bridge-glow'}
                  maskBounds={item.maskBounds}
                />
              ))}
            </g>
  );

  return (
    <div
      style={fullScreen ? undefined : { aspectRatio: `${maze.cols} / ${maze.rows}` }}
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
          : `flex max-h-[68vh] w-full ${CONTAINER_MAX_WIDTH[aspectRatioId]} items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
      }
    >
      <div className="relative h-full w-full">
        {/* Board: corridors, ground and underpass trail, markers */}
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full rounded-xl"
          role="img"
          aria-label="Křivkové bludiště"
        >
          <defs>
            <GlowFilterSvg id="curved-glow" />
          </defs>

          <ThemedCorridorTubeSvg
            d={corridorPathD}
            outerWidth={CELL_UNIT * 0.72}
            innerWidth={CELL_UNIT * 0.54}
            theme={theme}
            glowFilterId="curved-glow"
            maskBounds={corridorMaskBounds}
          />

          {!showOverlay && trailStroke(committedTrail.lowerD)}
          {hintStroke(committedHint.lowerD)}

          {gameMode === 'collect' ? (
            <g stroke={theme.startCross} strokeWidth="3.5" strokeLinecap="round">
              <line
                x1={startPos.x - 6}
                y1={startPos.y - 6}
                x2={startPos.x + 6}
                y2={startPos.y + 6}
              />
              <line
                x1={startPos.x + 6}
                y1={startPos.y - 6}
                x2={startPos.x - 6}
                y2={startPos.y + 6}
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
                  r={7.5}
                  theme={theme}
                  collected={isCollected}
                  glowFilter={theme.isLight ? undefined : 'url(#curved-glow)'}
                />
              );
            })
          )}

          {!showOverlay && playerDepth.layer === 'lower' && glowedPlayer('curved-glow')}
        </svg>

        {showOverlay && (
          <canvas
            ref={lowerLive.canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
          />
        )}

        {/* Bridges: decks, bridge-top trail and hint, rails */}
        {bridgeItems.length > 0 && (
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <GlowFilterSvg id="curved-bridge-glow" />
              <clipPath id="curved-trail-top-clip">
                <path
                  d={cutoutClipD(
                    viewWidth,
                    viewHeight,
                    committedTrail.upperCutouts,
                    trailWidth / 2,
                  )}
                  clipRule="evenodd"
                />
              </clipPath>
              <clipPath id="curved-hint-top-clip">
                <path
                  d={cutoutClipD(
                    viewWidth,
                    viewHeight,
                    committedHint.upperCutouts,
                    CELL_UNIT * 0.07,
                  )}
                  clipRule="evenodd"
                />
              </clipPath>
            </defs>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {bridgeItems.map((item) => (
                <ThemedCurvedBridgeBaseSvg
                  key={item.key}
                  deck={item.deck}
                  cellUnit={CELL_UNIT}
                  theme={theme}
                />
              ))}
            </g>
            {!showOverlay && trailStroke(committedTrail.upperD, 'curved-trail-top-clip')}
            {hintStroke(committedHint.upperD, 'curved-hint-top-clip')}
            {!showOverlay &&
              playerDepth.layer === 'upper' &&
              glowedPlayer('curved-bridge-glow')}
            {!showOverlay && playerDepth.ghost && (
              <g opacity={playerDepth.ghost.alpha}>{playerMarker}</g>
            )}
            {!showOverlay && bridgeRails}
          </svg>
        )}

        {showOverlay && (
          <canvas
            ref={upperLive.canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
          />
        )}

        {showOverlay && bridgeItems.length > 0 && (
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <GlowFilterSvg id="curved-rail-glow" />
            </defs>
            {bridgeRails}
          </svg>
        )}

        {fogOfWar && (
          <canvas
            ref={fog.canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
