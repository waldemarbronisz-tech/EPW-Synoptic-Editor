// feat/device-list-ui commit 2 (shell) - the device configuration form.
// This commit only builds the fields common to every behavior (id,
// designation, name, kind, publishToHa, the behavior picker itself) plus
// a default, schema-valid skeleton of whichever behavior is chosen -
// enough for the device list window's own add/edit/duplicate buttons to
// have something real to open. Commit 3 replaces the SWITCHED/SIGNAL
// skeleton below with actual editable sections (and starts blocking Save
// while validateDeviceRegistry reports an error); commit 4 does the same
// for MEASURED/MODULATED. Until then, a freshly added device is a
// well-formed Device object (DeviceFormDefaults.ts) that is very likely
// still VALIDATION-invalid (e.g. an empty command.doClose) - exactly
// what the list window's own "invalid rows shown in alarm color" feature
// is for, not a bug in this shell.
//
// Same modal convention as MeterWizardDialog.tsx / DeviceRegistriesDialog.tsx.
// Every Save runs the candidate device through validateDeviceRegistry -
// the only place any rule about it is decided; this file only displays
// the resulting issues, never invents its own check.

import React, { useState } from 'react';
import { useStore } from '../store';
import type { Device, DeviceBehavior, DeviceCommon } from '../project/DeviceSchema';
import { validateDeviceRegistry } from '../project/DeviceValidation';
import { defaultFieldsForBehavior, assembleDevice } from '../project/DeviceFormDefaults';
import type { DeviceOwnFields } from '../project/DeviceFormDefaults';
import { FONT_SIZE_SMALL, COLOR_ALARM } from '../theme/ScadaTheme';

const BEHAVIORS: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED'];

function splitId(id: string): { code: string; suffix: string } {
  const idx = id.indexOf('_');
  return idx >= 0 ? { code: id.slice(0, idx), suffix: id.slice(idx + 1) } : { code: '', suffix: id };
}

function extractOwnFields(device: Device): DeviceOwnFields {
  const { id: _id, designation: _designation, name: _name, behavior: _behavior, kind: _kind, publishToHa: _publishToHa, ...rest } = device;
  return rest as unknown as DeviceOwnFields;
}

export interface DeviceFormDialogProps {
  mode: 'add' | 'edit';
  // For 'edit': the device being edited. For 'add': present only when
  // opened from Duplicate (id/designation already cleared by the caller,
  // DeviceListDialog) - everything else is pre-filled from it.
  initialDevice?: Device;
  onSave: (device: Device) => void;
  onCancel: () => void;
}

