/**
 * dashboard.js - Lógica del dashboard del empleado
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

// Variable global para almacenar datos del empleado
let empleadoActual = null;

/**
 * Muestra un mensaje en el dashboard
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje
 */
function showDashboardMessage(message, type = 'error') {
    dashboardMessage.textContent = message;
    dashboardMessage.className = `message ${type} show`;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        dashboardMessage.classList.remove('show');
    }, 5000);
}

/**
 * Muestra u oculta el loader del dashboard
 * @param {boolean} show - true para mostrar
 */
function toggleDashboardLoader(show) {
    dashboardLoader.style.display = show ? 'block' : 'none';
}

/**
 * Verifica que haya una sesión activa
 */
function checkSession() {
    empleadoActual = getEmpleadoData();
    
    if (!empleadoActual || !empleadoActual.id) {
        // No hay sesión, redirigir al login
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

/**
 * Carga la información del empleado en la interfaz
 */
function loadEmployeeInfo() {
    if (!empleadoActual) return;
    
    // Nombre completo
    userName.textContent = `${empleadoActual.nombre} ${empleadoActual.apellido}`;
    
    // Servicio
    userService.textContent = empleadoActual.servicio_nombre || 'Sin servicio';
    
    // Horario
    const horaEntrada = empleadoActual.hora_entrada || '08:00';
    const horaSalida = empleadoActual.hora_salida || '17:00';
    userSchedule.textContent = `${horaEntrada} - ${horaSalida}`;
    
    // Fecha actual
    currentDate.textContent = formatDate(getCurrentDate());
}

/**
 * Registra una asistencia
 * @param {string} tipo - Tipo de registro
 */
async function registrarAsistencia(tipo) {
    if (!empleadoActual) return;
    
    // Deshabilitar todos los botones
    disableAllButtons(true);
    toggleDashboardLoader(true);
    dashboardMessage.classList.remove('show');
    
    try {
        // Llamar al API
        const response = await callAPI({
            action: 'registrar_asistencia',
            empleado_id: empleadoActual.id,
            tipo: tipo
        });
        
        if (response.success) {
            // Registro exitoso
            let mensaje = response.message;
            
            // Si llegó tarde, mostrar advertencia
            if (response.tarde) {
                showDashboardMessage(mensaje, 'warning');
            } else {
                showDashboardMessage(mensaje, 'success');
            }
            
            // Recargar registros
            await loadTodayRecords();
            
        } else {
            // Error al registrar
            showDashboardMessage(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Error al registrar asistencia:', error);
        showDashboardMessage('Error de conexión al registrar asistencia', 'error');
    } finally {
        toggleDashboardLoader(false);
        disableAllButtons(false);
    }
}

/**
 * Deshabilita o habilita todos los botones de asistencia
 * @param {boolean} disable - true para deshabilitar
 */
function disableAllButtons(disable) {
    btnEntrada.disabled = disable;
    btnSalida.disabled = disable;
    btnSalidaAlmuerzo.disabled = disable;
    btnEntradaAlmuerzo.disabled = disable;
}

/**
 * Carga los registros del día actual
 */
async function loadTodayRecords() {
    if (!empleadoActual) return;
    
    try {
        recordsList.innerHTML = '<p class="loading">Cargando registros...</p>';
        
        // Llamar al API
        const response = await callAPI({
            action: 'obtener_registros_hoy',
            empleado_id: empleadoActual.id
        });
        
        if (response.success) {
            const registros = response.registros || [];
            
            if (registros.length === 0) {
                recordsList.innerHTML = '<p class="loading">No hay registros para hoy</p>';
                return;
            }
            
            // Mostrar registros
            recordsList.innerHTML = '';
            
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
                
                recordsList.appendChild(recordItem);
            });
            
        } else {
            recordsList.innerHTML = '<p class="loading">Error al cargar registros</p>';
        }
        
    } catch (error) {
        console.error('Error al cargar registros:', error);
        recordsList.innerHTML = '<p class="loading">Error de conexión</p>';
    }
}

/**
 * Maneja el logout
 */
function handleLogout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        clearEmpleadoData();
        window.location.href = 'index.html';
    }
}

/**
 * Inicialización cuando carga la página
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión
    if (!checkSession()) {
        return;
    }
    
    // Cargar información del empleado
    loadEmployeeInfo();
    
    // Cargar registros de hoy
    await loadTodayRecords();
    
    // Event listeners para botones de asistencia
    btnEntrada.addEventListener('click', () => {
        if (confirm('¿Registrar ENTRADA?')) {
            registrarAsistencia(CONFIG.TIPOS_REGISTRO.ENTRADA);
        }
    });
    
    btnSalida.addEventListener('click', () => {
        if (confirm('¿Registrar SALIDA?')) {
            registrarAsistencia(CONFIG.TIPOS_REGISTRO.SALIDA);
        }
    });
    
    btnSalidaAlmuerzo.addEventListener('click', () => {
        if (confirm('¿Registrar SALIDA A ALMUERZO?')) {
            registrarAsistencia(CONFIG.TIPOS_REGISTRO.SALIDA_ALMUERZO);
        }
    });
    
    btnEntradaAlmuerzo.addEventListener('click', () => {
        if (confirm('¿Registrar ENTRADA DE ALMUERZO?')) {
            registrarAsistencia(CONFIG.TIPOS_REGISTRO.ENTRADA_ALMUERZO);
        }
    });
    
    // Event listener para logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Auto-actualizar registros cada 30 segundos
    setInterval(loadTodayRecords, 30000);
});