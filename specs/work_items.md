# Work Items

Generado por `planner` a partir de `specs/project_specs.md` (AC-001 … AC-046, D-001 … D-020).
Orden: por dependencias (los que no dependen de nada, primero). Cada Work Item se nombra por el primer Acceptance Check que cubre.
Ampliación del 2026-10-10: WI-AC-040, WI-AC-041, WI-AC-042 y WI-AC-043 añadidos al final. Notas de WI-AC-001, WI-AC-012, WI-AC-018, WI-AC-031 y WI-AC-034 alineadas con D-014, D-015 y D-016 (todos seguían en `pendiente`).
Ampliación del 2026-10-11: WI-AC-044, WI-AC-045 y WI-AC-046 añadidos al final (AC-044, AC-045, AC-046; D-018, D-019, D-020). Los Work Items integrados no cambian; solo se añade a WI-AC-040 una referencia a que AC-040 queda precisado por AC-046 (D-020), sin tocar su estado ni su historial.
Ampliación del 2026-10-12 (rediseño visual): WI-AC-047 … WI-AC-057 añadidos al final (AC-047 … AC-057; D-021 … D-032). Los Work Items integrados no cambian. Ver el bloque "Sistema de diseño (2026-10-12)" más abajo, que amplía al anterior para estos items.

Sistema de diseño (D-015, D-016; aplica a todos los items con UI):
- La UI se construye con los componentes de `design-system` (`Button`, `Input`, `Textarea`, `Select`, `Field`, `Dialog`, `Card`, `Badge`, `Chip`, `Alert`). Los estilos propios de la app solo usan variables `--ds-*`.
- Confirmaciones en `Dialog size="sm"`, acciones destructivas con `Button variant="danger"` y avisos (error de guardado, sin IndexedDB) con `Alert`.
- Correspondencia de dominio a tono, definida una sola vez en el módulo `domain`:
  ```ts
  const CARD_TYPE_TONE = { novedad: 'feature', mejora: 'improvement', arreglo: 'bugfix', tecnico: 'technical' } as const;
  const PRIORITY_TONE = { alta: 'danger', media: 'warning', baja: 'neutral' } as const; // null → sin Badge
  ```

Sistema de diseño (2026-10-12; D-021 … D-032; aplica a WI-AC-047 … WI-AC-057):
- Nuevos componentes disponibles: `Icon`, `Column`, `DropPlaceholder`, y la constante `CATEGORY_ICONS`. `Button`, `Badge` y `Chip` aceptan `icon`; `Card` acepta `priority` (`'high' | 'medium' | 'low'`). Fuente Plus Jakarta Sans e iconos `@lucide/svelte` (importados icono a icono: `@lucide/svelte/icons/<nombre>`).
- Correspondencias de dominio nuevas. Las de texto van en `domain` (sin dependencias de UI); las que son componentes de icono van en un módulo de la app (p. ej. `src/lib/icons.ts`), nunca en `domain`:
  ```ts
  // domain
  const CARD_STATUS_DS = { 'sin-empezar': 'todo', 'en-curso': 'doing', 'en-pausa': 'paused', finalizado: 'done' } as const; // → Column status
  const PRIORITY_DS = { alta: 'high', media: 'medium', baja: 'low' } as const;    // null → sin franja (Card priority)
  // src/lib/icons.ts (Lucide)
  const PRIORITY_ICON = { alta: ArrowUp, media: Equal, baja: ArrowDown };
  const STATUS_ICON = { 'sin-empezar': CircleDashed, 'en-curso': CircleDot, 'en-pausa': CirclePause, finalizado: CircleCheck }; // los mismos que usa Column por dentro
  ```
- Ningún item modifica `design-system/`. Si algo no se puede hacer con lo que expone (props, tokens), se devuelve a `design-builder`; no se parchea con CSS global sobre clases `ds-*` ni con valores sueltos.
- Los e2e y tests de componente existentes que usen selectores o nombres que cambian en un item (nombres accesibles, `data-*`, textos con "←", clases de la app) se actualizan en ese mismo item, y deben seguir pasando todos (`npm run test`, `npm run test:e2e`, `npm run check`).

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
- Estado: integrado
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
- Estado: integrado
- Notas de implementación:
  - Validación de dominio `validateCardTitle(title)`: rechaza vacío o solo espacios (tras `trim`) y más de 120 caracteres.
  - Se aplica al crear y al editar. El error aparece junto al campo título; no se crea ni se modifica nada.
- Historial QA: [2026-10-10 FAIL — AC-011 (commit a38a55d). check 0 errores (1 warning conocido del design-system); build OK; test 86/86; test:e2e 15/15. Vacío y solo espacios OK al crear y al editar (error junto al campo con aria-invalid/aria-describedby, nada guardado, igual tras recargar, claro y oscuro). DEFECTO: con más de 120 caracteres el usuario nunca ve el error, porque el `maxlength=120` del campo título recorta en silencio. Lo reproduce un script propio de QA (preview en puerto 4187, ya parado): pegar 150 caracteres con Ctrl+V y pulsar "Añadir" CREA una tarjeta con título de 120 sin mostrar error; pegar 150 en "Editar tarjeta" y pulsar "Guardar cambios" MODIFICA la tarjeta sin mostrar error. AC-011 exige que la tarjeta no se cree ni se modifique y que se muestre el error junto al campo; a diferencia de AC-004, no admite que "el campo no admita más". El error de 121 caracteres solo aparece si se salta `maxlength` desde el DOM, como hace el e2e del builder. Reglas base de stack OK (solo --ds-*, componentes de design-system, sin dependencias nuevas, tests unitarios/componentes/e2e); 2026-10-10 PASS — AC-011 (commit 08e1b0c). check 0 errores (1 warning conocido del design-system); build OK; test 86/86; test:e2e 15/15. Script propio de QA (preview en puerto 4188, ya parado), en modo claro y oscuro, sin maxlength en el título al crear ni al editar: vacío, solo espacios, 121/125 caracteres tecleados y 150 pegados con Ctrl+V → el diálogo sigue abierto, aria-invalid=true y error junto al campo (4px debajo, color feedback.danger), con "El título es obligatorio." o "El título no puede superar 120 caracteres." según el caso; no se crea ninguna tarjeta y la editada no cambia (tarjeta y proyecto idénticos en IndexedDB tras recargar, aunque se cambió la prioridad en el diálogo); 120 caracteres con espacios exteriores sí se crea (título recortado a 120); una edición válida guarda; sin errores de consola. Reglas base de stack OK (solo --ds-*, componentes de design-system, sin dependencias nuevas, tests unitarios/componentes/e2e, el e2e ahora pega con el portapapeles)]

## WI-AC-014
- Contexto: tablero
- Acceptance Checks: AC-014
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-014-auto-sort
- Estado: integrado
- Notas de implementación:
  - Función pura `sortCards(cards)`: rango de prioridad alta=0, media=1, baja=2, null=3; empate por `createdAt` ascendente. No se guarda ninguna posición manual.
  - Test unitario con el escenario exacto de AC-014 (T1 Baja, T2 sin prioridad, T3 Alta, T4 Alta → T3, T4, T1, T2).
- Historial QA:
  - 2026-10-10 — PASS (AC-014, commit 00e7e27). check 0 errores (1 warning conocido del design-system); build OK; test 90/90; test:e2e 16/16; check independiente de QA en navegador real (columna "En pausa", crear T1–T4 sin prioridad y asignar después T4=Alta, T1=Baja, T3=Alta) → T3, T4, T1, T2, y se mantiene tras recargar. Diff: función pura `sortCards` en dominio + uso en Board; sin estilos ni dependencias nuevas. Reglas base de stack OK.

## WI-AC-007
- Contexto: proyectos
- Acceptance Checks: AC-007, AC-008
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-007-project-list-order-counts
- Estado: integrado
- Notas de implementación:
  - La lista de proyectos activos se ordena por `updatedAt` descendente. Cualquier creación o edición de tarjeta debe actualizar el `updatedAt` del proyecto (verificar que WI-AC-010 y WI-AC-012 lo hacen).
  - Recuento por estado de las tarjetas no archivadas (4 números, en el orden de las columnas).
- Historial QA: [2026-10-10 PASS — AC-007 y AC-008 (commit 0d9659a). check 0 errores (1 warning conocido del design-system); build OK; test 96/96; test:e2e 18/18; e2e independiente de QA con reloj real (puerto 4199): A y B → B,A; crear tarjeta en A → A,B sin recargar y tras recargar; crear tarjeta en B → B,A; editar tarjeta en A → A,B; proyecto con 2 en Sin empezar y 1 en En curso muestra 2,1,0,0 con etiquetas en orden de columnas; tarjetas archivadas sembradas en IndexedDB excluidas del recuento (2,1,0,1 con una activa en Finalizado). Reglas base de stack OK (solo variables --ds-* existentes, sin dependencias nuevas)]

## WI-AC-015
- Contexto: tablero
- Acceptance Checks: AC-015, AC-016, AC-017
- Depende de: [WI-AC-014]
- Rama sugerida: feature/wi-ac-015-drag-and-drop
- Estado: integrado
- Notas de implementación:
  - `svelte-dnd-action` entre columnas. Al soltar en otra columna se cambia `status` y se persiste. Al soltar en la misma columna se descarta el orden visual y se re-aplica `sortCards`.
  - Operable con teclado (soporte nativo de `svelte-dnd-action`) y táctil.
  - Test e2e con teclado y con emulación táctil en viewport móvil (Playwright `hasTouch`).
- Historial QA:
  - 2026-10-10 — PASS (AC-015, AC-016, AC-017, commit 1155f0b). check 0 errores (1 warning conocido del design-system); build OK; test 104/104; test:e2e 22/22; e2e independiente de QA (puerto 4191, script fuera del repo). AC-015: arrastre con ratón de "Sin empezar" a "En pausa" → queda P-Alta, Mover, P-Baja; IndexedDB status=en-pausa; persiste tras recargar. AC-016: el hueco llega al final de la columna y al soltar vuelve el orden automático A, M, B; IndexedDB sin cambios. AC-017 teclado: Tab hasta la tarjeta (anillo de foco visible), Espacio, Tab recorre las columnas (incluso da la vuelta), Espacio/Escape suelta; persiste. AC-017 táctil (390×844, hasTouch, CDP Input.dispatchTouchEvent) → movida y persistida; un tap en el título abre la edición. Juicio sobre lo declarado: (1) agarrar por el título no arrastra ni abre nada; el botón del título es el 4,7 % del área de la tarjeta en escritorio, el resto sí arrastra → aceptable; (2) con teclado cada columna por la que pasa se guarda (status/updatedAt intermedios); el estado final es correcto y el AC no lo prohíbe → aceptable; (3) CDP produce eventos táctiles reales del navegador, encaja con "emulación táctil en Playwright". Reglas base OK (svelte-dnd-action según D-009, solo variables --ds-* existentes, tests unitarios y e2e). Observaciones no bloqueantes: tras soltar con teclado el foco se va a <body>; en móvil las columnas miden unos 78 px (WI-AC-020).

## WI-AC-018
- Contexto: tablero
- Acceptance Checks: AC-018, AC-019, AC-039
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-018-type-filter
- Estado: integrado
- Notas de implementación:
  - Filtro de selección múltiple por tipo (D-012). Un conjunto vacío equivale a no filtrar y se ven todas las tarjetas.
  - Un `Chip` por tipo, con el `tone` de `CARD_TYPE_TONE` y `bind:selected`, agrupados en un contenedor con `role="group"` y nombre accesible "Filtrar por tipo".
  - La selección se persiste por proyecto en el store `prefs` (clave `filter:<projectId>`, valor `CardType[]`). No forma parte del formato de export, porque la spec no lo exige.
