// Validation for the EPW Device Registry (DeviceSchema.ts). Pure functions,
// no side effects, no dependency on the app store - callable from any of
// the three EPW applications that share this contract.
//
// Result shape mirrors ProjectSchema.ts's validateProjectSchema convention
// (severity / code / message), with `deviceId` standing in for that file's
// `objectId` since issues here are about devices, not synoptic objects.
//
// EVERY violation below is an ERROR, never a WARNING. This format is a
// contract between three applications - a warning would mean a file can be
// invalid and still be accepted downstream.
//
// validateDeviceRegistry takes `unknown`, not DeviceRegistry: it validates
// JSON loaded from disk - hand-edited, migrated from an older version, or
// corrupted. TypeScript's types protect code, not data read from a file.
// A shape-checking pass runs BEFORE any business rule: if a value does not
// have the right shape, it is reported once, clearly, and excluded from
// further rule checks for that item - one readable error instead of a
// cascade of secondary ones. The validator must never throw on any input;
// a malformed file must produce a message, not a crash.

import type { CardEntry, ChannelAddress, ChannelKind, Device, DeviceBehavior, LocationEntry } from './DeviceSchema';

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  deviceId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const CHANNEL_KINDS: ChannelKind[] = ['DI', 'DO', 'AI', 'AO'];
const DEVICE_BEHAVIORS: DeviceBehavior[] = ['SWITCHED', 'SIGNAL', 'MEASURED', 'MODULATED'];

// ---- shape primitives --------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// NaN and Infinity both satisfy `typeof x === 'number'` - Number.isFinite
// is what actually rejects them.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Splits 'ELA1.DI.12' into { card: 'ELA1', kind: 'DI', channel: 12 }.
 * Returns null for anything not in CARD.KIND.CHANNEL format.
 */
export function parseChannelAddress(addr: string): { card: string; kind: ChannelKind; channel: number } | null {
  if (typeof addr !== 'string') return null;

  const parts = addr.split('.');
  if (parts.length !== 3) return null;

  const [card, kindRaw, channelRaw] = parts;
  if (!card) return null;
  if (!(CHANNEL_KINDS as string[]).includes(kindRaw)) return null;
  if (!/^[0-9]+$/.test(channelRaw)) return null;

  return { card, kind: kindRaw as ChannelKind, channel: parseInt(channelRaw, 10) };
}

/**
 * Device id rules: only A-Z, 0-9 and underscore; exactly one underscore;
 * the part before it must be a registered location code; the part after
 * it must be non-empty.
 */
export function validateDeviceId(id: string, locations: LocationEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof id !== 'string' || id.length === 0) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_ID_EMPTY', message: 'Device id must be a non-empty string' });
    return issues;
  }

  if (!/^[A-Z0-9_]+$/.test(id)) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_ID_INVALID_CHARS', message: `Device id '${id}' must contain only A-Z, 0-9 and underscore`, deviceId: id });
  }

  const underscoreCount = (id.match(/_/g) || []).length;
  if (underscoreCount !== 1) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_ID_UNDERSCORE_COUNT', message: `Device id '${id}' must contain exactly one underscore, found ${underscoreCount}`, deviceId: id });
    return issues;
  }

  const [locationCode, suffix] = id.split('_');
  const knownCodes = new Set(locations.map(l => l.code));

  if (!knownCodes.has(locationCode)) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_ID_UNKNOWN_LOCATION', message: `Device id '${id}' references unregistered location '${locationCode}'`, deviceId: id });
  }

  if (!suffix) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_ID_EMPTY_SUFFIX', message: `Device id '${id}' has an empty part after the underscore`, deviceId: id });
  }

  return issues;
}

/**
 * Channel address rules: must parse (see parseChannelAddress), the card
 * must exist in the card registry, its channelKind must match the address,
 * and the channel number must be within 1..channelCount.
 */
