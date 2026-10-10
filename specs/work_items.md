# Work Items

Generado por `planner` a partir de `specs/project_specs.md` (AC-001 … AC-043, D-001 … D-017).
Orden: por dependencias (los que no dependen de nada, primero). Cada Work Item se nombra por el primer Acceptance Check que cubre.
Ampliación del 2026-10-10: WI-AC-040, WI-AC-041, WI-AC-042 y WI-AC-043 añadidos al final. Notas de WI-AC-001, WI-AC-012, WI-AC-018, WI-AC-031 y WI-AC-034 alineadas con D-014, D-015 y D-016 (todos seguían en `pendiente`).

Sistema de diseño (D-015, D-016; aplica a todos los items con UI):
- La UI se construye con los componentes de `design-system` (`Button`, `Input`, `Textarea`, `Select`, `Field`, `Dialog`, `Card`, `Badge`, `Chip`, `Alert`). Los estilos propios de la app solo usan variables `--ds-*`.
- Confirmaciones en `Dialog size="sm"`, acciones destructivas con `Button variant="danger"` y avisos (error de guardado, sin IndexedDB) con `Alert`.
- Correspondencia de dominio a tono, definida una sola vez en el módulo `domain`:
  ```ts
  const CARD_TYPE_TONE = { novedad: 'feature', mejora: 'improvement', arreglo: 'bugfix', tecnico: 'technical' } as const;
  const PRIORITY_TONE = { alta: 'danger', media: 'warning', baja: 'neutral' } as const; // null → sin Badge
  ```

Modelo de datos común (referencia para todos los items, definido en WI-AC-001 / WI-AC-002):

```ts
type CardType = 'novedad' | 'mejora' | 'arreglo' | 'tecnico';
type CardStatus = 'sin-empezar' | 'en-curso' | 'en-pausa' | 'finalizado';
type Priority = 'alta' | 'media' | 'baja' | null;

interface Project {
  id: string;            // crypto.randomUUID()
  name: string;          // 1–80 caracteres tras trim
  description: string;   // '' si no hay
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601; se actualiza también al crear/editar/mover/archivar sus tarjetas
  archived: boolean;
}

interface Card {
  id: string;
  projectId: string;
  title: string;         // 1–120 caracteres tras trim
  type: CardType;        // por defecto 'novedad'
  status: CardStatus;
  description: string;   // '' si no hay, multilínea
  priority: Priority;    // por defecto null
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
```

---

## WI-AC-001
- Contexto: proyectos
- Acceptance Checks: AC-001
- Depende de: []
- Rama sugerida: feature/wi-ac-001-scaffold-empty-state
- Estado: integrado
- Notas de implementación:
  - Andamiaje del proyecto según "Reglas base de stack": Vite + Svelte 5 (runes, SPA, sin SvelteKit) + TypeScript `strict`, Vitest + `@testing-library/svelte`, Playwright. Scripts npm para `dev`, `build`, `test` (unit) y `test:e2e`.
  - Tipos de dominio del bloque "Modelo de datos común" en un módulo `domain` sin dependencias de UI, con las etiquetas en español de tipos, estados y prioridades.
  - Pantalla inicial (lista de proyectos) con estado vacío: botón "Crear proyecto" y opción "Importar". En este item ambos pueden estar sin funcionalidad; se conectan en WI-AC-002 y WI-AC-034.
  - Integración del sistema de diseño (D-015): `design-system` como dependencia local de la app (`"design-system": "file:./design-system"`), junto con `@fontsource-variable/inter` y `@fontsource/jetbrains-mono`. En el punto de entrada se importan una sola vez `design-system/tokens.css` y las fuentes. El build de la app debe compilar los `.svelte` de `design-system` (nunca se han compilado; si falla la compilación, el defecto se devuelve a `design-builder`, no se parchea en la app).
  - Esqueleto de la app con una cabecera común a todas las vistas, que luego usará el selector de modo de WI-AC-042.
  - Test e2e: con almacenamiento limpio, se ven "Crear proyecto" e "Importar".
- Historial QA:
  - 2026-10-10 — PASS (AC-001, commit d58ca6e). check 0 errores; build OK (compila los `.svelte` de design-system); test 7/7; test:e2e 1/1; check independiente de QA en claro/oscuro y 375px sin errores de consola ni peticiones externas. Reglas base de stack OK.

