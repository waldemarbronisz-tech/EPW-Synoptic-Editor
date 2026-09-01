// Signal/command enumeration for the EPW Device Registry (DeviceSchema.ts).
//
// The signal set is ALWAYS derived from device.behavior (and, for SWITCHED,
// from extraInputs.diFault / switchCounter) - never declared in the device
// config itself. A declared list could drift from the actual configuration;
// a derived one has no way to lie.

import type { Device } from './DeviceSchema';

/** Signals a device makes available for control logic to READ. */
export function getDeviceSignals(device: Device): string[] {
  switch (device.behavior) {
    case 'SWITCHED': {
      const signals = ['.STATE', '.DISCREPANCY'];
      if (device.extraInputs?.diFault) signals.push('.FAULT');
      if (device.switchCounter) signals.push('.COUNTER');
      return signals;
    }
    case 'SIGNAL':
      return ['.STATE'];
    case 'MEASURED':
      return ['.VALUE', '.QUALITY'];
    case 'MODULATED':
      return ['.SETPOINT', '.FEEDBACK'];
  }
}

/**
 * Commands control logic may ISSUE to a device. Logic is entitled to
 * command any SWITCHED or MODULATED device - there is not, and must never
 * be, a field that enables or disables control from logic.
 */
export function getDeviceCommands(device: Device): string[] {
  switch (device.behavior) {
    case 'SWITCHED':
      return ['.CLOSE', '.OPEN'];
    case 'SIGNAL':
      return [];
    case 'MEASURED':
      return [];
    case 'MODULATED':
      return ['.SET'];
  }
}

/** Full point names for reading, e.g. 'KOT_KMG1.STATE'. */
export function getDeviceSignalNames(device: Device): string[] {
  return getDeviceSignals(device).map(suffix => `${device.id}${suffix}`);
}

/** Full point names for commanding, e.g. 'KOT_KMG1.CLOSE'. */
export function getDeviceCommandNames(device: Device): string[] {
  return getDeviceCommands(device).map(suffix => `${device.id}${suffix}`);
}
