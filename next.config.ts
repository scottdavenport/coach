import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uqzgbvcrnxdzfgmkkoxb.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // These packages should only be used on the server side
      config.externals = config.externals || [];
      config.externals.push('pdf-parse', 'mammoth', 'xlsx');
    } else {
      // For client-side, ignore these server-only packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        util: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
