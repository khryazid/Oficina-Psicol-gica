import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { defaultFallbackConfig, mergeClinicConfig, type ClinicConfig } from '@/lib/clinic/config';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_clinica')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      throw error;
    }

    const config = mergeClinicConfig((data ?? defaultFallbackConfig) as Partial<ClinicConfig>);

    return NextResponse.json(
      {
        servicios: config.servicios,
        datos_bancarios: config.datos_bancarios,
        tiempo_descanso_mins: config.tiempo_descanso_mins,
        anticipacion_minima_horas: config.anticipacion_minima_horas,
        anticipacion_maxima_dias: config.anticipacion_maxima_dias,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Public config GET Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}