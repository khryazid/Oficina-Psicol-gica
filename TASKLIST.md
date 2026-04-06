# Task List

- [x] Proteger rutas `app/api/admin/*` con sesión Supabase y rol `psicologo`.
- [x] Cerrar overbooking con validación atómica en `citas`.
- [x] Separar la landing en secciones bajo `components/sections/`.
- [x] Mostrar conflicto `409` en la UI de reservas sin perder el formulario.
- [x] Validar TypeScript y ajustar documentación raíz.
- [x] Ejecutar reset de datos operativos para inicio con cliente nuevo, conservando admin.
- [x] Sembrar configuración clínica inicial después del reset.
- [x] Corregir desfase horario UTC en disponibilidad/reservas para respetar jornada clínica (Caracas).
- [x] Sincronizar Google Calendar al confirmar/cancelar citas e invitar al paciente por email.
- [x] Mostrar valores de citas en admin con fallback a pagos y preservar servicio/precio al crear reserva.
- [x] Hacer lectura de citas en admin robusta sin joins embebidos de PostgREST y mostrar error real en UI.