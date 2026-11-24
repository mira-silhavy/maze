import { useMemo } from 'react';
import {
  hasPolarPassage,
  polarCellId,
  type PolarCell,
  type PolarMaze,
} from '../maze/polar';
import type { MazeTheme } from '../maze/themes';
import type { GameMode } from '../maze/types';

import {
  MarbleSvg,
  ThemedGoalSvg,
  ThemedPlayerSvg,
  ThemedTargetSvg,
} from './themeArt';

interface CircularMazeSvgProps {
  maze: PolarMaze;
  playerId: string;
  visited: Set<string>;
  trail: string[];
  hintPath: string[];
  gameMode: GameMode;
  targets: string[];
  collected: Set<string>;
  theme: MazeTheme;
  marbleMode?: boolean;
  fullScreen?: boolean;
}

const RING_STEP = 36;
const MARGIN = 24;

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

export function CircularMazeSvg({
  maze,
  playerId,
  visited,
  trail,
  hintPath,
  gameMode,
  targets,
  collected,
  theme,
  marbleMode = false,
  fullScreen = false,
}: CircularMazeSvgProps) {
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
        const isClassicExit = gameMode === 'classic' && cell.id === maze.endId;
        if (!isClassicExit) {
          paths.push(
            arcPath(cell.rOuter * RING_STEP, cell.angleStart, cell.angleEnd),
          );
        }
      }
    }

    return paths.join(' ');
  }, [maze, gameMode]);

  const pencilPathD = useMemo(() => {
    if (trail.length < 2) return '';
    return trail
      .map((id, idx) => {
        const cell = maze.cells.get(id)!;
        const x = (cell.x * RING_STEP).toFixed(2);
        const y = (cell.y * RING_STEP).toFixed(2);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [trail, maze]);

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
  const endCell = maze.cells.get(maze.endId)!;
  const wallStroke = Math.max(2.2, Math.min(4, RING_STEP * 0.095));

  return (
    <div
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
          : `flex aspect-square max-h-[68vh] w-full max-w-[620px] items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
      }
    >
      <svg
        viewBox={viewBox}
        style={{ backgroundColor: theme.background }}
        className="h-full w-full rounded-xl"
        role="img"
        aria-label="Kruhové bludiště"
      >
        <defs>
          <filter id="polar-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Circular floor */}
        <circle cx="0" cy="0" r={maxRadius} fill={theme.corridorFloor} />

        {/* Visited cells */}
        {maze.cellList.map((cell) =>
          visited.has(cell.id) ? (
            <path
              key={`v-${cell.id}`}
              d={sectorWedgePath(cell)}
              fill={theme.visitedFill}
            />
          ) : null,
        )}

        {/* Continuous pencil line */}
        {pencilPathD && (
          <path
            d={pencilPathD}
            fill="none"
            stroke={theme.pencilLine}
            strokeWidth="6.5"
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
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
            opacity="0.9"
          />
        )}

        {/* Start marker at center */}
        {gameMode === 'collect' ? (
          <g stroke={theme.startCross} strokeWidth="4.5" strokeLinecap="round">
            <line x1="-8" y1="-8" x2="8" y2="8" />
            <line x1="8" y1="-8" x2="-8" y2="8" />
          </g>
        ) : (
          <circle cx="0" cy="0" r="8" fill={theme.startHighlight} />
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
        <path
          d={wallsPathD}
          fill="none"
          stroke={theme.wall}
          strokeWidth={wallStroke}
          strokeLinecap="round"
        />

        {/* Player */}
        <g
          filter={theme.isLight ? undefined : 'url(#polar-glow)'}
          style={{ transition: 'transform 110ms ease-out' }}
        >
          {marbleMode ? (
            <MarbleSvg
              x={playerCell.x * RING_STEP}
              y={playerCell.y * RING_STEP}
              r={9.5}
              theme={theme}
              idPrefix="polar"
            />
          ) : (
            <ThemedPlayerSvg
              x={playerCell.x * RING_STEP}
              y={playerCell.y * RING_STEP}
              r={9.5}
              theme={theme}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
