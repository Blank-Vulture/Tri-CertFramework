---
title: Test Guide
description: Step-by-step instructions for Prover and Verifier (for test participants)
---

:::tip[For Test Participants]
This guide walks you through **"making a certificate verifiable" → "verifying it"** with hands-on operation.
Please have the **test PDF** you received by email ready.

**Estimated time: 10-15 minutes**
:::

---

## What You'll Do (2 Steps)

<div class="sl-steps">

1. Use **Prover** to attach "proof" to the test PDF and create **`-secured.pdf`**

2. Use **Verifier** to upload that `-secured.pdf` and check the **✅/❌** verification results

</div>

### Success Criteria

| Result | Meaning |
|--------|---------|
| **All 5 ✅** | "Not tampered" and "linked to legitimate issuer" confirmed |
| **Any ❌** | Possible tampering, or possible procedural error/system issue |

### What This Test Verifies

| Aspect | What We Check |
|:------:|---------------|
| **Functionality** | Can Prover generate `-secured.pdf`? Does Verifier show expected results? |
| **Usability** | Are steps intuitive? Can you infer causes when errors occur? Can you understand why it proves authenticity? |

:::note[Role-Play Setting]
- When using **Prover** → Act as a **graduate student**
- When using **Verifier** → Act as a **company HR personnel**
:::

<details>
<summary><strong>📖 System Background (Optional Reading)</strong></summary>

#### Why This System Is Needed

With the increase in remote work and online applications, electronic certificates like PDFs have become convenient, but **tampering and forgery** risks have also increased.

This system embeds a **cryptographic "seal of authenticity"** into certificates, allowing recipients to confirm "this is definitely genuine."

#### System Overview

<pre class="mermaid">
flowchart TB
    subgraph Issuer["🏛️ Issuing Organization (University)"]
        RC["Registrar Console<br/>Register student info"]
    end

    subgraph Student["👨‍🎓 Student"]
        PDF["Certificate PDF"]
        Code["Activation Code"]
        Prover["Prover<br/>Attach proof"]
        SecuredPDF["Secured PDF<br/>(-secured.pdf)"]
    end

    subgraph Company["👔 Company"]
        HR["HR Personnel"]
        Verifier["Verifier<br/>Verify authenticity"]
        Result["✅ Authentic or ❌ Needs Review"]
    end

    RC -->|"① Code Issued"| Code
    PDF --> Prover
    Code --> Prover
    Prover -->|"② Generate Proof"| SecuredPDF
    SecuredPDF -.->|"③ Send via Email"| HR
    HR -->|"④ Verify"| Verifier
    Verifier --> Result
    RC -.->|"Check issuer"| Verifier
</pre>

#### Real-World Usage vs This Test

| Step | Real-World Usage | In This Test |
|:----:|------------------|--------------|
| ① Code Issuance | University issues code | **Skipped** |
| ② Proof Generation | Student creates with Prover | **Performed** |
| ③ Sending | Send to company via email | **Skipped** |
| ④ Verification | Company verifies with Verifier | **Performed** |

</details>

---

## Step 1: Attach Proof with Prover

<div class="app-launch-card prover">
  <div class="app-launch-icon">📄</div>
  <div class="app-launch-content">
    <h4>Prover Application</h4>
    <p>Attach ZK proof to your certificate</p>
  </div>
  <a href="/Tri-CertFramework/prover/" target="_blank" class="app-launch-button">Open Prover →</a>
</div>

### Required Steps (Follow in Order)

<div class="required-steps">

**1. Upload PDF**
- Drag and drop the test PDF (or click to select)

**2. Identity Verification (Orange Section)**

| Input Field | What to Enter |
|-------------|---------------|
| Activation Code | Code from your email |
| Full Name | Your name |
| Date of Birth | Your birth date |

→ After entering, click "**Verify**" → "✓ Verified" appears if successful

**3. Authenticator Setup (Green Section)**
- Click "**Setup Authenticator**"
- Follow browser prompts to authenticate with fingerprint, face recognition, or PIN
- "✓ Authenticator ready" appears if successful

**4. Secret String and Graduation Year (Blue Section)**