export function validateChannelAddress(addr: ChannelAddress, cards: CardEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = parseChannelAddress(addr);

  if (!parsed) {
    issues.push({ severity: 'ERROR', code: 'CHANNEL_ADDRESS_INVALID_FORMAT', message: `Channel address '${addr}' is not in CARD.KIND.CHANNEL format` });
    return issues;
  }

  const card = cards.find(c => c.id === parsed.card);
  if (!card) {
    issues.push({ severity: 'ERROR', code: 'CHANNEL_ADDRESS_UNKNOWN_CARD', message: `Channel address '${addr}' references unknown card '${parsed.card}'` });
    return issues;
  }

  if (card.channelKind !== parsed.kind) {
    issues.push({ severity: 'ERROR', code: 'CHANNEL_ADDRESS_KIND_MISMATCH', message: `Channel address '${addr}' has kind '${parsed.kind}' but card '${card.id}' is '${card.channelKind}'` });
  }

  if (parsed.channel < 1 || parsed.channel > card.channelCount) {
    issues.push({ severity: 'ERROR', code: 'CHANNEL_ADDRESS_OUT_OF_RANGE', message: `Channel address '${addr}' channel ${parsed.channel} is out of range 1..${card.channelCount} for card '${card.id}'` });
  }

  return issues;
}

/** Checks that `addr` (if present) is syntactically a channel of `expectedKind`. */
function checkChannelKind(issues: ValidationIssue[], deviceId: string, fieldLabel: string, addr: ChannelAddress | undefined, expectedKind: ChannelKind): void {
  if (!addr) return;

  const parsed = parseChannelAddress(addr);
  if (!parsed) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_FIELD_INVALID_ADDRESS', message: `Device '${deviceId}' field '${fieldLabel}' address '${addr}' is not a valid channel address`, deviceId });
    return;
  }

  if (parsed.kind !== expectedKind) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_FIELD_WRONG_CHANNEL_KIND', message: `Device '${deviceId}' field '${fieldLabel}' must be a ${expectedKind} channel, got '${parsed.kind}' ('${addr}')`, deviceId });
  }
}

/**
 * Checks field presence/absence rules that depend on the device's behavior
 * and mode (feedback.mode, command.outputCount, command.style), and that
 * every channel address field has the channel kind its role requires.
 */
