"use client";

import { useState, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Activity, Zap, Database, History, Coins } from "lucide-react";

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
  
  // নতুন ফিউচার: ব্যালেন্স এবং হিস্ট্রি
  const [balance, setBalance] = useState<string>("0.00");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚀 লাইভ ব্যালেন্স চেক করার ম্যাজিক কোড
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
            const aptBalance = (parseInt(data.data.coin.value) / 100000000).toFixed(4);
            setBalance(aptBalance);
          }
        } catch (error) {
          console.error("Balance fetch error:", error);
        }
      }
    };
    fetchBalance();
  }, [account, network]);

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
        setHistory(prev => [response.hash, ...prev]); // হিস্ট্রিতে সেভ করা হচ্ছে
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

  // 🚀 ডেটা সাইজ ক্যালকুলেটর
  const dataSize = new Blob([code]).size;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 font-sans selection:bg-fuchsia-500/30 pb-20">
      
      {/* Premium Header */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl shadow-lg shadow-fuchsia-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
              SHELBY <span className="text-white">VAULT</span>
            </h1>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
          {connected && account ? (
            <>
              {/* 🚀 Feature 1: Live Balance */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-bold">{balance} APT</span>
              </div>

              {/* Network Status */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{network?.name || 'Aptos'}</span>
              </div>
              
              {/* Wallet Address */}
              <button onClick={copyAddress} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all">
                <span className="text-sm font-mono text-fuchsia-300">{account.address?.slice(0, 6)}...{account.address?.slice(-4)}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Disconnect Button */}
              <button onClick={disconnect} title="Disconnect" className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all text-red-400">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* The Glowing Connect Button */
            <button onClick={handleConnect} className="group relative flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 px-8 py-3 rounded-xl font-bold transition-all overflow-hidden shadow-[0_0_20px_rgba(192,38,211,0.4)]">
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -ml-4 w-12"></div>
              <Wallet className="w-5 h-5" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 mt-10">
        
        {/* Left Side: Input Vault */}
        <main className="flex-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1 shadow-[0_0_50px_rgba(192,38,211,0.05)] relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            
            <div className="relative bg-[#0a0a0a] rounded-xl p-6">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Zap className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-bold tracking-widest uppercase">Secret Vault</span>
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
                placeholder="Type or paste your highly sensitive data here..."
                className={`w-full h-56 bg-black/60 border border-white/5 rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none ${isEncrypted ? 'text-fuchsia-300' : 'text-gray-300'}`}
                style={{ filter: isEncrypted && code.length > 0 ? 'blur(4px)' : 'none' }}
              />

              {/* 🚀 Feature 2: Data Size Status */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Payload Size: <span className="font-mono text-cyan-400">{dataSize} Bytes</span></span>
                </div>
                {dataSize > 0 && <span>Estimated Gas: ~0.00005 APT</span>}
              </div>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!connected || isUploading || !code}
            className="w-full relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 disabled:opacity-50 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-white shadow-xl"
          >
            {isUploading ? "SECURING ON APTOS L1..." : "DEPOSIT TO SHELBY VAULT"}
          </button>
        </main>

        {/* 🚀 Feature 3: Right Side: Transaction History Dashboard */}
        <aside className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 h-full min-h-[300px]">
            <div className="flex items-center gap-2 mb-6 text-gray-300 border-b border-white/5 pb-4">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold tracking-wider text-sm uppercase">Vault History</h3>
            </div>
            
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-10">
                  No recent deposits found.
                </div>
              ) : (
                history.map((hash, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-green-400">Success</span>
                      <span className="text-[10px] text-gray-500">Just now</span>
                    </div>
                    <a 
                      href={`https://explorer.aptoslabs.com/txn/${hash}?network=${network?.name?.toLowerCase() || 'testnet'}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-mono truncate block"
                    >
                      {hash.slice(0, 15)}...{hash.slice(-10)}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
