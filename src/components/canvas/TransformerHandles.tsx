// Internal-audit fix (Canvas.tsx breakup): moved out of Canvas.tsx
// verbatim, comments included - see ObjectNode.tsx's own header for why.
import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { COLOR_WHITE } from '../../theme/ScadaTheme';
import { setActiveResizeAnchor } from '../../utils/ResizeHandles';
import type { ResizeAnchor } from '../../utils/ResizeHandles';

// Layer 7 (commit 5): the resize/rotate handles for one selected,
// unlocked object - rendered in Canvas's own final "zaznaczenie i
// uchwyty" pass so they always draw above every symbol, not just above
// this one object's own (two overlapping objects, the later one drawn
// after the selected one, used to be able to cover its handles - this
// is what that bug looked like). Attaches to `node` (the target
// object's own Konva Group, reported via ObjectNode's onShapeRef) -
// resize/rotate itself is still handled by that Group's own existing
// onTransformEnd, unchanged; this component only draws the handles and
// (fix/handles-insert-mode-diodes commit 1) records which anchor
// started the gesture via setActiveResizeAnchor (ResizeHandles.ts), for
// that onTransformEnd to read back.
//
// keepRatio is Konva's own Transformer default - true unless told
// otherwise - which locks width/height together on every corner drag.
// That default is exactly usterka 1's own symptom ("chwycenie uchwytu
// w rogu... nie pozwala zmieniac szerokosci i wysokosci niezaleznie");
// explicitly false here (and on every other Transformer in this file)
// is the one-line fix underneath everything else this commit adds.
export const ObjectTransformerHandle = ({ node }: { node: any }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (node && trRef.current) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  });

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      keepRatio={false}
      onTransformStart={() => {
        setActiveResizeAnchor((trRef.current?.getActiveAnchor() || null) as ResizeAnchor | 'rotater' | null);
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox;
        }
        return newBox;
      }}
      borderStroke={COLOR_WHITE}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
    />
  );
};

// The same Transformer-relocation pattern as ObjectTransformerHandle
// above, for a frame's own resize handles (3f) - rotation disabled
// (frames do not rotate, per this element's own 3a spec, which lists
// only x/y/width/height/title/titlePosition/variant). keepRatio false
// for the same reason as ObjectTransformerHandle above. No live
// boundBoxFunc floor beyond a small pixel minimum: the REAL 2-grid-
// cell minimum (3g) is enforced where it actually matters, in
// FrameElementNode's own onTransformEnd (computeResizeFromAnchor's own
// minWidth/minHeight), which runs regardless of zoom level - a
// boundBoxFunc here only sees on-screen pixels, not the frame's own
// local units.
export const FrameTransformerHandle = ({ node }: { node: any }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (node && trRef.current) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  });

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={false}
      keepRatio={false}
      onTransformStart={() => {
        setActiveResizeAnchor((trRef.current?.getActiveAnchor() || null) as ResizeAnchor | 'rotater' | null);
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox;
        }
        return newBox;
      }}
      borderStroke={COLOR_WHITE}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
    />
  );
};

// fix/handles-insert-mode-diodes commit 1: the meter and signal panel
// elements resize ONLY their own width by hand - height is always
// computed from row count (1's own note). Only the two vertical-edge
// anchors are enabled at all; every corner and the two horizontal
// (top/bottom) anchors are left out of enabledAnchors entirely, so
// they are not merely inactive but genuinely absent from the handle -
// there is nothing there to grab that could touch height.
export const WidthOnlyTransformerHandle = ({ node }: { node: any }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (node && trRef.current) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  });

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={false}
      keepRatio={false}
      enabledAnchors={['middle-left', 'middle-right']}
      onTransformStart={() => {
        setActiveResizeAnchor((trRef.current?.getActiveAnchor() || null) as ResizeAnchor | 'rotater' | null);
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10) return oldBox;
        return newBox;
      }}
      borderStroke={COLOR_WHITE}
      borderStrokeWidth={2}
      borderDash={[6, 4]}
    />
  );
};
