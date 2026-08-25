import re

with open('src/tests/compatibility.test.ts', 'r') as f:
    content = f.read()

if "expect, vi } from 'vitest'" not in content:
    content = content.replace("import { describe, it, expect } from 'vitest';", "import { describe, it, expect, vi } from 'vitest';")

new_tests = """
  it('rejects connection if mediums do not match (e.g., ethernet and rs485)', () => {
    const fromObj = { id: 'obj1', type: 'automation.plc', x: 0, y: 0 } as any;
    const toObj = { id: 'obj2', type: 'automation.ada', x: 0, y: 0 } as any;

    // We are mocking this to pass standard bounds, the test relies on explicit validation code
    const spy = vi.spyOn(require('../utils/GeometryUtils'), 'resolveConnectionPoint').mockImplementation((obj, portId) => {
        if (portId === 'ETH') return { id: portId, domain: 'data', medium: 'ethernet', direction: 'passive' };
        if (portId === 'RS485') return { id: portId, domain: 'data', medium: 'rs485', direction: 'passive' };
        return { id: portId, domain: 'electrical', direction: 'passive' };
    });

    const res = ConnectionService.validateConnection(fromObj, 'ETH', toObj, 'RS485', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('MEDIUM_MISMATCH');
    spy.mockRestore();
  });

  it('rejects unknown or invalid mediums', () => {
    const fromObj = { id: 'obj1', type: 'electrical.motor', x: 0, y: 0 } as any;
    const toObj = { id: 'obj2', type: 'electrical.motor', x: 0, y: 0 } as any;
    // mock unknown medium
    const spy = vi.spyOn(require('../utils/GeometryUtils'), 'resolveConnectionPoint').mockImplementation((obj, portId) => {
        return { id: portId, domain: 'electrical', medium: 'magical_unknown_power', direction: 'passive' };
    });

    const res = ConnectionService.validateConnection(fromObj, 'IN', toObj, 'IN', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNKNOWN_MEDIUM');
    spy.mockRestore();
  });
"""

if "MEDIUM_MISMATCH" not in content:
    content = re.sub(r'\}\);\n$', new_tests + "});\n", content)

with open('src/tests/compatibility.test.ts', 'w') as f:
    f.write(content)
