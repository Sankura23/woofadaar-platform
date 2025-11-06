/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'instagram.com', 'www.instagram.com', 'scontent.cdninstagram.com', 'scontent-*.cdninstagram.com'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.instagram.com https://platform.instagram.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-src 'self' https://www.instagram.com https://instagram.com https://platform.instagram.com",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig