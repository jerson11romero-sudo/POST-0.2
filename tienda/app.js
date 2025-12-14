import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "PEGA_TU_URL_SUPABASE";
const supabaseKey = "PEGA_TU_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

const CLAVE_ADMIN = "romero123";
let productoVenta = null;

/* ---------- PRODUCTOS ---------- */
async function guardarProducto() {
  const producto = {
    codigo: codigo.value,
    nombre: nombre.value,
    precio: Number(precio.value),
    stock: Number(stock.value)
  };

  await supabase.from("productos").upsert(producto, { onConflict: "codigo" });
  limpiarCampos();
  mostrarProductos();
}

window.editarProducto = async (cod) => {
  const { data } = await supabase.from("productos").select("*").eq("codigo", cod).single();
  codigo.value = data.codigo;
  nombre.value = data.nombre;
  precio.value = data.precio;
  stock.value = data.stock;
};

window.eliminarProducto = async (cod) => {
  if (!verificarAdmin()) return;
  await supabase.from("productos").delete().eq("codigo", cod);
  mostrarProductos();
};

async function mostrarProductos() {
  const { data } = await supabase.from("productos").select("*");
  tablaProductos.innerHTML = "";
  data.forEach(p => {
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

/* ---------- VENTAS ---------- */
codigoVenta.addEventListener("keyup", e => {
  if (e.key === "Enter") buscarProductoVenta();
});

async function buscarProductoVenta() {
  const { data } = await supabase
    .from("productos")
    .select("*")
    .eq("codigo", codigoVenta.value)
    .single();

  if (!data) return alert("No encontrado");

  productoVenta = data;
  ventaNombre.textContent = data.nombre;
  precioVenta.value = data.precio;
  ventaStock.textContent = data.stock;
}

async function vender() {
  if (!productoVenta || productoVenta.stock <= 0) return;

  await supabase.from("ventas").insert({
    producto: productoVenta.nombre,
    precio: Number(precioVenta.value)
  });

  await supabase
    .from("productos")
    .update({ stock: productoVenta.stock - 1 })
    .eq("id", productoVenta.id);

  limpiarVenta();
  mostrarProductos();
  mostrarVentas();
}

/* ---------- HISTORIAL ---------- */
async function mostrarVentas() {
  const { data } = await supabase.from("ventas").select("*").order("created_at", { ascending: false });
  historial.innerHTML = "";
  let suma = 0;

  data.forEach(v => {
    historial.innerHTML += `
      <li class="list-group-item d-flex justify-content-between">
        ${new Date(v.created_at).toLocaleString()} - ${v.producto} - S/ ${v.precio}
        <button class="btn btn-danger btn-sm" onclick="eliminarVenta(${v.id})">❌</button>
      </li>`;
    suma += v.precio;
  });

  total.textContent = suma.toFixed(2);
}

window.eliminarVenta = async (id) => {
  if (!verificarAdmin()) return;
  await supabase.from("ventas").delete().eq("id", id);
  mostrarVentas();
};

window.limpiarHistorial = async () => {
  if (!verificarAdmin()) return;
  await supabase.from("ventas").delete().neq("id", 0);
  mostrarVentas();
};

/* ---------- PDF ---------- */
window.exportarPDF = () => {
  if (!verificarAdmin()) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text("REPORTE DIARIO", 10, 10);
  pdf.text("Total: S/ " + total.textContent, 10, 20);
  pdf.save("ventas.pdf");
};

/* ---------- UTIL ---------- */
function verificarAdmin() {
  return prompt("Clave admin") === CLAVE_ADMIN;
}

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

mostrarProductos();
mostrarVentas();
  
