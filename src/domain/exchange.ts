/**
 * Formato de intercambio (export/import, D-008). Sin dependencias de UI.
 *
 * Contrato común a todos los items de intercambio:
 * `{ formatVersion, kind: 'full' | 'project', exportedAt, projects, cards }`.
 * Solo contiene datos de proyectos y tarjetas: ninguna preferencia del
 * dispositivo (filtros por tipo, modo de color) viaja en el export.
 */
import type { Card, Project } from './types';
import { PROJECT_NAME_MAX_LENGTH, validateProjectName } from './project';
import { CARD_TITLE_MAX_LENGTH, validateCardTitle } from './card';
import { CARD_STATUSES, CARD_TYPES, PRIORITIES } from './labels';

/** Versión actual del formato de los archivos exportados. */
export const EXPORT_FORMAT_VERSION = 1;

export type ExportKind = 'full' | 'project';

export interface ExportFile {
  formatVersion: typeof EXPORT_FORMAT_VERSION;
  kind: ExportKind;
  /** ISO 8601 */
  exportedAt: string;
  projects: Project[];
  cards: Card[];
}

/** Qué exportar: todo, o un único proyecto (por `id`) con sus tarjetas. */
export type ExportScope = { kind: 'full' } | { kind: 'project'; projectId: string };

/** Datos de los que se construye el export (p. ej. el estado en memoria del store). */
export interface ExportSource {
  readonly projects: readonly Project[];
  readonly cards: readonly Card[];
}

const copyProject = (p: Project): Project => ({
  id: p.id,
  name: p.name,
  description: p.description,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  archived: p.archived,
});

const copyCard = (c: Card): Card => ({
  id: c.id,
  projectId: c.projectId,
  title: c.title,
  type: c.type,
  status: c.status,
  description: c.description,
  priority: c.priority,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  archived: c.archived,
});

/**
 * Construye el contenido de un archivo de export (AC-028, AC-029). Ambos
 * tipos incluyen lo archivado (proyectos y tarjetas). `kind: 'project'` lleva
 * exactamente ese proyecto y solo sus tarjetas.
 */
