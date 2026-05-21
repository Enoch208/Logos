import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arcTestnet } from "@/lib/web3/chains";

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  networks: [arcTestnet],
  projectId: reownProjectId || "missing-project-id",
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
