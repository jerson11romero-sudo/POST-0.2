// app.js - VERSIÓN CORREGIDA CON CONEXIÓN ASEGURADA
console.log('🔧 Iniciando Sistema POS...');

// Configuración de Supabase - VERIFICADA
const SUPABASE_URL = 'https://rezmgikurtxaaweipyvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlem1naWt1cnR4YWF3ZWlweXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3Mzc0OTYsImV4cCI6MjA4MTMxMzQ5Nn0.A0GJcGIanUC1ZUq-NQqUJZJ0YTCr2lQ4UYdot6SYjgM';

// Variables globales
let productos = [];
let ventas = [];
let productoSeleccionado = null;
const CLAVE_ADMIN = "romero123";

// Headers CORREGIDOS - IMPORTANTE: sin 'mode' para evitar problemas CORS
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

// ==================== FUNCIÓN DIAGNÓSTICO ====================
async function diagnosticoConexion() {
    console.log('🔍 Ejecutando diagnóstico de conexión...');
    
    try {
        // Prueba directa con fetch simple
        const testUrl = `${SUPABASE_URL}/rest/v1/productos?select=*&limit=1`;
        console.log('📡 URL de prueba:', testUrl);
        console.log('🔑 Headers enviados:', headers);
        
        const respuesta = await fetch(testUrl, {
            headers: headers
        });
        
        console.log('📊 Estado HTTP:', respuesta.status, respuesta.statusText);
        
        if (respuesta.ok) {
            const datos = await respuesta.json();
            console.log('✅ CONEXIÓN EXITOSA. Datos recibidos:', datos);
            return { ok: true, datos: datos };
        } else {
            const errorTexto = await respuesta.text();
            console.error('❌ ERROR HTTP:', errorTexto);
            
            // Mostrar error en pantalla
            mostrarErrorPantalla(`Error ${respuesta.status}: ${errorTexto}`);
            return { ok: false, error: errorTexto };
        }
        
    } catch (error) {
        console.error('❌ ERROR DE RED:', error);
        mostrarErrorPantalla(`Error de red: ${error.message}`);
        return { ok: false, error: error.message };
    }
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Sistema POS cargando...');
    
    // Actualizar fecha
    actualizarFecha();
    
    // Ejecutar diagnóstico
    const diagnostico = await diagnosticoConexion();
    
    if (diagnostico.ok) {
        // Si la conexión es exitosa, cargar datos
        await cargarDatosIniciales();
        configurarEventos();
        
        console.log('✅ Sistema listo para usar');
        mostrarMensajeExito('Conexión establecida con Supabase');
    } else {
        // Mostrar mensaje de error
        console.error('❌ No se pudo conectar a Supabase');
    }
});

// ==================== FUNCIONES PRINCIPALES ====================

async function cargarDatosIniciales() {
    try {
        await Promise.all([
            cargarProductos(),
            cargarVentas()
        ]);
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

async function cargarProductos() {
    try {
        console.log('📦 Solicitando productos...');
        
        const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=id.desc`, {
            headers: headers
        });
        
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}: ${await respuesta.text()}`);
        }
        
        productos = await respuesta.json();
        actualizarTablaProductos();
        actualizarEstadisticas();
        
        console.log(`✅ ${productos.length} productos cargados`);
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        mostrarErrorTabla(`Error: ${error.message}`);
    }
}

