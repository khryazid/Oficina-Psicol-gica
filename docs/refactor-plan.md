# Refactor Plan

## Objetivo
Blindar las rutas administrativas, cerrar la ventana de overbooking en el flujo de reserva y modularizar la landing principal sin romper el comportamiento actual del MVP.

## Alcance de backend

### Rutas administrativas a proteger
Se protegerán todas las rutas bajo `app/api/admin/`:
- `app/api/admin/citas/route.ts`
- `app/api/admin/config/route.ts`

La protección se aplicará antes de ejecutar cualquier consulta o mutación. Si la sesión no existe o el usuario no tiene rol `admin`, la petición se rechazará de inmediato con `401 Unauthorized`.

### Estrategia de validación de sesión
Se implementará un guard central reutilizable para route handlers, con estas reglas:
- Leer la sesión de Supabase Auth desde la petición entrante.
- Validar que el usuario esté autenticado.
- Verificar que el usuario tenga rol `admin` antes de permitir acceso.
- Responder con `401` cuando no exista sesión o el token sea inválido.
- Responder con `403` cuando la sesión exista pero el rol no sea admin.

### Manejo de errores estándar
Todas las rutas servidoras afectadas usarán `try/catch` y devolverán códigos HTTP consistentes:
- `400` para payloads incompletos o inválidos.
- `401` para sesión ausente o inválida.
- `403` para usuarios autenticados sin permisos de admin.
- `409` para conflicto de disponibilidad u overbooking.
- `500` para fallos inesperados del servidor o la base de datos.

## Overbooking

### Rutas implicadas
Se revisarán y endurecerán:
- `app/api/availability/route.ts`
- `app/api/bookings/route.ts`

### Estrategia técnica
La disponibilidad seguirá siendo una lectura previa, pero la reserva real se validará de forma atómica justo antes del insert final. La intención es evitar que dos usuarios confirmen el mismo slot al mismo tiempo.

Se seguirá este principio:
- La consulta de disponibilidad puede mostrar un slot libre.
- La creación de la reserva volverá a verificar el slot en servidor, inmediatamente antes de persistir.
- Si el slot ya fue tomado, la API devolverá `409 Conflict`.

### Contrato esperado para `409`
La API de reservas responderá con un cuerpo predecible, por ejemplo:
- `code`: `slot_taken`
- `message`: mensaje breve y claro para el usuario
- `suggestion`: texto orientado a elegir otro horario

## UI para conflicto de horario
Cuando el frontend reciba un `409` desde `app/api/bookings/route.ts`, la experiencia debe ser amable y accionable:
- Mostrar un mensaje claro de que el horario ya no está disponible.
- Invitar al usuario a elegir otro horario sin culparlo por el fallo.
- Mantener los datos del formulario para que no tenga que reescribirlos.
- Refrescar la disponibilidad visible para mostrar nuevos slots.
- Destacar un CTA secundario como "Ver otros horarios disponibles".

## Frontend

### Página principal a modularizar
Se refactorizará `app/page.tsx` para que quede por debajo del límite de 150 líneas, extrayendo secciones a `components/sections/`.

### Componentes previstos
- `components/sections/HeroSection.tsx`
- `components/sections/ServicesSection.tsx`
- `components/sections/FAQSection.tsx`
- `components/sections/BookingSection.tsx` si la landing mantiene el bloque de reserva visible
- `components/sections/SectionHeading.tsx` como pieza compartida opcional

### Regla de layout
Se aplicará un contenedor global consistente con:
- `max-w-[1440px]`
- `mx-auto`
- separaciones verticales generosas, por ejemplo `py-20`
- texto centrado en la sección de FAQs

## Orden de ejecución
1. Revisar y proteger `app/api/admin/*`.
2. Endurecer el flujo de disponibilidad y reserva contra colisiones.
3. Extraer secciones de `app/page.tsx` a `components/sections/`.
4. Validar tipos, errores HTTP y longitud de archivo.
5. Ajustar la experiencia visual y el mensaje de conflicto `409` en la UI.
