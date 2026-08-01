"""Build every Chrome Web Store listing asset from the raw popup captures.

Replaces make_screenshots.ps1 / make_banners.ps1, which hardcoded an absolute
path from a previous checkout and captioned features that no longer exist.
Paths here are derived from this file's location, so the script runs anywhere.

    python tools/make_store_assets.py

Inputs   docs/screenshots/popup-*.png   (raw 720x1440 popup captures, 2x)
Outputs  store/icon/, store/screenshots/, store/promo/
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "docs", "screenshots")
STORE = os.path.join(ROOT, "store")

# Palette lifted from popup.html so the listing matches the product.
PINE_1 = (16, 49, 43)
PINE_2 = (27, 74, 64)
INK = (255, 255, 255)
SUB = (159, 192, 181)
ACCENT = (58, 169, 143)

FONTS = r"C:\Windows\Fonts"
SERIF = os.path.join(FONTS, "georgiab.ttf")
SANS = os.path.join(FONTS, "segoeui.ttf")
SANS_BOLD = os.path.join(FONTS, "segoeuib.ttf")


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def gradient(w, h, c0, c1):
    """Diagonal gradient, drawn once at low res and scaled up (fast + smooth)."""
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126.0
            px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return small.resize((w, h), Image.LANCZOS)


def shadowed(canvas, img, x, y):
    """Paste with a soft drop shadow so the popup lifts off the background."""
    from PIL import ImageFilter
    sh = Image.new("RGBA", (img.width + 60, img.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [30, 34, 30 + img.width, 34 + img.height], radius=18, fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    canvas.paste(sh, (x - 30, y - 30), sh)
    rounded = Image.new("L", img.size, 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, img.width - 1, img.height - 1],
                                              radius=14, fill=255)
    canvas.paste(img, (x, y), rounded)


def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def screenshot(src_name, out_name, title, bullets):
    W, H = 1280, 800
    canvas = gradient(W, H, PINE_1, PINE_2).convert("RGBA")

    src = Image.open(os.path.join(RAW, src_name)).convert("RGB")
    target_h = 680
    scale = target_h / src.height
    shot = src.resize((int(src.width * scale), target_h), Image.LANCZOS)
    shadowed(canvas, shot, 96, (H - target_h) // 2)

    d = ImageDraw.Draw(canvas)
    tx = 96 + shot.width + 84
    tw = W - tx - 72

    t_font = font(SERIF, 52)
    b_font = font(SANS, 25)
    lines = wrap(d, title, t_font, tw)
    y = 188
    for ln in lines:
        d.text((tx, y), ln, font=t_font, fill=INK)
        y += 62
    y += 26
    for b in bullets:
        d.ellipse([tx + 2, y + 11, tx + 10, y + 19], fill=ACCENT)
        for i, ln in enumerate(wrap(d, b, b_font, tw - 28)):
            d.text((tx + 26, y), ln, font=b_font, fill=SUB)
            y += 34
        y += 16

    out = os.path.join(STORE, "screenshots", out_name)
    canvas.convert("RGB").save(out, "PNG")
    print("wrote", os.path.relpath(out, ROOT), canvas.size)


def promo(w, h, out_name, title_size, tag_size, horizontal):
    canvas = gradient(w, h, PINE_1, PINE_2).convert("RGBA")
    d = ImageDraw.Draw(canvas)
    icon = Image.open(os.path.join(ROOT, "icons", "icon128.png")).convert("RGBA")

    t_font = font(SERIF, title_size)
    g_font = font(SANS, tag_size)
    title, tag = "Reddit Positivity Filter", "Choose what reaches you."

    if horizontal:
        side = int(h * 0.42)
        ic = icon.resize((side, side), Image.LANCZOS)
        ix, iy = int(h * 0.28), (h - side) // 2
        canvas.paste(ic, (ix, iy), ic)
        tx = ix + side + int(h * 0.11)
        d.text((tx, h * 0.34), title, font=t_font, fill=INK)
        d.text((tx, h * 0.34 + title_size * 1.5), tag, font=g_font, fill=SUB)
    else:
        side = int(h * 0.34)
        ic = icon.resize((side, side), Image.LANCZOS)
        canvas.paste(ic, ((w - side) // 2, int(h * 0.13)), ic)
        for text, fnt, cy, fill in ((title, t_font, 0.60, INK), (tag, g_font, 0.79, SUB)):
            tw = d.textlength(text, font=fnt)
            d.text(((w - tw) / 2, h * cy), text, font=fnt, fill=fill)

    out = os.path.join(STORE, "promo", out_name)
    canvas.convert("RGB").save(out, "PNG")
    print("wrote", os.path.relpath(out, ROOT), canvas.size)


def main():
    for sub in ("icon", "screenshots", "promo"):
        os.makedirs(os.path.join(STORE, sub), exist_ok=True)

    Image.open(os.path.join(ROOT, "icons", "icon128.png")).save(
        os.path.join(STORE, "icon", "store-icon-128.png"), "PNG")
    print("wrote store/icon/store-icon-128.png (128x128)")

    screenshot("popup-home.png", "01-home-feed-1280x800.png",
               "Your home feed, your rules", [
                   "Show only the communities you allow",
                   "Or switch the feed off entirely",
                   "Chat and notifications keep working"])
    screenshot("popup-filters.png", "02-filters-1280x800.png",
               "Filter by word, or by whole idea", [
                   "Hide posts mentioning words you choose",
                   "Themes block a topic when its concepts appear together",
                   "A live test box shows why a post would be hidden"])
    screenshot("popup-discover.png", "03-communities-1280x800.png",
               "Block communities for good", [
                   "Blocked communities vanish from every feed",
                   "Their pages are blocked and never recommended",
                   "One tidy list, with filter and one-click unblock"])
    screenshot("popup-backup.png", "04-backup-1280x800.png",
               "Back up each list on its own", [
                   "Keywords, themes and communities export separately",
                   "Importing one never overwrites the others",
                   "Or move everything in a single file"])

    promo(440, 280, "small-tile-440x280.png", 33, 17, horizontal=False)
    promo(1400, 560, "marquee-1400x560.png", 66, 30, horizontal=True)


if __name__ == "__main__":
    main()
