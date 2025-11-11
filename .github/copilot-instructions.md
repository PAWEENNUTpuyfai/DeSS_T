<!-- Copilot instructions for the DeSS_T workspace -->

# DeSS_T — Copilot / AI assistant instructions

This repo contains a small monorepo with two main application folders and a placeholder for a Python backend. The goal of this file is to give an AI coding agent immediate, actionable context so it can be productive without asking about basic layout or how to run things.

Short checklist for the agent:

- Repo root layout: `DeSS_T_Backend-go/`, `DeSS_T_Backend-python/`, `DeSS_T_Frontend/`.
- Look for `go.mod` in `DeSS_T_Backend-go` and `package.json` in `DeSS_T_Frontend` for language/tooling cues.
- If you change frontend code, run the frontend build/dev flow locally to verify HMR and build outputs.

Big-picture architecture (what we discovered):

- Frontend: a Vite + React + TypeScript app in `DeSS_T_Frontend/`. Key files: `package.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`.
- Backend (Go): a Go module at `DeSS_T_Backend-go/` (has `go.mod`). Note: `main.go` is currently empty and `Dockerfile` is empty in this copy — treat backend as scaffolding until `main.go` is implemented.
- Backend (Python): `DeSS_T_Backend-python/` exists but no obvious files were found. Treat as a placeholder unless you find additional code later.

Developer workflows and exact commands (copyable examples):

- Frontend (dev):

  - From repo root (PowerShell):
    ```powershell
    npm install --prefix .\DeSS_T_Frontend
    npm run --prefix .\DeSS_T_Frontend dev
    ```
  - Build for production:
    ```powershell
    npm run --prefix .\DeSS_T_Frontend build
    npm run --prefix .\DeSS_T_Frontend preview
    ```
  - Linting:
    ```powershell
    npm run --prefix .\DeSS_T_Frontend lint
    ```
  - Notes: `build` runs `tsc -b && vite build` (so TypeScript project references must be valid).

- Backend (Go) — discovered facts:
  - There is a `go.mod` in `DeSS_T_Backend-go/` which identifies it as a Go module.
  - `main.go` is currently empty in this snapshot. If/when it contains code, use:
    ```powershell
    # build
    cd .\DeSS_T_Backend-go; go build -o bin/server .
    # run
    go run .
    ```
  - Docker: a `Dockerfile` exists in `DeSS_T_Backend-go/` but is empty here — do not assume a working image. If you add or modify a Dockerfile, build with:
    ```powershell
    docker build -f .\DeSS_T_Backend-go\Dockerfile -t dess-backend-go:dev .
    ```

Integration points and conventions found / implied:

- The frontend is a separate app that will call backend HTTP APIs when they exist — search `DeSS_T_Backend-go` for exposed endpoints after `main.go` is implemented.
- Frontend uses `@vitejs/plugin-react-swc` (SWC-based fast refresh) — prefer editing `vite.config.ts` when changing build/compiler behavior.
- TypeScript uses multiple tsconfigs (`tsconfig.app.json`, `tsconfig.node.json`) — `build` runs `tsc -b` so maintain project references.

Agent-specific guidance (do this when making code changes):

- Be conservative editing backend bootstrap code: if `main.go` is empty, create a minimal, well-documented HTTP server (listen on a port variable) and include a comment showing how to run it.
- For frontend changes, run the dev server and confirm HMR edits in `src/App.tsx` or `src/*` files before committing.
- Preserve existing package.json scripts and TypeScript build ordering—`tsc -b` is intentionally part of the build.
- When adding endpoints, include CORS or proxy notes in `vite.config.ts` if the frontend will call the backend in dev.

What I could not discover automatically (ask the human if needed):

- The intended port(s) and environment variable names for backend services.
- Any CI/CD workflow, secrets, or registry details for Docker images.

If you update this file:

- Keep it concise (~20–50 lines). Reference exact files (like `DeSS_T_Frontend/package.json`) rather than vague folders.
- Update the "What I could not discover" section with answers from the maintainer.

If anything above is unclear or incomplete, tell me which specific parts you'd like expanded (ports, env names, CI details) and I will update this document.
