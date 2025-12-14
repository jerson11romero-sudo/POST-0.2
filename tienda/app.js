// app.js - VERSIÓN COMPLETA Y CORREGIDA
const SUPABASE_URL = 'https://rezmgikurtxaaweipyvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlem1naWt1cnR4YWF3ZWlweXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3Mzc0OTYsImV4cCI6MjA4MTMxMzQ5Nn0.A0GJcGIanUC1ZUq-NQqUJZJ0YTCr2lQ4UYdot6SYjgM';

// Variables globales
let productosGlobales = [];
let ventasGlobales = [];
let productoVenta = null;
const CLAVE_ADMIN = "romero123";

// Headers para todas las solicitudes
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Función para hacer solicitudes a Supabase
async function supabaseFetch(endpoint, method = 'GET', data = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    
    const options = {
        method: method,
        headers: headers,
        body: data ? JSON.stringify(data) : null
    };
    
    try {
        console.log(`📡 ${method} ${endpoint}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        if (response.status === 204 || method === 'DELETE') {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ Error en ${method} ${endpoint}:`, error);
        throw error;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema POS iniciando...');
    initApp();
});

async function initApp() {
    try {
        // Cargar datos iniciales
        await mostrarProductos();
        await mostrarVentas();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Actualizar estadísticas y fecha
        updateStats();
        updateDateTime();
        
        // Auto-focus en campo de venta
        document.getElementById('codigoVenta').focus();
        
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        alert('No se pudo conectar con la base de datos. Verifica la consola.');
    }
}

function setupEventListeners() {
    // Buscar producto en venta al presionar Enter
    const codigoVentaInput = document.getElementById('codigoVenta');
    if (codigoVentaInput) {
        codigoVentaInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                buscarProductoVenta();
            }
        });
    }
    
    // Buscar en inventario
    const searchInventory = document.getElementById('searchInventory');
    if (searchInventory) {
        searchInventory.addEventListener('input', (e) => {
            filtrarProductos(e.target.value);
        });
    }
}

/* ---------- BÚSQUEDA DE PRODUCTOS ---------- */
async function buscarProductoVenta() {
    const codigo = document.getElementById('codigoVenta').value.trim();
    if (!codigo) {
        alert('Por favor ingrese un código');
        return;
    }
    
    console.log(`🔍 Buscando producto con código: ${codigo}`);
    
    try {
        // Buscar en productos ya cargados primero
        let producto = productosGlobales.find(p => p.codigo === codigo);
        
        // Si no está en memoria, buscar en la base de datos
        if (!producto) {
            const productos = await supabaseFetch(`productos?codigo=eq.${codigo}`);
            producto = productos && productos.length > 0 ? productos[0] : null;
        }
        
        if (producto) {
            productoVenta = producto;
            
            // Actualizar la interfaz
            document.getElementById('ventaNombre').textContent = producto.nombre;
            document.getElementById('precioVenta').value = producto.precio;
            
            const stockBadge = document.getElementById('ventaStock');
            if (stockBadge) {
                stockBadge.textContent = `${producto.stock} unidades`;
                stockBadge.className = producto.stock <= 0 ? "badge bg-danger" : 
                                      producto.stock < 5 ? "badge bg-warning" : "badge bg-success";
            }
            
            console.log(`✅ Producto encontrado: ${producto.nombre}`);
        } else {
            console.warn(`⚠️ Producto no encontrado: ${codigo}`);
            productoVenta = null;
            document.getElementById('ventaNombre').textContent = "---";
            document.getElementById('precioVenta').value = "";
            
            const stockBadge = document.getElementById('ventaStock');
            if (stockBadge) {
                stockBadge.textContent = "0 unidades";
                stockBadge.className = "badge bg-danger";
            }
            
            alert(`❌ Producto no encontrado. Código: ${codigo}`);
        }
    } catch (error) {
        console.error('❌ Error buscando producto:', error);
        alert('Error al buscar producto. Verifica la consola.');
    }
}

