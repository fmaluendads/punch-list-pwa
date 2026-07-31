# Contexto operativo — Punch List PWA

Documento de traspaso. Contiene el **contexto de trabajo** del proyecto: cómo se opera sobre el sistema, qué decisiones ya están tomadas y por qué, y qué errores no se deben repetir.

> **Complementa, no reemplaza, a `ARQUITECTURA.md`** — ese documento describe *el sistema*; este describe *cómo se trabaja sobre el sistema*. Todo lo técnico (esquema IDB, flujos, estrategias SW, análisis de estado) vive allá y acá solo se referencia.

> **Última actualización**: V62 (julio 2026)
> **Mantenedor**: Felipe Maluenda — GOMS, CODELCO Chuquicamata Subterránea

---

## 1. Qué es este proyecto

PWA offline-first para inspectores de control de calidad en la Mina Chuquicamata Subterránea, operada por GOMS (Gerencia de Obras Mina Subterránea). Permite generar informes de inspección en terreno **sin conexión** y exportarlos a PDF y Word.

**Dos tipos de documento:**

| Configuración | Código PDF | Template Word |
|---|---|---|
| INSPECCIÓN | `IC-GOMS-DCH` | `buildWordIC` |
| CAMINATA DE RECEPCIÓN | `CAM-REC` | `buildWordCaminata` |
| CAMINATA DE ENTREGA | `CAM-ENT` | `buildWordCaminata` |

**Contexto operativo que explica muchas decisiones de diseño:** los inspectores trabajan bajo tierra, sin señal, con guantes, en turnos largos. De ahí el offline-first estricto, la ausencia total de dependencias en runtime, y el sesgo conservador ante cambios riesgosos.

- **Repo**: `github.com/fmaluendads/punch-list-pwa` (público)
- **Producción**: `fmaluendads.github.io/punch-list-pwa/` (GitHub Pages)

---

## 2. Estado actual

**Código V58 · Datos V62.** No son el mismo número y eso es correcto.

| Archivo | Estado |
|---|---|
| `index.html` | ~5.274 líneas · 319 KB · `APP_VERSION = 'V58'` |
| `sw.js` | `CACHE_NAME = 'punch-list-v58'` · 76 líneas |
| `data.json` | 852 SS WBS · 36 empresas/contratos · 33 especialistas · 22 resp. construcción |

V59–V62 fueron releases **solo datos**: no tocaron código, no bumpearon `CACHE_NAME`, y se propagaron solos vía Stale-While-Revalidate.

> ⚠️ **Este cuadro se desactualiza.** La fuente de verdad del estado es el repo, y el historial completo está en `CHANGELOG.md`. **Nunca editar código sobre archivos de la base de conocimiento del proyecto: pedir siempre a Felipe que adjunte los archivos frescos del repo.**

---

## 3. Cómo trabajar con Felipe

1. **Análisis y propuesta antes de tocar código. Siempre.** Con opciones y una recomendación explícita. Felipe confirma con respuestas cortas ("Sí, ejecutá") antes de que se implemente nada.
2. **Usar botones de selección para las decisiones** — trabaja mucho desde el celular y escribir le cuesta.
3. **Ante ambigüedad técnica, preguntarle qué espera el usuario en terreno.** Su lectura de negocio destraba decisiones de arquitectura: el refactor V58 completo salió de una frase suya sobre borradores (ver `ARQUITECTURA.md` §7.5).
4. **Un tema por chat.** Cuando aparece uno nuevo, prefiere abrir conversación aparte.
5. **Si el alcance es ambicioso, proponer fases** aunque haya dicho "hagamos todo" — precedente V52.
6. **Al entregar, ser explícito sobre**: qué se validó (`node --check`, smoke test con `python-docx`), qué archivos suben a GitHub, y con qué mensaje de commit.
7. **Criterio de riesgo:** validar en terreno 2 a 4 semanas antes de un nuevo release riesgoso. Lo que puede esperar, espera.

---

## 4. Reglas inviolables

Las 9 reglas están en **`ARQUITECTURA.md` §8**. No se duplican acá para evitar divergencia.

Las tres que más se violan por inercia, con su razón:

