import type { SynopticObject, SynopticConnection } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

export interface EPWProjectInfo {
  name: string;
  description: string;
  created_at: string;
  modified_at: string;
}

export interface EPWCanvasSchema {
  width: number;
  height: number;
  background: string;
  gridSize?: number;
}

export interface EPWProjectSchema {
  format: string;
  schema_version: number;
  project: EPWProjectInfo;
  canvas: EPWCanvasSchema;
  objects: SynopticObject[];
  connections?: SynopticConnection[];
}

export const CURRENT_SCHEMA_VERSION = 1;
export const FORMAT_NAME = "EPW_SYNOPTIC";

export function createEmptyProject(name: string = "New Project"): EPWProjectSchema {
  return {
    format: FORMAT_NAME,
    schema_version: CURRENT_SCHEMA_VERSION,
    project: {
      name,
      description: "",
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    },
    canvas: {
      width: 1920,
      height: 1080,
      background: "#ffffff",
      gridSize: 20
    },
    objects: [],
    connections: []
  };
}

export function validateProjectSchema(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: "Data is not an object" };
  if (data.format !== FORMAT_NAME) return { valid: false, error: `Format must be ${FORMAT_NAME}` };
  if (typeof data.schema_version !== 'number') return { valid: false, error: "Missing schema_version" };
  if (data.schema_version > CURRENT_SCHEMA_VERSION) return { valid: false, error: `Unsupported schema version: ${data.schema_version}. Max supported is ${CURRENT_SCHEMA_VERSION}` };
  if (!data.project || typeof data.project.name !== 'string') return { valid: false, error: "Missing or invalid project.name" };
  if (!data.canvas || typeof data.canvas.width !== 'number' || typeof data.canvas.height !== 'number') return { valid: false, error: "Missing or invalid canvas config" };
  if (!Array.isArray(data.objects)) return { valid: false, error: "Objects must be an array" };

  const objectIds = new Set<string>();
  for (const obj of data.objects) {
    if (!obj.id) return { valid: false, error: "Object missing ID" };
    if (objectIds.has(obj.id)) return { valid: false, error: `Duplicate object ID: ${obj.id}` };
    objectIds.add(obj.id);

    // Check if symbol type exists
    const def = getSymbolDefinition(obj.type);
    if (!def) return { valid: false, error: `Unknown symbol type: ${obj.type}` };
  }

  const connIds = new Set<string>();
  if (data.connections) {
    for (const conn of data.connections) {
      if (!conn.id) return { valid: false, error: "Connection missing ID" };
      if (connIds.has(conn.id)) return { valid: false, error: `Duplicate connection ID: ${conn.id}` };
      connIds.add(conn.id);

      // Check dangling references
      if (!objectIds.has(conn.fromId)) return { valid: false, error: `Dangling connection fromId: ${conn.fromId}` };
      if (!objectIds.has(conn.toId)) return { valid: false, error: `Dangling connection toId: ${conn.toId}` };

      // Validate ports exist on the symbols
      const fromObj = data.objects.find((o: any) => o.id === conn.fromId);
      const toObj = data.objects.find((o: any) => o.id === conn.toId);
      const fromDef = getSymbolDefinition(fromObj.type);
      const toDef = getSymbolDefinition(toObj.type);

      const fromPortExists = conn.fromPort.startsWith('dyn_') || fromDef?.connectionPoints?.some(p => p.id === conn.fromPort);
      const toPortExists = conn.toPort.startsWith('dyn_') || toDef?.connectionPoints?.some(p => p.id === conn.toPort);

      if (!fromPortExists) return { valid: false, error: `Nonexistent port ${conn.fromPort} on object ${conn.fromId}` };
      if (!toPortExists) return { valid: false, error: `Nonexistent port ${conn.toPort} on object ${conn.toId}` };
    }
  }

  return { valid: true };
}

export function migrateProject(data: any): EPWProjectSchema {
  // Migration pipeline concept
  // v1 -> v2 -> v3
  let current = { ...data };

  // if (current.schema_version === 1) {
  //   // migrate to 2
  //   current.schema_version = 2;
  // }

  return current as EPWProjectSchema;
}
