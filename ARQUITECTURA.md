# Arquitectura — Punch List PWA

Documento técnico de referencia. Describe la arquitectura actual del proyecto, sus puntos críticos, y un roadmap evolutivo en 3 niveles.

> **Última actualización**: V52 (mayo 2026)
> **Audiencia**: desarrolladores que mantengan o evolucionen la app
> **Mantenedor**: Felipe Maluenda (GOMS — CODELCO Chuquicamata Subterránea)

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
| `especialistas` | `id` (autoincrement) | Especialistas personalizados (custom + base de data.json) |
| `datos_cache` | `key` (string) | Caché de `data.json` para uso offline (770 WBS) |
| `borradores` | `id` (autoincrement) | Snapshots completos (config + items + firmas) — máx 5 |

### Claves importantes del store `config`

```
subsistema, wbs, area, top, sistema, contrato, empresa
originadoPor, respConstruccion, ingSistema, fechaEmision, caminata
nombreLabor, planoReferencial
wbsNombre, areaNombre, subsistemaNombre
icNivel, icObjetivo, icDesarrollo, icObservaciones
icFirmaData, icFirmaConstruccionData  (V47, dataURIs PNG)
icFirma2Nombre, icFirma2Cargo, icFirma2Empresa  (V44/V49)
sinSS, sinRespConstr  (V50/V51, booleans)
_firmantes_idb  (V42, JSON array firmantes CAM)
customEspecialistas  (array strings)
```

---

## 3. Service Worker — Estrategias de cache

```
data.json     → Stale-While-Revalidate (caché inmediato + actualiza background)
index.html    → Network-first (siempre intenta red, fallback cache)
otros (icons, manifest) → Cache-first (sirve cache, sino red + cachea)
```

Cada release bumpea `CACHE_NAME` (`punch-list-vNN`). El `activate` borra caches viejos automáticamente.

Hooks: `self.skipWaiting()` y `self.clients.claim()` para forzar activación inmediata sin esperar reload manual.

---

## 4. Flujos críticos

### Boot

```
1. openDB()                 → abre IndexedDB
2. loadDatos()              → fetch(data.json) con timeout 5s
                              fallback: loadDatosIDB() (cache offline)
3. loadConfig()             → restaura DOM desde IDB config
4. _wireupPersistenciaIC()  → conecta listeners debounce 400ms
5. sincronizarDatosBackground (3s después) → refresca data.json si hay red
```

### Crear ítem

```
1. addItemForm() → captura datos del formulario
2. cfg = leer 14 claves del IDB config
3. addItem({...item, config: cfg, sinSS: cfg.sinSS}) → snapshot de config en el ítem
4. renderItems() + actualizarChecklist()
```

### Guardar borrador

```
1. _getAllBorradores() → verifica límite (max 5)
2. Leer 26 claves de config en parallel from IDB
3. Leer items con getItems()
4. Leer _firmantes (CAM) y _icFirmaData (IC) from memoria
5. Construir { nombre, config, items, firmantes, firmasIC }
6. add() al store borradores
```

### Cargar borrador (V52 refactor)

```
1. _loadingBorrador = true                   ← deshabilita listeners debounce
2. get(borrador) del IDB
3. setConfigBatch(cfg + firmas)              ← 1 transacción IDB atómica
4. _icFirmaData/_icFirmaConstruccionData set ← variables JS
5. _firmantes set + guardarFirmantesSession  ← memoria
6. clear() + add() items en 1 transacción IDB
7. await loadConfig()                        ← UI desde IDB
8. Fallback derived_* si SS no en data.json
9. renderItems() + renderFirmantes()
10. Repintar canvas firmas CAM (setTimeout 150ms)
11. _loadingBorrador = false (setTimeout 500ms)  ← reactiva listeners
```

---

## 5. Estado actual — Análisis crítico

### 5.1 Variables globales (11 — fuente de fragilidad)

```javascript
let _firmantes = [];                    // CAM signatures
let _icFirmaData = null;                // IC inspection signature
let _icFirmaConstruccionData = null;    // IC construction signature
let _currentFotos = Array(10).fill(null);
let _maxFotoSlot = 2;
let _currentFotoSlot = 0;
let _wbsActiveEmpresa = '';
let _selectedWBSRecord = null;
let _loadingBorrador = false;           // V52
let db = null;
let DATOS = { ... };                    // catálogo global
```

**Problema**: cualquier función puede mutar cualquiera de estas. Sin control de acceso, sin auditoría.

### 5.2 Fuentes de verdad duplicadas

| Dato | Lugares |
|---|---|
| Firmas CAM | `_firmantes[i].data` + `sessionStorage` + `config._firmantes_idb` + `borradores.firmantes` |
| Firma IC | `_icFirmaData` + `config.icFirmaData` + `borradores.firmasIC` |
| Subsistema | `config.subsistema` + `item.config.subsistema` + DOM (botón WBS) |
| Caminata | `config.caminata` + `cfg_caminata.value` (DOM) |
| Flags `sinSS`/`sinRespConstr` | IDB config + DOM checkbox + `item.config.sinSS` |

**Riesgo**: cualquier desincronía entre estas fuentes produce comportamiento errático. Es el origen de bugs históricos (V44 campos IC, V47 firmas, V52 borradores).

### 5.3 Race conditions identificadas (V52 corrigió las 4 críticas)

