/**
 * app.js - Lógica de la página de login
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
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje: 'success', 'error', 'warning'
 */
function showMessage(message, type = 'error') {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

/**
 * Muestra u oculta el loader
 * @param {boolean} show - true para mostrar, false para ocultar
 */
function toggleLoader(show) {
    if (show) {
        loader.style.display = 'block';
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verificando...';
    } else {
        loader.style.display = 'none';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
    }
}

/**
 * Valida el formulario antes de enviar
 * @returns {boolean} true si el formulario es válido
 */
function validateForm() {
    const usuario = usuarioInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!usuario) {
        showMessage('Por favor ingresa tu usuario', 'error');
        usuarioInput.focus();
        return false;
    }
    
    if (!pin) {
        showMessage('Por favor ingresa tu PIN', 'error');
        pinInput.focus();
        return false;
    }
    
    if (pin.length !== 4) {
        showMessage('El PIN debe ser de 4 dígitos', 'error');
        pinInput.focus();
        return false;
    }
    
    if (!/^\d{4}$/.test(pin)) {
        showMessage('El PIN debe contener solo números', 'error');
        pinInput.focus();
        return false;
    }
    
    return true;
}

/**
 * Maneja el submit del formulario de login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Validar formulario
    if (!validateForm()) {
        return;
    }
    
    // Mostrar loader
    toggleLoader(true);
    
    // Ocultar mensaje anterior
    messageDiv.classList.remove('show');
    
    // Obtener valores
    const usuario = usuarioInput.value.trim();
    const pin = pinInput.value.trim();
    
    try {
        // Llamar al API
        const response = await callAPI({
            action: 'login',
            usuario: usuario,
            pin: pin
        });
        
        // Procesar respuesta
        if (response.success) {
            // Login exitoso
            showMessage('¡Login exitoso! Redirigiendo...', 'success');
            
            // Guardar datos del empleado
            saveEmpleadoData(response.empleado);
            
            // Redirigir según el rol después de 1 segundo
            setTimeout(() => {
                const rol = response.empleado.rol;
                
                if (rol === 'admin') {
                    window.location.href = 'admin.html';
                } else if (rol === 'supervisor') {
                    window.location.href = 'supervisor.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
            
        } else {
            // Login fallido
            showMessage(response.message || 'Error al iniciar sesión', 'error');
            toggleLoader(false);
            pinInput.value = '';
            pinInput.focus();
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showMessage('Error de conexión. Verifica tu internet e intenta nuevamente.', 'error');
        toggleLoader(false);
    }
}

/**
 * Verifica si ya hay una sesión activa
 */
function checkExistingSession() {
    const empleadoData = getEmpleadoData();
    
    if (empleadoData && empleadoData.id) {
        // Ya hay una sesión, redirigir al dashboard
        window.location.href = 'dashboard.html';
    }
}

/**
 * Inicialización cuando carga la página
 */
document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión existente
    checkExistingSession();
    
    // Event listener para el formulario
    loginForm.addEventListener('submit', handleLogin);
    
    // Focus automático en el campo de usuario
    usuarioInput.focus();
    
    // Validación en tiempo real del PIN (solo números)
    pinInput.addEventListener('input', (e) => {
        // Remover cualquier carácter que no sea número
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Limitar a 4 dígitos
        if (e.target.value.length > 4) {
            e.target.value = e.target.value.slice(0, 4);
        }
    });
    
    // Al presionar Enter en el campo usuario, pasar al PIN
    usuarioInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            pinInput.focus();
        }
    });
});