export function validateDeviceFields(device: Device): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = device.id;

  switch (device.behavior) {
    case 'SWITCHED': {
      const { feedback, command } = device;

      if (feedback.mode === 'DUAL') {
        if (!feedback.diClosed) issues.push({ severity: 'ERROR', code: 'SWITCHED_DUAL_MISSING_DICLOSED', message: `Device '${id}': feedback.mode DUAL requires diClosed`, deviceId: id });
        if (!feedback.diOpen) issues.push({ severity: 'ERROR', code: 'SWITCHED_DUAL_MISSING_DIOPEN', message: `Device '${id}': feedback.mode DUAL requires diOpen`, deviceId: id });
        if (feedback.invert !== undefined) issues.push({ severity: 'ERROR', code: 'SWITCHED_DUAL_FORBIDDEN_INVERT', message: `Device '${id}': feedback.invert is not allowed when feedback.mode is DUAL`, deviceId: id });
      } else if (feedback.mode === 'SINGLE') {
        if (!feedback.diClosed) issues.push({ severity: 'ERROR', code: 'SWITCHED_SINGLE_MISSING_DICLOSED', message: `Device '${id}': feedback.mode SINGLE requires diClosed`, deviceId: id });
        if (feedback.diOpen) issues.push({ severity: 'ERROR', code: 'SWITCHED_SINGLE_FORBIDDEN_DIOPEN', message: `Device '${id}': feedback.diOpen is not allowed when feedback.mode is SINGLE`, deviceId: id });
      } else if (feedback.mode === 'NONE') {
        if (feedback.diClosed) issues.push({ severity: 'ERROR', code: 'SWITCHED_NONE_FORBIDDEN_DICLOSED', message: `Device '${id}': feedback.diClosed is not allowed when feedback.mode is NONE`, deviceId: id });
        if (feedback.diOpen) issues.push({ severity: 'ERROR', code: 'SWITCHED_NONE_FORBIDDEN_DIOPEN', message: `Device '${id}': feedback.diOpen is not allowed when feedback.mode is NONE`, deviceId: id });
      }

      if (command.outputCount === 2 && !command.doOpen) {
        issues.push({ severity: 'ERROR', code: 'SWITCHED_OUTPUT2_MISSING_DOOPEN', message: `Device '${id}': command.outputCount 2 requires command.doOpen`, deviceId: id });
      }
      if (command.outputCount === 1 && command.doOpen) {
        issues.push({ severity: 'ERROR', code: 'SWITCHED_OUTPUT1_FORBIDDEN_DOOPEN', message: `Device '${id}': command.doOpen is not allowed when command.outputCount is 1`, deviceId: id });
      }

      if (command.style === 'PULSE') {
        if (typeof command.pulseMs !== 'number' || !(command.pulseMs > 0)) {
          issues.push({ severity: 'ERROR', code: 'SWITCHED_PULSE_MISSING_PULSEMS', message: `Device '${id}': command.style PULSE requires command.pulseMs greater than zero`, deviceId: id });
        }
      } else if (command.style === 'MAINTAINED') {
        if (command.pulseMs !== undefined) {
          issues.push({ severity: 'ERROR', code: 'SWITCHED_MAINTAINED_FORBIDDEN_PULSEMS', message: `Device '${id}': command.pulseMs is not allowed when command.style is MAINTAINED`, deviceId: id });
        }
      }

      checkChannelKind(issues, id, 'command.doClose', command.doClose, 'DO');
      checkChannelKind(issues, id, 'command.doOpen', command.doOpen, 'DO');
      checkChannelKind(issues, id, 'feedback.diClosed', feedback.diClosed, 'DI');
      checkChannelKind(issues, id, 'feedback.diOpen', feedback.diOpen, 'DI');
      checkChannelKind(issues, id, 'extraInputs.diFault', device.extraInputs?.diFault, 'DI');
      break;
    }

    case 'SIGNAL': {
      checkChannelKind(issues, id, 'feedback.di', device.feedback.di, 'DI');
      break;
    }

    case 'MEASURED': {
      checkChannelKind(issues, id, 'input', device.input, 'AI');
      if (!(device.rangeMin < device.rangeMax)) {
        issues.push({ severity: 'ERROR', code: 'MEASURED_INVALID_RANGE', message: `Device '${id}': rangeMin must be less than rangeMax`, deviceId: id });
      }
      if (!(device.deadband >= 0)) {
        issues.push({ severity: 'ERROR', code: 'MEASURED_INVALID_DEADBAND', message: `Device '${id}': deadband must be >= 0`, deviceId: id });
      }
      break;
    }

    case 'MODULATED': {
      checkChannelKind(issues, id, 'setpointOutput', device.setpointOutput, 'AO');
      if (device.feedbackInput) {
        checkChannelKind(issues, id, 'feedbackInput', device.feedbackInput, 'AI');
      }
      if (!(device.rangeMin < device.rangeMax)) {
        issues.push({ severity: 'ERROR', code: 'MODULATED_INVALID_RANGE', message: `Device '${id}': rangeMin must be less than rangeMax`, deviceId: id });
      }
      if (!(device.startupValue >= device.rangeMin && device.startupValue <= device.rangeMax)) {
        issues.push({ severity: 'ERROR', code: 'MODULATED_STARTUP_OUT_OF_RANGE', message: `Device '${id}': startupValue must be within rangeMin..rangeMax`, deviceId: id });
      }
      if (!(device.safeValue >= device.rangeMin && device.safeValue <= device.rangeMax)) {
        issues.push({ severity: 'ERROR', code: 'MODULATED_SAFE_OUT_OF_RANGE', message: `Device '${id}': safeValue must be within rangeMin..rangeMax`, deviceId: id });
      }
      break;
    }
  }

  return issues;
}

// ---- shape validation ---------------------------------------------------
// Each function below checks ONE item's shape against the exact fields its
// behavior requires. On success it returns a properly-typed value; on
// failure it pushes ONE issue describing everything wrong with that item
// and returns null, so the caller skips business-rule checks for it
// entirely rather than cascading secondary errors.

