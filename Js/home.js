(() => {
  const grid = document.getElementById("novedadesGrid");
  if (!grid) return;

  function getSbClient() {
    if (window.sb) return window.sb;

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return null;
    }

    const url = "https://bqkxxonbsezfesozeahy.supabase.co";
    const key = "sb_publishable_OPjczO2zdR00Mc6dF7xRnQ_CBCyCtit";
    window.sb = window.supabase.createClient(url, key);
    return window.sb;
  }

  function getProductImage(product) {
    const imgs = Array.isArray(product.imagenes) ? product.imagenes.filter(Boolean) : [];
    return imgs[0] || product.imagen_url || "https://placehold.co/600x600?text=Sin+Imagen";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderEmpty(message) {
    grid.innerHTML = `<div class="novedades-empty">${message}</div>`;
  }

  function renderProducts(products) {
    if (!products.length) {
      renderEmpty("Sin productos por el momento.");
      return;
    }

    grid.innerHTML = products
      .map((p) => {
        const nombre = escapeHtml(p.nombre || "Producto");
        const precio = Number(p.precio || 0);
        const img = escapeHtml(getProductImage(p));

        return `
          <article class="novedad-card">
            <div class="novedad-img">
              <img src="${img}" alt="${nombre}" loading="lazy">
            </div>
            <div class="novedad-body">
              <h4>${nombre}</h4>
              <p class="precio">$${precio.toLocaleString("es-AR")}</p>
              <a href="catalogo.html" class="btn-shop">Ver en catalogo</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadNovedades() {
    const sb = getSbClient();
    if (!sb) {
      renderEmpty("No se pudo conectar con productos.");
      return;
    }

    try {
      const { data, error } = await sb
        .from("productos")
        .select("id,nombre,precio,imagenes,imagen_url,activo,created_at")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      renderProducts(data || []);
    } catch (err) {
      console.error("Error cargando novedades:", err);
      renderEmpty("Sin productos disponibles.");
    }
  }

  loadNovedades();
})();
