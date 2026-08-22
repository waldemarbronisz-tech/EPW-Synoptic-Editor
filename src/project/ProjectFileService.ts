import { ProjectManager } from './ProjectManager';
import { useStore } from '../store';

export class ProjectFileService {
  static async openFile() {
    try {
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'EPW Synoptic Files',
            accept: { 'application/json': ['.epwsyn'] }
          }],
          multiple: false
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        if (ProjectManager.loadProject(text, file.name)) {
          useStore.getState().setFileHandle(fileHandle);
        }
      } else {
        // Fallback for browsers without File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.epwsyn';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re) => {
            ProjectManager.loadProject(re.target?.result as string, file.name);
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        useStore.getState().addMessage(`[ERROR] Failed to open file: ${err.message}`);
      }
    }
  }

  static async saveFile() {
    const state = useStore.getState();
    const data = ProjectManager.getProjectData();
    if (!data) return; // Validation aborted save

    if (state.fileHandle && 'showSaveFilePicker' in window) {
      try {
        const writable = await (state.fileHandle as any).createWritable();
        await writable.write(data);
        await writable.close();
        useStore.getState().setDirty(false);
        useStore.getState().addMessage(`[INFO] Project saved: ${state.fileName}`);
      } catch (err: any) {
        useStore.getState().addMessage(`[ERROR] Failed to save file: ${err.message}`);
      }
    } else {
      await this.saveFileAs();
    }
  }

  static async saveFileAs() {
    const state = useStore.getState();
    const data = ProjectManager.getProjectData();
    if (!data) return; // Validation aborted save
    const suggestedName = state.fileName || `${state.projectName}.epwsyn`;

    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'EPW Synoptic Files',
            accept: { 'application/json': ['.epwsyn'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();

        const file = await fileHandle.getFile();
        useStore.getState().setFileHandle(fileHandle);
        useStore.getState().setFileName(file.name);
        useStore.getState().setDirty(false);
        useStore.getState().addMessage(`[INFO] Project saved as: ${file.name}`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          useStore.getState().addMessage(`[ERROR] Failed to save file as: ${err.message}`);
        }
      }
    } else {
      // Fallback
      const blob = new Blob([data as string], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);

      useStore.getState().setFileName(suggestedName);
      useStore.getState().setDirty(false);
      useStore.getState().addMessage(`[INFO] Project downloaded as: ${suggestedName}`);
    }
  }
}
