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

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Device, DeviceBehavior, DeviceCommon, ChannelAddress, MeasuredDevice, SelectorPosition } from '../project/DeviceSchema';
import { defaultFieldsForBehavior, assembleDevice } from '../project/DeviceFormDefaults';
import type { DeviceOwnFields, SwitchedOwnFields, SignalOwnFields, MeasuredOwnFields, ModulatedOwnFields, SelectorOwnFields } from '../project/DeviceFormDefaults';
import { getDeviceOwnIssues, mapDeviceIssuesToFields } from '../project/DeviceFormFieldErrors';
import { getOccupiedChannels } from '../project/DeviceRegistryQueries';
import { getMeasuredPreviewValue, formatMeasuredValue } from '../meter/MeterResolver';
import { ChannelAddressPicker } from './ChannelAddressPicker';
import { AddLocationDialog } from './AddLocationDialog';
import { AssignExistingDeviceList } from './AssignExistingDeviceList';
import { suggestBehaviorForSymbolType } from '../project/SymbolBehaviorMapping';
import { suggestNextDeviceIdSuffix, suggestNextDesignation, deriveKindFromSymbolType } from '../project/DeviceCreationSuggestions';
import { FONT_SIZE_SMALL, COLOR_ALARM } from '../theme/ScadaTheme';

const BEHAVIORS: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED', 'SELECTOR'];
// Commit 3 gave SWITCHED/SIGNAL a real, field-level-validated form;
// commit 4 did the same for MEASURED/MODULATED; feat/control-elements
// commit 1 does the same for SELECTOR - every behavior now blocks Save
// on error, no placeholder left.
const BEHAVIORS_WITH_FULL_FORM: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED', 'SELECTOR'];

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

// fix/inline-device-creation commit 3: passed only when this form was
// opened from a device-less symbol's own double-click
// (openDeviceCreateOrAssignForm/deviceCreateOrAssignRequest) - GRANICE's
// "do not create a second device form, only extend the existing one
// with modes" means this whole flow lives INSIDE DeviceFormDialog
// itself (an internal UTWORZ NOWY/PRZYPISZ ISTNIEJACY mode switcher),
// never as a second, parallel dialog.
export interface DeviceFormCreationContext {
  // SynopticObject.type of the originating symbol - feeds
  // SymbolBehaviorMapping.ts's own suggestBehaviorForSymbolType and
  // DeviceCreationSuggestions.ts's own id/designation suggestions, and
  // PRZYPISZ ISTNIEJACY's own behavior pre-filter.
  symbolType: string;
  // PRZYPISZ ISTNIEJACY's own "Przypisz" button calls this with the
  // selected device's id - a completely different save path from
  // onSave below (nothing is created or edited, only the symbol's own
  // deviceId is set), so it is never routed through onSave/canAttemptSave.
  onAssignExisting: (deviceId: string) => void;
}

export interface DeviceFormDialogProps {
  mode: 'add' | 'edit';
  // For 'edit': the device being edited. For 'add': present only when
  // opened from Duplicate (id/designation already cleared by the caller,
  // DeviceListDialog) - everything else is pre-filled from it.
  initialDevice?: Device;
  onSave: (device: Device) => void;
  onCancel: () => void;
  // feat/device-form-from-canvas commit 3a: where this form was opened
  // from, shown as a second header line when present - e.g. "Schemat,
  // symbol -K1". Left undefined by Lista aparatow's own Dodaj/Edytuj
  // (DeviceListDialog.tsx never passes this prop at all), so that
  // path's header stays exactly what it always was - one line, nothing
  // more (task 3b/GRANICE: don't change it).
  sourceContext?: string;
  creationContext?: DeviceFormCreationContext;
}

