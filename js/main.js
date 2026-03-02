/**
 * Archivo Principal de JavaScript - Tienda Nancy
 * Maneja la logica del carrito de compras, tema y eventos de la interfaz.
 */

document.addEventListener('DOMContentLoaded', () => {
    initCart();
    initMenu();
    initTheme();
    initAdminGesture();

    updateCartCount();

    if (!document.getElementById('cart-modal')) {
        injectCartModal();
    }
});

function normalizeCart(rawCart) {
    if (!Array.isArray(rawCart)) return [];

    return rawCart
        .map((item) => {
            const qty = Number(item.qty ?? item.quantity ?? 1);
            if (!qty || qty <= 0) return null;

            return {
                id: item.id || item.product_id || null,
                product_id: item.product_id || item.id || null,
                nombre: item.nombre || item.name || 'Producto',
                precio: Number(item.precio ?? item.price ?? 0),
                img: item.img || item.image || '',
                descripcion: item.descripcion || item.description || '',
                qty
            };
        })
        .filter(Boolean);
}

let cart = normalizeCart(JSON.parse(localStorage.getItem('cart')) || []);

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

function addToCart(product) {
    const { id, nombre, precio, img, descripcion } = product;
    const stock = Number(product.stock);

    const existingItem = cart.find((item) => {
        if (id && item.id) return String(item.id) === String(id);
        return item.nombre === nombre;
    });

    if (existingItem) {
        if (Number.isFinite(stock) && stock > 0 && existingItem.qty + 1 > stock) {
            showToast('No hay stock suficiente');
            return;
        }
        existingItem.qty += 1;
    } else {
        cart.push({
            id: id || null,
            product_id: id || null,
            nombre,
            precio,
            img,
            descripcion,
            qty: 1
        });
    }

    saveCart();
    showToast(`¡${nombre} agregado al carrito!`);
}

function removeFromCart(idOrName) {
    cart = cart.filter((item) => {
        if (item.id && idOrName) return String(item.id) !== String(idOrName);
        return item.nombre !== idOrName;
    });
    saveCart();
}

function updateQuantity(idOrName, change) {
    const item = cart.find((it) => {
        if (it.id && idOrName) return String(it.id) === String(idOrName);
        return it.nombre === idOrName;
    });

    if (item) {
        item.qty += change;

        if (item.qty <= 0) {
            removeFromCart(item.id || item.nombre);
        } else {
            saveCart();
        }
    }
}

function getCartQuantityByProductId(productId) {
    return cart.reduce((acc, item) => {
        if (!item.id) return acc;
        return String(item.id) === String(productId) ? acc + item.qty : acc;
    }, 0);
}

function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const countElem = document.getElementById('cart-count');
    if (countElem) countElem.textContent = count;
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

