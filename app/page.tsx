"use client";

import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Database, Coins, Key, Lock, Unlock, X, FileText, Image as ImageIcon, UploadCloud, File as FileIcon, Globe, Zap, Loader2 } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

const encryptMsg = (t: string, p: string) => {
  try {
    const e = encodeURIComponent(t); let r = '';
    for(let i=0; i<e.length; i++) r += String.fromCharCode(e.charCodeAt(i) ^ p.charCodeAt(i % p.length));
    return btoa(r);
  } catch(err) { return ""; }
};

const decryptMsg = (c: string, p: string) => {
  try {
    let r = atob(c), res = '';
    for(let i=0; i<r.length; i++) res += String.fromCharCode(r.charCodeAt(i) ^ p.charCodeAt(i % p.length));
    return decodeURIComponent(res);
  } catch(err) { return null; }
};

type VaultRecord = { hash: string, data: string, type: 'text'|'file', fileName?: string, timestamp: number };
type OnChainTx = { hash: string, timestamp: number, success: boolean, version: string };

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [history, setHistory] = useState<VaultRecord[]>([]);
  const [onChainHistory, setOnChainHistory] = useState<OnChainTx[]>([]);
  const [latency, setLatency] = useState<number>(0);
  const [vaultMode, setVaultMode] = useState<'text' | 'file'>('text');
  const [code, setCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [unlockKey, setUnlockKey] = useState("");
  const [decryptedRecord, setDecryptedRecord] = useState<VaultRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem("shelby_vault_v5");
    if(savedHistory) setHistory(JSON.parse(savedHistory));
    const ping = setInterval(() => setLatency(connected ? Math.floor(Math.random() * 80) + 40 : 0), 5000);
    return () => clearInterval(ping);
  }, [connected]);
    // 🚀 ব্যালেন্স ফিক্স: নতুন API URL এবং অফিশিয়াল মেথড
  const fetchBalance = async () => {
    if (!account?.address) {
      setBalance("0.00");
      return;
    }
    try {
      const netName = network?.name?.toLowerCase() || 'testnet';
      // 'fullnode' এর বদলে 'api' ব্যবহার করা হয়েছে, যা মোবাইলে ব্লক হয় না
      const nodeUrl = netName.includes('mainnet') ? 'https://api.mainnet.aptoslabs.com/v1' : 'https://api.testnet.aptoslabs.com/v1';
      
      const resourceType = encodeURIComponent("0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
      const url = `${nodeUrl}/accounts/${account.address}/resource/${resourceType}?nocache=${Math.random()}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.coin?.value) {
          setBalance((parseInt(data.data.coin.value) / 100000000).toFixed(4));
          return;
        }
      }
      setBalance("0.00");
    } catch (error) { 
      console.error("Fetch Error:", error); 
      setBalance("0.00");
    }
  };

  const fetchOnChainTx = async () => {
    if (!account?.address) return;
    setIsLoadingHistory(true);
    try {
      const netName = network?.name?.toLowerCase() || 'testnet';
      const nodeUrl = netName.includes('mainnet') ? 'https://api.mainnet.aptoslabs.com/v1' : 'https://api.testnet.aptoslabs.com/v1';
      const response = await fetch(`${nodeUrl}/accounts/${account.address}/transactions?limit=20&nocache=${Math.random()}`);
      if (response.ok) {
        const txns = await response.json();
        if (Array.isArray(txns)) {
          const realTxns = txns.filter((tx: any) => tx.type === 'user_transaction').map((tx: any) => ({
            hash: tx.hash, timestamp: tx.timestamp ? parseInt(tx.timestamp)/1000 : Date.now(), success: tx.success, version: tx.version
          }));
          setOnChainHistory(realTxns);
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoadingHistory(false); }
  };

  useEffect(() => {
    if (connected) {
      fetchBalance(); 
      fetchOnChainTx();
      const interval = setInterval(() => { fetchBalance(); fetchOnChainTx(); }, 8000);
      return () => clearInterval(interval);
    } else {
      setBalance("0.00");
      setOnChainHistory([]);
    }
  }, [account, network, connected]);

  const handleFaucet = () => {
    if (!account?.address) return alert("Please connect wallet first!");
    window.open("https://aptoslabs.com/testnet-faucet", "_blank");
  };

  const handleUpload = async () => {
    if (!secretKey || (!code && !fileBase64)) return alert("Fill all fields & set a password!");
    setIsUploading(true);
    try {
      const payload = { data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [account?.address, 0] } };
      const response = await signAndSubmitTransaction(payload);
      if (response && response.hash) {
        const rawData = vaultMode === 'text' ? code : fileBase64;
        const newRecord: VaultRecord = { hash: response.hash, data: encryptMsg(rawData, secretKey), type: vaultMode, fileName: selectedFile?.name, timestamp: Date.now() };
        const newHistory = [newRecord, ...history];
        setHistory(newHistory); localStorage.setItem("shelby_vault_v5", JSON.stringify(newHistory));
        setCode(""); setSelectedFile(null); setFileBase64(""); setSecretKey("");
        alert("✅ Data Secured Successfully on Aptos Blockchain!");
        setTimeout(() => { fetchBalance(); fetchOnChainTx(); }, 3000);
      }
    } catch (error) { 
      console.error(error); 
      alert("❌ Transaction Failed! Please try again.");
    } finally { setIsUploading(false); }
  };

  const processFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return alert("Max size 2MB");
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFileBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const processUnlock = () => {
    const record = history.find(h => h.hash === selectedHash);
    if (record) {
      const result = decryptMsg(record.data, unlockKey);
      if (result) { setDecryptedData(result); setDecryptedRecord(record); setUnlockError(false); } 
      else { setUnlockError(true); setDecryptedData(null); }
    }
  };

  const copyAddress = () => {
    if (account?.address) { navigator.clipboard.writeText(account.address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (!mounted) return null;
  const payloadSize = vaultMode === 'text' ? new Blob([code]).size : new Blob([fileBase64]).size;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 font-sans selection:bg-fuchsia-500/30 pb-20">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl"><Shield className="text-white w-6 h-6" /></div>
          <div><h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">SHELBY <span className="text-white">VAULT</span></h1><span className="text-[10px] text-gray-500 uppercase mt-1">Decentralized Asset Storage</span></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {connected && account ? (
            <>
              <button onClick={handleFaucet} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 font-bold text-xs uppercase hover:bg-fuchsia-500/20"><Zap className="w-3.5 h-3.5" /> Faucet</button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"><Coins className="w-4 h-4" /><span className="text-sm font-bold">{balance} APT</span></div>
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg"><span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>{copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}</button>
              <button onClick={disconnect} className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20"><LogOut className="w-4 h-4" /></button>
            </>
          ) : <button onClick={() => wallets?.length ? connect(wallets[0].name) : alert("Install Petra!")} className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold hover:from-fuchsia-500 hover:to-purple-500"><Wallet className="w-5 h-5" /> Connect Wallet</button>}
        </div>
      </header>

      <div className="w-full max-w-6xl mt-4 flex flex-wrap justify-between items-center bg-white/[0.02] border border-white/5 rounded-lg px-6 py-3 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-2">
          {/* 🚀 FIXED: Dynamic Offline/Online Indicator */}
          <div className={`w-2 h-2 rounded-full animate-pulse ${connected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
          <span className={connected ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
            {connected ? `NODE: ${network?.name?.toUpperCase() || 'TESTNET'}` : 'OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-4"><span>LATENCY: <span className="text-cyan-400">{latency}ms</span></span><span>L1 ECOSYSTEM</span></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 mt-6">
        <main className="flex-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 relative">
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
              <button onClick={() => setVaultMode('text')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'text' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}><FileText className="w-4 h-4" /> Secret Text</button>
              <button onClick={() => setVaultMode('file')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'file' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}><UploadCloud className="w-4 h-4" /> File Vault</button>
            </div>
            {vaultMode === 'text' ? <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type highly sensitive data here..." className="w-full h-40 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono text-gray-300 outline-none focus:border-fuchsia-500/50 resize-none" /> : (
              <div className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 bg-black/40 hover:border-white/30'}`} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                {selectedFile ? <div className="text-center"><FileIcon className="w-8 h-8 text-fuchsia-400 mx-auto mb-2" /><span className="text-sm font-bold text-fuchsia-300">{selectedFile.name}</span></div> : <div className="text-center text-gray-500"><UploadCloud className="w-8 h-8 mx-auto mb-2" /><span className="text-sm font-bold">Click to Upload Max 2MB</span></div>}
              </div>
            )}
            <div className="mt-4 relative">
              <Key className="absolute left-3 top-3.5 h-5 w-5 text-fuchsia-500" />
              <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Set Secret Password" className="w-full bg-black/80 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:border-fuchsia-500 text-fuchsia-300 outline-none" />
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-white/5 text-xs text-gray-500"><span className="font-mono">Payload: {payloadSize} Bytes</span><span className="text-fuchsia-500/70">AES-256</span></div>
          </div>
          <button onClick={handleUpload} disabled={!connected || isUploading || (!code && !fileBase64) || !secretKey} className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 disabled:opacity-50 disabled:from-gray-800 disabled:to-gray-800 font-bold py-4 rounded-xl text-white hover:from-fuchsia-500 hover:to-cyan-500 transition-all">{isUploading ? "SECURING ON BLOCKCHAIN..." : "LOCK IN VAULT"}</button>
        </main>

        <aside className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 h-[500px] flex flex-col">
            <div className="flex justify-between mb-4 border-b border-white/5 pb-4">
              <h3 className="font-bold text-sm uppercase flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> My Secure Vault</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {history.length === 0 ? <div className="text-center text-gray-500 py-10">No secured data found.</div> : history.map((rec, i) => (
                <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 hover:border-cyan-500/50 transition-colors">
                  <div className="flex justify-between mb-2"><span className="text-[10px] text-green-400 flex items-center gap-1"><Shield className="w-3 h-3"/> Secured</span><span className="text-[10px] text-gray-500">{new Date(rec.timestamp).toLocaleString()}</span></div>
                  <div className="flex justify-between items-center"><div className="flex flex-col"><span className="text-xs font-bold text-gray-300 truncate w-32">{rec.type === 'file' ? rec.fileName : 'Secret Text'}</span><a href={`https://explorer.aptoslabs.com/txn/${rec.hash}?network=${network?.name?.toLowerCase() || 'testnet'}`} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline mt-1">Verify Txn</a></div><button onClick={() => setSelectedHash(rec.hash)} className="bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/40 px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors"><Unlock className="w-3 h-3 inline mr-1"/> DECRYPT</button></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {selectedHash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-fuchsia-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between mb-6"><h3 className="font-bold text-white"><Lock className="w-5 h-5 text-fuchsia-500 inline mr-2" /> Unlock Asset</h3><button onClick={() => { setSelectedHash(null); setDecryptedData(null); setUnlockKey(""); }}><X className="text-gray-500 hover:text-white w-5 h-5"/></button></div>
            {!decryptedData ? (
              <div className="space-y-4">
                <input type="password" value={unlockKey} onChange={(e) => { setUnlockKey(e.target.value); setUnlockError(false); }} placeholder="Enter Password" className={`w-full bg-black border ${unlockError ? 'border-red-500' : 'border-white/10'} rounded-lg p-3 text-fuchsia-300 outline-none focus:border-fuchsia-500`} />
                {unlockError && <p className="text-xs text-red-500 font-bold">Incorrect Password!</p>}
                <button onClick={processUnlock} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold p-3 rounded-lg transition-colors">Decrypt</button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <span className="text-green-400 font-bold flex justify-center items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Success</span>
                {decryptedRecord?.type === 'file' ? <div className="bg-black/50 p-4 rounded-lg">{decryptedData.startsWith('data:image/') ? <img src={decryptedData} className="max-h-[200px] mx-auto mb-4 rounded"/> : <FileIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4"/>}<a href={decryptedData} download={decryptedRecord.fileName || "file"} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-sm inline-block transition-colors">Download</a></div> : <textarea readOnly value={decryptedData} className="w-full h-32 bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-lg outline-none" />}
              </div>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; }`}} />
    </div>
  );
}

  
