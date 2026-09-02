// Konva rendering for the meter element (feat/meter-element, part A).
// Deliberately its own component, not a case inside SymbolRenderer.tsx -
// a meter is not a symbol (see MeterElement.ts's own header comment).

import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type { MeterElement } from '../meter/MeterElement';
import { computeMeterHeight, formatManualRowValue } from '../meter/MeterElement';
import { COLOR_PANEL, COLOR_OUTLINE, COLOR_VALUE_FIELD, COLOR_TEXT, COLOR_WHITE } from '../theme/ScadaTheme';

// Dimension literals local to this element, same convention every other
// scada/ symbol already follows (ScadaTheme.ts holds colors and the
// four grid-derived conductor/symbol constants - a component's own
// layout dimensions are its own business, per that file's own header
// comment: "A symbol may still use its own literal numbers for
// dimensions and outline widths the task gave it explicitly").
const PANEL_OUTLINE_WIDTH = 4;
const VALUE_FIELD_OUTLINE_WIDTH = 2;
const PADDING_X = 10;
const PADDING_Y = 10;
const ROW_HEIGHT_FACTOR = 2;       // kept in lockstep with MeterElement.ts's own
const TITLE_HEIGHT_FACTOR = 1.5;   // ROW_HEIGHT_FACTOR/TITLE_HEIGHT_FACTOR - see below
const TITLE_DIVIDER_GAP = 6;
const VALUE_FIELD_WIDTH_FRACTION = 0.42; // how much of the row's width the value field claims
const VALUE_FIELD_INSET_Y = 3;
const MONOSPACE_FONT = 'Consolas, "Courier New", monospace'; // fixed character width, per this element's own spec

export interface MeterElementNodeProps {
  meter: MeterElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}

export const MeterElementNode: React.FC<MeterElementNodeProps> = ({ meter, isSelected, onSelect, onDragEnd }) => {
  const fontSize = meter.fontSize || 12;
  const height = computeMeterHeight(meter);
  const hasTitle = !!meter.title;
  const rowHeight = fontSize * ROW_HEIGHT_FACTOR;
  const titleBlockHeight = hasTitle ? fontSize * TITLE_HEIGHT_FACTOR + TITLE_DIVIDER_GAP : 0;
  const valueFieldWidth = meter.width * VALUE_FIELD_WIDTH_FRACTION;
  const valueFieldX = meter.width - PADDING_X - valueFieldWidth;

  return (
    <Group
      x={meter.x}
      y={meter.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <Rect width={meter.width} height={height} fill={COLOR_PANEL} stroke={COLOR_OUTLINE} strokeWidth={PANEL_OUTLINE_WIDTH} />

      {hasTitle && (
        <>
          <Text
            x={PADDING_X}
            y={PADDING_Y}
            width={meter.width - PADDING_X * 2}
            text={meter.title}
            fontSize={fontSize}
            fontStyle="bold"
            align="center"
            fill={COLOR_TEXT}
          />
          <Line
            points={[0, PADDING_Y + titleBlockHeight - TITLE_DIVIDER_GAP / 2, meter.width, PADDING_Y + titleBlockHeight - TITLE_DIVIDER_GAP / 2]}
            stroke={COLOR_OUTLINE}
            strokeWidth={1}
          />
        </>
      )}

      {meter.rows.map((row, i) => {
        const rowY = PADDING_Y + titleBlockHeight + i * rowHeight;
        // Part A: a device-linked row's value is Part B's job - blank
        // for now (an empty value field, not an exception) until
        // MeterResolver.ts lands. A manual row already shows its own
        // "value unit" text right away.
        const label = row.label;
        const valueText = row.device ? '' : formatManualRowValue(row);

        return (
          <Group key={i}>
            <Text
              x={PADDING_X}
              y={rowY + (rowHeight - fontSize) / 2}
              width={valueFieldX - PADDING_X}
              text={label}
              fontSize={fontSize}
              fill={COLOR_TEXT}
              ellipsis
              wrap="none"
            />
            <Rect
              x={valueFieldX}
              y={rowY + VALUE_FIELD_INSET_Y}
              width={valueFieldWidth}
              height={rowHeight - VALUE_FIELD_INSET_Y * 2}
              fill={COLOR_VALUE_FIELD}
              stroke={COLOR_OUTLINE}
              strokeWidth={VALUE_FIELD_OUTLINE_WIDTH}
            />
            <Text
              x={valueFieldX}
              y={rowY + (rowHeight - fontSize) / 2}
              width={valueFieldWidth - 6}
              text={valueText}
              fontSize={fontSize}
              fontFamily={MONOSPACE_FONT}
              align="right"
              fill={COLOR_TEXT}
            />
          </Group>
        );
      })}

      {isSelected && (
        <Rect
          width={meter.width}
          height={height}
          stroke={COLOR_WHITE}
          strokeWidth={2}
          dash={[6, 4]}
          fill="transparent"
          listening={false}
        />
      )}
    </Group>
  );
};
