import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/authentification",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;