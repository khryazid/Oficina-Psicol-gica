# Oficina Psicológica - Sistema de Citas

Aplicación web para gestionar reservas clínicas, pagos y administración operativa de una consulta psicológica.

Stack principal:
- Next.js 16 (App Router)
- TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS

## Qué puede hacer la app

- Reserva de citas por pacientes desde la web pública.
- Disponibilidad con validación de conflicto para evitar overbooking.
- Flujo de pago y conciliación administrativa.
- Panel admin protegido con sesión y rutas restringidas.

## Rutas principales

- Sitio público: / 
- Servicios: /servicios
- Login administrativo: /login
- Hub admin: /admin
- Gestión de citas (admin): /admin/citas
- Configuración clínica (admin): /admin/horarios

## Acceso de prueba (admin)

Credenciales iniciales de demo:

- Email: admin@test.com
- Clave: admin123456

Importante:
- Cambia estas credenciales al poner la app en producción.

## Requisitos previos

- Node.js 20+
- npm
- Proyecto Supabase activo

## Instalación local paso a paso

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

3. Crea un archivo .env.local a partir de [.env.example](.env.example) y completa:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_SERVICE_ACCOUNT_JSON (recomendado en Vercel)
- GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (alternativa al JSON inline)
- GOOGLE_APPLICATION_CREDENTIALS (solo local, ruta a archivo JSON existente)
- GOOGLE_CALENDAR_ID (opcional, por defecto primary)

4. Levanta el entorno en desarrollo:

```bash
npm run dev
```

5. Abre http://localhost:3000

## Cómo probar rápido (flujo completo)

1. Entra a /login con el admin de prueba.
2. Verifica el panel en /admin.
3. Desde el sitio público, intenta crear una reserva.
4. Valida en /admin/citas que la cita aparece para conciliación.
5. Cambia horarios y servicios en /admin/horarios y vuelve a probar disponibilidad.

## Scripts útiles

### Desarrollo

```bash
npm run dev
npm run build
npm run start
```

### Administración de datos

Crear admin:

```bash
npm run admin:create
```

Reset para iniciar con cliente nuevo (mantiene admin@test.com):

```bash
npm run data:reset-client
```

Sembrar configuración inicial después del reset:

```bash
npm run data:seed-initial-config
```

## Supabase CLI

El repo ya tiene configuración en [supabase/config.toml](supabase/config.toml).

Si usas CLI con npx:

```bash
npx -y supabase@2.85.0 login
npx -y supabase@2.85.0 link --project-ref <tu-project-ref>
```

Opcional con scripts npm (si tienes supabase instalado global):

```bash
npm run supabase:status
npm run supabase:start
npm run supabase:stop
```

## Notas de despliegue

- La app compila correctamente con npm run build.
- En Vercel, asegúrate de configurar las mismas variables de entorno que en local.
- No publiques claves de service role en el frontend ni en repositorios públicos.

## Estructura relevante

- API routes: [app/api](app/api)
- Panel admin: [app/admin](app/admin)
- Booking engine: [components/booking/BookingEngine.tsx](components/booking/BookingEngine.tsx)
- Scripts de mantenimiento: [scripts](scripts)
