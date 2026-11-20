import { useMemo } from 'react';
import { positionKey } from '../maze/generator';
import {
  hasPolarPassage,
  polarCellId,
  type PolarMaze,
} from '../maze/polar';
import type { GameMode, Maze, MazeStyle, Position } from '../maze/types';

interface PrintableMazeSvgProps {
  mazeStyle: MazeStyle;
  gameMode: GameMode;
  gridMaze: Maze;
  polarMaze: PolarMaze;
  gridTargets: Position[];
  polarTargets: string[];
}

const CELL = 32;
const PAD = 20;
const RING_STEP = 34;

function curvedNodeCenter(pos: Position): { x: number; y: number } {
  const hash = Math.sin(pos.row * 12.9898 + pos.col * 78.233) * 43758.5453;
  const fracX = (hash - Math.floor(hash)) * 2 - 1;
  const hash2 = Math.sin(pos.row * 39.346 + pos.col * 11.135) * 24634.6345;
  const fracY = (hash2 - Math.floor(hash2)) * 2 - 1;
  const jitter = CELL * 0.14;
  return {
    x: PAD + (pos.col + 0.5) * CELL + fracX * jitter,
    y: PAD + (pos.row + 0.5) * CELL + fracY * jitter,
  };
}

function curvedSegment(a: Position, b: Position): string {
  const p1 = curvedNodeCenter(a);
  const p2 = curvedNodeCenter(b);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const sign = (a.row + a.col + b.row + b.col) % 2 === 0 ? 1 : -1;
  const bend = CELL * 0.14 * sign;
  const cx = midX + (-dy / len) * bend;
  const cy = midY + (dx / len) * bend;
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

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

export function PrintableMazeSvg({
  mazeStyle,
  gameMode,
  gridMaze,
  polarMaze,
  gridTargets,
  polarTargets,
}: PrintableMazeSvgProps) {
  const gridWallD = useMemo(() => {
    const parts: string[] = [];
    for (let r = 0; r < gridMaze.rows; r++) {
      for (let c = 0; c < gridMaze.cols; c++) {
        const cell = gridMaze.grid[r][c];
        const x = PAD + c * CELL;
        const y = PAD + r * CELL;
        if (cell.walls.top) parts.push(`M ${x} ${y} L ${x + CELL} ${y}`);
        if (cell.walls.right)
          parts.push(`M ${x + CELL} ${y} L ${x + CELL} ${y + CELL}`);
        if (cell.walls.bottom)
          parts.push(`M ${x} ${y + CELL} L ${x + CELL} ${y + CELL}`);
        if (cell.walls.left) parts.push(`M ${x} ${y} L ${x} ${y + CELL}`);
      }
    }
    return parts.join(' ');
  }, [gridMaze]);

  const curvedCorridorD = useMemo(() => {
    const segments: string[] = [];
    for (let r = 0; r < gridMaze.rows; r++) {
      for (let c = 0; c < gridMaze.cols; c++) {
        const cell = gridMaze.grid[r][c];
        if (!cell.walls.right && c + 1 < gridMaze.cols) {
          segments.push(curvedSegment({ row: r, col: c }, { row: r, col: c + 1 }));
        }
        if (!cell.walls.bottom && r + 1 < gridMaze.rows) {
          segments.push(curvedSegment({ row: r, col: c }, { row: r + 1, col: c }));
        }
      }
    }
    return segments.join(' ');
  }, [gridMaze]);

  const polarWallD = useMemo(() => {
    const paths: string[] = [];
    for (const cell of polarMaze.cellList) {
      if (cell.ring === 0) continue;
      const innerCount = polarMaze.ringCounts[cell.ring - 1];
      const ratio = cell.sectorCount / innerCount;
      const innerSector = Math.floor(cell.sector / ratio);
      const innerId = polarCellId(cell.ring - 1, innerSector);
      if (!hasPolarPassage(polarMaze, cell.id, innerId)) {
        paths.push(
          arcPath(cell.rInner * RING_STEP, cell.angleStart, cell.angleEnd),
        );
      }
      const cwId = polarCellId(cell.ring, (cell.sector + 1) % cell.sectorCount);
      if (!hasPolarPassage(polarMaze, cell.id, cwId)) {
        const pIn = polarToCartesian(cell.rInner * RING_STEP, cell.angleEnd);
        const pOut = polarToCartesian(cell.rOuter * RING_STEP, cell.angleEnd);
        paths.push(
          `M ${pIn.x.toFixed(2)} ${pIn.y.toFixed(2)} L ${pOut.x.toFixed(2)} ${pOut.y.toFixed(2)}`,
        );
      }
      if (cell.ring === polarMaze.rings - 1) {
        const isClassicExit =
          gameMode === 'classic' && cell.id === polarMaze.endId;
        if (!isClassicExit) {
          paths.push(
            arcPath(cell.rOuter * RING_STEP, cell.angleStart, cell.angleEnd),
          );
        }
      }
    }
    return paths.join(' ');
  }, [polarMaze, gameMode]);

  const targetCount =
    mazeStyle === 'circular' ? polarTargets.length : gridTargets.length;
  const gridViewW = gridMaze.cols * CELL + PAD * 2;
  const gridViewH = gridMaze.rows * CELL + PAD * 2;
  const polarHalf = polarMaze.rings * RING_STEP + PAD;

  return (
    <div className="hidden print:flex print:h-[100vh] print:w-full print:flex-col print:items-center print:justify-between print:bg-white print:text-black">
      <div className="mb-3 shrink-0 text-center">
        <h1 className="text-2xl font-bold text-black">
          {gameMode === 'collect'
            ? `Bludiště: Od křížku ✕ ke kolečkům ◯ (${targetCount} koleček)`
            : 'Bludiště: Start → Cíl'}
        </h1>
        <p className="mt-1 text-sm text-neutral-700">
          {gameMode === 'collect'
            ? 'Začni na křížku ✕ a tužkou posbírej všechna kolečka ◯ na koncích slepých uliček.'
            : 'Najdi tužkou cestu od startu (S) až do cíle (C).'}
        </p>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {mazeStyle === 'classic' && (
          <svg
            viewBox={`0 0 ${gridViewW} ${gridViewH}`}
            className="h-full max-h-full w-full max-w-full"
          >
            <path
              d={gridWallD}
              fill="none"
              stroke="#000000"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {gameMode === 'collect' ? (
              <>
                <g stroke="#000000" strokeWidth="3" strokeLinecap="round">
                  <line
                    x1={PAD + CELL * 0.25}
                    y1={PAD + CELL * 0.25}
                    x2={PAD + CELL * 0.75}
                    y2={PAD + CELL * 0.75}
                  />
                  <line
                    x1={PAD + CELL * 0.75}
                    y1={PAD + CELL * 0.25}
                    x2={PAD + CELL * 0.25}
                    y2={PAD + CELL * 0.75}
                  />
                </g>
                {gridTargets.map((t) => (
                  <circle
                    key={positionKey(t)}
                    cx={PAD + (t.col + 0.5) * CELL}
                    cy={PAD + (t.row + 0.5) * CELL}
                    r={CELL * 0.26}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2.8"
                  />
                ))}
              </>
            ) : (
              <>
                <text
                  x={PAD + CELL * 0.5}
                  y={PAD + CELL * 0.68}
                  textAnchor="middle"
                  fontSize={CELL * 0.55}
                  fontWeight="700"
                  fill="#000000"
                >
                  S
                </text>
                <text
                  x={PAD + (gridMaze.end.col + 0.5) * CELL}
                  y={PAD + (gridMaze.end.row + 0.68) * CELL}
                  textAnchor="middle"
                  fontSize={CELL * 0.55}
                  fontWeight="700"
                  fill="#000000"
                >
                  C
                </text>
              </>
            )}
          </svg>
        )}

        {mazeStyle === 'curved' && (
          <svg
            viewBox={`0 0 ${gridViewW} ${gridViewH}`}
            className="h-full max-h-full w-full max-w-full"
          >
            <path
              d={curvedCorridorD}
              fill="none"
              stroke="#000000"
              strokeWidth={CELL * 0.76}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={curvedCorridorD}
              fill="none"
              stroke="#ffffff"
              strokeWidth={CELL * 0.62}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {gameMode === 'collect' ? (
              <>
                {(() => {
                  const s = curvedNodeCenter(gridMaze.start);
                  return (
                    <g stroke="#000000" strokeWidth="3" strokeLinecap="round">
                      <line x1={s.x - 6} y1={s.y - 6} x2={s.x + 6} y2={s.y + 6} />
                      <line x1={s.x + 6} y1={s.y - 6} x2={s.x - 6} y2={s.y + 6} />
                    </g>
                  );
                })()}
                {gridTargets.map((t) => {
                  const pt = curvedNodeCenter(t);
                  return (
                    <circle
                      key={positionKey(t)}
                      cx={pt.x}
                      cy={pt.y}
                      r={CELL * 0.22}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2.8"
                    />
                  );
                })}
              </>
            ) : (
              <>
                {(() => {
                  const s = curvedNodeCenter(gridMaze.start);
                  const e = curvedNodeCenter(gridMaze.end);
                  return (
                    <>
                      <text
                        x={s.x}
                        y={s.y + 5}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="700"
                        fill="#000000"
                      >
                        S
                      </text>
                      <text
                        x={e.x}
                        y={e.y + 5}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="700"
                        fill="#000000"
                      >
                        C
                      </text>
                    </>
                  );
                })()}
              </>
            )}
          </svg>
        )}

        {mazeStyle === 'circular' && (
          <svg
            viewBox={`${-polarHalf} ${-polarHalf} ${polarHalf * 2} ${polarHalf * 2}`}
            className="h-full max-h-full w-full max-w-full"
          >
            <path
              d={polarWallD}
              fill="none"
              stroke="#000000"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {gameMode === 'collect' ? (
              <>
                <g stroke="#000000" strokeWidth="3.5" strokeLinecap="round">
                  <line x1="-8" y1="-8" x2="8" y2="8" />
                  <line x1="8" y1="-8" x2="-8" y2="8" />
                </g>
                {polarTargets.map((id) => {
                  const cell = polarMaze.cells.get(id);
                  if (!cell) return null;
                  return (
                    <circle
                      key={id}
                      cx={cell.x * RING_STEP}
                      cy={cell.y * RING_STEP}
                      r="8"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="3"
                    />
                  );
                })}
              </>
            ) : (
              <>
                <text
                  x="0"
                  y="6"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="#000000"
                >
                  S
                </text>
                {(() => {
                  const endCell = polarMaze.cells.get(polarMaze.endId)!;
                  return (
                    <text
                      x={endCell.x * RING_STEP}
                      y={endCell.y * RING_STEP + 6}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="700"
                      fill="#000000"
                    >
                      C
                    </text>
                  );
                })()}
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