- Historial QA:
  - 2026-10-10 — PASS (AC-018, AC-019, AC-039, commit 410153d). check 0 errores (1 warning conocido del design-system); test 116/116; test:e2e 25/25; e2e independiente de QA (vite preview en el puerto 4192, script fuera del repo). AC-018: proyecto A con Novedad, Mejora, Técnico y 2 Arreglo en las 4 columnas → "Arreglo" deja solo Arr1 y Arr2 (aria-pressed=true); al quitarlo vuelven las 5. AC-019: prefs `filter:<idA>` = ["arreglo"]; tras recargar, A sigue filtrado; B (sin filtro, con tarjetas Novedad y Arreglo) muestra todas, sin chips pulsados, también al recargar directamente en B. AC-039: Arreglo + Técnico (Técnico activado con teclado, Espacio) → Arr1, Arr2, Tec1; persiste tras recargar; al deseleccionar los dos (Enter + clic) se ven todas, prefs = [] y sigue así tras recargar. Clics rápidos seguidos → estado final correcto en memoria y tras recargar. Sin errores de consola. Reglas base OK (Chip del design-system, solo variables --ds-*, idb vía Repository, tests unitarios y e2e). Nota del builder comprobada: recargar en el mismo instante del clic pierde el cambio (15/15), con 50 ms de margen no se pierde (0/15). Una recarga humana tarda más que eso → no bloqueante. Observación no bloqueante: si el guardado del filtro falla, solo se registra en consola y el filtro sigue aplicado en memoria.

## WI-AC-020
- Contexto: tablero
- Acceptance Checks: AC-020
- Depende de: [WI-AC-009]
- Rama sugerida: feature/wi-ac-020-mobile-layout
- Estado: integrado
- Notas de implementación:
  - En un viewport de 375 px, el contenedor del tablero tiene `overflow-x: auto` y las columnas un ancho mínimo. `document.documentElement.scrollWidth` no debe superar el ancho del viewport.
  - Test e2e en un viewport de 375×667.
- Historial QA:
  - 2026-10-10 — PASS (AC-020, commit 1d8a7d6). check 0 errores (1 warning conocido del design-system); test 116/116; test:e2e 26/26. Diff contra integration/kanban-board: solo Board.svelte (overflow-x: auto + minmax(calc(var(--ds-spacing-8) * 4), 1fr), solo variables --ds-*), e2e/mobile-layout.spec.ts nuevo y e2e AC-017 táctil adaptado. Verificación independiente (vite preview en el puerto 4319, script fuera del repo): 375×667 con 4 tarjetas de título largo → documentElement.scrollWidth 375, scrollX 0 (también tras window.scrollTo(500)), tablero scrollWidth 1088 / clientWidth 359, columnas de 256 px, ningún elemento fuera del tablero desborda; deslizar el dedo sobre la cabecera de columna desplaza el tablero 185 px y la página sigue en scrollX 0; "Finalizado" se ve entera al desplazar. 320 px y 1280 px sin desbordamiento de página (en 1280 el tablero no tiene scroll). AC-017 táctil sin regresión: mismas aserciones (En pausa + persistencia tras recargar), 30/30 repeticiones. Observaciones (no bloquean): deslizar sobre una tarjeta inicia el arrastre en vez de desplazar (el tablero se desplaza desde cabeceras y huecos); el e2e de teclado de AC-017 es intermitente (~1/40 bajo carga) también en integration/kanban-board, preexistente y ajeno a este WI.

## WI-AC-021
- Contexto: archivo
- Acceptance Checks: AC-021, AC-022, AC-023
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-021-archive-cards
- Estado: integrado
- Notas de implementación:
  - Acción "Archivar" en la tarjeta, sin confirmación: pone `archived` a `true`. El tablero y los recuentos solo muestran tarjetas no archivadas.
  - Vista "Tarjetas archivadas" del proyecto con "Restaurar" (pone `archived` a `false` y conserva el resto de campos) y "Borrar definitivamente" (con confirmación; elimina el registro de IndexedDB).
  - El tablero no ofrece borrado para tarjetas activas.
- Historial QA:
  - 2026-10-10 — PASS (AC-021, AC-022, AC-023, commit 52178f0). check 0 errores (1 warning conocido del design-system); build OK; test 131/131; test:e2e 29/29; drag-and-drop + archive-cards con --repeat-each=10 → 70/70 (sin empeorar la intermitencia de AC-017 teclado). Verificación independiente (vite preview en el puerto 4327, scripts fuera del repo) con los proyectos A y B, y una tarjeta "Login" en los dos. AC-021: "Archivar" (con ratón, Enter y Espacio) quita la tarjeta sin abrir ningún diálogo; en IndexedDB archived=true y el resto de campos idénticos; sigue fuera tras recargar; la lista muestra A con 1/1/0/0, sin la archivada; la vista de archivadas de A muestra solo esa "Login" (no la de B) con tipo, prioridad, descripción, estado, creación y última modificación; la de B está vacía. AC-022: Restaurar → desaparece de archivadas y vuelve a "En curso"; el registro en IndexedDB es idéntico al original (también updatedAt); persiste tras recargar. AC-023: Borrar definitivamente pide confirmación; Cancelar y Escape no borran (siguen en la vista y en IndexedDB); Confirmar elimina el registro, no reaparece tras recargar y el resto de tarjetas no cambia; ni el tablero ni el diálogo de edición tienen botón de borrar. A 375 px la vista de archivadas no desborda (scrollWidth 375). Sin errores de consola. Reglas base OK (solo variables --ds-* existentes, componentes del design-system, idb vía Repository, borrado y proyecto en una sola transacción, sin dependencias nuevas, tests unitarios y e2e). Juicio sobre lo declarado: (1) no cambiar el updatedAt de la tarjeta encaja con "Restaurar… en el mismo estado en que se archivó"; tocar el del proyecto no lo prohíbe ningún AC → aceptable. (2) Botón "Archivar" sin el título: la spec solo exige aria-label en botones de solo icono, y el li tiene aria-label con el título → aceptable. (3) Card readonly recorta la descripción a 3 líneas (con 5 líneas, scrollHeight 112 frente a clientHeight 67). El texto completo está en el DOM y es la regla del Card en la spec, igual que en el tablero → aceptable, aunque desde archivadas no se puede leer entera sin restaurarla. Observaciones (no bloquean): tras archivar desde el teclado el foco se va a <body>; no hay forma de leer la descripción completa de una tarjeta archivada (posible aclaración para spec-writer).

## WI-AC-024
- Contexto: archivo
- Acceptance Checks: AC-024, AC-025, AC-027
- Depende de: [WI-AC-021]
- Rama sugerida: feature/wi-ac-024-archive-projects
- Estado: integrado
- Notas de implementación:
  - "Archivar proyecto" pone el `archived` del proyecto a `true`. Las tarjetas no se tocan y mantienen su propio flag `archived`, así que al restaurar el proyecto vuelve todo exactamente igual.
  - Vista global "Proyectos archivados" con "Restaurar" y "Borrar definitivamente". Este último pide confirmación indicando el nombre y el total de tarjetas (activas + archivadas) y elimina el proyecto y todas sus tarjetas en una única transacción.
  - La lista activa no ofrece borrado definitivo.
