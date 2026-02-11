
const inputs = {
    nombre: document.getElementById("nombre"),
    precio: document.getElementById("precio"),
    publico: document.getElementById("publico"),
    categoria: document.getElementById("categoria"),
    descripcion: document.getElementById("descripcion"),
    imagenes: document.getElementById("imagenes")
};

const preview = {
    img: document.getElementById("previewImg"),
    titulo: document.getElementById("previewTitulo"),
    precio: document.getElementById("previewPrecio"),
    miniaturas: document.getElementById("previewMiniaturas")
};

const jsonOutput = document.getElementById("jsonOutput");
const loginOverlay = document.getElementById("loginOverlay");
const adminContainer = document.getElementById("adminContainer");
const loginBtn = document.getElementById("loginBtn");
const adminLista = document.getElementById("adminLista");
const DRIVE_HOST = "https://drive.google.com";

function checkAuth() {
    const ok = localStorage.getItem("adminAuth") === "1";
    if (ok) {
        if (loginOverlay) loginOverlay.style.display = "none";
        if (adminContainer) adminContainer.style.display = "block";
    } else {
        if (loginOverlay) loginOverlay.style.display = "flex";
        if (adminContainer) adminContainer.style.display = "none";
    }
}
checkAuth();
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        const u = document.getElementById("adminUser").value.trim();
        const p = document.getElementById("adminPass").value.trim();
        if (u === "tienda" && p === "tienda123") {
            localStorage.setItem("adminAuth", "1");
            checkAuth();
        } else {
            alert("Credenciales inválidas");
        }
    });
}
// Listeners para actualizar preview en tiempo real
let productosData = [];

function cargarProductosAdmin() {
  const url = `data/productos.json?v=${Date.now()}`;

  fetch(url, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("Error al cargar JSON");
      return r.json();
    })
    .then(d => {
      productosData = Array.isArray(d) ? d : [];
      // Sincronizar caché local
      localStorage.setItem("productos_cache", JSON.stringify(productosData));
      console.log("Admin: Datos cargados desde JSON");
      renderAdminLista();
    })
    .catch(err => {
      console.warn("Admin: Falló fetch, usando fallback de caché", err);
      try {
        const raw = localStorage.getItem("productos_cache");
        productosData = raw ? JSON.parse(raw) : [];
      } catch {
        productosData = [];
      }
      renderAdminLista();
    });
}


