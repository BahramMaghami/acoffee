import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function arguments include passwords in authentication forms.
  logging: { serverFunctions: false },
};

export default nextConfig;
