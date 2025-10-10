/**
 * supervisor.js - Lógica del dashboard del supervisor
 * VERSIÓN CORREGIDA
 */

// Variable global para almacenar datos
let supervisorActual = null;
let empleadosActivos = [];

// Elementos del DOM
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const supervisorMessage = document.getElementById('supervisorMessage');
const supervisorLoader = document.getElementById('supervisorLoader');

// TAB 1: Registrar Asistencia
const selectEmpleado = document.getElementById('selectEmpleado');
const selectTipoRegistro = document.getElementById('selectTipoRegistro');
const btnRegistrarAsistencia = document.getElementById('btnRegistrarAsistencia');
const registrosHoyList = document.getElementById('registrosHoyList');

// TAB 2: Días de Descanso
const selectEmpleadoDescanso = document.getElementById('selectEmpleadoDescanso');
const fechaDescanso = document.getElementById('fechaDescanso');
const motivoDescanso = document.getElementById('motivoDescanso');
const btnProgramarDescanso = document.getElementById('btnProgramarDescanso');
const diasDescansoList = document.getElementById('diasDescansoList');

// TAB 3: Registro de Faltas (NUEVO)
const selectEmpleadoFalta = document.getElementById('selectEmpleadoFalta');
const fechaFalta = document.getElementById('fechaFalta');
const tipoFalta = document.getElementById('tipoFalta');
const btnRegistrarFalta = document.getElementById('btnRegistrarFalta');
const faltasRegistradasList = document.getElementById('faltasRegistradasList');

// TAB 4: Mi Asistencia
const miServicio = document.getElementById('miServicio');
const miHorario = document.getElementById('miHorario');
const fechaActual = document.getElementById('fechaActual');
const btnMiEntrada = document.getElementById('btnMiEntrada');
const btnMiSalida = document.getElementById('btnMiSalida');
const btnMiSalidaAlmuerzo = document.getElementById('btnMiSalidaAlmuerzo');
const btnMiEntradaAlmuerzo = document.getElementById('btnMiEntradaAlmuerzo');
const misRegistrosList = document.getElementById('misRegistrosList');

/**
 * Muestra un mensaje
 */
function showMessage(message, type = 'error') {
    supervisorMessage.textContent = message;
    supervisorMessage.className = `message ${type} show`;
    setTimeout(() => supervisorMessage.classList.remove('show'), 5000);
}

/**
 * Muestra/oculta el loader
 */
function toggleLoader(show) {
    supervisorLoader.style.display = show ? 'block' : 'none';
}

/**
 * Verifica la sesión
 */