| Input Field | What to Enter |
|-------------|---------------|
| Secret String | Any characters or numbers (anything is OK) |
| Graduation Year | Select with buttons |

**5. Generate Proof**
- Click "**Generate Proof and Protect**"
- Processing takes several seconds to tens of seconds (especially long on first run)

**6. Download**
- After processing completes, click "**Download**"
- Save the **`-secured.pdf`**

</div>

:::tip[Confirming Success]
Filename should be **`(original filename)-secured.pdf`**
:::

<details>
<summary><strong>💡 Detailed Explanations</strong></summary>

#### What is a Passkey?
A passkey verifies your identity using fingerprint or face recognition instead of a password.
It's used to prove that this certificate was created by you.

**Where it's saved**: Automatically saved to your device's "Passwords" app or Keychain.
You can delete it after testing.

#### What is the Secret String?
This string is **not sent anywhere**. It's only used locally to create the cryptographic proof.
Enter any string you like (e.g., `test123`).

#### If Identity Verification Fails
The activation code, name, or birth date doesn't match the registered information.
Please recheck your email.

</details>

---

## Step 2: Verify with Verifier

<div class="app-launch-card verifier">
  <div class="app-launch-icon">✅</div>
  <div class="app-launch-content">
    <h4>Verifier Application</h4>
    <p>Verify the authenticity of certificates</p>
  </div>
  <a href="/Tri-CertFramework/verifier-ui/" target="_blank" class="app-launch-button">Open Verifier →</a>
</div>

### Required Steps

<div class="required-steps">

**1. Upload the secured PDF**
- Drag and drop the **`-secured.pdf`** you just saved

**2. Run verification**
- Click "**🔍 Verify**"

</div>

### Understanding the Results

| Result | Meaning |
|--------|---------|
| **All 5 items ✅** | **Success** — Not tampered, linked to legitimate issuer |
| **Any item ❌** | **Needs review** — Possible forgery, procedural error, or system issue |

:::tip[Test Success]
**All 5 items showing green ✅** means success.
:::

:::caution[If ❌ Appears]
This doesn't definitively mean "forged." It could be a procedural error or wrong file.
Please include **which item shows ❌** in your feedback.
:::

<details>
<summary><strong>💡 The 5 Verification Items Explained</strong></summary>

| Item | What ✅ Means |
|------|--------------|
| **Data Extraction** | Verification data correctly read from PDF |
| **Hash Match** | Not a single character changed since issuance (tamper detection) |
| **ZK Proof Verification** | Cryptographically valid proof (forgery resistance) |
| **Signature Verification** | Confirmed created through legitimate process |
| **Registration Check** | Confirmed linked to legitimate issuing organization |

</details>

---

<details>
<summary><strong>🔧 Common Issues</strong></summary>

### Prover Side

| Symptom | Cause & Solution |
|---------|------------------|
| **Identity verification fails** | Code, name, or birth date doesn't match. Recheck your email |
| **Passkey setup screen doesn't appear** | Use the latest Chrome / Safari / Edge |
| **Proof generation takes long** | First time may take 30 sec to 1 min. Faster afterward |

### Verifier Side

| Symptom | Cause & Solution |
|---------|------------------|
| **Verification shows error** | **Original test PDF cannot be verified.** Use `-secured.pdf` |
| **"Registration Check" shows ❌** | Redo identity verification in Prover |

### General

| Symptom | Cause & Solution |
|---------|------------------|
| **Hard to use on smartphone** | **PC recommended** |

</details>

---

## Feedback

After completing the test, please copy and paste the form below for your report.
**Even if no problems occur**, we'd appreciate hearing about any confusion or improvement ideas.

```
■ Rating (5 = Very Good, 1 = Very Poor)
1. Prover understandability: [  ] / 5
2. Prover ease of use: [  ] / 5
3. Verifier understandability: [  ] / 5
4. Verifier ease of use: [  ] / 5

■ Confusion Points / Improvement Ideas (Free Text)


■ If Problems Occurred (Optional)
- Device: Mac / Windows
- Browser: Chrome / Safari / Edge
- Which screen: Prover / Verifier
- Which action:
- Message displayed: (screenshots welcome)
```

Thank you for your cooperation.
