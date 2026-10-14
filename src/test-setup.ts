import '@testing-library/jest-dom/vitest';
// IndexedDB en memoria para jsdom.
import 'fake-indexeddb/auto';
// jsdom no implementa scrollIntoView; el Select del sistema de diseño lo usa al abrir y mover la lista (D-034).
Element.prototype.scrollIntoView ??= function () {};
