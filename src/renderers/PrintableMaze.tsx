import { memo, useMemo } from 'react';
import type { Board, Settings } from '../game/model';
import { getMessages } from '../i18n';
import {
  bridgeNeighbors,
  corridorLinks,
  positionKey,
} from '../maze/grid';
import { hasPolarPassage, polarCellId, type PolarMaze } from '../maze/polar';
import type { Cell, Maze, Position } from '../maze/types';

type PrintableBoard =
  | { kind: 'grid'; board: Board<Maze, Position> }
  | { kind: 'polar'; board: Board<PolarMaze, string> };

type PrintableMazeSvgProps = PrintableBoard & {
  style: Settings['style'];
  mode: Settings['mode'];
  language: Settings['language'];
};

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

export const PrintableMaze = memo(function PrintableMaze(
  props: PrintableMazeSvgProps,
) {
  const { style: mazeStyle, mode: gameMode, language } = props;
  const t = getMessages(language);
  const gridMaze = props.kind === 'grid' ? props.board.maze : null;
  const gridTargets = props.kind === 'grid' ? props.board.targets : [];
  const polarMaze = props.kind === 'polar' ? props.board.maze : null;
  const polarTargets = props.kind === 'polar' ? props.board.targets : [];

  const gridWallD = useMemo(() => {
    if (!gridMaze) return '';
    const parts: string[] = [];
    for (let r = 0; r < gridMaze.rows; r++) {
      for (let c = 0; c < gridMaze.cols; c++) {
        const cell = gridMaze.grid[r][c];
        if (cell.bridge) continue;
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
    if (!gridMaze) return '';
    return corridorLinks(gridMaze)
      .map(([a, b]) => curvedSegment(a, b))
      .join(' ');
  }, [gridMaze]);

  const bridges = useMemo(
    () => (gridMaze ? gridMaze.grid.flat().filter((cell) => cell.bridge) : []),
    [gridMaze],
  );

  const polarWallD = useMemo(() => {
    if (!polarMaze) return '';
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
        const isClassicEntry =
          gameMode === 'classic' && cell.id === polarMaze.startId;
        if (!isClassicEntry) {
          paths.push(
            arcPath(cell.rOuter * RING_STEP, cell.angleStart, cell.angleEnd),
          );
        }
      }
    }
    return paths.join(' ');
  }, [polarMaze, gameMode]);

  const targetCount = props.board.targets.length;
  const gridViewW = (gridMaze?.cols ?? 0) * CELL + PAD * 2;
  const gridViewH = (gridMaze?.rows ?? 0) * CELL + PAD * 2;
  const polarHalf = (polarMaze?.rings ?? 0) * RING_STEP + PAD;

  return (
    <div className="hidden print:flex print:h-[100vh] print:w-full print:flex-col print:items-center print:justify-between print:bg-white print:text-black">
      <div className="mb-3 shrink-0 text-center">
        <h1 className="text-2xl font-bold text-black">
          {gameMode === 'collect'
            ? t.printCollectTitle(targetCount)
            : t.printClassicTitle}
        </h1>
        <p className="mt-1 text-sm text-neutral-700">
          {gameMode === 'collect'
            ? t.printCollectSubtitle
            : t.printClassicSubtitle}
        </p>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {mazeStyle === 'classic' && gridMaze && (
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
            {bridges.map((cell) => (
              <GridBridge key={positionKey(cell)} cell={cell} />
            ))}
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

        {mazeStyle === 'curved' && gridMaze && (
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
            {bridges.map((cell) => (
              <CurvedBridge key={positionKey(cell)} cell={cell} />
            ))}
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

        {mazeStyle === 'circular' && polarMaze && (
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
                {(() => {
                  const startCell = polarMaze.cells.get(polarMaze.startId)!;
                  return (
                    <g
                      transform={`translate(${(startCell.x * RING_STEP).toFixed(2)} ${(startCell.y * RING_STEP).toFixed(2)})`}
                      stroke="#000000"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <line x1="-8" y1="-8" x2="8" y2="8" />
                      <line x1="8" y1="-8" x2="-8" y2="8" />
                    </g>
                  );
                })()}
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
                {(() => {
                  const startCell = polarMaze.cells.get(polarMaze.startId)!;
                  const endCell = polarMaze.cells.get(polarMaze.endId)!;
                  return (
                    <>
                      <text
                        x={startCell.x * RING_STEP}
                        y={startCell.y * RING_STEP + 6}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="700"
                        fill="#000000"
                      >
                        S
                      </text>
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
                    </>
                  );
                })()}
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
});

function bridgePaths(cell: Cell): { deck: string; planks: string } {
  const [from, to] = bridgeNeighbors(cell);
  const [, x1, y1, , cx, cy, x2, y2] = curvedSegment(from, cell).split(' ');
  const after = curvedSegment(cell, to);
  return {
    deck: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2} ${after}`,
    planks: `M ${x2} ${y2} Q ${cx} ${cy} ${x1} ${y1} ${after}`,
  };
}

function GridBridge({ cell }: { cell: Cell }) {
  const half = CELL / 2;
  const inset = CELL * 0.14;
  const planks = [1, 2, 3, 4].map((k) => -half + (k * CELL) / 5);
  return (
    <g
      transform={`translate(${PAD + (cell.col + 0.5) * CELL} ${PAD + (cell.row + 0.5) * CELL})${cell.bridge === 'vertical' ? ' rotate(90)' : ''}`}
      stroke="#000000"
      strokeLinecap="round"
    >
      <path
        d={planks
          .map((x) => `M ${x} ${-half + inset} L ${x} ${half - inset}`)
          .join(' ')}
        strokeWidth="1"
      />
      <path
        d={`M ${-half} ${-half + inset} L ${half} ${-half + inset} M ${-half} ${half - inset} L ${half} ${half - inset}`}
        strokeWidth="3.6"
      />
      <path
        d={[-half, half]
          .map(
            (x) =>
              `M ${x} ${-half} L ${x} ${-half + inset} M ${x} ${half - inset} L ${x} ${half}`,
          )
          .join(' ')}
        strokeWidth="2.4"
      />
    </g>
  );
}

function CurvedBridge({ cell }: { cell: Cell }) {
  const { deck, planks } = bridgePaths(cell);
  const id = `print-bridge-${cell.row}-${cell.col}`;
  return (
    <>
      <clipPath id={id}>
        <rect
          x={PAD + cell.col * CELL}
          y={PAD + cell.row * CELL}
          width={CELL}
          height={CELL}
        />
      </clipPath>
      <g clipPath={`url(#${id})`} fill="none" strokeLinejoin="round">
        <path d={deck} stroke="#000000" strokeWidth={CELL * 0.84} />
        <path d={deck} stroke="#ffffff" strokeWidth={CELL * 0.62} />
        <path
          d={planks}
          stroke="#000000"
          strokeWidth={CELL * 0.62}
          strokeDasharray="1.5 5"
          strokeDashoffset="4"
        />
      </g>
    </>
  );
}
