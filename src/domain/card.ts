/** Creación de tarjetas. Funciones puras: sin dependencias de UI ni de almacenamiento. */
import type { Card, CardStatus, CardType, Priority, Project } from './types';
import { assertProjectEditable } from './project';

/** Longitud máxima del título de una tarjeta (AC-011). */
export const CARD_TITLE_MAX_LENGTH = 120;

/**
 * Valida el título de una tarjeta tras recortar los espacios exteriores (AC-011):
 * obligatorio y como máximo `CARD_TITLE_MAX_LENGTH` caracteres.
 * Devuelve el mensaje de error, o `null` si el título es válido.
 */
export function validateCardTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed === '') return 'El título es obligatorio.';
  if (trimmed.length > CARD_TITLE_MAX_LENGTH) {
    return `El título no puede superar ${CARD_TITLE_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/** Error lanzado al crear una tarjeta con un título no válido. */
export class InvalidCardTitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCardTitleError';
  }
}

function assertValidCardTitle(title: string): void {
  const error = validateCardTitle(title);
  if (error) throw new InvalidCardTitleError(error);
}

export interface NewCardInput {
  projectId: string;
  title: string;
  /** Columna desde la que se crea. */
  status: CardStatus;
}

/**
 * Construye una tarjeta nueva: tipo `novedad`, sin prioridad, sin descripción,
 * con el estado de la columna y el título recortado.
 * Lanza `InvalidCardTitleError` si el título no es válido.
 */
export function createCard(
  input: NewCardInput,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Card {
  assertValidCardTitle(input.title);
  const timestamp = now.toISOString();
  return {
    id,
    projectId: input.projectId,
    title: input.title.trim(),
    type: 'novedad',
    status: input.status,
    description: '',
    priority: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    archived: false,
  };
}

/**
 * Copia del proyecto con `updatedAt` actualizado (al crear/editar sus tarjetas).
 * Toda mutación de tarjetas pasa por aquí, así que es la guarda de solo
 * lectura: lanza `ArchivedProjectError` si el proyecto está archivado (AC-026).
 */
export function touchProject(project: Project, now: Date = new Date()): Project {
  assertProjectEditable(project);
  return { ...project, updatedAt: now.toISOString() };
}

/** Campos editables de una tarjeta (WI-AC-012). Las fechas no se editan. */
export interface CardEdit {
  title: string;
  type: CardType;
  status: CardStatus;
  description: string;
  priority: Priority;
}

/**
 * Aplica una edición: título recortado, `updatedAt` a `now`; `id`, `projectId`,
 * `createdAt` y `archived` se conservan. Lanza `InvalidCardTitleError` si el
 * título no es válido.
 */
export function editCard(card: Card, edit: CardEdit, now: Date = new Date()): Card {
  assertValidCardTitle(edit.title);
  return {
    ...card,
    title: edit.title.trim(),
    type: edit.type,
    status: edit.status,
    description: edit.description,
    priority: edit.priority,
    updatedAt: now.toISOString(),
  };
}

/**
 * Mueve la tarjeta a otra columna (AC-015): cambia solo `status` y
 * `updatedAt`. No guarda ninguna posición: el orden lo da `sortCards`.
 */
export function moveCard(card: Card, status: CardStatus, now: Date = new Date()): Card {
  return { ...card, status, updatedAt: now.toISOString() };
}

/**
 * Archiva la tarjeta (AC-021): solo pone `archived` a `true`. Conserva todos
 * sus campos (incluido `updatedAt`), para que al restaurarla vuelva igual.
 */
export function archiveCard(card: Card): Card {
  return { ...card, archived: true };
}

/**
 * Restaura una tarjeta archivada (AC-022): solo pone `archived` a `false` y
 * conserva el resto de campos, así que vuelve a la columna de su estado.
 */
export function restoreCard(card: Card): Card {
  return { ...card, archived: false };
}

/** Rango de cada prioridad en el orden automático (D-005): alta, media, baja y sin prioridad. */
const PRIORITY_RANK: Record<NonNullable<Priority> | 'none', number> = { alta: 0, media: 1, baja: 2, none: 3 };

function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority ?? 'none'];
}

/**
 * Orden automático de las tarjetas de una columna (AC-014): por prioridad
 * (alta, media, baja, sin prioridad) y, a igual prioridad, por `createdAt`
 * ascendente. Devuelve una copia; no modifica el array recibido ni guarda
 * ninguna posición manual.
 */
export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0),
  );
}

/** Recuento por estado de las tarjetas no archivadas de cada proyecto (AC-008). */
export type StatusCounts = Record<CardStatus, number>;

export function emptyStatusCounts(): StatusCounts {
  return { 'sin-empezar': 0, 'en-curso': 0, 'en-pausa': 0, finalizado: 0 };
}

export function countCardsByProject(cards: readonly Card[]): Map<string, StatusCounts> {
  const counts = new Map<string, StatusCounts>();
  for (const card of cards) {
    if (card.archived) continue;
    let projectCounts = counts.get(card.projectId);
    if (!projectCounts) {
      projectCounts = emptyStatusCounts();
      counts.set(card.projectId, projectCounts);
    }
    projectCounts[card.status] += 1;
  }
  return counts;
}
