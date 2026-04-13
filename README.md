# Portafolio Estudiantil - Base de Datos II

Sistema web para gestionar portafolios estudiantiles con **Supabase** como backend.

---

## 📁 Estructura del Proyecto

```
├── index.html      → Landing page con unidades (protegidas por auth)
├── login.html      → Inicio de sesión
├── registro.html   → Registro de usuarios
├── dashboard.html  → Panel admin (subir trabajos)
├── auth.js         → Configuración y funciones de Supabase
├── database.sql    → Schema de base de datos
└── README.md       → Documentación
```

---

## ⚙️ Configuración

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto

### 2. Obtener credenciales
1. **Settings** → **API**
2. Copia **Project URL** y **anon public key**

### 3. Actualizar auth.js (líneas 3-4)
```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
```

### 4. Ejecutar database.sql
1. Ve a **SQL Editor** en Supabase
2. Copia el contenido de `database.sql`
3. Ejecuta

### 5. Crear bucket de Storage
1. Ve a **Storage** → **New bucket**
2. Nombre: `trabajos`
3. Configurar como **Public**

### 6. Crear admin
```sql
UPDATE usuarios 
SET rol_id = 1 
WHERE email = 'tu-email@ejemplo.com';
```

---

## 👥 Roles

| Rol | ID | Descripción |
|-----|-----|-------------|
| Admin | 1 | Gestionar trabajos (dashboard) |
| Usuario | 2 | Ver trabajos (portal) |

---

## 🚀 Ejecutar

Abre `index.html` en tu navegador, o usa servidor local:

```bash
python -m http.server 8000
```

---

## 🌐 Desplegar en GitHub Pages

1. Sube archivos a repositorio GitHub
2. **Settings** → **Pages**
3. Selecciona rama `main`
4. Listo en: `https://tu-usuario.github.io/repo`

---

## 📊 Schema

### usuarios
- `id` (UUID) → auth.users
- `email` (VARCHAR)
- `nombre_completo` (VARCHAR)
- `rol_id` (INT) → 1=admin, 2=usuario

### trabajos_semanas
- `id` (SERIAL)
- `usuario_id` (UUID) → auth.users
- `numero_semana` (INT) → 1, 2, 3, 4
- `nombre_archivo` (VARCHAR)
- `ruta_archivo` (VARCHAR) → URL de Supabase Storage
- `descripcion` (TEXT)
- `estado` (VARCHAR) → pendiente, revisado, aprobado

---

## 🔑 Funciones de auth.js

```javascript
// Auth
PortafolioAuth.login(email, password)
PortafolioAuth.registrar(email, password, nombre)
PortafolioAuth.logout()
PortafolioAuth.estaAutenticado()
PortafolioAuth.esAdmin()

// Trabajos
PortafolioAuth.obtenerTrabajosPorUnidad(numero)
PortafolioAuth.subirTrabajo(archivo, semana, descripcion)
PortafolioAuth.cambiarEstado(id, estado)

// Protección
PortafolioAuth.protegerRuta(requiereAdmin)
```

---

## 📱 Flujo

### Landing Page (index.html)
- Todos pueden ver las 4 unidades
- Las unidades muestran "🔒 Inicia sesión" si no hay sesión
- Al hacer clic en unidad logueado → abre modal con trabajos
- Header muestra dinámicamente:
  - Sin sesión: "Iniciar Sesión" + "Registrarse"
  - Con sesión: "Nombre usuario" + "Dashboard" (si admin) + "Cerrar Sesión"

### Login/Registro
- Formularios simples
- Redirigen a index.html tras éxito

### Dashboard
- Solo accesible para admin (rol_id = 1)
- Subir trabajos por semana
- Ver/filtrar todos los trabajos
- Cambiar estado de trabajos

---

## 👨‍💻 Autor

**Andy Junior Mendoza Villanueva**
Base de Datos II - 2026
