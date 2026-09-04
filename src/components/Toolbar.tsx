import React from 'react';
import { useStore } from '../store';
import type { SynopticConnection } from '../store';
import {
  Undo, Redo, Copy, ClipboardPaste, Trash2,
  BringToFront, SendToBack, AlignLeft, AlignCenter, AlignRight,
  AlignVerticalSpaceAround, AlignHorizontalSpaceAround,
  Lock, Unlock, RotateCcw, RotateCw, PenLine, Zap, Droplet, Wind, Gauge, CircleDot
} from 'lucide-react';
import { COLOR_ENERGIZED, COLOR_WATER, VENTILATION_ACTIVE, COLOR_WHITE, COLOR_RUN } from '../theme/ScadaTheme';
import { METER_DEFAULT_FONT_SIZE } from '../meter/MeterElement';
import { SIGNAL_PANEL_DEFAULT_FONT_SIZE } from '../elements/SignalPanelElement';

// One icon/color pair per medium - reused by both the toolbar buttons
// below and nothing else, so this stays local rather than joining
// ScadaTheme.ts's own palette (which holds colors, not icon choices).
const MEDIUM_OPTIONS: { value: SynopticConnection['medium']; label: string; icon: React.FC<{ size?: number }>; color: string }[] = [
  { value: 'ELECTRICAL', label: 'Prad', icon: Zap, color: COLOR_ENERGIZED },
  { value: 'WATER', label: 'Woda', icon: Droplet, color: COLOR_WATER },
  { value: 'VENTILATION', label: 'Wentylacja', icon: Wind, color: VENTILATION_ACTIVE },
];

export const Toolbar: React.FC = () => {
  const {
    undo, redo, copySelected, paste, deleteObjects, selectedIds, selectedConnectionIds,
    bringToFront, sendToBack, alignSelected, distributeSelected,
    lockSelected, unlockSelected, rotateSelected,
    isDrawingConnection, setDrawingMode,
    drawingMedium, setDrawingMedium, drawingStyle, setDrawingStyle,
    addMeter, selectedMeterIds, selectMeters,
    addSignalPanel, selectedSignalPanelIds, selectSignalPanels
  } = useStore();

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button title="Undo" onClick={undo}><Undo size={16} /></button>
        <button title="Redo" onClick={redo}><Redo size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Distribute Horizontally" onClick={() => distributeSelected('horizontal')}><AlignHorizontalSpaceAround size={16} /></button>
        <button title="Distribute Vertically" onClick={() => distributeSelected('vertical')}><AlignVerticalSpaceAround size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Copy" onClick={copySelected}><Copy size={16} /></button>
        <button title="Paste" onClick={paste}><ClipboardPaste size={16} /></button>
        <button title="Delete" onClick={() => deleteObjects(selectedIds, selectedConnectionIds, selectedMeterIds, selectedSignalPanelIds)}><Trash2 size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      {/* The meter element (feat/meter-element): not a symbol, so it has
          no Toolbox entry to drag from - this is how one gets placed.
          Dropped at a fixed default spot and auto-selected so it can be
          dragged into position right away, same as a pasted element. */}
      <div className="toolbar-group">
        <button
          title="Dodaj Miernik"
          onClick={() => {
            addMeter({ x: 160, y: 160, width: 200, fontSize: METER_DEFAULT_FONT_SIZE, rows: [] });
            const newest = useStore.getState().meters[useStore.getState().meters.length - 1];
            if (newest) selectMeters([newest.id], false);
          }}
        >
          <Gauge size={16} />
        </button>
      </div>

      {/* The signal panel element (commit 6): the same mechanism, the
          same reasoning for having a toolbar button at all. */}
      <div className="toolbar-group">
        <button
          title="Dodaj Panel Sygnalizacyjny"
          onClick={() => {
            addSignalPanel({ x: 160, y: 160, width: 160, fontSize: SIGNAL_PANEL_DEFAULT_FONT_SIZE, rows: [] });
            const newest = useStore.getState().signalPanels[useStore.getState().signalPanels.length - 1];
            if (newest) selectSignalPanels([newest.id], false);
          }}
        >
          <CircleDot size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          title="Rysuj połączenie"
          onClick={() => setDrawingMode(!isDrawingConnection)}
          style={{ backgroundColor: isDrawingConnection ? '#3498db' : 'transparent' }}
        >
          <PenLine size={16} />
        </button>
      </div>

      {/* Medium selector (part C): which of the three media a NEWLY
          drawn wire gets, chosen up front instead of after the fact in
          Properties - applies to every wire drawn until changed again.
          Keyboard shortcuts 1/2/3 do the same (Canvas.tsx). */}
      <div className="toolbar-group">
        {MEDIUM_OPTIONS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            title={label}
            onClick={() => setDrawingMedium(value)}
            style={{
              backgroundColor: drawingMedium === value ? color : 'transparent',
              color: drawingMedium === value ? COLOR_WHITE : undefined
            }}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Style selector for newly drawn wires: NORMAL or BUS (a thicker
          busbar/manifold, touchable anywhere along its length). */}
      <div className="toolbar-group">
        <button
          title="Normal"
          onClick={() => setDrawingStyle('NORMAL')}
          style={{ backgroundColor: drawingStyle === 'NORMAL' ? COLOR_RUN : 'transparent', color: drawingStyle === 'NORMAL' ? COLOR_WHITE : undefined }}
        >
          N
        </button>
        <button
          title="Bus (szyna / kolektor)"
          onClick={() => setDrawingStyle('BUS')}
          style={{ backgroundColor: drawingStyle === 'BUS' ? COLOR_RUN : 'transparent', color: drawingStyle === 'BUS' ? COLOR_WHITE : undefined }}
        >
          B
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Bring to Front" onClick={bringToFront}><BringToFront size={16} /></button>
        <button title="Send to Back" onClick={sendToBack}><SendToBack size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Align Left" onClick={() => alignSelected('left')}><AlignLeft size={16} /></button>
        <button title="Align Center" onClick={() => alignSelected('center')}><AlignCenter size={16} /></button>
        <button title="Align Right" onClick={() => alignSelected('right')}><AlignRight size={16} /></button>
      </div>

      <div className="toolbar-group">
        <button title="Align Middle" onClick={() => alignSelected('middle')}><AlignVerticalSpaceAround size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Lock" onClick={lockSelected}><Lock size={16} /></button>
        <button title="Unlock" onClick={unlockSelected}><Unlock size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Rotate Left" onClick={() => rotateSelected('ccw')}><RotateCcw size={16} /></button>
        <button title="Rotate Right" onClick={() => rotateSelected('cw')}><RotateCw size={16} /></button>
      </div>
    </div>
  );
};
