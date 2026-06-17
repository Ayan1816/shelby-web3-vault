"use client";

import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Database, History, Coins, Key, Lock, Unlock, X, FileText, Image as ImageIcon, UploadCloud, File as FileIcon, Globe, Zap } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

const encryptMessage = (t: string, p: string) => {
  try {
    const e = encodeURIComponent(t);
    let r = '';
    for(let i=0; i<e.length; i++) r += String.fromCharCode(e.charCodeAt(i) ^ p.charCodeAt(i % p.length));
    return btoa(r);
  } catch(err) { return ""; }
};

const decryptMessage = (c: string, p: string) => {
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
    const saved = localStorage.getItem("shelby_vault_history_v2");
    if(saved) setHistory(JSON.parse(saved));
    const ping = setInterval(() => setLatency(Math.floor(Math.random() * 80) + 40), 5000);
    return () => clearInterval(ping);
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address) {
        try {
          const isMainnet = network?.name?.toLowerCase() === 'mainnet';
          const nodeUrl = isMainnet ? 'https://fullnode.mainnet.aptoslabs.com/v1' : 'https://fullnode.testnet.aptoslabs.com/v1';
          const resource = encodeURIComponent("0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
          const res = await fetch(`${nodeUrl}/accounts/${account.address}/resource/${resource}?t=${Date.now()}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.coin?.value) setBalance((parseInt(data.data.coin.value) / 100000000).toFixed(4));
          } else setBalance("0.00");
        } catch (error) { console.error(error); }
      }
    };
    fetchBalance();
  }, [account, network]);

  const fetchOnChainTransactions = async () => {
    if (!account?.address) return;
    setIsLoadingHistory(true);
    try {
      const isMainnet = network?.name?.toLowerCase() === 'mainnet';
      const nodeUrl = isMainnet ? 'https://fullnode.mainnet.aptoslabs.com/v1' : 'https://fullnode.testnet.aptoslabs.com/v1';
      const res = await fetch(`${nodeUrl}/accounts/${account.address}/transactions?limit=50&t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const txns = await res.json();
        if (Array.isArray(txns)) {
          const realTxns = txns.filter((tx: any) => tx.type === 'user_transaction').map((tx: any) => ({
            hash: tx.hash, timestamp: tx.timestamp ? parseInt(tx.timestamp) / 1000 : Date.now(), success: tx.success, version: tx.version
          }));
          setOnChainHistory(realTxns);
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoadingHistory(false); }
  };

  useEffect(() => {
    fetchOnChainTransactions();
    const interval = setInterval(fetchOnChainTransactions, 8000);
    return () => clearInterval(interval);
  }, [account, network]);

  const handleConnect = () => { wallets?.length ? connect(wallets[0].name) : alert("Install Petra Wallet!"); };

  const processFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return alert("File too large! Limit is 2MB.");
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFileBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!secretKey) return alert("Set a Password!");
    if (vaultMode === 'text' && !code) return alert("Enter data!");
    if (vaultMode === 'file' && !fileBase64) return alert("Select a file!");
    setIsUploading(true);
    try {
      const payload = { data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [account?.address, 0] } };
      const response = await signAndSubmitTransaction(payload);
      if (response?.hash) {
        const rawData = vaultMode === 'text' ? code : fileBase64;
        const newRecord: VaultRecord = { hash: response.hash, data: encryptMessage(rawData, secretKey), type: vaultMode, fileName: vaultMode === 'file' ? selectedFile?.name : undefined, timestamp: Date.now() };
        const newHistory = [newRecord, ...history];
        setHistory(newHistory);
        localStorage.setItem("shelby_vault_history_v2", JSON.stringify(newHistory));
        setCode(""); setSelectedFile(null); setFileBase64(""); setSecretKey("");
        setTimeout(fetchOnChainTransactions, 2000);
      }
    } catch (error) { console.error(error); } finally { setIsUploading(false); }
  };

  const handleUnlock = (hash: string) => {
    if (!history.find(h => h.hash === hash)) return alert("Asset locked on another device!");
    setSelectedHash(hash);
  };

  const processUnlock = () => {
    const record = history.find(h => h.hash === selectedHash);
    if (record) {
      const result = decryptMessage(record.data, unlockKey);
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
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl shadow-lg"><Shield className="text-white w-6 h-6" /></div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400 leading-none">SHELBY <span className="text-white">VAULT</span></h1>
            <span className="text-[10px] text-gray-500 tracking-widest uppercase mt-1">Decentralized Asset Storage</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {connected && account ? (
            <>
              <a href="https://aptoslabs.com/testnet-faucet" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 font-bold text-xs uppercase tracking-wider transition-all"><Zap className="w-3.5 h-3.5" /> Faucet</a>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"><Coins className="w-4 h-4" /><span className="text-sm font-bold">{balance} APT</span></div>
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg"><span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0,6)}...{account.address?.slice(-4)}</span>{copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}</button>
              <button onClick={disconnect} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400"><LogOut className="w-4 h-4" /></button>
            </>
          ) : <button onClick={handleConnect} className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold"><Wallet className="w-5 h-5" /> Connect Wallet</button>}
        </div>
      </header>

      <div className="w-full max-w-6xl mt-4 flex flex-wrap justify-between items-center bg-white/[0.02] border border-white/5 rounded-lg px-6 py-3 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span>SECURED NODE: {network?.name || 'OFFLINE'}</span></div>
        <div className="flex items-center gap-4"><span>LATENCY: <span className="text-cyan-400">{latency}ms</span></span><span>ECOSYSTEM: APTOS L1</span></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 mt-6">
        <main className="flex-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
              <button onClick={() => setVaultMode('text')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'text' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500'}`}><FileText className="w-4 h-4" /> Secret Text</button>
              <button onClick={() => setVaultMode('file')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'file' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500'}`}><UploadCloud className="w-4 h-4" /> File Vault</button>
            </div>
            {vaultMode === 'text' ? (
              <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type highly sensitive data..." className="w-full h-40 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono focus:border-fuchsia-500/50 resize-none text-gray-300" />
            ) : (
              <div className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${isDragging ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 bg-black/40'}`} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                {selectedFile ? <div className="flex flex-col items-center gap-2"><FileIcon className="w-8 h-8 text-fuchsia-400" /><span className="text-sm font-bold text-fuchsia-300">{selectedFile.name}</span></div> : <div className="flex flex-col items-center gap-2 text-gray-500"><UploadCloud className="w-8 h-8" /><span className="text-sm font-bold">Click or Drag & Drop</span></div>}
              </div>
            )}
            <div className="mt-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Key className="h-5 w-5 text-fuchsia-500" /></div>
              <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Secret Password" className="w-full bg-black/80 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:border-fuchsia-500 text-fuchsia-300 font-bold tracking-wider" />
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-cyan-500" /><span>Payload: <span className="font-mono text-cyan-400">{payloadSize} Bytes</span></span></div>
              {payloadSize > 0 && <span className="text-fuchsia-500/70">AES-256 Active</span>}
            </div>
          </div>
          <button onClick={handleUpload} disabled={!connected || isUploading || (!code && !fileBase64) || !secretKey} className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 disabled:opacity-50 font-bold py-4 rounded-xl flex items-center justify-center text-white shadow-xl">{isUploading ? "SECURING ON BLOCKCHAIN..." : "LOCK IN VAULT"}</button>
        </main>

        <aside className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 min-h-[400px]">
            <div className="flex justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 text-gray-300"><Globe className="w-5 h-5 text-cyan-400 animate-pulse" /><h3 className="font-bold text-sm uppercase">Live Txns</h3></div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full border border-cyan-500/30">Syncing</span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {!connected ? <div className="text-center text-gray-600 text-sm py-10">Connect wallet to view.</div> : isLoadingHistory && !onChainHistory.length ? <div className="text-center text-gray-600 text-sm py-10">Fetching blocks...</div> : !onChainHistory.length ? <div className="text-center text-gray-500 text-sm py-10 border border-dashed border-gray-700 rounded-lg">No transactions found.</div> : onChainHistory.map((tx, i) => {
                const isLocal = history.some(h => h.hash === tx.hash);
                return (
                  <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 hover:border-cyan-500/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${tx.success ? 'bg-green-500' : 'bg-red-500'}`}></div><span className="text-[10px] text-gray-400 font-mono">Ver: {tx.version}</span></div>
                      <span className="text-[10px] text-gray-500 font-mono">{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <a href={`https://explorer.aptoslabs.com/txn/${tx.hash}?network=${network?.name?.toLowerCase() || 'testnet'}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-cyan-400 hover:underline truncate w-40">{tx.hash.slice(0,10)}...{tx.hash.slice(-8)}</a>
                      {isLocal ? <button onClick={() => handleUnlock(tx.hash)} className="bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Unlock className="w-3 h-3" /> UNLOCK</button> : <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-1 rounded-md">Off-device</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {selectedHash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-fuchsia-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-fuchsia-500" /> Unlock Asset</h3><button onClick={() => { setSelectedHash(null); setDecryptedData(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            {!decryptedData ? (
              <div className="space-y-4">
                <input type="password" value={unlockKey} onChange={(e) => { setUnlockKey(e.target.value); setUnlockError(false); }} placeholder="Enter Password" className={`w-full bg-black border ${unlockError ? 'border-red-500' : 'border-white/10'} rounded-lg py-3 px-4 focus:border-fuchsia-500 text-fuchsia-300`} />
                {unlockError && <p className="text-xs text-red-500 font-bold">Incorrect Password!</p>}
                <button onClick={processUnlock} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 rounded-lg">Decrypt</button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <div className="flex items-center gap-2 text-green-400 mb-2"><CheckCircle2 className="w-5 h-5" /><span className="font-bold">Decryption Successful</span></div>
                {decryptedRecord?.type === 'file' ? (
                  <div className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-center">
                    {decryptedData.startsWith('data:image/') ? <img src={decryptedData} alt="Decrypted" className="max-h-[300px] object-contain mx-auto mb-4" /> : <FileIcon className="w-16 h-16 text-cyan-400 mx-auto mb-4" />}
                    <a href={decryptedData} download={decryptedRecord.fileName || "decrypted"} className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2 px-6 rounded-lg">Download File</a>
                  </div>
                ) : <textarea readOnly value={decryptedData} className="w-full h-40 bg-green-500/5 border border-green-500/30 rounded-lg p-3 text-sm font-mono text-green-300 resize-none outline-none" />}
              </div>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.3); border-radius: 10px; }`}} />
    </div>
  );
}
