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

// ---- Geometry ----

export const CONDUCTOR_WIDTH = 11;   // grubosc rdzenia przewodu
export const CONDUCTOR_OUTLINE = 6;  // laczna grubosc konturu (po 3 z kazdej strony)
export const SYMBOL_STROKE = 6;      // grubosc kreski wewnatrz symbolu
export const OUTLINE_WIDTH = 5;      // kontur ksztaltow wypelnionych (default; a
                                      // symbol may specify its own different
                                      // outline width when the task's spec for
                                      // that symbol gives one explicitly)
export const BUSBAR_HEIGHT = 22;     // wysokosc szyny zbiorczej
export const GRID_SIZE = 16;
