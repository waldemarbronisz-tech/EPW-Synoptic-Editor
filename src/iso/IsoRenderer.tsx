// Sprite rendering (Konva) for the PLAN screen - the draw-position math,
// depth sorting and the sprite image cache all now live in
// IsoRenderUtils.ts (fix/audit-findings commit 4: split out so this
// file goes back to exporting only its own component, IsoRenderer -
// oxlint's react/only-export-components flagged every one of those as
// a non-component export sharing this file with a component; see that
// file's own header for the depth-sorting rule itself). This file
// keeps only what actually IS the React/Konva rendering: IsoSpriteNode
// (private, not exported - never triggered the same warning) and
// IsoRenderer itself.

import { useEffect, useState } from 'react';
import { Image as KonvaImage, Layer } from 'react-konva';
import type { TerrainTileType } from './TerrainTile';
import { TerrainTileNode } from './TerrainTileRenderer';
import { getSpriteState } from './SpriteManifest';
import { resolveSpriteView } from './SpriteRotation';
import type { PlanObjectRotation } from './SpriteRotation';
import { useStore } from '../store';
import {
  buildDrawOrder, getSpriteDrawPosition, getCachedSpriteImage, imageCache, spriteImageSrc
} from './IsoRenderUtils';
import type { IsoObjectPlacement } from './IsoRenderUtils';

export interface IsoPlacedObject extends IsoObjectPlacement {
  id: string;
  spriteId: string;
  state: string;
  // fix/iso-tiles-and-rotation commit 3: optional, defaults to 0 - the
  // footprint on IsoObjectPlacement above is expected to already be the
  // ROTATED one (PlanObject.ts's own getPlanObjectFootprint applies that
  // before this object is ever built), so depth sorting itself needs no
  // change at all; this field is only for IsoSpriteNode's own drawing.
  rotation?: PlanObjectRotation;
}

function useSpriteImage(file: string): HTMLImageElement | null {
  const src = spriteImageSrc(file);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (imageCache.has(src)) return;
    const img = new window.Image();
    img.onload = () => {
      imageCache.set(src, img);
      forceRender(n => n + 1);
    };
    img.src = src;
  }, [src]);

  return getCachedSpriteImage(file);
}

/**
 * One placed sprite. Renders nothing (not a broken-image placeholder)
 * until both the manifest state resolves and the image itself finishes
 * loading - a missing sprite must never crash the canvas.
 *
 * fix/iso-tiles-and-rotation commit 3: resolveSpriteView (SpriteRotation.ts)
 * is what decides front/rear file and the flip-corrected anchor for this
 * object's own rotation; this component only turns that decision into
 * Konva props (x/scaleX for the mirror) and, when the manifest could not
 * actually honor the requested rear view, reports it once in Messages.
 */
const IsoSpriteNode: React.FC<{ placement: IsoPlacedObject }> = ({ placement }) => {
  const resolved = getSpriteState(placement.spriteId, placement.state);
  const rotation: PlanObjectRotation = placement.rotation ?? 0;
  const view = resolved ? resolveSpriteView(resolved.entry, rotation) : null;
  const image = useSpriteImage(view?.file ?? '');

  useEffect(() => {
    if (!view?.fellBackToFront) return;
    useStore.getState().addMessage(
      `[WARNING] Plan object '${placement.id}' (${placement.spriteId}) has rotation ${rotation} but its sprite has no rear view - drawing the front view instead`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement.id, placement.spriteId, rotation, view?.fellBackToFront]);

  if (!view || !image) return null;

  const pos = getSpriteDrawPosition(placement.gx, placement.gy, view.anchorX, view.anchorY);
  // A mirrored view is drawn from its own right edge backward (Konva
  // flips a shape around its own local x=0) - see SpriteRotation.ts's
  // own resolveSpriteView comment for the anchor math this pairs with.
  const drawX = view.mirrored ? pos.x + view.width : pos.x;

  return (
    <KonvaImage
      image={image}
      x={drawX}
      y={pos.y}
      width={view.width}
      height={view.height}
      scaleX={view.mirrored ? -1 : 1}
      // Pixel art must stay crisp when the view is zoomed in, not blur
      // into a smeared approximation - see this file's own header and
      // the completion report for which Konva property this is.
      imageSmoothingEnabled={false}
    />
  );
};

export interface IsoRendererProps {
  terrainTiles: Record<string, TerrainTileType>;
  objects: IsoPlacedObject[];
}

/**
 * The PLAN screen's whole drawable scene, in one Layer: every terrain
 * tile the task's own rule keeps unconditionally behind every object,
 * then every object in depth order - buildDrawOrder's own array, mapped
 * 1:1 into Konva nodes. imageSmoothingEnabled on the Layer affects only
 * the Image nodes (IsoSpriteNode) within it; TerrainTileNode's flat-color
 * Line shapes are entirely unaffected by it, so one Layer safely holds
 * both kinds of content.
 */
export const IsoRenderer: React.FC<IsoRendererProps> = ({ terrainTiles, objects }) => {
  const drawOrder = buildDrawOrder(terrainTiles, objects);

  return (
    <Layer imageSmoothingEnabled={false}>
      {drawOrder.map((item, index) =>
        item.kind === 'terrain'
          ? <TerrainTileNode key={`terrain-${item.gx}-${item.gy}`} gx={item.gx} gy={item.gy} type={item.type} terrainTiles={terrainTiles} />
          : <IsoSpriteNode key={item.placement.id ?? `object-${index}`} placement={item.placement} />
      )}
    </Layer>
  );
};

