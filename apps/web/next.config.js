/** @type {import('next').NextConfig} Русская подсказка для редактора. */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@tracker/types", "@tracker/ui"],
};

module.exports = nextConfig;