## WI-AC-002
- Contexto: persistencia
- Acceptance Checks: AC-002, AC-036
- Depende de: [WI-AC-001]
- Rama sugerida: feature/wi-ac-002-create-project-persistence
- Estado: integrado
- Notas de implementación:
  - Capa de persistencia sobre IndexedDB con `idb`: base de datos `kanban-board`, object stores `projects` (key `id`), `cards` (key `id`, índice `projectId`) y `prefs` (para el filtro de WI-AC-018).
  - Repositorio/servicio de dominio que encapsule la lectura y escritura; la UI no accede a IndexedDB directamente. Cada mutación se persiste inmediatamente (sin botón "Guardar").
  - Store de estado en memoria (runes) hidratado desde IndexedDB al arrancar.
  - Formulario "Crear proyecto": nombre + descripción. Validación completa en WI-AC-003; aquí basta con un caso válido.
  - Tests: unitarios del repositorio (con `fake-indexeddb`) y e2e "crear proyecto → recargar → sigue visible con nombre y descripción".
- Historial QA:
  - 2026-10-10 — PASS (AC-002, AC-036, commit e18fe95). check 0 errores; build OK; test 16/16; test:e2e 2/2; check independiente de QA (claro 1280px y oscuro 375px): crear "Mi app"/"Demo" (envío con Enter) → visible → recargar → persiste; IndexedDB `kanban-board` v1 con stores projects/cards(índice projectId)/prefs; sin botón "Guardar"; sin errores de consola ni peticiones externas. Reglas base de stack OK. Observación no bloqueante: si el guardado falla, el diálogo no muestra error al usuario (promesa rechazada sin capturar).

## WI-AC-005
- Contexto: proyectos
- Acceptance Checks: AC-005, AC-006
- Depende de: [WI-AC-002]
- Rama sugerida: feature/wi-ac-005-edit-project
- Estado: integrado
- Notas de implementación:
  - Editar nombre y descripción de un proyecto desde la lista y desde la cabecera del tablero (el tablero existe a partir de WI-AC-009; en este item basta la lista, y WI-AC-009 debe mostrar el nombre actualizado).
  - Identidad por `id`, nunca por nombre: se permiten nombres duplicados.
  - Al editar, actualizar `updatedAt`.
- Historial QA: [2026-10-10 PASS — AC-005 (lista + recarga; parte "tablero" delegada a WI-AC-009) y AC-006 reproducidos con e2e propio; check/build/test/test:e2e en verde; reglas base OK]

## WI-AC-003
- Contexto: proyectos
- Acceptance Checks: AC-003, AC-004
- Depende de: [WI-AC-005]
- Rama sugerida: feature/wi-ac-003-project-name-validation
- Estado: integrado
- Notas de implementación:
  - Validación de dominio reutilizable `validateProjectName(name)`: rechaza vacío o solo espacios (tras `trim`) y más de 80 caracteres.
  - Se aplica tanto al crear como al editar. El mensaje de error aparece junto al campo nombre; no se crea ni se modifica nada.
  - Tests unitarios de la función y e2e de crear y editar con nombre inválido.
- Historial QA: [2026-10-10 PASS — AC-003 y AC-004 (commit 9d68c21). check 0 errores (1 warning conocido del design-system); build OK; test 37/37; test:e2e 8/8; e2e independiente de QA (puerto 4199): crear/editar con nombre vacío, solo espacios y 81 caracteres (maxlength retirado por DOM) → diálogo abierto, error bajo el campo con aria-invalid y aria-describedby, nada creado ni modificado en lista ni IndexedDB tras recargar; campo con maxlength=80; 80 caracteres sí se crea; sin errores de consola. Reglas base de stack OK]

## WI-AC-009
- Contexto: tablero
- Acceptance Checks: AC-009
- Depende de: [WI-AC-002]
- Rama sugerida: feature/wi-ac-009-board-columns
- Estado: integrado
- Notas de implementación:
  - Navegación lista → tablero (estado de vista en memoria o hash `#/project/<id>`; no hace falta router externo).
  - Tablero con exactamente 4 columnas en el orden: Sin empezar, En curso, En pausa, Finalizado. El orden sale de una constante única del dominio.
  - Cabecera con el nombre del proyecto y un enlace para volver a la lista.
