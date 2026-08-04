# Arquitectura — Punch List PWA

Documento técnico de referencia. Describe la arquitectura actual del proyecto, sus puntos críticos, las decisiones de diseño tomadas, y un roadmap evolutivo en 3 niveles.

> **Última actualización**: V63 (agosto 2026) — código V63 · datos V62
> **Audiencia**: desarrolladores que mantengan o evolucionen la app
> **Mantenedor**: Felipe Maluenda (GOMS — CODELCO Chuquicamata Subterránea)
>
> **Documento complementario**: `CONTEXTO_CLAUDE.md` describe *cómo se trabaja sobre el sistema* (proceso, reglas de datos WBS, deploy, anti-patrones). Este documento describe *el sistema*.

---

## 1. Stack actual

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | HTML/CSS/JS vanilla (single-file) | Funciona 100% offline sin build |
| Storage | IndexedDB nativo (5 stores) | Capacidad alta, asíncrono, persistente |
| Service Worker | Cache estrategias mixtas | Offline-first con datos frescos |
| PDF | HTML + iframe + browser print | Sin librerías externas, control total |
| DOCX | OOXML ZIP STORE desde cero (V43) | Generación nativa, sin dependencias |
| Deploy | GitHub Pages | Gratis, simple, sin servidor |
| Versionado | CACHE_NAME en sw.js + Git tags | Invalidación SW + snapshots descargables |

**Sin dependencias en runtime.** Ni React, ni jQuery, ni librerías de PDF. Esto es deliberado.

---

## 2. IndexedDB — Esquema

`DB_NAME = 'PunchListDB'`, `DB_VERSION = 5`

| Store | Key | Contenido |
|---|---|---|
| `items` | `id` (autoincrement) | Hallazgos/observaciones con fotos y snapshot de config |
| `config` | `key` (string) | Configuración global: WBS, fechas, campos IC, flags |
| `especialistas` | `id` (autoincrement) | Especialistas personalizados |
| `datos_cache` | `key` (string) | Caché de `data.json` para uso offline (852 WBS al V62) |
| `borradores` | `id` (autoincrement) | Snapshots completos — máx 10 (V53+) |

### Claves importantes del store `config`

```
subsistema, wbs, area, top, sistema, contrato, empresa
originadoPor, respConstruccion, ingSistema, fechaEmision, caminata
nombreLabor, planoReferencial
wbsNombre, areaNombre, subsistemaNombre
icNivel, icObjetivo, icDesarrollo, icObservaciones
icFirmaData, icFirmaConstruccionData            (V47, dataURIs PNG)
icFirma2Nombre, icFirma2Cargo, icFirma2Empresa  (V44/V49)
icFirma2Fecha                                   (V56, fecha firma Resp. Construcción)
sinSS, sinRespConstr                            (V50/V51, booleans)
camObservaciones                                (V54, observaciones opcionales CAM)
_firmantes_idb                                  (V42, JSON array firmantes CAM)
customEspecialistas                             (array strings)
```

---

## 3. Service Worker — Estrategias de cache

```
data.json     → Stale-While-Revalidate (caché inmediato + actualiza background)
index.html    → Network-first (siempre intenta red, fallback cache)
otros         → Cache-first
```

Cada release bumpea `CACHE_NAME` (`punch-list-vNN`). El `activate` borra caches viejos automáticamente.

Hooks: `self.skipWaiting()` y `self.clients.claim()` para forzar activación inmediata.

**Excepción — releases solo-datos** (V55, V59–V62): no requieren bump de `CACHE_NAME` porque solo cambia `data.json`, y la estrategia Stale-While-Revalidate lo actualiza automáticamente.

---

## 4. Flujos críticos

### Boot

```
1. openDB()                 → abre IndexedDB
2. loadDatos()              → fetch(data.json) timeout 5s → fallback IDB cache
3. loadConfig()             → restaura DOM desde IDB config
4. _wireupPersistenciaIC()  → conecta listeners debounce 400ms
5. sincronizarDatosBackground (3s después) → refresca data.json si hay red
```

### Crear ítem

```
1. addItemForm() → captura datos
2. cfg = leer claves del IDB config
3. addItem({...item, config: cfg}) → snapshot de config en el ítem
4. renderItems()
```

> **Nota V58**: el snapshot por ítem se mantiene en IDB por compatibilidad, pero **no se usa al exportar** (ver sección 5.2).

### Cargar borrador (V52 refactor + V58 implicaciones)

