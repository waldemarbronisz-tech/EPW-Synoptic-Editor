import { validateProjectSchema, createEmptyProject, CURRENT_SCHEMA_VERSION, FORMAT_NAME } from './ProjectSchema';
import { runMigrations } from './Migrations';
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
      let parsed = JSON.parse(data);

      if (!parsed || typeof parsed !== 'object' || parsed.schema_version > CURRENT_SCHEMA_VERSION) {
         useStore.getState().addMessage(`[ERROR] Unsupported or invalid project schema format`);
         return false;
      }

      parsed = runMigrations(parsed);

      const validation = validateProjectSchema(parsed);
      if (!validation.valid) {
        const errorIssue = validation.issues.find(i => i.severity === 'ERROR');
        useStore.getState().addMessage(`[ERROR] Validation failed: ${errorIssue?.message}`);
        return false;
      }

      this.loadProjectToStore(parsed, false);
      useStore.getState().setFileName(fileName);
      useStore.getState().addMessage(`[INFO] Project loaded: ${fileName}`);
      return true;
    } catch (e: any) {
      useStore.getState().addMessage(`[ERROR] Failed to parse project file: ${e.message}`);
      return false;
    }
  }

  static getProjectData(): string | null {
    const state = useStore.getState();
    const proj: EPWProjectSchema = {
      format: FORMAT_NAME,
      schema_version: CURRENT_SCHEMA_VERSION,
      project: {
        name: state.projectName,
        description: state.projectMetadata.description,
        created_at: state.projectMetadata.created_at, // Preserved
        modified_at: new Date().toISOString() // Updated
      },
      canvas: state.canvasConfig,
      objects: state.objects,
      connections: state.connections || []
    };
    const validation = validateProjectSchema(proj);
    if (!validation.valid) {
       const errorIssue = validation.issues.find(i => i.severity === 'ERROR');
       useStore.getState().addMessage(`[ERROR] Save Aborted! Validation failed: ${errorIssue?.message}`);
       return null;
    }
    return JSON.stringify(proj, null, 2);
  }

  private static loadProjectToStore(project: EPWProjectSchema, isDirty: boolean) {
    useStore.setState({
      objects: project.objects,
      connections: project.connections || [],
      projectName: project.project.name,
      projectMetadata: {
        description: project.project.description || "",
        created_at: project.project.created_at || new Date().toISOString(),
        modified_at: project.project.modified_at || new Date().toISOString()
      },
      canvasConfig: {
        width: project.canvas.width || 1920,
        height: project.canvas.height || 1080,
        background: project.canvas.background || "#ffffff",
        gridSize: project.canvas.gridSize || 20
      },
      isDirty: isDirty,
      selectedIds: [],
      history: [{ objects: JSON.parse(JSON.stringify(project.objects)), connections: JSON.parse(JSON.stringify(project.connections || [])) }],
      historyIndex: 0
    });
  }
}