/* ---------- MOSTRAR PRODUCTOS ---------- */
async function mostrarProductos() {
    try {
        console.log('📦 Cargando productos...');
        const productos = await supabaseFetch('productos?select=*');
        productosGlobales = productos || [];
        
        const tablaProductos = document.getElementById('tablaProductos');
        if (!tablaProductos) {
            console.error('❌ No se encontró el elemento tablaProductos');
            return;
        }
        
        // Limpiar tabla
        tablaProductos.innerHTML = '';
        
        if (productosGlobales.length === 0) {
            tablaProductos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        No hay productos registrados
                    </td>
                </tr>`;
        } else {
            // Mostrar productos en tabla
            productosGlobales.forEach(p => {
                const stockClass = p.stock < 5 ? "badge bg-danger" : 
                                  p.stock < 10 ? "badge bg-warning" : "badge bg-success";
                
                tablaProductos.innerHTML += `
                    <tr>
                        <td class="fw-bold">${p.codigo}</td>
                        <td>${p.nombre}</td>
                        <td class="fw-bold">S/ ${p.precio.toFixed(2)}</td>
                        <td>
                            <span class="${stockClass}">${p.stock} unidades</span>
                        </td>
                        <td class="action-buttons">
                            <button class="btn btn-warning btn-sm" onclick="editarProducto('${p.codigo}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.codigo}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
        }
        
        // Actualizar estadísticas
        updateStats();
        
        // Actualizar contador de productos
        const productCount = document.getElementById('productCount');
        if (productCount) {
            productCount.textContent = `Mostrando ${productosGlobales.length} productos`;
        }
        
        console.log(`✅ ${productosGlobales.length} productos cargados`);
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        
        // Mostrar mensaje de error en la tabla
        const tablaProductos = document.getElementById('tablaProductos');
        if (tablaProductos) {
            tablaProductos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        Error al cargar productos. Verifica la consola.
                    </td>
                </tr>`;
        }
    }
}

/* ---------- GESTIÓN DE PRODUCTOS ---------- */
async function guardarProducto() {
    const codigo = document.getElementById('codigo').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const precio = parseFloat(document.getElementById('precio').value);
    const stock = parseInt(document.getElementById('stock').value);
    
    // Validaciones
    if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
        alert('Por favor complete todos los campos correctamente');
        return;
    }
    
    if (precio <= 0) {
        alert('El precio debe ser mayor a 0');
        return;
    }
    
    if (stock < 0) {
        alert('El stock no puede ser negativo');
        return;
    }
    
    const producto = {
        codigo: codigo,
        nombre: nombre,
        precio: precio,
        stock: stock
    };
    
    try {
        // Insertar o actualizar producto
        await supabaseFetch('productos', 'POST', producto);
        
        alert('✅ Producto guardado exitosamente');
        
        // Limpiar campos y actualizar lista
        limpiarCampos();
        await mostrarProductos();
        
    } catch (error) {
        console.error('❌ Error guardando producto:', error);
        alert('Error al guardar producto');
    }
}

window.editarProducto = async (codigo) => {
    try {
        // Buscar producto localmente
        const producto = productosGlobales.find(p => p.codigo === codigo);
        
        if (producto) {
            // Rellenar formulario con datos del producto
            document.getElementById('codigo').value = producto.codigo;
            document.getElementById('nombre').value = producto.nombre;
            document.getElementById('precio').value = producto.precio;
            document.getElementById('stock').value = producto.stock;
            
            // Hacer scroll al formulario
            document.getElementById('codigo').focus();
            document.getElementById('codigo').scrollIntoView({ behavior: 'smooth' });
            
            alert(`✏️ Editando: ${producto.nombre}`);
        }
    } catch (error) {
        console.error('Error editando producto:', error);
        alert('Error al cargar producto para editar');
    }
};

window.eliminarProducto = async (codigo) => {
    if (!verificarAdmin()) return;
    
    if (!confirm(`¿Está seguro de eliminar el producto ${codigo}?`)) return;
    
    try {
        await supabaseFetch(`productos?codigo=eq.${codigo}`, 'DELETE');
        alert('✅ Producto eliminado');
        await mostrarProductos();
    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        alert('Error al eliminar producto');
    }
};

/* ---------- VENTAS ---------- */
async function vender() {
    if (!productoVenta) {
        alert("Primero busque un producto");
        return;
    }
    
    const precioVenta = parseFloat(document.getElementById('precioVenta').value);
    
    if (!precioVenta || precioVenta <= 0) {
        alert("Ingrese un precio válido");
        return;
    }
    
    if (productoVenta.stock <= 0) {
        alert("No hay stock disponible");
        return;
    }
    
    try {
        // 1. Registrar la venta
        const venta = {
            producto: productoVenta.nombre,
            codigo: productoVenta.codigo,
            precio: precioVenta
        };
        
        await supabaseFetch('ventas', 'POST', venta);
        
        // 2. Actualizar stock
        const nuevoStock = productoVenta.stock - 1;
        await supabaseFetch(`productos?id=eq.${productoVenta.id}`, 'PATCH', { 
            stock: nuevoStock 
        });
        
        alert('✅ Venta registrada exitosamente');
        
        // 3. Limpiar y actualizar
        limpiarVenta();
        await mostrarProductos();
        await mostrarVentas();
        
    } catch (error) {
        console.error('❌ Error registrando venta:', error);
        alert('Error al registrar la venta');
    }
}

/* ---------- HISTORIAL ---------- */
async function mostrarVentas() {
    try {
        // Obtener ventas del día actual
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventas = await supabaseFetch(`ventas?created_at=gte.${hoy.toISOString()}`);
        ventasGlobales = ventas || [];
        
        const historial = document.getElementById('historial');
        if (!historial) return;
        
        historial.innerHTML = '';
        
        if (ventasGlobales.length === 0) {
            historial.innerHTML = `
                <li class="list-group-item text-center text-muted">
                    No hay ventas registradas hoy
                </li>`;
        } else {
            let total = 0;
            
            ventasGlobales.forEach(v => {
                const fecha = new Date(v.created_at);
                const hora = fecha.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                historial.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small">${hora}</span>
                            <span class="ms-2 fw-bold">${v.producto}</span>
                            <small class="text-muted ms-2">(${v.codigo})</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="fw-bold me-3">S/ ${v.precio.toFixed(2)}</span>
                            <button class="btn btn-outline-danger btn-sm" onclick="eliminarVenta(${v.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </li>`;
                
                total += v.precio;
            });
            
            // Actualizar total
            const totalElement = document.getElementById('total');
            if (totalElement) {
                totalElement.textContent = total.toFixed(2);
            }
        }
        
        updateStats();
        
    } catch (error) {
        console.error('❌ Error cargando ventas:', error);
    }
}

