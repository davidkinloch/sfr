/* ─────────────────────────────────────────────────────────────
   SFR Theme JS — Shopify build
   Wires up: window minimise, AJAX cart, login popup drag/close,
   mobile menu modal, draggable popups with viewport clamp.
   Cart is backed by Shopify's /cart/*.js endpoints. Login is
   handled by snippets/login-popup.liquid posting to
   /account/login (form rendered server-side for CSRF).
   ───────────────────────────────────────────────────────────── */

/* Window minimise toggle */
document.querySelectorAll('.window__close').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    btn.closest('.window').classList.toggle('is-minimized');
  });
});

/* ── Cart (Shopify AJAX Cart API) ── */
(function () {
  async function read() {
    const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' }});
    return res.ok ? res.json() : { items: [], item_count: 0, total_price: 0 };
  }
  async function add(item) {
    /* item: { id (variant id), quantity, properties } */
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Cart add failed');
    await updateBadge();
    return res.json();
  }
  async function change(payload) {
    /* payload: { id (line key/variant id), quantity } or { line, quantity } */
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    await updateBadge();
    return res.json();
  }
  async function updateBadge() {
    try {
      const cart = await read();
      document.querySelectorAll('.checkout__badge').forEach(el => {
        el.textContent = cart.item_count || 0;
      });
    } catch (e) { /* ignore */ }
  }
  function flash(btn, msg) {
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = msg || 'ADDED ✓';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1200);
  }
  window.SFRCart = { read, add, change, updateBadge, flash };
  document.addEventListener('DOMContentLoaded', updateBadge);
})();

/* ── Shared drag helper for any modal ── */
(function () {
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function wire(modal, titlebar, closeBtn) {
    let dragging = false, offX = 0, offY = 0;
    function start(x, y) {
      if (!modal.classList.contains('is-open')) return;
      const rect = modal.getBoundingClientRect();
      offX = x - rect.left;
      offY = y - rect.top;
      modal.style.left = rect.left + 'px';
      modal.style.top  = rect.top  + 'px';
      modal.style.right = 'auto';
      dragging = true;
      document.body.style.userSelect = 'none';
    }
    function move(x, y) {
      if (!dragging) return;
      const MIN_VISIBLE = 80, TITLEBAR_H = 30;
      const w = modal.offsetWidth, vw = window.innerWidth, vh = window.innerHeight;
      modal.style.left = clamp(x - offX, MIN_VISIBLE - w, vw - MIN_VISIBLE) + 'px';
      modal.style.top  = clamp(y - offY, 0,               vh - TITLEBAR_H ) + 'px';
    }
    function end() { dragging = false; document.body.style.userSelect = ''; }

    titlebar.addEventListener('mousedown', e => {
      if (closeBtn && e.target === closeBtn) return;
      start(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', end);
    titlebar.addEventListener('touchstart', e => {
      if (closeBtn && e.target === closeBtn) return;
      start(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchend', end);
  }
  window.SFRDrag = { wire };
})();

/* ── Login popup (markup rendered server-side in snippets/login-popup.liquid) ── */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const popup    = document.getElementById('loginPopup');
    if (!popup) return; /* customer logged in — snippet not rendered */
    const closeBtn = document.getElementById('loginPopupClose');
    const titlebar = popup.querySelector('.window__titlebar');

    function open() {
      popup.classList.add('is-open');
      popup.removeAttribute('aria-hidden');
      const input = popup.querySelector('input[name="customer[email]"]');
      if (input) setTimeout(() => input.focus(), 50);
    }
    function close() {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
    }

    /* Topnav LOG IN icon opens popup (only when logged out) */
    document.querySelectorAll('a.login[data-logged-in="false"]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); open(); });
    });

    closeBtn && closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) close();
    });

    if (window.SFRDrag && titlebar) SFRDrag.wire(popup, titlebar, closeBtn);
  });
})();

/* ── Mobile menu modal (≤780px) — markup rendered in snippets/menu-modal.liquid ── */
(function () {
  const mq = window.matchMedia('(max-width: 780px)');
  document.addEventListener('DOMContentLoaded', function () {
    const modal    = document.getElementById('menuModal');
    if (!modal) return;
    const closeBtn = document.getElementById('menuModalClose');
    const titlebar = modal.querySelector('.window__titlebar');

    function open()  { modal.classList.add('is-open'); modal.removeAttribute('aria-hidden'); }
    function close() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }

    closeBtn && closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });

    const menuTitlebar = document.querySelector('.menu .menu__titlebar');
    if (menuTitlebar) {
      menuTitlebar.onclick = null;
      menuTitlebar.addEventListener('click', e => {
        if (!mq.matches) return;
        e.preventDefault();
        e.stopPropagation();
        if (modal.classList.contains('is-open')) close();
        else open();
      });
    }

    if (window.SFRDrag && titlebar) SFRDrag.wire(modal, titlebar, closeBtn);
  });
})();

/* ── PLP card add-to-cart (delegated) ── */
(function () {
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.plp__add[data-variant-id]');
    if (!btn || !window.SFRCart) return;
    e.preventDefault();
    const qtySel = btn.closest('.plp__cart-row')?.querySelector('.plp__qty');
    const qty = qtySel ? parseInt(qtySel.value, 10) || 1 : 1;
    try {
      await SFRCart.add({ id: btn.getAttribute('data-variant-id'), quantity: qty });
      SFRCart.flash(btn, '✓');
    } catch (err) {
      SFRCart.flash(btn, '!');
    }
  });
})();