- Historial QA: [2026-10-10 PASS — AC-009 y parte "tablero" de AC-005 (commit 2f25bf1). check 0 errores (1 warning conocido del design-system); build OK; test 49/49; test:e2e 10/10; e2e independiente de QA (puerto 4199): abrir por título, por clic en la tarjeta y con Enter → exactamente 4 regiones/h2 en orden Sin empezar, En curso, En pausa, Finalizado, visibles y ordenadas de izquierda a derecha; también tras recargar, deep link y en un segundo proyecto; nombre editado desde la lista y desde la cabecera del tablero visible en el tablero en vivo y tras recargar, lista con nombre y descripción nuevos, homónimo intacto; id inexistente → "Proyecto no encontrado"; sin errores de consola ni peticiones externas. Reglas base de stack OK (solo variables --ds-* existentes, sin dependencias nuevas, orden desde CARD_STATUSES)]

## WI-AC-010
- Contexto: tablero
- Acceptance Checks: AC-010
- Depende de: [WI-AC-009]
- Rama sugerida: feature/wi-ac-010-create-card
- Estado: integrado
- Notas de implementación:
  - Botón "Añadir tarjeta" en cada columna. La tarjeta se crea con `status` igual a la columna, `type` igual a `novedad` y `priority` igual a `null`.
  - Persistencia en el store `cards`. Actualiza el `updatedAt` del proyecto.
  - Validación mínima del título en este item; la validación completa va en WI-AC-011.
- Historial QA: [2026-10-10 PASS — AC-010 (commit 688fac1). check 0 errores (1 warning conocido del design-system); build OK; test 62/62; test:e2e 11/11; e2e independiente de QA (script propio, preview en puerto 4185, ya parado): "Añadir tarjeta" en "En curso" → diálogo solo con título → la tarjeta aparece solo en "En curso" con data-type=novedad y data-priority vacío; IndexedDB `cards` con status en-curso, type novedad, priority null; tras recargar, idéntico; título solo espacios → error junto al campo y no se crea; sin errores de consola. Reglas base de stack OK (solo variables --ds-*, componentes Button/Card/Dialog/Input de design-system, sin dependencias nuevas, tarjeta y updatedAt del proyecto en una transacción, tests unitarios/componentes/e2e)]

## WI-AC-012
- Contexto: tablero
- Acceptance Checks: AC-012, AC-013
- Depende de: [WI-AC-010]
- Rama sugerida: feature/wi-ac-012-edit-card
- Estado: verificado
- Notas de implementación:
  - Diálogo o panel de edición con título, tipo, estado, descripción (textarea multilínea) y prioridad (Alta, Media, Baja o Sin prioridad). Las fechas de creación y modificación se muestran en solo lectura.
  - Si cambia el estado, la tarjeta pasa a la columna correspondiente. Al guardar se actualizan el `updatedAt` de la tarjeta y del proyecto, y `createdAt` no se toca.
  - La tarjeta del tablero es el componente `Card`, y el editor usa `Dialog` con `Input`, `Select` y `Textarea`.
  - Etiqueta de tipo en la tarjeta: `Badge` con el nombre del tipo y el tono de `CARD_TYPE_TONE` (D-016). Prioridad: `Badge` con el tono de `PRIORITY_TONE` cuando no es `null`; sin prioridad no se muestra badge.
- Historial QA: [2026-10-10 PASS — AC-012, AC-013 (commit ce02f60). check 0 errores (1 warning conocido del design-system); build OK; test 75/75; test:e2e 13/13 en 4 ejecuciones seguidas (el ERR_CONNECTION_REFUSED intermitente del builder no se reprodujo); e2e independiente de QA (script propio en scratchpad, preview en puerto 4191, ya parado), en modo claro y oscuro: editar título, tipo, estado (En curso → Finalizado), descripción de 3 líneas y prioridad → la tarjeta pasa a "Finalizado" con los nuevos valores, igual tras recargar; IndexedDB con todos los campos, createdAt igual, updatedAt de tarjeta y proyecto avanzan; 5 controles editables, fechas solo lectura; Cancelar no guarda; "Sin prioridad" → priority null y solo el badge de tipo; Badge de tipo con texto y 4 colores distintos que coinciden con los tokens tag.*; prioridad Alta/Media/Baja → danger/warning/neutral; sin errores de consola. Reglas base de stack OK (solo variables --ds-*, componentes Badge/Button/Card/Dialog/Input/Select/Textarea de design-system, CARD_TYPE_TONE/PRIORITY_TONE definidos una sola vez en domain, sin dependencias nuevas, tarjeta y updatedAt del proyecto guardados juntos, tests unitarios/componentes/e2e)]