```
1. _loadingBorrador = true                    ← deshabilita listeners debounce
2. get(borrador) del IDB
3. setConfigBatch(cfg + firmas)               ← 1 transacción IDB atómica
4. _icFirmaData/_icFirmaConstruccionData set
5. _firmantes set + guardarFirmantesSession
6. clear() + add() items en 1 transacción
7. await loadConfig()                         ← UI desde IDB
8. Fallback derived_* si SS no en data.json
9. renderItems() + renderFirmantes()
10. Repintar canvas firmas CAM (setTimeout 150ms)
11. _loadingBorrador = false (setTimeout 500ms)
```

**V58 importante**: `setConfigBatch` restaura **todo** el config del borrador a IDB. Por eso al exportar inmediatamente después, los `getConfig` devuelven los valores del borrador. Esto permite que V58 priorice Config IDB sobre snapshots sin romper borradores.

### Editar ítem (V53 refactor)

V53 fusionó la lógica de "Nuevo" y "Editar" para soportar multi-foto en edición.

```
1. editItem(id) → _editingItemId = id
2. poblarEditFotos(item.fotos)         ← carga TODAS las fotos
3. actualizarTituloFotosEdit()         ← ajusta max (3 normal / 10 S/O)
4. submit form → updateItem({...item, fotos: _currentFotos.filter(Boolean)})
5. closeEditModal() → _editingItemId = null
```

### Generar PDF (V57-V58 modelo)

```
1. Leer Config IDB (NO los snapshots)
2. Validar campos requeridos según tipo
3. Construir HTML según buildHTMLInspeccion o buildHTMLCaminata
4. promptNombreArchivo()                ← V56: modal con sugerencia editable
5. Inyectar nombre en <title> del HTML
6. iframe.srcdoc = htmlConTitle
7. Botón naranja dispara window.print()
```

### Generar Word (V57-V58 modelo)

```
1. Leer Config IDB (NO los snapshots)
2. Validar campos requeridos
3. promptNombreArchivo()                ← V56
4. _descargarWord({...payload, customFilename}) → generarDocx() → blob → <a download>
```

---

## 5. Estado actual — Análisis crítico

### 5.1 Variables globales (12)

```javascript
let _firmantes = [];
let _icFirmaData = null;
let _icFirmaConstruccionData = null;
let _currentFotos = Array(10).fill(null);
let _maxFotoSlot = 2;
let _currentFotoSlot = 0;
let _wbsActiveEmpresa = '';
let _selectedWBSRecord = null;
let _loadingBorrador = false;           // V52
let _editingItemId = null;              // V53
let db = null;
let DATOS = { ... };
```

Mitigación V52: flag `_loadingBorrador` previene pisotones de listeners durante carga.

### 5.2 Fuentes de verdad — Decisión V58 (CRÍTICO)

Históricamente había hasta 3 lugares simultáneos para el mismo dato (snapshot por ítem, Config IDB, DOM). Esto causó bugs persistentes en V54-V57.

**V58 estableció el modelo definitivo para EXPORTS**:

> **Config IDB es la única fuente de verdad** para los datos del informe al exportar PDF/Word. Los snapshots por ítem quedan como fallback defensivo si Config IDB está vacío.

Datos afectados:
- `fechaEmision` (V57)
- `caminata`, `empresa`, `subsistema`, `contrato`, `originadoPor` (V58)

**Razonamiento**: el equipo trabaja con UNA inspección a la vez, UN subsistema, UNA fecha. El snapshot fue diseñado para soportar multi-SS (que el equipo no usa) y causaba bugs cuando se cambiaba Config después de crear ítems.

### 5.3 Race conditions identificadas

| # | Patrón | Status |
|---|---|---|
| 1 | loadConfig sin await en cargarBorrador | ✅ V52 |
| 2 | setTimeout initFirmaIC antes de canvas dimensionado | ✅ V47 |
| 3 | actualizarVisibilidadFirmantes duplicado | ✅ V52 |
| 4 | setTimeout empresa/contrato antes de select populated | ⚠️ Mitigado |
| 5 | Listeners debounce 400ms vs cargarBorrador | ✅ V52 (_loadingBorrador) |
| 6 | fetch data.json con AbortController durante UI ops | ⚠️ Mitigado |
| 7 | sincronizarDatosBackground reemplaza DATOS global | ⚠️ Conocido |
| 8 | pdfFrame.onload timing inconsistente | ⚠️ Conocido |
| 9 | Snapshot ítem vs Config IDB al exportar | ✅ V57-V58 |

### 5.4 Persistencia de campos IC/CAM

Wireup `_wireupPersistenciaIC()` mantiene mapa con debounce 400ms:

```javascript
[
  ['ic_nivel',          'icNivel'],
  ['ic_objetivo',       'icObjetivo'],
  ['ic_desarrollo',     'icDesarrollo'],
  ['ic_observaciones',  'icObservaciones'],
  ['cam_observaciones', 'camObservaciones'],  // V54
  ['ic_firma2_nombre',  'icFirma2Nombre'],
  ['ic_firma2_cargo',   'icFirma2Cargo'],
  ['ic_firma2_empresa', 'icFirma2Empresa'],
  ['ic_firma2_fecha',   'icFirma2Fecha']      // V56
]
```

