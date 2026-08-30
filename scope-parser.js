export const DEFAULT_POINTS = 10;

/**
 * Parse an image filename using this format:
 *
 *   ID-scope_name-ZOOM[POINTS].png
 *
 * Zoom supports `_1.50x`, `-4.5x`, and LPVO-style `-x1` endings. The optional
 * [POINTS] block may appear anywhere and defaults to 10 when it is absent.
 */
export function parseFilename(filename) {
  // Repeated extensions such as `.png.png` are tolerated so an accidental
  // Windows rename does not split zoom variants into separate scope cards.
  const extensionless = filename.replace(/(?:\.(?:avif|gif|jpe?g|png|webp))+$/i, "");
  const pointMatch = extensionless.match(/\[(\d+)\]/);
  const points = pointMatch ? Number(pointMatch[1]) : DEFAULT_POINTS;
  const cleanStem = extensionless.replace(/\[\d+\]/g, "").trim();
  const idMatch = cleanStem.match(/^(\d+)[-_](.+)$/);

  if (!idMatch) return null;

  const idText = idMatch[1];
  let details = idMatch[2];
  let zoom = null;
  const zoomMatch = details.match(/(?:_|-)(?:x(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)x)$/i);

  if (zoomMatch) {
    zoom = Number(zoomMatch[1] || zoomMatch[2]);
    details = details.slice(0, zoomMatch.index);
  }

  // Underscores represent spaces. Hyphens are part of the in-game scope name
  // and remain visible; the trailing magnification separator was removed above.
  const normalizedName = details.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const name = normalizedName ? normalizedName.toUpperCase() : `SCOPE ${Number(idText)}`;

  return {
    id: Number(idText),
    idText,
    key: `${Number(idText)}::${normalizedName.toLowerCase()}`,
    name,
    points,
    zoom,
    filename,
    src: `images/${encodeURIComponent(filename)}`,
  };
}

export function buildScopes(files, onSkipped = () => {}) {
  const parsed = files.map((filename) => {
    const view = parseFilename(filename);
    if (!view) onSkipped(filename);
    return view;
  }).filter(Boolean);
  const groups = new Map();

  for (const view of parsed) {
    if (!groups.has(view.key)) {
      groups.set(view.key, {
        key: view.key,
        id: view.id,
        idText: view.idText,
        name: view.name,
        points: view.points,
        views: [],
      });
    }

    const group = groups.get(view.key);
    group.views.push(view);

    // Treat a point value on any zoom variant as metadata for the whole optic.
    group.points = Math.max(group.points, view.points);
  }

  return [...groups.values()]
    .map((scope) => {
      const views = scope.views
        .map((view) => ({ ...view, points: scope.points }))
        .sort((a, b) => (a.zoom ?? 0) - (b.zoom ?? 0));

      return {
        ...scope,
        views,
        minZoom: Math.min(...views.map((view) => view.zoom ?? 1)),
        maxZoom: Math.max(...views.map((view) => view.zoom ?? 1)),
      };
    })
    .sort((a, b) => a.id - b.id || a.name.localeCompare(b.name));
}
