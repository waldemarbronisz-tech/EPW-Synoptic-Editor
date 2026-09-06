// Konva rendering for one terrain tile - kept separate from
// TerrainTile.ts itself (which stays a plain .ts, Konva-free, per that
// file's own header) so the geometry/color math stays directly unit
// testable without ever touching react-konva.
//
// Mounted by the PLAN screen's own canvas (feat/isometric-engine commit
// 5) once per painted tile - an unpainted grid cell is simply never
// given a TerrainTileNode at all, which is what leaves it undrawn (the
// plot reads as an island on the canvas background, not a rectangle
// filling the screen).

import React from 'react';
import { Line } from 'react-konva';
import { COLOR_OUTLINE, TERRAIN_TILE_DIVIDER } from '../theme/ScadaTheme';
import {
  getTerrainTileColors, getTileTopFacePoints, getTileLeftWallPoints, getTileRightWallPoints,
  hasLeftWall, hasRightWall, getTerrainEdgeVisibility
} from './TerrainTile';
import type { TerrainTileType } from './TerrainTile';
import type { ScreenPoint } from './IsoGrid';

function flatten(points: ScreenPoint[]): number[] {
  return points.flatMap(p => [p.x, p.y]);
}

export interface TerrainTileNodeProps {
  gx: number;
  gy: number;
  type: TerrainTileType;
  // fix/iso-tiles-and-rotation commit 1: the whole painted map, not just
  // this one tile's own type - wall/outline visibility depends on
  // whether a NEIGHBOR is painted, which this single tile cannot know
  // about on its own.
  terrainTiles: Record<string, TerrainTileType>;
}

export const TerrainTileNode: React.FC<TerrainTileNodeProps> = ({ gx, gy, type, terrainTiles }) => {
  const colors = getTerrainTileColors(type);
  const [top, right, bottom, left] = getTileTopFacePoints(gx, gy);
  const edges = getTerrainEdgeVisibility(terrainTiles, gx, gy);

  return (
    <>
      {/* Side walls first, so the top face's own edges (drawn below,
          fix/iso-tiles-and-rotation commit 1) always draw cleanly over
          the seam between a wall and the face above it - same draw-
          order reasoning IsoRenderer.tsx's depth sort (commit 4) uses
          for whole objects, applied here within a single tile's own
          faces. Only drawn at all when this tile is the outer edge of
          the slab on that side - an interior wall, hidden behind
          whatever tile now sits in front of it, would be exactly the
          "stacked plates" look this fix exists to remove. */}
      {hasLeftWall(terrainTiles, gx, gy) && (
        <Line
          points={flatten(getTileLeftWallPoints(gx, gy))}
          closed
          fill={colors.left}
          stroke={COLOR_OUTLINE}
          strokeWidth={1}
        />
      )}
      {hasRightWall(terrainTiles, gx, gy) && (
        <Line
          points={flatten(getTileRightWallPoints(gx, gy))}
          closed
          fill={colors.right}
          stroke={COLOR_OUTLINE}
          strokeWidth={1}
        />
      )}

      {/* The top face's own fill, no stroke of its own - its four edges
          are drawn as separate segments right after so each can carry
          its own outer/inner treatment; one Line with one uniform
          stroke could never do that. */}
      <Line points={flatten([top, right, bottom, left])} closed fill={colors.top} />

      {/* Four edges, each independently either the slab's own strong
          outer contour or a weak interior division line - this is the
          entire "one continuous slab" fix: every edge asks only "is a
          tile painted past this line", never "am I my own separate
          tile", and grass next to paving asks exactly the same question
          grass next to grass does. */}
      <Line points={[top.x, top.y, left.x, left.y]} stroke={edges.topLeft ? COLOR_OUTLINE : TERRAIN_TILE_DIVIDER} strokeWidth={edges.topLeft ? 1 : 0.5} />
      <Line points={[top.x, top.y, right.x, right.y]} stroke={edges.topRight ? COLOR_OUTLINE : TERRAIN_TILE_DIVIDER} strokeWidth={edges.topRight ? 1 : 0.5} />
      <Line points={[bottom.x, bottom.y, left.x, left.y]} stroke={edges.bottomLeft ? COLOR_OUTLINE : TERRAIN_TILE_DIVIDER} strokeWidth={edges.bottomLeft ? 1 : 0.5} />
      <Line points={[bottom.x, bottom.y, right.x, right.y]} stroke={edges.bottomRight ? COLOR_OUTLINE : TERRAIN_TILE_DIVIDER} strokeWidth={edges.bottomRight ? 1 : 0.5} />
    </>
  );
};
