// EPW SCADA visual theme - retro-industrial HMI style (Wonderware/iFIX
// era: flat fills, black outlines, color carries meaning and nothing
// else, conductors thicker than the symbols riding on them, strictly
// orthogonal routing).
//
// No other file may define these colors or these thicknesses on its own -
// every scada/ symbol imports them from here. A symbol may still use its
// own literal numbers for dimensions and outline widths the task gave it
// explicitly (e.g. the busbar's 3px outline, the label frame's 4px
// outline) - what must never be hand-written elsewhere is a PALETTE
// COLOR: every color a symbol paints with comes from this file.

// ---- Palette (exact values) ----

export const COLOR_CANVAS_BACKGROUND = '#00CFCF'; // tlo plotna
export const COLOR_OUTLINE = '#000000';           // kontur
export const COLOR_TEXT = COLOR_OUTLINE;          // tekst - same black as the outline
export const COLOR_PANEL = '#C6C6C6';             // panel
export const COLOR_BEVEL_LIGHT = '#F2F2F2';       // fazowanie jasne
export const COLOR_BEVEL_DARK = '#585858';        // fazowanie ciemne
export const COLOR_VALUE_FIELD = '#F2F2F2';       // pole wartosci
export const COLOR_ENERGIZED = '#E01000';         // pod napieciem
export const COLOR_DE_ENERGIZED = '#909090';      // bez napiecia
export const COLOR_RUN = '#00A800';               // stan zalaczony
export const COLOR_ALARM = '#D80000';             // stan alarmowy
export const COLOR_LAMP_LIT = '#FFE800';          // lampa swiecaca
export const COLOR_WATER = '#2848D8';             // woda
export const COLOR_WHITE = '#FFFFFF';             // biel

// Ventilation (third medium, feat/media-and-proportions part B): gold
// reads clearly against both power's red and water's blue, and against
// the cyan canvas background - ACTIVE is a duct actually moving air,
// INACTIVE is a stopped/idle one, the same LIVE/DEAD split every other
// medium's conductor color already makes.
export const VENTILATION_ACTIVE = '#C89000';      // wentylacja aktywna
export const VENTILATION_INACTIVE = '#8A7A50';    // wentylacja nieaktywna

// ---- Geometry ----

// Conductor/symbol proportions derived directly from the grid (feat/
// media-and-proportions, part A): a conductor riding half a grid cell
// reads as a wire under an apparatus symbol, not the other way round -
// the earlier values (11/6/22) made a breaker on a power run get lost
// inside its own cable, confirmed by eye in the running app.
export const CONDUCTOR_WIDTH = 8;    // grubosc rdzenia przewodu - pol oczka siatki
export const CONDUCTOR_OUTLINE = 4;  // laczna grubosc konturu (po 2 z kazdej strony)
export const SYMBOL_STROKE = 5;      // grubosc kreski wewnatrz symbolu
export const OUTLINE_WIDTH = 5;      // kontur ksztaltow wypelnionych (default; a
                                      // symbol may specify its own different
                                      // outline width when the task's spec for
                                      // that symbol gives one explicitly)
export const BUSBAR_HEIGHT = 16;     // wysokosc szyny zbiorczej - dokladnie jedno oczko
export const GRID_SIZE = 16;

// feat/appearance-selection-frames commit 1: the indicator diode was
// drawn far too large relative to the row text beside it (confirmed by
// eye: a ten-row signal panel reads as a column of huge circles with
// the label an afterthought). These replace the two literal radii
// (8/12) IndicatorDiodeSymbol.tsx used to hold locally - moved here so
// every other place a diode radius might be needed reads the same
// single source, not a coincidentally-equal copy.
export const DIODE_RADIUS_SMALL = 5;  // przy aparatach na schemacie
export const DIODE_RADIUS_LARGE = 7;  // w panelach sygnalizacyjnych i stanu

