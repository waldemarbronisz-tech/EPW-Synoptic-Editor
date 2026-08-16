import type { SynopticObject, SynopticConnection } from '../store';

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
      background: "#ffffff"
    },
    objects: [],
    connections: []
  };
}

export function validateProjectSchema(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.format !== FORMAT_NAME) return false;
  if (typeof data.schema_version !== 'number') return false;
  if (!data.project || typeof data.project.name !== 'string') return false;
  if (!Array.isArray(data.objects)) return false;
  // Further validation can be added here
  return true;
}
