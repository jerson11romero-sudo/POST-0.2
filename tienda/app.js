 // app.js - SISTEMA POS COMPLETO Y FUNCIONAL
const SUPABASE_URL = 'https://rezmgikurtxaaweipyvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlem1naWt1cnR4YWF3ZWlweXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3Mzc0OTYsImV4cCI6MjA4MTMxMzQ5Nn0.A0GJcGIanUC1ZUq-NQqUJZJ0YTCr2lQ4UYdot6SYjgM';

// Variables globales
let productosGlobales = [];
let ventasGlobales = [];
let productoSeleccionado = null;
const CLAVE_ADMIN = "romero123";

// Headers para Supabase
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema POS iniciado');
    inicializarApp();
});

async function inicializarApp() {
    try {
        // Actualizar fecha
        actualizarFechaHora();
        setInterval(actualizarFechaHora, 60000);
        
        // Cargar datos
        await cargarProductos();
        await cargarVentas();
        
        // Configurar eventos
        configurarEventos();
        
        // Focus en búsqueda
        document.getElementById('codigoVenta').focus();
        
        console.log('✅ Sistema listo');
    } catch (error) {
        console.error('❌ Error inicial:', error);
        mostrarErrorInicial();
    }
}

// ==================== FUNCIONES PRINCIPALES ====================

// 1. CARGAR PRODUCTOS
async function cargarProductos() {
    try {
        const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=id.desc`, {
            headers: headers
        });
        
        if (!respuesta.ok) {
            throw new Error(`Error ${respuesta.status}`);
        }
        
        productosGlobales = await respuesta.json();
        mostrarProductosEnTabla();
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarMensajeError('Error al cargar productos. Recarga la página.');
    }
}

// 2. CARGAR VENTAS
async function cargarVentas() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/ventas?created_at=gte.${hoy.toISOString()}&order=created_at.desc`, {
            headers: headers
        });
        
        if (respuesta.ok) {
            ventasGlobales = await respuesta.json();
            mostrarVentasEnHistorial();
            actualizarEstadisticas();
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

// 3. GUARDAR PRODUCTO (crear o actualizar)
window.guardarProducto = async function() {
    const codigo = document.getElementById('codigo').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const precio = parseFloat(document.getElementById('precio').value);
    const stock = parseInt(document.getElementById('stock').value);
    
    // Validaciones
    if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
        alert('⚠️ Complete todos los campos correctamente');
        return;
    }
    
    if (precio <= 0 || stock < 0) {
        alert('⚠️ Precio debe ser mayor a 0 y stock no puede ser negativo');
        return;
    }
    
    const producto = { codigo, nombre, precio, stock };
    
    try {
        // Verificar si el producto ya existe
        const existe = productosGlobales.find(p => p.codigo === codigo);
        
        if (existe) {
            // Actualizar
            await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(producto)
            });
            mostrarAlerta('success', '✅ Producto actualizado');
        } else {
            // Crear nuevo
            await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(producto)
            });
            mostrarAlerta('success', '✅ Producto guardado');
        }
        
        // Limpiar formulario
        limpiarFormularioProducto();
        
        // Recargar datos
        await cargarProductos();
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        mostrarAlerta('error', '❌ Error al guardar producto');
    }
};

// 4. BUSCAR PRODUCTO PARA VENTA
window.buscarProductoVenta = async function() {
    const codigo = document.getElementById('codigoVenta').value.trim();
    
    if (!codigo) {
        alert('⚠️ Ingrese un código');
        return;
    }
    
    try {
        // Buscar en productos cargados primero
        let producto = productosGlobales.find(p => p.codigo === codigo);
        
        if (!producto) {
            // Buscar en la base de datos
            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
                headers: headers
            });
            
            if (respuesta.ok) {
                const productos = await respuesta.json();
                producto = productos[0];
            }
        }
        
        if (producto) {
            productoSeleccionado = producto;
            
            // Mostrar en interfaz
            document.getElementById('ventaNombre').textContent = producto.nombre;
            document.getElementById('precioVenta').value = producto.precio;
            
            // Actualizar badge de stock
            const stockBadge = document.getElementById('ventaStock');
            stockBadge.textContent = `${producto.stock} unidades`;
            stockBadge.className = producto.stock <= 0 ? 'badge bg-danger' :
                                  producto.stock < 5 ? 'badge bg-warning' : 'badge bg-success';
            
            // Auto-seleccionar precio para edición
            document.getElementById('precioVenta').focus();
            document.getElementById('precioVenta').select();
            
        } else {
            productoSeleccionado = null;
            document.getElementById('ventaNombre').textContent = '---';
            document.getElementById('precioVenta').value = '';
            document.getElementById('ventaStock').textContent = 'No encontrado';
            document.getElementById('ventaStock').className = 'badge bg-secondary';
            
            mostrarAlerta('warning', `⚠️ Producto no encontrado: ${codigo}`);
        }
        
    } catch (error) {
        console.error('Error buscando producto:', error);
        mostrarAlerta('error', '❌ Error al buscar producto');
    }
};

