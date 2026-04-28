# Mejoras en acopios: selector de ruta, impresión y QR para camionero

Fecha: 2026-04-23
Rama: `feat/template-canvas-designer`

## Contexto

El módulo de logística tiene acopios (`stagingAreas`) donde se concentran
paquetes antes del reparto. Hoy la UI tiene tres puntos de fricción:

1. Los selectores de ruta son `<select>` nativos con una sola línea (`code`).
   No indican estado, fecha ni driver — difícil elegir la correcta.
2. No se puede imprimir nada desde el acopio salvo el QR. No hay hoja de
   carga ni albaranes para el camionero.
3. El QR se escanea desde `DriverApp` pero la app no diferencia si el
   acopio corresponde al usuario logueado: un camionero puede recibir
   instrucciones de otra ruta sin avisarle.

Este spec cubre las tres mejoras.

## Requisitos

- RoutePicker reutilizable, con estado, fecha y driver visibles.
- Botón "Imprimir" en cada acopio con menú de 3 salidas: packing list,
  albaranes consolidados y QR.
- Al escanear el QR, la DriverApp dice explícitamente "es tuyo / no es
  tuyo / sin asignar", y en el primer caso permite abrir paradas.

## Diseño

### Selector de ruta — `<RoutePicker>`

Ubicación: `apps/web/src/components/logistics/RoutePicker.tsx`.

Implementado encima del `SearchableSelect` de `@openfactu/ui` para
heredar búsqueda y A11y. Mapea cada ruta a una opción con:

- `label`: `RT-XXXX · YYYY-MM-DD · Driver`
- `secondaryLabel`: estado (`planned` / `active` / `completed` / `cancelled`).

Props:

```ts
interface RoutePickerProps {
  value: string;
  onChange: (id: string) => void;
  routes: Route[];
  allowEmpty?: boolean;           // añade "— sin ruta —"
  filterStatuses?: RouteStatus[]; // oculta rutas que no cumplan
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
```

Reemplaza los `<select>` de ruta en:
- `PackagesTab.tsx` (líneas 249, 271, 324 — las que sean de ruta)
- `PreparationTab.tsx` (292, 333)
- Cualquier otro uso equivalente detectado al migrar.

### Impresión desde el acopio

Un `LabelPrintButton` con dropdown (o un `Popup` nuevo) en la tabla de
acopios y en el modal de paquetes. Tres acciones:

1. **Hoja de acopio (packing list)** — `GET /api/logistics/staging-areas/:id/packing-list.pdf`
   - Cabecera: acopio (código, nombre, dirección), fecha, rutas activas,
     drivers.
   - Cuerpo: paquetes agrupados por envío, con `code`, estado, peso,
     y receptor del envío.
   - Pie: contador de paquetes, peso total, firma del camionero.
   - Implementado con un template nuevo usando `@openfactu/pdf`.

2. **Albaranes de los envíos** — `GET /api/logistics/staging-areas/:id/delivery-notes.pdf`
   - Para cada `sales-delivery-note` presente en el acopio, se invoca
     `renderDocumentPdf` y se concatena en un único PDF (`pdf-lib`).

3. **QR** — reutiliza el endpoint `GET /staging-areas/:id/qr.png` ya
   existente; se mueve dentro del mismo menú para unificar UX.

### QR identifica al camionero

Endpoint nuevo:

```
POST /api/logistics/staging-areas/:id/claim
```

El body es vacío; usa el usuario autenticado. Lógica:

1. Recoger los envíos presentes en el acopio.
2. Buscar rutas (`routes` con `status in ('planned','active')`) cuyos
   `routeStops` referencien esos envíos.
3. Leer los drivers de esas rutas y el `userId` asociado a cada driver.
4. Determinar `ownership`:
   - `mine` si el `userId` del request coincide.
   - `other` si hay driver(s) pero ninguno coincide.
   - `unassigned` si no hay ruta planificada ni activa.
5. Respuesta:

```ts
type ClaimResponse =
  | { ownership: 'mine';      routes: RouteSummary[]; nextStop: StopSummary | null }
  | { ownership: 'other';     assignedTo: { driverName: string; routeCode: string } }
  | { ownership: 'unassigned' };
```

Requiere que la tabla de drivers tenga `userId`. Si no existe aún:
migración nueva `drivers_add_user_id` añadiendo
`userId TEXT REFERENCES users(id) ON DELETE SET NULL`.

En `DriverApp.tsx`, al escanear el QR:

- `mine` → pantalla verde con listado de paradas asignadas y botón
  "Marcar siguiente parada como en ruta".
- `other` → pantalla roja: "Este acopio NO es tuyo. Es de `<driver>`
  (ruta `<code>`)".
- `unassigned` → amarilla: "Acopio sin ruta asignada".

## Orden de ejecución

1. `RoutePicker` (aislado, sin backend). Pieza 1.
2. Impresión — packing list primero, albaranes después.
3. QR ownership — migración + endpoint + UI.

## Tests

- Unit: lógica `ownership` con fixtures (mine/other/unassigned).
- Integración: endpoints `packing-list.pdf`, `delivery-notes.pdf`,
  `claim` con tenant falso.
- Manual: escaneo QR con 3 usuarios, verificar colores y flujos.

## Riesgos

- Generar el PDF de albaranes reutilizando `DocumentEngine` puede ser
  lento si hay muchos envíos — mitigar streaming con `pdf-lib`.
- Migración `drivers.userId` requiere coordinación con el proceso de
  alta de usuario → driver; puede quedar `NULL` en drivers legacy,
  lo cual es aceptable (caerán en rama `other`/`unassigned`).
