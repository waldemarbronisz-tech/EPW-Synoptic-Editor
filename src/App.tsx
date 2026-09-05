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
import { validateDeviceBindings } from './project/DeviceBindingValidation';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';

// Internal-audit fix: a full-screen preview only ever mounted from the
// menu bar's "Style Preview" action - lazy so its code isn't part of the
// bundle every session pays for on first load.
const ScadaStylePreview = lazy(() =>
  import('./components/ScadaStylePreview').then(m => ({ default: m.ScadaStylePreview }))
);

// feat/device-list-ui commit 1: same lazy-on-first-open convention as
// ScadaStylePreview above.
const DeviceRegistriesDialog = lazy(() =>
  import('./components/DeviceRegistriesDialog').then(m => ({ default: m.DeviceRegistriesDialog }))
);

// feat/device-list-ui commit 2: same lazy convention.
const DeviceListDialog = lazy(() =>
  import('./components/DeviceListDialog').then(m => ({ default: m.DeviceListDialog }))
);

function App() {
  const { projectName, fileName, isDirty, screenKind, objects, devices } = useStore();
  const [showScadaPreview, setShowScadaPreview] = useState(false);
  const [showDeviceRegistries, setShowDeviceRegistries] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);

  // feat/device-list-ui commit 5: a symbol's Aparat can go dangling
  // (the device it pointed at got deleted from the registry elsewhere -
  // Rejestry projektu, or Lista aparatow) without the symbol itself ever
  // being touched. Reported to Messages once per object per time it
  // BECOMES dangling, not on every render - alreadyReportedRef tracks
  // which object ids already have a standing message so fixing then
  // re-breaking the same symbol reports it again, but simply re-opening
  // a menu does not spam the panel.
  const reportedDanglingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const issues = validateDeviceBindings(objects, devices);
    const currentIds = new Set(issues.map(i => i.objectId));
    for (const issue of issues) {
      if (!reportedDanglingRef.current.has(issue.objectId)) {
        useStore.getState().addMessage(`[WARNING] ${issue.message}`);
      }
    }
    reportedDanglingRef.current = currentIds;
  }, [objects, devices]);

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
      <MenuBar
        onOpenScadaPreview={() => setShowScadaPreview(true)}
        onOpenDeviceRegistries={() => setShowDeviceRegistries(true)}
        onOpenDeviceList={() => setShowDeviceList(true)}
      />
      {showScadaPreview && (
        <Suspense fallback={null}>
          <ScadaStylePreview onClose={() => setShowScadaPreview(false)} />
        </Suspense>
      )}
      {showDeviceRegistries && (
        <Suspense fallback={null}>
          <DeviceRegistriesDialog onClose={() => setShowDeviceRegistries(false)} />
        </Suspense>
      )}
      {showDeviceList && (
        <Suspense fallback={null}>
          <DeviceListDialog onClose={() => setShowDeviceList(false)} />
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