- **`buildHTML*` / `buildWord*`: concatenación de strings, nunca template literals.** No es preferencia de estilo: las backticks rompen los reemplazos con Python que se usan para editar el archivo.
- **Brace balance = 0 y `node --check` después de cada cambio.** Un archivo de 5.274 líneas sin build ni tests: si el JS no parsea, la app no arranca, y el inspector se entera 600 metros bajo tierra.
- **Solo datos ⇒ no bumpear `CACHE_NAME`.** Forzar redescarga innecesaria a gente sin señal es un costo real, no cosmético.

---

## 5. Decisiones arquitectónicas ya tomadas

### 5.1 Config IDB es la fuente única de verdad al exportar (V58)

Detalle completo en `ARQUITECTURA.md` §5.2 y §7.1.

**Regla operativa:** al exportar PDF o Word se lee **Config IDB**. Los snapshots `item.config.*` quedan solo como fallback defensivo si Config IDB está vacío. No reintroducir el patrón inverso.

**Diagnóstico ante cualquier bug futuro de "el informe sale con datos incorrectos"** — primero descartar que sea otro caso del mismo patrón:

```bash
grep -nE 'cfg\.[a-z]+\s*\|\|\s*await getConfig' index.html
```

Si aparece, evaluar si invertir el orden produce el comportamiento esperado.

**Lección de proceso (V57 → V58):** V57 arregló un solo campo (`fechaEmision`) y los otros cuatro siguieron rotos hasta V58. **Cuando se identifica un patrón sistemático, se arreglan todos los campos afectados de una vez.**

### 5.2 Por qué los borradores no se rompieron con V58

`cargarBorrador()` usa `setConfigBatch()` para restaurar el config completo del borrador a IDB *antes* de exportar. Por eso priorizar IDB sobre snapshot es seguro. Ver `ARQUITECTURA.md` §4.

---

## 6. Reglas de datos WBS

*(Contenido propio de este documento — no está en `ARQUITECTURA.md`.)*

**Antes de aplicar un Excel nuevo, analizar siempre:** duplicados, SS nuevos, SS eliminados, cambios de empresa o contrato. Presentar el análisis a Felipe antes de generar el `data.json`.

**Política de duplicados (desde V62): la planilla origen se carga completa, sin deduplicar.** Los `ss_id` repetidos entre empresas distintas son legítimos en terreno y ambos registros deben ser inspeccionables. Reemplaza la regla de "primera ocurrencia" vigente V54–V61, que dejaba invisible la segunda obra. Duplicados retenidos al V62: `222712F-02-06` (ZUBLIN/MDB), `223520F-01-05` (GARDILCIC/GEOVITA, mismo nombre — se distinguen por chip de empresa), `225310F-03-01` (GEOVITA/MDB). Caso borde: la restauración por `ss_id` en `loadConfig` toma el primero del array — fix candidato para próximo release de código (restaurar por `ss_id`+`empresa`). Regla histórica que reemplaza, aplicada V54–V61 por primera ocurrencia:

- `223520F-01-05` → GARDILCIC
- `225310F-03-01` → GEOVITA

**Antecedente V61**: la excepción para `222712F-02-06` (mantener ambos por ser obras distintas de empresas distintas) fue el precedente que en V62 se generalizó como política. El `si_id` inconsistente del registro MDB sigue escalado a GOMS (solicitud del 29-07-2026, pendiente).

**Duplicados sospechosos: no se parchean en la app, se escalan a GOMS.** Precedente V59: cinco ventiladores de sectores norte y sur compartían `ss_id`. En vez de un workaround en el catálogo, se escaló y GOMS corrigió la planilla origen (`222130-01-XX` norte vs `223130-01-XX` sur). El patrón correcto es corregir en origen.

**Cuando el reporte oficial de GOMS omite contratos activos, preservar esos SS manualmente** filtrando el `data.json` anterior por sufijo de contrato. Precedente V60: se preservaron 157 SS de dos contratos vigentes confirmados operativos — CC-117 GARDILCIC (96 SS) y CC-113 Master Drilling–Besalco (61 SS).

**Formatos de Excel conocidos:**

| Archivo | Formato | Encabezados | Datos desde | Notas |
|---|---|---|---|---|
| `WBS_Semanal.xlsx` | antiguo | fila 0 | fila 1 | columnas simples |
| `WBS_GOMS.xlsx` | nuevo (desde V60) | fila 3 | fila 6 | "Reporte Listado WBS"; columnas extra: Clasificación, Plano, CRP |

