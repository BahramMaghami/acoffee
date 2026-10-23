import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: process.env.CLOUDINARY_CLOUD_NAME
      ? [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**` }]
      : [],
  },
  allowedDevOrigins: ['127.0.0.1'],
  // Server Function arguments include passwords in authentication forms.
  logging: { serverFunctions: false },
}

export default nextConfig
