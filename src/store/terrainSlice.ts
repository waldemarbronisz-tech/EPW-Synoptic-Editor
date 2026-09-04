import type { StateCreator } from 'zustand';
import { terrainKey } from '../iso/TerrainTile';
import type { TerrainTileType } from '../iso/TerrainTile';
import type { AppState } from './appState';

// PLAN screen terrain (feat/isometric-engine commit 3): the painted tile
// map plus the paint tool's own two-step commit (paint many, then commit
// once) - see AppState's own comment on paintTerrainTile/
// commitTerrainStroke for why they are split this way.
export type TerrainSlice = Pick<AppState, 'terrainTiles' | 'paintTerrainTile' | 'commitTerrainStroke'>;

export const createTerrainSlice: StateCreator<AppState, [], [], TerrainSlice> = (set, get) => ({
  terrainTiles: {},

  paintTerrainTile: (gx, gy, type) => {
    set((state) => ({
      terrainTiles: { ...state.terrainTiles, [terrainKey(gx, gy)]: type }
    }));
  },

  commitTerrainStroke: () => {
    get().saveHistory();
  },
});

export type { TerrainTileType };
