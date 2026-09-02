// Konva rendering for the meter element (feat/meter-element, part A -
// panel/title/rows; part B - resolving a device-linked row's label/
// unit/format/preview value, and reporting a dangling device
// reference). Deliberately its own component, not a case inside
// SymbolRenderer.tsx - a meter is not a symbol (see MeterElement.ts's
// own header comment).

import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type { MeterElement } from '../meter/MeterElement';
import { computeMeterHeight } from '../meter/MeterElement';
import { resolveMeterRow, getMeterDanglingRows } from '../meter/MeterResolver';
import type { Device } from '../project/DeviceSchema';
import { useStore } from '../store';
import { COLOR_PANEL, COLOR_OUTLINE, COLOR_VALUE_FIELD, COLOR_TEXT, COLOR_DE_ENERGIZED, COLOR_ALARM, COLOR_WHITE } from '../theme/ScadaTheme';

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
  devices: Device[];
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  // feat/editing-and-signal-panel commit 2: Alt+drag leaves a copy
  // behind at this exact spot the instant the drag starts - optional
  // so existing callers/tests that only care about selection/move stay
  // unaffected.
  onDragStart?: () => void;
}

// Preview values (the middle of a device's own range - not a live
// reading) draw in a visibly different shade than a manually-entered
// value, so it never reads as real data for even a second - reusing
// the existing "de-energized/inactive" gray rather than inventing a
// new color, same as GRANICE requires (every color from ScadaTheme).
// A dangling device reference draws in the alarm color: this is the
// one case worth the user's attention, even though the element still
// renders normally around it.
function colorForRow(colorKind: 'NORMAL' | 'PREVIEW' | 'MISSING'): string {
  if (colorKind === 'PREVIEW') return COLOR_DE_ENERGIZED;
  if (colorKind === 'MISSING') return COLOR_ALARM;
  return COLOR_TEXT;
}

export const MeterElementNode: React.FC<MeterElementNodeProps> = ({ meter, devices, isSelected, onSelect, onDragEnd, onDragStart }) => {
  const fontSize = meter.fontSize || 12;
  const height = computeMeterHeight(meter);
  const hasTitle = !!meter.title;
  const rowHeight = fontSize * ROW_HEIGHT_FACTOR;
  const titleBlockHeight = hasTitle ? fontSize * TITLE_HEIGHT_FACTOR + TITLE_DIVIDER_GAP : 0;
  const valueFieldWidth = meter.width * VALUE_FIELD_WIDTH_FRACTION;
  const valueFieldX = meter.width - PADDING_X - valueFieldWidth;

  // A dangling row is not a hard error - the meter still draws - but
  // the user should hear about it once, not on every re-render. Fired
  // from an effect (never during render itself), keyed on a signature
  // of the current dangling set so it only fires again when that set
  // actually changes (a fresh device list load, a row's device field
  // edited, etc.), not on every unrelated re-render.
  const danglingSignatureRef = useRef<string>('');
  useEffect(() => {
    const issues = getMeterDanglingRows(meter, devices);
    const signature = issues.map(i => `${i.rowIndex}:${i.deviceId}`).join(',');
    if (signature === danglingSignatureRef.current) return;
    danglingSignatureRef.current = signature;
    const meterName = meter.title || meter.id;
    issues.forEach(issue => {
      useStore.getState().addMessage(
        `[WARNING] Meter "${meterName}", row ${issue.rowIndex + 1}: device "${issue.deviceId}" not found`
      );
    });
  }, [meter, devices]);

  return (
    <Group
      x={meter.x}
      y={meter.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onDragStart?.()}
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
        const display = resolveMeterRow(row, devices);

        return (
          <Group key={i}>
            <Text
              x={PADDING_X}
              y={rowY + (rowHeight - fontSize) / 2}
              width={valueFieldX - PADDING_X}
              text={display.label}
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
              text={display.valueText}
              fontSize={fontSize}
              fontFamily={MONOSPACE_FONT}
              align="right"
              fill={colorForRow(display.colorKind)}
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
