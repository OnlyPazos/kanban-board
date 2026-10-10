/** Creación de tarjetas. Funciones puras: sin dependencias de UI ni de almacenamiento. */
import type { Card, CardStatus, Project } from './types';

/**
 * Validación mínima del título (WI-AC-010): obligatorio tras `trim`.
 * La validación completa (longitud máxima) llega en WI-AC-011.
 * Devuelve el mensaje de error, o `null` si el título es válido.
 */
export function validateNewCardTitle(title: string): string | null {
  return title.trim() === '' ? 'El título es obligatorio.' : null;
}

/** Error lanzado al crear una tarjeta con un título no válido. */
export class InvalidCardTitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCardTitleError';
  }
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
  const error = validateNewCardTitle(input.title);
  if (error) throw new InvalidCardTitleError(error);
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
