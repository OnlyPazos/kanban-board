/**
 * Estado en memoria de la app (runes), hidratado desde el repositorio al
 * arrancar. Cada mutación se persiste inmediatamente: no hay botón "Guardar".
 */
import { createProject, type NewProjectInput, type Project } from '../domain';
import type { Repository } from '../persistence/repository';

function byUpdatedDesc(a: Project, b: Project): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class AppStore {
  projects = $state<Project[]>([]);
  loaded = $state(false);

  readonly #repository: Repository;

  constructor(repository: Repository) {
    this.#repository = repository;
  }

  async hydrate(): Promise<void> {
    const stored = await this.#repository.listProjects();
    // Conserva lo creado en memoria mientras se cargaba.
    const storedIds = new Set(stored.map((p) => p.id));
    const pending = this.projects.filter((p) => !storedIds.has(p.id));
    this.projects = [...pending, ...stored].sort(byUpdatedDesc);
    this.loaded = true;
  }

  /** Crea el proyecto, lo guarda y, una vez guardado, lo muestra. */
  async createProject(input: NewProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.#repository.saveProject(project);
    this.projects = [project, ...this.projects];
    return project;
  }
}
