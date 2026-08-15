import React, { useState } from 'react';

const LIBRARY = {
  Electrical: [
    'Circuit breaker', 'Fuse', 'Switch', 'Disconnect switch', 'Contactor',
    'Relay', 'Motor', 'Generator', 'Transformer', 'Busbar', 'Terminal',
    'Current transformer', 'Voltage transformer', 'Earth', 'Lightning protection',
    'Panel', 'Cabinet', 'Distribution board', 'Cable', 'Cable tray', 'UPS',
    'Battery', 'Power supply', 'Frequency converter', 'Soft starter', 'Indicator lamp',
    'Emergency stop', 'Push button', 'Selector switch', 'Limit switch'
  ],
  Water: [
    'Pipe', 'Pipe elbow', 'T', 'Cross', 'Reducer', 'Valve', 'Gate valve',
    'Ball valve', 'Butterfly valve', 'Check valve', 'Pressure valve', 'Pump',
    'Submersible pump', 'Hydrophore', 'Water tank', 'Expansion vessel', 'Filter',
    'Flow meter', 'Pressure sensor', 'Level sensor', 'Temperature sensor', 'Drain', 'Water meter'
  ],
  Automation: [
    'PLC', 'Remote IO', 'DI module', 'DO module', 'AI module', 'AO module',
    'VFD', 'Servo', 'Encoder', 'HMI', 'SCADA node', 'Ethernet switch', 'Router', 'Fiber converter'
  ],
  EPW_Components: [
    'ELA DI01', 'ELA DI32', 'ADA DO01', 'ADA DO32', 'AI01-AI16', 'AO01-AO16',
    'Internal Memory M', 'Internal Memory T', 'Internal Memory C', 'System Flags'
  ],
  Graphics: ['Rectangle', 'Circle', 'Line', 'Text']
};

export const Toolbox: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Electrical: true
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
        {Object.entries(LIBRARY).map(([category, items]) => (
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
                {items.map(item => (
                  <div
                    key={item}
                    className="library-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, category)}
                  >
                    📄 {item}
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
