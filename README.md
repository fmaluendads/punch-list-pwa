# Punch List PWA

Sistema de inspección de calidad offline-first para minería subterránea, desarrollado para **CODELCO División Chuquicamata Subterránea**, operado por **GOMS (Gerencia de Obras Mina Subterránea)**.

[![Versión actual](https://img.shields.io/badge/versi%C3%B3n-V52-blue)](./CHANGELOG.md)
[![Estado](https://img.shields.io/badge/estado-en%20producci%C3%B3n-success)](https://fmaluendads.github.io/punch-list-pwa/)
[![Plataforma](https://img.shields.io/badge/PWA-offline--first-orange)](#)

---

## 🇪🇸 Español

### ¿Qué es?

Punch List es una **Progressive Web App** (PWA) que permite a inspectores de calidad de terreno generar reportes profesionales (PDF y Word) sin necesidad de conexión a internet. La app está diseñada para uso intensivo en minería subterránea, donde la conectividad es limitada o inexistente.

### ¿Para quién?

Esta aplicación fue desarrollada específicamente para los equipos de **CODELCO Chuquicamata Subterránea** que operan bajo **GOMS Ingeniería**. Soporta dos tipos de inspección:

- **Inspección de Calidad (IC)** — Código `IC-GOMS-DCH`
- **Caminata de Recepción / Entrega (CAM)** — Códigos `CAM-REC` / `CAM-ENT`

### Características principales

- ✅ **Funciona 100% offline** después de la primera carga (Service Worker + IndexedDB)
- ✅ **Generación nativa de PDF** vía navegador (sin librerías externas)
- ✅ **Generación nativa de Word (.docx)** con OOXML real (editable en Microsoft Word)
- ✅ **Firmas digitales** con canvas HTML5 (responsable inspección + construcción)
- ✅ **Catálogo WBS offline**: 770 subsistemas pre-cargados
- ✅ **Borradores** con snapshot completo (config + ítems + firmas), hasta 5 simultáneos
- ✅ **Inspección sin SS** para bodegas y procesos (V50+)
- ✅ **Sin Responsable Construcción** opcional para inspecciones que no aplican (V51+)
- ✅ **Disciplina por hallazgo** en tabla de hallazgos PDF/Word (V45+)
- ✅ **Paridad estricta PDF↔Word** para edición/correcciones (V46+)
- ✅ **Soporte iOS, Android, Windows, Mac** (cualquier dispositivo con navegador moderno)

### Acceso a la app

Producción: **[https://fmaluendads.github.io/punch-list-pwa/](https://fmaluendads.github.io/punch-list-pwa/)**

### Cómo instalar en dispositivos

**En iOS (iPhone/iPad)**:
1. Abrir Safari y entrar a la URL de la app
2. Tocar el botón "Compartir" (cuadrado con flecha hacia arriba)
3. Tocar "Agregar a pantalla de inicio"
4. Confirmar "Agregar"

**En Android (Chrome/Edge)**:
1. Abrir el navegador y entrar a la URL
2. Aparecerá un banner "Instalar Punch List" — tocarlo
3. Si no aparece: menú → "Instalar aplicación"

**En Desktop (Windows/Mac)**:
1. Abrir Chrome o Edge en la URL
2. Ícono de instalación en la barra de direcciones (a la derecha) → "Instalar"

### Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML/CSS/JS vanilla (single-file, sin frameworks) |
| Storage | IndexedDB nativo (5 stores, DB_VERSION=5) |
| Service Worker | Estrategias mixtas (cache-first, network-first, stale-while-revalidate) |
| Generación PDF | HTML + iframe + browser print API |
| Generación DOCX | OOXML ZIP STORE desde cero (sin dependencias) |
| Deploy | GitHub Pages |
| Versionado | CACHE_NAME + Git tags |

### Documentación

- **[CHANGELOG.md](./CHANGELOG.md)** — Historial completo de versiones (V42 → V52)
- **[ARQUITECTURA.md](./ARQUITECTURA.md)** — Documento técnico de arquitectura, race conditions identificadas, y roadmap evolutivo

### Mantenimiento

- **Mantenedor principal**: Felipe Maluenda
- **Contacto**: felipeandres.maluenda@gmail.com
- **Empresa**: GOMS Ingeniería (División Chuquicamata Subterránea — CODELCO)

### Soporte y reportes de bugs

Para reportar problemas o solicitar features:
1. Abrir un Issue en este repositorio
2. O contactar directamente al mantenedor por email

### Licencia

Software propietario de uso interno para CODELCO y GOMS Ingeniería. Todos los derechos reservados.

---

## 🇬🇧 English

### What is it?

Punch List is an offline-first **Progressive Web App** that allows field quality inspectors to generate professional reports (PDF and Word) without internet connectivity. The app is designed for heavy use in underground mining operations, where connectivity is limited or non-existent.

### Who is it for?

This application was developed specifically for the field teams of **CODELCO Chuquicamata Underground Division**, operated by **GOMS Engineering**. It supports two inspection types:

- **Quality Inspection (IC)** — Code `IC-GOMS-DCH`
- **Reception / Delivery Walkthrough (CAM)** — Codes `CAM-REC` / `CAM-ENT`

### Key features

- ✅ **100% offline after first load** (Service Worker + IndexedDB)
- ✅ **Native PDF generation** via browser (no external libraries)
- ✅ **Native Word (.docx) generation** with real OOXML (editable in Microsoft Word)
- ✅ **Digital signatures** with HTML5 canvas
- ✅ **Offline WBS catalog**: 770 pre-loaded subsystems
- ✅ **Drafts** with full snapshot, up to 5 concurrent
- ✅ **iOS, Android, Windows, Mac support**

### Live URL

Production: **[https://fmaluendads.github.io/punch-list-pwa/](https://fmaluendads.github.io/punch-list-pwa/)**

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (single-file, no frameworks) |
| Storage | Native IndexedDB (5 stores) |
| Service Worker | Mixed strategies (cache-first, network-first, stale-while-revalidate) |
| PDF generation | HTML + iframe + browser print API |
| DOCX generation | OOXML ZIP STORE from scratch (no dependencies) |
| Deployment | GitHub Pages |

### Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** — Complete release history (V42 → V52)
- **[ARQUITECTURA.md](./ARQUITECTURA.md)** — Technical architecture document (Spanish)

### Maintenance

- **Lead maintainer**: Felipe Maluenda
- **Contact**: felipeandres.maluenda@gmail.com
- **Company**: GOMS Engineering (Chuquicamata Underground Division — CODELCO)

### Support and bug reports

To report issues or request features:
1. Open an Issue in this repository
2. Or contact the maintainer directly via email

### License

Proprietary software for internal use by CODELCO and GOMS Engineering. All rights reserved.

---

*This is a private operational tool. The repository is public for transparency and development purposes only.*
