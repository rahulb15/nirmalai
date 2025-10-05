/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // Enable detailed error logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;