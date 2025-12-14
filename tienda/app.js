 // app.js CORREGIDO - Funciona AHORA
const SUPABASE_URL = 'https://rezmgikurtxaaweipyvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlem1naWt1cnR4YWF3ZWlweXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3Mzc0OTYsImV4cCI6MjA4MTMxMzQ5Nn0.A0GJcGIanUC1ZUq-NQqUJZJ0YTCr2lQ4UYdot6SYjgM';

// Headers para todas las solicitudes
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

let productosGlobales = [];
let ventasGlobales = [];
let productoVenta = null;
const CLAVE_ADMIN = "romero123";

// Función para hacer solicitudes a Supabase
async function supabaseFetch(endpoint, method = 'GET', data = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  
  const options = {
    method,
    headers: { ...headers },
    body: data ? JSON.stringify(data) : null
  };
  
  try {
    console.log(`📡 Enviando ${method} a ${endpoint}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    if (response.status === 204 || method === 'DELETE') {
      return null;
    }
    
    const result = await response.json();
    console.log(`✅ ${method} exitoso:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error en supabaseFetch:', error);
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
    
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando app:', error);
    mostrarMensajeError('No se pudo conectar con la base de datos');
  }
}

function setupEventListeners() {
  // Buscar producto en venta
  const codigoVenta = document.getElementById('codigoVenta');
  if (codigoVenta) {
    codigoVenta.addEventListener('keyup', e => {
      if (e.key === 'Enter') buscarProductoVenta();
    });
  }
  
  // Buscar en inventario
  const searchInventory = document.getElementById('searchInventory');
  if (searchInventory) {
    searchInventory.addEventListener('input', (e) => {
      filtrarProductos(e.target.value);
    });
  }
  
  // Guardar producto
  const btnGuardar = document.querySelector('button[onclick="guardarProducto()"]');
  if (btnGuardar) {
    btnGuardar.onclick = guardarProducto;
  }
  
  // Vender
  const btnVender = document.querySelector('button[onclick="vender()"]');
  if (btnVender) {
    btnVender.onclick = vender;
  }
}

/* ---------- PRODUCTOS ---------- */
async function guardarProducto() {
  const codigo = document.getElementById('codigo')?.value.trim();
  const nombre = document.getElementById('nombre')?.value.trim();
  const precio = parseFloat(document.getElementById('precio')?.value);
  const stock = parseInt(document.getElementById('stock')?.value);
  
  // Validaciones
  if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
    mostrarMensajeError('Por favor complete todos los campos correctamente');
    return;
  }
  
  const producto = {
    codigo: codigo,
    nombre: nombre,
    precio: precio,
    stock: stock
  };
  
  try {
    // Upsert: Actualiza si existe, inserta si no
    await supabaseFetch('productos?on_conflict=codigo', 'POST', producto);
    
    mostrarMensajeExito('✅ Producto guardado exitosamente');
    limpiarCampos();
    await mostrarProductos();
  } catch (error) {
    mostrarMensajeError('Error al guardar producto: ' + error.message);
  }
}

async function mostrarProductos() {
  try {
    console.log('📦 Cargando productos...');
    const productos = await supabaseFetch('productos?select=*&order=nombre.asc');
    productosGlobales = productos || [];
    
    const tablaProductos = document.getElementById('tablaProductos');
    if (!tablaProductos) return;
    
    tablaProductos.innerHTML = '';
    
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
    
    updateStats();
    document.getElementById('productCount').textContent = 
      `Mostrando ${productosGlobales.length} productos`;
      
  } catch (error) {
    console.error('Error cargando productos:', error);
    mostrarMensajeError('No se pudieron cargar los productos');
  }
}

// Función editar producto
window.editarProducto = async (codigo) => {
  try {
    const producto = productosGlobales.find(p => p.codigo === codigo);
    if (producto) {
      document.getElementById('codigo').value = producto.codigo;
      document.getElementById('nombre').value = producto.nombre;
      document.getElementById('precio').value = producto.precio;
      document.getElementById('stock').value = producto.stock;
      
      // Scroll a la sección de productos
      document.getElementById('codigo').focus();
      mostrarMensajeInfo(`Editando: ${producto.nombre}`);
    }
  } catch (error) {
    mostrarMensajeError('Error al cargar producto');
  }
};

// Función eliminar producto
window.eliminarProducto = async (codigo) => {
  if (!verificarAdmin()) return;
  
  if (!confirm(`¿Está seguro de eliminar el producto ${codigo}?`)) return;
  
  try {
    await supabaseFetch(`productos?codigo=eq.${codigo}`, 'DELETE');
    mostrarMensajeExito('✅ Producto eliminado');
    await mostrarProductos();
  } catch (error) {
    mostrarMensajeError('Error al eliminar producto');
  }
};

