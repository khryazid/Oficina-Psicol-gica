import { BookingEngine } from '@/components/booking/BookingEngine';
import { SectionHeading } from '@/components/sections/SectionHeading';

export function BookingSection() {
  return (
    <section id="reserva" className="py-20">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <SectionHeading
          eyebrow="Reserva"
          title="Elige tu horario con disponibilidad en tiempo real"
          description="Selecciona la fecha y hora que mejor se ajuste a tu rutina. El sistema actualiza la disponibilidad al momento."
        />

        <div className="mt-12 rounded-[2rem] border border-border/60 bg-card p-4 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.2)] md:p-8">
          <BookingEngine />
        </div>
      </div>
    </section>
  );
}