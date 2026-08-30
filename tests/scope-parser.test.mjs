import test from "node:test";
import assert from "node:assert/strict";
import { buildScopes, parseFilename } from "../scope-parser.js";

test("parses the documented ID, scope name, zoom, and default points", () => {
  assert.deepEqual(parseFilename("24-1p86_lpv0-4.5x.png"), {
    id: 24,
    idText: "24",
    key: "24::1p86 lpv0",
    name: "1P86 LPV0",
    points: 10,
    zoom: 4.5,
    filename: "24-1p86_lpv0-4.5x.png",
    src: "images/24-1p86_lpv0-4.5x.png",
  });
});

test("reads bracketed points and URL-encodes the image path", () => {
  const result = parseFilename("25-mars-f_lpvo-5x[25].png");
  assert.equal(result.points, 25);
  assert.equal(result.name, "MARS-F LPVO");
  assert.equal(result.zoom, 5);
  assert.equal(result.src, "images/25-mars-f_lpvo-5x%5B25%5D.png");
});

test("accepts LPVO zoom values with x before the number", () => {
  const result = parseFilename("23-su-230_lpvo-x1.png");
  assert.equal(result.name, "SU-230 LPVO");
  assert.equal(result.zoom, 1);
});

test("tolerates repeated image extensions", () => {
  const result = parseFilename("35-mc-co_lpvo-2x[25].png.png");
  assert.equal(result.name, "MC-CO LPVO");
  assert.equal(result.zoom, 2);
  assert.equal(result.points, 25);
});

test("groups zoom variants and shares explicit points across the optic", () => {
  const [scope] = buildScopes([
    "25-mars-f_lpvo-1x.png",
    "25-mars-f_lpvo-5x[25].png",
    "25-mars-f_lpvo-2x.png",
  ]);

  assert.equal(scope.id, 25);
  assert.equal(scope.points, 25);
  assert.deepEqual(scope.views.map((view) => view.zoom), [1, 2, 5]);
  assert.deepEqual(scope.views.map((view) => view.points), [25, 25, 25]);
});

test("rejects files without a numeric ID prefix", () => {
  assert.equal(parseFilename("mars-f_lpvo-5x.png"), null);
});

test("keeps dashes in fixed scope names and uses underscores as spaces", () => {
  const result = parseFilename("19-pvq-31_long_range_4.00x[10].png");
  assert.equal(result.name, "PVQ-31 LONG RANGE");
  assert.equal(result.zoom, 4);
});
