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

export interface ProjectEdit {
  name: string;
  description: string;
}

/**
 * Devuelve una copia del proyecto con el nombre y la descripción editados
 * (recortados) y `updatedAt` actualizado. La identidad es el `id`, que no cambia.
 */
export function editProject(project: Project, edit: ProjectEdit, now: Date = new Date()): Project {
  return {
    ...project,
    name: edit.name.trim(),
    description: edit.description.trim(),
    updatedAt: now.toISOString(),
  };
}
