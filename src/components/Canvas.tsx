import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Transformer } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject } from '../store';
import { SymbolRenderer } from '../symbols/SymbolRenderer';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { ConnectionService } from '../project/ConnectionService';
import { ConnectionLine } from './ConnectionLine';
import { ObjectLabelRenderer } from './ObjectLabelRenderer';
import { COLOR_ALARM, COLOR_CANVAS_BACKGROUND, COLOR_OUTLINE, COLOR_WATER, COLOR_WHITE } from '../theme/ScadaTheme';
import { WireNodeSymbol } from '../symbols/scada/WireNodeSymbol';
import { getBusbarEdgePorts } from '../symbols/scada/BusbarSymbol';
import { getBoundaryPointWidth, getBoundaryPortFraction } from '../symbols/scada/BoundaryPointSymbol';
import { getLabelFrameSize } from '../symbols/scada/LabelFrameSymbol';
import { snapValue } from '../utils/GridSnap';
import { resolveConnectionPoint, getAbsolutePortPosition } from '../utils/GeometryUtils';

// Momentary Alt-key bypass for grid snapping. Deliberately outside React
// state: every ObjectNode's drag handlers need the CURRENT key state at
// the instant a drag ends, not a value captured in a stale closure or
// re-rendered prop, and a keypress should never trigger a re-render of
// the whole canvas by itself.
let isAltPressed = false;




