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

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  objectId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateProjectSchema(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!data || typeof data !== 'object') {
     return { valid: false, issues: [{ severity: 'ERROR', code: 'INVALID_FORMAT', message: 'Data is not an object' }] };
  }

  if (data.format !== FORMAT_NAME) {
     issues.push({ severity: 'ERROR', code: 'INVALID_FORMAT', message: `Format must be ${FORMAT_NAME}` });
  }

  if (typeof data.schema_version !== 'number') {
     issues.push({ severity: 'ERROR', code: 'MISSING_VERSION', message: 'Missing schema_version' });
  } else if (data.schema_version > CURRENT_SCHEMA_VERSION) {
     issues.push({ severity: 'ERROR', code: 'UNSUPPORTED_VERSION', message: `Unsupported schema version: ${data.schema_version}. Max is ${CURRENT_SCHEMA_VERSION}` });
  }

  if (!data.project || typeof data.project.name !== 'string') {
     issues.push({ severity: 'ERROR', code: 'INVALID_PROJECT_META', message: 'Missing or invalid project.name' });
  }

  if (!data.canvas || typeof data.canvas.width !== 'number' || typeof data.canvas.height !== 'number') {
     issues.push({ severity: 'ERROR', code: 'INVALID_CANVAS', message: 'Missing or invalid canvas config' });
  }

  if (!Array.isArray(data.objects)) {
     issues.push({ severity: 'ERROR', code: 'INVALID_OBJECTS', message: 'Objects must be an array' });
     return { valid: false, issues };
  }

  const objectIds = new Set<string>();
  for (const obj of data.objects) {
    if (!obj.id) {
       issues.push({ severity: 'ERROR', code: 'MISSING_OBJ_ID', message: 'Object missing ID' });
       continue;
    }
    if (objectIds.has(obj.id)) {
       issues.push({ severity: 'ERROR', code: 'DUPLICATE_OBJ_ID', objectId: obj.id, message: `Duplicate object ID: ${obj.id}` });
    }
    objectIds.add(obj.id);

    const def = getSymbolDefinition(obj.type);
    if (!def) {
       issues.push({ severity: 'WARNING', code: 'UNKNOWN_SYMBOL', objectId: obj.id, message: `Unknown symbol type: ${obj.type}` });
    }
  }

  const connIds = new Set<string>();
  if (data.connections) {
    for (const conn of data.connections) {
      if (!conn.id) {
         issues.push({ severity: 'ERROR', code: 'MISSING_CONN_ID', message: 'Connection missing ID' });
         continue;
      }
      if (connIds.has(conn.id)) {
         issues.push({ severity: 'ERROR', code: 'DUPLICATE_CONN_ID', message: `Duplicate connection ID: ${conn.id}` });
      }
      connIds.add(conn.id);

      if (!objectIds.has(conn.fromId)) {
         issues.push({ severity: 'ERROR', code: 'DANGLING_CONNECTION', message: `Dangling connection fromId: ${conn.fromId}` });
      }
      if (!objectIds.has(conn.toId)) {
         issues.push({ severity: 'ERROR', code: 'DANGLING_CONNECTION', message: `Dangling connection toId: ${conn.toId}` });
      }
    }
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');
  return { valid: !hasErrors, issues };
}