export function buildExport(source: ExportSource, scope: ExportScope, now: Date = new Date()): ExportFile {
  let projects: readonly Project[];
  let cards: readonly Card[];
  if (scope.kind === 'full') {
    projects = source.projects;
    cards = source.cards;
  } else {
    const project = source.projects.find((p) => p.id === scope.projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${scope.projectId}`);
    projects = [project];
    cards = source.cards.filter((c) => c.projectId === project.id);
  }
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    kind: scope.kind,
    exportedAt: now.toISOString(),
    projects: projects.map(copyProject),
    cards: cards.map(copyCard),
  };
}

/** Fecha local `AAAA-MM-DD` para el nombre del archivo. */
function fileDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Nombre del proyecto apto para un nombre de archivo: sin caracteres reservados ni espacios. */
function fileSafeName(name: string): string {
  const safe = name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return safe || 'proyecto';
}

/** `kanban-export-<fecha>.json` (completo) o `kanban-<nombre-proyecto>-<fecha>.json` (proyecto). */
export function exportFileName(now: Date = new Date(), projectName?: string): string {
  const date = fileDate(now);
  return projectName === undefined
    ? `kanban-export-${date}.json`
    : `kanban-${fileSafeName(projectName)}-${date}.json`;
}

/** Sufijo del nombre de un proyecto importado como copia (AC-032). */
export const COPY_SUFFIX = ' (copia)';

/**
 * "Importar como copia" (AC-032): el proyecto y todas sus tarjetas con ids
 * nuevos (las tarjetas apuntan al nuevo `projectId`) y el nombre
 * `<original> (copia)`. El resto de campos se conserva tal cual.
 * El recorte del nombre a 80 caracteres va en WI-AC-040.
 */
export function copyImportedProject(
  project: Project,
  cards: readonly Card[],
  newId: () => string = () => crypto.randomUUID(),
): { project: Project; cards: Card[] } {
  const copy: Project = { ...copyProject(project), id: newId(), name: `${project.name}${COPY_SUFFIX}` };
  return {
    project: copy,
    cards: cards.map((c) => ({ ...copyCard(c), id: newId(), projectId: copy.id })),
  };
}

/** Motivo por el que un archivo no se puede importar (los mensajes en español van en la UI). */
export type ImportFailureReason = 'invalid-json' | 'unknown-version' | 'invalid-structure';

export type ImportParseResult =
  | { ok: true; data: ExportFile }
  | { ok: false; reason: ImportFailureReason; detail?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value !== '';

/** Fecha ISO 8601 interpretable. */
const isDate = (value: unknown): value is string => isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/**
 * Comprueba los campos comunes (id, fechas, `archived`) y la descripción.
 * Devuelve el detalle del primer fallo, o `null` si son válidos.
 */
function commonFieldsError(item: Record<string, unknown>, label: string): string | null {
  if (!isNonEmptyString(item.id)) return `${label} sin identificador`;
  if (typeof item.description !== 'string') return `${label} con una descripción no válida`;
  if (!isDate(item.createdAt)) return `${label} con una fecha de creación no válida`;
  if (!isDate(item.updatedAt)) return `${label} con una fecha de modificación no válida`;
  if (typeof item.archived !== 'boolean') return `${label} con un estado de archivado no válido`;
  return null;
}

/** Detalle del primer fallo de un proyecto, o `null` si es válido. */
function projectError(project: Record<string, unknown>, index: number): string | null {
  const label = `el proyecto ${index + 1}`;
  if (typeof project.name !== 'string') return `${label} no tiene nombre`;
  const nameError = validateProjectName(project.name);
  if (nameError) {
    return project.name.trim() === '' ? `${label} no tiene nombre` : `${label} tiene un nombre de más de ${PROJECT_NAME_MAX_LENGTH} caracteres`;
  }
  return commonFieldsError(project, label);
}

/** Detalle del primer fallo de una tarjeta, o `null` si es válida. */
function cardError(card: Record<string, unknown>, index: number, projectIds: ReadonlySet<string>): string | null {
  const label = `la tarjeta ${index + 1}`;
  if (typeof card.title !== 'string') return `${label} no tiene título`;
  const titleError = validateCardTitle(card.title);
  if (titleError) {
    return card.title.trim() === '' ? `${label} no tiene título` : `${label} tiene un título de más de ${CARD_TITLE_MAX_LENGTH} caracteres`;
  }
  if (!isOneOf(CARD_TYPES, card.type)) return `${label} tiene un tipo inexistente`;
  if (!isOneOf(CARD_STATUSES, card.status)) return `${label} tiene un estado inexistente`;
  if (card.priority !== null && !isOneOf(PRIORITIES, card.priority)) return `${label} tiene una prioridad inexistente`;
  if (!isNonEmptyString(card.projectId) || !projectIds.has(card.projectId)) {
    return `${label} pertenece a un proyecto que no está en el archivo`;
  }
  return commonFieldsError(card, label);
}

/** `true` si algún `id` se repite. */
const hasDuplicateIds = (items: readonly Record<string, unknown>[]): boolean =>
  new Set(items.map((item) => item.id)).size !== items.length;

/**
 * Lee y valida el contenido de un archivo de export (AC-030, AC-033). Es
 * pura y no escribe nada: toda la validación ocurre antes de cualquier
 * escritura, y un fallo devuelve el motivo (`invalid-json`,
 * `unknown-version` o `invalid-structure` con un detalle en español).
 *
 * La estructura se valida con las mismas reglas de dominio que la app:
 * `validateProjectName`, `validateCardTitle`, tipos, estados y prioridades
 * existentes, y cada `card.projectId` presente en `projects`. Un export de
 * proyecto (`kind: 'project'`) lleva exactamente un proyecto.
 *
 * Devuelve copias con solo los campos del modelo, con ids, fechas y flags
 * tal cual vienen en el archivo.
 */
export function parseImport(text: string): ImportParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  const invalid = (detail: string): ImportParseResult => ({ ok: false, reason: 'invalid-structure', detail });
  if (!isRecord(raw)) return invalid('el archivo no es un objeto');
  if (raw.formatVersion !== EXPORT_FORMAT_VERSION) return { ok: false, reason: 'unknown-version' };
  if (raw.kind !== 'full' && raw.kind !== 'project') return invalid('tipo de archivo desconocido');
  const { projects, cards } = raw;
  if (!Array.isArray(projects) || !projects.every(isRecord)) return invalid('lista de proyectos no válida');
  if (!Array.isArray(cards) || !cards.every(isRecord)) return invalid('lista de tarjetas no válida');
  if (raw.kind === 'project' && projects.length !== 1) {
    return invalid('un export de proyecto debe contener exactamente un proyecto');
  }

  for (const [i, project] of projects.entries()) {
    const error = projectError(project, i);
    if (error) return invalid(error);
  }
  if (hasDuplicateIds(projects)) return invalid('hay proyectos con el mismo identificador');

  const projectIds = new Set(projects.map((p) => p.id as string));
  for (const [i, card] of cards.entries()) {
    const error = cardError(card, i, projectIds);
    if (error) return invalid(error);
  }
  if (hasDuplicateIds(cards)) return invalid('hay tarjetas con el mismo identificador');

  return {
    ok: true,
    data: {
      formatVersion: EXPORT_FORMAT_VERSION,
      kind: raw.kind,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      projects: (projects as unknown as Project[]).map(copyProject),
      cards: (cards as unknown as Card[]).map(copyCard),
    },
  };
}

/** Mensaje en español para el usuario según el motivo del fallo (AC-033). */
export function importFailureMessage(reason: ImportFailureReason, detail?: string): string {
  switch (reason) {
    case 'invalid-json':
      return 'El archivo no es un JSON válido.';
    case 'unknown-version':
      return 'El archivo tiene una versión de formato desconocida.';
    case 'invalid-structure':
      return detail ? `La estructura del archivo no es válida: ${detail}.` : 'La estructura del archivo no es válida.';
  }
}
