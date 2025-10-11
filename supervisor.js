/**
 * supervisor.js - Lógica del dashboard del supervisor
 * VERSIÓN OPTIMIZADA - PRODUCCIÓN
 */

// Variables globales
let supervisorActual = null;
let empleadosActivos = [];

// Caché
let empleadosCache = null;
let registrosCache = null;
let ultimaActualizacionEmpleados = 0;
let ultimaActualizacionRegistros = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

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

// TAB 3: Registro de Faltas
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
    
    if (!supervisorActual?.id) {
        window.location.href = 'index.html' + window.location.search; // ✅ AGREGADO
        return false;
    }
    
    // Verificar que sea supervisor o admin
    if (supervisorActual.rol !== 'supervisor' && supervisorActual.rol !== 'admin') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'dashboard.html' + window.location.search; // ✅ AGREGADO
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
    miHorario.textContent = `${formatTime(supervisorActual.hora_entrada)} - ${formatTime(supervisorActual.hora_salida)}`;
    fechaActual.textContent = formatDate(getCurrentDate());
}

/**
 * Carga la lista de empleados activos
 * OPTIMIZADO: Con caché
 */
async function loadEmpleados(forceRefresh = false) {
    const now = Date.now();
    
    // Usar caché si es válido
    if (!forceRefresh && empleadosCache && (now - ultimaActualizacionEmpleados) < CACHE_DURATION) {
        empleadosActivos = empleadosCache;
        populateEmployeeSelects();
        return;
    }
    
    try {
        const response = await callAPI({
            action: 'listar_empleados',
            solo_activos: true,
            servicio_id: supervisorActual.servicio_id
        });
        
        if (response.success && response.empleados) {
            empleadosActivos = response.empleados;
            empleadosCache = empleadosActivos;
            ultimaActualizacionEmpleados = now;
            
            populateEmployeeSelects();
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error cargar empleados:', error);
        }
        selectEmpleado.innerHTML = '<option value="">Error al cargar empleados</option>';
    }
}

/**
 * NUEVA: Llena todos los selects de empleados
 * OPTIMIZADO: Una sola función en lugar de código duplicado
 */
function populateEmployeeSelects() {
    const selects = [selectEmpleado, selectEmpleadoDescanso, selectEmpleadoFalta];
    
    selects.forEach(select => {
        select.innerHTML = '<option value="">-- Selecciona un empleado --</option>';
        
        empleadosActivos.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.nombre} ${emp.apellido}`;
            select.appendChild(option);
        });
    });
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
    
    if (!confirm('¿Registrar asistencia para este empleado?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'registrar_asistencia',
            empleado_id: empleadoId,
            tipo: tipo
        });
        
        if (response.success) {
            showMessage(response.message, response.tarde ? 'warning' : 'success');
            registrosCache = null; // Invalidar caché
            await loadRegistrosHoy();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error registro:', error);
        }
        showMessage('Error al registrar asistencia', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los registros de hoy
 * OPTIMIZADO: Con caché y DocumentFragment
 */
async function loadRegistrosHoy(forceRefresh = false) {
    const now = Date.now();
    
    // Usar caché si es válido
    if (!forceRefresh && registrosCache && (now - ultimaActualizacionRegistros) < CACHE_DURATION) {
        renderRegistros(registrosCache);
        return;
    }
    
    try {
        registrosHoyList.innerHTML = '<p class="loading">Cargando registros...</p>';
        
        const response = await callAPI({
            action: 'obtener_todos_registros',
            fecha: getCurrentDate()
        });
        
        if (response.success && response.registros) {
            registrosCache = response.registros;
            ultimaActualizacionRegistros = now;
            
            renderRegistros(response.registros);
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error cargar registros:', error);
        }
        registrosHoyList.innerHTML = '<p class="loading">Error al cargar registros</p>';
    }
}

/**
 * NUEVA: Renderiza registros
 * OPTIMIZADO: Con DocumentFragment
 */
function renderRegistros(registros) {
    if (registros.length === 0) {
        registrosHoyList.innerHTML = '<p class="loading">No hay registros para hoy</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    registros.forEach(registro => {
        const item = document.createElement('div');
        item.className = `record-item ${registro.tipo}`;
        item.innerHTML = `
            <div>
                <div class="record-type">${registro.nombre_completo}</div>
                <div style="font-size: 12px; color: #6b7280;">${CONFIG.TIPOS_NOMBRES[registro.tipo]}</div>
            </div>
            <div class="record-time">${formatTime(registro.hora)}</div>
        `;
        fragment.appendChild(item);
    });
    
    registrosHoyList.innerHTML = '';
    registrosHoyList.appendChild(fragment);
}

/**
 * Programa un día de descanso
 * OPTIMIZADO: Sin logs de debug
 */
async function programarDiaDescanso() {
    const empleadoId = parseInt(selectEmpleadoDescanso.value);
    const fecha = fechaDescanso.value;
    const motivo = motivoDescanso.value;
    
    if (!empleadoId || !fecha || !motivo) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (!confirm('¿Programar día de descanso?')) return;
    
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
            selectEmpleadoDescanso.value = '';
            await loadDiasDescanso();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error programar descanso:', error);
        }
        showMessage('Error al programar día de descanso', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los días de descanso programados
 * OPTIMIZADO: Con DocumentFragment
 */
async function loadDiasDescanso() {
    try {
        diasDescansoList.innerHTML = '<p class="loading">Cargando...</p>';
        
        const response = await callAPI({
            action: 'obtener_todos_dias_descanso'
        });
        
        if (response.success && response.dias_descanso) {
            if (response.dias_descanso.length === 0) {
                diasDescansoList.innerHTML = '<p class="loading">No hay días de descanso programados</p>';
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            response.dias_descanso.forEach(dia => {
                const nombreEmpleado = dia.Empleado || 'Sin nombre';
                const aprobadoPor = dia.aprobado_por || 'Sin info';
                
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div>
                        <div class="record-type">${nombreEmpleado}</div>
                        <div style="font-size: 12px; color: #6b7280;">${dia.motivo} - ${dia.fecha}</div>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">Por: ${aprobadoPor}</div>
                `;
                fragment.appendChild(item);
            });
            
            diasDescansoList.innerHTML = '';
            diasDescansoList.appendChild(fragment);
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error cargar descansos:', error);
        }
        diasDescansoList.innerHTML = '<p class="loading">Error al cargar días de descanso</p>';
    }
}

