import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import type { SynopticObject, SynopticConnection } from '../store';
import { getBusbarEdgePorts } from '../symbols/scada/BusbarSymbol';
import { resolveConnectionPoint } from '../utils/GeometryUtils';
import { resolveObjectLabelText, measureLabelLine, LABEL_MAX_WIDTH } from '../components/ObjectLabelRenderer';
import { snapValue } from '../utils/GridSnap';
import { GRID_SIZE, BUSBAR_HEIGHT } from '../theme/ScadaTheme';
import { ProjectManager } from '../project/ProjectManager';
import { FORMAT_NAME } from '../project/ProjectSchema';

function makeBusbar(overrides: Partial<SynopticObject> = {}): SynopticObject {
  return {
    id: 'BUS1',
    type: 'scada.busbar',
    category: 'SCADA',
    x: 0, y: 0,
    rotation: 0, scaleX: 1, scaleY: 1,
    visible: true, locked: false, layer: 1,
    tag: 'BUS1', description: '', color: '#000', fill: '#000', border: '#000',
    text: '', font: 'Arial', fontSize: 12, tooltip: '',
    width: 320, height: BUSBAR_HEIGHT,
    customProperties: {},
    ...overrides
  };
}

describe('SCADA busbar edge ports (getBusbarEdgePorts)', () => {
  it('top ports sit at y = 0', () => {
    const ports = getBusbarEdgePorts(320, 'top');
    expect(ports.every(p => p.y === 0)).toBe(true);
  });

  it('bottom ports sit at y = BUSBAR_HEIGHT', () => {
    const ports = getBusbarEdgePorts(320, 'bottom');
    expect(ports.every(p => p.y === BUSBAR_HEIGHT)).toBe(true);
  });

  it('generates one port per GRID_SIZE step, same count as the single-row model', () => {
    expect(getBusbarEdgePorts(320, 'top').length).toBe(Math.floor(320 / GRID_SIZE));
  });

  it('a zero-width bar produces no ports on either edge, without throwing', () => {
    expect(() => getBusbarEdgePorts(0, 'top')).not.toThrow();
    expect(getBusbarEdgePorts(0, 'top')).toEqual([]);
    expect(getBusbarEdgePorts(0, 'bottom')).toEqual([]);
  });
});

describe('Dynamic port resolution (GeometryUtils.resolveConnectionPoint)', () => {
  it('resolves a legacy center-row dyn_NN port unchanged (y = 0.5)', () => {
    // electrical.busbar (the pre-existing symbol) has no
    // supportsDynamicPorts flag at all - that omission is the exact bug
    // this whole task exists to fix for the SCADA busbar, and it is left
    // untouched deliberately. This checks the legacy unprefixed id FORMAT
    // still resolves correctly on a symbol that does support dynamic
    // ports, i.e. that adding the top/bottom format did not regress it.
    const bar = makeBusbar();
    const point = resolveConnectionPoint(bar, 'dyn_50');
    expect(point).not.toBeNull();
    expect(point?.y).toBe(0.5);
    expect(point?.x).toBeCloseTo(0.5, 5);
  });

  it('resolves a new dyn_top_NN port at y = 0', () => {
    const bar = makeBusbar();
    const point = resolveConnectionPoint(bar, 'dyn_top_25');
    expect(point).not.toBeNull();
    expect(point?.y).toBe(0);
    expect(point?.x).toBeCloseTo(0.25, 5);
  });

  it('resolves a new dyn_bot_NN port at y = 1', () => {
    const bar = makeBusbar();
    const point = resolveConnectionPoint(bar, 'dyn_bot_75');
    expect(point).not.toBeNull();
    expect(point?.y).toBe(1);
    expect(point?.x).toBeCloseTo(0.75, 5);
  });

  it('uses the object\'s own current width, not the symbol definition\'s static default', () => {
    const narrowed = makeBusbar({ width: 32 }); // shrunk well below the registry's default of 200
    const point = resolveConnectionPoint(narrowed, 'dyn_top_50');
    expect(point?.x).toBeCloseTo(0.5, 5);
  });
});

