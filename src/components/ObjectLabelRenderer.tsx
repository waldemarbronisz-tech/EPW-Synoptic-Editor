import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Group, Rect, Text } from 'react-konva';
import { useStore } from '../store';
import type { SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { COLOR_OUTLINE, COLOR_WHITE } from '../theme/ScadaTheme';

interface ObjectLabelRendererProps {
  obj: SynopticObject;
  onChange: (newAttrs: Partial<SynopticObject>) => void;
}

const PRIMARY_FONT_SIZE = 12;
const SECONDARY_FONT_SIZE = 9;
const PADDING_X = 4;
const PADDING_Y = 2;
const LINE_GAP = 1;

/** No real canvas font metrics at layout time - a character-count estimate, same technique as LabelFrameSymbol. */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * The label's actual text content, kept as a standalone pure function so
 * it is testable without rendering Konva. Primary line: designation,
 * falling back to the object's own id - NEVER the type identifier (e.g.
 * 'electrical.rcd') and never the auto-generated, type-derived tag
 * either. Secondary line: name, shown only when toggled on.
 */
// oxlint-disable-next-line react/only-export-components -- kept beside the component it belongs to, for testability without rendering Konva.
export function resolveObjectLabelText(obj: SynopticObject): { primary: string; secondary: string } {
  const showDesignation = obj.showDesignation !== false;
  const showName = obj.showName !== false;
  return {
    primary: showDesignation ? (obj.designation || obj.id) : '',
    secondary: showName ? (obj.name || '') : ''
  };
}

export const ObjectLabelRenderer: React.FC<ObjectLabelRendererProps> = ({ obj, onChange }) => {
  const groupRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const [editPos, setEditPos] = useState<{ x: number; y: number; width: number } | null>(null);

  const def = getSymbolDefinition(obj.type);
  if (!def || def.isLine || obj.type.startsWith('graphics.') || obj.type.startsWith('measurements.')) {
    return null;
  }

  const showDesignation = obj.showDesignation !== false;
  const showName = obj.showName !== false;

  if (!showDesignation && !showName) return null;

  const { primary: primaryText, secondary: secondaryText } = resolveObjectLabelText(obj);

  if (!primaryText && !secondaryText) return null;

  const w = def.defaultWidth || 80;
  const h = def.defaultHeight || 80;

  let baseX = 0;
  let baseY = 0;
  let align: 'left' | 'center' | 'right' = 'center';
  const margin = 10;

  const pos = obj.labelPosition || 'BOTTOM';

  if (pos === 'TOP') {
    baseX = -w;
    baseY = -h / 2 - margin - 20;
    align = 'center';
  } else if (pos === 'BOTTOM') {
    baseX = -w;
    baseY = h / 2 + margin;
    align = 'center';
  } else if (pos === 'LEFT') {
    baseX = -w - 80 - margin;
    baseY = -10;
    align = 'right';
  } else if (pos === 'RIGHT') {
    baseX = w / 2 + margin;
    baseY = -10;
    align = 'left';
  }

  const counterRot = -(obj.rotation || 0);
  const boxWidth = pos === 'LEFT' || pos === 'RIGHT' ? 80 : w * 2;

  const primaryWidth = primaryText ? estimateTextWidth(primaryText, PRIMARY_FONT_SIZE) : 0;
  const secondaryWidth = secondaryText ? estimateTextWidth(secondaryText, SECONDARY_FONT_SIZE) : 0;
  const bgWidth = Math.min(boxWidth, Math.max(primaryWidth, secondaryWidth) + PADDING_X * 2);
  const bgHeight =
    PADDING_Y * 2 +
    (primaryText ? PRIMARY_FONT_SIZE : 0) +
    (primaryText && secondaryText ? LINE_GAP : 0) +
    (secondaryText ? SECONDARY_FONT_SIZE : 0);

  const commitEdit = (value: string) => {
    setEditPos(null);
    onChange({ designation: value });
    useStore.getState().saveHistory();
  };

  const startEditing = (e: any) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    const node = groupRef.current;
    if (!stage || !node) return;

    const rect = node.getClientRect({ relativeTo: stage });
    const containerRect = stage.container().getBoundingClientRect();

    setEditPos({
      x: containerRect.left + rect.x,
      y: containerRect.top + rect.y,
      width: Math.max(rect.width, 60)
    });
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={obj.labelOffsetX !== undefined ? obj.labelOffsetX : baseX}
        y={obj.labelOffsetY !== undefined ? obj.labelOffsetY : baseY}
        rotation={counterRot}
        draggable
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          onChange({
            labelOffsetX: e.target.x(),
            labelOffsetY: e.target.y()
          });
          // Repositioning the label is a completed user action - commit it
          // as its own single history entry.
          useStore.getState().saveHistory();
        }}
        onClick={(e) => {
          e.cancelBubble = true;
        }}
        onDblClick={startEditing}
        onDblTap={startEditing}
      >
        {/* Light background with a 1px black outline, so the label reads
            against any background it happens to sit over. */}
        <Rect
          x={align === 'right' ? boxWidth - bgWidth : align === 'center' ? (boxWidth - bgWidth) / 2 : 0}
          y={0}
          width={bgWidth}
          height={bgHeight}
          fill={COLOR_WHITE}
          stroke={COLOR_OUTLINE}
          strokeWidth={1}
        />
        {primaryText && (
          <Text
            x={0}
            y={PADDING_Y}
            width={boxWidth}
            text={primaryText}
            align={align}
            fontSize={PRIMARY_FONT_SIZE}
            fontStyle="bold"
            fill={COLOR_OUTLINE}
          />
        )}
        {secondaryText && (
          <Text
            x={0}
            y={PADDING_Y + (primaryText ? PRIMARY_FONT_SIZE + LINE_GAP : 0)}
            width={boxWidth}
            text={secondaryText}
            align={align}
            fontSize={SECONDARY_FONT_SIZE}
            fill={COLOR_OUTLINE}
          />
        )}
      </Group>

      {editPos && createPortal(
        <input
          type="text"
          defaultValue={obj.designation || ''}
          autoFocus
          style={{
            position: 'fixed',
            left: editPos.x,
            top: editPos.y,
            width: editPos.width,
            zIndex: 10000,
            fontWeight: 'bold',
            fontSize: PRIMARY_FONT_SIZE,
            border: `1px solid ${COLOR_OUTLINE}`,
            background: COLOR_WHITE,
            color: COLOR_OUTLINE,
            padding: '1px 2px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitEdit((e.target as HTMLInputElement).value);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelledRef.current = true;
              setEditPos(null);
            }
          }}
          onBlur={(e) => {
            if (cancelledRef.current) {
              cancelledRef.current = false;
              return;
            }
            commitEdit(e.target.value);
          }}
        />,
        document.body
      )}
    </>
  );
};
