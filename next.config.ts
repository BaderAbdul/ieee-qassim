import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import path from "node:path";

if (!process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES) {
  process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = path.resolve(process.cwd(), '.next-fonts-mock.json');
}

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