// 5. REGISTRAR VENTA
window.vender = async function() {
    if (!productoSeleccionado) {
        mostrarAlerta('warning', '⚠️ Primero busque un producto');
        return;
    }
    
    const precioVenta = parseFloat(document.getElementById('precioVenta').value);
    
    if (!precioVenta || precioVenta <= 0) {
        mostrarAlerta('warning', '⚠️ Ingrese un precio válido');
        return;
    }
    
    if (productoSeleccionado.stock <= 0) {
        mostrarAlerta('warning', '⚠️ No hay stock disponible');
        return;
    }
    
    try {
        // 1. Registrar la venta
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
        
        // 2. Actualizar stock del producto
        const nuevoStock = productoSeleccionado.stock - 1;
        await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${productoSeleccionado.codigo}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ stock: nuevoStock })
        });
        
        mostrarAlerta('success', '✅ Venta registrada exitosamente');
        
        // 3. Limpiar y actualizar
        limpiarVenta();
        await cargarProductos();
        await cargarVentas();
        
    } catch (error) {
        console.error('Error registrando venta:', error);
        mostrarAlerta('error', '❌ Error al registrar venta');
    }
};

// 6. EDITAR PRODUCTO
window.editarProducto = function(codigo) {
    const producto = productosGlobales.find(p => p.codigo === codigo);
    
    if (producto) {
        // Llenar formulario con datos del producto
        document.getElementById('codigo').value = producto.codigo;
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('precio').value = producto.precio;
        document.getElementById('stock').value = producto.stock;
        
        // Scroll al formulario
        document.getElementById('codigo').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('codigo').focus();
        
        mostrarAlerta('info', `✏️ Editando: ${producto.nombre}`);
    }
};

