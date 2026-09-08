import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sharp/**/*"],
  },
  experimental: {
    serverActions: {
      // Fotos vom Handy sind oft mehrere MB. Etwas Luft über 15 MB für die Formularhülle.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
