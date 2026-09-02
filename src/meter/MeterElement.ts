// The meter element (feat/meter-element, part A): a screen element that
// shows measurement values, one per row. Deliberately NOT a symbol - it
// has no terminals, no fixed canvas, no entry in SymbolRegistry, and
// lives in its own store array (see store.ts's `meters`), not `objects`.
// Its height is never set by hand: it is always derived from how many
// rows it has, whether it has a title, and its own font size (see
// computeMeterHeight below) - there is deliberately no height field on
// the model at all.
//
// Pure, Konva-free (safe to import from a Vitest test run under Node),
// the same convention GridSnap.ts/Terminals.ts/WireDrawing.ts already
// established for logic shared between the canvas and tests.

/**
 * One row of a meter. `device` is a device id from the project's device
 * list (src/project/DeviceSchema.ts) - empty means a manual row. Which
 * of manualValue/manualUnit vs. the device's own unit/format/designation
 * actually gets shown is Part B's job (src/meter/MeterResolver.ts); this
 * file only holds the row's own raw fields and the height math, which
 * needs nothing from a device.
 */
export interface MeterElementRow {
  device: string;       // device id, or '' for a manual row
  label: string;        // '' = fall back to the device's designation (part B)
  manualValue: string;  // used only when device is ''
  manualUnit: string;   // used only when device is ''
}

export interface MeterElement {
  id: string;
  x: number;
  y: number;
  width: number;        // user-set, clamped to [METER_MIN_WIDTH, METER_MAX_WIDTH]
  title?: string;        // optional, bold + centered + underlined with a divider when present
  fontSize: number;      // defaults to METER_DEFAULT_FONT_SIZE
  rows: MeterElementRow[];
}

export const METER_MIN_WIDTH = 120;
export const METER_MAX_WIDTH = 480;
export const METER_DEFAULT_FONT_SIZE = 12;

/** Keeps a user-entered width inside the element's own [min, max] spec. */
export function clampMeterWidth(width: number): number {
  if (!Number.isFinite(width)) return METER_MIN_WIDTH;
  return Math.min(METER_MAX_WIDTH, Math.max(METER_MIN_WIDTH, width));
}

// ---- Height ---------------------------------------------------------

// A row's own height and the title block's height both scale with the
// element's fontSize - the same "everything derives from one number"
// idea CONDUCTOR_WIDTH/BUSBAR_HEIGHT already apply to ScadaTheme's grid
// geometry, applied here to text instead. At the default fontSize (12)
// this lands a row at 24px and a title block at 24px, matching the
// existing scada.meter symbol's fixed METER_ROW_HEIGHT/
// METER_TITLE_HEIGHT (24) - not reused code (this element is
// deliberately independent of that symbol, per its own spec), just the
// same comfortable proportion, arrived at independently.
const METER_PADDING_Y = 10;
const ROW_HEIGHT_FACTOR = 2;
const TITLE_HEIGHT_FACTOR = 1.5;
const TITLE_DIVIDER_GAP = 6; // space the title's underline + margin below it takes

/**
 * The meter's total rendered height - purely a function of row count,
 * title presence and font size. Never throws, including for zero rows:
 * an empty meter is still a valid (if minimal) panel, per the task's
 * own explicit "renders without exception" requirement.
 */
export function computeMeterHeight(meter: Pick<MeterElement, 'title' | 'fontSize' | 'rows'>): number {
  const fontSize = meter.fontSize || METER_DEFAULT_FONT_SIZE;
  const rowHeight = fontSize * ROW_HEIGHT_FACTOR;
  const titleHeight = meter.title ? fontSize * TITLE_HEIGHT_FACTOR + TITLE_DIVIDER_GAP : 0;
  const rowCount = Math.max(0, meter.rows?.length || 0);
  return METER_PADDING_Y * 2 + titleHeight + rowCount * rowHeight;
}

// ---- Manual row display (part A) -------------------------------------

/**
 * A manual row's own "value unit" text, straight from its own fields -
 * no device involved. A device-linked row (row.device truthy) is not
 * this function's concern at all: resolving what a device-linked row
 * shows is Part B's job (MeterResolver.ts), which supersedes this for
 * that case. Empty when both fields are empty, not " " or "undefined".
 */
export function formatManualRowValue(row: MeterElementRow): string {
  const parts = [row.manualValue, row.manualUnit].filter(p => !!p);
  return parts.join(' ');
}
