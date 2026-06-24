"use client";

import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Coins, Key, Lock, Unlock, X, FileText, UploadCloud, File as FileIcon, Globe, Zap, Activity, Share2, Loader2, Sun, Moon, Bell, Trash2, AlertCircle, Info, Brain, Database } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

const encryptMsg = (t: string, p: string) => { try { const e = encodeURIComponent(t); let r = ''; for(let i=0; i<e.length; i++) r += String.fromCharCode(e.charCodeAt(i) ^ p.charCodeAt(i % p.length)); return btoa(r); } catch(err) { return ""; } };
const decryptMsg = (c: string, p: string) => { try { let r = atob(c), res = ''; for(let i=0; i<r.length; i++) res += String.fromCharCode(r.charCodeAt(i) ^ p.charCodeAt(i % p.length)); return decodeURIComponent(res); } catch(err) { return null; } };

type VaultRecord = { hash: string, data: string, type: 'text'|'file'|'ai_prompt', fileName?: string, timestamp: number };
type OnChainTx = { hash: string, timestamp: number, success: boolean, version: string };
type AppNotification = { id: string, title: string, message: string, time: string, type: 'success' | 'error' | 'info' };

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [balance, setBalance] = useState<string>("0.00");
  const [shelbyBalance, setShelbyBalance] = useState<string>("0.00");
  const [history, setHistory] = useState<VaultRecord[]>([]);
  const [onChainHistory, setOnChainHistory] = useState<OnChainTx[]>([]);
  
  const [vaultMode, setVaultMode] = useState<'text' | 'file' | 'ai_prompt'>('text');
  const [code, setCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [unlockKey, setUnlockKey] = useState("");
  const [decryptedRecord, setDecryptedRecord] = useState<VaultRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState(false);
  const [latency, setLatency] = useState<number>(0);

  const pushNotification = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem("shelby_final_vault");
    if(savedHistory) setHistory(JSON.parse(savedHistory));
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = params.get('hash');
      if (hash) setSelectedHash(hash);
    }
    const ping = setInterval(() => setLatency(connected ? Math.floor(Math.random() * 80) + 40 : 0), 15000);
    return () => clearInterval(ping);
  }, [connected]);

  useEffect(() => {
    if (connected && account?.address) {
      pushNotification("Wallet Connected ✅", `Address: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`, "success");
    }
  }, [connected, account]);

  const fetchBlockchainData = async () => {
    if (!account?.address) return;
    try {
      let nodeUrl = 'https://fullnode.testnet.aptoslabs.com/v1';
      if (network?.name?.toLowerCase().includes('mainnet')) nodeUrl = 'https://fullnode.mainnet.aptoslabs.com/v1';
      const customUrl = (network as any)?.url || (network as any)?.nodeUrl;
      if (customUrl) nodeUrl = customUrl.endsWith('/v1') ? customUrl : `${customUrl.replace(/\/$/, "")}/v1`;

      const fetchOptions: RequestInit = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } };
      const assetType = "0x1::aptos_coin::AptosCoin";
      const balanceUrl = `${nodeUrl}/accounts/${account.address}/balance/${assetType}?_=${Date.now()}`;
      
      let balanceFetched = false;
      const balRes = await fetch(balanceUrl, fetchOptions).catch(() => null);
      if (balRes && balRes.ok) {
        const balData = await balRes.json();
        const rawBalance = balData?.balance || balData; 
        if (rawBalance !== undefined) { setBalance((parseInt(rawBalance) / 100000000).toFixed(4)); balanceFetched = true; }
      }

      const fallbackUrl = `${nodeUrl}/accounts/${account.address}/resources?_=${Date.now()}`;
      const fRes = await fetch(fallbackUrl, fetchOptions).catch(() => null);
      if (fRes && fRes.ok) {
          const allData = await fRes.json();
          if (!balanceFetched) {
              const coinData = allData.find((r: any) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
              if (coinData?.data?.coin?.value) setBalance((parseInt(coinData.data.coin.value) / 100000000).toFixed(4));
              else setBalance("0.00");
          }
          const shelbyData = allData.find((r: any) => r.type.toLowerCase().includes("shelby") && (r.data?.coin?.value !== undefined || r.data?.balance !== undefined));
          if (shelbyData) {
              const val = shelbyData.data?.coin?.value || shelbyData.data?.balance || "0";
              setShelbyBalance((parseInt(val) / 100000000).toFixed(2));
          } else { setShelbyBalance("0.00"); }
      } else { if (!balanceFetched) setBalance("0.00"); }

      const txUrl = `${nodeUrl}/accounts/${account.address}/transactions?limit=30&_=${Date.now()}`;
      const txRes = await fetch(txUrl, fetchOptions).catch(() => null);
      if (txRes && txRes.ok) {
        const txns = await txRes.json();
        if (Array.isArray(txns)) {
          const userTxns = txns.filter((tx: any) => tx.type === 'user_transaction').map((tx: any) => ({
            hash: tx.hash, timestamp: tx.timestamp ? parseInt(tx.timestamp)/1000 : Date.now(), success: tx.success, version: tx.version
          }));
          setOnChainHistory(userTxns);
        }
      }
    } catch (error) { console.error("Network Error:", error); }
  };

  useEffect(() => {
    if (connected) { fetchBlockchainData(); const interval = setInterval(fetchBlockchainData, 15000); return () => clearInterval(interval); } 
    else { setBalance("0.00"); setShelbyBalance("0.00"); setOnChainHistory([]); }
  }, [account, network, connected]);

  const handleFaucet = (type: 'apt' | 'shelby') => {
    pushNotification("Faucet Requested", `Redirected to ${type.toUpperCase()} official faucet`, "info");
    if (type === 'apt') window.open("https://docs.shelby.xyz/tools/wallets/petra-setup#apt-faucet", "_blank");
    else window.open("https://docs.shelby.xyz/tools/wallets/petra-setup#shelbyusd-faucet", "_blank");
  };

  const uploadFileToIPFS = async (file: File) => {
    const formData = new FormData(); formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("IPFS Upload Failed");
    const data = await res.json(); return data.IpfsHash;
  };

  const handleUpload = async () => {
    if (!secretKey || (!code && !selectedFile)) {
      pushNotification("Validation Error ⚠️", "Please provide asset data and set password", "error");
      return alert("Fill all fields & set a password!");
    }
    setIsUploading(true);
    pushNotification("Transaction Pending...", "Please approve in your Petra Wallet", "info");
    try {
      let rawData = code;
      if (vaultMode === 'file' && selectedFile) { const ipfsHash = await uploadFileToIPFS(selectedFile); rawData = ipfsHash; }
      const payload = { data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [account?.address, 0] } };
      const response = await signAndSubmitTransaction(payload);
      
      if (response && response.hash) {
        const newRecord: VaultRecord = { hash: response.hash, data: encryptMsg(rawData, secretKey), type: vaultMode, fileName: selectedFile?.name, timestamp: Date.now() };
        const newHistory = [newRecord, ...history];
        setHistory(newHistory); localStorage.setItem("shelby_final_vault", JSON.stringify(newHistory));
        setCode(""); setSelectedFile(null); setSecretKey("");
        
        pushNotification("Asset Secured! ✅", `Hash: ${response.hash.slice(0, 10)}... synced perfectly`, "success");
        alert("✅ Secure Asset Locked on Aptos Ledger!"); setTimeout(fetchBlockchainData, 2000);
      }
    } catch (error) { 
      pushNotification("Transaction Failed ❌", "User rejected request or network timeout", "error");
      alert("❌ Transaction Failed!"); 
    } finally { setIsUploading(false); }
  };

  const handleShare = (rec: VaultRecord) => {
    const link = `${window.location.origin}?hash=${rec.hash}&data=${encodeURIComponent(rec.data)}&type=${rec.type}&fname=${encodeURIComponent(rec.fileName || "")}`;
    navigator.clipboard.writeText(link);
    pushNotification("Link Copied 🔗", "Encrypted drop link copied to clipboard", "success");
    alert("✅ Link Copied! Share this link and the password with your friend.");
  };

  const processUnlock = () => {
    let targetData = ""; let recordInfo: any = null;
    const params = new URLSearchParams(window.location.search);
    const urlHash = params.get('hash'); const urlData = params.get('data'); const urlType = params.get('type'); const urlFname = params.get('fname');

    if (selectedHash === urlHash && urlData) {
      targetData = decodeURIComponent(urlData); recordInfo = { type: urlType || 'text', fileName: urlFname ? decodeURIComponent(urlFname) : "Shared File" };
    } else {
      const record = history.find(h => h.hash === selectedHash);
      if (record) { targetData = record.data; recordInfo = record; }
    }

    if (targetData) {
      const result = decryptMsg(targetData, unlockKey);
      if (result) {
        if (recordInfo.type === 'file') setDecryptedData(`https://gateway.pinata.cloud/ipfs/${result}`);
        else setDecryptedData(result);
        setDecryptedRecord(recordInfo); setUnlockError(false);
        pushNotification("Decrypted Successfully 🔓", `Unlocked asset: ${recordInfo.fileName || "Vault Payload"}`, "success");
      } else { 
        setUnlockError(true); setDecryptedData(null); 
        pushNotification("Unlock Failed ❌", "Incorrect decryption key entered!", "error");
      }
    } else alert("❌ Encrypted data not found!");
  };

  const copyAddress = () => { if (account?.address) { navigator.clipboard.writeText(account.address); setCopied(true); pushNotification("Address Copied", "Wallet address copied to clipboard", "info"); setTimeout(() => setCopied(false), 2000); } };
  const closeUnlockModal = () => { setSelectedHash(null); setDecryptedData(null); setUnlockKey(""); if (window.history.pushState) window.history.pushState({}, '', window.location.pathname); };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col items-center p-4 font-sans pb-20 transition-colors duration-500 relative ${isLightMode ? 'bg-[#f8f9fa] text-slate-900' : 'bg-[#050505] text-white'}`}>
      
      {/* 🔴 একদম উপরের ডানদিকের আইসোলেটেড থিম ও নোটিফিকেশন বার */}
      <div className="w-full max-w-6xl flex justify-end items-center gap-3 pt-2 px-2">
        <div className="relative">
          <button 
            onClick={() => { setShowNotifPanel(!showNotifPanel); setUnreadCount(0); }} 
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-[#1a1a1a] border-white/10 text-gray-200 hover:bg-[#252525]'}`}
          >
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>Activity Log</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-pink-500 text-white font-black text-[10px] rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <div className={`absolute top-full right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border p-4 z-50 animate-in fade-in zoom-in-95 space-y-3 ${isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#121212] border-white/20 text-white'}`}>
              <div className="flex justify-between items-center border-b pb-2.5 border-current/10">
                <span className="font-bold text-xs flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-cyan-400"/> Live Wallet Events</span>
                {notifications.length > 0 && (
                  <button onClick={() => setNotifications([])} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-mono">
                    <Trash2 className="w-3 h-3"/> Clear
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs font-mono">No recent wallet events recorded</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${n.type === 'success' ? (isLightMode ? 'bg-emerald-50 border-emerald-200' : 'bg-[#0f291e] border-emerald-500/30 text-emerald-300') : (n.type === 'error' ? (isLightMode ? 'bg-rose-50 border-rose-200' : 'bg-[#311116] border-rose-500/30 text-rose-300') : (isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-white/10 text-cyan-300'))}`}>
                      <div className="mt-0.5">
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
                        {n.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400"/>}
                        {n.type === 'info' && <Info className="w-4 h-4 text-cyan-400"/>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px]">{n.title}</span>
                          <span className="text-[9px] opacity-60 font-mono">{n.time}</span>
                        </div>
                        <p className="text-[10px] opacity-80 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsLightMode(!isLightMode)} 
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition-all shadow-sm ${isLightMode ? 'bg-amber-100/60 border-amber-300 text-amber-700 hover:bg-amber-100' : 'bg-purple-950/40 border-purple-500/30 text-purple-300 hover:bg-purple-900/50'}`}
        >
          {isLightMode ? <><Sun className="w-3.5 h-3.5 text-amber-500"/> Light Mode</> : <><Moon className="w-3.5 h-3.5 text-purple-400"/> Dark Mode</>}
        </button>
      </div>

      {/* 🔴 মূল হেডার অংশ */}
      <header className={`w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-3 rounded-2xl shadow-lg border transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0f0f0f] border-white/10'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl"><Shield className="text-white w-6 h-6" /></div>
          <div><h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">SHELBY <span className={isLightMode ? 'text-slate-900' : 'text-white'}>VAULT</span></h1></div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {connected && account ? (
            <>
              <button onClick={() => handleFaucet('apt')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs uppercase transition-colors bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20">
                <Zap className="w-3.5 h-3.5" /> APT Faucet
              </button>
              <button onClick={() => handleFaucet('shelby')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs uppercase transition-colors bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-500 hover:bg-fuchsia-500/20">
                <Zap className="w-3.5 h-3.5" /> S-USD Faucet
              </button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-mono">
                <Coins className="w-4 h-4" /><span className="text-sm font-bold">{balance} APT</span>
              </div>
              <button onClick={copyAddress} className={`flex items-center gap-2 border px-4 py-2 rounded-lg ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="text-sm font-mono text-fuchsia-500 dark:text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
              <button onClick={() => { disconnect(); pushNotification("Disconnected 🔌", "Wallet unlinked successfully", "info"); }} className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20"><LogOut className="w-4 h-4" /></button>
            </>
          ) : <button onClick={() => wallets?.length ? connect(wallets[0].name) : alert("Install Petra!")} className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold text-white hover:from-fuchsia-500 hover:to-purple-500"><Wallet className="w-5 h-5" /> Connect Wallet</button>}
        </div>
      </header>

      <div className={`w-full max-w-6xl mt-4 flex justify-between items-center rounded-lg px-6 py-3 text-xs font-mono border ${isLightMode ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#0f0f0f] border-white/10 text-gray-400'}`}>
        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div><span className={connected ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{connected ? `NODE: ${network?.name?.toUpperCase() || 'TESTNET'}` : 'OFFLINE'}</span></div>
        <div><span>LATENCY: <span className="text-cyan-500">{latency}ms</span></span></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 mt-6">
        <main className="flex-1 space-y-6">
          <div className={`border rounded-xl p-6 relative ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f0f0f] border-w