async function cargarVentas() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const respuesta = await fetch(
            `${SUPABASE_URL}/rest/v1/ventas?created_at=gte.${hoy.toISOString()}&order=created_at.desc`, {
            headers: headers
        });
        
        if (respuesta.ok) {
            ventas = await respuesta.json();
            actualizarHistorialVentas();
            actualizarEstadisticas();
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

// ==================== FUNCIONES DE INTERFAZ ====================

function actualizarTablaProductos() {
    const tabla = document.getElementById('tablaProductos');
    if (!tabla) return;
    
    if (productos.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <h5>Inventario vacío</h5>
                    <p class="small">Agrega productos usando el formulario</p>
                </td>
            </tr>`;
        return;
    }
    
    tabla.innerHTML = productos.map(p => {
        const stockClass = p.stock < 5 ? "badge bg-danger" : 
                          p.stock < 10 ? "badge bg-warning" : "badge bg-success";
        
        return `
            <tr>
                <td class="fw-bold">${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>S/ ${p.precio.toFixed(2)}</td>
                <td><span class="${stockClass}">${p.stock} unidades</span></td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm me-1" onclick="editarProducto('${p.codigo}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.codigo}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    document.getElementById('productCount').textContent = `Mostrando ${productos.length} productos`;
}

function actualizarHistorialVentas() {
    const historial = document.getElementById('historial');
    if (!historial) return;
    
    if (ventas.length === 0) {
        historial.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                <i class="fas fa-shopping-cart fa-2x mb-3"></i>
                <h5>Sin ventas hoy</h5>
                <p class="small">Realiza tu primera venta</p>
            </li>`;
        return;
    }
    
    let total = 0;
    historial.innerHTML = ventas.map(v => {
        const fecha = new Date(v.created_at);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        total += v.precio;
        
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="text-muted small">${hora}</span>
                    <span class="ms-2">${v.producto}</span>
                    <small class="text-muted ms-2">(${v.codigo})</small>
                </div>
                <span class="fw-bold">S/ ${v.precio.toFixed(2)}</span>
            </li>`;
    }).join('');
    
    document.getElementById('totalAmount').textContent = total.toFixed(2);
}

function actualizarEstadisticas() {
    // Productos
    document.getElementById('totalProducts').textContent = productos.length;
    document.getElementById('lowStock').textContent = productos.filter(p => p.stock < 5).length;
    
    // Ventas
    document.getElementById('totalSales').textContent = ventas.length;
    document.getElementById('totalAmount').textContent = ventas.reduce((sum, v) => sum + v.precio, 0).toFixed(2);
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('es-ES');
}

function actualizarFecha() {
    const ahora = new Date();
    document.getElementById('currentDate').textContent = 
        ahora.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
}

// ==================== FUNCIONES DE NEGOCIO ====================

window.guardarProducto = async function() {
    const codigo = document.getElementById('codigo').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const precio = parseFloat(document.getElementById('precio').value);
    const stock = parseInt(document.getElementById('stock').value);
    
    if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
        alert('Complete todos los campos');
        return;
    }
    
    try {
        const producto = { codigo, nombre, precio, stock };
        
        // Verificar si existe
        const existe = productos.find(p => p.codigo === codigo);
        
        let response;
        if (existe) {
            // Actualizar
            response = await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(producto)
            });
        } else {
            // Crear nuevo
            response = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(producto)
            });
        }
        
        if (!response.ok) throw new Error('Error en servidor');
        
        alert('✅ Producto guardado');
        
        // Limpiar y recargar
        document.getElementById('codigo').value = '';
        document.getElementById('nombre').value = '';
        document.getElementById('precio').value = '';
        document.getElementById('stock').value = '';
        
        await cargarProductos();
        
    } catch (error) {
        alert('❌ Error al guardar');
        console.error(error);
    }
};

window.buscarProductoVenta = async function() {
    const codigo = document.getElementById('codigoVenta').value.trim();
    
    if (!codigo) {
        alert('Ingrese un código');
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
            headers: headers
        });
        
        if (response.ok) {
            const datos = await response.json();
            
            if (datos && datos.length > 0) {
                productoSeleccionado = datos[0];
                
                document.getElementById('ventaNombre').textContent = productoSeleccionado.nombre;
                document.getElementById('precioVenta').value = productoSeleccionado.precio;
                
                const stockBadge = document.getElementById('ventaStock');
                stockBadge.textContent = `${productoSeleccionado.stock} unidades`;
                stockBadge.className = productoSeleccionado.stock <= 0 ? "badge bg-danger" : 
                                      productoSeleccionado.stock < 5 ? "badge bg-warning" : "badge bg-success";
                
                // Auto-seleccionar precio
                document.getElementById('precioVenta').focus();
                document.getElementById('precioVenta').select();
                
            } else {
                productoSeleccionado = null;
                document.getElementById('ventaNombre').textContent = 'No encontrado';
                document.getElementById('precioVenta').value = '';
                document.getElementById('ventaStock').textContent = '0 unidades';
                document.getElementById('ventaStock').className = 'badge bg-danger';
            }
        }
    } catch (error) {
        alert('Error buscando producto');
        console.error(error);
    }
};

window.vender = async function() {
    if (!productoSeleccionado) {
        alert('Busque un producto primero');
        return;
    }
    
    const precioVenta = parseFloat(document.getElementById('precioVenta').value);
    
    if (!precioVenta || precioVenta <= 0) {
        alert('Ingrese precio válido');
        return;
    }
    
    if (productoSeleccionado.stock <= 0) {
        alert('Sin stock disponible');
        return;
    }
    
    try {
        // 1. Registrar venta
        const venta = {
            producto: productoSeleccionado.nombre,
            codigo: productoSeleccionado.codigo,
            precio: precioVenta
        };
        
        await fetch(`${SUPABASE_URL}/rest/v1/ventas`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(venta)
        });
        
        // 2. Actualizar stock
        const nuevoStock = productoSeleccionado.stock - 1;
        await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${productoSeleccionado.codigo}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ stock: nuevoStock })
        });
        
        alert('✅ Venta registrada');
        
        // 3. Limpiar y actualizar
        productoSeleccionado = null;
        document.getElementById('codigoVenta').value = '';
        document.getElementById('ventaNombre').textContent = '---';
        document.getElementById('precioVenta').value = '';
        document.getElementById('ventaStock').textContent = '0 unidades';
        document.getElementById('ventaStock').className = 'badge bg-danger';
        
        // Focus en búsqueda
        document.getElementById('codigoVenta').focus();
        
        await cargarProductos();
        await cargarVentas();
        
    } catch (error) {
        alert('Error registrando venta');
        console.error(error);
    }
};

