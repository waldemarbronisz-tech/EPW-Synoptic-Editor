import type { SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import type { ConnectionPoint } from '../symbols/SymbolRegistry';

export const resolveConnectionPoint = (obj: SynopticObject, portId: string): ConnectionPoint | null => {
  const def = getSymbolDefinition(obj.type);
  if (!def) return null;

  // Normal port
  let port = def.connectionPoints?.find(p => p.id === portId);

  // Dynamic port (busbars, etc)
  if (!port && portId.startsWith('dyn_')) {
    const pos = parseInt(portId.replace('dyn_', ''), 10) / 100;
    const w = def.defaultWidth || 80;
    const h = def.defaultHeight || 80;
    if (w >= h) {
      port = { id: portId, x: pos, y: 0.5, domain: 'electrical', medium: 'ac', direction: 'passive',};
    } else {
      port = { id: portId, x: 0.5, y: pos, domain: 'electrical', medium: 'ac', direction: 'passive',};
    }
  }

  return port || null;
};

export const getAbsolutePortPosition = (obj: SynopticObject, port: ConnectionPoint) => {
  const w = obj.width * (obj.scaleX || 1);
  const h = obj.height * (obj.scaleY || 1);

  const cx = port.x * w - w / 2;
  const cy = port.y * h - h / 2;

  const rot = obj.rotation || 0;
  const radians = rot * (Math.PI / 180);

  const rx = cx * Math.cos(radians) - cy * Math.sin(radians);
  const ry = cx * Math.sin(radians) + cy * Math.cos(radians);

  return {
    x: obj.x + w / 2 + rx,
    y: obj.y + h / 2 + ry
  };
};

export const getPortWorldDirection = (obj: SynopticObject, port: ConnectionPoint) => {
  // Base local direction
  let dx = 0;
  let dy = 0;
  if (port.y === 0) dy = -1;
  else if (port.y === 1) dy = 1;
  else if (port.x === 0) dx = -1;
  else if (port.x === 1) dx = 1;

  if (dx === 0 && dy === 0) {
    if (port.x < 0.25) dx = -1;
    else if (port.x > 0.75) dx = 1;
    else if (port.y < 0.25) dy = -1;
    else if (port.y > 0.75) dy = 1;
  }

  // Rotate it
  const rot = obj.rotation || 0;
  const radians = rot * (Math.PI / 180);
  const worldDx = dx * Math.cos(radians) - dy * Math.sin(radians);
  const worldDy = dx * Math.sin(radians) + dy * Math.cos(radians);

  return {
    x: Math.abs(worldDx) > 0.5 ? Math.sign(worldDx) : 0,
    y: Math.abs(worldDy) > 0.5 ? Math.sign(worldDy) : 0
  };
};

export const calculateOrthogonalPath = (x1: number, y1: number, x2: number, y2: number, fromPortDir: {x:number, y:number}, toPortDir: {x:number, y:number}) => {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  if (dx < 5) return `M ${x1} ${y1} L ${x1} ${y2}`;
  if (dy < 5) return `M ${x1} ${y1} L ${x2} ${y1}`;

  if (fromPortDir.y !== 0 || toPortDir.y !== 0) {
     const midY = y1 + (y2 - y1) / 2;
     return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }
  if (fromPortDir.x !== 0 || toPortDir.x !== 0) {
     const midX = x1 + (x2 - x1) / 2;
     return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  if (dy > dx) {
    const midY = y1 + (y2 - y1) / 2;
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  } else {
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
};