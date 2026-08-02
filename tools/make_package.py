"""Build the Chrome Web Store upload package.

Produces `reddit-positivity-filter.zip` at the repo root containing only the
files Chrome actually loads. Store assets, docs and tooling stay out.

    python tools/make_package.py

The archive is written deterministically: fixed entry order, fixed timestamps,
forward-slash paths, no directory entries and no extra attributes, so two builds
of the same source produce byte-identical zips.
"""

import json
import os
import sys
import zipfile

# Everything Chrome reads, in a stable order. manifest.json must come first and
# must sit at the archive root — a nested folder is the classic upload failure.
PAYLOAD = [
    "manifest.json",
    "content.js",
    "content.css",
    "popup.html",
    "popup.js",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "reddit-positivity-filter.zip")

# A fixed DOS timestamp (1980-01-01) keeps rebuilds byte-identical.
FIXED_DATE = (1980, 1, 1, 0, 0, 0)


def fail(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


def check():
    """Catch the things the store rejects, before the upload does."""
    for rel in PAYLOAD:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            fail("missing file: " + rel)

    raw = open(os.path.join(ROOT, "manifest.json"), "rb").read()
    if raw[:3] == b"\xef\xbb\xbf":
        fail("manifest.json starts with a UTF-8 BOM; Chrome cannot parse it. "
             "Re-save it as UTF-8 without BOM.")
    try:
        m = json.loads(raw.decode("utf-8"))
    except Exception as e:
        fail("manifest.json is not valid JSON: %s" % e)

    if m.get("manifest_version") != 3:
        fail("manifest_version must be 3")
    if len(m.get("name", "")) > 45:
        fail("name exceeds the 45-character store limit")
    if len(m.get("description", "")) > 132:
        fail("description exceeds the 132-character store limit")

    # Every path the manifest points at has to be in the payload.
    referenced = set(m.get("icons", {}).values())
    referenced |= set(m.get("action", {}).get("default_icon", {}).values())
    if m.get("action", {}).get("default_popup"):
        referenced.add(m["action"]["default_popup"])
    for cs in m.get("content_scripts", []):
        referenced |= set(cs.get("js", [])) | set(cs.get("css", []))

    missing = sorted(referenced - set(PAYLOAD))
    if missing:
        fail("manifest references files not in the package: " + ", ".join(missing))

    return m


def build(m):
    if os.path.exists(OUT):
        os.remove(OUT)

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in PAYLOAD:
            info = zipfile.ZipInfo(rel, date_time=FIXED_DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0          # advertise as MS-DOS, not Unix
            info.external_attr = 0o644 << 16
            z.writestr(info, open(os.path.join(ROOT, rel), "rb").read())

    with zipfile.ZipFile(OUT) as z:
        if z.testzip() is not None:
            fail("the archive failed its own CRC check")
        names = z.namelist()

    print("Built %s" % os.path.relpath(OUT, ROOT))
    print("  version : %s" % m["version"])
    print("  entries : %d" % len(names))
    print("  size    : %d bytes" % os.path.getsize(OUT))
    print()
    for n in names:
        print("  " + n)
    print()
    print("Remember: the store rejects an upload whose version is not higher "
          "than the published one. Bump manifest.json and rebuild for each update.")


if __name__ == "__main__":
    build(check())
