/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://games-zg86.onrender.com';
    return [
      {
        source: '/api/auth/me',
        destination: `${backendUrl}/api/auth/me`,
      },
      {
        source: '/api/auth/send-otp',
        destination: `${backendUrl}/api/auth/send-otp`,
      },
      {
        source: '/api/auth/verify-otp',
        destination: `${backendUrl}/api/auth/verify-otp`,
      },
      {
        source: '/api/wallet/:path*',
        destination: `${backendUrl}/api/wallet/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/api/admin/:path*`,
      },
      {
        source: '/api/games/:path*',
        destination: `${backendUrl}/api/games/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${backendUrl}/api/users/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
