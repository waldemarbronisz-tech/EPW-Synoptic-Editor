// Which of a device's own fields carry a channel address or a
// validation-relevant name, per behavior - a SHAPE enumeration mirroring
// DeviceSchema.ts's own type layout, not a validation RULE (it never
// decides right or wrong, only "where do I look"). DeviceValidation.ts
// has an equivalent private helper (getDeviceChannelAddresses) it never
// exports, so the UI needs its own - this is that, kept to field
// enumeration only, with GRANICE's own "do not duplicate the validator's
// rules" respected by construction: nothing here checks a channel kind,
// a range, or any other business rule - validateDeviceRegistry
// (DeviceValidation.ts) remains the only place that happens.

import type { Device, ChannelAddress } from './DeviceSchema';

export interface DeviceAddressField {
  field: string;
  addr: ChannelAddress;
}

/** Every channel-address-bearing field a device currently has a value in, with a dotted label matching DeviceValidation.ts's own field-label convention (e.g. 'command.doClose') - used for channel-usage queries (DeviceRegistryQueries.ts) and for attributing a validation issue's message text back to a form field (DeviceFormFieldErrors.ts). */
export function getDeviceChannelAddressFields(device: Device): DeviceAddressField[] {
  const result: DeviceAddressField[] = [];
  switch (device.behavior) {
    case 'SWITCHED':
      if (device.feedback.diClosed) result.push({ field: 'feedback.diClosed', addr: device.feedback.diClosed });
      if (device.feedback.diOpen) result.push({ field: 'feedback.diOpen', addr: device.feedback.diOpen });
      if (device.extraInputs?.diFault) result.push({ field: 'extraInputs.diFault', addr: device.extraInputs.diFault });
      result.push({ field: 'command.doClose', addr: device.command.doClose });
      if (device.command.doOpen) result.push({ field: 'command.doOpen', addr: device.command.doOpen });
      break;
    case 'SIGNAL':
      result.push({ field: 'feedback.di', addr: device.feedback.di });
      break;
    case 'MEASURED':
      result.push({ field: 'input', addr: device.input });
      break;
    case 'MODULATED':
      result.push({ field: 'setpointOutput', addr: device.setpointOutput });
      if (device.feedbackInput) result.push({ field: 'feedbackInput', addr: device.feedbackInput });
      break;
  }
  return result;
}
