/** Creación, edición y validación de proyectos. Funciones puras: sin dependencias de UI ni de almacenamiento. */
import type { Project } from './types';

/** Longitud máxima del nombre de un proyecto (AC-004). */
export const PROJECT_NAME_MAX_LENGTH = 80;

/**
 * Valida el nombre de un proyecto tras recortar los espacios exteriores.
 * Devuelve el mensaje de error, o `null` si el nombre es válido.
 */
export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'El nombre es obligatorio.';
  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    return `El nombre no puede superar ${PROJECT_NAME_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/** Error lanzado al crear o editar un proyecto con un nombre no válido. */
export class InvalidProjectNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProjectNameError';
  }
}

function assertValidProjectName(name: string): void {
  const error = validateProjectName(name);
  if (error) throw new InvalidProjectNameError(error);
}

export interface NewProjectInput {
  name: string;
  description?: string;
}

/**
 * Construye un proyecto nuevo con nombre y descripción recortados.
 * Lanza `InvalidProjectNameError` si el nombre no es válido.
 */
export function createProject(
  input: NewProjectInput,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Project {
  assertValidProjectName(input.name);
  const timestamp = now.toISOString();
  return {
    id,
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    archived: false,
  };
}

export interface ProjectEdit {
  name: string;
  description: string;
}

/**
 * Devuelve una copia del proyecto con el nombre y la descripción editados
 * (recortados) y `updatedAt` actualizado. La identidad es el `id`, que no cambia.
 * Lanza `InvalidProjectNameError` si el nombre no es válido.
 */
export function editProject(project: Project, edit: ProjectEdit, now: Date = new Date()): Project {
  assertValidProjectName(edit.name);
  return {
    ...project,
    name: edit.name.trim(),
    description: edit.description.trim(),
    updatedAt: now.toISOString(),
  };
}
