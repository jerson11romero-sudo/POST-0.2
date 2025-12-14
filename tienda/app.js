 const CLAVE_ADMIN = "romero123";

let productos = JSON.parse(localStorage.getItem("productos")) || [];
let ventas = JSON.parse(localStorage.getItem("ventas")) || [];
let productoVenta = null;

/* ---------- PRODUCTOS ---------- */
function guardarProducto() {
  let cod = codigo.value;
  let p = productos.find(x => x.codigo === cod);

  if (p) {
    p.nombre = nombre.value;
    p.precio = Number(precio.value);
    p.stock = Number(stock.value);
  } else {
    productos.push({
      codigo: cod,
      nombre: nombre.value,
      precio: Number(precio.value),
      stock: Number(stock.value)
    });
  }

  localStorage.setItem("productos", JSON.stringify(productos));
  limpiarCampos();
  mostrarProductos();
}

function editarProducto(cod) {
  let p = productos.find(x => x.codigo === cod);
  codigo.value = p.codigo;
  nombre.value = p.nombre;
  precio.value = p.precio;
  stock.value = p.stock;
}

function eliminarProducto(cod) {
  if (!verificarAdmin()) return;
  productos = productos.filter(p => p.codigo !== cod);
  localStorage.setItem("productos", JSON.stringify(productos));
  mostrarProductos();
}

/* ---------- VENTAS ---------- */
codigoVenta.addEventListener("keyup", e => {
  if (e.key === "Enter") buscarProductoVenta();
});

function buscarProductoVenta() {
  productoVenta = productos.find(p => p.codigo === codigoVenta.value);
  if (!productoVenta) return alert("Producto no encontrado");

  ventaNombre.textContent = productoVenta.nombre;
  precioVenta.value = productoVenta.precio;
  ventaStock.textContent = productoVenta.stock;
}

function vender() {
  if (!productoVenta || productoVenta.stock <= 0) return;

  productoVenta.stock--;

  ventas.push({
    producto: productoVenta.nombre,
    precio: Number(precioVenta.value),
    fecha: new Date().toLocaleString()
  });

  localStorage.setItem("productos", JSON.stringify(productos));
  localStorage.setItem("ventas", JSON.stringify(ventas));

  limpiarVenta();
  mostrarProductos();
  mostrarVentas();
}

/* ---------- HISTORIAL ---------- */
function mostrarVentas() {
  historial.innerHTML = "";
  let suma = 0;

  ventas.forEach((v, i) => {
    historial.innerHTML += `
      <li class="list-group-item d-flex justify-content-between">
        ${v.fecha} - ${v.producto} - S/ ${v.precio}
        <button class="btn btn-sm btn-danger" onclick="eliminarVenta(${i})">❌</button>
      </li>`;
    suma += v.precio;
  });

  total.textContent = suma.toFixed(2);
}

function eliminarVenta(index) {
  if (!verificarAdmin()) return;
  ventas.splice(index, 1);
  localStorage.setItem("ventas", JSON.stringify(ventas));
  mostrarVentas();
}

function limpiarHistorial() {
  if (!verificarAdmin()) return;
  if (!confirm("¿Cerrar el día y borrar historial?")) return;
  ventas = [];
  localStorage.removeItem("ventas");
  mostrarVentas();
}

/* ---------- PDF ---------- */
function exportarPDF() {
  if (!verificarAdmin()) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.text("REPORTE DIARIO DE VENTAS", 10, 10);
  let y = 20;
  let totalDia = 0;

  ventas.forEach(v => {
    pdf.text(`${v.fecha} - ${v.producto} - S/ ${v.precio}`, 10, y);
    totalDia += v.precio;
    y += 8;
  });

  pdf.text(`TOTAL: S/ ${totalDia.toFixed(2)}`, 10, y + 10);
  pdf.save("reporte_ventas.pdf");
}

/* ---------- ADMIN ---------- */
function verificarAdmin() {
  let pass = prompt("Contraseña de administrador:");
  return pass === CLAVE_ADMIN;
}

/* ---------- UTIL ---------- */
function limpiarCampos() {
  codigo.value = nombre.value = precio.value = stock.value = "";
}

function limpiarVenta() {
  codigoVenta.value = "";
  ventaNombre.textContent = "---";
  precioVenta.value = "";
  ventaStock.textContent = "0";
  productoVenta = null;
}

function mostrarProductos() {
  tablaProductos.innerHTML = "";
  productos.forEach(p => {
    tablaProductos.innerHTML += `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.nombre}</td>
        <td>S/ ${p.precio}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editarProducto('${p.codigo}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.codigo}')">🗑</button>
        </td>
      </tr>`;
  });
}

mostrarProductos();
mostrarVentas();
