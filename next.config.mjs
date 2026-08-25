const nodeBrowserStubs = {
  fs: { browser: "./empty.ts" },
  net: { browser: "./empty.ts" },
  tls: { browser: "./empty.ts" },
  crypto: { browser: "./empty.ts" },
  stream: { browser: "./empty.ts" },
  path: { browser: "./empty.ts" },
  os: { browser: "./empty.ts" },
  zlib: { browser: "./empty.ts" },
  http: { browser: "./empty.ts" },
  https: { browser: "./empty.ts" },
  child_process: { browser: "./empty.ts" },
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: nodeBrowserStubs,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        zlib: false,
        http: false,
        https: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
