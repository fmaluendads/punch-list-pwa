# Changelog

Todas las versiones notables del proyecto **Punch List PWA** quedan documentadas en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado usa numeración secuencial simple (V42, V43, V44...).

Cada release está identificado por su `CACHE_NAME` en `sw.js`, que sirve como invalidación del Service Worker.

---

## [V59] - 2026-06-22

> **Solo datos** — Esta versión actualiza únicamente `data.json`. No modifica `index.html` ni `sw.js`, por lo que NO requiere bump de `CACHE_NAME`. El Service Worker actualiza `data.json` automáticamente vía Stale-While-Revalidate.

### Added
- **31 nuevos SS en `data.json`** (de 799 a 827):
  - 6 puertas estándar/extraliviana en sector NORTE (`222120-01-01` a `-06`, GARDILCIC)
  - 6 ventiladores de inyección sector NORTE (`222130-01-01` a `-06`, GARDILCIC)
  - 1 ventilador de extracción (`222140-01-01`, GARDILCIC)
  - 3 ventiladores de inyección sector SUR (`223130-01-01` a `-03`, GARDILCIC)
  - 2 frontones TICA (`223120-01-01`, `-02`)
  - 2 fosos de drenaje (`223120-02-01`, `-02`)
  - 1 sistema supresión de polvo NP (`223120-03-01`)
  - 1 sala eléctrica (`223120-04-01`)
  - 4 sistemas de alumbrado (`223440-08-01` a `-04`, SIGDO KOPPERS S.A)
  - 1 montaje estructuras (`223480F-03-02`, SIGDO KOPPERS S.A)
  - 1 conexión (`225213F-01-03`)
  - 1 rampa by-pass (`221610F-01-04`)
  - 2 chimeneas (`223440F-03-07`, `225413F-01-03`, MDB)

### Removed
- 3 SS legacy con sufijo `(IM)` eliminados (reorganización de nomenclatura por GOMS):
  - `222120F-04-06` PUERTA EXTRALIVIANA 20340-PRT-006 (IM) → reemplazado por `222120-01-06`
  - `222140F-01-01` VENTILADOR EXTRACCION 222142-VEN-001 (IM)
  - `222140F-01-02` VENTILADOR EXTRACCION 222132-VEN-006 (IM) → reemplazado por `222140-01-01`

### Changed
- 11 SS con cambios menores de nombre/descripción (más completos o más cortos). Sin cambios de empresa/contrato.

### Notas técnicas
- **GOMS resolvió los duplicados que bloquearon la actualización anterior**: los 5 ventiladores que aparecían con el mismo `ss_id` en sectores norte y sur ahora tienen IDs distintos (`222130-01-XX` para norte vs `223130-01-XX` para sur). Patrón profesional cumplido: planilla origen corregida en vez de workaround en el catálogo.
- Duplicados conocidos resueltos por **primera ocurrencia** (consistente con V54/V55):
  - `223520F-01-05` → GARDILCIC
  - `225310F-03-01` → GEOVITA
- **0 cambios de empresa/contrato** en SS existentes.
- 8 empresas en `wbsData`, todas presentes en `empresasContratos` (sin acción necesaria).
- Distribución actualizada: SIGDO KOPPERS (214), GARDILCIC (179), ZUBLIN (145), ACCIONA-OSSA-PIZZAROTTI (95), GEOVITA (78), MDB (61), CODELCO GOMS (52), SIGMA (3).
- GEOVITA confirma actividad sostenida: 75 SS en V56 → 78 SS en V59. La empresa sigue operando — decisión V55 de mantenerla en BD validada por evidencia.
- Deploy: subir únicamente `data.json` (y opcionalmente este `CHANGELOG.md`). No es necesario tocar el Service Worker.

### Razones
Ciclo regular de sincronización con la planilla WBS oficial de GOMS (`WBS_Semanal__1_.xlsx` del 22-06-26). La planilla anterior (del 22-06-26 sin sufijo) había sido rechazada por contener duplicados internos de IDs entre sectores norte y sur. GOMS corrigió la nomenclatura asignando IDs únicos a cada sector, lo que permitió aplicar esta actualización sin ambigüedades.

## [V58] - 2026-06-10

### Fixed
- **🔴 Crítico — IC se exportaba como CAM en Word**: Un especialista reportó que al hacer una inspección IC, el PDF salía como IC pero el Word salía con formato CAMINATA. La causa raíz es el mismo patrón que V57 (fechaEmision), pero aplicado al campo `caminata` y otros: `cfg.X || await getConfig('X')` evaluaba el snapshot del primer ítem ANTES que el Config IDB actualizado. Como el snapshot siempre tiene valor, nunca se llegaba a leer Config.
  - **Caso reproducido**: usuario empieza una caminata, crea ítems (snapshot `caminata = "CAMINATA DE RECEPCIÓN"`), después decide convertirla en IC y cambia el campo en Config (`getConfig('caminata') = "INSPECCIÓN"`). El PDF lee de getConfig → IC. El Word leía snapshot → CAM. Inconsistencia.

