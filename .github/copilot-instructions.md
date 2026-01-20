# Tri-Cert Framework – AI Guide

- **Purpose & shape**: Four apps for ZK-backed credential issuance and verification; ZK circuits and thesis docs live together. Map: executive-console (Tauri/Rust), registrar-console (Wails/Go), prover (Next.js), verifier-ui (Next.js), circuits (Circom artifacts), docs (Astro + thesis scripts), registrations (public/PII-split JSON registries).
- **Run everything quickly**: `./start-dev.sh` launches tmux panes and cleans ports for prover (3000), verifier-ui (3001), executive-console (5173), registrar-console (5174, Wails) using shared `.gocache` for Go builds.
- **Per-app dev**: In each app dir `npm install` once. Prover/verifier use `npm run dev|build`; export for GitHub Pages with `build:export` which sets `BASE_PATH`/`ASSET_PREFIX` to `/Tri-CertFramework/<app>`.
- **Executive Console**: Tauri desktop; `npm run dev:desktop` (software signing) vs `npm run build:desktop` (Ledger signing). Frontend served by Vite; circuit assets in `public/assets`.
- **Registrar Console**: Wails v2 + SolidJS frontend. Start with `GOCACHE=$(pwd)/../.gocache wails dev`; production build requires `frontend npm run build` then `wails build`. Frontend dev port fixed at 5174.
- **Registrations data contract**: Only `commit-allowlist.json`, `index.json`, `issuer.json` are public; `issuance-log.json`, `students/`, `exports/` stay local (PII). Registrar writes JSON shapes described in registrations/README; never commit private files.
- **Circuits**: Circom sources and zkeys in `circuits/`; upstream circom compiler vendored under `circuits/circom/`. Keep commitment zkeys/vkeys in `circuits/commitment_*` for prover/verifier consumption.
- **Docs & thesis**: `docs/scripts/thesis.py` builds thesis from `docs/thesis-source/` into `docs/src/content/docs/research/`. Common commands: `python thesis.py build|tree|list|show <ver>|major|fetch`. Screenshots live under `docs/src/assets/screenshot/` and are auto-relinked during build.
- **Shared crypto stack**: snarkjs + circomlib, crypto-js across apps; WebAuthn (jose, simplewebauthn on verifier). VK management and signing handled in executive-console; prover/verifier rely on zkey/vkey artifacts stored in repo.
- **Testing/lint**: Next apps use `npm run lint`; executive-console `npm test` (from README) and `npm run lint`; registrar-console `go test ./...` and frontend `npm run build` sanity.
- **Conventions**: Conventional Commits; no DB—state is file-based. Ledger required for production signing; software keys dev-only. Ensure port uniqueness aligns with start-dev script.
- **Key references**: CLAUDE.md for project narrative and thesis workflow; registrations/README for data handling; component READMEs for per-app details.

When editing, keep asset paths compatible with export base paths and do not leak PII-labeled files outside registrations/. Ask before changing circuit artifacts or registries.