function renderAdminLista() {
    if (!adminLista) return;
    adminLista.innerHTML = "";
    
    if (productosData.length === 0) {
        adminLista.innerHTML = '<p style="text-align: center; color: var(--color-muted); padding: 40px 20px;">No hay productos aún. Crea uno nuevo arriba.</p>';
        return;
    }
    
    productosData.forEach((p, i) => {
        const row = document.createElement("div");
        row.className = "admin-producto-item";
        row.innerHTML = `
            <div class="admin-producto-header">
                <div>
                    <h4>${p.nombre}</h4>
                    <small style="color: var(--color-muted);">${p.categoria} • ${p.publico}</small>
                </div>
                <p>$${p.precio.toLocaleString()}</p>
            </div>
            
            <div class="admin-producto-fields">
                <input type="text" value="${p.nombre}" id="edit-nombre-${i}" placeholder="Nombre del producto">
                <input type="number" value="${p.precio}" id="edit-precio-${i}" placeholder="Precio" min="0" step="100">
                <select id="edit-publico-${i}">
                    <option value="hombre" ${p.publico==='hombre'?'selected':''}>👨 Hombre</option>
                    <option value="mujer" ${p.publico==='mujer'?'selected':''}>👩 Mujer</option>
                    <option value="niño" ${p.publico==='niño'?'selected':''}>👧 Niño</option>
                </select>
                <select id="edit-categoria-${i}">
                    <option value="remeras" ${p.categoria==='remeras'?'selected':''}>👕 Remeras</option>
                    <option value="pantalones" ${p.categoria==='pantalones'?'selected':''}>👖 Pantalones</option>
                    <option value="buzos" ${p.categoria==='buzos'?'selected':''}>🧥 Buzos</option>
                    <option value="calzado" ${p.categoria==='calzado'?'selected':''}>👟 Calzado</option>
                    <option value="accesorios" ${p.categoria==='accesorios'?'selected':''}>⌚ Accesorios</option>
                </select>
                <textarea id="edit-descripcion-${i}" placeholder="Descripción del producto">${p.descripcion||''}</textarea>
                <textarea id="edit-imagenes-${i}" placeholder="URLs de imágenes (separadas por comas)">${(p.imagenes||[]).join(", ")}</textarea>
            </div>
            
            <div class="admin-buttons">
                <button class="btn-update" id="btn-update-${i}">
                    <i class="fas fa-save"></i> Actualizar
                </button>
                <button class="btn-delete" id="btn-delete-${i}">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        adminLista.appendChild(row);
        
        const bU = row.querySelector(`#btn-update-${i}`);
        const bD = row.querySelector(`#btn-delete-${i}`);
        
        bU.addEventListener("click", async () => {
            const nuevoNombre = row.querySelector(`#edit-nombre-${i}`).value.trim();
            const nuevoPrecio = parseFloat(row.querySelector(`#edit-precio-${i}`).value.trim());
            const nuevoPublico = row.querySelector(`#edit-publico-${i}`).value.trim();
            const nuevaCategoria = row.querySelector(`#edit-categoria-${i}`).value.trim();
            const imagenesRaw = row.querySelector(`#edit-imagenes-${i}`).value.trim();
            const nuevaDescripcion = row.querySelector(`#edit-descripcion-${i}`).value.trim();
            const nuevasImagenes = imagenesRaw
                .split(",")
                .map(u => u.trim())
                .filter(u => u)
                .map(normalizeImageUrl);
            
            if (!nuevoNombre || isNaN(nuevoPrecio)) {
                showToast("⚠️ Nombre y precio son obligatorios");
                return;
            }
            
            productosData[i].nombre = nuevoNombre;
            productosData[i].precio = nuevoPrecio;
            productosData[i].publico = nuevoPublico;
            productosData[i].categoria = nuevaCategoria;
            productosData[i].imagenes = nuevasImagenes.length ? nuevasImagenes : productosData[i].imagenes || [];
            productosData[i].descripcion = nuevaDescripcion;
            
            // Actualizar caché temporal para UI inmediata
            localStorage.setItem("productos_cache", JSON.stringify(productosData));
            
            // Persistir en GitHub (Fuente de verdad)
            const success = await saveToGitHub(productosData);
            
            if (success) {
                localStorage.removeItem("productos_cache");
                showToast("✓ Guardado y publicado en GitHub");
            } else {
                showToast("⚠️ Error al publicar, guardado solo localmente");
            }
            
            renderAdminLista();
        });
        
        bD.addEventListener("click", async () => {
            if (confirm(`¿Eliminar "${p.nombre}"?`)) {
                productosData.splice(i, 1);
                
                // Actualizar caché temporal
                localStorage.setItem("productos_cache", JSON.stringify(productosData));
                
                // Persistir en GitHub
                const success = await saveToGitHub(productosData);
                
                if (success) {
                    localStorage.removeItem("productos_cache");
                    showToast("✓ Eliminado y publicado en GitHub");
                } else {
                    showToast("⚠️ Error al publicar la eliminación");
                }
                
                renderAdminLista();
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", cargarProductosAdmin);
// Listeners para actualizar preview en tiempo real
Object.values(inputs).forEach(input => {
    input.addEventListener("input", actualizarPreview);
});

function actualizarPreview() {
    const nombre = inputs.nombre.value || "Nombre del Producto";
    const precio = inputs.precio.value || "0";
    const imgs = inputs.imagenes.value
        .split(",")
        .map(url => url.trim())
        .filter(url => url !== "")
        .map(normalizeImageUrl);
    
    // Actualizar textos
    preview.titulo.textContent = nombre;
    preview.precio.textContent = `$${parseInt(precio).toLocaleString()}`;

    // Actualizar imagen principal
    if (imgs.length > 0) {
        preview.img.src = imgs[0];
    } else {
        preview.img.src = "https://via.placeholder.com/300x300?text=Sin+Imagen";
    }

    // Actualizar miniaturas
    preview.miniaturas.innerHTML = "";
    if (imgs.length > 1) {
        imgs.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.style.cursor = "pointer";
            img.title = "Click para ver imagen principal";
            img.onclick = () => preview.img.src = url;
            preview.miniaturas.appendChild(img);
        });
    }
}

async function guardar() {
    // Validar campos
    for (const key in inputs) {
        if (!inputs[key].value.trim()) {
            showToast(` Completa el campo: ${key}`);
            inputs[key].focus();
            return;
        }
    }

    const producto = {
        nombre: inputs.nombre.value.trim(),
        precio: parseFloat(inputs.precio.value),
        publico: inputs.publico.value,
        categoria: inputs.categoria.value,
        descripcion: inputs.descripcion.value.trim(),
        imagenes: inputs.imagenes.value
            .split(",")
            .map(url => url.trim())
            .filter(url => url !== "")
            .map(normalizeImageUrl)
    };

    try {
        // Obtener productos actuales (priorizar productosData ya cargado)
        if (!Array.isArray(productosData)) productosData = [];
        
        // Agregar nuevo producto
        productosData.push(producto);
        
        // Actualizar caché temporal para UI inmediata
        localStorage.setItem("productos_cache", JSON.stringify(productosData));
        
        // Persistir en GitHub (Fuente de verdad)
        const success = await saveToGitHub(productosData);
        
        if (success) {
            localStorage.removeItem("productos_cache");
            showToast(`✓ "${producto.nombre}" publicado en GitHub`);
        } else {
            showToast("⚠️ Guardado localmente, error al publicar");
        }
        
        // Actualizar lista y limpiar formulario
        renderAdminLista();
        document.getElementById("formProducto").reset();
        actualizarPreview();
        
    } catch (e) {
        showToast("❌ Error al procesar el producto");
        console.error(e);
    }
}

function normalizeImageUrl(url) {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
        if (url.startsWith(DRIVE_HOST)) {
            const direct = driveToDirect(url);
            return direct || url;
        }
        return url;
    }
    return url;
}

function driveToDirect(url) {
    try {
        const u = new URL(url);
        if (u.hostname !== "drive.google.com") return null;

        if (u.pathname.startsWith("/file/d/")) {
            const id = u.pathname.split("/")[3];
            if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
        }

        if (u.pathname === "/open" && u.searchParams.get("id")) {
            const id = u.searchParams.get("id");
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }

        if (u.pathname.startsWith("/uc") && u.searchParams.get("id")) {
            const id = u.searchParams.get("id");
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    } catch (e) {}
    return null;
}

function copiarJSON() {
    const texto = jsonOutput.textContent;
    navigator.clipboard.writeText(texto).then(() => {
        showToast("✓ JSON copiado al portapapeles");
    }).catch(err => {
        showToast("❌ Error al copiar");
        console.error("Error al copiar: ", err);
    });
}