### Changed
- **Modelo mental del export consolidado**: **Config IDB es la única fuente de verdad** para todos los campos del informe. Los snapshots por ítem (`item.config.X`) ahora se ignoran al exportar — solo quedan como fallback si Config IDB está completamente vacío (no debería ocurrir en uso normal).
- **4 campos con prioridad invertida** (Config primero, snapshot como fallback):
  - `caminata` (afecta `tituloWord`, `esCaminata0W`) en `exportarWord()`
  - `empresa` en `generatePDF()` y `exportarWord()`
  - `subsistema` en `generatePDF()` y `exportarWord()`
  - `contrato` en `generatePDF()` y `exportarWord()`
- También quedaron invertidos `originadoPor` por consistencia (mismo patrón).

### Notas técnicas
- **Borradores siguen funcionando sin regresión**: `cargarBorrador()` restaura todos los valores del borrador a Config IDB vía `setConfigBatch()`. Por eso después de cargar, `getConfig('caminata')` devuelve el valor del borrador (no el del config "vivo" previo). El export sigue respetando el borrador completo.
- El razonamiento del usuario fue clave: *"Si genero un borrador debería quedar con todos sus ítems al cargarlo y exportarlo, si guardo otra configuración se debe respetar todo con esa configuración"*. Es decir, **la fuente de verdad debe ser una sola** (Config IDB), no una mezcla incoherente snapshot-vs-IDB.
- Patrón histórico de snapshots por ítem fue diseñado para soportar inspecciones multi-SS (un solo informe con ítems de diferentes subsistemas). En la práctica el equipo no usa eso — siempre 1 SS por inspección. El snapshot quedaba creando confusión sin aportar valor.
- Smoke tests validaron: IC → Word con "INSPECCIÓN DE CALIDAD" ✓, CAM → Word con "CAMINATA" ✓.

### Razones
Reporte del especialista que vio el bug en producción real: el archivo descargado se llamaba `IC-GOMS-DCH_...docx` (porque `codigo` se calcula con getConfig al inicio) pero su contenido se renderizaba como caminata (porque `tituloWord` se calculaba con snapshot). Es la inconsistencia más confusa posible: nombre dice una cosa, contenido dice otra. El fix elimina la posibilidad de ese tipo de discrepancia para todos los campos críticos del informe.

## [V57] - 2026-06-10

### Fixed
- **🔴 Crítico — Bug histórico de fecha del informe**: Al exportar PDF o Word, la fecha del informe mostraba la **fecha del snapshot del primer ítem creado**, no la fecha vigente en "Fecha de Emisión" de Config. Si el usuario creaba ítems un día y exportaba el informe varios días después (workflow real del equipo), la fecha del documento quedaba congelada en la fecha vieja aunque se actualizara en Config.
  - **Causa raíz**: el operador `||` en `generatePDF()` y `exportarWord()` evaluaba `cfg.fechaEmision` (snapshot) **antes** que `await getConfig('fechaEmision')` (IDB actual). Como el snapshot siempre tiene valor, nunca se llegaba a leer el IDB actualizado.
  - **Fix**: invertida la prioridad. Ahora `getConfig('fechaEmision')` se evalúa primero, y `cfg.fechaEmision` queda como fallback solo si el IDB no tiene fecha (situación rara, no debería ocurrir en uso normal).
  - **Caso reportado**: especialista guardó `10-06-2026` en Config, pero el PDF salía con `31-05-2026` (snapshot del día en que creó los ítems).

### Notas técnicas
- El fix aplica en 2 lugares: `generatePDF()` (línea 3659) y `exportarWord()` (línea 3868).
- La exportación a **CSV** (línea 2691) **NO se modifica**: ahí semánticamente corresponde guardar la fecha histórica de creación de cada ítem (es un export de hallazgos individuales, no del informe).
- **Compatibilidad con borradores**: `cargarBorrador()` restaura `cfg.fechaEmision` al IDB con `setConfigBatch`, por lo que la fecha del borrador sigue siendo la que aparece en el PDF/Word cuando se carga uno viejo. Sin regresión.
- 4 escenarios validados con smoke test:
  - Config + snapshot ambos con fecha → usa Config (fix aplicado) ✓
  - Config vacío, snapshot con fecha → cae en snapshot (compat) ✓
  - Ambos vacíos → cae en `Date.now()` (último fallback) ✓
  - Borrador cargado → fecha del borrador ✓

### Razones
Workflow real del equipo: crean ítems progresivamente durante la inspección (a veces varios días) y solo al final ajustan "Fecha de Emisión" en Config para que coincida con la fecha de firma del documento. Hasta V56, ese ajuste se persistía en IDB pero el PDF/Word lo ignoraba. **El fix es mínimo (2 líneas) pero recupera el comportamiento esperado del campo "Fecha de Emisión"** como fuente de verdad del informe.