function checkSession() {
    supervisorActual = getEmpleadoData();
    
    if (!supervisorActual || !supervisorActual.id) {
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar que sea supervisor o admin
    if (supervisorActual.rol !== 'supervisor' && supervisorActual.rol !== 'admin') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

/**
 * Carga la información del supervisor
 */
function loadSupervisorInfo() {
    if (!supervisorActual) return;
    
    userName.textContent = `${supervisorActual.nombre} ${supervisorActual.apellido}`;
    miServicio.textContent = supervisorActual.servicio_nombre || 'Sin servicio';
    
    // Formatear horas correctamente
    const horaEntrada = formatTime(supervisorActual.hora_entrada);
    const horaSalida = formatTime(supervisorActual.hora_salida);
    miHorario.textContent = `${horaEntrada} - ${horaSalida}`;
    
    fechaActual.textContent = formatDate(getCurrentDate());
}

/**
 * Carga la lista de empleados activos (filtrados por servicio del supervisor)
 */
async function loadEmpleados() {
    try {
        const requestData = {
            action: 'listar_empleados',
            solo_activos: true,
            servicio_id: supervisorActual.servicio_id
        };
        
        const response = await callAPI(requestData);
        
        if (response.success && response.empleados) {
            empleadosActivos = response.empleados;
            
            // Llenar select de registro de asistencia
            selectEmpleado.innerHTML = '<option value="">-- Selecciona un empleado --</option>';
            empleadosActivos.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.nombre} ${emp.apellido}`;
                selectEmpleado.appendChild(option);
            });
            
            // Llenar select de días de descanso
            selectEmpleadoDescanso.innerHTML = '<option value="">-- Selecciona un empleado --</option>';
            empleadosActivos.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.nombre} ${emp.apellido}`;
                selectEmpleadoDescanso.appendChild(option);
            });
            
            // Llenar select de faltas (NUEVO)
            selectEmpleadoFalta.innerHTML = '<option value="">-- Selecciona un empleado --</option>';
            empleadosActivos.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.nombre} ${emp.apellido}`;
                selectEmpleadoFalta.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        selectEmpleado.innerHTML = '<option value="">Error al cargar empleados</option>';
    }
}

/**
 * Registra asistencia de un empleado
 */
async function registrarAsistenciaEmpleado() {
    const empleadoId = parseInt(selectEmpleado.value);
    const tipo = selectTipoRegistro.value;
    
    if (!empleadoId) {
        showMessage('Selecciona un empleado', 'error');
        return;
    }
    
    if (!confirm('¿Registrar asistencia para este empleado?')) {
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'registrar_asistencia',
            empleado_id: empleadoId,
            tipo: tipo
        });
        
        if (response.success) {
            showMessage(response.message, response.tarde ? 'warning' : 'success');
            await loadRegistrosHoy();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al registrar asistencia', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los registros de hoy
 */
async function loadRegistrosHoy() {
    try {
        const response = await callAPI({
            action: 'obtener_todos_registros',
            fecha: getCurrentDate()
        });
        
        if (response.success && response.registros) {
            if (response.registros.length === 0) {
                registrosHoyList.innerHTML = '<p class="loading">No hay registros para hoy</p>';
                return;
            }
            
            registrosHoyList.innerHTML = '';
            response.registros.forEach(registro => {
                const item = document.createElement('div');
                item.className = `record-item ${registro.tipo}`;
                item.innerHTML = `
                    <div>
                        <div class="record-type">${registro.nombre_completo}</div>
                        <div style="font-size: 12px; color: #6b7280;">${CONFIG.TIPOS_NOMBRES[registro.tipo]}</div>
                    </div>
                    <div class="record-time">${formatTime(registro.hora)}</div>
                `;
                registrosHoyList.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        registrosHoyList.innerHTML = '<p class="loading">Error al cargar registros</p>';
    }
}

/**
 * Programa un día de descanso (CORREGIDO)
 */
async function programarDiaDescanso() {
    const empleadoId = parseInt(selectEmpleadoDescanso.value);
    const fecha = fechaDescanso.value;
    const motivo = motivoDescanso.value;
    
    if (!empleadoId || !fecha || !motivo) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (!confirm('¿Programar día de descanso?')) {
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'programar_dia_descanso',
            empleado_id: empleadoId,
            fecha: fecha,
            motivo: motivo
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            fechaDescanso.value = '';
            await loadDiasDescanso();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al programar día de descanso', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los días de descanso programados
 */
async function loadDiasDescanso() {
    try {
        const response = await callAPI({
            action: 'obtener_todos_dias_descanso'
        });
        
        if (response.success && response.dias_descanso) {
            if (response.dias_descanso.length === 0) {
                diasDescansoList.innerHTML = '<p class="loading">No hay días de descanso programados</p>';
                return;
            }
            
            diasDescansoList.innerHTML = '';
            response.dias_descanso.forEach(dia => {
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div>
                        <div class="record-type">${dia.empleado_nombre}</div>
                        <div style="font-size: 12px; color: #6b7280;">${dia.motivo} - ${dia.fecha}</div>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">Por: ${dia.aprobado_por}</div>
                `;
                diasDescansoList.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        diasDescansoList.innerHTML = '<p class="loading">Error al cargar días de descanso</p>';
    }
}

/**
 * Registra una falta (NUEVO)
 */
