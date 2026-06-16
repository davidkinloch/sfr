/* ─────────────────────────────────────────────────────────────
   SFR Theme JS — Shopify build
   Wires up: window minimise, AJAX cart, login popup drag/close,
   mobile menu modal, draggable popups with viewport clamp.
   Cart is backed by Shopify's /cart/*.js endpoints. Login is
   handled by snippets/login-popup.liquid posting to
   /account/login (form rendered server-side for CSRF).
   ───────────────────────────────────────────────────────────── */

/* Window minimise toggle — skips modal close buttons that have their own handlers */
const MODAL_CLOSE_IDS = ['playerClose', 'vmClose', 'loginPopupClose', 'menuModalClose'];
document.querySelectorAll('.window__close').forEach(btn => {
  if (MODAL_CLOSE_IDS.indexOf(btn.id) !== -1) return;
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

/* ── Music player flyout ── */
(function () {
  const ICON_PLAY  = '<svg width="14" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><polygon points="0,0 0,14 12,7"/></svg>';
  const ICON_PAUSE = '<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>';

  document.addEventListener('DOMContentLoaded', function () {
    const flyout = document.getElementById('playerFlyout');
    if (!flyout) return;

    const overlay     = document.getElementById('playerOverlay');
    const closeBtn    = document.getElementById('playerClose');
    const audio       = document.getElementById('playerAudio');
    const artwork     = document.getElementById('playerArtwork');
    const artistEl    = document.getElementById('playerArtist');
    const titleEl     = document.getElementById('playerAlbumTitle');
    const nowEl       = document.getElementById('playerNowTrack');
    const list        = document.getElementById('playerTracklist');
    const playBtn     = document.getElementById('playerPlayPause');
    const prevBtn     = document.getElementById('playerPrevTrack');
    const nextBtn     = document.getElementById('playerNextTrack');
    const prevAlbum   = document.getElementById('playerPrevAlbum');
    const nextAlbum   = document.getElementById('playerNextAlbum');
    const progress    = document.getElementById('playerProgress');
    const progFill    = document.getElementById('playerProgressFill');
    const thumb       = document.getElementById('playerThumb');
    const detailLnk   = document.getElementById('playerDetailLink');
    const cartBtn     = document.getElementById('playerCartBtn');
    const titlebar    = flyout.querySelector('.window__titlebar');
    const windowEl    = flyout.querySelector('.window');
    const bodyEl      = flyout.querySelector('.player__body');

    let clips = [], idx = 0;
    let albumBtns = [], albumIdx = -1;

    function resetSidebar() {
      flyout.style.left = '';
      flyout.style.top = '';
      flyout.style.right = '';
      flyout.style.transform = '';
      flyout.style.height = '';
      if (windowEl) windowEl.style.height = '';
      if (bodyEl)   bodyEl.style.overflow = '';
    }
    function close() {
      flyout.classList.remove('is-open');
      flyout.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-open');
      audio.pause();
      playBtn.innerHTML = ICON_PLAY;
      resetSidebar();
    }
    function playTrack() {
      const clip = clips[idx];
      if (!clip || !clip.url) return;
      nowEl.textContent = clip.title || ('Track ' + (idx + 1));
      audio.src = clip.url;
      audio.play().catch(() => {});
      playBtn.innerHTML = ICON_PAUSE;
      list.querySelectorAll('.player__track-btn').forEach((b, i) =>
        b.classList.toggle('is-active', i === idx)
      );
    }
    function buildList() {
      list.innerHTML = '';
      clips.forEach((clip, i) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'player__track-btn';
        btn.type = 'button';
        btn.textContent = clip.title || ('Track ' + (i + 1));
        btn.addEventListener('click', () => { idx = i; playTrack(); });
        li.appendChild(btn);
        list.appendChild(li);
      });
    }
    function dataFromBtn(btn) {
      let parsed = [];
      try { parsed = JSON.parse(btn.getAttribute('data-clips') || '[]'); } catch (_) {}
      return {
        title:      btn.getAttribute('data-title'),
        artist:     btn.getAttribute('data-artist'),
        cover:      btn.getAttribute('data-cover'),
        productUrl: btn.getAttribute('href'),
        variantId:  btn.getAttribute('data-variant-id'),
        clips:      parsed
      };
    }
    function applyData(data) {
      clips = Array.isArray(data.clips) ? data.clips : [];
      idx = 0;
      artwork.src = data.cover || '';
      artwork.alt = data.title || '';
      artistEl.textContent = data.artist || '—';
      titleEl.textContent  = data.title  || '—';
      detailLnk.href = data.productUrl || '#';
      cartBtn.setAttribute('data-variant-id', data.variantId || '');
      buildList();
      if (clips.length > 0) playTrack();
    }
    function updateAlbumNav() {
      if (!prevAlbum || !nextAlbum) return;
      const hasList = albumBtns.length > 1 && albumIdx >= 0;
      prevAlbum.style.display = hasList ? '' : 'none';
      nextAlbum.style.display = hasList ? '' : 'none';
      if (hasList) {
        prevAlbum.disabled = albumIdx <= 0;
        nextAlbum.disabled = albumIdx >= albumBtns.length - 1;
      }
    }
    function open(triggerBtn) {
      /* Build the album list from PLAY CLIPS buttons on this page */
      albumBtns = Array.from(document.querySelectorAll('.plp__play[data-clips]'));
      albumIdx  = albumBtns.indexOf(triggerBtn);
      applyData(dataFromBtn(triggerBtn));
      updateAlbumNav();
      flyout.classList.add('is-open');
      flyout.removeAttribute('aria-hidden');
      overlay.classList.add('is-open');
    }

    closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && flyout.classList.contains('is-open')) close();
    });

    playBtn.addEventListener('click', () => {
      if (audio.paused) { audio.play().catch(() => {}); playBtn.innerHTML = ICON_PAUSE; }
      else              { audio.pause();                 playBtn.innerHTML = ICON_PLAY;  }
    });
    prevBtn.addEventListener('click', () => { if (idx > 0)                  { idx--; playTrack(); }});
    nextBtn.addEventListener('click', () => { if (idx < clips.length - 1)   { idx++; playTrack(); }});

    if (prevAlbum) prevAlbum.addEventListener('click', () => {
      if (albumIdx > 0) { albumIdx--; applyData(dataFromBtn(albumBtns[albumIdx])); updateAlbumNav(); }
    });
    if (nextAlbum) nextAlbum.addEventListener('click', () => {
      if (albumIdx < albumBtns.length - 1) { albumIdx++; applyData(dataFromBtn(albumBtns[albumIdx])); updateAlbumNav(); }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = audio.currentTime / audio.duration;
      progFill.style.width = (pct * 100) + '%';
      const max = progress.offsetWidth - 20 - 17;
      thumb.style.left = (10 + pct * max) + 'px';
    });
    audio.addEventListener('ended', () => {
      if (idx < clips.length - 1) { idx++; playTrack(); }
      else playBtn.innerHTML = ICON_PLAY;
    });
    progress.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left - 10) / (rect.width - 20)));
      audio.currentTime = pct * audio.duration;
    });

    cartBtn.addEventListener('click', async () => {
      const v = cartBtn.getAttribute('data-variant-id');
      if (!v || !window.SFRCart) return;
      try { await SFRCart.add({ id: parseInt(v, 10), quantity: 1 }); SFRCart.flash(cartBtn, 'ADDED ✓'); }
      catch (e) { SFRCart.flash(cartBtn, 'ERROR'); }
    });

    /* Custom drag — flyout transitions from sidebar (full-height) to floating window (auto height) on first drag */
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    let dragging = false, offX = 0, offY = 0;
    function dragStart(x, y) {
      if (!flyout.classList.contains('is-open')) return;
      const rect = flyout.getBoundingClientRect();
      offX = x - rect.left;
      offY = y - rect.top;
      flyout.style.left      = rect.left + 'px';
      flyout.style.top       = rect.top + 'px';
      flyout.style.right     = 'auto';
      flyout.style.transform = 'none';
      flyout.style.height    = 'auto';      /* hug content */
      if (windowEl) windowEl.style.height = 'auto';
      if (bodyEl)   bodyEl.style.overflow = 'visible';
      overlay.classList.remove('is-open');  /* let the user click through */
      dragging = true;
      document.body.style.userSelect = 'none';
    }
    function dragMove(x, y) {
      if (!dragging) return;
      const MIN_VISIBLE = 80, TITLEBAR_H = 30;
      const w = flyout.offsetWidth;
      const vw = window.innerWidth, vh = window.innerHeight;
      flyout.style.left = clamp(x - offX, MIN_VISIBLE - w, vw - MIN_VISIBLE) + 'px';
      flyout.style.top  = clamp(y - offY, 0,               vh - TITLEBAR_H ) + 'px';
    }
    function dragEnd() { dragging = false; document.body.style.userSelect = ''; }

    titlebar.addEventListener('mousedown', e => {
      if (e.target === closeBtn) return;
      dragStart(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => dragMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', dragEnd);
    titlebar.addEventListener('touchstart', e => {
      if (e.target === closeBtn) return;
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      dragMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchend', dragEnd);

    /* PLAY CLIPS buttons on PLP cards trigger this player */
    document.addEventListener('click', e => {
      const btn = e.target.closest('.plp__play[data-clips]');
      if (!btn) return;
      e.preventDefault();
      open(btn);
    });
  });
})();
