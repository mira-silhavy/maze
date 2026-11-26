import { memo, useId } from 'react';
import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from './catalog';

export interface SvgBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ThemedWallPathSvg = memo(function ThemedWallPathSvg({
  d,
  wallWidth,
  theme,
  glowFilterId,
}: {
  d: string;
  wallWidth: number;
  theme: MazeTheme;
  glowFilterId?: string;
}) {
  const { scene } = theme;
  if (scene.wallStyle === 'plasma') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          stroke={scene.wallGlow ?? 'rgba(96, 165, 250, 0.45)'}
          strokeWidth={wallWidth * 2}
          filter={glowFilterId ? `url(#${glowFilterId})` : undefined}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#e0f2fe'}
          strokeWidth={wallWidth * 0.36}
        />
      </g>
    );
  }

  if (scene.wallStyle === 'doubleRail') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={wallWidth * 1.4}
        />
        <path
          d={d}
          stroke={scene.wallInner ?? '#041226'}
          strokeWidth={wallWidth * 0.58}
        />
      </g>
    );
  }

  if (scene.wallStyle === 'hedgerow') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.5 2.2)"
          stroke="rgba(2, 18, 9, 0.72)"
          strokeWidth={wallWidth * 2.15}
        />
        <path
          d={d}
          stroke={scene.wallGlow ?? '#14532d'}
          strokeWidth={wallWidth * 1.85}
        />
        <path d={d} stroke="#16a34a" strokeWidth={wallWidth * 1.15} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#4ade80'}
          strokeWidth={wallWidth * 0.65}
          strokeDasharray="1.5 9"
        />
      </g>
    );
  }

  if (scene.wallStyle === 'inked') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.4 1.4)"
          stroke={scene.wallGlow ?? 'rgba(120, 53, 15, 0.20)'}
          strokeWidth={wallWidth * 1.45}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
      </g>
    );
  }

  if (scene.wallStyle === 'fountain') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={d}
          transform="translate(1.4 1.6)"
          stroke={scene.wallGlow ?? 'rgba(15, 23, 42, 0.14)'}
          strokeWidth={wallWidth * 1.22}
        />
        <path d={d} stroke={theme.wall} strokeWidth={wallWidth} />
      </g>
    );
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={theme.wall}
      strokeWidth={wallWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});

export const ThemedCorridorTubeSvg = memo(function ThemedCorridorTubeSvg({
  d,
  outerWidth,
  innerWidth,
  theme,
  glowFilterId,
  maskBounds,
}: {
  d: string;
  outerWidth: number;
  innerWidth: number;
  theme: MazeTheme;
  glowFilterId?: string;
  maskBounds: SvgBounds;
}) {
  const { scene } = theme;
  const maskId = `corridor-hollow-${useId().replace(/:/g, '')}`;
  const midWidth = (outerWidth + innerWidth) / 2;
  const wallThickness = (outerWidth - innerWidth) / 2;

  let backdropEffect = null;
  let wallLayers;

  if (scene.wallStyle === 'plasma') {
    const coreBand = wallThickness * 0.36;
    backdropEffect = (
      <g filter={glowFilterId ? `url(#${glowFilterId})` : undefined}>
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(96, 165, 250, 0.45)'}
            strokeWidth={outerWidth + 4}
          />
        </g>
      </g>
    );
    wallLayers = (
      <>
        <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#e0f2fe'}
          strokeWidth={midWidth + coreBand}
        />
        <path d={d} stroke={theme.wall} strokeWidth={midWidth - coreBand} />
      </>
    );
  } else if (scene.wallStyle === 'doubleRail') {
    const railOuter = outerWidth + 1.2;
    const railMid = (railOuter + innerWidth) / 2;
    const grooveBand = ((railOuter - innerWidth) / 2) * 0.42;
    wallLayers = (
      <>
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={railOuter}
        />
        <path
          d={d}
          stroke={scene.wallInner ?? '#041226'}
          strokeWidth={railMid + grooveBand}
        />
        <path
          d={d}
          stroke={theme.wall}
          strokeOpacity="0.9"
          strokeWidth={railMid - grooveBand}
        />
      </>
    );
  } else if (scene.wallStyle === 'hedgerow') {
    const hedgeOuter = outerWidth + 2;
    const hedgeMid = (hedgeOuter + innerWidth) / 2;
    const hedgeThick = (hedgeOuter - innerWidth) / 2;
    const midBand = hedgeThick * 0.62;
    const coreBand = hedgeThick * 0.34;
    const darkEdge = scene.wallGlow ?? '#14532d';
    backdropEffect = (
      <g transform="translate(1.5 2.2)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke="rgba(2, 18, 9, 0.68)"
            strokeWidth={hedgeOuter + 1.5}
          />
        </g>
      </g>
    );
    wallLayers = (
      <>
        <path d={d} stroke={darkEdge} strokeWidth={hedgeOuter} />
        <path d={d} stroke="#16a34a" strokeWidth={hedgeMid + midBand} />
        <path
          d={d}
          stroke={scene.wallCore ?? '#4ade80'}
          strokeOpacity="0.6"
          strokeWidth={hedgeMid + coreBand}
          strokeDasharray="2 10"
        />
        <path d={d} stroke="#16a34a" strokeWidth={hedgeMid - coreBand} />
        <path d={d} stroke={darkEdge} strokeWidth={hedgeMid - midBand} />
      </>
    );
  } else if (scene.wallStyle === 'inked') {
    backdropEffect = (
      <g transform="translate(1.5 1.5)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(120, 53, 15, 0.22)'}
            strokeWidth={outerWidth + 1.5}
          />
        </g>
      </g>
    );
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  } else if (scene.wallStyle === 'fountain') {
    backdropEffect = (
      <g transform="translate(1.4 1.6)">
        <g mask={`url(#${maskId})`}>
          <path
            d={d}
            stroke={scene.wallGlow ?? 'rgba(15, 23, 42, 0.14)'}
            strokeWidth={outerWidth + 1.2}
          />
        </g>
      </g>
    );
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  } else {
    wallLayers = <path d={d} stroke={theme.wall} strokeWidth={outerWidth} />;
  }

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={maskBounds.x}
          y={maskBounds.y}
          width={maskBounds.width}
          height={maskBounds.height}
        >
          <rect
            x={maskBounds.x}
            y={maskBounds.y}
            width={maskBounds.width}
            height={maskBounds.height}
            fill="white"
          />
          <path d={d} stroke="black" strokeWidth={innerWidth} />
        </mask>
      </defs>
      <path
        d={d}
        stroke={theme.corridorFloor}
        strokeOpacity={CORRIDOR_FLOOR_OPACITY}
        strokeWidth={innerWidth}
      />
      {backdropEffect}
      <g mask={`url(#${maskId})`}>{wallLayers}</g>
    </g>
  );
});

