/** Descarga de archivos en el navegador (sin red): `Blob` + `<a download>`. */

/** Descarga `data` serializado como JSON con el nombre `fileName`. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Se libera después, para no cortar la descarga que acaba de empezar.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