## [V56] - 2026-05-28

### Added
- **Fecha de firma del Responsable de Construcción (IC)**: nuevo campo `<input type="date" id="ic_firma2_fecha">` debajo de cargo/empresa. **Auto-completa la fecha actual** cuando el usuario firma (touchend/mouseup del canvas), pero es **editable** por si el documento se firma en otro día. Aparece en PDF y Word debajo de "Responsable de Construcción" solo si tiene contenido.
- **Modal de nombre de archivo** antes de descargar PDF o Word. Helper `promptNombreArchivo(opts, callback)` con sugerencia auto-generada (formato `CODIGO_SS_YYYY-MM-DD`). Aplica a ambos formatos:
  - **Word**: el nombre se usa como `download="..."` del link (control total).
  - **PDF**: el nombre se inyecta como `<title>` del HTML del iframe (sugerencia para "Guardar como PDF" del navegador — Chrome/Firefox respetan, Safari iOS a veces).
- **8 nuevos SS en `data.json`** (de 791 a 799):
  - `221160F-01-04` — XC-PD-S05-01 TRAMO 3 (GARDILCIC)
  - `221470F-01-04` — FRSEU1 XCI-08 (GEOVITA)
  - `221810F-01-03` — Rampa by-pass 01 tramo 03 (GEOVITA)
  - `223440-02-05`, `223440-04-05` — Presurizador y detección/extinción (SIGDO KOPPERS)
  - `225511F-02-03A`, `225511F-02-03B` — GA-04-ACA-S05 tramos 01 y 02 (GEOVITA)
  - `222120F-05-04`, `222120F-05-05` — Chimeneas piloto CA-PD-PC (MDB)

### Fixed
- **🔴 Crítico — firmas IC cortadas entre páginas**: el bloque de firmas IC (Inspección + Construcción apiladas) podía partirse entre páginas del PDF/Word, dejando una firma en una página y otra en la siguiente. Causa: el navegador hacía page-break entre las filas de la tabla cuando no entraban juntas.
  - **PDF**: agregadas reglas CSS `page-break-inside: avoid` y `break-inside: avoid` a la tabla de firmas IC, sus filas internas, y al bloque de firmas CAM completo.
  - **Word**: la función `_dxTable` ahora acepta `opts.cantSplit` que agrega `<w:cantSplit/>` a las propiedades de cada fila (`<w:trPr>`). Aplicado a las tablas de firmas IC (apiladas y solo-inspección) y a la tabla de firmantes CAM.

### Changed
- **`data.json` actualizado a 799 SS** (de 791). Se eliminó `225411F-01-04` siguiendo la planilla oficial (ya no figura en `WBS_Semanal__1_.xlsx`).
- 6 SS existentes con cambios menores de nombre/descripción.
- `_descargarWord` ahora acepta el parámetro opcional `customFilename` para permitir nombre editable desde el modal.

### Notas técnicas
- Auto-fill de fecha solo dispara cuando el usuario **firma por primera vez** (campo vacío). Si la fecha ya tiene valor, no la sobrescribe — permite firmar varias veces sin perder la fecha original.
- Formato fecha: `<input type="date">` usa `yyyy-mm-dd` internamente; al renderizar en PDF/Word se convierte a `dd-mm-yyyy` consistente con `fmtFecha`.
- El modal de nombre de archivo es **bloqueante por diseño**: hasta que el usuario confirma o cancela, no se descarga nada. Esto evita race conditions con el iframe del PDF.
- La sugerencia auto-generada limpia caracteres especiales y trunca a 50 chars para evitar problemas en sistemas de archivos.
- Duplicados resueltos consistentes con V54/V55: `223520F-01-05`→GARDILCIC, `225310F-03-01`→GEOVITA.

### Razones
El equipo reportó 3 problemas:
1. Las firmas se cortaban entre páginas al imprimir (visible en la imagen del reporte CAM-REC del PK 0+020).
2. Necesitaban registrar la fecha en que se firmaba el documento (puede no coincidir con la fecha de emisión).
3. Querían control sobre el nombre del archivo para integrarlo con sistemas de gestión documental de CODELCO.

---

## [V55] - 2026-05-19

> **Solo datos** — Esta versión actualizó únicamente `data.json` con +3 SS (de 788 a 791) y agregó un responsable de construcción nuevo. No modificó código (sin bump de `CACHE_NAME`).

### Added
- 3 nuevos SS: `222440-01-10`, `224323F-01-01`, `225413F-01-02`.
- Nuevo responsable de construcción.

### Changed
- `223520F-01-05`: cambio de operador GEOVITA → GARDILCIC (cambio operacional real reflejado en planilla WBS).

