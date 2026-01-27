const path = require('path');
const webpack = require('webpack');

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
    plugins: [
      ...(options.plugins || []),
      // Ignore optional peer dependencies from @nestjs/terminus
      // These are database adapters we don't use (we use Prisma)
      new webpack.IgnorePlugin({
        checkResource(resource, context) {
          // Database adapters and ORMs we don't use
          const ignoredFromTerminus = [
            '@mikro-orm/core',
            '@mikro-orm/nestjs',
            '@nestjs/mongoose',
            '@nestjs/sequelize',
            '@nestjs/typeorm',
            'mongoose',
            'sequelize',
            'typeorm',
          ];
          if (
            ignoredFromTerminus.includes(resource) &&
            context.includes('@nestjs/terminus')
          ) {
            return true;
          }
          return false;
        },
      }),
    ],
  };
};
