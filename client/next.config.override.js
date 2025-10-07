// Next.js build override
const withOverrides = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    forceSwcTransforms: true
  },
  swcMinify: true,
  compiler: {
    removeConsole: false
  },
  webpack: (config, { isServer }) => {
    // Force resolve dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    };
    
    // Increase memory limit
    config.performance = {
      ...config.performance,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    };

    return config;
  }
};

module.exports = withOverrides;