/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
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
