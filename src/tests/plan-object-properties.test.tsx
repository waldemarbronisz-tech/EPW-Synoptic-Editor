/** @vitest-environment jsdom */
// feat/isometric-engine commit 6: renders the REAL PropertyInspector
// against the REAL store, same convention properties-cleanup.test.tsx
// already established for this component.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useStore } from '../store';
import { PropertyInspector } from '../components/PropertyInspector';
import { setSpriteManifestForTesting } from '../iso/SpriteManifest';
import type { SpriteManifestData } from '../iso/SpriteManifest';
import type { PlanObject } from '../iso/PlanObject';

function makePlanObject(overrides: Partial<PlanObject> = {}): PlanObject {
  return { id: 'P1', spriteId: 'gate.sliding', state: 'CLOSED', gx: 2, gy: 3, designation: '', name: '', ...overrides };
}

function resetStore() {
  useStore.setState({
    objects: [], connections: [], meters: [], signalPanels: [], frames: [],
    planObjects: [], selectedPlanObjectIds: [],
    selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [],
    history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {}, planObjects: [] }],
    historyIndex: 0
  });
}

const manifest: SpriteManifestData = {
  tileWidth: 128, tileHeight: 64, metersPerTile: 8,
  sprites: [{
    id: 'gate.sliding', description: 'Brama przesuwna', footprint: { x: 2, y: 1 },
    states: {
      CLOSED: { file: 'gate_sliding_CLOSED.png', width: 96, height: 62, anchorX: 48, anchorY: 62 },
      OPEN: { file: 'gate_sliding_OPEN.png', width: 105, height: 57, anchorX: 52, anchorY: 57 },
    }
  }]
};

describe('PropertyInspector - plan object', () => {
  beforeEach(() => {
    resetStore();
    setSpriteManifestForTesting(manifest);
  });
  afterEach(cleanup);

  it('shows the sprite id read-only', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    const input = screen.getByDisplayValue('gate.sliding') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('shows the footprint read-only, resolved from the manifest', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    const input = screen.getByDisplayValue('2 x 1') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('the state dropdown lists exactly the manifest\'s own states for this sprite', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    expect(screen.getByRole('option', { name: 'CLOSED' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'OPEN' })).toBeTruthy();
  });

  it('changing the state dropdown updates the store immediately', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    fireEvent.change(screen.getByDisplayValue('CLOSED'), { target: { value: 'OPEN' } });
    expect(useStore.getState().planObjects[0].state).toBe('OPEN');
  });

  it('designation and name are editable', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    // Labels here are plain sibling text, not <label for> associations
    // (the same convention every other Properties field in this app
    // already uses) - found via the row containing each label's text.
    const designationInput = screen.getByText('Designation').closest('.property-row')!.querySelector('input')!;
    const nameInput = screen.getByText('Name').closest('.property-row')!.querySelector('input')!;
    fireEvent.change(designationInput, { target: { value: '-B12' } });
    fireEvent.change(nameInput, { target: { value: 'Main gate' } });
    expect(useStore.getState().planObjects[0].designation).toBe('-B12');
    expect(useStore.getState().planObjects[0].name).toBe('Main gate');
  });

  it('has no Fill, Border, Font, Rotation or Scale field - none of them apply to a plan object', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    for (const label of ['Fill', 'Border', 'Font', 'Rotation', 'Scale']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('has no Bindings section - a plan object has no terminals or connections', () => {
    useStore.setState({ planObjects: [makePlanObject()], selectedPlanObjectIds: ['P1'] });
    render(<PropertyInspector />);
    expect(screen.queryByText('Bindings')).toBeNull();
  });

  it('shows "Multiple objects selected" when more than one plan object is selected', () => {
    useStore.setState({
      planObjects: [makePlanObject({ id: 'P1' }), makePlanObject({ id: 'P2' })],
      selectedPlanObjectIds: ['P1', 'P2']
    });
    render(<PropertyInspector />);
    expect(screen.getByText('Multiple objects selected')).toBeTruthy();
  });
});
