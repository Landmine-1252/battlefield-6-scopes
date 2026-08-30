# Battlefield 6 Scopes

A static visual reference for comparing Battlefield 6 scopes, zoom levels, and attachment-point costs. The site is designed for GitHub Pages and uses the filenames in `images/` as its database.

Selecting two sight pictures updates the page URL with repeated `compare` query parameters. The comparison dialog includes a **Copy link** button, and opening a shared URL restores both selections automatically.

The catalog defaults to Compact view and also includes Cards and borderless Images views. A picture-size slider changes the grid density, and the selected layout is remembered in the browser. Click a picture to enlarge it, then click the enlarged picture again to close it.

## Image naming

The site does not contain a separate scope database. It reads the ID, display name, magnification, and attachment-point cost from each filename in `images/`.

Use one of these formats:

```text
ID-scope_name_ZOOMx[POINTS].png  # fixed magnification
ID-scope_name-ZOOMx[POINTS].png  # variable magnification
ID-scope_name[POINTS].png        # no magnification suffix
```

In practice, the final underscore separates a fixed magnification, while the final dash separates a selectable magnification on a variable scope:

```text
19-pvq-31_4.00x[10].png
25-mars-f_lpvo-5x[25].png
01-basic_sight[5].png
```

More examples:

```text
24-1p86_lpvo-4.5x[20].png   # ID 24, 1P86 LPVO, variable 4.5x, 20 points
25-mars-f_lpvo-5x[25].png   # ID 25, MARS-F LPVO, variable 5x, 25 points
19-pvq-31_4.00x[10].png     # ID 19, PVQ-31, fixed 4x, 10 points
23-su-230_lpvo-x1[20].png   # `-x1` is also accepted for a variable 1x view
```

- `ID` is only used to organize and sort the files. It is not an ID from the game and is not displayed on the site.
- Underscores in the scope name are displayed as spaces.
- Hyphens inside the scope name remain visible. For example, `pvq-31` displays as `PVQ-31`.
- A fixed magnification uses a final underscore, such as `_1.50x` or `_4.00x`.
- A variable scope uses the final dash for each selectable magnification, such as `-1x`, `-4.5x`, or `-x1`.
- Put the attachment cost in square brackets before the extension, such as `[5]`, `[20]`, or `[25]`.
- If `[POINTS]` is omitted, the site assumes **10 points**.
- Files with the same ID and scope name are grouped into one scope with multiple zoom choices.
- Add one screenshot for every selectable magnification on a variable scope.

### Point-cost exception

Iron sights on sniper rifles cost **15 points**. This is a one-off exception because they do not produce scope glint. Include `[15]` in those filenames instead of relying on the normal 10-point default.

## Correcting or adding screenshots

If a scope name, point value, magnification, or sight picture is wrong, corrections and replacement images are welcome. Use the same default firing-range position as the existing screenshots so every sight picture remains directly comparable.

For a **3440×1440** source screenshot, crop this rectangle:

```text
X:      1095
Y:       345
Width:  1250
Height:  750
```

This crop has an exact center of **1720,720**. Compared with a 1000×600 crop, it retains approximately 125 extra pixels on each side and 75 extra pixels above and below. The larger crop is preferred because some of the larger Battlefield scopes can otherwise be clipped.

When contributing an image:

1. Enter the firing range and use the default firing-range position shown in the existing captures.
2. Equip the scope and select the magnification being documented.
3. Take a full-resolution screenshot without moving from that position.
4. Apply the 1250×750 crop above when the source is 3440×1440.
5. Save it as a PNG in `images/` using the filename rules above.
6. For a replacement, remove the incorrect image so the old and corrected versions are not both included.
7. Run the site locally and verify the name, zoom, point cost, and crop before opening a pull request.

Add the image, commit, and push to `main`. The GitHub Actions workflow rebuilds the filename manifest and deploys the site automatically.

## Run locally

On Windows, double-click `serve-local.bat`, then open <http://localhost:8000>. Press Ctrl+C in the server window to stop it. If Node.js is installed, the batch file also refreshes the image manifest automatically.

After adding or renaming images, regenerate the manifest before starting the server:

```bash
npm run manifest
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

To build the exact clean directory deployed by GitHub Pages:

```bash
npm run build
```

## Enable GitHub Pages

In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. The site will be available at:

<https://landmine-1252.github.io/battlefield-6-scopes/>
