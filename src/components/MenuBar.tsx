import React from 'react';
import { useStore } from '../store';
import { ProjectManager } from '../project/ProjectManager';
import { ProjectFileService } from '../project/ProjectFileService';

export interface MenuBarProps {
  onOpenScadaPreview?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onOpenScadaPreview }) => {
  const { undo, redo, copySelected, paste, deleteObjects, selectedIds, isDirty } = useStore();

  const handleMenuClick = (action: () => void) => {
    action();
  };

  const handleNew = () => {
    if (isDirty) {
      if (!confirm('Current project has unsaved changes. Are you sure you want to create a new project and lose them?')) {
        return;
      }
    }
    const name = prompt('Enter new project name:', 'New Project');
    if (name) {
      ProjectManager.newProject(name);
    }
  };

  const handleSave = () => {
    ProjectFileService.saveFile();
  };

  const handleSaveAs = () => {
    ProjectFileService.saveFileAs();
  };

  const handleOpen = () => {
    if (isDirty) {
      if (!confirm('Current project has unsaved changes. Are you sure you want to open a different project and lose them?')) {
        return;
      }
    }
    ProjectFileService.openFile();
  };

  const handleExit = () => {
    if (isDirty) {
      if (!confirm('Are you sure you want to exit? All unsaved progress will be lost.')) {
        return;
      }
    }
    window.close();
  }

  return (
    <div className="menu-bar">
      <div className="menu-item">
        <span>File</span>
        <div className="dropdown">
          <div className="dropdown-item" onClick={handleNew}>New</div>
          <div className="dropdown-item" onClick={handleOpen}>Open...</div>
          <div className="dropdown-item" onClick={handleSave}>Save</div>
          <div className="dropdown-item" onClick={handleSaveAs}>Save As...</div>
          <div className="dropdown-item" onClick={handleExit}>Exit</div>
        </div>
      </div>
      <div className="menu-item">
        <span>Edit</span>
        <div className="dropdown">
          <div className="dropdown-item" onClick={() => handleMenuClick(undo)}>Undo</div>
          <div className="dropdown-item" onClick={() => handleMenuClick(redo)}>Redo</div>
          <div className="dropdown-item" onClick={() => handleMenuClick(copySelected)}>Copy</div>
          <div className="dropdown-item" onClick={() => handleMenuClick(paste)}>Paste</div>
          <div className="dropdown-item" onClick={() => handleMenuClick(() => deleteObjects(selectedIds))}>Delete</div>
        </div>
      </div>
      <div className="menu-item">
        <span>View</span>
        <div className="dropdown">
          <div className="dropdown-item" onClick={() => onOpenScadaPreview?.()}>SCADA Style Preview...</div>
        </div>
      </div>
    </div>
  );
};
