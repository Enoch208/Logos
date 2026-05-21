import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // wagmi's tempo connector ships with an optional `import('accounts')`
      // that we don't use. Alias it to a local no-op so Turbopack stops
      // failing on the missing dependency.
      accounts: "./src/lib/web3/accounts-stub.ts",
    },
  },
};

export default nextConfig;
