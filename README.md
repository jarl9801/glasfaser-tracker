# Glasfaser Tracker

[![Deploy](https://github.com/jarl9801/glasfaser-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/jarl9801/glasfaser-tracker/deployments)

Tracker de proyectos de fibra óptica (Glasfaser) para gestión de instalaciones, reportes de campo y seguimiento de progreso.

🔗 **Demo en vivo:** https://jarl9801.github.io/glasfaser-tracker

## Características

- 📊 **Dashboard** con estadísticas en tiempo real y gráficos de progreso
- 📁 **Importación multi-formato** (CSV/XLSX) desde 5 fuentes diferentes:
  - DP-Export (datos de distribución)
  - Anschluss-Export (conexiones de clientes)
  - Soplado RD (reportes de campo - 6/12/24 fibras)
  - Soplado RA (reportes de campo - 44/96/144/288 fibras)
  - Fusiones DP (reportes de fusiones)
- 🔍 **Búsqueda y filtros** avanzados por POP, DP, calle, estado
- 🌐 **Normalización automática** de datos:
  - Matching fuzzy de calles (español → alemán)
  - Mapeo de colores (español → alemán)
  - Normalización de DP y KA
- 📱 **PWA** - Funciona offline, instalable en móvil/desktop
- 💾 **IndexedDB** - Almacenamiento local, datos persistentes

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Zustand (estado global)
- Dexie (IndexedDB wrapper)
- Recharts (gráficos)
- TanStack Virtual (tablas virtuales)

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

El deploy es automático vía GitHub Actions al hacer push a `main`.

## Estructura de Datos

### DP (Distribution Points)
- Información de construcción (Tiefbau)
- Estado de soplado y fusiones
- Fechas de inicio/fin

### Conexiones
- Datos del cliente (calle, número, KA)
- Estado de instalación (8 estados posibles)
- IDs de cable y fechas

### Reportes de Campo
- **Soplado**: metros, color de miniducto, certificación
- **Fusiones**: cantidad de fusiones, técnico, incidencias
