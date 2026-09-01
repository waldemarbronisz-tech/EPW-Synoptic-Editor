import React, { useState, useMemo } from 'react';
import { getSymbolsByCategory } from '../symbols/SymbolRegistry';

export const Toolbox: React.FC = () => {
  const library = useMemo(() => getSymbolsByCategory(), []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Electrical: true,
    Water: true,
    SCADA: true
  });

  const toggleFolder = (folder: string) => {
    setExpanded(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleDragStart = (e: React.DragEvent, type: string, category: string) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({ type, category }));
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
              <span className="folder-icon">{expanded[category] ? '📂' : '📁'}</span>
              <span className="folder-name">{category.replace('_', ' ')}</span>
            </div>
            {expanded[category] && (
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
