/**
 * config.js - Configuración del Frontend
 * VERSIÓN OPTIMIZADA PARA PRODUCCIÓN
 */

const CONFIG = {
    // 🔑 URL de tu Web App de Google Apps Script
    API_URL: 'https://script.google.com/macros/s/AKfycbxo60Ncsdatuzv3FEV56BImMCrjCsxnVa5st1VaLuIqlqwGp2BhgRP8UrAoJn1bWYvVIA/exec',
    
    // Tipos de registro
    TIPOS_REGISTRO: {
        ENTRADA: 'entrada',
        SALIDA: 'salida',
        ENTRADA_ALMUERZO: 'entrada_almuerzo',
        SALIDA_ALMUERZO: 'salida_almuerzo'
    },
    
    // Nombres legibles de los tipos de registro
    TIPOS_NOMBRES: {
        'entrada': 'Entrada',
        'salida': 'Salida',
        'entrada_almuerzo': 'Entrada Almuerzo',
        'salida_almuerzo': 'Salida Almuerzo'
    },
    
    // Keys para LocalStorage
    STORAGE_KEYS: {
        EMPLEADO: 'empleado_data'
    },
    
    // ✨ NUEVO: Configuración de red
    NETWORK: {
        TIMEOUT: 30000,        // 30 segundos timeout
        MAX_RETRIES: 2,        // Reintentar 2 veces si falla
        RETRY_DELAY: 1000      // 1 segundo entre reintentos
    },
    
    // ✨ NUEVO: Modo debug (solo para desarrollo)
    DEBUG: false  // Cambiar a true solo para debugging
};

/**
 * Función para hacer peticiones al API con retry logic
 * @param {Object} data - Datos a enviar
 * @param {number} retryCount - Contador de reintentos (interno)
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function callAPI(data, retryCount = 0) {
    try {
        // Debug logs solo si está activado
        if (CONFIG.DEBUG) {
            console.log('[API] Request:', data);
        }
        
        // Controller para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.NETWORK.TIMEOUT);
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify(data),
                redirect: 'follow',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Leer respuesta como texto
            const textResponse = await response.text();
            
            // Parsear JSON
            const result = JSON.parse(textResponse);
            
            if (CONFIG.DEBUG) {
                console.log('[API] Response:', result);
            }
            
            return result;
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Si es timeout o error de red Y aún tenemos reintentos
            if (retryCount < CONFIG.NETWORK.MAX_RETRIES) {
                if (CONFIG.DEBUG) {
                    console.log(`[API] Retry ${retryCount + 1}/${CONFIG.NETWORK.MAX_RETRIES}`);
                }
                
                // Esperar antes de reintentar
                await sleep(CONFIG.NETWORK.RETRY_DELAY);
                
                // Reintentar recursivamente
                return callAPI(data, retryCount + 1);
            }
            
            // Si ya no hay más reintentos, lanzar el error
            throw fetchError;
        }
        
    } catch (error) {
        console.error('[API] Error:', error.message);
        
        // Mensajes de error más amigables
        let userMessage = 'Error de conexión';
        
        if (error.name === 'AbortError') {
            userMessage = 'La conexión tardó demasiado. Verifica tu internet.';
        } else if (error instanceof SyntaxError) {
            userMessage = 'Error al procesar la respuesta del servidor';
        } else if (!navigator.onLine) {
            userMessage = 'Sin conexión a internet. Verifica tu conexión.';
        }
        
        return {
            success: false,
            message: userMessage,
            error: CONFIG.DEBUG ? error.message : undefined
        };
    }
}

/**
 * Helper: Sleep/delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Guarda los datos del empleado en el navegador
 */
function saveEmpleadoData(empleadoData) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.EMPLEADO, JSON.stringify(empleadoData));
    } catch (error) {
        console.error('[Storage] Error al guardar:', error.message);
    }
}

/**
 * Obtiene los datos del empleado guardados
 */
function getEmpleadoData() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.EMPLEADO);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('[Storage] Error al leer:', error.message);
        return null;
    }
}

/**
 * Elimina los datos del empleado (logout)
 */
function clearEmpleadoData() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.EMPLEADO);
    } catch (error) {
        console.error('[Storage] Error al limpiar:', error.message);
    }
}

/**
 * Formatea una fecha en formato legible
 * OPTIMIZADO: Cachea el formatter
 */
const dateFormatter = new Intl.DateTimeFormat('es-MX', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
});

function formatDate(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return dateFormatter.format(date);
}

/**
 * Formatea una hora en formato legible
 * OPTIMIZADO: Versión más eficiente
 */
function formatTime(hora) {
    if (!hora) return '';
    
    // Si es un timestamp ISO
    if (typeof hora === 'string' && (hora.includes('T') || hora.includes('Z'))) {
        const date = new Date(hora);
        return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }
    
    // Si ya es HH:MM:SS o HH:MM
    const parts = hora.toString().split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * OPTIMIZADO: Versión más simple
 */
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Sistema de timeout de sesión por inactividad
 * OPTIMIZADO: Menos eventos, mejor rendimiento
 */
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutos
let inactivityTimer;
let lastActivity = Date.now();

/**
 * Reinicia el temporizador de inactividad
 * OPTIMIZADO: Throttled - solo resetea si pasó 1 segundo desde última actividad
 */
function resetInactivityTimer() {
    const now = Date.now();
    
    // Throttle: solo resetear si pasó al menos 1 segundo
    if (now - lastActivity < 1000) return;
    
    lastActivity = now;
    
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
        clearEmpleadoData();
        alert('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
        window.location.href = 'index.html';
    }, SESSION_TIMEOUT);
}

/**
 * Inicializar el sistema de timeout
 * OPTIMIZADO: Menos eventos, mejor para móviles
 */
function initInactivityTimeout() {
    // Solo eventos importantes (no mousemove que es muy frecuente)
    const eventos = ['mousedown', 'keypress', 'touchstart', 'click', 'scroll'];
    
    eventos.forEach(evento => {
        document.addEventListener(evento, resetInactivityTimer, { passive: true });
    });
    
    // Detectar cambios de visibilidad (cuando cambia de tab/app)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resetInactivityTimer();
        }
    });
    
    resetInactivityTimer();
}

/**
 * ✨ NUEVA: Detectar conexión offline/online
 */
function initNetworkMonitoring() {
    window.addEventListener('online', () => {
        if (CONFIG.DEBUG) {
            console.log('[Network] Conexión restaurada');
        }
        // Opcional: Mostrar notificación al usuario
    });
    
    window.addEventListener('offline', () => {
        console.warn('[Network] Sin conexión a internet');
        // Opcional: Mostrar notificación al usuario
    });
}

// Inicializar monitoreo de red
if (typeof window !== 'undefined') {
    initNetworkMonitoring();
}
