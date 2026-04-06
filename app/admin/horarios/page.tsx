"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Servicio { id: string; nombre: string; duracion_mins: number; precio: number; }

export default function AdminHorariosV4Page() {
    const [descanso, setDescanso] = useState(15);
    const [anticipacionMin, setAnticipacionMin] = useState(24);
    const [anticipacionMax, setAnticipacionMax] = useState(30);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [horario, setHorario] = useState<any>({});
    const [bloqueos, setBloqueos] = useState<any[]>([]);
    const [bancos, setBancos] = useState({
        pagoMovil: { activo: true, banco: "", telefono: "", cedula: "" },
        transferencia: { activo: true, banco: "", cuenta: "", titular: "", identificacion: "" },
        efectivo: { activo: true, instrucciones: "Cancelará físicamente el monto al llegar a su cita médica." }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const dayMap = [
        { id: "1", label: 'Lunes' }, { id: "2", label: 'Martes' }, { id: "3", label: 'Miércoles' },
        { id: "4", label: 'Jueves' }, { id: "5", label: 'Viernes' }, { id: "6", label: 'Sábado' }, { id: "0", label: 'Domingo' }
    ];

    useEffect(() => {
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(data => {
                setDescanso(data.tiempo_descanso_mins || 15);
                setAnticipacionMin(data.anticipacion_minima_horas || 24);
                setAnticipacionMax(data.anticipacion_maxima_dias || 30);
                setServicios(data.servicios || []);
                setHorario(data.horario_habitual || {});
                setBloqueos(data.bloqueos_especificos || []);
                if (data.datos_bancarios) setBancos(data.datos_bancarios);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Servicios
    const addServicio = () => setServicios([...servicios, { id: crypto.randomUUID(), nombre: "Nuevo Servicio", duracion_mins: 45, precio: 30 }]);
    const updateServicio = (idx: number, key: string, value: any) => { const arr = [...servicios]; arr[idx] = { ...arr[idx], [key]: value }; setServicios(arr); };
    const removeServicio = (idx: number) => { const arr = [...servicios]; arr.splice(idx, 1); setServicios(arr); };

    // Bancos
    const updateBanco = (metodo: keyof typeof bancos, field: string, val: string|boolean) => {
        setBancos(prev => ({ ...prev, [metodo]: { ...prev[metodo], [field]: val } }));
    };

    // Matriz y Bloqueos
    const updateDia = (id: string, field: string, value: any) => setHorario((prev: any) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    const addPausa = (id: string) => setHorario((prev: any) => { const actuales = prev[id].descansos || []; return { ...prev, [id]: { ...prev[id], descansos: [...actuales, { inicio: "12:00", fin: "13:00" }] } }; });
    const removePausa = (id: string, idx: number) => setHorario((prev: any) => { const actuales = [...(prev[id].descansos || [])]; actuales.splice(idx, 1); return { ...prev, [id]: { ...prev[id], descansos: actuales } }; });
    const addBloqueo = () => setBloqueos([...bloqueos, { fecha: new Date().toISOString().split('T')[0], todo_el_dia: true, inicio: "", fin: "" }]);
    const removeBloqueo = (idx: number) => { const arr = [...bloqueos]; arr.splice(idx, 1); setBloqueos(arr); };
    const updateBloqueo = (idx: number, field: string, val: any) => { const arr = [...bloqueos]; arr[idx][field] = val; setBloqueos(arr); };

    // BD Save
    const handleSave = async () => {
        setSaving(true); setMensaje("");
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tiempo_descanso_mins: descanso,
                    anticipacion_minima_horas: anticipacionMin,
                    anticipacion_maxima_dias: anticipacionMax,
                    servicios,
                    horario_habitual: horario,
                    bloqueos_especificos: bloqueos,
                    datos_bancarios: bancos
                })
            });
            const d = await res.json();
            setMensaje(d.message || "Guardado exitoso");
        } catch (e) { setMensaje("Error al conectar con DB."); }
        setSaving(false);
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Armando consola de mando...</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 space-y-10 pb-24 animate-in fade-in zoom-in duration-500">
            <header className="flex justify-between items-center bg-card p-6 rounded-3xl border border-border shadow-sm">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight">Consola Maestra V4</h1>
                     <p className="text-muted-foreground mt-1">Control Analítico de Reglas de Juego y Tesorería</p>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                     <Button size="lg" onClick={handleSave} disabled={saving}>{saving ? 'Sincronizando Nube...' : 'Guardar y Publicar'}</Button>
                     {mensaje && <span className="text-primary text-xs font-medium">{mensaje}</span>}
                 </div>
            </header>

            {/* SECCIÓN MÉTODOS DE PAGO Y ANTICIPACIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card p-8 rounded-3xl border border-border shadow-md space-y-8">
                    <h3 className="text-2xl font-bold">Límites de Reserva Natural</h3>
                    
                    <div>
                        <label className="font-bold flex justify-between text-sm">
                            Reserva Urgente (Mínima anticipación)
                            <span className="text-primary bg-primary/10 px-2 rounded">{anticipacionMin} Horas</span>
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">Bloquea que agenden "ahorita" para dentro de un rato.</p>
                        <input type="range" min="1" max="72" step="1" value={anticipacionMin} onChange={e=>setAnticipacionMin(Number(e.target.value))} className="w-full accent-primary" />
                    </div>

                    <div>
                        <label className="font-bold flex justify-between text-sm">
                            Horizonte Máximo en el Futuro
                            <span className="text-primary bg-primary/10 px-2 rounded">{anticipacionMax} Días</span>
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">Hasta que mes pueden llegar a reservar de manera adelantada.</p>
                        <input type="range" min="7" max="365" step="1" value={anticipacionMax} onChange={e=>setAnticipacionMax(Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                </div>

                <div className="bg-card p-8 rounded-3xl border border-border shadow-md space-y-6">
                    <h3 className="text-2xl font-bold flex gap-2">Cuentas Receptoras <span className="text-xs bg-green-100 text-green-700 py-1 px-2 rounded-xl mt-1">Check-out Dinámico</span></h3>
                    
                    {/* Pago Movil Config */}
                    <div className="border border-border p-4 rounded-xl space-y-3">
                        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={bancos.pagoMovil.activo} onChange={e=>updateBanco('pagoMovil', 'activo', e.target.checked)} className="accent-primary w-4 h-4"/> Pago Móvil</label>
                        <div className="flex gap-2">
                           <input placeholder="Banco (Ej: Venezuela 0102)" value={bancos.pagoMovil.banco} onChange={e=>updateBanco('pagoMovil','banco',e.target.value)} className="w-full border p-2 rounded text-sm"/>
                        </div>
                        <div className="flex gap-2">
                           <input placeholder="Teléfono" value={bancos.pagoMovil.telefono} onChange={e=>updateBanco('pagoMovil','telefono',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                           <input placeholder="Cédula/RIF" value={bancos.pagoMovil.cedula} onChange={e=>updateBanco('pagoMovil','cedula',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                        </div>
                    </div>

                    {/* Transferencia Config */}
                    <div className="border border-border p-4 rounded-xl space-y-3">
                        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={bancos.transferencia.activo} onChange={e=>updateBanco('transferencia', 'activo', e.target.checked)} className="accent-primary w-4 h-4"/> Transferencia Nacional</label>
                        <div className="flex gap-2">
                           <input placeholder="Banco" value={bancos.transferencia.banco} onChange={e=>updateBanco('transferencia','banco',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                           <input placeholder="Titular" value={bancos.transferencia.titular} onChange={e=>updateBanco('transferencia','titular',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                        </div>
                        <div className="flex gap-2">
                           <input placeholder="Nº Cuenta (0102...)" value={bancos.transferencia.cuenta} onChange={e=>updateBanco('transferencia','cuenta',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                           <input placeholder="Cédula/RIF" value={bancos.transferencia.identificacion} onChange={e=>updateBanco('transferencia','identificacion',e.target.value)} className="w-1/2 border p-2 rounded text-sm"/>
                        </div>
                    </div>

                    {/* Efectivo Config */}
                    <div className="border border-border p-4 rounded-xl bg-orange-50/20">
                        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={bancos.efectivo.activo} onChange={e=>updateBanco('efectivo', 'activo', e.target.checked)} className="accent-orange-500 w-4 h-4"/> Divisas Físicas (En sitio)</label>
                        <textarea placeholder="Instrucciones para pago físico" value={bancos.efectivo.instrucciones} onChange={e=>updateBanco('efectivo','instrucciones',e.target.value)} className="w-full mt-2 border p-2 rounded text-sm" rows={2}/>
                    </div>
                </div>
            </div>

            <hr className="border-border/60"/>

            {/* SECCIÓN CATÁLOGOS Y HORARIOS VIEJOS REUTILIZADOS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                <div className="space-y-8">
                    <div className="bg-card p-8 rounded-3xl border border-border shadow-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold">Catálogo de Terapias</h3>
                            <Button size="sm" variant="outline" onClick={addServicio}>+ Crear Servicio</Button>
                        </div>
                        
                        <div className="space-y-4">
                            {servicios.map((srv, idx) => (
                                <div key={idx} className="relative bg-secondary/20 p-5 rounded-2xl border border-border/60 hover:border-primary/40 transition-colors group">
                                    <button onClick={() => removeServicio(idx)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-red-100 text-red-500 font-bold px-2 py-1 rounded-lg transition-all">Eliminar</button>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Nombre de la Terapia</label>
                                            <input type="text" value={srv.nombre} onChange={e=>updateServicio(idx, 'nombre', e.target.value)} className="w-full mt-1 p-2 bg-background border rounded-lg font-semibold" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase flex gap-1">Duración <span className="hidden sm:inline">(min)</span></label>
                                                <input type="number" value={srv.duracion_mins} onChange={e=>updateServicio(idx, 'duracion_mins', Number(e.target.value))} className="w-full mt-1 p-2 bg-background border rounded-lg text-primary font-bold" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Precio (USD) $</label>
                                                <input type="number" value={srv.precio} onChange={e=>updateServicio(idx, 'precio', Number(e.target.value))} className="w-full mt-1 p-2 bg-background border rounded-lg text-green-600 font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {servicios.length === 0 && <p className="text-center text-muted-foreground italic py-4">No ofreces ningún servicio.</p>}
                        </div>

                        <div className="mt-8 pt-6 border-t border-border/50">
                            <label className="font-bold flex justify-between">
                                Buffer de Limpieza / Descanso
                                <span className="text-primary bg-primary/10 px-2 rounded text-sm">{descanso} mins de pausa</span>
                            </label>
                            <input type="range" min="0" max="60" step="5" value={descanso} onChange={e=>setDescanso(Number(e.target.value))} className="w-full mt-2 accent-primary" />
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-3xl border border-border shadow-md">
                        <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xl font-bold">Imprevistos</h3>
                           <Button size="sm" variant="outline" onClick={addBloqueo}>+ Tachado Absoluto</Button>
                        </div>
                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                           {bloqueos.map((b, idx) => (
                               <div key={idx} className="bg-destructive/5 p-4 rounded-xl border border-destructive/20 relative">
                                   <button onClick={()=>removeBloqueo(idx)} className="absolute top-2 right-2 text-destructive font-bold">X</button>
                                   <input type="date" value={b.fecha} onChange={e=>updateBloqueo(idx, 'fecha', e.target.value)} className="w-full p-2 rounded-lg text-sm bg-background border" />
                                   <label className="flex items-center text-sm font-medium gap-2 mt-2">
                                       <input type="checkbox" checked={b.todo_el_dia} onChange={e=>updateBloqueo(idx, 'todo_el_dia', e.target.checked)} className="text-destructive" />
                                       Bloqueo de Jornada Completa
                                   </label>
                                   {!b.todo_el_dia && (
                                       <div className="flex gap-2 text-sm pt-2">
                                           <div className="w-1/2"><label>Inicia</label><input type="time" value={b.inicio} onChange={e=>updateBloqueo(idx, 'inicio', e.target.value)} className="w-full p-2 bg-background border rounded" /></div>
                                           <div className="w-1/2"><label>Termina</label><input type="time" value={b.fin} onChange={e=>updateBloqueo(idx, 'fin', e.target.value)} className="w-full p-2 bg-background border rounded" /></div>
                                       </div>
                                   )}
                               </div>
                           ))}
                        </div>
                    </div>
                </div>

                <div className="bg-card p-8 rounded-3xl border border-border shadow-md h-max">
                    <h3 className="text-2xl font-bold mb-6">Agenda Arquitectónica Permanente</h3>
                    <div className="space-y-5">
                        {dayMap.map(d => {
                            const diaConfig = horario[d.id] || { activo: false, inicio: "09:00", fin: "17:00", descansos: [] };
                            return (
                                <div key={d.id} className={`p-4 border rounded-2xl transition-all ${diaConfig.activo ? 'bg-primary/5 border-primary/30' : 'bg-muted/10 border-border/50 opacity-50'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" className="w-5 h-5 accent-primary" checked={diaConfig.activo} onChange={e => updateDia(d.id, 'activo', e.target.checked)} />
                                            <span className="font-bold text-lg">{d.label}</span>
                                        </div>
                                        {diaConfig.activo && <button onClick={()=>addPausa(d.id)} className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded-full">+ Pausa Fija</button>}
                                    </div>

                                    {diaConfig.activo && (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-4">
                                                <div className="w-1/2"><label className="text-xs text-muted-foreground">Inicia Clínica</label><input type="time" value={diaConfig.inicio} onChange={e=>updateDia(d.id,'inicio',e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
                                                <div className="w-1/2"><label className="text-xs text-muted-foreground">Cierra Clínica</label><input type="time" value={diaConfig.fin} onChange={e=>updateDia(d.id,'fin',e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
                                            </div>
                                            {diaConfig.descansos?.map((pausa:any, pIdx:number) => (
                                                <div key={pIdx} className="flex gap-2 items-end bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                                    <div className="w-[45%]"><label className="text-[10px] text-orange-600 font-bold uppercase">Pausa Inicio</label><input type="time" value={pausa.inicio} onChange={e=>{const nd = [...diaConfig.descansos]; nd[pIdx].inicio = e.target.value; updateDia(d.id,'descansos',nd);}} className="w-full p-1 text-sm border bg-white" /></div>
                                                    <div className="w-[45%]"><label className="text-[10px] text-orange-600 font-bold uppercase">Pausa Fin</label><input type="time" value={pausa.fin} onChange={e=>{const nd = [...diaConfig.descansos]; nd[pIdx].fin = e.target.value; updateDia(d.id,'descansos',nd);}} className="w-full p-1 text-sm border bg-white" /></div>
                                                    <button onClick={()=>removePausa(d.id, pIdx)} className="w-[10%] text-red-500 font-bold p-1 bg-red-100 rounded text-sm mb-[2px]">X</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
