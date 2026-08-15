import React from 'react';
import { useStore } from '../store';

export const MenuBar: React.FC = () => {
  const { undo, redo, copySelected, paste, deleteObjects, selectedIds } = useStore();

  const handleMenuClick = (action: () => void) => {
    action();
  };

  const handleNew = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      useStore.setState({ objects: [], selectedIds: [], history: [[]], historyIndex: 0 });
    }
  };

  const handleSave = () => {
    const { objects } = useStore.getState();
    localStorage.setItem('epw-synoptic-studio-save', JSON.stringify(objects));
    alert('Project saved successfully.');
  };

  const handleOpen = () => {
    const saved = localStorage.getItem('epw-synoptic-studio-save');
    if (saved) {
      try {
        const objects = JSON.parse(saved);
        useStore.setState({ objects, selectedIds: [], history: [objects], historyIndex: 0 });
        alert('Project loaded successfully.');
      } catch (e) {
        alert('Error parsing saved project.');
      }
    } else {
      alert('No saved project found.');
    }
  };

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? All unsaved progress will be lost.')) {
      window.close(); // Only works if opened by script, but it fits the aesthetic
    }
  }

  return (
    <div className="menu-bar">
      <div className="menu-item">
        <span>File</span>
        <div className="dropdown">
          <div className="dropdown-item" onClick={handleNew}>New</div>
          <div className="dropdown-item" onClick={handleOpen}>Open</div>
          <div className="dropdown-item" onClick={handleSave}>Save</div>
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
    </div>
  );
};
