// Konva rendering for the meter element (feat/meter-element, part A -
// panel/title/rows; part B - resolving a device-linked row's label/
// unit/format/preview value, and reporting a dangling device
// reference). Deliberately its own component, not a case inside
// SymbolRenderer.tsx - a meter is not a symbol (see MeterElement.ts's
// own header comment).

import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { MeterElement } from '../meter/MeterElement';
import { computeMeterHeight } from '../meter/MeterElement';
import { resolveMeterRow, getMeterDanglingRows } from '../meter/MeterResolver';
import type { Device } from '../project/DeviceSchema';
import { useStore } from '../store';
import { PanelChrome, getPanelRowLayout } from './PanelChrome';
import { PANEL_PADDING_X, PANEL_PADDING_Y } from '../elements/PanelLayout';
import { COLOR_OUTLINE, COLOR_VALUE_FIELD, COLOR_TEXT, COLOR_DE_ENERGIZED, COLOR_ALARM } from '../theme/ScadaTheme';

// Dimension literals local to this element, same convention every other
// scada/ symbol already follows (ScadaTheme.ts holds colors and the
// four grid-derived conductor/symbol constants - a component's own
// layout dimensions are its own business, per that file's own header
// comment: "A symbol may still use its own literal numbers for
// dimensions and outline widths the task gave it explicitly"). The
// panel/title/divider dimensions themselves now live in PanelChrome.tsx,
// shared with the signal panel - only what is specific to a VALUE ROW
// (as opposed to a signal panel's diode row) stays here.
const VALUE_FIELD_OUTLINE_WIDTH = 2;
const VALUE_FIELD_WIDTH_FRACTION = 0.42; // how much of the row's width the value field claims
const VALUE_FIELD_INSET_Y = 3;
const MONOSPACE_FONT = 'Consolas, "Courier New", monospace'; // fixed character width, per this element's own spec

export interface MeterElementNodeProps {
  meter: MeterElement;
  devices: Device[];
  // Receives the raw Konva event (onClick={onSelect} forwards it
  // positionally) so the caller can read Shift for multi-select.
  onSelect: (e?: any) => void;
  onDragEnd: (x: number, y: number) => void;
  // feat/editing-and-signal-panel commit 2: Alt+drag leaves a copy
  // behind at this exact spot the instant the drag starts - optional
  // so existing callers/tests that only care about selection/move stay
  // unaffected.
  onDragStart?: () => void;
}
// commit 5 (drawing layers): isSelected/the dashed selection outline
// used to live here, drawn as the last child of this meter's own
// Group - which only ever put it above THIS meter's own drawing, not
// necessarily above a later-drawn meter or symbol. It is now drawn by
// Canvas.tsx directly in its own final "zaznaczenie i uchwyty" pass,
// from nothing more than meter.x/y/width and the same computeMeterHeight
// this file already calls - no Konva ref needed, since a meter never
// rotates or scales. Same appearance, same trigger (isSelected from
// the store), just relocated in the render tree.

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

export const MeterElementNode: React.FC<MeterElementNodeProps> = ({ meter, devices, onSelect, onDragEnd, onDragStart }) => {
  const fontSize = meter.fontSize || 12;
  const height = computeMeterHeight(meter);
  const hasTitle = !!meter.title;
  const { rowHeight, titleBlockHeight } = getPanelRowLayout(fontSize, hasTitle);
  const valueFieldWidth = meter.width * VALUE_FIELD_WIDTH_FRACTION;
  const valueFieldX = meter.width - PANEL_PADDING_X - valueFieldWidth;

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
      <PanelChrome width={meter.width} height={height} title={meter.title} fontSize={fontSize}>
        {meter.rows.map((row, i) => {
          const rowY = PANEL_PADDING_Y + titleBlockHeight + i * rowHeight;
          const display = resolveMeterRow(row, devices);

          return (
            <Group key={i}>
              <Text
                x={PANEL_PADDING_X}
                y={rowY + (rowHeight - fontSize) / 2}
                width={valueFieldX - PANEL_PADDING_X}
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
      </PanelChrome>
    </Group>
  );
};
