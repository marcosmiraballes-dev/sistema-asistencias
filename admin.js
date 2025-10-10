/**
 * admin.js - Lógica del dashboard del administrador
 * VERSIÓN OPTIMIZADA CON LAZY LOADING
 */

// Variable global
let adminActual = null;
let empleadosData = [];
let serviciosData = [];
let diasDescansoData = [];
let registrosHoyData = [];
let resultadosSinFiltrar = [];
let tipoFiltroActual = '';

// Cache de datos para evitar recargas innecesarias
let cache = {
    empleados: { data: null, timestamp: 0 },
    servicios: { data: null, timestamp: 0 },
    diasDescanso: { data: null, timestamp: 0 },
    registros: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// Elementos del DOM
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const adminMessage = document.getElementById('adminMessage');
const adminLoader = document.getElementById('adminLoader');

// Dashboard Stats
const statEmpleados = document.getElementById('statEmpleados');
const statRegistrosHoy = document.getElementById('statRegistrosHoy');
const statLlegadasTarde = document.getElementById('statLlegadasTarde');
const statDiasDescanso = document.getElementById('statDiasDescanso');
const registrosHoyList = document.getElementById('registrosHoyList');

// Tab Empleados
const empNombre = document.getElementById('empNombre');
const empApellido = document.getElementById('empApellido');
const empUsuario = document.getElementById('empUsuario');
const empPin = document.getElementById('empPin');
const empRol = document.getElementById('empRol');
const empServicio = document.getElementById('empServicio');
const empHoraEntrada = document.getElementById('empHoraEntrada');
const empHoraSalida = document.getElementById('empHoraSalida');
const btnCrearEmpleado = document.getElementById('btnCrearEmpleado');
const empleadosTableBody = document.getElementById('empleadosTableBody');

// Tab Servicios
const srvNombre = document.getElementById('srvNombre');
const srvDescripcion = document.getElementById('srvDescripcion');
const btnCrearServicio = document.getElementById('btnCrearServicio');
const serviciosTableBody = document.getElementById('serviciosTableBody');

// Tab Registros
const filtroFecha = document.getElementById('filtroFecha');
const btnFiltrarRegistros = document.getElementById('btnFiltrarRegistros');
const btnTodosRegistros = document.getElementById('btnTodosRegistros');
const registrosTableBody = document.getElementById('registrosTableBody');

// Tab Días de Descanso
const ddEmpleado = document.getElementById('ddEmpleado');
const ddFecha = document.getElementById('ddFecha');
const ddMotivo = document.getElementById('ddMotivo');
const btnProgramarDD = document.getElementById('btnProgramarDD');
const diasDescansoTableBody = document.getElementById('diasDescansoTableBody');

/**
 * Muestra un mensaje
 */
function showMessage(message, type = 'error') {
    adminMessage.textContent = message;
    adminMessage.className = `message ${type} show`;
    setTimeout(() => adminMessage.classList.remove('show'), 5000);
}

/**
 * Muestra/oculta el loader
 */
function toggleLoader(show) {
    adminLoader.style.display = show ? 'block' : 'none';
}

/**
 * Verifica si el cache es válido
 */
function isCacheValid(cacheKey) {
    const cached = cache[cacheKey];
    if (!cached.data) return false;
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_DURATION;
}

/**
 * Guarda en cache
 */
function setCache(cacheKey, data) {
    cache[cacheKey] = {
        data: data,
        timestamp: Date.now()
    };
}

/**
 * Obtiene del cache
 */
function getCache(cacheKey) {
    return cache[cacheKey].data;
}

/**
 * Invalida cache
 */
function invalidateCache(cacheKey) {
    if (cacheKey) {
        cache[cacheKey] = { data: null, timestamp: 0 };
    } else {
        // Invalidar todo
        Object.keys(cache).forEach(key => {
            cache[key] = { data: null, timestamp: 0 };
        });
    }
}

/**
 * Verifica la sesión
 */
function checkSession() {
    adminActual = getEmpleadoData();
    
    if (!adminActual || !adminActual.id) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (adminActual.rol !== 'admin') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

/**
 * Carga información del admin
 */
function loadAdminInfo() {
    if (!adminActual) return;
    userName.textContent = `${adminActual.nombre} ${adminActual.apellido}`;
}

/**
 * Carga estadísticas del dashboard (OPTIMIZADO - solo lo esencial)
 */
async function loadDashboardStats() {
    try {
        // Cargar solo empleados activos y registros de hoy
        const [empResponse, regResponse, ddResponse] = await Promise.all([
            callAPI({ action: 'listar_empleados', solo_activos: true }),
            callAPI({ action: 'obtener_todos_registros', fecha: getCurrentDate() }),
            callAPI({ action: 'obtener_todos_dias_descanso' })
        ]);
        
        // Empleados activos
        if (empResponse.success) {
            statEmpleados.textContent = empResponse.empleados.length;
            // Guardar en cache para uso posterior
            setCache('empleados', empResponse.empleados);
            empleadosData = empResponse.empleados;
        }
        
        // Registros de hoy
        if (regResponse.success) {
            registrosHoyData = regResponse.registros;
            statRegistrosHoy.textContent = registrosHoyData.length;
            
            // Contar llegadas tarde
            const llegadasTarde = registrosHoyData.filter(r => r.tipo === 'entrada' && r.tarde).length;
            statLlegadasTarde.textContent = llegadasTarde;
            
            // Mostrar registros
            if (registrosHoyData.length === 0) {
                registrosHoyList.innerHTML = '<p class="loading">No hay registros para hoy</p>';
            } else {
                registrosHoyList.innerHTML = '';
                registrosHoyData.forEach(registro => {
                    const item = document.createElement('div');
                    item.className = `record-item ${registro.tipo}`;
                    item.innerHTML = `
                        <div>
                            <div class="record-type">${registro.nombre_completo}</div>
                            <div style="font-size: 12px; color: #6b7280;">
                                ${CONFIG.TIPOS_NOMBRES[registro.tipo]} - ${registro.servicio}
                            </div>
                        </div>
                        <div class="record-time">${formatTime(registro.hora)}</div>
                    `;
                    registrosHoyList.appendChild(item);
                });
            }
        }
        
        // Días de descanso
        if (ddResponse.success) {
            diasDescansoData = ddResponse.dias_descanso;
            setCache('diasDescanso', diasDescansoData);
            
            // Filtrar solo descansos legítimos
            const descansosLegitimos = diasDescansoData.filter(d => 
                d.motivo === 'Vacaciones' || 
                d.motivo === 'Permiso Personal' || 
                d.motivo === 'Descanso' || 
                d.motivo === 'Incapacidad' || 
                d.motivo === 'Día Festivo'
            );
            statDiasDescanso.textContent = descansosLegitimos.length;
            
            // Contar por motivo
            document.getElementById('statVacaciones').textContent = diasDescansoData.filter(d => d.motivo === 'Vacaciones').length;
            document.getElementById('statPermisos').textContent = diasDescansoData.filter(d => d.motivo === 'Permiso Personal').length;
            document.getElementById('statIncapacidades').textContent = diasDescansoData.filter(d => d.motivo === 'Incapacidad').length;
            document.getElementById('statSuspensiones').textContent = diasDescansoData.filter(d => d.motivo === 'Suspensión').length;
            document.getElementById('statFaltasSin').textContent = diasDescansoData.filter(d => d.motivo === 'Falta sin Justificación').length;
            document.getElementById('statFaltasCon').textContent = diasDescansoData.filter(d => d.motivo === 'Falta con Justificación').length;
        }
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

/**
 * Carga empleados (LAZY - solo cuando se necesita)
 */
async function loadEmpleados() {
    // Verificar cache
    if (isCacheValid('empleados')) {
        empleadosData = getCache('empleados');
        renderEmpleados();
        return;
    }
    
    empleadosTableBody.innerHTML = '<tr><td colspan="8" class="loading">Cargando empleados...</td></tr>';
    
    try {
        const response = await callAPI({
            action: 'listar_empleados',
            solo_activos: false
        });
        
        if (response.success) {
            empleadosData = response.empleados;
            setCache('empleados', empleadosData);
            renderEmpleados();
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        empleadosTableBody.innerHTML = '<tr><td colspan="8" class="loading">Error al cargar empleados</td></tr>';
    }
}

/**
 * Renderiza la tabla de empleados
 */
function renderEmpleados() {
    if (empleadosData.length === 0) {
        empleadosTableBody.innerHTML = '<tr><td colspan="8" class="loading">No hay empleados</td></tr>';
        return;
    }
    
    empleadosTableBody.innerHTML = '';
    empleadosData.forEach(emp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp.id}</td>
            <td>${emp.nombre} ${emp.apellido}</td>
            <td>${emp.usuario}</td>
            <td><span class="badge ${emp.rol === 'admin' ? 'badge-danger' : emp.rol === 'supervisor' ? 'badge-warning' : 'badge-success'}">${emp.rol}</span></td>
            <td>${emp.servicio_nombre}</td>
            <td>${emp.hora_entrada} - ${emp.hora_salida}</td>
            <td>${emp.activo ? '✅ Activo' : '❌ Inactivo'}</td>
            <td>
                ${emp.activo ? 
                    `<button class="btn btn-small btn-danger" onclick="desactivarEmpleado(${emp.id})">Desactivar</button>` :
                    `<button class="btn btn-small btn-success" onclick="activarEmpleado(${emp.id})">Activar</button>`
                }
            </td>
        `;
        empleadosTableBody.appendChild(row);
    });
    
    // Llenar select de días de descanso
    ddEmpleado.innerHTML = '<option value="">-- Selecciona un empleado --</option>';
    empleadosData.filter(e => e.activo).forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.nombre} ${emp.apellido}`;
        ddEmpleado.appendChild(option);
    });
}

/**
 * Carga servicios (LAZY - solo cuando se necesita)
 */
async function loadServicios() {
    // Verificar cache
    if (isCacheValid('servicios')) {
        serviciosData = getCache('servicios');
        renderServicios();
        return;
    }
    
    serviciosTableBody.innerHTML = '<tr><td colspan="5" class="loading">Cargando servicios...</td></tr>';
    
    try {
        const response = await callAPI({
            action: 'listar_servicios',
            solo_activos: false
        });
        
        if (response.success) {
            serviciosData = response.servicios;
            setCache('servicios', serviciosData);
            renderServicios();
        }
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        serviciosTableBody.innerHTML = '<tr><td colspan="5" class="loading">Error al cargar servicios</td></tr>';
    }
}

/**
 * Renderiza la tabla de servicios
 */
function renderServicios() {
    // Llenar select de nuevo empleado
    empServicio.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
    serviciosData.filter(s => s.activo).forEach(srv => {
        const option = document.createElement('option');
        option.value = srv.id;
        option.textContent = srv.nombre;
        empServicio.appendChild(option);
    });
    
    // Llenar tabla
    if (serviciosData.length === 0) {
        serviciosTableBody.innerHTML = '<tr><td colspan="5" class="loading">No hay servicios</td></tr>';
        return;
    }
    
    serviciosTableBody.innerHTML = '';
    serviciosData.forEach(srv => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${srv.id}</td>
            <td>${srv.nombre}</td>
            <td>${srv.descripcion || '-'}</td>
            <td>${srv.activo ? '✅ Activo' : '❌ Inactivo'}</td>
            <td>
                ${srv.activo ? 
                    `<button class="btn btn-small btn-danger" onclick="desactivarServicio(${srv.id})">Desactivar</button>` :
                    `<button class="btn btn-small btn-success" onclick="activarServicio(${srv.id})">Activar</button>`
                }
            </td>
        `;
        serviciosTableBody.appendChild(row);
    });
}

/**
 * Crear empleado
 */
async function crearEmpleado() {
    const nombre = empNombre.value.trim();
    const apellido = empApellido.value.trim();
    const usuario = empUsuario.value.trim();
    const pin = empPin.value.trim();
    const rol = empRol.value;
    const servicio_id = parseInt(empServicio.value);
    const hora_entrada = empHoraEntrada.value;
    const hora_salida = empHoraSalida.value;
    
    if (!nombre || !apellido || !usuario || !pin || !servicio_id) {
        showMessage('Completa todos los campos obligatorios', 'error');
        return;
    }
    
    if (!/^\d{4}$/.test(pin)) {
        showMessage('El PIN debe ser de 4 dígitos', 'error');
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'crear_empleado',
            data: {
                nombre,
                apellido,
                usuario,
                pin,
                rol,
                servicio_id,
                hora_entrada,
                hora_salida
            }
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            
            // Limpiar formulario
            empNombre.value = '';
            empApellido.value = '';
            empUsuario.value = '';
            empPin.value = '';
            empRol.value = 'empleado';
            empServicio.value = '';
            
            // Invalidar cache y recargar
            invalidateCache('empleados');
            await loadEmpleados();
            await loadDashboardStats();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear empleado', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Desactivar empleado
 */
async function desactivarEmpleado(empleadoId) {
    if (!confirm('¿Desactivar este empleado?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'desactivar_empleado',
            empleado_id: empleadoId
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            invalidateCache('empleados');
            await loadEmpleados();
            await loadDashboardStats();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al desactivar empleado', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Activar empleado
 */
async function activarEmpleado(empleadoId) {
    if (!confirm('¿Activar este empleado?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'activar_empleado',
            empleado_id: empleadoId
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            invalidateCache('empleados');
            await loadEmpleados();
            await loadDashboardStats();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al activar empleado', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Crear servicio
 */
async function crearServicio() {
    const nombre = srvNombre.value.trim();
    const descripcion = srvDescripcion.value.trim();
    
    if (!nombre) {
        showMessage('El nombre del servicio es obligatorio', 'error');
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'crear_servicio',
            data: { nombre, descripcion }
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            srvNombre.value = '';
            srvDescripcion.value = '';
            invalidateCache('servicios');
            await loadServicios();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear servicio', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Desactivar servicio
 */
async function desactivarServicio(servicioId) {
    if (!confirm('¿Desactivar este servicio?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'desactivar_servicio',
            servicio_id: servicioId
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            invalidateCache('servicios');
            await loadServicios();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al desactivar servicio', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Activar servicio
 */
async function activarServicio(servicioId) {
    if (!confirm('¿Activar este servicio?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'activar_servicio',
            servicio_id: servicioId
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            invalidateCache('servicios');
            await loadServicios();
        } else {
            showMessage(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al activar servicio', 'error');
    } finally {
        toggleLoader(false);
    }
}

/**
 * Cargar registros
 */
async function loadRegistros(fecha = null) {
    registrosTableBody.innerHTML = '<tr><td colspan="6" class="loading">Cargando registros...</td></tr>';
    
    try {
        const response = await callAPI({
            action: 'obtener_todos_registros',
            fecha: fecha
        });
        
        if (response.success) {
            const registros = response.registros;
            
            if (registros.length === 0) {
                registrosTableBody.innerHTML = '<tr><td colspan="6" class="loading">No hay registros</td></tr>';
                return;
            }
            
            registrosTableBody.innerHTML = '';
            registros.forEach(registro => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${registro.timestamp}</td>
                    <td>${registro.nombre_completo}</td>
                    <td><span class="badge badge-success">${CONFIG.TIPOS_NOMBRES[registro.tipo]}</span></td>
                    <td>${registro.servicio}</td>
                    <td>${registro.fecha}</td>
                    <td>${formatTime(registro.hora)}</td>
                `;
                registrosTableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        registrosTableBody.innerHTML = '<tr><td colspan="6" class="loading">Error al cargar registros</td></tr>';
    }
}

/**
 * Programar día de descanso
 */
async function programarDiaDescanso() {
    const empleado_id = parseInt(ddEmpleado.value);
    const fecha = ddFecha.value;
    const motivo = ddMotivo.value;
    
    if (!empleado_id || !fecha) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (!confirm('¿Programar día de descanso?')) return;
    
    toggleLoader(true);
    
    try {
        const response = await callAPI({
            action: 'programar_dia_descanso',
            empleado_id: empleado_id,
            fecha: fecha,
            motivo: motivo
        });
        
        if (response.success) {
            showMessage(response.message, 'success');
            ddFecha.value = '';
            invalidateCache('diasDescanso');
            await loadDiasDescanso();
            await loadDashboardStats();
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
 * Cargar días de descanso (LAZY)
 */
async function loadDiasDescanso() {
    // Verificar cache
    if (isCacheValid('diasDescanso')) {
        diasDescansoData = getCache('diasDescanso');
        renderDiasDescanso();
        return;
    }
    
    diasDescansoTableBody.innerHTML = '<tr><td colspan="5" class="loading">Cargando días de descanso...</td></tr>';
    
    try {
        const response = await callAPI({
            action: 'obtener_todos_dias_descanso'
        });
        
        if (response.success) {
            diasDescansoData = response.dias_descanso;
            setCache('diasDescanso', diasDescansoData);
            renderDiasDescanso();
        }
    } catch (error) {
        console.error('Error:', error);
        diasDescansoTableBody.innerHTML = '<tr><td colspan="5" class="loading">Error al cargar días de descanso</td></tr>';
    }
}

/**
 * Renderiza la tabla de días de descanso
 */
function renderDiasDescanso() {
    if (diasDescansoData.length === 0) {
        diasDescansoTableBody.innerHTML = '<tr><td colspan="5" class="loading">No hay días de descanso programados</td></tr>';
        return;
    }
    
    diasDescansoTableBody.innerHTML = '';
    diasDescansoData.forEach(dia => {
        const nombreEmpleado = dia.Empleado || 'Sin nombre';
        const aprobadoPor = dia.aprobado_por || 'Sin info';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dia.id}</td>
            <td>${nombreEmpleado}</td>
            <td>${dia.fecha}</td>
            <td>${dia.motivo}</td>
            <td>${aprobadoPor}</td>
        `;
        diasDescansoTableBody.appendChild(row);
    });
}

/**
 * Filtra y muestra resultados según el tipo de card clickeado
 */
function filtrarDashboard(tipo) {
    const filteredResults = document.getElementById('filteredResults');
    const filteredTitle = document.getElementById('filteredTitle');
    const filteredContent = document.getElementById('filteredContent');
    
    tipoFiltroActual = tipo;
    let titulo = '';
    let datos = [];
    
    switch(tipo) {
        case 'tarde':
            titulo = '⚠️ Llegadas Tarde Hoy';
            datos = registrosHoyData.filter(r => r.tipo === 'entrada' && r.tarde);
            break;
            
        case 'descanso-total':
            titulo = '🏖️ Días de Descanso Legítimos';
            datos = diasDescansoData.filter(d => 
                d.motivo === 'Vacaciones' || 
                d.motivo === 'Permiso Personal' || 
                d.motivo === 'Descanso' || 
                d.motivo === 'Incapacidad' || 
                d.motivo === 'Día Festivo'
            );
            break;
            
        case 'Vacaciones':
        case 'Permiso Personal':
        case 'Incapacidad':
        case 'Suspensión':
        case 'Falta sin Justificación':
        case 'Falta con Justificación':
            titulo = `📋 ${tipo}`;
            datos = diasDescansoData.filter(d => d.motivo === tipo);
            break;
            
        default:
            return;
    }
    
    resultadosSinFiltrar = datos;
    cargarServiciosFiltro();
    
    filteredTitle.textContent = titulo;
    if (tipo === 'tarde') {
        filteredContent.innerHTML = generarListaRegistros(datos);
    } else {
        filteredContent.innerHTML = generarListaDescansos(datos);
    }
    
    filteredResults.style.display = 'block';
    filteredResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Genera HTML para lista de registros
 */
function generarListaRegistros(registros) {
    if (registros.length === 0) {
        return '<p class="loading">No hay registros</p>';
    }
    
    let html = '';
    registros.forEach(reg => {
        html += `
            <div class="record-item ${reg.tipo}">
                <div>
                    <div class="record-type">${reg.nombre_completo}</div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${reg.servicio} - Entrada: ${formatTime(reg.hora)}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="record-time" style="color: #ef4444;">TARDE</div>
                    <div style="font-size: 12px; color: #6b7280;">${reg.minutos_tarde || 0} min</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Genera HTML para lista de días de descanso
 * CORREGIDO - Usa campo "Empleado" correcto
 */
function generarListaDescansos(descansos) {
    if (descansos.length === 0) {
        return '<p class="loading">No hay registros</p>';
    }
    
    let html = '';
    descansos.forEach(d => {
        const nombreEmpleado = d.Empleado || 'Sin nombre';
        const aprobadoPor = d.aprobado_por || 'Sin info';
        
        html += `
            <div class="record-item">
                <div>
                    <div class="record-type">${nombreEmpleado}</div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${d.motivo} - Aprobado por: ${aprobadoPor}
                    </div>
                </div>
                <div class="record-time">${d.fecha}</div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Cierra el panel de resultados filtrados
 */
function cerrarFiltro() {
    document.getElementById('filteredResults').style.display = 'none';
}

/**
 * Carga servicios en el filtro
 */
function cargarServiciosFiltro() {
    const filtroServicio = document.getElementById('filtroServicio');
    filtroServicio.innerHTML = '<option value="">Todos los servicios</option>';
    
    if (serviciosData && serviciosData.length > 0) {
        serviciosData.filter(s => s.activo).forEach(srv => {
            const option = document.createElement
            const option = document.createElement('option');
            option.value = srv.id;
            option.textContent = srv.nombre;
            filtroServicio.appendChild(option);
        });
    }
    
    filtroServicio.value = '';
}

/**
 * Aplica filtro por servicio
 */
function aplicarFiltroServicio() {
    const servicioId = parseInt(document.getElementById('filtroServicio').value);
    const filteredContent = document.getElementById('filteredContent');
    
    let datosFiltrados = resultadosSinFiltrar;
    
    if (servicioId) {
        if (tipoFiltroActual === 'tarde') {
            datosFiltrados = resultadosSinFiltrar.filter(r => {
                const emp = empleadosData.find(e => e.nombre + ' ' + e.apellido === r.nombre_completo);
                return emp && emp.servicio_id === servicioId;
            });
        } else {
            datosFiltrados = resultadosSinFiltrar.filter(d => {
                const nombreCompleto = d.Empleado;
                const emp = empleadosData.find(e => (e.nombre + ' ' + e.apellido) === nombreCompleto);
                return emp && emp.servicio_id === servicioId;
            });
        }
    }
    
    if (tipoFiltroActual === 'tarde') {
        filteredContent.innerHTML = generarListaRegistros(datosFiltrados);
    } else {
        filteredContent.innerHTML = generarListaDescansos(datosFiltrados);
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
        
        // ✅ LAZY LOADING: Cargar datos SOLO cuando se necesitan
        if (tabName === 'empleados') {
            loadEmpleados();
        } else if (tabName === 'servicios') {
            loadServicios();
        } else if (tabName === 'registros') {
            // No cargar automáticamente, esperar a que el usuario filtre
            registrosTableBody.innerHTML = '<tr><td colspan="6" class="loading">Selecciona una fecha o haz clic en "Todos los Registros"</td></tr>';
        } else if (tabName === 'dias-descanso') {
            loadDiasDescanso();
        }
    });
});

// Hacer funciones globales para onclick
window.desactivarEmpleado = desactivarEmpleado;
window.activarEmpleado = activarEmpleado;
window.desactivarServicio = desactivarServicio;
window.activarServicio = activarServicio;
window.filtrarDashboard = filtrarDashboard;
window.cerrarFiltro = cerrarFiltro;
window.aplicarFiltroServicio = aplicarFiltroServicio;

// Inicialización OPTIMIZADA
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkSession()) return;

    loadAdminInfo();
    
    // ✅ SOLO cargar estadísticas del dashboard al inicio
    await loadDashboardStats();
    
    // ✅ NO cargar servicios ni empleados completos hasta que se necesiten
    // Solo cargar servicios para el select del formulario
    const srvResponse = await callAPI({ action: 'listar_servicios', solo_activos: true });
    if (srvResponse.success) {
        serviciosData = srvResponse.servicios;
        setCache('servicios', serviciosData);
        empServicio.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
        serviciosData.forEach(srv => {
            const option = document.createElement('option');
            option.value = srv.id;
            option.textContent = srv.nombre;
            empServicio.appendChild(option);
        });
    }
    
    // Event listeners
    btnCrearEmpleado.addEventListener('click', crearEmpleado);
    btnCrearServicio.addEventListener('click', crearServicio);
    btnFiltrarRegistros.addEventListener('click', () => {
        const fecha = filtroFecha.value;
        if (fecha) {
            loadRegistros(fecha);
        } else {
            showMessage('Selecciona una fecha', 'error');
        }
    });
    btnTodosRegistros.addEventListener('click', () => loadRegistros());
    btnProgramarDD.addEventListener('click', programarDiaDescanso);
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) {
            clearEmpleadoData();
            window.location.href = 'index.html';
        }
    });
    
    // Validación de PIN
    empPin.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
    
    // ✅ Auto-actualizar SOLO el dashboard cada 2 minutos (en lugar de 30 segundos)
    setInterval(() => {
        invalidateCache(); // Invalidar todo el cache
        loadDashboardStats();
    }, 2 * 60 * 1000);

    initInactivityTimeout();
});








