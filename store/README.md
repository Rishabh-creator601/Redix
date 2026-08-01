# Chrome Web Store listing assets

Everything the **Developer Dashboard** asks for when publishing this extension,
one folder per field group. These images are **not** part of the extension
package — Chrome never reads them from `manifest.json`, and they are excluded
from `reddit-positivity-filter.zip`.

Regenerate them all with:

```bash
python tools/make_store_assets.py
```

## Structure

```
store/
├─ icon/
│   └─ store-icon-128.png              Store icon field
├─ screenshots/                         Screenshots field, shown in listing order
│   ├─ 01-home-feed-1280x800.png
│   ├─ 02-filters-1280x800.png
│   ├─ 03-communities-1280x800.png
│   └─ 04-backup-1280x800.png
└─ promo/
    ├─ small-tile-440x280.png           Small promo tile field
    └─ marquee-1400x560.png             Marquee promo tile field
```

## What goes where

| Dashboard field | File | Size | Required |
|---|---|---|---|
| Store icon | `icon/store-icon-128.png` | 128×128 | ✅ Required |
| Screenshots | `screenshots/01`–`04` | 1280×800 | ✅ At least 1 (max 5) |
| Small promo tile | `promo/small-tile-440x280.png` | 440×280 | Recommended |
| Marquee promo tile | `promo/marquee-1400x560.png` | 1400×560 | Optional — needed to be featured |

Screenshots are numbered in the order they should appear in the listing; the
first one is the thumbnail users see in search results.

## Spec reference

- **Store icon** — 128×128 PNG. Same artwork as `../icons/icon128.png`.
- **Screenshots** — 1280×800 **or** 640×400, PNG or JPEG, no alpha. At least one
  required, 4–5 recommended. Ours are 1280×800.
- **Small promo tile** — 440×280 PNG or JPEG.
- **Marquee promo tile** — 1400×560 PNG or JPEG.

## How they are built

`tools/make_store_assets.py` composites the raw popup captures in
[`../docs/screenshots/`](../docs/screenshots) onto the extension's own pine
palette (the colours are lifted from `popup.html`) and adds the captions.

The raw captures are taken from the real popup rendered at 360×720 with a 2×
device pixel ratio, so the text stays sharp when scaled. To retake them, render
`popup.html` with the `chrome.*` APIs stubbed and screenshot each tab.

> **Keep the captions honest.** They describe what the extension actually does
> today. If a feature is added or removed, update the caption text in
> `make_store_assets.py` and regenerate — a listing that advertises a feature
> the extension no longer has is grounds for rejection.
