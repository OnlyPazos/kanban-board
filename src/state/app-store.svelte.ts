/**
 * Estado en memoria de la app (runes), hidratado desde el repositorio al
 * arrancar. Cada mutación se persiste inmediatamente: no hay botón "Guardar".
 */
import {
  archiveCard,
  archiveProject,
  restoreProject,
  restoreCard,
  createCard,
  createProject,
  editCard,
  editProject,
  moveCard,
  sortProjects,
  touchProject,
  type Card,
  type CardType,
  type CardEdit,
  type CardStatus,
  type NewProjectInput,
  type Project,
  type ProjectEdit,
} from '../domain';
import { observeWrites, type Repository } from '../persistence/repository';
import type { SyncChange } from '../persistence/sync';

/**
 * La lista `projects` se mantiene siempre ordenada por `updatedAt`
 * descendente (AC-007): tras crear o editar un proyecto y tras crear o
 * editar cualquiera de sus tarjetas, sin esperar a recargar.
 */
export class AppStore {
  projects = $state<Project[]>([]);
  cards = $state<Card[]>([]);
  loaded = $state(false);
  /** Filtro por tipo de cada proyecto, por `projectId` (AC-019). Sin entrada → sin filtro. */
  typeFilters = $state<Record<string, CardType[]>>({});

  /** Proyectos de la lista activa (AC-024): los no archivados, en el orden de `projects`. */
  activeProjects = $derived(this.projects.filter((p) => !p.archived));
  /** Proyectos de la vista global de archivados (AC-024), en el orden de `projects`. */
  archivedProjects = $derived(this.projects.filter((p) => p.archived));

  /**
   * Último fallo de escritura del almacenamiento (AC-035), o `null` si no lo
   * hay. Se activa con cualquier escritura fallida (cuota excedida,
   * transacción abortada…) y se limpia con la siguiente escritura confirmada.
   */
  saveError = $state<{ error: unknown } | null>(null);

  readonly #repository: Repository;
  /** Cola de cambios de otras pestañas: se aplican de uno en uno y en orden. */
  #remoteQueue: Promise<void> = Promise.resolve();

