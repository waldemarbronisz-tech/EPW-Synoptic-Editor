// feat/device-form-from-canvas commit 1 - what happens to placed
// symbols when their bound device is saved through the shared device
// form (App.tsx's own onSave, driven by deviceFormSlice.ts). Pure,
// Konva-free (same convention as DeviceLookup.ts/DeviceBindingValidation.ts).
//
// A SynopticObject's own `designation` field is deliberately NOT a
// live read of its device's designation - it is a separate, directly
// user-editable label field, only ever auto-filled from the device's
// designation ONCE, when a device is first assigned to a symbol whose
// own designation is still empty (see PropertyInspector.tsx's own
// handleDeviceChange comment: "a device is never removed from the
// label once filled, and an already-set designation is never
// overwritten"). Saving a LATER change to the device's own designation
// through this form re-applies that exact same rule, not a new one:
// every symbol bound to this device whose own designation still
// EXACTLY MATCHES what the device's designation was before this save
// (never customized away from it) gets updated to the new value;
// anything the user typed in by hand that differs is left untouched,
// on every symbol, every time - the same "never overwrite a
// customization" guarantee, just checked again on every save instead
// of only the first one.

import type { Device } from './DeviceSchema';
import type { SynopticObject } from '../store/types';

/**
 * Every object-update the store's own updateObjects needs to apply
 * after a device's designation changed - empty when it did not change
 * at all, or when nothing currently matches the old value.
 */
export function syncObjectDesignationsAfterDeviceSave(
  objects: SynopticObject[],
  oldDesignation: string,
  savedDevice: Device
): { id: string; updates: Partial<SynopticObject> }[] {
  if (savedDevice.designation === oldDesignation) return [];
  return objects
    .filter(o => o.deviceId === savedDevice.id && o.designation === oldDesignation)
    .map(o => ({ id: o.id, updates: { designation: savedDevice.designation } }));
}
