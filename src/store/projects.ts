import {
  ProjectRecord,
  saveProjectToDB,
  getProjectFromDB,
  getAllProjectsFromDB,
  deleteProjectFromDB
} from '../lib/db';

export interface ProjectFile {
  path: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export interface ActiveProject {
  id?: string;
  name: string;
  files: ProjectFile[];
  sourceUrl?: string;
  sourceTitle?: string;
  sourceHost?: string;
}

export interface ProjectsState {
  savedProjects: ProjectRecord[];
  activeProject: ActiveProject | null;
  selectedFileIndex: number;
  isLoading: boolean;
}

class ProjectsStore {
  private state: ProjectsState = {
    savedProjects: [],
    activeProject: null,
    selectedFileIndex: 0,
    isLoading: false,
  };
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.refreshSavedProjects();
  }

  getSnapshot = (): ProjectsState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  async refreshSavedProjects() {
    this.state = { ...this.state, isLoading: true };
    this.notify();
    try {
      const items = await getAllProjectsFromDB();
      this.state = { ...this.state, savedProjects: items, isLoading: false };
    } catch {
      this.state = { ...this.state, isLoading: false };
    }
    this.notify();
  }

  setActiveProject(project: ActiveProject | null) {
    this.state = {
      ...this.state,
      activeProject: project,
      selectedFileIndex: 0,
    };
    this.notify();
  }

  updateProjectName(name: string) {
    if (!this.state.activeProject) return;
    this.state = {
      ...this.state,
      activeProject: { ...this.state.activeProject, name },
    };
    this.notify();
  }

  setSelectedFileIndex(index: number) {
    this.state = { ...this.state, selectedFileIndex: index };
    this.notify();
  }

  updateFile(index: number, newFile: Partial<ProjectFile>) {
    if (!this.state.activeProject) return;
    const files = [...this.state.activeProject.files];
    if (files[index]) {
      files[index] = { ...files[index], ...newFile };
      this.state = {
        ...this.state,
        activeProject: { ...this.state.activeProject, files },
      };
      this.notify();
    }
  }

  deleteFile(index: number) {
    if (!this.state.activeProject) return;
    const files = this.state.activeProject.files.filter((_, i) => i !== index);
    const newIdx = Math.max(0, Math.min(this.state.selectedFileIndex, files.length - 1));
    this.state = {
      ...this.state,
      activeProject: { ...this.state.activeProject, files },
      selectedFileIndex: newIdx,
    };
    this.notify();
  }

  addFile(file: ProjectFile) {
    if (!this.state.activeProject) return;
    const files = [...this.state.activeProject.files, file];
    this.state = {
      ...this.state,
      activeProject: { ...this.state.activeProject, files },
      selectedFileIndex: files.length - 1,
    };
    this.notify();
  }

  async saveActiveProject(): Promise<ProjectRecord | null> {
    if (!this.state.activeProject) return null;
    const id = this.state.activeProject.id || ('proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const now = Date.now();

    // Check if existing
    const existing = await getProjectFromDB(id);
    const versionNumber = (existing?.versions?.length || 0) + 1;
    const versions = existing?.versions || [];
    versions.push({
      version: versionNumber,
      savedAt: now,
      filesCount: this.state.activeProject.files.length,
    });

    const record: ProjectRecord = {
      id,
      name: this.state.activeProject.name || 'مشروع بدون اسم',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      sourceUrl: this.state.activeProject.sourceUrl,
      sourceTitle: this.state.activeProject.sourceTitle,
      files: this.state.activeProject.files,
      versions,
    };

    await saveProjectToDB(record);
    this.state = {
      ...this.state,
      activeProject: { ...this.state.activeProject, id },
    };
    await this.refreshSavedProjects();
    return record;
  }

  async loadProject(id: string): Promise<boolean> {
    const project = await getProjectFromDB(id);
    if (!project) return false;
    this.setActiveProject({
      id: project.id,
      name: project.name,
      files: project.files,
      sourceUrl: project.sourceUrl,
      sourceTitle: project.sourceTitle,
    });
    return true;
  }

  async deleteProject(id: string): Promise<void> {
    await deleteProjectFromDB(id);
    if (this.state.activeProject?.id === id) {
      this.setActiveProject(null);
    }
    await this.refreshSavedProjects();
  }
}

export const projectsStore = new ProjectsStore();
