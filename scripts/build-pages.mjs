import { cp, mkdir } from "node:fs/promises";

await mkdir("docs/dist", { recursive: true });

await Promise.all([
  cp("dist/index.js", "docs/dist/index.js"),
  cp("dist/index.js.map", "docs/dist/index.js.map"),
  cp("dist/styles.css", "docs/dist/styles.css")
]);
