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
      format: 'esm',
      output: {
        filename: { js: 'index.min.js' },
        target: 'web',
      },
      dts: true,
      plugins: [pluginNodePolyfill()],
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

// import path from 'node:path'
// import type { Configuration } from '@rspack/cli'
// import type { SwcLoaderOptions } from '@rspack/core'

// import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin'

// const config: Configuration = {
//   entry: './src/index.ts',
//   output: { path: path.resolve(__dirname, 'dist'), clean: true },
//   resolve: {
//     extensions: ['.ts', '.js'],
//   },
//   experiments: {
//     futureDefaults: true,
//   },
//   plugins: [
//     // 仅在 RSDOCTOR 为 true 时注册插件，因为插件会增加构建耗时
//     process.env.RSDOCTOR &&
//       new RsdoctorRspackPlugin({
//         // 插件选项
//       }),
//   ].filter(Boolean),
//   module: {
//     rules: [
//       {
//         test: /\.(ts|js)$/,
//         exclude: [/node_modules/],
//         loader: 'builtin:swc-loader',
//         options: {
//           jsc: {
//             parser: {
//               syntax: 'typescript',
//             },
//           },
//           env: {
//             mode: 'usage',
//             coreJs: '3',
//             targets: [
//               'chrome >= 87',
//               'edge >= 88',
//               'firefox >= 78',
//               'safari >= 14',
//             ],
//           },
//           isModule: 'unknown',
//         } satisfies SwcLoaderOptions,
//         type: 'javascript/auto',
//       },
//     ],
//   },
// }

// export default config
