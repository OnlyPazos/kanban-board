/**
 * Formato de intercambio (export/import, D-008). Sin dependencias de UI.
 *
 * Contrato común a todos los items de intercambio:
 * `{ formatVersion, kind: 'full' | 'project', exportedAt, projects, cards }`.
 * Solo contiene datos de proyectos y tarjetas: ninguna preferencia del
 * dispositivo (filtros por tipo, modo de color) viaja en el export.
 */
import type { Card, Project } from './types';

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

/**
 * Lee el contenido de un archivo de export (AC-030). No escribe nada: toda la
 * validación ocurre antes de cualquier escritura.
 *
 * Validación mínima (WI-AC-030): JSON válido, `formatVersion` conocido,
 * `kind` válido y `projects`/`cards` como listas de objetos. La validación
 * completa con las reglas de dominio (nombres, títulos, enums, `projectId`
 * existente) se añade aquí en WI-AC-033, como más casos de `invalid-structure`.
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
  if (!isRecord(raw)) return { ok: false, reason: 'invalid-structure', detail: 'el archivo no es un objeto' };
  if (raw.formatVersion !== EXPORT_FORMAT_VERSION) return { ok: false, reason: 'unknown-version' };
  if (raw.kind !== 'full' && raw.kind !== 'project') {
    return { ok: false, reason: 'invalid-structure', detail: 'tipo de archivo desconocido' };
  }
  const { projects, cards } = raw;
  if (!Array.isArray(projects) || !projects.every(isRecord)) {
    return { ok: false, reason: 'invalid-structure', detail: 'lista de proyectos no válida' };
  }
  if (!Array.isArray(cards) || !cards.every(isRecord)) {
    return { ok: false, reason: 'invalid-structure', detail: 'lista de tarjetas no válida' };
  }
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
