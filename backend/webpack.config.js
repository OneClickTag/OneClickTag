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
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        // Mock optional @nestjs/terminus peer dependencies that we don't use
        // We use Prisma, not these ORMs
        '@mikro-orm/core': false,
        '@mikro-orm/nestjs': false,
        '@nestjs/mongoose': false,
        '@nestjs/sequelize': false,
        '@nestjs/typeorm': false,
        mongoose: false,
        sequelize: false,
        typeorm: false,
      },
    },
  };
};
