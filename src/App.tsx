import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { Toolbox } from './components/Toolbox';
import { Canvas } from './components/Canvas';
import { PropertyInspector } from './components/PropertyInspector';
import { MessagesPanel } from './components/MessagesPanel';
import { ScadaStylePreview } from './components/ScadaStylePreview';
import { useStore } from './store';
import { useEffect, useState } from 'react';

function App() {
  const { projectName, fileName, isDirty } = useStore();
  const [showScadaPreview, setShowScadaPreview] = useState(false);

  useEffect(() => {
    const titleName = fileName || `${projectName}.epwsyn`;
    const dirtyMark = isDirty ? ' *' : '';
    document.title = `EPW Synoptic Editor — ${titleName}${dirtyMark}`;
  }, [projectName, fileName, isDirty]);

  return (
    <div className="app-container">
      <MenuBar onOpenScadaPreview={() => setShowScadaPreview(true)} />
      {showScadaPreview && <ScadaStylePreview onClose={() => setShowScadaPreview(false)} />}
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
                <Canvas />
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
    </div>
  );
}

export default App;
