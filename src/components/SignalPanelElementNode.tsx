// Konva rendering for the signal panel element (feat/editing-and-signal-
// panel commit 6: panel/title/rows, a manual row's own diode state;
// commit 7: resolving a device-linked row's label/state from the
// device list, and reporting a dangling device reference). Mirrors
// MeterElementNode.tsx's own structure - see that file and raport.md
// for what is shared (PanelChrome.tsx, project/DeviceLookup.ts) and
// what is duplicated between the two, and why.

import React, { useEffect, useRef } from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { SignalPanelElement } from '../elements/SignalPanelElement';
import { computeSignalPanelHeight } from '../elements/SignalPanelElement';
import { resolveSignalPanelRow, getSignalPanelDanglingRows } from '../elements/SignalPanelResolver';
import type { Device } from '../project/DeviceSchema';
import { useStore } from '../store';
import { PanelChrome, getPanelRowLayout } from './PanelChrome';
import { PANEL_PADDING_X, PANEL_PADDING_Y } from '../elements/PanelLayout';
import { getIndicatorDiodeFillColor, getIndicatorDiodeRadius, DIODE_OUTLINE_WIDTH } from '../symbols/scada/IndicatorDiodeSymbol';
import { COLOR_OUTLINE, COLOR_TEXT } from '../theme/ScadaTheme';

const DIODE_RADIUS = getIndicatorDiodeRadius('large'); // 12, per this element's own spec - reusing the Indicator Diode symbol's own radius helper rather than a coincidentally-equal literal

// A device-linked row's diode always previews ON (SignalPanelResolver.ts
// has no live data to draw from, same as the meter's own preview value) -
// but that preview must never be mistaken for a manually-entered ON, per
// this element's own spec: "narysowana INNYM ODCIENIEM niz stan wpisany
// recznie" (drawn in a different shade than a manually-entered state).
// The meter's own convention for this (MeterElementNode.tsx's
// colorForRow) recolors the value TEXT to a fixed color per colorKind,
// completely independent of the value itself. A diode has no separate
// "text" - its fill IS the value - so the equivalent treatment here
// dims the same state-derived fill with reduced opacity rather than
// picking a different color outright: the state stays legible (still
// the ON/OFF/QUALITY hue from getIndicatorDiodeFillColor, still every
// color sourced from ScadaTheme, still the same Indicator Diode circle)
// while remaining visibly, immediately distinguishable from a manually
// entered state at full strength - exactly the same "never read as real
// data for even a second" goal the meter's own comment states.
const PREVIEW_DIODE_OPACITY = 0.5;

export interface SignalPanelElementNodeProps {
  panel: SignalPanelElement;
  devices: Device[];
  // Receives the raw Konva event (onClick={onSelect} forwards it
  // positionally) so the caller can read Shift for multi-select.
  onSelect: (e?: any) => void;
  onDragEnd: (x: number, y: number) => void;
  // Alt+drag leaves a copy behind at this exact spot the instant the
  // drag starts - same mechanism as the meter element's own.
  onDragStart?: () => void;
}
// No isSelected prop, no selection outline drawn here at all (unlike
// the meter element's own commit-1 version, which drew one and had it
// removed again in commit 5) - this element is built AFTER commit 5
// established that selection/handles are their own final render pass
// in Canvas.tsx, so there was nothing to build here that needed
// removing later.

export const SignalPanelElementNode: React.FC<SignalPanelElementNodeProps> = ({ panel, devices, onSelect, onDragEnd, onDragStart }) => {
  const fontSize = panel.fontSize || 12;
  const height = computeSignalPanelHeight(panel);
  const hasTitle = !!panel.title;
  const { rowHeight, titleBlockHeight } = getPanelRowLayout(fontSize, hasTitle);
  const diodeX = panel.width - PANEL_PADDING_X - DIODE_RADIUS;

  // A dangling row is not a hard error - the panel still draws - but the
  // user should hear about it once, not on every re-render. Same
  // signature-dedup pattern as MeterElementNode.tsx's own effect.
  const danglingSignatureRef = useRef<string>('');
  useEffect(() => {
    const issues = getSignalPanelDanglingRows(panel, devices);
    const signature = issues.map(i => `${i.rowIndex}:${i.deviceId}`).join(',');
    if (signature === danglingSignatureRef.current) return;
    danglingSignatureRef.current = signature;
    const panelName = panel.title || panel.id;
    issues.forEach(issue => {
      useStore.getState().addMessage(
        `[WARNING] Signal panel "${panelName}", row ${issue.rowIndex + 1}: device "${issue.deviceId}" not found`
      );
    });
  }, [panel, devices]);

  return (
    <Group
      x={panel.x}
      y={panel.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onDragStart?.()}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <PanelChrome width={panel.width} height={height} title={panel.title} fontSize={fontSize}>
        {panel.rows.map((row, i) => {
          const rowY = PANEL_PADDING_Y + titleBlockHeight + i * rowHeight;
          const rowCenterY = rowY + rowHeight / 2;
          const display = resolveSignalPanelRow(row, devices);

          return (
            <Group key={i}>
              <Text
                x={PANEL_PADDING_X}
                y={rowY + (rowHeight - fontSize) / 2}
                width={diodeX - PANEL_PADDING_X}
                text={display.label}
                fontSize={fontSize}
                fill={COLOR_TEXT}
                ellipsis
                wrap="none"
              />
              <Circle
                x={diodeX}
                y={rowCenterY}
                radius={DIODE_RADIUS}
                fill={getIndicatorDiodeFillColor(display.state)}
                opacity={display.colorKind === 'PREVIEW' ? PREVIEW_DIODE_OPACITY : 1}
                stroke={COLOR_OUTLINE}
                strokeWidth={DIODE_OUTLINE_WIDTH}
              />
            </Group>
          );
        })}
      </PanelChrome>
    </Group>
  );
};
