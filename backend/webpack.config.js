const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    entry: './src/main.ts',
    output: {
      ...options.output,
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs2',
    },
    // Externalize node_modules but let Vercel's file tracing include them
    externals: [
      nodeExternals({
        // Allow these to be bundled (don't externalize)
        allowlist: [/^@nestjs/, /^class-validator/, /^class-transformer/],
      }),
    ],
    optimization: {
      minimize: false,
    },
  };
};
