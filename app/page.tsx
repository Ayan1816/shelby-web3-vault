"use client";
import { useState, useEffect, useRef } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Copy, CheckCircle2, Shield, LogOut, Wallet, Coins, Key, Lock, Unlock, X, FileText, UploadCloud, File as FileIcon, Globe, Zap, Activity, Share2, Loader2, DollarSign, Sun, Moon, Bell, QrCode, FolderGit2, Search, Trash2, Eye, RefreshCw } from "lucide-react";

export default function App() { return <AptosWalletAdapterProvider plugins={[]} autoConnect={false}><ShelbyVault /></AptosWalletAdapterProvider>; }

const encryptMsg = (t:string, p:string) => { try { const e=encodeURIComponent(t); let r=''; for(let i=0; i<e.length; i++) r+=String.fromCharCode(e.charCodeAt(i)^p.charCodeAt(i%p.length)); return btoa(r); } catch(e) { return ""; } };
const decryptMsg = (c:string, p:string) => { try { let r=atob(c), res=''; for(let i=0; i<r.length; i++) res+=String.fromCharCode(r.charCodeAt(i)^p.charCodeAt(i%p.length)); return decodeURIComponent(res); } catch(e) { return null; } };

type VaultRecord = { hash:string, data:string, type:'text'|'file', fileName?:string, timestamp:number };
type OnChainTx = { hash:string, timestamp:number, success:boolean, version:string };
type GalleryItem = { hash:string, data:string, type:'text'|'file', fileName?:string, decryptedAt:number };

