---
title: Test Guide
description: Step-by-step instructions for Prover and Verifier (for test participants)
---

:::tip[For Test Participants]
This guide walks you through **"making a certificate verifiable" → "verifying it"** with hands-on operation.
Please have the **test PDF** you received by email ready.
:::

---

## Overview in 1 Minute

### What You'll Do

1. Use **Prover** to attach "proof" to the test PDF and create **`-secured.pdf`**
2. Use **Verifier** to upload that `-secured.pdf` and check the **✅/❌** verification results

### What the Results Mean

| Result | Meaning |
|--------|---------|
| All 5 ✅ | "Not tampered" and "linked to legitimate issuer" — can be explained to third parties |
| Any ❌ | Possible tampering, or possible procedural error/system issue |

---

## What This Test Verifies

### 1. Does It Work Correctly? (Functionality)

- Prover can generate a "secured PDF (-secured.pdf)"
- Verifier displays expected results (✅/❌)

### 2. Is It Practically Usable? (Usability & Trust)

- Are the steps intuitive? Any confusion?
- Can you infer the cause when errors occur?
- Can you understand "why this proves authenticity" from the UI?

---

## Background: Why This System Is Needed

With the increase in remote work and online applications, electronic certificates like PDFs have become convenient, but **tampering and forgery** risks have also increased.

This system embeds a **cryptographic "seal of authenticity"** into certificates, allowing recipients to confirm "this is definitely genuine."

---

## System Overview

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

### Real-World Usage vs This Test

| Step | Real-World Usage | In This Test |
|:----:|------------------|--------------|
| ① Code Issuance | University issues code | **Skipped** (pre-configured in test PDF) |
| ② Proof Generation | Student creates with Prover | **Performed** |
| ③ Sending | Send to company via email | **Skipped** (proceed directly) |
| ④ Verification | Company verifies with Verifier | **Performed** |

:::note[Test Scope]
You will perform **② Proof Generation** and **④ Verification**.
Estimated time: **10-15 minutes** (first-time proof generation may take longer)
:::

---

## Test Flow (3 Steps)

| Step | Action | Result | What to Check |
|:----:|--------|--------|---------------|
| **1** | Attach proof with Prover | `-secured.pdf` generated | Filename includes `-secured` |
| **2** | Save the file | Saved to PC | Check Downloads folder |
| **3** | Verify with Verifier | All 5 items ✅ | 5 green checkmarks appear |

---

## Steps 1-2: Attach Proof with Prover

:::note[Scenario]
You are a graduate student submitting a certificate of expected graduation to a company.
You want the recipient to be able to verify "not tampered" and "truly issued by the university."
:::

<div class="app-launch-card prover">
  <div class="app-launch-icon">📄</div>
  <div class="app-launch-content">
    <h4>Prover Application</h4>
    <p>Attach ZK proof to your certificate</p>
  </div>
  <a href="/Tri-CertFramework/prover/" target="_blank" class="app-launch-button">Open Prover →</a>
</div>

### Instructions

#### 1. Upload PDF

Drag and drop the test PDF (or click to select).

#### 2. Identity Verification (Orange Section)

Enter the following 3 items and click the "Verify" button.

| Input Field | What to Enter | Notes |
|-------------|---------------|-------|
| **Activation Code** | Code from your email | e.g., `ABCDEF1234567890` |
| **Full Name** | Your name | e.g., `Taro Yamada` |
| **Date of Birth** | Your birth date | Select from calendar |

:::caution[Enter Correctly]
If the input doesn't match the registered information, an error will occur.
Please enter the information exactly as shown in your email.
:::

When verification succeeds, "✓ Verified" appears in green.

#### 3. Authenticator Setup (Green Section)

Click the "Setup Authenticator" button.

- Your browser will prompt for **passkey (biometric or PIN)** setup
- Authenticate using fingerprint, face recognition, or PIN depending on your device
- When complete, "✓ Authenticator ready" appears

:::tip[What is a Passkey?]
A passkey is a way to verify your identity using fingerprint or face recognition instead of a password.
It's used to prove that this certificate was created by you.

**Where it's saved**: Automatically saved to your device's "Passwords" app or Keychain.
You can delete it after testing (see instructions at the end).
:::

#### 4. Secret String and Graduation Year (Blue Section)

| Input Field | What to Enter | Notes |
|-------------|---------------|-------|
| **Secret String** | Any characters or numbers | Anything is OK. You don't need to remember it |
| **Graduation Year** | Your graduation year | Select with buttons |

