export interface ClinicBreak {
  inicio: string;
  fin: string;
}

export interface ClinicDaySchedule {
  activo: boolean;
  inicio: string;
  fin: string;
  descansos: ClinicBreak[];
}

export interface ClinicService {
  id: string;
  nombre: string;
  duracion_mins: number;
  precio: number;
}

export interface ClinicBlock {
  fecha: string;
  todo_el_dia: boolean;
  inicio?: string;
  fin?: string;
}

export interface ClinicBankConfig {
  pagoMovil: {
    activo: boolean;
    banco: string;
    telefono: string;
    cedula: string;
  };
  transferencia: {
    activo: boolean;
    banco: string;
    cuenta: string;
    titular: string;
    identificacion: string;
  };
  efectivo: {
    activo: boolean;
    instrucciones: string;
  };
}

export interface ClinicConfig {
  tiempo_descanso_mins: number;
  anticipacion_minima_horas: number;
  anticipacion_maxima_dias: number;
  datos_bancarios: ClinicBankConfig;
  servicios: ClinicService[];
  horario_habitual: Record<string, ClinicDaySchedule>;
  bloqueos_especificos: ClinicBlock[];
}

const defaultSchedule = {
  activo: false,
  inicio: '09:00',
  fin: '13:00',
  descansos: [],
};

const baseHorarioHabitual: Record<string, ClinicDaySchedule> = {
  '0': { ...defaultSchedule },
  '1': { activo: true, inicio: '09:00', fin: '17:00', descansos: [] },
  '2': { activo: true, inicio: '09:00', fin: '17:00', descansos: [] },
  '3': { activo: true, inicio: '09:00', fin: '17:00', descansos: [] },
  '4': { activo: true, inicio: '09:00', fin: '17:00', descansos: [] },
  '5': { activo: true, inicio: '09:00', fin: '17:00', descansos: [] },
  '6': { ...defaultSchedule },
};

export const defaultFallbackConfig: ClinicConfig = {
  tiempo_descanso_mins: 15,
  anticipacion_minima_horas: 24,
  anticipacion_maxima_dias: 30,
  datos_bancarios: {
    pagoMovil: {
      activo: true,
      banco: 'Banco de Venezuela (0102)',
      telefono: '04248891670',
      cedula: 'V-27832025',
    },
    transferencia: {
      activo: true,
      banco: 'Banco de Venezuela',
      cuenta: '0102-0000-0000-0000-0000',
      titular: 'Dr. Khris',
      identificacion: 'V-27832025',
    },
    efectivo: {
      activo: true,
      instrucciones: 'Cancelará físicamente el monto al llegar a su cita médica.',
    },
  },
  servicios: [
    { id: 'uuid-1', nombre: 'Psicoterapia Individual', duracion_mins: 50, precio: 40 },
    { id: 'uuid-2', nombre: 'Terapia de Pareja', duracion_mins: 75, precio: 60 },
    { id: 'uuid-3', nombre: 'Intervención en Crisis (Urgente)', duracion_mins: 40, precio: 30 },
  ],
  horario_habitual: baseHorarioHabitual,
  bloqueos_especificos: [],
};

export function mergeClinicConfig(override: Partial<ClinicConfig> | null | undefined): ClinicConfig {
  if (!override) {
    return defaultFallbackConfig;
  }

  return {
    ...defaultFallbackConfig,
    ...override,
    datos_bancarios: {
      ...defaultFallbackConfig.datos_bancarios,
      ...(override.datos_bancarios ?? {}),
    },
    servicios: override.servicios ?? defaultFallbackConfig.servicios,
    horario_habitual: {
      ...defaultFallbackConfig.horario_habitual,
      ...(override.horario_habitual ?? {}),
    },
    bloqueos_especificos: override.bloqueos_especificos ?? defaultFallbackConfig.bloqueos_especificos,
  };
}