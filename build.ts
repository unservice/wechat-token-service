import dts from 'bun-plugin-dts'

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  plugins: [dts()],
  external: ['@unservice/*', '@hono/*', 'hono', 'zod'],
})
