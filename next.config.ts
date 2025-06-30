import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.html$/,
      issuer: /node-pre-gyp/,
      use: 'null-loader'
    });
    return config;
  }
};

export default nextConfig;
