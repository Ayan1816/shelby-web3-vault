"use client";

import { useState } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Lock, Unlock, UploadCloud, Copy, CheckCircle } from "lucide-react";

export default function App() {
  return (
    <AptosWalletAdapterProvider autoConnect={true}>
      <ShelbyVault />
    </AptosWalletAdapterProvider>
  );
}

function ShelbyVault() {
  const { connected, account, connect, disconnect, wallets, signAndSubmitTransaction } = useWallet();
  const [code, setCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUpload = async () => {
    if (!code) return alert("Please enter some code first!");
    
    setIsUploading(true);
    
    try {
      // এটি হলো টেস্ট করার জন্য একটি ১০০% নিরাপদ ট্রানজ্যাকশন
      const payload = {
        type: "entry_function_payload",
        function: "0x1::aptos_account::transfer",
        type_arguments: [],
        arguments: ["0x1", 100], // Aptos-এর মূল ঠিকানায় নামমাত্র 100 Octa পাঠানো
      };
      
      const response = await signAndSubmitTransaction(payload);
      
      if (response) {
        alert("Awesome! Transaction submitted successfully to Aptos Blockchain.");
        setCode(""); 
      }
    } catch (error) {
      alert("Transaction failed or declined by user.");
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
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <Lock className="text-green-500 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-widest">SHELBY VAULT</h1>
        </div>

        {/* Wallet Connection */}
        {connected && account ? (
          <div className="flex items-center gap-4">
            <div 
              onClick={copyAddress}
              className="cursor-pointer flex items-center gap-2 bg-gray-900 px-4 py-2 rounded border border-gray-700 hover:border-gray-500 transition"
            >
              <span className="text-sm text-gray-400">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </span>
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </div>
            <button 
              onClick={disconnect}
              className="bg-red-900/50 text-red-400 border border-red-800 px-4 py-2 rounded hover:bg-red-900 transition"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button 
            onClick={() => connect(wallets?.[0]?.name)}
            className="flex items-center gap-2 bg-green-600 text-black font-bold px-6 py-2 rounded hover:bg-green-500 transition"
          >
            <Unlock className="w-4 h-4" /> Connect Wallet
          </button>
        )}
      </div>

      {/* Main Workspace */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Code Input Area */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h2 className="text-gray-400 text-sm tracking-widest">SECURE DATA INPUT</h2>
          </div>
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your sensitive code, logs, or secrets here..."
            className="w-full h-96 bg-gray-900 border border-gray-800 rounded p-4 text-green-400 focus:outline-none focus:border-green-500 font-mono text-sm resize-none"
          />
        </div>

        {/* Control Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded p-6">
            <h3 className="text-gray-400 text-sm tracking-widest mb-4 border-b border-gray-800 pb-2">NETWORK STATUS</h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Target Chain</span>
              <span className="text-white text-sm">Aptos Network</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Storage Node</span>
              <span className="text-green-500 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
              </span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded p-6 flex flex-col gap-4">
            <h3 className="text-gray-400 text-sm tracking-widest border-b border-gray-800 pb-2">VAULT SETTINGS</h3>
            <select className="bg-black border border-gray-700 text-white p-2 rounded focus:outline-none focus:border-green-500">
              <option>Retain for 1 Day</option>
              <option>Retain for 7 Days</option>
              <option>Permanent Storage</option>
            </select>
            
            <button 
              onClick={handleUpload}
              disabled={!connected || isUploading}
              className={`w-full flex justify-center items-center gap-2 py-3 rounded font-bold transition mt-4 ${
                !connected ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                isUploading ? 'bg-green-800 text-green-400 animate-pulse' : 
                'bg-green-600 text-black hover:bg-green-500'
              }`}
            >
              <UploadCloud className="w-5 h-5" />
              {isUploading ? "SENDING TO BLOCKCHAIN..." : "SECURE TO SHELBY"}
            </button>
            {!connected && <p className="text-xs text-red-400 text-center mt-2">Connect wallet to upload</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
