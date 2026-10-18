import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: {
    popup: join(root, "src/popup.ts"),
    background: join(root, "src/background.ts"),
  },
  outdir: dist,
  bundle: true,
  format: "esm",
  target: "chrome116",
  sourcemap: false,
  minify: false,
  logLevel: "info",
});

for (const file of ["manifest.json", "src/popup.html", "src/popup.css"]) {
  const target = file === "manifest.json" ? "manifest.json" : file.replace("src/", "");
  await copyFile(join(root, file), join(dist, target));
}

console.info("Extension built in extension/dist. Load it via chrome://extensions → Load unpacked.");
