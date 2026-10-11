/** Utilidades de texto puras: sin dependencias de UI ni de almacenamiento. */

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Recorte por longitud (D-020, AC-046): devuelve el prefijo más largo de
 * `text` formado por grafemas completos cuya `length` (unidades UTF-16) es
 * como máximo `maxUnits`. Nunca parte un grafema, un par surrogate ni una
 * secuencia ZWJ: un grafema que no cabe se descarta entero, así que el
 * resultado puede quedar por debajo de `maxUnits` (o vacío).
 */
export function truncateToGraphemes(text: string, maxUnits: number): string {
  if (text.length <= maxUnits) return text;
  let end = 0;
  for (const { index, segment } of graphemes.segment(text)) {
    const next = index + segment.length;
    if (next > maxUnits) break;
    end = next;
  }
  return text.slice(0, end);
}