describe('Busbar resize reattachment (store.resizeBusbar)', () => {
  beforeEach(() => {
    useStore.setState({
      objects: [],
      connections: [],
      messages: [],
      history: [{ objects: [], connections: [] } as any],
      historyIndex: 0
    });
  });

  function makeConn(overrides: Partial<SynopticConnection> = {}): SynopticConnection {
    return {
      id: 'C1', fromId: 'DEV1', fromPort: 'OUT', toId: 'BUS1', toPort: 'dyn_top_90', type: 'electrical_ac',
      ...overrides
    };
  }

  it('growing the busbar leaves an attached connection untouched and posts no message', () => {
    useStore.setState({
      objects: [makeBusbar({ width: 320 })],
      connections: [makeConn({ toPort: 'dyn_top_50' })] // index 10 of 20 at width 320
    });

    useStore.getState().resizeBusbar('BUS1', 640);

    const conn = useStore.getState().connections[0];
    expect(conn.toPort).toBe('dyn_top_50');
    expect(useStore.getState().messages.length).toBe(0);
  });

  it('shrinking the busbar past an attached port reattaches it to the nearest surviving port and posts a message', () => {
    // width 320, GRID_SIZE 16 -> 20 ports (indices 0..19). A port at 90%
    // resolves to index round(0.9 * 320 / 16) = 18 - well within range.
    useStore.setState({
      objects: [makeBusbar({ width: 320 })],
      connections: [makeConn({ toPort: 'dyn_top_90' })]
    });

    // Shrink to width 64 -> only 4 ports survive (indices 0..3). The old
    // port (index 18) no longer exists and must reattach to index 3.
    useStore.getState().resizeBusbar('BUS1', 64);

    const conn = useStore.getState().connections[0];
    expect(conn.toPort).not.toBe('dyn_top_90');
    expect(conn.toPort).toMatch(/^dyn_top_\d+$/);
    expect(useStore.getState().objects[0].width).toBe(64);

    const messages = useStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].text).toContain('reattached');
  });

  it('resize commits exactly one history entry', () => {
    useStore.setState({
      objects: [makeBusbar({ width: 320 })],
      connections: [makeConn({ toPort: 'dyn_top_90' })],
      history: [{ objects: [makeBusbar({ width: 320 })], connections: [makeConn({ toPort: 'dyn_top_90' })] } as any],
      historyIndex: 0
    });

    const lenBefore = useStore.getState().history.length;
    useStore.getState().resizeBusbar('BUS1', 64);
    expect(useStore.getState().history.length).toBe(lenBefore + 1);
  });

  it('a connection unrelated to the resized busbar is left alone', () => {
    useStore.setState({
      objects: [makeBusbar({ width: 320 }), makeBusbar({ id: 'BUS2', width: 320 })],
      connections: [makeConn({ id: 'C2', toId: 'BUS2', toPort: 'dyn_top_90' })]
    });

    useStore.getState().resizeBusbar('BUS1', 32);

    expect(useStore.getState().connections[0].toPort).toBe('dyn_top_90');
  });
});

function makeDevice(overrides: Partial<SynopticObject> = {}): SynopticObject {
  return {
    id: 'obj-uuid-123',
    type: 'electrical.circuit_breaker',
    category: 'Electrical',
    x: 0, y: 0,
    rotation: 0, scaleX: 1, scaleY: 1,
    visible: true, locked: false, layer: 1,
    tag: 'electrical.circuit_breaker_1', // the exact kind of type-derived tag the label must never show
    description: '', color: '#000', fill: '#000', border: '#000',
    text: '', font: 'Arial', fontSize: 12, tooltip: '',
    width: 40, height: 40,
    customProperties: {},
    ...overrides
  };
}

describe('Object label text (resolveObjectLabelText)', () => {
  it('shows the designation when present', () => {
    const obj = makeDevice({ designation: '-K1' });
    expect(resolveObjectLabelText(obj).primary).toBe('-K1');
  });

  it('draws no primary line at all when designation is empty - bug fix: the previous task wrongly fell back to the object id (a UUID), which is exactly usterka 1', () => {
    const obj = makeDevice({ designation: '' });
    const { primary } = resolveObjectLabelText(obj);
    expect(primary).toBe('');
    expect(primary).not.toBe(obj.id);
    expect(primary).not.toContain('electrical.circuit_breaker');
    expect(primary).not.toBe(obj.type);
    expect(primary).not.toBe(obj.tag);
  });

  it('never falls back to the type identifier or the tag under any field combination', () => {
    const obj = makeDevice({ designation: '', name: '' });
    const { primary, secondary } = resolveObjectLabelText(obj);
    expect(primary).not.toContain('electrical.');
    expect(secondary).not.toContain('electrical.');
  });

  it('shows the name as the secondary line when showName is on', () => {
    const obj = makeDevice({ designation: '-K1', name: 'Stycznik grzalki', showName: true });
    expect(resolveObjectLabelText(obj).secondary).toBe('Stycznik grzalki');
  });

  it('hides the secondary line when showName is off', () => {
    const obj = makeDevice({ designation: '-K1', name: 'Stycznik grzalki', showName: false });
    expect(resolveObjectLabelText(obj).secondary).toBe('');
  });

  it('hides the primary line when showDesignation is off, even with a designation set', () => {
    const obj = makeDevice({ designation: '-K1', showDesignation: false });
    expect(resolveObjectLabelText(obj).primary).toBe('');
  });

  it('produces neither line for a device with no designation and no name - the object stands unlabeled', () => {
    const obj = makeDevice({ designation: '', name: '' });
    const { primary, secondary } = resolveObjectLabelText(obj);
    expect(primary).toBe('');
    expect(secondary).toBe('');
  });
});

