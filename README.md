# PRS Lead Registry

Sistema de captura de leads para eventos y stands de PRS Delivery.

## Funcionalidades

- Captura de contactos en eventos/stands
- Escaneo de tarjetas de presentación con OCR (Mistral AI)
- Almacenamiento de imágenes en Cloudflare R2
- Envío de emails de confirmación (Resend)
- Panel de administración con búsqueda, filtros y paginación
- Preview de tarjetas escaneadas desde R2

## Stack Tecnológico

- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Backend**: Express 5 + TypeScript
- **Base de Datos**: PostgreSQL (o MySQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **OCR**: Mistral AI
- **Email**: Resend

---

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (o MySQL 8+)
- pnpm

---

## Instalación Rápida

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Crear base de datos y ejecutar schema
psql -d tu_database -f database/schema.sql

# 4. Iniciar desarrollo
pnpm dev:all
```

---

## Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# Frontend (dejar vacío para usar proxy de Vite)
VITE_API_URL=

# Database - PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME

# Resend (Email)
# Obtener en: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxx

# Mistral (OCR)
# Obtener en: https://console.mistral.ai/api-keys
MISTRAL_API_KEY=xxxxxxxxx

# Cloudflare R2 (Image Storage)
# Obtener en: Cloudflare Dashboard > R2 > Manage R2 API Tokens
R2_ACCOUNT_ID=xxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxx
R2_BUCKET_NAME=nombre-del-bucket
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
```

---

## Base de Datos

### PostgreSQL (Recomendado)

```sql
-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  company_type VARCHAR(50),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'contacted')),
  email_sent BOOLEAN DEFAULT FALSE,
  card_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, event_id)
);

-- Índices
CREATE INDEX idx_leads_event_id ON leads(event_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_company_type ON leads(company_type);
CREATE INDEX idx_events_is_active ON events(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Evento de ejemplo
INSERT INTO events (name, description, date, location, is_active) VALUES
  ('Expo Logística 2026', 'Feria de logística', '2026-06-10', 'Panama Convention Center', TRUE);
```

### MySQL (Alternativa)

```sql
-- Tabla de eventos
CREATE TABLE events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de leads
CREATE TABLE leads (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  company_type VARCHAR(50),
  event_id CHAR(36) NOT NULL,
  status ENUM('pending', 'confirmed', 'contacted') DEFAULT 'pending',
  email_sent BOOLEAN DEFAULT FALSE,
  card_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_event (email, event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_leads_event_id ON leads(event_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_company_type ON leads(company_type);
CREATE INDEX idx_events_is_active ON events(is_active);

-- Evento de ejemplo
INSERT INTO events (name, description, date, location, is_active) VALUES
  ('Expo Logística 2026', 'Feria de logística', '2026-06-10', 'Panama Convention Center', TRUE);
```

**Para usar MySQL**, cambiar dependencias:

```bash
pnpm remove pg @types/pg
pnpm add mysql2
```

Y modificar `server/index.ts` para usar el cliente de MySQL en lugar de `pg`.

---

## Servicios Externos

### 1. Cloudflare R2 (Storage de imágenes)

1. Crear cuenta en [Cloudflare](https://dash.cloudflare.com)
2. Ir a **R2 > Create bucket**
3. Crear API Token: **R2 > Manage R2 API Tokens > Create API Token**
4. Copiar credenciales al `.env`

### 2. Resend (Emails)

1. Crear cuenta en [Resend](https://resend.com)
2. Verificar dominio: **Domains > Add Domain**
3. Crear API Key: **API Keys > Create API Key**
4. Modificar el remitente en `server/index.ts` si es necesario

### 3. Mistral AI (OCR)

1. Crear cuenta en [Mistral](https://console.mistral.ai)
2. Generar API Key: **API Keys > Create new key**
3. Copiar al `.env`

---

## API Endpoints

### Eventos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/events` | Lista eventos activos |

### Leads

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/leads` | Lista leads con paginación y filtros |
| POST | `/api/leads` | Crear nuevo lead |
| GET | `/api/leads/stats` | Estadísticas de leads |
| GET | `/api/leads/:id/card-image` | URL firmada de imagen (1h) |

**Query params para GET /api/leads:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Página actual (default: 1) |
| `limit` | number | Items por página (default: 20, max: 100) |
| `search` | string | Búsqueda por nombre, email, empresa o teléfono |
| `status` | string | Filtrar por estado: `pending`, `confirmed`, `contacted` |

**Ejemplo:**
```
GET /api/leads?page=1&limit=20&search=juan&status=pending
```

**Response:**
```json
{
  "leads": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Body para POST /api/leads:**

```json
{
  "fullName": "Juan Pérez",
  "email": "juan@empresa.com",
  "phone": "+507 6000-0000",
  "company": "Empresa SA",
  "companyType": "logistics",
  "eventId": "uuid-del-evento",
  "cardImage": "data:image/jpeg;base64,..." // opcional, se comprime a WebP 76%
}
```

### OCR

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ocr` | Procesar tarjeta de presentación |

**Body:**

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fullName": "Juan Pérez",
    "email": "juan@empresa.com",
    "phone": "+507 6000-0000",
    "company": "Empresa SA"
  }
}
```

### Otros

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

---

## Estructura del Proyecto

```
├── server/
│   └── index.ts          # API Express
├── src/
│   ├── components/
│   │   ├── lead-form.tsx # Formulario de captura
│   │   └── ui/           # Componentes UI
│   ├── pages/
│   │   ├── home.tsx      # Página principal (/)
│   │   └── admin.tsx     # Panel de admin (/admin) con búsqueda y paginación
│   ├── services/
│   │   └── leads.ts      # Llamadas a API
│   └── types/
│       └── lead.ts       # Tipos TypeScript
├── database/
│   └── schema.sql        # Schema PostgreSQL
└── .env                  # Variables de entorno
```

---

## Tipos de Empresa (company_type)

| Valor | Etiqueta |
|-------|----------|
| `logistics` | Logística y Transporte |
| `ecommerce` | E-commerce |
| `retail` | Retail / Comercio |
| `manufacturing` | Manufactura |
| `food` | Alimentos y Bebidas |
| `pharma` | Farmacéutica |
| `tech` | Tecnología |
| `other` | Otro |

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Frontend (localhost:5173) |
| `pnpm dev:server` | Backend (localhost:3001) |
| `pnpm dev:all` | Ambos |
| `pnpm build` | Build producción |
| `pnpm start` | Iniciar en producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificar tipos |

---

## Deploy a Producción

En producción, el backend sirve el frontend. Solo necesitas **UN puerto**.

### Build y Start

```bash
# 1. Build del frontend
pnpm build

# 2. Iniciar servidor (sirve API + frontend)
pnpm start
# El servidor corre en el puerto 3001 (o PORT env)
```

### Railway (Recomendado)

1. Conectar repo a [Railway](https://railway.app)
2. Agregar PostgreSQL desde Railway
3. Configurar variables de entorno
4. Deploy automático

**Variables en Railway:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...  (Railway lo genera)
RESEND_API_KEY=re_xxx
MISTRAL_API_KEY=xxx
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
```

**Build Command:** `pnpm install && pnpm build`
**Start Command:** `pnpm start`

### Render

1. Crear **Web Service** en [Render](https://render.com)
2. Conectar repo
3. Configurar:
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
4. Agregar PostgreSQL desde Render
5. Configurar variables de entorno

### DigitalOcean App Platform

1. Crear app en [DO App Platform](https://cloud.digitalocean.com/apps)
2. Seleccionar repo
3. Configurar como **Web Service**
4. Agregar PostgreSQL (Database component)
5. Variables de entorno igual que arriba

### Docker (VPS)

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "start"]
```

```bash
docker build -t prs-leads .
docker run -p 3001:3001 --env-file .env prs-leads
```

---

## Costos Estimados

| Servicio | Uso | Costo |
|----------|-----|-------|
| PostgreSQL | Base de datos | Variable según proveedor |
| Cloudflare R2 | Storage imágenes | ~$0.015/GB/mes |
| Mistral AI | OCR tarjetas | ~$0.04/1K imágenes |
| Resend | Emails | 3,000 gratis/mes |

---

## Soporte

Desarrollado por [Koudrs](https://koudrs.com)