window.eliminarVenta = async (id) => {
    if (!verificarAdmin()) return;
    
    if (!confirm('¿Está seguro de eliminar esta venta?')) return;
    
    try {
        await supabaseFetch(`ventas?id=eq.${id}`, 'DELETE');
        alert('✅ Venta eliminada');
        await mostrarVentas();
    } catch (error) {
        console.error('❌ Error eliminando venta:', error);
        alert('Error al eliminar venta');
    }
};

window.limpiarHistorial = async () => {
    if (!verificarAdmin()) return;
    
    if (!confirm('¿Está seguro de cerrar el día? Esto eliminará todas las ventas de hoy.')) return;
    
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        await supabaseFetch(`ventas?created_at=gte.${hoy.toISOString()}`, 'DELETE');
        alert('✅ Día cerrado exitosamente');
        await mostrarVentas();
    } catch (error) {
        console.error('❌ Error cerrando día:', error);
        alert('Error al cerrar el día');
    }
};

/* ---------- PDF ---------- */
window.exportarPDF = () => {
    if (!verificarAdmin()) return;
    
    if (ventasGlobales.length === 0) {
        alert('No hay ventas para exportar');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    // Título
    pdf.setFontSize(18);
    pdf.text("REPORTE DIARIO DE VENTAS", 20, 20);
    
    // Fecha
    pdf.setFontSize(12);
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
    
    // Tabla de ventas
    let y = 50;
    pdf.setFontSize(10);
    
    // Encabezado
    pdf.text("Hora", 20, y);
    pdf.text("Producto", 50, y);
    pdf.text("Código", 120, y);
    pdf.text("Precio", 160, y);
    y += 10;
    
    // Línea
    pdf.line(20, y, 190, y);
    y += 5;
    
    // Datos
    ventasGlobales.forEach(v => {
        const fecha = new Date(v.created_at);
        const hora = fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        pdf.text(hora, 20, y);
        pdf.text(v.producto.substring(0, 30), 50, y);
        pdf.text(v.codigo, 120, y);
        pdf.text(`S/ ${v.precio.toFixed(2)}`, 160, y);
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
    const total = ventasGlobales.reduce((sum, v) => sum + v.precio, 0);
    pdf.text(`TOTAL VENTAS: S/ ${total.toFixed(2)}`, 120, y);
    
    // Guardar
    const nombreArchivo = `ventas_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nombreArchivo);
};

/* ---------- UTILIDADES ---------- */
function updateStats() {
    // Productos
    const totalProducts = productosGlobales.length;
    const lowStock = productosGlobales.filter(p => p.stock < 5).length;
    
    // Ventas
    const totalSales = ventasGlobales.length;
    const totalAmount = ventasGlobales.reduce((sum, v) => sum + v.precio, 0);
    
    // Actualizar UI
    const elements = {
        'totalProducts': totalProducts,
        'totalSales': totalSales,
        'totalAmount': totalAmount.toFixed(2),
        'lowStock': lowStock,
        'lastUpdate': new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('es-ES', options);
    }
}

function verificarAdmin() {
    const clave = prompt("Ingrese la clave de administrador:");
    if (clave === CLAVE_ADMIN) {
        return true;
    } else {
        alert("❌ Clave incorrecta");
        return false;
    }
}

function limpiarCampos() {
    document.getElementById('codigo').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('stock').value = '';
}

function limpiarVenta() {
    productoVenta = null;
    document.getElementById('codigoVenta').value = '';
    document.getElementById('ventaNombre').textContent = '---';
    document.getElementById('precioVenta').value = '';
    document.getElementById('ventaStock').textContent = '0 unidades';
    document.getElementById('ventaStock').className = 'badge bg-danger';
    
    // Volver a enfocar el campo de búsqueda
    document.getElementById('codigoVenta').focus();
}

function filtrarProductos(termino) {
    const tablaProductos = document.getElementById('tablaProductos');
    if (!tablaProductos) return;
    
    const terminoLower = termino.toLowerCase().trim();
    
    if (!terminoLower) {
        mostrarProductos();
        return;
    }
    
    const productosFiltrados = productosGlobales.filter(p => 
        p.codigo.toLowerCase().includes(terminoLower) ||
        p.nombre.toLowerCase().includes(terminoLower)
    );
    
    tablaProductos.innerHTML = '';
    
    if (productosFiltrados.length === 0) {
        tablaProductos.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    No se encontraron productos
                </td>
            </tr>`;
        return;
    }
    
    productosFiltrados.forEach(p => {
        const stockClass = p.stock < 5 ? "badge bg-danger" : 
                          p.stock < 10 ? "badge bg-warning" : "badge bg-success";
        
        tablaProductos.innerHTML += `
            <tr>
                <td class="fw-bold">${p.codigo}</td>
                <td>${p.nombre}</td>
                <td class="fw-bold">S/ ${p.precio.toFixed(2)}</td>
                <td><span class="${stockClass}">${p.stock} unidades</span></td>
                <td class="action-buttons">
                    <button class="btn btn-warning btn-sm" onclick="editarProducto('${p.codigo}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.codigo}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// Exportar funciones al ámbito global
window.guardarProducto = guardarProducto;
window.vender = vender;
window.buscarProductoVenta = buscarProductoVenta;
window.mostrarProductos = mostrarProductos;
window.mostrarVentas = mostrarVentas;
window.updateStats = updateStats;
