"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { format, addMonths, subMonths, isSameMonth, startOfMonth, startOfWeek, endOfMonth, endOfWeek, isBefore, addDays, startOfDay, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";

interface TimeSlot { start: string; end: string; }
interface Servicio { id: string; nombre: string; duracion_mins: number; precio: number; }
interface BancosConfig {
    pagoMovil: { activo: boolean; banco: string; telefono: string; cedula: string };
    transferencia: { activo: boolean; banco: string; cuenta: string; titular: string; identificacion: string };
    efectivo: { activo: boolean; instrucciones: string };
}

const listaBancosNacionales = [
  "0102 - Banco de Venezuela", "0104 - Venezolano de Crédito", "0105 - Mercantil", 
  "0108 - Provincial", "0114 - Bancaribe", "0115 - Exterior", "0128 - Banco Caroní", 
  "0134 - Banesco", "0137 - Sofitasa", "0138 - Banco Plaza", "0151 - BFC Banco Fondo Común", 
  "0156 - 100% Banco", "0157 - Del Sur", "0163 - Banco del Tesoro", "0168 - Bancrecer", 
  "0169 - Mi Banco", "0171 - Banco Activo", "0172 - Bancamiga", "0174 - Banplus", 
  "0175 - Bicentenario", "0177 - Banfanb", "0191 - BNC Nacional de Crédito"
];

const codigosPais = [
  { code: '+58', flag: '🇻🇪', pais: 'VE' },
  { code: '+57', flag: '🇨🇴', pais: 'CO' },
  { code: '+1',  flag: '🇺🇸', pais: 'US' },
  { code: '+34', flag: '🇪🇸', pais: 'ES' },
  { code: '+52', flag: '🇲🇽', pais: 'MX' },
  { code: '+55', flag: '🇧🇷', pais: 'BR' },
  { code: '+56', flag: '🇨🇱', pais: 'CL' },
  { code: '+51', flag: '🇵🇪', pais: 'PE' },
  { code: '+54', flag: '🇦🇷', pais: 'AR' },
  { code: '+593', flag: '🇪🇨', pais: 'EC' },
  { code: '+507', flag: '🇵🇦', pais: 'PA' },
  { code: '+506', flag: '🇨🇷', pais: 'CR' },
  { code: '+502', flag: '🇬🇹', pais: 'GT' },
  { code: '+503', flag: '🇸🇻', pais: 'SV' },
  { code: '+504', flag: '🇭🇳', pais: 'HN' },
  { code: '+505', flag: '🇳🇮', pais: 'NI' },
  { code: '+591', flag: '🇧🇴', pais: 'BO' },
  { code: '+595', flag: '🇵🇾', pais: 'PY' },
  { code: '+598', flag: '🇺🇾', pais: 'UY' },
  { code: '+44', flag: '🇬🇧', pais: 'GB' },
  { code: '+33', flag: '🇫🇷', pais: 'FR' },
  { code: '+39', flag: '🇮🇹', pais: 'IT' },
  { code: '+49', flag: '🇩🇪', pais: 'DE' },
  { code: '+351', flag: '🇵🇹', pais: 'PT' },
];

