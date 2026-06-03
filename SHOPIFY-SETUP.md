# SFR Records — Shopify theme setup

This folder is a Basic-Shopify-compatible Online Store 2.0 theme, scaffolded from the static demo at `V5/preview/`. It's a working skeleton — every page renders out of the box once you set up the collections, metafields, and menus described below.

The static demo (`V5/preview/`) is untouched and still works on its own — this folder is a parallel port.

---

## 1. Push the theme

From this folder:

```bash
cd /Users/dk/Sites/SFR/shopify
shopify auth login              # if you haven't already
shopify theme push --unpublished   # uploads as a new unpublished theme
```

After it uploads, **preview** it in your store admin before publishing. Once you're happy: `shopify theme publish`.

If you'd rather develop live: `shopify theme dev` — gives you a localhost preview that hot-reloads against the staged theme.

---

## 2. Set up in Shopify admin

### Collections

Create two collections (use these handles **exactly**):

| Title | Handle | Used by |
|-------|--------|---------|
| Records | `records` | Homepage PLP (`templates/index.json`) + `templates/collection.records.json` |
| Snake Free Merch | `merch` | `templates/collection.json` (default merch PLP) |

Add the relevant products to each.

### Navigation (Online Store → Navigation)

- **Main menu** (handle: `main-menu`) — your primary nav. Used by the topnav menu window + the mobile menu modal.
- **Footer** (handle: `footer`) — used by the footer link buttons.

Suggested links (replicating the V5 menu):
- RECORDS → `/collections/records`
- SNAKE FREE MERCH → `/collections/merch`
- MUSIC VIDEOS → `/pages/music-videos`
- DISTRIBUTION → `/pages/distribution` (or a section anchor)
- EVENTS → `/pages/events`
- CONTACT → `/pages/contact`

### Pages

Create these pages in Online Store → Pages and **assign the right template** under "Theme template":

| Page title | Handle | Template |
|------------|--------|----------|
| Contact / About | `contact` | `page.contact` |
| Events | `events` | `page.events` |
| Music Videos | `music-videos` | `page.music-videos` |
| Distribution | `distribution` | `page` (uses the default page template) |

For Events and Music Videos, you'll edit the content via the **theme editor's section blocks** (image picker + URL + title) rather than the page's body content.

### Product metafields

In **Settings → Custom data → Products**, add these metafield definitions (all under namespace `sfr`):

| Key | Type | Example value | Used on |
|-----|------|---------------|---------|
| `cat_no` | Single line text | `SFR012` / `SFRMERCH001` | PDP + PLP cards |
| `format` | Single line text | `12" Vinyl` | Records PDP info table |
| `label` | Single line text | `SFR REC` | Records PDP info table |
| `style` | Single line text | `POSTWAVE / POP / ELECTRONIC` | Records PDP info table |
| `release_date` | Date | `2026-03-26` | Records PDP info table |
| `color` | Single line text | `NATURAL` | Merch PDP info table |
| `material` | Single line text | `100% COTTON` | Merch PDP info table |
| `print` | Single line text | `FRONT + BACK SCREEN PRINT` | Merch PDP info table |
| `subtitle` | Single line text | `LIMITED EDITION ART ZINE` | Merch PLP card row 2 |
| `cta` | Single line text | `VIEW SHIRT` / `VIEW ZINE` | Merch PLP card button label |

Fill these per product in each product's "Metafields" section.

### Product type & vendor

- For **records**: set `Type` to `Vinyl` or `Record` (or leave blank), and `Vendor` to the artist (e.g. `JANE IN PALMA`). The PDP uses `product.vendor` for the ARTIST row.
- For **merch** (shirts, zines, slipmats, etc.): set `Type` to anything other than `Vinyl` / `Record` — the PDP will then skip the vinyl peek and show the merch info table.

### Variants

- **Records** — single variant (or one per format). No size picker rendered when there's only one variant.
- **Merch with sizes** — add a `Size` option (S/M/L/XL etc). The PDP renders the size picker automatically from `product.variants`. Out-of-stock variants show as **OUT OF STOCK** with the yellow stock notice and a stock-notify email link.

### Theme settings

In the theme editor → **Theme settings**:

- **General → Stock-notify email** — defaults to `stock@sfrrecords.com`. Used in the PDP OOS message.
- **Social** — Instagram / YouTube / Discogs URLs.
- **General → Favicon** — upload a 32×32 PNG.

