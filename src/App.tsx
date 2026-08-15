import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { Toolbox } from './components/Toolbox';
import { Canvas } from './components/Canvas';
import { PropertyInspector } from './components/PropertyInspector';
import { MessagesPanel } from './components/MessagesPanel';

function App() {
  return (
    <div className="app-container">
      <MenuBar />
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
