import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Server Function arguments include passwords in authentication forms.
  logging: { serverFunctions: false },
};

export default nextConfig;