### Notas
- Geovita se mantiene en `empresasContratos` (75 SS activos).

## [V54] - 2026-05-19

### Added
- **Apartado OBSERVACIONES en caminatas (CAM)**: nuevo bloque debajo del header con `<textarea id="cam_observaciones">` opcional. Visible solo cuando el tipo de inspección es CAM-REC o CAM-ENT (oculto en IC). Persistente en IDB con clave `camObservaciones`.
- El bloque aparece en PDF y Word **solo si el textarea tiene contenido** (vacío = no aparece). Se inserta entre la tabla de datos del proyecto y la tabla de hallazgos, con borde y título "OBSERVACIONES" en negrita.
- **18 nuevos SS en `data.json`** (de 770 a 788):
  - 10 ventiladores de extracción `222540-01-01` a `-10` (CODELCO GOMS)
  - 1 sala eléctrica `222540-02-04` (CODELCO GOMS)
  - 2 rampas by-pass `221810F-01-01`, `-01-02` (GEOVITA)
  - 4 sistemas eléctricos `223430-01-17`, `223440-04-04`, `223440-05-38`, `223480-01-11` (SIGDO KOPPERS S.A)
  - 2 fortificaciones de cables `221310F-01-08`, `222120F-02-12` (GARDILCIC)

### Changed
- **Cambio de operador en SS `225310F-03-01`**: de MASTER DRILLING - BESALCO (contrato `CC-113`) a GEOVITA (contrato `GCC-001`). Decisión tomada en base a la información del archivo `WBS_Semanal__1_.xlsx` donde el SS aparece duplicado y se prioriza Geovita como operador actual.

### Notas técnicas
- El bloque CAM observaciones se gestiona con el mismo patrón de persistencia de los campos IC: `_wireupPersistenciaIC` con debounce 400ms, respeto del flag `_loadingBorrador`, snapshot en `cfgKeys` de borradores.
- Word: el bloque se renderiza como tabla 1×1 con borde (similar al patrón visual del PDF) usando `_dxTable([obsRow], { totalW: 9639, gridCols: [9639] })`.
- PDF: bloque CSS con `border:1px solid #333`, `padding:8px 10px`, `white-space:pre-wrap` para conservar saltos de línea del textarea.
- `empresasContratos` del data.json verificado: las 8 empresas que aparecen en `wbsData` (incluida SIGDO KOPPERS S.A) ya estaban presentes en la lista de empresas contratistas. Sin cambios necesarios.
- 0 SS eliminados del data.json (los 770 anteriores se mantienen).

### Razones
El equipo en terreno solicitó tener un apartado de observaciones generales en las caminatas (similar al IC) para registrar comentarios contextuales que no caben en la tabla de hallazgos. La actualización de `data.json` corresponde al ciclo regular de sincronización con la planilla WBS oficial de GOMS.

## [V53] - 2026-05-11

### Fixed
- **Crítico — pérdida de fotos al editar ítem**: El modal de edición solo cargaba la primera foto y al guardar sobrescribía el array completo con esa única foto. Si un ítem tenía 3-10 fotos, al editarlo (incluso solo para corregir un texto) perdía 2-9 fotos. Causa raíz: el modal de edición fue diseñado en una versión temprana para 1 foto y nunca se actualizó cuando se agregó soporte multi-foto en V42 (S/O = 10 fotos).

### Added
- **Grilla multi-foto en modal de edición** (paridad con modal de creación). Los slots `editFotoSlot0..9` se muestran dinámicamente según prioridad (3 normal / 10 S/O).
- Funciones nuevas: `poblarEditFotos(fotos)`, `actualizarTituloFotosEdit()`, `handleEditFotoSlot(event)`, `removeEditPhotoSlot(slot)`.
- Variable global `_editingItemId` que rastrea si estamos creando o editando (flag para reutilizar UI de fotos con `_currentFotos` compartido).

### Changed
- **Límite de borradores subido de 5 a 10**: `MAX_BORRADORES = 10`. Permite mantener más inspecciones simultáneas sin tener que descartar trabajo pendiente. Soluciona reporte del equipo: "instalo la app múltiples veces para tener más espacios de trabajo".
- **Renombrado UI "Borrador" → "Inspección Guardada"** (solo textos visibles al usuario, sin tocar código interno):
  - `📁 Borradores` → `📁 Inspecciones Guardadas`
  - `💾 Guardar Borrador Actual` → `💾 Guardar Inspección Actual`
  - Toasts: `Borrador guardado/cargado/eliminado` → `Inspección guardada/cargada/eliminada`
  - Contador: `0/5` → `0/10`
  - Mensaje vacío: `Sin borradores guardados` → `Sin inspecciones guardadas`
- Funciones obsoletas eliminadas: `handleEditPhotoSelect`, `removeEditPhoto` (reemplazadas por las multi-slot).

