import { useMemo } from 'react';
import {
  bridgeNeighbors,
  corridorLinks,
  pathThrough,
  positionKey,
} from '../maze/generator';
import type { MazeTheme } from '../maze/themes';
import type {
  AspectRatioId,
  Cell,
  GameMode,
  Maze,
  Position,
} from '../maze/types';

interface CurvedMazeSvgProps {
  maze: Maze;
  player: Position;
  trail: Position[];
  hintPath: Position[];
  aspectRatioId: AspectRatioId;
  gameMode: GameMode;
  targets: Position[];
  collected: Set<string>;
  theme: MazeTheme;
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

function curvedSegment(a: Position, b: Position): string {
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

  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

function bridgePaths(cell: Cell): { deck: string; planks: string } {
  const [from, to] = bridgeNeighbors(cell);
  const [, x1, y1, , cx, cy, x2, y2] = curvedSegment(from, cell).split(' ');
  const after = curvedSegment(cell, to);
  return {
    deck: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2} ${after}`,
    planks: `M ${x2} ${y2} Q ${cx} ${cy} ${x1} ${y1} ${after}`,
  };
}

export function CurvedMazeSvg({
  maze,
  player,
  trail,
  hintPath,
  aspectRatioId,
  gameMode,
  targets,
  collected,
  theme,
  fullScreen = false,
}: CurvedMazeSvgProps) {
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

  const pencilPathD = useMemo(() => {
    if (trail.length < 2) return '';
    const segments: string[] = [];
    for (let i = 0; i < trail.length - 1; i++) {
      segments.push(curvedSegment(trail[i], trail[i + 1]));
    }
    return segments.join(' ');
  }, [trail]);

  const hintPathD = useMemo(() => {
    if (hintPath.length < 2) return '';
    const segments: string[] = [];
    for (let i = 0; i < hintPath.length - 1; i++) {
      segments.push(curvedSegment(hintPath[i], hintPath[i + 1]));
    }
    return segments.join(' ');
  }, [hintPath]);

  const startPos = nodeCenter(maze.start);
  const endPos = nodeCenter(maze.end);
  const playerPos = nodeCenter(player);
  const playerMarker = (
    <>
      <circle cx={playerPos.x} cy={playerPos.y} r="9.5" fill={theme.playerFill} />
      <circle cx={playerPos.x} cy={playerPos.y} r="4" fill={theme.playerCore} />
    </>
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
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
          : `flex max-h-[68vh] w-full ${CONTAINER_MAX_WIDTH[aspectRatioId]} items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
      }
    >
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{ backgroundColor: theme.background }}
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
          {bridges.map((cell) => (
            <clipPath
              key={positionKey(cell)}
              id={`curved-bridge-${cell.row}-${cell.col}`}
            >
              <rect
                x={PADDING + cell.col * CELL_UNIT}
                y={PADDING + cell.row * CELL_UNIT}
                width={CELL_UNIT}
                height={CELL_UNIT}
              />
            </clipPath>
          ))}
        </defs>

        {/* Corridor outer wall stroke */}
        <path
          d={corridorPathD}
          fill="none"
          stroke={theme.wall}
          strokeWidth={CELL_UNIT * 0.72}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Corridor inner floor */}
        <path
          d={corridorPathD}
          fill="none"
          stroke={theme.corridorFloor}
          strokeWidth={CELL_UNIT * 0.54}
          strokeLinecap="round"
          strokeLinejoin="round"
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
          const { deck, planks } = bridgePaths(cell);
          const isUnder =
            player.level === 'under' &&
            player.row === cell.row &&
            player.col === cell.col;
          return (
            <g
              key={positionKey(cell)}
              clipPath={`url(#curved-bridge-${cell.row}-${cell.col})`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={deck} stroke={theme.wall} strokeWidth={CELL_UNIT * 0.8} />
              <path
                d={deck}
                stroke={theme.corridorFloor}
                strokeWidth={CELL_UNIT * 0.54}
              />
              {pathThrough(trail, cell, 'over').map((part, i) => (
                <path
                  key={i}
                  d={pathD(part)}
                  stroke={theme.pencilLine}
                  strokeWidth={CELL_UNIT * 0.2}
                  opacity={theme.isLight ? 0.85 : 0.8}
                />
              ))}
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
              {isUnder && <g opacity="0.55">{playerMarker}</g>}
              <path
                d={planks}
                stroke={theme.wall}
                strokeOpacity="0.55"
                strokeWidth={CELL_UNIT * 0.54}
                strokeLinecap="butt"
                strokeDasharray="2 6"
                strokeDashoffset="5"
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
          <rect
            x={endPos.x - 9}
            y={endPos.y - 9}
            width="18"
            height="18"
            rx="5"
            fill={theme.goalFill}
            filter={theme.isLight ? undefined : 'url(#curved-glow)'}
          />
        ) : (
          targets.map((target) => {
            const key = positionKey(target);
            const isCollected = collected.has(key);
            const pt = nodeCenter(target);
            return isCollected ? (
              <circle
                key={key}
                cx={pt.x}
                cy={pt.y}
                r="7"
                fill="none"
                stroke={theme.targetCollected}
                strokeWidth="3"
              />
            ) : (
              <circle
                key={key}
                cx={pt.x}
                cy={pt.y}
                r="9.5"
                fill={theme.targetFill}
                stroke={theme.targetStroke}
                strokeWidth="4"
                filter={theme.isLight ? undefined : 'url(#curved-glow)'}
              />
            );
          })
        )}

        {/* Player */}
        {player.level !== 'under' && (
          <g filter={theme.isLight ? undefined : 'url(#curved-glow)'}>
            {playerMarker}
          </g>
        )}
      </svg>
    </div>
  );
}