- Historial QA: [2026-10-10 PASS — AC-024, AC-025 y AC-027 (commit 6373ddb). check 0 errores (1 warning conocido del design-system); build OK; test 145/145; test:e2e 32/32; e2e independiente de QA (puerto 4180): archivar sin confirmación ni navegación, sale de la lista y aparece en #/archived (también tras recargar), solo cambia `archived` del proyecto y no toca tarjetas; restaurar devuelve el proyecto idéntico en IndexedDB, tarjetas activas/archivadas y filtro intactos; confirmación de borrado con nombre y total (0 y 3 tarjetas: activas+archivadas), Cancelar y Escape no cambian nada; confirmar borra proyecto, sus tarjetas y `filter:<id>` sin tocar otro proyecto, y no reaparece tras recargar; lista activa sin borrado; 375px sin overflow; sin errores de consola. Decisiones del builder aceptadas: updatedAt sin cambios al archivar/restaurar (glosario "Restaurar" y D-007(3)), "Archivar" solo en la lista (la spec no fija ubicación), borrar `filter:<id>` (sin datos huérfanos). Reglas base de stack OK]

## WI-AC-028
- Contexto: intercambio
- Acceptance Checks: AC-028, AC-029
- Depende de: [WI-AC-024]
- Rama sugerida: feature/wi-ac-028-export
- Estado: integrado
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
- Historial QA: [2026-10-10 PASS — AC-028 y AC-029 (commit 587efea). check 0 errores (1 warning conocido del design-system); build OK; test 157/157; test:e2e 34/34; e2e independiente de QA (puerto 4181): sin proyectos no hay "Exportar todo"; export completo `kanban-export-<fecha>.json` con formatVersion 1, kind "full", exportedAt ISO, solo las 5 claves del contrato, 3 proyectos (1 archivado) y 5 tarjetas (2 archivadas) idénticos a IndexedDB, sin preferencias; export de proyecto `kanban-Mi-app-v2-beta-<fecha>.json` (nombre "Mi app: v2/beta") con exactamente ese proyecto y sus tarjetas A (activa) y B (archivada); proyecto archivado exportable (C,D); con todo archivado "Exportar todo" sigue visible y exporta todo; exportar no modifica datos; 375px sin overflow; sin errores de consola ni peticiones de red. Decisiones del builder aceptadas: "Exportar todo" solo si hay algún proyecto (activo o archivado; la spec no lo exige con 0 y AC-001 fija el estado vacío), nombre de archivo saneado (Notas sugieren `kanban-<nombre-proyecto>-<fecha>.json`), `buildExport` copia solo campos del modelo (coherente con AC-043). Reglas base de stack OK]

## WI-AC-026
- Contexto: archivo
- Acceptance Checks: AC-026
- Depende de: [WI-AC-024, WI-AC-028]
- Rama sugerida: feature/wi-ac-026-archived-project-readonly
- Estado: integrado
- Notas de implementación:
  - Desde la vista de proyectos archivados se puede abrir el tablero en modo solo lectura: sin añadir, editar, archivar ni arrastrar tarjetas, y sin editar el proyecto (arrastre desactivado en `svelte-dnd-action`).
  - La guarda también va en la capa de dominio: las mutaciones sobre un proyecto archivado se rechazan.
  - "Exportar proyecto" sigue disponible.
- Historial QA:
  - 2026-10-10 — PASS (AC-026, commit 3730ee3). check 0 errores (1 warning conocido del design-system); build OK; test 167/167; test:e2e 35/35; archived-project-readonly + drag-and-drop + archive-projects con --repeat-each=10 → 80/80. Verificación independiente (vite preview en el puerto 4193, script fuera del repo) con "Vieja" (A1 Sin empezar, A2 En curso, A3 En pausa, X archivada) y "Otra": "Ver tablero" desde #/archived abre #/project/<id>; se ven A1-A3 y no X; sin "Añadir tarjeta", "Archivar" ni "Editar proyecto"; clic, doble clic, Enter y Espacio sobre la tarjeta no abren diálogo; arrastre con ratón y Espacio+flechas no mueven (zonas con aria-describedby dnd-zone-drag-disabled); en sus tarjetas archivadas se ve X sin Restaurar/Borrar; IndexedDB idéntico antes y después; "Exportar proyecto" descarga kanban-Vieja-<fecha>.json (formatVersion 1, kind project, 1 proyecto archivado, 4 tarjetas); al recargar por URL sigue en solo lectura; 375 px sin desbordamiento. Sin regresión: restaurar (AC-025) deja el proyecto idéntico salvo archived=false y el tablero vuelve a ser editable (crear tarjeta OK, Restaurar/Borrar de nuevo en archivadas); borrar definitivamente (AC-027) muestra nombre y total (5) y elimina proyecto y tarjetas tras recargar sin tocar "Otra". Sin errores de consola ni peticiones de red. Juicio sobre lo declarado: (1) guarda en editProject/touchProject: cubre todas las mutaciones de tarjetas y la edición del proyecto; restoreProject/deleteProject/export no pasan por ella → correcto. (2) Ocultar Restaurar/Borrar tarjetas en un proyecto archivado: coherente con D-007(6) "un proyecto archivado es de solo lectura" → aceptable. Reglas base de stack OK (solo variables --ds-* existentes, Alert del design-system, sin dependencias nuevas, tests unitarios y e2e). Observación (no bloquea, para WI de AC-036): sin sincronización entre pestañas, una pestaña con el proyecto aún activo en memoria puede guardar una edición tras archivarlo en otra y reescribir el proyecto con archived=false, porque la guarda mira la copia en memoria; es la limitación conocida de que AC-036 está pendiente, no de este WI.

## WI-AC-030
- Contexto: intercambio
- Acceptance Checks: AC-030
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-030-import-full
- Estado: integrado
- Notas de implementación:
  - "Importar" abre un `<input type="file" accept=".json,application/json">` y la app distingue el tipo de archivo por el campo `kind`.
  - Si `kind` es `full`: confirmación "Se borrarán tus N proyectos actuales" (N = proyectos activos + archivados). Al confirmar, se vacían `projects` y `cards` y se escribe el contenido del archivo en una única transacción. Se conservan ids, fechas y flags tal cual.
  - Validación mínima en este item; la validación completa y sus mensajes van en WI-AC-033.
  - Test e2e de ida y vuelta (round-trip) según AC-030.
- Historial QA: [2026-10-10 PASS — AC-030 (commit 2c3b917). check 0 errores (1 warning conocido del design-system); build OK; test 182/182; test:e2e 37/37; e2e independiente de QA (puerto 4319): con 2 activos + 1 archivado la confirmación dice "Se borrarán tus 3 proyectos actuales"; Cancelar y Escape dejan IndexedDB idéntica; Reemplazar deja projects y cards idénticos (JSON exacto, mismos campos, archivado y fechas) al export, sin el proyecto nuevo, también tras recargar; prefs filter:* conservado; N=1 en singular; JSON roto → error sin cambios; Importar del estado vacío abre el mismo flujo (texto "0 proyectos" pendiente de WI-AC-041, fuera de alcance). Reglas base de stack OK (sin dependencias nuevas, sin colores hardcodeados, escritura en una única transacción con abort explícito y test de rollback)]

## WI-AC-031
- Contexto: intercambio
- Acceptance Checks: AC-031, AC-032
- Depende de: [WI-AC-030]
- Rama sugerida: feature/wi-ac-031-import-project
- Estado: integrado
- Notas de implementación:
  - Si `kind` es `project` y el id no existe, se añade el proyecto y sus tarjetas.
  - Si el id ya existe, se abre un diálogo con dos opciones:
    - "Reemplazar": borra el proyecto existente y sus tarjetas, e inserta los del archivo, en una única transacción.
    - "Importar como copia": nuevos ids para el proyecto y todas sus tarjetas (remapeando `projectId`) y nombre `<original> (copia)`.
  - Cerrar o cancelar el diálogo no hace nada.
  - Si el nombre con " (copia)" supera 80 caracteres, se recorta el nombre original para que el total quepa en 80. Este caso se implementa y verifica en WI-AC-040.
- Historial QA: [2026-10-10 PASS — AC-031, AC-032 (commit ebbf7c7). check 0 errores (1 warning conocido del design-system); build OK; test 196/196; test:e2e 42/42; verificación independiente (vite preview en el puerto 4347, script fuera del repo) con "Otra" (E) y "Mi app" (A, B archivada, filtro "Arreglo"): archivo con id nuevo → se añade sin diálogo, proyecto y tarjetas (incl. archivada) idénticos al archivo, proyectos/tarjetas existentes idénticos en IndexedDB, persiste al recargar; con id existente → diálogo "Este proyecto ya existe" con "Reemplazar" e "Importar como copia"; Cancelar, Escape y × dejan IndexedDB idéntica; "Importar como copia" crea "Mi app (copia)" con ids nuevos, projectId remapeado, resto de campos igual (archivado conservado) y el existente (con tarjeta C añadida) intacto; "Reemplazar" deja proyecto y tarjetas exactamente iguales al archivo (C eliminada), no añade proyecto, resto intacto y persiste al recargar; 375 px sin desbordamiento; sin errores de consola ni peticiones externas. Juicio sobre lo declarado: (1) kind project con ≠1 proyecto → error genérico sin cambios: aceptable, los motivos detallados son AC-033/WI-AC-033. (2) Conservar `filter:<id>` al reemplazar: aceptable, la spec no la trata como dato del proyecto ni va en el export. (3) Recorte >80 con " (copia)": fuera de alcance, WI-AC-040. (4) Import sin guarda `ArchivedProjectError`: aceptable, D-007(6) limita la edición en el tablero, no reemplazar/copiar por import (cubierto por e2e con el existente archivado). Reglas base de stack OK (sin dependencias nuevas, Dialog/Button del design-system, sin CSS ni colores nuevos, escritura en una única transacción con abort y test de rollback, tests unitarios y e2e)]

## WI-AC-033
- Contexto: intercambio
- Acceptance Checks: AC-033
- Depende de: [WI-AC-030, WI-AC-031]
- Rama sugerida: feature/wi-ac-033-import-validation
- Estado: integrado
- Notas de implementación:
  - Función pura `parseImport(text)` que devuelve `{ ok: true, data } | { ok: false, reason }`, con `reason` igual a `invalid-json`, `unknown-version` o `invalid-structure` (este último con detalle, por ejemplo "tarjeta sin título").
  - La estructura se valida con las mismas reglas de dominio: `validateProjectName`, `validateCardTitle` y enums válidos de tipo, estado y prioridad. Además, cada `card.projectId` debe existir en `projects`.
  - Toda la validación ocurre antes de cualquier escritura. Si falla, se muestra un error con el motivo en español y no se modifica nada.
- Historial QA: [2026-10-10 PASS — AC-033 (commit 31f0cb7). check 0 errores (1 warning conocido del design-system); test 223/223; test:e2e 43/43 (incl. AC-030/031/032 con exports reales descargados, con archivados, y AC-033: JSON no válido, versión desconocida, tarjeta sin título, estado inexistente, projectId ajeno → mensaje en español y datos intactos tras recargar). Decisiones del builder (ids repetidos, fechas ISO, priority obligatoria como null, kind project = 1 proyecto en parseImport) coherentes con el modelo de la spec. Reglas base OK (sin dependencias nuevas, dominio sin UI, sin estilos). Observación: e2e de teclado AC-017 intermitente previo, no causado por este WI: rama 31/640 fallos (4,8 %) vs integration/kanban-board 22/640 (3,4 %), Fisher bilateral p≈0,26; el diff no toca tablero ni drag-and-drop]

## WI-AC-034
- Contexto: intercambio
- Acceptance Checks: AC-034
- Depende de: [WI-AC-001, WI-AC-031]
- Rama sugerida: feature/wi-ac-034-import-from-empty-state
- Estado: integrado
- Notas de implementación:
  - Conectar la opción "Importar" del estado vacío (WI-AC-001) al mismo flujo de importación de WI-AC-030 y WI-AC-031, aceptando ambos valores de `kind`.
  - Con 0 proyectos no se muestra la confirmación de import completo (D-014). Esa regla se implementa y verifica en WI-AC-041; aquí basta con que no bloquee la importación.
- Historial QA: [2026-10-10 PASS — AC-034 (commit bc5aefe). check 0 errores (1 warning conocido del design-system); test 225/225; test:e2e 45/45 (incl. los 2 nuevos de AC-034). Reproducción propia con Playwright sobre preview: exports reales (completo con 3 proyectos y de proyecto) importados desde el "Importar" del estado vacío en contextos limpios → la lista muestra los proyectos importados, desaparece el estado vacío y persiste tras recargar; el export de proyecto entra sin diálogo de conflicto. Con 0 proyectos aún aparece la confirmación "0 proyectos" y no bloquea (D-014 queda para WI-AC-041). Reglas base OK: el único cambio de producto es un comentario en ProjectList.svelte; sin dependencias nuevas ni estilos. AC-017 (teclado) pasó en esta ejecución; el diff no toca tablero]

## WI-AC-035
- Contexto: persistencia
- Acceptance Checks: AC-035
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-035-save-error
- Estado: integrado
- Notas de implementación:
  - La capa de persistencia captura los errores de escritura (`QuotaExceededError` y cualquier fallo de transacción) y los expone como estado global `saveError`.
  - Aviso visible mientras haya error, con el botón "Exportar ahora", que descarga el export completo con el estado en memoria.
  - Si el guardado falla, no se muestra ninguna indicación de éxito.
  - Test unitario o de componente simulando el fallo del repositorio.
- Historial QA: [2026-10-10 PASS — AC-035 (commit a9a7a07). check 0 errores (1 warning conocido del design-system); test 240/240; test:e2e 50/50 (incl. los 2 nuevos de AC-035; AC-017 teclado pasó). Reproducción propia con Playwright sobre preview (puerto 4391, cerrado al terminar), forzando QuotaExceededError en put/add/delete/clear de IDBObjectStore, en 17 flujos: crear/editar/archivar/restaurar/borrar proyecto, crear/editar/archivar/restaurar/borrar tarjeta, mover por drag-and-drop con ratón y con teclado, import completo confirmado, import de proyecto nuevo, "Reemplazar" e "Importar como copia", y filtro por tipo. En todos: aparece el aviso role=alert "No se pudieron guardar los cambios" con "Exportar ahora"; la UI no muestra el cambio (diálogos siguen abiertos, la tarjeta vuelve a su columna, la lista no cambia); "Exportar ahora" descarga kanban-export-*.json kind "full" igual al estado en memoria (sin el cambio fallido) e IndexedDB queda sin cambios. El aviso se ve detrás de los diálogos y se limpia con la siguiente escritura confirmada. Decisiones del builder coherentes con el texto de AC-035. Reglas base OK: Alert/Button del design-system, solo tokens --ds-*, sin dependencias nuevas, tests unitarios + componente + e2e. Observaciones no bloqueantes: (a) el export no incluye el cambio fallido, porque la memoria solo se actualiza tras guardar (conforme al texto "estado actual en memoria"); (b) los diálogos de crear/editar dejan un rechazo de promesa sin capturar (pageerror en consola, no visible para el usuario; patrón previo a este WI)]

## WI-AC-037
- Contexto: persistencia
- Acceptance Checks: AC-037
- Depende de: [WI-AC-028]
- Rama sugerida: feature/wi-ac-037-no-indexeddb
- Estado: integrado
- Notas de implementación:
  - Al arrancar, detectar si IndexedDB no existe o si falla al abrirse. En ese caso se usa un repositorio en memoria con la misma interfaz que el de IndexedDB.
  - Aviso permanente: "Tus datos no se conservarán al cerrar". La exportación sigue funcionando.
  - Test e2e eliminando `indexedDB` con `addInitScript`.
- Historial QA: [2026-10-11 PASS — AC-037 (commit c8a9ef1). check 0 errores (1 warning conocido del design-system); test 248/248; test:e2e 52/52 (incl. los 2 nuevos de AC-037). Reproducción propia con Playwright sobre preview (puerto 4392, cerrado al terminar) en 3 escenarios: `indexedDB` eliminado, `indexedDB.open` lanzando SecurityError y apertura fallida asíncrona (VersionError, BD previa en versión 999). En los 3: aviso role=alert "Tus datos no se conservarán al cerrar" visible al arrancar y en lista, tablero, "Proyectos archivados" y "Tarjetas archivadas"; crear/editar/archivar/restaurar proyecto, crear y editar tarjetas (título y estado), filtro por tipo e import completo funcionan en memoria; "Exportar proyecto" y "Exportar todo" descargan los datos en memoria; sin aviso de error de guardado ni pageerror; tras recargar el aviso sigue y los datos no se conservan. Control: con IndexedDB disponible no hay aviso. Decisiones del builder coherentes con el texto de AC-037: Alert tone="warning" sin botón propio (AC-037 solo exige poder exportar, y los botones normales funcionan); console.warn al fallar la apertura (no visible al usuario). Reglas base OK: Alert del design-system, solo tokens --ds-*, sin dependencias nuevas, tests unitarios + componente + e2e. Observación no bloqueante: el repositorio en memoria lista en orden de inserción y el de IndexedDB por clave; no se aprecia efecto en la UI]

## WI-AC-038
- Contexto: persistencia
- Acceptance Checks: AC-038
- Depende de: [WI-AC-012]
- Rama sugerida: feature/wi-ac-038-multi-tab-sync
- Estado: integrado
- Notas de implementación:
  - Tras cada escritura correcta, se publica `{ entity, id }` por un `BroadcastChannel('kanban-board')`. Las demás pestañas releen esa entidad de IndexedDB y actualizan su store.
  - Política "último cambio gana": la última escritura confirmada sobrescribe el registro completo. No hay fusión de campos.
  - Test e2e con dos páginas del mismo contexto de navegador en Playwright.
- Historial QA: [2026-10-11 PASS — AC-038 (commit c6de5a6). check 0 errores (1 warning conocido del design-system); test 262/262; test:e2e 53/54 en dos ejecuciones completas, el único fallo es el e2e de teclado de AC-017, intermitente preexistente: aislado con --repeat-each=40, rama 2/40 vs integration/kanban-board (b45c0dc, copia con git archive fuera del repo) 3/40; integración 52/52 en su ejecución completa. Verificación independiente (vite preview en el puerto 4438, script fuera del repo, dos páginas del mismo contexto de Playwright): proyecto y tarjetas creados en A aparecen en B sin recargar ni navegar; edición sin diálogos A→X y luego B→Y deja Y en ambas, tras recargar y en IndexedDB; con los dos diálogos de edición abiertos, A guarda "A1" y B "B1": B ve llegar A1 en el tablero sin perder lo escrito y el final es B1 en ambas y tras recargar; en orden inverso (B guarda primero, A después) el final es A2 en ambas, tras recargar y en IndexedDB, con una sola tarjeta; archivar en A la quita en B; el filtro por tipo de A se refleja en B; 6 altas alternas rápidas A/B dejan 6 tarjetas en ambas. AC-035 sin regresión: con put forzado a QuotaExceededError, archivar en A muestra "No se pudieron guardar los cambios", un BroadcastChannel espía en B no recibe ningún mensaje (sí recibe con escrituras correctas) y B no cambia. AC-037 sin regresión: la pestaña sin IndexedDB muestra el aviso, crea en memoria, no publica nada y no recibe los cambios de la pestaña con IndexedDB, sin error de guardado. Sin BroadcastChannel la app crea y persiste sin errores. Sin peticiones externas. Juicio sobre lo declarado: (1) canal cerrado sin IndexedDB y no-op sin BroadcastChannel: aceptable, la regla de stack habla de cambios guardados y en memoria no hay nada guardado que compartir; (2) EditCardDialog solo carga los valores al abrirse o al cambiar de tarjeta: coherente con "gana el último cambio guardado" y con la nota de no fusionar campos (al guardar, el diálogo sobrescribe el registro completo con lo que muestra, incluido un estado o tipo que otra pestaña haya cambiado mientras estaba abierto); (3) sincronizar también el filtro por tipo y los imports: lo exige la regla de stack "los cambios guardados en una pestaña se propagan a las demás". Observación (no bloquea, preexistente: igual en integration/kanban-board): si falla el guardado al crear un proyecto, el diálogo queda abierto con el aviso de AC-035 pero se produce un pageerror no capturado "Cuota excedida". Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores, sin any, sin red; persistencia vía idb; tests unitarios y e2e)]

