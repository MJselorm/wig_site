/* ============================================================
   MAISON CRÈME — Global Application JavaScript
   Navigation, Cart Drawer, Scroll Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Scroll Reveal (IntersectionObserver) ──────────────────
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (revealElements.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ── Header scroll effect ──────────────────────────────────
  const header = document.getElementById('site-header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ── Mobile Menu ───────────────────────────────────────────
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-menu-close');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    if (mobileClose) {
      mobileClose.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Cart Drawer ───────────────────────────────────────────
  const cartBtn = document.getElementById('cart-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartClose = document.getElementById('cart-close');

  function openCart() {
    if (cartOverlay) cartOverlay.classList.add('active');
    if (cartDrawer) cartDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (cartOverlay) cartOverlay.classList.remove('active');
    if (cartDrawer) cartDrawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  // ── Cart State (localStorage) ─────────────────────────────
  const CART_KEY = 'maison_creme_cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id && item.variant === product.variant);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    openCart();
  }

  function removeFromCart(id, variant) {
    let cart = getCart();
    cart = cart.filter(item => !(item.id === id && item.variant === variant));
    saveCart(cart);
  }

  function updateCartUI() {
    const cart = getCart();
    const countEl = document.getElementById('cart-count');
    const bodyEl = document.getElementById('cart-drawer-body');
    const footerEl = document.getElementById('cart-drawer-footer');
    const subtotalEl = document.getElementById('cart-subtotal-amount');

    // Update count badge
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) {
      if (totalItems > 0) {
        countEl.style.display = 'flex';
        countEl.textContent = totalItems;
      } else {
        countEl.style.display = 'none';
      }
    }

    if (!bodyEl) return;

    if (cart.length === 0) {
      bodyEl.innerHTML = `
        <div class="cart-empty">
          <p class="headline-sm" style="margin-bottom: var(--space-sm);">Your bag is empty</p>
          <p class="body-md text-grey">Discover our curated collections</p>
          <a href="collection.html" class="btn btn-primary" style="margin-top: var(--space-md);">Shop Now</a>
        </div>`;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    // Render cart items
    let html = '';
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.price * item.qty;
      html += `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-image">
          <div class="cart-item-details">
            <div>
              <div class="cart-item-name">${item.name}</div>
              <div class="label-caps text-grey" style="margin-top:4px;">${item.variant || ''}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
              <button class="btn-ghost" onclick="window.MaisonCart.remove('${item.id}','${item.variant}')" style="font-size:11px;">Remove</button>
            </div>
          </div>
        </div>`;
    });

    bodyEl.innerHTML = html;
    if (footerEl) footerEl.style.display = 'block';
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  }

  // Expose cart functions globally
  window.MaisonCart = {
    add: addToCart,
    remove: (id, variant) => removeFromCart(id, variant),
    get: getCart,
  };

  // Initial UI update
  updateCartUI();

  // ── Add to Cart buttons ───────────────────────────────────
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const data = btn.dataset;
      addToCart({
        id: data.productId,
        name: data.productName,
        price: parseFloat(data.productPrice),
        image: data.productImage,
        variant: data.productVariant || 'Default',
      });
    });
  });

});
