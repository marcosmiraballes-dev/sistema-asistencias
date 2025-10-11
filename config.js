/**
 * config.js - Configuración Multi-Empresa
 * Sistema de Asistencias por QR
 * VERSIÓN 2.0 - MULTI-TENANT
 */

// ============================================
// DETECCIÓN AUTOMÁTICA DE EMPRESA
// ============================================

const urlParams = new URLSearchParams(window.location.search);
const EMPRESA_ID = urlParams.get('empresa') || 'demo';

// ============================================
// CONFIGURACIÓN POR EMPRESA
// ============================================

const CONFIG_EMPRESAS = {
    empresa_a: {
        id: 'empresa_a',
        nombre: 'Divinely Cleans',
        api_url: 'https://script.google.com/macros/s/AKfycbz6uJAYdFxqlKL4B-CwiCp9xZeC4RS4ZfbEJnUD_K4wCN3xHjjlI4M1Ljaq5WYar3Sx/exec'
    },
    empresa_b: {
        id: 'empresa_b',
        nombre: 'Grupo Tejon',
        api_url: 'https://script.google.com/macros/s/AKfycby5ENvo9nS8xv4kyrnNQrinr8htU7McVs6ZoWZHmRp03WezTDFcshRL_hcGsMB3_5x5/exec'
    },
    empresa_c: {
        id: 'empresa_c',
        nombre: 'Elefantes Verdes',
        api_url: 'https://script.google.com/macros/s/AKfycbwXQ2vIsT52HutNNzM56C0s9xvJaxsLvPRxcgBZuXmCiMADJYnwucbcO7AQF_XvWsVhww/exec'
    },
    demo: {
        id: 'demo',
        nombre: '⚠️ Demo',
        api_url: ''
    }
};

// ============================================
// VALIDACIÓN Y CONFIGURACIÓN ACTIVA
// ============================================

const EMPRESA_CONFIG = CONFIG_EMPRESAS[EMPRESA_ID];

if (!EMPRESA_CONFIG) {
    alert('❌ Error: Empresa no válida\n\nPor favor escanea un código QR válido.');
    throw new Error('Empresa no encontrada: ' + EMPRESA_ID);
}

if (!EMPRESA_CONFIG.api_url) {
    alert('⚠️ Esta aplicación requiere escanear un código QR válido.\n\nPor favor, escanea el código QR de tu empresa.');
}

// ============================================
// CONFIGURACIÓN GENERAL DEL SISTEMA
// ============================================

const CONFIG = {
    // 🔑 URL de la API (específica de la empresa actual)
    API_URL: EMPRESA_CONFIG.api_url,
    
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
    
    // Configuración de red
    NETWORK: {
        TIMEOUT: 30000,
        MAX_RETRIES: 2,
        RETRY_DELAY: 1000
    },
    
    // Modo debug
    DEBUG: false
};

// ============================================
// FUNCIONES DE API
// ============================================

/**
 * Función para hacer peticiones al API con retry logic
 */
async function callAPI(data, retryCount = 0) {
    if (!CONFIG.API_URL) {
        return {
            success: false,
            message: '⚠️ No hay conexión configurada. Escanea un código QR válido.'
        };
    }
    
    try {
        if (CONFIG.DEBUG) {
            console.log('[API] Request:', data);
            console.log('[API] Empresa:', EMPRESA_CONFIG.nombre);
        }
        
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
            
            const textResponse = await response.text();
            const result = JSON.parse(textResponse);
            
            if (CONFIG.DEBUG) {
                console.log('[API] Response:', result);
            }
            
            return result;
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (retryCount < CONFIG.NETWORK.MAX_RETRIES) {
                if (CONFIG.DEBUG) {
                    console.log(`[API] Retry ${retryCount + 1}/${CONFIG.NETWORK.MAX_RETRIES}`);
                }
                
                await sleep(CONFIG.NETWORK.RETRY_DELAY);
                return callAPI(data, retryCount + 1);
            }
            
            throw fetchError;
        }
        
    } catch (error) {
        console.error('[API] Error:', error.message);
        
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

// ============================================
// FUNCIONES DE SESIÓN
// ============================================

/**
 * Guarda los datos del empleado en el navegador
 */
function saveEmpleadoData(empleadoData) {
    try {
        // Agregar info de la empresa al empleado
        empleadoData.empresa_id = EMPRESA_ID;
        empleadoData.empresa_nombre = EMPRESA_CONFIG.nombre;
        
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
        if (!data) return null;
        
        const empleado = JSON.parse(data);
        
        // ✅ VALIDAR: Que el empleado sea de la misma empresa
        if (empleado.empresa_id && empleado.empresa_id !== EMPRESA_ID) {
            console.warn('[Session] Empleado de otra empresa. Cerrando sesión.');
            clearEmpleadoData();
            return null;
        }
        
        return empleado;
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

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Formatea una fecha en formato legible
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
 */
function formatTime(hora) {
    if (!hora) return '';
    
    if (typeof hora === 'string' && (hora.includes('T') || hora.includes('Z'))) {
        const date = new Date(hora);
        return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }
    
    const parts = hora.toString().split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// ============================================
// TIMEOUT DE INACTIVIDAD
// ============================================

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutos
let inactivityTimer;
let lastActivity = Date.now();

/**
 * Reinicia el temporizador de inactividad
 */
function resetInactivityTimer() {
    const now = Date.now();
    
    if (now - lastActivity < 1000) return;
    
    lastActivity = now;
    
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
        clearEmpleadoData();
        alert('⏱️ Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
        window.location.href = 'index.html?empresa=' + EMPRESA_ID;
    }, SESSION_TIMEOUT);
}

/**
 * Inicializar el sistema de timeout
 */
function initInactivityTimeout() {
    const eventos = ['mousedown', 'keypress', 'touchstart', 'click', 'scroll'];
    
    eventos.forEach(evento => {
        document.addEventListener(evento, resetInactivityTimer, { passive: true });
    });
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resetInactivityTimer();
        }
    });
    
    resetInactivityTimer();
}

/**
 * Detectar conexión offline/online
 */
function initNetworkMonitoring() {
    window.addEventListener('online', () => {
        if (CONFIG.DEBUG) {
            console.log('[Network] Conexión restaurada');
        }
    });
    
    window.addEventListener('offline', () => {
        console.warn('[Network] Sin conexión a internet');
    });
}

// ============================================
// MOSTRAR INFO DE EMPRESA
// ============================================

// Log de debug solo si está activado
if (CONFIG.DEBUG) {
    console.log('=== CONFIGURACIÓN DE EMPRESA ===');
    console.log('Empresa ID:', EMPRESA_ID);
    console.log('Empresa Nombre:', EMPRESA_CONFIG.nombre);
    console.log('API URL:', CONFIG.API_URL ? 'Configurada ✅' : 'No configurada ❌');
}

// Actualizar título de la página con nombre de empresa
document.addEventListener('DOMContentLoaded', () => {
    // Actualizar título si existe
    const titleElements = document.querySelectorAll('.empresa-nombre, .app-title');
    titleElements.forEach(el => {
        if (el.textContent.includes('Sistema de Asistencias')) {
            el.textContent = 'Sistema de Asistencias - ' + EMPRESA_CONFIG.nombre;
        }
    });
    
    // Mostrar empresa en la consola para el usuario
    if (EMPRESA_ID !== 'demo') {
        console.log(`%c🏢 ${EMPRESA_CONFIG.nombre}`, 'color: #3b82f6; font-size: 16px; font-weight: bold;');
    }
});
// Inicializar monitoreo de red
if (typeof window !== 'undefined') {
    initNetworkMonitoring();
}

