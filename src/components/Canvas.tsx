import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Transformer, Text } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject } from '../store';
import { SymbolRenderer } from '../symbols/SymbolRenderer';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { ConnectionLine } from './ConnectionLine';
import { ObjectLabelRenderer } from './ObjectLabelRenderer';


const GRID_SIZE = 20;

const ObjectNode = ({ obj, isSelected, onSelect, onChange, onPortClick, onPortMouseDown, onPortMouseUp }: {
  obj: SynopticObject,
  isSelected: boolean,
  onSelect: () => void,
  onChange: (newAttrs: Partial<SynopticObject>) => void,
  onPortClick: (objId: string, portId: string) => void,
  onPortMouseDown: (objId: string, portId: string, e: any) => void,
  onPortMouseUp: (objId: string, portId: string, e: any) => void
}) => {
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
          e.target.x(Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE);
          e.target.y(Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE);
        }}
        onDragEnd={(e) => {
          // Push final position to store history once
          onChange({
            x: Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE,
            y: Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE,
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          onChange({
            x: Math.round(node.x() / GRID_SIZE) * GRID_SIZE,
            y: Math.round(node.y() / GRID_SIZE) * GRID_SIZE,
            rotation: node.rotation(),
            scaleX: Math.max(0.1, scaleX),
            scaleY: Math.max(0.1, scaleY),
          });
        }}
      >
        <SymbolRenderer obj={obj} />
        <ObjectLabelRenderer obj={obj} onChange={onChange} />

        {/* Render Designation/Name Label */}
        {(!obj.type.startsWith('graphics.') && !obj.type.startsWith('measurements.') && !def?.isLine) && (
          <Text
            x={0}
            y={obj.height + 5}
            width={obj.width}
            text={obj.designation || obj.name || obj.tag}
            align="center"
            fontSize={12}
            fontFamily="monospace"
            fill="#2c3e50"
          />
        )}

        {/* Render Connection Points if Selected */}
        {isSelected && def?.connectionPoints?.map((cp, idx) => (
           <Circle
             key={`cp-${idx}`}
             x={cp.x * obj.width}
             y={cp.y * obj.height}
             radius={4}
             fill="#3498db"
             stroke="#2980b9"
             strokeWidth={1}
             shadowColor="rgba(0,0,0,0.5)"
             shadowBlur={2}
             hitStrokeWidth={10}
             onMouseEnter={(e: any) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'crosshair';
             }}
             onMouseLeave={(e: any) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
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
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;

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
      animation: '',
      alarm: '',
      runtimeVariable: '',
      logicConnection: '',
      tooltip: '',
      customProperties: {}
    });
  };

  // Draw Grid
  const drawGrid = () => {
    const lines = [];
    const width = 5000;
    const height = 5000;

    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(
        <Rect
          key={`v${i}`}
          x={i * GRID_SIZE}
          y={0}
          width={1}
          height={height}
          fill="rgba(0, 0, 0, 0.1)" /* subtle retro engineering grid */
          name="grid"
        />
      );
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(
        <Rect
          key={`h${j}`}
          x={0}
          y={j * GRID_SIZE}
          width={width}
          height={1}
          fill="rgba(0, 0, 0, 0.1)"
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
    drawingConnectionType,
    setDrawingMode,
    addConnection
  } = useStore();

  const handlePortMouseDown = (objId: string, portId: string, _e: any) => {
    setWireDragStart({ objId, portId });
  };
  const handlePortMouseUp = (objId: string, portId: string, _e: any) => {
    if (wireDragStart && wireDragStart.objId !== objId) {

      const fromObj = objects.find(o => o.id === wireDragStart.objId);
      const toObj = objects.find(o => o.id === objId);
      const fromDef = fromObj ? getSymbolDefinition(fromObj.type) : null;
      const toDef = toObj ? getSymbolDefinition(toObj.type) : null;
      const fromPort = fromDef?.connectionPoints?.find(p => p.id === wireDragStart.portId);
      const toPort = toDef?.connectionPoints?.find(p => p.id === portId);

      let inferredType = 'electrical_ac';
      if (fromPort && toPort) {
         if (fromPort.domain !== toPort.domain && fromPort.domain && toPort.domain) {
            useStore.getState().addMessage(`[ERROR] Incompatible connection: ${fromPort.domain} -> ${toPort.domain}`);
            setWireDragStart(null);
            return;
         }
         if (fromPort.domain === 'water') inferredType = 'water';
         else if (fromPort.domain === 'hvac') inferredType = 'hvac_air';
         else if (fromPort.domain === 'data' || fromPort.domain === 'control') inferredType = 'data';
         else inferredType = 'electrical_ac'; // default
      }

      addConnection({
        fromId: wireDragStart.objId,
        fromPort: wireDragStart.portId,
        toId: objId,
        toPort: portId,
        type: inferredType
      });
      useStore.getState().addMessage(`[INFO] Connected ${wireDragStart.objId}:${wireDragStart.portId} to ${objId}:${portId}`);
      setDrawingMode(false, 'electrical_ac');
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
        addConnection({
          fromId: drawStartPort.objId,
          fromPort: drawStartPort.portId,
          toId: objId,
          toPort: portId,
          type: drawingConnectionType,
          editor: { preview_state: 'DEENERGIZED' } // Default state
        });
        useStore.getState().addMessage(`[INFO] Connection created`);
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
                  type: drawingConnectionType || 'electrical_ac'
                }}
                fromObj={fromObj}
                toObj={{...fromObj, width: 0, height: 0, x: mousePos.x, y: mousePos.y, rotation: 0} as any}
                isSelected={false}
                onSelect={() => {}}
              />
            );
          })()}
          {objects.map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObjects([obj.id], false)}
              onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
              onPortClick={handlePortClick}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
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
