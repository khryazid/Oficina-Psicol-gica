import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/sections/SectionHeading';

const services = [
  {
    title: 'Psicoterapia Individual',
    description: 'Un espacio clínico seguro para ansiedad, depresión, trauma y procesos de cambio personal.',
    meta: '50 min · Online / Presencial',
  },
  {
    title: 'Terapia de Pareja',
    description: 'Intervención focalizada en comunicación, vínculo y resolución de conflictos relacionales.',
    meta: '75 min · Online / Presencial',
  },
  {
    title: 'Orientación Vocacional',
    description: 'Evaluación estructurada para tomar decisiones académicas y profesionales con más claridad.',
    meta: '45 min · Online',
  },
] as const;

export function ServicesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <SectionHeading
          eyebrow="Servicios"
          title="Modalidades pensadas para avanzar con claridad"
          description="Tres rutas terapéuticas concretas para que la persona elija el tipo de acompañamiento que realmente necesita."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <article key={service.title} className="group flex flex-col rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <p className="inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                {service.meta}
              </p>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{service.description}</p>
              <div className="mt-8">
                <Link href="/servicios">
                  <Button variant="outline" className="w-full">
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}