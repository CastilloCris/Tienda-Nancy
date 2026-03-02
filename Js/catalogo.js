﻿let productos = [];

const contenedor = document.getElementById("contenedorProductos");
const filtros = document.querySelectorAll(".filtro-grupo input");

function notifyStockError(message) {
  if (typeof showToast === "function") {
    showToast(message);
  } else {
    alert(message);
  }
}

function getQtyInCart(productId) {
  if (!productId) return 0;

  if (typeof window.getCartQuantityByProductId === "function") {
    return window.getCartQuantityByProductId(productId);
  }

  try {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    return stored.reduce((acc, item) => {
      const id = item.id || item.product_id;
      const qty = Number(item.qty || item.quantity || 0);
      return String(id) === String(productId) ? acc + qty : acc;
    }, 0);
  } catch (err) {
    console.error("No se pudo leer carrito para validar stock:", err);
    return 0;
  }
}

// ===== CARGAR DESDE SUPABASE =====
async function cargarProductos() {
  try {
    const { data, error } = await sb
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando productos:", error);
      contenedor.innerHTML = "<p style='text-align:center;color:red;'>Error cargando productos.</p>";
      return;
    }

    productos = data || [];
    mostrarProductos();
  } catch (err) {
    console.error("Error inesperado:", err);
  }
}

// ===== RENDER =====
function mostrarProductos() {
  if (!contenedor) return;

  contenedor.innerHTML = "";

  const activos = Array.from(filtros)
    .filter((f) => f.checked)
    .map((f) => f.value);

  const filtrados = productos.filter((p) => {
    if (activos.length === 0) return true;
    return activos.includes(p.publico) || activos.includes(p.categoria);
  });

  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <p style='text-align:center; width:100%; color:var(--color-muted); padding:40px 20px;'>
        No se encontraron productos con estos filtros.
      </p>`;
    return;
  }

  filtrados.forEach((p, i) => {
    const imagenes = Array.isArray(p.imagenes) && p.imagenes.length
      ? p.imagenes
      : p.imagen_url
      ? [p.imagen_url]
      : [];

    const imgPrincipal = imagenes[0] || "https://placehold.co/300x300?text=Sin+Imagen";

    const precio = Number(p.precio) || 0;
    const desc = (p.descripcion || "").replace(/"/g, "&quot;");
    const stock = Math.max(0, Number(p.stock) || 0);
    const sinStock = stock <= 0;

    contenedor.innerHTML += `
      <div class="producto" style="animation: fadeIn 0.5s ease backwards ${i * 0.05}s">
        <div class="img-container">
          <img id="img-${i}" src="${imgPrincipal}" alt="${p.nombre || "Producto"}" loading="lazy">
        </div>

        <div class="miniaturas">
          ${imagenes
            .map((img) => `<img src="${img}" onclick="cambiarImagen('img-${i}','${img}')" alt="miniatura">`)
            .join("")}
        </div>

        <h4>${p.nombre || "Producto"}</h4>
        <p class="precio">$${precio.toLocaleString("es-AR")}</p>
        <p class="stock" style="margin:.25rem 0 .75rem; font-weight:600; color:${sinStock ? "#c0392b" : "inherit"};">
          ${sinStock ? "Sin stock" : `Stock: ${stock}`}
        </p>

        <button class="btn-shop btn-add" ${sinStock ? "disabled" : ""}
          data-id="${p.id || ""}"
          data-stock="${stock}"
          data-name="${p.nombre || "Producto"}"
          data-precio="${precio}"
          data-img="${imgPrincipal}"
          data-desc="${desc}">
          ${sinStock ? "Sin stock" : "Agregar al carrito"}
        </button>
      </div>
    `;
  });

  document.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;

      if (typeof addToCart !== "function") {
        alert("Carrito no disponible");
        return;
      }

      const productId = btn.dataset.id;
      const producto = productos.find((p) => String(p.id) === String(productId));
      const stockActual = Math.max(0, Number(producto?.stock ?? btn.dataset.stock) || 0);
      const qtyEnCarrito = getQtyInCart(productId);

      if (qtyEnCarrito >= stockActual) {
        notifyStockError("No hay stock suficiente");
        return;
      }

      addToCart({
        id: productId,
        nombre: btn.dataset.name,
        precio: parseFloat(btn.dataset.precio),
        img: btn.dataset.img,
        descripcion: btn.dataset.desc,
        stock: stockActual
      });
    });
  });
}

filtros.forEach((f) => f.addEventListener("change", mostrarProductos));

function cambiarImagen(id, src) {
  const img = document.getElementById(id);
  if (img) img.src = src;
}

window.cargarProductos = cargarProductos;
document.addEventListener("DOMContentLoaded", cargarProductos);