### Contact / About page settings (theme editor)

Open the Contact page in the theme editor → click the **Contact / About** section:
- Instagram / YouTube / Discogs URLs.
- Upload the three SFR logos (`logo_1`, `logo_2` middle = green badge, `logo_3`).
- Paste the about copy into the rich-text field.

### Events page settings (theme editor)

Open Events in the theme editor → **Events** section:
- Month / year / billboard text / DJ banner text.
- Add an **Event card** block per event; upload an image, link, and alt text.

### Music videos page settings (theme editor)

Open Music Videos in the theme editor → **Music videos** section:
- Add a **Video** block per video; set artist, title, poster image, video URL (MP4 from Files or external).

---

## 3. What's wired vs not

### Wired
- Cart: AJAX add / remove / change via Shopify Cart API. Topnav badge updates live.
- Variants: PDP size picker swaps price, stock state, add-to-cart label.
- Login / register / forgot / reset / activate / account / addresses / order — all use Shopify's `customer_*` forms.
- Login popup posts to `/account/login` with CSRF token (rendered via `{% form 'customer_login' %}`).
- Mobile menu modal mirrors the main nav linklist.
- Footer auto-pulls from the `footer` linklist.
- PDP form posts to `/cart/add` (AJAX, falls back to native if JS off).

### Not wired (Basic Shopify constraints)
- **Checkout is Shopify-hosted** on Basic. Our `templates/cart.json` is the closest custom UI you can have. Clicking PLACE ORDER submits to Shopify's checkout, which carries the customer's name/email/address from cart-form fields where supported. The shipping form on our cart is illustrative — Shopify will collect the real address at checkout.
- **Music player (audio clips per record)** — not ported. The records PDP doesn't have the PLAY CLIPS flyout because there's no clean way to store per-track MP3s without a metafield design pass. If you want this, we can add a `sfr.clips` metafield (JSON list of `{title, url}`) and revive the flyout next session.
- **Expressed payment buttons** (Shop Pay / PayPal / Apple Pay) — Shopify renders these automatically via `{{ content_for_additional_checkout_buttons }}` once enabled in Settings → Payments. The cart template already wires this in.

### Known caveats
- The PDP's "Find" button on the address row in the cart page is decorative — no shipping zone autocomplete is wired.
- The PDP description renders rich-text via `{{ product.description }}`; if your descriptions aren't styled like the demo's `<p>` blocks, tweak `.pdp__desc-body` CSS.
- Search template is a basic list — works but not styled like a PLP.

---

## 4. Where to edit what

| Want to change… | File |
|-----------------|------|
| Global look-and-feel | `assets/theme.css` |
| Cart/popup behavior  | `assets/theme.js` |
| Topnav markup        | `sections/header.liquid` |
| Footer markup        | `sections/footer.liquid` |
| Records grid         | `sections/records-plp.liquid` |
| Merch grid           | `sections/merch-plp.liquid` |
| PDP layout           | `sections/product-detail.liquid` |
| Cart page            | `sections/main-cart.liquid` |
| Contact page         | `sections/contact-about.liquid` |
| Events page          | `sections/events-grid.liquid` |
| Music videos page    | `sections/music-videos.liquid` |
| Login popup          | `snippets/login-popup.liquid` |
| Mobile menu modal    | `snippets/menu-modal.liquid` |
| Trash icon           | `snippets/icon-trash.liquid` |

---

## 5. Files I didn't port

- `V5/preview/checkout.html` — became `templates/cart.json` (real checkout is hosted on Basic).
- `V5/preview/account.html` — split into Shopify's standard customer templates (`templates/customers/*.liquid`).
- The music player audio code in V5 — see note above.

The static demo is preserved at `V5/preview/` so you can compare.

---

## 6. First-run checklist

- [ ] `shopify theme push --unpublished`
- [ ] Create `records` and `merch` collections; assign products
- [ ] Add product metafields (`sfr.cat_no`, `sfr.format`, etc.) and fill them in
- [ ] Create `main-menu` and `footer` linklists with the suggested links
- [ ] Create the four pages (contact, events, music-videos, distribution) and assign templates
- [ ] Configure the Events and Music Videos pages via the theme editor
- [ ] Set theme settings (favicon, stock email, social URLs)
- [ ] Preview the unpublished theme; click through every link
- [ ] Publish

That's it. Hit me up about anything that looks off or behavior you want changed.
