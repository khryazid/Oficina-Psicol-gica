import { google } from 'googleapis';
import fs from 'node:fs';

interface ServiceAccountCredentials {
    client_email?: string;
    private_key?: string;
    [key: string]: unknown;
}

function readInlineCredentials(): ServiceAccountCredentials | null {
    const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (rawJson) {
        try {
            const parsed = JSON.parse(rawJson) as ServiceAccountCredentials;
            if (parsed.client_email && parsed.private_key) {
                return {
                    ...parsed,
                    private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
                };
            }
        } catch (error) {
            console.warn('GOOGLE_SERVICE_ACCOUNT_JSON no tiene formato JSON válido:', error);
        }
    }

    const rawBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
    if (rawBase64) {
        try {
            const decoded = Buffer.from(rawBase64, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded) as ServiceAccountCredentials;
            if (parsed.client_email && parsed.private_key) {
                return {
                    ...parsed,
                    private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
                };
            }
        } catch (error) {
            console.warn('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 no tiene formato válido:', error);
        }
    }

    return null;
}

// Prioridad de credenciales:
// 1) GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (ideal en Vercel)
// 2) GOOGLE_APPLICATION_CREDENTIALS apuntando a archivo local válido

export const getCalendarClient = () => {
    try {
                const scopes = [
                        'https://www.googleapis.com/auth/calendar',
                        'https://www.googleapis.com/auth/calendar.events'
                ];

                const inlineCredentials = readInlineCredentials();
                const credentialsFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

                const auth = inlineCredentials
                    ? new google.auth.GoogleAuth({ credentials: inlineCredentials, scopes })
                    : credentialsFilePath
                    ? (() => {
                        if (!fs.existsSync(credentialsFilePath)) {
                                console.warn(`GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo inexistente: ${credentialsFilePath}`);
                                return null;
                        }

                    return new google.auth.GoogleAuth({ keyFile: credentialsFilePath, scopes });
                    })()
                    : null;

                if (!auth) {
                    return null;
                }

        return google.calendar({ version: 'v3', auth });
    } catch (error) {
        console.error("Falta configuración de credenciales GCloud:", error);
        return null;
    }
};

// Constantes de negocio de la consulta (Recomendable mover a DB en un futuro)
export const CLINIC_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const CLINIC_TIMEZONE = 'America/Caracas';