// 7. ELIMINAR PRODUCTO
window.eliminarProducto = async function(codigo) {
    if (!verificarClaveAdmin()) return;
    
    if (!confirm(`¿Está seguro de eliminar el producto ${codigo}?`)) return;
    
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/productos?codigo=eq.${codigo}`, {
            method: 'DELETE',
            headers: headers
        });
        
        mostrarAlerta('success', '✅ Producto eliminado');
        await cargarProductos();
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarAlerta('error', '❌ Error al eliminar producto');
    }
};

// 8. ELIMINAR VENTA
window.eliminarVenta = async function(id) {
    if (!verificarClaveAdmin()) return;
    
    if (!confirm('¿Eliminar esta venta del historial?')) return;
    
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
            method: 'DELETE',
            headers: headers
        });
        
        mostrarAlerta('success', '✅ Venta eliminada');
        await cargarVentas();
        
    } catch (error) {
        console.error('Error eliminando venta:', error);
        mostrarAlerta('error', '❌ Error al eliminar venta');
    }
};

// 9. LIMPIAR HISTORIAL (Cerrar día)
window.limpiarHistorial = async function() {
    if (!verificarClaveAdmin()) return;
    
    if (!confirm('¿Cerrar el día? Esto eliminará todas las ventas de hoy.')) return;
    
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        await fetch(`${SUPABASE_URL}/rest/v1/ventas?created_at=gte.${hoy.toISOString()}`, {
            method: 'DELETE',
            headers: headers
        });
        
        mostrarAlerta('success', '✅ Día cerrado. Historial limpiado.');
        await cargarVentas();
        
    } catch (error) {
        console.error('Error cerrando día:', error);
        mostrarAlerta('error', '❌ Error al cerrar el día');
    }
};

// 10. EXPORTAR PDF
window.exportarPDF = function() {
    if (!verificarClaveAdmin()) return;
    
    if (ventasGlobales.length === 0) {
        mostrarAlerta('warning', '⚠️ No hay ventas para exportar');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // Título
        pdf.setFontSize(18);
        pdf.text("REPORTE DE VENTAS - POS SYSTEM", 20, 20);
        
        // Fecha
        pdf.setFontSize(12);
        pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
        pdf.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`, 20, 37);
        
        // Tabla
        let y = 50;
        pdf.setFontSize(10);
        
        // Encabezados
        pdf.text("#", 20, y);
        pdf.text("Hora", 30, y);
        pdf.text("Producto", 60, y);
        pdf.text("Precio", 150, y);
        y += 7;
        
        // Línea
        pdf.line(20, y, 190, y);
        y += 5;
        
        // Datos
        let total = 0;
        ventasGlobales.forEach((venta, index) => {
            const fecha = new Date(venta.created_at);
            const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            pdf.text((index + 1).toString(), 20, y);
            pdf.text(hora, 30, y);
            pdf.text(venta.producto.substring(0, 40), 60, y);
            pdf.text(`S/ ${venta.precio.toFixed(2)}`, 150, y);
            
            total += venta.precio;
            y += 7;
            
            if (y > 280) {
                pdf.addPage();
                y = 20;
            }
        });
        
        // Total
        y += 10;
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`TOTAL VENTAS: S/ ${total.toFixed(2)}`, 120, y);
        
        // Guardar
        const fecha = new Date().toISOString().split('T')[0];
        pdf.save(`ventas_${fecha}.pdf`);
        
        mostrarAlerta('success', '✅ PDF generado y descargado');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarAlerta('error', '❌ Error al generar PDF');
    }
};

// ==================== FUNCIONES AUXILIARES ====================

