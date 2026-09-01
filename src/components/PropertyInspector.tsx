import React from 'react';
import { useStore } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

export const PropertyInspector: React.FC = () => {
  const { objects, connections, selectedIds, selectedConnectionIds, updateObject, updateConnection, resizeBusbar } = useStore();

  if (selectedIds.length === 0 && selectedConnectionIds.length === 0) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">No object selected</div>
      </div>
    );
  }

  if (selectedIds.length > 1 || selectedConnectionIds.length > 1 || (selectedIds.length > 0 && selectedConnectionIds.length > 0)) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">Multiple objects selected</div>
      </div>
    );
  }

  const isConnectionSelected = selectedConnectionIds.length === 1;
  const selectedObj = isConnectionSelected ? null : objects.find(o => o.id === selectedIds[0]);
  const selectedConn = isConnectionSelected ? connections.find(c => c.id === selectedConnectionIds[0]) : null;

  if (!selectedObj && !selectedConn) return null;

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
    if (name.startsWith('editor.')) {
      const key = name.split('.')[1];
      updateConnection(selectedConn.id, {
        editor: {
          ...selectedConn.editor,
          [key]: value
        }
      });
    } else {
      updateConnection(selectedConn.id, { [name]: value });
    }
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
            <div className="property-group-title">General</div>
            <div className="property-row">
              <label>Type</label>
              <select name="type" value={selectedConn.type} onChange={handleConnChange} onBlur={() => useStore.getState().saveHistory()}>
                <option value="electrical_ac">Electrical AC</option>
                <option value="electrical_dc">Electrical DC</option>
                <option value="water">Water</option>
                <option value="hvac_air">HVAC Air</option>
              </select>
            </div>
            <div className="property-row">
              <label>Source Obj</label>
              <input type="text" value={objects.find(o=>o.id === selectedConn.fromId)?.designation || selectedConn.fromId} disabled />
            </div>
            <div className="property-row">
              <label>Source Port</label>
              <input type="text" value={selectedConn.fromPort} disabled />
            </div>
            <div className="property-row">
              <label>Target Obj</label>
              <input type="text" value={objects.find(o=>o.id === selectedConn.toId)?.designation || selectedConn.toId} disabled />
            </div>
            <div className="property-row">
              <label>Target Port</label>
              <input type="text" value={selectedConn.toPort} disabled />
            </div>
          </div>
          <div className="property-group">
            <div className="property-group-title">Preview</div>
            <div className="property-row">
              <label>State</label>
              <select name="editor.preview_state" value={selectedConn.editor?.preview_state || 'ENERGIZED'} onChange={handleConnChange} onBlur={() => useStore.getState().saveHistory()}>
                <option value="ENERGIZED">Energized</option>
                <option value="DEENERGIZED">De-energized</option>
              </select>
            </div>
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
            <input type="text" name="designation" value={selectedObj.designation || ''} onChange={handleChange} onBlur={() => useStore.getState().saveHistory()} />
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
                if (selectedObj.type === 'scada.busbar') {
                  resizeBusbar(selectedObj.id, newWidth);
                } else {
                  updateObject(selectedObj.id, { width: newWidth });
                }
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