export const DeviceFormDialog: React.FC<DeviceFormDialogProps> = ({ mode, initialDevice, onSave, onCancel }) => {
  const locations = useStore(s => s.locations);
  const cards = useStore(s => s.cards);
  const devices = useStore(s => s.devices);
  const isEdit = mode === 'edit';

  const initialSplit = initialDevice ? splitId(initialDevice.id) : { code: locations[0]?.code ?? '', suffix: '' };
  const [locationCode, setLocationCode] = useState(initialSplit.code);
  const [suffix, setSuffix] = useState(initialSplit.suffix);
  const [designation, setDesignation] = useState(isEdit ? (initialDevice?.designation ?? '') : '');
  const [name, setName] = useState(initialDevice?.name ?? '');
  const [kind, setKind] = useState(initialDevice?.kind ?? '');
  const [publishToHa, setPublishToHa] = useState(initialDevice?.publishToHa ?? false);
  const [behavior, setBehavior] = useState<DeviceBehavior>(initialDevice?.behavior ?? 'SWITCHED');
  const [ownFields, setOwnFields] = useState<DeviceOwnFields>(() =>
    initialDevice ? extractOwnFields(initialDevice) : defaultFieldsForBehavior(behavior)
  );

  const handleBehaviorChange = (next: DeviceBehavior) => {
    if (next === behavior) return;
    if (isEdit && !confirm('Zmiana zachowania wyczysci dotychczasowa konfiguracje szczegolowa tego aparatu. Kontynuowac?')) {
      return;
    }
    setBehavior(next);
    setOwnFields(defaultFieldsForBehavior(next));
  };

  const id = isEdit ? (initialDevice?.id ?? '') : (locationCode && suffix ? `${locationCode}_${suffix}` : '');

  const common: DeviceCommon = { id, designation, name, behavior, kind, publishToHa };
  const candidateDevice = assembleDevice(common, ownFields);

  const otherDevices = devices.filter(d => d.id !== (isEdit ? initialDevice?.id : undefined));
  const validation = validateDeviceRegistry({ locations, cards, devices: [...otherDevices, candidateDevice] });
  const ownIssues = validation.issues.filter(i => i.deviceId === id);

  const canAttemptSave = id.length > 0 && designation.trim().length > 0 && name.trim().length > 0 && kind.trim().length > 0;

  const handleSave = () => {
    if (!canAttemptSave) return;
    onSave(candidateDevice);
  };

  return (
    <>
      <div style={backdropStyle} onClick={onCancel} />
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>{isEdit ? `Edycja aparatu ${initialDevice?.id}` : 'Nowy aparat'}</span>
          <button onClick={onCancel} title="Anuluj" style={closeButtonStyle}>x</button>
        </div>

        <div style={bodyStyle}>
          <div className="property-group">
            <div className="property-row">
              <label>Id</label>
              {isEdit ? (
                <input value={id} readOnly disabled style={inputStyle} />
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select value={locationCode} onChange={e => setLocationCode(e.target.value)} style={inputStyle}>
                    <option value="">-</option>
                    {locations.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                  </select>
                  <span>_</span>
                  <input value={suffix} onChange={e => setSuffix(e.target.value)} style={inputStyle} placeholder="KMG1" />
                </div>
              )}
            </div>
            <div className="property-row">
              <label>Oznaczenie</label>
              <input value={designation} onChange={e => setDesignation(e.target.value)} style={inputStyle} placeholder="-K1" />
            </div>
            <div className="property-row">
              <label>Nazwa</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Stycznik grzalki" />
            </div>
            <div className="property-row">
              <label>Zachowanie</label>
              <select value={behavior} onChange={e => handleBehaviorChange(e.target.value as DeviceBehavior)} style={inputStyle}>
                {BEHAVIORS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="property-row">
              <label>Rodzaj</label>
              <input value={kind} onChange={e => setKind(e.target.value)} style={inputStyle} placeholder="contactor" list="device-kind-suggestions" />
              <datalist id="device-kind-suggestions">
                <option value="contactor" /><option value="valve" /><option value="damper" /><option value="sensor" /><option value="vfd" />
              </datalist>
            </div>
            <div className="property-row">
              <label>Publikuj do HA</label>
              <input type="checkbox" checked={publishToHa} onChange={e => setPublishToHa(e.target.checked)} />
            </div>
          </div>

          <div style={{ padding: '8px 12px', fontSize: `${FONT_SIZE_SMALL}px` }}>
            Szczegolowa konfiguracja zachowania {behavior} zostanie udostepniona w kolejnym kroku prac
            (formularze SWITCHED/SIGNAL, nastepnie MEASURED/MODULATED). Aparat zapisany teraz uzywa
            wartosci domyslnych i moze byc oznaczony jako niepoprawny do czasu uzupelnienia.
          </div>

          {ownIssues.length > 0 && (
            <div style={{ padding: '4px 12px' }}>
              {ownIssues.map((issue, i) => (
                <div key={i} style={errorStyle}>{issue.message}</div>
              ))}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onCancel}>Anuluj</button>
          <button onClick={handleSave} disabled={!canAttemptSave}>Zapisz</button>
        </div>
      </div>
    </>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'var(--scada-outline)', opacity: 0.5, zIndex: 1000
};

const dialogStyle: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 1002, width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
  background: 'var(--scada-panel)', border: '2px solid var(--scada-outline)', color: 'var(--scada-outline)',
  fontFamily: 'var(--scada-font-ui)', fontSize: 'var(--scada-font-size-base)'
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px', borderBottom: '1px solid var(--scada-outline)', fontWeight: 'bold'
};

const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer' };
const bodyStyle: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const inputStyle: React.CSSProperties = { width: '100%', fontSize: 'var(--scada-font-size-base)' };
const errorStyle: React.CSSProperties = { color: COLOR_ALARM, fontSize: `${FONT_SIZE_SMALL}px` };

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 12px', borderTop: '1px solid var(--scada-outline)'
};
