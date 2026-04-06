This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Refactor Status

- Rutas admin protegidas con validación de sesión Supabase y rol `psicologo`.
- Login administrativo disponible en `/login` con cookies de sesión para el panel.
- `/admin` ahora funciona como hub de entrada del panel y redirige con navegación clara hacia citas y horarios.
- Reservas endurecidas con validación atómica y respuesta `409` cuando un slot ya fue tomado.
- El endpoint de pagos fue endurecido con validación de cita existente y errores HTTP consistentes.
- Landing principal modularizada en `components/sections/` con layout global de ancho máximo.
- La UI de reservas conserva el formulario y sugiere otro horario cuando ocurre un conflicto.

## Crear Admin

Para crear el usuario administrador, ejecuta:

```bash
npm run admin:create
```

El script usa `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno y asigna el rol `psicologo` al usuario creado.
Por defecto usa `admin@test.com` y `admin123456` como credenciales iniciales si no pasas argumentos.

## Reset de Datos (Cliente Nuevo)

Para limpiar los datos operativos y dejar la base como arranque para un cliente nuevo, ejecuta:

```bash
npm run data:reset-client
```

Este reset elimina registros de `pagos`, `citas`, `expedientes_clinicos`, `pacientes` y `configuracion_clinica`.
Tambien elimina usuarios de Auth excepto `admin@test.com` (o el email que pases como primer argumento al script).

Luego de limpiar, puedes sembrar una configuración operativa inicial con:

```bash
npm run data:seed-initial-config
```

## Supabase CLI

Para trabajar con Supabase localmente, instala primero el CLI y luego enlaza el proyecto:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <tu-project-ref>
supabase start
```

El archivo [supabase/config.toml](supabase/config.toml) ya está preparado para las migraciones del repo.
Si vas a usar variables locales, copia [\.env.example](.env.example) a `.env.local` y completa los valores.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