// fix/handles-insert-mode-diodes commit 3: a lit (ON/ALARM/QUALITY)
// diode read as dark, matte, "painted" rather than actually glowing -
// confirmed by eye in the running app. These are the diode's OWN
// colors, deliberately separate from the state colors every other
// symbol paints with (COLOR_RUN/COLOR_ALARM/COLOR_LAMP_LIT) per this
// fix's own explicit spec, so the diode's own look can be tuned
// (brightness, the lit-core highlight below) without changing what
// every OTHER symbol's run/alarm/quality color means. The *_CORE
// colors are a brighter, smaller inner circle drawn only for a LIT
// state (IndicatorDiodeSymbol.tsx) - their own absence for OFF is
// what makes OFF read as "not lit", not a color choice of its own.
export const DIODE_ON = '#00E838';
export const DIODE_ON_CORE = '#A0FFB0';
export const DIODE_OFF = '#3C4048';
export const DIODE_ALARM = '#FF2020';
export const DIODE_ALARM_CORE = '#FFA0A0';
export const DIODE_QUALITY = '#FFD000';
export const DIODE_QUALITY_CORE = '#FFF0A0';

// ---- Typography ----
// One narrow sans-serif for everything that is a LABEL (row
// descriptions, object labels, titles) and one fixed-width face for
// everything that is a VALUE (a number, with or without a unit) - the
// same "flat, technical, nothing decorative" spirit the color palette
// above already commits to. Narrow is deliberate: a retro-industrial
// SCADA HMI's text reads denser and more technical than a default
// Arial ever does. Every component that draws text on the canvas, or
// in the surrounding HTML chrome, reads its font from here - never a
// hand-picked family or pixel size of its own (this file's own header
// comment already makes this rule for colors; it now also covers
// fonts).
export const FONT_UI = 'Tahoma, Verdana, "DejaVu Sans", sans-serif';
export const FONT_VALUE = 'Consolas, "DejaVu Sans Mono", monospace';
export const FONT_SIZE_BASE = 13;   // opisy wierszy, etykiety, teksty na plotnie
export const FONT_SIZE_SMALL = 11;  // druga linia etykiety, opisy pomocnicze
export const FONT_SIZE_TITLE = 14;  // tytuly miernika, panelu, ramki

// ---- Bridge into CSS -----------------------------------------------------
// CSS cannot import a TypeScript module, so the interface chrome (panels,
// toolbar, property fields) reads these values through CSS custom
// properties instead of a second, hand-copied set of hex literals. This
// function is the ONLY place that writes them, and it must be called
// exactly once, synchronously, before the app's first paint (see
// src/main.tsx) - never at this module's top level, so importing
// ScadaTheme.ts (e.g. from a Vitest test running under Node, with no
// `document`) stays side-effect-free.
export function applyScadaCssVariables(target: HTMLElement = document.documentElement): void {
  target.style.setProperty('--scada-canvas-bg', COLOR_CANVAS_BACKGROUND);
  target.style.setProperty('--scada-outline', COLOR_OUTLINE);
  target.style.setProperty('--scada-panel', COLOR_PANEL);
  target.style.setProperty('--scada-bevel-light', COLOR_BEVEL_LIGHT);
  target.style.setProperty('--scada-bevel-dark', COLOR_BEVEL_DARK);
  target.style.setProperty('--scada-value-field', COLOR_VALUE_FIELD);
  target.style.setProperty('--scada-white', COLOR_WHITE);
  target.style.setProperty('--scada-energized', COLOR_ENERGIZED);
  target.style.setProperty('--scada-de-energized', COLOR_DE_ENERGIZED);
  target.style.setProperty('--scada-run', COLOR_RUN);
  target.style.setProperty('--scada-alarm', COLOR_ALARM);
  target.style.setProperty('--scada-lamp-lit', COLOR_LAMP_LIT);
  target.style.setProperty('--scada-water', COLOR_WATER);
  target.style.setProperty('--scada-ventilation-active', VENTILATION_ACTIVE);
  target.style.setProperty('--scada-ventilation-inactive', VENTILATION_INACTIVE);
  target.style.setProperty('--scada-font-ui', FONT_UI);
  target.style.setProperty('--scada-font-value', FONT_VALUE);
  target.style.setProperty('--scada-font-size-base', `${FONT_SIZE_BASE}px`);
  target.style.setProperty('--scada-font-size-small', `${FONT_SIZE_SMALL}px`);
  target.style.setProperty('--scada-font-size-title', `${FONT_SIZE_TITLE}px`);
}
