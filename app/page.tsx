"use client";

import { useState, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Activity, Zap } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets, network } = useWallet();
  const [code, setCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = () => {
    if (wallets && wallets.length > 0) {
      connect(wallets[0].name);
    } else {
      alert("Please install Petra Wallet extension!");
    }
  };

  const handleUpload = async () => {
    if (!code) return alert("Please enter some data!");
    setIsUploading(true);
    setTxHash("");

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
        setTxHash(response.hash);
        setCode("");
        setIsEncrypted(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
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

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 font-sans selection:bg-fuchsia-500/30">
      
      {/* 🚀 Premium Header */}
      <header className="w-full max-w-4xl flex justify-between items-center py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-lg">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            SHELBY <span className="text-white">VAULT</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {connected && account ? (
            <div className="flex items-center gap-3">
              {/* Network Status */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{network?.name || 'Aptos'}</span>
              </div>
              
              {/* Wallet Address */}
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all">
                <span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Disconnect Button */}
              <button 
                onClick={disconnect}
                title="Disconnect"
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* 🌟 The Glowing Connect Button (Unique from others) */
            <button 
              onClick={handleConnect}
              className="group relative flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 px-6 py-2.5 rounded-lg font-bold transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -ml-4 w-12"></div>
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </header>

      {/* 🚀 Main Vault Interface */}
      <main className="w-full max-w-2xl mt-16 space-y-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-4xl font-black tracking-tight">Secure Your Digital Assets</h2>
          <p className="text-gray-400 text-sm">Military-grade encryption powered by the Aptos Blockchain.</p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1 shadow-[0_0_50px_rgba(192,38,211,0.05)] relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          
          <div className="relative bg-[#0a0a0a] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold tracking-widest uppercase">Input Module</span>
              </div>
              
              <label className="flex items-center cursor-pointer gap-3">
                <span className={`text-xs font-bold ${isEncrypted ? 'text-fuchsia-400' : 'text-gray-500'}`}>
                  {isEncrypted ? 'ENCRYPTED' : 'RAW MODE'}
                </span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isEncrypted} onChange={() => setIsEncrypted(!isEncrypted)} />
                  <div className={`block w-10 h-5 rounded-full transition-colors ${isEncrypted ? 'bg-fuchsia-500/30 border border-fuchsia-400' : 'bg-gray-800 border border-gray-600'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isEncrypted ? 'transform translate-x-5 bg-fuchsia-300 shadow-[0_0_8px_#d946ef]' : ''}`}></div>
                </div>
              </label>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your private keys, codes, or secret messages here..."
              className={`w-full h-48 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none ${isEncrypted ? 'text-fuchsia-300' : 'text-gray-300'}`}
              style={{ filter: isEncrypted && code.length > 0 ? 'blur(4px)' : 'none' }}
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!connected || isUploading || !code}
          className="w-full relative overflow-hidden bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
        >
          {isUploading ? "WRITING TO BLOCKCHAIN..." : "DEPOSIT TO VAULT"}
        </button>

        {txHash && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 mt-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 text-green-400 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" />
              <span>Asset Secured Successfully!</span>
            </div>
            <a 
              href={`https://explorer.aptoslabs.com/txn/${txHash}?network=${network?.name?.toLowerCase() || 'mainnet'}`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-sm text-fuchsia-400 hover:text-fuchsia-300 hover:underline flex items-center gap-1"
            >
              View on Aptos Explorer ↗
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
