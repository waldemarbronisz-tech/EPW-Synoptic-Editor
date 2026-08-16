import { validateProjectSchema, createEmptyProject } from './ProjectSchema';
import type { EPWProjectSchema } from './ProjectSchema';
import { useStore } from '../store';

export class ProjectManager {
  static newProject(name: string = "New Project") {
    const emptyProj = createEmptyProject(name);
    this.loadProjectToStore(emptyProj, false);
    useStore.getState().addMessage(`[INFO] Project created: ${name}`);
  }

  static loadProject(data: string, fileName: string) {
    try {
      const parsed = JSON.parse(data);
      if (!validateProjectSchema(parsed)) {
        useStore.getState().addMessage(`[ERROR] Invalid EPW Synoptic file`);
        return false;
      }
      this.loadProjectToStore(parsed, false);
      useStore.getState().setFileName(fileName);
      useStore.getState().addMessage(`[INFO] Project loaded: ${fileName}`);
      return true;
    } catch {
      useStore.getState().addMessage(`[ERROR] Failed to parse project file`);
      return false;
    }
  }

  static getProjectData(): string {
    const state = useStore.getState();
    const proj: EPWProjectSchema = {
      format: "EPW_SYNOPTIC",
      schema_version: 1,
      project: {
        name: state.projectName,
        description: "",
        created_at: new Date().toISOString(), // In a real app we'd persist this
        modified_at: new Date().toISOString()
      },
      canvas: {
        width: 1920,
        height: 1080,
        background: "#ffffff"
      },
      objects: state.objects,
      connections: state.connections || []
    };
    return JSON.stringify(proj, null, 2);
  }

  private static loadProjectToStore(project: EPWProjectSchema, isDirty: boolean) {
    useStore.setState({
      objects: project.objects,
      connections: project.connections || [],
      projectName: project.project.name,
      isDirty: isDirty,
      selectedIds: [],
      history: [JSON.parse(JSON.stringify(project.objects))],
      historyIndex: 0
    });
  }
}
