import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateManifest } from "./generate-manifest.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "_site");
const siteFiles = ["index.html", "styles.css", "app.js", "scope-parser.js", "favicon.svg", ".nojekyll"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const filename of siteFiles) {
  await cp(path.join(projectRoot, filename), path.join(outputDirectory, filename));
}

await cp(path.join(projectRoot, "images"), path.join(outputDirectory, "images"), {
  recursive: true,
});

const imageCount = await generateManifest(path.join(outputDirectory, "scopes-data.js"));
console.log(`Built _site with ${imageCount} images.`);
