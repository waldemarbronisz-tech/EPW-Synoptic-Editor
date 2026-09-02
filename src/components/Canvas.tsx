import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Transformer, Path } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject, SynopticConnection, WirePoint } from '../store';
import { SymbolRenderer } from '../symbols/SymbolRenderer';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { ConnectionLine, pathFromPoints } from './ConnectionLine';
import { ObjectLabelRenderer } from './ObjectLabelRenderer';
import { COLOR_CANVAS_BACKGROUND, COLOR_OUTLINE, COLOR_WATER, COLOR_WHITE, COLOR_DE_ENERGIZED, CONDUCTOR_WIDTH } from '../theme/ScadaTheme';
import { snapValue } from '../utils/GridSnap';
import { getObjectTerminals } from '../utils/Terminals';
import {
  snapPointToGrid, appendWirePoint, removeLastWirePoint,
  reorthogonalizeAfterMove, insertBendOnSegment, nearestPointOnPolyline
} from '../utils/WireDrawing';
import { resolveNets, getJunctionPoints } from '../project/NetResolver';
import { describeObject } from '../utils/ObjectDisplay';
import { WireNodeSymbol } from '../symbols/scada/WireNodeSymbol';

// Momentary Alt-key bypass for grid snapping. Deliberately outside React
// state: every ObjectNode's drag handlers need the CURRENT key state at
// the instant a drag ends, not a value captured in a stale closure or
// re-rendered prop, and a keypress should never trigger a re-render of
// the whole canvas by itself.
let isAltPressed = false;

