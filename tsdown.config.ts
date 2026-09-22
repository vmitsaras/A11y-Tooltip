import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    "addons/index": "./src/addons/index.ts",
    "adapters/index": "./src/adapters/index.ts",
    docs: "./src/docs.ts"
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "neutral",
  outDir: "dist"
});