  constructor(repository: Repository) {
    this.#repository = observeWrites(repository, {
      onWriteError: (error) => {
        this.saveError = { error };
      },
      onWriteSuccess: () => {
        this.saveError = null;
      },
    });
  }

  async hydrate(): Promise<void> {
    const [stored, storedCards, storedFilters] = await Promise.all([
      this.#repository.listProjects(),
      this.#repository.listCards(),
      this.#repository.listTypeFilters(),
    ]);
    // Lo elegido en memoria mientras se cargaba manda sobre lo guardado.
    this.typeFilters = { ...storedFilters, ...this.typeFilters };
    // Conserva lo creado en memoria mientras se cargaba.
    const storedIds = new Set(stored.map((p) => p.id));
    const pending = this.projects.filter((p) => !storedIds.has(p.id));
    this.projects = sortProjects([...pending, ...stored]);
    const storedCardIds = new Set(storedCards.map((c) => c.id));
    const pendingCards = this.cards.filter((c) => !storedCardIds.has(c.id));
    this.cards = [...storedCards, ...pendingCards];
    this.loaded = true;
  }

  /**
   * Aplica un cambio guardado por otra pestaña (AC-038): relee de IndexedDB
   * la entidad indicada y la pone en memoria tal cual (último cambio gana; no
   * se fusionan campos). Si ya no existe, la quita. No escribe nada. Los
   * cambios se aplican en el orden en que llegan.
   */
  applyRemoteChange(change: SyncChange): Promise<void> {
    const next = this.#remoteQueue.then(() => this.#applyRemoteChange(change));
    this.#remoteQueue = next.catch((error: unknown) => {
      console.error('No se pudo aplicar un cambio de otra pestaña', error);
    });
    return next;
  }

  async #applyRemoteChange(change: SyncChange): Promise<void> {
    switch (change.entity) {
      case 'project': {
        const project = await this.#repository.getProject(change.id);
        if (project) {
          this.projects = sortProjects([...this.projects.filter((p) => p.id !== change.id), project]);
        } else {
          // Borrado definitivo (AC-027): con él se fueron sus tarjetas y su filtro.
          this.projects = this.projects.filter((p) => p.id !== change.id);
          this.cards = this.cards.filter((c) => c.projectId !== change.id);
          if (change.id in this.typeFilters) {
            const filters = { ...this.typeFilters };
            delete filters[change.id];
            this.typeFilters = filters;
          }
        }
        return;
      }
      case 'card': {
        const card = await this.#repository.getCard(change.id);
        if (!card) {
          this.cards = this.cards.filter((c) => c.id !== change.id);
        } else if (this.cards.some((c) => c.id === change.id)) {
          this.cards = this.cards.map((c) => (c.id === change.id ? card : c));
        } else {
          this.cards = [...this.cards, card];
        }
        return;
      }
      case 'projectCards': {
        const cards = await this.#repository.listProjectCards(change.id);
        this.cards = [...this.cards.filter((c) => c.projectId !== change.id), ...cards];
        return;
      }
      case 'typeFilter': {
        const types = await this.#repository.getTypeFilter(change.id);
        const filters = { ...this.typeFilters };
        if (types) filters[change.id] = types;
        else delete filters[change.id];
        this.typeFilters = filters;
        return;
      }
      case 'all': {
        const [projects, cards] = await Promise.all([this.#repository.listProjects(), this.#repository.listCards()]);
        this.projects = sortProjects(projects);
        this.cards = cards;
        return;
      }
    }
  }

  /** Crea el proyecto, lo guarda y, una vez guardado, lo muestra. */
  async createProject(input: NewProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.#repository.saveProject(project);
    this.projects = sortProjects([project, ...this.projects]);
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
    this.projects = sortProjects(this.projects.map((p) => (p.id === id ? updated : p)));
    return updated;
  }

  /**
   * Archiva el proyecto con ese `id` (AC-024): solo pone su `archived` a
   * `true` y lo guarda. Sus tarjetas no se tocan (conservan su propio flag
   * `archived`), así que al restaurarlo vuelve todo exactamente igual.
   */
  async archiveProject(id: string): Promise<Project> {
    return this.#saveProjectChange(id, archiveProject);
  }

  /** Restaura el proyecto archivado con ese `id` (AC-025): vuelve a la lista activa. */
  async restoreProject(id: string): Promise<Project> {
    return this.#saveProjectChange(id, restoreProject);
  }

  /**
   * Borra definitivamente el proyecto con ese `id` y todas sus tarjetas
   * (AC-027), en una única transacción. Solo se permite con proyectos
   * archivados. Una vez borrado, lo quita de memoria.
   */
  async deleteProject(id: string): Promise<void> {
    const current = this.projects.find((p) => p.id === id);
    if (!current) throw new Error(`Proyecto no encontrado: ${id}`);
    if (!current.archived) throw new Error(`Solo se pueden borrar proyectos archivados: ${id}`);
    await this.#repository.deleteProject(id);
    this.projects = this.projects.filter((p) => p.id !== id);
    this.cards = this.cards.filter((c) => c.projectId !== id);
    const filters = { ...this.typeFilters };
    delete filters[id];
    this.typeFilters = filters;
  }

  /**
   * Import completo (AC-030): sustituye todos los proyectos y tarjetas por
   * los dados, conservando ids, fechas y flags tal cual (incluidos los
   * proyectos archivados: no pasa por las guardas de edición). Se escribe en
   * una única transacción y, solo una vez guardado, se muestra.
   */
  async replaceAll(projects: readonly Project[], cards: readonly Card[]): Promise<void> {
    await this.#repository.replaceAll(projects, cards);
    this.projects = sortProjects([...projects]);
    this.cards = [...cards];
  }

  /**
   * Import de proyecto (AC-031, AC-032): añade el proyecto con sus tarjetas
   * o, si ya existe uno con el mismo `id`, lo sustituye junto con todas sus
   * tarjetas ("Reemplazar"). Conserva ids, fechas y flags tal cual (también
   * si el proyecto existente o el importado están archivados: no pasa por las
   * guardas de edición). El resto de proyectos no cambia. Se escribe en una
   * única transacción y, solo una vez guardado, se muestra.
   */
  async importProject(project: Project, cards: readonly Card[]): Promise<void> {
    await this.#repository.importProject(project, cards);
    this.projects = sortProjects([...this.projects.filter((p) => p.id !== project.id), project]);
    this.cards = [...this.cards.filter((c) => c.projectId !== project.id), ...cards];
  }

  /** Aplica `change` al proyecto, lo guarda y lo muestra una vez guardado. */
  async #saveProjectChange(id: string, change: (project: Project) => Project): Promise<Project> {
    const current = this.projects.find((p) => p.id === id);
    if (!current) throw new Error(`Proyecto no encontrado: ${id}`);
    const changed = change(current);
    await this.#repository.saveProject(changed);
    this.projects = sortProjects(this.projects.map((p) => (p.id === id ? changed : p)));
    return changed;
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
    this.projects = sortProjects(this.projects.map((p) => (p.id === projectId ? touched : p)));
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
    this.projects = sortProjects(this.projects.map((p) => (p.id === project.id ? touched : p)));
    return updated;
  }
  /**
   * Mueve la tarjeta con ese `id` a la columna `status` (arrastrar y soltar,
   * AC-015/AC-017): la guarda junto con el `updatedAt` del proyecto y, una vez
   * guardada, la muestra en su nueva columna. Si el estado no cambia (soltar
   * en la misma columna, AC-016) no hay nada que guardar.
   */
  async moveCard(id: string, status: CardStatus): Promise<Card> {
    const current = this.cards.find((c) => c.id === id);
    if (!current) throw new Error(`Tarjeta no encontrada: ${id}`);
    if (current.status === status) return current;
    const project = this.projects.find((p) => p.id === current.projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${current.projectId}`);
    const now = new Date();
    const moved = moveCard(current, status, now);
    const touched = touchProject(project, now);
    await this.#repository.saveCard(moved, touched);
    this.cards = this.cards.map((c) => (c.id === id ? moved : c));
    this.projects = sortProjects(this.projects.map((p) => (p.id === project.id ? touched : p)));
    return moved;
  }

  /**
   * Archiva la tarjeta con ese `id` (AC-021, sin confirmación): pone
   * `archived` a `true` y la guarda junto con el `updatedAt` del proyecto.
   * Una vez guardada desaparece del tablero y de los recuentos.
   */
  async archiveCard(id: string): Promise<Card> {
    return this.#saveCardChange(id, archiveCard);
  }

  /**
   * Restaura la tarjeta archivada con ese `id` (AC-022): pone `archived` a
   * `false` conservando el resto de campos, así que vuelve a su columna.
   */
  async restoreCard(id: string): Promise<Card> {
    return this.#saveCardChange(id, restoreCard);
  }

  /**
   * Borra definitivamente la tarjeta con ese `id` (AC-023): solo se permite
   * con tarjetas archivadas. Elimina el registro de IndexedDB junto con el
   * `updatedAt` del proyecto y, una vez borrada, la quita de memoria.
   */
  async deleteCard(id: string): Promise<void> {
    const current = this.cards.find((c) => c.id === id);
    if (!current) throw new Error(`Tarjeta no encontrada: ${id}`);
    if (!current.archived) throw new Error(`Solo se pueden borrar tarjetas archivadas: ${id}`);
    const project = this.projects.find((p) => p.id === current.projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${current.projectId}`);
    const touched = touchProject(project);
    await this.#repository.deleteCard(id, touched);
    this.cards = this.cards.filter((c) => c.id !== id);
    this.projects = sortProjects(this.projects.map((p) => (p.id === project.id ? touched : p)));
  }

  /** Aplica `change` a la tarjeta, la guarda con el proyecto tocado y la muestra una vez guardada. */
  async #saveCardChange(id: string, change: (card: Card) => Card): Promise<Card> {
    const current = this.cards.find((c) => c.id === id);
    if (!current) throw new Error(`Tarjeta no encontrada: ${id}`);
    const project = this.projects.find((p) => p.id === current.projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${current.projectId}`);
    const changed = change(current);
    const touched = touchProject(project);
    await this.#repository.saveCard(changed, touched);
    this.cards = this.cards.map((c) => (c.id === id ? changed : c));
    this.projects = sortProjects(this.projects.map((p) => (p.id === project.id ? touched : p)));
    return changed;
  }

  /** Tipos seleccionados en el filtro del proyecto; `[]` → sin filtro (D-012). */
  typeFilterOf(projectId: string): CardType[] {
    return this.typeFilters[projectId] ?? [];
  }

  /**
   * Cambia el filtro por tipo del proyecto y lo persiste (store `prefs`,
   * clave `filter:<projectId>`). Es una preferencia de vista: se aplica al
   * momento y se guarda a continuación.
   */
  async setTypeFilter(projectId: string, types: CardType[]): Promise<void> {
    const selection = [...types];
    this.typeFilters = { ...this.typeFilters, [projectId]: selection };
    await this.#repository.saveTypeFilter(projectId, selection);
  }
}
