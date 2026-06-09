# Sierra Log & Timber — iFrame Embed Widget

Embed a live, filterable floor plan browser on any WordPress site with a single paste. No plugins, no file uploads, no accounts needed.

All future design and product updates happen at the source — **you never need to touch your snippet again**.

---

## How it works

Your WordPress page hosts a small `<iframe>` that points to the widget hosted on GitHub Pages. The widget auto-resizes to fit its content so there is no scrollbar inside the frame.

---

## Step 1 — Paste the snippet

Open `partner-snippet.html` from this folder and copy everything inside it.

**In Elementor:**
1. Edit your page
2. Drag a **Custom HTML** widget to the section where you want the floor plans
3. Paste the snippet into the HTML field
4. Click **Update** / **Publish**

**In the WordPress Block Editor (Gutenberg):**
1. Add a **Custom HTML** block
2. Paste the snippet
3. Click **Publish** or **Update**

**In any other page builder:**
Look for a "Custom HTML", "HTML Block", or "Embed Code" element and paste the snippet there.

---

## Step 2 — Adjust the initial height (optional)

The widget auto-resizes once it loads. The `height="800"` attribute is only the placeholder height shown while the floor plans are fetching. If you want a taller or shorter placeholder, change that number:

```html
<iframe ... height="1000" ...>
```

---

## Step 3 — Customize accent color (optional)

The widget inherits a dark green accent by default (`#2D4A2D`). To match your site's brand, add this CSS to your WordPress theme's **Additional CSS** (Appearance → Customize → Additional CSS):

```css
#fp-iframe-host #floorplan-widget {
  --fp-accent: #your-brand-color;
}
```

> **Note:** Because the widget runs inside an iframe, standard CSS from your site does not reach it. The accent color override above requires the widget host page to expose a CSS variable API — contact Sierra Log & Timber if you need a custom-branded build.

---

## Notes

- **Checkout happens on loghomefloorplans.shop** — clicking any floor plan opens the product page in a new tab on the Sierra Log & Timber store
- **No maintenance required** — all product updates, new plans, and design improvements are deployed at the source; your snippet stays the same forever
- **GitHub Pages hosting** — the widget is served from GitHub Pages which does not allow setting `X-Frame-Options` headers server-side; a `Content-Security-Policy` meta tag (`frame-ancestors *`) is used instead, which is fully supported in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Auto-height** — the iframe listens for `postMessage` events from the widget and adjusts its height automatically as filters expand/collapse and products load; no fixed height scrollbars

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Iframe shows but content is blank | Wait 5–10 seconds for products to load from the Shopify API |
| Height is wrong / content is clipped | Check that the inline `<script>` was pasted along with the `<iframe>` tag |
| Iframe has a scrollbar | Make sure `scrolling="no"` is present on the iframe tag |
| Page builder stripped the script tag | Use the Custom HTML widget type — rich text or visual editors strip scripts |

---

Questions? Contact Sierra Log & Timber directly.
