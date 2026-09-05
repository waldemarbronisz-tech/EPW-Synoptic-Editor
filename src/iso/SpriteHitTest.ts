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

/**
 * World point, converted into a sprite's own local pixel space (its draw
 * position subtracted out). `mirror`, when given, accounts for a
 * fix/iso-tiles-and-rotation commit 3 rotation drawn horizontally
 * mirrored (Konva flips a shape around its own local x=0, i.e. the
 * sprite's own RIGHT edge once mirrored) - the pixel actually shown at
 * a given screen offset from the bounding box's left edge is the
 * ORIGINAL image's pixel at `width` minus that same offset. Omitted (or
 * every existing, non-rotation call site that never passes it) leaves
 * this exactly the plain subtraction it always was.
 */
export function toSpriteLocalPoint(
  worldX: number, worldY: number, drawX: number, drawY: number,
  mirror?: { width: number }
): { x: number; y: number } {
  const rawX = worldX - drawX;
  return { x: mirror ? mirror.width - rawX : rawX, y: worldY - drawY };
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

/**
 * Full test: does clicking (worldX, worldY) actually hit this sprite's
 * own opaque pixels? `drawX`/`drawY` are always the bounding box's own
 * LEFT/top edge in world space, whether or not `mirrored` is set - see
 * IsoRenderer.tsx's own IsoSpriteNode for why the anchor-corrected
 * getSpriteDrawPosition result already is that edge in both cases.
 */
export function hitTestSprite(
  worldX: number, worldY: number,
  drawX: number, drawY: number,
  width: number, height: number,
  image: HTMLImageElement,
  mirrored: boolean = false
): boolean {
  const local = toSpriteLocalPoint(worldX, worldY, drawX, drawY, mirrored ? { width } : undefined);
  return isLocalPointOnOpaquePixel(local.x, local.y, width, height, (px, py) => sampleSpriteAlpha(image, px, py));
}
