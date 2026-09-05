// Transparency-aware click hit-testing for a placed sprite - split, on
// purpose, into a pure decision (fully unit testable: given local
// coordinates and a way to read one pixel's alpha, is this a hit?) and a
// thin, deliberately tiny real-canvas alpha reader (untestable in this
// project's Node/jsdom test environment - jsdom's own canvas has no real
// 2D context without a native addon this project does not depend on, the
// same reason IsoRenderer.tsx's own Konva rendering stays outside the
// test suite per this project's established convention). Keeping that
// second half small and obviously correct is what makes trusting it
// without a test reasonable, exactly the same trade this codebase
// already makes for Konva event handlers throughout.

/**
 * Is (localX, localY) - already relative to the sprite's own drawn
 * top-left corner - both within its width x height bounding box AND
 * over a non-transparent pixel? sampleAlpha receives INTEGER pixel
 * coordinates and returns that pixel's alpha (0-255).
 */
export function isLocalPointOnOpaquePixel(
  localX: number,
  localY: number,
  width: number,
  height: number,
  sampleAlpha: (px: number, py: number) => number
): boolean {
  if (localX < 0 || localY < 0 || localX >= width || localY >= height) return false;
  return sampleAlpha(Math.floor(localX), Math.floor(localY)) > 0;
}

/** World point, converted into a sprite's own local pixel space (its draw position subtracted out). */
export function toSpriteLocalPoint(worldX: number, worldY: number, drawX: number, drawY: number): { x: number; y: number } {
  return { x: worldX - drawX, y: worldY - drawY };
}

// ---- real pixel sampling (Konva/canvas-touching, kept minimal) --------

// One offscreen canvas per distinct image, drawn once and reused for
// every later click - sampling getImageData on every click directly
// against a live Konva Image node would also work, but a dedicated,
// never-redrawn offscreen copy can never be affected by whatever the
// visible canvas is mid-transform (pan/zoom) at the moment of the click.
const alphaCanvasCache = new Map<HTMLImageElement, HTMLCanvasElement>();

function getAlphaCanvas(image: HTMLImageElement): HTMLCanvasElement | null {
  const cached = alphaCanvasCache.get(image);
  if (cached) return cached;

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);

  alphaCanvasCache.set(image, canvas);
  return canvas;
}

/**
 * Real alpha sampling for one loaded sprite image. Fails OPEN (treats
 * the pixel as opaque) on anything that stops it from actually reading a
 * value - a canvas that cannot be read must never make an object
 * permanently unclickable; it is no worse than the old rectangle-only
 * hit test everywhere that failure could occur.
 */
export function sampleSpriteAlpha(image: HTMLImageElement, px: number, py: number): number {
  const canvas = getAlphaCanvas(image);
  if (!canvas) return 255;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 255;
  try {
    return ctx.getImageData(px, py, 1, 1).data[3];
  } catch {
    return 255;
  }
}

/** Full test: does clicking (worldX, worldY) actually hit this sprite's own opaque pixels? */
export function hitTestSprite(
  worldX: number, worldY: number,
  drawX: number, drawY: number,
  width: number, height: number,
  image: HTMLImageElement
): boolean {
  const local = toSpriteLocalPoint(worldX, worldY, drawX, drawY);
  return isLocalPointOnOpaquePixel(local.x, local.y, width, height, (px, py) => sampleSpriteAlpha(image, px, py));
}
