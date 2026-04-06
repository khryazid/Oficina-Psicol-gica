import { google } from 'googleapis';

// La autenticación la tomará automáticamente de GOOGLE_APPLICATION_CREDENTIALS en el entorno
// O podemos instanciar usando keys parseadas de una variable de entorno.

export const getCalendarClient = () => {
    try {
        const auth = new google.auth.GoogleAuth({
            // Por defecto, si pones GOOGLE_APPLICATION_CREDENTIALS = ./tu-archivo.json en
            // el .env, este constructor lo tomará sin configurar nada.
            scopes: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ]
        });

        return google.calendar({ version: 'v3', auth });
    } catch (error) {
        console.error("Falta configuración de credenciales GCloud:", error);
        return null;
    }
};

// Constantes de negocio de la consulta (Recomendable mover a DB en un futuro)
export const CLINIC_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const CLINIC_TIMEZONE = 'America/Caracas';
