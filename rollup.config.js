import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/index.js',
  format: 'es6',
  dest: 'index.js',
  plugins: [
    // Rollup's cjs option isn't compatible with Babel imports
    // Just do the minimum to get rollup to compile
    // And then use babel cli for the rest
    babel({
      plugins: [
        'transform-async-to-generator',
      ],
      babelrc: false,
    }),
  ],
};
