import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const imageDirectory = path.join(projectRoot, "images");
const outputPath = process.argv[2]
  ? path.resolve(projectRoot, process.argv[2])
  : path.join(projectRoot, "scopes-data.js");
const supportedImage = /\.(?:avif|gif|jpe?g|png|webp)$/i;

export async function generateManifest(destination = outputPath) {
  const entries = await readdir(imageDirectory, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && supportedImage.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const contents = [
    "// Generated from the images directory. Run `npm run manifest` after adding images.",
    `window.BF6_SCOPE_IMAGES = ${JSON.stringify(filenames, null, 2)};`,
    "",
  ].join("\n");

  await writeFile(destination, contents, "utf8");
  return filenames.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await generateManifest();
  console.log(`Generated ${path.relative(projectRoot, outputPath)} with ${count} images.`);
}
