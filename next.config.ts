import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "nodemailer"],
  // The Arena preview proxy serves the app from a dynamic *.e2b.app host.
  // Allowing wildcard dev origins keeps the live preview working.
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ];
    if (isProd) {
      headers.push(
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        // Framing protection is production-only so the app can still be shown
        // inside the sandbox preview (development) iframe.
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      );
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