async function refreshAvailability(
    date: Date,
    service: Servicio,
    setAvailableSlots: Dispatch<SetStateAction<TimeSlot[]>>,
    setLoadingSlots: Dispatch<SetStateAction<boolean>>,
    setAvailabilityErrorMsg: Dispatch<SetStateAction<string>>
): Promise<void> {
    setLoadingSlots(true);
    setAvailabilityErrorMsg('');
    try {
                const clinicDate = format(date, 'yyyy-MM-dd');
                const response = await fetch(`/api/availability?date=${clinicDate}&duration=${service.duracion_mins}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo consultar disponibilidad');
        }
        setAvailableSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (error) {
        console.error(error);
        setAvailableSlots([]);
        setAvailabilityErrorMsg('No pudimos cargar la disponibilidad en este momento. Intenta de nuevo.');
    } finally {
        setLoadingSlots(false);
    }
}

export function BookingEngine() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [bancosConfig, setBancosConfig] = useState<BancosConfig | null>(null);
  const [bcvRate, setBcvRate] = useState<number>(36.50);
  
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
    const [availabilityErrorMsg, setAvailabilityErrorMsg] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Estados Reserva FASE 1
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'conflict'>('idle');
    const [bookingErrorMsg, setBookingErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phoneCodigo, setPhoneCodigo] = useState('+58');
  const [phoneNumero, setPhoneNumero] = useState('');
  const [citaId, setCitaId] = useState<string | null>(null);

  // Estados Pago FASE 2
  const [paymentMethod, setPaymentMethod] = useState<'pago_movil' | 'transferencia' | 'efectivo' | null>(null);
  const [pagoStatus, setPagoStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [pagoErrorMsg, setPagoErrorMsg] = useState("");
  
  const [bancoOrigen, setBancoOrigen] = useState(listaBancosNacionales[0]);
  const [telefonoOrigen, setTelefonoOrigen] = useState("");
  const [referencia, setReferencia] = useState("");

    // 1. Cargar el Catálogo y Tasas
    useEffect(() => {
         fetch('/api/public/config')
             .then(res => res.json())
             .then(data => {
                     if (data.servicios) setServicios(data.servicios);
                     if (data.datos_bancarios) setBancosConfig(data.datos_bancarios);
             }).catch(e => console.error("Error trayendo cátalogo:", e));

         fetch('/api/bcv')
             .then(res => res.json())
             .then(data => { if(data.bcv) setBcvRate(data.bcv); })
             .catch(() => console.error('BCV Fail, usando 36.50 fallback'));
    }, []);

  // 2. Fetch de Horas Clínicas (Mandar Date + Duracion)
  useEffect(() => {
    if (selectedDate && selectedService) {
            setSelectedSlot(null);
            setBookingErrorMsg('');
            setAvailabilityErrorMsg('');
            setBookingStatus('idle');
            void refreshAvailability(selectedDate, selectedService, setAvailableSlots, setLoadingSlots, setAvailabilityErrorMsg);
        } else {
            setAvailableSlots([]);
    }
  }, [selectedDate, selectedService]);

  const handleBooking = async () => {
     if (!selectedSlot || !email || !name || !selectedService) return;
     setBookingStatus('submitting');
         setBookingErrorMsg('');
     try {
       const res = await fetch('/api/bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: selectedSlot, email, name, telefono: `${phoneCodigo}${phoneNumero}`,
            servicio_id: selectedService.id, servicio_nombre: selectedService.nombre, servicio_precio: selectedService.precio
          })
       });
       const data = await res.json();
             if(res.ok && data.citaId) {
           setCitaId(data.citaId); setBookingStatus('success');
             } else if (res.status === 409) {
                     setBookingStatus('conflict');
                     setBookingErrorMsg(data.message || 'Ese horario ya no está disponible.');
                     setSelectedSlot(null);
                     if (selectedDate && selectedService) {
                         void refreshAvailability(selectedDate, selectedService, setAvailableSlots, setLoadingSlots, setAvailabilityErrorMsg);
                     }
             } else {
                     setBookingStatus('error');
                     setBookingErrorMsg(data.error || 'No se pudo completar la reserva.');
             }
         } catch (e) {
             setBookingStatus('error');
             setBookingErrorMsg('Error de conectividad.');
         }
  };

  const handlePago = async () => {
      if (!citaId || !paymentMethod || !selectedService) return;
      if (paymentMethod !== 'efectivo' && referencia.length < 4) {
          setPagoErrorMsg("Debe ingresar los últimos digitos de la transacción bancaria."); return;
      }
      
      setPagoStatus('submitting'); setPagoErrorMsg("");
      try {
          const res = await fetch('/api/pagos', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  cita_id: citaId,
                  banco_origen: bancoOrigen,
                  telefono_origen: telefonoOrigen,
                  referencia: paymentMethod === 'efectivo' ? 'EFECTIVO' : referencia,
                  monto_recibido: selectedService.precio,
                  metodo_pago: paymentMethod
              })
          });
          const data = await res.json();
          if (res.ok) setPagoStatus('success');
          else { setPagoStatus('error'); setPagoErrorMsg(data.error || "Ocurrió un error valindando tu orden."); }
      } catch (e) { setPagoStatus('error'); setPagoErrorMsg("Error de conectividad."); }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const rows = []; let days = []; let day = startDate;

    // En UI trancamos el pasado visualmente aunque la API lo bloquea igual
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isPast = isBefore(day, startOfDay(new Date())); 
        days.push(
          <button
            key={day.toString()} disabled={isPast} onClick={() => setSelectedDate(cloneDay)}
            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-sm font-medium transition-colors
              ${!isSameMonth(day, monthStart) ? "text-muted-foreground/30" : isPast ? "text-muted-foreground/30 bg-muted/5 cursor-not-allowed" : "cursor-pointer hover:bg-primary/10 text-foreground"}
              ${selectedDate && isSameDay(day, selectedDate) ? "bg-primary text-primary-foreground hover:bg-primary shadow-md" : ""}
            `}
          >
            {format(day, "d")}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="flex w-full justify-between" key={day.toString()}>{days}</div>); days = [];
    }
    return rows;
  };

  // PANTALLA C: ÉXITO ABSOLUTO
  if (pagoStatus === 'success') {
       return (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-[500px] w-full bg-card border border-border/60 shadow-xl rounded-3xl animate-in zoom-in duration-500">
              <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              </div>
              <h3 className="text-3xl font-bold mb-3">Reservación Emitida</h3>
              <p className="text-muted-foreground text-lg mb-8">
                  {paymentMethod === 'efectivo' 
                  ? "Tu cupo ha sido reservado. Te esperamos en la clínica el día pautado. Si no llegas a tiempo el sistema suspenderá la atención."
                  : "El comprobante de pago ha sido enlazado a tu expediente. Pasa a revisión administrativa."}
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 text-left max-w-sm w-full shadow-inner">
                  <div className="flex justify-between font-bold text-lg mb-2 border-b pb-2"><span>Terapia:</span> <span>{selectedService?.nombre}</span></div>
                  <div className="flex justify-between text-sm"><span>Paciente:</span> <span>{name}</span></div>
                  <div className="flex justify-between text-sm mt-3 pt-3 border-t"><span>Hora del Reto:</span> <span>{selectedSlot && format(parseISO(selectedSlot.start), "dd MMM, hh:mm a", { locale: es })}</span></div>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">Volver al Inicio</Button>
          </div>
       );
  }

  // PANTALLA B: TESORERÍA, BANCOS Y PAGOS
  if (bookingStatus === 'success') {
      const isBs = paymentMethod !== 'efectivo';
      const totalBolivares = (selectedService!.precio * bcvRate).toFixed(2);

      return (
          <div className="flex flex-col items-center justify-center p-6 md:p-10 min-h-[600px] w-full bg-card border border-border/60 shadow-xl rounded-3xl animate-in fade-in slide-in-from-right-8 duration-500 relative overflow-hidden">
              <div className="w-full max-w-lg z-10">
                  <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold mb-2">Check-Out y Liquidación</h3>
                      <p className="text-muted-foreground">Tu espacio clínico `({format(parseISO(selectedSlot!.start), "dd MMM, hh:mm a", { locale: es })})` está pre-asegurado. ¿Cómo deseas formalizar el ingreso?</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-2xl shadow-xl mb-8 flex justify-between">
                     <div>
                         <span className="text-green-100 uppercase tracking-wider text-xs block mb-1">Inversión Terapéutica</span>
                         <span className="text-4xl font-black">${selectedService?.precio}.00</span>
                     </div>
                     <div className="text-right flex flex-col justify-center">
                         <span className="text-xl font-bold font-mono">Bs. {totalBolivares}</span>
                         <span className="text-xs text-green-200">Ref. BCV Hoy ({bcvRate})</span>
                     </div>
                  </div>

                  {!paymentMethod && (
                      <div className="space-y-3 mb-8">
                          {bancosConfig?.pagoMovil.activo && <Button variant="outline" className="w-full h-14 justify-start font-bold text-lg" onClick={()=>setPaymentMethod('pago_movil')}>📱 Pagar Especialidad vía Pago Móvil</Button>}
                          {bancosConfig?.transferencia.activo && <Button variant="outline" className="w-full h-14 justify-start font-bold text-lg" onClick={()=>setPaymentMethod('transferencia')}>🏦 Emitir Transferencia Bancaria</Button>}
                          {bancosConfig?.efectivo.activo && <Button variant="outline" className="w-full h-14 justify-start font-bold text-lg" onClick={()=>setPaymentMethod('efectivo')}>💵 Pagar en Físico al Llegar al Consultorio</Button>}
                      </div>
                  )}

                  {paymentMethod && (
                      <div className="animate-in fade-in zoom-in duration-300">
                          <button onClick={()=>setPaymentMethod(null)} className="text-sm font-bold text-muted-foreground hover:text-primary mb-4 block">&larr; Cambiar método</button>

                          {/* RECEPTOR DE DINERO */}
                          {paymentMethod === 'pago_movil' && bancosConfig?.pagoMovil && (
                              <div className="bg-secondary/40 border border-border rounded-xl p-5 mb-6 text-center shadow-inner">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">Envíe su pago móvil a estos datos</p>
                                  <p className="font-bold text-lg mb-1">{bancosConfig.pagoMovil.banco}</p>
                                  <p className="font-mono bg-background p-2 rounded border inline-block">{bancosConfig.pagoMovil.telefono} &nbsp;|&nbsp; {bancosConfig.pagoMovil.cedula}</p>
                              </div>
                          )}
                          {paymentMethod === 'transferencia' && bancosConfig?.transferencia && (
                              <div className="bg-secondary/40 border border-border rounded-xl p-5 mb-6 text-center shadow-inner">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">Deposite en nuestra cuenta bancaria</p>
                                  <p className="font-bold text-lg">{bancosConfig.transferencia.banco}</p>
                                  <p className="font-mono mt-1 text-sm">{bancosConfig.transferencia.titular} - {bancosConfig.transferencia.identificacion}</p>
                                  <p className="font-mono bg-background p-2 rounded border block mt-2 text-primary font-bold">{bancosConfig.transferencia.cuenta}</p>
                              </div>
                          )}
                          {paymentMethod === 'efectivo' && bancosConfig?.efectivo && (
                              <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-5 mb-6 text-center shadow-inner">
                                  <p className="font-bold mb-2">Reserva por Confianza Física</p>
                                  <p className="text-sm opacity-90">{bancosConfig.efectivo.instrucciones}</p>
                                  <p className="text-xs uppercase font-bold mt-4">Debe entregar USD exactos o soberanos al corte de ese día.</p>
                              </div>
                          )}

                          {/* FORMULARIO DE EMISIÓN */}
                          {paymentMethod !== 'efectivo' && (
                              <div className="space-y-4 mb-6">
                                 <div>
                                     <label className="text-xs font-bold text-muted-foreground uppercase">Banco Destino / Emisor de su dinero</label>
                                     <select value={bancoOrigen} onChange={e=>setBancoOrigen(e.target.value)} className="w-full mt-1 p-3 border rounded-xl bg-background text-sm font-medium">
                                         {listaBancosNacionales.map(b => <option key={b} value={b}>{b}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex gap-4">
                                     <div className="w-1/2">
                                         <label className="text-xs font-bold text-muted-foreground uppercase">Telf / CI Emisora</label>
                                         <input placeholder="04xx / V-0000" value={telefonoOrigen} onChange={e=>setTelefonoOrigen(e.target.value)} className="w-full mt-1 p-3 border rounded-xl bg-background text-sm" />
                                     </div>
                                     <div className="w-1/2">
                                         <label className="text-xs font-bold text-muted-foreground uppercase">Referencia</label>
                                         <input placeholder="Últimos 6 díg." maxLength={12} value={referencia} onChange={e=>setReferencia(e.target.value)} className="w-full mt-1 p-3 border rounded-xl bg-background text-sm font-mono tracking-widest text-primary" />
                                     </div>
                                 </div>
                              </div>
                          )}

                          {pagoErrorMsg && <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-medium mb-6">⚠️ {pagoErrorMsg}</div>}

                          <Button size="lg" className="w-full h-14 text-lg shadow-xl" onClick={handlePago} disabled={pagoStatus === 'submitting' || (paymentMethod !== 'efectivo' && referencia.length < 4)}>
                              {pagoStatus === 'submitting' ? 'Aprobando Seguridad...' : paymentMethod === 'efectivo' ? 'Fijar Cita a Riesgo' : 'Validar y Confirmar Pago'}
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  if (bookingStatus === 'conflict') {
      return (
          <div className="flex min-h-[500px] w-full flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-8 text-center shadow-xl animate-in fade-in zoom-in duration-500">
              <div className="mb-6 h-20 w-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-3xl">!</div>
              <h3 className="text-3xl font-bold mb-3">Ese horario ya fue tomado</h3>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl">
                  {bookingErrorMsg || 'El turno cambió mientras confirmabas. Ya actualizamos la disponibilidad para que puedas elegir otro horario sin volver a empezar.'}
              </p>
              <Button onClick={() => { setBookingStatus('idle'); setBookingErrorMsg(''); }} variant="outline">
                  Elegir otro horario
              </Button>
          </div>
      );
  }

  // PANTALLA A - PASO 1 (MÚLTIPLES SERVICIOS)
  if (!selectedService) {
      return (
          <div className="flex flex-col w-full bg-card min-h-[500px] rounded-3xl border border-border/60 shadow-xl p-8 animate-in fade-in zoom-in duration-500">
             <div className="text-center mb-8">
                 <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest mb-4 inline-block">Consultorio Integral</span>
                 <h3 className="text-3xl font-bold">¿En qué puedo auxiliarte?</h3>
                 <p className="text-muted-foreground mt-2">Selecciona la modalidad diagnóstica/terapéutica requerida.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
                 {servicios.map(srv => (
                     <button key={srv.id} onClick={() => setSelectedService(srv)} className="group flex flex-col text-left p-6 rounded-2xl border border-border/80 bg-background hover:border-primary/50 hover:shadow-xl transition-all hover:-translate-y-1">
                        <h4 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">{srv.nombre}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-auto pt-4 font-semibold">
                            <span className="bg-secondary/50 px-2 py-1 rounded">⏰ {srv.duracion_mins} min</span>
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded">💵 ${srv.precio}</span>
                        </div>
                     </button>
                 ))}
                 {servicios.length === 0 && <p className="col-span-full text-center text-muted-foreground p-10">Cargando portafolio digital...</p>}
             </div>
          </div>
      );
  }

  // PANTALLA A - PASO 2 (CALENDARIO)
  return (
    <div className="flex flex-col lg:flex-row w-full bg-card min-h-[500px] rounded-3xl border border-border/60 shadow-xl overflow-hidden p-6 md:p-8 gap-8 animate-in fade-in duration-700">
      <div className="w-full lg:w-1/2 flex flex-col relative">
        <button onClick={() => { setSelectedService(null); setSelectedDate(null); setSelectedSlot(null); }} className="absolute -top-3 -left-3 text-xs font-bold text-muted-foreground hover:text-primary bg-background px-3 py-1 rounded-full border shadow-sm transition-all z-10">&larr; Volver</button>
        
        <div className="mt-8 mb-6">
           <h3 className="text-2xl font-bold flex items-center gap-2">Agendar <span className="text-primary px-2">{selectedService.nombre}</span></h3>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-3 py-1 rounded hover:bg-accent border font-bold">&larr;</button>
          <span className="font-semibold text-lg capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</span>
          <button onClick={nextMonth} className="px-3 py-1 rounded hover:bg-accent border font-bold">&rarr;</button>
        </div>
        
        <div className="flex w-full justify-between mb-2 text-xs font-bold text-muted-foreground uppercase">
          <div className="w-10 text-center">Lu</div><div className="w-10 text-center">Ma</div><div className="w-10 text-center">Mi</div><div className="w-10 text-center">Ju</div><div className="w-10 text-center">Vi</div><div className="w-10 text-center">Sa</div><div className="w-10 text-center">Do</div>
        </div>
        
        <div className="flex flex-col gap-2">{renderCalendarDays()}</div>
      </div>

      <div className="hidden lg:block w-px bg-border/50"></div>

      <div className="w-full lg:w-1/2 flex flex-col h-full pt-8">
        <h3 className="text-2xl font-bold mb-6">Asentamiento</h3>
        
        {!selectedDate && <div className="flex-grow flex items-center justify-center text-muted-foreground italic h-40 bg-secondary/20 rounded-xl border border-dashed text-sm">Dicta un día a la izquierda</div>}
        {selectedDate && loadingSlots && <div className="flex-grow flex items-center justify-center text-primary h-40 font-medium animate-pulse text-sm">Trazando bloques disponibles según reglas de anticipación...</div>}
        {selectedDate && !loadingSlots && availabilityErrorMsg && <div className="flex-grow flex items-center justify-center text-amber-700 text-center h-40 bg-amber-50 rounded-xl border border-amber-200 p-6 text-sm">{availabilityErrorMsg}</div>}
        {selectedDate && !loadingSlots && !selectedSlot && availableSlots.length === 0 && <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground text-center h-40 bg-red-50/50 rounded-xl border border-red-100 p-6 opacity-70"><span className="text-xl mb-1">🗓️</span>Jornada Inhabilitada. Límite de pacientes superado o Anticipación restringida.</div>}
        {bookingErrorMsg && bookingStatus !== 'submitting' && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {bookingErrorMsg}
            </div>
        )}
        
        {selectedDate && !loadingSlots && !selectedSlot && availableSlots.length > 0 && (
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2">
                {availableSlots.map((slot, idx) => (
                    <button key={idx} onClick={() => setSelectedSlot(slot)} className="py-3 px-4 border border-primary/20 rounded-xl text-primary font-medium hover:bg-primary hover:text-white transition-colors">
                        {format(parseISO(slot.start), 'hh:mm a')}
                    </button>
                ))}
            </div>
        )}

        {selectedSlot && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500 bg-background p-1 -mt-2">
                <div className="flex items-center justify-between p-4 bg-primary/5 text-primary border border-primary/20 rounded-xl shadow-inner">
                    <div>
                        <span className="block text-xs uppercase font-bold text-muted-foreground">Confirmación Final de Bloque</span>
                        <span className="font-semibold text-lg">{format(parseISO(selectedSlot.start), "dd MMM, hh:mm a", { locale: es })}</span>
                    </div>
                    <button onClick={() => setSelectedSlot(null)} className="text-sm border border-primary/50 bg-background px-3 py-1 rounded-full transition-colors">Regresar</button>
                </div>
                
                <div className="space-y-4 py-4">
                    <input type="text" placeholder="Nombre Oficial del Paciente" value={name} onChange={(e)=> setName(e.target.value)} className="w-full p-4 border rounded-xl" />
                    <input type="email" placeholder="Correo Vinculado al Expediente" value={email} onChange={(e)=> setEmail(e.target.value)} className="w-full p-4 border rounded-xl" />
                    <div className="flex gap-2">
                        <select value={phoneCodigo} onChange={e => setPhoneCodigo(e.target.value)} className="w-[110px] p-4 border rounded-xl bg-background text-sm font-mono flex-shrink-0">
                            {codigosPais.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                        </select>
                        <input type="tel" placeholder="Número de WhatsApp / Teléfono" value={phoneNumero} onChange={(e) => setPhoneNumero(e.target.value.replace(/\D/g, ''))} className="w-full p-4 border rounded-xl font-mono" maxLength={12} />
                    </div>
                </div>

                <div className="mt-auto space-y-3">
                    <Button size="lg" className="w-full h-14 text-lg font-bold shadow-xl" disabled={!name || !email || !phoneNumero || bookingStatus === 'submitting'} onClick={handleBooking}>
                        {bookingStatus === 'submitting' ? 'Enlazando Calendar...' : `Abonar al Cierre - $${selectedService.precio}`}
                    </Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
