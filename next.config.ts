import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is only next's optional peer; Vercel optimizes images itself, so keep its binary out of every function.
  outputFileTracingExcludes: {
    "*": ["node_modules/@img/**", "node_modules/sharp/**"],
  },

  async headers() {
    // Dev-only: X-Frame-Options is omitted so IDE preview panes can iframe the app.
    // The CSP and X-Robots-Tag are set per request in src/proxy.ts.
    const isDev = process.env.NODE_ENV !== "production";

    return [
      {
        source: "/(.*)",
        headers: [
          ...(isDev ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