function renderCart() {
    const list = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-price');

    if (!list || !totalElem) return;

    list.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-cart-msg">Tu carrito esta vacio.</p>';
    } else {
        cart.forEach((item) => {
            total += item.precio * item.qty;

            const li = document.createElement('div');
            li.className = 'cart-item';
            li.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>$${item.precio.toLocaleString()} x ${item.qty}</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity('${item.id || item.nombre}', -1)">−</button>
                    <span>${item.qty}</span>
                    <button onclick="updateQuantity('${item.id || item.nombre}', 1)">+</button>
                </div>
                <button class="btn-remove" onclick="removeFromCart('${item.id || item.nombre}')">&times;</button>
            `;
            list.appendChild(li);
        });
    }

    totalElem.textContent = `$${total.toLocaleString()}`;
}

function getOptionalCheckoutValue(idCandidates) {
    for (const id of idCandidates) {
        const el = document.getElementById(id);
        if (!el) continue;
        const v = String(el.value || '').trim();
        if (v) return v;
    }
    return null;
}

async function sendWhatsApp() {
    if (cart.length === 0) {
        showToast('El carrito esta vacio');
        return;
    }

    const sbClient = window.sb;
    if (!sbClient || typeof sbClient.rpc !== 'function') {
        console.error('Cliente Supabase no disponible para crear pedido');
        showToast('No se pudo registrar el pedido. Intenta nuevamente.');
        return;
    }

    const itemsJson = cart.map((item) => ({
        id: item.product_id || item.id,
        qty: Number(item.qty) || 0
    }));

    const invalidItem = itemsJson.find((item) => !item.id || item.qty <= 0);
    if (invalidItem) {
        console.error('Carrito invalido para descontar stock:', cart);
        showToast('El carrito tiene productos invalidos. Vuelve a agregarlos.');
        return;
    }

    try {
        const customerName = getOptionalCheckoutValue(['customerName', 'clienteNombre', 'nombreCliente']);
        const customerPhone = getOptionalCheckoutValue(['customerPhone', 'clienteTelefono', 'telefonoCliente']);
        const notes = getOptionalCheckoutValue(['customerNotes', 'clienteNotas', 'notasPedido']);

        const { data: pedidoIdRaw, error } = await sbClient.rpc('create_order_and_decrement_stock', {
            p_customer_name: customerName,
            p_customer_phone: customerPhone,
            p_notes: notes,
            p_items: itemsJson
        });

        if (error) {
            console.error('Error al crear pedido/descontar stock:', error);
            showToast('Stock insuficiente o error al crear el pedido');

            if (typeof window.cargarProductos === 'function') {
                await window.cargarProductos();
            }
            return;
        }

        const pedidoId = Array.isArray(pedidoIdRaw)
            ? (pedidoIdRaw[0]?.pedido_id || pedidoIdRaw[0]?.id || pedidoIdRaw[0])
            : (pedidoIdRaw?.pedido_id || pedidoIdRaw?.id || pedidoIdRaw);

        let message = 'Hola! Quisiera realizar el siguiente pedido en Tienda Nancy:\n\n';
        let total = 0;

        cart.forEach((item) => {
            const subtotal = item.precio * item.qty;
            message += `- *${item.nombre}* x${item.qty} - $${subtotal.toLocaleString()}\n`;
            total += subtotal;
        });

        message += `\n*Total a pagar: $${total.toLocaleString()}*`;
        message += `\n*Pedido ID: ${pedidoId || "N/D"}*`;

        const phoneNumber = '5491112345678';
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        window.open(url, '_blank');
        cart = [];
        saveCart();
    } catch (err) {
        console.error('Error inesperado al finalizar pedido:', err);
        showToast('Error al procesar el pedido. Intenta nuevamente.');
    }
}

function injectCartModal() {
    const modalHTML = `
        <div id="cart-modal" class="cart-modal">
            <div class="cart-modal-content">
                <div class="cart-header">
                    <h2>Tu Pedido</h2>
                    <span class="close-cart" onclick="toggleCart()">&times;</span>
                </div>
                <div id="cart-items-container" class="cart-items">
                </div>
                <div class="cart-footer">
                    <div class="total-row">
                        <span>Total:</span>
                        <strong id="cart-total-price">$0</strong>
                    </div>
                    <button class="btn-whatsapp" onclick="sendWhatsApp()">
                        <i class="fab fa-whatsapp"></i> Finalizar Pedido
                    </button>
                    <button class="btn-clear" onclick="clearCart()">Vaciar Carrito</button>
                </div>
            </div>
        </div>
        <div id="toast-container"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    renderCart();
}

function clearCart(force = false) {
    if (force || confirm('¿Estas seguro de vaciar el carrito?')) {
        cart = [];
        saveCart();
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initCart() {
    window.toggleCart = toggleCart;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.getCartQuantityByProductId = getCartQuantityByProductId;
    window.sendWhatsApp = sendWhatsApp;
    window.clearCart = clearCart;
}

/* =====================================================
   MENU HAMBURGUESA
   ===================================================== */
function initMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menu = document.getElementById('menu');

    if (menuToggle && menu) {
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('show');
        });

        const links = menu.querySelectorAll('a');
        links.forEach((link) => {
            link.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        });
    }
}

/* =====================================================
   GESTION DE TEMA (DARK / LIGHT)
   ===================================================== */
const THEME_KEY = 'tienda-tema';
const themeToggleButton = document.getElementById('tdm');

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'dark';
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
}

function syncThemeToggle(theme) {
    if (!themeToggleButton) return;
    const isDark = theme === 'dark';
    themeToggleButton.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

function initTheme() {
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);
    syncThemeToggle(initialTheme);

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            applyTheme(newTheme);
            syncThemeToggle(newTheme);
            localStorage.setItem(THEME_KEY, newTheme);
        });
    }
}

/* =====================================================
   ACCESO ADMIN POR GESTO (TRIPLE TAP EN LOGO)
   ===================================================== */
function initAdminGesture() {
    const logoEl = document.querySelector('.header h2');
    if (!logoEl) return;

    let tapCount = 0;
    let lastTapTime = 0;
    const TAP_WINDOW_MS = 600;

    const onTap = () => {
        const now = Date.now();
        const withinWindow = now - lastTapTime <= TAP_WINDOW_MS;

        tapCount = withinWindow ? tapCount + 1 : 1;
        lastTapTime = now;

        if (tapCount >= 3) {
            tapCount = 0;
            window.location.href = 'admin.html';
        }
    };

    logoEl.addEventListener('touchend', onTap, { passive: true });
    logoEl.addEventListener('click', onTap);
}

document.addEventListener('keydown', (e) => {
    const isA = e.key === 'a' || e.key === 'A';
    if (e.ctrlKey && e.shiftKey && isA) {
        window.location.href = 'admin.html';
    }
});
