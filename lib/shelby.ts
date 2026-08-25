import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export const SHELBY_NETWORK_NAME = "shelbynet";
export const SHELBY_FULLNODE = "https://api.shelbynet.shelby.xyz/v1";
export const SHELBY_INDEXER = "https://api.shelbynet.shelby.xyz/v1/graphql";
export const SHELBY_FAUCET = "https://faucet.shelbynet.shelby.xyz";
export const SHELBY_EXPLORER = "https://explorer.shelby.xyz/shelbynet";
export const SHELBYUSD_FAUCET_URL = "https://docs.shelby.xyz/apis/faucet/shelbyusd";
export const SHELBY_CHAIN_ID = 118;
export const SHELBY_DEPLOYER = "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a";
export const SHELBYUSD_FA_METADATA = "0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1";
export const APT_FA_METADATA = "0xa";
export const TOKEN_DECIMALS = 100_000_000;
export const SHELBYUSD_FEE_OCTAS = 672;
export const PRIMARY_FUNGIBLE_STORE_TRANSFER = "0x1::primary_fungible_store::transfer" as const;
export const FUNGIBLE_ASSET_METADATA_TYPE = "0x1::fungible_asset::Metadata";
export const PRIMARY_FUNGIBLE_STORE_BALANCE = "0x1::primary_fungible_store::balance";

const NetworkRecord = Network as unknown as Record<string, string>;
export const SHELBYNET_SDK_NETWORK = (NetworkRecord.SHELBYNET ?? Network.CUSTOM) as Network;

export const SHELBYNET_NETWORK_INFO = {
  name: SHELBY_NETWORK_NAME,
  chainId: SHELBY_CHAIN_ID,
  url: SHELBY_FULLNODE,
};

export const SHELBYNET_ADAPTER_NETWORK_INFO = {
  name: Network.CUSTOM,
  chainId: SHELBY_CHAIN_ID,
  url: SHELBY_FULLNODE,
};

export const shelbyAptosConfig = new AptosConfig({
  network: SHELBYNET_SDK_NETWORK,
  fullnode: SHELBY_FULLNODE,
  indexer: SHELBY_INDEXER,
  faucet: SHELBY_FAUCET,
});

export const shelbyClient = new Aptos(shelbyAptosConfig);

export type WalletNetworkLike = {
  name?: string | { toString?: () => string };
  chainId?: string | number;
  url?: string;
} | null | undefined;

type ChangeNetworkFn = (networkInfo: string | {
  name: string;
  chainId: number;
  url: string;
}) => Promise<unknown>;

const parseChainId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asLowerString = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    return String((value as { toString: () => string }).toString()).toLowerCase();
  }
  return String(value).toLowerCase();
};

export const isShelbynetWallet = (network: WalletNetworkLike): boolean => {
  const chainId = parseChainId(network?.chainId);
  const url = asLowerString(network?.url);
  const name = asLowerString(network?.name);
  if (chainId === SHELBY_CHAIN_ID) return true;
  if (url.includes("shelbynet") || url.includes("api.shelbynet.shelby.xyz")) return true;
  if (name.includes("shelby")) return true;
  return false;
};

const parseViewValue = (result: unknown): unknown => {
  if (Array.isArray(result)) return result[0];
  if (result && typeof result === "object" && "value" in result) {
    const wrapped = (result as { value: unknown }).value;
    return Array.isArray(wrapped) ? wrapped[0] : wrapped;
  }
  return result;
};

export async function shelbyView(functionId: string, typeArguments: string[], args: unknown[]) {
  const response = await fetch(`${SHELBY_FULLNODE}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: functionId,
      type_arguments: typeArguments,
      arguments: args,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchFungibleBalance(address: string, metadataAddress: string): Promise<string> {
  try {
    const result = await shelbyView(
      PRIMARY_FUNGIBLE_STORE_BALANCE,
      [FUNGIBLE_ASSET_METADATA_TYPE],
      [address, metadataAddress]
    );
    const raw = parseViewValue(result);
    if (raw === undefined || raw === null || raw === "") return "0.00";
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return "0.00";
    return (amount / TOKEN_DECIMALS).toFixed(4);
  } catch {
    return "0.00";
  }
}

export function buildShelbyUsdTransferPayload(recipient: string = SHELBY_DEPLOYER, amountOctas: number = SHELBYUSD_FEE_OCTAS) {
  return {
    data: {
      function: PRIMARY_FUNGIBLE_STORE_TRANSFER,
      typeArguments: [FUNGIBLE_ASSET_METADATA_TYPE],
      functionArguments: [SHELBYUSD_FA_METADATA, recipient, amountOctas],
    },
  };
}

const getPetraProvider = (): {
  changeNetwork?: (networkInfo: Record<string, string | number>) => Promise<unknown>;
  network?: () => Promise<WalletNetworkLike>;
} | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { aptos?: { changeNetwork?: (info: Record<string, string | number>) => Promise<unknown>; network?: () => Promise<WalletNetworkLike> }; petra?: { changeNetwork?: (info: Record<string, string | number>) => Promise<unknown> } };
  return w.aptos ?? w.petra ?? null;
};

export async function switchWalletToShelbynet(changeNetworkFn?: ChangeNetworkFn | undefined): Promise<boolean> {
  const attempts: Array<() => Promise<unknown>> = [];

  if (typeof changeNetworkFn === "function") {
    attempts.push(() => changeNetworkFn(SHELBYNET_SDK_NETWORK));
    attempts.push(() => changeNetworkFn(SHELBY_NETWORK_NAME));
    attempts.push(() => changeNetworkFn(SHELBYNET_ADAPTER_NETWORK_INFO));
    attempts.push(() => changeNetworkFn(SHELBYNET_NETWORK_INFO));
  }

  const petra = getPetraProvider();
  if (petra?.changeNetwork) {
    attempts.push(() =>
      petra.changeNetwork!({
        name: SHELBY_NETWORK_NAME,
        chainId: SHELBY_CHAIN_ID,
        url: SHELBY_FULLNODE,
      })
    );
    attempts.push(() =>
      petra.changeNetwork!({
        name: SHELBY_NETWORK_NAME,
        chainId: String(SHELBY_CHAIN_ID),
        url: SHELBY_FULLNODE,
      })
    );
    attempts.push(() =>
      petra.changeNetwork!({
        name: Network.CUSTOM,
        chainId: SHELBY_CHAIN_ID,
        url: SHELBY_FULLNODE,
      })
    );
  }

  if (attempts.length === 0) return false;

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      await attempt();
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return false;
}

export async function fetchShelbynetTransactions(address: string, limit = 30) {
  const response = await fetch(`${SHELBY_FULLNODE}/accounts/${address}/transactions?limit=${limit}`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) return [];
  const txns = await response.json();
  if (!Array.isArray(txns)) return [];
  return txns
    .filter((tx: { type?: string }) => tx.type === "user_transaction")
    .map((tx: { hash: string; timestamp?: string; success: boolean; version: string }) => ({
      hash: tx.hash,
      timestamp: tx.timestamp ? parseInt(tx.timestamp, 10) / 1000 : Date.now(),
      success: tx.success,
      version: tx.version,
    }));
}
