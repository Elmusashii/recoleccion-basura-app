# 🚛 App de Rutas de Recolección y Denuncias Municipales (Asunción)

Sistema integral para la visualización de rutas de recolección de basura, gestión de reclamos/denuncias ciudadanas con geolocalización y fotos, y panel de administración interna para la flota de camiones de la Municipalidad de Asunción.

---

## 🏛️ Arquitectura y Stack 100% Gratuito (Costo $0)

| Capa | Tecnología | Justificación y Ventajas |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Tailwind CSS | Interfaz reactiva ultrarrápida con Glassmorphism y diseño responsivo adaptado a móviles. |
| **Mapas** | Leaflet.js + OpenStreetMap (CARTO Voyager) | Mapas interactivos sin límite de créditos ni necesidad de tarjetas de crédito. |
| **Backend** | Node.js + Express (API REST) | Arquitectura modular con Rate Limiting, Helmet, CORS y middlewares de seguridad. |
| **Base de Datos** | Supabase (PostgreSQL + PostGIS) | Consultas espaciales (EPSG:4326), RLS (Row Level Security) y 500 MB gratis. |
| **Almacenamiento** | Supabase Storage | Bucket público `denuncias-fotos` (1 GB gratuito) para fotos de vertederos clandestinos. |
| **Autenticación** | Supabase Auth (JWT) | Control de acceso basado en roles (`admin`, `supervisor`, `operator`, `citizen`). |

---

## 📁 Estructura del Monorepo

```text
recoleccion-basura-app/
├── .env.example                # Variables de entorno unificadas
├── .gitignore
├── README.md                   # Documentación técnica del proyecto
├── package.json                # Monorepo con npm workspaces y script concurrently
├── supabase/
│   └── schema.sql              # Script SQL con PostGIS, tablas, RLS y triggers
├── client/                     # Frontend (React / Vite + Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # AdminDashboard.jsx (KPIs, Bitácora, Moderación)
│   │   │   └── citizen/        # CitizenMap.jsx, ReportModal.jsx
│   │   ├── context/            # AuthContext.jsx
│   │   ├── hooks/              # useGeolocation.js (Coordenadas de Asunción)
│   │   ├── services/           # api.js (Axios) y supabase.js (Storage/Auth)
│   │   ├── App.jsx             # Switcher de vistas y buscador de tickets
│   │   ├── index.css           # Tailwind + Glassmorphism + Leaflet CSS
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── server/                     # Backend (Node.js / Express)
    ├── src/
    │   ├── config/             # supabase.js (Cliente Backend Seguro)
    │   ├── controllers/        # routes, reports, fleet
    │   ├── middlewares/        # auth.js (JWT), errorHandler.js
    │   ├── routes/             # routes, reports, fleet
    │   ├── utils/              # response.js (JSON estandarizado)
    │   └── server.js           # Inicializador Express con CORS y Helmet
    ├── .env.example
    └── package.json
```

---

## 🚀 Guía de Puesta en Marcha

### 1. Configuración de Base de Datos en Supabase (Gratis)
1. Crea un proyecto gratuito en [Supabase.com](https://supabase.com).
2. Ve al **SQL Editor** en el panel de Supabase y pega el contenido del archivo [`supabase/schema.sql`](./supabase/schema.sql). Ejecútalo.
3. Ve a **Storage** en Supabase, crea un nuevo bucket llamado `denuncias-fotos` y márcalo como **Public bucket**.
4. En **Project Settings > API**, copia tu `Project URL`, `anon public key` y `service_role key`.

### 2. Configurar Variables de Entorno
Copia los archivos de ejemplo y añade tus llaves de Supabase:

```bash
# En la raíz
cp .env.example .env

# En /server
cp server/.env.example server/.env

# En /client
cp client/.env.example client/.env
```

### 3. Instalación de Dependencias
Ejecuta en la raíz del proyecto:

```bash
npm run install:all
```

### 4. Ejecución en Modo Desarrollo
Inicia tanto el backend como el frontend con un solo comando:

```bash
npm run dev
```

- **Portal Ciudadano / Frontend:** `http://localhost:5173`
- **Backend API REST:** `http://localhost:5000/api`
- **Health Check:** `http://localhost:5000/api/health`

---

## 📡 Endpoints Principales de la API

### 🗺️ Rutas de Recolección (`/api/routes`)
- `GET /api/routes`: Listar rutas activas de Asunción con zonas, horarios y días.
- `GET /api/routes/:id`: Detalle de una ruta.
- `POST /api/routes`: Crear nueva ruta (Requiere rol `admin`).
- `PUT /api/routes/:id`: Editar trazado o turnos (Requiere rol `admin`).

### ⚠️ Denuncias Ciudadanas (`/api/reports`)
- `POST /api/reports`: Registrar reclamo georreferenciado con fotos (Público).
- `GET /api/reports/ticket/:ticket`: Consultar estado de reclamo por código (Público).
- `GET /api/reports/heatmap`: Puntos espaciales para mapa de calor.
- `PATCH /api/reports/:id/status`: Cambiar estado (`PENDIENTE`, `EN_PROCESO`, `RESUELTO`) (Admin).

### 🚛 Flota y Bitácora (`/api/fleet`)
- `GET /api/fleet/trucks`: Listado de camiones y estado de servicio.
- `POST /api/fleet/logs`: Registrar entrada o salida con peso descargado (Kg) y combustible.
- `PATCH /api/fleet/trucks/:id/location`: Telemetría GPS en tiempo real.
