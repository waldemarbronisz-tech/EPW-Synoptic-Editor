import React from 'react';
import { useStore } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

export const PropertyInspector: React.FC = () => {
  const { objects, selectedIds, updateObject } = useStore();

  if (selectedIds.length !== 1) {
    return (
      <div className="property-inspector">
        <div className="inspector-header">Properties</div>
        <div className="inspector-empty">
          {selectedIds.length === 0 ? 'No object selected' : 'Multiple objects selected'}
        </div>
      </div>
    );
  }

  const selectedObj = objects.find(o => o.id === selectedIds[0]);
  if (!selectedObj) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = parseFloat(value);
    }

    if (name.startsWith('editor.') || name.startsWith('bindings.')) {
      const [group, key] = name.split('.');
      updateObject(selectedObj.id, {
        [group]: {
          ...(selectedObj as any)[group],
          [key]: finalValue
        }
      });
    } else {
      updateObject(selectedObj.id, { [name]: finalValue });
    }
  };

  const handleCustomPropertyChange = (key: string, value: string) => {
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
            <label>Tag</label>
            <input type="text" name="tag" value={selectedObj.tag || ''} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Description</label>
            <input type="text" name="description" value={selectedObj.description || ''} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Visible</label>
            <input type="checkbox" name="visible" checked={selectedObj.visible !== false} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Locked</label>
            <input type="checkbox" name="locked" checked={selectedObj.locked === true} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Layer</label>
            <input type="number" name="layer" value={selectedObj.layer || 1} onChange={handleChange} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Layout</div>
          <div className="property-row">
            <label>X</label>
            <input type="number" name="x" value={Math.round(selectedObj.x)} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Y</label>
            <input type="number" name="y" value={Math.round(selectedObj.y)} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Rotation</label>
            <input type="number" name="rotation" value={Math.round(selectedObj.rotation || 0)} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Scale X</label>
            <input type="number" name="scaleX" value={selectedObj.scaleX || 1} step="0.1" onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Scale Y</label>
            <input type="number" name="scaleY" value={selectedObj.scaleY || 1} step="0.1" onChange={handleChange} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Appearance</div>
          <div className="property-row">
            <label>Fill</label>
            <input type="color" name="fill" value={selectedObj.fill || '#ffffff'} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Border</label>
            <input type="color" name="border" value={selectedObj.border || '#000000'} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Text</label>
            <input type="text" name="text" value={selectedObj.text || ''} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Font</label>
            <input type="text" name="font" value={selectedObj.font || 'Arial'} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Font Size</label>
            <input type="number" name="fontSize" value={selectedObj.fontSize || 12} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Tooltip</label>
            <input type="text" name="tooltip" value={selectedObj.tooltip || ''} onChange={handleChange} />
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Editor Preview</div>
          <div className="property-row">
            <label>State</label>
            <select name="editor.preview_state" value={selectedObj.editor?.preview_state || ''} onChange={handleChange}>
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
                <input type="text" name="editor.preview_value" value={selectedObj.editor?.preview_value || ''} onChange={handleChange} />
              </div>
              <div className="property-row">
                <label>Unit</label>
                <input type="text" name="editor.unit" value={selectedObj.editor?.unit || ''} onChange={handleChange} />
              </div>
              <div className="property-row">
                <label>Format</label>
                <input type="text" name="editor.format" placeholder="e.g. 0.0" value={selectedObj.editor?.format || ''} onChange={handleChange} />
              </div>
            </>
          ) : null}
        </div>

        <div className="property-group">
          <div className="property-group-title">Bindings</div>
          <div className="property-row">
            <label>State/Value</label>
            <input type="text" name="bindings.state" value={selectedObj.bindings?.state || ''} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Alarm</label>
            <input type="text" name="bindings.alarm" value={selectedObj.bindings?.alarm || ''} onChange={handleChange} />
          </div>
          <div className="property-row">
            <label>Command</label>
            <input type="text" name="bindings.command" value={selectedObj.bindings?.command || ''} onChange={handleChange} />
          </div>
        </div>

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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
