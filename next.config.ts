import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import path from "node:path";

if (process.env.MOCK_FONTS === 'true') {
  process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = path.resolve(process.cwd(), '.next-fonts-mock.json');
}

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/my-activity',
        destination: '/profile',
        permanent: true,
      },
      {
        source: '/:locale/my-activity',
        destination: '/:locale/profile',
        permanent: true,
      }
    ];
  },
};

export default withNextIntl(nextConfig);
