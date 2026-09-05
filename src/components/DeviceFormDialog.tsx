// feat/device-list-ui - the device configuration form.
//
// Commit 2 built the shell: the fields common to every behavior (id,
// designation, name, kind, publishToHa, the behavior picker) plus a
// schema-valid default skeleton for whichever behavior is chosen.
// Commit 3 (this version) adds the real SWITCHED and SIGNAL sections and
// starts blocking Save while validateDeviceRegistry reports an error for
// either of those two behaviors; commit 4 does the same for MEASURED and
// MODULATED (which still fall back to the commit-2 placeholder below
// until then).
//
// Same modal convention as MeterWizardDialog.tsx / DeviceRegistriesDialog.tsx.
// Every keystroke re-runs the candidate device through
// getDeviceOwnIssues/validateDeviceRegistry - the only place any rule
// about it is decided; this file (and DeviceFormFieldErrors.ts) only
// displays the resulting issues next to the field they are about, never
// invents a rule of its own.

import React, { useState } from 'react';
import { useStore } from '../store';
import type { Device, DeviceBehavior, DeviceCommon, ChannelAddress, MeasuredDevice } from '../project/DeviceSchema';
import { defaultFieldsForBehavior, assembleDevice } from '../project/DeviceFormDefaults';
import type { DeviceOwnFields, SwitchedOwnFields, SignalOwnFields, MeasuredOwnFields, ModulatedOwnFields } from '../project/DeviceFormDefaults';
import { getDeviceOwnIssues, mapDeviceIssuesToFields } from '../project/DeviceFormFieldErrors';
import { getOccupiedChannels } from '../project/DeviceRegistryQueries';
import { getMeasuredPreviewValue, formatMeasuredValue } from '../meter/MeterResolver';
import { ChannelAddressPicker } from './ChannelAddressPicker';
import { FONT_SIZE_SMALL, COLOR_ALARM } from '../theme/ScadaTheme';

const BEHAVIORS: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED'];
// Commit 3 gave SWITCHED/SIGNAL a real, field-level-validated form;
// commit 4 (this version) does the same for MEASURED/MODULATED - every
// behavior now blocks Save on error, no placeholder left.
const BEHAVIORS_WITH_FULL_FORM: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED'];

function splitId(id: string): { code: string; suffix: string } {
  const idx = id.indexOf('_');
  return idx >= 0 ? { code: id.slice(0, idx), suffix: id.slice(idx + 1) } : { code: '', suffix: id };
}

function extractOwnFields(device: Device): DeviceOwnFields {
  const { id: _id, designation: _designation, name: _name, behavior: _behavior, kind: _kind, publishToHa: _publishToHa, ...rest } = device;
  return rest as unknown as DeviceOwnFields;
}

