/**
 * dashboard.js - Lógica del dashboard del empleado
 * VERSIÓN OPTIMIZADA
 */

// Elementos del DOM
const userName = document.getElementById('userName');
const userService = document.getElementById('userService');
const userSchedule = document.getElementById('userSchedule');
const currentDate = document.getElementById('currentDate');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardMessage = document.getElementById('dashboardMessage');
const dashboardLoader = document.getElementById('dashboardLoader');
const recordsList = document.getElementById('recordsList');

// Botones de asistencia
const btnEntrada = document.getElementById('btnEntrada');
const btnSalida = document.getElementById('btnSalida');
const btnSalidaAlmuerzo = document.getElementById('btnSalidaAlmuerzo');
const btnEntradaAlmuerzo = document.getElementById('btnEntradaAlmuerzo');

// Variable global
let empleadoActual = null;

// NUEVO: Caché de registros del día
let registrosCache = null;
let ultimaActualizacion = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

/**
 * Muestra un mensaje en el dashboard
 */
function showDashboardMessage(message, type = 'error') {
    dashboardMessage.textContent = message;
    dashboardMessage.className = `message ${type} show`;
    
    setTimeout(() => {
        dashboardMessage.classList.remove('show');
    }, 5000);
}

/**
 * Muestra u oculta el loader del dashboard
 */
function toggleDashboardLoader(show) {
    dashboardLoader.style.display = show ? 'block' : 'none';
}

/**
 * Verifica que haya una sesión activa y rol correcto
 * OPTIMIZADO: Valida rol también
 */
function checkSession() {
    empleadoActual = getEmpleadoData();
    
    if (!empleadoActual?.id) {
        window.location.href = 'index.html' + window.location.search; // ✅ AGREGADO
        return false;
    }
    
    // NUEVO: Redirigir si el rol no es empleado
    if (empleadoActual.rol === 'admin') {
        window.location.href = 'admin.html' + window.location.search; // ✅ AGREGADO
        return false;
    } else if (empleadoActual.rol === 'supervisor') {
        window.location.href = 'supervisor.html' + window.location.search; // ✅ AGREGADO
        return false;
    }
    
    return true;
}

/**
 * Carga la información del empleado en la interfaz
 * OPTIMIZADO: Valores por defecto más limpios
 */
function loadEmployeeInfo() {
    if (!empleadoActual) return;
    
    userName.textContent = `${empleadoActual.nombre} ${empleadoActual.apellido}`;
    userService.textContent = empleadoActual.servicio_nombre || 'Sin servicio';
    userSchedule.textContent = `${empleadoActual.hora_entrada || '08:00'} - ${empleadoActual.hora_salida || '17:00'}`;
    currentDate.textContent = formatDate(getCurrentDate());
}

/**
 * Registra una asistencia
 * OPTIMIZADO: Solo deshabilita el botón presionado
 */
async function registrarAsistencia(tipo, button) {
    if (!empleadoActual) return;
    
    // Solo deshabilitar el botón específico
    button.disabled = true;
    const textoOriginal = button.textContent;
    button.textContent = 'Registrando...';
    
    toggleDashboardLoader(true);
    dashboardMessage.classList.remove('show');
    
    try {
        const response = await callAPI({
            action: 'registrar_asistencia',
            empleado_id: empleadoActual.id,
            tipo: tipo
        });
        
        if (response.success) {
            // Vibración táctil en móviles (si está disponible)
            if (navigator.vibrate) {
                navigator.vibrate(response.tarde ? [100, 50, 100] : 100);
            }
            
            showDashboardMessage(
                response.message,
                response.tarde ? 'warning' : 'success'
            );
            
            // Invalidar caché y recargar
            registrosCache = null;
            await loadTodayRecords();
            
        } else {
            showDashboardMessage(response.message, 'error');
        }
        
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Dashboard] Error registro:', error);
        }
        showDashboardMessage('Error de conexión al registrar', 'error');
    } finally {
        toggleDashboardLoader(false);
        button.disabled = false;
        button.textContent = textoOriginal;
    }
}

/**
 * Carga los registros del día actual
 * OPTIMIZADO: Con caché para evitar recargas innecesarias
 */