/**
 * Registra una falta
 * OPTIMIZADO: Sin logs de debug
 */
async function registrarFalta() {
    const empleadoId = parseInt(selectEmpleadoFalta.value);
    const fecha = fechaFalta.value;
    const motivo = tipoFalta.value;
    
    if (!empleadoId || !fecha || !motivo) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (!confirm('¿Registrar esta falta?')) return;
    
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
            selectEmpleadoFalta.value = '';
            await loadFaltasRegistradas();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error registrar falta:', error);
        }
        showMessage('Error al registrar falta', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga las faltas registradas
 * OPTIMIZADO: Con DocumentFragment
 */
/**
 * Carga las faltas registradas
 * CORREGIDO: Mejor manejo de nombres
 */
async function loadFaltasRegistradas() {
    try {
        faltasRegistradasList.innerHTML = '<p class="loading">Cargando...</p>';
        
        const response = await callAPI({
            action: 'obtener_faltas'
        });
        
        console.log('DEBUG Faltas:', response); // Temporal para ver qué llega
        
        if (response.success && response.faltas) {
            if (response.faltas.length === 0) {
                faltasRegistradasList.innerHTML = '<p class="loading">No hay faltas registradas</p>';
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            response.faltas.forEach(falta => {
                // MÚLTIPLES FALLBACKS para el nombre
                const nombreEmpleado = falta.Empleado || falta.empleado_nombre || falta.nombre_completo || falta.nombre || `ID: ${falta.empleado_id}` || 'Sin nombre';
                const registradaPor = falta.registrada_por || 'Sin info';
                
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div>
                        <div class="record-type">${nombreEmpleado}</div>
                        <div style="font-size: 12px; color: #6b7280;">${falta.motivo} - ${falta.fecha}</div>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">Por: ${registradaPor}</div>
                `;
                fragment.appendChild(item);
            });
            
            faltasRegistradasList.innerHTML = '';
            faltasRegistradasList.appendChild(fragment);
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error cargar faltas:', error);
        }
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
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error mi registro:', error);
        }
        showMessage('Error al registrar asistencia', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Carga los registros personales del supervisor
 * OPTIMIZADO: Con DocumentFragment
 */
async function loadMisRegistros() {
    if (!supervisorActual) return;
    
    try {
        misRegistrosList.innerHTML = '<p class="loading">Cargando...</p>';
        
        const response = await callAPI({
            action: 'obtener_registros_hoy',
            empleado_id: supervisorActual.id
        });
        
        if (response.success && response.registros) {
            if (response.registros.length === 0) {
                misRegistrosList.innerHTML = '<p class="loading">No tienes registros para hoy</p>';
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            response.registros.forEach(registro => {
                const item = document.createElement('div');
                item.className = `record-item ${registro.tipo}`;
                item.innerHTML = `
                    <div class="record-type">${CONFIG.TIPOS_NOMBRES[registro.tipo]}</div>
                    <div class="record-time">${formatTime(registro.hora)}</div>
                `;
                fragment.appendChild(item);
            });
            
            misRegistrosList.innerHTML = '';
            misRegistrosList.appendChild(fragment);
        }
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Supervisor] Error mis registros:', error);
        }
        misRegistrosList.innerHTML = '<p class="loading">Error al cargar registros</p>';
    }
}

// Sistema de tabs con LAZY LOADING
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // LAZY LOADING: Cargar datos solo cuando se necesitan
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
    
    // Cargar empleados y registros iniciales
    await loadEmpleados();
    await loadRegistrosHoy();
    
    // Event listeners
    btnRegistrarAsistencia.addEventListener('click', registrarAsistenciaEmpleado);
    btnProgramarDescanso.addEventListener('click', programarDiaDescanso);
    btnRegistrarFalta.addEventListener('click', registrarFalta);
    
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
                window.location.href = 'index.html' + window.location.search; // ✅ AGREGADO
            }
        });
    
    // OPTIMIZADO: Auto-actualizar registros cada 5 minutos (no cada 30 seg)
    setInterval(() => loadRegistrosHoy(true), 5 * 60 * 1000);
    
    // NUEVO: Actualizar cuando vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadRegistrosHoy(true);
        }
    });
    
    initInactivityTimeout();
});