### Removed
- HTML obsoleto del modal de edición: bloque single-photo (`editPhotoUpload`, `editPhotoPreview`, `editPhotoActions`) reemplazado por grilla de 10 slots.

### Notas técnicas
- El flag `_editingItemId` evita necesidad de duplicar funciones de fotos entre modal de creación y edición. La variable `_currentFotos` se comparte; el handler decide en qué slot escribe según el contexto activo.
- Compatibilidad con formato legacy: `item.foto` (single string) y `item.fotos[]` (array). Al guardar, ambos campos se actualizan (`item.fotos = fotosLimpias`, `item.foto = fotosLimpias[0]`) para no romper código que lee el formato viejo.
- `editFotoInput` y `editFotoCamInput` son inputs únicos compartidos entre los 10 slots (vs. modal de creación que tiene 10 pares de inputs `fotoInput0..9`). Esto reduce HTML pero requiere usar `_fotoModoSlot` para saber qué slot está activo.
- Sin migración de datos: ítems creados pre-V53 con formato `item.foto` o `item.fotos = [una sola]` se cargan correctamente en el modal nuevo.

### Roadmap
- V53 cierra **Fase 1** del plan multi-sesión: alivio inmediato (10 borradores) + fix pérdida fotos + cambio terminológico.
- **Fase 2 (V54-V55)** queda pendiente: implementar selector global de inspección activa en header (multi-sesión real) según diseño de ARQUITECTURA.md.

## [V52] - 2026-05-11

### Fixed
- **Crítico**: Firmas CAM no aparecían al cargar borrador hasta apretar "Agregar firma" (faltaba `renderFirmantes()` después de restaurar `_firmantes`).
- **Crítico**: `loadConfig()` se llamaba SIN `await` dentro de `cargarBorrador`, causando race conditions con el repintado de firmas IC y campos del DOM.
- **Crítico**: Pérdida de `planoReferencial` y `nombreLabor` al cargar borrador. Causa: listeners debounce 400ms de `_wireupPersistenciaIC` se disparaban DURANTE la carga, sobrescribiendo con valores parciales del DOM.
- **Alto**: `actualizarVisibilidadFirmantes` se llamaba 2 veces tras cargar borrador (una desde `loadConfig`, otra desde `setTimeout` redundante).
- **Alto**: Campos derived_* (Sistema, TOP, Área, WBS) quedaban en "—" si el SS del borrador no existía en el `data.json` actualizado. Ahora se restauran desde el cfg del borrador como fallback.
- **Medio**: `nuevaInspeccion()` limpiaba IDB pero no recargaba la UI, dejando dropdowns con valores fantasma.

### Added
- Flag global `_loadingBorrador` que deshabilita listeners de persistencia durante carga de borrador.
- Helper `_getBool(key)` que normaliza booleanos de IDB (maneja `true`/`'true'`/`1`/`'1'` de forma consistente).
- Helper `setConfigBatch(obj)` que escribe múltiples claves en 1 sola transacción IDB (10× más rápido, atómico).
- **Indicador de versión visible** en el footer del Config: `Punch List PWA · V52 · WBS Sync: [fecha]`. Permite verificar de un vistazo qué versión está corriendo en cada dispositivo — clave para troubleshoot de cache en iOS.
- `APP_VERSION` constante en JS sincronizada con `CACHE_NAME`.
- **`ARQUITECTURA.md`**: documento técnico de referencia con análisis arquitectónico, fuentes de verdad, race conditions, roadmap V53-V56 (Nivel 1).

### Changed
- Refactor completo de `cargarBorrador()`: flujo atómico secuencial sin race conditions. Estructura: flag loading → batch IDB write → set memoria → await loadConfig → render UI → repintar canvas → flag off.
- Reemplazadas 4 lecturas booleanas inconsistentes (`getConfig === true || === 'true'`) por `_getBool()`.

### Notas técnicas
- El refactor no toca el generador OOXML (`generarDocx`) ni el flujo de PDF — solo arregla el ciclo de vida de borradores.
- Smoke test de regresión con `python-docx` confirma que el Word IC sigue generando correctamente (5 tablas, firmas 2×1 apiladas).
- Próxima evolución planeada (V53): empezar Nivel 1 con `AppState` centralizado.

### Razones
El equipo en terreno reportaba: errores entre borradores, pérdida de información (firmas, planos), y necesidad de apretar "Agregar firma" para refrescar UI al cargar borrador. Esta versión elimina las causas raíz (6 bugs documentados) sin cambiar el stack tecnológico.

## [V51] - 2026-05-07

### Added
- **Toggle "🚫 Sin Responsable Construcción"** en Config (justo arriba de la tarjeta de firma 2 IC).
- Nueva clave IDB `sinRespConstr` (boolean) persistida con el resto del config.
- Flag se incluye en snapshot de borradores y se resetea al hacer "Nueva Inspección".

