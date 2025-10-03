# Executive Console

**Secure VK (Verification Key) management tool for Tri-CertFramework**

Executive Console is a desktop application for generating, managing, and signing verification keys for zero-knowledge proof circuits. It supports **Ledger hardware wallets** for production-grade security.

---

## ✨ Features

### 🔐 Hardware Wallet Signing
- Sign VK bundles with **Ledger Nano S/X/S Plus**
- Private keys never leave the hardware device
- ECDSA P-256 signatures with SHA-256

### 📦 VK Generation
- Generate year-specific verification keys
- Create circuit artifacts (WASM, ZKey)
- Calculate cryptographic hashes (SHA3-256)

### 📂 VKNFT Bundles
- Package VKs with metadata and signatures
- JSON manifest with file integrity checks
- ZIP archives for distribution

### 🎨 Modern UI
- Built with React 19 + TailwindCSS
- Dark mode support
- Responsive design

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.77+ (for Tauri)
- **Ledger device** (optional, for hardware signing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tri-CertFramework.git
cd tri-CertFramework/executive-console

# Install dependencies
npm install

# Run in development mode (software signing)
npm run dev:desktop

# Build for production (Ledger signing)
npm run build:desktop
```

---

## 📖 Usage

### Development Mode

```bash
npm run dev:desktop
```

- Uses **software signing** with demo keys
- ⚠️ Demo keys are for development only!

### Production Mode

```bash
# Build with Ledger hardware wallet support
npm run build:desktop
```

- Automatically uses **Ledger hardware wallet**
- Prompts for device connection when signing

### Manual Mode Selection

```bash
# Force Ledger mode
VITE_SIGNING_MODE=ledger npm run dev:desktop

# Force software mode (dev only)
VITE_SIGNING_MODE=software npm run dev:desktop
```

---

## 🔐 Ledger Integration

See [`README_LEDGER.md`](./README_LEDGER.md) for detailed instructions on:
- Setting up your Ledger device
- Troubleshooting connection issues
- Technical details of the signing process

Quick setup:
1. Connect Ledger via USB
2. Enter PIN and open Ethereum App
3. Generate or sign VKs in the app
4. Approve requests on the Ledger device

---

## 🏗️ Architecture

```
Executive Console (Tauri Desktop App)
├── Frontend (React + TypeScript)
│   ├── VK Generation UI
│   ├── VK Management UI
│   └── Ledger Integration
└── Backend (Rust)
    ├── Ledger HID Communication
    ├── File System Operations
    └── Tauri Commands
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, TailwindCSS |
| **Backend** | Rust, Tauri 2, hidapi |
| **Crypto** | SnarkJS, circomlib, sha2 |
| **Hardware** | Ledger Ethereum App (ECDSA P-256) |

---

## 📁 Project Structure

```
executive-console/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── utils/              # Utility functions
│   │   ├── ledger-hardware.ts  # Ledger integration
│   │   ├── ledger-signer.ts    # Signing logic
│   │   └── vknft-bundle.ts     # Bundle generation
│   └── config/
│       └── signing.ts      # Signing configuration
├── src-tauri/              # Tauri Rust backend
│   └── src/
│       ├── ledger.rs       # Ledger HID communication
│       └── lib.rs          # Tauri commands
├── public/                 # Static assets
│   └── assets/             # Circuit files (WASM, ZKey)
└── scripts/                # Utility scripts
    └── generate-signing-key.js  # Key generation
```

---

## 🔧 Configuration

### Signing Mode

Edit `src/config/signing.ts`:

```typescript
// Auto-detects environment
export const SIGNING_CONFIG = getSigningConfig()

// In production: Uses Ledger hardware wallet
// In development: Uses software signing (demo keys)
```

### Derivation Path

For custom Ledger paths:

```typescript
const PRODUCTION_CONFIG: LedgerHardwareSigningConfig = {
  mode: 'ledger-hardware',
  label: 'Ledger Hardware Wallet',
  derivation_path: "44'/60'/0'/0/1", // ← Customize
}
```

---

## 🔒 Security

### ✅ Production (Recommended)

- **Use Ledger hardware wallet**
- Private keys stored on-device only
- No keys in code or environment
- User confirmation required for each signature

### ⚠️ Development

- Software signing with demo keys
- **Do NOT use in production**
- Keys are visible in source code
- For testing purposes only

See [`SECURITY.md`](./SECURITY.md) for detailed security guidelines.

---

## 📚 Documentation

- **[Ledger Integration Guide](./README_LEDGER.md)** - Hardware wallet setup
- **[Security Guidelines](./SECURITY.md)** - Best practices
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues

---

## 🧪 Testing

```bash
# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build check
npm run build
```

---

## 📦 Distribution

### macOS

```bash
npm run build:desktop
```

Output: `src-tauri/target/release/bundle/dmg/`

### Windows

```bash
npm run build:desktop
```

Output: `src-tauri/target/release/bundle/msi/`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## 📄 License

This project is part of the Tri-CertFramework.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tri-CertFramework/issues)
- **Ledger Help**: See [README_LEDGER.md](./README_LEDGER.md#-troubleshooting)
- **Security**: See [SECURITY.md](./SECURITY.md)

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop framework
- [Ledger](https://www.ledger.com/) - Hardware wallet
- [SnarkJS](https://github.com/iden3/snarkjs) - ZK proof library
- [circom](https://github.com/iden3/circom) - Circuit compiler

---

**🔐 Use Ledger hardware wallet for production. Stay secure!**
