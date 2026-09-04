// feat/isometric-engine commit 3: painted terrain actually survives a
// save/load round trip through ProjectManager - same convention as
// meter-devices-roundtrip.test.ts for the device list. The concrete
// path: paintTerrainTile -> store's terrainTiles map ->
// ProjectManager.getProjectData's "terrain" field -> a saved file ->
// ProjectManager.loadProject -> store's terrainTiles map again.

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { ProjectManager } from '../project/ProjectManager';

describe('Terrain round-trip through ProjectManager', () => {
  beforeEach(() => {
    useStore.setState({
      objects: [], connections: [], meters: [], signalPanels: [], frames: [], devices: [], terrainTiles: {},
      selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [],
      history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {} }],
      historyIndex: 0
    });
  });

  it('getProjectData includes the store terrainTiles map', () => {
    useStore.getState().paintTerrainTile(1, 2, 'GRASS');
    const json = ProjectManager.getProjectData();
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!);
    expect(parsed.terrain).toEqual({ '1,2': 'GRASS' });
  });

  it('loadProject populates the store terrainTiles map from the file', () => {
    const projectJson = ProjectManager.getProjectData(); // an empty-terrain baseline
    const project = JSON.parse(projectJson!);
    project.terrain = { '3,4': 'PAVING', '5,5': 'WATER' };

    const ok = ProjectManager.loadProject(JSON.stringify(project), 'test.epwsyn');

    expect(ok).toBe(true);
    expect(useStore.getState().terrainTiles).toEqual({ '3,4': 'PAVING', '5,5': 'WATER' });
  });

  it('loading a project file with no terrain field at all yields an empty map, not an error', () => {
    const projectJson = ProjectManager.getProjectData();
    const project = JSON.parse(projectJson!);
    delete project.terrain;

    const ok = ProjectManager.loadProject(JSON.stringify(project), 'legacy.epwsyn');

    expect(ok).toBe(true);
    expect(useStore.getState().terrainTiles).toEqual({});
  });

  it('an unpainted tile is simply absent from the map, not stored as some empty type', () => {
    useStore.getState().paintTerrainTile(0, 0, 'SOIL');
    const json = ProjectManager.getProjectData();
    const parsed = JSON.parse(json!);
    expect(Object.keys(parsed.terrain)).toEqual(['0,0']);
  });
});
