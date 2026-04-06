import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ensureAdminSession } from '@/lib/auth/admin';
import { defaultFallbackConfig } from '@/lib/clinic/config';

function toServerErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const authFailure = await ensureAdminSession(request);
    if (authFailure) {
      return authFailure;
    }

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

    return NextResponse.json(data ?? defaultFallbackConfig, { status: 200 });
  } catch (error: unknown) {
    console.error('Config GET Error:', error);
    return toServerErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const authFailure = await ensureAdminSession(request);
    if (authFailure) {
      return authFailure;
    }

    const payload: unknown = await request.json();

    const { data: fetchCurrent, error: fetchError } = await supabaseAdmin
      .from('configuracion_clinica')
      .select('id')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== '42P01') {
      throw fetchError;
    }

    const currentConfigId = fetchCurrent?.id ?? null;
    const result = currentConfigId
      ? await supabaseAdmin.from('configuracion_clinica').update(payload).eq('id', currentConfigId)
      : await supabaseAdmin.from('configuracion_clinica').insert([payload]);

    if (result.error && result.error.code === '42P01') {
      return NextResponse.json({ success: true, message: 'Modo SIMULACIÓN: Configura Supabase después.' }, { status: 200 });
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({ success: true, message: 'Guardado V3 Dinámico.' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Config POST Error:', error);
    return toServerErrorResponse(error);
  }
}