async function registrarFalta() {
    const empleadoId = parseInt(selectEmpleadoFalta.value);
    const fecha = fechaFalta.value;
    const motivo = tipoFalta.value;
    
    if (!empleadoId || !fecha || !motivo) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (!confirm('¿Registrar esta falta?')) {
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'registrar_falta',
            empleado_id: empleadoId,
            fecha: fecha,
            motivo: motivo
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            fechaFalta.value = '';
            await loadFaltasRegistradas();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al registrar falta', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga las faltas registradas (NUEVO)
 */
async function loadFaltasRegistradas() {
    try {
        const response = await callAPI({
            action: 'obtener_faltas'
        });
        
        if (response.success && response.faltas) {
            if (response.faltas.length === 0) {
                faltasRegistradasList.innerHTML = '<p class="loading">No hay faltas registradas</p>';
                return;
            }
            
            faltasRegistradasList.innerHTML = '';
            response.faltas.forEach(falta => {
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div>
                        <div class="record-type">${falta.empleado_nombre}</div>
                        <div style="font-size: 12px; color: #6b7280;">${falta.motivo} - ${falta.fecha}</div>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">Por: ${falta.registrada_por}</div>
                `;
                faltasRegistradasList.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        faltasRegistradasList.innerHTML = '<p class="loading">Error al cargar faltas</p>';
    }
}

/**
 * Registra asistencia personal del supervisor
 */
async function registrarMiAsistencia(tipo) {
    if (!supervisorActual) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'registrar_asistencia',
            empleado_id: supervisorActual.id,
            tipo: tipo
        });
        
        if (response.success) {
            showMessage(response.message, response.tarde ? 'warning' : 'success');
            await loadMisRegistros();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al registrar asistencia', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los registros personales del supervisor
 */
async function loadMisRegistros() {
    if (!supervisorActual) return;
    
    try {
        const response = await callAPI({
            action: 'obtener_registros_hoy',
            empleado_id: supervisorActual.id
        });
        
        if (response.success && response.registros) {
            if (response.registros.length === 0) {
                misRegistrosList.innerHTML = '<p class="loading">No tienes registros para hoy</p>';
                return;
            }
            
            misRegistrosList.innerHTML = '';
            response.registros.forEach(registro => {
                const item = document.createElement('div');
                item.className = `record-item ${registro.tipo}`;
                item.innerHTML = `
                    <div class="record-type">${CONFIG.TIPOS_NOMBRES[registro.tipo]}</div>
                    <div class="record-time">${formatTime(registro.hora)}</div>
                `;
                misRegistrosList.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        misRegistrosList.innerHTML = '<p class="loading">Error al cargar registros</p>';
    }
}

// Sistema de tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Cambiar botón activo
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Cambiar contenido activo
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Cargar datos según el tab
        if (tabName === 'dias-descanso') {
            loadDiasDescanso();
        } else if (tabName === 'faltas') {
            loadFaltasRegistradas();
        } else if (tabName === 'mi-asistencia') {
            loadMisRegistros();
        }
    });
});

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkSession()) return;
    
    loadSupervisorInfo();
    await loadEmpleados();
    await loadRegistrosHoy();
    
    // Event listeners
    btnRegistrarAsistencia.addEventListener('click', registrarAsistenciaEmpleado);
    btnProgramarDescanso.addEventListener('click', programarDiaDescanso);
    btnRegistrarFalta.addEventListener('click', registrarFalta); // NUEVO
    
    btnMiEntrada.addEventListener('click', () => {
        if (confirm('¿Registrar tu ENTRADA?')) {
            registrarMiAsistencia(CONFIG.TIPOS_REGISTRO.ENTRADA);
        }
    });
    
    btnMiSalida.addEventListener('click', () => {
        if (confirm('¿Registrar tu SALIDA?')) {
            registrarMiAsistencia(CONFIG.TIPOS_REGISTRO.SALIDA);
        }
    });
    
    btnMiSalidaAlmuerzo.addEventListener('click', () => {
        if (confirm('¿Registrar SALIDA A ALMUERZO?')) {
            registrarMiAsistencia(CONFIG.TIPOS_REGISTRO.SALIDA_ALMUERZO);
        }
    });
    
    btnMiEntradaAlmuerzo.addEventListener('click', () => {
        if (confirm('¿Registrar ENTRADA DE ALMUERZO?')) {
            registrarMiAsistencia(CONFIG.TIPOS_REGISTRO.ENTRADA_ALMUERZO);
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) {
            clearEmpleadoData();
            window.location.href = 'index.html';
        }
    });
    
    // Auto-actualizar cada 30 segundos
    setInterval(loadRegistrosHoy, 30000);
    
    initInactivityTimeout();
});