window.editarProducto = function(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    
    if (producto) {
        document.getElementById('codigo').value = producto.codigo;
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('precio').value = producto.precio;
        document.getElementById('stock').value = producto.stock;
        
        document.getElementById('codigo').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('codigo').focus();
        
        alert(`Editando: ${producto.nombre}`);
    }
};

window.eliminarProducto = async function(codigo) {
    const clave = prompt("Ingrese clave de administrador:");
    if (clave !== CLAVE_ADMIN) {
        alert("Clave incorrecta");
        return;
    }
    
    if (!confirm(`¿Eliminar producto ${codigo}?`)) return;
    
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
            method: 'DELETE',
            headers: headers
        });
        
        alert('✅ Producto eliminado');
        await cargarProductos();
        
    } catch (error) {
        alert('Error eliminando producto');
        console.error(error);
    }
};

window.eliminarVenta = async function(id) {
    const clave = prompt("Ingrese clave de administrador:");
    if (clave !== CLAVE_ADMIN) {
        alert("Clave incorrecta");
        return;
    }
    
    if (!confirm('¿Eliminar esta venta?')) return;
    
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
            method: 'DELETE',
            headers: headers
        });
        
        alert('✅ Venta eliminada');
        await cargarVentas();
        
    } catch (error) {
        alert('Error eliminando venta');
        console.error(error);
    }
};

window.limpiarHistorial = async function() {
    const clave = prompt("Ingrese clave de administrador:");
    if (clave !== CLAVE_ADMIN) {
        alert("Clave incorrecta");
        return;
    }
    
    if (!confirm('¿Cerrar el día? Esto eliminará todas las ventas de hoy.')) return;
    
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        await fetch(`${SUPABASE_URL}/rest/v1/ventas?created_at=gte.${hoy.toISOString()}`, {
            method: 'DELETE',
            headers: headers
        });
        
        alert('✅ Día cerrado');
        await cargarVentas();
        
    } catch (error) {
        alert('Error cerrando día');
        console.error(error);
    }
};

window.exportarPDF = function() {
    const clave = prompt("Ingrese clave de administrador:");
    if (clave !== CLAVE_ADMIN) {
        alert("Clave incorrecta");
        return;
    }
    
    if (ventas.length === 0) {
        alert('No hay ventas para exportar');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        pdf.text("Reporte de Ventas", 20, 20);
        pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
        
        let y = 50;
        ventas.forEach(v => {
            const hora = new Date(v.created_at).toLocaleTimeString();
            pdf.text(`${hora} - ${v.producto}: S/ ${v.precio.toFixed(2)}`, 20, y);
            y += 10;
        });
        
        const total = ventas.reduce((sum, v) => sum + v.precio, 0);
        pdf.text(`TOTAL: S/ ${total.toFixed(2)}`, 20, y + 10);
        
        pdf.save(`ventas_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('✅ PDF generado');
        
    } catch (error) {
        alert('Error generando PDF');
        console.error(error);
    }
};

// ==================== FUNCIONES AUXILIARES ====================

function configurarEventos() {
    // Enter en búsqueda de venta
    document.getElementById('codigoVenta').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarProductoVenta();
        }
    });
}

function mostrarErrorTabla(mensaje) {
    const tabla = document.getElementById('tablaProductos');
    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <div class="mb-2">
                        <i class="fas fa-exclamation-circle fa-2x"></i>
                    </div>
                    <div>${mensaje}</div>
                    <button onclick="location.reload()" class="btn btn-primary btn-sm mt-3">
                        <i class="fas fa-sync-alt"></i> Recargar
                    </button>
                </td>
            </tr>`;
    }
}

function mostrarErrorPantalla(mensaje) {
    const container = document.querySelector('.container');
    if (container) {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alerta.innerHTML = `
            <strong><i class="fas fa-exclamation-triangle"></i> Error de Conexión</strong>
            <p class="mb-0">${mensaje}</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        container.prepend(alerta);
    }
}

function mostrarMensajeExito(mensaje) {
    const container = document.querySelector('.container');
    if (container) {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-success alert-dismissible fade show mt-3';
        alerta.innerHTML = `
            <strong><i class="fas fa-check-circle"></i> ${mensaje}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        container.prepend(alerta);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            if (alerta.parentNode) {
                alerta.classList.remove('show');
                setTimeout(() => alerta.remove(), 150);
            }
        }, 5000);
    }
}

// Hacer funciones disponibles globalmente
window.mostrarProductos = cargarProductos;
window.mostrarVentas = cargarVentas; 

