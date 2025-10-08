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
}

module.exports = nextConfig
