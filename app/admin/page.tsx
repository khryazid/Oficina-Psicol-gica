import Link from 'next/link';

const quickLinks = [
  {
    title: 'Aprobar citas y pagos',
    description: 'Revisa la cola operativa, valida pagos y confirma la agenda del día.',
    href: '/admin/citas',
  },
  {
    title: 'Horarios y banco',
    description: 'Ajusta reglas clínicas, horarios base, bloqueos y medios de cobro.',
    href: '/admin/horarios',
  },
] as const;

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-16 md:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_25px_90px_-35px_rgba(15,23,42,0.35)]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 p-8 text-white md:p-12">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Centro de operaciones
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
              Panel administrativo de la clínica
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 md:text-base">
              Usa esta entrada para moverte rápido entre conciliación de citas y configuración operativa.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-white/80">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">Sesión protegida</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">Validación de rol</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">Acceso directo</span>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block rounded-[1.5rem] border border-border/70 bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Abrir
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-border/60 bg-secondary/30 p-5 text-sm text-muted-foreground">
              Si necesitas salir, usa el botón <span className="font-semibold text-foreground">Salir</span> en la barra superior.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}