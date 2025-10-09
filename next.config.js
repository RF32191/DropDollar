/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimized for Vercel deployment
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'drop-dollar.com'],
  },
  typescript: {
    // Skip type checking during build for now
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build for now
    ignoreDuringBuilds: true,
  },
  // Disable static optimization completely
  experimental: {
    staticPageGenerationTimeout: 1,
  },
  // Force all pages to be dynamic
  output: 'standalone',
}

module.exports = nextConfig
