# Battlefield 6 Scopes

A static visual reference for comparing Battlefield 6 scopes, zoom levels, and attachment-point costs. The site is designed for GitHub Pages and uses the filenames in `images/` as its database.

Selecting two sight pictures updates the page URL with repeated `compare` query parameters. The comparison dialog includes a **Copy link** button, and opening a shared URL restores both selections automatically.

The catalog defaults to Compact view and also includes Cards and borderless Images views. A picture-size slider changes the grid density, and the selected layout is remembered in the browser. Click a picture to enlarge it, then click the enlarged picture again to close it.

## Add or update a scope

Name each image using this format:

```text
ID-scope_name-ZOOM[POINTS].png
```

Examples:

```text
24-1p86_lpvo-4.5x.png       # ID 24, 1P86 LPVO, variable 4.5x, defaults to 10 points
25-mars-f_lpvo-5x[25].png   # ID 25, MARS-F LPVO, variable 5x, 25 points
19-pvq-31_4.00x[10].png     # ID 19, PVQ-31, fixed 4x, 10 points
23-su-230_lpvo-x1.png       # `-x1` is also accepted as a zoom ending
```

- The first number is the numeric scope ID.
- The text in the middle is the scope name. Underscores are displayed as spaces; hyphens remain part of the name.
- Fixed zoom can end in `_1.50x`. The final `-` separates zoom on variable scopes, such as `-4.5x` or `-x1`.
- A point cost in square brackets can appear anywhere in the filename.
- If `[POINTS]` is omitted, the scope costs **10 points**.
- Images with the same ID and scope name are grouped into one card with zoom choices.

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
