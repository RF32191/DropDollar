/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simple config that works
  images: {
    unoptimized: true,
    domains: ['localhost', 'drop-dollar.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
