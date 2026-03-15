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
      // Meta Graph API (fotos de perfil, assets de anúncios)
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: 'graph.instagram.com' },
    ],
  },
};

export default nextConfig;