const ObjectNode = ({ obj, isSelected, onSelect, onChange, onPortClick, onPortMouseDown, onPortMouseUp, wireDragStart, gridSize }: {
  gridSize: number,
  obj: SynopticObject,
  isSelected: boolean,
  onSelect: () => void,
  onChange: (newAttrs: Partial<SynopticObject>) => void,
  onPortClick: (objId: string, portId: string) => void,
  onPortMouseDown: (objId: string, portId: string, e: any) => void,
  onPortMouseUp: (objId: string, portId: string, e: any) => void,
  wireDragStart: any
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

  const def = getSymbolDefinition(obj.type);

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
        onMouseUp={(e) => {
          if (def?.supportsDynamicPorts) {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (pos) {
              const stageScale = stage?.scaleX() || 1;
              const offsetX = stage?.x() || 0;
              const offsetY = stage?.y() || 0;

              const globalX = (pos.x - offsetX) / stageScale;
              const globalY = (pos.y - offsetY) / stageScale;

              // Calculate relative click percentage
              const localX = globalX - obj.x;
              const localY = globalY - obj.y;

              // Use the object's own current width/height, not the symbol
              // definition's static default - a resizable busbar's actual
              // size can differ from it.
              const w = obj.width * (obj.scaleX || 1);
              const h = obj.height * (obj.scaleY || 1);

              // In Canvas, object origin is top-left in our bounding box.
              // So if w >= h (horizontal), percentage is localX / w.
              let busPos = 0.5;
              if (w >= h) {
                busPos = localX / w;
              } else {
                busPos = localY / h;
              }
              busPos = Math.max(0, Math.min(1, busPos));
              const posPercent = Math.round(busPos * 100);

              // Both busbars (scada.busbar and, since the usterka-1 fix,
              // electrical.busbar too - every def.supportsDynamicPorts
              // symbol today is one of these two) have ports along BOTH
              // their top and bottom edges, not just a single center row -
              // pick the edge closer to where the user clicked. The
              // legacy unprefixed dyn_NN center-row format is still
              // resolved for backward compatibility (resolveConnectionPoint),
              // it just is not generated for new connections any more.
              const dynamicPortId = `dyn_${localY < h / 2 ? 'top' : 'bot'}_${posPercent}`;
              onPortMouseUp(obj.id, dynamicPortId, e);
            }
          }
        }}
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

          if (def?.supportsDynamicPorts) {
            // A busbar's width field is the single source of truth for
            // its size (the dynamic-port math keys on it directly) - fold
            // the drag-resize scale into width instead of leaving it as a
            // separate multiplier, and reset scale to 1 so it stays that
            // way. Goes through resizeBusbar so already-attached
            // connections are reattached/reported exactly as a
            // Properties-field width edit would.
            onChange({
              x: snapValue(node.x(), gridSize, isAltPressed),
              y: snapValue(node.y(), gridSize, isAltPressed),
              scaleX: 1,
              scaleY: 1,
            });
            useStore.getState().resizeBusbar(obj.id, obj.width * scaleX);
            node.scaleX(1);
            node.scaleY(1);
            return;
          }

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

        {/* Render Connection Points if Selected */}
        {(isSelected || isHovered || wireDragStart) && def?.connectionPoints?.map((cp, idx) => (
           <Circle
             key={`cp-${idx}`}
             x={cp.x * obj.width}
             y={cp.y * obj.height}
             radius={wireDragStart ? 6 : 4}
             fill={wireDragStart ? COLOR_ALARM : COLOR_WATER}
             stroke={COLOR_OUTLINE}
             strokeWidth={1}
             hitStrokeWidth={15}
             onMouseEnter={(e: any) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'crosshair';
                e.target.scale({ x: 1.5, y: 1.5 });
                e.target.getLayer()?.batchDraw();
             }}
             onMouseLeave={(e: any) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
                e.target.scale({ x: 1, y: 1 });
                e.target.getLayer()?.batchDraw();
             }}
             onClick={(e) => {
                 e.cancelBubble = true;
                 onPortClick(obj.id, cp.id);
               }}
               onTap={(e) => {
                 e.cancelBubble = true;
                 onPortClick(obj.id, cp.id);
               }}
               onMouseDown={(e) => {
                 e.cancelBubble = true;
                 onPortMouseDown(obj.id, cp.id, e);
               }}
               onMouseUp={(e) => {
                 e.cancelBubble = true;
                 onPortMouseUp(obj.id, cp.id, e);
               }}
           />
        ))}

        {/* Busbar (scada.busbar and electrical.busbar - any
            def.supportsDynamicPorts symbol, all of which are busbars
            today): ports along both edges, shown only on hover (or while
            a wire is being dragged) - visible at all times, it would read
            as a comb rather than a busbar. Height comes from the object's
            own current height, not a constant borrowed from the other
            busbar's fixed size. */}
        {def?.supportsDynamicPorts && (isHovered || wireDragStart) && [
          ...getBusbarEdgePorts(obj.width, 'top', obj.height).map((p, idx) => ({ ...p, key: `bus-top-${idx}`, portId: `dyn_top_${Math.round((p.x / Math.max(obj.width, 1)) * 100)}` })),
          ...getBusbarEdgePorts(obj.width, 'bottom', obj.height).map((p, idx) => ({ ...p, key: `bus-bot-${idx}`, portId: `dyn_bot_${Math.round((p.x / Math.max(obj.width, 1)) * 100)}` }))
        ].map(p => (
          <Circle
            key={p.key}
            x={p.x}
            y={p.y}
            radius={4}
            fill={COLOR_WHITE}
            stroke={COLOR_OUTLINE}
            strokeWidth={1.5}
            hitStrokeWidth={12}
            onMouseDown={(e) => { e.cancelBubble = true; onPortMouseDown(obj.id, p.portId, e); }}
            onMouseUp={(e) => { e.cancelBubble = true; onPortMouseUp(obj.id, p.portId, e); }}
            onClick={(e) => { e.cancelBubble = true; onPortClick(obj.id, p.portId); }}
            onTap={(e) => { e.cancelBubble = true; onPortClick(obj.id, p.portId); }}
          />
        ))}

        {/* Boundary point (scada.boundary_point): exactly one port, on
            whichever side boundaryPortSide names - shown only on hover
            (or while a wire is being dragged), same convention as every
            other port on the canvas. Position uses the same
            label/sublabel-driven width and portSide fraction the symbol
            itself renders with (BoundaryPointSymbol), not obj.width, so
            the hit target always lands exactly on the drawn port. */}
        {obj.type === 'scada.boundary_point' && (isHovered || wireDragStart) && (() => {
          const bpWidth = getBoundaryPointWidth(obj.designation || obj.name || 'LABEL', obj.description || obj.text || '');
          const { height: bpHeight } = getLabelFrameSize(obj.designation || obj.name || 'LABEL', obj.description || obj.text || '');
          const side = obj.boundaryPortSide === 'BOTTOM' || obj.boundaryPortSide === 'LEFT' || obj.boundaryPortSide === 'RIGHT' ? obj.boundaryPortSide : 'TOP';
          const { x: fx, y: fy } = getBoundaryPortFraction(side);
          return (
            <Circle
              x={fx * bpWidth}
              y={fy * bpHeight}
              radius={wireDragStart ? 6 : 4}
              fill={wireDragStart ? COLOR_ALARM : COLOR_WATER}
              stroke={COLOR_OUTLINE}
              strokeWidth={1}
              hitStrokeWidth={15}
              onMouseDown={(e) => { e.cancelBubble = true; onPortMouseDown(obj.id, 'PORT', e); }}
              onMouseUp={(e) => { e.cancelBubble = true; onPortMouseUp(obj.id, 'PORT', e); }}
              onClick={(e) => { e.cancelBubble = true; onPortClick(obj.id, 'PORT'); }}
              onTap={(e) => { e.cancelBubble = true; onPortClick(obj.id, 'PORT'); }}
            />
          );
        })()}
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
        />
      )}
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

  // Connection Drawing
  const [drawStartPort, setDrawStartPort] = useState<{objId: string, portId: string} | null>(null);
  const [wireDragStart, setWireDragStart] = useState<{objId: string, portId: string} | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Grid-snap Alt bypass: tracked once, globally, for the whole canvas -
  // not local React state, since a keypress must never re-render every
  // object on the canvas just to update a modifier flag.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt') isAltPressed = true; };
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
    if (wireDragStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setMousePos({
           x: (pos.x - canvasState.panX) / canvasState.zoom,
           y: (pos.y - canvasState.panY) / canvasState.zoom
        });
      }
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

    if (useStore.getState().isDrawingConnection) {
      selectionStartRef.current = null;
      setSelectionBox(null);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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

  const {
    connections,
    selectedConnectionIds,
    selectConnections,
    isDrawingConnection,
    setDrawingMode,
  } = useStore();

  const handlePortMouseDown = (objId: string, portId: string, _e: any) => {
    setWireDragStart({ objId, portId });
  };
  const handlePortMouseUp = (objId: string, portId: string, _e: any) => {
    if (wireDragStart && wireDragStart.objId !== objId) {
      const success = ConnectionService.tryCreateConnection(
        wireDragStart.objId,
        wireDragStart.portId,
        objId,
        portId
      );
      if (success) {
        setDrawingMode(false);
      }
    }
    setWireDragStart(null);
  };
  const handlePortClick = (objId: string, portId: string) => {
    if (!isDrawingConnection) return;

    if (!drawStartPort) {
      setDrawStartPort({ objId, portId });
      useStore.getState().addMessage(`[INFO] Connection started from ${objId}:${portId}`);
    } else {
      if (drawStartPort.objId !== objId) {
        const success = ConnectionService.tryCreateConnection(
          drawStartPort.objId, drawStartPort.portId,
          objId, portId
        );
        if (success) {
          useStore.getState().addMessage(`[INFO] Connection created`);
        } else {
          useStore.getState().addMessage(`[WARN] Connection failed (invalid rules)`);
        }
      }
      setDrawStartPort(null);
      setDrawingMode(false);
    }
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
        style={{ cursor: selectionStartRef.current ? 'crosshair' : 'default' }}
      >
        <Layer>
          <Rect x={0} y={0} width={useStore.getState().canvasConfig.width} height={useStore.getState().canvasConfig.height} fill={useStore.getState().canvasConfig.background} />
          <Rect x={0} y={0} width={canvasConfig.width || 1920} height={canvasConfig.height || 1080} fill={canvasConfig.background || COLOR_CANVAS_BACKGROUND} />
          {drawGrid()}
        </Layer>
        <Layer>
          {connections.map(conn => (
            <ConnectionLine
              key={conn.id}
              conn={conn}
              fromObj={objects.find(o => o.id === conn.fromId)}
              toObj={objects.find(o => o.id === conn.toId)}
              isSelected={selectedConnectionIds.includes(conn.id)}
              onSelect={() => selectConnections([conn.id], false)}
            />
          ))}
          {wireDragStart && (() => {
            const fromObj = objects.find(o => o.id === wireDragStart.objId);
            if (!fromObj) return null;
            return (
              <ConnectionLine
                key="drawing-wire"
                conn={{
                  id: 'temp',
                  fromId: wireDragStart.objId,
                  fromPort: wireDragStart.portId,
                  toId: 'cursor',
                  toPort: 'cursor',
                  type: 'preview'
                }}
                fromObj={fromObj}
                toObj={{...fromObj, width: 0, height: 0, x: mousePos.x, y: mousePos.y, rotation: 0} as any}
                isSelected={false}
                onSelect={() => {}}
              />
            );
          })()}
          {[...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObjects([obj.id], false)}
              onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
              onPortClick={handlePortClick}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
              wireDragStart={wireDragStart}
              gridSize={gridSize}
            />
          ))}
          {/* Topology Junctions: a wire node (from the SCADA library)
              wherever three or more conductors meet at the same port.
              Rendered AFTER (on top of) every object, not before - a
              junction lands exactly at a port, which is routinely right
              at (or inside) the object's own drawn shape, and painting
              it underneath left it invisible, hidden by the object
              itself. (This used to be two near-identical copies of the
              same block, one of them missing dyn_ port support -
              collapsed into one, keeping the more complete version.) */}
          {(() => {
             const junctions: {x: number, y: number}[] = [];
             const pointMap = new Map<string, number>();

             connections.forEach(c => {
                 const key1 = `${c.fromId}:${c.fromPort}`;
                 const key2 = `${c.toId}:${c.toPort}`;
                 pointMap.set(key1, (pointMap.get(key1) || 0) + 1);
                 pointMap.set(key2, (pointMap.get(key2) || 0) + 1);
             });

             pointMap.forEach((count, key) => {
                 if (count > 2) { // 3 or more wires meeting at a port is definitely a junction
                     const [objId, portId] = key.split(':');
                     const obj = objects.find(o => o.id === objId);
                     if (obj) {
                         // Bug fix (usterka: port accepts more than one wire):
                         // this used to reimplement port resolution by hand,
                         // with only a crude dyn_NN fallback - it silently
                         // mispositioned (or skipped entirely) the junction
                         // dot for the SCADA busbar's dyn_top_NN/dyn_bot_NN
                         // ports and for the boundary point's PORT id, both
                         // of which multi-wire ports now routinely use.
                         // resolveConnectionPoint/getAbsolutePortPosition are
                         // the one shared, already-correct implementation
                         // every other port position on the canvas goes
                         // through - reused here instead of a second copy.
                         const port = resolveConnectionPoint(obj, portId);
                         if (port) {
                             junctions.push(getAbsolutePortPosition(obj, port));
                         }
                     }
                 }
             });
             // WireNodeSymbol draws itself centered on its own local (75,75) -
             // offset the wrapping Group so that point lands on the junction.
             return junctions.map((j, idx) => (
               <Group key={`junc-${idx}`} x={j.x - 75} y={j.y - 75} listening={false}>
                 <WireNodeSymbol />
               </Group>
             ));
          })()}
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
