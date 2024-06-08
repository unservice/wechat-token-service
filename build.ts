import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./src/client.ts"],
  outdir: "./dist",
  target: "bun",
  plugins: [dts()],
});