## WI-AC-040
- Contexto: intercambio
- Acceptance Checks: AC-040
- Depende de: [WI-AC-031, WI-AC-003]
- Rama sugerida: feature/wi-ac-040-copy-name-truncation
- Estado: integrado
- Notas de implementación:
  - Función pura de dominio `copyName(name)` (D-013): si `name + " (copia)"` cabe en 80 caracteres, lo devuelve; si no, devuelve `name.slice(0, 80 - " (copia)".length) + " (copia)"`. El nombre ya viene validado, sin espacios exteriores.
  - "Importar como copia" de WI-AC-031 usa `copyName`. El resultado debe pasar `validateProjectName`, para que el proyecto copiado se pueda editar y guardar sin cambiar el nombre.
  - Tests unitarios: nombre de 78 caracteres → primeros 72 + " (copia)", 80 en total; nombre de 72 caracteres → sin recorte. Test e2e de importar como copia con un nombre largo y después guardar la edición del proyecto sin tocar el nombre.
  - (2026-10-11) AC-040 queda precisado por AC-046 (D-020): el recorte se hace por límites de grafema y el total es como máximo 80. Se implementa y verifica en WI-AC-046.
- Historial QA: [2026-10-10 PASS — AC-040 (commit c72373b). check 0 errores (1 warning conocido del design-system); test 232/232; test:e2e 48/48 (build incluido; AC-017 de teclado pasó). Verificación independiente (vite preview en el puerto 4417, script fuera del repo) con exports reales e "Importar como copia": 78 caracteres → primeros 72 + " (copia)" (80); 72 → sin recorte (80); 73 y 80 → 72 + " (copia)"; nombre cuyo recorte deja un espacio final (71 "a" + " " + 6 "b") → "…a  (copia)" (doble espacio interno, sin espacios exteriores), pasa validateProjectName; en todos los casos sin alerta ni diálogo de error, la copia aparece en la lista, el diálogo de edición trae el nombre exacto y "Guardar cambios" sin tocar el nombre se acepta, el nombre se conserva en IndexedDB y persiste tras recargar; 375 px sin desbordamiento; sin errores de consola ni peticiones externas. Observación para spec-writer (no bloquea: la spec no define cómo se cuentan los caracteres y la app cuenta unidades UTF-16 en validateProjectName, maxlength y copyName, como prescribe la nota del WI): con un emoji en la posición del corte (71 "e" + "😀", 73 unidades) el recorte deja un surrogate suelto ("…e\ud83d (copia)"); se guarda, se edita y se lista sin error, pero el último carácter visible queda corrupto. Si se quiere contar por code points o grafemas, debe decidirse en la spec. Reglas base de stack OK (función pura en dominio, sin dependencias nuevas, sin CSS ni colores, tests unitarios y e2e)]

## WI-AC-041
- Contexto: intercambio
- Acceptance Checks: AC-041
- Depende de: [WI-AC-030]
- Rama sugerida: feature/wi-ac-041-import-full-no-confirm-when-empty
- Estado: integrado
- Notas de implementación:
  - En el flujo de import completo de WI-AC-030, si N (proyectos activos + archivados) es 0, no se abre la confirmación y se escribe el contenido directamente (D-014). Con N ≥ 1 se mantiene la confirmación de AC-030.
  - Test e2e: con almacenamiento limpio, importar un export completo muestra los proyectos sin ningún diálogo. Con 1 proyecto archivado y ninguno activo, sí aparece la confirmación.
- Historial QA: [2026-10-10 PASS — AC-041 (commit 1d42bd1). check 0 errores (1 warning conocido del design-system); test 228/228; test:e2e 47/47 (build incluido); verificación independiente (vite preview en el puerto 4391, script fuera del repo): export completo real con "Mi app" (1 tarjeta), "Otra" y "Vieja" archivada; con IndexedDB vacía, "Importar" del estado vacío no abre ningún diálogo (MutationObserver 3 s), aparecen "Mi app" y "Otra" (Vieja solo archivada), IndexedDB idéntica al export (JSON exacto) y persiste al recargar; con 1 solo proyecto archivado sí aparece la confirmación en singular y Escape no cambia nada; con 2 activos la confirmación dice 2 y Reemplazar deja los datos del archivo; 375 px sin desbordamiento. Juicio sobre lo declarado: (1) N=0 con fallo de guardado (put forzado a QuotaExceededError) → diálogo "No se pudo importar el archivo" con "No se han podido guardar los datos importados.", sin confirmación, lista sin los proyectos e IndexedDB vacía tras recargar: aceptable, coherente con el error del import de proyecto y no indica que se guardó. (2) Cambios en tests de AC-034 (App.test.ts, import-from-empty-state.spec.ts): solo sustituyen el paso de confirmación por exigir ausencia de diálogo; siguen comprobando lista, IndexedDB igual al export y recarga, y el caso de export de proyecto no se toca; AC-030 sigue cubierto por import-full.spec.ts (sin cambios) y por el nuevo e2e con 1 archivado. Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores, reutiliza Dialog existente, escritura en la transacción única de replaceAll, tests unitarios y e2e)]

## WI-AC-042
- Contexto: apariencia
- Acceptance Checks: AC-042
- Depende de: [WI-AC-024]
- Rama sugerida: feature/wi-ac-042-color-mode-selector
- Estado: integrado
- Notas de implementación:
  - Selector "Modo de color" en la cabecera común (WI-AC-001), visible en la lista de proyectos, el tablero, las tarjetas archivadas y los proyectos archivados. Se usa `Select` de `design-system` con las opciones Auto, Claro y Oscuro (valores `auto`, `light`, `dark`), o un grupo de `Chip`. En ambos casos debe poder manejarse solo con el teclado y tener el nombre accesible "Modo de color".
  - Estado `colorMode: 'auto' | 'light' | 'dark'` en un store (runes), inicialmente `auto`. Un efecto aplica el modo a `<html>`: `auto` → sin atributo `data-theme`; `light` y `dark` → `data-theme="light"` o `"dark"` (D-017). El modo del sistema lo resuelven los propios tokens (`prefers-color-scheme`); la app no lo calcula.
  - En este item no se persiste la preferencia (eso va en WI-AC-043).
  - Test e2e con `page.emulateMedia({ colorScheme })`: el color de fondo calculado del `body` coincide con el valor claro u oscuro del token `background` (`#FCFBF8` / `#1C1917`). Casos: Auto con el sistema en claro y en oscuro; Oscuro con el sistema en claro; Claro con el sistema en oscuro; volver a Auto. Comprobar en las 4 vistas que el selector existe y se maneja con el teclado.