function validateLocationShape(raw: unknown, index: number, issues: ValidationIssue[]): LocationEntry | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'LOCATION_INVALID_SHAPE', message: `Location at index ${index} must be an object` });
    return null;
  }

  const problems: string[] = [];
  if (!isString(raw.code)) problems.push('code must be a string');
  if (!isString(raw.description)) problems.push('description must be a string');

  if (problems.length > 0) {
    issues.push({ severity: 'ERROR', code: 'LOCATION_INVALID_SHAPE', message: `Location at index ${index}: ${problems.join('; ')}` });
    return null;
  }

  return { code: raw.code as string, description: raw.description as string };
}

function validateCardShape(raw: unknown, index: number, issues: ValidationIssue[]): CardEntry | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'CARD_INVALID_SHAPE', message: `Card at index ${index} must be an object` });
    return null;
  }

  const problems: string[] = [];
  if (!isString(raw.id)) problems.push('id must be a string');
  if (!isString(raw.model)) problems.push('model must be a string');
  if (!isFiniteNumber(raw.channelCount)) problems.push('channelCount must be a finite number');
  if (!(CHANNEL_KINDS as string[]).includes(raw.channelKind as string)) problems.push("channelKind must be one of 'DI','DO','AI','AO'");

  if (problems.length > 0) {
    issues.push({ severity: 'ERROR', code: 'CARD_INVALID_SHAPE', message: `Card at index ${index}: ${problems.join('; ')}` });
    return null;
  }

  return { id: raw.id as string, model: raw.model as string, channelKind: raw.channelKind as ChannelKind, channelCount: raw.channelCount as number };
}

function validateDeviceShape(raw: unknown, index: number, issues: ValidationIssue[]): Device | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_INVALID_SHAPE', message: `Device at index ${index} must be an object` });
    return null;
  }

  const idForMessages = isString(raw.id) ? raw.id : `#${index}`;
  const problems: string[] = [];

  if (!isString(raw.id)) problems.push('id must be a string');
  if (!isString(raw.designation)) problems.push('designation must be a string');
  if (!isString(raw.name)) problems.push('name must be a string');
  if (!isString(raw.kind)) problems.push('kind must be a string');
  if (!isBoolean(raw.publishToHa)) problems.push('publishToHa must be a boolean');

  if (!(DEVICE_BEHAVIORS as string[]).includes(raw.behavior as string)) {
    if (problems.length > 0) {
      issues.push({ severity: 'ERROR', code: 'DEVICE_INVALID_SHAPE', message: `Device '${idForMessages}': ${problems.join('; ')}`, deviceId: isString(raw.id) ? raw.id : undefined });
    }
    issues.push({
      severity: 'ERROR',
      code: 'DEVICE_UNKNOWN_BEHAVIOR',
      message: `Device '${idForMessages}': unknown behavior '${String(raw.behavior)}', expected one of SWITCHED, SIGNAL, MEASURED, MODULATED`,
      deviceId: isString(raw.id) ? raw.id : undefined
    });
    return null;
  }

  const behavior = raw.behavior as DeviceBehavior;

  switch (behavior) {
    case 'SWITCHED': {
      const feedbackOk = isPlainObject(raw.feedback);
      const commandOk = isPlainObject(raw.command);
      if (!feedbackOk) problems.push('feedback must be an object');
      if (!commandOk) problems.push('command must be an object');
      if (!isPlainObject(raw.supervision)) problems.push('supervision must be an object');
      if (!isPlainObject(raw.safeState)) problems.push('safeState must be an object');
      if (!isBoolean(raw.switchCounter)) problems.push('switchCounter must be a boolean');

      if (feedbackOk && !['DUAL', 'SINGLE', 'NONE'].includes((raw.feedback as Record<string, unknown>).mode as string)) {
        problems.push("feedback.mode must be one of 'DUAL','SINGLE','NONE'");
      }
      if (commandOk) {
        const command = raw.command as Record<string, unknown>;
        if (command.outputCount !== 1 && command.outputCount !== 2) {
          problems.push('command.outputCount must be 1 or 2');
        }
        if (!['MAINTAINED', 'PULSE'].includes(command.style as string)) {
          problems.push("command.style must be one of 'MAINTAINED','PULSE'");
        }
      }
      if (isPlainObject(raw.safeState)) {
        const safeState = raw.safeState as Record<string, unknown>;
        if (!['NO_CHANGE', 'OPEN', 'CLOSE'].includes(safeState.onStartup as string)) {
          problems.push("safeState.onStartup must be one of 'NO_CHANGE','OPEN','CLOSE'");
        }
        if (!['NO_CHANGE', 'OPEN', 'CLOSE'].includes(safeState.onLinkLoss as string)) {
          problems.push("safeState.onLinkLoss must be one of 'NO_CHANGE','OPEN','CLOSE'");
        }
      }
      break;
    }

    case 'SIGNAL': {
      if (!isPlainObject(raw.feedback)) problems.push('feedback must be an object');
      if (!['HIGH', 'LOW'].includes(raw.alarmState as string)) problems.push("alarmState must be one of 'HIGH','LOW'");
      if (!isFiniteNumber(raw.debounceMs)) problems.push('debounceMs must be a finite number');
      break;
    }

    case 'MEASURED': {
      if (!isString(raw.input)) problems.push('input must be a string');
      if (!isString(raw.unit)) problems.push('unit must be a string');
      if (!isString(raw.format)) problems.push('format must be a string');
      if (!isFiniteNumber(raw.rangeMin)) problems.push('rangeMin must be a finite number');
      if (!isFiniteNumber(raw.rangeMax)) problems.push('rangeMax must be a finite number');
      if (!isFiniteNumber(raw.deadband)) problems.push('deadband must be a finite number');
      break;
    }

    case 'MODULATED': {
      if (!isString(raw.setpointOutput)) problems.push('setpointOutput must be a string');
      if (!isString(raw.unit)) problems.push('unit must be a string');
      if (!isFiniteNumber(raw.rangeMin)) problems.push('rangeMin must be a finite number');
      if (!isFiniteNumber(raw.rangeMax)) problems.push('rangeMax must be a finite number');
      if (!isFiniteNumber(raw.startupValue)) problems.push('startupValue must be a finite number');
      if (!isFiniteNumber(raw.safeValue)) problems.push('safeValue must be a finite number');
      break;
    }
  }

  if (problems.length > 0) {
    issues.push({ severity: 'ERROR', code: 'DEVICE_INVALID_SHAPE', message: `Device '${idForMessages}': ${problems.join('; ')}`, deviceId: isString(raw.id) ? raw.id : undefined });
    return null;
  }

  // Every field this behavior requires has been shape-checked above; fields
  // not listed by the task's shape contract (e.g. feedback.diClosed,
  // command.pulseMs) are left to validateDeviceFields, which already
  // tolerates missing/wrong-typed optional channel addresses without
  // throwing (parseChannelAddress rejects non-strings outright).
  return raw as unknown as Device;
}

