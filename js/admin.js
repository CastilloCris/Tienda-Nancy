﻿(() => {
  function initAdmin() {
    const loginOverlay = document.getElementById("loginOverlay");
    const adminContainer = document.getElementById("adminContainer");
    if (!loginOverlay || !adminContainer) {
      console.warn("admin.js: no es la pagina admin. Abortando init.");
      return;
    }

    const sb = window.sb;
    if (!sb) {
      console.warn("admin.js: window.sb no esta disponible. Abortando init.");
      return;
    }

    const $ = (id) => document.getElementById(id);

    const loginBtn = $("loginBtn");
    const userInput = $("adminUser");
    const passInput = $("adminPass");

    const formProducto = $("formProducto");
    const nombre = $("nombre");
    const precio = $("precio");
    const stock = $("stock");
    const publico = $("publico");
    const categoria = $("categoria");
    const descripcion = $("descripcion");
    const imagenes = $("imagenes");

    const previewImg = $("previewImg");
    const previewMiniaturas = $("previewMiniaturas");
    const previewTitulo = $("previewTitulo");
    const previewPrecio = $("previewPrecio");
    const previewStock = $("previewStock");

    const adminLista = $("adminLista");
    const pedidosLista = $("pedidosLista");
    const pedidoDetalle = $("pedidoDetalle");
    const adminSidebar = $("adminSidebar");
    const adminSidebarToggle = $("adminSidebarToggle");
    const adminSidebarOverlay = $("adminSidebarOverlay");
    const kpiVentasHoy = $("kpiVentasHoy");
    const kpiVentas7Dias = $("kpiVentas7Dias");
    const kpiPendientes = $("kpiPendientes");
    const kpiStockBajo = $("kpiStockBajo");
    const topProductos30 = $("topProductos30");
    const stockBajoLista = $("stockBajoLista");
    const manualProductoSelect = $("manualProductoSelect");
    const manualQty = $("manualQty");
    const btnManualAgregarItem = $("btnManualAgregarItem");
    const manualProductoInfo = $("manualProductoInfo");
    const manualItemsList = $("manualItemsList");
    const manualTotal = $("manualTotal");
    const manualPaymentMethod = $("manualPaymentMethod");
    const manualCustomerName = $("manualCustomerName");
    const manualCustomerPhone = $("manualCustomerPhone");
    const manualNotes = $("manualNotes");
    const btnRegistrarVentaManual = $("btnRegistrarVentaManual");
    const manualSaleResult = $("manualSaleResult");

    const STOCK_BAJO = 3;
    const VIEW_STORAGE_KEY = "admin_view";
    const DEFAULT_VIEW = "view-dashboard";
    const AVAILABLE_VIEWS = ["view-dashboard", "view-agregar", "view-catalogo", "view-pedidos", "view-venta-manual"];
    let navInitialized = false;
    let manualSaleInitialized = false;
    let manualProductos = [];
    let manualItems = [];

    function looksLikeEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function parseImagenes(text) {
      return String(text || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function moneyARS(value) {
      const n = Number(value || 0);
      return `$${n.toLocaleString("es-AR")}`;
    }

    function formatDateTime(value) {
      if (!value) return "-";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString("es-AR");
    }

    function setText(el, value) {
      if (el) el.textContent = value;
    }

    function setHTML(el, value) {
      if (el) el.innerHTML = value;
    }

    function isMobileAdmin() {
      return window.matchMedia("(max-width: 768px)").matches;
    }

    function setSidebarOpen(open) {
      if (!adminSidebar || !adminSidebarOverlay) return;
      adminSidebar.classList.toggle("open", open);
      adminSidebarOverlay.classList.toggle("show", open);
      if (adminSidebarToggle) {
        adminSidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }

    function showView(viewId, opts = {}) {
      const { persist = true, closeSidebar = true } = opts;
      const targetView = AVAILABLE_VIEWS.includes(viewId) ? viewId : DEFAULT_VIEW;
      const viewNodes = adminContainer.querySelectorAll(".admin-view");
      const navNodes = adminContainer.querySelectorAll(".admin-nav-btn");

      viewNodes.forEach((view) => {
        const active = view.id === targetView;
        view.classList.toggle("active", active);
        view.style.display = active ? "block" : "none";
      });

      navNodes.forEach((btn) => {
        const active = btn.getAttribute("data-view") === targetView;
        btn.classList.toggle("active", active);
      });

      if (persist) {
        localStorage.setItem(VIEW_STORAGE_KEY, targetView);
      }

      if (closeSidebar && isMobileAdmin()) {
        setSidebarOpen(false);
      }

      if (targetView === "view-venta-manual") {
        void cargarProductosVentaManual();
      }
    }

    function initViewNavigation() {
      if (navInitialized) return;
      navInitialized = true;

      adminContainer.querySelectorAll(".admin-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const viewId = btn.getAttribute("data-view");
          showView(viewId);
        });
      });

      if (adminSidebarToggle) {
        adminSidebarToggle.addEventListener("click", () => {
          const willOpen = !adminSidebar?.classList.contains("open");
          setSidebarOpen(Boolean(willOpen));
        });
      }

      if (adminSidebarOverlay) {
        adminSidebarOverlay.addEventListener("click", () => {
          setSidebarOpen(false);
        });
      }

      window.addEventListener("resize", () => {
        if (!isMobileAdmin()) {
          setSidebarOpen(false);
        }
      });
    }

    function toSafeStock(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return 0;
      if (n <= 0) return 0;
      return Math.floor(n);
    }

    async function requireAuthOrRedirect() {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        console.warn("No logueado");
      }
    }

    async function refreshAuthUI() {
      const { data } = await sb.auth.getSession();
      const session = data.session;

      if (session) {
        loginOverlay.style.display = "none";
        adminContainer.style.display = "block";
        initViewNavigation();
        initManualSale();
        await renderAdminLista();
        await renderPedidos();
        await cargarMetricasDashboard();
        const savedView = localStorage.getItem(VIEW_STORAGE_KEY) || DEFAULT_VIEW;
        showView(savedView, { persist: false, closeSidebar: false });
      } else {
        loginOverlay.style.display = "flex";
        adminContainer.style.display = "none";
        setSidebarOpen(false);
      }
    }

    async function handleLogin() {
      const email = (userInput.value || "").trim();
      const password = passInput.value || "";

      if (!looksLikeEmail(email)) {
        alert("Usa un email valido (Supabase Auth funciona con email/contrasena).");
        return;
      }
      if (password.length < 6) {
        alert("La contrasena debe tener al menos 6 caracteres.");
        return;
      }

      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        console.error(error);
        alert("Login fallo: " + error.message);
        return;
      }

      await refreshAuthUI();
    }

    async function listarProductosAdmin() {
      const { data, error } = await sb
        .from("productos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }

    async function insertProducto(payload) {
      const { data, error } = await sb
        .from("productos")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    async function updateProducto(id, cambios) {
      const { data, error } = await sb
        .from("productos")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    async function updateProductoStock(id, nuevoStock) {
      const { error } = await sb
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", id);

      if (error) throw error;
    }

    async function deleteProducto(id) {
      const { error } = await sb.from("productos").delete().eq("id", id);
      if (error) throw error;
    }

    async function listarPedidos() {
      const { data, error } = await sb
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }

    async function listarPedidoItems(pedidoId) {
      const { data, error } = await sb
        .from("pedido_items")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    }

    async function setPedidoStatus(pedidoId, newStatus) {
      const { data, error } = await sb.rpc("set_order_status", {
        p_pedido_id: pedidoId,
        p_new_status: newStatus,
      });

      if (error) throw error;
      return data;
    }

    async function deletePedidoSafe(pedidoId) {
      const { data, error } = await sb.rpc("delete_order_safe", {
        p_pedido_id: pedidoId,
      });

      if (error) throw error;
      return data;
    }

    function sumPedidosTotals(rows) {
      return (rows || []).reduce((acc, row) => acc + Number(row.total || 0), 0);
    }

    function parseRpcPedidoId(result) {
      if (Array.isArray(result)) {
        return result[0]?.pedido_id || result[0]?.id || result[0] || null;
      }
      return result?.pedido_id || result?.id || result || null;
    }

    function getManualItemById(productId) {
      return manualItems.find((it) => String(it.id) === String(productId));
    }

    function getManualQtyInCart(productId) {
      const item = getManualItemById(productId);
      return Number(item?.qty || 0);
    }

    function renderManualItems() {
      if (!manualItemsList || !manualTotal) return;

      if (!manualItems.length) {
        manualItemsList.innerHTML = "Sin items agregados.";
        manualTotal.textContent = "$0";
        return;
      }

      const rows = manualItems
        .map((item) => {
          const subtotal = Number(item.precio || 0) * Number(item.qty || 0);
          return `
            <div class="manual-sale-row">
              <div>
                <strong>${escapeHtml(item.nombre || "Producto")}</strong><br>
                <small>${item.qty.toLocaleString("es-AR")} x $${Number(item.precio || 0).toLocaleString("es-AR")}</small>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;">$${subtotal.toLocaleString("es-AR")}</div>
                <button type="button" class="btn-delete btn-manual-remove" data-id="${item.id}" style="padding:4px 10px; min-width:auto;">Quitar</button>
              </div>
            </div>
          `;
        })
        .join("");

      const total = manualItems.reduce((acc, item) => acc + (Number(item.precio || 0) * Number(item.qty || 0)), 0);
      manualItemsList.innerHTML = rows;
      manualTotal.textContent = `$${total.toLocaleString("es-AR")}`;
    }

    function renderManualProductoInfo() {
      if (!manualProductoInfo) return;
      const productId = manualProductoSelect?.value;
      const producto = manualProductos.find((p) => String(p.id) === String(productId));
      if (!producto) {
        manualProductoInfo.textContent = "Precio: $0 · Stock: 0";
        return;
      }

      manualProductoInfo.textContent = `Precio: $${Number(producto.precio || 0).toLocaleString("es-AR")} · Stock: ${Number(producto.stock || 0).toLocaleString("es-AR")}`;
    }

    async function cargarProductosVentaManual() {
      if (!manualProductoSelect) return;

      try {
        const { data, error } = await sb
          .from("productos")
          .select("id,nombre,precio,stock")
          .eq("activo", true)
          .order("nombre", { ascending: true });

        if (error) throw error;

        manualProductos = (data || []).map((p) => ({
          id: p.id,
          nombre: p.nombre || "Producto",
          precio: Number(p.precio || 0),
          stock: Number(p.stock || 0),
        }));

        manualProductoSelect.innerHTML = manualProductos
          .map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)} · $${p.precio.toLocaleString("es-AR")} · Stock: ${p.stock.toLocaleString("es-AR")}</option>`)
          .join("");
        renderManualProductoInfo();
      } catch (e) {
        console.error("Error cargando productos para venta manual:", e);
        manualProductos = [];
        manualProductoSelect.innerHTML = "";
        renderManualProductoInfo();
      }
    }

    function agregarManualItem() {
      const productoId = manualProductoSelect?.value;
      const qtyValue = Number(manualQty?.value || 0);

      if (!productoId) {
        alert("Selecciona un producto.");
        return;
      }

      if (!Number.isFinite(qtyValue) || qtyValue <= 0 || !Number.isInteger(qtyValue)) {
        alert("La cantidad debe ser un entero mayor a 0.");
        return;
      }

      const producto = manualProductos.find((p) => String(p.id) === String(productoId));
      if (!producto) {
        alert("Producto no encontrado.");
        return;
      }

      const qtyActual = getManualQtyInCart(productoId);
      const qtyFinal = qtyActual + qtyValue;
      if (qtyFinal > Number(producto.stock || 0)) {
        alert("No hay stock suficiente para esa cantidad.");
        return;
      }

      const existente = getManualItemById(productoId);
      if (existente) {
        existente.qty = qtyFinal;
      } else {
        manualItems.push({
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio || 0),
          stock: Number(producto.stock || 0),
          qty: qtyValue,
        });
      }

      if (manualQty) manualQty.value = "1";
      renderManualItems();
      if (manualSaleResult) manualSaleResult.textContent = "";
    }

    function limpiarVentaManual() {
      manualItems = [];
      if (manualCustomerName) manualCustomerName.value = "";
      if (manualCustomerPhone) manualCustomerPhone.value = "";
      if (manualNotes) manualNotes.value = "";
      if (manualPaymentMethod) manualPaymentMethod.value = "efectivo";
      if (manualQty) manualQty.value = "1";
      renderManualItems();
    }

    async function registrarVentaManual() {
      if (!manualItems.length) {
        alert("Agrega al menos un item.");
        return;
      }

      const itemsJson = manualItems.map((it) => ({
        id: it.id,
        qty: Number(it.qty || 0),
      }));

      const invalidItem = itemsJson.find((it) => !it.id || it.qty <= 0);
      if (invalidItem) {
        alert("Hay items inválidos en la venta.");
        return;
      }

      try {
        const { data, error } = await sb.rpc("create_manual_sale", {
          p_customer_name: (manualCustomerName?.value || "").trim() || null,
          p_customer_phone: (manualCustomerPhone?.value || "").trim() || null,
          p_payment_method: (manualPaymentMethod?.value || "").trim() || "efectivo",
          p_notes: (manualNotes?.value || "").trim() || null,
          p_items: itemsJson,
        });

        if (error) {
          console.error("Error registrando venta manual:", error);
          if (manualSaleResult) {
            manualSaleResult.textContent = "No se pudo registrar la venta. Verifica stock/disponibilidad.";
            manualSaleResult.style.color = "#d32f2f";
          }
          alert("No se pudo registrar la venta. Verifica stock/disponibilidad.");
          return;
        }

        const pedidoId = parseRpcPedidoId(data);
        if (manualSaleResult) {
          manualSaleResult.textContent = `Venta registrada. Pedido ID: ${pedidoId || "N/D"}`;
          manualSaleResult.style.color = "var(--color-accent)";
        }
        alert(`Venta registrada. Pedido ID: ${pedidoId || "N/D"}`);
        limpiarVentaManual();
        await cargarProductosVentaManual();
        await renderAdminLista();
        await renderPedidos();
        await cargarMetricasDashboard();
      } catch (e) {
        console.error("Error inesperado en venta manual:", e);
        if (manualSaleResult) {
          manualSaleResult.textContent = "Error al registrar la venta manual.";
          manualSaleResult.style.color = "#d32f2f";
        }
        alert("Error al registrar la venta manual.");
      }
    }

    function initManualSale() {
      if (manualSaleInitialized) return;
      manualSaleInitialized = true;

      if (btnManualAgregarItem) {
        btnManualAgregarItem.addEventListener("click", agregarManualItem);
      }

      if (manualProductoSelect) {
        manualProductoSelect.addEventListener("change", renderManualProductoInfo);
      }

      if (manualItemsList) {
        manualItemsList.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (!target.classList.contains("btn-manual-remove")) return;

          const productId = target.getAttribute("data-id");
          manualItems = manualItems.filter((it) => String(it.id) !== String(productId));
          renderManualItems();
        });
      }

      if (btnRegistrarVentaManual) {
        btnRegistrarVentaManual.addEventListener("click", async () => {
          await registrarVentaManual();
        });
      }

      renderManualItems();
    }

    function renderTopProductos(topRows) {
      if (!topProductos30) return;
      if (!topRows.length) {
        topProductos30.textContent = "Sin datos";
        return;
      }

      topProductos30.innerHTML = topRows
        .map((row) => {
          return `
            <div class="dashboard-row">
              <span>${escapeHtml(row.nombre)}</span>
              <strong>${row.qty.toLocaleString("es-AR")}</strong>
            </div>
          `;
        })
        .join("");
    }

    function renderStockBajoLista(rows) {
      if (!stockBajoLista) return;
      if (!rows.length) {
        stockBajoLista.textContent = "Sin datos";
        return;
      }

      stockBajoLista.innerHTML = rows
        .map((row) => {
          const stockValue = Number(row.stock || 0);
          return `
            <div class="dashboard-row">
              <span>${escapeHtml(row.nombre || "Producto")}</span>
              <strong>${stockValue.toLocaleString("es-AR")}</strong>
            </div>
          `;
        })
        .join("");
    }

    async function cargarMetricasDashboard() {
      if (!kpiVentasHoy && !kpiVentas7Dias && !kpiPendientes && !kpiStockBajo) return;

      setText(kpiVentasHoy, "—");
      setText(kpiVentas7Dias, "—");
      setText(kpiPendientes, "—");
      setText(kpiStockBajo, "—");
      setHTML(topProductos30, "Sin datos");
      setHTML(stockBajoLista, "Sin datos");

      const now = new Date();
      const inicioDia = new Date(now);
      inicioDia.setHours(0, 0, 0, 0);

      const desde7Dias = new Date(now);
      desde7Dias.setDate(desde7Dias.getDate() - 7);

      const desde30Dias = new Date(now);
      desde30Dias.setDate(desde30Dias.getDate() - 30);

      try {
        const [
          ventasHoyRes,
          ventas7Res,
          pendientesRes,
          stockBajoCountRes,
          pedidos30Res,
          stockBajoListaRes,
        ] = await Promise.all([
          sb.from("pedidos").select("total").eq("status", "confirmado").gte("created_at", inicioDia.toISOString()),
          sb.from("pedidos").select("total").eq("status", "confirmado").gte("created_at", desde7Dias.toISOString()),
          sb.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
          sb.from("productos").select("id", { count: "exact", head: true }).eq("activo", true).lte("stock", STOCK_BAJO),
          sb.from("pedidos").select("id").eq("status", "confirmado").gte("created_at", desde30Dias.toISOString()),
          sb.from("productos").select("id,nombre,stock").eq("activo", true).lte("stock", STOCK_BAJO).order("stock", { ascending: true }).order("nombre", { ascending: true }),
        ]);

        if (ventasHoyRes.error) throw ventasHoyRes.error;
        if (ventas7Res.error) throw ventas7Res.error;
        if (pendientesRes.error) throw pendientesRes.error;
        if (stockBajoCountRes.error) throw stockBajoCountRes.error;
        if (pedidos30Res.error) throw pedidos30Res.error;
        if (stockBajoListaRes.error) throw stockBajoListaRes.error;

        const ventasHoy = sumPedidosTotals(ventasHoyRes.data || []);
        const ventas7 = sumPedidosTotals(ventas7Res.data || []);
        const pendientes = Number(pendientesRes.count || 0);
        const lowStockCount = Number(stockBajoCountRes.count || 0);

        setText(kpiVentasHoy, `$${ventasHoy.toLocaleString("es-AR")}`);
        setText(kpiVentas7Dias, `$${ventas7.toLocaleString("es-AR")}`);
        setText(kpiPendientes, pendientes.toLocaleString("es-AR"));
        setText(kpiStockBajo, lowStockCount.toLocaleString("es-AR"));

        renderStockBajoLista(stockBajoListaRes.data || []);

        const pedidosIds = (pedidos30Res.data || []).map((p) => p.id).filter(Boolean);
        if (!pedidosIds.length) {
          renderTopProductos([]);
          return;
        }

        const { data: items30, error: items30Error } = await sb
          .from("pedido_items")
          .select("producto_id,nombre,qty,pedido_id")
          .in("pedido_id", pedidosIds);

        if (items30Error) throw items30Error;

        const grouped = new Map();
        (items30 || []).forEach((item) => {
          const key = item.producto_id || item.nombre || "sin-id";
          const prev = grouped.get(key) || { nombre: item.nombre || "Producto", qty: 0 };
          prev.qty += Number(item.qty || 0);
          if (!prev.nombre && item.nombre) prev.nombre = item.nombre;
          grouped.set(key, prev);
        });

        const top = Array.from(grouped.values())
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);

        renderTopProductos(top);
      } catch (e) {
        console.error("Error cargando métricas dashboard:", e);
        setText(kpiVentasHoy, "—");
        setText(kpiVentas7Dias, "—");
        setText(kpiPendientes, "0");
        setText(kpiStockBajo, "0");
        renderTopProductos([]);
        renderStockBajoLista([]);
      }
    }

    function orderStatusOptions(current) {
      const list = ["pendiente", "confirmado", "cancelado"];
      return list
        .map((value) => {
          const sel = value === String(current || "").toLowerCase() ? "selected" : "";
          const label = value.charAt(0).toUpperCase() + value.slice(1);
          return `<option value="${value}" ${sel}>${label}</option>`;
        })
        .join("");
    }

    function pedidoCardHTML(p) {
      const total = Number(p.total ?? p.total_amount ?? 0);
      const status = String(p.status || "pendiente").toLowerCase();
      const customerName = p.customer_name ? ` · ${escapeHtml(p.customer_name)}` : "";

      return `
        <div class="order-item" data-order-id="${p.id}">
          <div class="order-item-head">
            <strong>#${escapeHtml(p.id || "-")}</strong>
            <span>${moneyARS(total)}</span>
          </div>
          <small>${formatDateTime(p.created_at)}${customerName}</small>
          <div class="order-status">
            <select class="o-status">${orderStatusOptions(status)}</select>
            <button type="button" class="btn-update o-status-save">Actualizar estado</button>
            <button type="button" class="btn-update o-view-items">Ver items</button>
            <button type="button" class="btn-delete o-delete-order"><i class="fas fa-trash"></i> Eliminar</button>
          </div>
        </div>
      `;
    }

    function pedidoItemsHTML(items) {
      if (!items.length) {
        return `<div>No hay items para este pedido.</div>`;
      }

      const rows = items
        .map((it) => {
          const qty = Number(it.qty || 0);
          const precio = Number(it.precio || 0);
          const subtotal = precio * qty;
          const name = it.nombre || it.producto_id || it.product_id || "Producto";
          return `
            <div style="padding:8px 0; border-bottom:1px solid var(--border-color);">
              <div><strong>${escapeHtml(String(name))}</strong></div>
              <small>Cant: ${qty.toLocaleString("es-AR")} · Unit: $${precio.toLocaleString("es-AR")} · Subtotal: $${subtotal.toLocaleString("es-AR")}</small>
            </div>
          `;
        })
        .join("");

      return rows;
    }

    async function renderPedidos() {
      if (!pedidosLista) return;

      pedidosLista.innerHTML = `<div style="opacity:.8;">Cargando pedidos...</div>`;
      try {
        const pedidos = await listarPedidos();
        if (!pedidos.length) {
          pedidosLista.innerHTML = `<div style="opacity:.8;">No hay pedidos todavia.</div>`;
          if (pedidoDetalle) {
            pedidoDetalle.textContent = "Selecciona un pedido para ver sus items.";
          }
          return;
        }

        pedidosLista.innerHTML = pedidos.map(pedidoCardHTML).join("");
        bindPedidosActions();
      } catch (e) {
        console.error(e);
        pedidosLista.innerHTML = `<div style="color:#d32f2f;">Error cargando pedidos: ${escapeHtml(e.message)}</div>`;
      }
    }

    function bindPedidosActions() {
      if (!pedidosLista) return;

      pedidosLista.querySelectorAll(".order-item").forEach((card) => {
        const pedidoId = card.getAttribute("data-order-id");
        const statusSelect = card.querySelector(".o-status");
        const btnSaveStatus = card.querySelector(".o-status-save");
        const btnViewItems = card.querySelector(".o-view-items");
        const btnDeleteOrder = card.querySelector(".o-delete-order");

        if (btnSaveStatus && statusSelect) {
          btnSaveStatus.addEventListener("click", async () => {
            const newStatus = statusSelect.value;
            try {
              await setPedidoStatus(pedidoId, newStatus);
              alert(`Estado actualizado a "${newStatus}".`);
              await renderPedidos();
              await cargarMetricasDashboard();
            } catch (e) {
              console.error(e);
              alert("Error al actualizar estado: " + e.message);
            }
          });
        }

        if (btnViewItems) {
          btnViewItems.addEventListener("click", async () => {
            if (!pedidoDetalle) return;
            pedidoDetalle.innerHTML = `<div style="opacity:.8;">Cargando items del pedido...</div>`;
            try {
              const items = await listarPedidoItems(pedidoId);
              pedidoDetalle.innerHTML = `
                <h4 style="margin-top:0; margin-bottom:10px;">Pedido #${escapeHtml(pedidoId || "-")}</h4>
                ${pedidoItemsHTML(items)}
              `;
            } catch (e) {
              console.error(e);
              pedidoDetalle.innerHTML = `<div style="color:#d32f2f;">Error cargando items: ${escapeHtml(e.message)}</div>`;
            }
          });
        }

        if (btnDeleteOrder) {
          btnDeleteOrder.addEventListener("click", async () => {
            const confirmed = confirm("Vas a eliminar este pedido y sus items. Si no estaba cancelado, se repondr\u00e1 stock antes de borrar. \u00bfConfirm\u00e1s?");
            if (!confirmed) return;

            try {
              await deletePedidoSafe(pedidoId);
              if (pedidoDetalle) {
                pedidoDetalle.textContent = "Selecciona un pedido para ver sus items.";
              }
              alert("Pedido eliminado correctamente.");
              await renderPedidos();
              await cargarMetricasDashboard();
            } catch (e) {
              console.error(e);
              alert("No se pudo eliminar el pedido. Intenta nuevamente.");
            }
          });
        }
      });
    }

    function productoCardHTML(p) {
      const imgs =
        Array.isArray(p.imagenes) && p.imagenes.length
          ? p.imagenes
          : p.imagen_url
            ? [p.imagen_url]
            : [];

      const firstImg = imgs[0] || "https://placehold.co/600x600?text=Sin+Imagen";

      return `
    <div class="admin-producto-item" data-id="${p.id}">
      <div class="admin-producto-header">
        <h4>${escapeHtml(p.nombre || "")}</h4>
        <p>${moneyARS(p.precio)}</p>
      </div>

      <div style="display:grid; grid-template-columns: 140px 1fr; gap: 15px; align-items:start; margin-bottom:15px;">
        <img src="${escapeAttr(firstImg)}" alt="img" style="width:140px;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);" />
        <div class="admin-producto-fields">
          <input class="f-nombre" type="text" value="${escapeAttr(p.nombre || "")}" placeholder="Nombre" />
          <input class="f-precio" type="number" min="0" step="100" value="${escapeAttr(p.precio ?? 0)}" placeholder="Precio" />
          <select class="f-publico">
            ${optionHtml("hombre", p.publico)}
            ${optionHtml("mujer", p.publico)}
            ${optionHtml("niño", p.publico)}
          </select>
          <select class="f-categoria">
            ${optCat("remeras", p.categoria)}
            ${optCat("pantalones", p.categoria)}
            ${optCat("buzos", p.categoria)}
            ${optCat("calzado", p.categoria)}
            ${optCat("accesorios", p.categoria)}
          </select>
          <input class="f-stock" type="number" min="0" step="1" value="${escapeAttr(toSafeStock(p.stock))}" placeholder="Stock" />

          <input class="f-activo" type="text" value="${escapeAttr(String(p.activo ?? true))}" placeholder="activo: true/false" />
          <textarea class="f-descripcion" placeholder="Descripcion...">${escapeHtml(p.descripcion || "")}</textarea>
          <textarea class="f-imagenes" placeholder="URLs separadas por coma">${escapeHtml(imgs.join(", "))}</textarea>
          <div style="grid-column:1 / -1; border:1px dashed var(--border-color); border-radius:8px; padding:10px;">
            <div style="font-weight:600; margin-bottom:8px;">Ajuste rapido de stock</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input class="f-stock-delta" type="number" step="1" placeholder="+10 / -3" style="max-width:180px;" />
              <button type="button" class="btn-update btn-stock-ajustar" style="min-width:160px;">Aplicar ajuste</button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
              <button type="button" class="btn-stock-quick" data-delta="1">+1</button>
              <button type="button" class="btn-stock-quick" data-delta="-1">-1</button>
              <button type="button" class="btn-stock-quick" data-delta="5">+5</button>
              <button type="button" class="btn-stock-quick" data-delta="-5">-5</button>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-buttons">
        <button class="btn-update btn-guardar"><i class="fas fa-save"></i> Guardar cambios</button>
        <button class="btn-delete btn-borrar"><i class="fas fa-trash"></i> Eliminar</button>
      </div>
    </div>
  `;
    }

    async function renderAdminLista() {
      adminLista.innerHTML = `<div style="opacity:.8;">Cargando productos...</div>`;
      try {
        const productos = await listarProductosAdmin();
        if (!productos.length) {
          adminLista.innerHTML = `<div style="opacity:.8;">No hay productos todavia.</div>`;
          return;
        }

        adminLista.innerHTML = productos.map(productoCardHTML).join("");
        bindCardActions();
      } catch (e) {
        console.error(e);
        adminLista.innerHTML = `<div style="color:#d32f2f;">Error cargando: ${escapeHtml(e.message)}</div>`;
      }
    }

    function bindCardActions() {
      adminLista.querySelectorAll(".admin-producto-item").forEach((card) => {
        const id = card.getAttribute("data-id");
        const btnGuardar = card.querySelector(".btn-guardar");
        const btnBorrar = card.querySelector(".btn-borrar");
        const btnAjustarStock = card.querySelector(".btn-stock-ajustar");
        const inputStock = card.querySelector(".f-stock");
        const inputDelta = card.querySelector(".f-stock-delta");
        const quickButtons = card.querySelectorAll(".btn-stock-quick");

        btnGuardar.addEventListener("click", async () => {
          const { cambios, stockFueAjustado } = readCardFields(card);
          try {
            await updateProducto(id, cambios);
            if (stockFueAjustado) {
              alert("El stock no puede ser negativo. Se guardo como 0.");
            }
            alert("Producto actualizado.");
            await renderAdminLista();
            await cargarMetricasDashboard();
          } catch (e) {
            console.error(e);
            alert("Error al actualizar: " + e.message);
          }
        });

        btnBorrar.addEventListener("click", async () => {
          if (!confirm("Seguro que queres eliminar este producto?")) return;
          try {
            await deleteProducto(id);
            alert("Producto eliminado.");
            await renderAdminLista();
            await cargarMetricasDashboard();
          } catch (e) {
            console.error(e);
            alert("Error al borrar: " + e.message);
          }
        });

        if (btnAjustarStock) {
          btnAjustarStock.addEventListener("click", async () => {
            await aplicarAjusteStock(card, id);
          });
        }

        if (inputDelta) {
          inputDelta.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await aplicarAjusteStock(card, id);
            }
          });
        }

        quickButtons.forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!inputDelta) return;
            inputDelta.value = btn.getAttribute("data-delta") || "0";
            await aplicarAjusteStock(card, id);
          });
        });

        if (inputStock) {
          inputStock.addEventListener("change", () => {
            const s = toSafeStock(inputStock.value);
            inputStock.value = String(s);
          });
        }
      });
    }

    async function aplicarAjusteStock(card, id) {
      const inputStock = card.querySelector(".f-stock");
      const inputDelta = card.querySelector(".f-stock-delta");
      if (!inputStock || !inputDelta) return;

      const deltaRaw = Number(inputDelta.value);
      if (!Number.isFinite(deltaRaw) || !Number.isInteger(deltaRaw)) {
        alert("Ingresa un ajuste valido (numero entero, ej: +10 o -3).");
        return;
      }

      const stockActual = toSafeStock(inputStock.value);
      const suma = stockActual + deltaRaw;
      const nuevoStock = Math.max(0, suma);

      try {
        await updateProductoStock(id, nuevoStock);
        if (suma < 0) {
          alert("El ajuste dejaba stock negativo; se aplico stock 0.");
        } else {
          alert("Stock actualizado.");
        }
        await renderAdminLista();
        await cargarMetricasDashboard();
      } catch (e) {
        console.error(e);
        alert("Error al actualizar stock: " + e.message);
      }
    }

    function readCardFields(card) {
      const vNombre = card.querySelector(".f-nombre").value.trim();
      const vPrecio = Number(card.querySelector(".f-precio").value || 0);
      const vStockRaw = Number(card.querySelector(".f-stock").value || 0);
      const vPublico = card.querySelector(".f-publico").value;
      const vCategoria = card.querySelector(".f-categoria").value;
      const vDescripcion = card.querySelector(".f-descripcion").value.trim();
      const vImagenes = card.querySelector(".f-imagenes").value;
      const vActivoRaw = card.querySelector(".f-activo").value.trim().toLowerCase();
      const vActivo = vActivoRaw === "true" ? true : vActivoRaw === "false" ? false : true;
      const vStock = toSafeStock(vStockRaw);
      const stockFueAjustado = !Number.isFinite(vStockRaw) || vStockRaw < 0 || !Number.isInteger(vStockRaw);

      const imgs = parseImagenes(vImagenes);

      return {
        cambios: {
          nombre: vNombre,
          precio: vPrecio,
          publico: vPublico,
          categoria: vCategoria,
          descripcion: vDescripcion,
          imagenes: imgs,
          imagen_url: imgs[0] || null,
          activo: vActivo,
          stock: vStock,
        },
        stockFueAjustado,
      };
    }

    async function guardar() {
      const imgs = parseImagenes(imagenes.value);
      const stockValue = toSafeStock(stock ? stock.value : 0);
      const payload = {
        nombre: nombre.value.trim(),
        precio: Number(precio.value || 0),
        publico: publico.value,
        categoria: categoria.value,
        descripcion: descripcion.value.trim(),
        imagenes: imgs,
        imagen_url: imgs[0] || null,
        activo: true,
        stock: stockValue,
      };

      try {
        await insertProducto(payload);
        formProducto.reset();
        updatePreview();
        alert("Producto creado.");
        await renderAdminLista();
        await cargarMetricasDashboard();
      } catch (e) {
        console.error(e);
        alert("Error al crear: " + e.message);
      }
    }
    window.guardar = guardar;

    function updatePreview() {
      const imgs = parseImagenes(imagenes.value);
      const main = imgs[0] || "https://placehold.co/300x300?text=Sin+Imagen";

      previewImg.src = main;
      previewTitulo.textContent = nombre.value.trim() || "Nombre del Producto";
      previewPrecio.textContent = moneyARS(precio.value);
      if (previewStock) {
        previewStock.textContent = `Stock: ${toSafeStock(stock ? stock.value : 0)}`;
      }

      previewMiniaturas.innerHTML = "";
      imgs.slice(0, 6).forEach((url) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "mini";
        img.style.width = "48px";
        img.style.height = "48px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.border = "1px solid var(--border-color)";
        img.style.cursor = "pointer";
        img.addEventListener("click", () => {
          previewImg.src = url;
        });
        previewMiniaturas.appendChild(img);
      });
    }

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function escapeAttr(str) {
      return escapeHtml(str).replaceAll("\n", " ");
    }

    function optionHtml(value, current) {
      const sel = value === current ? "selected" : "";
      const label = value === "hombre" ? "Hombre" : value === "mujer" ? "Mujer" : "Niño";
      return `<option value="${value}" ${sel}>${label}</option>`;
    }

    function optCat(value, current) {
      const sel = value === current ? "selected" : "";
      const label =
        value === "remeras"
          ? "Remeras"
          : value === "pantalones"
            ? "Pantalones"
            : value === "buzos"
              ? "Buzos"
              : value === "calzado"
                ? "Calzado"
                : "Accesorios";
      return `<option value="${value}" ${sel}>${label}</option>`;
    }

    loginBtn.addEventListener("click", handleLogin);
    passInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
    [nombre, precio, imagenes, stock].filter(Boolean).forEach((el) => el.addEventListener("input", updatePreview));

    (async () => {
      await requireAuthOrRedirect();
      try {
        const productos = await listarProductosAdmin();
        console.log("Productos admin:", productos);
      } catch (e) {
        console.error("Error admin:", e.message);
      }

      updatePreview();
      await refreshAuthUI();
      sb.auth.onAuthStateChange(async () => {
        await refreshAuthUI();
      });
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();
