import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcrypt'],
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely ignore server-only modules on client
      config.resolve.alias = {
        ...config.resolve.alias,
        'bcrypt': false,
        '@mapbox/node-pre-gyp': false,
        'mock-aws-s3': false,
        'aws-sdk': false,
        'nock': false,
      };
    } else {
      // On server, externalize problematic modules
      config.externals = [...(config.externals || []), 'bcrypt'];
    }

    // Ignore problematic file types
    config.module.rules.push({
      test: /\.(html|node)$/,
      loader: 'ignore-loader',
    });

    // Fix for modules that try to require aws-sdk or mock-aws-s3
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^(aws-sdk|mock-aws-s3|@mswjs\/interceptors\/presets\/node)$/,
      })
    );

    return config;
  },
};

export default nextConfig;