## WI-AC-011
- Contexto: tablero
- Acceptance Checks: AC-011
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-011-card-title-validation
- Estado: pendiente
- Notas de implementación:
  - Validación de dominio `validateCardTitle(title)`: rechaza vacío o solo espacios (tras `trim`) y más de 120 caracteres.
  - Se aplica al crear y al editar. El error aparece junto al campo título; no se crea ni se modifica nada.
- Historial QA: []

## WI-AC-014
- Contexto: tablero
- Acceptance Checks: AC-014
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-014-auto-sort
- Estado: pendiente
- Notas de implementación:
  - Función pura `sortCards(cards)`: rango de prioridad alta=0, media=1, baja=2, null=3; empate por `createdAt` ascendente. No se guarda ninguna posición manual.
  - Test unitario con el escenario exacto de AC-014 (T1 Baja, T2 sin prioridad, T3 Alta, T4 Alta → T3, T4, T1, T2).
- Historial QA: []

## WI-AC-007
- Contexto: proyectos
- Acceptance Checks: AC-007, AC-008
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-007-project-list-order-counts
- Estado: pendiente
- Notas de implementación:
  - La lista de proyectos activos se ordena por `updatedAt` descendente. Cualquier creación o edición de tarjeta debe actualizar el `updatedAt` del proyecto (verificar que WI-AC-010 y WI-AC-012 lo hacen).
  - Recuento por estado de las tarjetas no archivadas (4 números, en el orden de las columnas).
- Historial QA: []

## WI-AC-015
- Contexto: tablero
- Acceptance Checks: AC-015, AC-016, AC-017
- Depende de: [WI-AC-014]
- Rama sugerida: feature/wi-ac-015-drag-and-drop
- Estado: pendiente
- Notas de implementación:
  - `svelte-dnd-action` entre columnas. Al soltar en otra columna se cambia `status` y se persiste. Al soltar en la misma columna se descarta el orden visual y se re-aplica `sortCards`.
  - Operable con teclado (soporte nativo de `svelte-dnd-action`) y táctil.
  - Test e2e con teclado y con emulación táctil en viewport móvil (Playwright `hasTouch`).
- Historial QA: []

## WI-AC-018
- Contexto: tablero
- Acceptance Checks: AC-018, AC-019, AC-039
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-018-type-filter
- Estado: pendiente
- Notas de implementación:
  - Filtro de selección múltiple por tipo (D-012). Un conjunto vacío equivale a no filtrar y se ven todas las tarjetas.
  - Un `Chip` por tipo, con el `tone` de `CARD_TYPE_TONE` y `bind:selected`, agrupados en un contenedor con `role="group"` y nombre accesible "Filtrar por tipo".
  - La selección se persiste por proyecto en el store `prefs` (clave `filter:<projectId>`, valor `CardType[]`). No forma parte del formato de export, porque la spec no lo exige.
- Historial QA: []

## WI-AC-020
- Contexto: tablero
- Acceptance Checks: AC-020
- Depende de: [WI-AC-009]
- Rama sugerida: feature/wi-ac-020-mobile-layout
- Estado: pendiente
- Notas de implementación:
  - En un viewport de 375 px, el contenedor del tablero tiene `overflow-x: auto` y las columnas un ancho mínimo. `document.documentElement.scrollWidth` no debe superar el ancho del viewport.
  - Test e2e en un viewport de 375×667.
- Historial QA: []

