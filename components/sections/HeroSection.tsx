import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/30 px-6 py-20 text-white shadow-[0_30px_120px_-40px_rgba(15,23,42,0.6)] md:px-12 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
          Atención presencial y online
        </span>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
          Recupera tu balance.
          <span className="block text-white/80">Descubre tu mejor versión.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 md:text-xl">
          Terapia cognitivo-conductual basada en evidencia, diseñada para ayudarte a superar bloqueos y gestionar tu bienestar emocional. Empieza hoy desde casa o en consulta.
        </p>
        <div className="mt-10 flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
          <Link href="#reserva">
            <Button size="lg" className="w-full bg-white text-slate-950 hover:bg-white/90 sm:w-auto">
              Agendar consulta
            </Button>
          </Link>
          <Link href="/servicios">
            <Button size="lg" variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto">
              Ver modalidades
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}