**CSV de 20 columnas: nunca modificar el formato.** Regla 1 de `ARQUITECTURA.md` §8.

---

## 7. Deploy y entorno

**Felipe no usa git CLI.** Sube los archivos por la interfaz web de GitHub (ícono de lápiz). Cualquier instrucción de entrega debe asumir eso: qué archivo, dónde, y qué poner en el mensaje de commit. Después de un release de código: crear tag y release con la sección del `CHANGELOG`.

**Invalidar el Service Worker durante pruebas:** cambiar `CACHE_NAME` en `sw.js`, y en Chrome ir a Application → Service Workers → Unregister → `Ctrl+Shift+R`. El SW ya trae `self.skipWaiting()` en install y `self.clients.claim()` en activate.

**Flujo oficial de exportación:** PWA → `exportarWord()` → editar en Microsoft Word → Guardar como PDF → subir a OneDrive/SharePoint. El PDF nunca se genera directo desde la app para entrega oficial.

`pdf_to_docx.py` (pdf2docx, en el PC de Felipe en `C:\python scripts\`) es **solo** para PDFs legacy sin fuente digital. Calidad mediocre en layouts complejos — no es parte del flujo normal.

**Herramientas de desarrollo:** Python (reemplazos de strings, parseo de Excel WBS, smoke tests con `python-docx`) y Node.js (`node --check`).

---

## 8. Técnicas de edición del archivo grande

`index.html` tiene ~5.274 líneas. Lo que funciona:

- **Reemplazo con Python** (`content.replace(old, new, 1)`) es más confiable que `str_replace` para bloques multilínea con escapes complejos.
- **Localizar puntos de inserción con `grep -n "string exacto"`**, nunca asumiendo números de línea: cada edición los corre.
- **Verificar balance de llaves** extrayendo el JS y contando:

```python
import re
js = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
```

El balance debe ser exactamente 0 después de cada cambio, y `node --check` debe pasar antes de entregar.

---

## 9. Roadmap

Los cinco refactors del Nivel 1 están descritos en `ARQUITECTURA.md` §6, pero **con la numeración desfasada**: ese documento los escribió originalmente con números de versión, consumidos repetidamente por releases de datos. Desde V62 usan etiquetas estables (toman número de versión al ejecutarse):

| Etiqueta | Refactor |
|---|---|
| R1 | `AppState` centralizado — reemplaza ~12 variables globales |
| R2 | Validadores declarativos — elimina los `if (!campo)` dispersos |
| R3 | Transacciones IDB batch consolidadas — extiende `setConfigBatch` de V52 |
| R4 | Fuente única para firmas en IDB — elimina duplicación |
| R5 | Elimina definitivamente los snapshots de config por ítem |

**Nivel 2** (modularización con `<script type="module">`, sin build) cuando `index.html` pase de ~6.000 líneas. **Nivel 3** (Vite + framework + Dexie + Vitest + Sentry) solo si el alcance crece a ≥2 empresas o ≥3 desarrolladores.

---

## 10. Anti-patrones

Errores que un desarrollador razonable cometería sin este documento:

| No hacer | Por qué |
|---|---|
| Template literals en `buildHTML*` / `buildWord*` | Rompe los reemplazos con Python |
| `cfg.X \|\| await getConfig('X')` | Es el bug sistemático de V57/V58 |
| Bumpear `CACHE_NAME` en release solo-datos | Redescarga innecesaria para usuarios sin señal |
| Parchear un duplicado WBS en la app | Corresponde escalarlo a GOMS y corregir en origen |
| Agrupar varios refactors del roadmap en un release | El criterio es validar en terreno entre cambios riesgosos |
| Editar código sobre los archivos del knowledge del proyecto | Pueden estar desactualizados — pedir los del repo |
| Agregar una dependencia en runtime | Rompe el offline-first, que es el requisito fundacional |
| Numerar V44.1 o similar | Versionado secuencial estricto |

---

## 11. Mantenimiento de este documento

Se actualiza cuando cambian los **métodos de trabajo**, no cuando cambia el código — esa es la diferencia con `ARQUITECTURA.md`, que se actualiza con el sistema.

Cuando una conversación produzca una decisión arquitectónica o una lección reutilizable, incorporarla acá antes de cerrar el tema. El contexto que no queda escrito en el repo no sobrevive a un cambio de cuenta, de herramienta ni de conversación.
