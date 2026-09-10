import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root. Otherwise Next walks up the tree, finds stray
  // package-lock.json files above the project, and guesses the wrong root for
  // output-file tracing.
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**', // Allows any image path
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true, // Use a 301 status code for SEO-friendly permanent redirection
      },
    ];
  },
};

export default nextConfig;
