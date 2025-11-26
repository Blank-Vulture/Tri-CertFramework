# Ledger Hardware Wallet Integration

Executive Console supports signing VKNFT bundles with Ledger hardware wallets for maximum security.

## 🔐 Features

- **Hardware Signing**: Sign VK bundles using Ledger Nano S/X/S Plus
- **Development Mode**: Automatic fallback to software signing in development
- **Production Ready**: No private keys in code - all signing done on-device
- **Secure**: Private keys never leave the hardware wallet

---

## 📋 Prerequisites

### Hardware
- Ledger Nano S, Nano X, or Nano S Plus
- USB cable

### Software
- Ledger Live installed and updated
- Ethereum App installed on Ledger (version 1.10.0 or higher)

---

## 🚀 Quick Start

### ✅ Pre-flight Checklist (Important!)

Before using Ledger with Executive Console, ensure:

1. ✅ **Ledger device connected** via USB
2. ✅ **Device unlocked** with PIN code
3. ✅ **Ethereum app installed** on Ledger (via Ledger Live)
4. ✅ **Ethereum app is OPEN** on the device
5. ✅ **Screen shows "Application is ready"**

❌ **Common mistake**: Forgetting to open the Ethereum app → causes error `6d02`

### Development Mode (Auto-selected)

```bash
npm run dev:desktop
```

- Uses software signing with demo keys
- ⚠️ **Warning**: Demo keys are for development only!

### Production Mode (With Ledger)

```bash
# Set environment variable
VITE_SIGNING_MODE=ledger npm run build:desktop

# Or use the production build
npm run build:desktop
```

- Automatically uses Ledger hardware wallet
- Prompts you to connect Ledger when signing

---

## 📖 Usage

### 1. Connect Your Ledger

1. Connect Ledger device via USB
2. Enter PIN on the device
3. Open the **Ethereum App** on Ledger
4. Ensure it shows "Application is ready"

### 2. Generate VK with Signature

1. Go to **VK Generation** screen
2. Select a year
3. Click **Generate VK**
4. When prompted, **approve the signature** on your Ledger device
5. The VK bundle will be created with hardware signature

### 3. Sign Existing VK

1. Go to **VK Management** screen
2. Find the VK you want to sign
3. Click the **🔐 Sign** button
4. Approve the request on your Ledger
5. Signature is added to the bundle

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Force Ledger mode (optional - auto-detected in production)
VITE_SIGNING_MODE=ledger

# Or force software mode (development only)
VITE_SIGNING_MODE=software
```

### Custom Derivation Path

Edit `src/config/signing.ts`:

```typescript
const PRODUCTION_CONFIG: LedgerHardwareSigningConfig = {
  mode: 'ledger-hardware',
  label: 'Ledger Hardware Wallet',
  derivation_path: "44'/60'/0'/0/1", // ← Change here
}
```

---

## 🛠️ Troubleshooting

### "Ledger device not found"

**Causes**:
- Ledger not connected
- Ledger locked
- USB cable issue

**Solutions**:
1. Connect Ledger via USB
2. Unlock with PIN
3. Try a different USB port/cable
4. Check USB permissions (macOS: System Settings → Security & Privacy)

### "Ethereum App not running on Ledger" or "APDU command failed: status=6d02"

**Error Details**: Status code `6d02` means "INS (Instruction) not supported", which indicates the Ethereum app is not running on your Ledger device.

**Solution**:
1. **Connect and unlock your Ledger device**
   - Connect via USB
   - Enter PIN to unlock

2. **Open the Ethereum app on your Ledger**
   - Navigate to "Ethereum" using the device buttons
   - Press both buttons to open the app
   - **Verify the screen shows "Application is ready"**

3. **Try the operation again**
   - Go back to Executive Console
   - Retry the signature operation
   - Or run "Settings → Ledger Diagnostics → 3. Sign Test"

**Important**: If you have Bitcoin, Polkadot, or any other app open, close it and open the Ethereum app instead.

**If the error persists**:
1. Open Ledger Live
2. Go to My Ledger → Ethereum
3. Update Ethereum App to the latest version (recommended: v1.10.0 or higher)
4. Restart Executive Console

### "Invalid response from Ledger"

**Error Details**: Communication with Ledger device failed during data transfer.

**Solution**:
1. **Check USB Connection**
   - Use a high-quality USB cable (data transfer capable, not charge-only)
   - Try a different USB port (USB 2.0 often more stable than USB 3.0)
   - Connect directly to PC (avoid USB hubs)

2. **Reconnect Ledger**
   - Disconnect device
   - Wait 10 seconds
   - Reconnect and unlock with PIN
   - Open Ethereum app

3. **Close Competing Applications**
   - Exit Ledger Live
   - Close other wallet apps (MetaMask, etc.)
   - Only run Executive Console

4. **Check Debug Logs**
   - In the terminal where Executive Console is running, look for `[Ledger]` logs
   - Check for:
     ```
     [Ledger] Found Ledger device: ...
     [Ledger] Sending APDU command: ...
     [Ledger] Received response: XX bytes
     ```
   - Share these logs if reporting an issue

5. **Automatic Retry**
   - The system automatically retries up to 3 times on communication errors
   - If all retries fail, try the above solutions

### "User denied the request on Ledger"

**Solution**:
- Approve the signature request on Ledger device
- Press both buttons to confirm

### HID Access Error (macOS)

If you see permission errors:

```bash
# Grant HID access to Terminal
# System Settings → Security & Privacy → Input Monitoring
# Add Terminal.app or your IDE
```

---

## 🔍 Technical Details

### Signature Algorithm

- **Algorithm**: ECDSA with P-256 curve
- **Hash**: SHA-256
- **Format**: Raw signature (R, S, V)

### BIP44 Derivation Path

Default: `m/44'/60'/0'/0/0` (Ethereum standard)