### Changed
- **Cuando el toggle está activo**:
  - La tarjeta UI de firma 2 (nombre, cargo, empresa, canvas) se oculta completamente.
  - El bloque de firmas en el PDF muestra **solo la firma de Inspección** (tabla de 1 fila en lugar de 2).
  - El bloque de firmas en el Word muestra **solo la firma de Inspección** (tabla 1×1 en lugar de 2×1).
  - Los datos de nombre/cargo/empresa/firma de Construcción se ignoran al exportar (no aparecen en ningún lado).
- **Cuando el toggle está desactivado** (default): comportamiento idéntico a V50 — ambas firmas apiladas verticalmente.

### Razón del cambio
Para inspecciones de bodega o procesos generales no aplica un Responsable de Construcción. Antes el bloque de firma 2 aparecía en el documento con la línea vacía y el nombre vacío, generando confusión sobre si "faltaba firmar" o "no correspondía".

### Notas técnicas
- `buildHTMLInspeccion` recibe nuevo parámetro `sinRespConstr` (último, opcional).
- En Word el builder OOXML detecta `d.sinRespConstr` y arma la tabla con 1 o 2 filas según corresponda.
- Toggle es independiente de `sinSS`: las 4 combinaciones funcionan (con/sin SS × con/sin Resp Construcción).


## [V50] - 2026-05-07

### Added
- **Toggle "📦 Inspección sin SubSistema"** en Config: permite generar inspecciones que no requieren un SS asociado (bodega de materiales, inspecciones de proceso, etc.).
- Nueva clave IDB `sinSS` (boolean) que se persiste en config.
- Flag `sinSS` se guarda en cada ítem (en `item.config.sinSS`) — registro permanente del modo de inspección.

### Changed
- Cuando el toggle está activo:
  - El selector "N° SubSistema" se deshabilita visualmente.
  - La marca de obligatoriedad (`*`) desaparece del label.
  - El placeholder dice "No requerido (inspección sin SS)".
  - Los campos derivados (Contrato, Sistema, TOP, Área, WBS) se muestran como "—".
  - El warning toast "⚠️ SubSistema no configurado" deja de aparecer al crear ítems.
- En la lista de ítems: card muestra "SIN SUBSISTEMA" en lugar del código vacío.
- En PDF y Word: campos `subsistema`, `subsistemaNombre`, `wbsNombre`, `areaNombre` aparecen como "SIN SUBSISTEMA".

### Razón del cambio
Hay inspecciones legítimas sin SS asociado (bodega, materiales, procesos generales). Antes se forzaba seleccionar uno cualquiera y quedaba inconsistente, o el warning toast aparecía constantemente.

### Fixed
- Hallazgo lateral: el botón "🗑️ Limpiar" de la pestaña Lista borraba ítems pero no el config. Si se creaba un ítem nuevo, heredaba el SS de la inspección previa. Con V50 el flag `sinSS` queda en el ítem al momento de crear, así que aunque el config tenga otro SS, la card y los exports respetan la decisión original del ítem.

## [V49] - 2026-05-07

### Changed
- **Nombre del Responsable de Construcción** en la firma 2 de IC ahora es un **input editable** (antes era display de solo lectura tomado del dropdown `respConstruccion` de Config).
- Se mantiene auto-rellenado: si el input está vacío al entrar a IC, se sugiere el nombre del responsable seleccionado en Config. Una vez que el usuario tipea, su valor queda persistido en IDB y no se sobrescribe.

### Added
- Nueva clave IDB `icFirma2Nombre` (mismo patrón que `icFirma2Cargo` e `icFirma2Empresa` desde V44).
- Incluida en snapshot de borradores y en limpieza de `nuevaInspeccion()`.

### Razón del cambio
Cuando llega un responsable de construcción nuevo (no listado en `data.json`), el equipo necesitaba poder firmarlo sin esperar deploy de versión actualizada de la PWA. Ahora cualquier nombre se puede escribir directamente.

### Sin cambios
- La firma 1 (Responsable Inspección) se mantiene como dropdown de Config.
- El subsistema sigue siendo opcional para CAM (ya estaba desde V48). No se agregó modo "input libre".

---

## [V48] - 2026-05-06

### Fixed
- Las Caminatas (CAM-REC y CAM-ENT) ya no exigen `Plano Referencial` ni `Nombre Labor` para generar PDF o Word. Ambas validaciones quedan condicionales: solo se aplican a IC.

### Notas técnicas
- `generatePDF()` y `exportarWord()` detectan tipo de documento desde DOM (no IDB) antes de validar.
- Footers (PDF y Word) ya distinguían IC de CAM correctamente desde V43 — sin cambios en esta versión.

---

## [V47] - 2026-05-05