| # | Patrón | Status V52 |
|---|---|---|
| 1 | `loadConfig()` sin await en cargarBorrador | ✅ Corregido |
| 2 | `setTimeout(initFirmaIC, 100)` antes de canvas dimensionado | ✅ Refactor V47 |
| 3 | `actualizarVisibilidadFirmantes` duplicado | ✅ Corregido |
| 4 | `setTimeout(empresa/contrato, 150)` antes de select populated | ⚠️ Mitigado |
| 5 | Listeners debounce 400ms vs cargarBorrador | ✅ Flag `_loadingBorrador` |
| 6 | fetch data.json con AbortController durante UI ops | ⚠️ Mitigado |
| 7 | sincronizarDatosBackground 3s reemplaza DATOS global | ⚠️ Conocido |
| 8 | `pdfFrame.onload` callback timing inconsistente | ⚠️ Conocido |

### 5.4 Funciones con efectos secundarios no obvios

| Función | Efecto secundario oculto |
|---|---|
| `actualizarVisibilidadFirmantes()` | Dispara `setTimeout(initFirmaIC, 100)` que toca canvas |
| `loadConfig()` | Llama a `actualizarVisibilidadFirmantes()` |
| `onSinSSChange()` | Limpia 5 campos del DOM |
| `applyWBSRecord(rec, save)` | Setea 9 campos IDB + actualiza checklist |
| `addItem(item)` | Dispara warning toast condicional según `sinSS` |

**Mejora futura**: separar "queries" (leen) de "mutations" (escriben + side effects).

---

## 6. Roadmap arquitectónico — 3 niveles

### Nivel 1 — Refactor manteniendo single-file (próximas 4 versiones, V53-V56)

**Objetivo**: bajar complejidad sin cambiar stack.

**V53 — AppState centralizado**
```javascript
const AppState = {
  _state: { config: {}, items: [], firmantes: [], icFirmas: {}, fotos: [], ui: {} },
  _subs: [],
  get(path), set(path, val, {persist}), subscribe(path, cb)
};
```
Reemplaza todas las variables globales. Lectura/escritura controlada. Notifica a UI vía pubsub.

**V54 — Validadores declarativos**
```javascript
const validators = {
  ic_para_pdf: [
    { campo: 'nombreLabor', requerido: true },
    { campo: 'planoReferencial', requerido: true }
  ],
  cam_para_pdf: []
};
function validar(contexto) { ... }
```
Elimina los `if (!campo)` regados por el código.

**V55 — Migración a transacciones IDB batch**
Reemplazar todos los `for...await setConfig(k,v)` por `setConfigBatch({...})`. 10× más rápido y atómico.

**V56 — Eliminar duplicación de firmas**
Una sola fuente de verdad (IDB). Memoria como cache de lectura, no autoridad.

**Estimación total Nivel 1**: 6-8 semanas.

### Nivel 2 — Modularización con HTML imports nativos (mediano plazo)

Cuando index.html supere 6000 líneas o haya >1 dev concurrente.

```
punch-list-pwa/
├── index.html          (~300 líneas: layout + carga módulos)
├── sw.js
├── data.json
├── js/
│   ├── state.js
│   ├── db.js
│   ├── ui.js
│   ├── validators.js
│   ├── signatures.js
│   ├── pdf.js
│   ├── docx.js
│   └── borradores.js
├── css/styles.css
└── CHANGELOG.md
```

`<script type="module">` para imports. Sin build. Sin npm. Funciona offline igual.

### Nivel 3 — Stack moderno con build (solo si crece alcance)

**Disparador**: ≥2 empresas usando la app, equipo de devs ≥3, cliente exige tests.

**Stack**:
- Vite + React (o Vue/Svelte)
- Zustand (state)
- Dexie.js (IDB wrapper)
- Vitest + Playwright (tests automatizados)
- Sentry (telemetría)
- GitHub Actions (CI)

**Migración**: 6-8 semanas full-time.

---

## 7. Recomendación profesional

**No saltar a Nivel 3.** Para 1 equipo usuario es overkill.

**Plan sugerido**:
1. Estabilizar V52 en terreno (2-4 semanas validación)
2. Empezar Nivel 1 en V53 (AppState)
3. Continuar Nivel 1 hasta V56
4. Evaluar Nivel 2 cuando llegue el momento (síntomas: PRs grandes, hard to review, >6000 líneas)
5. Considerar Nivel 3 solo si el alcance del producto crece

---

## 8. Reglas inviolables del proyecto

1. **CSV 20 columnas**: nunca modificar formato
2. **JS brace balance** = 0 (`node --check`)
3. **`buildHTML*` / `buildWord*`**: string concatenation, nunca template literals
4. **Análisis antes de ejecutar**: Felipe confirma explícitamente
5. **Bumpear `CACHE_NAME`** en cada release
6. **Versionado secuencial** (V42, V43... sin V44.1)
7. **Smoke test obligatorio** del Word con `python-docx` + LibreOffice antes del deploy
8. **Documentar en CHANGELOG.md** cada release

---

## 9. Workflows oficiales

### Desarrollo de release

```
1. Análisis + propuesta (Claude/dev) → Felipe confirma
2. Implementación de cambios
3. Bump CACHE_NAME en sw.js
4. Smoke test Word con LibreOffice
5. `node --check` para sintaxis JS
6. Actualizar CHANGELOG.md con sección [Vxx]
7. Commit + push a GitHub
8. Crear Release con tag vxx (description = sección CHANGELOG)
9. Probar deploy: Unregister SW → Ctrl+Shift+R
10. Validar en terreno con equipo (2-7 días)
```

### Word para edición

```
1. Trabajo en PWA (incluye correcciones offline)
2. Exportar Word desde la PWA (`exportarWord()`)
3. Editar `.docx` en Microsoft Word
4. Guardar como PDF (Archivo → Guardar como PDF)
5. Subir PDF a OneDrive/SharePoint
```

`pdf_to_docx.py` se usa **solo** para PDFs históricos sin versión digital.

---

*Documento mantenido por el equipo de desarrollo. Última revisión: V52.*
