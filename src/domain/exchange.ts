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
