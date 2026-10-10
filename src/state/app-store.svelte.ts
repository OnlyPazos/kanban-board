/**
 * Estado en memoria de la app (runes), hidratado desde el repositorio al
 * arrancar. Cada mutación se persiste inmediatamente: no hay botón "Guardar".
 */
import {
  createCard,
  createProject,
  editCard,
  editProject,
  touchProject,
  type Card,
  type CardEdit,
  type CardStatus,
  type NewProjectInput,
  type Project,
  type ProjectEdit,
} from '../domain';
import type { Repository } from '../persistence/repository';

function byUpdatedDesc(a: Project, b: Project): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class AppStore {
  projects = $state<Project[]>([]);
  cards = $state<Card[]>([]);
  loaded = $state(false);

  readonly #repository: Repository;

  constructor(repository: Repository) {
    this.#repository = repository;
  }

  async hydrate(): Promise<void> {
    const [stored, storedCards] = await Promise.all([
      this.#repository.listProjects(),
      this.#repository.listCards(),
    ]);
    // Conserva lo creado en memoria mientras se cargaba.
    const storedIds = new Set(stored.map((p) => p.id));
    const pending = this.projects.filter((p) => !storedIds.has(p.id));
    this.projects = [...pending, ...stored].sort(byUpdatedDesc);
    const storedCardIds = new Set(storedCards.map((c) => c.id));
    const pendingCards = this.cards.filter((c) => !storedCardIds.has(c.id));
    this.cards = [...storedCards, ...pendingCards];
    this.loaded = true;
  }

  /** Crea el proyecto, lo guarda y, una vez guardado, lo muestra. */
  async createProject(input: NewProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.#repository.saveProject(project);
    this.projects = [project, ...this.projects];
    return project;
  }

  /**
   * Edita nombre y descripción del proyecto con ese `id` (nunca por nombre),
   * lo guarda y, una vez guardado, muestra los nuevos valores.
   */
  async updateProject(id: string, edit: ProjectEdit): Promise<Project> {
    const current = this.projects.find((p) => p.id === id);
    if (!current) throw new Error(`Proyecto no encontrado: ${id}`);
    const updated = editProject(current, edit);
    await this.#repository.saveProject(updated);
    this.projects = this.projects.map((p) => (p.id === id ? updated : p));
    return updated;
  }

  /**
   * Crea una tarjeta en la columna `status` del proyecto `projectId` (tipo
   * novedad, sin prioridad), la guarda junto con el `updatedAt` del proyecto
   * y, una vez guardada, la muestra.
   */
  async createCard(projectId: string, title: string, status: CardStatus): Promise<Card> {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);
    const now = new Date();
    const card = createCard({ projectId, title, status }, now);
    const touched = touchProject(project, now);
    await this.#repository.saveCard(card, touched);
    this.cards = [...this.cards, card];
    this.projects = this.projects.map((p) => (p.id === projectId ? touched : p)).sort(byUpdatedDesc);
    return card;
  }

  /**
   * Edita la tarjeta con ese `id`: la guarda junto con el `updatedAt` del
   * proyecto y, una vez guardada, muestra los nuevos valores (si cambia el
   * estado, el tablero la coloca en su nueva columna). `createdAt` no cambia.
   */
  async updateCard(id: string, edit: CardEdit): Promise<Card> {
    const current = this.cards.find((c) => c.id === id);
    if (!current) throw new Error(`Tarjeta no encontrada: ${id}`);
    const project = this.projects.find((p) => p.id === current.projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${current.projectId}`);
    const now = new Date();
    const updated = editCard(current, edit, now);
    const touched = touchProject(project, now);
    await this.#repository.saveCard(updated, touched);
    this.cards = this.cards.map((c) => (c.id === id ? updated : c));
    this.projects = this.projects.map((p) => (p.id === project.id ? touched : p)).sort(byUpdatedDesc);
    return updated;
  }
}
