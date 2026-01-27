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
      libraryExport: 'default', // Export the default export for Vercel
    },
    externals: [
      nodeExternals({
        allowlist: [],
      }),
    ],
    optimization: {
      minimize: false,
    },
  };
};