- Historial QA: [2026-10-11 PASS — AC-042 (commit cade95b). check 0 errores (1 warning conocido del design-system); test 266/266; test:e2e 59/59 a la primera (build incluido; drag-and-drop.spec.ts:151 también pasó); verificación independiente (vite preview en el puerto 4392, script fuera del repo, 64/64 comprobaciones): sin preferencia muestra "Auto" con sistema claro y oscuro; `body` calculado = #FCFBF8 / #1C1917 en las 6 combinaciones modo × sistema (Auto sin `data-theme`, Claro/Oscuro con `data-theme="light"`/`"dark"`), sin recarga; Auto sigue en vivo un cambio del sistema y Claro forzado no; en las 4 vistas (lista, tablero, tarjetas archivadas, proyectos archivados) y con ambos sistemas el selector está en el banner con nombre accesible "Modo de color" y opciones Auto|Claro|Oscuro, se alcanza con Tab con foco visible y se cambia y vuelve a Auto solo con flechas; oscuro (por sistema y forzado): `color-scheme: dark`, contraste mínimo de texto 8.14, select 12.48, título de cabecera 14.52; 375 px sin desbordamiento en las 4 vistas y ambos modos (select 109×44 px, sin solapar el título); sin errores de consola. Juicio sobre lo declarado: etiqueta oculta con `hideLabel` aceptable — AC-042 y la nota del WI piden el selector con nombre accesible "Modo de color", no una etiqueta visible; `hideLabel` es el uso documentado del sistema de diseño (`.ds-visually-hidden`, sigue en `<label for>`). Observación no bloqueante: a la vista solo se lee "Auto/Claro/Oscuro" sin el texto "Modo de color". Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores nuevos, usa `Select` de design-system, store con runes, TS estricto, tests unitarios y e2e)]

## WI-AC-043
- Contexto: apariencia
- Acceptance Checks: AC-043
- Depende de: [WI-AC-042, WI-AC-028]
- Rama sugerida: feature/wi-ac-043-color-mode-persistence
- Estado: integrado
- Notas de implementación:
  - La preferencia se guarda en `localStorage`, clave `kanban-board:color-mode`, con valor `light` o `dark`. Con `auto` se elimina la clave. No se usa IndexedDB ni el store `prefs`, para poder aplicar el modo de forma síncrona antes de pintar.
  - Un script inline en `index.html` lee la clave y pone `data-theme` en `<html>` antes de montar la app, para evitar un destello en el modo equivocado. El store de WI-AC-042 se inicializa con el mismo valor.
  - Todo acceso a `localStorage` va en `try/catch`. Si falla (bloqueado o no disponible), el selector funciona en memoria durante la sesión, al recargar vuelve a Auto y no se muestra ningún error ni `Alert`.
  - La preferencia no forma parte del export: `buildExport` (WI-AC-028) no la incluye, y ningún import la lee ni la cambia.
  - Tests: e2e de elegir Oscuro con el sistema en claro, recargar y comprobar el modo oscuro y que el selector muestra Oscuro. Unitario de que el JSON de `buildExport` (completo y de proyecto) no contiene la preferencia. E2e de importar un archivo con Oscuro activo y comprobar que sigue en Oscuro. E2e con `localStorage` bloqueado mediante `addInitScript` (que `setItem` y `getItem` lancen excepción): el selector cambia el modo, al recargar vuelve a Auto y no aparece ningún error.
- Historial QA: [2026-10-11 PASS — AC-043 (commit a0b5213). check 0 errores (1 warning conocido del design-system); test 274/274; build OK; test:e2e 63/63 a la primera (build incluido; drag-and-drop.spec.ts:151 también pasó). Verificación independiente (vite preview en el puerto 4180, script fuera del repo): `dist/index.html` lleva el script inline síncrono antes del módulo y del CSS; con "dark" guardado y el JS de la app abortado, `<html data-theme="dark">`, `#app` vacío y `body` #1C1917 (el script inline lo aplica sin la app); `data-theme="dark"` ya presente al parsear el `<script type="module">` y el `<body>` (sin destello); valores guardados "DARK", "foo", "" y "auto" → selector Auto, sin `data-theme`, sigue al sistema y la clave queda borrada; con el getter de `window.localStorage` lanzando SecurityError (bloqueo real, además del e2e del builder sobre `Storage.prototype`): Oscuro/Claro funcionan en la sesión, al recargar vuelve a Auto sin `data-theme`, 0 alert, 0 diálogos, 0 errores ni avisos de consola. Export completo y de proyecto sin la preferencia (claves cards/exportedAt/formatVersion/kind/projects) e importar export completo, de proyecto, uno con campos de modo ajenos y uno roto no la cambia (e2e); `localStorage` solo se usa en `src/state/color-mode.svelte.ts` e `index.html`, ningún código de import/export lo toca. Juicio sobre lo declarado: (1) valor que no sea `light`/`dark` → Auto aceptable — D-017 fija "Auto" por defecto y la nota del WI solo admite esos dos valores, y el script inline hace lo mismo (sin divergencia entre pintado y app); (2) con Auto se borra la clave también al montar aceptable — la nota del WI dice "Con `auto` se elimina la clave" y solo limpia valores inválidos. Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores nuevos, try/catch en todo acceso, TS estricto, tests unitarios y e2e)]

## WI-AC-044
- Contexto: persistencia
- Acceptance Checks: AC-044
- Depende de: [WI-AC-035, WI-AC-043]
- Rama sugerida: feature/wi-ac-044-no-uncaught-save-errors
- Estado: integrado
- Notas de implementación:
  - Origen (D-018): `observeWrites` (`src/persistence/repository.ts`) avisa a `saveError` y vuelve a lanzar el error. Los métodos de `AppStore` (`src/state/app-store.svelte.ts`) lo propagan sin capturarlo, y está bien que lo hagan: así la UI no indica que se guardó. El rechazo sin capturar nace en los `submit` de `src/views/CreateProjectDialog.svelte`, `EditProjectDialog.svelte`, `CreateCardDialog.svelte` y `EditCardDialog.svelte`, que usan `try { await …; open = false } finally { saving = false }` **sin `catch`**. El manejador de `onsubmit` devuelve una promesa rechazada que nadie atiende.
  - Corrección: añadir `catch` en esos 4 `submit`. Si el guardado falla, el diálogo sigue abierto (`open` no pasa a `false`), `saving` vuelve a `false` y los valores escritos se conservan. El aviso de AC-035 ya lo pinta `App.svelte` a partir de `store.saveError`, así que no hace falta ningún mensaje nuevo en el diálogo. Se puede registrar el fallo con `console.error`, igual que hacen `Board.svelte`, `ArchivedCards.svelte`, `ArchivedProjects.svelte` y `ProjectList.svelte` (permitido por AC-044).
  - No cambiar el contrato del store (sus métodos siguen rechazando) ni la lógica de `saveError`. No silenciar los errores con un manejador global de `unhandledrejection`: AC-044 pide tratarlos en cada flujo.
  - El resto de flujos ya capturan el error en el código actual: archivar, restaurar y borrar proyecto (`ProjectList`, `ArchivedProjects`), archivar, restaurar y borrar tarjeta (`Board`, `ArchivedCards`), mover tarjeta (`Board.handleFinalize`), filtro por tipo (`Board.setTypeSelected`), imports (`ImportFlow`) y modo de color (`saveColorMode` con `try/catch`). Aun así, el e2e debe cubrirlos todos: lo que cuenta es la evidencia, no la lectura del código. Si alguno produce `pageerror`, se corrige en este mismo item.
  - Test e2e nuevo (p. ej. `e2e/no-uncaught-save-errors.spec.ts`). Reutilizar el mecanismo de `e2e/save-error.spec.ts`: `addInitScript` que hace lanzar `QuotaExceededError` a las escrituras de `IDBObjectStore` (put/add/delete/clear) mientras `window.__failWrites` es `true`. Antes de cada flujo, registrar `page.on('pageerror')` y `page.on('console')`. Al final de cada flujo, comprobar que no hubo ningún `pageerror` y ningún mensaje de consola que contenga "Uncaught" (incluido "Uncaught (in promise)"). Los `console.error` y `console.warn` controlados están permitidos.
  - Flujos que debe recorrer el e2e (lista literal de AC-044): crear, editar, archivar, restaurar y borrar definitivamente proyecto; crear, editar, archivar, restaurar y borrar definitivamente tarjeta; mover tarjeta con ratón, con táctil (viewport móvil con `hasTouch`, como en el e2e de AC-017) y con teclado; import completo (confirmado), import de proyecto nuevo, "Reemplazar" e "Importar como copia"; cambiar el filtro por tipo. En todos, además, comprobar lo visible de AC-035: aviso "No se pudieron guardar los cambios" con "Exportar ahora" y la UI sin indicar que se guardó. En crear y editar proyecto y tarjeta, comprobar también que el diálogo sigue abierto.
  - Caso del modo de color: con `localStorage.setItem` y `removeItem` forzados a lanzar (`QuotaExceededError`) mediante `addInitScript`, cambiar el selector a Oscuro, a Claro y a Auto. No debe haber `pageerror` ni "Uncaught". Aquí no se exige el aviso de AC-035: AC-043 dice que este fallo no muestra error.
  - Tests de componente: en los 4 diálogos, con un `oncreate`/`onsave` que rechaza, el diálogo sigue abierto, el botón deja de estar en `loading` y la promesa del submit no queda rechazada sin capturar.
- Historial QA: [2026-10-11 PASS — AC-044 (commit ca873bf). check 0 errores (1 warning conocido del design-system); test 278/278; build OK; test:e2e 80/80 a la primera (build incluido; los 16 de AC-044 y drag-and-drop.spec.ts:151 pasaron). Verificación independiente con Playwright sobre vite preview (puertos 4391 y 4392, cerrados al terminar; script fuera del repo), escuchando `pageerror` y toda la consola, en 13 recorridos que cubren crear/editar/archivar/restaurar/borrar proyecto, crear/editar/archivar/restaurar tarjeta, mover con ratón y con teclado, import completo, "Importar como copia" y "Reemplazar", filtro por tipo y modo de color con `localStorage` fallando. Con `QuotaExceededError` síncrono en put/add/delete/clear y con aborto asíncrono de la transacción (otro mecanismo, en microtarea): 0 `pageerror`, 0 "Uncaught" en todos; aviso "No se pudieron guardar los cambios" con "Exportar ahora" en todos los flujos de IndexedDB; diálogos de crear/editar abiertos con lo escrito; nada cambia tras recargar; solo `console.error` controlados. Comparación con `integration/kanban-board` (build propio, mismo script): 1 `pageerror` "Cuota excedida" en crear/editar proyecto y crear/editar tarjeta, 0 en el resto → el defecto existía y lo corrige este WI. `dist/assets/*.js` no contiene `unhandledRejection` ni `trackUnhandledRejections`; `src/views/unhandled-rejections.ts` solo lo importan los `.test.ts`. Juicio sobre lo declarado: (1) filtro por tipo aceptable — se aplica en memoria al pulsar (comportamiento del store desde WI-AC-018/035, sin cambios aquí), no hay indicación de éxito, aparece el aviso y tras recargar no se recordó; AC-035 pide "no indica que se guardó", no revertir la vista (nota: el Historial de WI-AC-035 decía que la UI no mostraba el cambio también en el filtro; en realidad el chip queda pulsado en la sesión); (2) teclado aceptable — el guardado se intenta al entrar en otra columna, falla, la tarjeta vuelve a "Sin empezar" y no queda en otra columna; (3) `console.error` en los catch permitido por AC-044/P-2; (4) utilidad de test fuera del bundle. Observación no bloqueante: si la transacción se aborta de forma síncrona entre dos `put` de la misma transacción (simulación artificial, no reproducible con un fallo real del navegador), `saveCard`/`deleteCard`/`deleteProject`/`replaceAll` dejan promesas de petición sin atender (`pageerror` AbortError); también ocurre igual en integración y no es un flujo de AC-044. Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores, TS estricto, tests de componente y e2e)]

## WI-AC-045
- Contexto: apariencia
- Acceptance Checks: AC-045
- Depende de: [WI-AC-042]
- Rama sugerida: feature/wi-ac-045-visible-color-mode-label
- Estado: integrado
- Notas de implementación:
  - D-019 (opción B): quitar `hideLabel` del `Select` en `src/lib/ColorModeSelect.svelte`. El `Field` del design-system renderiza entonces la `<label for>` "Modo de color" visible y **encima** del `<select>` (`.ds-field` en columna). No se modifica nada en `design-system/`. No se añade texto propio ni `aria-label`, para no duplicar el nombre accesible.
  - Revisar la maquetación de la cabecera en `src/lib/AppHeader.svelte` (`.app-header` y `.app-header__actions`, hoy con `align-items: center`): al crecer el bloque del selector, la cabecera tiene que seguir sin desbordar a 375 px. Si hace falta ajustar algo (alineación, `flex-wrap`, `min-width: 0`…), se hace solo con variables `--ds-*` existentes. Si faltara un token (p. ej. un breakpoint), no se inventa: se devuelve a `design-builder`.
  - Actualizar el comentario de cabecera de `ColorModeSelect.svelte`, que hoy describe la etiqueta oculta.
  - Test e2e, en las 4 vistas (lista de proyectos, tablero, tarjetas archivadas y proyectos archivados):
    - El texto "Modo de color" del banner está visible (`toBeVisible`), no lleva la clase `ds-visually-hidden`, mide más de 0 y queda dentro del viewport.
    - El `bottom` del `boundingBox` de la etiqueta es ≤ que el `top` del `<select>`.
    - Es una `<label>` cuyo `for` apunta al `<select>`: tras hacer clic en el texto, el foco está en el selector.
    - `getByRole('combobox', { name: 'Modo de color' })` sigue resolviendo a un único elemento y se maneja con el teclado (Tab y flechas), como en AC-042.
    - Con un viewport de 375×667: `document.documentElement.scrollWidth` ≤ 375; la etiqueta y el selector están enteros dentro del viewport; sus rectángulos no se cruzan con los de otros elementos de la cabecera (título "Kanban de proyectos").
  - Revisar que los e2e y tests existentes de AC-042 y AC-043 (`e2e/color-mode*.spec.ts`, `src/App.test.ts`) siguen pasando. Si alguno daba por hecho que la etiqueta estaba oculta, se ajusta.
- Historial QA: [2026-10-11 PASS — AC-045 (commit 9f71507). check 0 errores (1 warning conocido del design-system); test 279/279; test:e2e 82/82 a la primera (build incluido; drag-and-drop.spec.ts:151 pasó). Diff contra integration/kanban-board: solo quita `hideLabel` y actualiza el comentario en ColorModeSelect.svelte, más un test de componente (App.test.ts) y e2e/color-mode-label.spec.ts; AppHeader.svelte y design-system/ sin cambios. Verificación independiente con Playwright sobre vite preview (puerto 4451, cerrado al terminar; script fuera del repo), en las 4 vistas (lista, tablero, tarjetas archivadas, proyectos archivados) × 1280×720, 375×667 y 320×568 × colorScheme claro y oscuro (24 combinaciones), con un nombre de proyecto largo: un único combobox "Modo de color", la etiqueta es una <label for> que apunta al <select>, sin `ds-visually-hidden` ni `aria-label` en el select; label 109×19,6 px, borde inferior 31,6 ≤ borde superior del select 35,6 (a 320 px 51,2 ≤ 55,2); etiqueta y selector enteros dentro del viewport; clic en el texto → foco en el select; con el foco, ArrowDown cambia a "Claro" y ArrowUp vuelve a "Auto"; desde el inicio de la página el select es la primera parada de Tab (1280/375/320); scrollWidth = ancho del viewport (1280/375/320); ningún otro elemento de la cabecera se cruza con la etiqueta ni con el selector (a 375: título termina antes de x=250). Legibilidad: 14 px, peso 500, Inter Variable, line-height 19,6 px (select 16 px); contraste etiqueta/fondo de cabecera 15,78:1 en claro y 14,52:1 en oscuro (también con "Oscuro" forzado desde el selector en sistema claro). Sin pageerror. Capturas revisadas: cabecera equilibrada, etiqueta alineada a la izquierda del selector, altura de cabecera 92,6 px. Observación (no bloquea, fuera del AC que fija 375 px): a 320 px la etiqueta se parte en dos líneas ("Modo de / color") y el título también, la cabecera crece a 112 px, sin desbordamiento ni solapes. Reglas base de stack OK (sin dependencias nuevas, sin CSS ni colores, sin tocar design-system/, test de componente y e2e)]

## WI-AC-046
- Contexto: intercambio
- Acceptance Checks: AC-046
- Depende de: [WI-AC-040]
- Rama sugerida: feature/wi-ac-046-grapheme-safe-truncation
- Estado: integrado
- Notas de implementación:
  - Precisa AC-040 y D-013 según D-020: los límites se siguen contando en unidades UTF-16. No cambian `validateProjectName`, `validateCardTitle`, `PROJECT_NAME_MAX_LENGTH`, el límite de 120 ni ningún `maxlength`.
  - Nueva función pura de dominio para cualquier recorte por longitud, p. ej. `truncateToGraphemes(text, maxUnits)`. Devuelve el prefijo más largo formado por grafemas completos (`Intl.Segmenter` con `granularity: 'grapheme'`) cuya `length` (UTF-16) es ≤ `maxUnits`. Nunca parte un grafema, un par surrogate ni una secuencia ZWJ. Sin dependencias nuevas: `Intl.Segmenter` es nativo y su tipo está en el `lib` `ES2022` del `tsconfig.json`.
  - `copyName(name)` en `src/domain/exchange.ts`. Hoy hace `name.slice(0, PROJECT_NAME_MAX_LENGTH - COPY_SUFFIX.length)` y puede dejar un surrogate suelto. Pasa a ser:
    - Si `name + COPY_SUFFIX` cabe en 80 unidades → se devuelve sin cambios.
    - Si no → `truncateToGraphemes(name, 80 - COPY_SUFFIX.length)` (72 unidades) + `COPY_SUFFIX`.
    - Si el recorte queda vacío (el primer grafema no cabe) → `"(copia)"` sin espacio delante, es decir, `COPY_SUFFIX.trimStart()`.
    - Si el recorte termina en un espacio, se conserva: queda un espacio interno ("…a  (copia)", ya aceptado en AC-040). No se aplica `trim` al prefijo.
    - El resultado nunca tiene espacios exteriores y siempre pasa `validateProjectName`.
  - Actualizar el JSDoc de `copyName` ("exactamente ese máximo" pasa a "como máximo") y el comentario de `copyImportedProject`.
  - Tests unitarios de `copyName` con los cinco ejemplos de AC-046, comprobando el valor exacto y la `length`:
    - (a) 71 "e" + "😀" → 71 "e" + " (copia)", 79 unidades.
    - (b) 68 "e" + "👨‍👩‍👧" → 68 "e" + " (copia)", 76.
    - (c) 70 "e" + "😀" + "xyz" → 70 "e" + "😀" + " (copia)", 80.
    - (d) 78 ASCII → primeros 72 + " (copia)", 80.
    - (e) "a" + 79 × U+0301 → "(copia)", 7.
    - Más los casos ya existentes de AC-040 (72 caracteres sin recorte; recorte que termina en espacio).
    - En todos, el resultado no contiene surrogates aislados y `validateProjectName(result)` es `null`.
  - Tests unitarios de la función de recorte por separado: un grafema que no cabe se descarta entero; `maxUnits` 0; texto vacío.
  - Comprobación de "sin surrogates aislados": `String.prototype.isWellFormed()` es ES2024 y no está en el `lib` actual (`ES2022`). En los tests, usar una expresión regular de surrogates aislados o una aserción de tipo local. No ampliar el `lib` del `tsconfig` solo para esto, salvo que no haya otra opción razonable.
  - Test e2e (ampliar `e2e/copy-name-truncation.spec.ts`). Con exports reales de proyecto y "Importar como copia", en los cinco casos (a)–(e): la importación termina sin error; el proyecto copiado aparece en la lista con el nombre exacto; en el navegador, `name.isWellFormed()` es `true`; abrir "Editar proyecto" y "Guardar cambios" sin tocar el nombre se acepta, y el nombre se conserva en IndexedDB y tras recargar.
- Historial QA: [2026-10-11 PASS — AC-046 (commit a072b69). check 0 errores (1 warning conocido del design-system); test 296/296; test:e2e 87/87 a la primera (build incluido; drag-and-drop.spec.ts:151 pasó). Diff contra integration/kanban-board: solo src/domain/text.ts (+test), copyName y JSDoc en exchange.ts (+tests), export en domain/index.ts y e2e/copy-name-truncation.spec.ts; sin dependencias nuevas, sin cambios en tsconfig, package.json, design-system/, project.ts, card.ts ni vistas. Afirmaciones del builder comprobadas: (1) grep de slice/substring/substr/truncat en src (sin tests): el único recorte por longitud es copyName→truncateToGraphemes (el slice de repository.ts quita un prefijo de clave, no recorta por longitud); (2) validateProjectName/validateCardTitle, PROJECT_NAME_MAX_LENGTH=80, CARD_TITLE_MAX_LENGTH=120 y los maxlength={PROJECT_NAME_MAX_LENGTH} de Crear/Editar proyecto sin cambios (maxlength=80 en el DOM; los diálogos de tarjeta siguen sin maxlength). Verificación independiente con Playwright sobre vite preview (puerto 4462, cerrado al terminar junto con sus procesos huérfanos; script fuera del repo), con export real de proyecto + "Importar como copia", contexto nuevo por caso: (a) 73u→79u, (b) 76u→76u, (c) 75u→80u con 😀 conservado, (d) 78 ASCII→primeros 72 + " (copia)" 80u, (e) a+79×U+0301→"(copia)" 7u. Casos propios: banderas 70e+🇪🇸→78u, 71e+🇪🇸→79u, 68e+🇪🇸🇫🇷→68e+🇪🇸 (copia) 80u; tono de piel 69e+👍🏽→77u, 68e+👍🏽xyz→80u con 👍🏽 entero; ZWJ con tono 66e+👩🏽‍💻→74u; emoji que termina justo en la unidad 72 (70e+😀zzzz)→80u conservado, emoji en unidades 72–73 (71e+😀b)→79u, emoji en 73–74 (72e+😀)→80u; recorte que termina en espacio 71a+" 😀b"→"…a  (copia)" 80u y 70a+" 😀"→"…a  (copia)" 79u; AC-040 72 caracteres sin recorte 80u. En los 17: nombre exacto visible en la lista, isWellFormed() true en el navegador, sin espacios exteriores, ≤80u, sin alert ni pageerror; Editar proyecto → Guardar cambios sin tocar el nombre se acepta y el nombre se conserva en IndexedDB tras recargar. Crear un proyecto de 80u con emoji (78e+😀) se acepta (validación en UTF-16 sin cambios). Reglas base de stack OK (función pura de dominio, Intl.Segmenter nativo, tests unitarios y e2e)]

## WI-AC-047
- Contexto: apariencia
- Acceptance Checks: AC-047
- Depende de: []
- Rama sugerida: feature/wi-ac-047-font-icons-deps
- Estado: integrado
- Notas de implementación:
  - Base técnica del rediseño (D-021). Todos los demás items del rediseño dependen de este.
  - Dependencias de la app con npm (no pnpm): añadir `@lucide/svelte` (la `peerDependency` del design-system, misma versión mayor `^1.55`) y `@fontsource-variable/plus-jakarta-sans`; quitar `@fontsource-variable/inter`. `@fontsource/jetbrains-mono` se queda (la lista de proyectos usa `family.mono`).
  - `src/main.ts`: importar `@fontsource-variable/plus-jakarta-sans` en lugar de Inter, una sola vez, junto a `tokens.css`.
  - `vite.config.ts`: `design-system/` tiene ahora su propio `node_modules` (con `svelte` y `@lucide/svelte`). Añadir `'@lucide/svelte'` a `resolve.dedupe` (ya está `'svelte'`) para que haya una sola instancia de Lucide en la app. Comprobar que Vitest también compila los componentes nuevos (`Icon`, `Column`, `DropPlaceholder`) del design-system con `inline: ['design-system']`.
  - `npm run check` debe seguir en 0 errores con los `.svelte` nuevos del design-system (`Icon.svelte` usa `Component<any>` explícito). Si `svelte-check` o el build fallan dentro de `design-system/`, el defecto se devuelve a `design-builder` y no se parchea en la app.
  - No hace falta tocar vistas en este item: la paleta índigo/slate y los radios nuevos llegan por tokens.
  - Test e2e nuevo (p. ej. `e2e/redesign-theme.spec.ts`), en lista de proyectos, tablero, tarjetas archivadas y proyectos archivados:
    - `getComputedStyle(document.body).fontFamily` empieza por `"Plus Jakarta Sans Variable"`; tras `await document.fonts.ready`, `document.fonts.check('16px "Plus Jakarta Sans Variable"')` es `true`.
    - Con el selector en "Claro", `body` tiene `background-color` `rgb(248, 250, 252)`; en "Oscuro", `rgb(15, 23, 42)`.
    - En la lista, el botón "Crear proyecto" tiene `background-color` `rgb(79, 70, 229)` en claro y `rgb(139, 147, 250)` en oscuro.
  - Los e2e de AC-042 y AC-045 siguen pasando sin cambios. Revisar los que comparan colores con los valores antiguos (ámbar/stone) y actualizarlos a los tokens nuevos.
- Historial QA: [2026-10-12 PASS — AC-047 (commit aa0dca9). check 266 archivos, 0 errores, 0 warnings (desaparece el warning conocido del design-system); test 296/296; test:e2e 89/89 (incluye e2e/redesign-theme.spec.ts: fuente computada "Plus Jakarta Sans Variable" y `document.fonts.check` true en las 4 vistas, fondo `background` en claro/oscuro, "Crear proyecto" en `action.primary` claro/oscuro). Diff contra integration/kanban-board: package.json (+@lucide/svelte ^1.55.0, +@fontsource-variable/plus-jakarta-sans, −Inter, justificado por D-021), main.ts (import de la fuente), vite.config.ts (`dedupe` + '@lucide/svelte'), constantes de fondo de los 2 e2e de modo de color actualizadas a los tokens nuevos, e2e nuevo y su módulo de apoyo. Comprobado aparte: el CSS de dist/ no contiene ninguna fuente Inter y sí plus-jakarta-sans-latin-wght; `npm ls @lucide/svelte` muestra una sola instancia (la de design-system "deduped"). Sin cambios en design-system/ ni en vistas. Reglas base de stack OK (npm, dependencias justificadas por D-021, sin valores sueltos)]

## WI-AC-048
- Contexto: apariencia
- Acceptance Checks: AC-048
- Depende de: [WI-AC-047]
- Rama sugerida: feature/wi-ac-048-appbar-header
- Estado: integrado
- Notas de implementación:
  - D-028. `src/lib/AppHeader.svelte`: fondo `--ds-color-appbar-bg`, color `--ds-color-appbar-fg`, `box-shadow: var(--ds-shadow-sm)` y borde inferior `var(--ds-appbar-accent-width) solid var(--ds-color-appbar-accent)`.
  - El título "Kanban de proyectos" pasa a ser un enlace `<a href={LIST_HREF}>` con `Icon` `SquareKanban` (decorativo, sin `label`) delante. Foco visible con `--ds-color-focus` como los demás enlaces. El enlace hereda el color de la barra (no `action.primary`).
  - El selector "Modo de color" no cambia (AC-042, AC-045). Revisar que la cabecera sigue sin desbordar a 375 px con el icono añadido; ajustes solo con variables `--ds-*`.
  - Test e2e: en las 4 vistas, en claro y oscuro: `background-color` de la cabecera `rgb(255, 255, 255)` / `rgb(30, 41, 59)`; `border-bottom` 3 px `solid` `rgb(79, 70, 229)` / `rgb(139, 147, 250)`; `box-shadow` ≠ `none`; existe `svg.lucide-square-kanban` dentro de un ancestro con `aria-hidden="true"`; `getByRole('link', { name: 'Kanban de proyectos' })` lleva a la lista desde el tablero y desde las dos vistas de archivados. El e2e de AC-045 (incluido 375 px) sigue pasando.
- Historial QA: [2026-10-12 PASS — AC-048 (commit 652f644). check 268 archivos 0 errores 0 warnings; test 296/296; test:e2e 91/91. e2e/redesign-header.spec.ts: en las 4 vistas y en claro/oscuro la cabecera tiene background `appbar.bg`, border-bottom 3px solid `appbar.accent`, box-shadow ≠ none y `svg.lucide-square-kanban` dentro de aria-hidden; el enlace "Kanban de proyectos" lleva a la lista desde el tablero y las dos vistas de archivados. AC-042/AC-045 siguen pasando, incluido 375 px sin desbordamiento ni solape etiqueta/título. Juicio sobre el cambio en los e2e de AC-042/AC-045: el selector pasa a ser la 2.ª parada de Tab (tras el enlace del título); AC-042 exige manejo con teclado, no que sea la primera parada, así que es aceptable. Diff: solo AppHeader.svelte (tokens appbar.*, shadow.sm, appbar.accent-width, sin valores sueltos) y tests. Reglas base de stack OK]
## WI-AC-049
- Contexto: tablero
- Acceptance Checks: AC-049
- Depende de: [WI-AC-047]
- Rama sugerida: feature/wi-ac-049-board-columns-ds
- Estado: qa
- Notas de implementación:
  - D-023, D-024. `src/views/Board.svelte`: cada columna pasa de `<section class="board__column">` + `<h2>` propios a `Column` del design-system, con `title={CARD_STATUS_LABELS[status]}`, `status={CARD_STATUS_DS[status]}`, `headingLevel={2}` y `count` = número de tarjetas visibles de esa columna (de `cardsByStatus`, es decir, activas y que pasan el filtro; no de `columnItems`, para que el contador no cambie con el hueco del arrastre). El texto accesible por defecto de `Column` ("N tarjeta"/"N tarjetas") es el que pide AC-049: no pasar `countLabel`.
  - Añadir `CARD_STATUS_DS` a `domain` (bloque "Sistema de diseño (2026-10-12)").
  - La `<ul use:dndzone>` actual va dentro del cuerpo de `Column` (snippet `children`), con su `aria-label` y toda la lógica de arrastre sin cambios. El botón "Añadir tarjeta" se queda de momento como está (lo cambia WI-AC-050). El borde de destino actual (`board-drop-target`) se queda de momento (lo cambia WI-AC-051).
  - `Column` no acepta atributos extra (`data-*`, `class`). Si tests o estilos usan `section[data-status]` o `.board__column`, mover `data-status` a un contenedor propio de la app que envuelva a `Column` o a la `<ul>`, y actualizar esos selectores. No se modifica `design-system/`.
  - Contenedor de columnas: `Column` tiene ancho fijo (`column.width`, `flex: 0 0`). Cambiar la rejilla actual (`grid` + `--board-column-min-width` calculado) por un contenedor flex con `overflow-x: auto`, de forma que AC-020 siga pasando (4 columnas desplazables dentro del tablero a 375 px, la página sin scroll horizontal). Mantener el hueco para el anillo de foco.
  - Test e2e: para cada columna (`getByRole('region', { name })`), en claro y oscuro, comparar `background-color` de la cabecera y `border-top` (4 px, color) con los valores de `status.*` de la tabla "Paleta de colores"; comprobar los iconos `svg.lucide-circle-dashed|circle-dot|circle-pause|circle-check` dentro de `aria-hidden`; contador "2"/"0" con texto accesible "2 tarjetas"/"0 tarjetas" y "1 tarjeta" con 1; con filtro "Arreglo", el contador de "En curso" pasa de 3 a 1 y vuelve a 3. Actualizar los e2e existentes que dependían de la estructura antigua de columna (`board-columns`, `auto-sort`, `type-filter`, `mobile-layout`, `drag-and-drop`…).
- Historial QA: []

## WI-AC-050
- Contexto: tablero
- Acceptance Checks: AC-050
- Depende de: [WI-AC-049]
- Rama sugerida: feature/wi-ac-050-add-card-header-button
- Estado: pendiente
- Notas de implementación:
  - D-025. En `Board.svelte`, quitar el botón "Añadir tarjeta" del pie de la columna y ponerlo en el snippet `actions` de `Column`: `<Button variant="ghost" size="sm" icon={Plus} aria-label={`Añadir tarjeta en ${CARD_STATUS_LABELS[status]}`} onclick={() => onaddcard?.(status)} />`.
  - Solo si el proyecto no está archivado (en solo lectura no se pasa `actions`).
  - Actualizar todos los tests que buscan `getByRole('button', { name: 'Añadir tarjeta' })` (tests de componente de `Board`, e2e de crear tarjeta, validación de título, orden automático, filtro, archivado, solo lectura, import, sincronización entre pestañas, AC-044…) para que usen "Añadir tarjeta en <estado>". Ningún test debe seguir encontrando un botón con nombre exacto "Añadir tarjeta".
  - Test e2e: en cada columna existe el botón con ese nombre y `svg.lucide-plus` dentro de `aria-hidden`; se alcanza con Tab y se activa con Intro y con Espacio; abre el diálogo de creación con el estado de la columna (AC-010 con "En curso"); en un proyecto archivado no existe ningún "Añadir tarjeta en …".
- Historial QA: []

## WI-AC-051
- Contexto: tablero
- Acceptance Checks: AC-051
- Depende de: [WI-AC-049]
- Rama sugerida: feature/wi-ac-051-empty-column-drop-target
- Estado: pendiente
- Notas de implementación:
  - D-023. Columna sin tarjetas visibles (`columnItems[status]` vacío): renderizar `<DropPlaceholder label="Sin tarjetas" />` dentro del cuerpo de `Column`, también en solo lectura. Debe seguir siendo posible soltar en esa columna: el placeholder no puede tapar ni sustituir la `<ul use:dndzone>` (p. ej. va dentro de la zona o justo después, con la zona conservando su alto mínimo). Comprobar que no rompe la navegación por teclado de `svelte-dnd-action`.
  - Hueco del arrastre: el elemento sombra de `svelte-dnd-action` (`card[SHADOW_ITEM_MARKER_PROPERTY_NAME]`) se renderiza como `<DropPlaceholder active />` en lugar de `Card` con `dragging`. Ojo con `reflectDragging()`: hoy copia el `className` del `article` de la sombra a la copia que sigue al puntero. Con la sombra como `DropPlaceholder` ya no hay `article` del que copiar; en su lugar, en `transformDraggedElement`, añadir la clase `ds-card--dragging` al `article` de la copia (la copia ya conserva la clase de ámbito de Svelte del `Card` original, así que el selector con ámbito del design-system aplica). La tarjeta arrastrada debe seguir viéndose con sombra `lg` y giro.
  - Columna destino: `dropTarget` de `Column` = la columna contiene el elemento sombra durante un arrastre (`columnItems[status].some(isShadow)`). Al soltar o cancelar no queda ninguna. Quitar la clase propia `board-drop-target` y su CSS (`dropTargetClasses`/`dropTargetStyle` vacíos), porque el destino lo pinta `Column`.
  - El contador de `Column` sigue saliendo de `cardsByStatus` (WI-AC-049), no cambia durante el arrastre.
  - Test e2e (ratón, en claro): columna vacía muestra "Sin tarjetas" con `svg.lucide-inbox` y borde `dashed`; con filtro que deja una columna sin tarjetas visibles, también. Durante un arrastre (`mouse.down` + `mouse.move` sin soltar) sobre otra columna: borde izquierdo/derecho/inferior de esa columna `rgb(79, 70, 229)`; existe un bloque con borde `dashed` `rgb(79, 70, 229)`, fondo `rgb(238, 242, 255)` y `svg.lucide-arrow-down-to-line`; si la columna estaba vacía, "Sin tarjetas" no está visible. Tras soltar y tras Escape: ninguna columna con borde `action.primary`, ningún hueco activo. Los e2e de AC-015, AC-016 y AC-017 (teclado y táctil) siguen pasando.
- Historial QA: []

## WI-AC-052
- Contexto: tablero
- Acceptance Checks: AC-052
- Depende de: [WI-AC-047]
- Rama sugerida: feature/wi-ac-052-priority-stripe-icons
- Estado: pendiente
- Notas de implementación:
  - D-026, D-016. Añadir `PRIORITY_DS` a `domain` y `PRIORITY_ICON` a `src/lib/icons.ts` (bloque "Sistema de diseño (2026-10-12)").
  - `Board.svelte`: pasar `priority={card.priority ? PRIORITY_DS[card.priority] : undefined}` a `Card`; el `Badge` de prioridad recibe `icon={PRIORITY_ICON[card.priority]}` sin cambiar su `tone` ni su texto. Los `Badge` de tipo y los `Chip` del filtro ya muestran sus iconos por defecto del design-system (`CATEGORY_ICONS`); no hace falta pasar `icon`.
  - No tocar la vista de tarjetas archivadas (la cubre WI-AC-056).
  - Test e2e, en claro y oscuro: tarjeta Alta / Media / Baja con `border-top` 4 px del color de `priority.*` (valores de AC-052); tarjeta sin prioridad con `border-top` 1 px del color `border.default` (claro `rgb(226, 232, 240)`, oscuro `rgb(51, 65, 85)`) y sin etiqueta de prioridad; iconos `svg.lucide-arrow-up|equal|arrow-down` en las etiquetas de prioridad y `sparkles|trending-up|bug|wrench` en las de tipo; en el filtro, cada chip con el icono de su tipo y el seleccionado además con `svg.lucide-check`; todos dentro de `aria-hidden`. Los e2e de AC-013, AC-014, AC-018 y AC-039 siguen pasando (sus nombres accesibles no cambian).
- Historial QA: []

## WI-AC-053
- Contexto: tablero
- Acceptance Checks: AC-053
- Depende de: [WI-AC-052]
- Rama sugerida: feature/wi-ac-053-card-footer-date-archive
- Estado: pendiente
- Notas de implementación:
  - D-030, D-027. Nueva función de formato (p. ej. `formatCreatedDate(iso)` en `src/lib/`) con `Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })` en hora local → "Creada el 9 oct 2026". Test unitario con una fecha fija. Comprobar literalmente el caso de octubre del AC ("Creada el 9 oct 2026"); para otros meses, comparar con la salida del propio `Intl.DateTimeFormat` y no con un texto fijo, porque la abreviatura de algunos meses depende de la versión de ICU (p. ej. "sept"/"sep").
  - Pie de cada tarjeta del tablero: `Icon` `Calendar` (`size="sm"`, decorativo) + texto "Creada el …" dentro de un `<time datetime={card.createdAt}>` (o junto a él), a la izquierda. En proyectos activos, a la derecha, el botón "Archivar" pasa a solo icono: `<Button variant="ghost" size="sm" icon={Archive} aria-label={`Archivar ${card.title}`} onclick={() => archive(card)} />`. En solo lectura, solo la fecha.
  - Actualizar los tests que buscan el botón "Archivar" de la tarjeta por nombre exacto (archivado de tarjetas, AC-044, sincronización…) para usar "Archivar {título}". Ojo: en la lista de proyectos el botón "Archivar {nombre}" de proyecto ya usa ese patrón; los tests deben seguir distinguiendo ambos por vista.
  - Test e2e: tarjeta creada con el reloj fijado (`page.clock`) el 9 de octubre de 2026 muestra "Creada el 9 oct 2026" con `svg.lucide-calendar` en `aria-hidden`; editar la tarjeta no cambia el texto; botón `Archivar <título>` con `svg.lucide-archive`, sin ningún botón de texto visible "Archivar" dentro de la tarjeta; pulsarlo archiva (AC-021). En un proyecto archivado, la fecha está y el botón no.
- Historial QA: []

## WI-AC-054
- Contexto: proyectos
- Acceptance Checks: AC-054
- Depende de: [WI-AC-049]
- Rama sugerida: feature/wi-ac-054-project-status-pills
- Estado: pendiente
- Notas de implementación:
  - D-029. `src/views/ProjectList.svelte`: el `<dl class="status-counts">` actual se mantiene como estructura (cada estado es un par `dt`/`dd`, texto accesible), pero cada `.status-counts__item` pasa a ser una pastilla: `background: var(--ds-color-status-<x>-tint)`, `color: var(--ds-color-status-<x>-on-tint)`, `border-radius: var(--ds-radii-full)`, relleno con `--ds-spacing-*`, e `Icon` de `STATUS_ICON[status]` (`size="sm"`, decorativo) con `color: var(--ds-color-status-<x>-accent)`. La correspondencia estado → `<x>` sale de `CARD_STATUS_DS` (WI-AC-049).
  - Los 4 estados se muestran siempre, también con 0. Se puede quitar el `':'` generado tras el `dt` si la pastilla queda más clara, mientras el nombre y el número sigan siendo texto.
  - Estos pares (`on-tint`/`tint`, `accent`/`tint`) ya están validados en el design-system; no se crean colores nuevos.
  - Test e2e, en claro y oscuro: con 2 tarjetas en "Sin empezar" y 1 en "En curso", hay 4 pastillas en orden con 2, 1, 0 y 0 (AC-008); cada una con el icono `svg.lucide-circle-*` de su estado en `aria-hidden` y `background-color`/`color` de `status.<x>.tint`/`.on-tint`. Actualizar `e2e/project-list-order-counts.spec.ts` si dependía del formato "Estado: N".
- Historial QA: []

## WI-AC-055
- Contexto: apariencia
- Acceptance Checks: AC-055
- Depende de: [WI-AC-047]
- Rama sugerida: feature/wi-ac-055-button-icons
- Estado: pendiente
- Notas de implementación:
  - D-027, D-032. Añadir `icon` (Lucide) a los `Button` de la tabla de AC-055, sin cambiar su texto: `ProjectList.svelte` (Crear proyecto ×2 `Plus`, Importar ×2 `Upload`, Exportar todo `Download`, Editar `Pencil`, Archivar `Archive`); `Board.svelte` (Exportar proyecto `Download`, Editar proyecto `Pencil`); `ArchivedProjects.svelte` y `ArchivedCards.svelte` (Restaurar `ArchiveRestore`, Borrar definitivamente `Trash2`, también en el diálogo de confirmación); `ImportFlow.svelte` (Reemplazar ×2 `Replace`, Importar como copia `Copy`); `App.svelte` (Exportar ahora `Download`). Sin icono: Crear, Añadir, Guardar cambios, Cancelar, Aceptar.
  - Enlaces (`<a>`, no `Button`): "Proyectos archivados" y "Tarjetas archivadas" con `Icon` `Archive`; "Volver a proyectos", "Volver a proyectos archivados" y "Volver al tablero" (en `Board.svelte`, `ArchivedCards.svelte`, `ArchivedProjects.svelte` y la página no encontrada de `App.svelte`) con `Icon` `ArrowLeft`, **quitando** la flecha de texto "←". Los enlaces con icono necesitan `display: inline-flex` + `gap` con `--ds-spacing-*`.
  - Fuera de este item: "Añadir tarjeta" (WI-AC-050) y "Archivar" de la tarjeta (WI-AC-053). Las vistas de archivados no cambian su presentación de tarjeta aquí (WI-AC-056).
  - Actualizar los tests que usan nombres con "←" (`← Volver a proyectos`, etc.): ahora son "Volver a proyectos", "Volver a proyectos archivados" y "Volver al tablero".
  - Test e2e: recorrer la tabla de AC-055 comprobando en cada botón o enlace el `svg.lucide-<nombre>` indicado, dentro de `aria-hidden`, y que `getByRole(…, { name: '<texto>' })` sigue resolviendo; que los botones de diálogo sin icono no contienen `svg.lucide`; y que ningún enlace "Volver a …" contiene el carácter "←".
- Historial QA: []

## WI-AC-056
- Contexto: archivo
- Acceptance Checks: AC-056
- Depende de: [WI-AC-052, WI-AC-055]
- Rama sugerida: feature/wi-ac-056-archived-cards-presentation
- Estado: pendiente
- Notas de implementación:
  - `src/views/ArchivedCards.svelte`: pasar `priority={…PRIORITY_DS…}` a `Card` y `icon={PRIORITY_ICON[…]}` al `Badge` de prioridad, igual que en el tablero (WI-AC-052). Se mantiene el pie actual (Estado, Creada, Última modificación) y los botones "Restaurar"/"Borrar definitivamente" con sus `aria-label` y los iconos de WI-AC-055.
  - Si el marcado de etiquetas de tarjeta (tipo + prioridad) queda igual en tablero y archivadas, se puede extraer a un componente de la app (p. ej. `src/lib/CardTags.svelte`) para no duplicarlo.
  - Test e2e: en la vista de tarjetas archivadas, tarjetas Alta/Media/Baja/sin prioridad con la franja de AC-052 (1), iconos de prioridad y tipo de AC-052 (2) y (3), estado y fechas visibles, y botones "Restaurar {título}" (`archive-restore`) y "Borrar definitivamente {título}" (`trash-2`). Los e2e de AC-021, AC-022 y AC-023 siguen pasando.
- Historial QA: []

## WI-AC-057
- Contexto: apariencia
- Acceptance Checks: AC-057
- Depende de: [WI-AC-048, WI-AC-049, WI-AC-050, WI-AC-051, WI-AC-052, WI-AC-053, WI-AC-054, WI-AC-055, WI-AC-056]
- Rama sugerida: feature/wi-ac-057-redesign-a11y-responsive
- Estado: pendiente
- Notas de implementación:
  - Item de verificación transversal del rediseño; va el último porque comprueba el resultado de todos los anteriores. Solo cambia código si algún punto falla (y entonces el arreglo se limita a lo necesario, con variables `--ds-*`; si el defecto está en `design-system/`, se devuelve a `design-builder`).
  - Test e2e (p. ej. `e2e/redesign-a11y.spec.ts`), en lista, tablero (proyecto activo y archivado), tarjetas archivadas y proyectos archivados, en claro y oscuro:
    - (1) Todo `button` cuyo texto visible está vacío tiene nombre accesible no vacío (`getByRole('button')` + `accessibleName` o `aria-label`); todo `svg.lucide` tiene `aria-hidden="true"` o un ancestro con `aria-hidden="true"`.
    - (2) Con 375×667: `document.documentElement.scrollWidth` ≤ 375 en las 4 vistas; en el tablero, las 4 columnas se alcanzan desplazando el contenedor de columnas (AC-020).
    - (3) Botones "Añadir tarjeta en …" y "Archivar {título}": `elementFromPoint` en un punto a 4 px fuera de su borde visible (arriba, abajo, izquierda y derecha) devuelve el propio botón (zona ampliada a 44×44 del `::after` de `Button size="sm"`). Atención: el botón visible mide 36 px y la zona ampliada 44 px, así que "4 px fuera" cae justo en el límite de la zona. Si el punto exacto a 4,0 px no resuelve de forma estable por redondeo de subpíxeles, no se ajusta el umbral por cuenta propia: se informa a QA y se devuelve a `spec-writer` para precisar AC-057.
    - (4) Con `reducedMotion: 'reduce'` en el contexto de Playwright, el e2e de AC-015 pasa.
  - Ejecutar todos los tests (`npm run check`, `npm run test`, `npm run test:e2e`) como regresión completa del rediseño.
- Historial QA: []