async function loadTodayRecords(forceRefresh = false) {
    if (!empleadoActual) return;
    
    // Usar caché si está vigente y no es refresh forzado
    const now = Date.now();
    if (!forceRefresh && registrosCache && (now - ultimaActualizacion) < CACHE_DURATION) {
        renderRegistros(registrosCache);
        return;
    }
    
    try {
        recordsList.innerHTML = '<p class="loading">Cargando registros...</p>';
        
        const response = await callAPI({
            action: 'obtener_registros_hoy',
            empleado_id: empleadoActual.id
        });
        
        if (response.success) {
            const registros = response.registros || [];
            
            // Actualizar caché
            registrosCache = registros;
            ultimaActualizacion = now;
            
            renderRegistros(registros);
        } else {
            recordsList.innerHTML = '<p class="loading">Error al cargar registros</p>';
        }
        
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Dashboard] Error carga registros:', error);
        }
        recordsList.innerHTML = '<p class="loading">Error de conexión</p>';
    }
}

/**
 * NUEVA: Renderiza los registros en el DOM
 * OPTIMIZADO: Lógica separada para mejor rendimiento
 */
function renderRegistros(registros) {
    if (registros.length === 0) {
        recordsList.innerHTML = '<p class="loading">No hay registros para hoy</p>';
        return;
    }
    
    // Usar DocumentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    registros.forEach(registro => {
        const recordItem = document.createElement('div');
        recordItem.className = `record-item ${registro.tipo}`;
        
        const tipoNombre = CONFIG.TIPOS_NOMBRES[registro.tipo] || registro.tipo;
        const hora = formatTime(registro.hora);
        
        recordItem.innerHTML = `
            <div>
                <div class="record-type">${tipoNombre}</div>
                ${registro.tarde ? '<div class="record-late">⚠️ Llegada tarde</div>' : ''}
            </div>
            <div class="record-time">${hora}</div>
        `;
        
        fragment.appendChild(recordItem);
    });
    
    recordsList.innerHTML = '';
    recordsList.appendChild(fragment);
}

/**
 * Maneja el logout
 */
function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
        clearEmpleadoData();
        window.location.href = 'index.html';
    }
}

/**
 * NUEVA: Registro rápido sin confirmación
 * OPTIMIZADO: Para usuarios que registran frecuentemente
 */
function setupQuickRegistration(button, tipo) {
    let clickCount = 0;
    let clickTimer = null;
    
    button.addEventListener('click', () => {
        clickCount++;
        
        // Doble click = registro rápido sin confirmación
        if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            registrarAsistencia(tipo, button);
            return;
        }
        
        // Primer click = mostrar confirmación
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                if (confirm(`¿Registrar ${CONFIG.TIPOS_NOMBRES[tipo].toUpperCase()}?`)) {
                    registrarAsistencia(tipo, button);
                }
                clickCount = 0;
            }, 300);
        }
    });
}

/**
 * Inicialización cuando carga la página
 * OPTIMIZADO: Event listeners más eficientes
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkSession()) return;
    
    loadEmployeeInfo();
    await loadTodayRecords();
    
    // OPTIMIZADO: Registro rápido con doble click
    setupQuickRegistration(btnEntrada, CONFIG.TIPOS_REGISTRO.ENTRADA);
    setupQuickRegistration(btnSalida, CONFIG.TIPOS_REGISTRO.SALIDA);
    setupQuickRegistration(btnSalidaAlmuerzo, CONFIG.TIPOS_REGISTRO.SALIDA_ALMUERZO);
    setupQuickRegistration(btnEntradaAlmuerzo, CONFIG.TIPOS_REGISTRO.ENTRADA_ALMUERZO);
    
    logoutBtn.addEventListener('click', handleLogout);
    
    // OPTIMIZADO: Auto-refresh más inteligente
    // Solo actualiza cada 5 minutos (empleados registran max 4 veces al día)
    // Invalida caché después de cada registro de todas formas
    setInterval(() => loadTodayRecords(true), 5 * 60 * 1000);
    
    // NUEVO: Actualizar cuando la página vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadTodayRecords(true);
        }
    });
    
    initInactivityTimeout();
});

