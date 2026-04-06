import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface LoginRequestBody {
  email?: string;
  password?: string;
}

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function authConfigError(): NextResponse {
  return NextResponse.json({ error: 'Faltan credenciales públicas de Supabase' }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body: LoginRequestBody = await request.json();
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return authConfigError();
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 401 });
    }

    const role = data.user.app_metadata.role ?? data.user.user_metadata.role;
    if (role !== 'psicologo') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const nextPath = new URL(request.url).searchParams.get('next') || '/admin';
    const response = NextResponse.json({ success: true, next: nextPath }, { status: 200 });

    response.cookies.set('sb-access-token', data.session.access_token, cookieBaseOptions);
    response.cookies.set('sb-refresh-token', data.session.refresh_token, cookieBaseOptions);

    return response;
  } catch (error: unknown) {
    console.error('Admin Login Error:', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500 });
  }
}