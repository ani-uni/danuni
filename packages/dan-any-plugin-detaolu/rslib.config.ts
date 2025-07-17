import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'
import { defineConfig } from '@rslib/core'

import pkg from './package.json'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      output: {
        filename: { js: 'index.js' },
        target: 'node',
      },
      dts: true,
    },
    {
      format: 'umd',
      output: {
        filename: { js: 'index.umd.min.js' },
        target: 'web',
      },
      dts: true,
      umdName: pkg.name,
      plugins: [pluginNodePolyfill()],
    },
  ],
})
