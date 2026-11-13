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
  async headers() {
    return [
      {
        // The service worker must always be re-fetched so a new release reaches installed apps.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/offline.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
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
