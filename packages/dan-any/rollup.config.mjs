import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

// prettier 不识别 with 参数
// import pkg from './package.json'
import pkg from './package.json' with { type: 'json' }

const name = 'DanAny'

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.min.js',
      format: 'iife',
      name,
      plugins: [terser()],
    },
    {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name,
      plugins: [terser()],
    },
    {
      file: 'dist/index.js',
      format: 'esm',
      plugins: [terser()],
    },
  ],
  external: [pkg.peerDependencies, pkg.dependencies],
  plugins: [
    json(),
    commonjs(),
    resolve(),
    typescript({
      outDir: 'dist',
      declaration: true,
      declarationDir: 'dist',
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**', // 只编译我们的源代码
    }),
  ],
}
