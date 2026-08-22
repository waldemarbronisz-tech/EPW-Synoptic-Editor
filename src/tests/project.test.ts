import { describe, it, expect } from 'vitest';
import { validateProjectSchema, createEmptyProject } from '../project/ProjectSchema';
import { runMigrations } from '../project/Migrations';

describe('Project Schema Validation', () => {
  it('validates a fresh empty project', () => {
    const proj = createEmptyProject("Test Project");
    const result = validateProjectSchema(proj);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid schema version', () => {
    const proj = createEmptyProject("Test");
    proj.schema_version = 999;
    const result = validateProjectSchema(proj);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain('Unsupported schema version');
  });

  it('rejects duplicate object IDs', () => {
    const proj = createEmptyProject("Test");
    proj.objects = [
      { id: '123', type: 'electrical.busbar', x: 0, y: 0 } as any,
      { id: '123', type: 'electrical.circuit_breaker', x: 10, y: 10 } as any
    ];
    const result = validateProjectSchema(proj);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain('Duplicate object ID');
  });

  it('rejects dangling connections', () => {
    const proj = createEmptyProject("Test");
    proj.objects = [{ id: 'obj1', type: 'electrical.busbar', x: 0, y: 0 } as any];
    proj.connections = [{ id: 'conn1', fromId: 'obj1', fromPort: 'P1', toId: 'obj2', toPort: 'IN', type: 'electrical_ac' }];
    const result = validateProjectSchema(proj);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain('Dangling connection');
  });

  it('migrates schema non-destructively', () => {
    const proj = createEmptyProject("Test");
    const migrated = runMigrations(proj);
    expect(migrated).toEqual(proj); // For now it's an identity map
  });
});