### Fixed
- **Crítico**: Las firmas IC desaparecían al hacer refresh del navegador (vivían solo en variables JS en memoria).
- **Crítico**: Las firmas IC desaparecían al cargar un borrador (race condition entre `initFirmaIC` que reseteaba el canvas y `setTimeout(repintar, 350ms)` que dibujaba).
- **Crítico**: Las firmas IC desaparecían tras refrescar después de cargar un borrador (el snapshot rellenaba la variable JS pero no IDB).
- Canvas de firma se borraba al asignar `canvas.width` sin repintarse.

### Changed
- Las firmas IC en el PDF se movieron al **final del documento** (después de la tabla de hallazgos), igual que en Caminata y en el Word — paridad estructural.
- `initFirmaIC()` y `initFirmaIC2()` refactorizadas: ahora dimensionan el canvas Y dibujan la dataURI en una sola pasada, sin race conditions.

### Added
- Persistencia de firmas IC en IndexedDB (claves `icFirmaData` e `icFirmaConstruccionData`). Triple respaldo: variable JS + IDB + snapshot de borrador.
- `cargarBorrador()` ahora también escribe firmas a IDB para sobrevivir refresh post-carga.

### Removed
- `setTimeout(() => { repintar(...) }, 350)` obsoleto en `cargarBorrador` — el repintado ahora lo hace `initFirmaIC*` directamente.

---

## [V46] - 2026-05-05

### Changed
- **Paridad estricta PDF↔Word**: el `.docx` exportable ahora tiene **idéntica estructura de tablas** que el PDF.
  - Word IC pasó de 5 → 6 columnas en tabla de hallazgos: `ID | UBICACIÓN | DISCIPLINA | DESCRIPCIÓN | FECHA COMPR. CIERRE | PRIORIDAD`.
  - Word CAM: header `PRIOR.` → `PRIORIDAD` (texto completo).
  - Word CAM: header `FECHA` → `FECHA COMPR. CIERRE`.
- Anchos de columnas idénticos en PDF y Word (4/16/11/41/14/14).

### Razón
El Word es ahora la herramienta de edición/corrección oficial del equipo. Cualquier diferencia estructural con el PDF generaba confusión al editar.

---

## [V45] - 2026-05-05

### Added
- **Columna DISCIPLINA** en tablas de hallazgos del PDF y Word (IC y CAM). El campo `it.disciplina` ya existía en cada ítem, solo faltaba renderizarlo.
- Anchos de columnas reorganizados: 4/16/11/41/14/14 (PDF y Word, IC y CAM).

### Changed
- **Firmas IC apiladas verticalmente** (en lugar de lado a lado) tanto en PDF como en Word. Tabla 2 filas × 1 columna, ancho 60% del útil.
- En PDF: la fila "RESPONSABLE INSPECCIÓN" en la tabla de datos ahora ocupa el ancho completo (la celda donde estaba la firma chica se mergeó).
- En Word: tabla de firmas IC pasó de 1×2 horizontal a 2×1 vertical.

### Data
- `data.json`: actualizada hoja WBS desde `Auxiliar_V2_FELIPE.xlsx`. Pasa de 760 a **770 registros** WBS (+11 nuevos).
- 1 ss_id duplicado conocido: `225310F-03-01` aparece dos veces (GEOVITA y MASTER DRILLING - BESALCO). Decisión: cargar ambos. El segundo no se podrá seleccionar desde el dropdown porque `find()` toma el primero — aceptado porque MDB no tiene más inspecciones en ese subsistema.
- Otros arrays (empresasContratos, especialistasBase, responsablesConstruccion, ingenierosSistema) sin cambios.

### Notas técnicas
- Fila 718 del Excel tenía `\n` interno en SubSistema. Normalizado automáticamente en el parseo Python.

---

## [V44] - 2026-05-04

### Added
- **Segunda firma IC**: nueva tarjeta "Firma Responsable Construcción" debajo de la firma de Inspección.
  - Nombre auto-leído de `respConstruccion` (Config).
  - Inputs editables para Cargo y Empresa (también persistentes en IDB con claves `icFirma2Cargo`, `icFirma2Empresa`).
  - Variable global `_icFirmaConstruccionData`, funciones `initFirmaIC2()` / `limpiarFirmaIC2()`.
- **Persistencia de campos IC**: ahora se guardan en IDB con debounce 400ms al escribir.
  - Claves nuevas: `icNivel`, `icObjetivo`, `icDesarrollo`, `icObservaciones`.
  - Función helper `_wireupPersistenciaIC()` se invoca al boot.
  - Se incluyen en snapshot de borradores (al guardar y restaurar).
- **Bloque firmas IC en Word**: cierre del gap. El export Word ahora incluye también la firma IC (PDF ya la tenía).
- En PDF IC: bloque dedicado al final con línea + nombre + cargo + empresa + rol "Responsable de Construcción".

