import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { BookingEngine } from "@/components/booking/BookingEngine";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-24 md:py-32 flex flex-col items-center text-center px-4">
        <div className="absolute inset-0 bg-grid-slate-200/20 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-slate-800/20" />
        <div className="relative z-10 max-w-3xl flex flex-col items-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Atención Presencial y Online
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 balance-text">
            Recupera tu balance. 
            <br className="max-md:hidden"/> <span className="text-primary">Descubre tu mejor versión.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
            Terapia cognitivo-conductual basada en evidencia, diseñada para ayudarte a superar bloqueos y gestionar tu bienestar emocional. Empieza tu proceso hoy mismo desde la comodidad de tu hogar o presencialmente.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="#reserva">
              <Button size="lg" className="w-full sm:w-auto shadow-primary/20">
                Agendar Consulta
              </Button>
            </Link>
            <Link href="/servicios">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Conocer Modalidades
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS & HIGHLIGHTS */}
      <section className="w-full max-w-5xl px-4 py-16 md:py-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "Privacidad Absoluta", text: "Tus datos están protegidos con los estándares más altos de seguridad.", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
          { title: "Atención Especializada", text: "Profesionales certificados con años de experiencia clínica comprobable.", icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" },
          { title: "Flexibilidad Total", text: "Gestiona, programa y cancela tus citas de forma autónoma 24/7.", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center text-center p-6 bg-card border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      {/* RESERVA SECTION (Placeholder Calendly) */}
      <section id="reserva" className="w-full bg-secondary/50 py-24 px-4 flex flex-col items-center">
        <div className="max-w-4xl w-full text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Agenda tu espacio</h2>
          <p className="text-lg text-muted-foreground">
            Selecciona la fecha y hora que mejor se adapte a tu rutina. Nuestro sistema sincroniza la disponibilidad en tiempo real.
          </p>
        </div>
        
        <div className="w-full max-w-4xl bg-card border border-border/60 shadow-xl rounded-3xl min-h-[600px] flex items-center justify-center flex-col p-8">
           <div className="w-full relative z-10 max-w-5xl">
             <BookingEngine />
           </div>
        </div>
      </section>
    </div>
  );
}
