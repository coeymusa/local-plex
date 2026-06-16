import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a lean, self-contained server bundle for the Docker image.
  output: "standalone",
};

export default nextConfig;