/** Every channel address field a device declares, with a label for messages. */
function getDeviceChannelAddresses(device: Device): { field: string; addr: ChannelAddress }[] {
  const result: { field: string; addr: ChannelAddress }[] = [];

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

/**
 * Validates a whole device registry loaded from an untrusted source (JSON
 * from disk: hand-edited, migrated, or corrupted). Shape is checked first,
 * item by item; anything with the wrong shape is reported once and
 * excluded from the business-rule checks below (id uniqueness, designation
 * uniqueness within a location, channel address collisions across all
 * devices, location/card registry integrity).
 */
export function validateDeviceRegistry(registry: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(registry)) {
    issues.push({ severity: 'ERROR', code: 'REGISTRY_INVALID_SHAPE', message: 'Device registry must be an object' });
    return { valid: false, issues };
  }

  const locationsRaw = registry.locations;
  const cardsRaw = registry.cards;
  const devicesRaw = registry.devices;

  const locationsOk = Array.isArray(locationsRaw);
  const cardsOk = Array.isArray(cardsRaw);
  const devicesOk = Array.isArray(devicesRaw);

  if (!locationsOk) issues.push({ severity: 'ERROR', code: 'REGISTRY_INVALID_LOCATIONS', message: 'registry.locations must be an array' });
  if (!cardsOk) issues.push({ severity: 'ERROR', code: 'REGISTRY_INVALID_CARDS', message: 'registry.cards must be an array' });
  if (!devicesOk) issues.push({ severity: 'ERROR', code: 'REGISTRY_INVALID_DEVICES', message: 'registry.devices must be an array' });

  const locations: LocationEntry[] = locationsOk
    ? (locationsRaw as unknown[]).map((raw, i) => validateLocationShape(raw, i, issues)).filter((l): l is LocationEntry => l !== null)
    : [];
  const cards: CardEntry[] = cardsOk
    ? (cardsRaw as unknown[]).map((raw, i) => validateCardShape(raw, i, issues)).filter((c): c is CardEntry => c !== null)
    : [];
  const devices: Device[] = devicesOk
    ? (devicesRaw as unknown[]).map((raw, i) => validateDeviceShape(raw, i, issues)).filter((d): d is Device => d !== null)
    : [];

  const seenLocationCodes = new Set<string>();
  for (const loc of locations) {
    if (!/^[A-Z0-9]+$/.test(loc.code)) {
      issues.push({ severity: 'ERROR', code: 'LOCATION_INVALID_CODE', message: `Location code '${loc.code}' must contain only A-Z and 0-9` });
    }
    if (seenLocationCodes.has(loc.code)) {
      issues.push({ severity: 'ERROR', code: 'LOCATION_DUPLICATE_CODE', message: `Duplicate location code '${loc.code}'` });
    }
    seenLocationCodes.add(loc.code);
  }

  const seenCardIds = new Set<string>();
  for (const card of cards) {
    if (!/^[A-Z0-9]+$/.test(card.id)) {
      issues.push({ severity: 'ERROR', code: 'CARD_INVALID_ID', message: `Card id '${card.id}' must contain only A-Z and 0-9` });
    }
    if (seenCardIds.has(card.id)) {
      issues.push({ severity: 'ERROR', code: 'CARD_DUPLICATE_ID', message: `Duplicate card id '${card.id}'` });
    }
    seenCardIds.add(card.id);
    if (!(card.channelCount > 0)) {
      issues.push({ severity: 'ERROR', code: 'CARD_INVALID_CHANNEL_COUNT', message: `Card '${card.id}' channelCount must be greater than zero` });
    }
  }

  const seenDeviceIds = new Set<string>();
  const designationsByLocation = new Map<string, Map<string, string>>();
  const channelUsage = new Map<string, { deviceId: string; field: string }>();

  for (const device of devices) {
    issues.push(...validateDeviceId(device.id, locations));
    issues.push(...validateDeviceFields(device));

    if (seenDeviceIds.has(device.id)) {
      issues.push({ severity: 'ERROR', code: 'DEVICE_DUPLICATE_ID', message: `Duplicate device id '${device.id}'`, deviceId: device.id });
    }
    seenDeviceIds.add(device.id);

    const underscoreIdx = device.id.indexOf('_');
    const locationPrefix = underscoreIdx >= 0 ? device.id.slice(0, underscoreIdx) : device.id;
    if (!designationsByLocation.has(locationPrefix)) {
      designationsByLocation.set(locationPrefix, new Map());
    }
    const designationMap = designationsByLocation.get(locationPrefix)!;
    if (designationMap.has(device.designation)) {
      issues.push({
        severity: 'ERROR',
        code: 'DEVICE_DUPLICATE_DESIGNATION_IN_LOCATION',
        message: `Duplicate designation '${device.designation}' in location '${locationPrefix}' (devices '${designationMap.get(device.designation)}' and '${device.id}')`,
        deviceId: device.id
      });
    } else {
      designationMap.set(device.designation, device.id);
    }

    for (const { field, addr } of getDeviceChannelAddresses(device)) {
      issues.push(...validateChannelAddress(addr, cards));

      const existing = channelUsage.get(addr);
      if (existing) {
        issues.push({
          severity: 'ERROR',
          code: 'CHANNEL_ADDRESS_COLLISION',
          message: `Channel address '${addr}' is used by both '${existing.deviceId}' (${existing.field}) and '${device.id}' (${field})`,
          deviceId: device.id
        });
      } else {
        channelUsage.set(addr, { deviceId: device.id, field });
      }
    }
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');
  return { valid: !hasErrors, issues };
}
