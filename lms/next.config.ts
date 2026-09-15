import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Keep Next's file tracing rooted at this app (the repo also contains an
  // unrelated project with its own lockfile at the parent level).
  outputFileTracingRoot: __dirname,
  // Native / WASM packages must not be bundled by webpack.
  serverExternalPackages: ["@node-rs/argon2", "@electric-sql/pglite", "pg"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
