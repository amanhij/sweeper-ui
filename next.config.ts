import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.jup.ag",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        
        hostname: "*.ipfs.nftstorage.link",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
