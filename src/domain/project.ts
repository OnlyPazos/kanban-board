/** Creación de proyectos. Función pura: sin dependencias de UI ni de almacenamiento. */
import type { Project } from './types';

export interface NewProjectInput {
  name: string;
  description?: string;
}

/**
 * Construye un proyecto nuevo con nombre y descripción recortados.
 * La validación completa del nombre llega en WI-AC-003.
 */
export function createProject(
  input: NewProjectInput,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Project {
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