export interface CurvedBridgeCorner {
  x: number;
  y: number;
  angleDeg: number;
  side: 1 | -1;
}

export const ThemedCurvedBridgeBaseSvg = memo(function ThemedCurvedBridgeBaseSvg({
  deck,
  cellUnit,
  theme,
}: {
  deck: string;
  cellUnit: number;
  theme: MazeTheme;
}) {
  const { scene } = theme;
  const deckW = cellUnit * 0.56;
  const shadowColor = theme.isLight
    ? 'rgba(0, 0, 0, 0.22)'
    : 'rgba(0, 0, 0, 0.68)';

  let deckLayers;
  if (scene.bridgeStyle === 'hardlight') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke="#38bdf8"
          strokeOpacity="0.28"
          strokeWidth={deckW}
        />
        <path
          d={deck}
          stroke="#818cf8"
          strokeOpacity="0.16"
          strokeWidth={deckW * 0.55}
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.86}
          strokeDasharray="2 7"
          strokeDashoffset="2"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'holodeck') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.9}
          strokeDasharray="1.5 4.8"
        />
        <path
          d={deck}
          stroke="rgba(103, 232, 249, 0.5)"
          strokeWidth={cellUnit * 0.04}
          strokeDasharray="4 4"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'timber') {
    const plankW = deckW * 0.92;
    deckLayers = (
      <>
        <path d={deck} stroke="#3b1d0a" strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeDeck}
          strokeWidth={plankW}
          strokeDasharray="5.5 8.5"
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={plankW}
          strokeDasharray="5.5 8.5"
          strokeDashoffset="7"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'gangplank') {
    const plankW = deckW * 0.92;
    deckLayers = (
      <>
        <path d={deck} stroke="#6b3410" strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeDeck}
          strokeWidth={plankW}
          strokeDasharray="6 10"
        />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={plankW}
          strokeDasharray="6 10"
          strokeDashoffset="8"
        />
      </>
    );
  } else if (scene.bridgeStyle === 'folded') {
    deckLayers = (
      <>
        <path d={deck} stroke={scene.bridgeDeck} strokeWidth={deckW} />
        <path
          d={deck}
          stroke={scene.bridgeAccent}
          strokeWidth={deckW * 0.9}
          strokeDasharray="1.4 4.6"
        />
      </>
    );
  } else {
    deckLayers = (
      <path d={deck} stroke={theme.corridorFloor} strokeWidth={deckW} />
    );
  }

  return (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <path d={deck} stroke={shadowColor} strokeWidth={deckW + 11} />
      {deckLayers}
    </g>
  );
});

