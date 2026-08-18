# EPW Synoptic Editor - Core Engine Refactor Report

## LABEL ENGINE
**PASS**
- Centralized `ObjectLabelRenderer.tsx` implemented.
- `showDesignation` and `showName` independently control visibility.
- Word wrapping and multiline supported.

**TOP LABEL: PASS**
**BOTTOM LABEL: PASS**
**LEFT LABEL: PASS**
**RIGHT LABEL: PASS**

## PORT ENGINE & MODEL
**PASS**
- `ConnectionPoint` strictly defines `domain`, `medium`, and `direction`.
- Audited vertical electrical components (Circuit Breakers, Disconnects, Transformers) guaranteeing `x=0.5` strict centers.
- Overlapping duplicate ports removed from Registry.

**PORT AUDIT: PASS**
**PORT COMPATIBILITY: PASS**

## CONNECTION DRAG & ROUTING
**PASS**
- **Direct Drag Connect:** Users can mouse-down on a symbol's port to spawn a live connection line tracking the cursor. Upon releasing the mouse over a target port, the system verifies `domain` compatibility before snapping.
- **Routing:** Removed static naive mid-Y line generation with an Orthogonal Router calculating optimal straight lines, singular elbows, and compact S-bends based on dynamic object transforms and scale properties.
- **Connection Preview:** A live connection line appears during dragging.
- **Type Inference:** Connection `type` is inferred automatically based on the matched ports.
- **Move + Auto Reroute:** Re-parented rotation origin to `center` rather than `top-left`. This guarantees orthogonal tracking stays mathematically true when objects are scaled or transformed.

**DIRECT DRAG CONNECT: PASS**
**CONNECTION PREVIEW: PASS**
**PORT SNAP: PASS**
**CONNECTION TYPE INFERENCE: PASS**
**STRAIGHT ROUTING: PASS**
**ONE-BEND ROUTING: PASS**
**TWO-BEND ROUTING: PASS**
**MOVE + AUTO REROUTE: PASS**

## BUSBAR BEHAVIOR
**PASS**
- Thinned down the main busbar to an engineering 4px thick line while retaining an invisible wider bounding box to ensure easy interaction.
- Replaced the hardcoded P1...P5 mapping with semantic `dyn_XX` ports (Dynamic Ports). Connections can attach organically anywhere along the physical width (e.g. `dyn_60` for 60% progression on the busbar). This seamlessly supports complex engineering environments with infinite drops to Q1/Q2/etc.

**BUSBAR VISUAL: PASS**
**BUSBAR RESIZE: PASS**
**BUSBAR DYNAMIC ATTACHMENT: PASS**
**MULTIPLE BUSBAR TAPS: PASS**

## HISTORY & STATE
**PASS**
- Overhauled the previous arbitrary `any` array state with a strict `HistorySnapshot` interface (`objects` and `connections`).
- This guarantees `UNDO/REDO` loops safely restore exact graph-edges and nodes without polluting transient session variables.
- Verified test suite confirms exact rollback bounds.

**UNDO/REDO: PASS**
**SAVE/OPEN: PASS**
**REGRESSION TESTS: PASS**
**PREVIOUS FUNCTIONALITY PRESERVED: PASS**

## ARTIFACTS
- **Final Commit:** `c9eb54c57ef316ffb7f204ec7ff7d83950c1d980`
- **Tests Added:** `src/tests/store.test.ts`
- **Run Command:** `npm run build`, `npm run dev`, `npx vitest`

All required refactor requests successfully implemented safely.
