import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const defaultFallbackConfig = {
    tiempo_descanso_mins: 15,
    anticipacion_minima_horas: 24,
    anticipacion_maxima_dias: 30,
    datos_bancarios: {
      pagoMovil: { activo: true, banco: "Banco de Venezuela (0102)", telefono: "04248891670", cedula: "V-27832025" },
      transferencia: { activo: true, banco: "Banco de Venezuela", cuenta: "0102-0000-0000-0000-0000", titular: "Dr. Khris", identificacion: "V-27832025" },
      efectivo: { activo: true, instrucciones: "Cancelará físicamente el monto al llegar a su cita médica." }
    },
    servicios: [
        { id: "uuid-1", nombre: "Psicoterapia Individual", duracion_mins: 50, precio: 40 },
        { id: "uuid-2", nombre: "Terapia de Pareja", duracion_mins: 75, precio: 60 },
        { id: "uuid-3", nombre: "Intervención en Crisis (Urgente)", duracion_mins: 40, precio: 30 }
    ],
    horario_habitual: {
        "1": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "2": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "3": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "4": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "5": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "6": { activo: false, inicio: "09:00", fin: "13:00", descansos: [] },
        "0": { activo: false, inicio: "09:00", fin: "13:00", descansos: [] }
    },
    bloqueos_especificos: []
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_clinica')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code === '42P01') {
        return NextResponse.json(defaultFallbackConfig, { status: 200 });
    }
    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return NextResponse.json(data || defaultFallbackConfig, { status: 200 });
  } catch (err: any) {
    console.error("Config GET Error:", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // En un app real usaríamos sesion segura
        const { data: fetchCurrent } = await supabaseAdmin.from('configuracion_clinica').select('id').limit(1).single();

        let res;
        if (fetchCurrent) {
           res = await supabaseAdmin.from('configuracion_clinica').update(payload).eq('id', fetchCurrent.id);
        } else {
           res = await supabaseAdmin.from('configuracion_clinica').insert([payload]);
        }

        if (res.error && res.error.code === '42P01') {
             return NextResponse.json({ success: true, message: 'Modo SIMULACIÓN: Configura Supabase después.' }, { status: 200 });
        }
        if (res.error) throw res.error;

        return NextResponse.json({ success: true, message: 'Guardado V3 Dinámico.' }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
