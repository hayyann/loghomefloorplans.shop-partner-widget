# Sierra Log & Timber — Floor Plan Widget

Embed a live, filterable floor plan browser on any WordPress site. The widget connects directly to the Sierra Log & Timber Shopify store and requires no plugin.

---

## What it does

- Displays all Sierra Log & Timber floor plans in a responsive grid
- Filters by size, style, bedrooms, bathrooms, stories, garage, and basement
- Search by name or keyword
- Sort by name, size, or price
- Each plan card links to the full product page on **loghomefloorplans.shop**
- Checkout happens on loghomefloorplans.shop — nothing to configure on your end

---

## Step 1 — Add the token

Open `floorplan-widget.js` in any text editor. Near the top you will see:

```js
const STOREFRONT_TOKEN = 'YOUR_PUBLIC_STOREFRONT_TOKEN';
```

Replace `YOUR_PUBLIC_STOREFRONT_TOKEN` with the public Storefront API token provided by Sierra Log & Timber. Save the file.

---

## Step 2 — Upload the two files to WordPress

You need to make `floorplan-widget.js` and `floorplan-widget.css` publicly accessible on your site.

**Option A — Upload via WordPress Media Library**

1. Go to **WordPress Admin → Media → Add New**
2. Upload `floorplan-widget.js` and `floorplan-widget.css`
3. Click each file and copy its **File URL** (e.g. `https://yoursite.com/wp-content/uploads/2024/06/floorplan-widget.js`)
4. Keep both URLs handy — you will paste them in Step 3

**Option B — Upload via FTP / File Manager**

Upload both files to your theme folder or a `/widgets/` subfolder inside `wp-content/uploads/`. Note the full URL path to each file.

---

## Step 3 — Paste the snippet into your page

Open `embed.html` from this folder in a text editor, or copy the block below.

Update the two file paths with the URLs from Step 2, then paste the whole thing into your page.

**In Elementor:**
1. Edit the page → drag a **Custom HTML** widget to the section where you want the floor plans
2. Paste the snippet into the HTML field
3. Update the `href` on the `<link>` tag and the `src` on the `<script>` tag
4. Save and publish

**In the WordPress Block Editor (Gutenberg):**
1. Add a **Custom HTML** block
2. Paste the snippet
3. Update the two paths
4. Publish

**Snippet to paste:**

```html
<link rel="stylesheet" href="https://yoursite.com/path/to/floorplan-widget.css">

<div id="floorplan-widget">
  <div id="fp-filters"></div>
  <div id="fp-grid"></div>
</div>

<script src="https://yoursite.com/path/to/floorplan-widget.js"></script>
```

---

## Step 4 — Customize brand colors (optional)

Add a `<style>` block anywhere on the same page (or in your theme's CSS) to override the default colors:

```html
<style>
  #floorplan-widget {
    --fp-accent:      #2D4A2D;   /* chip highlight, price color, spinner */
    --fp-card-radius: 8px;       /* card corner rounding */
    --fp-font:        inherit;   /* defaults to your site's body font */
  }
</style>
```

Change `#2D4A2D` to any hex color that matches your brand.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Unable to load floor plans" error | Check that the Storefront token in `floorplan-widget.js` is correct and the file is saved |
| Widget shows but no images | Normal if products have no images — the widget shows a neutral placeholder |
| CSS conflicts with your theme | The widget is scoped to `#floorplan-widget` — if conflicts appear, increase specificity on your theme's rules |
| No plans after filtering | Click **Clear filters** or reload — all filters reset to defaults |

---

## Notes

- **Checkout happens on loghomefloorplans.shop** — let your visitors know they will be redirected to finalize any purchase
- The widget fetches live product data directly from Shopify — no caching layer, always up to date
- The public Storefront token is safe to include in client-side code by design (it is read-only)
- Do not share the **private** admin token — only the public Storefront token goes in this widget

---

Questions? Contact Sierra Log & Timber directly.
