import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Transformer } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject } from '../store';
import { SymbolRenderer } from '../symbols/SymbolRenderer';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { ConnectionService } from '../project/ConnectionService';
import { ConnectionLine } from './ConnectionLine';
import { ObjectLabelRenderer } from './ObjectLabelRenderer';
import { COLOR_OUTLINE } from '../theme/ScadaTheme';
import { WireNodeSymbol } from '../symbols/scada/WireNodeSymbol';




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
          if (def?.type === 'electrical.busbar') {
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

              // In Canvas, object origin is top-left in our bounding box.
              // So if w >= h (horizontal), percentage is localX / w.
              const w = (def?.defaultWidth || 80) * (obj.scaleX || 1);
              const h = (def?.defaultHeight || 80) * (obj.scaleY || 1);

              let busPos = 0.5;
              if (w >= h) {
                busPos = localX / w;
              } else {
                busPos = localY / h;
              }
              busPos = Math.max(0, Math.min(1, busPos));

              const dynamicPortId = `dyn_${Math.round(busPos * 100)}`;
              onPortMouseUp(obj.id, dynamicPortId, e);
            }
          }
        }}
        onDragMove={(e) => {
          // Snap during drag for visual feedback (doesn't mutate store yet)
          e.target.x(Math.round(e.target.x() / gridSize) * gridSize);
          e.target.y(Math.round(e.target.y() / gridSize) * gridSize);
        }}
        onDragEnd={(e) => {
          // Push final position, then commit exactly one history entry for
          // the whole drag (updateObject itself no longer touches history).
          onChange({
            x: Math.round(e.target.x() / gridSize) * gridSize,
            y: Math.round(e.target.y() / gridSize) * gridSize,
          });
          useStore.getState().saveHistory();
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          onChange({
            x: Math.round(node.x() / gridSize) * gridSize,
            y: Math.round(node.y() / gridSize) * gridSize,
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
             fill={wireDragStart ? "#e74c3c" : "#3498db"}
             stroke="#2980b9"
             strokeWidth={1}
             shadowColor="rgba(0,0,0,0.5)"
             shadowBlur={2}
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

    // Snap to grid
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;

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
          <Rect x={0} y={0} width={canvasConfig.width || 1920} height={canvasConfig.height || 1080} fill={canvasConfig.background || "#ffffff"} />
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
                    {/* Topology Junctions: a wire node (from the SCADA library)
                        wherever three or more conductors meet at the same port.
                        (This used to be two near-identical copies of the same
                        block, one of them missing dyn_ port support - collapsed
                        into one, keeping the more complete version.) */}
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
                         const def = getSymbolDefinition(obj.type);
                         const port = def?.connectionPoints?.find(p => p.id === portId) ||
                                      (portId.startsWith('dyn_') ? { x: parseInt(portId.replace('dyn_',''))/100, y: 0.5 } : null); // Simple dyn fallback
                         if (port) {
                             const w = obj.width * (obj.scaleX || 1);
                             const h = obj.height * (obj.scaleY || 1);
                             const cx = (port.x || 0.5) * w - w / 2;
                             const cy = (port.y || 0.5) * h - h / 2;
                             const rot = obj.rotation || 0;
                             const radians = rot * (Math.PI / 180);
                             const rx = cx * Math.cos(radians) - cy * Math.sin(radians);
                             const ry = cx * Math.sin(radians) + cy * Math.cos(radians);
                             junctions.push({ x: obj.x + w / 2 + rx, y: obj.y + h / 2 + ry });
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
          {selectionBox && (
            <Rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(0, 161, 255, 0.3)"
              stroke="#00a1ff"
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
