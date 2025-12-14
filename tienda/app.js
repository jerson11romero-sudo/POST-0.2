import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuración Supabase (REEMPLAZA CON TUS DATOS)
const supabaseUrl = "https://rezmgikurtxaaweipyvh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlem1naWt1cnR4YWF3ZWlweXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3Mzc0OTYsImV4cCI6MjA4MTMxMzQ5Nn0.A0GJcGIanUC1ZUq-NQqUJZJ0YTCr2lQ4UYdot6SYjgM";
const supabase = createClient(supabaseUrl, supabaseKey);

const CLAVE_ADMIN = "romero123";
let productoVenta = null;
let productosGlobales = [];
let ventasGlobales = [];

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    mostrarProductos();
    mostrarVentas();
    setupEventListeners();
    updateStats();
    updateDateTime();
});

function setupEventListeners() {
    // Buscar producto al presionar Enter
    document.getElementById('codigoVenta').addEventListener('keyup', e => {
        if (e.key === 'Enter') buscarProductoVenta();
    });
    
    // Buscar en inventario
    document.getElementById('searchInventory').addEventListener('input', (e) => {
        filtrarProductos(e.target.value);
    });
}

/* ---------- PRODUCTOS ---------- */
async function guardarProducto() {
    const codigo = document.getElementById('codigo').value;
    const nombre = document.getElementById('nombre').value;
    const precio = parseFloat(document.getElementById('precio').value);
    const stock = parseInt(document.getElementById('stock').value);
    
    if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
        alert('Por favor complete todos los campos correctamente');
        return;
    }
    
    const producto = {
        codigo: codigo,
        nombre: nombre,
        precio: precio,
        stock: stock,
        updated_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase.from("productos").upsert(producto, { 
            onConflict: "codigo" 
        });
        
        if (error) throw error;
        
        limpiarCampos();
        await mostrarProductos();
        alert('Producto guardado exitosamente');
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error al guardar producto');
    }
}

window.editarProducto = async (cod) => {
    try {
        const { data, error } = await supabase
            .from("productos")
            .select("*")
            .eq("codigo", cod)
            .single();
            
        if (error) throw error;
        
        document.getElementById('codigo').value = data.codigo;
        document.getElementById('nombre').value = data.nombre;
        document.getElementById('precio').value = data.precio;
        document.getElementById('stock').value = data.stock;
        
        // Scroll a la sección de productos
        document.getElementById('codigo').focus();
    } catch (error) {
        console.error('Error editando producto:', error);
        alert('Error al cargar producto');
    }
};

window.eliminarProducto = async (cod) => {
    if (!verificarAdmin()) return;
    
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    try {
        const { error } = await supabase
            .from("productos")
            .delete()
            .eq("codigo", cod);
            
        if (error) throw error;
        
        await mostrarProductos();
        alert('Producto eliminado');
    } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar producto');
    }
};

