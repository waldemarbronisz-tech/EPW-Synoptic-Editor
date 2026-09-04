// feat/isometric-engine commit 3: the paint tool's own store contract -
// paintTerrainTile sets tiles live without touching history,
// commitTerrainStroke is what turns a whole drag into exactly ONE undo
// entry. Mirrors store.test.ts's own convention for exercising store
// actions directly, without any Canvas/mouse wiring (that lands in
// commit 5).

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

function resetStore() {
  useStore.setState({
    objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {},
    selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [],
    history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {} }],
    historyIndex: 0
  });
}

describe('Terrain store slice', () => {
  beforeEach(resetStore);

  it('paintTerrainTile sets a tile in the map', () => {
    useStore.getState().paintTerrainTile(2, 3, 'GRASS');
    expect(useStore.getState().terrainTiles).toEqual({ '2,3': 'GRASS' });
  });

  it('paintTerrainTile overwrites a tile already painted with a different type', () => {
    useStore.getState().paintTerrainTile(2, 3, 'GRASS');
    useStore.getState().paintTerrainTile(2, 3, 'WATER');
    expect(useStore.getState().terrainTiles).toEqual({ '2,3': 'WATER' });
  });

  it('painting many tiles during one drag does NOT push a history entry per tile - only commitTerrainStroke does', () => {
    const historyLengthBefore = useStore.getState().history.length;
    useStore.getState().paintTerrainTile(0, 0, 'GRASS');
    useStore.getState().paintTerrainTile(1, 0, 'GRASS');
    useStore.getState().paintTerrainTile(2, 0, 'GRASS');
    expect(useStore.getState().history.length).toBe(historyLengthBefore);

    useStore.getState().commitTerrainStroke();
    expect(useStore.getState().history.length).toBe(historyLengthBefore + 1);
  });

  it('undo after a committed stroke restores the terrain to before that stroke - one whole drag is one undo step', () => {
    useStore.getState().paintTerrainTile(5, 5, 'PAVING');
    useStore.getState().commitTerrainStroke();
    expect(useStore.getState().terrainTiles).toEqual({ '5,5': 'PAVING' });

    // A second stroke painting three more tiles.
    useStore.getState().paintTerrainTile(6, 5, 'PAVING');
    useStore.getState().paintTerrainTile(7, 5, 'PAVING');
    useStore.getState().paintTerrainTile(8, 5, 'PAVING');
    useStore.getState().commitTerrainStroke();
    expect(Object.keys(useStore.getState().terrainTiles)).toHaveLength(4);

    useStore.getState().undo();
    expect(useStore.getState().terrainTiles).toEqual({ '5,5': 'PAVING' });

    useStore.getState().undo();
    expect(useStore.getState().terrainTiles).toEqual({});
  });

  it('an unpainted tile never appears in the map', () => {
    useStore.getState().paintTerrainTile(0, 0, 'GRAVEL');
    expect(useStore.getState().terrainTiles['1,1']).toBeUndefined();
    expect(Object.keys(useStore.getState().terrainTiles)).toEqual(['0,0']);
  });
});
