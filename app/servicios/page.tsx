import { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Servicios | Oficina Digital Psicológica',
  description: 'Conoce nuestras modalidades de terapia cognitivo-conductual, presencial y online.',
};

const servicios = [
  {
    id: 'psicoterapia-individual',
    titulo: 'Psicoterapia Individual',
    descripcion: 'Espacio seguro y confidencial donde trabajaremos objetivos específicos mediante terapia basada en la evidencia (TCC). Adecuado para ansiedad, depresión, trauma o búsqueda personal.',
    modalidad: 'Online / Presencial',
    duracion: '50 mins',
  },
  {
    id: 'terapia-pareja',
    titulo: 'Terapia de Pareja',
    descripcion: 'Abordaje integral para resolver conflictos, mejorar la comunicación y restaurar los vínculos construyendo relaciones duraderas y balanceadas.',
    modalidad: 'Online / Presencial',
    duracion: '75 mins',
  },
  {
    id: 'orientacion-vocacional',
    titulo: 'Orientación Vocacional',
    descripcion: 'Evaluación de aptitudes e intereses para guiar la toma de decisiones profesionales y académicas de manera estructurada y efectiva.',
    modalidad: 'Online',
    duracion: '45 mins',
  }
];

export default function ServiciosPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
      <div className="mb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Modalidades de Terapia</h1>
        <p className="text-lg text-muted-foreground w-full mx-auto max-w-2xl">
          Nuestras intervenciones están adaptadas para el confort y las necesidades clínicas contemporáneas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicios.map((s) => (
          <div key={s.id} className="flex flex-col bg-card border border-border/60 hover:border-primary/40 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full mb-3">
                {s.modalidad} &bull; {s.duracion}
              </span>
              <h2 className="text-2xl font-bold">{s.titulo}</h2>
            </div>
            <p className="text-muted-foreground text-sm flex-grow mb-6 leading-relaxed">
              {s.descripcion}
            </p>
            <div className="mt-auto">
              <Link href="/#reserva">
                <Button className="w-full text-sm">Escoger Modalidad</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-24 p-8 bg-primary/5 rounded-3xl border border-primary/10 text-center">
        <h3 className="text-2xl font-bold mb-3">¿No estás seguro por dónde empezar?</h3>
        <p className="text-muted-foreground mb-6">
          Puedes agendar una llamada exploratoria de 15 minutos sin costo, para solventar dudas y conocernos.
        </p>
        <Link href="/#reserva">
          <Button variant="outline" size="lg">Agendar Exploración Gratis</Button>
        </Link>
      </section>
    </div>
  );
}
