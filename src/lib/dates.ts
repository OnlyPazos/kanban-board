/** Fecha corta de creación de una tarjeta, en hora local (AC-053, D-030): "9 oct 2026". */
const createdFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

/** "Creada el 9 oct 2026" a partir del `createdAt` ISO de la tarjeta. */
export function formatCreatedDate(iso: string): string {
  return `Creada el ${createdFormat.format(new Date(iso))}`;
}
