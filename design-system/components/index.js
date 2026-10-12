/*
 * Punto de entrada de los componentes — design-system/components/index.js
 *
 *   import { Button, Dialog } from '<ruta>/design-system/components';
 *
 * Requiere tokens/tokens.css cargado una vez a nivel global en la app.
 */
export { default as Alert } from './alert/Alert.svelte';
export { default as Badge } from './badge/Badge.svelte';
export { default as Button } from './button/Button.svelte';
export { default as Card } from './card/Card.svelte';
export { default as Chip } from './chip/Chip.svelte';
export { default as Column } from './column/Column.svelte';
export { default as Dialog } from './dialog/Dialog.svelte';
export { default as DropPlaceholder } from './drop-placeholder/DropPlaceholder.svelte';
export { default as Field } from './field/Field.svelte';
export { default as Icon } from './icon/Icon.svelte';
export { CATEGORY_ICONS } from './icon/category-icons.js';
export { default as Input } from './input/Input.svelte';
export { default as Select } from './select/Select.svelte';
export { default as Textarea } from './textarea/Textarea.svelte';
