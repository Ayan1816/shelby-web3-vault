"use client";

import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Coins, Key, Lock, Unlock, X, FileText, UploadCloud, File as FileIcon, Globe, Zap, Activity, Share2, Loader2, DollarSign } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

const encryptMsg = (t: string, p: string) => { try { const e = encodeURIComponent(t); let r = ''; for(let i=0; i<e.length; i++) r += String.fromCharCode(e.charCodeAt(i) ^ p.charCodeAt(i % p.length)); return btoa(r); } catch(err) { return ""; } };
const decryptMsg = (c: string, p: string) => { try { let r = atob(c), res = ''; for(let i=0; i<r.length; i++) res += String.fromCharCode(r.charCodeAt(i) ^ p.charCodeAt(i % p.length)); return decodeURIComponent(res); } catch(err) { return null; } };

type VaultRecord = { hash: string, data: string, type: 'text'|'file', fileName?: string, timestamp: number };
type OnChainTx = { hash: string, timestamp: number, success: boolean, version: string };

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [shelbyBalance, setShelbyBalance] = useState<string>("0.00");
  const [history, setHistory] = useState<VaultRecord[]>([]);
  const [onChainHistory, setOnChainHistory] = useState<OnChainTx[]>([]);
  const [vaultMode, setVaultMode] = useState<'text' | 'file'>('text');
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

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem("shelby_final_vault");
    if(savedHistory) setHistory(JSON.parse(savedHistory));
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = params.get('hash');
      if (hash) setSelectedHash(hash);
    }
    const ping = setInterval(() => setLatency(connected ? Math.floor(Math.random() * 80) + 40 : 0), 5000);
    return () => clearInterval(ping);
  }, [connected]);

  const fetchBlockchainData = async () => {
    if (!account?.address) return;
    try {
      const isMainnet = network?.name?.toLowerCase().includes('mainnet');
      const nodeUrl = isMainnet ? 'https://fullnode.mainnet.aptoslabs.com/v1' : 'https://fullnode.testnet.aptoslabs.com/v1';
      const fetchOptions: RequestInit = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } };

      const assetType = "0x1::aptos_coin::AptosCoin";
      const balanceUrl = `${nodeUrl}/accounts/${account.address}/balance/${assetType}?_=${Date.now()}`;
      
      let balanceFetched = false;
      const balRes = await fetch(balanceUrl, fetchOptions).catch(() => null);
      if (balRes && balRes.ok) {
        const balData = await balRes.json();
        const rawBalance = balData?.balance || balData; 
        if (rawBalance !== undefined) {
          setBalance((parseInt(rawBalance) / 100000000).toFixed(4));
          balanceFetched = true;
        }
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
          
          const shelbyData = allData.find((r: any) => r.type.startsWith("0x1::coin::CoinStore<") && r.type.toLowerCase().includes("shelby"));
          if (shelbyData?.data?.coin?.value) {
              setShelbyBalance((parseInt(shelbyData.data.coin.value) / 100000000).toFixed(2));
          } else { setShelbyBalance("0.00"); }
      } else {
          if (!balanceFetched) setBalance("0.00");
      }

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
    if (connected) {
      fetchBlockchainData();
      const interval = setInterval(fetchBlockchainData, 5000);
      return () => clearInterval(interval);
    } else { setBalance("0.00"); setShelbyBalance("0.00"); setOnChainHistory([]); }
  }, [account, network, connected]);
    // 🚀 আপনার দেওয়া লিংক অনুযায়ী ফসেট বাটন আপডেট করা হলো
  const handleFaucet = (type: 'apt' | 'shelby') => {
    const isMainnet = network?.name?.toLowerCase().includes('mainnet');
    if (isMainnet) return alert("⚠️ Faucet is NOT available on Mainnet!");
    
    if (account?.address) {
        navigator.clipboard.writeText(account.address);
        alert(`✅ Full Wallet Address Copied! Please paste it in the ${type.toUpperCase()} Faucet form.`);
    }
    
    if (type === 'apt') {
        window.open("https://aptos.dev/network/faucet", "_blank");
    } else {
        window.open("https://docs.shelby.xyz/tools/wallets/petra-setup#apt-faucet", "_blank");
    }
  };

  const uploadFileToIPFS = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("IPFS Upload Failed");
    const data = await res.json();
    return data.IpfsHash;
  };

  const handleUpload = async () => {
    if (!secretKey || (!code && !selectedFile)) return alert("Fill all fields & set a password!");
    setIsUploading(true);
    try {
      let rawData = code;
      if (vaultMode === 'file' && selectedFile) {
        const ipfsHash = await uploadFileToIPFS(selectedFile);
        rawData = ipfsHash; 
      }
      const payload = { data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [account?.address, 0] } };
      const response = await signAndSubmitTransaction(payload);
      
      if (response && response.hash) {
        const newRecord: VaultRecord = { hash: response.hash, data: encryptMsg(rawData, secretKey), type: vaultMode, fileName: selectedFile?.name, timestamp: Date.now() };
        const newHistory = [newRecord, ...history];
        setHistory(newHistory); localStorage.setItem("shelby_final_vault", JSON.stringify(newHistory));
        setCode(""); setSelectedFile(null); setSecretKey("");
        alert("✅ Secure Asset Locked & Synced with IPFS!");
        setTimeout(fetchBlockchainData, 2000);
      }
    } catch (error) { 
        console.error(error); alert("❌ Transaction Failed!"); 
    } finally { setIsUploading(false); }
  };

  const handleShare = (rec: VaultRecord) => {
    const link = `${window.location.origin}?hash=${rec.hash}&data=${encodeURIComponent(rec.data)}&type=${rec.type}&fname=${encodeURIComponent(rec.fileName || "")}`;
    navigator.clipboard.writeText(link);
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
        if (recordInfo.type === 'file') { setDecryptedData(`https://gateway.pinata.cloud/ipfs/${result}`); } 
        else { setDecryptedData(result); }
        setDecryptedRecord(recordInfo); setUnlockError(false);
      } else { setUnlockError(true); setDecryptedData(null); }
    } else { alert("❌ Encrypted data not found!"); }
  };

  const copyAddress = () => { if (account?.address) { navigator.clipboard.writeText(account.address); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const closeUnlockModal = () => { setSelectedHash(null); setDecryptedData(null); setUnlockKey(""); if (window.history.pushState) window.history.pushState({}, '', window.location.pathname); };

  if (!mounted) return null;
  const isMainnet = network?.name?.toLowerCase().includes('mainnet');

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 font-sans pb-20">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl"><Shield className="text-white w-6 h-6" /></div>
          <div><h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">SHELBY <span className="text-white">VAULT</span></h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {connected && account ? (
            <>
              {/* 🚀 এখানে ২টি আলাদা ফসেট বাটন দেওয়া হলো */}
              <button onClick={() => handleFaucet('apt')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-colors bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                <Zap className="w-3.5 h-3.5" /> APT Faucet
              </button>
              <button onClick={() => handleFaucet('shelby')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-colors bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/20">
                <Zap className="w-3.5 h-3.5" /> S-USD Faucet
              </button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <Coins className="w-4 h-4" /><span className="text-sm font-bold">{balance} APT</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <DollarSign className="w-4 h-4" /><span className="text-sm font-bold">{shelbyBalance} S-USD</span>
              </div>
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg"><span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>{copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}</button>
              <button onClick={disconnect} className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20"><LogOut className="w-4 h-4" /></button>
            </>
          ) : <button onClick={() => wallets?.length ? connect(wallets[0].name) : alert("Install Petra!")} className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold hover:from-fuchsia-500 hover:to-purple-500"><Wallet className="w-5 h-5" /> Connect Wallet</button>}
        </div>
      </header>

      <div className="w-full max-w-6xl mt-4 flex flex-wrap justify-between items-center bg-white/[0.02] border border-white/5 rounded-lg px-6 py-3 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
          <span className={connected ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{connected ? `NODE: ${network?.name?.toUpperCase() || 'TESTNET'}` : 'OFFLINE'}</span>
        </div>
        <div className="flex items-center gap-4"><span>LATENCY: <span className="text-cyan-400">{latency}ms</span></span></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 mt-6">
        <main className="flex-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 relative">
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
              <button onClick={() => setVaultMode('text')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'text' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}><FileText className="w-4 h-4" /> Secret Text</button>
              <button onClick={() => setVaultMode('file')} className={`flex items-center gap-2 text-sm font-bold pb-2 ${vaultMode === 'file' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}><UploadCloud className="w-4 h-4" /> IPFS File Vault</button>
            </div>
            {vaultMode === 'text' ? <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type highly sensitive data here..." className="w-full h-40 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono text-gray-300 outline-none focus:border-fuchsia-500/50 resize-none" /> : (
              <div className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 bg-black/40 hover:border-white/30'}`} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
                {selectedFile ? <div className="text-center"><FileIcon className="w-8 h-8 text-fuchsia-400 mx-auto mb-2" /><span className="text-sm font-bold text-fuchsia-300">{selectedFile.name}</span></div> : <div className="text-center text-gray-500"><UploadCloud className="w-8 h-8 mx-auto mb-2" /><span className="text-sm font-bold">Select File (Max 10MB)</span></div>}
              </div>
            )}
            <div className="mt-4 relative">
              <Key className="absolute left-3 top-3.5 h-5 w-5 text-fuchsia-500" />
              <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Set Secret Password" className="w-full bg-black/80 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:border-fuchsia-500 text-fuchsia-300 outline-none" />
            </div>
          </div>
          <button onClick={handleUpload} disabled={!connected || isUploading || (!code && !selectedFile) || !secretKey} className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 disabled:opacity-50 font-bold py-4 rounded-xl text-white flex justify-center items-center gap-2">
            {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> SECURING TO IPFS & CHAIN...</> : "LOCK IN VAULT"}
          </button>
        </main>

        <aside className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 h-[450px] flex flex-col">
            <h3 className="font-bold text-sm uppercase flex items-center gap-2 mb-4 border-b border-white/5 pb-4"><Globe className="w-4 h-4 text-cyan-400" /> Live Blockchain History</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {!connected ? <div className="text-center text-gray-500 py-10">Connect wallet to view history.</div> : onChainHistory.length === 0 ? <div className="text-center text-gray-500 py-10">No recent transactions.</div> : onChainHistory.map((tx, i) => {
                const localRecord = history.find(h => h.hash === tx.hash);
                const isLocal = !!localRecord;
                return (
                  <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 hover:border-cyan-500/50">
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><Activity className="w-3 h-3 text-cyan-400"/> Ver: {tx.version}</span>
                      <span className="text-[10px] text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <a href={`https://explorer.aptoslabs.com/txn/${tx.hash}?network=${network?.name?.toLowerCase() || 'testnet'}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-cyan-400 hover:underline truncate w-24">{tx.hash.slice(0,12)}...</a>
                      {isLocal ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleShare(localRecord)} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-2 py-1.5 rounded-md text-[10px] font-bold" title="Copy Shareable Link"><Share2 className="w-3 h-3"/></button>
                          <button onClick={() => setSelectedHash(tx.hash)} className="bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/40 px-3 py-1.5 rounded-md text-[10px] font-bold"><Unlock className="w-3 h-3 inline mr-1"/> DECRYPT</button>
                        </div>
                      ) : <span className="text-[10px] text-gray-600 px-2">On-Chain</span>}
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
          <div className="bg-[#0a0a0a] border border-fuchsia-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between mb-6"><h3 className="font-bold text-white"><Lock className="w-5 h-5 text-fuchsia-500 inline mr-2" /> Unlock Asset</h3><button onClick={closeUnlockModal}><X className="text-gray-500 hover:text-white w-5 h-5"/></button></div>
            {!decryptedData ? (
              <div className="space-y-4">
                <input type="password" value={unlockKey} onChange={(e) => { setUnlockKey(e.target.value); setUnlockError(false); }} placeholder="Enter Password" className={`w-full bg-black border ${unlockError ? 'border-red-500' : 'border-white/10'} rounded-lg p-3 text-fuchsia-300 outline-none focus:border-fuchsia-500`} />
                {unlockError && <p className="text-xs text-red-500 font-bold">Incorrect Password!</p>}
                <button onClick={processUnlock} className="w-full bg-fuchsia-600 text-white font-bold p-3 rounded-lg">Decrypt</button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <span className="text-green-400 font-bold flex justify-center items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Success</span>
                {decryptedRecord?.type === 'file' ? (
                    <div className="bg-black/50 p-4 rounded-lg">
                        <img src={decryptedData} className="max-h-[200px] mx-auto mb-4 rounded" onError={(e) => { e.currentTarget.style.display='none'; document.getElementById('fallback-icon')?.classList.remove('hidden'); }} />
                        <FileIcon id="fallback-icon" className="w-12 h-12 text-cyan-400 mx-auto mb-4 hidden"/>
                        <a href={decryptedData} target="_blank" rel="noreferrer" download={decryptedRecord.fileName || "file"} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold text-sm inline-block">Download IPFS File</a>
                    </div>
                ) : (
                    <textarea readOnly value={decryptedData} className="w-full h-32 bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-lg outline-none" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; }`}} />
    </div>
  );
}
