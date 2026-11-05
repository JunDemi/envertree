import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // workspace의 TypeScript 소스 패키지를 포털 빌드에 포함
  transpilePackages: ["@envertree/game-sdk"],
  images: {
    // Google 프로필 사진
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
