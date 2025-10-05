/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
    domains: ['localhost', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // api: {
  //   bodyParser: {
  //     sizeLimit: '100mb',
  //   },
  // },
   experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;