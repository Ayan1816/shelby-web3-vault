# 🛡️ Shelby Vault v2.0 — Decentralized AI Data Hub (Beta)

> ⚠️ **Disclaimer (Beta / Experimental Version):** 
> Shelby Vault is currently in active development. Based on recent security reviews, our cryptography and on-chain storage implementations are undergoing major upgrades to transition to industry-standard AES-256-GCM and proper Move module-based on-chain storage. 
> 
> **Please do not store real secrets, API keys, or sensitive model weights in this current version until the upcoming security patch is fully released.**

> **An Object Storage interface and AI Prompt Validator, explicitly purpose-built for the Shelby Ecosystem.**

## 🌟 What is Shelby Vault? (App Overview)
Shelby Vault is a decentralized data vault concept built for Web3 and AI developers. It allows developers to validate, format, and locally encrypt AI payloads (like Model Weights, System Prompts, and API Keys) before interacting with the Aptos blockchain.

---

## ✨ Current Features & How They Work

* 🧠 **Real-Time AI Prompt Validator:**
  * **How it works:** Features a live JSON grammar checker. When developers input AI prompts or payload data, it automatically validates the structure. Valid JSON shows a green signal, preventing formatting errors before processing.

* 🔐 **Client-Side Encryption (Experimental / Upgrade in Progress):**
  * **How it works:** All text and files are currently encrypted locally inside the user's browser using a basic cipher (stored via `localStorage`). 
  * *Note: We are actively upgrading this to true AES-256-GCM via the Web Crypto API for complete zero-knowledge security.*

* 🗄️ **IPFS File & Object Vault:**
  * **How it works:** Allows users to securely upload files to decentralized storage alongside encrypted text payloads.

* 🔄 **Target Storage Routing Engine:**
  * **How it works:** A smart UI routing mechanism currently connected to IPFS, with a pre-configured pipeline architecture ready to instantly switch to **Shelby Native S3** storage.

* 🔔 **On-Chain Activity Log (Placeholder System):**
  * **How it works:** Real-time event tracking that monitors wallet connections and records a placeholder transaction (0 APT) on the Aptos blockchain to log the activity. 

---

## 🚀 Future Roadmap & Vision

* 🔒 **Security & Storage Patch (Current Priority):**
  * **Future Plan:** Replacing the current cipher with true AES-256-GCM encryption (PBKDF2 for key derivation) and implementing a custom Move module for authentic on-chain storage, phasing out the current local storage system.

* 🔴 **Shelby Native S3 Migration:**
  * **Future Plan:** Fully migrating the backend storage engine from IPFS to **Shelby's Native S3 RPCs** as soon as public endpoints drop, ensuring 10x faster retrieval and native ecosystem alignment.

* ⏳ **AI Prompt Versioning & History:**
  * **Future Plan:** Allowing AI developers to store and restore historical versions of their system prompts and model configurations directly from immutable on-chain logs.

* 🤝 **Encrypted Prompt Marketplace:**
  * **Future Plan:** Enabling users to securely share or monetize their high-value AI prompts and datasets with other developers using smart contract-based token gating.
  * 