export const ThemedCurvedBridgeOverlaySvg = memo(
  function ThemedCurvedBridgeOverlaySvg({
    deck,
    corners,
    cellUnit,
    theme,
    glowFilterId,
    maskBounds,
  }: {
    deck: string;
    corners: ReadonlyArray<CurvedBridgeCorner>;
    cellUnit: number;
    theme: MazeTheme;
    glowFilterId?: string;
    maskBounds: SvgBounds;
  }) {
  const { scene } = theme;
  const maskId = `curved-bridge-rails-${useId().replace(/:/g, '')}`;
  const deckW = cellUnit * 0.56;
  const railOuter = cellUnit * 0.78;
  const railMid = (railOuter + deckW) / 2;
  const railThick = (railOuter - deckW) / 2;

  let railGlow = null;
  let railLayers;
  let cornerMarkers = null;

  if (scene.bridgeStyle === 'hardlight') {
    const rail = scene.bridgeRail ?? '#38bdf8';
    const core = scene.bridgeRailCore ?? '#e0f2fe';
    const coreBand = railThick * 0.38;
    railGlow = (
      <g filter={glowFilterId ? `url(#${glowFilterId})` : undefined}>
        <g mask={`url(#${maskId})`}>
          <path
            d={deck}
            stroke={rail}
            strokeOpacity="0.65"
            strokeWidth={railOuter + 4}
          />
        </g>
      </g>
    );
    railLayers = (
      <>
        <path d={deck} stroke={rail} strokeWidth={railOuter} />
        <path d={deck} stroke={core} strokeWidth={railMid + coreBand} />
        <path d={deck} stroke={rail} strokeWidth={railMid - coreBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.6} fill="#0f172a" />
        <circle cx={c.x} cy={c.y} r={2.0} fill="#7dd3fc" />
      </g>
    ));
  } else if (scene.bridgeStyle === 'holodeck') {
    const rail = scene.bridgeRail ?? '#22d3ee';
    const core = scene.bridgeRailCore ?? '#a5f3fc';
    railLayers = <path d={deck} stroke={rail} strokeWidth={railOuter} />;
    cornerMarkers = corners.map((c, idx) => (
      <line
        key={idx}
        x1={0}
        y1={0}
        x2={0}
        y2={-c.side * 5}
        transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.angleDeg.toFixed(1)})`}
        stroke={core}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ));
  } else if (scene.bridgeStyle === 'timber') {
    const timberOuter = cellUnit * 0.84;
    const timberMid = (timberOuter + deckW) / 2;
    const innerBand = ((timberOuter - deckW) / 2) * 0.52;
    railLayers = (
      <>
        <path d={deck} stroke="#2b1306" strokeWidth={timberOuter} />
        <path
          d={deck}
          stroke={scene.bridgeRail ?? '#a16207'}
          strokeWidth={timberMid + innerBand}
        />
        <path d={deck} stroke="#2b1306" strokeWidth={timberMid - innerBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.6} fill="#451a03" />
        <circle
          cx={c.x}
          cy={c.y}
          r={2.0}
          fill={scene.bridgeRailCore ?? '#fde047'}
        />
      </g>
    ));
  } else if (scene.bridgeStyle === 'gangplank') {
    const plankOuter = cellUnit * 0.82;
    const plankMid = (plankOuter + deckW) / 2;
    const innerBand = ((plankOuter - deckW) / 2) * 0.52;
    railLayers = (
      <>
        <path d={deck} stroke="#451a03" strokeWidth={plankOuter} />
        <path
          d={deck}
          stroke={scene.bridgeRail ?? '#92400e'}
          strokeWidth={plankMid + innerBand}
        />
        <path d={deck} stroke="#451a03" strokeWidth={plankMid - innerBand} />
      </>
    );
    cornerMarkers = corners.map((c, idx) => (
      <g key={idx}>
        <circle cx={c.x} cy={c.y} r={3.4} fill="#451a03" />
        <circle
          cx={c.x}
          cy={c.y}
          r={1.7}
          fill={scene.bridgeRailCore ?? '#fbbf24'}
        />
      </g>
    ));
  } else if (scene.bridgeStyle === 'folded') {
    const rail = scene.bridgeRail ?? theme.wall;
    railLayers = <path d={deck} stroke={rail} strokeWidth={railOuter} />;
    cornerMarkers = corners.map((c, idx) => (
      <rect
        key={idx}
        x={-2.2}
        y={-2.2}
        width={4.4}
        height={4.4}
        transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.angleDeg.toFixed(1)})`}
        fill={rail}
      />
    ));
  } else {
    railLayers = <path d={deck} stroke={theme.wall} strokeWidth={railOuter} />;
  }

  return (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={maskBounds.x}
          y={maskBounds.y}
          width={maskBounds.width}
          height={maskBounds.height}
        >
          <rect
            x={maskBounds.x}
            y={maskBounds.y}
            width={maskBounds.width}
            height={maskBounds.height}
            fill="white"
          />
          <path d={deck} stroke="black" strokeWidth={deckW} />
        </mask>
      </defs>
      {railGlow}
      <g mask={`url(#${maskId})`}>{railLayers}</g>
      {cornerMarkers}
    </g>
  );
});

/** Soft glow used by dark themes: blurred copy merged under the source graphic. */
export function GlowFilterSvg({ id }: { id: string }) {
  return (
    <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
