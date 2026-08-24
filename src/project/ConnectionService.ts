import { useStore } from '../store';
import { resolveConnectionPoint } from '../utils/GeometryUtils';
import type { SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

export interface ValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
  inferredType?: string;
}

export class ConnectionService {
  static validateConnection(
    fromObj: SynopticObject,
    fromPortId: string,
    toObj: SynopticObject,
    toPortId: string,
    existingConnections: any[]
  ): ValidationResult {
    if (!fromObj || !toObj) return { valid: false, code: "MISSING_OBJECT", message: "Source or target object missing" };

    if (fromObj.id === toObj.id) return { valid: false, code: "SELF_CONNECTION", message: "Cannot connect an object to itself" };

    const fromPort = resolveConnectionPoint(fromObj, fromPortId);
    const toPort = resolveConnectionPoint(toObj, toPortId);

    if (!fromPort) return { valid: false, code: "MISSING_PORT", message: `Source port ${fromPortId} not found` };
    if (!toPort) return { valid: false, code: "MISSING_PORT", message: `Target port ${toPortId} not found` };

    // Dynamic port bounds checking
    const fromDef = getSymbolDefinition(fromObj.type);
    const toDef = getSymbolDefinition(toObj.type);

    if (fromPortId.startsWith('dyn_') && !fromDef?.supportsDynamicPorts) {
      return { valid: false, code: "DYN_UNSUPPORTED", message: "Source object does not support dynamic ports" };
    }
    if (toPortId.startsWith('dyn_') && !toDef?.supportsDynamicPorts) {
      return { valid: false, code: "DYN_UNSUPPORTED", message: "Target object does not support dynamic ports" };
    }

    // Media and Domain compatibility
    if (fromPort.domain !== toPort.domain) {
      return { valid: false, code: "DOMAIN_MISMATCH", message: `Cannot connect ${fromPort.domain} to ${toPort.domain}` };
    }

    if (fromPort.medium && toPort.medium && fromPort.medium !== toPort.medium) {
      return { valid: false, code: "MEDIUM_MISMATCH", message: `Cannot connect ${fromPort.medium} to ${toPort.medium}` };
    }

    // Direction validation
    if (fromPort.direction === 'in' && toPort.direction === 'in') {
      return { valid: false, code: "DIRECTION_MISMATCH", message: "Cannot connect IN to IN" };
    }
    if (fromPort.direction === 'out' && toPort.direction === 'out') {
      return { valid: false, code: "DIRECTION_MISMATCH", message: "Cannot connect OUT to OUT" };
    }

    // Multiplicity validation (Single vs Multiple)
    const fromOccupied = existingConnections.find(c => (c.fromId === fromObj.id && c.fromPort === fromPortId) || (c.toId === fromObj.id && c.toPort === fromPortId));
    const toOccupied = existingConnections.find(c => (c.fromId === toObj.id && c.fromPort === toPortId) || (c.toId === toObj.id && c.toPort === toPortId));

    if (fromPort.multiplicity !== 'multiple' && fromOccupied) {
      return { valid: false, code: "PORT_OCCUPIED", message: `Source port ${fromPortId} is already occupied` };
    }
    if (toPort.multiplicity !== 'multiple' && toOccupied) {
      return { valid: false, code: "PORT_OCCUPIED", message: `Target port ${toPortId} is already occupied` };
    }

    // Duplicate connections check
    const duplicate = existingConnections.find(c =>
      (c.fromId === fromObj.id && c.fromPort === fromPortId && c.toId === toObj.id && c.toPort === toPortId) ||
      (c.fromId === toObj.id && c.fromPort === toPortId && c.toId === fromObj.id && c.toPort === fromPortId)
    );
    if (duplicate) {
      return { valid: false, code: "DUPLICATE_CONNECTION", message: "Connection already exists" };
    }

    // Infer connection type
    let inferredType = 'electrical_ac';
    if (fromPort.medium) inferredType = fromPort.medium;
    else if (toPort.medium) inferredType = toPort.medium;
    else if (fromPort.domain === 'water') inferredType = 'water';
    else if (fromPort.domain === 'hvac') inferredType = 'hvac_air';
    else if (fromPort.domain === 'data' || fromPort.domain === 'control') inferredType = 'data'; // fallback

    return { valid: true, inferredType };
  }

  static tryCreateConnection(
    fromId: string,
    fromPortId: string,
    toId: string,
    toPortId: string
  ): boolean {
    const store = useStore.getState();
    const fromObj = store.objects.find(o => o.id === fromId);
    const toObj = store.objects.find(o => o.id === toId);

    if (!fromObj || !toObj) return false;

    const validation = this.validateConnection(fromObj, fromPortId, toObj, toPortId, store.connections);

    if (!validation.valid) {
      store.addMessage(`[ERROR] ${validation.message}`);
      return false;
    }

    store.addConnection({
      fromId,
      fromPort: fromPortId,
      toId,
      toPort: toPortId,
      type: validation.inferredType || 'electrical_ac'
    });

    store.addMessage(`[INFO] Connected ${fromId}:${fromPortId} to ${toId}:${toPortId}`);
    return true;
  }
}
