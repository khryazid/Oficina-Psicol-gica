import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { cita_id, banco_origen, telefono_origen, referencia, monto_recibido, metodo_pago } = payload;

    if (!cita_id || !metodo_pago) {
         return NextResponse.json({ error: 'Datos de pago incompletos' }, { status: 400 });
    }

    // Efectivo o Transferencias que requieren validacion postergada Manual
    if (metodo_pago === 'efectivo') {
         await supabaseAdmin.from('citas').update({
             estado: 'pending_confirmation'
         }).eq('id', cita_id);
         
         await supabaseAdmin.from('pagos').insert({
             cita_id, banco_origen: 'N/A', telefono_origen: 'N/A', referencia: 'EFECTIVO_FISICO', monto_recibido, metodo: 'efectivo'
         }).select('id').single();

         return NextResponse.json({ success: true, message: 'Pago en Físico Registrado' }, { status: 200 });
    }

    // Modalidad Bancaria (Transferencia / Pago Móvil)
    if (!referencia || referencia.length < 4 || isNaN(Number(referencia))) {
         return NextResponse.json({ error: 'Referencia inválida. Ingrese los últimos digitos.' }, { status: 400 });
    }

    const { data: pagoRes, error: pagoError } = await supabaseAdmin.from('pagos').insert({
        cita_id,
        banco_origen,
        telefono_origen,
        referencia,
        monto_recibido,
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

  } catch (err: any) {
    console.error('Payment Fatal Error:', err);
    return NextResponse.json({ error: 'Fallo de Servidor Procesando Liquidación' }, { status: 500 });
  }
}
