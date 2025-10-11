/**
 * app.js - Lógica de la página de login
 * VERSIÓN OPTIMIZADA - MULTI-EMPRESA
 */

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const usuarioInput = document.getElementById('usuario');
const pinInput = document.getElementById('pin');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');
const loader = document.getElementById('loader');

/**
 * Muestra un mensaje en la interfaz
 */
function showMessage(message, type = 'error') {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

/**
 * Muestra u oculta el loader
 */
function toggleLoader(show) {
    loader.style.display = show ? 'block' : 'none';
    loginBtn.disabled = show;
    loginBtn.textContent = show ? 'Verificando...' : 'Iniciar Sesión';
}

/**
 * Valida el formulario antes de enviar
 */
function validateForm() {
    const usuario = usuarioInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!usuario) {
        showMessage('Por favor ingresa tu usuario', 'error');
        usuarioInput.focus();
        return false;
    }
    
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showMessage('El PIN debe ser de 4 dígitos numéricos', 'error');
        pinInput.focus();
        return false;
    }
    
    return true;
}

/**
 * Redirige al dashboard correcto según el rol
 * ✅ CORREGIDO: Preserva el parámetro ?empresa=
 */
function redirectToDashboard(rol) {
    const dashboards = {
        'admin': 'admin.html',
        'supervisor': 'supervisor.html',
        'empleado': 'dashboard.html'
    };
    
    // ✅ NUEVO: Obtener parámetros actuales de la URL
    const empresaParam = window.location.search;
    
    // ✅ NUEVO: Agregar parámetros a la URL de destino
    const targetPage = dashboards[rol] || 'dashboard.html';
    window.location.href = targetPage + empresaParam;
}

/**
 * Maneja el submit del formulario de login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    toggleLoader(true);
    messageDiv.classList.remove('show');
    
    const usuario = usuarioInput.value.trim();
    const pin = pinInput.value.trim();
    
    try {
        const response = await callAPI({
            action: 'login',
            usuario: usuario,
            pin: pin
        });
        
        if (response.success && response.empleado) {
            // Login exitoso
            showMessage('¡Login exitoso!', 'success');
            
            // Guardar datos del empleado
            saveEmpleadoData(response.empleado);
            
            // Redirigir al dashboard correcto (con parámetro empresa)
            redirectToDashboard(response.empleado.rol);
            
        } else {
            // Login fallido
            showMessage(response.message || 'Usuario o PIN incorrectos', 'error');
            
            // Limpiar solo PIN y enfocar para reintentar
            pinInput.value = '';
            pinInput.focus();
            
            toggleLoader(false);
        }
        
    } catch (error) {
        if (CONFIG.DEBUG) {
            console.error('[Login] Error:', error);
        }
        
        showMessage(
            !navigator.onLine 
                ? 'Sin conexión a internet. Verifica tu conexión.' 
                : 'Error de conexión. Intenta nuevamente.',
            'error'
        );
        
        toggleLoader(false);
    }
}

/**
 * Verifica si ya hay una sesión activa
 * ✅ CORREGIDO: Redirige preservando el parámetro empresa
 */
function checkExistingSession() {
    const empleadoData = getEmpleadoData();
    
    if (empleadoData?.id && empleadoData?.rol) {
        // Ya hay sesión válida, redirigir al dashboard correcto
        redirectToDashboard(empleadoData.rol);
    }
}

/**
 * Inicialización cuando carga la página
 */
document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión existente primero
    checkExistingSession();
    
    // Event listener para el formulario
    loginForm.addEventListener('submit', handleLogin);
    
    // Focus automático
    usuarioInput.focus();
    
    // Validación en tiempo real del PIN
    pinInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
    
    // Prevenir paste de texto no numérico
    pinInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbers = pastedText.replace(/\D/g, '').slice(0, 4);
        pinInput.value = numbers;
    });
    
    // Enter en usuario → pasar a PIN
    usuarioInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            pinInput.focus();
        }
    });
    
    // Enter en PIN → submit automático
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && pinInput.value.length === 4) {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});
