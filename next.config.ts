import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  distDir: process.env.ACOFFEE_E2E === '1' ? 'artifacts/next-test' : '.next',
  images: {
    remotePatterns: process.env.CLOUDINARY_CLOUD_NAME
      ? [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**` }]
      : [],
  },
  allowedDevOrigins: ['127.0.0.1'],
  // Server Function arguments include passwords in authentication forms.
  logging: { serverFunctions: false, incomingRequests: { ignore: [/\/reset-password/] } },
  async headers() {
    return ['/reset-password', '/forgot-password'].map(source => ({ source, headers: [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }))
  },
}

export default nextConfig
