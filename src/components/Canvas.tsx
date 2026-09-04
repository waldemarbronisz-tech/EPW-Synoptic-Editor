import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Transformer, Path } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject, SynopticConnection, WirePoint } from '../store';
import { SymbolRenderer } from '../symbols/SymbolRenderer';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { ConnectionLine, pathFromPoints, getConductorCoreColor } from './ConnectionLine';
import { ObjectLabelRenderer } from './ObjectLabelRenderer';
import { COLOR_CANVAS_BACKGROUND, COLOR_OUTLINE, COLOR_WATER, COLOR_WHITE, CONDUCTOR_WIDTH, FONT_SIZE_BASE, FONT_UI } from '../theme/ScadaTheme';
import { snapValue } from '../utils/GridSnap';
import { getObjectTerminals } from '../utils/Terminals';
import {
  snapPointToGrid, appendWirePoint, removeLastWirePoint,
  reorthogonalizeAfterMove, insertBendOnSegment, nearestPointOnPolyline
} from '../utils/WireDrawing';
import { resolveNets, getJunctionPoints } from '../project/NetResolver';
import { describeObject } from '../utils/ObjectDisplay';
import { WireNodeSymbol } from '../symbols/scada/WireNodeSymbol';
import { MeterElementNode } from './MeterElementNode';
import { computeMeterHeight } from '../meter/MeterElement';
import { SignalPanelElementNode } from './SignalPanelElementNode';
import { computeSignalPanelHeight } from '../elements/SignalPanelElement';
import { isObjectFullyInBox, isMeterFullyInBox, isConnectionFullyInBox, mergeSelectionAdditive } from '../utils/SelectionBox';
import { clampZoom, computeContentBounds, computeFitView, GRID_THIN_BELOW_ZOOM } from '../utils/CanvasView';
import { FrameElementNode } from './FrameElementNode';
import { computeFrameRectFromDrag } from '../elements/FrameElement';

// Momentary Alt-key bypass for grid snapping. Deliberately outside React
// state: every ObjectNode's drag handlers need the CURRENT key state at
// the instant a drag ends, not a value captured in a stale closure or
// re-rendered prop, and a keypress should never trigger a re-render of
// the whole canvas by itself.
let isAltPressed = false;

// Same reasoning as isAltPressed above - held Space (commit 4) turns
// the cursor into a hand and lets a left-button drag pan the canvas,
// without waiting for a React re-render to notice the key state.
let isSpacePressed = false;

// feat/appearance-selection-frames commit 2c: group move. Dragging ANY
// selected element, when more than one thing is selected, moves the
// WHOLE selection together, keeping relative positions, as one history
// entry - "like a graphics program", per this commit's own spec. The
// store already has exactly the right primitive for this
// (moveSelectionBy, built for arrow-key movement: skips locked
// objects, touches all four kinds atomically, one saveHistory() call);
// this just drives it from a mouse drag too, with a live visual follow
// for every OTHER selected element while the drag is in progress.
//
// A connection's own move-Group (ConnectionNode below) has no absolute
// x/y of its own - its x/y IS a pending delta from its last committed
// points, reset to (0,0) after every drag - so a connection's own
// "position" for this purpose is always (0,0), never its points' own
// coordinates. Every other kind (object/meter/signal panel) is
// absolute, matching its own x/y field directly.
type DragKey = string; // "obj:<id>" | "meter:<id>" | "panel:<id>" | "conn:<id>"
interface GroupDragApi {
  // Reports one element's own Konva node so ANOTHER element's leader
  // drag can reposition it live as a follower. Passing null
  // unregisters it (unmount).
  registerNode: (key: DragKey, node: any) => void;
  // Called from an element's own onDragStart. Starts a group drag only
  // when that element is part of a selection of MORE than one item;
  // otherwise clears any previous group-drag state so a lone drag
  // falls through to that element's own existing solo behavior.
  start: (key: DragKey) => void;
  isActive: () => boolean;
  // Called from the leader's own onDragMove with how far ITS OWN Konva
  // node has moved from where the drag started (raw, unsnapped - final
  // snapping happens once, together, at commit). Repositions every
  // OTHER selected element's Konva node by the same amount, display
  // only - nothing is written to the store until commit.
  follow: (dx: number, dy: number) => void;
  // Called from the leader's own onDragEnd with the final, already
  // grid-snapped delta. Writes the whole group to the store in one
  // moveSelectionBy call, resets every follower connection's move-
  // Group back to its neutral (0,0), and clears the group-drag state.
  commit: (dx: number, dy: number) => void;
}

