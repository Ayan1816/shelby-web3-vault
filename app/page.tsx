"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Copy, CheckCircle2, Shield, LogOut, Wallet, Coins, Key, Lock, Unlock, X,
  FileText, UploadCloud, File as FileIcon, Globe, Zap, Activity, Share2,
  Loader2, Sun, Moon, Bell, Trash2, AlertCircle, Info, Brain, Database
} from "lucide-react";

const encryptMsg = async (plaintext: string, password: string): Promise<string> => {
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
    const combined = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
    return btoa(String.fromCharCode(...combined));
  } catch { return ""; }
};

const decryptMsg = async (ciphertext: string, password: string): Promise<string | null> => {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);
    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return dec.decode(decrypted);
  } catch { return null; }
};

type VaultRecord = { hash: string; data: string; type: "text" | "file" | "ai_prompt"; fileName?: string; timestamp: number };
type OnChainTx = { hash: string; timestamp: number; success: boolean; version: string };
type AppNotification = { id: string; title: string; message: string; time: string; type: "success" | "error" | "info" };

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}
function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [balance, setBalance] = useState("0.00");
  const [shelbyBalance, setShelbyBalance] = useState("0.00");
  const [history, setHistory] = useState<VaultRecord[]>([]);
  const [onChainHistory, setOnChainHistory] = useState<OnChainTx[]>([]);
  const [vaultMode, setVaultMode] = useState<"text" | "file" | "ai_prompt">("text");
  const [code, setCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [unlockKey, setUnlockKey] = useState("");
  const [decryptedRecord, setDecryptedRecord] = useState<any | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState(false);
  const [latency, setLatency] = useState(0);

  const pushNotification = useCallback((title: string, message: string, type: "success" | "error" | "info") => {
    const n: AppNotification = {
      id: Math.random().toString(36).slice(2, 9), title, message, type,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setNotifications(prev => [n, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const fetchBlockchainData = useCallback(async () => {
    if (!account?.address) return;
    try {
      let nodeUrl = "https://fullnode.testnet.aptoslabs.com/v1";
      if (network?.name?.toLowerCase().includes("mainnet")) nodeUrl = "https://fullnode.mainnet.aptoslabs.com/v1";
      const customUrl = (network as any)?.url || (network as any)?.nodeUrl;
      if (customUrl) nodeUrl = customUrl.endsWith("/v1") ? customUrl : `${customUrl.replace(/\/$/, "")}/v1`;

      const opts: RequestInit = { cache: "no-store", headers: { "Cache-Control": "no-cache" } };
      const ts = Date.now();

      let balanceFetched = false;
      const balRes = await fetch(`${nodeUrl}/accounts/${account.address}/balance/0x1::aptos_coin::AptosCoin?_=${ts}`, opts).catch(() => null);
      if (balRes?.ok) {
        const balData = await balRes.json();
        const raw = balData?.balance ?? balData;
        if (raw !== undefined) { setBalance((parseInt(raw) / 1e8).toFixed(4)); balanceFetched = true; }
      }

      const fRes = await fetch(`${nodeUrl}/accounts/${account.address}/resources?_=${ts}`, opts).catch(() => null);
      if (fRes?.ok) {
        const allData = await fRes.json();
        if (!balanceFetched) {
          const coinData = allData.find((r: any) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
          setBalance(coinData?.data?.coin?.value ? (parseInt(coinData.data.coin.value) / 1e8).toFixed(4) : "0.00");
        }
        const shelbyData = allData.find((r: any) => r.type.toLowerCase().includes("shelby") && (r.data?.coin?.value !== undefined || r.data?.balance !== undefined));
        setShelbyBalance(shelbyData ? (parseInt(shelbyData.data?.coin?.value || shelbyData.data?.balance || "0") / 1e8).toFixed(2) : "0.00");
      } else if (!balanceFetched) setBalance("0.00");

      const txRes = await fetch(`${nodeUrl}/accounts/${account.address}/transactions?limit=30&_=${ts}`, opts).catch(() => null);
      if (txRes?.ok) {
        const txns = await txRes.json();
        if (Array.isArray(txns)) {
          setOnChainHistory(txns.filter((tx: any) => tx.type === "user_transaction").map((tx: any) => ({
            hash: tx.hash,
            timestamp: tx.timestamp ? parseInt(tx.timestamp) / 1000 : Date.now(),
            success: tx.success,
            version: tx.version,
          })));
        }
      }
    } catch (err) { console.error("Network error:", err); }
  }, [account?.address, network]);

  // Mount only
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("shelby_final_vault");
      if (saved) setHistory(JSON.parse(saved));
    } catch { setHistory([]); }
    if (typeof window !== "undefined") {
      const hash = new URLSearchParams(window.location.search).get("hash");
      if (hash) setSelectedHash(hash);
    }
  }, []);

  // Latency
  useEffect(() => {
    if (!connected) { setLatency(0); return; }
    setLatency(Math.floor(Math.random() * 80) + 40);
    const ping = setInterval(() => setLatency(Math.floor(Math.random() * 80) + 40), 15000);
    return () => clearInterval(ping);
  }, [connected]);

  // Connect notification
  useEffect(() => {
    if (connected && account?.address) {
      pushNotification("Wallet Connected ✅", `Address: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`, "success");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Fetch blockchain data
  useEffect(() => {
    if (!connected) {
      setBalance("0.00"); setShelbyBalance("0.00"); setOnChainHistory([]);
      return;
    }
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 15000);
    return () => clearInterval(interval);
  }, [connected, fetchBlockchainData]);

  const handleFaucet = (type: "apt" | "shelby") => {
    pushNotification("Faucet Requested", `${type.toUpperCase()} faucet-এ redirect`, "info");
    const urls = { apt: "https://docs.shelby.xyz/tools/wallets/petra-setup#apt-faucet", shelby: "https://docs.shelby.xyz/tools/wallets/petra-setup#shelbyusd-faucet" };
    window.open(urls[type], "_blank");
  };

  const uploadFileToIPFS = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("IPFS Upload Failed");
    return (await res.json()).IpfsHash;
  };

  const handleUpload = async () => {
    if (!secretKey || (!code && !selectedFile)) {
      pushNotification("Validation Error ⚠️", "Asset data ও password দাও", "error"); return;
    }
    setIsUploading(true);
    pushNotification("Transaction Pending...", "Petra Wallet-এ approve করো", "info");
    try {
      let rawData = code;
      if (vaultMode === "file" && selectedFile) rawData = await uploadFileToIPFS(selectedFile);
      const encryptedData = await encryptMsg(rawData, secretKey);
      if (!encryptedData) throw new Error("Encryption failed");
      const payload = { data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [account?.address, 0] } };
      const response = await signAndSubmitTransaction(payload);
      if (response?.hash) {
        const newRecord: VaultRecord = { hash: response.hash, data: encryptedData, type: vaultMode, fileName: selectedFile?.name, timestamp: Date.now() };
        const newHistory = [newRecord, ...history];
        setHistory(newHistory);
        localStorage.setItem("shelby_final_vault", JSON.stringify(newHistory));
        setCode(""); setSelectedFile(null); setSecretKey("");
        pushNotification("Asset Secured! ✅", `Hash: ${response.hash.slice(0, 10)}...`, "success");
        setTimeout(fetchBlockchainData, 2000);
      }
    } catch { pushNotification("Transaction Failed ❌", "Rejected বা network timeout", "error"); }
    finally { setIsUploading(false); }
  };

  const handleShare = (rec: VaultRecord) => {
    const link = `${window.location.origin}?hash=${rec.hash}&data=${encodeURIComponent(rec.data)}&type=${rec.type}&fname=${encodeURIComponent(rec.fileName || "")}`;
    navigator.clipboard.writeText(link);
    pushNotification("Link Copied 🔗", "Encrypted link clipboard-এ গেছে", "success");
  };

  const processUnlock = async () => {
    let targetData = ""; let recordInfo: any = null;
    const params = new URLSearchParams(window.location.search);
    const urlHash = params.get("hash");
    const urlData = params.get("data"); // ✅ no double decode
    const urlType = params.get("type");
    const urlFname = params.get("fname");

    if (selectedHash === urlHash && urlData) {
      targetData = urlData;
      recordInfo = { type: urlType || "text", fileName: urlFname || "Shared File" };
    } else {
      const record = history.find(h => h.hash === selectedHash);
      if (record) { targetData = record.data; recordInfo = record; }
    }

    if (!targetData) { pushNotification("Error", "Encrypted data পাওয়া যায়নি", "error"); return; }

    const result = await decryptMsg(targetData, unlockKey);
    if (result !== null) { // ✅ null check, not falsy
      setDecryptedData(recordInfo.type === "file" ? `https://gateway.pinata.cloud/ipfs/${result}` : result);
      setDecryptedRecord(recordInfo); setUnlockError(false);
      pushNotification("Decrypted ✅", `Unlocked: ${recordInfo.fileName || "Vault Payload"}`, "success");
    } else {
      setUnlockError(true); setDecryptedData(null);
      pushNotification("Unlock Failed ❌", "Wrong password", "error");
    }
  };

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      pushNotification("Address Copied", "Wallet address copied", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeUnlockModal = () => {
    setSelectedHash(null); setDecryptedData(null); setDecryptedRecord(null);
    setUnlockKey(""); setUnlockError(false);
    if (window.history.pushState) window.history.pushState({}, "", window.location.pathname);
  };

  const deleteRecord = (hash: string) => {
    const newH = history.filter(h => h.hash !== hash);
    setHistory(newH);
    localStorage.setItem("shelby_final_vault", JSON.stringify(newH));
    pushNotification("Deleted", "Vault record মুছে গেছে", "info");
  };

  if (!mounted) return null;
  const dark = !isLightMode;

  return (
    <div className={`min-h-screen w-full flex flex-col items-center p-4 font-sans pb-20 transition-colors duration-500 ${dark ? "bg-[#050505] text-white" : "bg-[#f8f9fa] text-slate-900"}`}>

      {/* Top Bar */}
      <div className="w-full max-w-6xl flex justify-end items-center gap-3 pt-2 px-2">
        <div className="relative">
          <button onClick={() => { setShowNotifPanel(!showNotifPanel); setUnreadCount(0); }}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${dark ? "bg-[#1a1a1a] border-white/10 text-gray-200 hover:bg-[#252525]" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
            <Bell className="w-4 h-4 text-cyan-400" /> Activity Log
            {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-pink-500 text-white font-black text-[10px] rounded-full animate-bounce">{unreadCount}</span>}
          </button>
          {showNotifPanel && (
            <div className={`absolute top-full right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border p-4 z-50 space-y-3 ${dark ? "bg-[#121212] border-white/20 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
              <div className="flex justify-between items-center border-b pb-2 border-current/10">
                <span className="font-bold text-xs flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-cyan-400" />Live Events</span>
                {notifications.length > 0 && <button onClick={() => setNotifications([])} className="text-[10px] text-red-400 flex items-center gap-1 font-mono"><Trash2 className="w-3 h-3" />Clear</button>}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? <p className="text-center py-8 text-gray-500 text-xs font-mono">No recent events</p>
                  : notifications.map(n => (
                    <div key={n.id} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${n.type === "success" ? (dark ? "bg-[#0f291e] border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200") : n.type === "error" ? (dark ? "bg-[#311116] border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-200") : (dark ? "bg-[#1a1a1a] border-white/10 text-cyan-300" : "bg-slate-50 border-slate-200")}`}>
                      <div className="mt-0.5">{n.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : n.type === "error" ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Info className="w-4 h-4 text-cyan-400" />}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px]">{n.title}</span>
                          <span className="text-[9px] opacity-60 font-mono">{n.time}</span>
                        </div>
                        <p className="text-[10px] opacity-80 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setIsLightMode(!isLightMode)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition-all ${dark ? "bg-purple-950/40 border-purple-500/30 text-purple-300 hover:bg-purple-900/50" : "bg-amber-100/60 border-amber-300 text-amber-700 hover:bg-amber-100"}`}>
          {dark ? <><Moon className="w-3.5 h-3.5 text-purple-400" />Dark Mode</> : <><Sun className="w-3.5 h-3.5 text-amber-500" />Light Mode</>}
        </button>
      </div>

      {/* Header */}
      <header className={`w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-3 rounded-2xl shadow-lg border ${dark ? "bg-[#0f0f0f] border-white/10" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl"><Shield className="text-white w-6 h-6" /></div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">SHELBY <span className={dark ? "text-white" : "text-slate-900"}>VAULT</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {connected && account ? (
            <>
              <button onClick={() => handleFaucet("apt")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs uppercase bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20"><Zap className="w-3.5 h-3.5" />APT Faucet</button>
              <button onClick={() => handleFaucet("shelby")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs uppercase bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-500 hover:bg-fuchsia-500/20"><Zap className="w-3.5 h-3.5" />S-USD Faucet</button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono"><Coins className="w-4 h-4" /><span className="text-sm font-bold">{balance} APT</span></div>
              <button onClick={copyAddress} className={`flex items-center gap-2 border px-4 py-2 rounded-lg ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-sm font-mono text-fuchsia-400">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
              <button onClick={() => { disconnect(); pushNotification("Disconnected 🔌", "Wallet unlinked", "info"); }} className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20"><LogOut className="w-4 h-4" /></button>
            </>
          ) : (
            <button onClick={() => wallets?.length ? connect(wallets[0].name) : pushNotification("Error", "Petra Wallet install করো!", "error")}
              className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold text-white hover:from-fuchsia-500 hover:to-purple-500">
              <Wallet className="w-5 h-5" />Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Network Bar */}
      <div className={`w-full max-w-6xl mt-4 flex justify-between items-center rounded-lg px-6 py-3 text-xs font-mono border ${dark ? "bg-[#0f0f0f] border-white/10 text-gray-400" : "bg-white border-slate-200 text-slate-500"}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`} />
          <span className={connected ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{connected ? `NODE: ${network?.name?.toUpperCase() || "TESTNET"}` : "OFFLINE"}</span>
        </div>
        <span>LATENCY: <span className="text-cyan-500">{latency}ms</span></span>
      </div>

      {/* Main Layout */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 mt-6">
        <main className="flex-1 space-y-6">

          {/* Vault Panel */}
          <div className={`border rounded-xl p-6 ${dark ? "bg-[#0f0f0f] border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <h2 className={`font-bold text-xs uppercase mb-4 flex items-center gap-2 ${dark ? "text-gray-400" : "text-slate-500"}`}><Lock className="w-4 h-4 text-fuchsia-500" />Encrypt & Lock Asset</h2>
            <div className="flex gap-2 mb-4">
              {(["text", "file", "ai_prompt"] as const).map(mode => (
                <button key={mode} onClick={() => setVaultMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${vaultMode === mode ? "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-md" : dark ? "bg-white/5 text-gray-500 hover:bg-white/10" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                  {mode === "text" && <><FileText className="w-3.5 h-3.5" />Text</>}
                  {mode === "file" && <><FileIcon className="w-3.5 h-3.5" />File</>}
                  {mode === "ai_prompt" && <><Brain className="w-3.5 h-3.5" />AI Prompt</>}
                </button>
              ))}
            </div>
            {(vaultMode === "text" || vaultMode === "ai_prompt") && (
              <textarea value={code} onChange={e => setCode(e.target.value)}
                placeholder={vaultMode === "ai_prompt" ? "Enter AI prompt to encrypt..." : "Enter secret text to encrypt..."}
                className={`w-full h-36 p-4 rounded-xl text-sm font-mono resize-none border outline-none ${dark ? "bg-[#1a1a1a] border-white/10 text-gray-200 placeholder-gray-600" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"}`} />
            )}
            {vaultMode === "file" && (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDraggin
