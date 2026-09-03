/** @vitest-environment jsdom */
// feat/editing-and-signal-panel, follow-up task: "podlaczyc istniejacy
// element panelu sygnalizacyjnego do interfejsu". Investigation (see
// raport.md) found the panel's Toolbar button and store wiring already
// present and working against this branch's pushed HEAD - no code
// change was needed. This test is the one explicitly requested
// regardless: a component-level regression test that renders the REAL
// Toolbar against the REAL store (no mocking) and clicks its buttons,
// so the exact class of bug described in the task - an element fully
// implemented in the store/resolver/Properties layer but with no
// button anywhere a user can actually click to place one on the
// canvas - fails loudly here the moment it happens again, for ANY
// toolbar-inserted element (meter or signal panel), not just the one
// that prompted this task.
//
// Deliberately NOT a Konva/canvas-rendering test - Toolbar.tsx itself
// has no Konva dependency, so this runs in jsdom (already a
// devDependency, no new one added) without needing a live browser.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useStore } from '../store';
import { Toolbar } from '../components/Toolbar';
import { Toolbox } from '../components/Toolbox';
import { getSymbolsByCategory } from '../symbols/SymbolRegistry';

function resetStore() {
  useStore.setState({
    objects: [], connections: [], meters: [], signalPanels: [],
    selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [],
    clipboard: [], clipboardMeters: [], clipboardSignalPanels: [], clipboardConnections: [],
    history: [{ objects: [], connections: [], meters: [], signalPanels: [] }],
    historyIndex: 0
  });
}

describe('Toolbar - every toolbar-inserted element (meter, signal panel) is actually reachable from the UI', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('renders a "Dodaj Miernik" button', () => {
    render(<Toolbar />);
    expect(screen.getByTitle('Dodaj Miernik')).toBeTruthy();
  });

  it('renders a "Dodaj Panel Sygnalizacyjny" button - the exact bug this task reported', () => {
    render(<Toolbar />);
    expect(screen.getByTitle('Dodaj Panel Sygnalizacyjny')).toBeTruthy();
  });

  it('clicking "Dodaj Miernik" actually places a meter and selects it', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Dodaj Miernik'));

    const state = useStore.getState();
    expect(state.meters.length).toBe(1);
    expect(state.selectedMeterIds).toEqual([state.meters[0].id]);
  });

  it('clicking "Dodaj Panel Sygnalizacyjny" actually places a signal panel and selects it - the same mechanism as the meter, not a different one', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Dodaj Panel Sygnalizacyjny'));

    const state = useStore.getState();
    expect(state.signalPanels.length).toBe(1);
    expect(state.selectedSignalPanelIds).toEqual([state.signalPanels[0].id]);
  });

  it('both buttons live in the toolbar side by side, so neither can go missing without the other being right there to notice', () => {
    render(<Toolbar />);
    expect(screen.getByTitle('Dodaj Miernik')).toBeTruthy();
    expect(screen.getByTitle('Dodaj Panel Sygnalizacyjny')).toBeTruthy();
  });
});

describe('Toolbox (Object Library) - every visible symbol in the registry is actually listed to drag', () => {
  afterEach(cleanup);

  // The symmetric regression for symbols themselves (as opposed to the
  // meter/panel, which are not symbols at all - see above): a symbol
  // silently flipped to hiddenFromLibrary, or a category the Toolbox
  // fails to enumerate, would strand it exactly the same way the panel
  // was reported stranded, just one layer down. getSymbolsByCategory()
  // is the same "visible" source of truth terminal-centering.test.ts
  // already iterates for a different property (terminal geometry) -
  // this iterates it for reachability instead.
  it('lists exactly the symbols getSymbolsByCategory() considers visible, one .library-item per symbol, once every folder is expanded', () => {
    render(<Toolbox />);

    // Every folder starts expanded EXCEPT HVAC and Instrumentation
    // (Toolbox.tsx's own initial `expanded` state only sets Electrical/
    // Water/SCADA true) - a real, pre-existing discoverability quirk
    // flagged in raport.md, out of this task's own scope to fix
    // (GRANICE: only what the panel itself needs). Expanding every
    // folder here is what makes this assertion about REACHABILITY
    // (does an item exist to drag at all) rather than about today's
    // default collapse state, which is free to change independently.
    screen.getAllByText('📁').forEach(collapsedFolder => fireEvent.click(collapsedFolder));

    const expected = Object.values(getSymbolsByCategory()).flat();
    const rendered = screen.getAllByText(/^📄 /);

    expect(rendered.length).toBe(expected.length);
    const renderedLabels = rendered.map(el => el.textContent?.replace('📄 ', '')).sort();
    const expectedLabels = expected.map(def => def.label).sort();
    expect(renderedLabels).toEqual(expectedLabels);
  });

  it('every SCADA-category symbol expected to be visible right now is listed (Label Frame, Indicator Diode, Meter (SCADA), Boundary Point) - and no more, no less', () => {
    render(<Toolbox />);
    const scadaItems = getSymbolsByCategory().SCADA || [];
    expect(scadaItems.map(d => d.label).sort()).toEqual(['Boundary Point', 'Indicator Diode', 'Label Frame', 'Meter (SCADA)']);
  });
});
