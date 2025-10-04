/**
 * config.js - Configuración del Frontend
 * IMPORTANTE: Actualiza la URL del API con tu URL de Google Apps Script
 */

const CONFIG = {
    // 🔑 URL de tu Web App de Google Apps Script
    // IMPORTANTE: Debe terminar en /exec
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
    
    // Keys para LocalStorage (guardar sesión del usuario)
    STORAGE_KEYS: {
        EMPLEADO: 'empleado_data'
    }
};

/**
 * Función para hacer peticiones al API usando Google Apps Script
 * Google Apps Script requiere un enfoque especial para CORS
 * @param {Object} data - Datos a enviar
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function callAPI(data) {
    try {
        // Verificar que la URL esté configurada
        if (!CONFIG.API_URL || CONFIG.API_URL === 'https://script.google.com/macros/s/AKfycbxo60Ncsdatuzv3FEV56BImMCrjCsxnVa5st1VaLuIqlqwGp2BhgRP8UrAoJn1bWYvVIA/exec') {
            return {
                success: false,
                message: 'Error: API_URL no configurada. Actualiza config.js con tu URL de Google Apps Script'
            };
        }
        
        console.log('Enviando petición al API:', data);
        
        // Para Google Apps Script, usamos fetch con redirect: 'follow'
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain' // Importante para evitar preflight
            },
            body: JSON.stringify(data),
            redirect: 'follow' // Necesario para Apps Script
        });
        
        console.log('Respuesta recibida, status:', response.status);
        
        // Leer respuesta como texto
        const textResponse = await response.text();
        console.log('Respuesta del servidor:', textResponse);
        
        // Parsear JSON
        try {
            const result = JSON.parse(textResponse);
            console.log('JSON parseado:', result);
            return result;
        } catch (parseError) {
            console.error('Error al parsear JSON:', parseError);
            console.error('Texto recibido:', textResponse);
            return {
                success: false,
                message: 'Error al procesar respuesta del servidor'
            };
        }
        
    } catch (error) {
        console.error('Error en callAPI:', error);
        return {
            success: false,
            message: 'Error de conexión: ' + error.message
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


