/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // ✅ REMOVE - This is causing the error
  // api: {
  //   bodyParser: {
  //     sizeLimit: '100mb',
  //   },
  // },
};

export default nextConfig;