const ObjectNode = ({ obj, isSelected, onSelect, onChange, gridSize }: {
  gridSize: number,
  obj: SynopticObject,
  isSelected: boolean,
  onSelect: () => void,
  onChange: (newAttrs: Partial<SynopticObject>) => void,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Node-based wiring model: a symbol has terminals now, not ports - see
  // utils/Terminals.ts. The old click-a-port-to-drag-a-wire interaction
  // (onPortMouseDown/Up/Click, the busbar's dynamic-port onMouseUp
  // special case) is gone entirely; a terminal is purely a visual hint
  // now (radius 6, shown on hover) of where a freehand-drawn wire
  // actually needs to end to connect - simply sharing that grid point.
  const terminals = getObjectTerminals(obj);

  return (
    <React.Fragment>
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
        onDragMove={(e) => {
          // Snap during drag for visual feedback (doesn't mutate store yet).
          // Held Alt bypasses this exactly as it bypasses the final snap
          // on release, so the preview matches where the object will land.
          e.target.x(snapValue(e.target.x(), gridSize, isAltPressed));
          e.target.y(snapValue(e.target.y(), gridSize, isAltPressed));
        }}
        onDragEnd={(e) => {
          // Push final position, then commit exactly one history entry for
          // the whole drag (updateObject itself no longer touches history).
          onChange({
            x: snapValue(e.target.x(), gridSize, isAltPressed),
            y: snapValue(e.target.y(), gridSize, isAltPressed),
          });
          useStore.getState().saveHistory();
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
        {/* Render Designation/Name Label */}
        <ObjectLabelRenderer obj={obj} onChange={onChange} />

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
      {isSelected && !obj.locked && (
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
      )}
    </React.Fragment>
  );
};

// A finished wire: draws itself (ConnectionLine), can be dragged whole
// (translating every point, grid-snapped), and - while selected - shows
// a draggable handle at each of its own points so a bend can be grabbed
// and moved without breaking orthogonality (WireDrawing.
// reorthogonalizeAfterMove fixes up its two neighboring segments).
// Alt+click on a segment (not a handle) inserts a brand new bend there.
const ConnectionNode = ({ conn, isSelected, onSelect, gridSize, onAltClickSegment }: {
  conn: SynopticConnection,
  isSelected: boolean,
  onSelect: () => void,
  gridSize: number,
  onAltClickSegment: (conn: SynopticConnection, worldPoint: WirePoint) => void,
}) => {
  const moveGroupRef = useRef<any>(null);

  return (
    <React.Fragment>
      <Group
        ref={moveGroupRef}
        draggable={isSelected}
        onDragMove={(e) => {
          e.target.x(snapValue(e.target.x(), gridSize, isAltPressed));
          e.target.y(snapValue(e.target.y(), gridSize, isAltPressed));
        }}
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          if (dx !== 0 || dy !== 0) {
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
            onSelect();
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
  const canvasConfig = useStore(state => state.canvasConfig);
  const gridSize = canvasConfig.gridSize;
  const { objects, selectedIds, selectObjects, clearSelection, addObject, updateObject, canvasState, setCanvasState } = useStore();
  const [size, setSize] = useState({ width: 800, height: 600 });

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
  // toggles it; Canvas.tsx only needs to read it here.
  const { connections, selectedConnectionIds, selectConnections, isDrawingConnection } = useStore();

  const toCanvasPoint = (stagePos: { x: number; y: number }): WirePoint => {
    const scale = canvasState.zoom;
    return snapPointToGrid((stagePos.x - canvasState.panX) / scale, (stagePos.y - canvasState.panY) / scale);
  };

  const finishDrawing = () => {
    const points = drawingPointsRef.current;
    setDrawingPoints(null);
    setDrawingPreview(null);
    if (!points || points.length < 2) return;

    useStore.getState().addConnection({ points, medium: 'ELECTRICAL', style: 'NORMAL', state: 'LIVE' });
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
  // bend), registered once so they always see the latest drawing state
  // through the ref above rather than a stale closure.
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
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') isAltPressed = false; };
    // Also cleared on window blur - Alt released outside the window (e.g.
    // while alt-tabbing) would otherwise never fire its own keyup here.
    const handleBlur = () => { isAltPressed = false; };
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

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // limit zoom
    if (newScale < 0.1 || newScale > 5) return;

    setCanvasState({
      zoom: newScale,
      panX: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      panY: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
    });
  };

  const handleMouseDown = (e: any) => {
    if (e.evt.button === 1) {
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

    if (selectionStartRef.current && selectionBox) {
      // Find objects inside selection rect
      const box = selectionBox;
      const selected = objects.filter(obj => {
        return (
          obj.x >= box.x &&
          obj.y >= box.y &&
          obj.x + obj.width * (obj.scaleX || 1) <= box.x + box.width &&
          obj.y + obj.height * (obj.scaleY || 1) <= box.y + box.height
        );
      });

      if (selected.length > 0) {
        selectObjects(selected.map(s => s.id), e.evt.shiftKey);
      }
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
      font: 'Arial',
      fontSize: 12,
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

    for (let i = 0; i * gridSize <= width; i++) {
      const isMajor = i % 4 === 0;
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
          <Rect x={0} y={0} width={useStore.getState().canvasConfig.width} height={useStore.getState().canvasConfig.height} fill={useStore.getState().canvasConfig.background} />
          <Rect x={0} y={0} width={canvasConfig.width || 1920} height={canvasConfig.height || 1080} fill={canvasConfig.background || COLOR_CANVAS_BACKGROUND} />
          {drawGrid()}
        </Layer>
        <Layer>
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
              onSelect={() => selectConnections([conn.id], false)}
              gridSize={gridSize}
              onAltClickSegment={handleAltClickSegment}
            />
          ))}
          {/* In-progress wire preview: a thin, neutral line through every
              point placed so far plus the live (grid-snapped) cursor
              position - never the real conductor color/thickness, this
              is not a committed connection yet. */}
          {drawingPoints && drawingPoints.length > 0 && (
            <>
              <Path
                data={pathFromPoints(drawingPreview ? [...drawingPoints, drawingPreview] : drawingPoints)}
                stroke={COLOR_DE_ENERGIZED}
                strokeWidth={CONDUCTOR_WIDTH / 2}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {drawingPoints.map((p, idx) => (
                <Circle key={idx} x={p.x} y={p.y} radius={4} fill={COLOR_DE_ENERGIZED} listening={false} />
              ))}
            </>
          )}
          {[...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObjects([obj.id], false)}
              onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
              gridSize={gridSize}
            />
          ))}
          {/* Topology junctions: a wire node (from the SCADA library)
              wherever 3+ segments, or 2 segments and a terminal, meet at
              one grid point - computed purely from geometry by
              NetResolver.getJunctionPoints. Rendered AFTER (on top of)
              every object: a junction routinely lands exactly at a
              terminal, which is often inside the object's own drawn
              shape, and painting it underneath would leave it invisible,
              hidden by the object itself. */}
          {junctionPoints.map((j, idx) => (
            <Group key={`junc-${idx}`} x={j.x - 75} y={j.y - 75} listening={false}>
              <WireNodeSymbol />
            </Group>
          ))}
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
