# 📱 PUNCH LIST PWA — Sistema de Inspección Offline

Sistema de registro de inspecciones (Punch List / Acta de Terminaciones) diseñado para funcionar **100% offline** en dispositivos móviles y tablets.

---

## ✨ Características

- ✅ **100% Offline-First** — Funciona sin conexión a internet
- ✅ **PWA Instalable** — Se instala como app nativa
- ✅ **Compatible iOS/Android** — Probado en Safari y Chrome
- ✅ **IndexedDB** — Almacenamiento persistente de datos
- ✅ **Exportación CSV** — Descarga directa de datos
- ✅ **UI Touch-Optimized** — Diseñada para uso en terreno
- ✅ **Sin Dependencias Externas** — Todo embebido

---

## 📁 Estructura del Proyecto

```
punch-list-pwa/
├── index.html      # App completa (HTML + CSS + JS embebido)
├── manifest.json   # Configuración PWA
├── sw.js          # Service Worker para cache offline
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md       # Este archivo
```

---

## 🚀 Despliegue

### Opción 1: GitHub Pages (Recomendado)

1. **Crear repositorio en GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/punch-list-pwa.git
   git push -u origin main
   ```

2. **Activar GitHub Pages**
   - Ir a Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

3. **Acceder a la app**
   - URL: `https://TU_USUARIO.github.io/punch-list-pwa/`

### Opción 2: Netlify

1. Arrastrar la carpeta `punch-list-pwa` a [netlify.com/drop](https://app.netlify.com/drop)
2. Obtener URL automática

### Opción 3: Servidor Local (Testing)

```bash
# Con Python
cd punch-list-pwa
python3 -m http.server 8080

# Con Node.js
npx serve .

# Acceder en http://localhost:8080
```

### ⚠️ IMPORTANTE: HTTPS Requerido

Las PWA requieren HTTPS para funcionar correctamente (excepto localhost).
- GitHub Pages y Netlify proveen HTTPS automáticamente
- Para servidores propios, configurar certificado SSL

---

## 📲 Instalación en Dispositivos

### iOS (iPhone / iPad)

1. Abrir la URL en **Safari** (obligatorio)
2. Tocar el botón **Compartir** (⬆️)
3. Seleccionar **"Añadir a pantalla de inicio"**
4. Confirmar el nombre y tocar **Añadir**
5. La app aparecerá como icono en el Home Screen

### Android (Chrome)

1. Abrir la URL en **Chrome**
2. Aparecerá un banner **"Añadir a pantalla de inicio"**
   - Si no aparece: Menú (⋮) → "Instalar aplicación"
3. Confirmar la instalación
4. La app aparecerá como icono en el Home Screen

### Verificar Instalación

Una vez instalada, la app:
- Se abre en pantalla completa (sin barra de navegador)
- Funciona sin conexión a internet
- Los datos persisten aunque cierres la app

---

## 🔧 Configuración

### Personalizar Empresa y Proyecto

1. Abrir la app
2. Ir a pestaña **⚙ Config**
3. Modificar:
   - Empresa
   - Proyecto / Gerencia
   - Área
   - Inspector
4. Tocar **Guardar Configuración**

### Disciplinas y Prioridades

Las disciplinas y prioridades están definidas en el código dentro de `DEFAULT_CONFIG`:

```javascript
disciplinas: [
  { code: 'E', name: 'Eléctrico' },
  { code: 'M', name: 'Mecánico' },
  // ...
],
prioridades: [
  { code: 'P1', name: 'Alta', desc: 'Seguridad / Crítico' },
  // ...
]
```

Para modificarlas, editar el archivo `index.html` y actualizar el Service Worker.

---

## 📤 Exportación de Datos

### CSV

1. Ir a pestaña **📋 Lista**
2. Tocar botón **⬇ CSV**
3. El archivo se descarga automáticamente
4. Compatible con Excel, Google Sheets, Numbers

### PDF (Impresión)

1. Ir a pestaña **📋 Lista**
2. Tocar botón **⬇ PDF**
3. Se abre el diálogo de impresión del sistema
4. Seleccionar "Guardar como PDF" o imprimir

---

## 🔄 Actualizar la App

Cuando publiques una nueva versión:

1. **Modificar la versión del cache** en `sw.js`:
   ```javascript
   const CACHE_NAME = 'punchlist-v1.0.1'; // Incrementar versión
   ```

2. Publicar los cambios

3. Los usuarios verán un mensaje:
   > "Nueva versión disponible. Recarga para actualizar."

4. Al recargar, se descargará la nueva versión

---

## 🐛 Solución de Problemas

### La app no se instala

- Verificar que la URL sea HTTPS
- En iOS, usar Safari (no Chrome)
- Limpiar cache del navegador y reintentar

### Los datos no persisten

- Verificar que IndexedDB esté habilitado
- En modo privado/incógnito los datos no persisten
- Verificar que hay espacio en el dispositivo

### La app no funciona offline

- Verificar que el Service Worker esté registrado
  - DevTools → Application → Service Workers
- Recargar la página mientras hay conexión
- Esperar a que el SW cachee todos los recursos

### Error "No se puede conectar"

- Verificar conexión inicial para instalar la app
- Una vez instalada, funcionará offline
- Si persiste, limpiar datos y reinstalar

---

## 📋 Compatibilidad

| Plataforma | Navegador | Estado |
|------------|-----------|--------|
| iOS 14+ | Safari | ✅ Probado |
| iOS 14+ | Chrome | ⚠️ Instalar desde Safari |
| Android 8+ | Chrome | ✅ Probado |
| Android 8+ | Firefox | ✅ Compatible |
| macOS | Safari/Chrome | ✅ Compatible |
| Windows | Chrome/Edge | ✅ Compatible |

---

## 📄 Licencia

Desarrollado para uso interno.
© 2024 — Sistema de Calidad VP

---

## 🛠️ Soporte Técnico

Para reportar problemas o solicitar mejoras:
1. Documentar el error (captura de pantalla)
2. Indicar dispositivo y versión del sistema operativo
3. Describir los pasos para reproducir el error
