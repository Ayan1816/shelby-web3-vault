"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useWallet,
  groupAndSortWallets,
  isInstallRequired,
  shouldUseFallbackWallet,
  type AdapterNotDetectedWallet,
  type AdapterWallet,
} from "@aptos-labs/wallet-adapter-react";
import { ExternalLink, Loader2, Wallet, X } from "lucide-react";
import { SHELBY_CHAIN_ID, SHELBY_NETWORK_NAME } from "@/lib/shelby";

type WalletOption = AdapterWallet | AdapterNotDetectedWallet;

const isRenderableIcon = (icon?: string) =>
  typeof icon === "string" &&
  (icon.startsWith("data:image") || icon.startsWith("http://") || icon.startsWith("https://"));

function WalletIcon({ icon, name }: { icon?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!isRenderableIcon(icon) || failed) {
    return (
      <div className="w-9 h-9 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
        <Wallet className="w-4 h-4 text-fuchsia-400" />
      </div>
    );
  }
  return (
    <img
      src={icon}
      alt={`${name} icon`}
      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-black/20"
      onError={() => setFailed(true)}
    />
  );
}

export default function WalletConnectModal({
  open,
  onClose,
  isLightMode,
}: {
  open: boolean;
  onClose: () => void;
  isLightMode: boolean;
}) {
  const { wallets, notDetectedWallets, connect, connected, isLoading } = useWallet();
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);

  const listedWallets = useMemo(() => {
    const { availableWallets, availableWalletsWithFallbacks, installableWallets } =
      groupAndSortWallets([...(wallets ?? []), ...(notDetectedWallets ?? [])]);
    return [...availableWallets, ...availableWalletsWithFallbacks, ...installableWallets];
  }, [wallets, notDetectedWallets]);

  useEffect(() => {
    if (open && connected) onClose();
  }, [open, connected, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = async (wallet: WalletOption) => {
    const target = shouldUseFallbackWallet(wallet) ? wallet.fallbackWallet : wallet;
    if (!target) return;

    if (isInstallRequired(wallet) && !shouldUseFallbackWallet(wallet)) {
      if (wallet.url) window.open(wallet.url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setPendingWallet(target.name);
      await Promise.resolve(connect(target.name));
    } catch (error) {
      console.error("Wallet connect failed", error);
    } finally {
      setPendingWallet(null);
    }
  };

  const busy = isLoading || !!pendingWallet;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-connect-title"
        className={`border rounded-2xl w-full max-w-sm p-6 shadow-2xl ${
          isLightMode
            ? "bg-white border-fuchsia-500 text-slate-900"
            : "bg-[#0f0f0f] border-fuchsia-500/30 text-white"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 id="wallet-connect-title" className="font-bold text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-fuchsia-500" />
              Connect Wallet
            </h3>
            <p className={`text-[10px] font-mono mt-1 uppercase tracking-wider ${isLightMode ? "text-slate-500" : "text-gray-500"}`}>
              {SHELBY_NETWORK_NAME} · chain {SHELBY_CHAIN_ID}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close wallet selector">
            <X className="text-gray-500 hover:text-red-500 w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          {listedWallets.length === 0 ? (
            <div className={`text-center py-10 text-xs font-mono ${isLightMode ? "text-slate-500" : "text-gray-500"}`}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500" />
                  Detecting Aptos wallets...
                </span>
              ) : (
                "No Aptos wallets detected. Install a compatible extension and refresh."
              )}
            </div>
          ) : (
            listedWallets.map((wallet) => {
              const needsInstall = isInstallRequired(wallet) && !shouldUseFallbackWallet(wallet);
              const isPending = pendingWallet === wallet.name || pendingWallet === wallet.fallbackWallet?.name;
              return (
                <button
                  key={wallet.name}
                  type="button"
                  disabled={busy}
                  onClick={() => handleSelect(wallet)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all disabled:opacity-60 ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 hover:border-fuchsia-400 hover:bg-fuchsia-50"
                      : "bg-[#1a1a1a] border-white/10 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10"
                  }`}
                >
                  <WalletIcon icon={wallet.icon} name={wallet.name} />
                  <span className="flex-1 font-bold text-sm truncate">{wallet.name}</span>
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500 shrink-0" />
                  ) : needsInstall ? (
                    <span className={`flex items-center gap-1 text-[10px] font-mono uppercase ${isLightMode ? "text-slate-400" : "text-gray-500"}`}>
                      Install <ExternalLink className="w-3 h-3" />
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
