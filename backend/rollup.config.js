import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/main.ts',
  output: {
    file: 'build/index.js',
    format: 'iife',
    name: 'nakama-runtime',
    sourcemap: true,
  },
  plugins: [
    typescript(),
    resolve({
      browser: false,
      preferBuiltins: true
    }),
    commonjs(),
  ],
};
