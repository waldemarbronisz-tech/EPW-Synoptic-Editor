import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { Toolbox } from './components/Toolbox';
import { Canvas } from './components/Canvas';
import { PlanCanvas } from './components/PlanCanvas';
import { PropertyInspector } from './components/PropertyInspector';
import { MessagesPanel } from './components/MessagesPanel';
import { StatusBar } from './components/StatusBar';
import { useStore } from './store';
import { loadSpriteManifest } from './iso/SpriteManifest';
import { Suspense, lazy, useEffect, useState } from 'react';

// Internal-audit fix: a full-screen preview only ever mounted from the
// menu bar's "Style Preview" action - lazy so its code isn't part of the
// bundle every session pays for on first load.
const ScadaStylePreview = lazy(() =>
  import('./components/ScadaStylePreview').then(m => ({ default: m.ScadaStylePreview }))
);

function App() {
  const { projectName, fileName, isDirty, screenKind } = useStore();
  const [showScadaPreview, setShowScadaPreview] = useState(false);

  useEffect(() => {
    const titleName = fileName || `${projectName}.epwsyn`;
    const dirtyMark = isDirty ? ' *' : '';
    document.title = `EPW Synoptic Editor — ${titleName}${dirtyMark}`;
  }, [projectName, fileName, isDirty]);

  // Loaded once, regardless of screenKind: a SCHEMATIC session never
  // reads anything this populates, and the fetch/validation itself never
  // touches schematic state, so this is safe to always run - a PLAN
  // screen (or a "New Plan..." created later in the same session) then
  // never has to wait for it.
  useEffect(() => {
    loadSpriteManifest().then(() => {
      useStore.getState().bumpManifestVersion();
    });
  }, []);

  // Internal-audit fix: isDirty was already tracked in the store (for the
  // title-bar "*" above) but nothing warned before closing the tab/window,
  // so an unsaved schematic could be lost with no prompt at all. Standard
  // native confirmation dialog - browsers ignore any custom message text,
  // but still show their own generic "changes you made may not be saved".
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="app-container">
      <MenuBar onOpenScadaPreview={() => setShowScadaPreview(true)} />
      {showScadaPreview && (
        <Suspense fallback={null}>
          <ScadaStylePreview onClose={() => setShowScadaPreview(false)} />
        </Suspense>
      )}
      <Toolbar />

      <div className="main-workspace">
        <PanelGroup direction="horizontal" autoSaveId="epw-layout-main">
          <Panel defaultSize={20} minSize={10} className="panel-container">
            <Toolbox />
          </Panel>

          <PanelResizeHandle className="resize-handle-vertical" />

          <Panel defaultSize={60} minSize={30} className="panel-container">
            <PanelGroup direction="vertical" autoSaveId="epw-layout-center">
              <Panel defaultSize={80} minSize={30} className="panel-container">
                {screenKind === 'PLAN' ? <PlanCanvas /> : <Canvas />}
              </Panel>

              <PanelResizeHandle className="resize-handle-horizontal" />

              <Panel defaultSize={20} minSize={10} className="panel-container">
                <MessagesPanel />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="resize-handle-vertical" />

          <Panel defaultSize={20} minSize={10} className="panel-container">
            <PropertyInspector />
          </Panel>
        </PanelGroup>
      </div>

      <StatusBar />
    </div>
  );
}

export default App;
