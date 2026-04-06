import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';

export const metadata: Metadata = {
  title: 'Acceso administrativo | Oficina Digital',
  description: 'Inicio de sesión para el panel administrativo.',
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1440px] items-center px-4 py-20 md:px-6">
      <section className="grid w-full overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_30px_100px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 p-8 text-white md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                Acceso restringido
              </p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
                Panel de control clínico y administrativo
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 md:text-base">
                Ingresa con tu cuenta de administrador para gestionar citas, revisar configuraciones y validar operaciones sensibles.
              </p>
            </div>
            <div className="grid gap-4 text-sm text-white/75 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                Sesión protegida por Supabase Auth.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                Roles validados antes de entrar al panel.
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Iniciar sesión</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Usa una cuenta con rol <span className="font-semibold text-foreground">psicologo</span>.
              </p>
            </div>

            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando acceso...</p>}>
              <AdminLoginForm />
            </Suspense>

            <div className="mt-6 text-sm text-muted-foreground">
              <Link href="/" className="font-medium text-primary hover:underline">
                Volver al sitio público
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}