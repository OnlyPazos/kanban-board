import { expect, type Locator, type Page } from '@playwright/test';

/**
 * `Select` del sistema de diseño (D-034): un combobox que abre su propia
 * lista (`listbox`). Ya no es un `<select>` nativo, así que no vale
 * `selectOption`: se pulsa el combobox y después la opción.
 */
export const combobox = (scope: Page | Locator, name: string) => scope.getByRole('combobox', { name, exact: true });

export const listbox = (scope: Page | Locator, name: string) => scope.getByRole('listbox', { name, exact: true });

/** Abre el combobox `name` dentro de `scope` y elige la opción con el texto `option`. */
export async function chooseOption(scope: Page | Locator, name: string, option: string) {
  await combobox(scope, name).click();
  const list = listbox(scope, name);
  await list.getByRole('option', { name: option, exact: true }).click();
  await expect(list).toBeHidden();
  await expect(combobox(scope, name)).toHaveText(option);
}
