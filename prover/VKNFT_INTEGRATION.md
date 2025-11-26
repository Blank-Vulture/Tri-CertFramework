# VKNFT Integration Guide

Scholar Prover now automatically loads circuit files and verification keys directly from the VKNFT directory, eliminating the need for manual file deployment.

## Architecture

```
Tri-CertFramework/
├── executive-console/    # Generates VKs and stores in VKNFT
├── VKNFT/                # Centralized storage for all VKs
│   ├── 2025/
│   │   ├── manifest.json
│   │   └── files/
│   │       ├── commitment_2025.wasm
│   │       ├── commitment_final_2025.zkey
│   │       └── vkey_2025.json
│   └── 2026/
│       └── ...
└── prover/               # Automatically reads from VKNFT
    └── src/app/api/vknft/  # API routes for VKNFT access
```

## How It Works

### 1. Year Detection

Prover automatically detects available years by scanning the VKNFT directory:

- **API Endpoint**: `GET /api/vknft/years`
- **Returns**: List of years with valid manifest.json files
- **Frontend**: ProofGenerator component fetches this on mount

### 2. File Loading

When generating a proof, Prover loads circuit files directly from VKNFT:

- **WASM File**: `/api/vknft/[year]/files/commitment_[year].wasm`
- **ZKey File**: `/api/vknft/[year]/files/commitment_final_[year].zkey`
- **VKey File**: `/api/vknft/[year]/files/vkey_[year].json`

### 3. Fallback Mechanism

If VKNFT is not available, Prover falls back to public assets in `prover/public/`:

1. Try VKNFT API first
2. If fails, use `public/commitment_js/` and `public/` files
3. Log warnings for debugging

## Development

### Running Prover with VKNFT

```bash
# From prover directory
cd prover
npm run dev

# Prover will automatically:
# 1. Scan ../VKNFT/ for available years
# 2. Load files via API when generating proofs
```

### Testing the Integration

1. **Generate a VK** using Executive Console for a specific year (e.g., 2025)
2. **Start Prover** and verify the year appears in the dropdown
3. **Upload a PDF** and select the year
4. **Generate Proof** - Prover should load files from VKNFT

### API Endpoints

#### GET /api/vknft/years
Returns list of available graduation years.

**Response:**
```json
{
  "success": true,
  "years": [2025, 2026]
}
```

#### GET /api/vknft/[year]/manifest
Returns manifest.json for a specific year.

**Response:**
```json
{
  "success": true,
  "manifest": {
    "schema": "tri-cert/vknft-bundle@1",
    "year": 2025,
    "files": { ... }
  }
}
```

#### GET /api/vknft/[year]/files/[filename]
Returns a specific file (wasm, zkey, or json).

**Security:**
- Only allows `.wasm`, `.zkey`, `.json` extensions
- Prevents directory traversal attacks
- Sets appropriate Content-Type headers

## Benefits

### For Developers

- ✅ No manual file copying
- ✅ Single source of truth (VKNFT directory)
- ✅ Automatic sync between Executive Console and Prover
- ✅ Supports multiple years seamlessly

### For Users

- ✅ Always uses the latest VKs
- ✅ Year selection limited to available VKs
- ✅ Consistent experience across apps

## Troubleshooting

### "No years found in VKNFT directory"

**Cause**: VKNFT directory doesn't exist or is empty

**Solution**:
1. Run Executive Console
2. Generate at least one VK for a specific year
3. Restart Prover (or refresh the page)

### "Failed to load from VKNFT, falling back to public assets"

**Cause**: VKNFT directory not accessible from Prover

**Check**:
- VKNFT directory path: `../VKNFT/` relative to prover/
- File permissions
- Prover console logs for detailed errors

**Fallback**: Prover will use files from `public/` directory

### Year dropdown is empty

**Cause**: No valid manifests found in VKNFT

**Solution**:
1. Check VKNFT directory structure
2. Ensure each year folder has `manifest.json`
3. Check console for API errors

## Migration from Old Approach

### Before (Manual Deployment)

```bash
# Had to manually copy files
cp VKNFT/2025/files/* prover/public/
```

### After (Automatic)

```bash
# Just run Executive Console to generate VKs
# Prover automatically detects and loads them
```

No manual intervention required! 🎉

## Future Enhancements

- [ ] Cache VKNFT files in browser for offline use
- [ ] Add integrity verification (SHA-256 checks)
- [ ] Support for remote VKNFT repositories
- [ ] Real-time updates when new VKs are generated

---

**Last Updated**: 2025-11-26  
**Version**: 1.0

