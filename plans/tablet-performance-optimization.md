# Tablet Performance Optimization Plan

Target: smooth 60 fps gameplay on tablets (iPad / Android), with 120 fps as a stretch goal on supported devices. Preserve behavior across all maze styles (`classic`, `curved`, `circular`), sizes (up to `huge` 39×39 / 13 rings), themes, bridges, Fog of War, and Marble Mode, without adding external rendering dependencies or bloating the single-file bundle. Capture a tablet baseline before Phase 1 and repeat it after each phase.

---

## Phase 1: Hot-Path Fixes, React Isolation & Physics

**Goal:** Eliminate per-step GPU canvas reallocations, software-fallback blur filters, 1 Hz full-app re-renders, and redundant polar collision checks.

1. **Remove `ctx.filter = 'blur(...)'` & hot-path `shadowBlur` (`src/themes/art.tsx`, `src/renderers/RectMaze.tsx`)**
   - Replace `ctx.filter = 'blur(...)'` in `drawMarbleCanvas` (drop shadow) with a radial gradient fill.
   - Replace `ctx.shadowBlur` on the dynamic trail stroke with a 2-pass stroke (wide low-alpha outer glow + crisp inner stroke).

2. **Fix `RectMaze` canvas lifecycle & duplicate `requestAnimationFrame` (`src/renderers/RectMaze.tsx`, `src/renderers/MazeStage.tsx`)**
   - Keep resize observation separate from draw inputs. Assign `canvas.width` and `canvas.height` only when the corresponding backing-store dimensions change, including on DPR changes.
   - Use one scheduler for continuous frames during active marble physics and one-shot redraws after committed visual changes or resize. Ordinary moves, stationary Hint toggles, and the final win frame must repaint even when physics is stopped.
   - Read committed visual inputs without restarting animation on cell transitions. On a crossing, keep the marble pose paired with the corresponding trail, target, and fog updates.

3. **Cap `devicePixelRatio` (`src/renderers/RectMaze.tsx`, `src/themes/backdrop.tsx`)**
   - A/B test caps of 2 for the game canvas and 1.5 for `PageBackdrop`. Keep each cap only if the improvement justifies any loss of sharpness, especially on thin walls.

4. **Isolate 1-second `tick` re-renders & memoize printing (`src/App.tsx`, `src/renderers/MazeStage.tsx`, `src/renderers/PrintableMaze.tsx`, `src/themes/backdrop.tsx`)**
   - Keep the reducer and clock semantics intact. Pass stable state slices and callbacks to memoized board and UI components, not the entire `GameState`. Route elapsed time to the clock and win overlay without passing it through the board renderer.
   - Keep `PrintableMaze` mounted under print CSS and memoize it by board data and print-relevant settings, not run state. Do not depend on a React commit during `beforeprint`.

5. **Optimize marble physics & gyro input (`src/game/marble.ts`, `src/game/tilt.ts`)**
   - In `stepPolarMarblePhysics`, use the marble angle and collision bounds to select nearby wall candidates per ring. Resolve them in original ascending ring and sector order, including at the seam, using the corrected position for each contact. Compare against the full scan before adopting a fixed `±2` sector window; widen the search or fall back to a full scan where the window cannot safely cover contacts.
   - In `stepMarblePhysics`, check squared distance (`dx * dx + dy * dy < r * r`) for the 4 cell corners without allocating a temporary `corners` array per substep.
   - In `useTiltInput`, guard `setHasGyro(true)` with a ref so `deviceorientation` does not invoke a React state setter at 60 Hz.

6. **Reduce compositor readbacks (`src/themes/catalog.ts`, `src/renderers/MazeStage.tsx`)**
   - Replace `backdrop-blur-md` on floating overlays (in focus/marble mode or on coarse-pointer devices) with higher-opacity translucent fills so the tablet compositor does not blur the live canvas every frame.

---

## Phase 2: Cached Canvas Passes & Fast Fog of War for `RectMaze`

**Goal:** Stop rebuilding static geometry and explored fog gradients each frame. Bitmap copies still scale with pixel count, and dynamic work still depends on what is visible.

