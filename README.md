# 🛡️ Shelby Vault v2.0 — Decentralized AI Data Hub

> **A client-side encrypted Object Storage interface and AI Prompt Validator, explicitly purpose-built for the Shelby Ecosystem.**

## 🌟 What is Shelby Vault? (App Overview)
Shelby Vault is a zero-knowledge decentralized data vault built for Web3 and AI developers. It allows developers to validate, format, AES-256 encrypt, and securely store sensitive AI payloads (like Model Weights, System Prompts, and API Keys) directly on the blockchain without any third-party data leaks.

---

## ✨ Current Features & How They Work

* 🧠 **Real-Time AI Prompt Validator:**
  * **How it works:** Features a live JSON grammar checker. When developers input AI prompts or payload data, it automatically validates the structure. Valid JSON shows a green signal, preventing formatting errors before data is locked on-chain.

* 🔐 **Client-Side AES-256 Encryption (Zero-Knowledge):**
  * **How it works:** All text and files are encrypted locally inside the user's browser using a custom secret password. Only the encrypted hash is sent to the Aptos ledger, ensuring complete privacy even from the app creators.

* 🗄️ **IPFS File & Object Vault:**
  * **How it works:** Allows users to securely upload and lock sensitive files directly to decentralized storage alongside encrypted text payloads.

* 🔄 **Target Storage Routing Engine:**
  * **How it works:** A smart UI routing mechanism currently connected to IPFS, with a pre-configured pipeline architecture ready to instantly switch to **Shelby Native S3** storage.

* 🔔 **Live On-Chain Activity Log:**
  * **How it works:** Real-time event tracking that monitors wallet connections, asset locking transactions, and decryption requests directly from the Aptos blockchain.

---

## 🚀 Future Roadmap & Vision

* 🔴 **Shelby Native S3 Migration:**
  * **Future Plan:** Fully migrating the backend storage engine from IPFS to **Shelby's Native S3 RPCs** as soon as public endpoints drop, ensuring 10x faster retrieval and native ecosystem alignment.

* ⏳ **AI Prompt Versioning & History:**
  * **Future Plan:** Allowing AI developers to store and restore historical versions of their system prompts and model configurations directly from immutable on-chain logs.

* 🤝 **Encrypted Prompt Marketplace:**
  * **Future Plan:** Enabling users to securely share or monetize their high-value AI prompts and datasets with other developers using smart contract-based token gating.
  * 
