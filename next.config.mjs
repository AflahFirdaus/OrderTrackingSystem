/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  // Optimize for production
  reactStrictMode: true,
  // SWC minify sudah default di Next.js 12+, tidak perlu swcMinify
  // Ensure proper image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
