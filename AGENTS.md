# AGENTS.md

Guidelines for working on `maze-web` (React 19, TypeScript, Tailwind CSS v4, Vite single-file bundle, Vitest).

## Commands

- `npm run dev` — local Vite dev server
- `npm test` — run Vitest unit tests (`vitest run`)
- `npm run build` — typecheck (`tsc -b`) and build single-file bundle to `dist/index.html`
- **Publishing to GitHub Pages**: always copy the latest `dist/index.html` (after `npm run build`) to `docs/index.html` before committing and pushing.

Run `npm test` and `npm run build` before finishing changes to application code, tests, dependencies, or build configuration. Skip both for documentation-only changes, including plans and other Markdown files, unless they also change build or test inputs. Do not regenerate `docs/index.html` for documentation-only changes.

## Architecture & Folder Boundaries

- `src/maze/` — pure maze generation, geometry, and solving (`grid.ts`, `polar.ts`, `solver.ts`, `types.ts`). No React or DOM imports.
- `src/game/` — pure game state & reducer (`model.ts`, `reduce.ts`, `geometry.ts`, `marble.ts`, `storage.ts`, `styles.ts`) plus browser/React hooks (`useGame.ts`, `input.ts`, `tilt.ts`, `fullscreen.ts`).
- `src/renderers/` — board renderers (`MazeStage.tsx`, `RectMaze.tsx`, `CurvedMaze.tsx`, `CircularMaze.tsx`, `PrintableMaze.tsx`).
- `src/themes/` — visual theme definitions (`catalog.ts`), character/goal/marble art (`art.tsx`), full-page backdrop (`backdrop.tsx`), and themed Canvas/SVG wall & bridge rendering (`sceneCanvas.ts`, `sceneSvg.tsx`).
- `src/ui/` — UI chrome (`Header.tsx`, `SettingsPanel.tsx`, `StatsRow.tsx`, `FocusToolbar.tsx`, `WinOverlay.tsx`, `controls.tsx`, `formatTime.ts`).
- `src/audio/` — Web Audio synthesized sound effects (`sound.ts`).
- `src/i18n.ts` — all CZ/EN translations (`Language = 'cs' | 'en'`, Czech default).

## Single Source of Truth & Reusing Resources

- **Translations (`src/i18n.ts`)**: All user-facing strings (titles, labels, tooltips, aria-labels, theme stories, win text, print headers) belong in `src/i18n.ts` for both `cs` and `en`. Never hardcode user-facing copy in components or duplicate it in `src/themes/catalog.ts`.
- **Theme tokens & shared constants (`src/themes/catalog.ts`)**: Colors, UI classes, marble palettes, scene styles, and shared rendering constants (such as `CORRIDOR_FLOOR_OPACITY`) live in `src/themes/catalog.ts` and must be reused across all renderers rather than duplicated as magic numbers.
- **Cross-renderer consistency**: Visual features (corridor floor opacity, trail visibility, bridge layering/rails/posts, wall symmetry, fog of war, marble mode) should look and behave consistently across `RectMaze`, `CurvedMaze`, and `CircularMaze`.
  - All maze boards are transparent over `<PageBackdrop />` — do not render opaque full-board backdrops inside individual renderers.
  - In `CurvedMaze`, hollow tubes and bridge rails use SVG `<mask maskUnits="userSpaceOnUse">` so the backdrop shines through and glows/shadows are symmetric (0 → 100 → 0) rather than clipped on the inner edge.

## Settings & Persistence

- Every setting must be declared in `Settings`, `DEFAULT_SETTINGS`, and `SETTING_EFFECT` (`src/game/model.ts`), and validated with a per-field fallback in `src/game/storage.ts`.
- Keep `src/game/reduce.ts` pure and deterministic; side effects (audio, `localStorage`, timers) belong in `src/game/useGame.ts`.

## Testing & Repo Hygiene

- Colocate unit tests next to the modules they test (`*.test.ts`). Keep pure logic decoupled from React/DOM so tests stay fast.
- Do not commit `sketch/` or `dist/` (both are gitignored).
- Remove dead code when refactoring rather than leaving unused components or duplicated fields behind.