// isSelected is no longer a prop here (commit 5) - the Transformer that
// used to read it moved out to its own top-level pass (
// ObjectTransformerHandle below), and nothing else in this component's
// own rendering depends on selection state.
const ObjectNode = ({ obj, onSelect, onChange, gridSize, onShapeRef, groupDrag }: {
  gridSize: number,
  obj: SynopticObject,
  // Receives the raw Konva event (onClick={onSelect} forwards it
  // positionally) so the caller can read Shift for multi-select - see
  // Canvas.tsx's own call site.
  onSelect: (e?: any) => void,
  onChange: (newAttrs: Partial<SynopticObject>) => void,
  // Layers (commit 5): the Transformer for a selected object is no
  // longer rendered here - it moves to its own top-level pass
  // (ObjectTransformerHandle below) so a selection's resize handles
  // always draw ABOVE every symbol, never just above this one object's
  // own. This reports the Group's own Konva node up to Canvas so that
  // later pass can still attach a Transformer to it.
  onShapeRef: (id: string, node: any) => void,
  groupDrag: GroupDragApi,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const shapeRef = useRef<any>(null);
  const dragKey: DragKey = `obj:${obj.id}`;

  useEffect(() => {
    onShapeRef(obj.id, shapeRef.current);
    groupDrag.registerNode(dragKey, shapeRef.current);
  });

  // Node-based wiring model: a symbol has terminals now, not ports - see
  // utils/Terminals.ts. The old click-a-port-to-drag-a-wire interaction
  // (onPortMouseDown/Up/Click, the busbar's dynamic-port onMouseUp
  // special case) is gone entirely; a terminal is purely a visual hint
  // now (radius 6, shown on hover) of where a freehand-drawn wire
  // actually needs to end to connect - simply sharing that grid point.
  const terminals = getObjectTerminals(obj);

  return (
      <Group
        ref={shapeRef}
        x={obj.x}
        y={obj.y}
        rotation={obj.rotation || 0}
        scaleX={obj.scaleX || 1}
        scaleY={obj.scaleY || 1}
        draggable={!obj.locked}
        visible={obj.visible !== false}
        onClick={onSelect}
        onTap={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragStart={() => {
          // Alt+drag (commit 2): a copy is left behind at THIS exact
          // spot the instant the drag starts, unselected and with no
          // history entry of its own - the object actually under the
          // cursor then keeps moving as an ordinary drag would, so the
          // eventual onDragEnd's saveHistory() covers the new copy and
          // the move together as one undo step.
          if (isAltPressed) {
            useStore.getState().duplicateObjectInPlace(obj.id);
          }
          groupDrag.start(dragKey);
        }}
        onDragMove={(e) => {
          // Snap during drag for visual feedback (doesn't mutate store yet).
          // Held Alt bypasses this exactly as it bypasses the final snap
          // on release, so the preview matches where the object will land.
          const snappedX = snapValue(e.target.x(), gridSize, isAltPressed);
          const snappedY = snapValue(e.target.y(), gridSize, isAltPressed);
          e.target.x(snappedX);
          e.target.y(snappedY);
          if (groupDrag.isActive()) {
            groupDrag.follow(snappedX - obj.x, snappedY - obj.y);
          }
        }}
        onDragEnd={(e) => {
          const finalX = snapValue(e.target.x(), gridSize, isAltPressed);
          const finalY = snapValue(e.target.y(), gridSize, isAltPressed);
          if (groupDrag.isActive()) {
            // The whole selection moves together, one history entry
            // (moveSelectionBy's own) - not this object's own onChange.
            groupDrag.commit(finalX - obj.x, finalY - obj.y);
          } else {
            // Push final position, then commit exactly one history entry
            // for the whole drag (updateObject itself no longer touches
            // history).
            onChange({ x: finalX, y: finalY });
            useStore.getState().saveHistory();
          }
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          onChange({
            x: snapValue(node.x(), gridSize, isAltPressed),
            y: snapValue(node.y(), gridSize, isAltPressed),
            rotation: node.rotation(),
            scaleX: Math.max(0.1, scaleX),
            scaleY: Math.max(0.1, scaleY),
          });
          useStore.getState().saveHistory();
        }}
      >
        <SymbolRenderer obj={obj} />

        {/* Terminals highlight on hover only (usterka D3's precedent,
            carried forward) - radius 6, contrasting fill, black outline. */}
        {isHovered && terminals.map((t) => (
          <Circle
            key={`term-${t.id}`}
            x={t.x}
            y={t.y}
            radius={6}
            fill={COLOR_WATER}
            stroke={COLOR_OUTLINE}
            strokeWidth={1}
            listening={false}
          />
        ))}
      </Group>
  );
};

// Layer 7 (commit 5): the resize/rotate handles for one selected,
// unlocked object - rendered in Canvas's own final "zaznaczenie i
// uchwyty" pass so they always draw above every symbol, not just above
// this one object's own (two overlapping objects, the later one drawn
// after the selected one, used to be able to cover its handles - this
// is what that bug looked like). Attaches to `node` (the target
// object's own Konva Group, reported via ObjectNode's onShapeRef) -
// resize/rotate itself is still handled by that Group's own existing
// onTransformEnd, unchanged; this component only draws the handles.
const ObjectTransformerHandle = ({ node }: { node: any }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (node && trRef.current) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  });

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox;
        }
        return newBox;
      }}
      borderStroke={COLOR_WHITE}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
    />
  );
};

// The same Transformer-relocation pattern as ObjectTransformerHandle
// above, for a frame's own resize handles (3f) - rotation disabled
// (frames do not rotate, per this element's own 3a spec, which lists
// only x/y/width/height/title/titlePosition/variant), and no live
// boundBoxFunc floor beyond a small pixel minimum: the REAL 2-grid-
// cell minimum (3g) is enforced where it actually matters, in
// FrameElementNode's own onTransformEnd (clampFrameSize), which runs
// regardless of zoom level - a boundBoxFunc here only sees on-screen
// pixels, not the frame's own local units.
const FrameTransformerHandle = ({ node }: { node: any }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (node && trRef.current) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  });

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={false}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox;
        }
        return newBox;
      }}
      borderStroke={COLOR_WHITE}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
    />
  );
};

