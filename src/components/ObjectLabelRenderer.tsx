import React from 'react';
import { Group, Text } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

interface ObjectLabelRendererProps {
  obj: SynopticObject;
  onChange: (newAttrs: Partial<SynopticObject>) => void;
}

export const ObjectLabelRenderer: React.FC<ObjectLabelRendererProps> = ({ obj, onChange }) => {
  const def = getSymbolDefinition(obj.type);
  if (!def || def.isLine || obj.type.startsWith('graphics.') || obj.type.startsWith('measurements.')) {
    return null;
  }

  const showDesignation = obj.showDesignation !== false;
  const showName = obj.showName !== false;

  if (!showDesignation && !showName) return null;

  let labelLines = [];
  if (showDesignation && obj.designation) labelLines.push(obj.designation);
  if (showName && obj.name) labelLines.push(obj.name);
  const textContent = labelLines.length > 0 ? labelLines.join('\n') : (obj.tag || '');

  if (!textContent) return null;

  const w = def.defaultWidth || 80;
  const h = def.defaultHeight || 80;

  // Base positions
  let baseX = 0;
  let baseY = 0;
  let align: 'left' | 'center' | 'right' = 'center';
  const margin = 10;

  // We place the text relative to the center of the object bounds because the object's origin is now its center.
  // Wait, the object's container origin is (obj.x + w/2, obj.y + h/2).
  // Inside the container, the object graphics go from -w/2 to w/2.

  const pos = obj.labelPosition || 'BOTTOM';

  if (pos === 'TOP') {
    baseX = -w;
    baseY = -h/2 - margin - 20; // estimate height
    align = 'center';
  } else if (pos === 'BOTTOM') {
    baseX = -w;
    baseY = h/2 + margin;
    align = 'center';
  } else if (pos === 'LEFT') {
    baseX = -w - 80 - margin; // give it some width
    baseY = -10;
    align = 'right';
  } else if (pos === 'RIGHT') {
    baseX = w/2 + margin;
    baseY = -10;
    align = 'left';
  }

  const counterRot = -(obj.rotation || 0);

  return (
    <Group
      x={obj.labelOffsetX !== undefined ? obj.labelOffsetX : baseX}
      y={obj.labelOffsetY !== undefined ? obj.labelOffsetY : baseY}
      rotation={counterRot}
      draggable
      onDragStart={(e) => {
        if (!e.evt.shiftKey) {
          e.target.stopDrag();
        } else {
          e.cancelBubble = true;
        }
      }}
      onDragMove={(e) => {
        if (e.evt.shiftKey) {
          e.cancelBubble = true;
        }
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (e.evt.shiftKey) {
          onChange({
            labelOffsetX: e.target.x(),
            labelOffsetY: e.target.y()
          });
          // Repositioning the label is a completed user action - commit it
          // as its own single history entry.
          useStore.getState().saveHistory();
        }
      }}
      onClick={(e) => {
        if (e.evt.shiftKey) e.cancelBubble = true;
      }}
    >
      <Text
        x={0}
        y={0}
        width={pos === 'LEFT' || pos === 'RIGHT' ? 80 : w * 2}
        text={textContent}
        align={align}
        fontSize={10}
        fill="#ecf0f1"
        fontFamily="monospace"
      />
    </Group>
  );
};