Todos respetan flag `_loadingBorrador`.

### 5.5 Generación de documentos — V56-V58

**Anti-corte de firmas (V56)**:
- PDF: `page-break-inside: avoid` + `break-inside: avoid` en tabla y filas
- Word: `_dxTable({cantSplit: true})` inserta `<w:trPr><w:cantSplit/></w:trPr>`

**Fecha firma Resp. Construcción (V56)**:
- Auto-fill al confirmar firma SI el input está vacío
- Editable; persiste con clave `icFirma2Fecha`
- Renderiza en PDF y Word **solo si tiene contenido**

**Modal nombre archivo (V56)**:
- Helper `promptNombreArchivo({extension, sugerencia, titulo}, callback)`
- Sugerencia: `CODIGO_SS_YYYY-MM-DD`
- PDF: nombre se inyecta como `<title>` (sugerencia para "Guardar como PDF")
- Word: control 100% vía `<a download="...">`
- Limitación: Safari iOS a veces ignora el `<title>` (no es bug de la app)

---

## 6. Roadmap arquitectónico — 3 niveles

### Nivel 1 — Refactor manteniendo single-file (R1–R5)

> **Desacoplado del versionado en V62.** Este roadmap se escribió en V58 con números de versión asignados (V59–V63), que fueron consumidos repetidamente por releases solo-datos, forzando renumeraciones en V60, V61 y V62. Desde V62 los refactors usan etiquetas estables **R1–R5** y toman número de versión recién cuando se ejecutan. El versionado sigue siendo secuencial y no admite V44.1 (§8, regla 6).

#### R1 — AppState centralizado
Reemplaza variables globales con estado controlado + pubsub.

#### R2 — Validadores declarativos
Reemplaza `if (!campo)` regados por el código con tabla de validators.

#### R3 — Transacciones IDB batch consolidadas
Ya parcialmente aplicado V52. Extender a más operaciones.

#### R4 — Eliminar duplicación de firmas
Una sola fuente de verdad (IDB). Patrón V58 ya estableció el modelo.

#### R5 — Consolidar snapshot vs IDB
Eliminar definitivamente el snapshot por ítem (mantenido por compat).

Estimación: 6-8 semanas distribuidas según urgencias.

### Nivel 2 — Modularización con módulos nativos (mediano plazo)

**Estado código V63 (vigente al V63)**: 5274 líneas — cerca del límite recomendado (6000).

```
js/
├── state.js
├── db.js
├── ui.js
├── validators.js
├── signatures.js
├── pdf.js
├── docx.js
└── borradores.js
```

`<script type="module">` para imports. Sin build. Funciona offline.

### Nivel 3 — Stack moderno con build (solo si crece alcance)

Vite + framework + Dexie.js + Vitest + Playwright + Sentry. Solo si ≥2 empresas o equipo ≥3 devs.

---

## 7. Lecciones aprendidas V52-V58

### 7.1 Patrón "snapshot vs IDB" (V57-V58)

```javascript
// MAL — snapshot primero, nunca llega al IDB actualizado
const valor = cfg.X || await getConfig('X');

// BIEN — Config IDB primero, snapshot como fallback
const valor = await getConfig('X') || cfg.X;
```

**Detectable con grep**: `cfg.X || await getConfig`. Cuando aparece, evaluar si invertir produce el comportamiento esperado.

**Lección de proceso**: V57 arregló solo `fechaEmision`; V58 arregló los otros 4 campos. Cuando hay un patrón sistemático, conviene atacar completo (V57 unificado).

### 7.2 Firmas cortadas entre páginas (V56)

Ni CSS ni OOXML prohíben por defecto el corte de tablas entre páginas. Solución estándar:
- HTML/PDF: `page-break-inside: avoid` + `break-inside: avoid`
- OOXML: `<w:cantSplit/>` a nivel de fila

Detectable solo en documentos largos (por eso el equipo reportó después de meses).

### 7.3 Race conditions en cargarBorrador (V52)

Múltiples campos restaurándose en cadena + listeners debounce activos = datos perdidos. Solución integral:

1. Flag global deshabilita listeners
2. Transacción IDB atómica (`setConfigBatch`)
3. `await loadConfig()` real
4. Reactivación con setTimeout (margen seguridad)

**Patrón general**: cualquier operación de restauración masiva necesita flag bloqueante.

### 7.4 Multi-foto en edición (V53)

Modal edición fue diseñado V40 para 1 foto. V42 agregó multi-foto al modal de creación pero olvidó actualizar el de edición. Bug latente durante meses.

