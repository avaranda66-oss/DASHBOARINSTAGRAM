import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  serverExternalPackages: ['puppeteer-core', 'nodemailer'],
  images: {
    remotePatterns: [
      // Meta / Facebook CDN para avatares de usuário
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
    ],
  },
};

export default nextConfig;