## WI-AC-021
- Contexto: archivo
- Acceptance Checks: AC-021, AC-022, AC-023
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-021-archive-cards
- Estado: pendiente
- Notas de implementación:
  - Acción "Archivar" en la tarjeta, sin confirmación: pone `archived` a `true`. El tablero y los recuentos solo muestran tarjetas no archivadas.
  - Vista "Tarjetas archivadas" del proyecto con "Restaurar" (pone `archived` a `false` y conserva el resto de campos) y "Borrar definitivamente" (con confirmación; elimina el registro de IndexedDB).
  - El tablero no ofrece borrado para tarjetas activas.
- Historial QA: []

## WI-AC-024
- Contexto: archivo
- Acceptance Checks: AC-024, AC-025, AC-027
- Depende de: [WI-AC-021]
- Rama sugerida: feature/wi-ac-024-archive-projects
- Estado: pendiente
- Notas de implementación:
  - "Archivar proyecto" pone el `archived` del proyecto a `true`. Las tarjetas no se tocan y mantienen su propio flag `archived`, así que al restaurar el proyecto vuelve todo exactamente igual.
  - Vista global "Proyectos archivados" con "Restaurar" y "Borrar definitivamente". Este último pide confirmación indicando el nombre y el total de tarjetas (activas + archivadas) y elimina el proyecto y todas sus tarjetas en una única transacción.
  - La lista activa no ofrece borrado definitivo.
- Historial QA: []

## WI-AC-028
- Contexto: intercambio
- Acceptance Checks: AC-028, AC-029
- Depende de: [WI-AC-024]
- Rama sugerida: feature/wi-ac-028-export
- Estado: pendiente
- Notas de implementación:
  - Formato de export (contrato para todos los items de intercambio):
    ```json
    { "formatVersion": 1, "kind": "full" | "project", "exportedAt": "<ISO>",
      "projects": [Project, ...], "cards": [Card, ...] }
    ```
    `kind: "project"` lleva exactamente 1 proyecto y solo sus tarjetas. Ambos incluyen lo archivado.
  - Descarga mediante `Blob` + `<a download>`. Nombres sugeridos: `kanban-export-<fecha>.json` y `kanban-<nombre-proyecto>-<fecha>.json`.
  - "Exportar todo" desde la lista y "Exportar proyecto" desde el tablero.
  - Función pura `buildExport(...)` con test unitario.
- Historial QA: []

## WI-AC-026
- Contexto: archivo
- Acceptance Checks: AC-026
- Depende de: [WI-AC-024, WI-AC-028]
- Rama sugerida: feature/wi-ac-026-archived-project-readonly
- Estado: pendiente
- Notas de implementación:
  - Desde la vista de proyectos archivados se puede abrir el tablero en modo solo lectura: sin añadir, editar, archivar ni arrastrar tarjetas, y sin editar el proyecto (arrastre desactivado en `svelte-dnd-action`).
  - La guarda también va en la capa de dominio: las mutaciones sobre un proyecto archivado se rechazan.
  - "Exportar proyecto" sigue disponible.
- Historial QA: []

## WI-AC-030
- Contexto: intercambio
- Acceptance Checks: AC-030
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-030-import-full
- Estado: pendiente
- Notas de implementación:
  - "Importar" abre un `<input type="file" accept=".json,application/json">` y la app distingue el tipo de archivo por el campo `kind`.
  - Si `kind` es `full`: confirmación "Se borrarán tus N proyectos actuales" (N = proyectos activos + archivados). Al confirmar, se vacían `projects` y `cards` y se escribe el contenido del archivo en una única transacción. Se conservan ids, fechas y flags tal cual.
  - Validación mínima en este item; la validación completa y sus mensajes van en WI-AC-033.
  - Test e2e de ida y vuelta (round-trip) según AC-030.
- Historial QA: []

## WI-AC-031
- Contexto: intercambio
- Acceptance Checks: AC-031, AC-032
- Depende de: [WI-AC-030]
- Rama sugerida: feature/wi-ac-031-import-project
- Estado: pendiente
- Notas de implementación:
  - Si `kind` es `project` y el id no existe, se añade el proyecto y sus tarjetas.
  - Si el id ya existe, se abre un diálogo con dos opciones:
    - "Reemplazar": borra el proyecto existente y sus tarjetas, e inserta los del archivo, en una única transacción.
    - "Importar como copia": nuevos ids para el proyecto y todas sus tarjetas (remapeando `projectId`) y nombre `<original> (copia)`.
  - Cerrar o cancelar el diálogo no hace nada.
  - Si el nombre con " (copia)" supera 80 caracteres, se recorta el nombre original para que el total quepa en 80. Este caso se implementa y verifica en WI-AC-040.
