import React, { useState, useMemo } from 'react';
import { getSymbolsByCategory } from '../symbols/SymbolRegistry';
import { useStore } from '../store';
import { listSprites } from '../iso/SpriteManifest';

// feat/isometric-engine commit 5: in PLAN mode the library shows ONLY
// the manifest's own sprites - every schematic symbol category is
// simply absent, not merely collapsed, since a PLAN screen has no use
// for wire terminals or SCADA symbols at all. Grouped under one
// category label; the manifest itself carries no category concept the
// way SymbolRegistry.ts's electrical/water/hvac/... split does.
const PLAN_LIBRARY_CATEGORY = 'Plan Objects';

export const Toolbox: React.FC = () => {
  const screenKind = useStore(state => state.screenKind);
  const schematicLibrary = useMemo(() => getSymbolsByCategory(), []);
  // manifestVersion is read only to subscribe to it - see its own
  // comment in planSlice.ts for why listSprites() alone would never
  // trigger a re-render once the manifest finishes loading.
  useStore(state => state.manifestVersion);
  const planSprites = listSprites();
  const library = screenKind === 'PLAN'
    ? { [PLAN_LIBRARY_CATEGORY]: planSprites.map(s => ({ type: s.id, label: s.description })) }
    : schematicLibrary;

  // feat/appearance-selection-frames commit 4a: this used to be a
  // literal three-category object (Electrical/Water/SCADA) written
  // before HVAC and Instrumentation existed - both silently defaulted
  // to collapsed ever since, hiding seven symbols until a user
  // happened to click their folders. Every category the registry
  // actually returns now starts expanded, derived directly from
  // `library` itself so a future category can never repeat this same
  // bug by omission.
  //
  // feat/isometric-engine commit 5: `library`'s own SHAPE can now change
  // after mount (switching screenKind by opening a project of the other
  // kind, without remounting Toolbox) - a category missing from this
  // dictionary defaults to expanded too (checked as `!== false` below,
  // not truthiness), so the PLAN category is never collapsed just
  // because it did not exist yet when this state was first computed.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => Object.fromEntries(Object.keys(library).map(category => [category, true]))
  );

  const toggleFolder = (folder: string) => {
    setExpanded(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleDragStart = (e: React.DragEvent, type: string, category: string) => {
    // PlanCanvas.tsx's own onDrop reads `spriteId`; Canvas.tsx's (schematic,
    // untouched) reads `type`/`category` - `def.type` already IS the
    // sprite's manifest id in PLAN mode (see the `library` shape above),
    // so both payload shapes carry it, one under each name a drop target
    // actually looks for.
    const payload = screenKind === 'PLAN' ? { spriteId: type } : { type, category };
    e.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="toolbox">
      <div className="toolbox-header">Object Library</div>
      <div className="toolbox-content">
        {Object.entries(library).map(([category, items]) => (
          <div key={category} className="folder">
            <div
              className="folder-header"
              onClick={() => toggleFolder(category)}
            >
              <span className="folder-icon">{expanded[category] !== false ? '📂' : '📁'}</span>
              <span className="folder-name">{category.replace('_', ' ')}</span>
            </div>
            {expanded[category] !== false && (
              <div className="folder-items">
                {items.map(def => (
                  <div
                    key={def.type}
                    className="library-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, def.type, category)}
                  >
                    📄 {def.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