```
m / purpose' / coin_type' / account' / change / address_index
    44'         60'(ETH)      0'         0        0
```

### Signature Verification

Public key is exported from Ledger and stored in JWK format:

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "...",
  "y": "...",
  "key_ops": ["verify"]
}
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend (TS)  │
│  ledger-signer  │
└────────┬────────┘
         │
         │ invoke()
         ▼
┌─────────────────┐
│   Tauri (Rust)  │
│   ledger.rs     │
└────────┬────────┘
         │
         │ HID API
         ▼
┌─────────────────┐
│  Ledger Device  │
│  Ethereum App   │
└─────────────────┘
```

### Components

- **Frontend**: `src/utils/ledger-hardware.ts` - Ledger communication wrapper
- **Backend**: `src-tauri/src/ledger.rs` - Native HID communication
- **Config**: `src/config/signing.ts` - Mode selection

---

## 🔒 Security Best Practices

### ✅ DO

- ✅ Use Ledger hardware wallet in production
- ✅ Verify signatures using the stored public key
- ✅ Keep Ledger firmware updated
- ✅ Store backup recovery phrase offline

### ❌ DON'T

- ❌ Share your Ledger PIN
- ❌ Use software signing in production
- ❌ Commit private keys to Git
- ❌ Approve unknown signatures on Ledger

---

## 📊 Comparison: Software vs Hardware Signing

| Feature | Software | Hardware (Ledger) |
|---------|----------|-------------------|
| **Security** | ⚠️ Keys in RAM | ✅ Keys on-device |
| **Setup** | ✅ Easy | ⚠️ Requires hardware |
| **Cost** | ✅ Free | ⚠️ Device cost (~$80) |
| **Speed** | ✅ Instant | ⚠️ User confirmation |
| **Production** | ❌ Not recommended | ✅ **Recommended** |

---

## 🔄 Migration Guide

### From Software to Ledger

1. Install Ledger device
2. Set `VITE_SIGNING_MODE=ledger`
3. Rebuild: `npm run build:desktop`
4. Re-sign existing VKs using **🔐 Sign** button

---

## 📚 References

- [Ledger Developer Docs](https://developers.ledger.com/)
- [Ethereum App APDU Spec](https://github.com/LedgerHQ/app-ethereum/blob/master/doc/ethapp.asc)
- [BIP44 Specification](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

---

## 💡 FAQ

**Q: Can I use multiple Ledger devices?**
A: Yes, but each device will have a different public key. Store the public key with each signature.

**Q: What happens if I lose my Ledger?**
A: Use your recovery phrase to restore on a new device. The same derivation path will produce the same keys.

**Q: Can I verify signatures offline?**
A: Yes, the manifest.json contains the public key in JWK format. Use any ECDSA P-256 verification tool.

**Q: Is this compatible with Trezor?**
A: Not currently, but the architecture supports adding other hardware wallets.

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Enable debug logs: `localStorage.setItem('debug', 'ledger:*')`
3. Check browser/app console for detailed errors
4. Report issues with logs and Ledger firmware version

---

**🔐 Stay secure. Use hardware signing in production!**