function mostrarProductosEnTabla() {
    const tabla = document.getElementById('tablaProductos');
    if (!tabla) return;
    
    if (productosGlobales.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-box-open fa-2x mb-2"></i><br>
                    No hay productos registrados<br>
                    <small class="text-muted">Agrega tu primer producto usando el formulario</small>
                </td>
            </tr>`;
        return;
    }
    
    tabla.innerHTML = productosGlobales.map(producto => {
        const stockClass = producto.stock < 5 ? 'badge bg-danger' :
                          producto.stock < 10 ? 'badge bg-warning' : 'badge bg-success';
        
        return `
            <tr>
                <td class="fw-bold">${producto.codigo}</td>
                <td>${producto.nombre}</td>
                <td class="fw-bold">S/ ${producto.precio.toFixed(2)}</td>
                <td><span class="${stockClass}">${producto.stock} unidades</span></td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm me-1" onclick="editarProducto('${producto.codigo}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${producto.codigo}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    document.getElementById('productCount').textContent = `Mostrando ${productosGlobales.length} productos`;
}

function mostrarVentasEnHistorial() {
    const historial = document.getElementById('historial');
    if (!historial) return;
    
    if (ventasGlobales.length === 0) {
        historial.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                <i class="fas fa-receipt fa-2x mb-2"></i><br>
                No hay ventas registradas hoy<br>
                <small class="text-muted">Realiza tu primera venta</small>
            </li>`;
        return;
    }
    
    let totalVentas = 0;
    historial.innerHTML = ventasGlobales.map(venta => {
        const fecha = new Date(venta.created_at);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        totalVentas += venta.precio;
        
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="text-muted small">${hora}</span>
                    <span class="ms-2 fw-bold">${venta.producto}</span>
                    <small class="text-muted ms-2">(${venta.codigo})</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="fw-bold me-3">S/ ${venta.precio.toFixed(2)}</span>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarVenta(${venta.id})" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </li>`;
    }).join('');
    
    // Actualizar total
    document.getElementById('totalAmount').textContent = totalVentas.toFixed(2);
}

function actualizarEstadisticas() {
    // Productos
    const totalProductos = productosGlobales.length;
    const stockBajo = productosGlobales.filter(p => p.stock < 5).length;
    
    // Ventas
    const totalVentas = ventasGlobales.length;
    const totalIngresos = ventasGlobales.reduce((sum, v) => sum + v.precio, 0);
    
    // Actualizar UI
    document.getElementById('totalProducts').textContent = totalProductos;
    document.getElementById('lowStock').textContent = stockBajo;
    document.getElementById('totalSales').textContent = totalVentas;
    document.getElementById('totalAmount').textContent = totalIngresos.toFixed(2);
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function actualizarFechaHora() {
    const ahora = new Date();
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const fechaElemento = document.getElementById('currentDate');
    if (fechaElemento) {
        fechaElemento.textContent = ahora.toLocaleDateString('es-ES', opciones);
    }
}

function verificarClaveAdmin() {
    const clave = prompt("🔐 Ingrese la clave de administrador:");
    if (clave === CLAVE_ADMIN) {
        return true;
    } else {
        alert("❌ Clave incorrecta");
        return false;
    }
}

function limpiarFormularioProducto() {
    document.getElementById('codigo').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('stock').value = '';
}

function limpiarVenta() {
    productoSeleccionado = null;
    document.getElementById('codigoVenta').value = '';
    document.getElementById('ventaNombre').textContent = '---';
    document.getElementById('precioVenta').value = '';
    document.getElementById('ventaStock').textContent = '0 unidades';
    document.getElementById('ventaStock').className = 'badge bg-danger';
    
    // Focus en búsqueda
    document.getElementById('codigoVenta').focus();
}

function mostrarAlerta(tipo, mensaje) {
    // Crear alerta temporal
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'danger'} alert-dismissible fade show position-fixed`;
    alerta.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alerta);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.parentNode.removeChild(alerta);
        }
    }, 3000);
}

function configurarEventos() {
    // Enter en búsqueda de venta
    document.getElementById('codigoVenta').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarProductoVenta();
        }
    });
    
    // Buscar en inventario
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filtrarProductos(e.target.value);
        });
    }
    
    // Actualizar productos
    const btnActualizar = document.querySelector('button[onclick*="mostrarProductos"]');
    if (btnActualizar) {
        btnActualizar.onclick = async function() {
            await cargarProductos();
            mostrarAlerta('success', '📦 Productos actualizados');
        };
    }
}

function filtrarProductos(termino) {
    const tabla = document.getElementById('tablaProductos');
    if (!tabla || !termino) {
        mostrarProductosEnTabla();
        return;
    }
    
    const terminoLower = termino.toLowerCase();
    const productosFiltrados = productosGlobales.filter(p => 
        p.codigo.toLowerCase().includes(terminoLower) ||
        p.nombre.toLowerCase().includes(terminoLower)
    );
    
    if (productosFiltrados.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-search fa-2x mb-2"></i><br>
                    No se encontraron productos<br>
                    <small class="text-muted">Intenta con otro término de búsqueda</small>
                </td>
            </tr>`;
        return;
    }
    
    tabla.innerHTML = productosFiltrados.map(producto => {
        const stockClass = producto.stock < 5 ? 'badge bg-danger' :
                          producto.stock < 10 ? 'badge bg-warning' : 'badge bg-success';
        
        return `
            <tr>
                <td class="fw-bold">${producto.codigo}</td>
                <td>${producto.nombre}</td>
                <td class="fw-bold">S/ ${producto.precio.toFixed(2)}</td>
                <td><span class="${stockClass}">${producto.stock} unidades</span></td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm me-1" onclick="editarProducto('${producto.codigo}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${producto.codigo}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function mostrarErrorInicial() {
    const tabla = document.getElementById('tablaProductos');
    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                    <strong>Error de conexión</strong><br>
                    <small>No se pudo conectar con la base de datos</small><br>
                    <button class="btn btn-primary btn-sm mt-2" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Recargar página
                    </button>
                </td>
            </tr>`;
    }
}

function mostrarMensajeError(mensaje) {
    console.error(mensaje);
    // Puedes mostrar un toast o alerta aquí
}

// Exportar funciones al scope global (por si acaso)
window.mostrarProductos = cargarProductos;
window.mostrarVentas = cargarVentas;
window.updateStats = actualizarEstadisticas;
