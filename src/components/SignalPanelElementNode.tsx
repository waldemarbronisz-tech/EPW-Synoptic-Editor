// Konva rendering for the signal panel element (feat/editing-and-signal-
// panel commit 6: panel/title/rows, a manual row's own diode state;
// commit 7 will add resolving a device-linked row's label/state from
// the device list). Mirrors MeterElementNode.tsx's own structure -
// see that file and raport.md for what is shared (PanelChrome.tsx) and
// what is duplicated between the two, and why.

import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { SignalPanelElement } from '../elements/SignalPanelElement';
import { computeSignalPanelHeight } from '../elements/SignalPanelElement';
import { PanelChrome, getPanelRowLayout } from './PanelChrome';
import { PANEL_PADDING_X, PANEL_PADDING_Y } from '../elements/PanelLayout';
import { getIndicatorDiodeFillColor, getIndicatorDiodeRadius, DIODE_OUTLINE_WIDTH } from '../symbols/scada/IndicatorDiodeSymbol';
import { COLOR_OUTLINE, COLOR_TEXT } from '../theme/ScadaTheme';

const DIODE_RADIUS = getIndicatorDiodeRadius('large'); // 12, per this element's own spec - reusing the Indicator Diode symbol's own radius helper rather than a coincidentally-equal literal

export interface SignalPanelElementNodeProps {
  panel: SignalPanelElement;
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

export const SignalPanelElementNode: React.FC<SignalPanelElementNodeProps> = ({ panel, onSelect, onDragEnd, onDragStart }) => {
  const fontSize = panel.fontSize || 12;
  const height = computeSignalPanelHeight(panel);
  const hasTitle = !!panel.title;
  const { rowHeight, titleBlockHeight } = getPanelRowLayout(fontSize, hasTitle);
  const diodeX = panel.width - PANEL_PADDING_X - DIODE_RADIUS;

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
          // commit 6: a device-linked row has no resolver yet (that is
          // commit 7's job) - it draws exactly the QUALITY color commit
          // 7 itself defines for an unresolved/missing device, so
          // nothing about this row's APPEARANCE changes once that
          // resolver lands for a row whose device genuinely does not
          // exist; only a row whose device DOES resolve changes, to its
          // own preview state.
          const label = row.label;
          const state = row.device ? 'QUALITY' : row.manualState;

          return (
            <Group key={i}>
              <Text
                x={PANEL_PADDING_X}
                y={rowY + (rowHeight - fontSize) / 2}
                width={diodeX - PANEL_PADDING_X}
                text={label}
                fontSize={fontSize}
                fill={COLOR_TEXT}
                ellipsis
                wrap="none"
              />
              <Circle
                x={diodeX}
                y={rowCenterY}
                radius={DIODE_RADIUS}
                fill={getIndicatorDiodeFillColor(state)}
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