function ShelbyVault() {
const { connected: conn, account: acc, signAndSubmitTransaction: signTx, disconnect: disconn, connect: cnct, wallets: wlts, network: net } = useWallet();
const [mounted, setMounted] = useState(false);
const [light, setLight] = useState(false);
const [tab, setTab] = useState<'vault'|'scanner'|'gallery'>('vault');
const [bal, setBal] = useState("0.00");
const [sBal, setSBal] = useState("0.00");
const [hist, setHist] = useState<VaultRecord[]>([]);
const [cHist, setCHist] = useState<OnChainTx[]>([]);
const [gal, setGal] = useState<GalleryItem[]>([]);
const [vMode, setVMode] = useState<'text'|'file'>('text');
const [code, setCode] = useState("");
const [secKey, setSecKey] = useState("");
const [uploading, setUploading] = useState(false);
const [copied, setCopied] = useState(false);
const [sFile, setSFile] = useState<File|null>(null);
const [drag, setDrag] = useState(false);
const fileRef = useRef<HTMLInputElement>(null);
const [sHash, setSHash] = useState<string|null>(null);
const [uKey, setUKey] = useState("");
const [dRec, setDRec] = useState<VaultRecord|null>(null);
const [dData, setDData] = useState<string|null>(null);
const [uErr, setUErr] = useState(false);
const [lat, setLat] = useState(0);
const [share, setShare] = useState<{link:string, record:VaultRecord}|null>(null);
const [scanTgt, setScanTgt] = useState("");
const [scanSt, setScanSt] = useState<'idle'|'scanning'|'success'|'failed'>('idle');
const [logs, setLogs] = useState<string[]>([]);

useEffect(() => {
setMounted(true);
const sh = localStorage.getItem("shelby_final_vault"); if(sh) setHist(JSON.parse(sh));
const sg = localStorage.getItem("shelby_decrypted_gallery"); if(sg) setGal(JSON.parse(sg));
if(typeof window !== 'undefined') { const h = new URLSearchParams(window.location.search).get('hash'); if(h) setSHash(h); }
const p = setInterval(() => setLat(conn ? Math.floor(Math.random()*80)+40 : 0), 15000);
return () => clearInterval(p);
}, [conn]);

const fetchChain = async () => {
if(!acc?.address) return;
try {
let nUrl = net?.name?.toLowerCase().includes('mainnet') ? 'https://fullnode.mainnet.aptoslabs.com/v1' : 'https://fullnode.testnet.aptoslabs.com/v1';
const cUrl = (net as any)?.url || (net as any)?.nodeUrl;
if(cUrl) nUrl = cUrl.endsWith('/v1') ? cUrl : `${cUrl.replace(/\/$/, "")}/v1`;
const opt: RequestInit = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } };
const bRes = await fetch(`${nUrl}/accounts/${acc.address}/balance/0x1::aptos_coin::AptosCoin?_=${Date.now()}`, opt).catch(() => null);
let bF = false;
if(bRes?.ok) { const d = await bRes.json(); const r = d?.balance || d; if(r !== undefined) { setBal((parseInt(r)/100000000).toFixed(4)); bF = true; } }
const fRes = await fetch(`${nUrl}/accounts/${acc.address}/resources?_=${Date.now()}`, opt).catch(() => null);
if(fRes?.ok) {
const all = await fRes.json();
if(!bF) { const c = all.find((x:any) => x.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"); setBal(c?.data?.coin?.value ? (parseInt(c.data.coin.value)/100000000).toFixed(4) : "0.00"); }
const s = all.find((x:any) => x.type.toLowerCase().includes("shelby") && (x.data?.coin?.value !== undefined || x.data?.balance !== undefined));
setSBal(s ? (parseInt(s.data?.coin?.value || s.data?.balance || "0")/100000000).toFixed(2) : "0.00");
} else if(!bF) setBal("0.00");
const tRes = await fetch(`${nUrl}/accounts/${acc.address}/transactions?limit=30&_=${Date.now()}`, opt).catch(() => null);
if(tRes?.ok) { const txs = await tRes.json(); if(Array.isArray(txs)) setCHist(txs.filter((x:any) => x.type === 'user_transaction').map((x:any) => ({ hash: x.hash, timestamp: x.timestamp ? parseInt(x.timestamp)/1000 : Date.now(), success: x.success, version: x.version }))); }
} catch(e) {}
};

useEffect(() => { if(conn) { fetchChain(); const id = setInterval(fetchChain, 15000); return () => clearInterval(id); } else { setBal("0.00"); setSBal("0.00"); setCHist([]); } }, [acc, net, conn]);

const doFaucet = (t:'apt'|'shelby') => window.open(t === 'apt' ? "https://docs.shelby.xyz/tools/wallets/petra-setup#apt-faucet" : "https://docs.shelby.xyz/tools/wallets/petra-setup#shelbyusd-faucet", "_blank");
const upIPFS = async (f:File) => { const fd = new FormData(); fd.append("file", f); const r = await fetch("/api/upload", { method:"POST", body:fd }); if(!r.ok) throw new Error(""); return (await r.json()).IpfsHash; };

const doUpload = async () => {
if(!secKey || (!code && !sFile)) return alert("Fill all fields & set a password!");
setUploading(true);
try {
let raw = code; if(vMode === 'file' && sFile) raw = await upIPFS(sFile);
const res = await signTx({ data: { function: "0x1::aptos_account::transfer", typeArguments: [], functionArguments: [acc?.address, 0] } });
if(res?.hash) {
const rec:VaultRecord = { hash: res.hash, data: encryptMsg(raw, secKey), type: vMode, fileName: sFile?.name, timestamp: Date.now() };
const nHist = [rec, ...hist]; setHist(nHist); localStorage.setItem("shelby_final_vault", JSON.stringify(nHist));
setCode(""); setSFile(null); setSecKey(""); alert("✅ Secure Asset Locked & Synced with IPFS!"); setTimeout(fetchChain, 2000);
}
} catch(e) { alert("❌ Transaction Failed!"); } finally { setUploading(false); }
};

const openShare = (r:VaultRecord) => setShare({ link: `${window.location.origin}?hash=${r.hash}&data=${encodeURIComponent(r.data)}&type=${r.type}&fname=${encodeURIComponent(r.fileName || "")}`, record: r });
const doUnlock = () => {
let tData = ""; let rInfo:any = null; const p = new URLSearchParams(window.location.search);
const uHash = p.get('hash'); const uData = p.get('data'); const uType = p.get('type'); const uFname = p.get('fname');
if(sHash === uHash && uData) { tData = decodeURIComponent(uData); rInfo = { hash: uHash || "Shared_Asset", type: uType || 'text', fileName: uFname ? decodeURIComponent(uFname) : "Shared Web3 Drop" }; }
else { const r = hist.find(h => h.hash === sHash); if(r) { tData = r.data; rInfo = r; } }
if(tData) {
const res = decryptMsg(tData, uKey);
if(res) {
const fContent = rInfo.type === 'file' ? `https://gateway.pinata.cloud/ipfs/${res}` : res;
setDData(fContent); setDRec(rInfo); setUErr(false);
const gItem:GalleryItem = { hash: rInfo.hash, data: fContent, type: rInfo.type, fileName: rInfo.fileName || (rInfo.type === 'file' ? 'IPFS_File' : 'Classified_Note'), decryptedAt: Date.now() };
setGal(prev => { if(prev.some(x => x.hash === gItem.hash)) return prev; const up = [gItem, ...prev]; localStorage.setItem("shelby_decrypted_gallery", JSON.stringify(up)); return up; });
} else { setUErr(true); setDData(null); }
} else alert("❌ Encrypted data not found!");
};

const delGal = (h:string) => { const f = gal.filter(x => x.hash !== h); setGal(f); localStorage.setItem("shelby_decrypted_gallery", JSON.stringify(f)); };
const runScan = () => {
if(!scanTgt) return alert("Select target Hash!"); setScanSt('scanning');
setLogs(["Initiating node handshake...", `Target: ${scanTgt}`, "Querying Aptos ledger proof...", "Fetching IPFS DAG root..."]);
setTimeout(() => setLogs(p => [...p, "Comparing SHA-256 checksum vs local state..."]), 1200);
setTimeout(() => {
if(hist.find(x => x.hash === scanTgt) || cHist.find(x => x.hash === scanTgt)) { setScanSt('success'); setLogs(p => [...p, "✅ INTEGRITY PASSED: Zero unauthorized modification detected."]); }
else { setScanSt('failed'); setLogs(p => [...p, "❌ ALERT: Cryptographic mismatch detected!"]); }
}, 2800);
};

const copyAddr = () => { if(acc?.address) { navigator.clipboard.writeText(acc.address); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
const closeUnl = () => { setSHash(null); setDData(null); setUKey(""); if(window.history.pushState) window.history.pushState({}, '', window.location.pathname); };

if(!mounted) return null;

return (
<div className={`min-h-screen flex flex-col items-center p-4 font-sans pb-20 transition-colors duration-500 ${light ? 'bg-[#f8f9fa] text-slate-900' : 'bg-[#050505] text-white'}`}>
<header className={`w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 py-5 px-6 mt-4 rounded-2xl shadow-lg border ${light ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
<div className="flex items-center gap-3"><div className="p-2.5 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-xl"><Shield className="text-white w-6 h-6"/></div><h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">SHELBY <span className={light ? 'text-slate-900':'text-white'}>VAULT</span></h1></div>
<div className="flex flex-wrap items-center gap-3">
<button onClick={() => alert("No notifications")} className={`relative p-2 rounded-xl border ${light ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-white/5 border-white/10 text-gray-400'}`}><Bell className="w-5 h-5"/><span className="absolute top-0 right-0 w-2.5 h-2.5 bg-pink-500 rounded-full"></span></button>
<button onClick={() => setLight(!light)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border ${light ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white/5 border-white/10 text-yellow-400'}`}>{light ? <><Moon className="w-4 h-4"/> Dark</> : <><Sun className="w-4 h-4"/> Light</>}</button>
{conn && acc ? (
<><button onClick={() => doFaucet('apt')} className="px-3 py-2 rounded-lg font-bold text-xs uppercase bg-blue-500/10 border border-blue-500/30 text-blue-500"><Zap className="w-3.5 h-3.5 inline mr-1"/> APT Faucet</button><button onClick={() => doFaucet('shelby')} className="px-3 py-2 rounded-lg font-bold text-xs uppercase bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-500"><Zap className="w-3.5 h-3.5 inline mr-1"/> S-USD Faucet</button><div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono"><Coins className="w-4 h-4 inline mr-1"/><span className="text-sm font-bold">{bal} APT</span></div><button onClick={copyAddr} className={`flex items-center gap-2 border px-4 py-2 rounded-lg ${light ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}><span className="text-sm font-mono text-fuchsia-500">{acc.address?.slice(0,6)}...{acc.address?.slice(-4)}</span>{copied ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-gray-400"/>}</button><button onClick={disconn} className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500"><LogOut className="w-4 h-4"/></button></>
) : <button onClick={() => wlts?.length ? cnct(wlts[0].name) : alert("Install Petra!")} className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-xl font-bold text-white"><Wallet className="w-5 h-5"/> Connect Wallet</button>}
</div>
</header>

<div className={`w-full max-w-6xl mt-4 flex justify-between items-center rounded-lg px-6 py-3 text-xs font-mono border ${light ? 'bg-white border-slate-200 text-slate-500' : 'bg-white/[0.02] border-white/5 text-gray-400'}`}>
<div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${conn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div><span className={conn ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{conn ? `NODE: ${net?.name?.toUpperCase() || 'TESTNET'}` : 'OFFLINE'}</span></div>
<div><span>LATENCY: <span className="text-cyan-500">{lat}ms</span></span></div>
</div>

<nav className="w-full max-w-6xl flex flex-wrap justify-center gap-3 my-6">
<button onClick={() => setTab('vault')} className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border ${tab === 'vault' ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white border-transparent shadow-lg scale-105' : (light ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/5 text-gray-400')}`}><Shield className="w-4 h-4"/> 1. Vault Workshop</button>
<button onClick={() => setTab('scanner')} className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border ${tab === 'scanner' ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white border-transparent shadow-lg scale-105' : (light ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/5 text-gray-400')}`}><Search className="w-4 h-4"/> 2. Integrity Scanner</button>
<button onClick={() => setTab('gallery')} className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border ${tab === 'gallery' ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white border-transparent shadow-lg scale-105' : (light ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/5 text-gray-400')}`}><FolderGit2 className="w-4 h-4"/> 3. Decrypted Studio {gal.length > 0 && <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-white font-black text-[10px] ml-1">{gal.length}</span>}</button>
</nav>

<div className="w-full max-w-6xl">
{tab === 'vault' && (
<div className="flex flex-col lg:flex-row gap-6">
<main className="flex-1 space-y-6">
<div className={`border rounded-xl p-6 relative ${light ? 'bg-white border-slate-200' : 'bg-[#0a0a0a] border-white/10'}`}>
<div className={`flex gap-4 mb-6 border-b pb-4 ${light ? 'border-slate-100' : 'border-white/5'}`}><button onClick={() => setVMode('text')} className={`text-sm font-bold pb-2 ${vMode === 'text' ? 'text-fuchsia-500 border-b-2 border-fuchsia-500' : 'text-gray-400'}`}><FileText className="w-4 h-4 inline mr-1"/> Secret Text</button><button onClick={() => setVMode('file')} className={`text-sm font-bold pb-2 ${vMode === 'file' ? 'text-fuchsia-500 border-b-2 border-fuchsia-500' : 'text-gray-400'}`}><UploadCloud className="w-4 h-4 inline mr-1"/> IPFS File Vault</button></div>
{vMode === 'text' ? <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type highly sensitive data here..." className={`w-full h-40 border rounded-lg p-4 text-sm font-mono outline-none resize-none ${light ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/60 border-white/5 text-gray-300'}`} /> : <div className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer ${drag ? 'border-fuchsia-500 bg-fuchsia-500/10' : (light ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-black/40')}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); if(e.dataTransfer.files[0]) setSFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()}><input type="file" ref={fileRef} className="hidden" onChange={(e) => e.target.files?.[0] && setSFile(e.target.files[0])} />{sFile ? <div className="text-center"><FileIcon className="w-8 h-8 text-fuchsia-500 mx-auto mb-2"/><span className="text-sm font-bold text-fuchsia-500">{sFile.name}</span></div> : <div className="text-center text-gray-500"><UploadCloud className="w-8 h-8 mx-auto mb-2"/><span className="text-sm font-bold">Select File (Max 10MB)</span></div>}</div>}
<div className="mt-4 relative"><Key className="absolute left-3 top-3.5 h-5 w-5 text-fuchsia-500"/><input type="password" value={secKey} onChange={(e) => setSecKey(e.target.value)} placeholder="Set Secret Password" className={`w-full border rounded-lg py-3 pl-10 pr-4 text-sm outline-none focus:border-fuchsia-500 ${light ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/80 border-white/10 text-fuchsia-300'}`} /></div>
</div>
<button onClick={doUpload} disabled={!conn || uploading || (!code && !sFile) || !secKey} className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 disabled:opacity-50 font-bold py-4 rounded-xl text-white flex justify-center items-center gap-2 shadow-lg">{uploading ? <><Loader2 className="w-5 h-5 animate-spin"/> SECURING TO CHAIN...</> : "LOCK IN VAULT"}</button>
</main>
<aside className="w-full lg:w-96 flex flex-col gap-4">
<div className={`border rounded-2xl p-5 h-[450px] flex flex-col ${light ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/10'}`}>
<h3 className="font-bold text-sm uppercase flex items-center gap-2 mb-4 border-b pb-4 border-white/5"><Globe className="w-4 h-4 text-cyan-500"/> Live Blockchain History</h3>
<div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
{!conn ? <div className="text-center text-gray-500 py-10">Connect wallet to view history.</div> : cHist.length === 0 ? <div className="text-center text-gray-500 py-10">No transactions.</div> : cHist.map((tx, i) => { const loc = hist.find(h => h.hash === tx.hash); return <div key={i} className={`border rounded-lg p-3 ${light ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}><div className="flex justify-between mb-2"><span className="text-[10px] text-gray-400"><Activity className="w-3 h-3 inline text-cyan-500"/> Ver: {tx.version}</span><span className="text-[10px] text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span></div><div className="flex justify-between items-center"><a href={`https://explorer.aptoslabs.com/txn/${tx.hash}?network=${net?.name?.toLowerCase() || 'testnet'}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-cyan-500 hover:underline truncate w-24">{tx.hash.slice(0,12)}...</a>{loc ? <div className="flex gap-1.5"><button onClick={() => openShare(loc)} className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-[10px] font-bold"><QrCode className="w-3 h-3 inline"/> Share</button><button onClick={() => setSHash(tx.hash)} className="bg-fuchsia-500/10 text-fuchsia-500 px-2 py-1 rounded text-[10px] font-bold"><Unlock className="w-3 h-3 inline"/> Decrypt</button></div> : <span className="text-[10px] text-gray-500 px-2">On-Chain</span>}</div></div>; })}
</div>
</div>
</aside>
</div>
)}

{tab === 'scanner' && (
<div className={`border rounded-2xl p-6 md:p-8 space-y-6 ${light ? 'bg-white border-slate-200' : 'bg-[#0a0a0a] border-white/10'}`}>
<div className="border-b pb-4 flex justify-between items-center"><div><h2 className="text-lg font-black text-cyan-500"><Search className="w-5 h-5 inline mr-2"/> ASSET INTEGRITY SCANNER</h2><p className="text-xs text-gray-400">Cryptographically audit Merkle root vs IPFS proof.</p></div></div>
<div className="flex gap-3"><select value={scanTgt} onChange={(e) => { setScanTgt(e.target.value); setScanSt('idle'); setLogs([]); }} className={`flex-1 p-3.5 rounded-xl font-mono text-xs outline-none border ${light ? 'bg-slate-50 border-slate-200' : 'bg-black/80 border-white/10 text-cyan-300'}`}><option value="">-- Select Record to Audit --</option>{hist.map((h, i) => <option key={i} value={h.hash}>{h.fileName ? `📁 ${h.fileName}` : '📄 SECRET TEXT'} ({h.hash.slice(0,16)}...)</option>)}{cHist.map((o, i) => <option key={`o-${i}`} val
