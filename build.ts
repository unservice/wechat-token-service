/// <reference path="./src/bun-env.d.ts" />

import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./src/client.ts"],
  outdir: "./dist",
  target: "bun",
  plugins: [],
});
