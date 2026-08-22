import { describe, it, expect } from 'vitest';
import { ConnectionService } from '../project/ConnectionService';
import type { SynopticObject } from '../store';

describe('Connection Compatibility Validator', () => {
  const mockWaterObj = { id: 'w1', type: 'water.pump' } as SynopticObject;
  const mockWaterObj2 = { id: 'w2', type: 'water.pump' } as SynopticObject;
  const mockElecObj = { id: 'e1', type: 'electrical.circuit_breaker' } as SynopticObject;
  const mockElecObj2 = { id: 'e2', type: 'electrical.circuit_breaker' } as SynopticObject;

  it('rejects cross-domain connections (water to electrical)', () => {
    const res = ConnectionService.validateConnection(mockWaterObj, 'IN', mockElecObj, 'IN', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('DOMAIN_MISMATCH');
  });

  it('accepts valid intra-domain passive connections (electrical to electrical)', () => {
    const res = ConnectionService.validateConnection(mockElecObj, 'IN', mockElecObj2, 'OUT', []);
    expect(res.valid).toBe(true);
  });

  it('rejects IN -> IN direction mismatch', () => {
    const res = ConnectionService.validateConnection(mockWaterObj, 'IN', mockWaterObj2, 'IN', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('DIRECTION_MISMATCH');
  });

  it('rejects OUT -> OUT direction mismatch', () => {
    const res = ConnectionService.validateConnection(mockWaterObj, 'OUT', mockWaterObj2, 'OUT', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('DIRECTION_MISMATCH');
  });

  it('rejects self connections', () => {
    const res = ConnectionService.validateConnection(mockWaterObj, 'IN', mockWaterObj, 'OUT', []);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('SELF_CONNECTION');
  });
});
