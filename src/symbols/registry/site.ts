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
  },
  'site.lamp_post_double': {
    type: 'site.lamp_post_double',
    label: 'Slup oswietleniowy (2 oprawy)',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.lamp_post_single': {
    type: 'site.lamp_post_single',
    label: 'Slup oswietleniowy (1 oprawa)',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.halogen': {
    type: 'site.halogen',
    label: 'Halogen',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.garden_light': {
    type: 'site.garden_light',
    label: 'Slupek oswietleniowy ogrodowy',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.cable_junction': {
    type: 'site.cable_junction',
    label: 'Zlacze kablowe',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.alarm_beacon': {
    type: 'site.alarm_beacon',
    label: 'Kogut alarmowy',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.alarm_horn': {
    type: 'site.alarm_horn',
    label: 'Glosnik alarmowy',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.garden_sprinkler': {
    type: 'site.garden_sprinkler',
    label: 'Slupek podlewania ogrodowego',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'WODA', side: 'BOTTOM', medium: 'WATER' }]
  },
  // Commit 4 - the two SURFACES. Both isSurface:true (background pass,
  // Canvas.tsx) and terminals: [] (WYMAGANIA WSPOLNE: "Nie maja
  // zaciskow" - explicit empty list, not merely omitted, same as every
  // other entry here declaring its own terminals rather than leaving
  // the field undefined). defaultWidth/defaultHeight are only a
  // starting point, not a fixed drawing size the way they are for the
  // other 14 - a surface is explicitly meant to be resized afterward
  // (GrassSymbol.tsx/ConcreteRoadSymbol.tsx's own header comments).
  'site.grass': {
    type: 'site.grass',
    label: 'Trawa',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [],
    isSurface: true
  },
  'site.concrete_road': {
    type: 'site.concrete_road',
    label: 'Droga betonowa',
    category: 'TEREN',
    defaultWidth: 192,
    defaultHeight: 96,
    allowedStates: [],
    defaultState: '',
    terminals: [],
    isSurface: true
  },

  // feat/water-management commit 4 - the first 6 of 12 gospodarka wodna
  // (water management) objects. Registered into this SAME existing
  // TEREN category, not a new "WODA" one (this task's own commit 4
  // text explicitly leaves that choice open, asking it be reported):
  // docs/EPW_gospodarka_wodna_referencja.py's own style header
  // ("retro industrial SCADA, cieniowanie pasmowe... luk swiatla u
  // gory-lewej") is word-for-word the SAME banded-shading style this
  // category's own existing objects already use, and TEREN already
  // holds water-related site infrastructure of its own (rain tank,
  // sewage plant, water manhole, from feat/site-objects-2d) - a second
  // category would only fragment one visually and conceptually
  // continuous family across two folders for no functional reason.
  'site.rainwater_tank2': {
    type: 'site.rainwater_tank2',
    label: 'Zbiornik na deszczowke',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['NISKI', 'SREDNI', 'WYSOKI'],
    defaultState: 'NISKI',
    terminals: [{ id: 'WYLOT', side: 'BOTTOM', medium: 'WATER' }]
  },
  'site.water_selector_valve_switched': {
    type: 'site.water_selector_valve_switched',
    label: 'Zawor trojdrogowy przelaczajacy',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['A', 'B'],
    defaultState: 'A',
    terminals: [
      { id: 'WLOT', side: 'LEFT', medium: 'WATER' },
      { id: 'WYLOT_A', side: 'RIGHT', medium: 'WATER' },
      { id: 'WYLOT_B', side: 'BOTTOM', medium: 'WATER' }
    ]
  },
  'site.water_selector_valve_3pos': {
    type: 'site.water_selector_valve_3pos',
    label: 'Zawor trojdrogowy trojpolozeniowy',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['A', 'ZAMKNIETY', 'B'],
    defaultState: 'ZAMKNIETY',
    terminals: [
      { id: 'WLOT', side: 'LEFT', medium: 'WATER' },
      { id: 'WYLOT_A', side: 'RIGHT', medium: 'WATER' },
      { id: 'WYLOT_B', side: 'BOTTOM', medium: 'WATER' }
    ]
  },
  'site.check_valve': {
    type: 'site.check_valve',
    label: 'Zawor zwrotny',
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
  'site.water_filter': {
    type: 'site.water_filter',
    label: 'Filtr wody',
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
  'site.hydrofor': {
    type: 'site.hydrofor',
    label: 'Hydrofor',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'WYLOT', side: 'LEFT', medium: 'WATER' }]
  },

  // feat/water-management commit 5 - the remaining 6 of 12 objects.
  'site.flow_meter': {
    type: 'site.flow_meter',
    label: 'Przeplywomierz',
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
  'site.water_meter': {
    type: 'site.water_meter',
    label: 'Wodomierz',
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
  'site.pressure_switch': {
    type: 'site.pressure_switch',
    label: 'Presostat',
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
  'site.rain_sensor': {
    type: 'site.rain_sensor',
    label: 'Czujnik deszczu',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'ZASILANIE', side: 'BOTTOM', medium: 'ELECTRICAL' }]
  },
  'site.sprinkler_head': {
    type: 'site.sprinkler_head',
    label: 'Zraszacz',
    category: 'TEREN',
    defaultWidth: 128,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'WODA', side: 'BOTTOM', medium: 'WATER' }]
  },
  // Adjustable size, like the two site-objects-2d SURFACES
  // (GrassSymbol.tsx/ConcreteRoadSymbol.tsx's own header comments) -
  // but deliberately NOT isSurface: nothing in this task asks other
  // objects to draw above a drip line the way they do above grass.
  'site.drip_line': {
    type: 'site.drip_line',
    label: 'Linia kroplujaca',
    category: 'TEREN',
    defaultWidth: 192,
    defaultHeight: 96,
    allowedStates: ['ZALACZONY', 'WYLACZONY'],
    defaultState: 'WYLACZONY',
    terminals: [{ id: 'WLOT', side: 'LEFT', medium: 'WATER' }]
  }
};
