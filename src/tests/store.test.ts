import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('Store History and Core Operations', () => {
  beforeEach(() => {
    useStore.setState({
      objects: [],
      connections: [],
      history: [{ objects: [], connections: [] } as any],
      historyIndex: 0
    });
  });

  it('undoes and redoes object creation cleanly', () => {
    const store = useStore.getState();
    store.addObject({ type: 'electrical.busbar', x: 0, y: 0 } as any);

    expect(useStore.getState().objects.length).toBe(1);

    useStore.getState().undo();
    expect(useStore.getState().objects.length).toBe(0);

    useStore.getState().redo();
    expect(useStore.getState().objects.length).toBe(1);
  });
});