export const DeviceFormDialog: React.FC<DeviceFormDialogProps> = ({ mode, initialDevice, onSave, onCancel, sourceContext, creationContext }) => {
  const locations = useStore(s => s.locations);
  const cards = useStore(s => s.cards);
  const devices = useStore(s => s.devices);
  const objects = useStore(s => s.objects);
  const isEdit = mode === 'edit';

  const initialSplit = initialDevice ? splitId(initialDevice.id) : { code: locations[0]?.code ?? '', suffix: '' };
  const [locationCode, setLocationCode] = useState(initialSplit.code);
  const [suffix, setSuffix] = useState(initialSplit.suffix);
  const [designation, setDesignation] = useState(isEdit ? (initialDevice?.designation ?? '') : '');
  const [name, setName] = useState(initialDevice?.name ?? '');
  const [kind, setKind] = useState(initialDevice?.kind ?? '');
  const [publishToHa, setPublishToHa] = useState(initialDevice?.publishToHa ?? false);
  // fix/inline-device-creation commit 3: '' is a genuine third state,
  // "not chosen yet" - only reachable when this form was opened from a
  // device-less symbol whose type is OUTSIDE SymbolBehaviorMapping.ts's
  // own mapping (suggestBehaviorForSymbolType returns undefined). Every
  // other path (edit, ordinary add, or a symbol type that IS in the
  // mapping) still starts with a real DeviceBehavior exactly as before -
  // this never changes what Lista aparatow's own Dodaj already did.
  const [behavior, setBehavior] = useState<DeviceBehavior | ''>(() => {
    if (initialDevice) return initialDevice.behavior;
    if (creationContext) return suggestBehaviorForSymbolType(creationContext.symbolType) ?? '';
    return 'SWITCHED';
  });
  const [ownFields, setOwnFields] = useState<DeviceOwnFields>(() =>
    initialDevice ? extractOwnFields(initialDevice) : defaultFieldsForBehavior(behavior || 'SWITCHED')
  );
  // fix/inline-device-creation commit 2: "+ Dodaj lokalizacje" next to
  // the location <select> below - see AddLocationDialog.tsx's own
  // header for the shared check/save path it uses.
  const [showAddLocation, setShowAddLocation] = useState(false);

  // fix/inline-device-creation commit 3: the mode switcher shown at the
  // top of the window only when this form was opened from a device-less
  // symbol - UTWORZ NOWY (this component's own ordinary add form, just
  // pre-suggested) or PRZYPISZ ISTNIEJACY (AssignExistingDeviceList
  // below, an entirely different body/footer, still the SAME window).
  const [createOrAssignMode, setCreateOrAssignMode] = useState<'create' | 'assign'>('create');
  const [assignSelectedId, setAssignSelectedId] = useState<string | null>(null);

  // fix/inline-device-creation commit 3b: after picking a location, the
  // suggested id suffix and designation are typed AND selected so the
  // first keystroke overwrites them - suffixInputRef/designationInputRef
  // are focused+selected via suggestionNonce (bumped only by an actual
  // auto-suggestion, never by ordinary typing) and, as a safety net for
  // whenever the user tabs back into either field later, both also
  // select-on-focus (see the inputs themselves, below).
  const suffixInputRef = useRef<HTMLInputElement>(null);
  const [suggestionNonce, setSuggestionNonce] = useState(0);
  useEffect(() => {
    // suggestionNonce is only ever bumped from inside handleLocationChange's
    // own `if (!creationContext || !code) return;` guard below, so
    // creationContext is implicitly already known truthy here - checking
    // it again would only add a dependency-array entry for an object
    // App.tsx recreates on every render, without changing what this does.
    if (suggestionNonce > 0) {
      suffixInputRef.current?.focus();
      suffixInputRef.current?.select();
    }
  }, [suggestionNonce]);

  const handleLocationChange = (code: string) => {
    setLocationCode(code);
    if (!creationContext || !code) return;
    const effectiveKind = kind.trim() || deriveKindFromSymbolType(creationContext.symbolType);
    if (!kind.trim()) setKind(effectiveKind);
    const effectiveBehavior = behavior || suggestBehaviorForSymbolType(creationContext.symbolType) || 'SWITCHED';
    setSuffix(suggestNextDeviceIdSuffix(code, effectiveKind, devices));
    setDesignation(suggestNextDesignation(code, effectiveBehavior, effectiveKind, devices));
    setSuggestionNonce(n => n + 1);
  };

  const handleBehaviorChange = (next: DeviceBehavior) => {
    if (next === behavior) return;
    if (isEdit && !confirm('Zmiana zachowania wyczysci dotychczasowa konfiguracje szczegolowa tego aparatu. Kontynuowac?')) {
      return;
    }
    setBehavior(next);
    setOwnFields(defaultFieldsForBehavior(next));
  };

  const id = isEdit ? (initialDevice?.id ?? '') : (locationCode && suffix ? `${locationCode}_${suffix}` : '');

  const common: DeviceCommon = { id, designation, name, behavior: behavior || 'SWITCHED', kind, publishToHa };
  const candidateDevice = assembleDevice(common, ownFields);

  // feat/device-form-from-canvas commit 3c: whatever the very first
  // candidateDevice looked like, on mount, in EITHER mode - a fresh
  // 'add' draft's own defaults are just as much "nothing to lose yet"
  // as an 'edit' draft's own initialDevice. Captured once (a lazy
  // initializer never re-runs), compared against on every render, so
  // Escape can tell "the user actually changed something" from "they
  // opened the form and immediately hit Escape" without touching any
  // of the many existing patchXxx functions above.
  const [pristineJson] = useState(() => JSON.stringify(candidateDevice));
  const hasUnsavedChanges = JSON.stringify(candidateDevice) !== pristineJson;

  const dialogRef = useRef<HTMLDivElement>(null);

  const excludeId = isEdit ? initialDevice?.id : undefined;
  const otherDevices = devices.filter(d => d.id !== excludeId);
  const occupied = getOccupiedChannels(devices, excludeId);

  const ownIssues = getDeviceOwnIssues(candidateDevice, otherDevices, locations, cards);
  const fieldErrors = mapDeviceIssuesToFields(ownIssues, candidateDevice);

  const hasFullForm = behavior !== '' && BEHAVIORS_WITH_FULL_FORM.includes(behavior);
  const commonFieldsFilled = id.length > 0 && designation.trim().length > 0 && name.trim().length > 0 && kind.trim().length > 0;
  // Commit 3: for SWITCHED/SIGNAL, every field is now editable, so Save
  // is withheld until every reported issue is resolved. MEASURED/
  // MODULATED (commit 4's job) keep the earlier, lighter gate - their
  // fields cannot be fixed through this UI yet.
  // fix/inline-device-creation commit 3: behavior === '' (only reachable
  // via creationContext - see this file's own comment on that state)
  // blocks Save outright, same as any other unfilled common field.
  const canAttemptSave = behavior !== '' && commonFieldsFilled && (!hasFullForm || ownIssues.length === 0);

  const handleSave = () => {
    if (!canAttemptSave) return;
    onSave(candidateDevice);
  };

  // feat/device-form-from-canvas commit 3c: Escape closes without
  // saving - confirmed first if anything was actually changed. Scoped
  // to Escape alone, on purpose: the backdrop click, the header's own
  // "x" and the footer's own Anuluj all still call onCancel directly,
  // completely unchanged, exactly as before this commit (no
  // confirmation there either, same as today) - GRANICE's own "don't
  // touch what isn't asked" applies as much to already-working buttons
  // as to anything else. A plain onKeyDown prop on this dialog's own
  // root div, deliberately NOT a window-level addEventListener the way
  // Canvas.tsx's own keyboard shortcuts are wired - see this file's own
  // note on the dialogRef/tabIndex below for why.
  const handleEscape = () => {
    if (hasUnsavedChanges && !confirm('Masz niezapisane zmiany w formularzu aparatu. Zamknac bez zapisywania?')) {
      return;
    }
    onCancel();
  };

  // The dialog's own root div holds keyboard focus from the moment it
  // opens (tabIndex={-1} makes a plain div programmatically focusable
  // without joining the tab order) so Escape is caught even before the
  // user has clicked into any field - React's own onKeyDown bubbles up
  // from whatever has focus through every ancestor exactly like a real
  // keypress does, the same mechanism every <input>'s own onChange
  // already relies on, and a genuinely different code path from a
  // manually-added window-level listener (this project's own Help
  // window investigation found ONE such listener, in a lazily-mounted
  // component, that mysteriously never received Escape specifically,
  // while every other key worked - never conclusively root-caused;
  // sidestepped entirely here rather than risking the same class of
  // bug again).
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

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
  // feat/control-elements commit 3: interlock is pure documentation
  // (DeviceSchema.ts's own SwitchedDevice comment) - both fields are
  // optional strings, so once BOTH are blank there is nothing left to
  // keep: the whole object collapses back to undefined rather than
  // persisting as {closeDescription: '', openDescription: ''}, the
  // same "an empty optional is absent, not a saved empty" convention
  // extraInputs above already follows.
  const patchSwitchedInterlock = (patch: Partial<NonNullable<SwitchedOwnFields['interlock']>>) =>
    setOwnFields(prev => {
      const next = { ...(prev as SwitchedOwnFields).interlock, ...patch };
      const isEmpty = !next.closeDescription?.trim() && !next.openDescription?.trim();
      return { ...(prev as SwitchedOwnFields), interlock: isEmpty ? undefined : next };
    });

  const patchSignal = (patch: Partial<SignalOwnFields>) => setOwnFields(prev => ({ ...(prev as SignalOwnFields), ...patch }));
  const patchSignalFeedback = (patch: Partial<SignalOwnFields['feedback']>) =>
    setOwnFields(prev => ({ ...(prev as SignalOwnFields), feedback: { ...(prev as SignalOwnFields).feedback, ...patch } }));

  const measured = behavior === 'MEASURED' ? (ownFields as MeasuredOwnFields) : null;
  const patchMeasured = (patch: Partial<MeasuredOwnFields>) => setOwnFields(prev => ({ ...(prev as MeasuredOwnFields), ...patch }));

  const modulated = behavior === 'MODULATED' ? (ownFields as ModulatedOwnFields) : null;
  const patchModulated = (patch: Partial<ModulatedOwnFields>) => setOwnFields(prev => ({ ...(prev as ModulatedOwnFields), ...patch }));

  const selector = behavior === 'SELECTOR' ? (ownFields as SelectorOwnFields) : null;
  const patchSelectorPosition = (index: number, patch: Partial<SelectorPosition>) =>
    setOwnFields(prev => {
      const positions = (prev as SelectorOwnFields).positions.slice();
      positions[index] = { ...positions[index], ...patch };
      return { ...(prev as SelectorOwnFields), positions };
    });
  const addSelectorPosition = () =>
    setOwnFields(prev => ({ ...(prev as SelectorOwnFields), positions: [...(prev as SelectorOwnFields).positions, { name: '' }] }));
  const removeSelectorPosition = (index: number) =>
    setOwnFields(prev => ({ ...(prev as SelectorOwnFields), positions: (prev as SelectorOwnFields).positions.filter((_, i) => i !== index) }));

  const outputHint = switched ? {
    '1-MAINTAINED': 'Jedno wyjscie utrzymywane - typowy stycznik/zawor z jedna cewka trzymana pod napieciem w stanie zalaczonym.',
    '1-PULSE': 'Jedno wyjscie impulsowe - typowy przekaznik bistabilny sterowany krotkim impulsem.',
    '2-MAINTAINED': 'Dwa wyjscia utrzymywane - typowy siownik/zawor trojpolozeniowy z oddzielnymi cewkami OTWORZ/ZAMKNIJ.',
    '2-PULSE': 'Dwa wyjscia impulsowe - typowy stycznik bistabilny z oddzielnymi impulsami ZALACZ/WYLACZ.'
  }[`${switched.command.outputCount}-${switched.command.style}`] : '';

  return (
    <>
      <div style={backdropStyle} onClick={onCancel} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') handleEscape(); }}
      >
        <div style={headerStyle}>
          <div>
            <div>
              {isEdit
                ? `Edycja aparatu ${initialDevice?.id}`
                : (creationContext && createOrAssignMode === 'assign' ? 'Przypisz aparat' : 'Nowy aparat')}
            </div>
            {/* 3a: shown only when the caller passed one (every entry
                point but Lista aparatow's own Dodaj/Edytuj) - see this
                prop's own comment on DeviceFormDialogProps for why.
                fix/inline-device-creation commit 3: for the create-or-
                assign flow, App.tsx always passes one (screen name and
                symbol kind - deviceCreateOrAssignRequest.sourceContext
                is not optional, unlike deviceFormRequest's own). */}
            {sourceContext && <div style={sourceContextStyle}>{sourceContext}</div>}
          </div>
          <button onClick={onCancel} title="Anuluj" style={closeButtonStyle}>x</button>
        </div>

        {/* fix/inline-device-creation commit 3: the two-mode switcher -
            only for a device-less symbol's own double-click. Double-
            clicking a symbol that already has a device still opens
            plain edit mode, no switcher at all (creationContext is
            never passed there). */}
        {creationContext && !isEdit && (
          <div style={modeTabBarStyle}>
            <div
              style={createOrAssignMode === 'create' ? modeTabActiveStyle : modeTabInactiveStyle}
              onClick={() => setCreateOrAssignMode('create')}
            >
              Utworz nowy
            </div>
            <div
              style={createOrAssignMode === 'assign' ? modeTabActiveStyle : modeTabInactiveStyle}
              onClick={() => setCreateOrAssignMode('assign')}
            >
              Przypisz istniejacy
            </div>
          </div>
        )}

        {creationContext && !isEdit && createOrAssignMode === 'assign' ? (
          <AssignExistingDeviceList
            devices={devices}
            objects={objects}
            suggestedBehavior={suggestBehaviorForSymbolType(creationContext.symbolType)}
            selectedId={assignSelectedId}
            onSelect={setAssignSelectedId}
          />
        ) : (
        <div style={bodyStyle}>
          <div className="property-group">
            <div className="property-row">
              <label>Id</label>
              {isEdit ? (
                <input value={id} readOnly disabled style={inputStyle} />
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select value={locationCode} onChange={e => handleLocationChange(e.target.value)} style={inputStyle}>
                    <option value="">-</option>
                    {locations.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAddLocation(true)} title="Dodaj nowa lokalizacje">+</button>
                  <span>_</span>
                  <input
                    ref={suffixInputRef}
                    value={suffix}
                    onChange={e => setSuffix(e.target.value)}
                    onFocus={e => e.target.select()}
                    style={inputStyle}
                    placeholder="KMG1"
                  />
                </div>
              )}
              {showAddLocation && (
                <AddLocationDialog
                  onAdded={(code) => { setShowAddLocation(false); handleLocationChange(code); }}
                  onCancel={() => setShowAddLocation(false)}
                />
              )}
              <FieldErrors messages={fieldErrors.get('id')} />
            </div>
            <div className="property-row">
              <label>Oznaczenie</label>
              <input
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                onFocus={e => creationContext && e.target.select()}
                style={inputStyle}
                placeholder="-K1"
              />
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
                {/* fix/inline-device-creation commit 3: only reachable
                    when a device-less symbol's own type is outside
                    SymbolBehaviorMapping.ts's mapping - the suggestion
                    is always changeable, but here there is none to start
                    from, so the user must pick explicitly (Save stays
                    disabled until they do). */}
                {behavior === '' && <option value="">-- wybierz --</option>}
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

              <div style={sectionTitleStyle}>Blokady (interlock)</div>
              <div style={warningStyle}>
                Wylacznie opis dla operatora/inzyniera - nie definiuje tu zadnej logiki. Rzeczywista
                wartosc blokady (.INHIBIT_CLOSE/.INHIBIT_OPEN) jest zapisywana przez logike w
                EPW-Logic-Studio; ten opis tylko wyjasnia, DLACZEGO polecenie moze zostac odrzucone.
              </div>
              <div className="property-row">
                <label>Opis blokady ZAMKNIJ</label>
                <input
                  value={switched.interlock?.closeDescription ?? ''}
                  onChange={e => patchSwitchedInterlock({ closeDescription: e.target.value })}
                  style={inputStyle}
                  placeholder="np. Zablokowane, gdy drzwi rozdzielnicy sa otwarte"
                />
              </div>
              <div className="property-row">
                <label>Opis blokady OTWORZ</label>
                <input
                  value={switched.interlock?.openDescription ?? ''}
                  onChange={e => patchSwitchedInterlock({ openDescription: e.target.value })}
                  style={inputStyle}
                  placeholder="np. Zablokowane podczas biegu pompy rezerwowej"
                />
              </div>
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

          {selector && (
            <div className="property-group">
              <div style={sectionTitleStyle}>Polozenia (positions)</div>
              <div style={warningStyle}>
                Przelacznik jest odczytywany, nigdy sterowany zdalnie - obraca sie go recznie
                na szafie. Musza byc co najmniej 2 polozenia; wejscie zwrotne (DI) jest
                opcjonalne dla kazdego z nich.
              </div>
              {/* fix/audit-findings commit 1: always visible, not tied
                  to any error state - a single position's own feedback
                  is optional, but the audit found that a selector where
                  NONE of them have one passed validation anyway (no
                  input at all, so it can never report where it is). */}
              <div style={warningStyle}>
                Co najmniej jedna pozycja musi miec przypisane wejscie. Pozycje bez
                wejscia sa dozwolone - stan takiej pozycji wnioskuje sie z pozostalych.
              </div>
              <FieldErrors messages={fieldErrors.get('positions')} />
              {selector.positions.map((position, i) => (
                <div key={i} className="property-row">
                  <input
                    value={position.name}
                    onChange={e => patchSelectorPosition(i, { name: e.target.value })}
                    style={inputStyle}
                    placeholder="RECZNIE"
                  />
                  <ChannelAddressPicker
                    value={position.feedback}
                    onChange={addr => patchSelectorPosition(i, { feedback: addr })}
                    expectedKind="DI"
                    cards={cards}
                    occupied={occupied}
                    allowEmpty
                  />
                  <button onClick={() => removeSelectorPosition(i)} disabled={selector.positions.length <= 2} title={selector.positions.length <= 2 ? 'Wymagane co najmniej 2 polozenia' : 'Usun to polozenie'}>x</button>
                  <FieldErrors messages={fieldErrors.get(`positions[${i}].feedback`)} />
                </div>
              ))}
              <div className="property-row">
                <button onClick={addSelectorPosition}>+ Dodaj polozenie</button>
              </div>
            </div>
          )}

          <FieldErrors messages={fieldErrors.get('_general')} />
        </div>
        )}

        <div style={footerStyle}>
          <button onClick={onCancel}>Anuluj</button>
          {creationContext && !isEdit && createOrAssignMode === 'assign' ? (
            <button
              onClick={() => assignSelectedId && creationContext.onAssignExisting(assignSelectedId)}
              disabled={!assignSelectedId}
            >
              Przypisz
            </button>
          ) : (
            <button onClick={handleSave} disabled={!canAttemptSave}>Zapisz</button>
          )}
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
// 3a: a lighter, non-bold second header line - the title above it
// already carries fontWeight: 'bold' from headerStyle, this one
// deliberately does not, so the two read as "what" then "where from",
// not two equally-weighted titles.
const sourceContextStyle: React.CSSProperties = { fontWeight: 'normal', fontSize: `${FONT_SIZE_SMALL}px`, marginTop: '2px' };
// fix/inline-device-creation commit 3: same tab-bar convention
// DeviceRegistriesDialog.tsx's own Lokalizacje/Karty tabs already use.
const modeTabBarStyle: React.CSSProperties = { display: 'flex', borderBottom: '1px solid var(--scada-outline)' };
const modeTabBaseStyle: React.CSSProperties = { padding: '6px 16px', cursor: 'pointer' };
const modeTabActiveStyle: React.CSSProperties = { ...modeTabBaseStyle, background: 'var(--scada-value-field)', fontWeight: 'bold' };
const modeTabInactiveStyle: React.CSSProperties = { ...modeTabBaseStyle };
const bodyStyle: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const inputStyle: React.CSSProperties = { width: '100%', fontSize: 'var(--scada-font-size-base)' };
const errorStyle: React.CSSProperties = { color: COLOR_ALARM, fontSize: `${FONT_SIZE_SMALL}px` };
const sectionTitleStyle: React.CSSProperties = { fontWeight: 'bold', padding: '6px 12px 2px' };
const warningStyle: React.CSSProperties = { padding: '0 12px 4px', fontSize: `${FONT_SIZE_SMALL}px` };
const hintStyle: React.CSSProperties = { padding: '0 12px 4px', fontSize: `${FONT_SIZE_SMALL}px`, fontStyle: 'italic' };

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 12px', borderTop: '1px solid var(--scada-outline)'
};
