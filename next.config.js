/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimized for Vercel deployment
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'drop-dollar.com', 'www.drop-dollar.com'],
  },
  typescript: {
    // Skip type checking during build for now
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build for now
    ignoreDuringBuilds: true,
  },
  // Optimize for production
  compiler: {
    removeConsole: false, // Keep console.logs for debugging
  },
  // Headers for better CORS and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
