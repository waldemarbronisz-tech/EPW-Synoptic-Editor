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
import { COLOR_OUTLINE } from '../theme/ScadaTheme';
import {
  getTerrainTileColors, getTileTopFacePoints, getTileLeftWallPoints, getTileRightWallPoints
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
}

export const TerrainTileNode: React.FC<TerrainTileNodeProps> = ({ gx, gy, type }) => {
  const colors = getTerrainTileColors(type);

  return (
    <>
      {/* Side walls first, so the top face's own outline draws cleanly
          over the seam between them - same draw-order reasoning
          IsoRenderer.tsx's depth sort (commit 4) uses for whole objects,
          applied here within a single tile's own three faces. */}
      <Line
        points={flatten(getTileLeftWallPoints(gx, gy))}
        closed
        fill={colors.left}
        stroke={COLOR_OUTLINE}
        strokeWidth={1}
      />
      <Line
        points={flatten(getTileRightWallPoints(gx, gy))}
        closed
        fill={colors.right}
        stroke={COLOR_OUTLINE}
        strokeWidth={1}
      />
      <Line
        points={flatten(getTileTopFacePoints(gx, gy))}
        closed
        fill={colors.top}
        stroke={COLOR_OUTLINE}
        strokeWidth={1}
      />
    </>
  );
};