### Fixed
- **Bug pérdida campos IC al refresh**: los `<textarea>` de Nivel, Objetivo, Desarrollo, Observaciones ya no se borran al recargar la página. Antes solo se persistían al generar PDF.
- **Bug borradores incompletos**: el snapshot ahora incluye los 4 campos IC y ambas firmas IC.

### Notas técnicas
- Bug agnóstico de plataforma. Se reportaba más en Android porque ese navegador limpia más agresivamente.

---

## [V43] - 2026-05-04

### Added
- **Generador `.docx` OOXML real desde cero**, ~600 líneas, 100% offline, sin librerías externas.
  - Mini ZIP STORE writer (signatures little-endian, CRC32 lookup table).
  - Builders OOXML: tablas con anchos en `dxa`, imágenes con dimensiones EMU explícitas, paginación con `<w:fldChar>` PAGE/NUMPAGES.
  - Helpers prefijo `_dx*` para evitar colisiones (`_dxCrc32`, `_dxZipStore`, `_dxBuildBody`, etc.).
  - API principal: `generarDocx(d)` retorna `Uint8Array` empaquetable.
  - MIME oficial `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
  - Imágenes embebidas como bytes reales en `word/media/imageN.{jpeg,png}`, referenciadas por `rId`.
  - Footer con código + subsistema (CAM) o nombre labor (IC).

### Changed
- `_descargarWord()` reemplazada: ahora invoca `generarDocx()` y descarga `.docx` real, en lugar del `.doc` HTML del V42.

### Fixed
- Imágenes en Word ya no salen "desconfiguradas" como en V42.
  - Causa raíz V42: `<div display:inline-block; width:45%>` reflowaba como párrafo en Word, `object-fit:contain` ignorado, data-URIs re-encoded.
  - Solución V43: bytes reales + dimensiones físicas en EMU + tabla 2 columnas con anchos fijos.

### Notas técnicas
- Validación con `python-docx` y LibreOffice (`--convert-to pdf`) confirma estructura correcta antes del deploy.

---

## [V42] - 2026-04-XX

### Added
- **Sistema de borradores**: guardar/cargar/eliminar hasta 5 borradores con snapshot completo (config + items + firmantes).
  - Nuevo store IDB `borradores`.
  - DB_VERSION bumpeada de 4 → 5.
  - UI con botones en Config para gestionar borradores.
- **Firmas Caminata persistentes en IDB** (antes vivían solo en `sessionStorage`).
- **Paginación PDF correcta** con CSS `@page @bottom-center` + `counter(page)` / `counter(pages)`.
- **Word Caminata** ahora incluye campos WBS, ÁREA, EMPRESA en el header (antes faltaban).

### Changed
- `buildWordIC` y `buildWordCaminata` separados como funciones distintas (antes era una sola con if/else interno).
- Códigos PDF: `IC-GOMS-DCH` (Inspección), `CAM-REC` (Caminata Recepción), `CAM-ENT` (Caminata Entrega).
- Label "Aviso" reemplaza "Correlativo" en formularios de Caminata.
- S/O priority pasa de 3 a 10 fotos máximo (variable dinámica `_maxFotoSlot`).
- "RESPONSABLE" eliminado del encabezado de Caminatas.

### Fixed
- Edición de fotos en modal: maneja correctamente legacy `foto` (string) vs `fotos[]` (array).

### Data
- `data.json`: 760 registros WBS, 8 empresas.

---

## Reglas del proyecto

Estas reglas se aplican en todas las versiones:

1. **CSV de 20 columnas**: NUNCA modificar formato, sin importar UI o data source.
2. **JS brace balance**: debe ser exactamente 0 después de cada cambio. Verificar con `node --check`.
3. **Strings en `buildHTML*` / `buildWord*`**: usar concatenación con `+`, NUNCA template literals (`` ` ``). Esto evita escapes complicados de `${}` cuando el código se procesa por scripts Python.
4. **Análisis previo obligatorio**: siempre evaluar y proponer ANTES de ejecutar cambios. Felipe confirma explícitamente antes de implementar.
5. **Entregable estándar**: ZIP o paquete con los 3 archivos `index.html`, `sw.js`, `data.json` (más `pdf_to_docx.py` cuando corresponda).
6. **Bumpeo de `CACHE_NAME`** en cada release (clave para invalidación del Service Worker en cliente).
7. **Versiones numeradas secuencialmente** (V42, V43, V44, ...) sin sub-versiones (no hay V44.1).

---

## Workflow oficial Word

Establecido en V47:

1. Inspecciones nuevas → usar **`exportarWord()` de la PWA** (genera OOXML nativo de calidad).
2. Editar el `.docx` en Microsoft Word para corregir contenido.
3. Cuando está aprobado → exportar a PDF desde Word (`Archivo → Guardar como PDF`).
4. El script `pdf_to_docx.py` queda **solo para PDFs históricos** sin versión digital. Calidad mediocre con layouts complejos, requiere retoque manual.