1. **Shared Canvas layer helpers (`src/renderers/canvasLayers.ts`)**
   - **Static board cache (offscreen `<canvas>`):** Cache corridor floors, walls, bridge decks, and bridge rails in separate passes where dynamic content must draw between them. Key the passes by their inputs (maze, theme, and raster geometry, plus game mode for mode-dependent art). Cache markers only where doing so preserves their draw order.
   - **Incremental Fog of War:**
     - Within a run, stamp only newly explored physical cells with a reusable gradient brush; both levels of a rectangular bridge count as one cell. Clear and rebuild the bitmap on restart, retarget, new maze, fog-color changes, or raster geometry changes (including resize and DPR), even if `explored.size` is unchanged.
     - Apply the live flashlight to a scratch surface so it cannot modify explored history. Try half-resolution fog only if the result preserves the current appearance on the target tablet.

2. **Integrate into `src/renderers/RectMaze.tsx`**
   - Preserve the current draw and clipping order: draw lower-route trail and hint before the deck; draw clipped upper-route trail and hint above the deck but below the rails. Preserve player and marble occlusion in the underpass. Apply this ordering at every bridge crossed by the trail or hint, not just where the player is. Composite fog last.

---

## Phase 3: Optimize SVG First; Port to Canvas Only if Needed

**Goal:** Bring curved and circular play within the tablet's frame budget without changing renderer unless profiling justifies it.

1. **Split static SVG from moving elements (`src/renderers/CurvedMaze.tsx`, `src/renderers/CircularMaze.tsx`, `src/themes/sceneSvg.tsx`)**
   - Update only the marble and live trail tip between cell crossings. Memoize static artwork, trail history, and bridge crossings by their own inputs. Preserve the appearance of the join between the tip and trail history.
   - Tighten curved corridor and bridge-rail mask bounds around their geometry, with padding for glow and shadows. Preserve transparent interiors and symmetric effects.

2. **Conditional Canvas 2D port**
   - Reprofile after the SVG changes. Prototype a port only for a renderer that still misses the frame budget because of paint or compositing. Keep it only if it improves tablet frame times without unacceptable memory or bundle growth.
   - Reuse cached wall paths, fog, and isolated marble drawing. Preserve hints, visited trail, start and classic goal markers, collect targets, accessible board names, bridge layering, theme transparency, and fog behavior. Curved tubes and rails must remain hollow without erasing other layers.

3. **Cleanup after parity**
   - Remove replaced SVG helpers only after the port passes browser parity checks and no remaining renderer references them. Keep `src/renderers/PrintableMaze.tsx` for vector printing.

---

## Verification Plan

- **Automated:**
  - Compare optimized polar physics with the full scan on seeded mazes and repeatable inputs. Cover inner arcs, ring transitions, radial walls, the outer rim, and simultaneous radial-wall/rim contact at the seam. Compare pose, velocity, bumps, and entered cells.
  - Run `npm test` and `npm run build` after each phase.
- **Tablet profiling:**
  - On the affected tablet and browser, replay the same seeded board and route before and after each phase. Include fullscreen, a long trail, stationary marble, and fog on/off. Record p95 frame time and missed frames, separating JavaScript from paint and compositing. Compare memory when adding cache surfaces.
  - Use 16.7 ms per frame at 60 Hz as the initial budget and 8.3 ms at 120 Hz as a stretch budget.
- **Visual & Cross-Renderer Parity:**
  - Verify all 5 themes (`space`, `hologram`, `forest`, `pirate`, `paper`) × 3 styles (`classic`, `curved`, `circular`) × bridges, Fog of War, Marble Mode, and Print preview.
  - Check ordinary moves, stationary Hint toggles, a target pickup, and a fog-enabled win. Timer ticks must update the clock without re-rendering the board; the win overlay must show the final time.
  - Check fog after restart, retarget, and rotation on an explored board. Visit both levels of a bridge and verify one fog stamp per physical cell. Check upper/lower trail and hint layering on bridges away from the player and underpass entry/exit in both input modes.
  - Confirm `<PageBackdrop />` shines through corridor floors and hollow curved tubes, preserving `CORRIDOR_FLOOR_OPACITY` and symmetric glows. Check start/goal markers, Hint, and accessible board names. Verify print preview from both the app button and the browser's own Print command.
