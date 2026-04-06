import { SectionHeading } from '@/components/sections/SectionHeading';

const faqs = [
  {
    question: '¿La atención puede ser online o presencial?',
    answer: 'Sí. El servicio está diseñado para ambas modalidades y el usuario elige la que mejor se adapte a su contexto.',
  },
  {
    question: '¿Cómo sé si un horario sigue disponible?',
    answer: 'La disponibilidad se recalcula en servidor y, si un turno se ocupa mientras reservas, el sistema lo avisará para que elijas otro.',
  },
  {
    question: '¿Qué pasa con mis datos y pagos?',
    answer: 'La información se maneja con validación de sesión, registro de pago y trazabilidad de cita para mantener el control clínico y administrativo.',
  },
] as const;

export function FAQSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Preguntas frecuentes"
          description="Respuestas rápidas para reducir fricción antes de la reserva."
          align="center"
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-[1.5rem] border border-border/60 bg-secondary/30 p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}