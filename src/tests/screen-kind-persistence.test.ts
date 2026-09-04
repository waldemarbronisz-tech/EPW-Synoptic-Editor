// feat/isometric-engine commit 5: the screen kind round-trips through
// ProjectManager exactly like terrain (terrain-persistence.test.ts) and
// the device list (meter-devices-roundtrip.test.ts) already do - and,
// separately, an OLD file with no `kind` field at all must load as
// SCHEMATIC, per the task's own explicit default ("Domyslnie SCHEMATIC.
// Istniejace ekrany pozostaja SCHEMATIC bez zmian.").

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { ProjectManager } from '../project/ProjectManager';
import { createEmptyProject } from '../project/ProjectSchema';

function resetStore() {
  useStore.setState({
    objects: [], connections: [], meters: [], signalPanels: [], frames: [], devices: [], terrainTiles: {},
    planObjects: [], selectedPlanObjectIds: [], screenKind: 'SCHEMATIC',
    selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [],
    history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {}, planObjects: [] }],
    historyIndex: 0
  });
}

describe('createEmptyProject - kind defaults', () => {
  it('defaults to SCHEMATIC when no kind argument is given', () => {
    expect(createEmptyProject('Test').kind).toBe('SCHEMATIC');
  });

  it('creates a PLAN project when asked', () => {
    expect(createEmptyProject('Test', 'PLAN').kind).toBe('PLAN');
  });
});

describe('Screen kind round-trip through ProjectManager', () => {
  beforeEach(resetStore);

  it('ProjectManager.newProject defaults to SCHEMATIC', () => {
    ProjectManager.newProject('Test');
    expect(useStore.getState().screenKind).toBe('SCHEMATIC');
  });

  it('ProjectManager.newProject can create a PLAN screen', () => {
    ProjectManager.newProject('Test Plan', 'PLAN');
    expect(useStore.getState().screenKind).toBe('PLAN');
  });

  it('getProjectData includes the store screenKind', () => {
    useStore.getState().setScreenKind('PLAN');
    const json = ProjectManager.getProjectData();
    const parsed = JSON.parse(json!);
    expect(parsed.kind).toBe('PLAN');
  });

  it('loadProject restores screenKind PLAN from the file', () => {
    const projectJson = ProjectManager.getProjectData();
    const project = JSON.parse(projectJson!);
    project.kind = 'PLAN';

    const ok = ProjectManager.loadProject(JSON.stringify(project), 'plan.epwsyn');

    expect(ok).toBe(true);
    expect(useStore.getState().screenKind).toBe('PLAN');
  });

  it('loading a project file with no kind field at all loads as SCHEMATIC - the task\'s own explicit default', () => {
    useStore.getState().setScreenKind('PLAN'); // prove this isn't just "never changed"
    const projectJson = ProjectManager.getProjectData();
    const project = JSON.parse(projectJson!);
    delete project.kind;

    const ok = ProjectManager.loadProject(JSON.stringify(project), 'legacy.epwsyn');

    expect(ok).toBe(true);
    expect(useStore.getState().screenKind).toBe('SCHEMATIC');
  });
});