- Historial QA: []

## WI-AC-033
- Contexto: intercambio
- Acceptance Checks: AC-033
- Depende de: [WI-AC-030, WI-AC-031]
- Rama sugerida: feature/wi-ac-033-import-validation
- Estado: pendiente
- Notas de implementación:
  - Función pura `parseImport(text)` que devuelve `{ ok: true, data } | { ok: false, reason }`, con `reason` igual a `invalid-json`, `unknown-version` o `invalid-structure` (este último con detalle, por ejemplo "tarjeta sin título").
  - La estructura se valida con las mismas reglas de dominio: `validateProjectName`, `validateCardTitle` y enums válidos de tipo, estado y prioridad. Además, cada `card.projectId` debe existir en `projects`.
  - Toda la validación ocurre antes de cualquier escritura. Si falla, se muestra un error con el motivo en español y no se modifica nada.
- Historial QA: []

## WI-AC-034
- Contexto: intercambio
- Acceptance Checks: AC-034
- Depende de: [WI-AC-001, WI-AC-031]
- Rama sugerida: feature/wi-ac-034-import-from-empty-state
- Estado: pendiente
- Notas de implementación:
  - Conectar la opción "Importar" del estado vacío (WI-AC-001) al mismo flujo de importación de WI-AC-030 y WI-AC-031, aceptando ambos valores de `kind`.
  - Con 0 proyectos no se muestra la confirmación de import completo (D-014). Esa regla se implementa y verifica en WI-AC-041; aquí basta con que no bloquee la importación.
- Historial QA: []

## WI-AC-035
- Contexto: persistencia
- Acceptance Checks: AC-035
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-035-save-error
- Estado: pendiente
- Notas de implementación:
  - La capa de persistencia captura los errores de escritura (`QuotaExceededError` y cualquier fallo de transacción) y los expone como estado global `saveError`.
  - Aviso visible mientras haya error, con el botón "Exportar ahora", que descarga el export completo con el estado en memoria.
  - Si el guardado falla, no se muestra ninguna indicación de éxito.
  - Test unitario o de componente simulando el fallo del repositorio.
- Historial QA: []

## WI-AC-037
- Contexto: persistencia
- Acceptance Checks: AC-037
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-037-no-indexeddb
- Estado: pendiente
- Notas de implementación:
  - Al arrancar, detectar si IndexedDB no existe o si falla al abrirse. En ese caso se usa un repositorio en memoria con la misma interfaz que el de IndexedDB.
  - Aviso permanente: "Tus datos no se conservarán al cerrar". La exportación sigue funcionando.
  - Test e2e eliminando `indexedDB` con `addInitScript`.
- Historial QA: []

## WI-AC-038
- Contexto: persistencia
- Acceptance Checks: AC-038
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-038-multi-tab-sync
- Estado: pendiente
- Notas de implementación:
  - Tras cada escritura correcta, se publica `{ entity, id }` por un `BroadcastChannel('kanban-board')`. Las demás pestañas releen esa entidad de IndexedDB y actualizan su store.
  - Política "último cambio gana": la última escritura confirmada sobrescribe el registro completo. No hay fusión de campos.
  - Test e2e con dos páginas del mismo contexto de navegador en Playwright.
- Historial QA: []

## WI-AC-040
- Contexto: intercambio
- Acceptance Checks: AC-040
- Depende de: [WI-AC-031, WI-AC-003]
- Rama sugerida: feature/wi-ac-040-copy-name-truncation
- Estado: pendiente
- Notas de implementación:
  - Función pura de dominio `copyName(name)` (D-013): si `name + " (copia)"` cabe en 80 caracteres, lo devuelve; si no, devuelve `name.slice(0, 80 - " (copia)".length) + " (copia)"`. El nombre ya viene validado, sin espacios exteriores.
  - "Importar como copia" de WI-AC-031 usa `copyName`. El resultado debe pasar `validateProjectName`, para que el proyecto copiado se pueda editar y guardar sin cambiar el nombre.
  - Tests unitarios: nombre de 78 caracteres → primeros 72 + " (copia)", 80 en total; nombre de 72 caracteres → sin recorte. Test e2e de importar como copia con un nombre largo y después guardar la edición del proyecto sin tocar el nombre.
