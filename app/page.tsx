"use client";

import { useState } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Activity } from "lucide-react";

export default function App() {
  return (
    // এখানে autoConnect={false} করে দেওয়া হয়েছে যাতে জোর করে কানেক্ট না হয়
    <AptosWalletAdapterProvider plugins={[]} autoConnect={false}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

function ShelbyVault() {
  const { connected, account, signAndSubmitTransaction, disconnect, network } = useWallet();
  const [code, setCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);

  const isMainnet = network?.name?.toLowerCase() === 'mainnet';
  const networkName = network?.name || 'Disconnected';

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-4 font-sans selection:bg-cyan-500/30">
      
      <header className="w-full max-w-3xl flex justify-between items-center py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Shield className="text-cyan-400 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-widest">SHELBY <span className="text-cyan-400">VAULT</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {connected && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${isMainnet ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
              <Activity className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wider uppercase">{networkName}</span>
            </div>
          )}

          {connected && account ? (
            <div className="flex items-center gap-2">
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg transition-all">
                <span className="text-sm font-mono text-cyan-300">{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
              <button 
                onClick={() => {
                  disconnect();
                  window.location.reload(); // ডিসকানেক্ট হওয়ার পর পেজ রিলোড হবে
                }} 
                title="Disconnect Wallet"
                className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 p-2.5 rounded-lg transition-all text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm font-semibold text-gray-500 animate-pulse">Waiting for wallet...</div>
          )}
        </div>
      </header>

      <main className="w-full max-w-3xl mt-12 space-y-6">
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70"></div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Secret Data Input</h2>
            <label className="flex items-center cursor-pointer gap-3">
              <span className={`text-xs font-bold ${isEncrypted ? 'text-cyan-400' : 'text-gray-500'}`}>
                {isEncrypted ? 'ENCRYPTED' : 'RAW DATA'}
              </span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isEncrypted} onChange={() => setIsEncrypted(!isEncrypted)} />
                <div className={`block w-10 h-5 rounded-full transition-colors ${isEncrypted ? 'bg-cyan-500/30 border border-cyan-400' : 'bg-gray-800 border border-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isEncrypted ? 'transform translate-x-5 bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : ''}`}></div>
              </div>
            </label>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Type your sensitive information here..."
            className={`w-full h-40 bg-black/40 border border-white/5 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-cyan-500/50 transition-all resize-none ${isEncrypted ? 'text-cyan-300' : 'text-gray-300'}`}
            style={{ filter: isEncrypted && code.length > 0 ? 'blur(3px)' : 'none' }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!connected || isUploading || !code}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg"
        >
          {isUploading ? "SECURING ON BLOCKCHAIN..." : "SECURE TO SHELBY"}
        </button>

        {txHash && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 mt-6">
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Vault Locked Successfully on {networkName}!</span>
            </div>
            <a 
              href={`https://explorer.aptoslabs.com/txn/${txHash}?network=${network?.name?.toLowerCase() || 'mainnet'}`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-cyan-400 hover:underline"
            >
              Verify on Aptos Explorer ↗
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