/** Small helper: a field's own error messages, rendered directly under it. */
const FieldErrors: React.FC<{ messages?: string[] }> = ({ messages }) => {
  if (!messages || messages.length === 0) return null;
  return <>{messages.map((m, i) => <div key={i} style={errorStyle}>{m}</div>)}</>;
};

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

  const excludeId = isEdit ? initialDevice?.id : undefined;
  const otherDevices = devices.filter(d => d.id !== excludeId);
  const occupied = getOccupiedChannels(devices, excludeId);

  const ownIssues = getDeviceOwnIssues(candidateDevice, otherDevices, locations, cards);
  const fieldErrors = mapDeviceIssuesToFields(ownIssues, candidateDevice);

  const hasFullForm = BEHAVIORS_WITH_FULL_FORM.includes(behavior);
  const commonFieldsFilled = id.length > 0 && designation.trim().length > 0 && name.trim().length > 0 && kind.trim().length > 0;
  // Commit 3: for SWITCHED/SIGNAL, every field is now editable, so Save
  // is withheld until every reported issue is resolved. MEASURED/
  // MODULATED (commit 4's job) keep the earlier, lighter gate - their
  // fields cannot be fixed through this UI yet.
  const canAttemptSave = commonFieldsFilled && (!hasFullForm || ownIssues.length === 0);

  const handleSave = () => {
    if (!canAttemptSave) return;
    onSave(candidateDevice);
  };

  const switched = behavior === 'SWITCHED' ? (ownFields as SwitchedOwnFields) : null;
  const signal = behavior === 'SIGNAL' ? (ownFields as SignalOwnFields) : null;

  const patchSwitched = (patch: Partial<SwitchedOwnFields>) => setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), ...patch }));
  const patchSwitchedFeedback = (patch: Partial<SwitchedOwnFields['feedback']>) =>
    setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), feedback: { ...(prev as SwitchedOwnFields).feedback, ...patch } }));
  const patchSwitchedCommand = (patch: Partial<SwitchedOwnFields['command']>) =>
    setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), command: { ...(prev as SwitchedOwnFields).command, ...patch } }));
  const patchSwitchedSupervision = (patch: Partial<SwitchedOwnFields['supervision']>) =>
    setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), supervision: { ...(prev as SwitchedOwnFields).supervision, ...patch } }));
  const patchSwitchedSafeState = (patch: Partial<SwitchedOwnFields['safeState']>) =>
    setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), safeState: { ...(prev as SwitchedOwnFields).safeState, ...patch } }));
  const patchSwitchedExtraInput = (addr: ChannelAddress | undefined) =>
    setOwnFields(prev => ({ ...(prev as SwitchedOwnFields), extraInputs: addr ? { diFault: addr } : undefined }));

  const patchSignal = (patch: Partial<SignalOwnFields>) => setOwnFields(prev => ({ ...(prev as SignalOwnFields), ...patch }));
  const patchSignalFeedback = (patch: Partial<SignalOwnFields['feedback']>) =>
    setOwnFields(prev => ({ ...(prev as SignalOwnFields), feedback: { ...(prev as SignalOwnFields).feedback, ...patch } }));

  const measured = behavior === 'MEASURED' ? (ownFields as MeasuredOwnFields) : null;
  const patchMeasured = (patch: Partial<MeasuredOwnFields>) => setOwnFields(prev => ({ ...(prev as MeasuredOwnFields), ...patch }));

  const modulated = behavior === 'MODULATED' ? (ownFields as ModulatedOwnFields) : null;
  const patchModulated = (patch: Partial<ModulatedOwnFields>) => setOwnFields(prev => ({ ...(prev as ModulatedOwnFields), ...patch }));

  const outputHint = switched ? {
    '1-MAINTAINED': 'Jedno wyjscie utrzymywane - typowy stycznik/zawor z jedna cewka trzymana pod napieciem w stanie zalaczonym.',
    '1-PULSE': 'Jedno wyjscie impulsowe - typowy przekaznik bistabilny sterowany krotkim impulsem.',
    '2-MAINTAINED': 'Dwa wyjscia utrzymywane - typowy siownik/zawor trojpolozeniowy z oddzielnymi cewkami OTWORZ/ZAMKNIJ.',
    '2-PULSE': 'Dwa wyjscia impulsowe - typowy stycznik bistabilny z oddzielnymi impulsami ZALACZ/WYLACZ.'
  }[`${switched.command.outputCount}-${switched.command.style}`] : '';

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
              <FieldErrors messages={fieldErrors.get('id')} />
            </div>
            <div className="property-row">
              <label>Oznaczenie</label>
              <input value={designation} onChange={e => setDesignation(e.target.value)} style={inputStyle} placeholder="-K1" />
              <FieldErrors messages={fieldErrors.get('designation')} />
            </div>
            <div className="property-row">
              <label>Nazwa</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Stycznik grzalki" />
              <FieldErrors messages={fieldErrors.get('name')} />
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
              <FieldErrors messages={fieldErrors.get('kind')} />
            </div>
            <div className="property-row">
              <label>Publikuj do HA</label>
              <input type="checkbox" checked={publishToHa} onChange={e => setPublishToHa(e.target.checked)} />
            </div>
          </div>

          {switched && (
            <div className="property-group">
              <div style={sectionTitleStyle}>Wejscie zwrotne (feedback)</div>
              <div style={warningStyle}>
                Uwaga: tryb NONE oznacza sterowanie bez potwierdzenia rzeczywistego stanu aparatu -
                system nigdy nie wykryje, ze aparat nie wykonal polecenia.
              </div>
              <div style={warningStyle}>
                Uwaga: pojedyncze wejscie zwrotne (SINGLE) nie odroznia stanu posredniego ani zaniku
                sygnalu od stanu OFF - tylko DUAL wykrywa taka rozbieznosc.
              </div>
              <div className="property-row">
                <label>Tryb</label>
                <select value={switched.feedback.mode} onChange={e => patchSwitchedFeedback({ mode: e.target.value as SwitchedOwnFields['feedback']['mode'] })} style={inputStyle}>
                  <option value="DUAL">DUAL</option>
                  <option value="SINGLE">SINGLE</option>
                  <option value="NONE">NONE</option>
                </select>
              </div>
              {(switched.feedback.mode === 'DUAL' || switched.feedback.mode === 'SINGLE') && (
                <div className="property-row">
                  <label>diClosed</label>
                  <ChannelAddressPicker value={switched.feedback.diClosed} onChange={addr => patchSwitchedFeedback({ diClosed: addr })} expectedKind="DI" cards={cards} occupied={occupied} />
                  <FieldErrors messages={fieldErrors.get('feedback.diClosed')} />
                </div>
              )}
              {switched.feedback.mode === 'DUAL' && (
                <div className="property-row">
                  <label>diOpen</label>
                  <ChannelAddressPicker value={switched.feedback.diOpen} onChange={addr => patchSwitchedFeedback({ diOpen: addr })} expectedKind="DI" cards={cards} occupied={occupied} />
                  <FieldErrors messages={fieldErrors.get('feedback.diOpen')} />
                </div>
              )}
              {switched.feedback.mode === 'SINGLE' && (
                <div className="property-row">
                  <label>Neguj (invert)</label>
                  <input type="checkbox" checked={!!switched.feedback.invert} onChange={e => patchSwitchedFeedback({ invert: e.target.checked })} />
                </div>
              )}

              <details>
                <summary>Wejscia dodatkowe</summary>
                <div className="property-row">
                  <label>diFault</label>
                  <ChannelAddressPicker value={switched.extraInputs?.diFault} onChange={patchSwitchedExtraInput} expectedKind="DI" cards={cards} occupied={occupied} allowEmpty />
                  <FieldErrors messages={fieldErrors.get('extraInputs.diFault')} />
                </div>
              </details>

              <div style={sectionTitleStyle}>Sterowanie (command)</div>
              <div className="property-row">
                <label>Liczba wyjsc</label>
                <select value={switched.command.outputCount} onChange={e => patchSwitchedCommand({ outputCount: Number(e.target.value) as 1 | 2 })} style={inputStyle}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              <div className="property-row">
                <label>Styl</label>
                <select value={switched.command.style} onChange={e => patchSwitchedCommand({ style: e.target.value as SwitchedOwnFields['command']['style'] })} style={inputStyle}>
                  <option value="MAINTAINED">MAINTAINED</option>
                  <option value="PULSE">PULSE</option>
                </select>
              </div>
              <div style={hintStyle}>{outputHint}</div>
              <div className="property-row">
                <label>doClose</label>
                <ChannelAddressPicker value={switched.command.doClose} onChange={addr => patchSwitchedCommand({ doClose: addr ?? '' })} expectedKind="DO" cards={cards} occupied={occupied} />
                <FieldErrors messages={fieldErrors.get('command.doClose')} />
              </div>
              {switched.command.outputCount === 2 && (
                <div className="property-row">
                  <label>doOpen</label>
                  <ChannelAddressPicker value={switched.command.doOpen} onChange={addr => patchSwitchedCommand({ doOpen: addr })} expectedKind="DO" cards={cards} occupied={occupied} />
                  <FieldErrors messages={fieldErrors.get('command.doOpen')} />
                </div>
              )}
              {switched.command.style === 'PULSE' && (
                <div className="property-row">
                  <label>Czas impulsu (ms)</label>
                  <input type="number" value={switched.command.pulseMs ?? ''} onChange={e => patchSwitchedCommand({ pulseMs: Number(e.target.value) })} style={inputStyle} />
                  <FieldErrors messages={fieldErrors.get('command.pulseMs')} />
                </div>
              )}

              <div style={sectionTitleStyle}>Nadzor (supervision)</div>
              <div className="property-row">
                <label>Timeout potwierdzenia (ms)</label>
                <input type="number" value={switched.supervision.confirmTimeoutMs} onChange={e => patchSwitchedSupervision({ confirmTimeoutMs: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('supervision.confirmTimeoutMs')} />
              </div>
              <div style={hintStyle}>Czas na potwierdzenie zmiany stanu przez wejscie zwrotne, zanim zglaszany jest alarm rozbieznosci (min. 100 ms).</div>
              <div className="property-row">
                <label>Alarm rozbieznosci</label>
                <input type="checkbox" checked={switched.supervision.discrepancyAlarm} onChange={e => patchSwitchedSupervision({ discrepancyAlarm: e.target.checked })} />
              </div>

              <div style={sectionTitleStyle}>Stan bezpieczny (safeState)</div>
              <div className="property-row">
                <label>Przy starcie</label>
                <select value={switched.safeState.onStartup} onChange={e => patchSwitchedSafeState({ onStartup: e.target.value as SwitchedOwnFields['safeState']['onStartup'] })} style={inputStyle}>
                  <option value="NO_CHANGE">NO_CHANGE</option>
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSE">CLOSE</option>
                </select>
              </div>
              <div className="property-row">
                <label>Przy utracie lacznosci</label>
                <select value={switched.safeState.onLinkLoss} onChange={e => patchSwitchedSafeState({ onLinkLoss: e.target.value as SwitchedOwnFields['safeState']['onLinkLoss'] })} style={inputStyle}>
                  <option value="NO_CHANGE">NO_CHANGE</option>
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSE">CLOSE</option>
                </select>
              </div>

              <div className="property-row">
                <label>Licznik przelaczen</label>
                <input type="checkbox" checked={switched.switchCounter} onChange={e => patchSwitched({ switchCounter: e.target.checked })} />
              </div>
              <div style={hintStyle}>Zlicza przelaczenia aparatu (sygnal .COUNTER) - prog ostrzegawczy definiuje sie w Logic Studio, nie tutaj.</div>
            </div>
          )}

          {signal && (
            <div className="property-group">
              <div style={sectionTitleStyle}>Wejscie (feedback)</div>
              <div className="property-row">
                <label>di</label>
                <ChannelAddressPicker value={signal.feedback.di} onChange={addr => patchSignalFeedback({ di: addr ?? '' })} expectedKind="DI" cards={cards} occupied={occupied} />
                <FieldErrors messages={fieldErrors.get('feedback.di')} />
              </div>
              <div className="property-row">
                <label>Neguj (invert)</label>
                <input type="checkbox" checked={signal.feedback.invert} onChange={e => patchSignalFeedback({ invert: e.target.checked })} />
              </div>
              <div className="property-row">
                <label>Stan alarmowy</label>
                <select value={signal.alarmState} onChange={e => patchSignal({ alarmState: e.target.value as SignalOwnFields['alarmState'] })} style={inputStyle}>
                  <option value="HIGH">HIGH</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div className="property-row">
                <label>Debounce (ms)</label>
                <input type="number" value={signal.debounceMs} onChange={e => patchSignal({ debounceMs: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('debounceMs')} />
              </div>
            </div>
          )}

          {measured && (
            <div className="property-group">
              <div style={sectionTitleStyle}>Pomiar</div>
              <div className="property-row">
                <label>input</label>
                <ChannelAddressPicker value={measured.input} onChange={addr => patchMeasured({ input: addr ?? '' })} expectedKind="AI" cards={cards} occupied={occupied} />
                <FieldErrors messages={fieldErrors.get('input')} />
              </div>
              <div className="property-row">
                <label>Jednostka</label>
                <input value={measured.unit} onChange={e => patchMeasured({ unit: e.target.value })} style={inputStyle} placeholder="°C" />
                <FieldErrors messages={fieldErrors.get('unit')} />
              </div>
              <div className="property-row">
                <label>Zakres min</label>
                <input type="number" value={measured.rangeMin} onChange={e => patchMeasured({ rangeMin: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('rangeMin')} />
              </div>
              <div className="property-row">
                <label>Zakres max</label>
                <input type="number" value={measured.rangeMax} onChange={e => patchMeasured({ rangeMax: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('rangeMax')} />
              </div>
              <div className="property-row">
                <label>Format</label>
                <input value={measured.format} onChange={e => patchMeasured({ format: e.target.value })} style={inputStyle} placeholder="0.0" />
              </div>
              <div className="property-row">
                <label>Strefa martwa (deadband)</label>
                <input type="number" value={measured.deadband} onChange={e => patchMeasured({ deadband: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('deadband')} />
              </div>
              <div style={hintStyle}>
                {/* getMeasuredPreviewValue only ever reads rangeMin/rangeMax
                    (MeterResolver.ts's own contract) - the cast below stays
                    scoped to that, not a claim that this draft is otherwise
                    a complete MeasuredDevice yet. */}
                Podglad (srodek zakresu, edytor nie ma zywych danych): {formatMeasuredValue(getMeasuredPreviewValue({ rangeMin: measured.rangeMin, rangeMax: measured.rangeMax } as MeasuredDevice), measured.format)} {measured.unit}
              </div>
            </div>
          )}

          {modulated && (
            <div className="property-group">
              <div style={sectionTitleStyle}>Modulacja</div>
              <div className="property-row">
                <label>setpointOutput</label>
                <ChannelAddressPicker value={modulated.setpointOutput} onChange={addr => patchModulated({ setpointOutput: addr ?? '' })} expectedKind="AO" cards={cards} occupied={occupied} />
                <FieldErrors messages={fieldErrors.get('setpointOutput')} />
              </div>
              <div className="property-row">
                <label>feedbackInput</label>
                <ChannelAddressPicker value={modulated.feedbackInput} onChange={addr => patchModulated({ feedbackInput: addr })} expectedKind="AI" cards={cards} occupied={occupied} allowEmpty />
                <FieldErrors messages={fieldErrors.get('feedbackInput')} />
              </div>
              <div className="property-row">
                <label>Jednostka</label>
                <input value={modulated.unit} onChange={e => patchModulated({ unit: e.target.value })} style={inputStyle} placeholder="%" />
                <FieldErrors messages={fieldErrors.get('unit')} />
              </div>
              <div className="property-row">
                <label>Zakres min</label>
                <input type="number" value={modulated.rangeMin} onChange={e => patchModulated({ rangeMin: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('rangeMin')} />
              </div>
              <div className="property-row">
                <label>Zakres max</label>
                <input type="number" value={modulated.rangeMax} onChange={e => patchModulated({ rangeMax: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('rangeMax')} />
              </div>
              <div className="property-row">
                <label>Wartosc startowa</label>
                <input type="number" value={modulated.startupValue} onChange={e => patchModulated({ startupValue: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('startupValue')} />
              </div>
              <div className="property-row">
                <label>Wartosc bezpieczna</label>
                <input type="number" value={modulated.safeValue} onChange={e => patchModulated({ safeValue: Number(e.target.value) })} style={inputStyle} />
                <FieldErrors messages={fieldErrors.get('safeValue')} />
              </div>
            </div>
          )}

          <FieldErrors messages={fieldErrors.get('_general')} />
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
  zIndex: 1002, width: '520px', maxHeight: '82vh', display: 'flex', flexDirection: 'column',
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
const sectionTitleStyle: React.CSSProperties = { fontWeight: 'bold', padding: '6px 12px 2px' };
const warningStyle: React.CSSProperties = { padding: '0 12px 4px', fontSize: `${FONT_SIZE_SMALL}px` };
const hintStyle: React.CSSProperties = { padding: '0 12px 4px', fontSize: `${FONT_SIZE_SMALL}px`, fontStyle: 'italic' };

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 12px', borderTop: '1px solid var(--scada-outline)'
};
