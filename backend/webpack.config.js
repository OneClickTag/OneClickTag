const path = require('path');

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
    // Don't externalize - bundle everything for serverless
    externals: [],
    optimization: {
      minimize: false,
    },
  };
};