**Lección**: al agregar feature, revisar **todos los lugares relacionados** (edit modals, otros forms, exports, validaciones).

### 7.5 Modelo mental del usuario manda (V58)

El refactor V58 surgió de Felipe corrigiendo el modelo mental:

> *"Si genero un borrador debería quedar con todos sus ítems al cargarlo y exportarlo, si guardo otra configuración se debe respetar todo con esa configuración"*

Esta declaración simple desbloqueó la decisión arquitectónica de **Config IDB = fuente única**. Cuando el dev tiene dudas, preguntar al usuario qué espera.

---

## 8. Reglas inviolables

1. **CSV 20 columnas**: nunca modificar formato
2. **JS brace balance** = 0 (`node --check`)
3. **`buildHTML*` / `buildWord*`**: string concatenation, nunca template literals
4. **Análisis antes de ejecutar**: Felipe confirma explícitamente
5. **Bumpear `CACHE_NAME`** en cada release que toque código (excepción: releases solo-datos — V55, V59–V62)
6. **Versionado secuencial** (V42, V43... sin V44.1)
7. **Smoke test obligatorio** del Word con `python-docx` + LibreOffice
8. **Documentar en CHANGELOG.md** cada release
9. **APP_VERSION + appVersionLabel + CACHE_NAME** sincronizados (V52+)

---

## 9. Workflows oficiales

### Release de código

```
1. Análisis + propuesta → Felipe confirma
2. Implementación
3. Bump CACHE_NAME (sw.js) + APP_VERSION (index.html) + appVersionLabel
4. Smoke test Word con LibreOffice / python-docx
5. node --check para sintaxis JS
6. Brace balance = 0
7. Actualizar CHANGELOG.md
8. Commit + push a GitHub
9. Crear Release con tag vxx
10. Probar deploy: Unregister SW → Ctrl+Shift+R
11. Validar en terreno (2-7 días)
```

### Update solo de datos (V55+)

Si solo cambia `data.json` (WBS, responsables, especialistas): **no bumpear CACHE_NAME**. SW actualiza vía Stale-While-Revalidate. Solo subir nuevo data.json + sección CHANGELOG.

### Word para edición

```
1. Trabajo en PWA
2. Exportar Word (con modal de nombre desde V56)
3. Editar en Microsoft Word
4. Guardar como PDF
5. Subir a OneDrive/SharePoint
```

---

## 10. Historial de versiones

| Versión | Fecha | Tipo | Resumen |
|---|---|---|---|
| V42 | mar 2026 | Feature | Borradores (DB_VERSION=5, max 5) |
| V43 | abr 2026 | Feature | OOXML real desde cero |
| V44 | abr 2026 | Feature | 2da firma IC + persistencia campos |
| V45 | abr 2026 | Feature | Disciplina + firmas IC apiladas |
| V46 | abr 2026 | Fix | Paridad PDF↔Word |
| V47 | may 2026 | Fix | Firmas IC persistentes |
| V48 | may 2026 | Fix | CAM no requiere plano/labor |
| V49 | may 2026 | Feature | Nombre Resp. Construcción editable |
| V50 | may 2026 | Feature | Toggle "Inspección sin SS" |
| V51 | may 2026 | Feature | Toggle "Sin Resp. Construcción" |
| **V52** | may 2026 | Refactor | cargarBorrador + indicador versión + 6 bugs |
| **V53** | may 2026 | Fix+Feature | Multi-foto edición + 10 borradores + UI rename |
| **V54** | may 2026 | Feature | Observaciones CAM + 788 SS |
| **V55** | may 2026 | Datos | 791 SS + nuevo responsable |
| **V56** | may 2026 | Multi-fix | Anti-corte firmas + fecha firma + modal nombre |
| **V57** | jun 2026 | Fix | Fecha del informe respeta Config IDB |
| **V58** | jun 2026 | Fix | Config IDB = fuente única para export (4 campos) |
| **V59** | jun 2026 | Datos | 827 SS — GOMS corrigió duplicados de ventiladores en origen |
| **V60** | jul 2026 | Datos | 834 SS + 6 responsables · preservación manual de 157 SS (CC-117, CC-113) |
| **V61** | jul 2026 | Datos | 845 SS + 3 pares empresa/contrato + 1 especialista · CC-117/CC-113 vuelven al origen |
| **V62** | jul 2026 | Datos | 852 SS · nueva política: planilla completa sin deduplicar · roadmap desacoplado a R1–R5 |
| **V63** | ago 2026 | Código | Máx. 12 firmantes en caminatas (`MAX_FIRMANTES`) · restauración WBS por `ss_id`+`empresa` · limpieza snapshot `respConstruccion` |

---

*Documento mantenido por el equipo de desarrollo. Última revisión: V63 (agosto 2026).*
