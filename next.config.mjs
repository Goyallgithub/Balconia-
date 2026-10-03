/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1440, 1800],
    imageSizes: [64, 96, 128, 256, 384],
  },
};

export default nextConfig;
