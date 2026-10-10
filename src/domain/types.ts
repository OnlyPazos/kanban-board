/** Modelo de datos del dominio. Sin dependencias de UI. */

export type CardType = 'novedad' | 'mejora' | 'arreglo' | 'tecnico';
export type CardStatus = 'sin-empezar' | 'en-curso' | 'en-pausa' | 'finalizado';
export type Priority = 'alta' | 'media' | 'baja' | null;

export interface Project {
  /** crypto.randomUUID() */
  id: string;
  /** 1–80 caracteres tras trim */
  name: string;
  /** '' si no hay */
  description: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601; se actualiza también al crear/editar/mover/archivar sus tarjetas */
  updatedAt: string;
  archived: boolean;
}

export interface Card {
  id: string;
  projectId: string;
  /** 1–120 caracteres tras trim */
  title: string;
  /** por defecto 'novedad' */
  type: CardType;
  status: CardStatus;
  /** '' si no hay, multilínea */
  description: string;
  /** por defecto null */
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
