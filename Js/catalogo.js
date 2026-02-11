let productos = [];

const contenedor = document.getElementById("contenedorProductos");
const filtros = document.querySelectorAll(".filtro-grupo input");

async function cargarProductos() {
    const url = `data/productos.json?v=${Date.now()}`;

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        productos = Array.isArray(data) ? data : [];
        // Guardar SOLO como caché de respaldo
        localStorage.setItem("productos_cache", JSON.stringify(productos));
        console.log("Catálogo cargado desde JSON (Fuente de verdad)");
    } catch (e) {
        console.warn("Error al cargar JSON, usando fallback de caché:", e);
        try {
            const raw = localStorage.getItem("productos_cache");
            const cache = raw ? JSON.parse(raw) : [];
            productos = Array.isArray(cache) ? cache : [];
        } catch {
            productos = [];
        }
    }

    mostrarProductos();
}


function mostrarProductos() {
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const activos = Array.from(filtros)
        .filter(f => f.checked)
        .map(f => f.value);

    const filtrados = productos.filter(p => {
        if (activos.length === 0) return true;
        return activos.includes(p.publico) || activos.includes(p.categoria);
    });

    if (filtrados.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center; width:100%; color:var(--color-muted); padding:40px 20px;'>No se encontraron productos con estos filtros.</p>";
        return;
    }

    filtrados.forEach((p, i) => {
        const imagenes = Array.isArray(p.imagenes) ? p.imagenes.filter(Boolean) : [];
        const imgPrincipal = imagenes[0] || "https://via.placeholder.com/300x300?text=Sin+Imagen";
        const precio = Number(p.precio) || 0;
        const desc = (p.descripcion || "").replace(/"/g, "&quot;");

        contenedor.innerHTML += `
        <div class="producto" style="animation: fadeIn 0.5s ease backwards ${i * 0.05}s">
            <div class="img-container">
                <img id="img-${i}" src="${imgPrincipal}" alt="${p.nombre || "Producto"}" loading="lazy">
            </div>
            <div class="miniaturas">
                ${imagenes.map(img =>
                    `<img src="${img}" onclick="cambiarImagen('img-${i}','${img}')" alt="miniatura" title="Ver imagen">`
                ).join("")}
            </div>
            <h4>${p.nombre || "Producto"}</h4>
            <p class="precio">$${precio.toLocaleString()}</p>
            <button class="btn-shop btn-add" data-name="${p.nombre || "Producto"}" data-precio="${precio}" data-img="${imgPrincipal}" data-desc="${desc}">
                Agregar al carrito
            </button>
        </div>
        `;
    });

    document.querySelectorAll(".btn-add").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof addToCart !== "function") {
                alert("Carrito no disponible");
                return;
            }
            const name = btn.dataset.name;
            const precio = parseFloat(btn.dataset.precio);
            const img = btn.dataset.img;
            const descripcion = btn.dataset.desc || "";
            addToCart({ nombre: name, precio: precio, img: img, descripcion: descripcion });
        });
    });
}

filtros.forEach(f => f.addEventListener("change", mostrarProductos));

function cambiarImagen(id, src) {
    const img = document.getElementById(id);
    if (img) {
        img.src = src;
    }
}

document.addEventListener("DOMContentLoaded", cargarProductos);
