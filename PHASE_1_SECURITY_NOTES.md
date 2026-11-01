# Phase 1 — Security Foundation

## Scope
This work is on the development branch build/phase-1-security-foundation. It is not merged into main and has not been deployed to Vercel or Firebase.

## Changes made
- Added lib/firebase-admin-auth.js to verify Firebase ID tokens using the Google Workload Identity Federation configuration already used by api/members.js.
- Added persistent per-user rate limiting backed by Firestore for AI search, stem processing and Blob upload authorization.
- Tightened Firestore account rules so normal users cannot assign themselves the admin role or change their role after account creation.
- Restricted beat creation and editing to producer accounts (plus the configured site owner).
- Added private server-only rules for stem-job and API rate-limit documents.
- Added storage.rules: preview audio is public and size-limited; full masters are private to their producer and size-limited.
- Updated Studio to upload preview and full master files to separate paths. It only obtains a download URL for the preview.
- Added authenticated access checks to AI search, Blob upload signing and stem-separation APIs.
- Added ownership checks for stem jobs.
- Disabled unauthenticated writes to the legacy PostgreSQL /api/beats endpoint.
- Added /api/health and updated the navigation's online check so it no longer depends on PostgreSQL being configured.
- Updated the AI Search page to send Firebase ID tokens and show a warning before uploading audio to public Blob storage for stem processing.
- Use the supported GPT-6 Luna API model by default, with OPENAI_MODEL available as an override.
- Rate-limit stem-status polling and delete public stem-input blobs when processing reaches a terminal state and the client polls the result.

## Manual configuration needed
- Deploy firestore.rules and storage.rules to the correct Firebase project.
- Confirm the Google Workload Identity Federation environment variables are present in Vercel. The secure API routes return an unavailable response if server identity is not configured.
- Confirm the Vercel Blob token, OpenAI key and Replicate token are configured only for features that are intentionally enabled.

## Known limitations
- Older audio files under beats/{uid}/... are still publicly readable to preserve compatibility. They must be migrated before a broad launch.
- AI stem-separation input files are stored in public Vercel Blob storage so Replicate can read them. The UI warns users not to upload unreleased or confidential audio. The API attempts to delete each input blob when the job reaches a terminal state and the client polls it; if the user closes the page before polling completes, the public input may remain. A private temporary-file pipeline is still preferable.
- Private masters are not yet delivered to purchasers. That must wait for payment verification and server-issued, time-limited download access.
- Checkout remains non-functional and must not be represented as a live payment system.
- The rate limiter uses Firestore transactions, but it has not yet been load-tested.
- No Firebase Emulator, Vercel runtime or two-account browser tests have been run in this environment. Do not call this production verified.

## Verification checklist
1. Run JavaScript syntax checks and the project's build/deployment checks.
2. Test account-role rules with producer, artist and owner accounts.
3. Test public preview playback and cross-account denial for private masters.
4. Test missing, invalid and expired Firebase tokens on every protected API route.
5. Test rate-limit responses and stem-job ownership.
6. Deploy Firebase rules separately from the GitHub branch and verify the deployed project and bucket.
7. Run the full producer and artist beta checklist in PRODUCER_BETA_CHECKLIST.md.