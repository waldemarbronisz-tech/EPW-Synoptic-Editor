// feat/site-objects-2d: the TEREN (site object) category. Every entry's
// declared size is 128x96 - NOT docs/EPW_rysunki_referencja.py's own
// literal W,H=160,120 (that describes the reference drawing's own
// proportions, 4:3, not the symbol's size in this library). 120 is not
// an EVEN GRID_SIZE multiple (terminal-centering.test.ts's own
// pre-existing invariant, feat/editing-and-signal-panel commit 1), so
// a symbol declared at 160x120 could never get a real, grid-aligned
// edge-midpoint terminal on its own top/bottom edge. 128x96 is the
// identical 4:3 ratio (128/96 = 160/120), reached by drawing every
// shape at the reference's own literal 160x120 coordinates and
// wrapping that in one SITE_CANVAS_SCALE (0.8) Group - see
// ScadaTheme.ts's own comment on that constant for the full reasoning,
// found live and resolved with the user (raport.md). Not meant to be
// freely resized the way an ordinary schematic symbol might be -
// trawa/droga, the two SURFACES, are the deliberate exception, see
// their own commit 4 registry entries.
//
// Terminal placement: every non-surface object gets terminals at
// whichever edge midpoint its own real-world connection point sits
// nearest - the electrical feed for a building/fixture/gate, the pipe
// for anything water-related. Both surfaces (grass, concrete road)
// have NONE at all - this task's own commit 4 spec is explicit that a
// surface has nothing to wire up ("Nie maja zaciskow"), a deliberate,
// narrower exception to this file's own general "every object gets
// terminals" rule.
import type { SymbolDefinition } from '../SymbolRegistry';

export const siteSymbols: Record<string, SymbolDefinition> = {
  'site.house': {
    type: 'site.house',
    label: 'Dom',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.warehouse': {
    type: 'site.warehouse',
    label: 'Magazyn',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.sliding_gate': {
    type: 'site.sliding_gate',
    label: 'Brama przesuwna',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZAMKNIETA', 'W_RUCHU', 'OTWARTA'],
    defaultState: 'ZAMKNIETA',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.rain_tank': {
    type: 'site.rain_tank',
    label: 'Zbiornik na deszczowke',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'KROCIEC', side: 'RIGHT', medium: 'WATER' }]
  },
  'site.sewage_plant': {
    type: 'site.sewage_plant',
    label: 'Oczyszczalnia sciekow',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [
      { id: 'WLOT', side: 'LEFT', medium: 'WATER' },
      { id: 'WYLOT', side: 'RIGHT', medium: 'WATER' }
    ]
  },
  'site.water_manhole': {
    type: 'site.water_manhole',
    label: 'Studzienka przylacza wody',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'PRZYLACZE', side: 'BOTTOM', medium: 'WATER' }]
  }
};
