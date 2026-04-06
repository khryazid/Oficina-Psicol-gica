"use client";

import { useEffect, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";

interface Paciente { id: string; nombre_completo?: string; nombre?: string; email: string; telefono?: string; }
interface Pago { id: string; monto_recibido: number; referencia: string; metodo: string; banco_origen: string; telefono_origen?: string; creado_en: string; }
interface Cita {
    id: string; fecha_inicio: string; fecha_fin: string; duracion_mins: number; estado: string; 
    servicio_nombre: string; precio_final: number; creado_en: string; calendly_event_id?: string;
    paciente: Paciente; 
    pago: Pago[];
}

function getValorCita(cita: Cita): number {
    return cita.precio_final || cita.pago?.[0]?.monto_recibido || 0;
}

function getServicioCita(cita: Cita): string {
    return cita.servicio_nombre || 'Servicio General';
}

export default function AdminCitasDashboard() {
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [bcvRate, setBcvRate] = useState<number>(36.50);

    // Estado del calendario visual
    const [calMonth, setCalMonth] = useState(new Date());

    // Estado de reprogramación
    const [reprogramandoId, setReprogramandoId] = useState<string | null>(null);
    const [nuevaFecha, setNuevaFecha] = useState('');
    const [nuevaHora, setNuevaHora] = useState('');

    // Estado de detalle expandido
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchCitas = () => {
         fetch('/api/admin/citas')
           .then(res => res.json())
           .then(data => { setCitas(data.citas || []); setLoading(false); })
           .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchCitas();
        fetch('/api/bcv').then(res => res.json()).then(d => { if(d.bcv) setBcvRate(d.bcv) });
    }, []);

    const changeStatus = async (id: string, nuevoEstado: string) => {
        setActioningId(id);
        try {
            const res = await fetch('/api/admin/citas', {
                method: 'PATCH', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id, estado_nuevo: nuevoEstado })
            });
            if (res.ok) fetchCitas();
            else alert("Hubo un error de base de datos cambiando el estatus.");
        } catch(e) {
            alert("Fallo de red en la conciliación.");
        }
        setActioningId(null);
    };

    const reprogramar = async (cita: Cita) => {
        if (!nuevaFecha || !nuevaHora) { alert("Selecciona fecha y hora."); return; }
        setActioningId(cita.id);
        const startISO = new Date(`${nuevaFecha}T${nuevaHora}:00`).toISOString();
        // Calcular duración original
        const origStart = new Date(cita.fecha_inicio);
        const origEnd = new Date(cita.fecha_fin);
        const duracionMs = origEnd.getTime() - origStart.getTime();
        const endISO = new Date(new Date(startISO).getTime() + duracionMs).toISOString();

        try {
            const res = await fetch('/api/admin/citas', {
                method: 'PATCH', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id: cita.id, nueva_fecha_inicio: startISO, nueva_fecha_fin: endISO })
            });
            if (res.ok) { setReprogramandoId(null); setNuevaFecha(''); setNuevaHora(''); fetchCitas(); }
            else alert("Error reprogramando cita en la base de datos.");
        } catch(e) { alert("Fallo de red."); }
        setActioningId(null);
    };

    const pendientes = citas.filter(c => c.estado === 'pending_confirmation' || c.estado === 'pending_payment');
    const confirmadas = citas.filter(c => c.estado === 'confirmed');
    const canceladas = citas.filter(c => c.estado === 'cancelled');

    const getNombre = (p: Paciente) => p?.nombre_completo || p?.nombre || 'Sin nombre';

    // CALENDARIO VISUAL: Agrupar citas confirmadas por día
    const citasCalendario = [...confirmadas, ...pendientes].filter(c => c.fecha_inicio);
    const getCitasDelDia = (dia: Date) => citasCalendario.filter(c => isSameDay(parseISO(c.fecha_inicio), dia));

    const renderCalendarioAdmin = () => {
        const monthStart = startOfMonth(calMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const rows = []; let days = []; let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const citasDia = getCitasDelDia(cloneDay);
                const isThisMonth = isSameMonth(cloneDay, monthStart);
                const isToday = isSameDay(cloneDay, new Date());
                
                days.push(
                    <div key={day.toString()} className={`min-h-[90px] border border-border/30 rounded-lg p-1 ${!isThisMonth ? 'opacity-30 bg-muted/5' : 'bg-background'} ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
                        <span className={`text-[11px] font-bold px-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{format(cloneDay, 'd')}</span>
                        <div className="space-y-0.5 mt-0.5">
                            {citasDia.slice(0, 3).map(c => (
                                <div key={c.id} className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity ${c.estado === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                                    title={`${getNombre(c.paciente)} - ${c.servicio_nombre}`}>
                                    {format(parseISO(c.fecha_inicio), 'h:mma')} {getNombre(c.paciente).split(' ')[0]}
                                </div>
                            ))}
                            {citasDia.length > 3 && <span className="text-[8px] text-muted-foreground pl-1">+{citasDia.length - 3} más</span>}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="grid grid-cols-7 gap-0.5" key={day.toString()}>{days}</div>);
            days = [];
        }
        return rows;
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-muted-foreground font-medium">Reuniendo expedientes contables...</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 space-y-10 pb-24 animate-in fade-in duration-500">
             <header className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight">Conciliación de Citas</h1>
                     <p className="text-muted-foreground mt-1">Valida pagos, reprograma horarios y consulta tu agenda clínica.</p>
                 </div>
                 <div className="flex gap-2 flex-wrap">
                     <span className="bg-secondary px-3 py-2 rounded-xl text-sm font-bold border border-border/50 text-secondary-foreground shadow-sm">BCV: Bs. {bcvRate}</span>
                     <span className="bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-bold border border-green-200">{confirmadas.length} Confirmadas</span>
                     <span className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-sm font-bold border border-amber-200">{pendientes.length} Pendientes</span>
                     <Button variant="outline" onClick={fetchCitas}>↻ Recargar</Button>
                 </div>
             </header>

             {/* ==================== CALENDARIO VISUAL ==================== */}
             <div className="bg-card p-6 rounded-3xl border border-border shadow-md">
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold">📅 Panorama Clínico</h2>
                     <div className="flex gap-2 items-center">
                         <button onClick={()=>setCalMonth(subMonths(calMonth, 1))} className="px-3 py-1 rounded border hover:bg-accent font-bold">&larr;</button>
                         <span className="font-semibold text-lg capitalize min-w-[160px] text-center">{format(calMonth, "MMMM yyyy", { locale: es })}</span>
                         <button onClick={()=>setCalMonth(addMonths(calMonth, 1))} className="px-3 py-1 rounded border hover:bg-accent font-bold">&rarr;</button>
                     </div>
                 </div>
                 <div className="grid grid-cols-7 gap-0.5 mb-1 text-[10px] font-bold text-muted-foreground uppercase text-center">
                     <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
                 </div>
                 <div className="space-y-0.5">
                     {renderCalendarioAdmin()}
                 </div>
             </div>

             {/* ==================== PENDIENTES ==================== */}
             <div className="space-y-6">
                 <h2 className="text-2xl font-bold flex gap-3 items-center">
                     <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl">Por Confirmar</span>
                 </h2>
                 {pendientes.length === 0 && <p className="text-muted-foreground italic border border-dashed rounded-2xl p-8 text-center bg-secondary/10">No hay pagos nuevos sin verificar.</p>}
                 
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                     {pendientes.map(cita => {
                         const fcha = cita.fecha_inicio ? parseISO(cita.fecha_inicio) : new Date(cita.creado_en);
                         const isFisico = cita.pago?.[0]?.metodo === 'efectivo';
                         const valorDolar = getValorCita(cita);
                         const calculoBs = (valorDolar * bcvRate).toFixed(2);
                         
                         return (
                         <div key={cita.id} className="bg-card border border-amber-200/50 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row">
                             <div className="w-2 absolute left-0 top-0 bottom-0 bg-amber-400"></div>
                             
                             <div className="p-6 md:w-3/5 border-b md:border-b-0 md:border-r border-border/60">
                                 <div className="mb-4">
                                     <span className="bg-secondary/50 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest text-muted-foreground mb-2 block w-max">Reservación y Contacto</span>
                                     <p className="font-bold text-xl">{getNombre(cita.paciente)}</p>
                                     <p className="text-sm font-mono text-muted-foreground">{cita.paciente?.email}</p>
                                     {cita.paciente?.telefono && <p className="text-sm font-mono text-primary mt-1">📱 {cita.paciente.telefono}</p>}
                                 </div>
                                 <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                                     <p className="font-bold text-primary">{getServicioCita(cita)}</p>
                                     <p className="font-bold font-mono text-sm mt-1">{format(fcha, "EEEE dd 'de' MMM, hh:mm a", { locale: es })}</p>
                                 </div>
                             </div>

                             <div className="p-6 md:w-2/5 md:bg-amber-50/10 flex flex-col h-full">
                                <span className="bg-secondary/50 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest text-muted-foreground mb-3 block w-max">Liquidación Declarada</span>
                                {cita.pago?.length > 0 ? (
                                    <>
                                        <div className="flex flex-col gap-1 mb-3 bg-white p-3 rounded-xl border shadow-sm">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground font-bold">Monto Base:</span>
                                                <span className="font-black">${valorDolar}</span>
                                            </div>
                                            {!isFisico && (
                                                <div className="flex justify-between items-center pt-1 border-t border-dashed">
                                                    <span className="text-muted-foreground font-bold text-xs">Equivalente Transado</span>
                                                    <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">Bs. {calculoBs}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!isFisico ? (
                                            <div className="bg-white border rounded-xl p-3 text-xs mb-auto shadow-inner">
                                                <div className="flex justify-between items-center border-b pb-2 mb-2">
                                                    <span className="font-bold uppercase text-muted-foreground">📱 {cita.pago[0].metodo}</span>
                                                    <span className="font-bold text-primary">{cita.pago[0].banco_origen}</span>
                                                </div>
                                                <p><span className="font-bold text-muted-foreground">Tlf / CI Emisor:</span> {cita.pago[0].telefono_origen}</p>
                                                <p className="font-mono text-[16px] font-bold text-primary mt-2 flex items-center justify-between"><span>REF.</span> <span className="bg-primary/10 px-2 rounded tracking-widest">{cita.pago[0].referencia}</span></p>
                                            </div>
                                        ) : (
                                            <div className="bg-orange-50 text-orange-800 border-orange-200 border rounded-xl p-3 text-xs mb-auto mt-2">
                                                <strong className="block mb-1">💵 Efectivo (Billetes físicos)</strong>
                                                Cobro Físico al Consultorio. Si no trae los dólares o soberanos de antemano el paciente perderá el servicio.
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-red-500 font-bold">No hay comprobantes ligados.</p>
                                )}

                                <div className="mt-4 flex gap-2">
                                    <Button onClick={()=>changeStatus(cita.id, 'confirmed')} disabled={actioningId===cita.id} className="w-1/2 bg-amber-500 hover:bg-amber-600 font-bold shadow-md text-xs h-10">✔️ Validar</Button>
                                    <Button onClick={()=>changeStatus(cita.id, 'cancelled')} disabled={actioningId===cita.id} variant="outline" className="w-1/2 text-destructive font-bold text-xs h-10 hover:bg-destructive/10">❌ Rechazar</Button>
                                </div>
                             </div>
                         </div>
                     )})}
                 </div>
             </div>

             {/* ==================== CONFIRMADAS ==================== */}
             <div className="space-y-6 pt-10 border-t border-border/50">
                 <h2 className="text-2xl font-bold flex gap-3 items-center">
                     <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl">Agenda Aprobada ({confirmadas.length})</span>
                 </h2>
                 {confirmadas.length === 0 && <p className="text-muted-foreground text-sm italic border border-dashed rounded-2xl p-8 text-center bg-secondary/10">No tienes eventos saldados recientemente.</p>}
                 
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                     {confirmadas.map(cita => {
                         const fcha = cita.fecha_inicio ? parseISO(cita.fecha_inicio) : new Date(cita.creado_en);
                         const isExpanded = expandedId === cita.id;
                         const isReprogramando = reprogramandoId === cita.id;
                         const valorDolar = getValorCita(cita);
                         const calculoBs = (valorDolar * bcvRate).toFixed(2);
                         
                         return (
                         <div key={cita.id} className="bg-card border border-green-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                             <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                             
                             <div className="p-5">
                                 {/* Header */}
                                 <div className="flex justify-between items-start mb-3">
                                     <div className="flex-1 min-w-0">
                                         <p className="font-bold text-lg truncate">{getNombre(cita.paciente)}</p>
                                         <p className="text-sm text-muted-foreground font-mono truncate">{cita.paciente?.email}</p>
                                         {cita.paciente?.telefono && <p className="text-sm text-primary font-mono mt-0.5">📱 {cita.paciente.telefono}</p>}
                                     </div>
                                     <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-1 flex-shrink-0 rounded border border-green-200 ml-3">SALDADO</span>
                                 </div>

                                 {/* Servicio y Hora */}
                                 <div className="bg-green-50/50 rounded-xl p-4 border border-green-100/50 mb-3">
                                     <div className="flex justify-between items-center">
                                         <div>
                                             <p className="font-bold text-green-800 text-sm">{getServicioCita(cita)}</p>
                                             <p className="font-mono text-sm font-bold mt-1">{format(fcha, "EEEE dd 'de' MMMM, hh:mm a", { locale: es })}</p>
                                         </div>
                                         <div className="text-right">
                                             <p className="font-black text-lg">${valorDolar}</p>
                                             <p className="text-[10px] text-green-600 font-medium">Bs. {calculoBs}</p>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Pago info compacto */}
                                 {cita.pago?.length > 0 && (
                                     <div className="text-xs text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2 mb-3 flex gap-4 flex-wrap">
                                         <span>Método: <b className="text-foreground">{cita.pago[0].metodo}</b></span>
                                         {cita.pago[0].referencia !== 'EFECTIVO' && cita.pago[0].referencia !== 'EFECTIVO_FISICO' && <span>Ref: <b className="text-primary font-mono">{cita.pago[0].referencia}</b></span>}
                                         {cita.pago[0].banco_origen !== 'N/A' && <span>Banco: <b>{cita.pago[0].banco_origen}</b></span>}
                                     </div>
                                 )}

                                 {/* Botones de Acción */}
                                 <div className="flex gap-2">
                                     <Button onClick={()=>{ setReprogramandoId(isReprogramando ? null : cita.id); setExpandedId(null); }} variant="outline" size="sm" className="flex-1 text-xs font-bold">
                                         {isReprogramando ? '✕ Cancelar' : '🔄 Reprogramar'}
                                     </Button>
                                     <Button onClick={()=>changeStatus(cita.id, 'cancelled')} disabled={actioningId===cita.id} variant="ghost" size="sm" className="flex-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600">
                                         🗑️ Suspender
                                     </Button>
                                 </div>

                                 {/* Panel de Reprogramación */}
                                 {isReprogramando && (
                                     <div className="mt-4 p-4 bg-blue-50/50 border border-blue-200/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                         <p className="text-sm font-bold text-blue-800 mb-3">📅 Mover cita manualmente</p>
                                         <div className="flex gap-2 mb-3">
                                             <div className="w-1/2">
                                                 <label className="text-[10px] font-bold text-blue-600 uppercase">Nueva Fecha</label>
                                                 <input type="date" value={nuevaFecha} onChange={e=>setNuevaFecha(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
                                             </div>
                                             <div className="w-1/2">
                                                 <label className="text-[10px] font-bold text-blue-600 uppercase">Nueva Hora</label>
                                                 <input type="time" value={nuevaHora} onChange={e=>setNuevaHora(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
                                             </div>
                                         </div>
                                         <Button onClick={()=>reprogramar(cita)} disabled={actioningId===cita.id || !nuevaFecha || !nuevaHora} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                                             {actioningId===cita.id ? 'Moviendo evento...' : 'Confirmar Nuevo Horario'}
                                         </Button>
                                     </div>
                                 )}
                             </div>
                         </div>
                     )})}
                 </div>
             </div>

             {/* ==================== CANCELADAS ==================== */}
             {canceladas.length > 0 && (
                 <div className="space-y-4 pt-10 border-t border-border/50 opacity-60">
                     <h2 className="text-xl font-bold flex gap-3 items-center">
                         <span className="bg-red-100 text-red-700 px-3 py-1 rounded-xl text-sm">Archivadas / Canceladas ({canceladas.length})</span>
                     </h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                         {canceladas.slice(0, 8).map(cita => (
                             <div key={cita.id} className="bg-card border border-red-100/50 rounded-xl p-3 text-xs">
                                 <p className="font-bold truncate">{getNombre(cita.paciente)}</p>
                                 <p className="text-muted-foreground truncate">{getServicioCita(cita)}</p>
                                 <p className="font-mono text-muted-foreground mt-1">{cita.fecha_inicio ? format(parseISO(cita.fecha_inicio), 'dd MMM, hh:mm a', { locale: es }) : 'Sin fecha'}</p>
                                 <Button onClick={()=>changeStatus(cita.id, 'confirmed')} variant="ghost" size="sm" className="w-full mt-2 text-[10px] hover:bg-green-50 hover:text-green-600">♻️ Restaurar</Button>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>
    )
}
