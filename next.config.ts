import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
};

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "pokemon-images-cache",
          expiration: {
            maxEntries: 2000,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\.(?:js|css|html|json)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
        },
      },
    ],
  },
});

export default withPWA(nextConfig);