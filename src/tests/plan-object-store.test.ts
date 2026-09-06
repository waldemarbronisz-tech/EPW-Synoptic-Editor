// feat/isometric-engine commit 5: the PLAN object store contract -
// add/update/move/delete/select, and that a move always lands on a
// WHOLE tile and is one undo entry, mirroring terrain-store.test.ts's
// own convention for exercising store actions directly, without any
// Canvas/mouse wiring (PlanCanvas.tsx's own hit-testing needs a live
// image to test meaningfully - see sprite-hit-test.test.ts for the
// pure half of that instead).

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

function resetStore() {
  useStore.setState({
    objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {},
    planObjects: [], selectedPlanObjectIds: [],
    selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [],
    history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {}, planObjects: [] }],
    historyIndex: 0
  });
}

describe('Plan object store slice', () => {
  beforeEach(resetStore);

  it('addPlanObject appends a new object with a generated id', () => {
    useStore.getState().addPlanObject({ spriteId: 'gate.sliding', state: 'CLOSED', gx: 2, gy: 3 });
    const objects = useStore.getState().planObjects;
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({ spriteId: 'gate.sliding', state: 'CLOSED', gx: 2, gy: 3 });
    expect(objects[0].id).toBeTruthy();
  });

  it('addPlanObject pushes exactly one history entry', () => {
    const before = useStore.getState().history.length;
    useStore.getState().addPlanObject({ spriteId: 'gate.sliding', state: 'CLOSED', gx: 0, gy: 0 });
    expect(useStore.getState().history.length).toBe(before + 1);
  });

  it('updatePlanObject merges fields (e.g. changing state) without touching gx/gy', () => {
    useStore.getState().addPlanObject({ spriteId: 'gate.sliding', state: 'CLOSED', gx: 1, gy: 1 });
    const id = useStore.getState().planObjects[0].id;
    useStore.getState().updatePlanObject(id, { state: 'OPEN' });
    expect(useStore.getState().planObjects[0]).toMatchObject({ state: 'OPEN', gx: 1, gy: 1 });
  });

  it('selectPlanObjects replaces the selection on a plain (non-multi) call', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    useStore.getState().addPlanObject({ spriteId: 'b', state: 'DEFAULT', gx: 1, gy: 1 });
    const [idA, idB] = useStore.getState().planObjects.map(o => o.id);

    useStore.getState().selectPlanObjects([idA], false);
    expect(useStore.getState().selectedPlanObjectIds).toEqual([idA]);

    useStore.getState().selectPlanObjects([idB], false);
    expect(useStore.getState().selectedPlanObjectIds).toEqual([idB]);
  });

  it('selectPlanObjects toggles membership when multi (shift) is true', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    useStore.getState().addPlanObject({ spriteId: 'b', state: 'DEFAULT', gx: 1, gy: 1 });
    const [idA, idB] = useStore.getState().planObjects.map(o => o.id);

    useStore.getState().selectPlanObjects([idA], false);
    useStore.getState().selectPlanObjects([idB], true);
    expect(useStore.getState().selectedPlanObjectIds.sort()).toEqual([idA, idB].sort());

    useStore.getState().selectPlanObjects([idA], true); // toggle back off
    expect(useStore.getState().selectedPlanObjectIds).toEqual([idB]);
  });

  it('clearPlanSelection empties the selection', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    useStore.getState().selectPlanObjects([useStore.getState().planObjects[0].id], false);
    useStore.getState().clearPlanSelection();
    expect(useStore.getState().selectedPlanObjectIds).toEqual([]);
  });

  it('movePlanObjectTo always lands on a whole tile and is one undo entry', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    const id = useStore.getState().planObjects[0].id;
    const historyLengthBefore = useStore.getState().history.length;

    useStore.getState().movePlanObjectTo(id, 5, 7);

    expect(useStore.getState().planObjects[0]).toMatchObject({ gx: 5, gy: 7 });
    expect(Number.isInteger(useStore.getState().planObjects[0].gx)).toBe(true);
    expect(Number.isInteger(useStore.getState().planObjects[0].gy)).toBe(true);
    expect(useStore.getState().history.length).toBe(historyLengthBefore + 1);
  });

  it('undo after a move restores the previous tile', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    const id = useStore.getState().planObjects[0].id;
    useStore.getState().movePlanObjectTo(id, 5, 5);
    expect(useStore.getState().planObjects[0]).toMatchObject({ gx: 5, gy: 5 });

    useStore.getState().undo();
    expect(useStore.getState().planObjects[0]).toMatchObject({ gx: 0, gy: 0 });
  });

  it('deletePlanObjects removes the object and clears it from the selection', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    const id = useStore.getState().planObjects[0].id;
    useStore.getState().selectPlanObjects([id], false);

    useStore.getState().deletePlanObjects([id]);

    expect(useStore.getState().planObjects).toEqual([]);
    expect(useStore.getState().selectedPlanObjectIds).toEqual([]);
  });

  it('deletePlanObjects with an empty array is a no-op (no history entry)', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    const historyLengthBefore = useStore.getState().history.length;
    useStore.getState().deletePlanObjects([]);
    expect(useStore.getState().planObjects).toHaveLength(1);
    expect(useStore.getState().history.length).toBe(historyLengthBefore);
  });

  // fix/iso-tiles-and-rotation commit 3
  it('17. rotatePlanObjects rotates and is exactly ONE undo entry, even for a batch', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    useStore.getState().addPlanObject({ spriteId: 'b', state: 'DEFAULT', gx: 1, gy: 1 });
    const [idA, idB] = useStore.getState().planObjects.map(o => o.id);
    const historyLengthBefore = useStore.getState().history.length;

    // Neither 'a' nor 'b' resolves against any loaded manifest in this
    // test file - rotatePlanObjects falls back to [0, 90] for an
    // unresolvable sprite, exactly as it would for a real one with no
    // rear view (see sprite-rotation.test.ts for the manifest-driven
    // half of this same rule).
    useStore.getState().rotatePlanObjects([idA, idB], 'cw');

    const objects = useStore.getState().planObjects;
    expect(objects.find(o => o.id === idA)?.rotation).toBe(90);
    expect(objects.find(o => o.id === idB)?.rotation).toBe(90);
    expect(useStore.getState().history.length).toBe(historyLengthBefore + 1);
  });

  it('rotatePlanObjects with an empty id list is a no-op (no history entry)', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    const historyLengthBefore = useStore.getState().history.length;
    useStore.getState().rotatePlanObjects([], 'cw');
    expect(useStore.getState().planObjects[0].rotation).toBeUndefined();
    expect(useStore.getState().history.length).toBe(historyLengthBefore);
  });

  it('rotatePlanObjects cycles 0 -> 90 -> 0 for an object whose sprite cannot be resolved (no rear view available)', () => {
    useStore.getState().addPlanObject({ spriteId: 'unresolvable', state: 'DEFAULT', gx: 0, gy: 0 });
    const id = useStore.getState().planObjects[0].id;

    useStore.getState().rotatePlanObjects([id], 'cw');
    expect(useStore.getState().planObjects[0].rotation).toBe(90);

    useStore.getState().rotatePlanObjects([id], 'cw');
    expect(useStore.getState().planObjects[0].rotation).toBe(0);

    useStore.getState().rotatePlanObjects([id], 'ccw');
    expect(useStore.getState().planObjects[0].rotation).toBe(90);
  });

  it('undo after rotatePlanObjects restores the previous rotation for the whole batch', () => {
    useStore.getState().addPlanObject({ spriteId: 'a', state: 'DEFAULT', gx: 0, gy: 0 });
    useStore.getState().addPlanObject({ spriteId: 'b', state: 'DEFAULT', gx: 1, gy: 1 });
    const [idA, idB] = useStore.getState().planObjects.map(o => o.id);

    useStore.getState().rotatePlanObjects([idA, idB], 'cw');
    expect(useStore.getState().planObjects.map(o => o.rotation)).toEqual([90, 90]);

    useStore.getState().undo();
    expect(useStore.getState().planObjects.map(o => o.rotation ?? 0)).toEqual([0, 0]);
  });
});
