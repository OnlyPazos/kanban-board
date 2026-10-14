/**
 * Utilidad de tests (D-034): el `Select` del sistema de diseño ya no es un
 * `<select>` nativo, sino un combobox (`role="combobox"`) que abre una lista
 * (`role="listbox"`). En jsdom no hay Popover API, así que la lista se queda
 * en el DOM, junto al control.
 */
import { fireEvent, within } from '@testing-library/svelte';

/** Combobox con ese nombre accesible dentro de `container`. */
export function getCombobox(name: string | RegExp, container: HTMLElement = document.body) {
  return within(container).getByRole('combobox', { name });
}

/** Abre el combobox y devuelve los textos de sus opciones, en orden; después lo cierra. */
export async function optionLabels(name: string | RegExp, container: HTMLElement = document.body) {
  const combobox = getCombobox(name, container);
  await fireEvent.click(combobox);
  const listbox = within(container).getByRole('listbox', { name });
  const labels = within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent?.trim());
  await fireEvent.click(combobox);
  return labels;
}

/** Abre el combobox `name` y pulsa la opción con el texto `option`. */
export async function chooseOption(name: string | RegExp, option: string, container: HTMLElement = document.body) {
  await fireEvent.click(getCombobox(name, container));
  const listbox = within(container).getByRole('listbox', { name });
  await fireEvent.click(within(listbox).getByRole('option', { name: option }));
}