- Historial QA: []

## WI-AC-041
- Contexto: intercambio
- Acceptance Checks: AC-041
- Depende de: [WI-AC-030]
- Rama sugerida: feature/wi-ac-041-import-full-no-confirm-when-empty
- Estado: pendiente
- Notas de implementación:
  - En el flujo de import completo de WI-AC-030, si N (proyectos activos + archivados) es 0, no se abre la confirmación y se escribe el contenido directamente (D-014). Con N ≥ 1 se mantiene la confirmación de AC-030.
  - Test e2e: con almacenamiento limpio, importar un export completo muestra los proyectos sin ningún diálogo. Con 1 proyecto archivado y ninguno activo, sí aparece la confirmación.
- Historial QA: []

## WI-AC-042
- Contexto: apariencia
- Acceptance Checks: AC-042
- Depende de: [WI-AC-024]
- Rama sugerida: feature/wi-ac-042-color-mode-selector
- Estado: pendiente
- Notas de implementación:
  - Selector "Modo de color" en la cabecera común (WI-AC-001), visible en la lista de proyectos, el tablero, las tarjetas archivadas y los proyectos archivados. Se usa `Select` de `design-system` con las opciones Auto, Claro y Oscuro (valores `auto`, `light`, `dark`), o un grupo de `Chip`. En ambos casos debe poder manejarse solo con el teclado y tener el nombre accesible "Modo de color".
  - Estado `colorMode: 'auto' | 'light' | 'dark'` en un store (runes), inicialmente `auto`. Un efecto aplica el modo a `<html>`: `auto` → sin atributo `data-theme`; `light` y `dark` → `data-theme="light"` o `"dark"` (D-017). El modo del sistema lo resuelven los propios tokens (`prefers-color-scheme`); la app no lo calcula.
  - En este item no se persiste la preferencia (eso va en WI-AC-043).
  - Test e2e con `page.emulateMedia({ colorScheme })`: el color de fondo calculado del `body` coincide con el valor claro u oscuro del token `background` (`#FCFBF8` / `#1C1917`). Casos: Auto con el sistema en claro y en oscuro; Oscuro con el sistema en claro; Claro con el sistema en oscuro; volver a Auto. Comprobar en las 4 vistas que el selector existe y se maneja con el teclado.
- Historial QA: []

## WI-AC-043
- Contexto: apariencia
- Acceptance Checks: AC-043
- Depende de: [WI-AC-042, WI-AC-028]
- Rama sugerida: feature/wi-ac-043-color-mode-persistence
- Estado: pendiente
- Notas de implementación:
  - La preferencia se guarda en `localStorage`, clave `kanban-board:color-mode`, con valor `light` o `dark`. Con `auto` se elimina la clave. No se usa IndexedDB ni el store `prefs`, para poder aplicar el modo de forma síncrona antes de pintar.
  - Un script inline en `index.html` lee la clave y pone `data-theme` en `<html>` antes de montar la app, para evitar un destello en el modo equivocado. El store de WI-AC-042 se inicializa con el mismo valor.
  - Todo acceso a `localStorage` va en `try/catch`. Si falla (bloqueado o no disponible), el selector funciona en memoria durante la sesión, al recargar vuelve a Auto y no se muestra ningún error ni `Alert`.
  - La preferencia no forma parte del export: `buildExport` (WI-AC-028) no la incluye, y ningún import la lee ni la cambia.
  - Tests: e2e de elegir Oscuro con el sistema en claro, recargar y comprobar el modo oscuro y que el selector muestra Oscuro. Unitario de que el JSON de `buildExport` (completo y de proyecto) no contiene la preferencia. E2e de importar un archivo con Oscuro activo y comprobar que sigue en Oscuro. E2e con `localStorage` bloqueado mediante `addInitScript` (que `setItem` y `getItem` lancen excepción): el selector cambia el modo, al recargar vuelve a Auto y no aparece ningún error.
- Historial QA: []
