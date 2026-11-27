# Run MedProof outside Figma Make

The exported app now defaults to **standard Payload CMS**, **local SQLite**,
and **local disk uploads**. It needs no Figma account, environment ID, API key,
or network request to Figma. The original configuration is retained separately
only to keep this project's managed Make preview working.

## Windows (PowerShell)

Use a Node version supported by `package.json` (Node 24.22.3+ within 24.x, or
26.13.1+), with npm installed. Run these commands from the project root:

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value after `PAYLOAD_SECRET=` in `.env`, then:

```powershell
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/api/documents.
On a fresh local database the latter returns HTTP 200 and `[]`, not an error.
`npm run dev` refreshes the exported Payload admin import map automatically
before Next starts; no Bash, Unix environment assignments, or Figma CLI is used.
The same commands work on macOS/Linux (use `cp .env.example .env`).

## Environment variables

| Variable               | Required | Meaning                                                                                                       |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `PAYLOAD_SECRET`       | Yes      | Your own random secret, at least 32 characters. Keep stable across restarts and out of Git.                   |
| `DATABASE_URL`         | No       | SQLite URL, default `file:./medproof.db`. A relative path is relative to your project working directory.      |
| `UPLOAD_DIR`           | No       | Local disk folder, default `./uploads`. Do not put it in `public/`; Payload must enforce file access checks.  |
| `NEXT_PUBLIC_SITE_URL` | No       | Public app origin, default `http://localhost:3000`. Change it when using another port/hostname. Not a secret. |
| `PORT`                 | No       | HTTP port, default `3000`.                                                                                    |

Do **not** set `FIGMA`, `FIGMA_EID`, or other Figma environment variables locally.
The Make host sets `FIGMA=1` itself; that explicit host flag is the only way the
managed configuration is selected. No environment-ID auto-detection or fallback
to Figma runs in the standalone configuration.

## Persistence, access, and existing data

- SQLite creates its schema automatically in development. `medproof.db` and
  `uploads/` persist across restarts and are ignored by Git.
- The local database starts empty. Figma-hosted records/files are not part of a
  source export and are not silently copied, deleted, or re-seeded.
- Existing collection access controls are preserved. Anonymous visitors can
  upload PDFs, but cannot list/read private uploads. The public document endpoint
  exposes only records marked as demo; do not weaken this to populate the table.
- `/admin` uses native Payload email/password administration in standalone mode,
  not Figma SSO. Visit `/admin` to create the initial local administrator.
  This is CMS access, not public app signup.
- File signatures and sizes are validated and SHA-256 is generated server-side.
  Corda/Hedera connections remain unconfigured; standalone mode does not invent
  successful blockchain proofs.
- Back up both the SQLite database and uploaded files. This local development
  setup is not a complete production healthcare/security deployment.

## Verification and production

```powershell
npm run test:standalone
npm run build
npm start
```

The standalone test uses a temporary SQLite database and a fresh random test
secret, explicitly removes `FIGMA_EID`, and invokes the actual documents GET
handler. It does not touch the Make database or require a running server.

Before a standalone production deployment, use Payload's documented SQLite
migration workflow (`npm run payload -- migrate:create`, review generated SQL,
then `npm run payload -- migrate`) and persistent storage. Do not rely on
development schema push for production. Protect initial admin setup before
exposing `/admin` publicly. Configure TLS, backups, encryption, authentication,
rate limiting, and access policies appropriate to your deployment.

## Exact source changes

- `src/payload.config.ts`: selects the local config by default using a lazy import.
- `src/payload.figma.config.ts`: original managed config, isolated unchanged.
- `src/payload.standalone.config.ts`: native `buildConfig`, SQLite with UUID IDs,
  native Payload admin, Lexical editor, and local upload directories.
- `package.json`: matching `@payloadcms/db-sqlite` dependency, `tsx` for the test,
  and platform-neutral `dev`, `build`, `start`, and Payload CLI scripts.
- `pnpm-lock.yaml`: dependency lock updates.
- `scripts/prepare-local.mjs`: regenerates the stale exported admin import map
  without shell-specific commands; skips this in the managed host.
- `next.config.ts`: local image-loader selection and provided public-site URL;
  managed preview proxy allowlists remain intact.
- `standalone-image-loader.ts`: uses local Payload file URLs without Figma transforms.
- `.env.example`: documented local variables, no supplied/committed secret.
- `.gitignore`: keeps the example tracked and local databases/uploads untracked.
- `tests/standalone.test.ts`: integration test for the actual documents endpoint.

No changes to the dashboard, document API logic, existing collection schemas,
or managed Payload admin/API route source files are required.
