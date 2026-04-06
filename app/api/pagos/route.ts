import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface PaymentRequestBody {
  cita_id?: string;
  banco_origen?: string;
  telefono_origen?: string;
  referencia?: string;
  monto_recibido?: number;
  metodo_pago?: 'pago_movil' | 'transferencia' | 'efectivo';
}

function serverErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Fallo de Servidor Procesando Liquidación';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const payload: PaymentRequestBody = await req.json();
    const { cita_id, banco_origen, telefono_origen, referencia, monto_recibido, metodo_pago } = payload;

    if (!cita_id || !metodo_pago) {
         return NextResponse.json({ error: 'Datos de pago incompletos' }, { status: 400 });
    }

    const { data: cita, error: citaError } = await supabaseAdmin
      .from('citas')
      .select('id, estado')
      .eq('id', cita_id)
      .single();

    if (citaError && citaError.code === 'PGRST116') {
      return NextResponse.json({ error: 'La cita no existe' }, { status: 404 });
    }

    if (citaError) {
      throw citaError;
    }

    if (!cita?.id) {
      return NextResponse.json({ error: 'La cita no existe' }, { status: 404 });
    }

    // Efectivo o Transferencias que requieren validacion postergada Manual
    if (metodo_pago === 'efectivo') {
         const { error: updateError } = await supabaseAdmin.from('citas').update({
             estado: 'pending_confirmation'
         }).eq('id', cita_id);

         if (updateError) {
             throw updateError;
         }

         const { error: insertError } = await supabaseAdmin.from('pagos').insert({
             cita_id,
             banco_origen: 'N/A',
             telefono_origen: 'N/A',
             referencia: 'EFECTIVO_FISICO',
             monto_recibido: monto_recibido ?? 0,
             metodo: 'efectivo',
         }).select('id').single();

         if (insertError) {
             throw insertError;
         }

         return NextResponse.json({ success: true, message: 'Pago en Físico Registrado' }, { status: 200 });
    }

    // Modalidad Bancaria (Transferencia / Pago Móvil)
    if (!referencia || referencia.length < 4 || isNaN(Number(referencia))) {
         return NextResponse.json({ error: 'Referencia inválida. Ingrese los últimos digitos.' }, { status: 400 });
    }

    const { data: pagoRes, error: pagoError } = await supabaseAdmin.from('pagos').insert({
        cita_id,
        banco_origen: banco_origen ?? 'N/A',
        telefono_origen: telefono_origen ?? 'N/A',
        referencia,
        monto_recibido: monto_recibido ?? 0,
        metodo: metodo_pago
    }).select('id').single();

    if (pagoError) {
        if (pagoError.code === '23505') {  
             return NextResponse.json({ error: 'Referencia duplicada.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'No se pudo asentar el pago en sistema' }, { status: 500 });
    }

    // ACTUALIZAR CITA A ESTADO PENDIENTE POR REVISAR O CONFIRMAR
    await supabaseAdmin.from('citas').update({
        estado: 'pending_confirmation'
    }).eq('id', cita_id);

    return NextResponse.json({ success: true, pago_id: pagoRes?.id || 'mock-pago-id' }, { status: 200 });

  } catch (error: unknown) {
    console.error('Payment Fatal Error:', error);
    return serverErrorResponse(error);
  }
}
