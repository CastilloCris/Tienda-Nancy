
/**
 * Archivo Principal de JavaScript - Tienda Nancy
 * Maneja la lógica del carrito de compras, tema y eventos de la interfaz.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar funciones globales
    initCart();
    initMenu();
    initTheme();
    initAdminGesture();
    
    // Actualizar contador del carrito al cargar
    updateCartCount();
    
    // Inyectar modal del carrito si no existe
    if (!document.getElementById('cart-modal')) {
        injectCartModal();
    }
});

/* =====================================================
   SISTEMA DE CARRITO (De Asado adaptado a Tienda)
   ===================================================== */

// Cargar carrito desde localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

/**
 * Guarda el carrito en localStorage
 */
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

/**
 * Agrega un producto al carrito
 * @param {object} product - Objeto del producto
 */
function addToCart(product) {
    const { nombre, precio, img, descripcion } = product;
    
    const existingItem = cart.find(item => item.name === nombre);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            name: nombre, 
            price: precio, 
            image: img, 
            description: descripcion,
            quantity: 1 
        });
    }
    
    saveCart();
    showToast(`¡${nombre} agregado al carrito!`);
}

/**
 * Elimina un producto del carrito
 */
function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    saveCart();
}

/**
 * Actualiza la cantidad de un producto
 */
function updateQuantity(name, change) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(name);
        } else {
            saveCart();
        }
    }
}

/**
 * Actualiza el contador de items en el carrito
 */
function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const countElem = document.getElementById('cart-count');
    if (countElem) countElem.textContent = count;
}

/**
 * Abre/cierra el modal del carrito
 */
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

/**
 * Renderiza los items del carrito en el modal
 */
function renderCart() {
    const list = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-price');
    
    if (!list || !totalElem) return;
    
    list.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío.</p>';
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            
            const li = document.createElement('div');
            li.className = 'cart-item';
            li.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toLocaleString()} x ${item.quantity}</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity('${item.name}', -1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.name}', 1)">+</button>
                </div>
                <button class="btn-remove" onclick="removeFromCart('${item.name}')">&times;</button>
            `;
            list.appendChild(li);
        });
    }
    
    totalElem.textContent = `$${total.toLocaleString()}`;
}

/**
 * Envía el pedido por WhatsApp
 */
function sendWhatsApp() {
    if (cart.length === 0) {
        showToast("El carrito está vacío");
        return;
    }

    let message = "Hola! Quisiera realizar el siguiente pedido en Tienda Nancy:\n\n";
    let total = 0;
    
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        message += `👕 *${item.name}* x${item.quantity} - $${subtotal.toLocaleString()}\n`;
        total += subtotal;
    });
    
    message += `\n💰 *Total a pagar: $${total.toLocaleString()}*`;
    
    // IMPORTANTE: Reemplazar con el número real
    const phoneNumber = "5491112345678";
    
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

/**
 * Inyecta el HTML del carrito en el DOM
 */
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

/**
 * Vacía el carrito
 */
function clearCart() {
    if(confirm('¿Estás seguro de vaciar el carrito?')) {
        cart = [];
        saveCart();
    }
}

/**
 * Muestra una notificación flotante (Toast)
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

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

/**
 * Expone funciones globales
 */
function initCart() {
    window.toggleCart = toggleCart;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.sendWhatsApp = sendWhatsApp;
    window.clearCart = clearCart;
}

/* =====================================================
   MENÚ HAMBURGUESA
   ===================================================== */
function initMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menu = document.getElementById('menu');
    
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('show');
        });

        // Cerrar menú al hacer click en un link
        const links = menu.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        });
    }
}

/* =====================================================
   GESTIÓN DE TEMA (DARK / LIGHT)
   ===================================================== */
const THEME_KEY = "tienda-tema";
const themeToggleButton = document.getElementById("tdm");

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return "dark"; // Default a dark
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
}

function syncThemeToggle(theme) {
    if (!themeToggleButton) return;
    const isDark = theme === "dark";
    themeToggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
}

function initTheme() {
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);
    syncThemeToggle(initialTheme);

    if (themeToggleButton) {
        themeToggleButton.addEventListener("click", () => {
            const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            
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
    const logoEl = document.querySelector(".header h2");
    if (!logoEl) return;

    let tapCount = 0;
    let lastTapTime = 0;
    const TAP_WINDOW_MS = 600;

    const onTap = (event) => {
        const now = Date.now();
        const withinWindow = now - lastTapTime <= TAP_WINDOW_MS;

        tapCount = withinWindow ? tapCount + 1 : 1;
        lastTapTime = now;

        if (tapCount >= 3) {
            tapCount = 0;
            window.location.href = "admin.html";
        }
    };

    // Touch first for mobile; click as fallback for desktop
    logoEl.addEventListener("touchend", onTap, { passive: true });
    logoEl.addEventListener("click", onTap);
}

// --- Acceso Admin por atajo de teclado ---
document.addEventListener("keydown", (e) => {
    const isA = e.key === "a" || e.key === "A";
    if (e.ctrlKey && e.shiftKey && isA) {
        window.location.href = "admin.html";
    }
});
