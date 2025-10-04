/**
 * config.js - Configuración del Frontend
 * IMPORTANTE: Actualiza la URL del API con tu URL de Google Apps Script
 */

const CONFIG = {
    // 🔑 URL de tu Web App de Google Apps Script
    // La obtienes al desplegar tu proyecto en Apps Script
    // Ejemplo: 'https://script.google.com/macros/s/AKfycbz.../exec'
    API_URL: '1d5b1D413HKxhPE7IWpfC1lfpx6Qq_fZtSzJjAEDW1rQ',
    
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
    
    // Keys para LocalStorage (guardar sesión del usuario)
    STORAGE_KEYS: {
        EMPLEADO: 'empleado_data'
    }
};

/**
 * Función para hacer peticiones al API
 * @param {Object} data - Datos a enviar
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function callAPI(data) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error('Error en la petición: ' + response.status);
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('Error en callAPI:', error);
        return {
            success: false,
            message: 'Error de conexión con el servidor: ' + error.message
        };
    }
}

/**
 * Guarda los datos del empleado en el navegador
 * @param {Object} empleadoData - Datos del empleado
 */
function saveEmpleadoData(empleadoData) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.EMPLEADO, JSON.stringify(empleadoData));
    } catch (error) {
        console.error('Error al guardar datos:', error);
    }
}

/**
 * Obtiene los datos del empleado guardados
 * @returns {Object|null} Datos del empleado o null
 */
function getEmpleadoData() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.EMPLEADO);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error al obtener datos:', error);
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
        console.error('Error al limpiar datos:', error);
    }
}

/**
 * Formatea una fecha en formato legible
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatDate(fecha) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-MX', options);
}

/**
 * Formatea una hora en formato legible
 * @param {string} hora - Hora en formato HH:MM:SS
 * @returns {string} Hora formateada
 */
function formatTime(hora) {
    if (!hora) return '';
    const parts = hora.split(':');
    return `${parts[0]}:${parts[1]}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} Fecha actual
 */
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}