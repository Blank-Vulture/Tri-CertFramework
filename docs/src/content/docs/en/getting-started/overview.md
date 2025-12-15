---
title: Overview
description: Understanding Tri-CertFramework architecture and concepts
---

**Tri-CertFramework** is a digital platform that enables safe and easy issuance, management, and verification of certificates such as diplomas, qualifications, and membership cards on smartphones and PCs.

It solves challenges of paper certificates — forgery risks, loss, and verification burden — with cutting-edge cryptographic technology and user-friendly interfaces.

## Who is it for?

| User | Benefits | Application |
|:---|:---|:---|
| **Executives** | Control certificate issuance rules across the organization. Prevent fraud and reduce costs. | 🏛️ **Executive Console** |
| **Registrars** | Reduce front desk workload. Issue official digital certificates with a few clicks. | ✍️ **Registrar Console** |
| **Certificate Holders** | Attach proof files unique to you and the moment to your certificate. | 📱 **Prover** |
| **Verifiers** | Instantly determine if a certificate is genuine. No visual inspection needed. | 🔍 **Verifier UI** |

## How It Works

Tri-CertFramework connects the "trust baton" between four parties: Administrator, Issuer, Holder, and Verifier.

<pre class="mermaid">
flowchart TB
    subgraph admin["🏛️ Executive Console"]
        admin_desc["Access Control & Audit"]
    end

    subgraph registrar["✍️ Registrar Console"]
        registrar_desc["Issue & Revoke Certificates"]
    end

    subgraph prover["📱 Prover App"]
        prover_desc["Receive & Present Certs"]
    end

    subgraph verifier["🔍 Verifier UI"]
        verifier_desc["Authenticity Check"]
    end

    admin -->|"1. Set Rules"| registrar
    registrar -->|"2. Issue"| prover
    prover -->|"3. Present"| verifier

    style admin fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style registrar fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style prover fill:#d1fae5,stroke:#059669,stroke-width:2px
    style verifier fill:#dbeafe,stroke:#2563eb,stroke-width:2px
</pre>

## Core Technologies

### Zero-Knowledge Proofs (ZK-SNARK)

Cryptographic technology that proves "you have a valid certificate" without revealing its contents.

- **Privacy Protection**: Don't disclose more information than necessary
- **Tamper Detection**: Guarantee certificate contents haven't been altered
- **Offline Verification**: Verify without network connection

### WebAuthn Signatures

Signatures using biometric authentication or physical security keys based on FIDO2/WebAuthn standards.

- **Passwordless**: Simple and secure signing with biometrics
- **Phishing Resistant**: Prevent signing on fake sites
- **Device Bound**: Only signable on your own device

## Getting Started

### Prerequisites

- Node.js (v18+)
- Go (v1.20+) - For Registrar Console
- Rust (Latest Stable) - For Executive Console

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tri-cert-framework.git
cd tri-cert-framework

# Example: Start Prover (user app)
cd prover
npm install
npm run dev
```

:::note
No database required. Everything runs file-based.  
Executive Console requires a Ledger device.
:::
