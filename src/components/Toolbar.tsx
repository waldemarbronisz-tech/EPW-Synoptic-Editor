import React from 'react';
import { useStore } from '../store';
import {
  Undo, Redo, Copy, ClipboardPaste, Trash2,
  BringToFront, SendToBack, AlignLeft, AlignCenter, AlignRight,
  AlignVerticalSpaceAround, AlignHorizontalSpaceAround,
  Lock, Unlock
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    undo, redo, copySelected, paste, deleteObjects, selectedIds,
    bringToFront, sendToBack, alignSelected, distributeSelected,
    lockSelected, unlockSelected
  } = useStore();

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button title="Undo" onClick={undo}><Undo size={16} /></button>
        <button title="Redo" onClick={redo}><Redo size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Distribute Horizontally" onClick={() => distributeSelected('horizontal')}><AlignHorizontalSpaceAround size={16} /></button>
        <button title="Distribute Vertically" onClick={() => distributeSelected('vertical')}><AlignVerticalSpaceAround size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Copy" onClick={copySelected}><Copy size={16} /></button>
        <button title="Paste" onClick={paste}><ClipboardPaste size={16} /></button>
        <button title="Delete" onClick={() => deleteObjects(selectedIds)}><Trash2 size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Bring to Front" onClick={bringToFront}><BringToFront size={16} /></button>
        <button title="Send to Back" onClick={sendToBack}><SendToBack size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Align Left" onClick={() => alignSelected('left')}><AlignLeft size={16} /></button>
        <button title="Align Center" onClick={() => alignSelected('center')}><AlignCenter size={16} /></button>
        <button title="Align Right" onClick={() => alignSelected('right')}><AlignRight size={16} /></button>
      </div>

      <div className="toolbar-group">
        <button title="Align Middle" onClick={() => alignSelected('middle')}><AlignVerticalSpaceAround size={16} /></button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button title="Lock" onClick={lockSelected}><Lock size={16} /></button>
        <button title="Unlock" onClick={unlockSelected}><Unlock size={16} /></button>
      </div>
    </div>
  );
};