/* ---------- VENTAS ---------- */
async function buscarProductoVenta() {
  const codigo = document.getElementById('codigoVenta')?.value.trim();
  if (!codigo) return;
  
  try {
    const productos = await supabaseFetch(`productos?codigo=eq.${codigo}&select=*`);
    const producto = productos?.[0];
    
    if (producto) {
      productoVenta = producto;
      document.getElementById('ventaNombre').textContent = producto.nombre;
      document.getElementById('precioVenta').value = producto.precio;
      
      const stockBadge = document.getElementById('ventaStock');
      stockBadge.textContent = `${producto.stock} unidades`;
      stockBadge.className = producto.stock <= 0 ? "badge bg-danger" : 
                            producto.stock < 5 ? "badge bg-warning" : "badge bg-success";
      
      mostrarMensajeInfo(`Producto encontrado: ${producto.nombre}`);
    } else {
      mostrarMensajeError('❌ Producto no encontrado');
      limpiarVenta();
    }
  } catch (error) {
    mostrarMensajeError('Error buscando producto');
    limpiarVenta();
  }
}

async function vender() {
  if (!productoVenta) {
    mostrarMensajeError('Primero busque un producto');
    return;
  }
  
  const precioVenta = parseFloat(document.getElementById('precioVenta')?.value);
  if (!precioVenta || precioVenta <= 0) {
    mostrarMensajeError('Ingrese un precio válido');
    return;
  }
  
  if (productoVenta.stock <= 0) {
    mostrarMensajeError('No hay stock disponible');
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
    
    // 2. Actualizar stock del producto
    const nuevoStock = productoVenta.stock - 1;
    await supabaseFetch(`productos?id=eq.${productoVenta.id}`, 'PATCH', { stock: nuevoStock });
    
    mostrarMensajeExito('✅ Venta registrada exitosamente');
    limpiarVenta();
    await mostrarProductos();
    await mostrarVentas();
    
  } catch (error) {
    mostrarMensajeError('Error registrando venta: ' + error.message);
  }
}

/* ---------- HISTORIAL ---------- */
async function mostrarVentas() {
  try {
    // Obtener ventas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ventas = await supabaseFetch(`ventas?created_at=gte.${hoy.toISOString()}&order=created_at.desc`);
    ventasGlobales = ventas || [];
    
    const historial = document.getElementById('historial');
    if (!historial) return;
    
    historial.innerHTML = '';
    
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
      const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
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
    await supabaseFetch(`ventas?id=eq.${id}`, 'DELETE');
    mostrarMensajeExito('✅ Venta eliminada');
    await mostrarVentas();
  } catch (error) {
    mostrarMensajeError('Error eliminando venta');
  }
};

window.limpiarHistorial = async () => {
  if (!verificarAdmin()) return;
  
  if (!confirm('¿Está seguro de cerrar el día? Esto eliminará todas las ventas de hoy.')) return;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    await supabaseFetch(`ventas?created_at=gte.${hoy.toISOString()}`, 'DELETE');
    mostrarMensajeExito('✅ Día cerrado exitosamente');
    await mostrarVentas();
  } catch (error) {
    mostrarMensajeError('Error cerrando el día');
  }
};

window.exportarPDF = () => {
  if (!verificarAdmin()) return;
  
  if (ventasGlobales.length === 0) {
    mostrarMensajeError('No hay ventas para exportar');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  
  // Contenido del PDF (mantén tu código actual)
  // ... (tu código de exportarPDF)
  
  pdf.save(`ventas_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ---------- UTILIDADES ---------- */
function updateStats() {
  const totalProducts = productosGlobales.length;
  const lowStock = productosGlobales.filter(p => p.stock < 5).length;
  const totalSales = ventasGlobales.length;
  const totalAmount = ventasGlobales.reduce((sum, v) => sum + v.precio, 0);
  
  // Actualizar UI
  const elements = {
    'totalProducts': totalProducts,
    'totalSales': totalSales,
    'totalAmount': totalAmount.toFixed(2),
    'lowStock': lowStock,
    'lastUpdate': new Date().toLocaleTimeString('es-ES')
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('es-ES', options);
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
  ['codigo', 'nombre', 'precio', 'stock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function limpiarVenta() {
  productoVenta = null;
  document.getElementById('codigoVenta').value = '';
  document.getElementById('ventaNombre').textContent = '---';
  document.getElementById('precioVenta').value = '';
  const stockBadge = document.getElementById('ventaStock');
  stockBadge.textContent = '0 unidades';
  stockBadge.className = 'badge bg-danger';
}

function filtrarProductos(termino) {
  const tablaProductos = document.getElementById('tablaProductos');
  if (!tablaProductos) return;
  
  const terminoLower = termino.toLowerCase();
  const filtrados = productosGlobales.filter(p => 
    p.codigo.toLowerCase().includes(terminoLower) ||
    p.nombre.toLowerCase().includes(terminoLower)
  );
  
  tablaProductos.innerHTML = '';
  
  if (filtrados.length === 0) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          No se encontraron productos
        </td>
      </tr>`;
    return;
  }
  
  filtrados.forEach(p => {
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

// Funciones para mostrar mensajes
function mostrarMensajeExito(mensaje) {
  alert(mensaje);
}

function mostrarMensajeError(mensaje) {
  alert(mensaje);
}

function mostrarMensajeInfo(mensaje) {
  console.log('ℹ️ ' + mensaje);
}

// Exportar funciones globales
window.guardarProducto = guardarProducto;
window.vender = vender;
window.buscarProductoVenta = buscarProductoVenta;
window.mostrarProductos = mostrarProductos;
window.mostrarVentas = mostrarVentas;
window.updateStats = updateStats;