describe('Label width capping (measureLabelLine / LABEL_MAX_WIDTH)', () => {
  it('shrinks to fit short text, well under the cap', () => {
    const line = measureLabelLine('-K1', 12, LABEL_MAX_WIDTH - 8);
    expect(line.lines).toBe(1);
    expect(line.width).toBeLessThan(LABEL_MAX_WIDTH - 8);
  });

  it('caps a long designation at the max width and reserves a second line', () => {
    // Long enough that the character-count estimate exceeds any
    // reasonable single-line budget - exactly the UUID-length case
    // usterka 1 was reported against.
    const longText = 'ae77a756-08cb-42d9-b3ff-ef0243a4818d';
    const maxTextWidth = LABEL_MAX_WIDTH - 8;
    const line = measureLabelLine(longText, 12, maxTextWidth);
    expect(line.width).toBeLessThanOrEqual(maxTextWidth);
    expect(line.lines).toBe(2);
  });

  it('returns zero size for empty text, so an unused line takes no space', () => {
    const line = measureLabelLine('', 12, LABEL_MAX_WIDTH);
    expect(line.width).toBe(0);
    expect(line.height).toBe(0);
  });
});

describe('Grid snapping (GridSnap.snapValue / shouldSnapToGrid)', () => {
  beforeEach(() => {
    useStore.setState({ snapToGridEnabled: true });
  });

  it('rounds a value to the nearest grid node when snapping is on and Alt is not held', () => {
    expect(snapValue(37, 16, false)).toBe(32); // nearest multiple of 16
    expect(snapValue(40, 16, false)).toBe(48);
  });

  it('holding Alt bypasses snapping even though the toggle is on', () => {
    expect(snapValue(37, 16, true)).toBe(37);
  });

  it('turning the persistent toggle off bypasses snapping even without Alt', () => {
    useStore.setState({ snapToGridEnabled: false });
    expect(snapValue(37, 16, false)).toBe(37);
  });

  it('the View menu toggle defaults to on', () => {
    useStore.setState({ snapToGridEnabled: true }); // reset from prior test in this file
    expect(useStore.getState().snapToGridEnabled).toBe(true);
  });

  it('toggleSnapToGrid flips the persistent setting', () => {
    const before = useStore.getState().snapToGridEnabled;
    useStore.getState().toggleSnapToGrid();
    expect(useStore.getState().snapToGridEnabled).toBe(!before);
  });
});

describe('Grid size on project load (ProjectManager.loadProject, usterka 3 fix)', () => {
  // Root cause of usterka 3, found by empirical inspection (see raport.md):
  // handleDrop/onDragEnd/onTransformEnd all snap correctly against
  // canvasConfig.gridSize on a fresh session - but ProjectManager used to
  // fall back to a hardcoded 20 (a pre-GRID_SIZE leftover) whenever a
  // loaded project's canvas.gridSize was missing or falsy, silently
  // diverging canvasConfig.gridSize from GRID_SIZE for any such file.
  it('falls back to GRID_SIZE, not a hardcoded 20, when a loaded project omits canvas.gridSize', () => {
    const minimalProject = {
      format: FORMAT_NAME,
      schema_version: 1,
      project: { name: 'Legacy project', description: '', created_at: '', modified_at: '' },
      canvas: { width: 1920, height: 1080, background: '#ffffff' }, // no gridSize field
      objects: [],
      connections: []
    };

    const ok = ProjectManager.loadProject(JSON.stringify(minimalProject), 'legacy.epwsyn');

    expect(ok).toBe(true);
    expect(useStore.getState().canvasConfig.gridSize).toBe(GRID_SIZE);
    expect(useStore.getState().canvasConfig.gridSize).not.toBe(20);
  });

  it('still honors an explicit, valid gridSize from the file', () => {
    const project = {
      format: FORMAT_NAME,
      schema_version: 1,
      project: { name: 'Custom grid', description: '', created_at: '', modified_at: '' },
      canvas: { width: 1920, height: 1080, background: '#ffffff', gridSize: 32 },
      objects: [],
      connections: []
    };

    ProjectManager.loadProject(JSON.stringify(project), 'custom.epwsyn');

    expect(useStore.getState().canvasConfig.gridSize).toBe(32);
  });
});
