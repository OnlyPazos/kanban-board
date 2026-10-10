/** Creación de tarjetas. Funciones puras: sin dependencias de UI ni de almacenamiento. */
import type { Card, CardStatus, CardType, Priority, Project } from './types';

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

/** Copia del proyecto con `updatedAt` actualizado (al crear/editar sus tarjetas). */
export function touchProject(project: Project, now: Date = new Date()): Project {
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
