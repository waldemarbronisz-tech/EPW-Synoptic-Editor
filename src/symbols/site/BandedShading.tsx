// feat/site-objects-2d commit 1: shared drawing primitives for the
// TEREN (site object) symbol library - a retro-industrial "banded
// shading" look, extended from (not replacing) the flat SCADA style
// every schematic symbol already uses (see ScadaTheme.ts's own header
// and its own "Site objects" section for the full palette this file
// draws from). Every proportion, band/outline thickness and arc ratio
// below is taken from docs/EPW_rysunki_referencja.py's own rect/vrect/
// circ/glow methods, translated 1:1 from its SVG output into Konva -
// that file is a geometry/color REFERENCE only (Python, never run,
// never imported), this is the real, permanent implementation.
//
// Plain functions, not components used as JSX tags: their own names
// (bandedRect, bandedVRect, bandedCircle, glow) are lowercase, so React
// would treat a <bandedRect/> tag as an unknown HTML element rather
// than a component reference - each is called directly and its result
// embedded with {...}, the same way the reference's own c.rect(...)
// calls read as one drawing step at its own call site, in order.
//
// No JSX list context needs a `key` prop here: every call site embeds
// each primitive's result as its own individual {expression} child in
// a fixed-order Group, never through a .map() over an array.

import React from 'react';
import { Group, Rect, Circle, Path } from 'react-konva';
import {
  COLOR_OUTLINE, COLOR_LAMP_LIT,
  SITE_BAND_WIDTH, SITE_OUTLINE_WIDTH
} from '../../theme/ScadaTheme';
import type { SiteShadeTriad } from '../../theme/ScadaTheme';

export interface BandedRectOptions {
  /** Shading band thickness - 0 draws no bands at all (a plain outlined fill). Defaults to SITE_BAND_WIDTH. */
  band?: number;
  outlineWidth?: number;
}

/**
 * A rectangle with a lighter band along its own top edge and a darker
 * band along its own bottom edge - docs/EPW_rysunki_referencja.py's own
 * C.rect(). band=0 skips both bands entirely (that file's own `if
 * band:` guard - a plain outlined fill, used for a handful of small
 * indicator squares that should not read as a shaded 3D surface).
 */
export function bandedRect(
  x: number, y: number, width: number, height: number,
  triad: SiteShadeTriad, options: BandedRectOptions = {}
): React.ReactElement {
  const band = options.band ?? SITE_BAND_WIDTH;
  const ow = options.outlineWidth ?? SITE_OUTLINE_WIDTH;
  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} fill={triad.base} stroke={COLOR_OUTLINE} strokeWidth={ow} />
      {band > 0 && (
        <>
          <Rect x={x + ow / 2} y={y + ow / 2} width={width - ow} height={band} fill={triad.light} listening={false} />
          <Rect x={x + ow / 2} y={y + height - band - ow / 2} width={width - ow} height={band} fill={triad.dark} listening={false} />
        </>
      )}
    </Group>
  );
}

/**
 * A rectangle with a lighter band along its own LEFT edge and a darker
 * band along its own RIGHT edge - docs/EPW_rysunki_referencja.py's own
 * C.vrect(). Unlike bandedRect above, the reference's own vrect() has
 * no `if band:` guard at all - both side bands always draw, matching
 * that unconditionally here too (every actual vrect() call in the
 * reference passes a positive band anyway - lamp poles, tank rims).
 */
export function bandedVRect(
  x: number, y: number, width: number, height: number,
  triad: SiteShadeTriad, options: BandedRectOptions = {}
): React.ReactElement {
  const band = options.band ?? SITE_BAND_WIDTH;
  const ow = options.outlineWidth ?? SITE_OUTLINE_WIDTH;
  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} fill={triad.base} stroke={COLOR_OUTLINE} strokeWidth={ow} />
      <Rect x={x + ow / 2} y={y + ow / 2} width={band} height={height - ow} fill={triad.light} listening={false} />
      <Rect x={x + width - band - ow / 2} y={y + ow / 2} width={band} height={height - ow} fill={triad.dark} listening={false} />
    </Group>
  );
}

export interface BandedCircleOptions {
  outlineWidth?: number;
}

/**
 * A circle with a light ARC upper-left (a highlight, as if lit from
 * that direction) and a shadow arc lower-right - docs/EPW_rysunki_
 * referencja.py's own C.circ(). The arc endpoints/radius/stroke-width
 * are all fixed fractions of the circle's own radius r, taken exactly
 * from that file's own path data (M{cx-r*0.72},{cy-r*0.5}
 * A{r*0.88},{r*0.88} 0 0 1 {cx+r*0.1},{cy-r*0.86} for the light arc;
 * M{cx+r*0.62},{cy+r*0.5} A{r*0.85},{r*0.85} 0 0 1 {cx-r*0.2},{cy+r*0.85}
 * for the shadow arc) - reproduced here as literal SVG path data
 * through Konva's own Path shape (which parses the same path-data
 * grammar SVG does), the most direct, least-drift way to keep this
 * exact proportion rather than re-deriving the same arcs through some
 * other combination of Konva shapes.
 */
export function bandedCircle(
  cx: number, cy: number, r: number,
  triad: SiteShadeTriad, options: BandedCircleOptions = {}
): React.ReactElement {
  const ow = options.outlineWidth ?? SITE_OUTLINE_WIDTH;
  const lightArc = `M${cx - r * 0.72},${cy - r * 0.5} A${r * 0.88},${r * 0.88} 0 0 1 ${cx + r * 0.1},${cy - r * 0.86}`;
  const darkArc = `M${cx + r * 0.62},${cy + r * 0.5} A${r * 0.85},${r * 0.85} 0 0 1 ${cx - r * 0.2},${cy + r * 0.85}`;
  return (
    <Group>
      <Circle x={cx} y={cy} radius={r} fill={triad.base} stroke={COLOR_OUTLINE} strokeWidth={ow} />
      <Path data={lightArc} stroke={triad.light} strokeWidth={r * 0.28} lineCap="round" listening={false} />
      <Path data={darkArc} stroke={triad.dark} strokeWidth={r * 0.22} lineCap="round" listening={false} />
    </Group>
  );
}

export interface GlowOptions {
  /** Defaults to COLOR_LAMP_LIT - docs/EPW_rysunki_referencja.py's own C.glow() default is that exact same value, reused here rather than duplicated as a literal. */
  color?: string;
}

/**
 * A soft halo around a lit fixture - three concentric, unstroked
 * circles of the SAME color, radius shrinking while opacity rises
 * toward the center (r*2.6 @ 0.18, r*1.8 @ 0.28, r*1.15 @ 0.45,
 * exactly docs/EPW_rysunki_referencja.py's own C.glow()) - the one
 * deliberate translucency/gradient-like exception in this whole file:
 * a genuine light source glowing outward, not shading on a shape's own
 * surface (which stays hard-edged banded fill everywhere else).
 */
export function glow(cx: number, cy: number, r: number, options: GlowOptions = {}): React.ReactElement {
  const color = options.color ?? COLOR_LAMP_LIT;
  return (
    <Group listening={false}>
      <Circle x={cx} y={cy} radius={r * 2.6} fill={color} opacity={0.18} />
      <Circle x={cx} y={cy} radius={r * 1.8} fill={color} opacity={0.28} />
      <Circle x={cx} y={cy} radius={r * 1.15} fill={color} opacity={0.45} />
    </Group>
  );
}
