import React, { useState } from 'react';
import { useStore } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { clampMeterWidth, METER_MIN_WIDTH, METER_MAX_WIDTH, METER_DEFAULT_FONT_SIZE } from '../meter/MeterElement';
import type { MeterElementRow } from '../meter/MeterElement';
import { MeterWizardDialog } from './MeterWizardDialog';
import { clampSignalPanelWidth, SIGNAL_PANEL_MIN_WIDTH, SIGNAL_PANEL_MAX_WIDTH, SIGNAL_PANEL_DEFAULT_FONT_SIZE } from '../elements/SignalPanelElement';
import type { SignalPanelRow } from '../elements/SignalPanelElement';
import { INDICATOR_DIODE_STATES } from '../symbols/scada/IndicatorDiodeSymbol';

export const PropertyInspector: React.FC = () => {
  const { objects, connections, selectedIds, selectedConnectionIds, updateObject, updateConnection } = useStore();
  const { meters, selectedMeterIds, updateMeter, devices } = useStore();
  const { signalPanels, selectedSignalPanelIds, updateSignalPanel } = useStore();
  // Hooks must run unconditionally on every render (this component is
  // otherwise a chain of early returns depending on what is selected),
  // so this lives up here rather than inside the selectedMeter branch
  // below, even though only that branch ever reads it.
  const [showMeterWizard, setShowMeterWizard] = useState(false);

  if (selectedIds.length === 0 && selectedConnectionIds.length === 0 && selectedMeterIds.length === 0 && selectedSignalPanelIds.length === 0) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">No object selected</div>
      </div>
    );
  }

  const selectionKindCount = (selectedIds.length > 0 ? 1 : 0) + (selectedConnectionIds.length > 0 ? 1 : 0) + (selectedMeterIds.length > 0 ? 1 : 0) + (selectedSignalPanelIds.length > 0 ? 1 : 0);
  if (selectedIds.length > 1 || selectedConnectionIds.length > 1 || selectedMeterIds.length > 1 || selectedSignalPanelIds.length > 1 || selectionKindCount > 1) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">Multiple objects selected</div>
      </div>
    );
  }

  const isConnectionSelected = selectedConnectionIds.length === 1;
  const isMeterSelected = selectedMeterIds.length === 1;
  const isSignalPanelSelected = selectedSignalPanelIds.length === 1;
  const selectedObj = isConnectionSelected || isMeterSelected || isSignalPanelSelected ? null : objects.find(o => o.id === selectedIds[0]);
  const selectedConn = isConnectionSelected ? connections.find(c => c.id === selectedConnectionIds[0]) : null;
  const selectedMeter = isMeterSelected ? meters.find(m => m.id === selectedMeterIds[0]) : null;
  const selectedSignalPanel = isSignalPanelSelected ? signalPanels.find(p => p.id === selectedSignalPanelIds[0]) : null;

  if (!selectedObj && !selectedConn && !selectedMeter && !selectedSignalPanel) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = parseFloat(value);
    }

    if (!selectedObj) return;
    if (name.startsWith('editor.')) {
      const [, key] = name.split('.');
      updateObject(selectedObj.id, {
        editor: { ...selectedObj.editor, [key]: finalValue }
      });
    } else if (name.startsWith('bindings.')) {
      const parts = name.split('.');
      const group = parts[1];
      const key = parts[2];

      const newBindings = { ...(selectedObj.bindings || {}) };
      newBindings[group as keyof typeof newBindings] = {
        ...((newBindings as any)[group] || {}),
        [key]: finalValue
      };

      updateObject(selectedObj.id, { bindings: newBindings });
    } else {
      updateObject(selectedObj.id, { [name]: finalValue });
    }
  };

  const handleConnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!selectedConn) return;
    const { name, value } = e.target;
    updateConnection(selectedConn.id, { [name]: value } as any);
    useStore.getState().saveHistory();
  };

  const handleCustomPropertyChange = (key: string, value: string) => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, {
      customProperties: {
        ...(selectedObj.customProperties || {}),
        [key]: value
      }
    });
  };

  const addCustomProperty = () => {
    const key = prompt('Enter property name:');
    if (key) {
      handleCustomPropertyChange(key, '');
    }
  };

  // scada.meter row editing: label/value/unit per row, entered by hand
  // for now - wiring this to the device registry is a separate, later
  // task (per the task that added this element).
  const addMeterRow = () => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, {
      meterRows: [...(selectedObj.meterRows || []), { label: '', value: '', unit: '' }]
    });
    useStore.getState().saveHistory();
  };

  const removeMeterRow = (index: number) => {
    if (!selectedObj) return;
    const rows = [...(selectedObj.meterRows || [])];
    rows.splice(index, 1);
    updateObject(selectedObj.id, { meterRows: rows });
    useStore.getState().saveHistory();
  };

  const updateMeterRow = (index: number, field: 'label' | 'value' | 'unit', value: string) => {
    if (!selectedObj) return;
    const rows = (selectedObj.meterRows || []).map((row, i) => i === index ? { ...row, [field]: value } : row);
    updateObject(selectedObj.id, { meterRows: rows });
  };

  if (selectedConn) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Connection Properties</div>
        <div className="inspector-content">
          <div className="property-group">
            {/* Node-based wiring model: a connection is a freehand
                polyline, not a from/to port pair - there is no source/
                target object or port to show any more. Medium/style/
                state are what a wire actually is now. */}
            <div className="property-group-title">Wire</div>
            <div className="property-row">
              <label>Medium</label>
              <select name="medium" value={selectedConn.medium} onChange={handleConnChange}>
                <option value="ELECTRICAL">Electrical</option>
                <option value="WATER">Water</option>
                <option value="VENTILATION">Ventilation</option>
              </select>
            </div>
            <div className="property-row">
              <label>Style</label>
              <select name="style" value={selectedConn.style} onChange={handleConnChange}>
                <option value="NORMAL">Normal</option>
                <option value="BUS">Bus (busbar / manifold)</option>
              </select>
            </div>
            <div className="property-row">
              <label>State</label>
              <select name="state" value={selectedConn.state} onChange={handleConnChange}>
                <option value="LIVE">Live</option>
                <option value="DEAD">Dead</option>
              </select>
            </div>
            <div className="property-row">
              <label>Points</label>
              <input type="text" value={selectedConn.points.length} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedMeter) {
    // Part A: title/font size/width plus manual row management (add,
    // remove, reorder, edit label/value/unit). Picking a device for a
    // row (the wizard, part C) and everything that resolves a device's
    // own unit/format/preview value (part B) are their own commits -
    // this only manages the row list itself, which any row needs
    // regardless of where it came from.
    const setRows = (rows: MeterElementRow[]) => {
      updateMeter(selectedMeter.id, { rows });
      useStore.getState().saveHistory();
    };
    const addManualRow = () => setRows([...selectedMeter.rows, { device: '', label: '', manualValue: '', manualUnit: '' }]);
    const removeRow = (idx: number) => setRows(selectedMeter.rows.filter((_, i) => i !== idx));
    const moveRow = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= selectedMeter.rows.length) return;
      const rows = [...selectedMeter.rows];
      [rows[idx], rows[target]] = [rows[target], rows[idx]];
      setRows(rows);
    };
    const updateRowField = (idx: number, field: keyof MeterElementRow, value: string) => {
      setRows(selectedMeter.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    return (
      <>
      <div className="property-inspector">
        <div className="inspector-header">Meter Properties</div>
        <div className="inspector-content">
          <div className="property-group">
            <div className="property-group-title">Meter</div>
            <div className="property-row">
              <label>Title</label>
              <input
                type="text"
                value={selectedMeter.title || ''}
                onChange={(e) => updateMeter(selectedMeter.id, { title: e.target.value })}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
            <div className="property-row">
              <label>Font Size</label>
              <input
                type="number"
                value={selectedMeter.fontSize || METER_DEFAULT_FONT_SIZE}
                onChange={(e) => {
                  const size = parseFloat(e.target.value);
                  if (!isNaN(size) && size > 0) updateMeter(selectedMeter.id, { fontSize: size });
                }}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
            <div className="property-row">
              <label>Width</label>
              <input
                type="number"
                min={METER_MIN_WIDTH}
                max={METER_MAX_WIDTH}
                value={Math.round(selectedMeter.width)}
                onChange={(e) => {
                  const width = parseFloat(e.target.value);
                  if (!isNaN(width)) updateMeter(selectedMeter.id, { width: clampMeterWidth(width) });
                }}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
          </div>

          <div className="property-group">
            <div className="property-group-title">
              Rows
              <button onClick={() => setShowMeterWizard(true)} style={{ marginLeft: 'auto', fontSize: '10px' }}>Kreator...</button>
              <button onClick={addManualRow} style={{ fontSize: '10px' }}>+ Manual row</button>
            </div>
            {selectedMeter.rows.map((row, idx) => (
              <div className="property-row" key={idx} style={{ gap: '2px', alignItems: 'center' }}>
                <button onClick={() => moveRow(idx, -1)} disabled={idx === 0} style={{ fontSize: '10px' }}>up</button>
                <button onClick={() => moveRow(idx, 1)} disabled={idx === selectedMeter.rows.length - 1} style={{ fontSize: '10px' }}>down</button>
                <input
                  type="text"
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) => updateRowField(idx, 'label', e.target.value)}
                  onBlur={() => useStore.getState().saveHistory()}
                  style={{ flex: 2 }}
                />
                {!row.device && (
                  <>
                    <input
                      type="text"
                      placeholder="Value"
                      value={row.manualValue}
                      onChange={(e) => updateRowField(idx, 'manualValue', e.target.value)}
                      onBlur={() => useStore.getState().saveHistory()}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={row.manualUnit}
                      onChange={(e) => updateRowField(idx, 'manualUnit', e.target.value)}
                      onBlur={() => useStore.getState().saveHistory()}
                      style={{ flex: 1 }}
                    />
                  </>
                )}
                {row.device && <span style={{ flex: 2, fontSize: '10px' }}><em>device: {row.device}</em></span>}
                <button onClick={() => removeRow(idx)} style={{ fontSize: '10px' }}>x</button>
              </div>
            ))}
            {selectedMeter.rows.length === 0 && (
              <div className="property-row"><em>No rows yet - use + Manual row to add one.</em></div>
            )}
          </div>
        </div>
      </div>
      {showMeterWizard && (
        <MeterWizardDialog
          devices={devices}
          onCancel={() => setShowMeterWizard(false)}
          onAddManualRow={addManualRow}
          onConfirm={(newRows) => {
            setRows([...selectedMeter.rows, ...newRows]);
            setShowMeterWizard(false);
          }}
        />
      )}
      </>
    );
  }

  if (selectedSignalPanel) {
    // commit 6: title/font size/width plus manual row management,
    // mirroring the meter's own Part A branch above - see raport.md
    // for what stayed shared (PanelChrome.tsx, PanelLayout.ts) and what
    // is duplicated here (this row-management UI itself: the manual
    // FIELDS differ enough - one text label plus a value/unit pair for
    // the meter, one text label plus a three-way state select here -
    // that a fully generic version would need its own render-prop
    // customization, more indirection than these ~40 lines justify).
    // Picking a device for a row (the wizard, commit 8) and resolving
    // one from the device list (commit 7) are their own commits.
    const setRows = (rows: SignalPanelRow[]) => {
      updateSignalPanel(selectedSignalPanel.id, { rows });
      useStore.getState().saveHistory();
    };
    const addManualRow = () => setRows([...selectedSignalPanel.rows, { device: '', label: '', manualState: 'OFF' }]);
    const removeRow = (idx: number) => setRows(selectedSignalPanel.rows.filter((_, i) => i !== idx));
    const moveRow = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= selectedSignalPanel.rows.length) return;
      const rows = [...selectedSignalPanel.rows];
      [rows[idx], rows[target]] = [rows[target], rows[idx]];
      setRows(rows);
    };
    const updateRowField = (idx: number, field: keyof SignalPanelRow, value: string) => {
      setRows(selectedSignalPanel.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    return (
      <div className="property-inspector">
        <div className="inspector-header">Signal Panel Properties</div>
        <div className="inspector-content">
          <div className="property-group">
            <div className="property-group-title">Signal Panel</div>
            <div className="property-row">
              <label>Title</label>
              <input
                type="text"
                value={selectedSignalPanel.title || ''}
                onChange={(e) => updateSignalPanel(selectedSignalPanel.id, { title: e.target.value })}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
            <div className="property-row">
              <label>Font Size</label>
              <input
                type="number"
                value={selectedSignalPanel.fontSize || SIGNAL_PANEL_DEFAULT_FONT_SIZE}
                onChange={(e) => {
                  const size = parseFloat(e.target.value);
                  if (!isNaN(size) && size > 0) updateSignalPanel(selectedSignalPanel.id, { fontSize: size });
                }}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
            <div className="property-row">
              <label>Width</label>
              <input
                type="number"
                min={SIGNAL_PANEL_MIN_WIDTH}
                max={SIGNAL_PANEL_MAX_WIDTH}
                value={Math.round(selectedSignalPanel.width)}
                onChange={(e) => {
                  const width = parseFloat(e.target.value);
                  if (!isNaN(width)) updateSignalPanel(selectedSignalPanel.id, { width: clampSignalPanelWidth(width) });
                }}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
          </div>

          <div className="property-group">
            <div className="property-group-title">
              Rows
              <button onClick={addManualRow} style={{ marginLeft: 'auto', fontSize: '10px' }}>+ Manual row</button>
            </div>
            {selectedSignalPanel.rows.map((row, idx) => (
              <div className="property-row" key={idx} style={{ gap: '2px', alignItems: 'center' }}>
                <button onClick={() => moveRow(idx, -1)} disabled={idx === 0} style={{ fontSize: '10px' }}>up</button>
                <button onClick={() => moveRow(idx, 1)} disabled={idx === selectedSignalPanel.rows.length - 1} style={{ fontSize: '10px' }}>down</button>
                <input
                  type="text"
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) => updateRowField(idx, 'label', e.target.value)}
                  onBlur={() => useStore.getState().saveHistory()}
                  style={{ flex: 2 }}
                />
                {!row.device && (
                  <select
                    value={row.manualState}
                    onChange={(e) => { updateRowField(idx, 'manualState', e.target.value); useStore.getState().saveHistory(); }}
                    style={{ flex: 1 }}
                  >
                    {INDICATOR_DIODE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {row.device && <span style={{ flex: 1, fontSize: '10px' }}><em>device: {row.device}</em></span>}
                <button onClick={() => removeRow(idx)} style={{ fontSize: '10px' }}>x</button>
              </div>
            ))}
            {selectedSignalPanel.rows.length === 0 && (
              <div className="property-row"><em>No rows yet - use + Manual row to add one.</em></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Object Property Inspector Below
  if (!selectedObj) return null;

  return (
    <div className="property-inspector">
      <div className="inspector-header">Properties</div>
      <div className="inspector-content">
        <div className="property-group">
          <div className="property-group-title">General</div>

          <div className="property-row">
            <label>Type</label>
            <input type="text" value={selectedObj.type} disabled />
          </div>
          <div className="property-row">
            <label>Designation</label>
            <input
              type="text"
              name="designation"
              value={selectedObj.designation || ''}
              onChange={handleChange}
              onBlur={() => useStore.getState().saveHistory()}
              list={selectedObj.type === 'scada.boundary_point' ? 'boundary-point-labels' : undefined}
            />
            {selectedObj.type === 'scada.boundary_point' && (
              // Ready-made suggestions for a boundary point's label, per
              // its own spec - a suggestion, not a restriction: any text
              // the user types is accepted, this only offers common ones.
              <datalist id="boundary-point-labels">
                <option value="ZKP" />
                <option value="PGE Dystrybucja" />
                <option value="STUDNIA" />
                <option value="DOM" />
                <option value="WARSZTAT" />
                <option value="MAGAZYN" />
                <option value="OGROD" />
                <option value="OCZYSZCZALNIA" />
                <option value="NAWADNIANIE" />
                <option value="CZERPNIA" />
                <option value="WYRZUTNIA" />
                <option value="CENTRALA" />
                <option value="REKUPERATOR" />
              </datalist>
            )}
          </div>
          <div className="property-row">
            <label>Name</label>
            <input type="text" name="name" value={selectedObj.name || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Description</label>
            <input type="text" name="description" value={selectedObj.description || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Visible</label>
            <input type="checkbox" name="visible" checked={selectedObj.visible !== false} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Locked</label>
            <input type="checkbox" name="locked" checked={selectedObj.locked === true} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Z-Index</label>
            <input type="number" name="zIndex" value={selectedObj.zIndex || 0} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Layout</div>
          <div className="property-row">
            <label>Width</label>
            <input
              type="number"
              value={Math.round(selectedObj.width)}
              onChange={(e) => {
                const newWidth = parseFloat(e.target.value);
                if (isNaN(newWidth)) return;
                // The old busbar-resize special case (resizeBusbar,
                // dyn_top_NN port reattachment) is gone under the node-
                // based wiring model - a busbar is a BUS-style wire now,
                // resized by dragging its own endpoint.
                updateObject(selectedObj.id, { width: newWidth });
              }}
              onBlur={() => useStore.getState().saveHistory()}
            />
          </div>
          <div className="property-row">
            <label>Height</label>
            <input
              type="number"
              value={Math.round(selectedObj.height)}
              onChange={(e) => {
                const newHeight = parseFloat(e.target.value);
                if (!isNaN(newHeight)) updateObject(selectedObj.id, { height: newHeight });
              }}
              onBlur={() => useStore.getState().saveHistory()}
            />
          </div>
          <div className="property-row">
            <label>X</label>
            <input type="number" name="x" value={Math.round(selectedObj.x)} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Y</label>
            <input type="number" name="y" value={Math.round(selectedObj.y)} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Rotation</label>
            <input type="number" name="rotation" value={Math.round(selectedObj.rotation || 0)} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Scale X</label>
            <input type="number" name="scaleX" value={selectedObj.scaleX || 1} step="0.1" onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Scale Y</label>
            <input type="number" name="scaleY" value={selectedObj.scaleY || 1} step="0.1" onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Appearance</div>
          <div className="property-row">
            <label>Fill</label>
            <input type="color" name="fill" value={selectedObj.fill || '#ffffff'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Border</label>
            <input type="color" name="border" value={selectedObj.border || '#000000'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Text</label>
            <input type="text" name="text" value={selectedObj.text || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Font</label>
            <input type="text" name="font" value={selectedObj.font || 'Arial'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Font Size</label>
            <input type="number" name="fontSize" value={selectedObj.fontSize || 12} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Tooltip</label>
            <input type="text" name="tooltip" value={selectedObj.tooltip || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Editor Preview</div>
          <div className="property-row">
            <label>State</label>
            <select name="editor.preview_state" value={selectedObj.editor?.preview_state || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()}>
              <option value="">(Default)</option>
              {getSymbolDefinition(selectedObj.type)?.allowedStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          {selectedObj.category === 'Measurements' || selectedObj.type.startsWith('measurements.') ? (
            <>
              <div className="property-row">
                <label>Value</label>
                <input type="text" name="editor.preview_value" value={selectedObj.editor?.preview_value || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
              </div>
              <div className="property-row">
                <label>Unit</label>
                <input type="text" name="editor.unit" value={selectedObj.editor?.unit || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
              </div>
              <div className="property-row">
                <label>Format</label>
                <input type="text" name="editor.format" placeholder="e.g. 0.0" value={selectedObj.editor?.format || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
              </div>
            </>
          ) : null}
        </div>

        <div className="property-group">
          <div className="property-group-title">Bindings</div>
          <div className="property-row">
            <label>State</label>
            <input type="text" name="bindings.state.tag" value={selectedObj.bindings?.state?.tag || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Value</label>
            <input type="text" name="bindings.value.tag" value={selectedObj.bindings?.value?.tag || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Alarm</label>
            <input type="text" name="bindings.alarm.tag" value={selectedObj.bindings?.alarm?.tag || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
          <div className="property-row">
            <label>Command</label>
            <input type="text" name="bindings.command.tag" value={selectedObj.bindings?.command?.tag || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
          </div>
        </div>

        {selectedObj.type === 'scada.meter' && (
          <div className="property-group">
            <div className="property-group-title">
              Meter Rows
              <button onClick={addMeterRow} style={{marginLeft: 'auto', fontSize: '10px'}}>+ Row</button>
            </div>
            {(selectedObj.meterRows || []).map((row, index) => (
              <div className="property-row" key={index} style={{ gap: '2px' }}>
                <input
                  type="text"
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) => updateMeterRow(index, 'label', e.target.value)}
                  onBlur={() => useStore.getState().saveHistory()}
                  style={{ flex: 2 }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => updateMeterRow(index, 'value', e.target.value)}
                  onBlur={() => useStore.getState().saveHistory()}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateMeterRow(index, 'unit', e.target.value)}
                  onBlur={() => useStore.getState().saveHistory()}
                  style={{ flex: 1 }}
                />
                <button onClick={() => removeMeterRow(index)} style={{ fontSize: '10px' }}>x</button>
              </div>
            ))}
            {(selectedObj.meterRows || []).length === 0 && (
              <div className="property-row"><em>No rows yet - use + Row to add one.</em></div>
            )}
          </div>
        )}

        {selectedObj.type === 'scada.boundary_point' && (
          <div className="property-group">
            <div className="property-group-title">Boundary Point</div>
            <div className="property-row">
              <label>Direction</label>
              <select name="boundaryDirection" value={selectedObj.boundaryDirection || 'SOURCE'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()}>
                <option value="SOURCE">Source</option>
                <option value="SINK">Sink</option>
              </select>
            </div>
            <div className="property-row">
              <label>Medium</label>
              <select name="boundaryMedium" value={selectedObj.boundaryMedium || 'ELECTRICAL'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()}>
                <option value="ELECTRICAL">Electrical</option>
                <option value="WATER">Water</option>
                <option value="VENTILATION">Ventilation</option>
              </select>
            </div>
            <div className="property-row">
              <label>Port Side</label>
              <select name="boundaryPortSide" value={selectedObj.boundaryPortSide || 'TOP'} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()}>
                <option value="TOP">Top</option>
                <option value="BOTTOM">Bottom</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
              </select>
            </div>
            <div className="property-row"><em>Label/sublabel use Designation/Description above.</em></div>
          </div>
        )}

        <div className="property-group">
          <div className="property-group-title">
            Custom Properties
            <button onClick={addCustomProperty} style={{marginLeft: 'auto', fontSize: '10px'}}>+</button>
          </div>
          {Object.entries(selectedObj.customProperties || {}).map(([key, value]) => (
            <div className="property-row" key={key}>
              <label>{key}</label>
              <input
                type="text"
                value={value as string}
                onChange={(e) => handleCustomPropertyChange(key, e.target.value)}
                onBlur={() => useStore.getState().saveHistory()}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