async function mostrarProductos() {
    try {
        const { data, error } = await supabase
            .from("productos")
            .select("*")
            .order("nombre", { ascending: true });
            
        if (error) throw error;
        
        productosGlobales = data || [];
        const tablaProductos = document.getElementById('tablaProductos');
        tablaProductos.innerHTML = "";
        
        if (productosGlobales.length === 0) {
            tablaProductos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        No hay productos registrados
                    </td>
                </tr>`;
            updateStats();
            return;
        }
        
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
        
        updateStats();
        document.getElementById('productCount').textContent = 
            `Mostrando ${productosGlobales.length} productos`;
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function filtrarProductos(termino) {
    const tablaProductos = document.getElementById('tablaProductos');
    const terminoLower = termino.toLowerCase();
    
    if (!termino) {
        mostrarProductos();
        return;
    }
    
    const productosFiltrados = productosGlobales.filter(p => 
        p.codigo.toLowerCase().includes(terminoLower) ||
        p.nombre.toLowerCase().includes(terminoLower)
    );
    
    tablaProductos.innerHTML = "";
    
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

/* ---------- VENTAS ---------- */
async function buscarProductoVenta() {
    const codigo = document.getElementById('codigoVenta').value;
    if (!codigo) return;
    
    try {
        const { data, error } = await supabase
            .from("productos")
            .select("*")
            .eq("codigo", codigo)
            .single();
            
        if (error) throw error;
        
        productoVenta = data;
        document.getElementById('ventaNombre').textContent = data.nombre;
        document.getElementById('precioVenta').value = data.precio;
        document.getElementById('ventaStock').textContent = `${data.stock} unidades`;
        document.getElementById('ventaStock').className = 
            data.stock <= 0 ? "badge bg-danger" : 
            data.stock < 5 ? "badge bg-warning" : "badge bg-success";
            
    } catch (error) {
        productoVenta = null;
        document.getElementById('ventaNombre').textContent = "---";
        document.getElementById('precioVenta').value = "";
        document.getElementById('ventaStock').textContent = "0 unidades";
        document.getElementById('ventaStock').className = "badge bg-danger";
        alert("Producto no encontrado");
    }
}

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
        // Registrar la venta
        const { error: ventaError } = await supabase
            .from("ventas")
            .insert({
                producto: productoVenta.nombre,
                codigo: productoVenta.codigo,
                precio: precioVenta,
                created_at: new Date().toISOString()
            });
            
        if (ventaError) throw ventaError;
        
        // Actualizar stock
        const nuevoStock = productoVenta.stock - 1;
        const { error: stockError } = await supabase
            .from("productos")
            .update({ stock: nuevoStock })
            .eq("id", productoVenta.id);
            
        if (stockError) throw stockError;
        
        alert("Venta registrada exitosamente");
        limpiarVenta();
        await mostrarProductos();
        await mostrarVentas();
        
    } catch (error) {
        console.error('Error registrando venta:', error);
        alert("Error al registrar la venta");
    }
}

/* ---------- HISTORIAL ---------- */
async function mostrarVentas() {
    try {
        // Obtener ventas de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const { data, error } = await supabase
            .from("ventas")
            .select("*")
            .gte("created_at", hoy.toISOString())
            .order("created_at", { ascending: false });
            
        if (error) throw error;
        
        ventasGlobales = data || [];
        const historial = document.getElementById('historial');
        historial.innerHTML = "";
        
        if (ventasGlobales.length === 0) {
            historial.innerHTML = `
                <li class="list-group-item text-center text-muted">
                    No hay ventas registradas hoy
                </li>`;
            updateStats();
            return;
        }
        
        let suma = 0;
        
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
            suma += v.precio;
        });
        
        document.getElementById('total').textContent = suma.toFixed(2);
        updateStats();
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

window.eliminarVenta = async (id) => {
    if (!verificarAdmin()) return;
    
    if (!confirm('¿Está seguro de eliminar esta venta?')) return;
    
    try {
        const { error } = await supabase
            .from("ventas")
            .delete()
            .eq("id", id);
            
        if (error) throw error;
        
        await mostrarVentas();
        alert('Venta eliminada');
    } catch (error) {
        console.error('Error eliminando venta:', error);
        alert('Error al eliminar venta');
    }
};

window.limpiarHistorial = async () => {
    if (!verificarAdmin()) return;
    
    if (!confirm('¿Está seguro de cerrar el día? Esto eliminará todas las ventas de hoy.')) return;
    
    try {
        // Obtener ventas de hoy para eliminarlas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const { error } = await supabase
            .from("ventas")
            .delete()
            .gte("created_at", hoy.toISOString());
            
        if (error) throw error;
        
        await mostrarVentas();
        alert('Día cerrado exitosamente');
    } catch (error) {
        console.error('Error cerrando día:', error);
        alert('Error al cerrar el día');
    }
};

/* ---------- PDF ---------- */
window.exportarPDF = () => {
    if (!verificarAdmin()) return;
    
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
        
        // Nueva página si se necesita
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
    
    // Ventas de hoy
    const totalSales = ventasGlobales.length;
    const totalAmount = ventasGlobales.reduce((sum, v) => sum + v.precio, 0);
    
    // Actualizar UI
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('totalAmount').textContent = totalAmount.toFixed(2);
    document.getElementById('lowStock').textContent = lowStock;
    
    // Actualizar última actualización
    document.getElementById('lastUpdate').textContent = 
        new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
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
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('es-ES', options);
}

function verificarAdmin() {
    const clave = prompt("Ingrese la clave de administrador:");
    if (clave === CLAVE_ADMIN) {
        return true;
    } else {
        alert("Clave incorrecta");
        return false;
    }
}

function limpiarCampos() {
    document.getElementById('codigo').value = "";
    document.getElementById('nombre').value = "";
    document.getElementById('precio').value = "";
    document.getElementById('stock').value = "";
}

function limpiarVenta() {
    document.getElementById('codigoVenta').value = "";
    document.getElementById('ventaNombre').textContent = "---";
    document.getElementById('precioVenta').value = "";
    document.getElementById('ventaStock').textContent = "0 unidades";
    document.getElementById('ventaStock').className = "badge bg-danger";
    productoVenta = null;
    document.getElementById('codigoVenta').focus();
}

// Exportar funciones globales
window.guardarProducto = guardarProducto;
window.vender = vender;
window.buscarProductoVenta = buscarProductoVenta;
window.mostrarProductos = mostrarProductos;
window.mostrarVentas = mostrarVentas;
window.updateStats = updateStats;