// A finished wire: draws itself (ConnectionLine), can be dragged whole
// (translating every point, grid-snapped), and - while selected - shows
// a draggable handle at each of its own points so a bend can be grabbed
// and moved without breaking orthogonality (WireDrawing.
// reorthogonalizeAfterMove fixes up its two neighboring segments).
// Alt+click on a segment (not a handle) inserts a brand new bend there.
const ConnectionNode = ({ conn, isSelected, onSelect, gridSize, onAltClickSegment, groupDrag }: {
  conn: SynopticConnection,
  isSelected: boolean,
  onSelect: (multi: boolean) => void,
  gridSize: number,
  onAltClickSegment: (conn: SynopticConnection, worldPoint: WirePoint) => void,
  groupDrag: GroupDragApi,
}) => {
  const moveGroupRef = useRef<any>(null);
  const dragKey: DragKey = `conn:${conn.id}`;

  useEffect(() => {
    groupDrag.registerNode(dragKey, moveGroupRef.current);
  });

  return (
    <React.Fragment>
      <Group
        ref={moveGroupRef}
        draggable={isSelected}
        onDragStart={() => {
          groupDrag.start(dragKey);
        }}
        onDragMove={(e) => {
          const snappedX = snapValue(e.target.x(), gridSize, isAltPressed);
          const snappedY = snapValue(e.target.y(), gridSize, isAltPressed);
          e.target.x(snappedX);
          e.target.y(snappedY);
          // This move-Group's own x/y already IS a delta from (0,0) -
          // no baseline subtraction needed, unlike an object/meter/
          // panel's absolute position (see GroupDragApi's own comment).
          if (groupDrag.isActive()) {
            groupDrag.follow(snappedX, snappedY);
          }
        }}
        onDragEnd={(e) => {
          const dx = snapValue(e.target.x(), gridSize, isAltPressed);
          const dy = snapValue(e.target.y(), gridSize, isAltPressed);
          if (groupDrag.isActive()) {
            groupDrag.commit(dx, dy);
          } else if (dx !== 0 || dy !== 0) {
            useStore.getState().updateConnection(conn.id, {
              points: conn.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
            });
            useStore.getState().saveHistory();
          }
          e.target.x(0);
          e.target.y(0);
        }}
      >
        <ConnectionLine
          conn={conn}
          isSelected={isSelected}
          onSelect={(e: any) => {
            if (e?.evt?.altKey) {
              e.cancelBubble = true;
              const stage = e.target.getStage();
              const pos = stage?.getPointerPosition();
              if (!pos) return;
              const { panX, panY, zoom } = useStore.getState().canvasState;
              onAltClickSegment(conn, snapPointToGrid((pos.x - panX) / zoom, (pos.y - panY) / zoom));
              return;
            }
            onSelect(!!e?.evt?.shiftKey);
          }}
        />
      </Group>
      {isSelected && conn.points.map((p, idx) => (
        <Circle
          key={idx}
          x={p.x}
          y={p.y}
          radius={6}
          fill={COLOR_WHITE}
          stroke={COLOR_OUTLINE}
          strokeWidth={1.5}
          draggable
          onDragMove={(e) => {
            e.target.x(snapValue(e.target.x(), gridSize, isAltPressed));
            e.target.y(snapValue(e.target.y(), gridSize, isAltPressed));
          }}
          onDragEnd={(e) => {
            const newPoints = reorthogonalizeAfterMove(conn.points, idx, { x: e.target.x(), y: e.target.y() });
            useStore.getState().updateConnection(conn.id, { points: newPoints });
            useStore.getState().saveHistory();
          }}
        />
      ))}
    </React.Fragment>
  );
};

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  // Layers (commit 5): every ObjectNode reports its own Konva Group node
  // here (see ObjectNode's onShapeRef) so the separate, later-drawn
  // selection/handles pass (ObjectTransformerHandle) can still attach a
  // Transformer to the right node without owning a ref to it directly -
  // a plain mutable Map, not React state: a Konva node reference itself
  // never needs to trigger a re-render when it changes.
  const objectShapeRefs = useRef<Map<string, any>>(new Map());
  const registerObjectShapeRef = (id: string, node: any) => {
    objectShapeRefs.current.set(id, node);
  };
  // Same reasoning, for a frame's own resize handles (commit 3: 3f
  // requires a frame to be resizable via corner/edge handles, same
  // mechanism as a symbol's own Transformer).
  const frameShapeRefs = useRef<Map<string, any>>(new Map());
  const registerFrameShapeRef = (id: string, node: any) => {
    frameShapeRefs.current.set(id, node);
  };
  const canvasConfig = useStore(state => state.canvasConfig);
  const gridSize = canvasConfig.gridSize;
  const { objects, selectedIds, selectObjects, clearSelection, addObject, updateObject, canvasState, setCanvasState } = useStore();
  const { meters, selectedMeterIds, selectMeters, updateMeter, devices } = useStore();
  const { signalPanels, selectedSignalPanelIds, selectSignalPanels, updateSignalPanel } = useStore();
  const { frames, selectedFrameIds, selectFrames, addFrame, updateFrame, isDrawingFrame, drawingFrameVariant } = useStore();
  const { selectMixed } = useStore();
  const [size, setSize] = useState({ width: 800, height: 600 });
  // Mirrors `size` for the keydown handler below (registered once,
  // empty deps) - the same drawingPointsRef pattern already used
  // elsewhere in this file so that closure always reads the CURRENT
  // container size, not whatever it was when the effect first ran.
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  // Selection Rect
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const selectionStartRef = useRef<{ x: number, y: number } | null>(null);

  // Panning
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  // Freehand wire drawing (usterka B): points already placed, and the
  // live (grid-snapped) cursor position for the preview segment. A ref
  // mirrors the state so the window-level keydown handler (registered
  // once) always reads the current points, never a stale closure.
  const [drawingPoints, setDrawingPoints] = useState<WirePoint[] | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<WirePoint | null>(null);
  const drawingPointsRef = useRef<WirePoint[] | null>(null);
  useEffect(() => { drawingPointsRef.current = drawingPoints; }, [drawingPoints]);

  // isDrawingConnection/setDrawingMode is the same store pair the old
  // click-two-ports tool used, repurposed (not renamed) for the freehand
  // wire tool - Toolbar.tsx's existing "Rysuj polaczenie" button already
  // toggles it; Canvas.tsx only needs to read it here. drawingMedium/
  // drawingStyle (part C) are the toolbar's medium/style selector -
  // every new wire is drawn with whichever is currently chosen.
  const { connections, selectedConnectionIds, selectConnections, isDrawingConnection, drawingMedium } = useStore();

  // Group move (commit 2c) - see GroupDragApi's own comment above for
  // the full reasoning. dragNodeRefs is a plain mutable Map, not React
  // state, for the same reason objectShapeRefs above is one: a Konva
  // node reference never needs to trigger a re-render when it changes.
  // groupDragRef tracks the in-progress drag itself (which element
  // started it, and every key that must follow it) - also not React
  // state, since it only ever needs to be read/written from Konva
  // event handlers mid-gesture, never from a render.
  const dragNodeRefs = useRef<Map<DragKey, any>>(new Map());
  const groupDragRef = useRef<{ leaderKey: DragKey; keys: DragKey[] } | null>(null);

  const getSelectionKeys = (): DragKey[] => [
    ...selectedIds.map(id => `obj:${id}`),
    ...selectedMeterIds.map(id => `meter:${id}`),
    ...selectedSignalPanelIds.map(id => `panel:${id}`),
    ...selectedFrameIds.map(id => `frame:${id}`),
    ...selectedConnectionIds.map(id => `conn:${id}`)
  ];

  const groupDrag: GroupDragApi = {
    registerNode: (key, node) => {
      if (node) dragNodeRefs.current.set(key, node);
      else dragNodeRefs.current.delete(key);
    },
    start: (key) => {
      const keys = getSelectionKeys();
      groupDragRef.current = (keys.length > 1 && keys.includes(key)) ? { leaderKey: key, keys } : null;
    },
    isActive: () => !!groupDragRef.current,
    follow: (dx, dy) => {
      const g = groupDragRef.current;
      if (!g) return;
      g.keys.forEach(key => {
        if (key === g.leaderKey) return;
        const node = dragNodeRefs.current.get(key);
        if (!node) return;
        if (key.startsWith('conn:')) {
          // A connection's move-Group IS the delta - see this type's
          // own comment.
          node.x(dx);
          node.y(dy);
          return;
        }
        const id = key.slice(key.indexOf(':') + 1);
        const source = key.startsWith('obj:') ? objects.find(o => o.id === id)
          : key.startsWith('meter:') ? meters.find(m => m.id === id)
          : key.startsWith('panel:') ? signalPanels.find(p => p.id === id)
          : frames.find(f => f.id === id);
        if (!source) return;
        node.x(source.x + dx);
        node.y(source.y + dy);
      });
    },
    commit: (dx, dy) => {
      const g = groupDragRef.current;
      if (!g) return;
      useStore.getState().moveSelectionBy(dx, dy);
      // A follower connection's move-Group has no store-driven x/y at
      // all (see ConnectionNode) - the store update alone will not put
      // it back to neutral, so it must be reset by hand, the same way
      // its own solo drag already resets itself after every commit.
      g.keys.forEach(key => {
        if (!key.startsWith('conn:')) return;
        const node = dragNodeRefs.current.get(key);
        if (node) { node.x(0); node.y(0); }
      });
      groupDragRef.current = null;
    }
  };

  const toCanvasPoint = (stagePos: { x: number; y: number }): WirePoint => {
    const scale = canvasState.zoom;
    return snapPointToGrid((stagePos.x - canvasState.panX) / scale, (stagePos.y - canvasState.panY) / scale);
  };

  const finishDrawing = () => {
    const points = drawingPointsRef.current;
    setDrawingPoints(null);
    setDrawingPreview(null);
    if (!points || points.length < 2) return;

    // Read medium/style straight from the store rather than this
    // render's destructured drawingMedium/drawingStyle: the window
    // keydown handler below registers this function once (empty deps),
    // so a value captured from render-scope would go stale the moment
    // the toolbar's selector changes after mount - the same reason
    // drawingPointsRef exists instead of just closing over drawingPoints.
    const { drawingMedium: medium, drawingStyle: style } = useStore.getState();
    useStore.getState().addConnection({ points, medium, style, state: 'LIVE' });
    useStore.getState().saveHistory();

    // Readable, UUID-free feedback: if the new wire actually touches a
    // terminal - possibly by landing on the MIDDLE of another wire's
    // segment, e.g. tapping into a busbar - name what it joined.
    const store = useStore.getState();
    const justAdded = store.connections[store.connections.length - 1];
    const nets = resolveNets(store.connections, store.objects);
    const net = nets.find(n => n.connectionIds.includes(justAdded.id));
    if (net && net.terminals.length > 0) {
      const uniqueObjIds = [...new Set(net.terminals.map(t => t.objId))];
      const names = uniqueObjIds.map(id => describeObject(store.objects.find(o => o.id === id))).join(', ');
      store.addMessage(`[INFO] Wire connected: ${names}`);
    } else {
      store.addMessage('[INFO] Wire drawn (not touching any terminal yet)');
    }
  };

  // Grid-snap Alt bypass, tracked once, globally, for the whole canvas -
  // plus the wire-drawing tool's own keyboard shortcuts (Enter finishes,
  // Escape cancels the whole in-progress wire, Backspace undoes the last
  // bend, 1/2/3 pick the medium a new wire is drawn with - part C, same
  // three choices as the toolbar's selector), registered once so they
  // always see the latest drawing state through the ref above rather
  // than a stale closure.
  useEffect(() => {
    const isTypingInField = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') isAltPressed = true;
      if (isTypingInField()) return;
      if (e.key === 'Escape' && drawingPointsRef.current) {
        setDrawingPoints(null);
        setDrawingPreview(null);
      } else if (e.key === 'Enter' && drawingPointsRef.current) {
        finishDrawing();
      } else if (e.key === 'Backspace' && drawingPointsRef.current) {
        e.preventDefault();
        setDrawingPoints(prev => (prev ? removeLastWirePoint(prev) : prev));
      } else if (e.key === 'Escape') {
        // Not mid-draw (the branch above already handled that case) -
        // Escape just clears whatever is currently selected.
        useStore.getState().clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Reads the CURRENT selection from the store rather than this
        // render's destructured selectedIds/selectedConnectionIds/
        // selectedMeterIds - this handler is registered once (empty
        // deps below), so a value closed over from render-scope would
        // go stale the moment the selection changes after mount, the
        // same reasoning behind every other useStore.getState() call
        // already in this effect.
        e.preventDefault();
        const s = useStore.getState();
        s.deleteObjects(s.selectedIds, s.selectedConnectionIds, s.selectedMeterIds, s.selectedSignalPanelIds, s.selectedFrameIds);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        // Select everything on the current screen - objects,
        // connections and meters together.
        e.preventDefault();
        useStore.getState().selectAll();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // One grid cell per press, ten with Shift held - one history
        // entry per keypress (moveSelectionBy itself calls saveHistory
        // exactly once), including on a held-key auto-repeat, where
        // every repeat is its own keydown event and so its own press.
        e.preventDefault();
        const step = gridSize * (e.shiftKey ? 10 : 1);
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        useStore.getState().moveSelectionBy(dx, dy);
      } else if (e.key === '1') {
        useStore.getState().setDrawingMedium('ELECTRICAL');
      } else if (e.key === '2') {
        useStore.getState().setDrawingMedium('WATER');
      } else if (e.key === '3') {
        useStore.getState().setDrawingMedium('VENTILATION');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        // Commit 2: copy the current selection (objects, connections
        // and meters together, whatever is currently non-empty).
        e.preventDefault();
        useStore.getState().copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        // Paste, offset by exactly one grid cell right and down.
        e.preventDefault();
        useStore.getState().paste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        // Duplicate the current selection in place, same offset as
        // paste, without touching the clipboard.
        e.preventDefault();
        useStore.getState().duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        // Restores the SCALE only - pan is left exactly where it is.
        e.preventDefault();
        useStore.getState().setCanvasState({ zoom: 1 });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '9') {
        // Fit the whole project's content into the current viewport.
        e.preventDefault();
        const s = useStore.getState();
        const bounds = computeContentBounds(s.objects, s.meters, s.connections);
        const view = computeFitView(bounds, sizeRef.current.width, sizeRef.current.height);
        s.setCanvasState(view);
      } else if (e.key === ' ') {
        // Held Space (commit 4): the cursor turns into a hand, and a
        // left-button drag pans - guarded behind isTypingInField()
        // (checked above, unlike Alt) since typing a space is common
        // and must not put the canvas into pan mode.
        isSpacePressed = true;
        if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') isAltPressed = false;
      if (e.key === ' ') {
        isSpacePressed = false;
        if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'default';
      }
    };
    // Also cleared on window blur - Alt/Space released outside the
    // window (e.g. while alt-tabbing) would otherwise never fire their
    // own keyup here.
    const handleBlur = () => {
      isAltPressed = false;
      isSpacePressed = false;
      if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'default';
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    // Clamped to [MIN_ZOOM, MAX_ZOOM] (25%-400%) rather than simply
    // refused past the edge - so scrolling hard against the limit still
    // lands exactly on 25% or 400%, not on whatever the previous step
    // happened to stop at.
    const newScale = clampZoom(e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy);

    setCanvasState({
      zoom: newScale,
      panX: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      panY: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
    });
  };

  const handleMouseDown = (e: any) => {
    // Middle-button pan (unchanged), or a left-button drag while Space
    // is held (commit 4) - the same panning gesture either way.
    if (e.evt.button === 1 || (isSpacePressed && e.evt.button === 0)) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }

    if (isDrawingConnection) {
      // Every click while the wire tool is active places a point - it
      // does not matter what is underneath (empty canvas or an object),
      // a wire lands wherever the click itself snapped to.
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      const point = toCanvasPoint(pos);
      setDrawingPoints(prev => appendWirePoint(prev || [], point));
      return;
    }

    if (isDrawingFrame) {
      // A frame is dragged out like a rectangle tool, on any point -
      // same "doesn't matter what's underneath" reasoning as the wire
      // tool above. Reuses the same start/box tracking the rubber-band
      // selection itself uses (selectionStartRef/selectionBox) - the
      // two gestures are geometrically identical (drag a corner to a
      // corner), only what happens on release differs (see
      // handleMouseUp), so there is no need for a second, parallel set
      // of refs just to tell them apart.
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      const { x: startX, y: startY } = toCanvasPoint(pos);
      selectionStartRef.current = { x: startX, y: startY };
      setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
      return;
    }

    // Check if clicking on empty stage
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'grid';
    if (clickedOnEmpty) {
      if (!e.evt.shiftKey) {
        clearSelection();
      }

      const pos = e.target.getStage().getPointerPosition();
      const scale = canvasState.zoom;
      const stageX = canvasState.panX;
      const stageY = canvasState.panY;

      const startX = (pos.x - stageX) / scale;
      const startY = (pos.y - stageY) / scale;

      selectionStartRef.current = { x: startX, y: startY };
      setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDrawingConnection && drawingPointsRef.current) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) setDrawingPreview(toCanvasPoint(pos));
    }

    if (isPanningRef.current) {
      const dx = e.evt.clientX - lastPanPosRef.current.x;
      const dy = e.evt.clientY - lastPanPosRef.current.y;

      setCanvasState({
        panX: canvasState.panX + dx,
        panY: canvasState.panY + dy
      });
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (!selectionStartRef.current) return;

    const pos = e.target.getStage().getPointerPosition();
    const scale = canvasState.zoom;
    const stageX = canvasState.panX;
    const stageY = canvasState.panY;

    const curX = (pos.x - stageX) / scale;
    const curY = (pos.y - stageY) / scale;

    const startX = selectionStartRef.current.x;
    const startY = selectionStartRef.current.y;

    setSelectionBox({
      x: Math.min(startX, curX),
      y: Math.min(startY, curY),
      width: Math.abs(curX - startX),
      height: Math.abs(curY - startY)
    });
  };

  const handleMouseUp = (e: any) => {
    if (e.evt.button === 1 || isPanningRef.current) {
      isPanningRef.current = false;
      if (containerRef.current) containerRef.current.style.cursor = 'default';
      return;
    }

    if (isDrawingConnection) {
      return;
    }

    if (isDrawingFrame) {
      // Finalize the dragged rectangle into a real frame - 3g's own
      // minimum-size clamp lives in computeFrameRectFromDrag itself, so
      // a drag too small to register (a stray click, essentially) still
      // creates a real, minimum-size frame, never a zero-size one.
      if (selectionBox) {
        // selectionBox is already the normalized (min-x/min-y, width,
        // height) rectangle handleMouseMove built from the two drag
        // corners - its own two opposite corners are exactly the two
        // points computeFrameRectFromDrag needs, however the drag
        // itself was oriented.
        const rect = computeFrameRectFromDrag(selectionBox.x, selectionBox.y, selectionBox.x + selectionBox.width, selectionBox.y + selectionBox.height);
        addFrame({ ...rect, titlePosition: 'TOP_LEFT', variant: drawingFrameVariant });
        const newest = useStore.getState().frames[useStore.getState().frames.length - 1];
        if (newest) selectFrames([newest.id], false);
      }
      selectionStartRef.current = null;
      setSelectionBox(null);
      return;
    }

    if (selectionStartRef.current && selectionBox) {
      // Rubber-band selection (commit 3, extended in commit 6 to signal
      // panels, and in commit 2/feat-appearance-selection-frames to
      // frames): everything lying ENTIRELY within the box - objects,
      // connections, meters, signal panels and frames together, not
      // just whichever kind happens to be found first. Something
      // poking out past the box's edge is left unselected.
      // isMeterFullyInBox's own signature ({x,y,width} + a separately-
      // computed height) is already generic enough to reuse as-is for
      // a signal panel - no new isSignalPanelFullyInBox needed, just
      // its own height math. A frame has x/y/width/height directly, so
      // isObjectFullyInBox (built for a SynopticObject, but only ever
      // reads those four fields plus optional scale) is reusable for
      // it exactly as it stands - no new isFrameFullyInBox either.
      const box = selectionBox;
      const objectIds = objects.filter(obj => isObjectFullyInBox(obj, box)).map(o => o.id);
      const meterIds = meters.filter(m => isMeterFullyInBox(m, computeMeterHeight(m), box)).map(m => m.id);
      const signalPanelIds = signalPanels.filter(p => isMeterFullyInBox(p, computeSignalPanelHeight(p), box)).map(p => p.id);
      const frameIds = frames.filter(f => isObjectFullyInBox(f, box)).map(f => f.id);
      const connectionIds = connections.filter(c => isConnectionFullyInBox(c, box)).map(c => c.id);

      if (objectIds.length > 0 || meterIds.length > 0 || signalPanelIds.length > 0 || frameIds.length > 0 || connectionIds.length > 0) {
        if (e.evt.shiftKey) {
          // Shift+drag adds to whatever was already selected, per kind.
          selectMixed(mergeSelectionAdditive(
            { objectIds: selectedIds, connectionIds: selectedConnectionIds, meterIds: selectedMeterIds, signalPanelIds: selectedSignalPanelIds, frameIds: selectedFrameIds },
            { objectIds, connectionIds, meterIds, signalPanelIds, frameIds }
          ));
        } else {
          selectMixed({ objectIds, connectionIds, meterIds, signalPanelIds, frameIds });
        }
      }
      // An empty box selects nothing new - a non-shift click already
      // cleared any previous selection back in handleMouseDown.
    }

    selectionStartRef.current = null;
    setSelectionBox(null);
  };

  const handleDblClick = () => {
    if (isDrawingConnection && drawingPointsRef.current) {
      finishDrawing();
    }
  };

  const handleAltClickSegment = (conn: SynopticConnection, worldPoint: WirePoint) => {
    const nearest = nearestPointOnPolyline(conn.points, worldPoint);
    if (!nearest) return;
    const newPoints = insertBendOnSegment(conn.points, nearest.segmentIndex, nearest.point);
    useStore.getState().updateConnection(conn.id, { points: newPoints });
    useStore.getState().saveHistory();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const junctionPoints = getJunctionPoints(connections, objects);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!stageRef.current || !containerRef.current) return;

    const dataStr = e.dataTransfer.getData('application/reactflow');
    if (!dataStr) return;

    const data = JSON.parse(dataStr);

    // Get pointer position relative to the container, and translate it to stage coordinates
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top
    };

    const scale = canvasState.zoom;
    const stageX = canvasState.panX;
    const stageY = canvasState.panY;

    let x = (pos.x - stageX) / scale;
    let y = (pos.y - stageY) / scale;

    // Snap to grid unless the persistent toggle is off or Alt is held.
    // e.altKey (the native DragEvent's own modifier state) is combined
    // with the tracked flag - a drag-and-drop gesture can be less
    // reliable about delivering keydown/keyup than a plain mouse drag on
    // some platforms.
    x = snapValue(x, gridSize, isAltPressed || e.altKey);
    y = snapValue(y, gridSize, isAltPressed || e.altKey);

    const def = getSymbolDefinition(data.type);
    const width = def?.defaultWidth || 80;
    const height = def?.defaultHeight || 80;

    addObject({
      type: data.type,
      category: data.category,
      x, y,
      width, height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      layer: 1,
      tag: `${data.type.replace(/\s+/g, '')}_1`,
      description: '',
      color: '#000000',
      fill: '#c0c0c0',
      border: '#000000',
      text: def?.label || data.type,
      font: FONT_UI,
      fontSize: FONT_SIZE_BASE,
      editor: {
        preview_state: def?.defaultState || ''
      },
      tooltip: '',
      customProperties: {}
    });
  };

  // Draw Grid: discreet minor lines every gridSize, a more pronounced
  // major line every 4th one - both darker than the canvas background,
  // both plain COLOR_OUTLINE at different opacities (no separate "grid
  // color" invented outside ScadaTheme).
  const drawGrid = () => {
    const lines = [];
    const width = useStore.getState().canvasConfig.width;
    const height = useStore.getState().canvasConfig.height;
    const minorOpacity = 0.12;
    const majorOpacity = 0.32;
    // Below GRID_THIN_BELOW_ZOOM (commit 4), only the major (every 4th)
    // line draws at all - at that scale every minor line packed this
    // close together on screen blurs into a solid gray plane instead of
    // reading as a grid.
    const onlyMajor = canvasState.zoom < GRID_THIN_BELOW_ZOOM;

    for (let i = 0; i * gridSize <= width; i++) {
      const isMajor = i % 4 === 0;
      if (onlyMajor && !isMajor) continue;
      lines.push(
        <Rect
          key={`v${i}`}
          x={i * gridSize}
          y={0}
          width={isMajor ? 1.5 : 1}
          height={height}
          fill={COLOR_OUTLINE}
          opacity={isMajor ? majorOpacity : minorOpacity}
          name="grid"
        />
      );
    }
    for (let j = 0; j * gridSize <= height; j++) {
      const isMajor = j % 4 === 0;
      if (onlyMajor && !isMajor) continue;
      lines.push(
        <Rect
          key={`h${j}`}
          x={0}
          y={j * gridSize}
          width={width}
          height={isMajor ? 1.5 : 1}
          fill={COLOR_OUTLINE}
          opacity={isMajor ? majorOpacity : minorOpacity}
          name="grid"
        />
      );
    }
    return lines;
  };

  // Shared group outline (commit 2f): when more than one element is
  // selected, across any mix of the four kinds, a single rectangle
  // drawn around the whole group's combined bounds - the same "this is
  // one selection" affordance a graphics program gives. A single
  // selected element already has its own outline (Transformer handles,
  // or one of the dashed rects above) - this only draws once there is
  // more than one item to show as a group. Ignores object rotation
  // (an axis-aligned box, not each object's own rotated bounds) - the
  // same simplification isObjectFullyInBox already makes for the
  // rubber-band box itself.
  const selectedTotalCount = selectedIds.length + selectedMeterIds.length + selectedSignalPanelIds.length + selectedFrameIds.length + selectedConnectionIds.length;
  const selectionGroupBounds = (() => {
    if (selectedTotalCount <= 1) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const extend = (x1: number, y1: number, x2: number, y2: number) => {
      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    };
    objects.filter(o => selectedIds.includes(o.id)).forEach(o => extend(o.x, o.y, o.x + o.width, o.y + o.height));
    meters.filter(m => selectedMeterIds.includes(m.id)).forEach(m => extend(m.x, m.y, m.x + m.width, m.y + computeMeterHeight(m)));
    signalPanels.filter(p => selectedSignalPanelIds.includes(p.id)).forEach(p => extend(p.x, p.y, p.x + p.width, p.y + computeSignalPanelHeight(p)));
    frames.filter(f => selectedFrameIds.includes(f.id)).forEach(f => extend(f.x, f.y, f.x + f.width, f.y + f.height));
    connections.filter(c => selectedConnectionIds.includes(c.id)).forEach(c => c.points.forEach(pt => extend(pt.x, pt.y, pt.x, pt.y)));
    if (!Number.isFinite(minX)) return null;
    const padding = 8;
    return { x: minX - padding, y: minY - padding, width: (maxX - minX) + padding * 2, height: (maxY - minY) + padding * 2 };
  })();

  return (
    <div
      className="canvas-container"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        width={size.width}
        height={size.height}
        ref={stageRef}
        scaleX={canvasState.zoom}
        scaleY={canvasState.zoom}
        x={canvasState.panX}
        y={canvasState.panY}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        style={{ cursor: isDrawingConnection ? 'crosshair' : (selectionStartRef.current ? 'crosshair' : 'default') }}
      >
        <Layer>
          {/* feat/appearance-selection-frames commit 2: both background
              rects need name="grid" too, not just the grid LINES drawn
              over them - handleMouseDown's own clickedOnEmpty check
              treats that name as "this is empty canvas, not an
              object", and grid lines cover only a sliver of the
              canvas's actual area (1-1.5px wide, GRID_SIZE apart) - an
              ordinary click almost always lands on one of these two
              rects instead, which had no name at all, so rubber-band
              selection could only ever start by landing exactly on a
              grid line. Confirmed by eye in the running app before this
              fix: dragging a marquee from ordinary empty space selected
              nothing. */}
          <Rect x={0} y={0} width={useStore.getState().canvasConfig.width} height={useStore.getState().canvasConfig.height} fill={useStore.getState().canvasConfig.background} name="grid" />
          <Rect x={0} y={0} width={canvasConfig.width || 1920} height={canvasConfig.height || 1080} fill={canvasConfig.background || COLOR_CANVAS_BACKGROUND} name="grid" />
          {drawGrid()}
        </Layer>
        <Layer>
          {/* The frame element (commit 3): pure background graphic, no
              terminals, no state - drawn first in this Layer so it sits
              BELOW every wire and symbol that follows (3e: "warstwa
              podkladu"), while still being above the grid/canvas
              background Layer above. A symbol placed inside a frame's
              own bounds draws later in this same Layer, so it is
              visible above the frame, per that same requirement. */}
          {frames.map((frame) => (
            <FrameElementNode
              key={frame.id}
              frame={frame}
              onSelect={(e: any) => selectFrames([frame.id], !!e?.evt?.shiftKey)}
              onShapeRef={(node) => { groupDrag.registerNode(`frame:${frame.id}`, node); registerFrameShapeRef(frame.id, node); }}
              onDragStart={() => {
                if (isAltPressed) useStore.getState().duplicateFrameInPlace(frame.id);
                groupDrag.start(`frame:${frame.id}`);
              }}
              onDragMove={(x, y) => {
                if (groupDrag.isActive()) groupDrag.follow(x - frame.x, y - frame.y);
              }}
              onDragEnd={(x, y) => {
                const finalX = snapValue(x, gridSize, isAltPressed);
                const finalY = snapValue(y, gridSize, isAltPressed);
                if (groupDrag.isActive()) {
                  groupDrag.commit(finalX - frame.x, finalY - frame.y);
                } else {
                  updateFrame(frame.id, { x: finalX, y: finalY });
                  useStore.getState().saveHistory();
                }
              }}
              onResize={(x, y, width, height) => {
                updateFrame(frame.id, {
                  x: snapValue(x, gridSize, isAltPressed),
                  y: snapValue(y, gridSize, isAltPressed),
                  width: snapValue(width, gridSize, isAltPressed),
                  height: snapValue(height, gridSize, isAltPressed)
                });
                useStore.getState().saveHistory();
              }}
            />
          ))}
          {/* Node-based wiring model: a connection draws itself straight
              through its own points array now - no from/to object lookup
              needed here at all (that whole indirection is gone). A
              finished wire can be selected, dragged as a whole, or have
              one of its own bends grabbed and moved (ConnectionNode). */}
          {connections.map(conn => (
            <ConnectionNode
              key={conn.id}
              conn={conn}
              isSelected={selectedConnectionIds.includes(conn.id)}
              onSelect={(multi: boolean) => selectConnections([conn.id], multi)}
              gridSize={gridSize}
              onAltClickSegment={handleAltClickSegment}
              groupDrag={groupDrag}
            />
          ))}
          {/* In-progress wire preview: a thin line through every point
              placed so far plus the live (grid-snapped) cursor position
              - thinner than the real conductor (not a committed
              connection yet), but already colored by the toolbar's
              selected medium (part C) so what is about to be drawn is
              visible before it lands. */}
          {drawingPoints && drawingPoints.length > 0 && (
            <>
              <Path
                data={pathFromPoints(drawingPreview ? [...drawingPoints, drawingPreview] : drawingPoints)}
                stroke={getConductorCoreColor(drawingMedium, 'LIVE')}
                strokeWidth={CONDUCTOR_WIDTH / 2}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {drawingPoints.map((p, idx) => (
                <Circle key={idx} x={p.x} y={p.y} radius={4} fill={getConductorCoreColor(drawingMedium, 'LIVE')} listening={false} />
              ))}
            </>
          )}
          {[...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              onSelect={(e: any) => selectObjects([obj.id], !!e?.evt?.shiftKey)}
              onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
              gridSize={gridSize}
              onShapeRef={registerObjectShapeRef}
              groupDrag={groupDrag}
            />
          ))}
          {/* Topology junctions (layer 4 - deliberately ABOVE symbols,
              not below as the task's own layer list literally orders
              them): a wire node (from the SCADA library) wherever 3+
              segments, or 2 segments and a terminal, meet at one grid
              point - computed purely from geometry by NetResolver.
              getJunctionPoints. A junction routinely lands exactly at a
              terminal, which is often inside the object's own drawn
              shape, and painting it underneath would leave it
              invisible, hidden by the object itself - this deliberate
              deviation preserves that earlier fix; see raport.md. */}
          {junctionPoints.map((j, idx) => (
            <Group key={`junc-${idx}`} x={j.x - 75} y={j.y - 75} listening={false}>
              <WireNodeSymbol />
            </Group>
          ))}
          {/* The meter element (feat/meter-element): its own array, not
              a symbol - see MeterElement.ts's own header comment. Layer
              5 - after every symbol and junction, before labels. */}
          {meters.map((meter) => (
            <MeterElementNode
              key={meter.id}
              meter={meter}
              devices={devices}
              onSelect={(e: any) => selectMeters([meter.id], !!e?.evt?.shiftKey)}
              onShapeRef={(node) => groupDrag.registerNode(`meter:${meter.id}`, node)}
              onDragStart={() => {
                if (isAltPressed) useStore.getState().duplicateMeterInPlace(meter.id);
                groupDrag.start(`meter:${meter.id}`);
              }}
              onDragMove={(x, y) => {
                if (groupDrag.isActive()) groupDrag.follow(x - meter.x, y - meter.y);
              }}
              onDragEnd={(x, y) => {
                const finalX = snapValue(x, gridSize, isAltPressed);
                const finalY = snapValue(y, gridSize, isAltPressed);
                if (groupDrag.isActive()) {
                  groupDrag.commit(finalX - meter.x, finalY - meter.y);
                } else {
                  updateMeter(meter.id, { x: finalX, y: finalY });
                  useStore.getState().saveHistory();
                }
              }}
            />
          ))}
          {/* The signal panel element (commit 6): same mechanism as the
              meter, its own array - see elements/SignalPanelElement.ts.
              Same layer 5 as the meter. */}
          {signalPanels.map((panel) => (
            <SignalPanelElementNode
              key={panel.id}
              panel={panel}
              devices={devices}
              onSelect={(e: any) => selectSignalPanels([panel.id], !!e?.evt?.shiftKey)}
              onShapeRef={(node) => groupDrag.registerNode(`panel:${panel.id}`, node)}
              onDragStart={() => {
                if (isAltPressed) useStore.getState().duplicateSignalPanelInPlace(panel.id);
                groupDrag.start(`panel:${panel.id}`);
              }}
              onDragMove={(x, y) => {
                if (groupDrag.isActive()) groupDrag.follow(x - panel.x, y - panel.y);
              }}
              onDragEnd={(x, y) => {
                const finalX = snapValue(x, gridSize, isAltPressed);
                const finalY = snapValue(y, gridSize, isAltPressed);
                if (groupDrag.isActive()) {
                  groupDrag.commit(finalX - panel.x, finalY - panel.y);
                } else {
                  updateSignalPanel(panel.id, { x: finalX, y: finalY });
                  useStore.getState().saveHistory();
                }
              }}
            />
          ))}
          {/* Layer 6, labels: a SEPARATE pass over every object, drawn
              after every symbol/junction/meter so a label never falls
              under another object's own shape - each wrapped in its own
              Group carrying the exact same x/y/rotation/scale transform
              ObjectNode's own Group already applies (ObjectLabelRenderer's
              own local coordinates and rotation-cancelling math are
              unchanged, only which Group they are nested inside). */}
          {objects.map((obj) => (
            <Group
              key={`label-${obj.id}`}
              x={obj.x}
              y={obj.y}
              rotation={obj.rotation || 0}
              scaleX={obj.scaleX || 1}
              scaleY={obj.scaleY || 1}
              visible={obj.visible !== false}
            >
              <ObjectLabelRenderer obj={obj} onChange={(newAttrs) => updateObject(obj.id, newAttrs)} />
            </Group>
          ))}
          {/* Layer 7, selection and handles - always topmost. The
              in-progress wire's own preview stays in layer 2 (przewody)
              above, since it is a wire, not a selection. */}
          {selectedIds.filter(id => {
            const obj = objects.find(o => o.id === id);
            return obj && !obj.locked;
          }).map((id) => (
            <ObjectTransformerHandle
              key={`tr-${id}`}
              node={objectShapeRefs.current.get(id)}
            />
          ))}
          {meters.filter(m => selectedMeterIds.includes(m.id)).map((meter) => (
            <Rect
              key={`meter-sel-${meter.id}`}
              x={meter.x}
              y={meter.y}
              width={meter.width}
              height={computeMeterHeight(meter)}
              stroke={COLOR_WHITE}
              strokeWidth={2}
              dash={[6, 4]}
              fill="transparent"
              listening={false}
            />
          ))}
          {signalPanels.filter(p => selectedSignalPanelIds.includes(p.id)).map((panel) => (
            <Rect
              key={`panel-sel-${panel.id}`}
              x={panel.x}
              y={panel.y}
              width={panel.width}
              height={computeSignalPanelHeight(panel)}
              stroke={COLOR_WHITE}
              strokeWidth={2}
              dash={[6, 4]}
              fill="transparent"
              listening={false}
            />
          ))}
          {selectedFrameIds.map((id) => (
            <FrameTransformerHandle
              key={`frame-tr-${id}`}
              node={frameShapeRefs.current.get(id)}
            />
          ))}
          {selectionGroupBounds && (
            <Rect
              x={selectionGroupBounds.x}
              y={selectionGroupBounds.y}
              width={selectionGroupBounds.width}
              height={selectionGroupBounds.height}
              stroke={COLOR_WHITE}
              strokeWidth={1.5}
              dash={[10, 6]}
              fill="transparent"
              listening={false}
            />
          )}
          {selectionBox && (
            <Rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill={COLOR_WATER}
              fillOpacity={0.25}
              stroke={COLOR_WATER}
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
