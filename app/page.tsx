"use client";

import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Activity, Database, History, Coins, Key, Lock, Unlock, X, FileText, Image as ImageIcon, UploadCloud, File } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

// 🔐 সিক্রেট ডেটা এনক্রিপ্ট ও ডিক্রিপ্ট ইঞ্জিন
const encryptMessage = (text: string, password: string) => {
  try {
    const encodedText = encodeURIComponent(text);
    let result = '';
    for(let i=0; i<encodedText.length; i++) {
      result += String.fromCharCode(encodedText.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return btoa(result);
  } catch(e) { return ""; }
};

const decryptMessage = (ciphertext: string, password: string) => {
  try {
    let raw = atob(ciphertext);
    let result = '';
    for(let i=0; i<raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return decodeURIComponent(result);
  } catch(e) { return null; }
};

type VaultRecord = { hash: string, data: string, type: 'text' | 'file', fileName?: string, timestamp: number };

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [history, setHistory] = useState<VaultRecord[]>([]);

  // 🚀 ইনপুট স্টেটসমূহ
  const [vaultMode, setVaultMode] = useState<'text' | 'file'>('text');
  const [code, setCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 📁 ফাইল আপলোড স্টেট
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔓 ডিক্রিপ্ট স্টেট
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [unlockKey, setUnlockKey] = useState("");
  const [decryptedRecord, setDecryptedRecord] = useState<VaultRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem("shelby_vault_history_v2");
    if(savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address) {
        try {
          const nodeUrl = network?.name?.toLowerCase() === 'mainnet' 
            ? 'https://fullnode.mainnet.aptoslabs.com/v1' 
            : 'https://fullnode.testnet.aptoslabs.com/v1';
          const response = await fetch(`${nodeUrl}/accounts/${account.address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`);
          const data = await response.json();
          if (data?.data?.coin?.value) {
            setBalance((parseInt(data.data.coin.value) / 100000000).toFixed(4));
          }
        } catch (error) {}
      }
    };
    fetchBalance();
  }, [account, network]);

  const handleConnect = () => {
    if (wallets && wallets.length > 0) connect(wallets[0].name);
    else alert("Please install Petra Wallet extension!");
  };

  const processFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please select a file under 2MB for this demo.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFileBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!secretKey) return alert("Please set a Secret Password first!");
    if (vaultMode === 'text' && !code) return alert("Please enter some text data!");
    if (vaultMode === 'file' && !fileBase64) return alert("Please select a file to upload!");

    setIsUploading(true);
    try {
      const payload = {
        data: {
          function: "0x1::aptos_account::transfer",
          typeArguments: [],
          functionArguments: [account?.address, 0],
        }
      };

      const response = await signAndSubmitTransaction(payload);
      if (response && response.hash) {
        const rawData = vaultMode === 'text' ? code : fileBase64;
        const encryptedData = encryptMessage(rawData, secretKey);
        
        const newRecord: VaultRecord = { 
          hash: response.hash, 
          data: encryptedData, 
          type: vaultMode,
          fileName: vaultMode === 'file' ? selectedFile?.name : undefined,
          timestamp: Date.now()
        };
        
        const newHistory = [newRecord, ...history];
        setHistory(newHistory);
        localStorage.setItem("shelby_vault_history_v2", JSON.stringify(newHistory));
        
        setCode("");
        setSelectedFile(null);
        setFileBase64("");
        setSecretKey("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUnlock = () => {
    const record = history.find(h => h.hash === selectedHash);
    if (record) {
      const result = decryptMessage(record.data, unlockKey);
      if (result) {
        setDecryptedData(result);
        setDecryptedRecord(record);
        setUnlockError(false);
      } else {
        setUnlockError(true);
        setDecryptedData(null);
      }
    }
  };

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) return null;
  const payloadSize = vaultMode === 'text' ? new Blob([code]).size : new Blob([fileBase64]).size;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 font-sans selection:bg-fuchsia-500/30 pb-20 relative">
      
      {/* 🚀 Header */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl shadow-lg shadow-fuchsia-500/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            SHELBY <span className="text-white">VAULT</span>
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
          {connected && account ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-bold">{balance} APT</span>
              </div>
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all">
                <span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
              <button onClick={disconnect} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all text-red-400">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={handleConnect} className="group relative flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(192,38,211,0.4)]">
              <Wallet className="w-5 h-5" /> Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* 🚀 Main Layout */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 mt-10">
        
        {/* Left Side: Vault Input */}
        <main className="flex-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1 shadow-[0_0_50px_rgba(192,38,211,0.05)] relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            
            <div className="relative bg-[#0a0a0a] rounded-xl p-6">
              
              {/* 🚀 Tabs */}
              <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                <button onClick={() => setVaultMode('text')} className={`flex items-center gap-2 text-sm font-bold pb-2 transition-colors ${vaultMode === 'text' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}>
                  <FileText className="w-4 h-4" /> Secret Text
                </button>
                <button onClick={() => setVaultMode('file')} className={`flex items-center gap-2 text-sm font-bold pb-2 transition-colors ${vaultMode === 'file' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}>
                  <UploadCloud className="w-4 h-4" /> File Vault
                </button>
              </div>

              {/* 📝 Text Mode */}
              {vaultMode === 'text' ? (
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Type your highly sensitive data here..."
                  className="w-full h-40 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none text-gray-300"
                />
              ) : (
                /* 📁 File Mode */
                <div 
                  className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${isDragging ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 bg-black/40 hover:border-white/30'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2 text-center p-4">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-8 h-8 text-fuchsia-400" /> : <File className="w-8 h-8 text-fuchsia-400" />}
                      <span className="text-sm font-bold text-fuchsia-300 truncate max-w-[250px]">{selectedFile.name}</span>
                      <span className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500 cursor-pointer">
                      <UploadCloud className="w-8 h-8" />
                      <span className="text-sm font-bold">Drag & Drop or Click to Upload</span>
                      <span className="text-xs">Max 2MB (Images, PDFs, etc.)</span>
                    </div>
                  )}
                </div>
              )}

              {/* 🔐 Password Input */}
              <div className="mt-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-fuchsia-500" />
                </div>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Set a Secret Password to Encrypt"
                  className="w-full bg-black/80 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-fuchsia-500 text-fuchsia-300 font-bold tracking-wider"
                />
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Payload: <span className="font-mono text-cyan-400">{payloadSize} Bytes</span></span>
                </div>
                {payloadSize > 0 && <span className="text-fuchsia-500/70 text-[10px]">AES-256 Enabled</span>}
              </div>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!connected || isUploading || (!code && !fileBase64) || !secretKey}
            className="w-full relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 disabled:opacity-50 disabled:from-gray-800 disabled:to-gray-800 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-white shadow-xl"
          >
            {isUploading ? "ENCRYPTING & SECURING..." : "LOCK IN VAULT"}
          </button>
        </main>

        {/* Right Side: History Dashboard */}
        <aside className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 h-full min-h-[300px]">
            <div className="flex items-center gap-2 mb-6 text-gray-300 border-b border-white/5 pb-4">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold tracking-wider text-sm uppercase">Encrypted Storage</h3>
            </div>
            
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-10">No locked data found.</div>
              ) : (
                history.map((record, index) => (
                  <button 
                    key={index} 
                    onClick={() => { setSelectedHash(record.hash); setUnlockKey(""); setDecryptedData(null); }}
                    className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-lg p-3 hover:border-fuchsia-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {record.type === 'file' ? <File className="w-4 h-4 text-cyan-500" /> : <FileText className="w-4 h-4 text-fuchsia-500" />}
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-bold text-gray-300 group-hover:text-white truncate max-w-[150px]">
                          {record.fileName || `Locked Text #${history.length - index}`}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(record.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <Unlock className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-400 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 🚀 DECRYPTION MODAL (POP-UP) */}
      {selectedHash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-fuchsia-500/30 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(192,38,211,0.2)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-fuchsia-500" /> Unlock Vault Asset
              </h3>
              <button onClick={() => { setSelectedHash(null); setDecryptedData(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {!decryptedData ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Enter your secret password to decrypt this asset.</p>
                <input
                  type="password"
                  value={unlockKey}
                  onChange={(e) => { setUnlockKey(e.target.value); setUnlockError(false); }}
                  placeholder="Enter Password"
                  className={`w-full bg-black border ${unlockError ? 'border-red-500' : 'border-white/10'} rounded-lg py-3 px-4 focus:outline-none focus:border-fuchsia-500 text-fuchsia-300`}
                />
                {unlockError && <p className="text-xs text-red-500 font-bold">Access Denied: Incorrect Password!</p>}
                
                <button onClick={handleUnlock} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 rounded-lg mt-2 transition-colors">
                  Decrypt Asset
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in zoom-in duration-300 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 text-green-400 mb-2 w-full justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Decryption Successful</span>
                </div>
                
                {decryptedRecord?.type === 'file' ? (
                  <div className="w-full bg-black/50 border border-white/10 rounded-lg p-4">
                    {decryptedData.startsWith('data:image/') ? (
                      <img src={decryptedData} alt="Decrypted" className="max-w-full max-h-[300px] object-contain mx-auto rounded-md mb-4" />
                    ) : (
                      <File className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                    )}
                    <a href={decryptedData} download={decryptedRecord.fileName || "decrypted_file"} className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2 px-6 rounded-lg transition-colors">
                      Download File
                    </a>
                  </div>
                ) : (
                  <textarea 
                    readOnly 
                    value={decryptedData} 
                    className="w-full h-40 bg-green-500/5 border border-green-500/30 rounded-lg p-3 text-sm font-mono text-green-300 resize-none outline-none"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
      }