:::note[What is the Secret String?]
This string is **not sent anywhere**. It's only used locally to create the cryptographic proof.
Enter any string you like (e.g., `test123`).
:::

#### 5. Generate Proof

Click the "Generate Proof and Protect" button.

- Processing takes **several seconds to tens of seconds** (especially long on first run)
- You can track progress via the step indicator at the top (📄→🔍→🔐→✍️→✅)

#### 6. Download

When processing completes, a download button appears.
Click it to save the **`-secured.pdf`**.

### Confirming Success

- Filename is **`(original filename)-secured.pdf`**
- You know where it's saved (Downloads folder, etc.)

---

## Step 3: Verify with Verifier

:::note[Scenario]
You are an HR personnel at a company. You received a certificate PDF from an applicant.
You want to verify "Is this genuine? Has it been tampered with?"
:::

<div class="app-launch-card verifier">
  <div class="app-launch-icon">✅</div>
  <div class="app-launch-content">
    <h4>Verifier Application</h4>
    <p>Verify the authenticity of certificates</p>
  </div>
  <a href="/Tri-CertFramework/verifier-ui/" target="_blank" class="app-launch-button">Open Verifier →</a>
</div>

### Instructions

1. **Upload the secured PDF** — Drag and drop the `-secured.pdf` you just saved
2. **Click "🔍 Verify"**

### Understanding the Results

| Result | Meaning |
|--------|---------|
| All 5 items ✅ | **Confirmed authentic** — Not tampered, linked to legitimate issuer |
| Any item ❌ | **Needs review** — Possible forgery, procedural error, or system issue |

:::caution[If ❌ Appears]
This doesn't definitively mean "forged." It could be a procedural error or wrong file.
**Which item shows ❌** is crucial for identifying the cause, so please include this in your feedback.
:::

---

## The 5 Verification Items

| Item | What ✅ Means |
|------|--------------|
| Data Extraction | Verification data correctly read from PDF |
| Hash Match | Not a single character changed since issuance (tamper detection) |
| ZK Proof Verification | Cryptographically valid proof (forgery resistance) |
| Signature Verification | Confirmed created through legitimate process |
| Registration Check | Confirmed linked to legitimate issuing organization |

---

## Success Criteria

:::tip[Test Success]
Success is when **all 5 items show green ✅** in Verifier.
:::

---

## (Optional) Error Behavior Testing

If you have time, please try the following "intentional mistake" tests.
This helps verify that **the system correctly detects invalid input**.

| What to Try | Expected Result |
|-------------|-----------------|
| Enter **wrong name** in identity verification | Error occurs, cannot proceed |
| Enter **wrong birth date** in identity verification | Error occurs, cannot proceed |
| Verify **original test PDF** (without -secured) in Verifier | ❌ is displayed |

:::note[Why This Test Matters]
It's crucial for security that "only correct input passes."
It would be a problem if proofs could be created with wrong information, or if unprocessed PDFs were judged as "authentic."
:::

---

## Common Issues

### Prover Side

| Symptom | Cause & Solution |
|---------|------------------|
| **Identity verification fails** | Activation code, name, or birth date doesn't match registered info. Please recheck your email |
| **Passkey setup screen doesn't appear** | Browser may not support WebAuthn. Please use the latest Chrome / Safari / Edge |
| **Proof generation takes long** | First time may take 30 seconds to 1 minute. Subsequent runs are faster |

### Verifier Side

| Symptom | Cause & Solution |
|---------|------------------|
| **Verification shows error** | **Original test PDF cannot be verified.** Use the `-secured.pdf` generated by Prover |
| **"Registration Check" shows ❌** | Identity verification info may have been incorrect. Please redo from Prover |

### General

| Symptom | Cause & Solution |
|---------|------------------|
| **Hard to use on smartphone** | File saving/re-uploading is complex. **PC recommended** |

---

## After the Test

:::tip[About Passkey Deletion]
Passkeys created during the test may be saved in the "Passwords" app.
Since these are for testing, you may delete them at your discretion.
:::

---

## Feedback (Please Do!)

If problems occur, please contact us with the information below.
**Even if no problems occur**, we'd appreciate hearing about any confusion, unclear points, or improvement ideas.

### Report Template

```
- Device: Mac / Windows
- Browser: Chrome / Safari / Edge
- Which screen: Prover / Verifier
- Which action: (e.g.) Right after clicking "Generate Proof" after PDF upload
- Message displayed: (paste as-is, screenshots welcome)
- Expected behavior: (e.g.) -secured.pdf should be generated
```

Thank you for your cooperation.
