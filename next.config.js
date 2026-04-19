const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || "http://lumen-api:8000";
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
});
