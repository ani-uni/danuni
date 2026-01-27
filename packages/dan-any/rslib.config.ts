import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'
import { defineConfig } from '@rslib/core'

import pkg from './package.json'

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
      'plugins/index': './src/plugins/index.ts',
      'plugins/bili-dedupe': './src/plugins/bili-dedupe/index.ts',
      'plugins/stats': './src/plugins/stats/index.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      output: {
        filename: { js: '[name].js' },
        distPath: './dist/node',
        target: 'node',
      },
      dts: true,
    },
    {
      format: 'esm',
      output: {
        filename: { js: '[name].min.js' },
        distPath: './dist/browser',
        target: 'web',
      },
      dts: true,
      plugins: [pluginNodePolyfill()],
    },
    {
      format: 'umd',
      output: {
        filename: { js: '[name].umd.min.js' },
        distPath: './dist/umd',
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
