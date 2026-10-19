import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
